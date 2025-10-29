import { BookOpenCheck, Home, ListChecks, User } from 'lucide-react'

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
    {
      title: 'Bookings',
      url: '/bookings',
      icon: BookOpenCheck
    },
    {
      title: 'Customers',
      url: '/customers',
      icon: User
    }
  ]

  const inventoryItems = [
    {
      title: 'Products',
      url: '/products',
      icon: ListChecks
    },
    {
      title: 'Stocks-In',
      url: '/productstocks',
      icon: ListChecks
    }
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
      icon: User
    },
    {
      title: 'Branches',
      url: '/branches',
      icon: Home
    }
  ]

  return (
    <Sidebar className="pt-13">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
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
        <SidebarGroup>
          <SidebarGroupLabel className="border-t rounded-none border-gray-600">
            Inventory
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {inventoryItems.map((item) => (
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
