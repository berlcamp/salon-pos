import { BarChart, Home, ListChecks, Store, Users } from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import { useAppSelector } from '@/lib/redux/hook'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function AppSidebar() {
  const user = useAppSelector((state) => state.user.user)
  const pathname = usePathname()

  // Menu items.
  const items = [
    {
      title: 'Home',
      url: '/home',
      icon: Home
    },
    ...(user?.type === 'super admin' || user?.type === 'province admin'
      ? [
          {
            title: 'Dashboard',
            url: '/dashboard',
            icon: BarChart
          }
        ]
      : [])
  ]

  const settingItems = [
    {
      title: 'Services',
      url: '/services',
      icon: ListChecks
    },
    {
      title: 'Staff',
      url: '/staff',
      icon: Users
    },
    {
      title: 'Branches',
      url: '/branches',
      icon: Store
    }
  ]

  return (
    <Sidebar className="pt-13">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <item.icon className="text-gray-400" />
                      <span className="text-gray-300">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {user?.type === 'admin' && (
          <SidebarGroup>
            <SidebarGroupLabel className="border-t rounded-none border-gray-600">
              Settings
            </SidebarGroupLabel>
            <SidebarGroupContent className="pb-20">
              <SidebarMenu>
                {settingItems.map((item) => (
                  <SidebarMenuItem
                    key={item.title}
                    style={{
                      backgroundColor:
                        pathname === item.url ? '#49494a' : 'transparent'
                    }}
                    className="rounded-md"
                  >
                    <SidebarMenuButton asChild>
                      <Link href={item.url}>
                        <item.icon className="text-gray-400" />
                        <span className="text-gray-300">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  )
}
