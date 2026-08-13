from datetime import datetime, timedelta, timezone

from pydantic import BaseModel, Field

from core.config import REFRESH_TOKEN_EXPIRE


# 토큰 만료일 계산 함수
def get_expires_at() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE)


# MongoDB의 'refresh_tokens' 컬렉션에 실제로 저장되는 문서(document) 구조
# DB에 어떤 모양으로 데이터가 들어가는지 지정(Refresh Token)
class TokenEntity(BaseModel):
    employee_id: str
    ip_address: str
    refresh_token: str = Field(..., json_schema_extra={"unique": True})
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    expires_at: datetime = Field(default_factory=get_expires_at)
