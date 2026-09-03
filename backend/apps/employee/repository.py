from bson import ObjectId  # MongoDB 문서 id(_id) 타입을 다루는 라이브러리
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from apps.employee.models.entities import EmployeeEntity

# MongoDB 콜렉션명: 임직원(employees)
COLLECTION_NAME = "employees"
COLLECTION_TEMP = "employee_registrations"  # 승인 대기 목록 전용 컬렉션


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


# 마지막 로그인 일시 기록(last_sign_in_time)
async def last_sign_in_time(
    db: AsyncIOMotorDatabase, _id: str, sign_in_time: any
) -> None:
    await db[COLLECTION_NAME].update_one(
        {"_id": ObjectId(_id)},
        {
            "$set": {"last_sign_in_at": sign_in_time},
        },
    )


# 임직원(Employee) 권한(admin_role) 목록으로 조회(R-L) API - MongoDB
# 알람(apps/alarm)에서 관리자급 임직원 전체에게 알림을 보낼 때 사용한다.
async def get_employees_by_admin_roles(
    db: AsyncIOMotorDatabase,
    admin_roles: list[str],
) -> list[dict]:
    # 1. Repository => DB
    cursor = db[COLLECTION_NAME].find({"admin_role": {"$in": admin_roles}})
    data = await cursor.to_list(length=None)
    # 2. Repository => Service
    return data


# ─────────────────────────────────────────────────────────────────
# 여기서부터는 신규 계정 신청(회원가입) 대기 명단(employee_registrations,
# COLLECTION_TEMP) 관련 함수입니다. apps/auth의 sign_up 흐름에서 쓰이며,
# 관리자가 승인하면 여기 저장된 문서를 employees로 옮기고(create_employee)
# 이 컬렉션에서는 삭제한다(delete_employee_registration).
# ─────────────────────────────────────────────────────────────────


# 신규 계정 신청(Registration) 생성(C) API - MongoDB
async def create_employee_registration(
    db: AsyncIOMotorDatabase,
    registration: EmployeeEntity,
) -> str:
    try:
        # 1. Repository => DB
        data = await db[COLLECTION_TEMP].insert_one(
            registration.model_dump(),
        )
        # 2. Repository => Service
        return str(data.inserted_id)
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="중복된 _id입니다.",
        )


# 신규 계정 신청(Registration) 목록 조회(R-L) API - MongoDB
async def get_employee_registrations_list(
    db: AsyncIOMotorDatabase,
) -> list[dict]:
    # 1. Repository => DB
    cursor = db[COLLECTION_TEMP].find().sort("created_at", 1)
    data = await cursor.to_list(length=None)
    # 2. Repository => Service
    return data


# 신규 계정 신청(Registration) 상세 조회(R-D) API (by _id) - MongoDB
async def get_employee_registration_by_id(
    db: AsyncIOMotorDatabase,
    _id: str,
) -> dict | None:
    # 0. Validation
    if not ObjectId.is_valid(_id):
        return None
    # 1. Repository => DB
    data = await db[COLLECTION_TEMP].find_one(
        {"_id": ObjectId(_id)},
    )
    # 2. Repository => Service
    return data


# 신규 계정 신청(Registration) 중복 조회(R-D) API (by login_id) - MongoDB
async def get_employee_registration_by_login_id(
    db: AsyncIOMotorDatabase,
    login_id: str,
    _id: str | None,
) -> dict | None:
    # 1. Repository => DB
    if _id is None:
        data = await db[COLLECTION_TEMP].find_one(
            {"login_id": login_id},
        )
    else:
        data = await db[COLLECTION_TEMP].find_one(
            {
                "_id": {"$ne": ObjectId(_id)},
                "login_id": login_id,
            }
        )
    # 2. Repository => Service
    return data


# 신규 계정 신청(Registration) 중복 조회(R-D) API (by employee_id) - MongoDB
async def get_employee_registration_by_employee_id(
    db: AsyncIOMotorDatabase,
    employee_id: str,
    _id: str | None,
) -> dict | None:
    # 1. Repository => DB
    if _id is None:
        data = await db[COLLECTION_TEMP].find_one(
            {"employee_id": employee_id},
        )
    else:
        data = await db[COLLECTION_TEMP].find_one(
            {
                "_id": {"$ne": ObjectId(_id)},
                "employee_id": employee_id,
            }
        )
    # 2. Repository => Service
    return data


# 신규 계정 신청(Registration) 수정(U) API - MongoDB
# (프로필 사진 업로드 후 profile_image_url을 채워 넣을 때 사용한다)
async def update_employee_registration(
    db: AsyncIOMotorDatabase,
    _id: str,
    updated_fields: dict,
) -> dict:
    # 1. Repository => DB
    data = await db[COLLECTION_TEMP].update_one(
        {"_id": ObjectId(_id)},
        {"$set": updated_fields},
    )
    # 2. Repository => Service
    return data


# 신규 계정 신청(Registration) 삭제(D) API - MongoDB
# (관리자가 승인해서 employees로 옮긴 뒤, 대기 명단에서는 지울 때 사용한다)
async def delete_employee_registration(
    db: AsyncIOMotorDatabase,
    _id: str,
) -> dict:
    # 1. Repository => DB
    data = await db[COLLECTION_TEMP].delete_one(
        {"_id": ObjectId(_id)},
    )
    # 2. Repository => Service
    return data


# 신규 계정 신청(Registration) 승인/반려(D) API - MongoDB (원자적 조회+삭제)
# find_one_and_delete는 "조회"와 "삭제"가 한 번의 DB 연산으로 원자적으로
# 일어난다. 그래서 두 관리자가 거의 동시에 같은 신청을 승인/반려하더라도,
# 실제로 문서를 가져오는(=삭제되는) 쪽은 둘 중 하나뿐이고 나머지 한 쪽은
# None을 돌려받는다. 이렇게 이중 승인(employees 중복 생성)을 막는다.
async def pop_employee_registration(
    db: AsyncIOMotorDatabase,
    _id: str,
) -> dict | None:
    if not ObjectId.is_valid(_id):
        return None
    # 1. Repository => DB
    data = await db[COLLECTION_TEMP].find_one_and_delete(
        {"_id": ObjectId(_id)},
    )
    # 2. Repository => Service
    return data


# 신규 계정 신청(Registration) 복구(C) API - MongoDB
# pop_employee_registration으로 꺼낸 뒤, employees 생성이 실패했을 때
# (예: 그 사이 사번이 중복되어버린 경우) 대기 명단으로 되돌리는 용도다.
# 원래 _id를 그대로 유지해서 재저장한다.
async def restore_employee_registration(
    db: AsyncIOMotorDatabase,
    registration: dict,
) -> None:
    # 1. Repository => DB
    await db[COLLECTION_TEMP].insert_one(registration)
