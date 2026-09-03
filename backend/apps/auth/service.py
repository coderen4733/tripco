from datetime import datetime, timedelta, timezone

import jwt
from fastapi import HTTPException, UploadFile, status
from fastapi.concurrency import (
    run_in_threadpool,  # 동기 함수(Pillow 이미지 처리)를 비동기로 실행
)
from motor.motor_asyncio import AsyncIOMotorDatabase

from apps.alarm import service as alarm_service
from apps.alarm.models.enums import AlarmCategory, AlarmType
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
from apps.employee.models.schemas import (
    EmployeeCreateReq,
    EmployeeCreateRes,
    EmployeeProfileImageRes,
)
from core.config import (
    ACCESS_TOKEN_EXPIRE,
    ACCESS_TOKEN_SECRET,
    JWT_ALGORITHM,
    REFRESH_TOKEN_EXPIRE,
    REFRESH_TOKEN_SECRET,
)
from core.image import process_profile_image
from core.s3 import upload_bytes_to_s3
from core.security import hash_password, verify_password


# 로그인(sign-in) API
async def sign_in(
    db: AsyncIOMotorDatabase, dto: SignInReq, ip_address: str
) -> dict:
    # 1. Employee 조회
    employee = await employee_repository.get_employee_by_login_id(
        db, dto.login_id, None
    )
    # 1-1. Employee가 없거나 비밀번호 불일치 시
    is_password_valid = employee and await run_in_threadpool(
        verify_password, dto.password, employee["password"]
    )
    if not employee or not is_password_valid:
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


# 회원가입(신규 계정 신청) API
# 입력값은 '사원 추가' 폼과 완전히 동일한 EmployeeCreateReq를 그대로 쓴다.
# 다만 바로 employees에 등록되는 게 아니라, 관리자급(최고관리자/관리자/
# 부관리자) 승인을 받기 전까지는 employee_registrations(대기 명단)에만
# 저장해둔다. (승인 이후 employees로 옮기는 로직은 별도 승인 API에서 처리)
async def sign_up(
    db: AsyncIOMotorDatabase, dto: EmployeeCreateReq
) -> EmployeeCreateRes:
    # 1. Duplicate Check - 이미 정식으로 등록된 임직원인 경우
    if await employee_repository.get_employee_by_login_id(
        db, dto.login_id, None
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 login_id입니다.",
        )
    if await employee_repository.get_employee_by_employee_id(
        db, dto.employee_id, None
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 존재하는 사번입니다.",
        )
    # 2. Duplicate Check - 이미 신청 후 승인 대기 중인 경우
    if await employee_repository.get_employee_registration_by_login_id(
        db, dto.login_id, None
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 승인 대기 중인 login_id입니다.",
        )
    if await employee_repository.get_employee_registration_by_employee_id(
        db, dto.employee_id, None
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 승인 대기 중인 사번입니다.",
        )
    # 3. Create & Read
    # 비밀번호는 평문 그대로 저장하지 않고 bcrypt로 해시해서 저장한다.
    registration_data = dto.model_dump()
    registration_data["password"] = await run_in_threadpool(
        hash_password, registration_data["password"]
    )
    registration = EmployeeEntity(**registration_data)
    new_registration_id = (
        await employee_repository.create_employee_registration(
            db, registration
        )
    )
    new_registration = (
        await employee_repository.get_employee_registration_by_id(
            db, new_registration_id
        )
    )
    if not new_registration:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="신청 정보가 저장되지 않았거나, 조회에 실패했습니다.",
        )
    # 4. 관리자급(최고관리자/관리자/부관리자) 임직원 전체에게 알람 전송
    # (신규 계정 신청 = ERP 계정 관리 이슈라 "시스템" 카테고리로 분류한다)
    await alarm_service.notify_admins(
        db,
        AlarmType.EMPLOYEE_REGISTRATION,
        AlarmCategory.SYSTEM,
        f"{dto.name_kor}님께서 신규 계정 신청을 하셨습니다.",
        related_id=new_registration_id,
    )
    # 5. 데이터 변환 및 반환
    new_registration["_id"] = str(new_registration["_id"])
    data = EmployeeCreateRes(**new_registration)
    return data


# 신규 계정 신청(회원가입) 프로필 사진 업로드 API
# employee_service.upload_profile_image와 거의 동일하지만, 대상이
# employees가 아니라 employee_registrations(승인 대기 명단)라는 점만 다르다.
async def upload_registration_profile_image(
    db: AsyncIOMotorDatabase,
    _id: str,
    file: UploadFile,
) -> EmployeeProfileImageRes:
    registration = await employee_repository.get_employee_registration_by_id(
        db, _id
    )
    if registration is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="프로필 사진을 등록할 신청 정보가 존재하지 않습니다.",
        )
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미지 파일만 업로드할 수 있습니다.",
        )
    raw_bytes = await file.read()
    try:
        processed_bytes = await run_in_threadpool(
            process_profile_image, raw_bytes
        )
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미지 파일을 처리할 수 없습니다.",
        ) from err
    url = await upload_bytes_to_s3(
        processed_bytes,
        "profile",
        registration["employee_id"],
        "jpg",
        "image/jpeg",
    )
    await employee_repository.update_employee_registration(
        db,
        _id,
        {
            "profile_image_url": url,
            "updated_at": datetime.now(timezone.utc),
        },
    )
    return EmployeeProfileImageRes(profile_image_url=url)


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
