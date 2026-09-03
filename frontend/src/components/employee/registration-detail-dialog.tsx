// 신규 계정 신청자 목록(사원 관리 페이지) 또는 알림 벨의 신청 알람을 클릭하면
// 뜨는 "신청자 상세 정보" 다이얼로그입니다. '임직원 상세 정보' 폼과 구성이
// 같고, 이 다이얼로그를 열 수 있는 사람은 이미 관리자급(최고관리자/관리자/
// 부관리자)뿐이므로 모든 항목을 바로 수정할 수 있습니다. 맨 아래에는
// 승인/반려 버튼이 추가로 있습니다.
import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Check, Loader2, X } from 'lucide-react'
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
import { Separator } from '@/components/ui/separator'
import { ApiError } from '@/lib/api'
import { resolveLabel } from '@/lib/master-maps'
import { ProfileAvatarUpload } from '@/components/employee/profile-avatar-upload'
import {
  DetailSkeleton,
  EditableLanguagesSection,
  EditableMasterSelectField,
  EditableSelectField,
  EditableTextField,
  formatDateTime,
  FormSection,
  ReadOnlyField,
} from '@/components/employee/editable-detail-fields'
import {
  ADMIN_ROLE_OPTIONS,
  DRIVER_LICENSE_OPTIONS,
  EXP_LEVEL_OPTIONS,
  GENDER_OPTIONS,
} from '@/config/employee-options'
import {
  approveEmployeeRegistration,
  fetchEmployeeRegistrationDetail,
  rejectEmployeeRegistration,
  updateEmployeeRegistration,
} from '@/lib/employee-registrations'
import { uploadRegistrationProfileImage } from '@/lib/employee-profile-image'
import { emitRegistrationDecided } from '@/lib/registration-events'
import type {
  EmployeeDetail,
  EmployeeUpdatePayload,
  LanguageSkillPayload,
  MasterMaps,
} from '@/types/employee'

interface RegistrationDetailDialogProps {
  // 상세 조회할 신청자의 _id (employee_registrations 기준). null이면 닫힌 상태입니다.
  registrationId: string | null
  masterMaps: MasterMaps | null
  onClose: () => void
  // 항목을 수정/저장했거나 승인/반려가 처리된 뒤 호출됩니다.
  // (신청자 목록/알람 새로고침용)
  onDecided: () => void
}

export function RegistrationDetailDialog({
  registrationId,
  masterMaps,
  onClose,
  onDecided,
}: RegistrationDetailDialogProps) {
  const [detail, setDetail] = useState<EmployeeDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isUploadingProfileImage, setIsUploadingProfileImage] =
    useState(false)
  const [profileImageError, setProfileImageError] = useState<string | null>(
    null,
  )
  // 승인/반려 버튼을 누르면 바로 처리하지 않고, "정말요?"를 한 번 더
  // 물어보는 확인 단계로 넘어갑니다. (잘못 눌러서 실수로 처리하는 것 방지)
  const [confirmAction, setConfirmAction] = useState<
    'approve' | 'reject' | null
  >(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const loadDetail = useCallback(async () => {
    if (!registrationId) return
    const data = await fetchEmployeeRegistrationDetail(registrationId)
    setDetail(data)
  }, [registrationId])

  useEffect(() => {
    if (!registrationId) {
      setDetail(null)
      setError(null)
      setConfirmAction(null)
      return
    }
    let cancelled = false
    setIsLoading(true)
    setError(null)
    setDetail(null)
    loadDetail()
      .catch((err) => {
        if (cancelled) return
        // 백엔드가 이미 승인/반려된 신청을 조회할 때 정확히 이 문구를
        // detail로 내려주므로, 그대로 화면에 보여주면 된다.
        setError(
          err instanceof ApiError
            ? err.message
            : '신청 정보를 불러오는 중 알 수 없는 오류가 발생했습니다.',
        )
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [registrationId, loadDetail])

  // 항목 하나를 수정해서 저장할 때 호출됩니다. (PUT .../{_id}는 부분 수정이라
  // 실제로 보낸 필드만 반영되므로, 여러 EditableField가 이 함수를 공유해도 안전합니다)
  const saveFields = useCallback(
    async (partial: EmployeeUpdatePayload) => {
      if (!registrationId) return
      await updateEmployeeRegistration(registrationId, partial)
      // 저장된 최신 값을 다시 받아와 화면에 반영하고, 목록도 새로고침합니다.
      await loadDetail()
      onDecided()
    },
    [registrationId, loadDetail, onDecided],
  )

  const handleFieldSave = useCallback(
    (field: keyof EmployeeUpdatePayload, value: string | null) =>
      saveFields({ [field]: value } as EmployeeUpdatePayload),
    [saveFields],
  )

  const handleLanguagesSave = useCallback(
    (languages: LanguageSkillPayload[]) => saveFields({ languages }),
    [saveFields],
  )

  const handleProfileImageCropped = async (blob: Blob) => {
    if (!registrationId) return
    setIsUploadingProfileImage(true)
    setProfileImageError(null)
    try {
      await uploadRegistrationProfileImage(registrationId, blob)
      await loadDetail()
      onDecided()
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

  const handleDecision = async (action: 'approve' | 'reject') => {
    if (!registrationId) return
    setIsProcessing(true)
    try {
      if (action === 'approve') {
        await approveEmployeeRegistration(registrationId)
      } else {
        await rejectEmployeeRegistration(registrationId)
      }
      setConfirmAction(null)
      // 헤더 알림 벨의 신청 알람 목록처럼, 다른 화면에 떠 있을 수 있는
      // 신청자 관련 목록에도 지금 처리됐다는 걸 알립니다.
      emitRegistrationDecided()
      onDecided()
      onClose()
    } catch (err) {
      // 처리 도중 다른 관리자가 먼저 승인/반려했다면(이중 처리 방지) 여기서
      // 409로 걸리며, 그 안내 문구가 그대로 표시된다.
      setError(
        err instanceof ApiError
          ? err.message
          : '처리 중 알 수 없는 오류가 발생했습니다.',
      )
      setConfirmAction(null)
    } finally {
      setIsProcessing(false)
    }
  }

  const canDecide = !isLoading && !!detail && !error

  return (
    <Dialog
      open={registrationId !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>신청자 상세 정보</DialogTitle>
          <DialogDescription>
            {detail
              ? `${detail.name_kor}(${detail.employee_id}) 님의 신규 계정 신청 정보입니다.`
              : '신규 계정 신청 정보를 불러옵니다.'}
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
              {/* 승인 시점에 이 값 그대로 employees에 반영되므로, 여기서
                  미리 권한 등급을 지정해둘 수 있습니다 */}
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
              <div className="sm:col-span-2">
                <ProfileAvatarUpload
                  name={detail.name_kor}
                  imageUrl={detail.profile_image_url}
                  isUploading={isUploadingProfileImage}
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
              {/* 아직 승인 전이라 "입사일"이 아니라 "신청일"로 보여줍니다 */}
              <ReadOnlyField
                label="신청일"
                value={formatDateTime(detail.created_at)}
              />
              <ReadOnlyField
                label="최근 수정일"
                value={formatDateTime(detail.updated_at)}
              />
            </FormSection>
          </div>
        )}

        <DialogFooter>
          {confirmAction ? (
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-foreground">
                {confirmAction === 'approve'
                  ? '최종 승인하시겠습니까?'
                  : '최종 반려하시겠습니까?'}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmAction(null)}
                  disabled={isProcessing}
                >
                  취소
                </Button>
                <Button
                  type="button"
                  variant={confirmAction === 'reject' ? 'destructive' : 'default'}
                  className={
                    confirmAction === 'approve'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : undefined
                  }
                  onClick={() => handleDecision(confirmAction)}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="animate-spin" />
                  ) : confirmAction === 'approve' ? (
                    <Check />
                  ) : (
                    <X />
                  )}
                  {confirmAction === 'approve' ? '예, 승인' : '예, 반려'}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Button
                type="button"
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => setConfirmAction('approve')}
                disabled={!canDecide}
              >
                <Check />
                승인
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => setConfirmAction('reject')}
                disabled={!canDecide}
              >
                <X />
                반려
              </Button>
              <DialogClose render={<Button type="button" variant="outline" />}>
                닫기
              </DialogClose>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
