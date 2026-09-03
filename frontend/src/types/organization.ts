// 조직 관리(부서/팀/직위/직책/직무/고용형태) 화면에서 쓰는 타입입니다.
// (backend: apps/organization/*/models/schemas.py의 *ReadListRes와 대응)
// 6종 모두 order(LexoRank 문자열)/status(활성 여부)를 공통으로 가집니다.

export interface OrgOrderedItem {
  _id: string
  status: boolean
  order: string
}

// 부서(Department)
export interface DepartmentItem extends OrgOrderedItem {
  dept_code: string
  name: string
  leader_id: string | null // 부서장 임직원id
  hq_id: string | null // 상위 본부id (아직 본부 관리 기능이 없어 항상 null)
}
export interface DeptCreateReq {
  dept_code: string
  name: string
  leader_id: string | null
}
export type DeptUpdateReq = DeptCreateReq

// 팀(Team)
export interface TeamItem extends OrgOrderedItem {
  team_code: string
  name: string
  leader_id: string | null // 팀장 임직원id
  dept_id: string | null // 상위 부서id
}
export interface TeamCreateReq {
  team_code: string
  name: string
  leader_id: string | null
  dept_id: string | null
}
export type TeamUpdateReq = TeamCreateReq

// 직급/직위(Position)
export interface PositionItem extends OrgOrderedItem {
  position_code: string
  name: string
}
export interface PositionCreateReq {
  position_code: string
  name: string
}
export type PositionUpdateReq = PositionCreateReq

// 직책(Title)
export interface TitleItem extends OrgOrderedItem {
  title_code: string
  name: string
}
export interface TitleCreateReq {
  title_code: string
  name: string
}
export type TitleUpdateReq = TitleCreateReq

// 직무(Duty)
export interface DutyItem extends OrgOrderedItem {
  duty_code: string
  name: string
}
export interface DutyCreateReq {
  duty_code: string
  name: string
}
export type DutyUpdateReq = DutyCreateReq

// 고용형태(EmploymentType)
export interface EmploymentTypeItem extends OrgOrderedItem {
  type_code: string
  type: string
}
export interface EmpTypeCreateReq {
  type_code: string
  type: string
}
export type EmpTypeUpdateReq = EmpTypeCreateReq

// 드래그 앤 드롭 순서 변경(U) API - 요청/응답
// (backend: 각 모듈 schemas.py의 *ReorderReq/*ReorderRes와 대응)
export interface OrgReorderReq {
  prev_id: string | null
  next_id: string | null
}
export interface OrgReorderRes {
  order: string
}

// 활성/비활성 상태 변경(U) API - 요청/응답
export interface OrgStatusReq {
  status: boolean
}
export interface OrgMutationRes {
  matched_count: number
  modified_count: number
  acknowledged: boolean
}

// 삭제(D) API가 409로 실패할 때, 그 항목을 참조 중인 임직원(팀 포함)이
// 있어 재배치가 필요하다는 걸 구조화된 형태로 알려준다.
// (backend: 각 모듈 service.py의 delete_* 함수가 던지는
//  HTTPException(409, detail={...})와 대응)
export interface OrgReassignRequiredDetail {
  message: string
  requires_reassignment: true
  affected_count: number
}

export function isReassignRequiredDetail(
  detail: unknown,
): detail is OrgReassignRequiredDetail {
  return (
    !!detail &&
    typeof detail === 'object' &&
    (detail as { requires_reassignment?: unknown }).requires_reassignment ===
      true
  )
}
