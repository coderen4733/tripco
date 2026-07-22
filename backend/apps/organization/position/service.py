from datetime import datetime, timezone

from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from apps.organization.position import repository as position_repository
from apps.organization.position.models.entities import PositionEntity
from apps.organization.position.models.schemas import (
    PositionCreateReq,
    PositionCreateRes,
    PositionDeleteRes,
    PositionReadDetailRes,
    PositionReadListRes,
    PositionUpdateReq,
    PositionUpdateRes,
)
from common.lexorank import LexoRank


# 직급/직위(Positon) 생성(C) API
async def create_position(
    db: AsyncIOMotorDatabase, payload: PositionCreateReq
) -> PositionCreateRes:
    # 1. Duplicate Check
    # 1-1. position_id
    is_duplicate_position_id = (
        await position_repository.get_position_by_position_id(
            db, payload.position_id, None
        )
    )
    if is_duplicate_position_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 position_id입니다.",
        )
    # 1-2. name
    is_duplicate_name = await position_repository.get_position_by_name(
        db, payload.name, None
    )
    if is_duplicate_name:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 직급/직위명입니다.",
        )
    # 2. LexoRank => Order
    last_position = await position_repository.get_last_position_order(db)
    if last_position and "order" in last_position:
        # 2-1. 데이터가 존재한다면: 가장 마지막 order 다음 order 생성
        new_order = LexoRank.get_next(last_position["order"])
    else:
        # 2-2. 데이터가 존재하지 않는다면(첫 등록): 기본 중간값(i00000) order로
        new_order = LexoRank.get_middle()
    position_data = payload.model_dump()
    position_data["order"] = new_order

    # 3. Create & Read
    position = PositionEntity(**position_data)  # **: 풀어서 넣는다는 뜻
    new_position_id = await position_repository.create_position(db, position)
    new_position = await position_repository.get_position_by_id(
        db, new_position_id
    )
    # 3-1. Read가 되지 않는 경우
    if not new_position:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="직급/직위가 저장되지 않았거나, 조회에 실패하였습니다.",
        )
    # 4. Service => Router
    data = PositionCreateRes(**new_position)
    return data


# 직급/직위(Positon) 목록 조회(R-L) API
async def get_positions_list(
    db: AsyncIOMotorDatabase,
    skip: int,
    limit: int,
) -> list[PositionReadListRes]:
    # 1. Service <= Repository
    positions = await position_repository.get_positions_list(db, skip, limit)
    # 2. Service => Router
    data = [
        PositionReadListRes(
            _id=str(position["_id"]),
            position_id=position["position_id"],
            name=position["name"],
            status=position["status"],
            order=position["order"],
        )
        for position in positions
    ]
    return data


# 직급/직위(Positon) 상세 조회(R-D) API
async def get_position(
    db: AsyncIOMotorDatabase, _id: str
) -> PositionReadDetailRes:
    # 1. Service <= Repository
    position = await position_repository.get_position_by_id(db, _id)
    # 2. Existing Check(404)
    if position is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="상세 조회할 직급/직위가 존재하지 않습니다.",
        )
    # 3. Service => Router
    data = PositionReadDetailRes(**position)
    return data


# 직급/직위(Positon) 수정(U) API
async def update_position(
    db: AsyncIOMotorDatabase, _id: str, payload: PositionUpdateReq
) -> PositionUpdateRes:
    # 0. Duplicate Check
    # 0-1. position_id
    is_duplicate_position_id = (
        await position_repository.get_position_by_position_id(
            db, payload.position_id, _id
        )
    )
    if is_duplicate_position_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 position_id입니다.",
        )
    # 0-2. name
    is_duplicate_name = await position_repository.get_position_by_name(
        db, payload.name, _id
    )
    if is_duplicate_name:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 직급/직위명입니다.",
        )
    # 1. Service <= Repository
    updated_position = await position_repository.update_position(
        db,
        _id,
        {
            "position_id": payload.position_id,
            "name": payload.name,
            "updated_at": datetime.now(timezone.utc),
        },
    )
    # 2. Existing Check(404)
    if updated_position.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="수정할 직급/직위가 존재하지 않습니다.",
        )
    # 3. Service => Router
    data = PositionUpdateRes(
        matched_count=updated_position.matched_count,
        modified_count=updated_position.modified_count,
        acknowledged=updated_position.acknowledged,
    )
    return data


# 직급/직위(Positon) 삭제(D) API
async def delete_position(
    db: AsyncIOMotorDatabase, _id: str
) -> PositionDeleteRes:
    # 1. Service <= Repository
    deleted_position = await position_repository.delete_position(db, _id)
    # 2. Cannot Delete(500)
    if deleted_position.acknowledged is False:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="직급/직위 삭제에 실패했습니다.",
        )
    # 3. Existing Check(404)
    if deleted_position.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="삭제할 직급/직위 존재하지 않습니다.",
        )
    # 4. Service => Router
    data = PositionDeleteRes(
        deleted_count=deleted_position.deleted_count,
        acknowledged=deleted_position.acknowledged,
    )
    return data
