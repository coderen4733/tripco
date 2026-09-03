// 조직 관리(부서/팀/직위/직책/직무/고용형태) 6종 마스터컬렉션의 API 호출을
// 모아둔 파일입니다. 6종 모두 CRUD + 순서변경(order) + 상태변경(status)
// 엔드포인트 모양이 완전히 똑같기 때문에(백엔드도 같은 패턴을 6번
// 반복합니다), createOrgApi 하나로 만들어서 6번 찍어냅니다.
import { apiFetch } from './api'
import type {
  DepartmentItem,
  DeptCreateReq,
  DeptUpdateReq,
  DutyItem,
  DutyCreateReq,
  DutyUpdateReq,
  EmploymentTypeItem,
  EmpTypeCreateReq,
  EmpTypeUpdateReq,
  OrgMutationRes,
  OrgReorderReq,
  OrgReorderRes,
  PositionItem,
  PositionCreateReq,
  PositionUpdateReq,
  TeamItem,
  TeamCreateReq,
  TeamUpdateReq,
  TitleItem,
  TitleCreateReq,
  TitleUpdateReq,
} from '@/types/organization'

// basePath는 끝에 "/"가 붙은 형태로 넘겨받습니다. (예: "/organizations/departments/")
function createOrgApi<TItem, TCreateReq, TUpdateReq>(basePath: string) {
  return {
    list: () => apiFetch<TItem[]>(`${basePath}?skip=0&limit=200`),
    create: (payload: TCreateReq) =>
      apiFetch<TItem>(basePath, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (id: string, payload: TUpdateReq) =>
      apiFetch<OrgMutationRes>(`${basePath}${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    // 드래그 앤 드롭으로 옮겨놓은 앞/뒤 항목의 _id를 보내면, 서버가 그 사이
    // 값을 계산해서 order를 바꿔준다. (맨 앞/뒤로 옮기면 한쪽은 null)
    reorder: (id: string, payload: OrgReorderReq) =>
      apiFetch<OrgReorderRes>(`${basePath}${id}/order`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    setStatus: (id: string, nextStatus: boolean) =>
      apiFetch<OrgMutationRes>(`${basePath}${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      }),
    // reassignTo를 주지 않았는데 이 항목을 참조 중인 임직원(팀 포함)이
    // 있으면, 서버가 409로 재배치가 필요하다는 사실과 영향받는 건수를
    // 구조화된 detail로 돌려준다. (types/organization.ts의
    // isReassignRequiredDetail로 판별)
    remove: (id: string, reassignTo?: string | null) =>
      apiFetch<{ deleted_count: number; acknowledged: boolean }>(
        `${basePath}${id}${
          reassignTo ? `?reassign_to=${encodeURIComponent(reassignTo)}` : ''
        }`,
        { method: 'DELETE' },
      ),
  }
}

export const departmentApi = createOrgApi<
  DepartmentItem,
  DeptCreateReq,
  DeptUpdateReq
>('/organizations/departments/')

export const teamApi = createOrgApi<TeamItem, TeamCreateReq, TeamUpdateReq>(
  '/organizations/teams/',
)

export const positionApi = createOrgApi<
  PositionItem,
  PositionCreateReq,
  PositionUpdateReq
>('/organizations/positions/')

export const titleApi = createOrgApi<
  TitleItem,
  TitleCreateReq,
  TitleUpdateReq
>('/organizations/titles/')

export const dutyApi = createOrgApi<DutyItem, DutyCreateReq, DutyUpdateReq>(
  '/organizations/duties/',
)

export const employmentTypeApi = createOrgApi<
  EmploymentTypeItem,
  EmpTypeCreateReq,
  EmpTypeUpdateReq
>('/organizations/employment_types/')
