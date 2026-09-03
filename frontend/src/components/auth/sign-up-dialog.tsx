// 로그인 다이얼로그의 "신규 계정 신청" 버튼을 누르면 뜨는 폼입니다.
// '사원 추가' 폼과 완전히 동일한 항목을 쓰되(EmployeeApplicationForm 공용
// 컴포넌트 재사용), 실제로는 바로 임직원이 되는 게 아니라 관리자
// (최고관리자/관리자/부관리자) 승인을 받아야 완전히 등록됩니다.
// (백엔드: POST /auth/sign-up, apps/employee/repository.py의
//  employee_registrations 대기 명단에 먼저 저장됩니다)
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useMasterMaps } from '@/contexts/master-maps-context'
import { EmployeeApplicationForm } from '@/components/employee/employee-application-form'

interface SignUpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SignUpDialog({ open, onOpenChange }: SignUpDialogProps) {
  // 마스터컬렉션 매핑표는 로그인 여부와 상관없이 앱이 켜질 때 이미
  // 한 번 받아와 있으므로, 여기서 따로 불러올 필요가 없습니다.
  const { masterMaps } = useMasterMaps()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>사원 등록 신청</DialogTitle>
          <DialogDescription>
            코스모진 여행사에 새로운 임직원 정보 등록을 신청합니다.
          </DialogDescription>
        </DialogHeader>

        {/* 다이얼로그가 열려있을 때만 렌더링해서, 닫혔다가 다시 열면
            폼 입력값이 항상 깨끗하게 초기화되도록 합니다. */}
        {open && (
          <EmployeeApplicationForm
            mode="sign-up"
            masterMaps={masterMaps}
            onSuccess={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
