from datetime import datetime, timezone

from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from apps.organization.employment_type import repository as emp_type_repository
from apps.organization.employment_type.models.entities import (
    EmploymentTypeEntity,
)
from apps.organization.employment_type.models.schemas import (
    EmpTypeCreateReq,
    EmpTypeCreateRes,
    EmpTypeDeleteRes,
    EmpTypeReadDetailRes,
    EmpTypeReadListRes,
    EmpTypeUpdateReq,
    EmpTypeUpdateRes,
)
from common.lexorank import LexoRank


# 고용형태(EmploymentType) 생성(C) API
async def create_emp_type(
    db: AsyncIOMotorDatabase, payload: EmpTypeCreateReq
) -> EmpTypeCreateRes:
    # 1. Duplicate Check
    # 1-1. type_id
    is_duplicate_type_id = await emp_type_repository.get_emp_type_by_type_id(
        db, payload.type_id, None
    )
    if is_duplicate_type_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 type_id입니다.",
        )
    # 1-2. type
    is_duplicate_type = await emp_type_repository.get_emp_type_by_type(
        db, payload.type, None
    )
    if is_duplicate_type:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 고용형태입니다.",
        )
    # 2. LexoRank => Order
    last_emp_type = await emp_type_repository.get_last_emp_type_order(db)
    if last_emp_type and "order" in last_emp_type:
        # 2-1. 데이터가 존재한다면: 가장 마지막 order 다음 order 생성
        new_order = LexoRank.get_next(last_emp_type["order"])
    else:
        # 2-2. 데이터가 존재하지 않는다면(첫 등록): 기본 중간값(i00000) order로
        new_order = LexoRank.get_middle()
    emp_type_data = payload.model_dump()
    emp_type_data["order"] = new_order

    # 3. Create & Read
    emp_type = EmploymentTypeEntity(**emp_type_data)  # **: 풀어서 넣는다는 뜻
    new_emp_type_id = await emp_type_repository.create_emp_type(db, emp_type)
    new_emp_type = await emp_type_repository.get_emp_type_by_id(
        db, new_emp_type_id
    )
    # 3-1. Read가 되지 않는 경우
    if not new_emp_type:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="고용형태가 저장되지 않았거나, 조회에 실패하였습니다.",
        )
    # 4. Service => Router
    data = EmpTypeCreateRes(**new_emp_type)
    return data


# 고용형태(EmploymentType) 목록 조회(R-L) API
async def get_emp_types_list(
    db: AsyncIOMotorDatabase,
    skip: int,
    limit: int,
) -> list[EmpTypeReadListRes]:
    # 1. Service <= Repository
    emp_types = await emp_type_repository.get_emp_types_list(db, skip, limit)
    # 2. Service => Router
    data = [
        EmpTypeReadListRes(
            _id=str(emp_type["_id"]),
            type_id=emp_type["type_id"],
            type=emp_type["type"],
            status=emp_type["status"],
            order=emp_type["order"],
        )
        for emp_type in emp_types
    ]
    return data


# 고용형태(EmploymentType) 상세 조회(R-D) API
async def get_emp_type(
    db: AsyncIOMotorDatabase, _id: str
) -> EmpTypeReadDetailRes:
    # 1. Service <= Repository
    emp_type = await emp_type_repository.get_emp_type_by_id(db, _id)
    # 2. Existing Check(404)
    if emp_type is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="상세 조회할 고용형태가 존재하지 않습니다.",
        )
    # 3. Service => Router
    data = EmpTypeReadDetailRes(**emp_type)
    return data


# 고용형태(EmploymentType) 수정(U) API
async def update_emp_type(
    db: AsyncIOMotorDatabase, _id: str, payload: EmpTypeUpdateReq
) -> EmpTypeUpdateRes:
    # 0. Duplicate Check
    # 0-1. type_id
    is_duplicate_type_id = await emp_type_repository.get_emp_type_by_type_id(
        db, payload.type_id, _id
    )
    if is_duplicate_type_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 type_id입니다.",
        )
    # 0-2. type
    is_duplicate_type = await emp_type_repository.get_emp_type_by_type(
        db, payload.type, _id
    )
    if is_duplicate_type:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 고용형태입니다.",
        )
    # 1. Service <= Repository
    updated_emp_type = await emp_type_repository.update_emp_type(
        db,
        _id,
        {
            "type_id": payload.type_id,
            "type": payload.type,
            "updated_at": datetime.now(timezone.utc),
        },
    )
    # 2. Existing Check(404)
    if updated_emp_type.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="수정할 고용형태가 존재하지 않습니다.",
        )
    # 3. Service => Router
    data = EmpTypeUpdateRes(
        matched_count=updated_emp_type.matched_count,
        modified_count=updated_emp_type.modified_count,
        acknowledged=updated_emp_type.acknowledged,
    )
    return data


# 고용형태(EmploymentType) 삭제(D) API
async def delete_emp_type(
    db: AsyncIOMotorDatabase, _id: str
) -> EmpTypeDeleteRes:
    # 1. Service <= Repository
    deleted_emp_type = await emp_type_repository.delete_emp_type(db, _id)
    # 2. Cannot Delete(500)
    if deleted_emp_type.acknowledged is False:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="고용형태 삭제에 실패했습니다.",
        )
    # 3. Existing Check(404)
    if deleted_emp_type.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="삭제할 고용형태가 존재하지 않습니다.",
        )
    # 4. Service => Router
    data = EmpTypeDeleteRes(
        deleted_count=deleted_emp_type.deleted_count,
        acknowledged=deleted_emp_type.acknowledged,
    )
    return data
