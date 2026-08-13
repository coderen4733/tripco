from pydantic import BaseModel


# 마스터컬렉션 전체 매핑 조회(R) API - 응답(Res)
# 딕셔너리는 전부 {마스터컬렉션 문서의 _id: 화면에 표시할 값} 형태이다.
# (Redis Cloud에 HASH로 캐싱되어 있는 값을 그대로 옮겨 담은 것)
class MasterMapsRes(BaseModel):
    departments: dict[str, str]  # {부서 _id: 부서명}
    teams: dict[str, str]  # {팀 _id: 팀명}
    positions: dict[str, str]  # {직급/직위 _id: 직급/직위명}
    titles: dict[str, str]  # {직책 _id: 직책명}
    duties: dict[str, str]  # {직무 _id: 직무명}
    employment_types: dict[str, str]  # {고용형태 _id: 고용형태명}
