from typing import Generic, Optional, TypeVar

from pydantic import BaseModel

# 들어올 데이터 타입을 동적으로 결정하기 위한 타입 변수 정의
T = TypeVar("T")


# Response Schema 정의
class ResponseSchema(BaseModel, Generic[T]):
    message: str
    data: Optional[T] = None
