from bson import ObjectId  # MongoDB 문서 id(_id) 타입을 다루는 라이브러리
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from apps.organization.duty.models.entities import DutyEntity

# MongoDB 콜렉션명: 마스터콜렉션_직무(mst_duties)
COLLECTION_NAME = "mst_duties"


# 직무(Duty) 생성(C) API
async def create_duty(db: AsyncIOMotorDatabase, duty: DutyEntity) -> str:
    try:
        # 1. Repository => DB
        data = await db[COLLECTION_NAME].insert_one(duty.model_dump())
        # 2. Repository => Service
        return str(data.inserted_id)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="중복된 _id입니다."
        )


# 직무(Duty) 목록 조회(R-L) API
async def get_duties_list(
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


# 직무(Duty) 상세 조회(R-D) API (by _id)
async def get_duty_by_id(db: AsyncIOMotorDatabase, _id: str) -> dict | None:
    # 0. Validation
    if not ObjectId.is_valid(_id):
        return None
    # 1. Repository => DB
    data = await db[COLLECTION_NAME].find_one({"_id": ObjectId(_id)})
    # 2. Repository => Service
    return data


# 직무(Duty) 중복 조회(R-D) API (by duty_id)
async def get_duty_by_duty_id(
    db: AsyncIOMotorDatabase, duty_id: str, _id: str | None
) -> dict | None:
    # 1. Repository => DB
    # [수정] "elif _id:"였던 것을 "else:"로 변경함
    # (_id가 빈 문자열("")로 들어오면 두 분기 모두 타지 못해 data 변수가
    #  만들어지지 않는 채로 return되어 오류가 나던 것을 방지)
    if _id is None:
        data = await db[COLLECTION_NAME].find_one({"duty_id": duty_id})
    else:
        data = await db[COLLECTION_NAME].find_one(
            {"_id": {"$ne": ObjectId(_id)}, "duty_id": duty_id}
        )
    # 2. Repository => Service
    return data


# 직무(Duty) 중복 조회(R-D) API (by name)
async def get_duty_by_name(
    db: AsyncIOMotorDatabase, name: str, _id: str | None
) -> dict | None:
    # 1. Repository => DB
    # [수정] "elif _id:"였던 것을 "else:"로 변경함 (사유는 위 함수와 동일)
    if _id is None:
        data = await db[COLLECTION_NAME].find_one({"name": name})
    else:
        data = await db[COLLECTION_NAME].find_one(
            {"_id": {"$ne": ObjectId(_id)}, "name": name}
        )
    # 2. Repository => Service
    return data


# 직무(Duty) 가장 마지막 order 조회(R-D) API (by order)
async def get_last_duty_order(db: AsyncIOMotorDatabase) -> dict | None:
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


# 직무(Duty) 수정(U) API
async def update_duty(
    db: AsyncIOMotorDatabase, _id: str, updated_fields: dict
) -> dict:
    # 1. Repository => DB
    data = await db[COLLECTION_NAME].update_one(
        {"_id": ObjectId(_id)}, {"$set": updated_fields}
    )
    # 2. Repository => Service
    return data


# 직무(Duty) 삭제(D) API
async def delete_duty(db: AsyncIOMotorDatabase, _id: str) -> dict:
    # 1. Repository => DB
    data = await db[COLLECTION_NAME].delete_one({"_id": ObjectId(_id)})
    # 2. Repository => Service
    return data
