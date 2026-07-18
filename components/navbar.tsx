'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShopSwitcher } from '@/components/shop-switcher';
import { LogoutButton } from '@/components/logout-button';
import { cn } from '@/lib/utils';

export function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: '/protected', label: 'Calendar' },
    { href: '/protected/members', label: 'Members' },
  ];

  return (
    <nav className="w-full border-b bg-white dark:bg-gray-950">
      <div className="flex h-14 items-center px-4 md:px-6 gap-3">
        <ShopSwitcher />
        <div className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'px-3 py-1.5 text-sm rounded-md transition-colors',
                pathname === link.href
                  ? 'bg-gray-100 dark:bg-gray-800 font-medium'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <LogoutButton />
        </div>
      </div>
    </nav>
  );
}
