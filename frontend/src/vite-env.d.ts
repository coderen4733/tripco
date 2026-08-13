/// <reference types="vite/client" />

// .env에서 사용하는 환경변수 타입을 선언합니다.
// 이렇게 선언해야 import.meta.env.VITE_API_BASE_URL 처럼 자동완성/타입체크가 됩니다.
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
