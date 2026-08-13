// 왼쪽 사이드바 전체를 그리는 컴포넌트입니다.
// 최상단에는 서비스 이름(COSMOJIN), 그 아래에는 메뉴 트리가 표시됩니다.
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, LayoutGrid } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { navMenu, type NavItem } from '@/config/nav-menu'

export function AppSidebar() {
  const { pathname } = useLocation()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex h-14 items-center gap-2.5 px-2">
          {/* 서비스 로고 자리 (아이콘만 표시) */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <LayoutGrid className="h-[18px] w-[18px]" />
          </div>
          {/* 사이드바가 접히면(icon 모드) 이름/부제목은 숨깁니다 */}
          <div className="min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
            <div className="truncate text-[15px] font-bold tracking-tight text-sidebar-foreground">
              COSMOJIN
            </div>
            <div className="truncate text-[11px] text-sidebar-foreground/60">
              ERP 시스템 데모버전
            </div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navMenu.map((item) => (
                <NavMenuItem
                  key={item.title}
                  item={item}
                  pathname={pathname}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

// 메뉴 한 칸을 렌더링합니다.
// - children이 있으면: 펼침/접힘이 가능한 그룹 메뉴로 렌더링
// - children이 없으면: 클릭 시 해당 경로로 바로 이동하는 메뉴로 렌더링
function NavMenuItem({
  item,
  pathname,
}: {
  item: NavItem
  pathname: string
}) {
  const hasChildren = !!item.children && item.children.length > 0

  // 현재 페이지가 이 메뉴의 하위 메뉴 중 하나라면, 처음부터 펼쳐진 상태로 보여줍니다.
  const isChildActive =
    hasChildren && item.children!.some((child) => child.path === pathname)
  const [open, setOpen] = useState(isChildActive)

  if (hasChildren) {
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <SidebarMenuItem>
          <CollapsibleTrigger render={<SidebarMenuButton />}>
            <item.icon />
            <span>{item.title}</span>
            <ChevronRight
              className={
                'ml-auto transition-transform duration-200' +
                (open ? ' rotate-90' : '')
              }
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.children!.map((child) => (
                <SidebarMenuSubItem key={child.title}>
                  <SidebarMenuSubButton
                    render={<Link to={child.path!} />}
                    isActive={child.path === pathname}
                  >
                    <child.icon />
                    <span>{child.title}</span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    )
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={<Link to={item.path!} />}
        isActive={item.path === pathname}
      >
        <item.icon />
        <span>{item.title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
