from datetime import datetime, timezone

from pydantic import BaseModel, Field


class TeamEntity(BaseModel):
    # 1. 팀(Team) 기본 정보
    team_id: str  # ERP 팀id
    name: str  # 팀명
    dept_id: str | None = Field(default=None)  # 상위 부서id
    leader_id: str  # 팀장 임직원id

    # 2. 팀(Team) 정렬 관련
    status: bool = Field(default=True)  # 현재 사용 여부
    order: str  # 배열 순서

    # 3. 팀(Team) 메타데이터
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )  # 생성일
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )  # 수정일
