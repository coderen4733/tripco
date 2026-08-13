from datetime import datetime, timezone

from fastapi import HTTPException, UploadFile, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from apps.employee import repository as employee_repository
from apps.employee.models.entities import EmployeeEntity
from apps.employee.models.schemas import (
    EmployeeCreateReq,
    EmployeeCreateRes,
    EmployeeReadDetailRes,
    EmployeeReadListRes,
    EmployeeUpdateReq,
    EmployeeUpdateRes,
)
from core.s3 import upload_to_s3


# S3에 파일 업로드 => url 변환
async def upload_to_s3(file: UploadFile, folder: str, employee_id) -> str:
    # 1. core.s3의 파일 업로드 함수 호출
    return await upload_to_s3(file, folder, employee_id)


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
