from datetime import datetime, timezone

from pydantic import BaseModel, Field


class DepartmentEntity(BaseModel):
    # 1. 부서(Department) 기본 정보
    dept_id: str  # ERP 부서id
    name: str  # 부서명
    hq_id: str | None = Field(default=None)  # 상위 본부id
    leader_id: str  # 부서장 임직원id

    # 2. 부서(Department) 정렬 관련
    status: bool = Field(default=True)  # 현재 사용 여부
    order: str  # 배열 순서

    # 3. 부서(Department) 메타데이터
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )  # 생성일
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )  # 수정일
