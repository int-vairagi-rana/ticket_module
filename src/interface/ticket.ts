import type { TicketStatus, TicketPriority, TicketSource } from '../enums/ticket.enum';

export interface TicketRow {
  id: string;
  ticket_number: string;
  name:string;
  email:string;
  phone_number:string;
  component_type_id?:string;
  component_id?:string;
  plant_id:string;
  title: string;
  description?: string | null;
  status: TicketStatus;
  source:TicketSource,
  priority: TicketPriority;
  attachments_ids?: string[] | null;
  tenant_id?: string | null;
  created_by: string;
  created_by_name?: string;
  updated_by?: string | null;
  updated_by_name?: string | null;
  assigned_to?: string | null;
  assigned_by?:string | null;
  feedback?: {
    rating: number;
    description?: string | null;
    created_at: string;
  } | null;
  status_history?: Array<{
    from_status: string | null;
    to_status: string;
    reason?: string | null;
    changed_by: string;
    changed_by_name?: string | null;
    changed_at: string;
    stayed_in_status_seconds?: number;
    stayed_in_status_human?: string;
  }>;
  created_at: Date;
  updated_at?: Date | null;
  resolved_at?: Date | null;
  closed_at?: Date | null;

  assignee_name?: string;
  assigned_by_name?:string,
  plant_name?: string;
  component_name?:string;
  component_type?:string;
}

export interface CreateTicketInput extends Omit<TicketRow, "id" | "created_at" | "updated_at" | "updated_by" | "updated_by_name" | "created_by_name" | "assigned_to"> {
  id?:string
}

export interface UpdateTicketInput extends Omit<TicketRow, "id" | "created_at" | "updated_at" | "created_by_name" | "updated_by_name" | "resolved_at" | "closed_at"> {
  id?:string;
  reason?:string,
}

export interface TicketFilters {
  status?: TicketStatus;
  priority?: TicketPriority;
  plant_id?: string;
  plant_name?: string;
  created_by?: string;
  updated_by?: string;
  created_at_start?: Date;
  created_at_end?: Date;
  updated_at_start?: Date;
  updated_at_end?: Date;
  resolved_at_start?:Date;
  resolved_at_end?:Date;
  has_feedback?: boolean;
  has_attachments?:boolean;
  feedback_rating?: number;
  overdue?: boolean;
  unassigned?: boolean;
  search?: string;                // search in title/description/ticket_number/plant_name
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export type TicketQuery = Record<string, unknown>;
