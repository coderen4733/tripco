from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from redis.asyncio import Redis

from apps.auth.dependencies import (
    get_current_employee,
    require_employee_manage_role,
)
from apps.organization.position import service as position_service
from apps.organization.position.models.schemas import (
    PositionCreateReq,
    PositionCreateRes,
    PositionDeleteRes,
    PositionReadDetailRes,
    PositionReadListRes,
    PositionReorderReq,
    PositionReorderRes,
    PositionStatusReq,
    PositionStatusRes,
    PositionUpdateReq,
    PositionUpdateRes,
)
from common.response import ResponseSchema
from core.database import get_database
from core.redis import get_redis

position_router = APIRouter()


# 직급/직위(Position) 생성(C) API
@position_router.post(
    "/",
    response_model=ResponseSchema[PositionCreateRes],
    status_code=status.HTTP_201_CREATED,
)
async def create_position(
    payload: PositionCreateReq,
    db: AsyncIOMotorDatabase = Depends(get_database),
    redis: Redis = Depends(get_redis),
    current_employee: dict = Depends(get_current_employee),
) -> dict:
    require_employee_manage_role(current_employee)
    # 1. Router <= Service
    data = await position_service.create_position(
        db,
        redis,
        payload,
    )
    # 2. Router => FrontEnd
    return {
        "message": "직급/직위 생성에 성공했습니다.",
        "data": data,
    }


# 직급/직위(Position) 목록 조회(R-L) API
@position_router.get(
    "/",
    response_model=ResponseSchema[list[PositionReadListRes]],
)
async def get_positions_list(
    skip: int = 0,
    limit: int = 20,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    # 1. Router <= Service
    data = await position_service.get_positions_list(
        db,
        skip,
        limit,
    )
    # 2. Router => FrontEnd
    return {
        "message": "직급/직위 목록 조회에 성공했습니다.",
        "data": data,
    }


# 직급/직위(Position) 상세 조회(R-D) API
@position_router.get(
    "/{_id}",
    response_model=ResponseSchema[PositionReadDetailRes],
    status_code=status.HTTP_200_OK,
)
async def get_position(
    _id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    # 1. Router <= Service
    data = await position_service.get_position(
        db,
        _id,
    )
    # 2. Router => FrontEnd
    return {
        "message": "직급/직위 상세 조회에 성공했습니다.",
        "data": data,
    }


# 직급/직위(Position) 수정(U) API
@position_router.put(
    "/{_id}",
    response_model=ResponseSchema[PositionUpdateRes],
)
async def update_position(
    _id: str,
    payload: PositionUpdateReq,
    db: AsyncIOMotorDatabase = Depends(get_database),
    redis: Redis = Depends(get_redis),
    current_employee: dict = Depends(get_current_employee),
) -> dict:
    require_employee_manage_role(current_employee)
    # 1. Router <= Service
    data = await position_service.update_position(
        db,
        redis,
        _id,
        payload,
    )
    # 2. Router => FrontEnd
    return {
        "message": "직급/직위 수정에 성공했습니다.",
        "data": data,
    }


# 직급/직위(Position) 순서 변경(U) API
@position_router.patch(
    "/{_id}/order",
    response_model=ResponseSchema[PositionReorderRes],
)
async def reorder_position(
    _id: str,
    payload: PositionReorderReq,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_employee: dict = Depends(get_current_employee),
) -> dict:
    require_employee_manage_role(current_employee)
    # 1. Router <= Service
    data = await position_service.reorder_position(
        db,
        _id,
        payload,
    )
    # 2. Router => FrontEnd
    return {
        "message": "직급/직위 순서 변경에 성공했습니다.",
        "data": data,
    }


# 직급/직위(Position) 활성/비활성 상태 변경(U) API
@position_router.patch(
    "/{_id}/status",
    response_model=ResponseSchema[PositionStatusRes],
)
async def update_position_status(
    _id: str,
    payload: PositionStatusReq,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_employee: dict = Depends(get_current_employee),
) -> dict:
    require_employee_manage_role(current_employee)
    # 1. Router <= Service
    data = await position_service.update_position_status(
        db,
        _id,
        payload,
    )
    # 2. Router => FrontEnd
    return {
        "message": "직급/직위 활성/비활성 상태 변경에 성공했습니다.",
        "data": data,
    }


# 직급/직위(Position) 삭제(D) API
@position_router.delete(
    "/{_id}",
    response_model=ResponseSchema[PositionDeleteRes],
    status_code=status.HTTP_200_OK,
)
async def delete_position(
    _id: str,
    reassign_to: str | None = None,
    db: AsyncIOMotorDatabase = Depends(get_database),
    redis: Redis = Depends(get_redis),
    current_employee: dict = Depends(get_current_employee),
) -> dict:
    require_employee_manage_role(current_employee)
    # 1. Router <= Service
    data = await position_service.delete_position(
        db,
        redis,
        _id,
        reassign_to,
    )
    # 2. Router => FrontEnd
    return {
        "message": "직급/직위 삭제에 성공했습니다.",
        "data": data,
    }
