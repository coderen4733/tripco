from datetime import datetime, timezone

from pydantic import BaseModel, Field


class EmploymentTypeEntity(BaseModel):
    # 1. 고용형태(EmploymentType) 기본 정보
    type_code: str  # ERP 고용형태code
    type: str  # 고용형태

    # 2. 고용형태(EmploymentType) 정렬 관련
    status: bool = Field(default=True)  # 현재 사용 여부
    order: str  # 배열 순서

    # 3. 고용형태(EmploymentType) 메타데이터
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )  # 생성일
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )  # 수정일
