from enum import Enum


class DefaultOrgId(str, Enum):
    NO_DEPT = "6a5ef4567b5d3ff81ea0d196"  # NON.소속없음
    NO_TEAM = "6a6028aca23535ea38bff2fb"  # NON.소속없음
    NO_POSITION = "6a62b4f845e24aa0ce4e60a1"  # NON.임시대기
    NO_TITLE = "6a6057554911229b2e53f4bb"  # TMB.팀원
    NO_DUTY = "6a62b56828bd76220051c529"  # NON.임시대기
    NO_EMP_TYPE = "6a6070cdd4a4b120ff64659b"  # HLD.보류
