// '사원 추가'(관리자용)와 '사원 등록 신청'(신규 계정 신청, 비로그인용) 두
// 폼이 완전히 같은 항목/검증 로직을 쓰기 때문에, 실제 입력 폼 하나를
// 여기 공용 컴포넌트로 만들어두고 mode props로 동작만 갈라지게 했습니다.
// - mode="create": 관리자가 사원 추가 다이얼로그에서 씀 (POST /employees/)
// - mode="sign-up": 로그인 전 사용자가 신규 계정 신청 다이얼로그에서 씀
//   (POST /auth/sign-up, 승인 전까지는 employee_registrations에 대기)
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import { AlertCircle, CheckCircle2, Plus, Send, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DialogClose, DialogFooter } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { apiFetch, ApiError } from '@/lib/api'
import { findIdByLabel } from '@/lib/master-maps'
import {
  uploadEmployeeProfileImage,
  uploadRegistrationProfileImage,
} from '@/lib/employee-profile-image'
import type { EmployeeCreatePayload, MasterMaps } from '@/types/employee'
import {
  DRIVER_LICENSE_OPTIONS,
  GENDER_OPTIONS,
  UNASSIGNED_VALUE,
} from '@/config/employee-options'
import { ProfileAvatarUpload } from '@/components/employee/profile-avatar-upload'

// 소속부서/소속팀/직급/직책/직무/고용형태의 기본값입니다. "미지정" 대신
// 처음부터 이 값들이 선택되어 있고, 아래 드롭다운에서 "미지정"은 아예
// 고를 수 없도록 뺐습니다. (마스터컬렉션의 _id는 매번 새로 생성되므로,
// 여기서는 이름만 정해두고 실제 _id는 마스터 매핑표가 도착한 뒤 찾습니다)
const DEFAULT_ORG_LABELS = {
  dept_id: '소속없음',
  team_id: '소속없음',
  position_id: '임시대기',
  title_id: '팀원',
  duty_id: '임시대기',
  employment_type: '보류',
} as const

interface LanguageRow {
  language: string
  level: string
  certification: string
}

// 폼 안에서만 쓰는 입력 상태입니다.
// password_confirm은 백엔드로 보내지 않고, 프론트에서 비밀번호 일치 확인용으로만 씁니다.
interface FormState {
  login_id: string
  password: string
  password_confirm: string
  name_kor: string
  name_eng: string
  name_jpn: string
  name_chn: string
  gender: string
  birth_date: string // <input type="date"> 값 = "1998-02-01" 형태 그대로
  phone_number: string
  address: string
  email: string
  email_company: string
  desk_number: string
  employee_id: string
  dept_id: string | null
  team_id: string | null
  position_id: string | null
  title_id: string | null
  duty_id: string | null
  employment_type: string | null
  exp_level: '신입' | '경력'
  driver_license_type: string
  owned_vehicle: string
  owned_vehicle_number: string
  languages: LanguageRow[]
}

function createInitialFormState(): FormState {
  return {
    login_id: '',
    password: '',
    password_confirm: '',
    name_kor: '',
    name_eng: '',
    name_jpn: '',
    name_chn: '',
    gender: '기타',
    birth_date: '',
    phone_number: '',
    address: '',
    email: '',
    email_company: '',
    desk_number: '',
    employee_id: '',
    dept_id: null,
    team_id: null,
    position_id: null,
    title_id: null,
    duty_id: null,
    employment_type: null,
    exp_level: '신입',
    driver_license_type: '무면허',
    owned_vehicle: '',
    owned_vehicle_number: '',
    languages: [],
  }
}

// 필수 입력 항목들을 순서대로 검사해서, 문제가 있으면 첫 번째 에러 메시지를 돌려줍니다.
function validate(form: FormState): string | null {
  if (form.login_id.trim().length < 3) {
    return '아이디는 3자 이상 입력해야 합니다.'
  }
  if (form.password.length < 8) {
    return '비밀번호는 8자 이상 입력해야 합니다.'
  }
  if (form.password !== form.password_confirm) {
    return '비밀번호와 비밀번호 확인이 일치하지 않습니다.'
  }
  if (form.name_kor.trim().length < 2) {
    return '성명을 2자 이상 입력해야 합니다.'
  }
  if (form.name_eng.trim().length < 2) {
    return '성명(영어)을 2자 이상 입력해야 합니다.'
  }
  if (!form.birth_date) {
    return '생년월일을 입력해야 합니다.'
  }
  if (!form.phone_number.trim()) {
    return '연락처(휴대전화)를 입력해야 합니다.'
  }
  if (form.email.trim().length < 7) {
    return '이메일(개인)을 올바르게 입력해야 합니다.'
  }
  if (form.employee_id.trim().length < 8) {
    return '사번은 8자 이상 입력해야 합니다.'
  }
  return null
}

// 빈 문자열은 "입력 안 함"으로 보고 null로 바꿔서 보냅니다.
function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

// 화면 상태(FormState)를 백엔드 EmployeeCreateReq 형태의 payload로 변환합니다.
// (사원 추가/신규 계정 신청 둘 다 같은 EmployeeCreateReq 스키마를 씁니다)
function buildPayload(form: FormState): EmployeeCreatePayload {
  return {
    login_id: form.login_id.trim(),
    password: form.password,
    name_kor: form.name_kor.trim(),
    name_eng: form.name_eng.trim(),
    name_jpn: emptyToNull(form.name_jpn),
    name_chn: emptyToNull(form.name_chn),
    gender: form.gender,
    birth_date: form.birth_date,
    phone_number: form.phone_number.trim(),
    address: emptyToNull(form.address),
    email: form.email.trim(),
    email_company: emptyToNull(form.email_company),
    desk_number: emptyToNull(form.desk_number),
    employee_id: form.employee_id.trim(),
    dept_id: form.dept_id,
    team_id: form.team_id,
    position_id: form.position_id,
    title_id: form.title_id,
    duty_id: form.duty_id,
    employment_type: form.employment_type,
    exp_level: form.exp_level,
    driver_license_type: form.driver_license_type,
    owned_vehicle: emptyToNull(form.owned_vehicle),
    owned_vehicle_number: emptyToNull(form.owned_vehicle_number),
    // 언어명/숙련도를 하나라도 비워둔 줄은 보내지 않습니다.
    languages: form.languages
      .filter((row) => row.language.trim() !== '' && row.level.trim() !== '')
      .map((row) => ({
        language: row.language.trim(),
        level: row.level.trim(),
        certification: emptyToNull(row.certification),
      })),
  }
}

interface EmployeeApplicationFormProps {
  // create: 관리자가 사원을 바로 등록 (POST /employees/)
  // sign-up: 신규 계정 신청, 관리자 승인 대기 (POST /auth/sign-up)
  mode: 'create' | 'sign-up'
  // 소속부서/팀/직급/직책/직무/고용형태 드롭다운을 채울 마스터컬렉션 매핑표
  masterMaps: MasterMaps | null
  // 폼이 완전히 끝났을 때(생성 성공 / 신청 완료 화면에서 닫기) 호출됩니다.
  // 호출부는 보통 여기서 다이얼로그를 닫고, 필요하면 목록을 새로고침합니다.
  onSuccess: () => void
}

export function EmployeeApplicationForm({
  mode,
  masterMaps,
  onSuccess,
}: EmployeeApplicationFormProps) {
  const [form, setForm] = useState<FormState>(createInitialFormState)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  // mode="sign-up"일 때, 신청이 끝나면 폼 대신 접수 완료 안내를 보여줍니다.
  const [isDone, setIsDone] = useState(false)
  // 크롭까지 마친 프로필 사진(아직 업로드 전). 실제로 저장이 된 뒤에야
  // (사번 conflict가 없다는 게 확인된 뒤) S3로 올리므로, 그 전까지는
  // 화면 미리보기용으로만 들고 있습니다.
  const [profileImageBlob, setProfileImageBlob] = useState<Blob | null>(null)
  const [profileImagePreviewUrl, setProfileImagePreviewUrl] = useState<
    string | null
  >(null)

  const updateField = <K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // 마스터 매핑표가 도착하면(사원 추가 폼은 이미 로드된 상태로, 신규 계정
  // 신청 폼은 다이얼로그가 열린 뒤 비동기로 도착), 소속부서/소속팀/직급/
  // 직책/직무/고용형태의 기본값을 한 번만 채워 넣습니다. 사용자가 이미
  // 값을 바꿔둔 뒤라면 덮어쓰지 않도록 ref로 최초 1회만 실행합니다.
  const appliedDefaultsRef = useRef(false)
  useEffect(() => {
    if (!masterMaps || appliedDefaultsRef.current) return
    appliedDefaultsRef.current = true
    setForm((prev) => ({
      ...prev,
      dept_id:
        prev.dept_id ??
        findIdByLabel(masterMaps.departments, DEFAULT_ORG_LABELS.dept_id),
      team_id:
        prev.team_id ??
        findIdByLabel(masterMaps.teams, DEFAULT_ORG_LABELS.team_id),
      position_id:
        prev.position_id ??
        findIdByLabel(masterMaps.positions, DEFAULT_ORG_LABELS.position_id),
      title_id:
        prev.title_id ??
        findIdByLabel(masterMaps.titles, DEFAULT_ORG_LABELS.title_id),
      duty_id:
        prev.duty_id ??
        findIdByLabel(masterMaps.duties, DEFAULT_ORG_LABELS.duty_id),
      employment_type:
        prev.employment_type ??
        findIdByLabel(
          masterMaps.employment_types,
          DEFAULT_ORG_LABELS.employment_type,
        ),
    }))
  }, [masterMaps])

  // 크롭 다이얼로그에서 "적용"을 누르면 호출됩니다.
  const handleProfileImageCropped = (blob: Blob) => {
    setProfileImageBlob(blob)
    setProfileImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(blob)
    })
  }

  // 비밀번호 확인 칸 아래에 실시간으로 보여줄 안내 문구입니다.
  // 비밀번호를 아직 입력하지 않았다면(양쪽 다 빈 칸) 굳이 보여주지 않습니다.
  const passwordConfirmError = !form.password
    ? null
    : !form.password_confirm
      ? '비밀번호 확인을 입력해주세요.'
      : form.password_confirm !== form.password
        ? '비밀번호와 비밀번호 확인이 일치하지 않습니다.'
        : null

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    const validationError = validate(form)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setIsSubmitting(true)
    try {
      // 1. 먼저 MongoDB에 저장한다 (사번/아이디 중복 여부가 여기서 확정됨)
      // - create: employees 컬렉션에 바로 저장
      // - sign-up: employee_registrations(승인 대기 명단)에 저장
      const endpoint = mode === 'create' ? '/employees/' : '/auth/sign-up'
      const created = await apiFetch<{ _id: string }>(endpoint, {
        method: 'POST',
        body: JSON.stringify(buildPayload(form)),
      })
      // 2. 저장이 성공했을 때만, 그 뒤에 프로필 사진을 S3로 올린다.
      if (profileImageBlob) {
        try {
          if (mode === 'create') {
            await uploadEmployeeProfileImage(created._id, profileImageBlob)
          } else {
            await uploadRegistrationProfileImage(
              created._id,
              profileImageBlob,
            )
          }
        } catch (uploadErr) {
          // 등록/신청 자체는 이미 성공했으므로 실패로 처리하지 않는다.
          console.error('프로필 사진 업로드 실패:', uploadErr)
        }
      }
      if (mode === 'create') {
        onSuccess()
      } else {
        // 신규 계정 신청은 바로 로그인할 수 있는 게 아니라 승인 대기이므로,
        // 폼을 닫는 대신 접수 완료 안내로 바꿔서 보여준다.
        setIsDone(true)
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : mode === 'create'
            ? '사원 등록 중 알 수 없는 오류가 발생했습니다.'
            : '신청 중 알 수 없는 오류가 발생했습니다.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isDone) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 className="h-10 w-10 text-primary" />
        <div>
          <p className="font-semibold text-foreground">
            신청이 접수되었습니다.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            관리자 승인 후 로그인하실 수 있습니다.
          </p>
        </div>
        <Button type="button" onClick={onSuccess} className="mt-2 w-full">
          닫기
        </Button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      autoComplete="off"
      className="flex flex-col gap-6"
    >
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <FormSection title="계정 정보">
        <TextField
          id="login_id"
          label="아이디"
          required
          value={form.login_id}
          onChange={(v) => updateField('login_id', v)}
          placeholder="영문/숫자 3자 이상"
          className="sm:col-span-2"
          autoComplete="off"
        />
        <TextField
          id="password"
          label="비밀번호"
          required
          type="password"
          value={form.password}
          onChange={(v) => updateField('password', v)}
          placeholder="8자 이상"
          autoComplete="new-password"
        />
        <TextField
          id="password_confirm"
          label="비밀번호 확인"
          required
          type="password"
          value={form.password_confirm}
          onChange={(v) => updateField('password_confirm', v)}
          placeholder="비밀번호를 한 번 더 입력하세요"
          error={passwordConfirmError}
          autoComplete="new-password"
        />
      </FormSection>

      <Separator />

      <FormSection title="기본 정보">
        <div className="sm:col-span-2">
          <ProfileAvatarUpload
            name={form.name_kor}
            imageUrl={profileImagePreviewUrl}
            onCropped={handleProfileImageCropped}
          />
        </div>
        <TextField
          id="name_kor"
          label="성명"
          required
          value={form.name_kor}
          onChange={(v) => updateField('name_kor', v)}
        />
        <TextField
          id="name_eng"
          label="성명(영어)"
          required
          value={form.name_eng}
          onChange={(v) => updateField('name_eng', v)}
        />
        <TextField
          id="name_jpn"
          label="성명(일본어)"
          value={form.name_jpn}
          onChange={(v) => updateField('name_jpn', v)}
        />
        <TextField
          id="name_chn"
          label="성명(중국어)"
          value={form.name_chn}
          onChange={(v) => updateField('name_chn', v)}
        />
        <SimpleSelect
          id="gender"
          label="성별"
          value={form.gender}
          onChange={(v) => updateField('gender', v)}
          options={GENDER_OPTIONS}
        />
        <TextField
          id="birth_date"
          label="생년월일"
          required
          type="date"
          value={form.birth_date}
          onChange={(v) => updateField('birth_date', v)}
        />
        <TextField
          id="phone_number"
          label="연락처(휴대전화)"
          required
          type="tel"
          value={form.phone_number}
          onChange={(v) => updateField('phone_number', v)}
          placeholder="010-1234-1234"
        />
        <TextField
          id="address"
          label="주소(거주지)"
          value={form.address}
          onChange={(v) => updateField('address', v)}
        />
        <TextField
          id="email"
          label="이메일(개인)"
          required
          type="email"
          value={form.email}
          onChange={(v) => updateField('email', v)}
        />
        <TextField
          id="email_company"
          label="이메일(회사)"
          type="email"
          value={form.email_company}
          onChange={(v) => updateField('email_company', v)}
        />
        <TextField
          id="desk_number"
          label="데스크번호"
          value={form.desk_number}
          onChange={(v) => updateField('desk_number', v)}
        />
      </FormSection>

      <Separator />

      <FormSection title="인사 정보">
        <TextField
          id="employee_id"
          label="사번"
          required
          value={form.employee_id}
          onChange={(v) => updateField('employee_id', v)}
          placeholder="8자 이상"
        />
        <MasterSelect
          id="dept_id"
          label="소속부서"
          value={form.dept_id}
          onChange={(v) => updateField('dept_id', v)}
          options={masterMaps?.departments ?? {}}
          allowUnassigned={false}
        />
        <MasterSelect
          id="team_id"
          label="소속팀"
          value={form.team_id}
          onChange={(v) => updateField('team_id', v)}
          options={masterMaps?.teams ?? {}}
          allowUnassigned={false}
        />
        <MasterSelect
          id="position_id"
          label="직급/직위"
          value={form.position_id}
          onChange={(v) => updateField('position_id', v)}
          options={masterMaps?.positions ?? {}}
          allowUnassigned={false}
        />
        <MasterSelect
          id="title_id"
          label="직책"
          value={form.title_id}
          onChange={(v) => updateField('title_id', v)}
          options={masterMaps?.titles ?? {}}
          allowUnassigned={false}
        />
        <MasterSelect
          id="duty_id"
          label="직무"
          value={form.duty_id}
          onChange={(v) => updateField('duty_id', v)}
          options={masterMaps?.duties ?? {}}
          allowUnassigned={false}
        />
        <MasterSelect
          id="employment_type"
          label="고용형태"
          value={form.employment_type}
          onChange={(v) => updateField('employment_type', v)}
          options={masterMaps?.employment_types ?? {}}
          allowUnassigned={false}
        />
        <div className="flex flex-col gap-1.5">
          <Label>신입/경력 여부</Label>
          <div className="flex h-8 items-center gap-2.5">
            <button
              type="button"
              onClick={() => updateField('exp_level', '신입')}
              className={cn(
                'text-sm',
                form.exp_level === '신입'
                  ? 'font-semibold text-foreground'
                  : 'text-muted-foreground',
              )}
            >
              신입
            </button>
            <Switch
              checked={form.exp_level === '경력'}
              onCheckedChange={(checked) =>
                updateField('exp_level', checked ? '경력' : '신입')
              }
            />
            <button
              type="button"
              onClick={() => updateField('exp_level', '경력')}
              className={cn(
                'text-sm',
                form.exp_level === '경력'
                  ? 'font-semibold text-foreground'
                  : 'text-muted-foreground',
              )}
            >
              경력
            </button>
          </div>
        </div>
      </FormSection>

      <Separator />

      <FormSection title="보유 능력">
        <SimpleSelect
          id="driver_license_type"
          label="운전면허"
          value={form.driver_license_type}
          onChange={(v) => updateField('driver_license_type', v)}
          options={DRIVER_LICENSE_OPTIONS}
        />
        <TextField
          id="owned_vehicle"
          label="보유 차량 종류"
          value={form.owned_vehicle}
          onChange={(v) => updateField('owned_vehicle', v)}
        />
        <TextField
          id="owned_vehicle_number"
          label="보유 차량 번호"
          value={form.owned_vehicle_number}
          onChange={(v) => updateField('owned_vehicle_number', v)}
        />
      </FormSection>

      {/* 구사 언어는 운전면허 등과 함께 '보유 능력'에 속하므로 구분선을 넣지 않습니다 */}
      <LanguageRows
        rows={form.languages}
        onChange={(rows) => updateField('languages', rows)}
      />

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          취소
        </DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {mode === 'create' ? <Plus /> : <Send />}
          {isSubmitting
            ? mode === 'create'
              ? '생성 중...'
              : '신청 중...'
            : mode === 'create'
              ? '생성'
              : '신청'}
        </Button>
      </DialogFooter>
    </form>
  )
}

// 폼 안에서 항목들을 묶어 제목을 붙이는 섹션 컨테이너
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

// 필수 항목이면 라벨 옆에 빨간 * 표시를 붙여주는 라벨
function FieldLabel({
  htmlFor,
  required,
  children,
}: {
  htmlFor: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <Label htmlFor={htmlFor}>
      {children}
      {required && <span className="text-destructive">*</span>}
    </Label>
  )
}

// 텍스트/비밀번호/날짜/전화번호/이메일 등 일반 입력칸
function TextField({
  id,
  label,
  required,
  type = 'text',
  value,
  onChange,
  placeholder,
  className,
  error,
  autoComplete,
}: {
  id: string
  label: string
  required?: boolean
  type?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  error?: string | null
  autoComplete?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

// 성별/운전면허처럼 고정된 문자열 목록 중 하나를 고르는 드롭다운
function SimpleSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: readonly string[]
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={(v) => onChange(v as string)}>
        <SelectTrigger id={id} className="w-full">
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
    </div>
  )
}

// 소속부서/팀/직급/직책/직무/고용형태처럼 마스터컬렉션 매핑표({_id: 표시값})를
// 보여주고 고르는 드롭다운. 화면에는 표시값(이름)이 보이지만, 실제 선택되는
// 값은 그 이름에 대응하는 _id입니다.
function MasterSelect({
  id,
  label,
  value,
  onChange,
  options,
  allowUnassigned = true,
}: {
  id: string
  label: string
  value: string | null
  onChange: (value: string | null) => void
  options: Record<string, string>
  // false면 "미지정" 선택지를 아예 빼서 고를 수 없게 합니다.
  // (소속부서/소속팀/직급/직책/직무/고용형태는 기본값이 미리 채워지므로
  // 미지정으로 되돌릴 필요가 없습니다)
  allowUnassigned?: boolean
}) {
  // Select는 선택된 value(=_id)만 알기 때문에, 화면에 어떤 이름을 보여줘야
  // 하는지는 items로 따로 알려줘야 합니다. 이게 없으면 SelectValue가
  // "패키지부" 대신 _id 문자열을 그대로 보여줍니다.
  const items = allowUnassigned
    ? { [UNASSIGNED_VALUE]: '미지정', ...options }
    : options

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
          {allowUnassigned && (
            <SelectItem value={UNASSIGNED_VALUE}>미지정</SelectItem>
          )}
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

// 구사 언어를 여러 개 추가/삭제할 수 있는 반복 입력 영역
function LanguageRows({
  rows,
  onChange,
}: {
  rows: LanguageRow[]
  onChange: (rows: LanguageRow[]) => void
}) {
  const updateRow = (index: number, patch: Partial<LanguageRow>) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }
  const removeRow = (index: number) => {
    onChange(rows.filter((_, i) => i !== index))
  }
  const addRow = () => {
    onChange([...rows, { language: '', level: '', certification: '' }])
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">구사 언어</h3>
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus />
          언어 추가
        </Button>
      </div>

      {rows.length === 0 && (
        <p className="text-xs text-muted-foreground">
          등록된 구사 언어가 없습니다. "언어 추가" 버튼으로 추가할 수
          있습니다.
        </p>
      )}

      {rows.map((row, index) => (
        <div
          key={index}
          className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]"
        >
          <Input
            aria-label="언어명"
            placeholder="언어명 (예: 영어)"
            value={row.language}
            onChange={(e) => updateRow(index, { language: e.target.value })}
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
            value={row.certification}
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
  )
}
