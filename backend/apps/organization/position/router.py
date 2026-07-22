from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from apps.organization.position import service as position_service
from apps.organization.position.models.schemas import (
    PositionCreateReq,
    PositionCreateRes,
    PositionDeleteRes,
    PositionReadDetailRes,
    PositionReadListRes,
    PositionUpdateReq,
    PositionUpdateRes,
)
from common.response import ResponseSchema
from core.database import get_database

position_router = APIRouter()


# 직급/직위(Position) 생성(C) API
# [수정] "팀(Team)"으로 잘못 적혀있던 주석을 "직급/직위(Position)"로 수정함
@position_router.post(
    "/",
    response_model=ResponseSchema[PositionCreateRes],
    status_code=status.HTTP_201_CREATED,
)
async def create_position(
    payload: PositionCreateReq,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    # 1. Router <= Service
    data = await position_service.create_position(db, payload)
    # 2. Router => FrontEnd
    return {"message": "직급/직위 생성에 성공했습니다.", "data": data}


# 직급/직위(Position) 목록 조회(R-L) API
@position_router.get(
    "/", response_model=ResponseSchema[list[PositionReadListRes]]
)
async def get_positions_list(
    skip: int = 0,
    limit: int = 20,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    # 1. Router <= Service
    data = await position_service.get_positions_list(db, skip, limit)
    # 2. Router => FrontEnd
    return {"message": "직급/직위 목록 조회에 성공했습니다.", "data": data}


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
    data = await position_service.get_position(db, _id)
    # 2. Router => FrontEnd
    return {"message": "직급/직위 상세 조회에 성공했습니다.", "data": data}


# 직급/직위(Position) 수정(U) API
@position_router.put(
    "/{_id}", response_model=ResponseSchema[PositionUpdateRes]
)
async def update_position(
    _id: str,
    payload: PositionUpdateReq,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    # 1. Router <= Service
    data = await position_service.update_position(db, _id, payload)
    # 2. Router => FrontEnd
    return {"message": "직급/직위 수정에 성공했습니다.", "data": data}


# 직급/직위(Position) 삭제(D) API
@position_router.delete(
    "/{_id}",
    response_model=ResponseSchema[PositionDeleteRes],
    status_code=status.HTTP_200_OK,
)
async def delete_position(
    _id: str, db: AsyncIOMotorDatabase = Depends(get_database)
) -> dict:
    # 1. Router <= Service
    data = await position_service.delete_position(db, _id)
    # 2. Router => FrontEnd
    return {"message": "직급/직위 삭제에 성공했습니다.", "data": data}
