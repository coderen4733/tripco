// 고용형태 추가/수정 폼입니다. item이 없으면 추가, 있으면 그 항목을 수정합니다.
import { useState, type FormEvent } from 'react'
import { Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api'
import { employmentTypeApi } from '@/lib/organizations'
import type { EmploymentTypeItem } from '@/types/organization'
import { TextField } from './org-form-fields'

interface EmploymentTypeFormProps {
  item: EmploymentTypeItem | null
  onDone: () => void
}

export function EmploymentTypeForm({
  item,
  onDone,
}: EmploymentTypeFormProps) {
  const [code, setCode] = useState(item?.type_code ?? '')
  const [typeName, setTypeName] = useState(item?.type ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!code.trim() || !typeName.trim()) {
      setError('타입 코드와 이름을 입력해 주세요.')
      return
    }
    setIsSubmitting(true)
    try {
      const payload = { type_code: code.trim(), type: typeName.trim() }
      if (item) {
        await employmentTypeApi.update(item._id, payload)
      } else {
        await employmentTypeApi.create(payload)
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
        id="emp_type_code"
        label="타입 코드"
        value={code}
        onChange={setCode}
        placeholder="예: REG"
      />
      <TextField
        id="emp_type_name"
        label="타입명"
        value={typeName}
        onChange={setTypeName}
        placeholder="예: 정규직"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? <Loader2 className="animate-spin" /> : <Save />}
        저장
      </Button>
    </form>
  )
}
