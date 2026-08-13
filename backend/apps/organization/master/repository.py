from redis.asyncio import Redis

# 마스터컬렉션들이 Redis Cloud에 HASH로 캐싱되어 있는 이름
# (각 모듈 repository.py의 COLLECTION_NAME과 동일한 값이다)
DEPARTMENT_HASH = "mst_departments"
TEAM_HASH = "mst_teams"
POSITION_HASH = "mst_positions"
TITLE_HASH = "mst_titles"
DUTY_HASH = "mst_duties"
EMPLOYMENT_TYPE_HASH = "mst_employment_types"


# 마스터컬렉션 HASH 1개를 통째로 조회 - Redis
# HASH 안에는 {_id(Field): 화면 표시값(Value)} 형태로 저장되어 있다.
async def get_master_map(
    redis: Redis,
    hash_name: str,
) -> dict[str, str]:
    # 1. Repository => Redis
    data = await redis.hgetall(hash_name)
    # 2. Repository => Service
    return data
