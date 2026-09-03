// 직책 추가/수정 폼입니다. item이 없으면 추가, 있으면 그 항목을 수정합니다.
import { useState, type FormEvent } from 'react'
import { Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api'
import { titleApi } from '@/lib/organizations'
import type { TitleItem } from '@/types/organization'
import { TextField } from './org-form-fields'

interface TitleFormProps {
  item: TitleItem | null
  onDone: () => void
}

export function TitleForm({ item, onDone }: TitleFormProps) {
  const [code, setCode] = useState(item?.title_code ?? '')
  const [name, setName] = useState(item?.name ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!code.trim() || !name.trim()) {
      setError('직책 코드와 이름을 입력해 주세요.')
      return
    }
    setIsSubmitting(true)
    try {
      const payload = { title_code: code.trim(), name: name.trim() }
      if (item) {
        await titleApi.update(item._id, payload)
      } else {
        await titleApi.create(payload)
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
        id="title_code"
        label="직책 코드"
        value={code}
        onChange={setCode}
        placeholder="예: TML"
      />
      <TextField
        id="title_name"
        label="직책명"
        value={name}
        onChange={setName}
        placeholder="예: 팀장"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? <Loader2 className="animate-spin" /> : <Save />}
        저장
      </Button>
    </form>
  )
}
