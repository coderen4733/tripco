from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from redis.asyncio import Redis

from apps.auth.dependencies import (
    get_current_employee,
    require_employee_manage_role,
)
from apps.organization.duty import service as duty_service
from apps.organization.duty.models.schemas import (
    DutyCreateReq,
    DutyCreateRes,
    DutyDeleteRes,
    DutyReadDetailRes,
    DutyReadListRes,
    DutyReorderReq,
    DutyReorderRes,
    DutyStatusReq,
    DutyStatusRes,
    DutyUpdateReq,
    DutyUpdateRes,
)
from common.response import ResponseSchema
from core.database import get_database
from core.redis import get_redis

duty_router = APIRouter()


# 직무(Duty) 생성(C) API
@duty_router.post(
    "/",
    response_model=ResponseSchema[DutyCreateRes],
    status_code=status.HTTP_201_CREATED,
)
async def create_duty(
    payload: DutyCreateReq,
    db: AsyncIOMotorDatabase = Depends(get_database),
    redis: Redis = Depends(get_redis),
    current_employee: dict = Depends(get_current_employee),
) -> dict:
    require_employee_manage_role(current_employee)
    # 1. Router <= Service
    data = await duty_service.create_duty(
        db,
        redis,
        payload,
    )
    # 2. Router => FrontEnd
    return {
        "message": "직무 생성에 성공했습니다.",
        "data": data,
    }


# 직무(Duty) 목록 조회(R-L) API
@duty_router.get(
    "/",
    response_model=ResponseSchema[list[DutyReadListRes]],
)
async def get_duties_list(
    skip: int = 0,
    limit: int = 20,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    # 1. Router <= Service
    data = await duty_service.get_duties_list(
        db,
        skip,
        limit,
    )
    # 2. Router => FrontEnd
    return {
        "message": "직무 목록 조회에 성공했습니다.",
        "data": data,
    }


# 직무(Duty) 상세 조회(R-D) API
@duty_router.get(
    "/{_id}",
    response_model=ResponseSchema[DutyReadDetailRes],
    status_code=status.HTTP_200_OK,
)
async def get_duty(
    _id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    # 1. Router <= Service
    data = await duty_service.get_duty(
        db,
        _id,
    )
    # 2. Router => FrontEnd
    return {
        "message": "직무 상세 조회에 성공했습니다.",
        "data": data,
    }


# 직무(Duty) 수정(U) API
@duty_router.put(
    "/{_id}",
    response_model=ResponseSchema[DutyUpdateRes],
)
async def update_duty(
    _id: str,
    payload: DutyUpdateReq,
    db: AsyncIOMotorDatabase = Depends(get_database),
    redis: Redis = Depends(get_redis),
    current_employee: dict = Depends(get_current_employee),
) -> dict:
    require_employee_manage_role(current_employee)
    # 1. Router <= Service
    data = await duty_service.update_duty(
        db,
        redis,
        _id,
        payload,
    )
    # 2. Router => FrontEnd
    return {
        "message": "직무 수정에 성공했습니다.",
        "data": data,
    }


# 직무(Duty) 순서 변경(U) API
@duty_router.patch(
    "/{_id}/order",
    response_model=ResponseSchema[DutyReorderRes],
)
async def reorder_duty(
    _id: str,
    payload: DutyReorderReq,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_employee: dict = Depends(get_current_employee),
) -> dict:
    require_employee_manage_role(current_employee)
    # 1. Router <= Service
    data = await duty_service.reorder_duty(
        db,
        _id,
        payload,
    )
    # 2. Router => FrontEnd
    return {
        "message": "직무 순서 변경에 성공했습니다.",
        "data": data,
    }


# 직무(Duty) 활성/비활성 상태 변경(U) API
@duty_router.patch(
    "/{_id}/status",
    response_model=ResponseSchema[DutyStatusRes],
)
async def update_duty_status(
    _id: str,
    payload: DutyStatusReq,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_employee: dict = Depends(get_current_employee),
) -> dict:
    require_employee_manage_role(current_employee)
    # 1. Router <= Service
    data = await duty_service.update_duty_status(
        db,
        _id,
        payload,
    )
    # 2. Router => FrontEnd
    return {
        "message": "직무 활성/비활성 상태 변경에 성공했습니다.",
        "data": data,
    }


# 직무(Duty) 삭제(D) API
@duty_router.delete(
    "/{_id}",
    response_model=ResponseSchema[DutyDeleteRes],
    status_code=status.HTTP_200_OK,
)
async def delete_duty(
    _id: str,
    reassign_to: str | None = None,
    db: AsyncIOMotorDatabase = Depends(get_database),
    redis: Redis = Depends(get_redis),
    current_employee: dict = Depends(get_current_employee),
) -> dict:
    require_employee_manage_role(current_employee)
    # 1. Router <= Service
    data = await duty_service.delete_duty(
        db,
        redis,
        _id,
        reassign_to,
    )
    # 2. Router => FrontEnd
    return {
        "message": "직무 삭제에 성공했습니다.",
        "data": data,
    }
