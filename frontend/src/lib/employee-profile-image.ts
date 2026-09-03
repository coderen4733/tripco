// 프로필 사진 업로드 API 호출 헬퍼입니다.
// (backend: POST /employees/{_id}/profile-image 와 대응)
import { apiUpload } from '@/lib/api'

export async function uploadEmployeeProfileImage(
  employeeId: string,
  imageBlob: Blob,
): Promise<string> {
  const formData = new FormData()
  formData.append('file', imageBlob, 'profile.jpg')
  const data = await apiUpload<{ profile_image_url: string }>(
    `/employees/${employeeId}/profile-image`,
    formData,
  )
  return data.profile_image_url
}

// 신규 계정 신청(회원가입) 중인 항목의 프로필 사진 업로드 헬퍼입니다.
// (backend: POST /auth/sign-up/{_id}/profile-image 와 대응)
export async function uploadRegistrationProfileImage(
  registrationId: string,
  imageBlob: Blob,
): Promise<string> {
  const formData = new FormData()
  formData.append('file', imageBlob, 'profile.jpg')
  const data = await apiUpload<{ profile_image_url: string }>(
    `/auth/sign-up/${registrationId}/profile-image`,
    formData,
  )
  return data.profile_image_url
}
