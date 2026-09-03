// 알람(Alarm) API 호출 헬퍼입니다.
// (backend: apps/alarm/router.py, prefix "/alarms")
import { apiFetch } from '@/lib/api'
import type { AlarmItem } from '@/types/alarm'

// 로그인한 임직원 앞으로 온 알람 목록을 최신순으로 받아옵니다.
export function fetchAlarms(): Promise<AlarmItem[]> {
  return apiFetch<AlarmItem[]>('/alarms/')
}

// 체크 버튼: 알람을 확인 처리합니다. (본문 없이 호출 -> 백엔드에서 true로 처리)
export function markAlarmAsRead(id: string): Promise<unknown> {
  return apiFetch(`/alarms/${id}/read`, { method: 'PATCH' })
}

// 알림 관리 페이지의 토글 스위치: 읽음 여부를 true/false로 자유롭게 바꿉니다.
export function setAlarmReadStatus(
  id: string,
  isRead: boolean,
): Promise<unknown> {
  return apiFetch(`/alarms/${id}/read`, {
    method: 'PATCH',
    body: JSON.stringify({ is_read: isRead }),
  })
}

// 휴지통 버튼: 알람을 삭제합니다.
export function deleteAlarm(id: string): Promise<unknown> {
  return apiFetch(`/alarms/${id}`, { method: 'DELETE' })
}
