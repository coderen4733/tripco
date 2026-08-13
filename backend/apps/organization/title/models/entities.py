from datetime import datetime, timezone

from pydantic import BaseModel, Field


class TitleEntity(BaseModel):
    # 1. 직책(Title) 기본 정보
    title_code: str  # ERP 직책code
    name: str  # 직책명

    # 2. 직책(Title) 정렬 관련
    status: bool = Field(default=True)  # 현재 사용 여부
    order: str  # 배열 순서

    # 3. 직책(Title) 메타데이터
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )  # 생성일
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )  # 수정일
