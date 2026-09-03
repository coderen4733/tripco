from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from apps.alarm import service as alarm_service
from apps.alarm.models.schemas import (
    AlarmDeleteRes,
    AlarmMarkReadRes,
    AlarmReadListRes,
    AlarmSetReadReq,
)
from apps.auth.dependencies import get_current_employee
from common.response import ResponseSchema
from core.database import get_database

alarm_router = APIRouter()


# 알람(Alarm) 목록 조회(R-L) API
# 로그인한 임직원(recipient) 앞으로 온 알람만 최신순으로 내려준다.
@alarm_router.get(
    "/",
    response_model=ResponseSchema[list[AlarmReadListRes]],
)
async def get_my_alarms(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_employee: dict = Depends(get_current_employee),
) -> dict:
    # 1. Router <= Service
    data = await alarm_service.get_my_alarms(
        db, str(current_employee["_id"])
    )
    # 2. Router => FrontEnd
    return {"message": "알람 목록 조회에 성공했습니다.", "data": data}


# 알람(Alarm) 읽음 여부 변경(U) API - 헤더의 체크 버튼(항상 읽음 처리) 및
# 알림 관리 페이지의 토글 스위치(읽음/안읽음을 자유롭게 왕복)가 함께 쓴다.
# 요청 본문을 아예 안 보내면 기존 체크 버튼처럼 읽음(True)으로 처리된다.
@alarm_router.patch(
    "/{_id}/read",
    response_model=ResponseSchema[AlarmMarkReadRes],
)
async def set_alarm_read_status(
    _id: str,
    payload: AlarmSetReadReq = AlarmSetReadReq(),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_employee: dict = Depends(get_current_employee),
) -> dict:
    # 1. Router <= Service
    data = await alarm_service.set_alarm_read_status(
        db, _id, str(current_employee["_id"]), payload.is_read
    )
    # 2. Router => FrontEnd
    message = (
        "알람을 확인 처리했습니다."
        if payload.is_read
        else "알람을 안읽음으로 변경했습니다."
    )
    return {"message": message, "data": data}


# 알람(Alarm) 삭제(D) API - 휴지통 버튼
@alarm_router.delete(
    "/{_id}",
    response_model=ResponseSchema[AlarmDeleteRes],
    status_code=status.HTTP_200_OK,
)
async def delete_alarm(
    _id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_employee: dict = Depends(get_current_employee),
) -> dict:
    # 1. Router <= Service
    data = await alarm_service.delete_alarm(
        db, _id, str(current_employee["_id"])
    )
    # 2. Router => FrontEnd
    return {"message": "알람을 삭제했습니다.", "data": data}
