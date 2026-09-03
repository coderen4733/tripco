from bson import ObjectId  # MongoDB 문서 id(_id) 타입을 다루는 라이브러리
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from common.lexorank import LexoRank


# 드래그 앤 드롭으로 옮겨진 위치의 앞/뒤 문서를 기준으로 새 order 값을
# 계산하는 공통 함수입니다. 마스터컬렉션 6종(부서/팀/직급/직책/직무/
# 고용형태)이 전부 똑같은 규칙(order: str, LexoRank)을 쓰기 때문에
# 여기 하나로 모아두고 각 모듈의 service.py에서 가져다 씁니다.
async def compute_reordered_value(
    db: AsyncIOMotorDatabase,
    collection_name: str,
    prev_id: str | None,
    next_id: str | None,
) -> str:
    prev_order: str | None = None
    next_order: str | None = None

    # 1. 앞쪽(위쪽)에 놓일 기준 문서의 order 조회
    if prev_id:
        prev_doc = await db[collection_name].find_one(
            {"_id": ObjectId(prev_id)},
            {"order": 1},
        )
        if not prev_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="기준이 되는 이전 항목을 찾을 수 없습니다.",
            )
        prev_order = prev_doc["order"]

    # 2. 뒤쪽(아래쪽)에 놓일 기준 문서의 order 조회
    if next_id:
        next_doc = await db[collection_name].find_one(
            {"_id": ObjectId(next_id)},
            {"order": 1},
        )
        if not next_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="기준이 되는 다음 항목을 찾을 수 없습니다.",
            )
        next_order = next_doc["order"]

    # 3. 앞/뒤 order 값에 따라 LexoRank로 새 order 계산
    if prev_order and next_order:
        # 3-1. 두 항목 사이로 이동
        return LexoRank.get_between(prev_order, next_order)
    if prev_order and not next_order:
        # 3-2. 맨 뒤로 이동
        return LexoRank.get_next(prev_order)
    if next_order and not prev_order:
        # 3-3. 맨 앞으로 이동
        return LexoRank.get_before(next_order)
    # 3-4. 앞/뒤 기준이 모두 없음 (목록에 이 항목 하나만 남는 경우)
    return LexoRank.get_middle()
