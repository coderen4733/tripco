// '사원 추가' 버튼을 누르면 뜨는 다이얼로그(모달 폼)입니다.
// 실제 입력 항목/검증 로직은 EmployeeApplicationForm(공용 컴포넌트)을 그대로
// 재사용합니다. ('신규 계정 신청' 폼과 완전히 같은 항목을 쓰기 위함)
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { EmployeeApplicationForm } from '@/components/employee/employee-application-form'
import type { MasterMaps } from '@/types/employee'

interface AddEmployeeDialogProps {
  // 소속부서/팀/직급/직책/직무/고용형태 드롭다운을 채울 마스터컬렉션 매핑표
  // (아직 불러오는 중이면 null이며, 이 동안은 버튼을 비활성화합니다)
  masterMaps: MasterMaps | null
  // 등록 성공 후 부모(사원 관리 페이지)가 목록을 새로고침할 수 있도록 알려주는 콜백
  onCreated: () => void
}

export function AddEmployeeDialog({
  masterMaps,
  onCreated,
}: AddEmployeeDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button disabled={!masterMaps} />}>
        <Plus />
        사원 추가
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>사원 추가</DialogTitle>
          <DialogDescription>
            코스모진 여행사에 새로운 임직원 정보를 등록합니다.
          </DialogDescription>
        </DialogHeader>

        {/* 다이얼로그가 열려있을 때만 렌더링해서, 닫혔다가 다시 열면
            폼 입력값이 항상 깨끗하게 초기화되도록 합니다. */}
        {open && (
          <EmployeeApplicationForm
            mode="create"
            masterMaps={masterMaps}
            onSuccess={() => {
              onCreated()
              setOpen(false)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
