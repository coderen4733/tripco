// api.ts의 apiFetch/apiUpload는 React 바깥의 평범한 함수라서 useAuth() 훅을
// 직접 쓸 수 없습니다. 그래서 AuthProvider가 accessToken이 바뀔 때마다 이
// 모듈에도 최신 값을 복사해두고, apiFetch는 매 요청마다 여기서 토큰을 읽어
// Authorization 헤더에 실어 보냅니다.
let currentAccessToken: string | null = null

export function setRequestAccessToken(token: string | null) {
  currentAccessToken = token
}

export function getRequestAccessToken(): string | null {
  return currentAccessToken
}
