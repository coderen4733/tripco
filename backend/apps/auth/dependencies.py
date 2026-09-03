import jwt
from fastapi import Depends, HTTPException, Request, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from apps.employee import repository as employee_repository
from apps.employee.models.enums import AdminRole
from core.config import ACCESS_TOKEN_SECRET, JWT_ALGORITHM
from core.database import get_database

# 사원 추가 / 타인 정보 수정이 허용되는 권한 등급
# (최고관리자, 관리자, 부관리자만 가능하고, 일반/감사는 불가능)
EMPLOYEE_MANAGE_ROLES = {
    AdminRole.MASTER,
    AdminRole.ADMIN,
    AdminRole.SUB_ADMIN,
}


# 요청 헤더의 "Authorization: Bearer {access_token}" 값으로 현재 로그인한
# 임직원을 찾아옵니다. 사원 추가/수정처럼 권한 확인이 필요한 API에서
# Depends(get_current_employee)로 공통으로 사용합니다.
async def get_current_employee(
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> dict:
    # 1. Authorization 헤더 확인
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="로그인이 필요합니다.",
        )
    token = auth_header.removeprefix("Bearer ").strip()

    # 2. 액세스 토큰 디코딩
    try:
        payload = jwt.decode(
            token, ACCESS_TOKEN_SECRET, algorithms=[JWT_ALGORITHM]
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증 세션이 만료되었습니다. 다시 로그인해 주세요.",
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 인증 토큰입니다.",
        )
    employee_id = payload.get("sub")
    if employee_id is None or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 인증 토큰입니다.",
        )

    # 3. 토큰 주인이 실제로 존재하는 임직원인지 확인
    employee = await employee_repository.get_employee_by_id(db, employee_id)
    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="로그인한 임직원 정보를 찾을 수 없습니다.",
        )
    return employee


# 사원 추가 / 타인 정보 수정 권한(최고관리자·관리자·부관리자)이 있는지
# 확인합니다. 권한이 없으면 403을 던집니다. (내 정보 수정처럼 예외가 있는
# API는 라우터에서 대상 _id와 현재 로그인한 임직원의 _id가 같은지 먼저
# 비교한 뒤에 이 함수를 호출한다)
def require_employee_manage_role(current_employee: dict) -> None:
    if current_employee.get("admin_role") not in EMPLOYEE_MANAGE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="사원 추가/정보 수정 권한이 없습니다.",
        )
