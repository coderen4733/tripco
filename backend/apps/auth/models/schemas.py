from datetime import datetime

from pydantic import BaseModel, Field


# 로그인(sign-in) API - 요청(Req)
class SignInReq(BaseModel):
    login_id: str = Field(..., min_length=1, example="test")
    password: str = Field(..., min_length=1, example="test12#$")


# 로그인(sign-in) API - 응답(Res)
class SignInRes(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    admin_role: str


# 토큰재발급(re-token) API - 요청(Req)
class ReTokenReq(BaseModel):
    refresh_token: str = Field(..., description="Refresh Token")


# 토큰재발급(re-token) API - 응답(Res)
class ReTokenRes(BaseModel):
    access_token: str = Field(..., description="Access Token")
    token_type: str = "bearer"


# 로그아웃(sign-out) API - 요청(Req)
class SignOutReq(BaseModel):
    refresh_token: str = Field(..., description="Refresh Token")


# 로그아웃(sign-out) API - 응답(Res)
class SignOutRes(BaseModel):
    success: bool = True
