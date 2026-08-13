import asyncio

from redis.asyncio import Redis

from apps.organization.master import repository as master_repository
from apps.organization.master.models.schemas import MasterMapsRes


# 마스터컬렉션 6종(부서/팀/직급/직책/직무/고용형태) 전체 매핑 조회(R) API
# Redis Cloud에 미리 캐싱된 {_id: 표시값} HASH 6개를 한 번에 모아서 돌려준다.
# => 프론트엔드는 이 응답 1번만 받아서 화면에 표시할 값을
#    로컬에서 매핑하면 되므로, 임직원 목록을 그릴 때마다
#    Redis를 반복 조회하지 않아도 된다.
async def get_master_maps(redis: Redis) -> MasterMapsRes:
    # 1. Service <= Repository (6개 HASH를 동시에 조회해서 대기 시간을 줄인다)
    (
        departments,
        teams,
        positions,
        titles,
        duties,
        employment_types,
    ) = await asyncio.gather(
        master_repository.get_master_map(
            redis, master_repository.DEPARTMENT_HASH
        ),
        master_repository.get_master_map(
            redis, master_repository.TEAM_HASH
        ),
        master_repository.get_master_map(
            redis, master_repository.POSITION_HASH
        ),
        master_repository.get_master_map(
            redis, master_repository.TITLE_HASH
        ),
        master_repository.get_master_map(
            redis, master_repository.DUTY_HASH
        ),
        master_repository.get_master_map(
            redis, master_repository.EMPLOYMENT_TYPE_HASH
        ),
    )
    # 2. Service => Router
    data = MasterMapsRes(
        departments=departments,
        teams=teams,
        positions=positions,
        titles=titles,
        duties=duties,
        employment_types=employment_types,
    )
    return data
