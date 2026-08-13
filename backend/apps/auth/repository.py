from bson import ObjectId  # MongoDB 문서 id(_id) 타입을 다루는 라이브러리
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from apps.auth.models.entities import TokenEntity

# MongoDB에서 Token이 저장되는 컬렉션 이름
COLLECTION_NAME = "refresh_tokens"


# Refresh Token 조회(R-D) by refresh_token
async def find_refresh_token_by_refresh_token(
    db: AsyncIOMotorDatabase, refresh_token: str
) -> dict | None:
    return await db[COLLECTION_NAME].find_one({"refresh_token": refresh_token})


# Refresh Token 조회(R-D) by employee_id
async def find_refresh_token_by_employee_id(
    db: AsyncIOMotorDatabase, employee_id: str
) -> dict | None:
    if not ObjectId.is_valid(employee_id):
        return None
    return await db[COLLECTION_NAME].find_one({"employee_id": employee_id})


# Refresh Token 생성(C)
async def create_refresh_token(
    db: AsyncIOMotorDatabase, token: TokenEntity
) -> dict:
    try:
        # 1. Refresh Token 생성
        result = await db[COLLECTION_NAME].insert_one(token.model_dump())
        # 2. 반환
        return result
    except DuplicateKeyError:
        # DB 레벨에서 unique 제약 조건(중복)에 걸렸을 때 예외 처리(409)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 리프레시 토큰입니다.",
        )


# Refresh Token 삭제(D) by refresh_token
async def delete_refresh_token_by_refresh_token(
    db: AsyncIOMotorDatabase, refresh_token: str
) -> int:
    # 실제로 삭제된 문서 수 반환(0이면 이미 없는/잘못된 토큰이라는 뜻)
    result = await db[COLLECTION_NAME].delete_one(
        {"refresh_token": refresh_token}
    )
    return result.deleted_count
