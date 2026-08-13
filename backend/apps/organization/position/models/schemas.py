from datetime import datetime

from pydantic import BaseModel, Field


# 직급/직위(Positon) 생성(C) API - 요청(Req)
class PositionCreateReq(BaseModel):
    position_code: str = Field(
        ..., min_length=1, example="MNG"
    )  # ERP 직급/직위code
    name: str = Field(..., min_length=1, example="과장")  # 직급/직위명


# 직급/직위(Positon) 생성(C) API - 응답(Res)
class PositionCreateRes(BaseModel):
    position_code: str  # ERP 직급/직위code
    name: str  # 직급/직위명
    status: bool  # 현재 사용 여부
    order: str  # 배열 순서
    created_at: datetime  # 생성일


# 직급/직위(Positon) 목록 조회(R-L) API - 응답(Res)
class PositionReadListRes(BaseModel):
    id: str = Field(..., alias="_id")  # MongoDB id
    position_code: str  # ERP 직급/직위code
    name: str  # 직급/직위명
    status: bool  # 현재 사용 여부
    order: str  # 배열 순서


# 직급/직위(Positon) 상세 조회(R-D) API - 응답(Res)
class PositionReadDetailRes(BaseModel):
    position_code: str  # ERP 직급/직위code
    name: str  # 직급/직위명
    status: bool  # 현재 사용 여부
    order: str  # 배열 순서
    created_at: datetime  # 생성일
    updated_at: datetime  # 수정일


# 직급/직위(Positon) 수정(U) API - 요청(Req)
class PositionUpdateReq(BaseModel):
    position_code: str = Field(
        ..., min_length=1, example="MNG"
    )  # ERP 직급/직위code
    name: str = Field(..., min_length=1, example="과장")  # 직급/직위명


# 직급/직위(Positon) 수정(U) API - 응답(Res)
class PositionUpdateRes(BaseModel):
    matched_count: int  # 쿼리 조건에 매칭된 문서 개수 (최대 1)
    modified_count: int  # 실제 데이터가 변경된 문서 개수 (최대 1)
    acknowledged: bool  # 쓰기 작업이 정상적으로 반영되었는지 여부


# 직급/직위(Positon) 삭제(D) API - 응답(Res)
class PositionDeleteRes(BaseModel):
    deleted_count: int  # 실제 삭제된 문서 개수 (최대 1)
    acknowledged: bool  # 삭제 요청을 정상적으로 접수했는지 여부
