from datetime import datetime

from pydantic import BaseModel, Field


# 직무(Duty) 생성(C) API - 요청(Req)
class DutyCreateReq(BaseModel):
    duty_code: str = Field(..., min_length=1, example="GUD")  # ERP 직무code
    name: str = Field(..., min_length=1, example="가이드")  # 직무명


# 직무(Duty) 생성(C) API - 응답(Res)
class DutyCreateRes(BaseModel):
    duty_code: str  # ERP 직무code
    name: str  # 직무명
    status: bool  # 현재 사용 여부
    order: str  # 배열 순서
    created_at: datetime  # 생성일


# 직무(Duty) 목록 조회(R-L) API - 응답(Res)
class DutyReadListRes(BaseModel):
    id: str = Field(..., alias="_id")  # MongoDB id
    duty_code: str  # ERP 직무code
    name: str  # 직무명
    status: bool  # 현재 사용 여부
    order: str  # 배열 순서


# 직무(Duty) 상세 조회(R-D) API - 응답(Res)
class DutyReadDetailRes(BaseModel):
    duty_code: str  # ERP 직무code
    name: str  # 직무명
    status: bool  # 현재 사용 여부
    order: str  # 배열 순서
    created_at: datetime  # 생성일
    updated_at: datetime  # 수정일


# 직무(Duty) 수정(U) API - 요청(Req)
class DutyUpdateReq(BaseModel):
    duty_code: str = Field(..., min_length=1, example="GUD")  # ERP 직무code
    name: str = Field(..., min_length=1, example="가이드")  # 직무명


# 직무(Duty) 수정(U) API - 응답(Res)
class DutyUpdateRes(BaseModel):
    matched_count: int  # 쿼리 조건에 매칭된 문서 개수 (최대 1)
    modified_count: int  # 실제 데이터가 변경된 문서 개수 (최대 1)
    acknowledged: bool  # 쓰기 작업이 정상적으로 반영되었는지 여부


# 직무(Duty) 삭제(D) API - 응답(Res)
class DutyDeleteRes(BaseModel):
    deleted_count: int  # 실제 삭제된 문서 개수 (최대 1)
    acknowledged: bool  # 삭제 요청을 정상적으로 접수했는지 여부


# 직무(Duty) 순서 변경(U) API - 요청(Req)
class DutyReorderReq(BaseModel):
    prev_id: str | None = Field(default=None)
    next_id: str | None = Field(default=None)


# 직무(Duty) 순서 변경(U) API - 응답(Res)
class DutyReorderRes(BaseModel):
    order: str  # 새로 계산된 order 값


# 직무(Duty) 활성/비활성 상태 변경(U) API - 요청(Req)
class DutyStatusReq(BaseModel):
    status: bool  # true=활성, false=비활성(회색 처리)


# 직무(Duty) 활성/비활성 상태 변경(U) API - 응답(Res)
class DutyStatusRes(BaseModel):
    matched_count: int  # 쿼리 조건에 매칭된 문서 개수 (최대 1)
    modified_count: int  # 실제 데이터가 변경된 문서 개수 (최대 1)
    acknowledged: bool  # 쓰기 작업이 정상적으로 반영되었는지 여부
