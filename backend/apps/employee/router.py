from fastapi import APIRouter, Depends, File, UploadFile, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from apps.employee import service as employee_service
from apps.employee.models.schemas import (
    EmployeeCreateReq,
    EmployeeCreateRes,
    EmployeeProfileImageRes,
    EmployeeReadDetailRes,
    EmployeeReadListRes,
    EmployeeUpdateReq,
    EmployeeUpdateRes,
)
from common.response import ResponseSchema
from core.database import get_database

employee_router = APIRouter()


# 임직원(Employee) 생성(C) API
@employee_router.post(
    "/",
    response_model=ResponseSchema[EmployeeCreateRes],
    status_code=status.HTTP_201_CREATED,
)
async def create_employee(
    payload: EmployeeCreateReq,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    # 1. Router <= Service
    data = await employee_service.create_employee(db, payload)
    # 2. Router => FrontEnd
    return {"message": "임직원 생성에 성공했습니다.", "data": data}


# 임직원(Employee) 목록 조회(R-L) API
@employee_router.get(
    "/", response_model=ResponseSchema[list[EmployeeReadListRes]]
)
async def get_employees_list(
    skip: int = 0,
    limit: int = 20,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    # 1. Router <= Service
    data = await employee_service.get_employees_list(db, skip, limit)
    # 2. Router => FrontEnd
    return {"message": "임직원 목록 조회에 성공했습니다.", "data": data}


# 임직원(Employee) 상세 조회(R-D) API
@employee_router.get(
    "/{_id}",
    response_model=ResponseSchema[EmployeeReadDetailRes],
    status_code=status.HTTP_200_OK,
)
async def get_employee(
    _id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    # 1. Router <= Service
    data = await employee_service.get_employee(db, _id)
    # 2. Router => FrontEnd
    return {"message": "임직원 상세 조회에 성공했습니다.", "data": data}


# 임직원(Employee) 수정(U) API
@employee_router.put(
    "/{_id}",
    response_model=ResponseSchema[EmployeeUpdateRes],
)
async def update_employee(
    _id: str,
    payload: EmployeeUpdateReq,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    # 1. Router <= Service
    data = await employee_service.update_employee(db, _id, payload)
    # 2. Router => FrontEnd
    return {"message": "임직원 수정에 성공했습니다.", "data": data}


# 임직원(Employee) 프로필 사진 업로드(U) API
# 반드시 임직원이 먼저 생성되어 있어야 하므로(사번 conflict 확인 완료 후),
# 사원 추가 화면에서는 POST / 로 임직원을 만든 다음 이 API를 따로 호출한다.
@employee_router.post(
    "/{_id}/profile-image",
    response_model=ResponseSchema[EmployeeProfileImageRes],
)
async def upload_employee_profile_image(
    _id: str,
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    # 1. Router <= Service
    data = await employee_service.upload_profile_image(db, _id, file)
    # 2. Router => FrontEnd
    return {"message": "프로필 사진 업로드에 성공했습니다.", "data": data}
