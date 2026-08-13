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
