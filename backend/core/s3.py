import boto3  # AWS S3 등 AWS 서비스를 사용하기 위한 공식 라이브러리
from fastapi import UploadFile
from fastapi.concurrency import (
    run_in_threadpool,  # 동기 함수를 비동기 코드 안에서 안전하게 실행
)

from core.config import (
    AWS_ACCESS_KEY_ID,
    AWS_REGION,
    AWS_S3_BUCKET_NAME,
    AWS_SECRET_ACCESS_KEY,
)

# 기본세팅 - S3 클라이언트는 요청마다 새로 만들지 않고, 이 코드로 재사용
_s3_client = boto3.client(
    "s3",
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION,
)
# 기본세팅 - 이미지가 저장될 S3 버킷 폴더명
_UPLOAD_FOLDER = "tripco"


# S3에 저장될 파일 경로(key) 생성
# extension이 없으면(None) 확장자 없이 "폴더/사번" 형태로 저장됨
def _build_object_key(
    extension: str | None, folder: str, employee_id: str
) -> str:
    if extension:
        return f"{_UPLOAD_FOLDER}/{folder}/{employee_id}.{extension}"
    return f"{_UPLOAD_FOLDER}/{folder}/{employee_id}"


# 업로드된 파일 이름에서 확장자만 뽑아냅니다. ("photo.PNG" => "PNG")
def _extract_extension(filename: str | None) -> str | None:
    if filename and "." in filename:
        return filename.rsplit(".", 1)[-1]
    return None


# S3에 저장 명령 - 업로드된 파일을 가공 없이 그대로 저장할 때 사용
# (예: 입사문서/결재 관련 파일처럼 원본을 그대로 보관해야 하는 경우)
async def upload_to_s3(file: UploadFile, folder: str, employee_id: str) -> str:
    # 1. 내용물 용량 확인
    file_bytes = await file.read()
    # 2. 내용물의 타입 / 확장자
    content_type = file.content_type or "application/octet-stream"
    extension = _extract_extension(file.filename)
    # 3. S3에 저장 (실제 업로드는 upload_bytes_to_s3로 위임)
    return await upload_bytes_to_s3(
        file_bytes, folder, employee_id, extension, content_type
    )


# S3에 저장 명령 - 서버에서 가공을 마친 바이트 데이터를 저장할 때 사용
# (예: 프로필 사진처럼 리사이즈/압축 등 가공을 거친 결과물을 올릴 때)
async def upload_bytes_to_s3(
    file_bytes: bytes,
    folder: str,
    employee_id: str,
    extension: str | None,
    content_type: str,
) -> str:
    # 1. S3에 저장될 파일명(object key) 생성
    object_key = _build_object_key(extension, folder, employee_id)
    # 2. S3에 저장
    return await run_in_threadpool(
        _put_object, file_bytes, object_key, content_type
    )


# S3에 실제 저장 함수
# [버그 수정] run_in_threadpool()로 실행되는 함수라 동기(sync) 함수여야 하는데
# async def로 되어 있었다. async 함수를 스레드풀에서 그냥 호출하면 실행되지
# 않고 coroutine 객체만 만들어져서, 결과값 대신 coroutine이 반환되는
# 버그가 있었다. (boto3 자체가 동기 라이브러리라 원래도 async일 필요가 없음)
def _put_object(
    file_bytes: bytes, object_key: str, content_type: str
) -> str:
    # 1. S3 저장 (boto3는 async 지원x => 함수 콜 시 run_in_threadpool() 사용)
    _s3_client.put_object(
        Bucket=AWS_S3_BUCKET_NAME,
        Key=object_key,
        Body=file_bytes,
        ContentType=content_type,
    )
    # 2. 실제 접근 가능한 url 주소 변환
    return (
        f"https://{AWS_S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/"
        f"{object_key}"
    )
