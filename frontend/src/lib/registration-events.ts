// 신청자 승인/반려는 화면 두 군데(헤더 알림 벨의 드롭다운, 사원 관리 페이지의
// 신청자 목록)에서 서로 다른 RegistrationDetailDialog 인스턴스로 일어날 수
// 있습니다. 한쪽에서 처리한 결과를 다른 쪽도 곧바로 알 수 있도록, 아주 작은
// 전역 이벤트 버스를 둡니다. (별도 Context를 새로 만들 만큼 크지 않은
// 기능이라 window CustomEvent로 가볍게 처리합니다)
const EVENT_NAME = 'employee-registration-decided'

export function emitRegistrationDecided() {
  window.dispatchEvent(new Event(EVENT_NAME))
}

// 반환값(구독 해제 함수)을 useEffect의 cleanup으로 그대로 씁니다.
export function onRegistrationDecided(handler: () => void): () => void {
  window.addEventListener(EVENT_NAME, handler)
  return () => window.removeEventListener(EVENT_NAME, handler)
}
