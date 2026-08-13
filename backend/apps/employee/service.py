from datetime import datetime, timezone

from fastapi import HTTPException, UploadFile, status
from fastapi.concurrency import (
    run_in_threadpool,  # 동기 함수(Pillow 이미지 처리)를 비동기로 실행
)
from motor.motor_asyncio import AsyncIOMotorDatabase

from apps.employee import repository as employee_repository
from apps.employee.models.entities import EmployeeEntity
from apps.employee.models.schemas import (
    EmployeeCreateReq,
    EmployeeCreateRes,
    EmployeeProfileImageRes,
    EmployeeReadDetailRes,
    EmployeeReadListRes,
    EmployeeUpdateReq,
    EmployeeUpdateRes,
)
from core.image import process_profile_image
from core.s3 import upload_bytes_to_s3


# 임직원(Employee) 생성(C) API
async def create_employee(
    db: AsyncIOMotorDatabase, payload: EmployeeCreateReq
) -> EmployeeCreateRes:
    # 1. Duplicate Check
    # 1-1. login_id
    is_duplicate_login_id = await employee_repository.get_employee_by_login_id(
        db, payload.login_id, None
    )
    if is_duplicate_login_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 login_id입니다.",
        )
    # 1-2. employee_id
    is_duplicate_employee_id = (
        await employee_repository.get_employee_by_employee_id(
            db, payload.employee_id, None
        )
    )
    if is_duplicate_employee_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 사번입니다.",
        )
    # 2. Create & Read
    employee_data = payload.model_dump()
    employee = EmployeeEntity(**employee_data)
    new_employee_id = await employee_repository.create_employee(db, employee)
    new_employee = await employee_repository.get_employee_by_id(
        db, new_employee_id
    )
    # 2-1. Read가 되지 않는 경우
    if not new_employee:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="임직원이 저장되지 않았거나, 조회에 실패했습니다.",
        )
    # 3. Service => Router
    new_employee["_id"] = str(new_employee["_id"])
    data = EmployeeCreateRes(**new_employee)
    return data


# 임직원(Employee) 목록 조회(R-L) API
async def get_employees_list(
    db: AsyncIOMotorDatabase, skip: int, limit: int
) -> list[EmployeeReadListRes]:
    # 1. Service <= Repository
    employees = await employee_repository.get_employees_list(db, skip, limit)
    # 2. Service => Router
    data = [
        EmployeeReadListRes(
            _id=str(employee["_id"]),
            name_kor=employee["name_kor"],
            employee_id=employee["employee_id"],
            login_id=employee["login_id"],
            dept_id=employee["dept_id"],
            team_id=employee["team_id"],
            position_id=employee["position_id"],
            title_id=employee["title_id"],
            duty_id=employee["duty_id"],
            employment_type=employee["employment_type"],
        )
        for employee in employees
    ]
    return data


# 임직원(Employee) 상세 조회(R-D) API
async def get_employee(
    db: AsyncIOMotorDatabase, _id: str
) -> EmployeeReadDetailRes:
    # 1. Service <= Repository
    employee = await employee_repository.get_employee_by_id(db, _id)
    # 2. Existing Check(404)
    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="상세 조회할 임직원이 존재하지 않습니다.",
        )
    # 3. Service => Router
    data = EmployeeReadDetailRes(**employee)
    return data


# 임직원(Employee) 수정(U) API
# 상세 조회 화면에서 항목을 하나씩 고쳐서 저장하는 방식이라, 요청에 실제로
# 담겨 온 필드만 반영하는 부분 수정(partial update)으로 동작한다.
async def update_employee(
    db: AsyncIOMotorDatabase,
    _id: str,
    payload: EmployeeUpdateReq,
) -> EmployeeUpdateRes:
    # 0. 실제로 값이 전달된 필드만 뽑아낸다
    # (exclude_unset=True: 요청 본문에 없는 필드는 아예 제외)
    updated_fields = payload.model_dump(exclude_unset=True)

    # 1. Duplicate Check (login_id/employee_id가 바뀌는 경우에만 검사)
    # 1-1. login_id
    if "login_id" in updated_fields:
        is_duplicate_login_id = (
            await employee_repository.get_employee_by_login_id(
                db, updated_fields["login_id"], _id
            )
        )
        if is_duplicate_login_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="이미 존재하는 login_id입니다.",
            )
    # 1-2. employee_id
    if "employee_id" in updated_fields:
        is_duplicate_employee_id = (
            await employee_repository.get_employee_by_employee_id(
                db, updated_fields["employee_id"], _id
            )
        )
        if is_duplicate_employee_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="이미 존재하는 사번입니다.",
            )

    # 2. Service <= Repository
    updated_fields["updated_at"] = datetime.now(timezone.utc)
    updated_employee = await employee_repository.update_employee(
        db, _id, updated_fields
    )
    # 2-1. Existing Check(404)
    if updated_employee.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="수정할 임직원이 존재하지 않습니다.",
        )
    # 3. Service => Router
    data = EmployeeUpdateRes(
        matched_count=updated_employee.matched_count,
        modified_count=updated_employee.modified_count,
        acknowledged=updated_employee.acknowledged,
    )
    return data


# 임직원(Employee) 프로필 사진 업로드(U) API
# 반드시 임직원이 MongoDB에 먼저 저장되어 있어야 호출할 수 있다(사번 conflict
# 여부가 이미 확정된 뒤라는 뜻). 그래서 사원 추가 화면에서는
# "1) POST /employees/ 로 생성 → 2) 성공하면 이 API로 사진 업로드"
# 순서로 두 번에 나눠서 호출한다.
async def upload_profile_image(
    db: AsyncIOMotorDatabase,
    _id: str,
    file: UploadFile,
) -> EmployeeProfileImageRes:
    # 1. 대상 임직원 존재 확인 (S3 파일명에 쓸 사번을 여기서 얻는다)
    employee = await employee_repository.get_employee_by_id(db, _id)
    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="프로필 사진을 등록할 임직원이 존재하지 않습니다.",
        )
    # 2. 이미지 파일인지 확인
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미지 파일만 업로드할 수 있습니다.",
        )
    # 3. 원본 이미지를 증명사진 표준 규격(413x531 JPEG)으로 가공
    # (Pillow 리사이즈는 동기 작업이라 run_in_threadpool로 실행)
    raw_bytes = await file.read()
    try:
        processed_bytes = await run_in_threadpool(
            process_profile_image, raw_bytes
        )
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미지 파일을 처리할 수 없습니다.",
        ) from err
    # 4. S3 업로드 (profile 폴더에 "사번.jpg"로 저장)
    url = await upload_bytes_to_s3(
        processed_bytes,
        "profile",
        employee["employee_id"],
        "jpg",
        "image/jpeg",
    )
    # 5. Service <= Repository (MongoDB에 url 반영)
    await employee_repository.update_employee(
        db,
        _id,
        {
            "profile_image_url": url,
            "updated_at": datetime.now(timezone.utc),
        },
    )
    # 6. Service => Router
    return EmployeeProfileImageRes(profile_image_url=url)
