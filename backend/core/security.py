import bcrypt


# 평문 비밀번호를 bcrypt로 해시합니다.
# (사원 추가/신규 계정 신청/비밀번호 변경 시 저장 직전에 호출한다)
def hash_password(plain_password: str) -> str:
    hashed = bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8")


# 로그인 시, 입력한 평문 비밀번호가 저장된 해시와 일치하는지 확인합니다.
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode("utf-8"), hashed_password.encode("utf-8")
    )
