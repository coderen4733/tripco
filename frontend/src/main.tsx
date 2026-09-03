import { StrictMode, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './components/theme-provider'
import { AuthProvider } from './contexts/auth-context'
import { MasterMapsProvider } from './contexts/master-maps-context'
import { PlaceholderPage } from './pages/placeholder-page'
import { EmployeeManagementPage } from './pages/employee-management-page'
import { OrganizationManagementPage } from './pages/organization-management-page'
import { AlarmManagementPage } from './pages/alarm-management-page'
import { flattenNavItems } from './config/nav-menu'

// 사이드바 메뉴 중 실제 경로(path)를 가진 항목들을 라우트로 등록합니다.
// 아직 실제 화면이 없는 메뉴는 빈 페이지(PlaceholderPage)를 보여주고,
// 화면이 만들어진 메뉴는 아래 pageOverrides에 경로를 추가해 연결합니다.
const routableItems = flattenNavItems()
const pageOverrides: Record<string, ComponentType> = {
  '/company/employees': EmployeeManagementPage,
  '/company/organization': OrganizationManagementPage,
  '/etc/alarms': AlarmManagementPage,
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <MasterMapsProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<App />}>
                {routableItems.map((item) => {
                  const Page = pageOverrides[item.path!] ?? PlaceholderPage
                  return (
                    <Route
                      key={item.path}
                      path={item.path}
                      element={<Page />}
                    />
                  )
                })}
              </Route>
            </Routes>
          </BrowserRouter>
        </MasterMapsProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
