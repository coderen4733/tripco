from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from apps.auth import repository as auth_repository
from apps.auth.models.entities import TokenEntity
from apps.auth.models.schemas import (
    ReTokenReq,
    ReTokenRes,
    SignInReq,
    SignInRes,
    SignOutReq,
    SignOutRes,
)
from apps.employee import repository as employee_repository
from apps.employee.models.entities import EmployeeEntity
from core.config import (
    ACCESS_TOKEN_EXPIRE,
    ACCESS_TOKEN_SECRET,
    JWT_ALGORITHM,
    REFRESH_TOKEN_EXPIRE,
    REFRESH_TOKEN_SECRET,
)


# 로그인(sign-in) API
async def sign_in(
    db: AsyncIOMotorDatabase, dto: SignInReq, ip_address: str
) -> dict:
    # 1. Employee 조회
    employee = await employee_repository.get_employee_by_login_id(
        db, dto.login_id, None
    )
    # 1-1. Employee가 없거나 비밀번호 불일치 시
    # if not employee or not bcrypt.checkpw(
    #     dto.password.encode("utf-8"), employee["password"].encode("utf-8")
    # ):
    #     raise HTTPException(
    #         status_code=status.HTTP_401_UNAUTHORIZED,
    #         detail="아이디 또는 비밀번호가 일치하지 않습니다.",
    #     )
    if not employee or (dto.password != employee["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="아이디 또는 비밀번호가 일치하지 않습니다.",
        )
    # 2. Token 생성
    now = datetime.now(timezone.utc)
    # 2-1. Access Token (기본값: 30분)
    access_expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE)
    access_payload = {
        "sub": str(employee["_id"]),
        "type": "access",
        "exp": access_expire,
    }
    access_token = jwt.encode(
        access_payload, ACCESS_TOKEN_SECRET, algorithm=JWT_ALGORITHM
    )
    # 2-2. Refresh Token (기본값: 14일)
    refresh_expire = now + timedelta(days=REFRESH_TOKEN_EXPIRE)
    refresh_payload = {
        "sub": str(employee["_id"]),
        "type": "refresh",
        "exp": refresh_expire,
    }
    refresh_token = jwt.encode(
        refresh_payload, REFRESH_TOKEN_SECRET, algorithm=JWT_ALGORITHM
    )
    # 3. 엔터티 생성
    token_entity = TokenEntity(
        employee_id=str(employee["_id"]),
        ip_address=ip_address,
        refresh_token=refresh_token,
    )
    # 4. Refresh Token을 DB에 저장
    await auth_repository.create_refresh_token(db, token_entity)
    # 5. 로그인 일시 기록
    await employee_repository.last_sign_in_time(
        db, token_entity.employee_id, now
    )
    # 6. 데이터 변환 및 반환
    result = {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "admin_role": employee["admin_role"],
    }
    data = SignInRes(
        access_token=result["access_token"],
        refresh_token=result["refresh_token"],
        token_type=result["token_type"],
        admin_role=result["admin_role"],
    )
    return data


# 토큰재발급(re-token) API
async def re_token(db: AsyncIOMotorDatabase, dto: ReTokenReq) -> dict:
    try:
        # 1. Refresh Token 디코딩
        payload = jwt.decode(
            dto.refresh_token,
            REFRESH_TOKEN_SECRET,
            algorithms=[JWT_ALGORITHM],
        )
        employee_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        # 1-1. 해당 employee_id가 없거나 토큰 타입이 "refresh"가 아닌 경우
        if employee_id is None or token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="유효하지 않은 리프레시 토큰입니다.",
            )
        # 2. DB에 저장된 토큰과 일치하는지 확인 (중요: 보안 강화)
        employee = await employee_repository.get_employee_by_id(
            db, employee_id
        )
        refresh_token = (
            await auth_repository.find_refresh_token_by_refresh_token(
                db, dto.refresh_token
            )
        )
        # 2-1. 만약 해당 employee가 없거나, DB에 토큰이 없거나(로그아웃 등),
        #      토큰 소유 employee가 일치하지 않는 경우
        if (
            employee is None
            or refresh_token is None
            or employee_id != refresh_token["employee_id"]
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="토큰의 사용자가 일치하지 않습니다.",
            )
        # 3. 새로운 Access Token 발행
        now = datetime.now(timezone.utc)
        access_expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE)
        new_access_token = jwt.encode(
            {"sub": employee_id, "type": "access", "exp": access_expire},
            ACCESS_TOKEN_SECRET,
            algorithm=JWT_ALGORITHM,
        )
        # 4. 데이터 변환 및 반환
        result = {
            "access_token": new_access_token,
            "token_type": "bearer",
        }
        data = ReTokenRes(
            access_token=result["access_token"],
            token_type=result["token_type"],
        )
        return data
    except jwt.ExpiredSignatureError:  # 리프레시 토큰 만료기간이 지났을 때
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="리프레시 토큰이 만료되었습니다.",
        )
    except jwt.PyJWTError:  # 토큰이 위조되었거나 변조되었을 때
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증 세션이 유효하지 않습니다.",
        )


# 로그아웃(sign-out) API
async def sign_out(db: AsyncIOMotorDatabase, dto: SignOutReq) -> dict:
    # 1. 요청받은 Refresh Token을 DB에서 삭제 (로그아웃 처리)
    deleted_count = (
        await auth_repository.delete_refresh_token_by_refresh_token(
            db, dto.refresh_token
        )
    )
    # 1-1. 삭제된 문서가 없다면(이미 로그아웃됐거나 잘못된 토큰) 에러처리
    if deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 리프레시 토큰입니다.",
        )
    # 2. 데이터 변환 및 반환
    result = {"success": True}
    data = SignOutRes(success=result["success"])
    return data
