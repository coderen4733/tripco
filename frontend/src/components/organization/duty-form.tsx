// 직무 추가/수정 폼입니다. item이 없으면 추가, 있으면 그 항목을 수정합니다.
import { useState, type FormEvent } from 'react'
import { Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api'
import { dutyApi } from '@/lib/organizations'
import type { DutyItem } from '@/types/organization'
import { TextField } from './org-form-fields'

interface DutyFormProps {
  item: DutyItem | null
  onDone: () => void
}

export function DutyForm({ item, onDone }: DutyFormProps) {
  const [code, setCode] = useState(item?.duty_code ?? '')
  const [name, setName] = useState(item?.name ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!code.trim() || !name.trim()) {
      setError('직무 코드와 이름을 입력해 주세요.')
      return
    }
    setIsSubmitting(true)
    try {
      const payload = { duty_code: code.trim(), name: name.trim() }
      if (item) {
        await dutyApi.update(item._id, payload)
      } else {
        await dutyApi.create(payload)
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
        id="duty_code"
        label="직무 코드"
        value={code}
        onChange={setCode}
        placeholder="예: GUD"
      />
      <TextField
        id="duty_name"
        label="직무명"
        value={name}
        onChange={setName}
        placeholder="예: 가이드"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? <Loader2 className="animate-spin" /> : <Save />}
        저장
      </Button>
    </form>
  )
}
