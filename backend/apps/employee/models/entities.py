from datetime import datetime, timezone

from pydantic import BaseModel, Field

from apps.employee.models.enums import (
    AdminRole,
    DriverLicenseType,
    ExpLevel,
    Gender,
)


class LanguageSkill(BaseModel):
    language: str  # 언어명(영어, 중국어, 일본어 등)
    level: str  # 숙련도(원어민, 유창함, 기초수준 등)
    certification: str | None = None  # 언어자격증(점수)


class EmployeeEntity(BaseModel):
    # 0. ERP 정보
    login_id: str  # ERP 로그인id
    password: str  # ERP 로그인pw
    admin_role: AdminRole = AdminRole.STAFF  # ERP 권한등급

    # 1. 기본 정보
    name_kor: str  # 성명(한국어)
    name_eng: str  # 성명(영어)
    name_jpn: str | None = Field(default=None)  # 성명(일본어)
    name_chn: str | None = Field(default=None)  # 성명(중국어)
    gender: Gender  # 성별
    birth_date: str  # 생년월일(프론트에서 str로 요청)
    profile_image_url: str | None = Field(default=None)  # 프로필 사진 url(S3)
    phone_number: str  # 휴대폰 번호
    address: str | None = Field(default=None)  # 거주지 주소
    email: str  # 개인 이메일
    email_company: str | None = Field(default=None)  # 회사 이메일
    desk_number: str | None = Field(default=None)  # 데스크 직통 전화번호

    # 2. 인사
    employee_id: str  # 사번
    dept_id: str | None = Field(default=None)  # 부서id
    team_id: str | None = Field(default=None)  # 팀id
    position_id: str | None = Field(default=None)  # 직급/직위id
    title_id: str | None = Field(default=None)  # 직책id
    duty_id: str | None = Field(default=None)  # 직무id
    employment_type: str | None = Field(default=None)  # 고용형태id
    exp_level: ExpLevel = ExpLevel.NEW  # 신입/경력 여부
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )  # 입사일
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )  # 수정일
    deleted_at: datetime | None = None  # 퇴사일
    last_sign_in_at: datetime | None = None  # 최근 접속일

    # 3. 보유능력
    driver_license_type: DriverLicenseType = (
        DriverLicenseType.NONE
    )  # 운전면허 종류(무면허, 1종, 2종 등)
    owned_vehicle: str | None = None  # 보유 차량 종류
    owned_vehicle_number: str | None = None  # 보유 차량 번호
    languages: list[LanguageSkill] = Field(default_factory=list)

    # 4. 입사문서 파일 url(S3)
    resident_registration_url: str | None = None  # 주민등록등본 url
    graduation_certificate_url: str | None = None  # 최종 학력 증명 서류 url
    transcript_url: str | None = None  # 성적 증명 서류 url
    career_certificate_url: str | None = None  # 이전 직장 경력 증빙 서류 url
    employment_contract_url: str | None = None  # 근로계약서 url

    # 5. 결재 관련 파일 url(S3)
    signature_url: str | None = None  # 결재 사인 url
    registered_seal_url: str | None = None  # 결재 인감 url
