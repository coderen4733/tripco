from bson import ObjectId  # MongoDB 문서 id(_id) 타입을 다루는 라이브러리
from motor.motor_asyncio import AsyncIOMotorDatabase

from apps.alarm.models.entities import AlarmEntity

# MongoDB 콜렉션명: 알람(alarms)
COLLECTION_NAME = "alarms"


# 알람(Alarm) 생성(C) API - MongoDB
async def create_alarm(
    db: AsyncIOMotorDatabase,
    alarm: AlarmEntity,
) -> str:
    # 1. Repository => DB
    data = await db[COLLECTION_NAME].insert_one(alarm.model_dump())
    # 2. Repository => Service
    return str(data.inserted_id)


# 알람(Alarm) 여러 건 한 번에 생성(C) API - MongoDB
# (관리자급 임직원 여러 명에게 한 번에 알람을 보낼 때 사용한다)
async def create_alarms_bulk(
    db: AsyncIOMotorDatabase,
    alarms: list[AlarmEntity],
) -> None:
    if not alarms:
        return
    # 1. Repository => DB
    await db[COLLECTION_NAME].insert_many(
        [alarm.model_dump() for alarm in alarms]
    )


# 알람(Alarm) 목록 조회(R-L) API (by recipient_id) - MongoDB
# 최근 알람이 위로 오도록 생성일시 내림차순으로 정렬한다.
async def get_alarms_by_recipient(
    db: AsyncIOMotorDatabase,
    recipient_id: str,
) -> list[dict]:
    # 1. Repository => DB
    cursor = (
        db[COLLECTION_NAME]
        .find({"recipient_id": recipient_id})
        .sort("created_at", -1)
    )
    data = await cursor.to_list(length=200)
    # 2. Repository => Service
    return data


# 알람(Alarm) 읽음 여부 변경(U) API - MongoDB
# recipient_id까지 함께 조건에 걸어서, 본인 앞으로 온 알람만
# 읽음/안읽음을 바꿀 수 있게 한다. (헤더의 체크 버튼은 항상 True로
# 호출하고, 알림 관리 페이지의 토글 스위치는 True/False를 자유롭게 넘긴다)
async def set_alarm_read_status(
    db: AsyncIOMotorDatabase,
    _id: str,
    recipient_id: str,
    is_read: bool,
) -> dict | None:
    if not ObjectId.is_valid(_id):
        return None
    # 1. Repository => DB
    data = await db[COLLECTION_NAME].update_one(
        {"_id": ObjectId(_id), "recipient_id": recipient_id},
        {"$set": {"is_read": is_read}},
    )
    # 2. Repository => Service
    return data


# 알람(Alarm) 삭제(D) API - MongoDB
# recipient_id까지 함께 조건에 걸어서, 본인 앞으로 온 알람만
# 삭제할 수 있게 한다.
async def delete_alarm(
    db: AsyncIOMotorDatabase,
    _id: str,
    recipient_id: str,
) -> dict | None:
    if not ObjectId.is_valid(_id):
        return None
    # 1. Repository => DB
    data = await db[COLLECTION_NAME].delete_one(
        {"_id": ObjectId(_id), "recipient_id": recipient_id},
    )
    # 2. Repository => Service
    return data
