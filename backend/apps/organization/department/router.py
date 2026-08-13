from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from redis.asyncio import Redis

from apps.organization.department import service as dept_service
from apps.organization.department.models.schemas import (
    DeptCreateReq,
    DeptCreateRes,
    DeptDeleteRes,
    DeptReadDetailRes,
    DeptReadListRes,
    DeptUpdateReq,
    DeptUpdateRes,
)
from common.response import ResponseSchema
from core.database import get_database
from core.redis import get_redis

dept_router = APIRouter()


# 부서(Department) 생성(C) API
@dept_router.post(
    "/",
    response_model=ResponseSchema[DeptCreateRes],
    status_code=status.HTTP_201_CREATED,
)
async def create_department(
    payload: DeptCreateReq,
    db: AsyncIOMotorDatabase = Depends(get_database),
    redis: Redis = Depends(get_redis),
) -> dict:
    # 1. Router <= Service
    data = await dept_service.create_department(
        db,
        redis,
        payload,
    )
    # 2. Router => FrontEnd
    return {
        "message": "부서 생성에 성공했습니다.",
        "data": data,
    }


# 부서(Department) 목록 조회(R-L) API
@dept_router.get(
    "/",
    response_model=ResponseSchema[list[DeptReadListRes]],
)
async def get_departments_list(
    skip: int = 0,
    limit: int = 20,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    # 1. Router <= Service
    data = await dept_service.get_departments_list(
        db,
        skip,
        limit,
    )
    # 2. Router => FrontEnd
    return {
        "message": "부서 목록 조회에 성공했습니다.",
        "data": data,
    }


# 부서(Department) 상세 조회(R-D) API
@dept_router.get(
    "/{_id}",
    response_model=ResponseSchema[DeptReadDetailRes],
    status_code=status.HTTP_200_OK,
)
async def get_department(
    _id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    # 1. Router <= Service
    data = await dept_service.get_department(
        db,
        _id,
    )
    # 2. Router => FrontEnd
    return {
        "message": "부서 상세 조회에 성공했습니다.",
        "data": data,
    }


# 부서(Department) 수정(U) API
@dept_router.put(
    "/{_id}",
    response_model=ResponseSchema[DeptUpdateRes],
)
async def update_department(
    _id: str,
    payload: DeptUpdateReq,
    db: AsyncIOMotorDatabase = Depends(get_database),
    redis: Redis = Depends(get_redis),
) -> dict:
    # 1. Router <= Service
    data = await dept_service.update_department(
        db,
        redis,
        _id,
        payload,
    )
    # 2. Router => FrontEnd
    return {
        "message": "부서 수정에 성공했습니다.",
        "data": data,
    }


# 부서(Department) 삭제(D) API
@dept_router.delete(
    "/{_id}",
    response_model=ResponseSchema[DeptDeleteRes],
    status_code=status.HTTP_200_OK,
)
async def delete_department(
    _id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    redis: Redis = Depends(get_redis),
) -> dict:
    # 1. Router <= Service
    data = await dept_service.delete_department(
        db,
        redis,
        _id,
    )
    # 2. Router => FrontEnd
    return {
        "message": "부서 삭제에 성공했습니다.",
        "data": data,
    }
