from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from apps.alarm import repository as alarm_repository
from apps.alarm.models.entities import AlarmEntity
from apps.alarm.models.enums import AlarmCategory, AlarmType
from apps.alarm.models.schemas import (
    AlarmDeleteRes,
    AlarmMarkReadRes,
    AlarmReadListRes,
)
from apps.employee import repository as employee_repository

# 신규 계정 신청 승인 권한과 동일한 등급(최고관리자/관리자/부관리자)에게
# 알람을 보낸다. (apps/auth/dependencies.py의 EMPLOYEE_MANAGE_ROLES와 대응)
ADMIN_ALARM_ROLES = ["최고관리자", "관리자", "부관리자"]


# Mongo 문서(dict)를 응답 스키마로 바꿔준다. ("_id" -> "id" alias 매핑)
def _to_alarm_res(alarm: dict) -> AlarmReadListRes:
    alarm = {**alarm, "_id": str(alarm["_id"])}
    return AlarmReadListRes(**alarm)


# 관리자급(최고관리자/관리자/부관리자) 임직원 전체에게 알람을
# 하나씩 만들어 보낸다. (신규 계정 신청 등, 관리자가 알아야 할
# 이벤트가 생겼을 때 호출한다)
async def notify_admins(
    db: AsyncIOMotorDatabase,
    alarm_type: AlarmType,
    category: AlarmCategory,
    message: str,
    related_id: str | None = None,
) -> None:
    # 1. Service <= Repository (관리자급 임직원 목록)
    admins = await employee_repository.get_employees_by_admin_roles(
        db, ADMIN_ALARM_ROLES
    )
    # 2. 관리자 수만큼 알람 엔터티를 만들어 한 번에 저장
    alarms = [
        AlarmEntity(
            type=alarm_type,
            category=category,
            message=message,
            recipient_id=str(admin["_id"]),
            related_id=related_id,
        )
        for admin in admins
    ]
    await alarm_repository.create_alarms_bulk(db, alarms)


# 알람(Alarm) 목록 조회(R-L) API
async def get_my_alarms(
    db: AsyncIOMotorDatabase,
    recipient_id: str,
) -> list[AlarmReadListRes]:
    # 1. Service <= Repository
    alarms = await alarm_repository.get_alarms_by_recipient(db, recipient_id)
    # 2. Service => Router
    return [_to_alarm_res(alarm) for alarm in alarms]


# 알람(Alarm) 읽음 여부 변경(U) API
async def set_alarm_read_status(
    db: AsyncIOMotorDatabase,
    _id: str,
    recipient_id: str,
    is_read: bool,
) -> AlarmMarkReadRes:
    # 1. Service <= Repository
    result = await alarm_repository.set_alarm_read_status(
        db, _id, recipient_id, is_read
    )
    # 2. Existing Check(404)
    if result is None or result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="읽음 여부를 변경할 알람을 찾을 수 없습니다.",
        )
    # 3. Service => Router
    return AlarmMarkReadRes(
        matched_count=result.matched_count,
        modified_count=result.modified_count,
        acknowledged=result.acknowledged,
    )


# 알람(Alarm) 삭제(D) API
async def delete_alarm(
    db: AsyncIOMotorDatabase,
    _id: str,
    recipient_id: str,
) -> AlarmDeleteRes:
    # 1. Service <= Repository
    result = await alarm_repository.delete_alarm(db, _id, recipient_id)
    # 2. Existing Check(404)
    if result is None or result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="삭제할 알람을 찾을 수 없습니다.",
        )
    # 3. Service => Router
    return AlarmDeleteRes(
        deleted_count=result.deleted_count,
        acknowledged=result.acknowledged,
    )
