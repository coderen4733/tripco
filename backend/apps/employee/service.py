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
    EmployeeRegistrationRejectRes,
    EmployeeUpdateReq,
    EmployeeUpdateRes,
)
from core.image import process_profile_image
from core.s3 import upload_bytes_to_s3
from core.security import hash_password


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
    # 비밀번호는 평문 그대로 저장하지 않고 bcrypt로 해시해서 저장한다.
    # (bcrypt 해시 연산은 동기/CPU 작업이라 run_in_threadpool로 실행)
    employee_data = payload.model_dump()
    employee_data["password"] = await run_in_threadpool(
        hash_password, employee_data["password"]
    )
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

    # 0-1. 비밀번호를 바꾸는 요청이면, 평문이 아니라 해시로 저장한다.
    if "password" in updated_fields and updated_fields["password"] is not None:
        updated_fields["password"] = await run_in_threadpool(
            hash_password, updated_fields["password"]
        )

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


# ─────────────────────────────────────────────────────────────────
# 여기서부터는 신규 계정 신청(회원가입) 대기 명단(employee_registrations)을
# 관리자가 목록으로 보고, 상세를 확인하고, 승인/반려하는 기능입니다.
# ─────────────────────────────────────────────────────────────────


# 신규 계정 신청(Registration) 목록 조회(R-L) API
async def get_employee_registrations_list(
    db: AsyncIOMotorDatabase,
) -> list[EmployeeReadListRes]:
    # 1. Service <= Repository
    registrations = await employee_repository.get_employee_registrations_list(
        db
    )
    # 2. Service => Router
    # (임직원 목록 조회와 동일한 응답 모양이라 사원 관리 페이지의 표를
    #  그대로 재사용할 수 있다)
    data = [
        EmployeeReadListRes(
            _id=str(registration["_id"]),
            name_kor=registration["name_kor"],
            employee_id=registration["employee_id"],
            login_id=registration["login_id"],
            dept_id=registration["dept_id"],
            team_id=registration["team_id"],
            position_id=registration["position_id"],
            title_id=registration["title_id"],
            duty_id=registration["duty_id"],
            employment_type=registration["employment_type"],
        )
        for registration in registrations
    ]
    return data


# 신규 계정 신청(Registration) 상세 조회(R-D) API
async def get_employee_registration(
    db: AsyncIOMotorDatabase,
    _id: str,
) -> EmployeeReadDetailRes:
    # 1. Service <= Repository
    registration = await employee_repository.get_employee_registration_by_id(
        db, _id
    )
    # 2. Existing Check(404)
    # 조회 시점에 이미 없다면(다른 관리자가 먼저 승인/반려했을 가능성이 큼)
    # 프론트에서 그대로 보여줄 수 있도록 안내 문구를 detail에 담아 던진다.
    if registration is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="이미 다른 관리자에 의해 승인 또는 반려된 신청입니다.",
        )
    # 3. Service => Router
    data = EmployeeReadDetailRes(**registration)
    return data


# 신규 계정 신청(Registration) 수정(U) API
# 임직원 수정(update_employee)과 거의 동일한 부분 수정(partial update)이다.
# 다만 login_id/사번 중복 검사는 employees와 employee_registrations
# 양쪽을 모두 확인해야 한다(두 컬렉션에 걸쳐 유일해야 하므로).
async def update_employee_registration(
    db: AsyncIOMotorDatabase,
    _id: str,
    payload: EmployeeUpdateReq,
) -> EmployeeUpdateRes:
    # 0. 실제로 값이 전달된 필드만 뽑아낸다
    updated_fields = payload.model_dump(exclude_unset=True)

    # 0-1. 비밀번호를 바꾸는 요청이면, 평문이 아니라 해시로 저장한다.
    if "password" in updated_fields and updated_fields["password"] is not None:
        updated_fields["password"] = await run_in_threadpool(
            hash_password, updated_fields["password"]
        )

    # 1. Duplicate Check (login_id/employee_id가 바뀌는 경우에만 검사)
    if "login_id" in updated_fields:
        login_id = updated_fields["login_id"]
        if await employee_repository.get_employee_by_login_id(
            db, login_id, None
        ) or await employee_repository.get_employee_registration_by_login_id(
            db, login_id, _id
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="이미 존재하는 login_id입니다.",
            )
    if "employee_id" in updated_fields:
        employee_id = updated_fields["employee_id"]
        is_duplicate_in_employees = (
            await employee_repository.get_employee_by_employee_id(
                db, employee_id, None
            )
        )
        is_duplicate_in_registrations = await (
            employee_repository.get_employee_registration_by_employee_id(
                db, employee_id, _id
            )
        )
        if is_duplicate_in_employees or is_duplicate_in_registrations:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="이미 존재하는 사번입니다.",
            )

    # 2. Service <= Repository
    updated_fields["updated_at"] = datetime.now(timezone.utc)
    updated_registration = (
        await employee_repository.update_employee_registration(
            db, _id, updated_fields
        )
    )
    # 2-1. Existing Check(404)
    # (매칭되는 문서가 없다면, 그 사이 다른 관리자가 먼저
    # 승인/반려했을 가능성이 크다)
    if updated_registration.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="이미 다른 관리자에 의해 승인 또는 반려된 신청입니다.",
        )
    # 3. Service => Router
    data = EmployeeUpdateRes(
        matched_count=updated_registration.matched_count,
        modified_count=updated_registration.modified_count,
        acknowledged=updated_registration.acknowledged,
    )
    return data


# 신규 계정 신청(Registration) 승인(U) API
# 승인 = employee_registrations에서 꺼내(pop) employees에 새로 생성한다.
# pop_employee_registration은 조회+삭제가 원자적이라, 이 함수를 두 관리자가
# 동시에 호출해도 실제로 employees가 만들어지는 건 한 번뿐이다.
async def approve_employee_registration(
    db: AsyncIOMotorDatabase,
    _id: str,
) -> EmployeeCreateRes:
    # 1. 대기 명단에서 원자적으로 꺼내온다
    registration = await employee_repository.pop_employee_registration(
        db, _id
    )
    if registration is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 다른 관리자에 의해 승인 또는 반려된 신청입니다.",
        )
    # 2. employees로 옮겨 생성한다. 실패하면 대기 명단으로 되돌린다(롤백).
    try:
        employee_data = {
            key: value
            for key, value in registration.items()
            if key != "_id"
        }
        # 2-1. Duplicate Check
        # (신청 이후 다른 경로로 이미 등록됐을 수도 있으니 재확인)
        if await employee_repository.get_employee_by_login_id(
            db, employee_data["login_id"], None
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="이미 존재하는 login_id입니다.",
            )
        if await employee_repository.get_employee_by_employee_id(
            db, employee_data["employee_id"], None
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="이미 존재하는 사번입니다.",
            )
        # 2-2. Create & Read
        employee = EmployeeEntity(**employee_data)
        new_employee_id = await employee_repository.create_employee(
            db, employee
        )
        new_employee = await employee_repository.get_employee_by_id(
            db, new_employee_id
        )
        if not new_employee:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="임직원이 저장되지 않았거나, 조회에 실패했습니다.",
            )
    except Exception:
        await employee_repository.restore_employee_registration(
            db, registration
        )
        raise
    # 3. Service => Router
    new_employee["_id"] = str(new_employee["_id"])
    data = EmployeeCreateRes(**new_employee)
    return data


# 신규 계정 신청(Registration) 반려(D) API
async def reject_employee_registration(
    db: AsyncIOMotorDatabase,
    _id: str,
) -> EmployeeRegistrationRejectRes:
    # 1. 대기 명단에서 원자적으로 꺼내서 그대로 버린다
    # (employees에는 만들지 않는다)
    registration = await employee_repository.pop_employee_registration(
        db, _id
    )
    if registration is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 다른 관리자에 의해 승인 또는 반려된 신청입니다.",
        )
    # 2. Service => Router
    return EmployeeRegistrationRejectRes()
