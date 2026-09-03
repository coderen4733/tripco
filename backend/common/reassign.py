from motor.motor_asyncio import AsyncIOMotorDatabase

# 조직 마스터컬렉션(부서/팀/직위/직책/직무/고용형태) 항목을 삭제할 때,
# 그 항목을 참조하고 있는 다른 컬렉션의 문서를 세거나(count_references),
# 다른 항목으로 한꺼번에 옮기는(reassign_references) 공통 함수입니다.
#
# refs: [(참조하는 컬렉션명, 그 안의 필드명), ...] 형태의 목록.
# 예) 부서를 지울 때는 [("mst_teams", "dept_id"), ("employees", "dept_id")]
#     처럼, "부서 하나를 상위로 두고 있는 컬렉션/필드" 쌍을 전부 넘긴다.


# 삭제하려는 항목(target_id)을 참조하고 있는 문서가 총 몇 건인지 센다.
async def count_references(
    db: AsyncIOMotorDatabase,
    refs: list[tuple[str, str]],
    target_id: str,
) -> int:
    total = 0
    for collection_name, field_name in refs:
        total += await db[collection_name].count_documents(
            {field_name: target_id}
        )
    return total


# 삭제하려는 항목(from_id)을 참조하던 문서들을 전부 다른 항목(to_id)을
# 참조하도록 일괄 변경한다. (삭제 직전에 호출해서, 참조가 끊기지 않게 함)
async def reassign_references(
    db: AsyncIOMotorDatabase,
    refs: list[tuple[str, str]],
    from_id: str,
    to_id: str,
) -> None:
    for collection_name, field_name in refs:
        await db[collection_name].update_many(
            {field_name: from_id},
            {"$set": {field_name: to_id}},
        )
