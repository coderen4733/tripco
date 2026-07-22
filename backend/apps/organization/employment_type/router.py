from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from apps.organization.employment_type import service as emp_type_service
from apps.organization.employment_type.models.schemas import (
    EmpTypeCreateReq,
    EmpTypeCreateRes,
    EmpTypeDeleteRes,
    EmpTypeReadDetailRes,
    EmpTypeReadListRes,
    EmpTypeUpdateReq,
    EmpTypeUpdateRes,
)
from common.response import ResponseSchema
from core.database import get_database

emp_type_router = APIRouter()


# 고용형태(EmploymentType) 생성(C) API
@emp_type_router.post(
    "/",
    response_model=ResponseSchema[EmpTypeCreateRes],
    status_code=status.HTTP_201_CREATED,
)
async def create_emp_type(
    payload: EmpTypeCreateReq,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    # 1. Router <= Service
    data = await emp_type_service.create_emp_type(db, payload)
    # 2. Router => FrontEnd
    return {"message": "고용형태 생성에 성공했습니다.", "data": data}


# 고용형태(EmploymentType) 목록 조회(R-L) API
@emp_type_router.get(
    "/", response_model=ResponseSchema[list[EmpTypeReadListRes]]
)
async def get_emp_types_list(
    skip: int = 0,
    limit: int = 20,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    # 1. Router <= Service
    data = await emp_type_service.get_emp_types_list(db, skip, limit)
    # 2. Router => FrontEnd
    return {"message": "고용형태 목록 조회에 성공했습니다.", "data": data}


# 고용형태(EmploymentType) 상세 조회(R-D) API
@emp_type_router.get(
    "/{_id}",
    response_model=ResponseSchema[EmpTypeReadDetailRes],
    status_code=status.HTTP_200_OK,
)
async def get_emp_type(
    _id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    # 1. Router <= Service
    data = await emp_type_service.get_emp_type(db, _id)
    # 2. Router => FrontEnd
    return {"message": "고용형태 상세 조회에 성공했습니다.", "data": data}


# 고용형태(EmploymentType) 수정(U) API
@emp_type_router.put("/{_id}", response_model=ResponseSchema[EmpTypeUpdateRes])
async def update_emp_type(
    _id: str,
    payload: EmpTypeUpdateReq,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    # 1. Router <= Service
    data = await emp_type_service.update_emp_type(db, _id, payload)
    # 2. Router => FrontEnd
    return {"message": "고용형태 수정에 성공했습니다.", "data": data}


# 고용형태(EmploymentType) 삭제(D) API
@emp_type_router.delete(
    "/{_id}",
    response_model=ResponseSchema[EmpTypeDeleteRes],
    status_code=status.HTTP_200_OK,
)
async def delete_emp_type(
    _id: str, db: AsyncIOMotorDatabase = Depends(get_database)
) -> dict:
    # 1. Router <= Service
    data = await emp_type_service.delete_emp_type(db, _id)
    # 2. Router => FrontEnd
    return {"message": "고용형태 삭제에 성공했습니다.", "data": data}
