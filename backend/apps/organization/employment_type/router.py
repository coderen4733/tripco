from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from redis.asyncio import Redis

from apps.auth.dependencies import (
    get_current_employee,
    require_employee_manage_role,
)
from apps.organization.employment_type import service as emp_type_service
from apps.organization.employment_type.models.schemas import (
    EmpTypeCreateReq,
    EmpTypeCreateRes,
    EmpTypeDeleteRes,
    EmpTypeReadDetailRes,
    EmpTypeReadListRes,
    EmpTypeReorderReq,
    EmpTypeReorderRes,
    EmpTypeStatusReq,
    EmpTypeStatusRes,
    EmpTypeUpdateReq,
    EmpTypeUpdateRes,
)
from common.response import ResponseSchema
from core.database import get_database
from core.redis import get_redis

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
    redis: Redis = Depends(get_redis),
    current_employee: dict = Depends(get_current_employee),
) -> dict:
    require_employee_manage_role(current_employee)
    # 1. Router <= Service
    data = await emp_type_service.create_emp_type(
        db,
        redis,
        payload,
    )
    # 2. Router => FrontEnd
    return {
        "message": "고용형태 생성에 성공했습니다.",
        "data": data,
    }


# 고용형태(EmploymentType) 목록 조회(R-L) API
@emp_type_router.get(
    "/",
    response_model=ResponseSchema[list[EmpTypeReadListRes]],
)
async def get_emp_types_list(
    skip: int = 0,
    limit: int = 20,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    # 1. Router <= Service
    data = await emp_type_service.get_emp_types_list(
        db,
        skip,
        limit,
    )
    # 2. Router => FrontEnd
    return {
        "message": "고용형태 목록 조회에 성공했습니다.",
        "data": data,
    }


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
    data = await emp_type_service.get_emp_type(
        db,
        _id,
    )
    # 2. Router => FrontEnd
    return {
        "message": "고용형태 상세 조회에 성공했습니다.",
        "data": data,
    }


# 고용형태(EmploymentType) 수정(U) API
@emp_type_router.put(
    "/{_id}",
    response_model=ResponseSchema[EmpTypeUpdateRes],
)
async def update_emp_type(
    _id: str,
    payload: EmpTypeUpdateReq,
    db: AsyncIOMotorDatabase = Depends(get_database),
    redis: Redis = Depends(get_redis),
    current_employee: dict = Depends(get_current_employee),
) -> dict:
    require_employee_manage_role(current_employee)
    # 1. Router <= Service
    data = await emp_type_service.update_emp_type(
        db,
        redis,
        _id,
        payload,
    )
    # 2. Router => FrontEnd
    return {
        "message": "고용형태 수정에 성공했습니다.",
        "data": data,
    }


# 고용형태(EmploymentType) 순서 변경(U) API
@emp_type_router.patch(
    "/{_id}/order",
    response_model=ResponseSchema[EmpTypeReorderRes],
)
async def reorder_emp_type(
    _id: str,
    payload: EmpTypeReorderReq,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_employee: dict = Depends(get_current_employee),
) -> dict:
    require_employee_manage_role(current_employee)
    # 1. Router <= Service
    data = await emp_type_service.reorder_emp_type(
        db,
        _id,
        payload,
    )
    # 2. Router => FrontEnd
    return {
        "message": "고용형태 순서 변경에 성공했습니다.",
        "data": data,
    }


# 고용형태(EmploymentType) 활성/비활성 상태 변경(U) API
@emp_type_router.patch(
    "/{_id}/status",
    response_model=ResponseSchema[EmpTypeStatusRes],
)
async def update_emp_type_status(
    _id: str,
    payload: EmpTypeStatusReq,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_employee: dict = Depends(get_current_employee),
) -> dict:
    require_employee_manage_role(current_employee)
    # 1. Router <= Service
    data = await emp_type_service.update_emp_type_status(
        db,
        _id,
        payload,
    )
    # 2. Router => FrontEnd
    return {
        "message": "고용형태 활성/비활성 상태 변경에 성공했습니다.",
        "data": data,
    }


# 고용형태(EmploymentType) 삭제(D) API
@emp_type_router.delete(
    "/{_id}",
    response_model=ResponseSchema[EmpTypeDeleteRes],
    status_code=status.HTTP_200_OK,
)
async def delete_emp_type(
    _id: str,
    reassign_to: str | None = None,
    db: AsyncIOMotorDatabase = Depends(get_database),
    redis: Redis = Depends(get_redis),
    current_employee: dict = Depends(get_current_employee),
) -> dict:
    require_employee_manage_role(current_employee)
    # 1. Router <= Service
    data = await emp_type_service.delete_emp_type(
        db,
        redis,
        _id,
        reassign_to,
    )
    # 2. Router => FrontEnd
    return {
        "message": "고용형태 삭제에 성공했습니다.",
        "data": data,
    }
