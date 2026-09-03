// 화면 여러 곳에서 함께 쓰는 값 표시 형식 헬퍼 모음입니다.

// created_at/updated_at처럼 ISO 날짜 문자열로 오는 값을
// "2026.08.12 13:21" 형태로 보기 좋게 바꿔줍니다.
export function formatDateTime(value: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date
    .toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
    .replace(/\. /g, '.')
    .replace(/\.$/, '')
}
