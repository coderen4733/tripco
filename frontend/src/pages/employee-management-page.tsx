// 회사 관리 > 사원 관리 페이지입니다.
// 코스모진 여행사 임직원들의 정보를 목록으로 보여줍니다.
//
// 임직원 목록은 백엔드 GET /employees/ 에서 받아오는데, 부서/팀/직급/직책/직무/
// 고용형태는 전부 마스터컬렉션 문서의 _id 값으로 내려옵니다. 화면에는 그 _id에
// 대응하는 실제 이름(예: "경영지원부")을 보여줘야 하므로, 페이지에 들어오는
// 시점에 GET /organizations/master-maps/ 로 {_id: 표시값} 매핑표 6종을
// 한 번에 받아와 두고, 목록을 그릴 때 그 매핑표로 로컬에서 값을 바꿔치기합니다.
// (임직원 수만큼 반복해서 조회하지 않아도 되도록)
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  AlertCircle,
  Car,
  ClipboardList,
  Compass,
  FileText,
  Filter,
  GraduationCap,
  UserCheck,
  UserCog,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { apiFetch, ApiError } from '@/lib/api'
import { resolveLabel } from '@/lib/master-maps'
import { fetchEmployeeRegistrations } from '@/lib/employee-registrations'
import { onRegistrationDecided } from '@/lib/registration-events'
import type { EmployeeListItem } from '@/types/employee'
import { AddEmployeeDialog } from '@/components/employee/add-employee-dialog'
import { EmployeeDetailDialog } from '@/components/employee/employee-detail-dialog'
import { RegistrationDetailDialog } from '@/components/employee/registration-detail-dialog'
import { useAuth } from '@/contexts/auth-context'
import { useMasterMaps } from '@/contexts/master-maps-context'
import { canManageEmployees } from '@/config/employee-options'

export function EmployeeManagementPage() {
  // 사원 추가는 최고관리자/관리자/부관리자만 할 수 있습니다.
  const { me } = useAuth()
  const canManage = canManageEmployees(me?.admin_role)
  // 마스터컬렉션 매핑표는 앱이 켜질 때 한 번만 받아와 전역으로 공유합니다.
  // (예전에는 이 페이지에 들어올 때마다 따로 불러왔습니다)
  const { masterMaps, isLoading: isMasterMapsLoading } = useMasterMaps()
  const [employees, setEmployees] = useState<EmployeeListItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  // 목록에서 클릭한 행의 임직원 _id. null이면 상세 다이얼로그가 닫힌 상태입니다.
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  )

  // 신규 계정 신청자 목록 (관리자급만 조회/표시)
  const [registrations, setRegistrations] = useState<
    EmployeeListItem[] | null
  >(null)
  const [registrationsError, setRegistrationsError] = useState<string | null>(
    null,
  )
  const [selectedRegistrationId, setSelectedRegistrationId] = useState<
    string | null
  >(null)

  const loadRegistrations = useCallback(async () => {
    if (!canManage) return
    try {
      const data = await fetchEmployeeRegistrations()
      setRegistrations(data)
      setRegistrationsError(null)
    } catch (err) {
      setRegistrationsError(
        err instanceof ApiError
          ? err.message
          : '신청자 목록을 불러오는 중 알 수 없는 오류가 발생했습니다.',
      )
    }
  }, [canManage])

  useEffect(() => {
    loadRegistrations()
  }, [loadRegistrations])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const employeeData = await apiFetch<EmployeeListItem[]>(
        '/employees/?skip=0&limit=200',
      )
      setEmployees(employeeData)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : '임직원 목록을 불러오는 중 알 수 없는 오류가 발생했습니다.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 원본 임직원 목록(_id 값)을 화면에 표시할 이름으로 변환합니다.
  const rows = useMemo(() => {
    if (!employees || !masterMaps) return []
    return employees.map((emp) => ({
      id: emp._id,
      name: emp.name_kor,
      employeeId: emp.employee_id,
      loginId: emp.login_id,
      department: resolveLabel(masterMaps.departments, emp.dept_id),
      team: resolveLabel(masterMaps.teams, emp.team_id),
      title: resolveLabel(masterMaps.titles, emp.title_id),
      position: resolveLabel(masterMaps.positions, emp.position_id),
      duty: resolveLabel(masterMaps.duties, emp.duty_id),
      employmentType: resolveLabel(
        masterMaps.employment_types,
        emp.employment_type,
      ),
    }))
  }, [employees, masterMaps])

  // 신청자 목록도 임직원 목록과 똑같은 방식(마스터컬렉션 _id -> 이름)으로 변환합니다.
  const registrationRows = useMemo(() => {
    if (!registrations || !masterMaps) return []
    return registrations.map((reg) => ({
      id: reg._id,
      name: reg.name_kor,
      employeeId: reg.employee_id,
      loginId: reg.login_id,
      department: resolveLabel(masterMaps.departments, reg.dept_id),
      team: resolveLabel(masterMaps.teams, reg.team_id),
      title: resolveLabel(masterMaps.titles, reg.title_id),
      position: resolveLabel(masterMaps.positions, reg.position_id),
      duty: resolveLabel(masterMaps.duties, reg.duty_id),
      employmentType: resolveLabel(
        masterMaps.employment_types,
        reg.employment_type,
      ),
    }))
  }, [registrations, masterMaps])

  // 승인/반려가 처리되면 임직원 목록(통계 포함)과 신청자 목록을 함께 새로고침합니다.
  const handleRegistrationDecided = useCallback(() => {
    loadData()
    loadRegistrations()
  }, [loadData, loadRegistrations])

  // 헤더 알림 벨의 드롭다운에서 승인/반려가 일어났을 때도 이 페이지가
  // 최신 상태로 갱신되도록 전역 이벤트를 구독합니다.
  useEffect(
    () => onRegistrationDecided(handleRegistrationDecided),
    [handleRegistrationDecided],
  )

  const total = rows.length
  const countByEmploymentType = (label: string) =>
    rows.filter((row) => row.employmentType === label).length
  const countByDuty = (label: string) =>
    rows.filter((row) => row.duty === label).length

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* 상단 타이틀 + 액션 버튼 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">사원 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            코스모진 여행사 임직원들의 정보를 관리합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Filter />
            필터
          </Button>
          {/* 사원 추가 권한(최고관리자/관리자/부관리자)이 없으면 버튼 자체를 숨깁니다 */}
          {canManage && (
            <AddEmployeeDialog masterMaps={masterMaps} onCreated={loadData} />
          )}
        </div>
      </div>

      {error && <ErrorNotice message={error} onRetry={loadData} />}

      {isLoading || isMasterMapsLoading ? (
        <EmployeeListSkeleton />
      ) : (
        !error && (
          <>
            {/* 고용형태별 인원 통계 */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatTile
                icon={Users}
                label="전체 임직원"
                value={total}
                tone="slate"
              />
              <StatTile
                icon={UserCheck}
                label="정규직"
                value={countByEmploymentType('정규직')}
                tone="blue"
              />
              <StatTile
                icon={FileText}
                label="계약직"
                value={countByEmploymentType('계약직')}
                tone="violet"
              />
              <StatTile
                icon={GraduationCap}
                label="인턴"
                value={countByEmploymentType('인턴')}
                tone="amber"
              />
            </div>

            {/* 직무별 인원 통계 */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatTile
                icon={UserCog}
                label="매니저"
                value={countByDuty('매니저')}
                tone="emerald"
              />
              <StatTile
                icon={ClipboardList}
                label="코디네이터"
                value={countByDuty('코디네이터')}
                tone="cyan"
              />
              <StatTile
                icon={Compass}
                label="가이드"
                value={countByDuty('가이드')}
                tone="orange"
              />
              <StatTile icon={Car} label="기사" value={countByDuty('기사')} tone="rose" />
            </div>

            {/* 임직원 목록 */}
            <Card className="gap-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  임직원 목록
                  <Badge variant="secondary">{total}</Badge>
                </CardTitle>
              </CardHeader>
              <div className="px-4 pb-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">이름</TableHead>
                      <TableHead className="text-center">사번</TableHead>
                      <TableHead className="text-center">로그인 ID</TableHead>
                      <TableHead className="text-center">부서</TableHead>
                      <TableHead className="text-center">팀</TableHead>
                      <TableHead className="text-center">직급</TableHead>
                      <TableHead className="text-center">직책</TableHead>
                      <TableHead className="text-center">직무</TableHead>
                      <TableHead className="text-center">고용형태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={9}
                          className="h-24 text-center text-muted-foreground"
                        >
                          등록된 임직원이 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row) => (
                        <TableRow
                          key={row.id}
                          onClick={() => setSelectedEmployeeId(row.id)}
                          className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60"
                        >
                          <TableCell className="text-center font-medium">
                            {row.name}
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {row.employeeId}
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {row.loginId}
                          </TableCell>
                          <TableCell className="text-center">
                            <ToneBadge
                              label={row.department}
                              toneMap={DEPARTMENT_TONES}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <ToneBadge label={row.team} toneMap={TEAM_TONES} />
                          </TableCell>
                          <TableCell className="text-center">
                            <ToneBadge
                              label={row.position}
                              toneMap={POSITION_TONES}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <ToneBadge
                              label={row.title}
                              toneMap={TITLE_TONES}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <ToneBadge label={row.duty} toneMap={DUTY_TONES} />
                          </TableCell>
                          <TableCell className="text-center">
                            <ToneBadge
                              label={row.employmentType}
                              toneMap={EMPLOYMENT_TYPE_TONES}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* 신규 계정 신청자 목록: 관리자급(최고관리자/관리자/부관리자)만 볼 수 있습니다 */}
            {canManage && (
              <Card className="gap-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    신규 계정 신청자 목록
                    <Badge variant="secondary">{registrationRows.length}</Badge>
                  </CardTitle>
                </CardHeader>

                {registrationsError && (
                  <div className="px-4 pb-2">
                    <ErrorNotice
                      message={registrationsError}
                      onRetry={loadRegistrations}
                    />
                  </div>
                )}

                <div className="px-4 pb-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-center">이름</TableHead>
                        <TableHead className="text-center">사번</TableHead>
                        <TableHead className="text-center">로그인 ID</TableHead>
                        <TableHead className="text-center">부서</TableHead>
                        <TableHead className="text-center">팀</TableHead>
                        <TableHead className="text-center">직급</TableHead>
                        <TableHead className="text-center">직책</TableHead>
                        <TableHead className="text-center">직무</TableHead>
                        <TableHead className="text-center">고용형태</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {registrationRows.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={9}
                            className="h-24 text-center text-muted-foreground"
                          >
                            대기 중인 신청이 없습니다.
                          </TableCell>
                        </TableRow>
                      ) : (
                        registrationRows.map((row) => (
                          <TableRow
                            key={row.id}
                            onClick={() => setSelectedRegistrationId(row.id)}
                            className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60"
                          >
                            <TableCell className="text-center font-medium">
                              {row.name}
                            </TableCell>
                            <TableCell className="text-center text-muted-foreground">
                              {row.employeeId}
                            </TableCell>
                            <TableCell className="text-center text-muted-foreground">
                              {row.loginId}
                            </TableCell>
                            <TableCell className="text-center">
                              <ToneBadge
                                label={row.department}
                                toneMap={DEPARTMENT_TONES}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <ToneBadge label={row.team} toneMap={TEAM_TONES} />
                            </TableCell>
                            <TableCell className="text-center">
                              <ToneBadge
                                label={row.position}
                                toneMap={POSITION_TONES}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <ToneBadge
                                label={row.title}
                                toneMap={TITLE_TONES}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <ToneBadge label={row.duty} toneMap={DUTY_TONES} />
                            </TableCell>
                            <TableCell className="text-center">
                              <ToneBadge
                                label={row.employmentType}
                                toneMap={EMPLOYMENT_TYPE_TONES}
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </>
        )
      )}

      <EmployeeDetailDialog
        employeeId={selectedEmployeeId}
        masterMaps={masterMaps}
        onClose={() => setSelectedEmployeeId(null)}
        onUpdated={loadData}
      />

      <RegistrationDetailDialog
        registrationId={selectedRegistrationId}
        masterMaps={masterMaps}
        onClose={() => setSelectedRegistrationId(null)}
        onDecided={handleRegistrationDecided}
      />
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
function EmployeeListSkeleton() {
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
const tones = Object.keys(tileToneMap) as Tone[]

// 위쪽 통계 카드와 색을 맞추기 위한 값별 지정 색상표입니다.
// (전체 임직원=slate, 정규직=blue, 계약직=amber, 인턴=violet,
//  매니저=emerald, 코디네이터=cyan, 가이드=orange, 기사=rose)
// * 계약직/인턴은 통계 카드에서는 서로 색을 바꿔 보여주지만(violet/amber),
//   아래 표의 값들은 "바꾸기 전 원래 색"을 기준으로 지정한 것이라
//   계약직=amber, 인턴=violet을 그대로 사용합니다.
const DEPARTMENT_TONES: Record<string, Tone> = {
  경영진: 'violet', // 인턴 색
  세일즈마케팅부: 'emerald', // 매니저 색
  패키지부: 'cyan', // 코디네이터 색
  가이드부: 'orange', // 가이드 색
  차량부: 'rose', // 기사 색
  소속없음: 'slate', // 전체 임직원 색
}
const TEAM_TONES: Record<string, Tone> = {
  정산팀: 'emerald', // 매니저 색
  마케팅팀: 'orange', // 가이드 색
  소속없음: 'slate', // 전체 임직원 색
}
const POSITION_TONES: Record<string, Tone> = {
  사장: 'violet', // 인턴 색
  부사장: 'violet',
  전무: 'violet',
  상무: 'violet',
  이사: 'violet',
  부장: 'blue', // 정규직 색
  차장: 'blue',
  과장: 'emerald', // 매니저 색
  대리: 'orange', // 가이드 색
  주임: 'orange',
  사원: 'amber', // 계약직 색
  수습: 'amber',
  인턴: 'amber',
  임시대기: 'slate', // 전체 임직원 색
}
const TITLE_TONES: Record<string, Tone> = {
  대표: 'violet', // 인턴 색(원래 색 기준)
  본부장: 'blue', // 정규직 색
  실장: 'emerald', // 매니저 색
  팀장: 'amber', // 인턴 색(바뀐 대시보드 기준)
  팀원: 'slate', // 전체 임직원 색
}
const DUTY_TONES: Record<string, Tone> = {
  임원: 'violet', // 인턴 색
  매니저: 'emerald',
  코디네이터: 'cyan',
  가이드: 'orange',
  기사: 'rose',
  임시대기: 'slate', // 전체 임직원 색
}
const EMPLOYMENT_TYPE_TONES: Record<string, Tone> = {
  정규직: 'blue',
  계약직: 'violet', // 인턴 색
  인턴: 'amber', // 계약직 색
  시간제: 'emerald', // 매니저 색
  프리랜서: 'orange', // 가이드 색
  보류: 'slate', // 전체 임직원 색
}

// 위 지정 색상표에 없는 값(예: 조직 관리에서 새로 추가된 부서/팀 등)을 만나면,
// 텍스트를 해시로 돌려서 8가지 색 중 하나를 자동으로 정해줍니다.
// 이렇게 하면 마스터컬렉션에 새 항목이 생겨도 코드를 수정하지 않아도
// 항상 같은 이름은 항상 같은 색으로 표시됩니다.
function toneForLabel(label: string): Tone {
  let hash = 0
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) % tones.length
  }
  return tones[hash]
}

function ToneBadge({
  label,
  toneMap,
}: {
  label: string
  toneMap: Record<string, Tone>
}) {
  if (label === '-') {
    return <span className="text-muted-foreground">-</span>
  }
  const tone = toneMap[label] ?? toneForLabel(label)
  return (
    <Badge variant="outline" className={cn('border-transparent', tileToneMap[tone])}>
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
