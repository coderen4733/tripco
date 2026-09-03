// 마스터컬렉션 매핑표({_id: 표시값})에서 _id에 대응하는 표시값을 찾는 공용 헬퍼입니다.
// 아직 배정되지 않아 id가 null이거나, 매핑표에 없는 _id라면(예: 삭제된 항목)
// 대시(-)로 대체합니다.
export function resolveLabel(
  map: Record<string, string>,
  id: string | null,
): string {
  if (!id) return '-'
  return map[id] ?? '-'
}

// resolveLabel의 반대 방향: 표시값(이름)으로 _id를 찾습니다.
// 마스터컬렉션 문서의 _id는 매번 새로 생성되는 값이라 "소속없음"/
// "임시대기"처럼 정해진 기본값의 _id를 코드에 미리 적어둘 수 없어서,
// 이렇게 이름으로 역으로 찾아야 합니다. 없으면 null을 돌려줍니다.
export function findIdByLabel(
  map: Record<string, string>,
  label: string,
): string | null {
  const entry = Object.entries(map).find(([, name]) => name === label)
  return entry ? entry[0] : null
}
