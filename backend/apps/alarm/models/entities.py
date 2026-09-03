from datetime import datetime, timezone

from pydantic import BaseModel, Field

from apps.alarm.models.enums import AlarmCategory, AlarmType


# MongoDB의 'alarms' 컬렉션에 실제로 저장되는 문서(document) 구조
class AlarmEntity(BaseModel):
    type: AlarmType  # 알람 종류(신규 계정 신청, 결재 등 - 세부 구분)
    # 알림 관리 페이지 대시보드 8칸(결재/견적/부킹/정산/사내 소식/
    # 나의 비서/나의 활동/시스템) 중 어디에 속하는지
    category: AlarmCategory = AlarmCategory.SYSTEM
    message: str  # 화면에 보여줄 알람 문구
    recipient_id: str  # 알람을 받는 임직원의 _id (employees 컬렉션 기준)
    related_id: str | None = None  # 관련 문서 _id (예: employee_registrations)
    is_read: bool = False  # 체크 버튼으로 확인했는지 여부
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
