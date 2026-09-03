// 조직 관리 추가/수정 폼들이 공통으로 쓰는 입력 필드 컴포넌트입니다.
// (사원 신청 폼의 TextField/MasterSelect와 같은 방식이며, 이 화면 전용으로
// 하나 더 만들었습니다)
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UNASSIGNED_VALUE } from '@/config/employee-options'

export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  required = true,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

// 부서장/팀장/상위 부서처럼 {_id: 표시값} 목록 중 하나를 고르는 드롭다운.
// "미지정"을 고르면 null을 돌려줍니다.
export function OrgMasterSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string
  label: string
  value: string | null
  onChange: (value: string | null) => void
  options: Record<string, string>
}) {
  const items = { [UNASSIGNED_VALUE]: '미지정', ...options }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select
        items={items}
        value={value ?? UNASSIGNED_VALUE}
        onValueChange={(v) =>
          onChange(v === UNASSIGNED_VALUE ? null : (v as string))
        }
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder="선택하세요" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNASSIGNED_VALUE}>미지정</SelectItem>
          {Object.entries(options).map(([optionId, name]) => (
            <SelectItem key={optionId} value={optionId}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
