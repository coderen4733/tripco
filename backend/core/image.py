from io import BytesIO

from PIL import Image, ImageOps

# 국내 증명사진 표준 규격: 3.5cm x 4.5cm (권장 픽셀 413 x 531)
PROFILE_IMAGE_SIZE = (413, 531)


# 업로드된 원본 이미지를 프로필 사진 표준 규격(413x531)의 JPEG로 변환합니다.
# 프론트엔드에서 이미 3.5:4.5 비율로 잘라서 보내주므로 비율은 그대로 두고,
# 픽셀 크기만 표준 규격에 맞춥니다(원본이 더 크면 축소, 더 작으면 그대로 확대).
# 형식도 JPEG로 통일하고 압축(quality)까지 적용해서 파일 용량을 함께 줄입니다.
def process_profile_image(raw_bytes: bytes) -> bytes:
    # 1. 이미지 열기
    image = Image.open(BytesIO(raw_bytes))
    # 2. 휴대폰 사진의 EXIF 회전 정보를 실제 픽셀에 반영
    # (사진이 옆으로 눕는 문제 방지)
    image = ImageOps.exif_transpose(image)
    # 3. PNG 등의 투명 배경을 흰 배경으로 채워서
    # JPEG로 저장 가능하게 변환
    if image.mode != "RGB":
        image = image.convert("RGB")
    # 4. 표준 규격(413x531)으로 리사이즈
    image = image.resize(PROFILE_IMAGE_SIZE, Image.LANCZOS)
    # 5. JPEG로 압축해서 저장
    # (quality가 낮을수록 용량은 작아지고 화질은 낮아짐)
    buffer = BytesIO()
    image.save(buffer, format="JPEG", quality=85, optimize=True)
    return buffer.getvalue()
