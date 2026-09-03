// 부서 추가/수정 폼입니다. item이 없으면 추가, 있으면 그 부서를 수정합니다.
import { useState, type FormEvent } from 'react'
import { Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api'
import { departmentApi } from '@/lib/organizations'
import type { DepartmentItem } from '@/types/organization'
import { OrgMasterSelect, TextField } from './org-form-fields'

interface DepartmentFormProps {
  item: DepartmentItem | null
  // 부서장 선택용 {임직원_id: 이름} 목록
  employeeOptions: Record<string, string>
  onDone: () => void
}

export function DepartmentForm({
  item,
  employeeOptions,
  onDone,
}: DepartmentFormProps) {
  const [deptCode, setDeptCode] = useState(item?.dept_code ?? '')
  const [name, setName] = useState(item?.name ?? '')
  const [leaderId, setLeaderId] = useState<string | null>(
    item?.leader_id ?? null,
  )
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!deptCode.trim() || !name.trim()) {
      setError('부서 코드와 부서명을 입력해 주세요.')
      return
    }
    setIsSubmitting(true)
    try {
      const payload = {
        dept_code: deptCode.trim(),
        name: name.trim(),
        leader_id: leaderId,
      }
      if (item) {
        await departmentApi.update(item._id, payload)
      } else {
        await departmentApi.create(payload)
      }
      onDone()
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : '저장 중 알 수 없는 오류가 발생했습니다.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <TextField
        id="dept_code"
        label="부서 코드"
        value={deptCode}
        onChange={setDeptCode}
        placeholder="예: SMD"
      />
      <TextField
        id="dept_name"
        label="부서명"
        value={name}
        onChange={setName}
        placeholder="예: 세일즈마케팅부"
      />
      <OrgMasterSelect
        id="dept_leader"
        label="부서장"
        value={leaderId}
        onChange={setLeaderId}
        options={employeeOptions}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? <Loader2 className="animate-spin" /> : <Save />}
        저장
      </Button>
    </form>
  )
}
