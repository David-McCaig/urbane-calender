export type MembershipRole = 'owner' | 'manager' | 'mechanic';

export interface UserShopMembership {
  id: string;
  user_id: string;
  shop_id: string;
  role: MembershipRole;
  created_at: string;
  updated_at: string;
  // Joined from shops table when queried with select('*, shop:shops(*)')
  shop?: {
    id: string;
    name: string;
  };
}

export interface Invitation {
  id: string;
  shop_id: string;
  email: string;
  role: MembershipRole;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_by: string;
  created_at: string;
  // Joined from shops table when queried with select('*, shop:shops(*)')
  shop?: {
    id: string;
    name: string;
  };
}

export interface Shop {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}
