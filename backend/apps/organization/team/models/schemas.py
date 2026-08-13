from datetime import datetime

from pydantic import BaseModel, Field


# 팀(Team) 생성(C) API - 요청(Req)
class TeamCreateReq(BaseModel):
    team_code: str = Field(..., min_length=1, example="TES")  # ERP 팀code
    name: str = Field(..., min_length=1, example="테스트팀")  # 팀명
    leader_id: str | None = Field(default=None)  # 팀장 임직원id
    dept_id: str | None = Field(default=None)  # 상위 부서id


# 팀(Team) 생성(C) API - 응답(Res)
class TeamCreateRes(BaseModel):
    team_code: str  # ERP 팀code
    name: str  # 팀명
    leader_id: str | None  # 팀장 임직원id
    dept_id: str | None  # 상위 부서id
    status: bool  # 현재 사용 여부
    order: str  # 배열 순서
    created_at: datetime  # 생성일


# 팀(Team) 목록 조회(R-L) API - 응답(Res)
class TeamReadListRes(BaseModel):
    id: str = Field(..., alias="_id")  # MongoDB id
    team_code: str  # ERP 팀code
    name: str  # 팀명
    leader_id: str | None  # 팀장 임직원id
    status: bool  # 현재 사용 여부
    order: str  # 배열 순서


# 팀(Team) 상세 조회(R-D) API - 응답(Res)
class TeamReadDetailRes(BaseModel):
    team_code: str  # ERP 팀code
    name: str  # 팀명
    leader_id: str | None  # 팀장 임직원id
    dept_id: str | None  # 상위 부서id
    status: bool  # 현재 사용 여부
    order: str  # 배열 순서
    created_at: datetime  # 생성일
    updated_at: datetime  # 수정일


# 팀(Team) 수정(U) API - 요청(Req)
class TeamUpdateReq(BaseModel):
    team_code: str = Field(..., min_length=1, example="TES")  # ERP 팀code
    name: str = Field(..., min_length=1, example="테스트팀")  # 팀명
    leader_id: str | None = Field(default=None)  # 팀장 임직원id
    dept_id: str | None = Field(default=None)  # 상위 부서id


# 팀(Team) 수정(U) API - 응답(Res)
class TeamUpdateRes(BaseModel):
    matched_count: int  # 쿼리 조건에 매칭된 문서 개수 (최대 1)
    modified_count: int  # 실제 데이터가 변경된 문서 개수 (최대 1)
    acknowledged: bool  # 쓰기 작업이 정상적으로 반영되었는지 여부


# 팀(Team) 삭제(D) API - 응답(Res)
class TeamDeleteRes(BaseModel):
    deleted_count: int  # 실제 삭제된 문서 개수 (최대 1)
    acknowledged: bool  # 삭제 요청을 정상적으로 접수했는지 여부
