import uuid
from urllib.parse import urlparse

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
def _build_object_key(filename: str, folder: str, employee_id: str) -> str:
    # 1. 확장자가 있는 경우
    if "." in filename:
        extension = filename.rsplit(".", 1)[-1]  # 확장자
        return f"{_UPLOAD_FOLDER}/{folder}/{employee_id}.{extension}"
    # 2. 확장자가 없는 경우
    return f"{_UPLOAD_FOLDER}/{folder}/{employee_id}"


# S3에 저장 명령
async def upload_to_s3(file: UploadFile, folder: str, employee_id: str) -> str:
    # 1. 내용물 용량 확인
    file_bytes = await file.read()
    # 2. S3에 저장될 파일명(object key) 생성
    object_key = _build_object_key(file.filename, folder, employee_id)
    # 3. 내용물의 타입
    content_type = file.content_type or "application/octet-stream"
    # 4. S3에 저장
    return await run_in_threadpool(
        _put_object, file_bytes, object_key, content_type
    )


# S3에 실제 저장 함수
async def _put_object(
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
