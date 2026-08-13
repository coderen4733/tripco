from bson import ObjectId  # MongoDB 문서 id(_id) 타입을 다루는 라이브러리
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from apps.employee.models.entities import EmployeeEntity

# MongoDB 콜렉션명: 임직원(employees)
COLLECTION_NAME = "employees"


# 임직원(Employee) 생성(C) API - MongoDB
async def create_employee(
    db: AsyncIOMotorDatabase,
    employee: EmployeeEntity,
) -> str:
    try:
        # 1. Repository => DB
        data = await db[COLLECTION_NAME].insert_one(
            employee.model_dump(),
        )
        # 2. Repository => Service
        return str(data.inserted_id)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="중복된 _id입니다.",
        )


# 임직원(Employee) 목록 조회(R-L) API - MongoDB
async def get_employees_list(
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


# 임직원(Employee) 상세 조회(R-D) API (by _id) - MongoDB
async def get_employee_by_id(
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


# 임직원(Employee) 중복 조회(R-D) API (by login_id) - MongoDB
async def get_employee_by_login_id(
    db: AsyncIOMotorDatabase,
    login_id: str,
    _id: str | None,
) -> dict | None:
    # 1. Repository => DB
    if _id is None:
        data = await db[COLLECTION_NAME].find_one(
            {"login_id": login_id},
        )
    else:
        data = await db[COLLECTION_NAME].find_one(
            {
                "_id": {"$ne": ObjectId(_id)},
                "login_id": login_id,
            }
        )
    # 2. Repository => Service
    return data


# 임직원(Employee) 중복 조회(R-D) API (by employee_id) - MongoDB
async def get_employee_by_employee_id(
    db: AsyncIOMotorDatabase,
    employee_id: str,
    _id: str | None,
) -> dict | None:
    # 1. Repository => DB
    if _id is None:
        data = await db[COLLECTION_NAME].find_one(
            {"employee_id": employee_id},
        )
    else:
        data = await db[COLLECTION_NAME].find_one(
            {
                "_id": {"$ne": ObjectId(_id)},
                "employee_id": employee_id,
            }
        )
    # 2. Repository => Service
    return data


# 임직원(Employee) 수정(U) API - MongoDB
async def update_employee(
    db: AsyncIOMotorDatabase,
    _id: str,
    updated_fields: dict,
) -> dict:
    try:
        # 1. Repository => DB
        data = await db[COLLECTION_NAME].update_one(
            {"_id": ObjectId(_id)},
            {"$set": updated_fields},
        )
        # 2. Repository => Service
        return data
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="중복된 login_id입니다.",
        )
