from enum import Enum


class CollectionName(str, Enum):
    MST_DEPARTMENTS = "mst_departments"  # 마스터컬렉션 부서
    MST_TEAMS = "mst_teams"  # 마스터컬렉션 팀
    MST_POSITIONS = "mst_positions"  # 마스터컬렉션 직급/직위
    MST_TITLE = "mst_titles"  # 마스터컬렉션 직책
    MST_DUTY = "mst_duties"  # 마스터컬렉션 직무
    MST_EMP_TYPE = "mst_emp_types"  # 마스터컬렉션 고용형태
