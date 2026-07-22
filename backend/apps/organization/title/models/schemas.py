from datetime import datetime

from pydantic import BaseModel, Field


# 직책(Title) 생성(C) API - 요청(Req)
class TitleCreateReq(BaseModel):
    title_id: str = Field(..., min_length=1, example="TML")  # ERP 직책id
    name: str = Field(..., min_length=1, example="팀장")  # 직책명


# 직책(Title) 생성(C) API - 응답(Res)
class TitleCreateRes(BaseModel):
    title_id: str  # ERP 직책id
    name: str  # 직책명
    status: bool  # 현재 사용 여부
    order: str  # 배열 순서
    created_at: datetime  # 생성일


# 직책(Title) 목록 조회(R-L) API - 응답(Res)
class TitleReadListRes(BaseModel):
    id: str = Field(..., alias="_id")  # MongoDB id
    title_id: str  # ERP 직책id
    name: str  # 직책명
    status: bool  # 현재 사용 여부
    order: str  # 배열 순서


# 직책(Title) 상세 조회(R-D) API - 응답(Res)
class TitleReadDetailRes(BaseModel):
    title_id: str  # ERP 직책id
    name: str  # 직책명
    status: bool  # 현재 사용 여부
    order: str  # 배열 순서
    created_at: datetime  # 생성일
    updated_at: datetime  # 수정일


# 직책(Title) 수정(U) API - 요청(Req)
class TitleUpdateReq(BaseModel):
    title_id: str = Field(..., min_length=1, example="TML")  # ERP 직책id
    name: str = Field(..., min_length=1, example="팀장")  # 직책명


# 직책(Title) 수정(U) API - 응답(Res)
class TitleUpdateRes(BaseModel):
    matched_count: int  # 쿼리 조건에 매칭된 문서 개수 (최대 1)
    modified_count: int  # 실제 데이터가 변경된 문서 개수 (최대 1)
    acknowledged: bool  # 쓰기 작업이 정상적으로 반영되었는지 여부


# 직책(Title) 삭제(D) API - 응답(Res)
class TitleDeleteRes(BaseModel):
    deleted_count: int  # 실제 삭제된 문서 개수 (최대 1)
    acknowledged: bool  # 삭제 요청을 정상적으로 접수했는지 여부
