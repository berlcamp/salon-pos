'use client'

import Link from 'next/link'
import HeaderDropdown from './HeaderDropdownMenu'
import { Button } from './ui/button'
import { SidebarTrigger } from './ui/sidebar'

export default function StickyHeader() {
  return (
    <header
      className="fixed w-full top-0 z-40 border-b border-[#2f5874] p-2 flex justify-start items-center gap-4"
      style={{
        backgroundColor: '#2a4f6e',
        backgroundImage: `
      linear-gradient(135deg, rgba(255,255,255,0.05) 25%, transparent 25%),
      linear-gradient(225deg, rgba(255,255,255,0.05) 25%, transparent 25%),
      linear-gradient(45deg, rgba(255,255,255,0.05) 25%, transparent 25%),
      linear-gradient(315deg, rgba(255,255,255,0.05) 25%, transparent 25%)
    `,
        backgroundSize: '8px 8px',
        backgroundBlendMode: 'overlay'
      }}
    >
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
