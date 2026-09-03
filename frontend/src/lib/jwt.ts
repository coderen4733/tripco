// JWT(Json Web Token)의 payload(가운데 부분)만 읽어옵니다.
// 여기서 다루는 토큰은 우리 백엔드가 방금 발급했거나 로컬에 저장해둔 것이므로
// 서명 검증까지는 하지 않고, 그 안에 담긴 값(예: sub=임직원 _id, exp=만료 시각)만
// 꺼내 쓰는 용도로만 사용합니다.
export function decodeJwtPayload<T>(token: string): T | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    // JWT는 base64url이라 표준 base64와 문자가 조금 다릅니다. (- -> +, _ -> /)
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    )
    return JSON.parse(json) as T
  } catch {
    return null
  }
}
