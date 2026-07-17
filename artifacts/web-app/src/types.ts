export const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

export const HOTELS = [
  "Rewaya Majestic",
  "Rewaya Inn",
  "Rewaya Luxury",
] as const;

export type Hotel = (typeof HOTELS)[number];
export type Role = "director" | "manager";
export type LogStatus = "pass" | "fail" | "caution";

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: Role;
  allowedHotels: string[];
  requiresPasswordChange?: boolean;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface BuffetLog {
  id: string;
  hotelId: string;
  managerId: string;
  managerName: string;
  date: string;
  time: string;
  item: string;
  zone?: string;
  type: "hot" | "cold";
  temperature: number;
  status: LogStatus;
  correctiveAction?: string;
  monitoredBy?: string;
  notes?: string;
}

export interface ThawingLog {
  id: string;
  hotelId: string;
  itemName: string;
  method: string;
  startDate: string;
  endDate: string;
  initialTemp: number;
  finalTemp?: number;
  unit?: string;
  quantity?: string;
  status: LogStatus;
  correctiveAction?: string;
  monitoredBy?: string;
  notes?: string;
}

export interface ReceivedItem {
  name: string;
  quantity: string;
  unit: string;
  batchNumber?: string;
}

export interface ReceivedLog {
  id: string;
  hotelId: string;
  date: string;
  time: string;
  supplier: string;
  vehicleTemp: number;
  items: ReceivedItem[];
  status: LogStatus;
  monitoredBy?: string;
  notes?: string;
}

export interface DisinfectionLog {
  id: string;
  hotelId: string;
  date: string;
  time: string;
  items: string;
  solution: string;
  concentration: number;
  contactTime: number;
  waterTemp: number;
  ph?: number;
  status: LogStatus;
  correctiveAction?: string;
  monitoredBy?: string;
  notes?: string;
}

export interface ManagerUser {
  id: string;
  username: string;
  name: string;
  role: Role;
  allowedHotels: string[];
  createdAt: string;
}
