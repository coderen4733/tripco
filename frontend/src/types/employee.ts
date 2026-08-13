// 백엔드 API 응답과 대응되는 타입 정의입니다.

// GET /employees/ 응답 1건
// (backend: apps/employee/models/schemas.py의 EmployeeReadListRes와 대응)
// 부서/팀/직급/직책/직무/고용형태는 전부 마스터컬렉션 문서의 _id 값으로 내려옵니다.
// 아직 배정되지 않은 임직원은 null로 내려올 수 있습니다.
export interface EmployeeListItem {
  _id: string
  name_kor: string // 이름
  employee_id: string // 사번
  login_id: string // 로그인 ID
  dept_id: string | null // 부서 _id
  team_id: string | null // 팀 _id
  position_id: string | null // 직급 _id
  title_id: string | null // 직책 _id
  duty_id: string | null // 직무 _id
  employment_type: string | null // 고용형태 _id
}

// GET /organizations/master-maps/ 응답
// (backend: apps/organization/master/models/schemas.py의 MasterMapsRes와 대응)
// 각 딕셔너리는 {마스터컬렉션 문서의 _id: 화면에 표시할 값} 형태입니다.
export interface MasterMaps {
  departments: Record<string, string>
  teams: Record<string, string>
  positions: Record<string, string>
  titles: Record<string, string>
  duties: Record<string, string>
  employment_types: Record<string, string>
}

// 구사 언어 1건 (backend: apps/employee/models/entities.py의 LanguageSkill과 대응)
export interface LanguageSkillPayload {
  language: string
  level: string
  certification: string | null
}

// POST /employees/ 요청 본문
// (backend: apps/employee/models/schemas.py의 EmployeeCreateReq와 대응)
// 프로필 사진 / 입사문서 / 결재 관련 파일은 별도 업로드 메뉴에서 다루므로 제외한다.
export interface EmployeeCreatePayload {
  login_id: string
  password: string
  name_kor: string
  name_eng: string
  name_jpn: string | null
  name_chn: string | null
  gender: string | null
  birth_date: string // "1998-02-01" 형태의 문자열
  phone_number: string
  address: string | null
  email: string
  email_company: string | null
  desk_number: string | null
  employee_id: string
  dept_id: string | null
  team_id: string | null
  position_id: string | null
  title_id: string | null
  duty_id: string | null
  employment_type: string | null
  exp_level: string | null
  driver_license_type: string | null
  owned_vehicle: string | null
  owned_vehicle_number: string | null
  languages: LanguageSkillPayload[]
}

// GET /employees/{_id} 응답
// (backend: apps/employee/models/schemas.py의 EmployeeReadDetailRes와 대응)
// 입사문서 / 결재 관련 파일 url은 별도 업로드 메뉴에서 다룰 예정이라 화면에는 안 씁니다.
export interface EmployeeDetail {
  login_id: string
  password: string
  admin_role: string
  name_kor: string
  name_eng: string
  name_jpn: string | null
  name_chn: string | null
  gender: string
  birth_date: string
  profile_image_url: string | null
  phone_number: string
  address: string | null
  email: string
  email_company: string | null
  desk_number: string | null
  employee_id: string
  dept_id: string | null
  team_id: string | null
  position_id: string | null
  title_id: string | null
  duty_id: string | null
  employment_type: string | null
  exp_level: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  last_sign_in_at: string | null
  driver_license_type: string
  owned_vehicle: string | null
  owned_vehicle_number: string | null
  languages: LanguageSkillPayload[]
  resident_registration_url: string | null
  graduation_certificate_url: string | null
  transcript_url: string | null
  career_certificate_url: string | null
  employment_contract_url: string | null
  signature_url: string | null
  registered_seal_url: string | null
}

// PUT /employees/{_id} 요청 본문
// (backend: apps/employee/models/schemas.py의 EmployeeUpdateReq와 대응)
// 실제로 값을 채워서 보낸 필드만 백엔드에 반영되는 부분 수정(partial update)이라,
// 항목을 하나씩 고쳐서 저장할 때는 바뀐 필드 1개만 담아서 보내면 됩니다.
export type EmployeeUpdatePayload = Partial<{
  login_id: string
  admin_role: string
  name_kor: string
  name_eng: string
  name_jpn: string | null
  name_chn: string | null
  gender: string
  birth_date: string
  phone_number: string
  address: string | null
  email: string
  email_company: string | null
  desk_number: string | null
  employee_id: string
  dept_id: string | null
  team_id: string | null
  position_id: string | null
  title_id: string | null
  duty_id: string | null
  employment_type: string | null
  exp_level: string
  driver_license_type: string
  owned_vehicle: string | null
  owned_vehicle_number: string | null
  languages: LanguageSkillPayload[]
}>
