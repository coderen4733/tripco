// 신규 계정 신청(승인 대기) 관련 API 호출 헬퍼입니다.
// (백엔드: apps/employee/router.py의 "/employees/registrations" 하위 API,
//  관리자급(최고관리자/관리자/부관리자)만 호출할 수 있습니다)
import { apiFetch } from '@/lib/api'
import type {
  EmployeeDetail,
  EmployeeListItem,
  EmployeeUpdatePayload,
} from '@/types/employee'

// 승인 대기 중인 신청자 목록
export function fetchEmployeeRegistrations(): Promise<EmployeeListItem[]> {
  return apiFetch<EmployeeListItem[]>('/employees/registrations/')
}

// 신청자 상세 정보 (이미 승인/반려되어 없어졌으면 404가 던져집니다)
export function fetchEmployeeRegistrationDetail(
  id: string,
): Promise<EmployeeDetail> {
  return apiFetch<EmployeeDetail>(`/employees/registrations/${id}`)
}

// 신청 내용 수정 (관리자급만 가능, 부분 수정)
export function updateEmployeeRegistration(
  id: string,
  partial: EmployeeUpdatePayload,
): Promise<unknown> {
  return apiFetch(`/employees/registrations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(partial),
  })
}

// 승인: employees에 생성하고 employee_registrations에서는 삭제됩니다.
export function approveEmployeeRegistration(
  id: string,
): Promise<{ _id: string }> {
  return apiFetch<{ _id: string }>(
    `/employees/registrations/${id}/approve`,
    { method: 'POST' },
  )
}

// 반려: employee_registrations에서 삭제만 됩니다.
export function rejectEmployeeRegistration(
  id: string,
): Promise<{ rejected: boolean }> {
  return apiFetch<{ rejected: boolean }>(
    `/employees/registrations/${id}/reject`,
    { method: 'POST' },
  )
}
