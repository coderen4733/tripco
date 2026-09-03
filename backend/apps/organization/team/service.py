from datetime import datetime, timezone

from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from redis.asyncio import Redis

from apps.organization.team import repository as team_repository
from apps.organization.team.models.entities import TeamEntity
from apps.organization.team.models.schemas import (
    TeamCreateReq,
    TeamCreateRes,
    TeamDeleteRes,
    TeamReadDetailRes,
    TeamReadListRes,
    TeamReorderReq,
    TeamReorderRes,
    TeamStatusReq,
    TeamStatusRes,
    TeamUpdateReq,
    TeamUpdateRes,
)
from common.lexorank import LexoRank
from common.reassign import count_references, reassign_references
from common.reorder import compute_reordered_value


# 팀(Team) 생성(C) API
async def create_team(
    db: AsyncIOMotorDatabase,
    redis: Redis,
    payload: TeamCreateReq,
) -> TeamCreateRes:
    # 1. Duplicate Check
    # 1-1. team_code
    is_duplicate_team_code = await team_repository.get_team_by_team_code(
        db,
        payload.team_code,
        None,
    )
    if is_duplicate_team_code:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 team_code입니다.",
        )
    # 1-2. name
    is_duplicate_name = await team_repository.get_team_by_name(
        db,
        payload.name,
        None,
    )
    if is_duplicate_name:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 팀명입니다.",
        )
    # 2. LexoRank => Order
    last_team = await team_repository.get_last_team_order(db)
    if last_team and "order" in last_team:
        # 2-1. 데이터가 존재한다면: 가장 마지막 order 다음 order 생성
        new_order = LexoRank.get_next(last_team["order"])
    else:
        # 2-2. 데이터가 존재하지 않는다면(첫 등록): 기본 중간값(i00000) order로
        new_order = LexoRank.get_middle()
    team_data = payload.model_dump()
    team_data["order"] = new_order

    # 3. Create & Read
    # 3-1. MongoDB
    team = TeamEntity(**team_data)
    new_team_id = await team_repository.create_team(
        db,
        team,
    )
    new_team = await team_repository.get_team_by_id(
        db,
        new_team_id,
    )
    # 3-1-1. Read가 되지 않는 경우
    if not new_team:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="팀이 저장되지 않았거나, 조회에 실패하였습니다.",
        )
    # 3-2. Redis
    await team_repository.create_team_redis(
        redis,
        str(new_team.get("_id")),
        str(new_team.get("name")),
    )
    # 4. Service => Router
    data = TeamCreateRes(**new_team)
    return data


# 팀(Team) 목록 조회(R-L) API
async def get_teams_list(
    db: AsyncIOMotorDatabase,
    skip: int,
    limit: int,
) -> list[TeamReadListRes]:
    # 1. Service <= Repository
    teams = await team_repository.get_teams_list(
        db,
        skip,
        limit,
    )
    # 2. Service => Router
    data = [
        TeamReadListRes(
            _id=str(team["_id"]),
            team_code=team["team_code"],
            name=team["name"],
            leader_id=team["leader_id"],
            dept_id=team.get("dept_id"),
            status=team["status"],
            order=team["order"],
        )
        for team in teams
    ]
    return data


# 팀(Team) 상세 조회(R-D) API
async def get_team(
    db: AsyncIOMotorDatabase,
    _id: str,
) -> TeamReadDetailRes:
    # 1. Service <= Repository
    team = await team_repository.get_team_by_id(
        db,
        _id,
    )
    # 2. Existing Check(404)
    if team is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="상세 조회할 팀이 존재하지 않습니다.",
        )
    # 3. Service => Router
    data = TeamReadDetailRes(**team)
    return data


# 팀(Team) 수정(U) API
async def update_team(
    db: AsyncIOMotorDatabase,
    redis: Redis,
    _id: str,
    payload: TeamUpdateReq,
) -> TeamUpdateRes:
    # 1. Duplicate Check
    # 1-1. team_code
    is_duplicate_team_code = await team_repository.get_team_by_team_code(
        db,
        payload.team_code,
        _id,
    )
    if is_duplicate_team_code:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 team_code입니다.",
        )
    # 1-2. name
    is_duplicate_name = await team_repository.get_team_by_name(
        db,
        payload.name,
        _id,
    )
    if is_duplicate_name:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 팀명입니다.",
        )
    # 2. Service <= Repository
    updated_team = await team_repository.update_team(
        db,
        _id,
        {
            "team_code": payload.team_code,
            "name": payload.name,
            "leader_id": payload.leader_id,
            "dept_id": payload.dept_id,
            "updated_at": datetime.now(timezone.utc),
        },
    )
    # 2-1. Existing Check(404)
    if updated_team.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="수정할 팀이 존재하지 않습니다.",
        )
    # 2-2. Redis
    await team_repository.update_team_redis(
        redis,
        _id,
        payload.name,
    )
    # 3. Service => Router
    data = TeamUpdateRes(
        matched_count=updated_team.matched_count,
        modified_count=updated_team.modified_count,
        acknowledged=updated_team.acknowledged,
    )
    return data


# 이 팀을 소속으로 두고 있는 컬렉션/필드 목록.
TEAM_REFERENCES = [
    ("employees", "team_id"),
]


# 팀(Team) 삭제(D) API
# reassign_to: 이 팀에 소속되어 있던 임직원을 대신 옮겨 담을 다른 팀 _id.
async def delete_team(
    db: AsyncIOMotorDatabase,
    redis: Redis,
    _id: str,
    reassign_to: str | None = None,
) -> TeamDeleteRes:
    # 0. 참조 무결성 체크: 이 팀에 소속된 임직원이 있으면, 다른 팀으로
    #    먼저 옮긴 뒤에만 삭제할 수 있다.
    affected_count = await count_references(db, TEAM_REFERENCES, _id)
    if affected_count > 0:
        if reassign_to is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "message": (
                        "이 팀을 사용 중인 임직원이 있습니다. "
                        "재배치할 팀을 선택해 주세요."
                    ),
                    "requires_reassignment": True,
                    "affected_count": affected_count,
                },
            )
        if reassign_to == _id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="삭제할 팀과 다른 팀을 선택해 주세요.",
            )
        reassign_target = await team_repository.get_team_by_id(
            db, reassign_to
        )
        if not reassign_target:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="재배치 대상 팀을 찾을 수 없습니다.",
            )
        await reassign_references(db, TEAM_REFERENCES, _id, reassign_to)
    # 1. Service <= Repository
    deleted_team = await team_repository.delete_team(
        db,
        _id,
    )
    # 2. MongoDB
    # 2-1. Cannot Delete(500)
    if deleted_team.acknowledged is False:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="팀 삭제에 실패했습니다.",
        )
    # 2-2. Existing Check(404)
    if deleted_team.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="삭제할 팀이 존재하지 않습니다.",
        )
    # 3. Redis
    await team_repository.delete_team_redis(
        redis,
        _id,
    )
    # 4. Service => Router
    data = TeamDeleteRes(
        deleted_count=deleted_team.deleted_count,
        acknowledged=deleted_team.acknowledged,
    )
    return data


# 팀(Team) 순서 변경(U) API
async def reorder_team(
    db: AsyncIOMotorDatabase,
    _id: str,
    payload: TeamReorderReq,
) -> TeamReorderRes:
    # 1. LexoRank => 새 order 계산
    new_order = await compute_reordered_value(
        db,
        team_repository.COLLECTION_NAME,
        payload.prev_id,
        payload.next_id,
    )
    # 2. Service <= Repository
    updated_team = await team_repository.update_team(
        db,
        _id,
        {
            "order": new_order,
            "updated_at": datetime.now(timezone.utc),
        },
    )
    # 2-1. Existing Check(404)
    if updated_team.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="순서를 변경할 팀이 존재하지 않습니다.",
        )
    # 3. Service => Router
    data = TeamReorderRes(order=new_order)
    return data


# 팀(Team) 활성/비활성 상태 변경(U) API
async def update_team_status(
    db: AsyncIOMotorDatabase,
    _id: str,
    payload: TeamStatusReq,
) -> TeamStatusRes:
    # 1. Service <= Repository
    updated_team = await team_repository.update_team(
        db,
        _id,
        {
            "status": payload.status,
            "updated_at": datetime.now(timezone.utc),
        },
    )
    # 1-1. Existing Check(404)
    if updated_team.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="상태를 변경할 팀이 존재하지 않습니다.",
        )
    # 2. Service => Router
    data = TeamStatusRes(
        matched_count=updated_team.matched_count,
        modified_count=updated_team.modified_count,
        acknowledged=updated_team.acknowledged,
    )
    return data
