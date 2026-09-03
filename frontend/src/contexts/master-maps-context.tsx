// 부서/팀/직급/직책/직무/고용형태 마스터컬렉션 매핑표를 앱 전체에서 딱
// 한 번만 받아와 공유하기 위한 Context입니다. main.tsx에서
// MasterMapsProvider로 감싸두면 어디서든 useMasterMaps()로 값을 읽을 수
// 있습니다. (백엔드: GET /organizations/master-maps/, 로그인 여부와
// 상관없이 누구나 조회할 수 있는 공개 API입니다)
//
// 예전에는 사원 관리 페이지, 헤더의 계정/알림 메뉴, 신규 계정 신청 폼이
// 각자 따로 이 API를 불러왔습니다. 헤더는 페이지가 바뀌어도 다시 마운트되지
// 않아 괜찮았지만, 페이지 쪽은 그 페이지에 들어올 때마다(다른 페이지에서
// 넘어올 때마다) 매번 다시 불러오는 낭비가 있었습니다. 이제는 앱이 켜지는
// 시점에 딱 한 번 받아와 여기 두고, 나머지는 전부 이 값을 그대로 재사용합니다.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { apiFetch } from '@/lib/api'
import type { MasterMaps } from '@/types/employee'

interface MasterMapsContextValue {
  // 아직 한 번도 못 받아왔으면 null입니다. (로딩 중이거나 요청이 실패한 경우)
  masterMaps: MasterMaps | null
  isLoading: boolean
  // 조직 관리에서 부서/팀 등을 새로 추가한 직후처럼, 최신 값으로 다시
  // 받아오고 싶을 때 호출합니다.
  refreshMasterMaps: () => Promise<void>
}

const MasterMapsContext = createContext<MasterMapsContextValue | null>(null)

export function MasterMapsProvider({ children }: { children: ReactNode }) {
  const [masterMaps, setMasterMaps] = useState<MasterMaps | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshMasterMaps = useCallback(async () => {
    const data = await apiFetch<MasterMaps>('/organizations/master-maps/')
    setMasterMaps(data)
  }, [])

  // 앱이 처음 켜질 때 한 번만 받아옵니다.
  useEffect(() => {
    setIsLoading(true)
    refreshMasterMaps()
      .catch(() => {
        // 실패해도 여기서 따로 안내하지 않습니다. masterMaps가 계속
        // null이면, 이 값을 쓰는 각 화면이 자기 사정에 맞게(스켈레톤,
        // "-" 표시 등) 알아서 처리합니다.
      })
      .finally(() => setIsLoading(false))
  }, [refreshMasterMaps])

  return (
    <MasterMapsContext.Provider
      value={{ masterMaps, isLoading, refreshMasterMaps }}
    >
      {children}
    </MasterMapsContext.Provider>
  )
}

export function useMasterMaps(): MasterMapsContextValue {
  const ctx = useContext(MasterMapsContext)
  if (!ctx) {
    throw new Error(
      'useMasterMaps는 MasterMapsProvider 내부에서만 사용할 수 있습니다.',
    )
  }
  return ctx
}
