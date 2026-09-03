from enum import Enum


# 알람 종류. 타입별로 구분해서 저장해두면, 나중에 알람 목록을 종류별로
# 필터링하거나(예: 결재 알람만 보기) 아이콘/문구를 다르게 보여줄 수 있다.
class AlarmType(str, Enum):
    EMPLOYEE_REGISTRATION = "employee_registration"  # 신규 계정 신청
    # TODO: 결재/견적/부킹/정산/기타 알람 등은 추후 여기에 추가한다.


# 알람 관리 페이지 대시보드에서 쓰는 큰 분류(구분)다. type(세부 종류)보다
# 상위 개념으로, 알림 관리 페이지 상단 통계 카드 8칸과 1:1로 대응한다.
class AlarmCategory(str, Enum):
    APPROVAL = "결재"  # 품의/휴가/계약 등 결재 관련
    QUOTE = "견적"
    BOOKING = "부킹"
    SETTLEMENT = "정산"
    COMPANY_NEWS = "사내 소식"  # 공지/결혼/부고/인사 등 (회사 -> 나, Top-Down)
    SECRETARY = "나의 비서"  # 마감 임박/업무 리마인드 등 (시스템 -> 나)
    ACTIVITY = "나의 활동"  # 댓글/멘션 등 (동료 -> 나, User-to-User)
    SYSTEM = "시스템"  # ERP/홈페이지 관리 등 시스템 인프라 관련
