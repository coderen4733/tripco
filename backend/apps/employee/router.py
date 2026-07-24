from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from apps.employee import service as employee_service
from apps.employee.models.schemas import (
    EmployeeCreateReq,
    EmployeeCreateRes,
    EmployeeReadDetailRes,
)
from common.response import ResponseSchema
from core.database import get_database

employee_router = APIRouter()


# 임직원(Employee) 생성(C) API
@employee_router.post(
    "/",
    response_model=ResponseSchema[EmployeeCreateRes],
    status_code=status.HTTP_201_CREATED,
)
async def create_employee(
    payload: EmployeeCreateReq,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    # 1. Router <= Service
    data = await employee_service.create_employee(db, payload)
    # 2. Router => FrontEnd
    return {"message": "임직원 생성에 성공했습니다.", "data": data}


# 임직원(Employee) 상세 조회(R-D) API
@employee_router.get(
    "/{_id}",
    response_model=ResponseSchema[EmployeeReadDetailRes],
    status_code=status.HTTP_200_OK,
)
async def get_employee(
    _id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    # 1. Router <= Service
    data = await employee_service.get_employee(db, _id)
    # 2. Router => FrontEnd
    return {"message": "임직원 상세 조회에 성공했습니다.", "data": data}
