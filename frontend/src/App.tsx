// 앱 전체 레이아웃입니다.
// 왼쪽 사이드바 + 상단 헤더 + 메인 콘텐츠(Outlet)로 구성됩니다.
import { Outlet } from 'react-router-dom'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppHeader } from '@/components/layout/app-header'

function App() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        {/* 메뉴별로 연결된 실제 페이지가 이 자리에 렌더링됩니다. */}
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}

export default App
