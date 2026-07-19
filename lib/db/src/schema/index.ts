import { pgTable, text, real, integer, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';

// ─── Users & Sessions ─────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull(), // 'director' | 'manager'
  allowedHotels: jsonb('allowed_hotels').$type<string[]>().notNull().default([]),
  passwordChangeRequired: boolean('password_change_required').notNull().default(false),
  lastPasswordChangedAt: timestamp('last_password_changed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ─── Log Tables ───────────────────────────────────────────────────────────────

export const buffetLogs = pgTable('buffet_logs', {
  id: text('id').primaryKey(),
  hotelId: text('hotel_id').notNull(),
  managerId: text('manager_id').notNull(),
  managerName: text('manager_name').notNull(),
  date: text('date').notNull(),
  time: text('time').notNull(),
  item: text('item').notNull(),
  zone: text('zone'),
  type: text('type').notNull(), // 'hot' | 'cold'
  temperature: real('temperature').notNull(),
  status: text('status').notNull(), // 'pass' | 'fail' | 'caution'
  correctiveAction: text('corrective_action'),
  monitoredBy: text('monitored_by'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const thawingLogs = pgTable('thawing_logs', {
  id: text('id').primaryKey(),
  hotelId: text('hotel_id').notNull(),
  managerId: text('manager_id').notNull(),
  managerName: text('manager_name').notNull(),
  date: text('date').notNull(),
  itemName: text('item_name').notNull(),
  method: text('method').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  initialTemp: real('initial_temp').notNull(),
  finalTemp: real('final_temp'),
  unit: text('unit'),
  quantity: text('quantity'),
  status: text('status').notNull(),
  correctiveAction: text('corrective_action'),
  monitoredBy: text('monitored_by'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const receivedLogs = pgTable('received_logs', {
  id: text('id').primaryKey(),
  hotelId: text('hotel_id').notNull(),
  managerId: text('manager_id').notNull(),
  managerName: text('manager_name').notNull(),
  date: text('date').notNull(),
  time: text('time').notNull(),
  supplier: text('supplier').notNull(),
  vehicleTemp: real('vehicle_temp').notNull(),
  items: jsonb('items').$type<any[]>().notNull().default([]),
  status: text('status').notNull(),
  monitoredBy: text('monitored_by'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const disinfectionLogs = pgTable('disinfection_logs', {
  id: text('id').primaryKey(),
  hotelId: text('hotel_id').notNull(),
  managerId: text('manager_id').notNull(),
  managerName: text('manager_name').notNull(),
  date: text('date').notNull(),
  time: text('time').notNull(),
  items: text('items').notNull(),
  solution: text('solution').notNull(),
  concentration: real('concentration').notNull(),
  contactTime: integer('contact_time').notNull(),
  waterTemp: real('water_temp').notNull(),
  ph: real('ph'),
  status: text('status').notNull(),
  correctiveAction: text('corrective_action'),
  monitoredBy: text('monitored_by'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
