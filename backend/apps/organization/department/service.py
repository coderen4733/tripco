from datetime import datetime, timezone

from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from redis.asyncio import Redis

from apps.organization.department import repository as dept_repository
from apps.organization.department.models.entities import DepartmentEntity
from apps.organization.department.models.schemas import (
    DeptCreateReq,
    DeptCreateRes,
    DeptDeleteRes,
    DeptReadDetailRes,
    DeptReadListRes,
    DeptUpdateReq,
    DeptUpdateRes,
)
from common.lexorank import LexoRank


# 부서(Department) 생성(C) API
async def create_department(
    db: AsyncIOMotorDatabase,
    redis: Redis,
    payload: DeptCreateReq,
) -> DeptCreateRes:
    # 1. Duplicate Check
    # 1-1. dept_code
    is_duplicate_dept_code = await dept_repository.get_department_by_dept_code(
        db,
        payload.dept_code,
        None,
    )
    if is_duplicate_dept_code:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 dept_code입니다.",
        )
    # 1-2. name
    is_duplicate_name = await dept_repository.get_department_by_name(
        db,
        payload.name,
        None,
    )
    if is_duplicate_name:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 부서명입니다.",
        )
    # 2. LexoRank => Order
    last_dept = await dept_repository.get_last_department_order(db)
    if last_dept and "order" in last_dept:
        # 2-1. 데이터가 존재한다면: 가장 마지막 order 다음 order 생성
        new_order = LexoRank.get_next(last_dept["order"])
    else:
        # 2-2. 데이터가 존재하지 않는다면(첫 등록): 기본 중간값(i00000) order로
        new_order = LexoRank.get_middle()
    dept_data = payload.model_dump()
    dept_data["order"] = new_order

    # 3. Create & Read
    # 3-1. MongoDB
    department = DepartmentEntity(**dept_data)
    new_department_id = await dept_repository.create_department(
        db,
        department,
    )
    new_department = await dept_repository.get_department_by_id(
        db,
        new_department_id,
    )
    # 3-1-1. MongoDB에서 Read 되지 않는 경우
    if not new_department:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="부서가 저장되지 않았거나, 조회에 실패하였습니다.",
        )
    # 3-2. Redis
    await dept_repository.create_department_redis(
        redis,
        str(new_department.get("_id")),
        str(new_department.get("name")),
    )
    # 4. Service => Router
    data = DeptCreateRes(**new_department)
    return data


# 부서(Department) 목록 조회(R-L) API - MongoDB
async def get_departments_list(
    db: AsyncIOMotorDatabase,
    skip: int,
    limit: int,
) -> list[DeptReadListRes]:
    # 1. Service <= Repository
    departments = await dept_repository.get_departments_list(
        db,
        skip,
        limit,
    )
    # 2. Service => Router
    data = [
        DeptReadListRes(
            _id=str(department["_id"]),
            dept_code=department["dept_code"],
            name=department["name"],
            leader_id=department["leader_id"],
            status=department["status"],
            order=department["order"],
        )
        for department in departments
    ]
    return data


# 부서(Department) 상세 조회(R-D) API
async def get_department(
    db: AsyncIOMotorDatabase,
    _id: str,
) -> DeptReadDetailRes:
    # 1. Service <= Repository
    department = await dept_repository.get_department_by_id(
        db,
        _id,
    )
    # 2. Existing Check(404)
    if department is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="상세 조회할 부서가 존재하지 않습니다.",
        )
    # 3. Service => Router
    data = DeptReadDetailRes(**department)
    return data


# 부서(Department) 수정(U) API
async def update_department(
    db: AsyncIOMotorDatabase,
    redis: Redis,
    _id: str,
    payload: DeptUpdateReq,
) -> DeptUpdateRes:
    # 1. Duplicate Check
    # 1-1. dept_code
    is_duplicate_dept_code = await dept_repository.get_department_by_dept_code(
        db,
        payload.dept_code,
        _id,
    )
    if is_duplicate_dept_code:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 dept_code입니다.",
        )
    # 1-2. name
    is_duplicate_name = await dept_repository.get_department_by_name(
        db,
        payload.name,
        _id,
    )
    if is_duplicate_name:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 부서명입니다.",
        )
    # 2. Service <= Repository
    updated_dept = await dept_repository.update_department(
        db,
        _id,
        {
            "dept_code": payload.dept_code,
            "name": payload.name,
            "leader_id": payload.leader_id,
            "hq_id": payload.hq_id,
            "updated_at": datetime.now(timezone.utc),
        },
    )
    # 2-1. Existing Check(404)
    if updated_dept.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="수정할 부서가 존재하지 않습니다.",
        )
    # 2-2. Redis
    await dept_repository.update_department_redis(
        redis,
        _id,
        payload.name,
    )
    # 3. Service => Router
    data = DeptUpdateRes(
        matched_count=updated_dept.matched_count,
        modified_count=updated_dept.modified_count,
        acknowledged=updated_dept.acknowledged,
    )
    return data


# 부서(Department) 삭제(D) API
async def delete_department(
    db: AsyncIOMotorDatabase,
    redis: Redis,
    _id: str,
) -> DeptDeleteRes:
    # 1. Service <= Repository
    deleted_dept = await dept_repository.delete_department(
        db,
        _id,
    )
    # 2. MongoDB
    # 2-1. Cannot Delete(500)
    if deleted_dept.acknowledged is False:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="부서 삭제에 실패했습니다.",
        )
    # 2-2. Existing Check(404)
    if deleted_dept.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="삭제할 부서가 존재하지 않습니다.",
        )
    # 3. Redis
    await dept_repository.delete_department_redis(
        redis,
        _id,
    )
    # 4. Service => Router
    data = DeptDeleteRes(
        deleted_count=deleted_dept.deleted_count,
        acknowledged=deleted_dept.acknowledged,
    )
    return data
