from datetime import datetime, timezone

from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from redis.asyncio import Redis

from apps.organization.position import repository as position_repository
from apps.organization.position.models.entities import PositionEntity
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
from common.lexorank import LexoRank
from common.reassign import count_references, reassign_references
from common.reorder import compute_reordered_value


# 직급/직위(Positon) 생성(C) API
async def create_position(
    db: AsyncIOMotorDatabase,
    redis: Redis,
    payload: PositionCreateReq,
) -> PositionCreateRes:
    # 1. Duplicate Check
    # 1-1. position_code
    is_duplicate_position_code = (
        await position_repository.get_position_by_position_code(
            db,
            payload.position_code,
            None,
        )
    )
    if is_duplicate_position_code:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 position_code입니다.",
        )
    # 1-2. name
    is_duplicate_name = await position_repository.get_position_by_name(
        db,
        payload.name,
        None,
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
    # 3-1. MongoDB
    position = PositionEntity(**position_data)  # **: 풀어서 넣는다는 뜻
    new_position_id = await position_repository.create_position(
        db,
        position,
    )
    new_position = await position_repository.get_position_by_id(
        db,
        new_position_id,
    )
    # 3-1-1. Read가 되지 않는 경우
    if not new_position:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="직급/직위가 저장되지 않았거나, 조회에 실패하였습니다.",
        )
    # 3-2. Redis
    await position_repository.create_position_redis(
        redis,
        str(new_position.get("_id")),
        str(new_position.get("name")),
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
    positions = await position_repository.get_positions_list(
        db,
        skip,
        limit,
    )
    # 2. Service => Router
    data = [
        PositionReadListRes(
            _id=str(position["_id"]),
            position_code=position["position_code"],
            name=position["name"],
            status=position["status"],
            order=position["order"],
        )
        for position in positions
    ]
    return data


# 직급/직위(Positon) 상세 조회(R-D) API
async def get_position(
    db: AsyncIOMotorDatabase,
    _id: str,
) -> PositionReadDetailRes:
    # 1. Service <= Repository
    position = await position_repository.get_position_by_id(
        db,
        _id,
    )
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
    db: AsyncIOMotorDatabase,
    redis: Redis,
    _id: str,
    payload: PositionUpdateReq,
) -> PositionUpdateRes:
    # 1. Duplicate Check
    # 1-1. position_code
    is_duplicate_position_code = (
        await position_repository.get_position_by_position_code(
            db,
            payload.position_code,
            _id,
        )
    )
    if is_duplicate_position_code:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 position_code입니다.",
        )
    # 1-2. name
    is_duplicate_name = await position_repository.get_position_by_name(
        db,
        payload.name,
        _id,
    )
    if is_duplicate_name:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 직급/직위명입니다.",
        )
    # 2. Service <= Repository
    updated_position = await position_repository.update_position(
        db,
        _id,
        {
            "position_code": payload.position_code,
            "name": payload.name,
            "updated_at": datetime.now(timezone.utc),
        },
    )
    # 2-1. Existing Check(404)
    if updated_position.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="수정할 직급/직위가 존재하지 않습니다.",
        )
    # 2-2. Redis
    await position_repository.update_position_redis(
        redis,
        _id,
        payload.name,
    )
    # 3. Service => Router
    data = PositionUpdateRes(
        matched_count=updated_position.matched_count,
        modified_count=updated_position.modified_count,
        acknowledged=updated_position.acknowledged,
    )
    return data


# 이 직급/직위를 쓰고 있는 컬렉션/필드 목록.
POSITION_REFERENCES = [
    ("employees", "position_id"),
]


# 직급/직위(Positon) 삭제(D) API
# reassign_to: 이 직급/직위를 쓰던 임직원을 대신 옮겨 담을 다른
# 직급/직위 _id.
async def delete_position(
    db: AsyncIOMotorDatabase,
    redis: Redis,
    _id: str,
    reassign_to: str | None = None,
) -> PositionDeleteRes:
    # 0. 참조 무결성 체크: 이 직급/직위를 쓰는 임직원이 있으면, 다른
    #    직급/직위로 먼저 옮긴 뒤에만 삭제할 수 있다.
    affected_count = await count_references(db, POSITION_REFERENCES, _id)
    if affected_count > 0:
        if reassign_to is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "message": (
                        "이 직급/직위를 사용 중인 임직원이 있습니다. "
                        "재배치할 직급/직위를 선택해 주세요."
                    ),
                    "requires_reassignment": True,
                    "affected_count": affected_count,
                },
            )
        if reassign_to == _id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="삭제할 직급/직위와 다른 항목을 선택해 주세요.",
            )
        reassign_target = await position_repository.get_position_by_id(
            db, reassign_to
        )
        if not reassign_target:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="재배치 대상 직급/직위를 찾을 수 없습니다.",
            )
        await reassign_references(
            db, POSITION_REFERENCES, _id, reassign_to
        )
    # 1. Service <= Repository
    deleted_position = await position_repository.delete_position(
        db,
        _id,
    )
    # 2. MongoDB
    # 2-1. Cannot Delete(500)
    if deleted_position.acknowledged is False:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="직급/직위 삭제에 실패했습니다.",
        )
    # 2-2. Existing Check(404)
    if deleted_position.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="삭제할 직급/직위 존재하지 않습니다.",
        )
    # 3. Redis
    await position_repository.delete_position_redis(
        redis,
        _id,
    )
    # 4. Service => Router
    data = PositionDeleteRes(
        deleted_count=deleted_position.deleted_count,
        acknowledged=deleted_position.acknowledged,
    )
    return data


# 직급/직위(Positon) 순서 변경(U) API
async def reorder_position(
    db: AsyncIOMotorDatabase,
    _id: str,
    payload: PositionReorderReq,
) -> PositionReorderRes:
    # 1. LexoRank => 새 order 계산
    new_order = await compute_reordered_value(
        db,
        position_repository.COLLECTION_NAME,
        payload.prev_id,
        payload.next_id,
    )
    # 2. Service <= Repository
    updated_position = await position_repository.update_position(
        db,
        _id,
        {
            "order": new_order,
            "updated_at": datetime.now(timezone.utc),
        },
    )
    # 2-1. Existing Check(404)
    if updated_position.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="순서를 변경할 직급/직위가 존재하지 않습니다.",
        )
    # 3. Service => Router
    data = PositionReorderRes(order=new_order)
    return data


# 직급/직위(Positon) 활성/비활성 상태 변경(U) API
async def update_position_status(
    db: AsyncIOMotorDatabase,
    _id: str,
    payload: PositionStatusReq,
) -> PositionStatusRes:
    # 1. Service <= Repository
    updated_position = await position_repository.update_position(
        db,
        _id,
        {
            "status": payload.status,
            "updated_at": datetime.now(timezone.utc),
        },
    )
    # 1-1. Existing Check(404)
    if updated_position.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="상태를 변경할 직급/직위가 존재하지 않습니다.",
        )
    # 2. Service => Router
    data = PositionStatusRes(
        matched_count=updated_position.matched_count,
        modified_count=updated_position.modified_count,
        acknowledged=updated_position.acknowledged,
    )
    return data
