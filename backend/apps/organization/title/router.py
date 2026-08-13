from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from redis.asyncio import Redis

from apps.organization.title import service as title_service
from apps.organization.title.models.schemas import (
    TitleCreateReq,
    TitleCreateRes,
    TitleDeleteRes,
    TitleReadDetailRes,
    TitleReadListRes,
    TitleUpdateReq,
    TitleUpdateRes,
)
from common.response import ResponseSchema
from core.database import get_database
from core.redis import get_redis

title_router = APIRouter()


# 직책(Title) 생성(C) API
@title_router.post(
    "/",
    response_model=ResponseSchema[TitleCreateRes],
    status_code=status.HTTP_201_CREATED,
)
async def create_title(
    payload: TitleCreateReq,
    db: AsyncIOMotorDatabase = Depends(get_database),
    redis: Redis = Depends(get_redis),
) -> dict:
    # 1. Router <= Service
    data = await title_service.create_title(
        db,
        redis,
        payload,
    )
    # 2. Router => FrontEnd
    return {
        "message": "직책 생성에 성공했습니다.",
        "data": data,
    }


# 직책(Title) 목록 조회(R-L) API
@title_router.get(
    "/",
    response_model=ResponseSchema[list[TitleReadListRes]],
)
async def get_titles_list(
    skip: int = 0,
    limit: int = 20,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    # 1. Router <= Service
    data = await title_service.get_titles_list(
        db,
        skip,
        limit,
    )
    # 2. Router => FrontEnd
    return {
        "message": "직책 목록 조회에 성공했습니다.",
        "data": data,
    }


# 직책(Title) 상세 조회(R-D) API
@title_router.get(
    "/{_id}",
    response_model=ResponseSchema[TitleReadDetailRes],
    status_code=status.HTTP_200_OK,
)
async def get_title(
    _id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    # 1. Router <= Service
    data = await title_service.get_title(
        db,
        _id,
    )
    # 2. Router => FrontEnd
    return {
        "message": "직책 상세 조회에 성공했습니다.",
        "data": data,
    }


# 직책(Title) 수정(U) API
@title_router.put(
    "/{_id}",
    response_model=ResponseSchema[TitleUpdateRes],
)
async def update_title(
    _id: str,
    payload: TitleUpdateReq,
    db: AsyncIOMotorDatabase = Depends(get_database),
    redis: Redis = Depends(get_redis),
) -> dict:
    # 1. Router <= Service
    data = await title_service.update_title(
        db,
        redis,
        _id,
        payload,
    )
    # 2. Router => FrontEnd
    return {
        "message": "직책 수정에 성공했습니다.",
        "data": data,
    }


# 직책(Title) 삭제(D) API
@title_router.delete(
    "/{_id}",
    response_model=ResponseSchema[TitleDeleteRes],
    status_code=status.HTTP_200_OK,
)
async def delete_title(
    _id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    redis: Redis = Depends(get_redis),
) -> dict:
    # 1. Router <= Service
    data = await title_service.delete_title(
        db,
        redis,
        _id,
    )
    # 2. Router => FrontEnd
    return {
        "message": "직책 삭제에 성공했습니다.",
        "data": data,
    }
