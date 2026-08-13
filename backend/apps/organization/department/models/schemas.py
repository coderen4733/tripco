from datetime import datetime

from pydantic import BaseModel, Field


# 부서(Department) 생성(C) API - 요청(Req)
class DeptCreateReq(BaseModel):
    dept_code: str = Field(..., min_length=1, example="TES")  # ERP 부서code
    name: str = Field(..., min_length=1, example="테스트부")  # 부서명
    leader_id: str | None = Field(default=None)  # 부서장 임직원id


# 부서(Department) 생성(C) API - 응답(Res)
class DeptCreateRes(BaseModel):
    dept_code: str  # ERP 부서code
    name: str  # 부서명
    leader_id: str | None  # 부서장 임직원id
    hq_id: str | None  # 상위 본부id
    status: bool  # 현재 사용 여부
    order: str  # 배열 순서
    created_at: datetime  # 생성일


# 부서(Department) 목록 조회(R-L) API - 응답(Res)
class DeptReadListRes(BaseModel):
    id: str = Field(..., alias="_id")  # MongoDB id
    dept_code: str  # ERP 부서code
    name: str  # 부서명
    leader_id: str | None  # 부서장 임직원id
    status: bool  # 현재 사용 여부
    order: str  # 배열 순서


# 부서(Department) 상세 조회(R-D) API - 응답(Res)
class DeptReadDetailRes(BaseModel):
    dept_code: str  # ERP 부서code
    name: str  # 부서명
    leader_id: str | None  # 부서장 임직원id
    hq_id: str | None  # 상위 본부id
    status: bool  # 현재 사용 여부
    order: str  # 배열 순서
    created_at: datetime  # 생성일
    updated_at: datetime  # 수정일


# 부서(Department) 수정(U) API - 요청(Req)
class DeptUpdateReq(BaseModel):
    dept_code: str = Field(..., min_length=1, example="TES")  # ERP 부서code
    name: str = Field(..., min_length=1, example="테스트부")  # 부서명
    leader_id: str | None = Field(default=None)  # 부서장 임직원id
    hq_id: str | None = Field(default=None)  # 상위 본부id


# 부서(Department) 수정(U) API - 응답(Res)
class DeptUpdateRes(BaseModel):
    matched_count: int  # 쿼리 조건에 매칭된 문서 개수 (최대 1)
    modified_count: int  # 실제 데이터가 변경된 문서 개수 (최대 1)
    acknowledged: bool  # 쓰기 작업이 정상적으로 반영되었는지 여부


# 부서(Department) 삭제(D) API - 응답(Res)
class DeptDeleteRes(BaseModel):
    deleted_count: int  # 실제 삭제된 문서 개수 (최대 1)
    acknowledged: bool  # 삭제 요청을 정상적으로 접수했는지 여부
