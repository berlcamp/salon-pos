'use client'

import Link from 'next/link'
import HeaderDropdown from './HeaderDropdownMenu'
import { Button } from './ui/button'
import { SidebarTrigger } from './ui/sidebar'

export default function StickyHeader() {
  return (
    <header className="fixed w-full top-0 z-40 bg-[#2e2e30] border-b border-[#424244] p-2 flex justify-start items-center gap-4">
      <SidebarTrigger />

      {/* Left section: Logo */}
      <div className="flex items-center gap-4">
        <div className="text-white font-semibold flex items-center">
          <span>POS</span>
        </div>
      </div>

      <div className="flex-1"></div>

      {/* New button linking to /transaction */}
      <Link href="/transaction">
        <Button variant="default" className="mr-2">
          New Transaction
        </Button>
      </Link>

      {/* <BranchSwitcher /> */}

      {/* Right section: Settings dropdown */}
      <HeaderDropdown />
    </header>
  )
}
