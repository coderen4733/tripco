from datetime import datetime, timezone

from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from apps.organization.title import repository as title_repository
from apps.organization.title.models.entities import TitleEntity
from apps.organization.title.models.schemas import (
    TitleCreateReq,
    TitleCreateRes,
    TitleDeleteRes,
    TitleReadDetailRes,
    TitleReadListRes,
    TitleUpdateReq,
    TitleUpdateRes,
)
from common.lexorank import LexoRank


# 직책(Title) 생성(C) API
async def create_title(
    db: AsyncIOMotorDatabase, payload: TitleCreateReq
) -> TitleCreateRes:
    # 1. Duplicate Check
    # 1-1. title_id
    is_duplicate_title_id = await title_repository.get_title_by_title_id(
        db, payload.title_id, None
    )
    if is_duplicate_title_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 title_id입니다.",
        )
    # 1-2. name
    is_duplicate_name = await title_repository.get_title_by_name(
        db, payload.name, None
    )
    if is_duplicate_name:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 직책명입니다.",
        )
    # 2. LexoRank => Order
    last_title = await title_repository.get_last_title_order(db)
    if last_title and "order" in last_title:
        # 2-1. 데이터가 존재한다면: 가장 마지막 order 다음 order 생성
        new_order = LexoRank.get_next(last_title["order"])
    else:
        # 2-2. 데이터가 존재하지 않는다면(첫 등록): 기본 중간값(i00000) order로
        new_order = LexoRank.get_middle()
    title_data = payload.model_dump()
    title_data["order"] = new_order

    # 3. Create & Read
    title = TitleEntity(**title_data)  # **: 풀어서 넣는다는 뜻
    new_title_id = await title_repository.create_title(db, title)
    new_title = await title_repository.get_title_by_id(db, new_title_id)
    # 3-1. Read가 되지 않는 경우
    if not new_title:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="직책이 저장되지 않았거나, 조회에 실패하였습니다.",
        )
    # 4. Service => Router
    data = TitleCreateRes(**new_title)
    return data


# 직책(Title) 목록 조회(R-L) API
async def get_titles_list(
    db: AsyncIOMotorDatabase,
    skip: int,
    limit: int,
) -> list[TitleReadListRes]:
    # 1. Service <= Repository
    titles = await title_repository.get_titles_list(db, skip, limit)
    # 2. Service => Router
    data = [
        TitleReadListRes(
            _id=str(title["_id"]),
            title_id=title["title_id"],
            name=title["name"],
            status=title["status"],
            order=title["order"],
        )
        for title in titles
    ]
    return data


# 직책(Title) 상세 조회(R-D) API
async def get_title(db: AsyncIOMotorDatabase, _id: str) -> TitleReadDetailRes:
    # 1. Service <= Repository
    title = await title_repository.get_title_by_id(db, _id)
    # 2. Existing Check(404)
    if title is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="상세 조회할 직책이 존재하지 않습니다.",
        )
    # 3. Service => Router
    data = TitleReadDetailRes(**title)
    return data


# 직책(Title) 수정(U) API
async def update_title(
    db: AsyncIOMotorDatabase, _id: str, payload: TitleUpdateReq
) -> TitleUpdateRes:
    # 0. Duplicate Check
    # 0-1. title_id
    is_duplicate_title_id = await title_repository.get_title_by_title_id(
        db, payload.title_id, _id
    )
    if is_duplicate_title_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 title_id입니다.",
        )
    # 0-2. name
    is_duplicate_name = await title_repository.get_title_by_name(
        db, payload.name, _id
    )
    if is_duplicate_name:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 직책명입니다.",
        )
    # 1. Service <= Repository
    updated_title = await title_repository.update_title(
        db,
        _id,
        {
            "title_id": payload.title_id,
            "name": payload.name,
            "updated_at": datetime.now(timezone.utc),
        },
    )
    # 2. Existing Check(404)
    if updated_title.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="수정할 직책이 존재하지 않습니다.",
        )
    # 3. Service => Router
    data = TitleUpdateRes(
        matched_count=updated_title.matched_count,
        modified_count=updated_title.modified_count,
        acknowledged=updated_title.acknowledged,
    )
    return data


# 직책(Title) 삭제(D) API
async def delete_title(db: AsyncIOMotorDatabase, _id: str) -> TitleDeleteRes:
    # 1. Service <= Repository
    deleted_title = await title_repository.delete_title(db, _id)
    # 2. Cannot Delete(500)
    if deleted_title.acknowledged is False:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="직책 삭제에 실패했습니다.",
        )
    # 3. Existing Check(404)
    if deleted_title.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="삭제할 직책이 존재하지 않습니다.",
        )
    # 4. Service => Router
    data = TitleDeleteRes(
        deleted_count=deleted_title.deleted_count,
        acknowledged=deleted_title.acknowledged,
    )
    return data
