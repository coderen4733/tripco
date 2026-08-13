// 백엔드(FastAPI) 서버와 통신하기 위한 아주 얇은 공용 fetch 래퍼입니다.
// 백엔드는 보통 { message: string, data: T } 형태로 응답을 감싸서 내려주므로,
// 이 파일에서 그 껍데기를 벗기고 실제 데이터(T)만 돌려줍니다.

// 백엔드 서버 주소. .env에 VITE_API_BASE_URL을 지정하면 그 값을 쓰고,
// 없으면 로컬 개발 기본값(uvicorn 기본 포트)을 사용합니다.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

// 백엔드 공통 응답 형태: common/response.py의 ResponseSchema와 대응됩니다.
interface ApiResponse<T> {
  message: string
  data: T
}

// FastAPI가 자체적으로 만들어내는 에러 응답 형태 (HTTPException, Pydantic 검증 실패 등)
// 이 경우엔 message가 아니라 detail 필드에 에러 내용이 담겨서 온다.
interface FastApiErrorBody {
  detail?: string | { msg: string }[]
}

// API 요청이 실패했을 때 던지는 에러
// 화면에서 error.message를 그대로 보여줄 수 있도록 백엔드 메시지를 담습니다.
export class ApiError extends Error {}

// 실패 응답 본문에서 사람이 읽을 수 있는 에러 메시지를 뽑아냅니다.
// 1) 우리 쪽 ResponseSchema의 message
// 2) FastAPI HTTPException의 detail(문자열)
// 3) Pydantic 검증 실패의 detail(배열) -> 메시지들을 이어붙임
function extractErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const asResponse = body as Partial<ApiResponse<unknown>>
    if (typeof asResponse.message === 'string') {
      return asResponse.message
    }
    const asFastApiError = body as FastApiErrorBody
    if (typeof asFastApiError.detail === 'string') {
      return asFastApiError.detail
    }
    if (Array.isArray(asFastApiError.detail)) {
      return asFastApiError.detail.map((err) => err.msg).join(', ')
    }
  }
  return `요청에 실패했습니다. (${status})`
}

// fetch 응답을 공통으로 해석합니다. (JSON 파싱 + 성공/실패 처리)
// apiFetch와 apiUpload가 이 로직을 함께 씁니다.
async function parseResponse<T>(response: Response): Promise<T> {
  // 응답 본문은 성공/실패 모두 JSON이므로 항상 파싱을 시도합니다.
  const body: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(extractErrorMessage(body, response.status))
  }
  if (body === null) {
    throw new ApiError('서버 응답을 해석할 수 없습니다.')
  }
  return (body as ApiResponse<T>).data
}

// path: "/employees/" 처럼 API_BASE_URL 뒤에 붙일 경로
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })
  } catch {
    // 서버가 꺼져있거나 네트워크 자체가 안 되는 경우
    throw new ApiError(
      '서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해 주세요.',
    )
  }
  return parseResponse<T>(response)
}

// 파일 업로드 전용 함수입니다. (예: 프로필 사진, 추후 입사문서/결재 파일 등)
// FormData를 보낼 때는 Content-Type을 직접 지정하면 안 됩니다 - 브라우저가
// 파일 경계값(boundary)까지 포함해서 알아서 multipart/form-data 헤더를 붙여줍니다.
export async function apiUpload<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      body: formData,
    })
  } catch {
    throw new ApiError(
      '서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해 주세요.',
    )
  }
  return parseResponse<T>(response)
}
