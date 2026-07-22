from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from apps.organization.team import service as team_service
from apps.organization.team.models.schemas import (
    TeamCreateReq,
    TeamCreateRes,
    TeamDeleteRes,
    TeamReadDetailRes,
    TeamReadListRes,
    TeamUpdateReq,
    TeamUpdateRes,
)
from common.response import ResponseSchema
from core.database import get_database

team_router = APIRouter()


# 팀(Team) 생성(C) API
@team_router.post(
    "/",
    response_model=ResponseSchema[TeamCreateRes],
    status_code=status.HTTP_201_CREATED,
)
async def create_team(
    payload: TeamCreateReq,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    # 1. Router <= Service
    data = await team_service.create_team(db, payload)
    # 2. Router => FrontEnd
    return {"message": "팀 생성에 성공했습니다.", "data": data}


# 팀(Team) 목록 조회(R-L) API
@team_router.get("/", response_model=ResponseSchema[list[TeamReadListRes]])
async def get_teams_list(
    skip: int = 0,
    limit: int = 20,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    # 1. Router <= Service
    data = await team_service.get_teams_list(db, skip, limit)
    # 2. Router => FrontEnd
    return {"message": "팀 목록 조회에 성공했습니다.", "data": data}


# 팀(Team) 상세 조회(R-D) API
@team_router.get(
    "/{_id}",
    response_model=ResponseSchema[TeamReadDetailRes],
    status_code=status.HTTP_200_OK,
)
async def get_team(
    _id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    # 1. Router <= Service
    data = await team_service.get_team(db, _id)
    # 2. Router => FrontEnd
    return {"message": "팀 상세 조회에 성공했습니다.", "data": data}


# 팀(Team) 수정(U) API
@team_router.put("/{_id}", response_model=ResponseSchema[TeamUpdateRes])
async def update_team(
    _id: str,
    payload: TeamUpdateReq,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    # 1. Router <= Service
    data = await team_service.update_team(db, _id, payload)
    # 2. Router => FrontEnd
    return {"message": "팀 수정에 성공했습니다.", "data": data}


# 팀(Team) 삭제(D) API
@team_router.delete(
    "/{_id}",
    response_model=ResponseSchema[TeamDeleteRes],
    status_code=status.HTTP_200_OK,
)
async def delete_team(
    _id: str, db: AsyncIOMotorDatabase = Depends(get_database)
) -> dict:
    # 1. Router <= Service
    data = await team_service.delete_team(db, _id)
    # 2. Router => FrontEnd
    return {"message": "팀 삭제에 성공했습니다.", "data": data}
