// 임직원 목록에서 행을 클릭하면 뜨는 상세 조회 다이얼로그입니다.
// '사원 추가' 폼과 같은 레이아웃을 쓰되, 대부분의 값은 각 칸 오른쪽의
// 연필(수정) 버튼을 눌러 바로 그 자리에서 고치고 저장할 수 있습니다.
// (구사 언어 / 시스템 정보 / 입사문서·결재 관련 파일은 읽기 전용으로 남겨둡니다)
import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, KeyRound, Loader2 } from 'lucide-react'
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
import { apiFetch, ApiError } from '@/lib/api'
import { resolveLabel } from '@/lib/master-maps'
import { uploadEmployeeProfileImage } from '@/lib/employee-profile-image'
import { ProfileAvatarUpload } from '@/components/employee/profile-avatar-upload'
import {
  DetailSkeleton,
  EditableLanguagesSection,
  EditableMasterSelectField,
  EditableSelectField,
  EditableTextField,
  FileListSection,
  formatDateTime,
  FormSection,
  ReadOnlyField,
  ReadOnlyFileField,
} from '@/components/employee/editable-detail-fields'
import { useAuth } from '@/contexts/auth-context'
import {
  ADMIN_ROLE_OPTIONS,
  canManageEmployees,
  DRIVER_LICENSE_OPTIONS,
  EXP_LEVEL_OPTIONS,
  GENDER_OPTIONS,
} from '@/config/employee-options'
import type {
  EmployeeDetail,
  EmployeeUpdatePayload,
  LanguageSkillPayload,
  MasterMaps,
} from '@/types/employee'

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
  // 권한 체계: 타인의 정보 수정은 최고관리자/관리자/부관리자만 가능하고,
  // 본인("내 정보") 수정은 예외적으로 누구나 가능합니다. 다만 권한 등급
  // (admin_role) 자체는 본인이라도 관리 권한이 있어야만 바꿀 수 있습니다.
  const { employeeId: myEmployeeId, me: currentUser } = useAuth()
  const isOwn = employeeId !== null && employeeId === myEmployeeId
  const canManage = canManageEmployees(currentUser?.admin_role)
  const canEdit = isOwn || canManage

  const [detail, setDetail] = useState<EmployeeDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isUploadingProfileImage, setIsUploadingProfileImage] =
    useState(false)
  const [profileImageError, setProfileImageError] = useState<string | null>(
    null,
  )
  // "비밀번호 변경" 버튼을 누르면 펼쳐지는 작은 패널의 상태입니다.
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  // 다른 임직원을 선택하거나 다이얼로그를 닫으면 비밀번호 변경 패널도 초기화합니다.
  const resetPasswordChange = () => {
    setIsChangingPassword(false)
    setNewPassword('')
    setNewPasswordConfirm('')
    setPasswordError(null)
  }

  // 상세 정보를 (다시) 받아옵니다. 최초 진입 시, 그리고 항목을 저장한 직후에 씁니다.
  const loadDetail = useCallback(async () => {
    if (!employeeId) return
    const data = await apiFetch<EmployeeDetail>(`/employees/${employeeId}`)
    setDetail(data)
  }, [employeeId])

  useEffect(() => {
    resetPasswordChange()
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

  // 프로필 사진 크롭이 끝나면 호출됩니다. 여기서는 임직원이 이미 존재하므로
  // (사원 추가 폼과 달리) 크롭이 끝나는 즉시 바로 업로드합니다.
  const handleProfileImageCropped = async (blob: Blob) => {
    if (!employeeId) return
    setIsUploadingProfileImage(true)
    setProfileImageError(null)
    try {
      await uploadEmployeeProfileImage(employeeId, blob)
      await loadDetail()
      onUpdated()
    } catch (err) {
      setProfileImageError(
        err instanceof ApiError
          ? err.message
          : '프로필 사진 업로드 중 알 수 없는 오류가 발생했습니다.',
      )
    } finally {
      setIsUploadingProfileImage(false)
    }
  }

  // 비밀번호 확인 칸 아래에 실시간으로 보여줄 안내 문구입니다. (사원 추가
  // 폼의 비밀번호 확인 검증과 동일한 문구를 씁니다)
  const passwordConfirmError = !newPassword
    ? null
    : !newPasswordConfirm
      ? '비밀번호 확인을 입력해주세요.'
      : newPasswordConfirm !== newPassword
        ? '비밀번호와 비밀번호 확인이 일치하지 않습니다.'
        : null

  const handlePasswordChangeSubmit = async () => {
    if (newPassword.length < 8) {
      setPasswordError('비밀번호는 8자 이상 입력해야 합니다.')
      return
    }
    if (passwordConfirmError) {
      setPasswordError(passwordConfirmError)
      return
    }
    setPasswordError(null)
    setIsSavingPassword(true)
    try {
      await saveFields({ password: newPassword })
      resetPasswordChange()
    } catch (err) {
      setPasswordError(
        err instanceof ApiError ? err.message : '비밀번호 변경에 실패했습니다.',
      )
    } finally {
      setIsSavingPassword(false)
    }
  }

  return (
    <Dialog
      open={employeeId !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          {/* 제목/설명은 왼쪽에, "비밀번호 변경" 버튼은 오른쪽에 둡니다.
              오른쪽 상단의 닫기(X) 버튼과 겹치지 않도록 pr-8로 여유를 둡니다. */}
          <div className="flex items-start justify-between gap-4 pr-8">
            <div className="flex flex-col gap-1.5">
              <DialogTitle>임직원 상세 정보</DialogTitle>
              <DialogDescription>
                {detail
                  ? `${detail.name_kor}(${detail.employee_id}) 임직원의 상세 정보입니다.`
                  : '임직원의 상세 정보를 불러옵니다.'}
              </DialogDescription>
            </div>
            {canEdit && detail && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => {
                  if (isChangingPassword) resetPasswordChange()
                  else setIsChangingPassword(true)
                }}
              >
                <KeyRound />
                비밀번호 변경
              </Button>
            )}
          </div>
        </DialogHeader>

        {isChangingPassword && (
          <div className="flex flex-col gap-3 rounded-lg border border-input bg-muted/30 p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="detail_new_password">새 비밀번호</Label>
                <Input
                  id="detail_new_password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="8자 이상"
                  autoComplete="new-password"
                  className="h-8"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="detail_new_password_confirm">
                  새 비밀번호 확인
                </Label>
                <Input
                  id="detail_new_password_confirm"
                  type="password"
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  placeholder="비밀번호를 한 번 더 입력하세요"
                  autoComplete="new-password"
                  className="h-8"
                />
                {passwordConfirmError && (
                  <p className="text-xs text-destructive">
                    {passwordConfirmError}
                  </p>
                )}
              </div>
            </div>
            {passwordError && (
              <p className="text-xs text-destructive">{passwordError}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetPasswordChange}
                disabled={isSavingPassword}
              >
                취소
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handlePasswordChangeSubmit}
                disabled={isSavingPassword}
              >
                {isSavingPassword && <Loader2 className="animate-spin" />}
                변경
              </Button>
            </div>
          </div>
        )}

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
                canEdit={canEdit}
                onSave={handleFieldSave}
              />
              {/* 권한 등급은 본인이라도 관리 권한(canManage)이 있어야만 바꿀 수 있습니다 */}
              <EditableSelectField
                label="권한"
                field="admin_role"
                value={detail.admin_role}
                options={ADMIN_ROLE_OPTIONS}
                canEdit={canManage}
                onSave={handleFieldSave}
              />
            </FormSection>

            <Separator />

            <FormSection title="기본 정보">
              <div className="sm:col-span-2">
                <ProfileAvatarUpload
                  name={detail.name_kor}
                  // 프로필 사진은 항상 "사번.jpg"로 저장되어 사진을 바꿔도
                  // url 자체는 그대로라, 캐시 버스팅 쿼리를 안 붙이면 브라우저가
                  // 예전 사진을 계속 보여줄 수 있습니다. updated_at은 사진을
                  // 바꿀 때마다 갱신되므로 이 값을 붙여서 새로 받아오게 합니다.
                  imageUrl={
                    detail.profile_image_url
                      ? `${detail.profile_image_url}?v=${encodeURIComponent(detail.updated_at)}`
                      : null
                  }
                  isUploading={isUploadingProfileImage}
                  editable={canEdit}
                  onCropped={handleProfileImageCropped}
                />
                {profileImageError && (
                  <p className="mt-1.5 text-center text-xs text-destructive">
                    {profileImageError}
                  </p>
                )}
              </div>
              <EditableTextField
                label="성명"
                field="name_kor"
                value={detail.name_kor}
                canEdit={canEdit}
                onSave={handleFieldSave}
              />
              <EditableTextField
                label="성명(영어)"
                field="name_eng"
                value={detail.name_eng}
                canEdit={canEdit}
                onSave={handleFieldSave}
              />
              <EditableTextField
                label="성명(일본어)"
                field="name_jpn"
                value={detail.name_jpn}
                nullable
                canEdit={canEdit}
                onSave={handleFieldSave}
              />
              <EditableTextField
                label="성명(중국어)"
                field="name_chn"
                value={detail.name_chn}
                nullable
                canEdit={canEdit}
                onSave={handleFieldSave}
              />
              <EditableSelectField
                label="성별"
                field="gender"
                value={detail.gender}
                options={GENDER_OPTIONS}
                canEdit={canEdit}
                onSave={handleFieldSave}
              />
              <EditableTextField
                label="생년월일"
                field="birth_date"
                value={detail.birth_date}
                type="date"
                canEdit={canEdit}
                onSave={handleFieldSave}
              />
              <EditableTextField
                label="연락처(휴대전화)"
                field="phone_number"
                value={detail.phone_number}
                type="tel"
                canEdit={canEdit}
                onSave={handleFieldSave}
              />
              <EditableTextField
                label="주소(거주지)"
                field="address"
                value={detail.address}
                nullable
                canEdit={canEdit}
                onSave={handleFieldSave}
              />
              <EditableTextField
                label="이메일(개인)"
                field="email"
                value={detail.email}
                type="email"
                canEdit={canEdit}
                onSave={handleFieldSave}
              />
              <EditableTextField
                label="이메일(회사)"
                field="email_company"
                value={detail.email_company}
                type="email"
                nullable
                canEdit={canEdit}
                onSave={handleFieldSave}
              />
              <EditableTextField
                label="데스크번호"
                field="desk_number"
                value={detail.desk_number}
                nullable
                canEdit={canEdit}
                onSave={handleFieldSave}
              />
            </FormSection>

            <Separator />

            <FormSection title="인사 정보">
              <EditableTextField
                label="사번"
                field="employee_id"
                value={detail.employee_id}
                canEdit={canEdit}
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
                canEdit={canEdit}
                onSave={handleFieldSave}
              />
              <EditableMasterSelectField
                label="소속팀"
                field="team_id"
                value={detail.team_id}
                displayValue={resolveLabel(masterMaps.teams, detail.team_id)}
                options={masterMaps.teams}
                canEdit={canEdit}
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
                canEdit={canEdit}
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
                canEdit={canEdit}
                onSave={handleFieldSave}
              />
              <EditableMasterSelectField
                label="직무"
                field="duty_id"
                value={detail.duty_id}
                displayValue={resolveLabel(masterMaps.duties, detail.duty_id)}
                options={masterMaps.duties}
                canEdit={canEdit}
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
                canEdit={canEdit}
                onSave={handleFieldSave}
              />
              <EditableSelectField
                label="신입/경력 여부"
                field="exp_level"
                value={detail.exp_level ?? '신입'}
                options={EXP_LEVEL_OPTIONS}
                canEdit={canEdit}
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
                canEdit={canEdit}
                onSave={handleFieldSave}
              />
              <EditableTextField
                label="보유 차량 종류"
                field="owned_vehicle"
                value={detail.owned_vehicle}
                nullable
                canEdit={canEdit}
                onSave={handleFieldSave}
              />
              <EditableTextField
                label="보유 차량 번호"
                field="owned_vehicle_number"
                value={detail.owned_vehicle_number}
                nullable
                canEdit={canEdit}
                onSave={handleFieldSave}
              />
            </FormSection>

            {/* 구사 언어는 운전면허 등과 함께 '보유 능력'에 속하므로 구분선을 넣지 않습니다 */}
            <EditableLanguagesSection
              languages={detail.languages}
              canEdit={canEdit}
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
              <ReadOnlyField
                label="최근 접속일"
                value={formatDateTime(detail.last_sign_in_at)}
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
