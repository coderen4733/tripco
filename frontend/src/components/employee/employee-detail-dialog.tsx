// 임직원 목록에서 행을 클릭하면 뜨는 상세 조회 다이얼로그입니다.
// '사원 추가' 폼과 같은 레이아웃을 쓰되, 대부분의 값은 각 칸 오른쪽의
// 연필(수정) 버튼을 눌러 바로 그 자리에서 고치고 저장할 수 있습니다.
// (구사 언어 / 시스템 정보 / 입사문서·결재 관련 파일은 읽기 전용으로 남겨둡니다)
import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  AlertCircle,
  Check,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { apiFetch, ApiError } from '@/lib/api'
import { resolveLabel } from '@/lib/master-maps'
import {
  ADMIN_ROLE_OPTIONS,
  DRIVER_LICENSE_OPTIONS,
  EXP_LEVEL_OPTIONS,
  GENDER_OPTIONS,
  UNASSIGNED_VALUE,
} from '@/config/employee-options'
import type {
  EmployeeDetail,
  EmployeeUpdatePayload,
  LanguageSkillPayload,
  MasterMaps,
} from '@/types/employee'

// created_at/updated_at/deleted_at처럼 ISO 날짜 문자열로 오는 값을
// "2026.08.12 13:21" 형태로 보기 좋게 바꿔줍니다.
function formatDateTime(value: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date
    .toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
    .replace(/\. /g, '.')
    .replace(/\.$/, '')
}

interface EmployeeDetailDialogProps {
  // 상세 조회할 임직원의 _id. null이면 다이얼로그가 닫힌 상태입니다.
  employeeId: string | null
  masterMaps: MasterMaps | null
  onClose: () => void
  // 항목을 수정/저장하면 목록/통계도 최신 상태로 맞추기 위해 호출합니다.
  onUpdated: () => void
}

export function EmployeeDetailDialog({
  employeeId,
  masterMaps,
  onClose,
  onUpdated,
}: EmployeeDetailDialogProps) {
  const [detail, setDetail] = useState<EmployeeDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // 상세 정보를 (다시) 받아옵니다. 최초 진입 시, 그리고 항목을 저장한 직후에 씁니다.
  const loadDetail = useCallback(async () => {
    if (!employeeId) return
    const data = await apiFetch<EmployeeDetail>(`/employees/${employeeId}`)
    setDetail(data)
  }, [employeeId])

  useEffect(() => {
    if (!employeeId) {
      setDetail(null)
      setError(null)
      return
    }
    let cancelled = false
    setIsLoading(true)
    setError(null)
    setDetail(null)
    loadDetail()
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : '임직원 상세 정보를 불러오는 중 알 수 없는 오류가 발생했습니다.',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [employeeId, loadDetail])

  // 항목 하나를 수정해서 저장할 때 호출됩니다. (PUT /employees/{_id}는 부분 수정이라
  // 실제로 보낸 필드만 반영되므로, 여러 EditableField가 이 함수를 공유해도 안전합니다)
  const saveFields = useCallback(
    async (partial: EmployeeUpdatePayload) => {
      if (!employeeId) return
      await apiFetch(`/employees/${employeeId}`, {
        method: 'PUT',
        body: JSON.stringify(partial),
      })
      // 저장된 최신 값을 다시 받아와 화면/목록에 반영합니다.
      await loadDetail()
      onUpdated()
    },
    [employeeId, loadDetail, onUpdated],
  )

  // 값 1개짜리 필드(EditableTextField/EditableSelectField/EditableMasterSelectField)용
  const handleFieldSave = useCallback(
    (field: keyof EmployeeUpdatePayload, value: string | null) =>
      saveFields({ [field]: value } as EmployeeUpdatePayload),
    [saveFields],
  )

  // 구사 언어(배열) 전체를 통째로 저장할 때 씁니다
  const handleLanguagesSave = useCallback(
    (languages: LanguageSkillPayload[]) => saveFields({ languages }),
    [saveFields],
  )

  return (
    <Dialog
      open={employeeId !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>임직원 상세 정보</DialogTitle>
          <DialogDescription>
            {detail
              ? `${detail.name_kor}(${detail.employee_id}) 임직원의 상세 정보입니다.`
              : '임직원의 상세 정보를 불러옵니다.'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {isLoading && <DetailSkeleton />}

        {!isLoading && detail && masterMaps && (
          <div className="flex flex-col gap-6">
            <FormSection title="계정 정보">
              <EditableTextField
                label="아이디"
                field="login_id"
                value={detail.login_id}
                onSave={handleFieldSave}
              />
              <EditableSelectField
                label="권한"
                field="admin_role"
                value={detail.admin_role}
                options={ADMIN_ROLE_OPTIONS}
                onSave={handleFieldSave}
              />
            </FormSection>

            <Separator />

            <FormSection title="기본 정보">
              <EditableTextField
                label="성명"
                field="name_kor"
                value={detail.name_kor}
                onSave={handleFieldSave}
              />
              <EditableTextField
                label="성명(영어)"
                field="name_eng"
                value={detail.name_eng}
                onSave={handleFieldSave}
              />
              <EditableTextField
                label="성명(일본어)"
                field="name_jpn"
                value={detail.name_jpn}
                nullable
                onSave={handleFieldSave}
              />
              <EditableTextField
                label="성명(중국어)"
                field="name_chn"
                value={detail.name_chn}
                nullable
                onSave={handleFieldSave}
              />
              <EditableSelectField
                label="성별"
                field="gender"
                value={detail.gender}
                options={GENDER_OPTIONS}
                onSave={handleFieldSave}
              />
              <EditableTextField
                label="생년월일"
                field="birth_date"
                value={detail.birth_date}
                type="date"
                onSave={handleFieldSave}
              />
              <EditableTextField
                label="연락처(휴대전화)"
                field="phone_number"
                value={detail.phone_number}
                type="tel"
                onSave={handleFieldSave}
              />
              <EditableTextField
                label="주소(거주지)"
                field="address"
                value={detail.address}
                nullable
                onSave={handleFieldSave}
              />
              <EditableTextField
                label="이메일(개인)"
                field="email"
                value={detail.email}
                type="email"
                onSave={handleFieldSave}
              />
              <EditableTextField
                label="이메일(회사)"
                field="email_company"
                value={detail.email_company}
                type="email"
                nullable
                onSave={handleFieldSave}
              />
              <EditableTextField
                label="데스크번호"
                field="desk_number"
                value={detail.desk_number}
                nullable
                onSave={handleFieldSave}
              />
            </FormSection>

            <Separator />

            <FormSection title="인사 정보">
              <EditableTextField
                label="사번"
                field="employee_id"
                value={detail.employee_id}
                onSave={handleFieldSave}
              />
              <EditableMasterSelectField
                label="소속부서"
                field="dept_id"
                value={detail.dept_id}
                displayValue={resolveLabel(
                  masterMaps.departments,
                  detail.dept_id,
                )}
                options={masterMaps.departments}
                onSave={handleFieldSave}
              />
              <EditableMasterSelectField
                label="소속팀"
                field="team_id"
                value={detail.team_id}
                displayValue={resolveLabel(masterMaps.teams, detail.team_id)}
                options={masterMaps.teams}
                onSave={handleFieldSave}
              />
              <EditableMasterSelectField
                label="직급/직위"
                field="position_id"
                value={detail.position_id}
                displayValue={resolveLabel(
                  masterMaps.positions,
                  detail.position_id,
                )}
                options={masterMaps.positions}
                onSave={handleFieldSave}
              />
              <EditableMasterSelectField
                label="직책"
                field="title_id"
                value={detail.title_id}
                displayValue={resolveLabel(
                  masterMaps.titles,
                  detail.title_id,
                )}
                options={masterMaps.titles}
                onSave={handleFieldSave}
              />
              <EditableMasterSelectField
                label="직무"
                field="duty_id"
                value={detail.duty_id}
                displayValue={resolveLabel(masterMaps.duties, detail.duty_id)}
                options={masterMaps.duties}
                onSave={handleFieldSave}
              />
              <EditableMasterSelectField
                label="고용형태"
                field="employment_type"
                value={detail.employment_type}
                displayValue={resolveLabel(
                  masterMaps.employment_types,
                  detail.employment_type,
                )}
                options={masterMaps.employment_types}
                onSave={handleFieldSave}
              />
              <EditableSelectField
                label="신입/경력 여부"
                field="exp_level"
                value={detail.exp_level ?? '신입'}
                options={EXP_LEVEL_OPTIONS}
                onSave={handleFieldSave}
              />
            </FormSection>

            <Separator />

            <FormSection title="보유 능력">
              <EditableSelectField
                label="운전면허"
                field="driver_license_type"
                value={detail.driver_license_type}
                options={DRIVER_LICENSE_OPTIONS}
                onSave={handleFieldSave}
              />
              <EditableTextField
                label="보유 차량 종류"
                field="owned_vehicle"
                value={detail.owned_vehicle}
                nullable
                onSave={handleFieldSave}
              />
              <EditableTextField
                label="보유 차량 번호"
                field="owned_vehicle_number"
                value={detail.owned_vehicle_number}
                nullable
                onSave={handleFieldSave}
              />
            </FormSection>

            {/* 구사 언어는 운전면허 등과 함께 '보유 능력'에 속하므로 구분선을 넣지 않습니다 */}
            <EditableLanguagesSection
              languages={detail.languages}
              onSave={handleLanguagesSave}
            />

            <Separator />

            <FormSection title="시스템 정보">
              <ReadOnlyField
                label="입사일"
                value={formatDateTime(detail.created_at)}
              />
              <ReadOnlyField
                label="최근 수정일"
                value={formatDateTime(detail.updated_at)}
              />
              <ReadOnlyField
                label="퇴사일"
                value={formatDateTime(detail.deleted_at)}
              />
            </FormSection>

            <Separator />

            {/* 입사문서/결재 관련 파일은 한 행에 하나씩 배치합니다 */}
            <FileListSection title="입사문서 파일">
              <ReadOnlyFileField
                label="주민등록등본"
                url={detail.resident_registration_url}
              />
              <ReadOnlyFileField
                label="최종 학력 증명 서류"
                url={detail.graduation_certificate_url}
              />
              <ReadOnlyFileField
                label="성적 증명 서류"
                url={detail.transcript_url}
              />
              <ReadOnlyFileField
                label="이전 직장 경력 증빙 서류"
                url={detail.career_certificate_url}
              />
              <ReadOnlyFileField
                label="근로계약서"
                url={detail.employment_contract_url}
              />
            </FileListSection>

            <Separator />

            <FileListSection title="결재 관련 파일">
              <ReadOnlyFileField label="결재 사인" url={detail.signature_url} />
              <ReadOnlyFileField
                label="결재 인감"
                url={detail.registered_seal_url}
              />
            </FileListSection>
          </div>
        )}

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            닫기
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  )
}

// 폼 안에서 항목들을 묶어 제목을 붙이는 섹션 컨테이너 (사원 추가 폼과 동일한 레이아웃)
function FormSection({
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
// (구사 언어 / 시스템 정보처럼 이 다이얼로그에서 수정을 지원하지 않는 항목에 씁니다)
function ReadOnlyField({ label, value }: { label: string; value: string }) {
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
function FileListSection({
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

// 파일 업로드 메뉴가 아직 없어서 대부분 값이 비어있습니다.
// url이 있으면 새 탭에서 열어볼 수 있는 링크로, 없으면 대시(-)로 보여줍니다.
function ReadOnlyFileField({
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

type SaveFn = (
  field: keyof EmployeeUpdatePayload,
  value: string | null,
) => Promise<void>

// 수정 가능한 필드의 공통 뼈대: 평소엔 값만 보여주다가, 연필 버튼을 누르면
// 입력칸 + 저장 버튼으로 바뀌고, 저장이 끝나면 다시 평소 모습으로 돌아옵니다.
function EditableFieldShell({
  label,
  isEditing,
  isSaving,
  error,
  displayValue,
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
  onStartEdit: () => void
  onSave: () => void
  onCancel: () => void
  children: ReactNode
}) {
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
function EditableTextField({
  label,
  field,
  value,
  type = 'text',
  nullable = false,
  onSave,
}: {
  label: string
  field: keyof EmployeeUpdatePayload
  value: string | null
  type?: string
  nullable?: boolean
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
      />
    </EditableFieldShell>
  )
}

// 성별/운전면허/권한/신입-경력처럼, 정해진 문자열 목록 중 하나를 고르는 필드
function EditableSelectField({
  label,
  field,
  value,
  options,
  onSave,
}: {
  label: string
  field: keyof EmployeeUpdatePayload
  value: string
  options: readonly string[]
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
function EditableMasterSelectField({
  label,
  field,
  value,
  displayValue,
  options,
  onSave,
}: {
  label: string
  field: keyof EmployeeUpdatePayload
  value: string | null
  displayValue: string
  options: Record<string, string>
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
function EditableLanguagesSection({
  languages,
  onSave,
}: {
  languages: LanguageSkillPayload[]
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
        {isEditing ? (
          <div className="flex items-center gap-1.5">
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
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
        )}
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
