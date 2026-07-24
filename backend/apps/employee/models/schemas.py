from datetime import datetime

from pydantic import BaseModel, Field

from apps.employee.models.entities import LanguageSkill
from apps.employee.models.enums import (
    AdminRole,
    DriverLicenseType,
    ExpLevel,
    Gender,
)
from common.organization import DefaultOrgId


# 임직원(Employee) 생성(C) API - 요청(Req)
class EmployeeCreateReq(BaseModel):
    # 0. ERP 정보
    login_id: str = Field(min_length=3, example="tester")
    password: str = Field(min_length=8, example="test12#$")

    # 1. 기본 정보
    name_kor: str = Field(min_length=2, example="테스터")
    name_eng: str = Field(min_length=2, example="Tester")
    name_jpn: str | None = Field(default=None)
    name_chn: str | None = Field(default=None)
    gender: Gender | None = Field(default=Gender.ETC)
    birth_date: str = Field(min_length=10, max_length=10, example="1999-10-19")
    profile_image_url: str | None = Field(default=None)
    phone_number: str = Field(example="010-1234-1234")
    address: str | None = Field(default=None)
    email: str = Field(..., min_length=7, example="test@naver.com")
    email_company: str | None = Field(default=None)
    desk_number: str | None = Field(default=None)

    # 2. 인사
    employee_id: str = Field(min_length=8, example="20260217")
    dept_id: str | None = Field(default=DefaultOrgId.NO_DEPT)
    team_id: str | None = Field(default=DefaultOrgId.NO_TEAM)
    position_id: str | None = Field(default=DefaultOrgId.NO_POSITION)
    title_id: str | None = Field(default=DefaultOrgId.NO_TITLE)
    duty_id: str | None = Field(default=DefaultOrgId.NO_DUTY)
    employment_type: str | None = Field(default=DefaultOrgId.NO_EMP_TYPE)
    exp_level: ExpLevel | None = Field(default=ExpLevel.NEW)

    # 3. 보유능력
    driver_license_type: DriverLicenseType | None = Field(
        default=DriverLicenseType.NONE
    )
    owned_vehicle: str | None = Field(default=None)
    owned_vehicle_number: str | None = Field(default=None)
    languages: list[LanguageSkill] | None = Field(default_factory=list)

    # 4. 입사문서 파일 url(S3)
    resident_registration_url: str | None = None
    graduation_certificate_url: str | None = None
    transcript_url: str | None = None
    career_certificate_url: str | None = None
    employment_contract_url: str | None = None

    # 5. 결재 관련 파일 url(S3)
    signature_url: str | None = None
    registered_seal_url: str | None = None


# 임직원(Employee) 생성(C) API - 응답(Res)
class EmployeeCreateRes(BaseModel):
    id: str = Field(..., alias="_id")


# 임직원(Employee) 상세 조회(R-D) API - 응답(Res)
class EmployeeReadDetailRes(BaseModel):
    # 0. ERP 정보
    login_id: str  # ERP 로그인id
    password: str  # ERP 로그인pw
    admin_role: AdminRole  # ERP 권한등급

    # 1. 기본 정보
    name_kor: str  # 성명(한국어)
    name_eng: str  # 성명(영어)
    name_jpn: str | None  # 성명(일본어)
    name_chn: str | None  # 성명(중국어)
    gender: Gender  # 성별
    birth_date: str  # 생년월일
    profile_image_url: str | None  # 프로필 사진 url(S3)
    phone_number: str  # 휴대폰 번호
    address: str  # 거주지 주소
    email: str  # 개인 이메일
    email_company: str | None  # 회사 이메일
    desk_number: str | None  # 데스크 직통 전화번호

    # 2. 인사
    employee_id: str  # 사번
    dept_id: str = DefaultOrgId.NO_DEPT  # 부서id
    team_id: str = DefaultOrgId.NO_TEAM  # 팀id
    position_id: str = DefaultOrgId.NO_POSITION  # 직급/직위id
    title_id: str = DefaultOrgId.NO_TITLE  # 직책id
    duty_id: str = DefaultOrgId.NO_DUTY  # 직무id
    employment_type: str = DefaultOrgId.NO_EMP_TYPE  # 고용형태id
    exp_level: ExpLevel = ExpLevel.NEW  # 신입/경력 여부
    created_at: datetime  # 입사일
    updated_at: datetime  # 수정일
    deleted_at: datetime | None  # 퇴사일

    # 3. 보유능력
    driver_license_type: DriverLicenseType = (
        DriverLicenseType.NONE
    )  # 운전면허 종류(무면허, 1종, 2종 등)
    owned_vehicle: str | None  # 보유 차량 종류
    owned_vehicle_number: str | None  # 보유 차량 번호
    languages: list[LanguageSkill]

    # 4. 입사문서 파일 url(S3)
    resident_registration_url: str | None  # 주민등록등본 url
    graduation_certificate_url: str | None  # 최종 학력 증명 서류 url
    transcript_url: str | None  # 성적 증명 서류 url
    career_certificate_url: str | None  # 이전 직장 경력 증빙 서류 url
    employment_contract_url: str | None  # 근로계약서 url

    # 5. 결재 관련 파일 url(S3)
    signature_url: str | None  # 결재 사인 url
    registered_seal_url: str | None  # 결재 인감 url
