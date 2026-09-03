// 기타 관리 > 알림 관리 페이지입니다.
// '사원 관리' 페이지와 같은 구성으로, 상단에는 알림 종류별 통계
// 대시보드(8칸), 하단에는 내가 받은 전체 알림 목록이 있습니다.
//
// 알림은 백엔드 GET /alarms/ 에서 로그인한 임직원 앞으로 온 것만 내려옵니다.
// 대시보드 8칸의 숫자는 그 목록을 category별로 세어서 화면에서 계산합니다.
import { useCallback, useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  AlarmClock,
  AlertCircle,
  Calculator,
  CalendarCheck,
  Megaphone,
  MessageSquare,
  Receipt,
  Settings,
  Stamp,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { deleteAlarm, fetchAlarms, setAlarmReadStatus } from '@/lib/alarms'
import { useAuth } from '@/contexts/auth-context'
import type { AlarmItem } from '@/types/alarm'

export function AlarmManagementPage() {
  // 새로고침 직후에는 AuthProvider가 localStorage에서 로그인 상태를 복구하는
  // 동안(isAuthLoading) 잠깐 토큰이 준비되지 않은 채로 화면이 뜬다. 이때
  // 곧바로 알림을 요청하면 401이 나므로, 인증 확인이 끝날 때까지 기다린다.
  const { isLoading: isAuthLoading, isAuthenticated } = useAuth()
  const [alarms, setAlarms] = useState<AlarmItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchAlarms()
      setAlarms(data)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : '알림 목록을 불러오는 중 알 수 없는 오류가 발생했습니다.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthLoading) return
    if (!isAuthenticated) {
      setIsLoading(false)
      setError('로그인이 필요합니다.')
      return
    }
    loadData()
  }, [isAuthLoading, isAuthenticated, loadData])

  const rows = alarms ?? []
  const total = rows.length
  const countByCategory = (label: string) =>
    rows.filter((alarm) => alarm.category === label).length

  // 토글 스위치: 화면에는 먼저 반영(낙관적 업데이트)하고, 실패하면 되돌립니다.
  const handleToggleRead = (alarm: AlarmItem, nextIsRead: boolean) => {
    setAlarms((prev) =>
      prev
        ? prev.map((a) =>
            a._id === alarm._id ? { ...a, is_read: nextIsRead } : a,
          )
        : prev,
    )
    setAlarmReadStatus(alarm._id, nextIsRead).catch(() => loadData())
  }

  // 휴지통 버튼: 화면에는 먼저 반영(낙관적 업데이트)하고, 실패하면 되돌립니다.
  const handleDelete = (alarm: AlarmItem) => {
    setAlarms((prev) => (prev ? prev.filter((a) => a._id !== alarm._id) : prev))
    deleteAlarm(alarm._id).catch(() => loadData())
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">알림 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          결재·견적·부킹·정산 등 업무 알림과 사내 소식을 한 곳에서 확인합니다.
        </p>
      </div>

      {error && <ErrorNotice message={error} onRetry={loadData} />}

      {isLoading ? (
        <AlarmListSkeleton />
      ) : (
        !error && (
          <>
            {/* 업무 알림 4종 */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatTile
                icon={Stamp}
                label="결재"
                value={countByCategory('결재')}
                tone="orange"
              />
              <StatTile
                icon={Calculator}
                label="견적"
                value={countByCategory('견적')}
                tone="emerald"
              />
              <StatTile
                icon={CalendarCheck}
                label="부킹"
                value={countByCategory('부킹')}
                tone="cyan"
              />
              <StatTile
                icon={Receipt}
                label="정산"
                value={countByCategory('정산')}
                tone="blue"
              />
            </div>

            {/* 소식/업무 리마인드/소통/시스템 4종 */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatTile
                icon={Megaphone}
                label="사내 소식"
                value={countByCategory('사내 소식')}
                tone="slate"
              />
              <StatTile
                icon={AlarmClock}
                label="나의 비서"
                value={countByCategory('나의 비서')}
                tone="rose"
              />
              <StatTile
                icon={MessageSquare}
                label="나의 활동"
                value={countByCategory('나의 활동')}
                tone="amber"
              />
              <StatTile
                icon={Settings}
                label="시스템"
                value={countByCategory('시스템')}
                tone="violet"
              />
            </div>

            {/* 알림 목록 */}
            <Card className="gap-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  알림 목록
                  <Badge variant="secondary">{total}</Badge>
                </CardTitle>
              </CardHeader>
              <div className="px-4 pb-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">날짜</TableHead>
                      <TableHead className="text-center">구분</TableHead>
                      <TableHead>메시지</TableHead>
                      <TableHead className="text-center">읽음 여부</TableHead>
                      <TableHead className="text-center">삭제</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="h-24 text-center text-muted-foreground"
                        >
                          받은 알림이 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((alarm) => (
                        <TableRow key={alarm._id}>
                          <TableCell className="text-center whitespace-nowrap text-muted-foreground">
                            {formatDateTime(alarm.created_at)}
                          </TableCell>
                          <TableCell className="text-center">
                            <ToneBadge label={alarm.category} />
                          </TableCell>
                          <TableCell
                            className={cn(
                              alarm.is_read
                                ? 'text-muted-foreground'
                                : 'text-foreground',
                            )}
                          >
                            {alarm.message}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Switch
                                checked={alarm.is_read}
                                onCheckedChange={(checked) =>
                                  handleToggleRead(alarm, checked)
                                }
                                aria-label="읽음 여부"
                              />
                              {/* 토글만으로는 눈에 잘 안 띄어서, 옆에 Y(읽음)/
                                  N(안읽음) 글자를 색으로 구분해 함께 보여줍니다 */}
                              <span
                                className={cn(
                                  'w-3 text-sm font-semibold',
                                  alarm.is_read
                                    ? 'text-green-600 dark:text-green-500'
                                    : 'text-destructive',
                                )}
                              >
                                {alarm.is_read ? 'Y' : 'N'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDelete(alarm)}
                              aria-label="알림 삭제"
                            >
                              <X className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </>
        )
      )}
    </div>
  )
}

// 데이터를 불러오지 못했을 때 보여주는 안내 + 다시 시도 버튼
function ErrorNotice({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {message}
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        다시 시도
      </Button>
    </div>
  )
}

// 통계 카드 + 목록 표가 자리잡을 영역의 로딩 스켈레톤
function AlarmListSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatTileSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatTileSkeleton key={i} />
        ))}
      </div>
      <Card>
        <div className="flex flex-col gap-3 px-4 py-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </Card>
    </div>
  )
}

function StatTileSkeleton() {
  return (
    <Card>
      <div className="flex items-center gap-3 px-4">
        <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-6 w-10" />
          <Skeleton className="h-3 w-14" />
        </div>
      </div>
    </Card>
  )
}

// 상단의 숫자 통계 한 칸(아이콘 + 값 + 라벨)을 그리는 컴포넌트
// (색상은 사원 관리 페이지의 대시보드 톤을 그대로 가져다 씁니다:
//  결재=가이드색, 견적=매니저색, 부킹=코디네이터색, 정산=정규직색,
//  사내 소식=전체임직원색, 나의 비서=기사색, 나의 활동=인턴색, 시스템=계약직색)
const tileToneMap = {
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400',
  blue: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
  violet:
    'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400',
  emerald:
    'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
  cyan: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400',
  orange:
    'bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400',
  rose: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400',
} as const

type Tone = keyof typeof tileToneMap

// 알림 목록의 "구분" 배지 색상 - 위 통계 카드와 1:1로 맞춥니다.
const CATEGORY_TONES: Record<string, Tone> = {
  결재: 'orange',
  견적: 'emerald',
  부킹: 'cyan',
  정산: 'blue',
  '사내 소식': 'slate',
  '나의 비서': 'rose',
  '나의 활동': 'amber',
  시스템: 'violet',
}

function ToneBadge({ label }: { label: string }) {
  const tone = CATEGORY_TONES[label] ?? 'slate'
  return (
    <Badge
      variant="outline"
      className={cn('border-transparent', tileToneMap[tone])}
    >
      {label}
    </Badge>
  )
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: number
  tone: Tone
}) {
  return (
    <Card>
      <div className="flex items-center gap-3 px-4">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            tileToneMap[tone],
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl leading-tight font-semibold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </div>
    </Card>
  )
}
