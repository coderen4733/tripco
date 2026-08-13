// 다크모드 / 화이트모드(라이트모드) 전환을 앱 전체에서 사용할 수 있게 해주는 Provider입니다.
// - localStorage에 사용자가 마지막으로 선택한 테마를 저장해 새로고침해도 유지됩니다.
// - 저장된 값이 없으면 OS(브라우저) 설정을 따라 초기값을 정합니다.
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeProviderProps {
  children: React.ReactNode
  storageKey?: string
}

interface ThemeProviderState {
  theme: Theme
  toggleTheme: () => void
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(
  undefined,
)

// localStorage에 저장된 테마 또는 OS 다크모드 설정을 읽어 초기 테마를 결정합니다.
function getInitialTheme(storageKey: string): Theme {
  const saved = window.localStorage.getItem(storageKey)
  if (saved === 'light' || saved === 'dark') {
    return saved
  }
  const prefersDark = window.matchMedia(
    '(prefers-color-scheme: dark)',
  ).matches
  return prefersDark ? 'dark' : 'light'
}

export function ThemeProvider({
  children,
  storageKey = 'cosmojin-erp-theme',
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme(storageKey))

  // 테마가 바뀔 때마다 <html> 태그에 "dark" 클래스를 붙였다 뗐다 합니다.
  // Tailwind의 dark: 클래스들이 이 "dark" 클래스를 기준으로 동작합니다.
  useEffect(() => {
    const root = window.document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    window.localStorage.setItem(storageKey, theme)
  }, [theme, storageKey])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeProviderContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

// 컴포넌트에서 현재 테마와 전환 함수를 꺼내 쓰기 위한 훅입니다.
export function useTheme() {
  const context = useContext(ThemeProviderContext)
  if (context === undefined) {
    throw new Error('useTheme은 ThemeProvider 내부에서만 사용할 수 있습니다.')
  }
  return context
}
