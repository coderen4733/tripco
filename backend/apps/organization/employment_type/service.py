from datetime import datetime, timezone

from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from redis.asyncio import Redis

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
    EmpTypeReorderReq,
    EmpTypeReorderRes,
    EmpTypeStatusReq,
    EmpTypeStatusRes,
    EmpTypeUpdateReq,
    EmpTypeUpdateRes,
)
from common.lexorank import LexoRank
from common.reassign import count_references, reassign_references
from common.reorder import compute_reordered_value


# 고용형태(EmploymentType) 생성(C) API
async def create_emp_type(
    db: AsyncIOMotorDatabase,
    redis: Redis,
    payload: EmpTypeCreateReq,
) -> EmpTypeCreateRes:
    # 1. Duplicate Check
    # 1-1. type_code
    is_duplicate_type_code = (
        await emp_type_repository.get_emp_type_by_type_code(
            db,
            payload.type_code,
            None,
        )
    )

    if is_duplicate_type_code:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 type_code입니다.",
        )
    # 1-2. type
    is_duplicate_type = await emp_type_repository.get_emp_type_by_type(
        db,
        payload.type,
        None,
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
    # 3-1. MongoDB
    emp_type = EmploymentTypeEntity(**emp_type_data)  # **: 풀어서 넣는다는 뜻
    new_emp_type_id = await emp_type_repository.create_emp_type(
        db,
        emp_type,
    )
    new_emp_type = await emp_type_repository.get_emp_type_by_id(
        db,
        new_emp_type_id,
    )
    # 3-1-1. Read가 되지 않는 경우
    if not new_emp_type:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="고용형태가 저장되지 않았거나, 조회에 실패하였습니다.",
        )
    # 3-2. Redis
    await emp_type_repository.create_emp_type_redis(
        redis,
        str(new_emp_type.get("_id")),
        str(new_emp_type.get("type")),
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
    emp_types = await emp_type_repository.get_emp_types_list(
        db,
        skip,
        limit,
    )
    # 2. Service => Router
    data = [
        EmpTypeReadListRes(
            _id=str(emp_type["_id"]),
            type_code=emp_type["type_code"],
            type=emp_type["type"],
            status=emp_type["status"],
            order=emp_type["order"],
        )
        for emp_type in emp_types
    ]
    return data


# 고용형태(EmploymentType) 상세 조회(R-D) API
async def get_emp_type(
    db: AsyncIOMotorDatabase,
    _id: str,
) -> EmpTypeReadDetailRes:
    # 1. Service <= Repository
    emp_type = await emp_type_repository.get_emp_type_by_id(
        db,
        _id,
    )
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
    db: AsyncIOMotorDatabase,
    redis: Redis,
    _id: str,
    payload: EmpTypeUpdateReq,
) -> EmpTypeUpdateRes:
    # 1. Duplicate Check
    # 1-1. type_code
    is_duplicate_type_code = (
        await emp_type_repository.get_emp_type_by_type_code(
            db,
            payload.type_code,
            _id,
        )
    )

    if is_duplicate_type_code:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 type_code입니다.",
        )
    # 1-2. type
    is_duplicate_type = await emp_type_repository.get_emp_type_by_type(
        db,
        payload.type,
        _id,
    )
    if is_duplicate_type:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 고용형태입니다.",
        )
    # 2. Service <= Repository
    updated_emp_type = await emp_type_repository.update_emp_type(
        db,
        _id,
        {
            "type_code": payload.type_code,
            "type": payload.type,
            "updated_at": datetime.now(timezone.utc),
        },
    )
    # 2-1. Existing Check(404)
    if updated_emp_type.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="수정할 고용형태가 존재하지 않습니다.",
        )
    # 2-2. Redis
    await emp_type_repository.update_emp_type_redis(
        redis,
        _id,
        payload.type,
    )
    # 3. Service => Router
    data = EmpTypeUpdateRes(
        matched_count=updated_emp_type.matched_count,
        modified_count=updated_emp_type.modified_count,
        acknowledged=updated_emp_type.acknowledged,
    )
    return data


# 이 고용형태를 쓰고 있는 컬렉션/필드 목록.
EMP_TYPE_REFERENCES = [
    ("employees", "employment_type"),
]


# 고용형태(EmploymentType) 삭제(D) API
# reassign_to: 이 고용형태를 쓰던 임직원을 대신 옮겨 담을 다른 고용형태 _id.
async def delete_emp_type(
    db: AsyncIOMotorDatabase,
    redis: Redis,
    _id: str,
    reassign_to: str | None = None,
) -> EmpTypeDeleteRes:
    # 0. 참조 무결성 체크: 이 고용형태를 쓰는 임직원이 있으면, 다른
    #    고용형태로 먼저 옮긴 뒤에만 삭제할 수 있다.
    affected_count = await count_references(
        db, EMP_TYPE_REFERENCES, _id
    )
    if affected_count > 0:
        if reassign_to is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "message": (
                        "이 고용형태를 사용 중인 임직원이 있습니다. "
                        "재배치할 고용형태를 선택해 주세요."
                    ),
                    "requires_reassignment": True,
                    "affected_count": affected_count,
                },
            )
        if reassign_to == _id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="삭제할 고용형태와 다른 항목을 선택해 주세요.",
            )
        reassign_target = await emp_type_repository.get_emp_type_by_id(
            db, reassign_to
        )
        if not reassign_target:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="재배치 대상 고용형태를 찾을 수 없습니다.",
            )
        await reassign_references(
            db, EMP_TYPE_REFERENCES, _id, reassign_to
        )
    # 1. Service <= Repository
    deleted_emp_type = await emp_type_repository.delete_emp_type(
        db,
        _id,
    )
    # 2. MongoDB
    # 2-1. Cannot Delete(500)
    if deleted_emp_type.acknowledged is False:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="고용형태 삭제에 실패했습니다.",
        )
    # 2-2. Existing Check(404)
    if deleted_emp_type.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="삭제할 고용형태가 존재하지 않습니다.",
        )
    # 3. Redis
    await emp_type_repository.delete_emp_type_redis(
        redis,
        _id,
    )
    # 4. Service => Router
    data = EmpTypeDeleteRes(
        deleted_count=deleted_emp_type.deleted_count,
        acknowledged=deleted_emp_type.acknowledged,
    )
    return data


# 고용형태(EmploymentType) 순서 변경(U) API
async def reorder_emp_type(
    db: AsyncIOMotorDatabase,
    _id: str,
    payload: EmpTypeReorderReq,
) -> EmpTypeReorderRes:
    # 1. LexoRank => 새 order 계산
    new_order = await compute_reordered_value(
        db,
        emp_type_repository.COLLECTION_NAME,
        payload.prev_id,
        payload.next_id,
    )
    # 2. Service <= Repository
    updated_emp_type = await emp_type_repository.update_emp_type(
        db,
        _id,
        {
            "order": new_order,
            "updated_at": datetime.now(timezone.utc),
        },
    )
    # 2-1. Existing Check(404)
    if updated_emp_type.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="순서를 변경할 고용형태가 존재하지 않습니다.",
        )
    # 3. Service => Router
    data = EmpTypeReorderRes(order=new_order)
    return data


# 고용형태(EmploymentType) 활성/비활성 상태 변경(U) API
async def update_emp_type_status(
    db: AsyncIOMotorDatabase,
    _id: str,
    payload: EmpTypeStatusReq,
) -> EmpTypeStatusRes:
    # 1. Service <= Repository
    updated_emp_type = await emp_type_repository.update_emp_type(
        db,
        _id,
        {
            "status": payload.status,
            "updated_at": datetime.now(timezone.utc),
        },
    )
    # 1-1. Existing Check(404)
    if updated_emp_type.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="상태를 변경할 고용형태가 존재하지 않습니다.",
        )
    # 2. Service => Router
    data = EmpTypeStatusRes(
        matched_count=updated_emp_type.matched_count,
        modified_count=updated_emp_type.modified_count,
        acknowledged=updated_emp_type.acknowledged,
    )
    return data
