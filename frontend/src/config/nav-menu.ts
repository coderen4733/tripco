// 왼쪽 사이드바에 표시될 메뉴 구조를 정의하는 파일입니다.
// 하위 메뉴(children)가 있는 항목은 클릭 시 펼침/접힘만 되고,
// 하위 메뉴가 없는 항목(leaf)만 실제 페이지로 이동합니다.
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Building2,
  Users,
  Network,
  ShieldCheck,
  TrendingUp,
  Package,
  UserRound,
  Calculator,
  CalendarCheck,
  Receipt,
  Layers,
  Database,
  MapPin,
  UtensilsCrossed,
  BedDouble,
  Contact,
  Settings,
  Server,
  Globe,
} from 'lucide-react'

// 메뉴 한 칸을 나타내는 타입
// - path가 있으면 클릭 시 해당 경로로 이동하는 "실제 페이지" 메뉴
// - children이 있으면 하위 메뉴를 펼쳐 보여주는 "그룹" 메뉴
export interface NavItem {
  title: string
  path?: string
  icon: LucideIcon
  children?: NavItem[]
}

export const navMenu: NavItem[] = [
  {
    title: '대시보드',
    path: '/',
    icon: LayoutDashboard,
  },
  {
    title: '회사 관리',
    icon: Building2,
    children: [
      { title: '사원 관리', path: '/company/employees', icon: Users },
      { title: '조직 관리', path: '/company/organization', icon: Network },
      { title: '권한 관리', path: '/company/permissions', icon: ShieldCheck },
      { title: '실적 관리', path: '/company/performance', icon: TrendingUp },
      { title: '고정자산 관리', path: '/company/assets', icon: Package },
    ],
  },
  {
    title: '고객 관리',
    path: '/customers',
    icon: UserRound,
  },
  {
    title: '견적 관리',
    path: '/quotes',
    icon: Calculator,
  },
  {
    title: '부킹 관리',
    path: '/bookings',
    icon: CalendarCheck,
  },
  {
    title: '정산 관리',
    path: '/settlements',
    icon: Receipt,
  },
  {
    title: '기타 관리',
    path: '/etc',
    icon: Layers,
  },
  {
    title: '데이터 관리',
    icon: Database,
    children: [
      { title: '관광지 정보', path: '/data/destinations', icon: MapPin },
      {
        title: '레스토랑 정보',
        path: '/data/restaurants',
        icon: UtensilsCrossed,
      },
      { title: '호텔 정보', path: '/data/hotels', icon: BedDouble },
      { title: '고객 정보', path: '/data/customers-info', icon: Contact },
    ],
  },
  {
    title: '시스템 관리',
    icon: Settings,
    children: [
      { title: 'ERP 관리', path: '/system/erp', icon: Server },
      { title: '홈페이지 관리', path: '/system/homepage', icon: Globe },
    ],
  },
]

// 현재 URL 경로(pathname)로 사이드바 메뉴를 찾아
// 헤더에 "회사 관리 > 사원 관리" 형태로 표시할 배열을 반환합니다.
// 최상위 메뉴만 일치하면 [최상위], 하위 메뉴까지 일치하면 [최상위, 하위]를 돌려줍니다.
export function findBreadcrumb(pathname: string): NavItem[] {
  for (const item of navMenu) {
    if (item.path === pathname) {
      return [item]
    }
    if (item.children) {
      const child = item.children.find((sub) => sub.path === pathname)
      if (child) {
        return [item, child]
      }
    }
  }
  return []
}

// 모든 leaf 메뉴(path를 가진 항목)를 평탄화하여 라우트 등록에 사용합니다.
export function flattenNavItems(): NavItem[] {
  const result: NavItem[] = []
  for (const item of navMenu) {
    if (item.path) {
      result.push(item)
    }
    if (item.children) {
      result.push(...item.children.filter((sub) => sub.path))
    }
  }
  return result
}
