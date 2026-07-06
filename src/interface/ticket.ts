import type { TicketStatus, TicketPriority, TicketSource } from '../enums/ticket.enum';

export interface TicketRow {
  id: string;
  ticket_number: string;
  name:string;
  email:string;
  phone_number:string;
  component_type_id?:string | null;
  component_id?:string | null;
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
    from_status: string ;
    to_status: string;
    reason?: string | null;
    changed_by: string;
    changed_by_name?: string | null;
    changed_at: string;
    stayed_in_status_seconds?: number | null;
    stayed_in_status_human?: string | null;
  }>;
  created_at: Date;
  updated_at?: Date | null;
  resolved_at?: Date | null;
  closed_at?: Date | null;

  assignee_name?: string | null;
  assigned_by_name?:string | null,
  plant_name?: string | null; 
  component_name?:string | null;
  component_type?:string | null;
}

export interface CreateTicketInput extends Omit<TicketRow, "id" | "created_at" | "updated_at" | "updated_by" | "updated_by_name" | "created_by_name" | "assigned_to"> {
  id?:string;
}

export interface UpdateTicketInput extends Omit<TicketRow, "id" | "created_at" | "updated_at" | "created_by_name" | "updated_by_name" | "resolved_at" | "closed_at"> {
  id?:string ;
  reason?:string | null,
}

export type TicketQuery = Record<string, unknown>;

export interface PresignUploadRequest {
  plant_id:string,
  component_id:string,
  original_file_name: string;
  mime_type: string;
  file_size: number;
}