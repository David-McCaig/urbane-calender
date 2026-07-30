'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, PlugZap, UsersRound } from 'lucide-react';
import { ShopSwitcher } from '@/components/shop-switcher';
import { LogoutButton } from '@/components/logout-button';
import { LightspeedLogoutButton } from '@/components/lightspeed/lightspeed-logout-button';
import { cn } from '@/lib/utils';

export function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: '/protected', label: 'Calendar', icon: CalendarDays },
    { href: '/protected/members', label: 'Members', icon: UsersRound },
    { href: '/protected/integrations', label: 'Integrations', icon: PlugZap },
  ];

  return (
    <nav className="relative z-40 w-full bg-[#1c1c1e] px-4 text-white">
      <div className="flex min-h-16 items-center gap-4">
        <Link
          href="/protected"
          className="mr-1 inline-flex shrink-0 items-center gap-2 font-[Georgia,'Times_New_Roman',serif] text-lg font-bold"
          aria-label="Urbane calendar"
        >
          <span className="grid size-8 grid-cols-2 place-content-center gap-[3px] rounded-lg bg-white">
            {[0, 1, 2, 3].map((item) => (
              <i key={item} className="size-1 rounded-[1px] bg-[#1c1c1e]" />
            ))}
          </span>
          <span className="hidden lg:inline">Urbane</span>
        </Link>
        <ShopSwitcher />
        <div className="flex self-stretch items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'relative flex h-full items-center gap-2 border-b-[3px] px-3 pt-[3px] text-sm transition-colors',
                pathname === link.href
                  ? 'border-[#e6b29e] bg-white/5 font-medium text-white'
                  : 'border-transparent text-white/70 hover:bg-white/5 hover:text-white'
              )}
            >
              <link.icon className="size-3.5" />
              {link.label}
            </Link>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <LightspeedLogoutButton />
          <LogoutButton />
        </div>
      </div>
    </nav>
  );
}
