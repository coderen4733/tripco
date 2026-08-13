// 화면 상단 헤더입니다.
// 왼쪽에는 현재 위치(브레드크럼), 오른쪽에는 다크모드 전환/알림/로그인 계정 버튼이 있습니다.
import { Fragment } from 'react'
import { useLocation } from 'react-router-dom'
import { Bell, ChevronsUpDown, LogOut, Moon, Sun, User } from 'lucide-react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from '@/components/theme-provider'
import { findBreadcrumb } from '@/config/nav-menu'

export function AppHeader() {
  const { pathname } = useLocation()
  const crumbs = findBreadcrumb(pathname)

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      {/* 현재 내 위치를 "회사 관리 > 사원 관리" 형태로 보여주는 브레드크럼 */}
      <Breadcrumb>
        <BreadcrumbList className="flex-nowrap">
          {crumbs.length === 0 ? (
            <BreadcrumbItem>
              <BreadcrumbPage>대시보드</BreadcrumbPage>
            </BreadcrumbItem>
          ) : (
            crumbs.map((crumb, index) => {
              const isLast = index === crumbs.length - 1
              return (
                <Fragment key={crumb.title}>
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
                    ) : (
                      <span>{crumb.title}</span>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
                </Fragment>
              )
            })
          )}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-1.5">
        <ThemeToggleButton />
        <NotificationButton />
        <Separator orientation="vertical" className="mx-1 h-4" />
        <AccountMenu />
      </div>
    </header>
  )
}

// 다크모드 / 화이트모드 전환 버튼
function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label="다크모드 전환"
    >
      {theme === 'dark' ? <Sun /> : <Moon />}
    </Button>
  )
}

// 알림 버튼 (읽지 않은 알림 개수는 추후 백엔드 연동 시 실제 값으로 교체)
function NotificationButton() {
  return (
    <Button variant="ghost" size="icon" className="relative" aria-label="알림">
      <Bell />
      <Badge className="absolute top-0.5 right-0.5 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]">
        2
      </Badge>
    </Button>
  )
}

// 로그인된 계정을 보여주고, 프로필/로그아웃으로 이동할 수 있는 드롭다운 메뉴
// TODO: 로그인 기능이 붙으면 하드코딩된 계정 정보를 실제 로그인 정보로 교체해야 합니다.
function AccountMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" className="h-auto gap-2 px-1.5 py-1" />}
      >
        <Avatar size="sm">
          <AvatarFallback>관</AvatarFallback>
        </Avatar>
        <div className="hidden text-left leading-tight sm:block">
          <div className="text-sm font-semibold">관리자</div>
          <div className="text-[11px] text-muted-foreground">
            시스템 관리자
          </div>
        </div>
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {/* Base UI에서는 DropdownMenuLabel이 DropdownMenuGroup 안에 있어야 합니다 */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>내 계정</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <User />
            <span>프로필 설정</span>
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive">
            <LogOut />
            <span>로그아웃</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
