// 화면 상단 헤더입니다.
// 왼쪽에는 현재 위치(브레드크럼), 오른쪽에는 다크모드 전환/알림/로그인 계정 버튼이 있습니다.
import { Fragment, useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  Check,
  ChevronsUpDown,
  LogOut,
  Moon,
  Pencil,
  Sun,
  User,
  X,
} from 'lucide-react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import { useAuth } from '@/contexts/auth-context'
import { useMasterMaps } from '@/contexts/master-maps-context'
import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api'
import { resolveLabel } from '@/lib/master-maps'
import { uploadEmployeeProfileImage } from '@/lib/employee-profile-image'
import { fetchAlarms, markAlarmAsRead, deleteAlarm } from '@/lib/alarms'
import { onRegistrationDecided } from '@/lib/registration-events'
import { LoginDialog } from '@/components/auth/login-dialog'
import { ProfilePhotoDialog } from '@/components/auth/profile-photo-dialog'
import { EmployeeDetailDialog } from '@/components/employee/employee-detail-dialog'
import { RegistrationDetailDialog } from '@/components/employee/registration-detail-dialog'
import type { AlarmItem } from '@/types/alarm'

// 알람 목록을 이 주기(ms)로 다시 받아와서, 드롭다운을 열지 않아도
// 새 알람이 생기면 종 옆 배지 숫자가 자연스럽게 갱신되도록 합니다.
const ALARM_POLL_INTERVAL_MS = 30_000

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

// 로그인 여부에 따라 알림 벨을 보여줄지 결정합니다.
// (로그인하지 않은 사용자에게는 받을 알람이 없으므로 그냥 빈 종 모양만 둡니다)
function NotificationButton() {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return (
      <Button variant="ghost" size="icon" aria-label="알림">
        <Bell />
      </Button>
    )
  }

  return <AlarmMenu />
}

// 알림 벨을 누르면 뜨는 알람 목록 드롭다운입니다.
// (백엔드: apps/alarm/router.py, prefix "/alarms")
function AlarmMenu() {
  const navigate = useNavigate()
  const { masterMaps } = useMasterMaps()
  const [alarms, setAlarms] = useState<AlarmItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  // 알람 행을 클릭해서 연 신청자 상세 정보의 registration _id
  const [selectedRegistrationId, setSelectedRegistrationId] = useState<
    string | null
  >(null)

  const loadAlarms = useCallback(() => {
    fetchAlarms()
      .then(setAlarms)
      .catch(() => {
        // 알람 조회 실패는 조용히 무시합니다. (벨 배지가 잠깐 안 맞을 뿐,
        // 화면의 다른 기능에는 영향이 없어야 하므로)
      })
  }, [])

  // 처음 마운트될 때 한 번, 그리고 일정 주기로 새 알람이 있는지 다시 받아옵니다.
  useEffect(() => {
    loadAlarms()
    const timer = window.setInterval(loadAlarms, ALARM_POLL_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [loadAlarms])

  // 드롭다운을 열 때도 최신 상태로 한 번 더 새로고침합니다.
  useEffect(() => {
    if (isOpen) loadAlarms()
  }, [isOpen, loadAlarms])

  // 사원 관리 페이지의 신청자 목록에서 승인/반려가 일어났을 때도
  // 알림 벨이 최신 상태로 갱신되도록 전역 이벤트를 구독합니다.
  useEffect(() => onRegistrationDecided(loadAlarms), [loadAlarms])

  const unreadCount = alarms.filter((alarm) => !alarm.is_read).length

  // 체크 버튼: 화면에는 먼저 반영(낙관적 업데이트)하고, 실패하면 되돌립니다.
  const handleMarkRead = (id: string) => {
    setAlarms((prev) =>
      prev.map((alarm) =>
        alarm._id === id ? { ...alarm, is_read: true } : alarm,
      ),
    )
    markAlarmAsRead(id).catch(() => loadAlarms())
  }

  // 휴지통 버튼
  const handleDelete = (id: string) => {
    setAlarms((prev) => prev.filter((alarm) => alarm._id !== id))
    deleteAlarm(id).catch(() => loadAlarms())
  }

  // 알람 행(체크/삭제 버튼이 아닌 부분) 클릭: 신청자 상세 정보를 열고,
  // 그 순간 체크(읽음 처리)를 누른 것과 동일하게 취급합니다. 이미 읽은
  // 알람이라도 언제든 다시 눌러서 상세 정보를 볼 수 있습니다.
  const handleAlarmRowClick = (alarm: AlarmItem) => {
    if (!alarm.is_read) handleMarkRead(alarm._id)
    if (alarm.type === 'employee_registration' && alarm.related_id) {
      setSelectedRegistrationId(alarm.related_id)
      setIsOpen(false)
    }
  }

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              aria-label="알림"
            />
          }
        >
          <Bell />
          {unreadCount > 0 && (
            <Badge className="absolute top-0.5 right-0.5 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]">
              {unreadCount}
            </Badge>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuGroup>
            {/* 왼쪽엔 종 아이콘 + "알림" 라벨, 오른쪽엔 알림 관리 페이지로
                이동하는 버튼. 좌우 여백(px-2)을 아래 알림 행과 맞춰서
                "알림" 글자와 메시지 글자가 같은 선에서 시작하게 했습니다. */}
            <div className="flex items-center justify-between gap-2 px-2 py-1">
              <DropdownMenuLabel className="flex items-center gap-1.5 p-0 text-base font-semibold text-foreground">
                <Bell className="h-4 w-4" />
                알림
              </DropdownMenuLabel>
              {/* 사원 관리 목록의 "팀장" 뱃지와 같은 노란색(amber) 톤 */}
              <Badge
                variant="outline"
                className="cursor-pointer border-transparent bg-amber-100 text-amber-600 hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:hover:bg-amber-500/25"
                render={
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false)
                      navigate('/etc/alarms')
                    }}
                  />
                }
              >
                알림 목록 보기
              </Badge>
            </div>
            <DropdownMenuSeparator />
            {alarms.length === 0 ? (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                받은 알림이 없습니다.
              </p>
            ) : (
              <div className="flex max-h-80 flex-col gap-0.5 overflow-y-auto">
                {alarms.map((alarm) => (
                  <div
                    key={alarm._id}
                    onClick={() => handleAlarmRowClick(alarm)}
                    className={cn(
                      'flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent',
                      // 체크로 확인한 알람은 색을 옅게(회색으로) 만들어서
                      // 이미 확인했다는 걸 한눈에 구분할 수 있게 합니다.
                      alarm.is_read
                        ? 'text-muted-foreground'
                        : 'text-foreground',
                    )}
                  >
                    <span className="flex-1 leading-snug">
                      {alarm.message}
                    </span>
                    <div className="flex shrink-0 items-center gap-0.5">
                      {!alarm.is_read && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMarkRead(alarm._id)
                          }}
                          aria-label="확인"
                        >
                          <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-500" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(alarm._id)
                        }}
                        aria-label="삭제"
                      >
                        <X className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <RegistrationDetailDialog
        registrationId={selectedRegistrationId}
        masterMaps={masterMaps}
        onClose={() => setSelectedRegistrationId(null)}
        onDecided={loadAlarms}
      />
    </>
  )
}

// 로그인 여부에 따라 "로그인" 버튼 또는 계정 드롭다운 메뉴를 보여줍니다.
function AccountMenu() {
  const { isLoading, isAuthenticated } = useAuth()

  // 새로고침 직후 localStorage에서 로그인 상태를 복구하는 잠깐 동안
  // "로그인" 버튼이 번쩍 보였다 사라지는 걸 막기 위한 스켈레톤입니다.
  if (isLoading) {
    return <Skeleton className="h-8 w-24 rounded-full" />
  }

  if (!isAuthenticated) {
    return <LoginDialog />
  }

  return <SignedInAccountMenu />
}

// 로그인된 계정을 보여주고, 내 정보/프로필 사진 설정/로그아웃으로 이어지는 드롭다운 메뉴
function SignedInAccountMenu() {
  const { me, employeeId, signOut, refreshMe } = useAuth()
  // "내 정보"(임직원 상세 정보 폼)는 부서/팀/직급 등을 이름으로 보여줘야 하므로
  // 마스터컬렉션 매핑표가 필요합니다. (앱 전체에서 한 번만 받아온 값을 재사용)
  const { masterMaps } = useMasterMaps()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMyInfoOpen, setIsMyInfoOpen] = useState(false)
  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)

  const handlePhotoCropped = (blob: Blob) => {
    if (!employeeId) return
    setIsUploadingPhoto(true)
    setPhotoError(null)
    uploadEmployeeProfileImage(employeeId, blob)
      .then(() => refreshMe())
      .catch((err) => {
        setPhotoError(
          err instanceof ApiError
            ? err.message
            : '프로필 사진 업로드 중 알 수 없는 오류가 발생했습니다.',
        )
      })
      .finally(() => setIsUploadingPhoto(false))
  }

  if (!me) return null

  const initial = me.name_kor.trim().charAt(0) || '?'
  const avatarUrl = me.profile_image_url
    ? `${me.profile_image_url}?v=${encodeURIComponent(me.updated_at)}`
    : null
  // 이름 아래 두 번째 줄: 권한(admin_role)이 "일반"인 경우에는 권한 등급
  // 대신 직무(duty)를 보여줍니다. ("일반"만으로는 어떤 업무를 담당하는지
  // 알 수 없어서, 실제 직무가 더 유용한 정보이기 때문입니다)
  const subtitle =
    me.admin_role === '일반'
      ? resolveLabel(masterMaps?.duties ?? {}, me.duty_id)
      : me.admin_role

  return (
    <div className="relative">
      <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" className="h-auto gap-2 px-1.5 py-1" />
          }
        >
          <Avatar size="sm">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={me.name_kor} />}
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
          {/* 이름이 4~5글자거나 직무명이 긴 경우도 있어 min-w로 여유 공간을 둡니다 */}
          <div className="hidden min-w-[4.5rem] text-left leading-tight text-nowrap sm:block">
            <div className="text-sm font-semibold">{me.name_kor}</div>
            <div className="text-[11px] text-muted-foreground">
              {subtitle}
            </div>
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {/* Base UI에서는 DropdownMenuLabel이 DropdownMenuGroup 안에 있어야 합니다 */}
          <DropdownMenuGroup>
            <DropdownMenuLabel>내 계정</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* 원형 프로필 사진. 지름은 아래 "내 정보" 메뉴의 글자 시작
                위치에 맞춘 크기(w-32)로, 가운데 정렬했을 때 좌우 여백이
                메뉴 항목의 아이콘+여백 너비와 비슷해지도록 맞췄습니다.
                우측 하단 연필 버튼이 예전 "프로필 사진 설정" 메뉴의
                역할을 대신합니다. */}
            <div className="flex justify-center py-2">
              <div className="relative h-32 w-32">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={me.name_kor}
                    className="h-32 w-32 rounded-full object-cover ring-1 ring-border"
                  />
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-full bg-primary/15 text-3xl font-semibold text-primary ring-1 ring-border">
                    {initial}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false)
                    setIsPhotoDialogOpen(true)
                  }}
                  className="absolute right-1 bottom-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                  aria-label="프로필 사진 변경"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => setIsMyInfoOpen(true)}>
              <User />
              <span>내 정보</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                void signOut()
              }}
            >
              <LogOut />
              <span>로그아웃</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {photoError && (
        <p className="absolute top-full right-0 z-50 mt-2 w-56 rounded-md border border-destructive/30 bg-background px-3 py-1.5 text-xs text-destructive shadow-sm">
          {photoError}
        </p>
      )}

      {/* 드롭다운의 "내 정보"는 사원 관리 목록에서 쓰는 상세 정보 다이얼로그를
          그대로 재사용합니다. (같은 폼으로 조회/수정) */}
      <EmployeeDetailDialog
        employeeId={isMyInfoOpen ? employeeId : null}
        masterMaps={masterMaps}
        onClose={() => setIsMyInfoOpen(false)}
        onUpdated={refreshMe}
      />

      <ProfilePhotoDialog
        open={isPhotoDialogOpen}
        onOpenChange={setIsPhotoDialogOpen}
        onCropped={handlePhotoCropped}
      />
      {isUploadingPhoto && (
        <span className="sr-only">프로필 사진 업로드 중입니다.</span>
      )}
    </div>
  )
}
