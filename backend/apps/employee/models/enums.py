from enum import Enum


class AdminRole(str, Enum):
    MASTER = "최고관리자"
    ADMIN = "관리자"
    SUB_ADMIN = "부관리자"
    STAFF = "일반"
    AUDIT = "감사"


class Gender(str, Enum):
    MALE = "남성"
    FEMALE = "여성"
    ETC = "기타"


class ExpLevel(str, Enum):
    NEW = "신입"
    EXP = "경력"


class DriverLicenseType(str, Enum):
    CLASS_1_LARGE = "1종대형"
    CLASS_1_REGULAR = "1종보통"
    CLASS_2_REGULAR = "2종보통"
    MOTORCYCLE = "원동기"
    NONE = "무면허"
