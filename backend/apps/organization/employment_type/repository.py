from bson import ObjectId  # MongoDB 문서 id(_id) 타입을 다루는 라이브러리
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from apps.organization.employment_type.models.entities import (
    EmploymentTypeEntity,
)

# MongoDB 콜렉션명: 마스터콜렉션_고용형태(mst_employment_types)
COLLECTION_NAME = "mst_employment_types"


# 고용형태(EmploymentType) 생성(C) API
async def create_emp_type(
    db: AsyncIOMotorDatabase, emp_type: EmploymentTypeEntity
) -> str:
    try:
        # 1. Repository => DB
        data = await db[COLLECTION_NAME].insert_one(emp_type.model_dump())
        # 2. Repository => Service
        return str(data.inserted_id)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="중복된 _id입니다."
        )


# 고용형태(EmploymentType) 목록 조회(R-L) API
async def get_emp_types_list(
    db: AsyncIOMotorDatabase, skip: int, limit: int
) -> list[dict]:
    # 0. skip/limit으로 페이지네이션
    cursor = (
        db[COLLECTION_NAME]
        .find()  # 모든 문서 조회
        .sort("order", 1)  # 오름차순으로 정렬
        .skip(skip)  # 페이지네이션 skip: 앞 부분 데이터 건너뜀
        .limit(limit)  # 페이지네이션 limit: 몇 개씩 데이터를 가져올 것인지
    )
    # 1. Repository => DB
    data = await cursor.to_list(length=limit)
    # 2. Repository => Service
    return data


# 고용형태(EmploymentType) 상세 조회(R-D) API (by _id)
async def get_emp_type_by_id(
    db: AsyncIOMotorDatabase, _id: str
) -> dict | None:
    # 0. Validation
    if not ObjectId.is_valid(_id):
        return None
    # 1. Repository => DB
    data = await db[COLLECTION_NAME].find_one({"_id": ObjectId(_id)})
    # 2. Repository => Service
    return data


# 고용형태(EmploymentType) 중복 조회(R-D) API (by type_id)
async def get_emp_type_by_type_id(
    db: AsyncIOMotorDatabase, type_id: str, _id: str | None
) -> dict | None:
    # 1. Repository => DB
    # [수정] "elif _id:"였던 것을 "else:"로 변경함
    # (_id가 빈 문자열("")로 들어오면 두 분기 모두 타지 못해 data 변수가
    #  만들어지지 않는 채로 return되어 오류가 나던 것을 방지)
    if _id is None:
        data = await db[COLLECTION_NAME].find_one({"type_id": type_id})
    else:
        data = await db[COLLECTION_NAME].find_one(
            {"_id": {"$ne": ObjectId(_id)}, "type_id": type_id}
        )
    # 2. Repository => Service
    return data


# 고용형태(EmploymentType) 중복 조회(R-D) API (by type)
async def get_emp_type_by_type(
    db: AsyncIOMotorDatabase, type: str, _id: str | None
) -> dict | None:
    # 1. Repository => DB
    # [수정] "elif _id:"였던 것을 "else:"로 변경함 (사유는 위 함수와 동일)
    if _id is None:
        data = await db[COLLECTION_NAME].find_one({"type": type})
    else:
        data = await db[COLLECTION_NAME].find_one(
            {"_id": {"$ne": ObjectId(_id)}, "type": type}
        )
    # 2. Repository => Service
    return data


# 고용형태(EmploymentType) 가장 마지막 order 조회(R-D) API (by order)
async def get_last_emp_type_order(db: AsyncIOMotorDatabase) -> dict | None:
    # 0. 가장 마지막 order 1개만
    cursor = (
        db[COLLECTION_NAME]
        .find({}, {"order": 1})  # order 필드만 가져와서 최적화
        .sort("order", -1)  # 내림차순 정렬 (가장 큰 값이 맨 위로)
        .limit(1)  # 1개만 조회
    )
    # 1. Repository => DB
    data = await cursor.to_list(length=1)
    # 2. Repository => Service
    return data[0] if data else None


# 고용형태(EmploymentType) 수정(U) API
async def update_emp_type(
    db: AsyncIOMotorDatabase, _id: str, updated_fields: dict
) -> dict:
    # 1. Repository => DB
    data = await db[COLLECTION_NAME].update_one(
        {"_id": ObjectId(_id)}, {"$set": updated_fields}
    )
    # 2. Repository => Service
    return data


# 고용형태(EmploymentType) 삭제(D) API
async def delete_emp_type(db: AsyncIOMotorDatabase, _id: str) -> dict:
    # 1. Repository => DB
    data = await db[COLLECTION_NAME].delete_one({"_id": ObjectId(_id)})
    # 2. Repository => Service
    return data
