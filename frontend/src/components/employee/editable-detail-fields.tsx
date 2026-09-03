// '임직원 상세 정보'와 '신청자 상세 정보' 두 다이얼로그가 공통으로 쓰는
// 상세 조회/수정 폼 부품 모음입니다. 두 다이얼로그 모두 백엔드의 부분 수정
// (PUT .../{_id})이 EmployeeUpdatePayload와 같은 모양을 쓰기 때문에, 필드
// UI(라벨 + 값/입력칸 + 연필·저장 버튼)를 그대로 재사용할 수 있습니다.
import {
  useState,
  type ReactNode,
} from 'react'
import { Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ApiError } from '@/lib/api'
import { UNASSIGNED_VALUE } from '@/config/employee-options'
import type {
  EmployeeUpdatePayload,
  LanguageSkillPayload,
} from '@/types/employee'

// 다른 화면(알림 관리 등)에서도 함께 쓰는 공용 유틸이라 lib/format.ts에
// 정의되어 있습니다. 여기서는 기존에 이 파일에서 가져다 쓰던 곳들을 위해
// 그대로 다시 내보냅니다.
export { formatDateTime } from '@/lib/format'

export function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  )
}

// 폼 안에서 항목들을 묶어 제목을 붙이는 섹션 컨테이너 (사원 추가 폼과 동일한 레이아웃)
export function FormSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  )
}

// 입력칸처럼 보이지만 수정은 안 되는, 읽기 전용 값 표시 칸
export function ReadOnlyField({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div className="flex h-8 items-center rounded-lg border border-input bg-muted/30 px-2.5 text-sm text-foreground">
        {value}
      </div>
    </div>
  )
}

// 입사문서/결재 관련 파일처럼, 항목을 한 행에 하나씩 세로로 쌓아 보여주는 섹션
// (다른 섹션들은 2열 그리드지만, 파일 목록은 이름이 길어서 1열로 배치합니다)
export function FileListSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  )
}

// url이 있으면 새 탭에서 열어볼 수 있는 링크로, 없으면 대시(-)로 보여줍니다.
export function ReadOnlyFileField({
  label,
  url,
}: {
  label: string
  url: string | null
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div className="flex h-8 items-center rounded-lg border border-input bg-muted/30 px-2.5 text-sm">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline underline-offset-2"
          >
            파일 보기
          </a>
        ) : (
          <span className="text-foreground">-</span>
        )}
      </div>
    </div>
  )
}

// ── 여기서부터는 '수정 가능한' 필드 3종입니다 ─────────────────────────────
// 셋 다 같은 뼈대(라벨 + 값/입력칸 + 연필·저장 버튼)를 쓰므로
// EditableFieldShell 하나로 겉모습을 통일하고, 안쪽 입력 위젯만 다르게 씁니다.

export type SaveFn = (
  field: keyof EmployeeUpdatePayload,
  value: string | null,
) => Promise<void>

// 수정 가능한 필드의 공통 뼈대: 평소엔 값만 보여주다가, 연필 버튼을 누르면
// 입력칸 + 저장 버튼으로 바뀌고, 저장이 끝나면 다시 평소 모습으로 돌아옵니다.
// canEdit이 false면 수정 권한이 없다는 뜻이라, 연필 버튼 자체를 숨기고
// ReadOnlyField와 똑같은 모습(값만 표시)으로 보여줍니다.
function EditableFieldShell({
  label,
  isEditing,
  isSaving,
  error,
  displayValue,
  canEdit = true,
  onStartEdit,
  onSave,
  onCancel,
  children,
}: {
  label: string
  isEditing: boolean
  isSaving: boolean
  error: string | null
  displayValue: string
  canEdit?: boolean
  onStartEdit: () => void
  onSave: () => void
  onCancel: () => void
  children: ReactNode
}) {
  if (!canEdit) {
    return <ReadOnlyField label={label} value={displayValue || '-'} />
  }
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-1.5">
        <div className="min-w-0 flex-1">
          {isEditing ? (
            children
          ) : (
            <div className="flex h-8 items-center rounded-lg border border-input bg-muted/30 px-2.5 text-sm text-foreground">
              {displayValue || '-'}
            </div>
          )}
        </div>
        {isEditing && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onCancel}
            disabled={isSaving}
            aria-label="수정 취소"
          >
            <X />
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={isEditing ? onSave : onStartEdit}
          disabled={isSaving}
          aria-label={isEditing ? '저장' : '수정'}
        >
          {isSaving ? (
            <Loader2 className="animate-spin" />
          ) : isEditing ? (
            <Check />
          ) : (
            <Pencil />
          )}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

// 자유 입력 텍스트 필드 (성명, 연락처, 이메일, 생년월일 등)
export function EditableTextField({
  label,
  field,
  value,
  type = 'text',
  nullable = false,
  autoComplete = 'off',
  canEdit = true,
  onSave,
}: {
  label: string
  field: keyof EmployeeUpdatePayload
  value: string | null
  type?: string
  nullable?: boolean
  autoComplete?: string
  canEdit?: boolean
  onSave: SaveFn
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startEdit = () => {
    setDraft(value ?? '')
    setError(null)
    setIsEditing(true)
  }
  const cancelEdit = () => {
    setIsEditing(false)
    setError(null)
  }
  const save = async () => {
    setIsSaving(true)
    setError(null)
    try {
      const trimmed = draft.trim()
      await onSave(field, nullable && trimmed === '' ? null : trimmed)
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <EditableFieldShell
      label={label}
      isEditing={isEditing}
      isSaving={isSaving}
      error={error}
      displayValue={value ?? '-'}
      canEdit={canEdit}
      onStartEdit={startEdit}
      onSave={save}
      onCancel={cancelEdit}
    >
      <Input
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="h-8"
        autoFocus
        autoComplete={autoComplete}
      />
    </EditableFieldShell>
  )
}

// 성별/운전면허/권한/신입-경력처럼, 정해진 문자열 목록 중 하나를 고르는 필드
export function EditableSelectField({
  label,
  field,
  value,
  options,
  canEdit = true,
  onSave,
}: {
  label: string
  field: keyof EmployeeUpdatePayload
  value: string
  options: readonly string[]
  canEdit?: boolean
  onSave: SaveFn
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startEdit = () => {
    setDraft(value)
    setError(null)
    setIsEditing(true)
  }
  const cancelEdit = () => {
    setIsEditing(false)
    setError(null)
  }
  const save = async () => {
    setIsSaving(true)
    setError(null)
    try {
      await onSave(field, draft)
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <EditableFieldShell
      label={label}
      isEditing={isEditing}
      isSaving={isSaving}
      error={error}
      displayValue={value}
      canEdit={canEdit}
      onStartEdit={startEdit}
      onSave={save}
      onCancel={cancelEdit}
    >
      <Select value={draft} onValueChange={(v) => setDraft(v as string)}>
        <SelectTrigger className="h-8 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </EditableFieldShell>
  )
}

// 소속부서/팀/직급/직책/직무/고용형태처럼, 마스터컬렉션 매핑표({_id: 표시값})
// 중 하나를 고르는 필드. 화면엔 이름이 보이지만 실제로 저장되는 값은 _id입니다.
export function EditableMasterSelectField({
  label,
  field,
  value,
  displayValue,
  options,
  canEdit = true,
  onSave,
}: {
  label: string
  field: keyof EmployeeUpdatePayload
  value: string | null
  displayValue: string
  options: Record<string, string>
  canEdit?: boolean
  onSave: SaveFn
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? UNASSIGNED_VALUE)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const items = { [UNASSIGNED_VALUE]: '미지정', ...options }

  const startEdit = () => {
    setDraft(value ?? UNASSIGNED_VALUE)
    setError(null)
    setIsEditing(true)
  }
  const cancelEdit = () => {
    setIsEditing(false)
    setError(null)
  }
  const save = async () => {
    setIsSaving(true)
    setError(null)
    try {
      await onSave(field, draft === UNASSIGNED_VALUE ? null : draft)
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <EditableFieldShell
      label={label}
      isEditing={isEditing}
      isSaving={isSaving}
      error={error}
      displayValue={displayValue}
      canEdit={canEdit}
      onStartEdit={startEdit}
      onSave={save}
      onCancel={cancelEdit}
    >
      <Select
        items={items}
        value={draft}
        onValueChange={(v) => setDraft(v as string)}
      >
        <SelectTrigger className="h-8 w-full">
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
    </EditableFieldShell>
  )
}

// 구사 언어 섹션. 다른 필드들과 달리 값이 여러 개(배열)라서, 섹션 제목 옆의
// 연필 버튼으로 전체를 한 번에 수정 모드로 바꾸고, "언어 추가"로 줄을 늘리거나
// 휴지통 버튼으로 줄을 지운 다음 저장 버튼으로 한꺼번에 저장합니다.
export function EditableLanguagesSection({
  languages,
  canEdit = true,
  onSave,
}: {
  languages: LanguageSkillPayload[]
  canEdit?: boolean
  onSave: (languages: LanguageSkillPayload[]) => Promise<void>
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [draftRows, setDraftRows] = useState<LanguageSkillPayload[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startEdit = () => {
    setDraftRows(languages.map((lang) => ({ ...lang })))
    setError(null)
    setIsEditing(true)
  }
  const cancelEdit = () => {
    setIsEditing(false)
    setError(null)
  }
  const addRow = () => {
    setDraftRows((rows) => [
      ...rows,
      { language: '', level: '', certification: null },
    ])
  }
  const removeRow = (index: number) => {
    setDraftRows((rows) => rows.filter((_, i) => i !== index))
  }
  const updateRow = (index: number, patch: Partial<LanguageSkillPayload>) => {
    setDraftRows((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    )
  }
  const save = async () => {
    setIsSaving(true)
    setError(null)
    try {
      // 언어명/숙련도를 하나라도 비워둔 줄은 저장하지 않습니다.
      const payload = draftRows
        .filter(
          (row) => row.language.trim() !== '' && row.level.trim() !== '',
        )
        .map((row) => ({
          language: row.language.trim(),
          level: row.level.trim(),
          certification:
            row.certification?.trim() === '' ? null : row.certification,
        }))
      await onSave(payload)
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">구사 언어</h3>
        {/* 수정 권한이 없으면(canEdit=false) 연필 버튼 자체를 숨깁니다 */}
        {canEdit &&
          (isEditing ? (
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRow}
              >
                <Plus />
                언어 추가
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={cancelEdit}
                disabled={isSaving}
                aria-label="수정 취소"
              >
                <X />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={save}
                disabled={isSaving}
                aria-label="저장"
              >
                {isSaving ? <Loader2 className="animate-spin" /> : <Check />}
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={startEdit}
              aria-label="수정"
            >
              <Pencil />
            </Button>
          ))}
      </div>

      {!isEditing &&
        (languages.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            등록된 구사 언어가 없습니다.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {languages.map((lang, index) => (
              <div
                key={index}
                className="grid grid-cols-1 gap-2 sm:grid-cols-3"
              >
                <ReadOnlyField label="언어명" value={lang.language} />
                <ReadOnlyField label="숙련도" value={lang.level} />
                <ReadOnlyField
                  label="자격증"
                  value={lang.certification ?? '-'}
                />
              </div>
            ))}
          </div>
        ))}

      {isEditing && (
        <div className="flex flex-col gap-2">
          {draftRows.length === 0 && (
            <p className="text-xs text-muted-foreground">
              등록된 구사 언어가 없습니다. "언어 추가" 버튼으로 추가할 수
              있습니다.
            </p>
          )}
          {draftRows.map((row, index) => (
            <div
              key={index}
              className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]"
            >
              <Input
                aria-label="언어명"
                placeholder="언어명 (예: 영어)"
                value={row.language}
                onChange={(e) =>
                  updateRow(index, { language: e.target.value })
                }
              />
              <Input
                aria-label="숙련도"
                placeholder="숙련도 (예: 유창함)"
                value={row.level}
                onChange={(e) => updateRow(index, { level: e.target.value })}
              />
              <Input
                aria-label="자격증"
                placeholder="자격증 (선택)"
                value={row.certification ?? ''}
                onChange={(e) =>
                  updateRow(index, { certification: e.target.value })
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeRow(index)}
                aria-label="언어 삭제"
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
