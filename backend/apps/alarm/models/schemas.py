from datetime import datetime

from pydantic import BaseModel, Field

from apps.alarm.models.enums import AlarmCategory, AlarmType


# 알람(Alarm) 목록 조회(R-L) API - 응답(Res)
class AlarmReadListRes(BaseModel):
    id: str = Field(..., alias="_id")  # MongoDB id
    type: AlarmType  # 알람 종류(세부 구분)
    # 알림 관리 대시보드 8칸 중 어디에 속하는지. (category 필드가 생기기
    # 전에 만들어진 옛 알람 문서를 위해 기본값을 둔다)
    category: AlarmCategory = AlarmCategory.SYSTEM
    message: str  # 알람 문구
    related_id: str | None  # 관련 문서 _id
    is_read: bool  # 확인(체크) 여부
    created_at: datetime  # 알람이 생성된 일시


# 알람(Alarm) 읽음 여부 변경(U) API - 요청(Req)
# 헤더의 체크 버튼(항상 true)뿐 아니라, 알림 관리 페이지의 토글 스위치로
# true/false를 자유롭게 오갈 수 있어야 해서 값을 받을 수 있게 했다.
# 값을 아예 안 보내면(기존 체크 버튼 호출) true로 처리한다.
class AlarmSetReadReq(BaseModel):
    is_read: bool = True


# 알람(Alarm) 읽음 여부 변경(U) API - 응답(Res)
class AlarmMarkReadRes(BaseModel):
    matched_count: int  # 쿼리 조건에 매칭된 문서 개수 (최대 1)
    modified_count: int  # 실제 데이터가 변경된 문서 개수 (최대 1)
    acknowledged: bool  # 쓰기 작업이 정상적으로 반영되었는지 여부


# 알람(Alarm) 삭제(D) API - 응답(Res)
class AlarmDeleteRes(BaseModel):
    deleted_count: int  # 실제 삭제된 문서 개수 (최대 1)
    acknowledged: bool  # 쓰기 작업이 정상적으로 반영되었는지 여부
