// 프로필 사진 크롭 시 사용하는 국내 증명사진 표준 규격입니다.
// (3.5cm x 4.5cm 비율, 권장 픽셀 413 x 531)
// profile-avatar-upload.tsx(사원 추가/상세 정보 폼)와
// profile-photo-dialog.tsx(헤더의 "프로필 사진 설정")가 함께 씁니다.
export const PROFILE_IMAGE_WIDTH = 413
export const PROFILE_IMAGE_HEIGHT = 531
export const PROFILE_IMAGE_ASPECT = PROFILE_IMAGE_WIDTH / PROFILE_IMAGE_HEIGHT
