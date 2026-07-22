from datetime import datetime, timezone

from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from apps.organization.duty import repository as duty_repository
from apps.organization.duty.models.entities import DutyEntity
from apps.organization.duty.models.schemas import (
    DutyCreateReq,
    DutyCreateRes,
    DutyDeleteRes,
    DutyReadDetailRes,
    DutyReadListRes,
    DutyUpdateReq,
    DutyUpdateRes,
)
from common.lexorank import LexoRank


# 직무(Duty) 생성(C) API
async def create_duty(
    db: AsyncIOMotorDatabase, payload: DutyCreateReq
) -> DutyCreateRes:
    # 1. Duplicate Check
    # 1-1. duty_id
    is_duplicate_duty_id = await duty_repository.get_duty_by_duty_id(
        db, payload.duty_id, None
    )
    if is_duplicate_duty_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 duty_id입니다.",
        )
    # 1-2. name
    is_duplicate_name = await duty_repository.get_duty_by_name(
        db, payload.name, None
    )
    if is_duplicate_name:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 직무명입니다.",
        )
    # 2. LexoRank => Order
    last_duty = await duty_repository.get_last_duty_order(db)
    if last_duty and "order" in last_duty:
        # 2-1. 데이터가 존재한다면: 가장 마지막 order 다음 order 생성
        new_order = LexoRank.get_next(last_duty["order"])
    else:
        # 2-2. 데이터가 존재하지 않는다면(첫 등록): 기본 중간값(i00000) order로
        new_order = LexoRank.get_middle()
    duty_data = payload.model_dump()
    duty_data["order"] = new_order

    # 3. Create & Read
    duty = DutyEntity(**duty_data)  # **: 풀어서 넣는다는 뜻
    new_duty_id = await duty_repository.create_duty(db, duty)
    new_duty = await duty_repository.get_duty_by_id(db, new_duty_id)
    # 3-1. Read가 되지 않는 경우
    if not new_duty:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="직무가 저장되지 않았거나, 조회에 실패하였습니다.",
        )
    # 4. Service => Router
    data = DutyCreateRes(**new_duty)
    return data


# 직무(Duty) 목록 조회(R-L) API
async def get_duties_list(
    db: AsyncIOMotorDatabase,
    skip: int,
    limit: int,
) -> list[DutyReadListRes]:
    # 1. Service <= Repository
    duties = await duty_repository.get_duties_list(db, skip, limit)
    # 2. Service => Router
    data = [
        DutyReadListRes(
            _id=str(duty["_id"]),
            duty_id=duty["duty_id"],
            name=duty["name"],
            status=duty["status"],
            order=duty["order"],
        )
        for duty in duties
    ]
    return data


# 직무(Duty) 상세 조회(R-D) API
async def get_duty(db: AsyncIOMotorDatabase, _id: str) -> DutyReadDetailRes:
    # 1. Service <= Repository
    duty = await duty_repository.get_duty_by_id(db, _id)
    # 2. Existing Check(404)
    if duty is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="상세 조회할 직무가 존재하지 않습니다.",
        )
    # 3. Service => Router
    data = DutyReadDetailRes(**duty)
    return data


# 직무(Duty) 수정(U) API
async def update_duty(
    db: AsyncIOMotorDatabase, _id: str, payload: DutyUpdateReq
) -> DutyUpdateRes:
    # 0. Duplicate Check
    # 0-1. duty_id
    is_duplicate_duty_id = await duty_repository.get_duty_by_duty_id(
        db, payload.duty_id, _id
    )
    if is_duplicate_duty_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 duty_id입니다.",
        )
    # 0-2. name
    is_duplicate_name = await duty_repository.get_duty_by_name(
        db, payload.name, _id
    )
    if is_duplicate_name:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 직무명입니다.",
        )
    # 1. Service <= Repository
    updated_duty = await duty_repository.update_duty(
        db,
        _id,
        {
            "duty_id": payload.duty_id,
            "name": payload.name,
            "updated_at": datetime.now(timezone.utc),
        },
    )
    # 2. Existing Check(404)
    if updated_duty.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="수정할 직무가 존재하지 않습니다.",
        )
    # 3. Service => Router
    data = DutyUpdateRes(
        matched_count=updated_duty.matched_count,
        modified_count=updated_duty.modified_count,
        acknowledged=updated_duty.acknowledged,
    )
    return data


# 직무(Duty) 삭제(D) API
async def delete_duty(db: AsyncIOMotorDatabase, _id: str) -> DutyDeleteRes:
    # 1. Service <= Repository
    deleted_duty = await duty_repository.delete_duty(db, _id)
    # 2. Cannot Delete(500)
    if deleted_duty.acknowledged is False:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="직무 삭제에 실패했습니다.",
        )
    # 3. Existing Check(404)
    if deleted_duty.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="삭제할 직무가 존재하지 않습니다.",
        )
    # 4. Service => Router
    data = DutyDeleteRes(
        deleted_count=deleted_duty.deleted_count,
        acknowledged=deleted_duty.acknowledged,
    )
    return data
