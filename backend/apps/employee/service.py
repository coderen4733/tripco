from datetime import datetime, timezone

from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from apps.employee import repository as employee_repository
from apps.employee.models.entities import EmployeeEntity
from apps.employee.models.schemas import (
    EmployeeCreateReq,
    EmployeeCreateRes,
    EmployeeReadDetailRes,
)


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
    # 2. Create $ Read
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
