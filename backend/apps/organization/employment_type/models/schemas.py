from datetime import datetime

from pydantic import BaseModel, Field


# 고용형태(EmploymentType) 생성(C) API - 요청(Req)
class EmpTypeCreateReq(BaseModel):
    type_id: str = Field(..., min_length=1, example="REG")  # ERP 고용형태id
    type: str = Field(..., min_length=1, example="정규직")  # 고용형태


# 고용형태(EmploymentType) 생성(C) API - 응답(Res)
class EmpTypeCreateRes(BaseModel):
    type_id: str  # ERP 고용형태id
    type: str  # 고용형태
    status: bool  # 현재 사용 여부
    order: str  # 배열 순서
    created_at: datetime  # 생성일


# 고용형태(EmploymentType) 목록 조회(R-L) API - 응답(Res)
class EmpTypeReadListRes(BaseModel):
    id: str = Field(..., alias="_id")  # MongoDB id
    type_id: str  # ERP 고용형태id
    type: str  # 고용형태
    status: bool  # 현재 사용 여부
    order: str  # 배열 순서


# 고용형태(EmploymentType) 상세 조회(R-D) API - 응답(Res)
class EmpTypeReadDetailRes(BaseModel):
    type_id: str  # ERP 고용형태id
    type: str  # 고용형태
    status: bool  # 현재 사용 여부
    order: str  # 배열 순서
    created_at: datetime  # 생성일
    updated_at: datetime  # 수정일


# 고용형태(EmploymentType) 수정(U) API - 요청(Req)
class EmpTypeUpdateReq(BaseModel):
    type_id: str = Field(..., min_length=1, example="REG")  # ERP 고용형태id
    type: str = Field(..., min_length=1, example="정규직")  # 고용형태


# 고용형태(EmploymentType) 수정(U) API - 응답(Res)
class EmpTypeUpdateRes(BaseModel):
    matched_count: int  # 쿼리 조건에 매칭된 문서 개수 (최대 1)
    modified_count: int  # 실제 데이터가 변경된 문서 개수 (최대 1)
    acknowledged: bool  # 쓰기 작업이 정상적으로 반영되었는지 여부


# 고용형태(EmploymentType) 삭제(D) API - 응답(Res)
class EmpTypeDeleteRes(BaseModel):
    deleted_count: int  # 실제 삭제된 문서 개수 (최대 1)
    acknowledged: bool  # 삭제 요청을 정상적으로 접수했는지 여부
