from fastapi import APIRouter, Depends, File, UploadFile, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from apps.auth.dependencies import (
    get_current_employee,
    require_employee_manage_role,
)
from apps.employee import service as employee_service
from apps.employee.models.schemas import (
    EmployeeCreateReq,
    EmployeeCreateRes,
    EmployeeProfileImageRes,
    EmployeeReadDetailRes,
    EmployeeReadListRes,
    EmployeeRegistrationRejectRes,
    EmployeeUpdateReq,
    EmployeeUpdateRes,
)
from common.response import ResponseSchema
from core.database import get_database

employee_router = APIRouter()


# 임직원(Employee) 생성(C) API
# 권한 체계: 사원 추가는 최고관리자/관리자/부관리자만 할 수 있다.
# ("내 정보" 예외는 새로 만드는 시점에는 존재하지 않으므로 항상 권한을
# 확인한다)
@employee_router.post(
    "/",
    response_model=ResponseSchema[EmployeeCreateRes],
    status_code=status.HTTP_201_CREATED,
)
async def create_employee(
    payload: EmployeeCreateReq,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_employee: dict = Depends(get_current_employee),
) -> dict:
    require_employee_manage_role(current_employee)
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


# ─────────────────────────────────────────────────────────────────
# 신규 계정 신청(Registration) 목록/상세/승인/반려 API
# * "/{_id}"(단일 경로 파라미터)보다 먼저 등록해야, "/registrations"로
#   시작하는 요청이 엉뚱하게 _id="registrations"로 해석되지 않는다.
# * 네 개 다 관리자급(최고관리자/관리자/부관리자)만 호출할 수 있다.
# ─────────────────────────────────────────────────────────────────


# 신규 계정 신청(Registration) 목록 조회(R-L) API
@employee_router.get(
    "/registrations/",
    response_model=ResponseSchema[list[EmployeeReadListRes]],
)
async def get_employee_registrations_list(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_employee: dict = Depends(get_current_employee),
) -> dict:
    require_employee_manage_role(current_employee)
    # 1. Router <= Service
    data = await employee_service.get_employee_registrations_list(db)
    # 2. Router => FrontEnd
    return {"message": "신청자 목록 조회에 성공했습니다.", "data": data}


# 신규 계정 신청(Registration) 상세 조회(R-D) API
@employee_router.get(
    "/registrations/{_id}",
    response_model=ResponseSchema[EmployeeReadDetailRes],
)
async def get_employee_registration(
    _id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_employee: dict = Depends(get_current_employee),
) -> dict:
    require_employee_manage_role(current_employee)
    # 1. Router <= Service
    data = await employee_service.get_employee_registration(db, _id)
    # 2. Router => FrontEnd
    return {"message": "신청자 상세 조회에 성공했습니다.", "data": data}


# 신규 계정 신청(Registration) 수정(U) API
# 승인 전에 관리자급(최고관리자/관리자/부관리자)이 신청 내용을 직접 고칠 수
# 있다. (예: 오탈자 정정, 승인 전 부서/직급 미리 지정 등)
@employee_router.put(
    "/registrations/{_id}",
    response_model=ResponseSchema[EmployeeUpdateRes],
)
async def update_employee_registration(
    _id: str,
    payload: EmployeeUpdateReq,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_employee: dict = Depends(get_current_employee),
) -> dict:
    require_employee_manage_role(current_employee)
    # 1. Router <= Service
    data = await employee_service.update_employee_registration(
        db, _id, payload
    )
    # 2. Router => FrontEnd
    return {"message": "신청 정보를 수정했습니다.", "data": data}


# 신규 계정 신청(Registration) 승인 API
@employee_router.post(
    "/registrations/{_id}/approve",
    response_model=ResponseSchema[EmployeeCreateRes],
)
async def approve_employee_registration(
    _id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_employee: dict = Depends(get_current_employee),
) -> dict:
    require_employee_manage_role(current_employee)
    # 1. Router <= Service
    data = await employee_service.approve_employee_registration(db, _id)
    # 2. Router => FrontEnd
    return {"message": "신청을 승인했습니다.", "data": data}


# 신규 계정 신청(Registration) 반려 API
@employee_router.post(
    "/registrations/{_id}/reject",
    response_model=ResponseSchema[EmployeeRegistrationRejectRes],
)
async def reject_employee_registration(
    _id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_employee: dict = Depends(get_current_employee),
) -> dict:
    require_employee_manage_role(current_employee)
    # 1. Router <= Service
    data = await employee_service.reject_employee_registration(db, _id)
    # 2. Router => FrontEnd
    return {"message": "신청을 반려했습니다.", "data": data}


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
# 권한 체계: 타인의 정보 수정은 최고관리자/관리자/부관리자만 할 수 있다.
# 단, 본인("내 정보") 수정은 예외적으로 누구나 할 수 있다.
# 다만 본인이라도 admin_role(권한 등급)만큼은 스스로 올릴 수 없도록,
# 그 필드는 항상 관리 권한이 있는 사람만 바꿀 수 있게 막는다.
@employee_router.put(
    "/{_id}",
    response_model=ResponseSchema[EmployeeUpdateRes],
)
async def update_employee(
    _id: str,
    payload: EmployeeUpdateReq,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_employee: dict = Depends(get_current_employee),
) -> dict:
    is_self = str(current_employee["_id"]) == _id
    if not is_self:
        require_employee_manage_role(current_employee)
    elif payload.admin_role is not None:
        # 본인 수정은 허용되지만, admin_role(권한 등급)만큼은
        # 관리 권한이 있는 사람만 바꿀 수 있다 (셀프 권한 상승 방지)
        require_employee_manage_role(current_employee)
    # 1. Router <= Service
    data = await employee_service.update_employee(db, _id, payload)
    # 2. Router => FrontEnd
    return {"message": "임직원 수정에 성공했습니다.", "data": data}


# 임직원(Employee) 프로필 사진 업로드(U) API
# 반드시 임직원이 먼저 생성되어 있어야 하므로(사번 conflict 확인 완료 후),
# 사원 추가 화면에서는 POST / 로 임직원을 만든 다음 이 API를 따로 호출한다.
# 권한 체계: 수정(U) API와 동일하게, 본인 사진이면 누구나, 타인 사진이면
# 최고관리자/관리자/부관리자만 바꿀 수 있다.
@employee_router.post(
    "/{_id}/profile-image",
    response_model=ResponseSchema[EmployeeProfileImageRes],
)
async def upload_employee_profile_image(
    _id: str,
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_employee: dict = Depends(get_current_employee),
) -> dict:
    if str(current_employee["_id"]) != _id:
        require_employee_manage_role(current_employee)
    # 1. Router <= Service
    data = await employee_service.upload_profile_image(db, _id, file)
    # 2. Router => FrontEnd
    return {"message": "프로필 사진 업로드에 성공했습니다.", "data": data}
