/** Row from the lightspeed_integrations table. */
export interface LightspeedIntegration {
  id: string;
  shop_id: string;
  integration_type: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  account_id: string | null;
  created_at: string;
  updated_at: string;
}
