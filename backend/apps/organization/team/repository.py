from bson import ObjectId  # MongoDB 문서 id(_id) 타입을 다루는 라이브러리
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError
from redis.asyncio import Redis

from apps.organization.team.models.entities import TeamEntity

# MongoDB 콜렉션명: 마스터콜렉션_팀(mst_teams)
COLLECTION_NAME = "mst_teams"


# 팀(Team) 생성(C) API - MongoDB
async def create_team(
    db: AsyncIOMotorDatabase,
    team: TeamEntity,
) -> str:
    try:
        # 1. Repository => DB
        data = await db[COLLECTION_NAME].insert_one(
            team.model_dump(),
        )
        # 2. Repository => Service
        return str(data.inserted_id)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="중복된 _id입니다.",
        )


# 팀(Team) 생성(C) API - Redis
async def create_team_redis(
    redis: Redis,
    field: str,
    value: str,
) -> None:
    # 1. Repository => Redis
    await redis.hset(
        COLLECTION_NAME,
        field,
        value,
    )
    # 2. Repository => Service
    return


# 팀(Team) 목록 조회(R-L) API - MongoDB
async def get_teams_list(
    db: AsyncIOMotorDatabase,
    skip: int,
    limit: int,
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


# 팀(Team) 상세 조회(R-D) API (by _id) - MongoDB
async def get_team_by_id(
    db: AsyncIOMotorDatabase,
    _id: str,
) -> dict | None:
    # 0. Validation
    if not ObjectId.is_valid(_id):
        return None
    # 1. Repository => DB
    data = await db[COLLECTION_NAME].find_one(
        {"_id": ObjectId(_id)},
    )
    # 2. Repository => Service
    return data


# 팀(Team) 중복 조회(R-D) API (by team_code) - MongoDB
async def get_team_by_team_code(
    db: AsyncIOMotorDatabase,
    team_code: str,
    _id: str | None,
) -> dict | None:
    # 1. Repository => DB
    if _id is None:
        data = await db[COLLECTION_NAME].find_one(
            {"team_code": team_code},
        )
    else:
        data = await db[COLLECTION_NAME].find_one(
            {
                "_id": {"$ne": ObjectId(_id)},
                "team_code": team_code,
            }
        )
    # 2. Repository => Service
    return data


# 팀(Team) 중복 조회(R-D) API (by name) - MongoDB
async def get_team_by_name(
    db: AsyncIOMotorDatabase,
    name: str,
    _id: str | None,
) -> dict | None:
    # 1. Repository => DB
    if _id is None:
        data = await db[COLLECTION_NAME].find_one(
            {"name": name},
        )
    else:
        data = await db[COLLECTION_NAME].find_one(
            {
                "_id": {"$ne": ObjectId(_id)},
                "name": name,
            }
        )
    # 2. Repository => Service
    return data


# 팀(Team) 가장 마지막 order 조회(R-D) API (by order) - MongoDB
async def get_last_team_order(
    db: AsyncIOMotorDatabase,
) -> dict | None:
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


# 팀(Team) 수정(U) API - MongoDB
async def update_team(
    db: AsyncIOMotorDatabase,
    _id: str,
    updated_fields: dict,
) -> dict:
    # 1. Repository => DB
    data = await db[COLLECTION_NAME].update_one(
        {"_id": ObjectId(_id)},
        {"$set": updated_fields},
    )
    # 2. Repository => Service
    return data


# 팀(Team) 수정(U) API - Redis
async def update_team_redis(
    redis: Redis,
    field: str,
    value: str,
) -> None:
    # 1. Repository => Redis
    await redis.hset(
        COLLECTION_NAME,
        field,
        value,
    )
    # 2. Repository => Service
    return


# 팀(Team) 삭제(D) API - MongoDB
async def delete_team(
    db: AsyncIOMotorDatabase,
    _id: str,
) -> dict:
    # 1. Repository => DB
    data = await db[COLLECTION_NAME].delete_one(
        {"_id": ObjectId(_id)},
    )
    # 2. Repository => Service
    return data


# 팀(Team) 삭제(D) API - Redis
async def delete_team_redis(
    redis: Redis,
    field: str,
) -> None:
    # 1. Repository => Redis
    await redis.hdel(
        COLLECTION_NAME,
        field,
    )
    # 2. Repository => Service
    return
