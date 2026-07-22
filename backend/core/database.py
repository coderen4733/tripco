from fastapi import Request
from motor.motor_asyncio import AsyncIOMotorDatabase


# Router Depends(get_databse)로 사용할 의존성 함수
# apps/main.py의 lifespan에서 만든 app.mongodb를 그대로 꺼내서 돌려줌
# 요청마다 새로 연결하지 않고, 앱 전체에서 하나의 커넥션 풀을 재사용하기 위함임
def get_database(request: Request) -> AsyncIOMotorDatabase:
    return request.app.mongodb
