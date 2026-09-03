from fastapi import APIRouter, Depends, File, Request, UploadFile, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from apps.auth import service
from apps.auth.models.schemas import (
    ReTokenReq,
    ReTokenRes,
    SignInReq,
    SignInRes,
    SignOutReq,
    SignOutRes,
)
from apps.employee.models.schemas import (
    EmployeeCreateReq,
    EmployeeCreateRes,
    EmployeeProfileImageRes,
)
from common.response import ResponseSchema
from core.database import get_database

auth_router = APIRouter()


# 회원가입(신규 계정 신청) API
# 입력값은 '사원 추가' 폼과 동일한 EmployeeCreateReq를 그대로 쓴다.
# 바로 임직원으로 등록되지 않고, 관리자 승인 전까지는 승인 대기 명단
# (employee_registrations)에만 저장된다.
@auth_router.post(
    "/sign-up",
    response_model=ResponseSchema[EmployeeCreateRes],
    status_code=status.HTTP_201_CREATED,
)
async def sign_up(
    dto: EmployeeCreateReq,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    # 1. Data(Router <- Service)
    data = await service.sign_up(db, dto)
    # 2. Response(Router -> FrontEnd)
    return {
        "message": (
            "신규 계정 신청이 접수되었습니다. "
            "관리자 승인 후 이용하실 수 있습니다."
        ),
        "data": data,
    }


# 신규 계정 신청(회원가입) 프로필 사진 업로드 API
# 사원 추가 화면과 마찬가지로, 신청 정보가 먼저 저장된 뒤(사번 conflict가
# 없다는 게 확인된 뒤)에만 이 API로 사진을 올릴 수 있다.
@auth_router.post(
    "/sign-up/{_id}/profile-image",
    response_model=ResponseSchema[EmployeeProfileImageRes],
)
async def upload_registration_profile_image(
    _id: str,
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    # 1. Data(Router <- Service)
    data = await service.upload_registration_profile_image(db, _id, file)
    # 2. Response(Router -> FrontEnd)
    return {"message": "프로필 사진 업로드에 성공했습니다.", "data": data}


# 로그인(sign-in) API
@auth_router.post(
    "/sign-in",
    response_model=ResponseSchema[SignInRes],
    status_code=status.HTTP_200_OK,
)
async def sign_in(
    dto: SignInReq,
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    # 1. Data(Router <- Service)
    data = await service.sign_in(db, dto, ip_address=request.client.host)
    # 2. Response(Router -> FrontEnd)
    return {"message": "로그인에 성공하였습니다.", "data": data}


# 토큰재발급(re-token) API
@auth_router.post(
    "/re-token",
    response_model=ResponseSchema[ReTokenRes],
    status_code=status.HTTP_200_OK,
)
async def re_token(
    dto: ReTokenReq,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    # 1. Data(Router <- Service)
    data = await service.re_token(db, dto)
    # 2. Response(Router -> FrontEnd)
    return {"message": "Access Token 재발급에 성공했습니다.", "data": data}


# 로그아웃(sign-out) API
@auth_router.post(
    "/sign-out",
    response_model=ResponseSchema[SignOutRes],
    status_code=status.HTTP_200_OK,
)
async def sign_out(
    dto: SignOutReq,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    # 1. Data(Router <- Service)
    data = await service.sign_out(db, dto)
    # 2. Response(Router -> FrontEnd)
    return {"message": "로그아웃에 성공하였습니다.", "data": data}
