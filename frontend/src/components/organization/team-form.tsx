// 팀 추가/수정 폼입니다. item이 없으면 추가, 있으면 그 팀을 수정합니다.
import { useState, type FormEvent } from 'react'
import { Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api'
import { teamApi } from '@/lib/organizations'
import type { TeamItem } from '@/types/organization'
import { OrgMasterSelect, TextField } from './org-form-fields'

interface TeamFormProps {
  item: TeamItem | null
  // 상위 부서 선택용 {부서_id: 부서명} 목록
  departmentOptions: Record<string, string>
  // 팀장 선택용 {임직원_id: 이름} 목록
  employeeOptions: Record<string, string>
  onDone: () => void
}

export function TeamForm({
  item,
  departmentOptions,
  employeeOptions,
  onDone,
}: TeamFormProps) {
  const [teamCode, setTeamCode] = useState(item?.team_code ?? '')
  const [name, setName] = useState(item?.name ?? '')
  const [deptId, setDeptId] = useState<string | null>(item?.dept_id ?? null)
  const [leaderId, setLeaderId] = useState<string | null>(
    item?.leader_id ?? null,
  )
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!teamCode.trim() || !name.trim()) {
      setError('팀 코드와 팀명을 입력해 주세요.')
      return
    }
    setIsSubmitting(true)
    try {
      const payload = {
        team_code: teamCode.trim(),
        name: name.trim(),
        dept_id: deptId,
        leader_id: leaderId,
      }
      if (item) {
        await teamApi.update(item._id, payload)
      } else {
        await teamApi.create(payload)
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
        id="team_code"
        label="팀 코드"
        value={teamCode}
        onChange={setTeamCode}
        placeholder="예: SET"
      />
      <TextField
        id="team_name"
        label="팀명"
        value={name}
        onChange={setName}
        placeholder="예: 정산팀"
      />
      <OrgMasterSelect
        id="team_dept"
        label="상위 부서"
        value={deptId}
        onChange={setDeptId}
        options={departmentOptions}
      />
      <OrgMasterSelect
        id="team_leader"
        label="팀장"
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
