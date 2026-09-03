// 로그인 상태(액세스/리프레시 토큰, 로그인한 임직원 정보)를 앱 전체에서
// 공유하기 위한 React Context입니다. main.tsx에서 AuthProvider로 감싸두면
// 어디서든 useAuth()로 로그인 여부/내 정보를 읽고 signIn/signOut을 호출할 수
// 있습니다. (백엔드: apps/auth/router.py의 sign-in/re-token/sign-out API)
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiFetch } from '@/lib/api'
import { decodeJwtPayload } from '@/lib/jwt'
import { setRequestAccessToken } from '@/lib/auth-token-store'
import type { EmployeeDetail } from '@/types/employee'

// 브라우저를 새로고침해도 로그인 상태가 풀리지 않도록 토큰을 저장해두는 곳
const STORAGE_KEY = 'cosmojin_auth'

interface StoredAuth {
  accessToken: string
  refreshToken: string
}

// access_token/refresh_token 안에 담긴 내용
// (백엔드: apps/auth/service.py에서 발급하는 payload와 대응)
interface JwtPayload {
  sub: string // 임직원 _id
  type: 'access' | 'refresh'
  exp: number // 만료 시각(초 단위 UNIX epoch)
}

interface AuthContextValue {
  // 새로고침 직후 localStorage에서 로그인 상태를 복구하는 동안 true입니다.
  isLoading: boolean
  isAuthenticated: boolean
  // 로그인한 임직원의 _id (액세스 토큰의 sub 값)
  employeeId: string | null
  // 로그인한 임직원의 상세 정보 (이름/권한/프로필 사진 등 헤더 표시용)
  me: EmployeeDetail | null
  signIn: (loginId: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  // 내 정보를 수정하거나 프로필 사진을 바꾼 뒤, 헤더에 보이는 값을
  // 최신 상태로 다시 받아올 때 씁니다.
  refreshMe: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredAuth) : null
  } catch {
    return null
  }
}

function writeStoredAuth(auth: StoredAuth | null) {
  if (auth) localStorage.setItem(STORAGE_KEY, JSON.stringify(auth))
  else localStorage.removeItem(STORAGE_KEY)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)
  const [me, setMe] = useState<EmployeeDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const employeeId =
    (accessToken && decodeJwtPayload<JwtPayload>(accessToken)?.sub) || null

  // apiFetch(lib/api.ts)는 이 값을 읽어 Authorization 헤더를 붙입니다.
  useEffect(() => {
    setRequestAccessToken(accessToken)
  }, [accessToken])

  // 로그인한 임직원의 상세 정보를 (다시) 받아옵니다.
  const loadMe = useCallback(async (id: string) => {
    const detail = await apiFetch<EmployeeDetail>(`/employees/${id}`)
    setMe(detail)
  }, [])

  // 새로고침 시 localStorage에 저장된 토큰으로 로그인 상태를 복구합니다.
  useEffect(() => {
    const stored = readStoredAuth()
    const payload =
      stored && decodeJwtPayload<JwtPayload>(stored.accessToken)
    if (!stored || !payload?.sub) {
      writeStoredAuth(null)
      setIsLoading(false)
      return
    }
    setAccessToken(stored.accessToken)
    setRefreshToken(stored.refreshToken)
    loadMe(payload.sub)
      .catch(() => {
        // 액세스 토큰이 만료되었거나 임직원이 삭제된 경우: 로그인 상태 초기화
        writeStoredAuth(null)
        setAccessToken(null)
        setRefreshToken(null)
        setMe(null)
      })
      .finally(() => setIsLoading(false))
    // 앱이 처음 켜질 때 딱 한 번만 복구하면 되는 로직입니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 리프레시 토큰으로 새 액세스 토큰을 재발급받습니다.
  const doRefresh = useCallback(async () => {
    if (!refreshToken) return
    try {
      const result = await apiFetch<{
        access_token: string
        token_type: string
      }>('/auth/re-token', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
      writeStoredAuth({ accessToken: result.access_token, refreshToken })
      setAccessToken(result.access_token)
    } catch {
      // 리프레시 토큰까지 만료/무효한 경우 로그아웃 상태로 되돌립니다.
      writeStoredAuth(null)
      setAccessToken(null)
      setRefreshToken(null)
      setMe(null)
    }
  }, [refreshToken])

  // 액세스 토큰 만료 1분 전에 미리 재발급받도록 예약해둡니다.
  // (기본 만료 시간이 30분이라, 로그인 상태로 오래 머물러도 자연스럽게 유지됩니다)
  useEffect(() => {
    if (!accessToken || !refreshToken) return
    const payload = decodeJwtPayload<JwtPayload>(accessToken)
    if (!payload?.exp) return
    const delayMs = Math.max(payload.exp * 1000 - Date.now() - 60_000, 0)
    const timer = window.setTimeout(() => {
      void doRefresh()
    }, delayMs)
    return () => window.clearTimeout(timer)
  }, [accessToken, refreshToken, doRefresh])

  const signIn = useCallback(
    async (loginId: string, password: string) => {
      const result = await apiFetch<{
        access_token: string
        refresh_token: string
        token_type: string
        admin_role: string
      }>('/auth/sign-in', {
        method: 'POST',
        body: JSON.stringify({ login_id: loginId, password }),
      })
      writeStoredAuth({
        accessToken: result.access_token,
        refreshToken: result.refresh_token,
      })
      setAccessToken(result.access_token)
      setRefreshToken(result.refresh_token)
      const payload = decodeJwtPayload<JwtPayload>(result.access_token)
      if (payload?.sub) await loadMe(payload.sub)
    },
    [loadMe],
  )

  const signOut = useCallback(async () => {
    // 서버 쪽 refresh_token도 정리하되, 이미 만료/무효한 토큰이더라도
    // 프론트 로그아웃 자체는 그대로 진행합니다.
    if (refreshToken) {
      try {
        await apiFetch('/auth/sign-out', {
          method: 'POST',
          body: JSON.stringify({ refresh_token: refreshToken }),
        })
      } catch {
        // 무시하고 로컬 상태만 정리합니다.
      }
    }
    writeStoredAuth(null)
    setAccessToken(null)
    setRefreshToken(null)
    setMe(null)
  }, [refreshToken])

  const refreshMe = useCallback(async () => {
    if (employeeId) await loadMe(employeeId)
  }, [employeeId, loadMe])

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      isAuthenticated: me !== null,
      employeeId,
      me,
      signIn,
      signOut,
      refreshMe,
    }),
    [isLoading, me, employeeId, signIn, signOut, refreshMe],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth는 AuthProvider 내부에서만 사용할 수 있습니다.')
  }
  return ctx
}
