from contextlib import asynccontextmanager  # Lifespan 생성에 사용할 contextlib

import redis.asyncio as aioredis  # Async Redis 라이브러리 추가
from fastapi import Depends, FastAPI  # FastAPI로 Back-End 구성
from fastapi.middleware.cors import (
    CORSMiddleware,  # CORS 설정을 위한 Middleware
)
from motor.motor_asyncio import (
    AsyncIOMotorClient,  # MongoDB 연결에 사용할 motor
)
from redis.asyncio import Redis

from apps.api import api_router  # Router 등록
from core.config import (  # .env 환경변수 로드
    MONGODB_DB,
    MONGODB_URL,
    REDIS_URL,
)
from core.redis import get_redis


# APP Lifespan ❤️
# L-1. lifespan 정의: 앱 시작과 종료 시 실행될 로직
@asynccontextmanager
async def lifespan(app: FastAPI):
    # A. [Startup] 앱이 켜질 때 실행
    app.mongodb_client = AsyncIOMotorClient(MONGODB_URL)
    app.mongodb = app.mongodb_client.get_database(MONGODB_DB)
    app.redis = aioredis.from_url(REDIS_URL, decode_responses=True)
    try:
        # A-1. MongoDB 연결 성공
        await app.mongodb_client.admin.command("ping")
        print("MongoDB 연결에 성공했습니다.")

        # A-2. Index 생성
        # A-2-1. [employees] 다큐먼트에는 login_id가 unique한 값
        await app.mongodb["employees"].create_index("login_id", unique=True)
        # A-2-2. [refresh_tokens] 다큐먼트에는 refresh_token이 unique한 값
        await app.mongodb["refresh_tokens"].create_index(
            "refresh_token", unique=True
        )
        # A-2-3. expires_at을 초과한 Refresh Token은 자동으로 삭제
        await app.mongodb["refresh_tokens"].create_index(
            "expires_at", expireAfterSeconds=0
        )
        print("MongoDB 인덱스(Unique, TTL) 생성이 완료되었습니다.")
    # A-3. MongoDB 연결 실패
    except Exception as err:
        print(f"MongoDB 연결에 실패했습니다. {err}")

    # A-4. Redis Cloud 연결
    try:
        await app.redis.ping()
        print("Redis Cloud 연결에 성공했습니다.")
    except Exception as err:
        print(f"Redis Cloud 연결에 실패했습니다. {err}")

    # A-5. App 실행
    yield
    # B. [Shutdown] 앱이 꺼질 때 실행
    app.mongodb_client.close()
    print("MongoDB 연결이 종료되었습니다.")
    await app.redis.aclose()
    print("Redis Cloud 연결이 종료되었습니다.")


# L-2. FastAPI 인스턴스 생성 시 lifespan(L-1)을 따름
app = FastAPI(lifespan=lifespan)


# CORS 설정 🖥️
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 테스트용이므로 모두 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health Check API ✅
@app.get("/health-check", tags=["Health Check"])
async def health_check():
    return {
        "status": "healthy",
    }


# Redis Check API ✅
@app.get("/redis-check", tags=["Redis Check"])
async def redis_check(redis: Redis = Depends(get_redis)):
    try:
        # 1. Redis에 'health' -> 'check' 저장 (Redis Insight에서 확인 가능)
        await redis.set("health", "check")

        # 2. 'health' 키를 검색해서 값을 받아옴
        value = await redis.get("health")

        # 3. 값이 'check'로 정상 수신되면 healthy
        if value == "check":
            return {"redis_status": "healthy"}
        else:
            return {"redis_status": "sick"}
    # 4. 연결 실패 등 예외 발생 시 ill
    except Exception:
        return {"redis_status": "ill"}


# APP Router 등록 🚥
app.include_router(api_router)
