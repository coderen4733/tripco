// 회사 관리 > 조직 관리 페이지입니다.
// 부서/팀/직위/직책/직무/고용형태 6종의 마스터컬렉션을 목록으로 보여주고,
// 드래그 앤 드롭으로 순서(order, LexoRank)를 바꾸거나 활성/비활성(status)
// 상태를 토글할 수 있으며, 관리자급(최고관리자/관리자/부관리자)은
// 추가/수정/삭제도 할 수 있습니다.
//
// 부서장/팀장(leader_id)은 임직원 _id를 가리키므로 GET /employees/ 목록을
// 함께 받아와 이름으로 매핑합니다. 상위 부서(dept_id)는 이 페이지에서
// 방금 불러온 부서 목록으로 직접 매핑해서, 새로 추가/수정한 부서명이
// 바로 반영되도록 합니다. (앱 전체 공용 매핑표인 useMasterMaps는 이 화면
// 에서 변경이 생길 때마다 함께 새로고침해서 다른 화면과 어긋나지 않게 합니다)
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ApiError, apiFetch } from '@/lib/api'
import { resolveLabel } from '@/lib/master-maps'
import {
  departmentApi,
  dutyApi,
  employmentTypeApi,
  positionApi,
  teamApi,
  titleApi,
} from '@/lib/organizations'
import type {
  DepartmentItem,
  DutyItem,
  EmploymentTypeItem,
  PositionItem,
  TeamItem,
  TitleItem,
} from '@/types/organization'
import type { EmployeeListItem } from '@/types/employee'
import { useAuth } from '@/contexts/auth-context'
import { useMasterMaps } from '@/contexts/master-maps-context'
import { canManageEmployees } from '@/config/employee-options'
import { OrgListCard, type OrgColumn } from '@/components/organization/org-list-card'
import { DepartmentForm } from '@/components/organization/department-form'
import { TeamForm } from '@/components/organization/team-form'
import { PositionForm } from '@/components/organization/position-form'
import { TitleForm } from '@/components/organization/title-form'
import { DutyForm } from '@/components/organization/duty-form'
import { EmploymentTypeForm } from '@/components/organization/employment-type-form'

export function OrganizationManagementPage() {
  // 조직 관리(추가/수정/삭제/순서변경/상태변경)는 사원 관리와 똑같이
  // 최고관리자/관리자/부관리자만 할 수 있습니다. 조회는 누구나 가능합니다.
  const { me } = useAuth()
  const canManage = canManageEmployees(me?.admin_role)
  const { refreshMasterMaps } = useMasterMaps()

  const [departments, setDepartments] = useState<DepartmentItem[]>([])
  const [teams, setTeams] = useState<TeamItem[]>([])
  const [positions, setPositions] = useState<PositionItem[]>([])
  const [titles, setTitles] = useState<TitleItem[]>([])
  const [duties, setDuties] = useState<DutyItem[]>([])
  const [employmentTypes, setEmploymentTypes] = useState<
    EmploymentTypeItem[]
  >([])
  const [employees, setEmployees] = useState<EmployeeListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [emps, depts, tms, poss, tls, dts, ets] = await Promise.all([
        apiFetch<EmployeeListItem[]>('/employees/?skip=0&limit=200'),
        departmentApi.list(),
        teamApi.list(),
        positionApi.list(),
        titleApi.list(),
        dutyApi.list(),
        employmentTypeApi.list(),
      ])
      setEmployees(emps)
      setDepartments(depts)
      setTeams(tms)
      setPositions(poss)
      setTitles(tls)
      setDuties(dts)
      setEmploymentTypes(ets)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : '조직 정보를 불러오는 중 알 수 없는 오류가 발생했습니다.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // 이 페이지에서 부서/팀/직급/직책/직무/고용형태가 추가/수정/삭제되면,
  // 앱 전체가 공유하는 마스터컬렉션 매핑표(useMasterMaps)도 함께
  // 새로고침합니다. 그래야 헤더나 사원 관리 페이지 같은 다른 화면도
  // 새로고침 없이 바로 최신 이름을 보여줍니다.
  const handleChanged = useCallback(() => {
    loadAll()
    refreshMasterMaps()
  }, [loadAll, refreshMasterMaps])

  const employeeNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    employees.forEach((emp) => {
      map[emp._id] = emp.name_kor
    })
    return map
  }, [employees])

  const departmentNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    departments.forEach((dept) => {
      map[dept._id] = dept.name
    })
    return map
  }, [departments])

  const departmentColumns: OrgColumn<DepartmentItem>[] = [
    { key: 'code', label: '부서 코드', render: (row) => row.dept_code },
    { key: 'name', label: '부서명', render: (row) => row.name },
    {
      key: 'hq',
      label: '상위 본부',
      // 아직 본부(headquarters) 마스터컬렉션이 없어 항상 미지정입니다.
      render: () => <span className="text-muted-foreground">-</span>,
    },
    {
      key: 'leader',
      label: '부서장',
      render: (row) => resolveLabel(employeeNameMap, row.leader_id),
    },
  ]

  const teamColumns: OrgColumn<TeamItem>[] = [
    { key: 'code', label: '팀 코드', render: (row) => row.team_code },
    { key: 'name', label: '팀명', render: (row) => row.name },
    {
      key: 'dept',
      label: '상위 부서',
      render: (row) => resolveLabel(departmentNameMap, row.dept_id),
    },
    {
      key: 'leader',
      label: '팀장',
      render: (row) => resolveLabel(employeeNameMap, row.leader_id),
    },
  ]

  const positionColumns: OrgColumn<PositionItem>[] = [
    { key: 'code', label: '직위 코드', render: (row) => row.position_code },
    { key: 'name', label: '직위명', render: (row) => row.name },
  ]

  const titleColumns: OrgColumn<TitleItem>[] = [
    { key: 'code', label: '직책 코드', render: (row) => row.title_code },
    { key: 'name', label: '직책명', render: (row) => row.name },
  ]

  const dutyColumns: OrgColumn<DutyItem>[] = [
    { key: 'code', label: '직무 코드', render: (row) => row.duty_code },
    { key: 'name', label: '직무명', render: (row) => row.name },
  ]

  const employmentTypeColumns: OrgColumn<EmploymentTypeItem>[] = [
    { key: 'code', label: '타입 코드', render: (row) => row.type_code },
    { key: 'name', label: '타입명', render: (row) => row.type },
  ]

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">조직 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          코스모진 여행사의 조직 구성을 관리합니다.
        </p>
      </div>

      {error && <ErrorNotice message={error} onRetry={loadAll} />}

      {!error && (
        <>
          {/* 부서 목록(좌) / 팀 목록(우) */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <OrgListCard
              title="부서 목록"
              addLabel="부서 추가"
              emptyMessage="등록된 부서가 없습니다."
              items={departments}
              isLoading={isLoading}
              canManage={canManage}
              columns={departmentColumns}
              getLabel={(row) => `${row.dept_code} · ${row.name}`}
              setItems={setDepartments}
              onReorder={(id, prevId, nextId) =>
                departmentApi.reorder(id, {
                  prev_id: prevId,
                  next_id: nextId,
                })
              }
              onToggleStatus={(id, next) => departmentApi.setStatus(id, next)}
              onDelete={(id, reassignTo) =>
                departmentApi.remove(id, reassignTo)
              }
              onReload={handleChanged}
              renderForm={({ item, onDone }) => (
                <DepartmentForm
                  item={item}
                  employeeOptions={employeeNameMap}
                  onDone={onDone}
                />
              )}
            />
            <OrgListCard
              title="팀 목록"
              addLabel="팀 추가"
              emptyMessage="등록된 팀이 없습니다."
              items={teams}
              isLoading={isLoading}
              canManage={canManage}
              columns={teamColumns}
              getLabel={(row) => `${row.team_code} · ${row.name}`}
              setItems={setTeams}
              onReorder={(id, prevId, nextId) =>
                teamApi.reorder(id, { prev_id: prevId, next_id: nextId })
              }
              onToggleStatus={(id, next) => teamApi.setStatus(id, next)}
              onDelete={(id, reassignTo) => teamApi.remove(id, reassignTo)}
              onReload={handleChanged}
              renderForm={({ item, onDone }) => (
                <TeamForm
                  item={item}
                  departmentOptions={departmentNameMap}
                  employeeOptions={employeeNameMap}
                  onDone={onDone}
                />
              )}
            />
          </div>

          {/* 직위 목록(좌) / 직책 목록(우) */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <OrgListCard
              title="직위 목록"
              addLabel="직위 추가"
              emptyMessage="등록된 직위가 없습니다."
              items={positions}
              isLoading={isLoading}
              canManage={canManage}
              columns={positionColumns}
              getLabel={(row) => `${row.position_code} · ${row.name}`}
              setItems={setPositions}
              onReorder={(id, prevId, nextId) =>
                positionApi.reorder(id, { prev_id: prevId, next_id: nextId })
              }
              onToggleStatus={(id, next) => positionApi.setStatus(id, next)}
              onDelete={(id, reassignTo) =>
                positionApi.remove(id, reassignTo)
              }
              onReload={handleChanged}
              renderForm={({ item, onDone }) => (
                <PositionForm item={item} onDone={onDone} />
              )}
            />
            <OrgListCard
              title="직책 목록"
              addLabel="직책 추가"
              emptyMessage="등록된 직책이 없습니다."
              items={titles}
              isLoading={isLoading}
              canManage={canManage}
              columns={titleColumns}
              getLabel={(row) => `${row.title_code} · ${row.name}`}
              setItems={setTitles}
              onReorder={(id, prevId, nextId) =>
                titleApi.reorder(id, { prev_id: prevId, next_id: nextId })
              }
              onToggleStatus={(id, next) => titleApi.setStatus(id, next)}
              onDelete={(id, reassignTo) => titleApi.remove(id, reassignTo)}
              onReload={handleChanged}
              renderForm={({ item, onDone }) => (
                <TitleForm item={item} onDone={onDone} />
              )}
            />
          </div>

          {/* 직무 목록(좌) / 고용 타입 목록(우) */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <OrgListCard
              title="직무 목록"
              addLabel="직무 추가"
              emptyMessage="등록된 직무가 없습니다."
              items={duties}
              isLoading={isLoading}
              canManage={canManage}
              columns={dutyColumns}
              getLabel={(row) => `${row.duty_code} · ${row.name}`}
              setItems={setDuties}
              onReorder={(id, prevId, nextId) =>
                dutyApi.reorder(id, { prev_id: prevId, next_id: nextId })
              }
              onToggleStatus={(id, next) => dutyApi.setStatus(id, next)}
              onDelete={(id, reassignTo) => dutyApi.remove(id, reassignTo)}
              onReload={handleChanged}
              renderForm={({ item, onDone }) => (
                <DutyForm item={item} onDone={onDone} />
              )}
            />
            <OrgListCard
              title="고용 타입 목록"
              addLabel="고용 타입 추가"
              emptyMessage="등록된 고용 타입이 없습니다."
              items={employmentTypes}
              isLoading={isLoading}
              canManage={canManage}
              columns={employmentTypeColumns}
              getLabel={(row) => `${row.type_code} · ${row.type}`}
              setItems={setEmploymentTypes}
              onReorder={(id, prevId, nextId) =>
                employmentTypeApi.reorder(id, {
                  prev_id: prevId,
                  next_id: nextId,
                })
              }
              onToggleStatus={(id, next) =>
                employmentTypeApi.setStatus(id, next)
              }
              onDelete={(id, reassignTo) =>
                employmentTypeApi.remove(id, reassignTo)
              }
              onReload={handleChanged}
              renderForm={({ item, onDone }) => (
                <EmploymentTypeForm item={item} onDone={onDone} />
              )}
            />
          </div>
        </>
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
