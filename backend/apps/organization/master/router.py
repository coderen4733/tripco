from fastapi import APIRouter, Depends
from redis.asyncio import Redis

from apps.organization.master import service as master_service
from apps.organization.master.models.schemas import MasterMapsRes
from common.response import ResponseSchema
from core.redis import get_redis

master_router = APIRouter()


# 마스터컬렉션 전체 매핑(부서/팀/직급/직책/직무/고용형태) 조회 API
@master_router.get(
    "/",
    response_model=ResponseSchema[MasterMapsRes],
)
async def get_master_maps(
    redis: Redis = Depends(get_redis),
) -> dict:
    # 1. Router <= Service
    data = await master_service.get_master_maps(redis)
    # 2. Router => FrontEnd
    return {
        "message": "마스터컬렉션 매핑 조회에 성공했습니다.",
        "data": data,
    }
