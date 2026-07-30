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

/** Customer relation on a Lightspeed work order. */
export interface LightspeedCustomer {
  customerID: string;
  firstName: string;
  lastName: string;
  company?: string;
}

/** Serialized (item being repaired) relation on a Lightspeed work order. */
export interface LightspeedSerialized {
  serializedID: string;
  description: string;
  unitPrice?: string;
  serial?: string;
}

/** Work order status relation on a Lightspeed work order. */
export interface LightspeedWorkOrderStatus {
  workorderStatusID: string;
  name: string;
}

/** Employee relation on a Lightspeed work order. */
export interface LightspeedEmployee {
  employeeID: string;
  firstName: string;
  lastName: string;
}

/** A Lightspeed work order (service/repair ticket). */
export interface LightspeedWorkOrder {
  workorderID: string;
  timeIn: string;
  etaOut: string;
  note: string;
  receiptNote?: string;
  description?: string;
  internalNote?: string;
  hookIn?: string;
  hookOut?: string;
  warranty: string;
  archived: string;
  customerID: string;
  discountID?: string;
  employeeID: string;
  serializedID: string;
  shopID: string;
  saleID?: string;
  saleLineID?: string;
  workorderStatusID: string;
  timeStamp?: string;
  Customer?: LightspeedCustomer;
  Serialized?: LightspeedSerialized;
  WorkorderStatus?: LightspeedWorkOrderStatus;
  Employee?: LightspeedEmployee;
}

export type WorkOrderLineKind = "labour" | "part" | "fee";

export interface LightspeedWorkOrderLine {
  id: string;
  description: string;
  note: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  kind: WorkOrderLineKind;
  employeeName: string;
  status: string;
  isComplete: boolean;
  durationMinutes: number;
  reservedQuantity: number;
}

export interface LightspeedWorkOrderDetails extends LightspeedWorkOrder {
  lines: LightspeedWorkOrderLine[];
  totals: {
    labour: number;
    parts: number;
    fees: number;
    discounts: number;
    tax: number;
    total: number;
  };
}

export interface WorkOrderDetailsResult {
  status: "ok" | "unavailable";
  workOrder: LightspeedWorkOrderDetails | null;
}

/** Response envelope for GET /API/V3/Account/{id}/Workorder.json */
export interface LightspeedWorkOrderResponse {
  '@attributes'?: {
    next?: string;
    previous?: string;
    count?: string;
  };
  Workorder: LightspeedWorkOrder[] | Record<string, never>;
}

/** Response envelope for GET /API/V3/Account/{id}/WorkorderStatus.json */
export interface LightspeedWorkOrderStatusResponse {
  '@attributes'?: {
    count?: string;
  };
  WorkorderStatus: LightspeedWorkOrderStatus[];
}

/** Lookup map: workorderStatusID → status name */
export type WorkOrderStatusMap = Record<string, string>;
