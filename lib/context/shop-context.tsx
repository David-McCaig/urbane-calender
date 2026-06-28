'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { switchActiveShop } from '@/lib/actions/membership';
import type { UserShopMembership, Shop } from '@/lib/types/membership';

interface ShopContextValue {
  /** Currently active shop, or null while loading / if none */
  activeShop: Shop | null;
  /** All shops the user belongs to */
  memberships: UserShopMembership[];
  /** Role in the active shop */
  role: string | null;
  /** True while initial data is loading */
  isLoading: boolean;
  /** Switch the active shop */
  switchShop: (shopId: string) => Promise<void>;
  /** True if user is owner of active shop */
  isOwner: boolean;
  /** True if user is manager or owner of active shop */
  isManager: boolean;
  /** Reload memberships (e.g. after accepting invitation) */
  refresh: () => Promise<void>;
}

const ShopContext = createContext<ShopContextValue>({
  activeShop: null,
  memberships: [],
  role: null,
  isLoading: true,
  switchShop: async () => {},
  isOwner: false,
  isManager: false,
  refresh: async () => {},
});

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const [activeShop, setActiveShop] = useState<Shop | null>(null);
  const [memberships, setMemberships] = useState<UserShopMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      setIsLoading(false);
      return;
    }

    // Load only the current user's memberships with shop info
    const { data, error } = await supabase
      .from('user_shop_memberships')
      .select('*, shop:shops(*)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading memberships:', error);
      setIsLoading(false);
      return;
    }

    const membershipsData = (data || []) as UserShopMembership[];
    setMemberships(membershipsData);

    // Determine active shop from user_metadata
    const metadataShopId = session.user.user_metadata?.active_shop_id;
    const activeMembership = metadataShopId
      ? membershipsData.find((m) => m.shop_id === metadataShopId)
      : membershipsData[0];

    if (activeMembership?.shop) {
      setActiveShop(activeMembership.shop as Shop);
    } else if (membershipsData.length === 0) {
      setActiveShop(null);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const switchShop = useCallback(
    async (shopId: string) => {
      if (shopId === activeShop?.id) return;

      await switchActiveShop(shopId);
      router.refresh();
      await loadData();
    },
    [router, loadData, activeShop?.id]
  );

  const activeMembership = memberships.find(
    (m) => m.shop_id === activeShop?.id
  );
  const role = activeMembership?.role ?? null;

  return (
    <ShopContext.Provider
      value={{
        activeShop,
        memberships,
        role,
        isLoading,
        switchShop,
        isOwner: role === 'owner',
        isManager: role === 'owner' || role === 'manager',
        refresh: loadData,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
}

export function useActiveShop() {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error('useActiveShop must be used within a ShopProvider');
  }
  return context;
}
