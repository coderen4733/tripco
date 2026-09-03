// GET /alarms/ 응답 1건
// (backend: apps/alarm/models/schemas.py의 AlarmReadListRes와 대응)
export interface AlarmItem {
  _id: string
  type: string
  // 알림 관리 대시보드 8칸(결재/견적/부킹/정산/사내 소식/나의 비서/
  // 나의 활동/시스템) 중 하나. (backend: AlarmCategory와 대응)
  category: string
  message: string
  related_id: string | null
  is_read: boolean
  created_at: string
}
