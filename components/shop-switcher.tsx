'use client';

import { useActiveShop } from '@/lib/context/shop-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building2, Check, ChevronDown, Plus, Store } from 'lucide-react';

export function ShopSwitcher() {
  const { activeShop, memberships, switchShop, isLoading } = useActiveShop();

  if (isLoading) {
    return (
      <div className="h-9 w-44 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-md" />
    );
  }

  if (!activeShop && memberships.length === 0) {
    return null;
  }

  if (!activeShop) {
    return (
      <Button variant="outline" className="gap-2" asChild>
        <a href="/onboarding">
          <Store className="h-4 w-4" />
          <span>Set up your shop</span>
        </a>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          <span className="max-w-[140px] truncate">{activeShop.name}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Your Shops</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {memberships.map((m) => (
          <DropdownMenuItem
            key={m.shop_id}
            onClick={() => switchShop(m.shop_id)}
            className="flex items-center justify-between"
          >
            <span className="truncate">
              {m.shop?.name || 'Unknown Shop'}
            </span>
            {m.shop_id === activeShop.id && (
              <Check className="h-4 w-4 text-green-600 shrink-0 ml-2" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => (window.location.href = '/onboarding?create=1')}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Shop
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
