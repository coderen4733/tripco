// 마스터컬렉션이 아니라 백엔드 Enum에 고정된 값들입니다.
// (apps/employee/models/enums.py의 Gender / ExpLevel / DriverLicenseType /
//  AdminRole과 대응됩니다)
// 사원 추가 폼과 임직원 상세 조회(수정) 폼이 공통으로 씁니다.

export const GENDER_OPTIONS = ['남성', '여성', '기타'] as const

export const EXP_LEVEL_OPTIONS = ['신입', '경력'] as const

export const DRIVER_LICENSE_OPTIONS = [
  '무면허',
  '1종대형',
  '1종보통',
  '2종보통',
  '원동기',
] as const

export const ADMIN_ROLE_OPTIONS = [
  '최고관리자',
  '관리자',
  '부관리자',
  '일반',
  '감사',
] as const

// 마스터컬렉션 드롭다운에서 "아무것도 선택하지 않음"을 나타내는 값
// (Select 컴포넌트는 빈 문자열을 값으로 쓸 수 없어서 별도 상수를 둡니다)
export const UNASSIGNED_VALUE = '__unassigned__'
