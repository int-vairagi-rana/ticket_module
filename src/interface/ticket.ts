import type { TicketStatus, TicketPriority} from '../enums/ticket.enum';

export type TicketStatusValue = typeof TicketStatus[keyof typeof TicketStatus];
export type TicketPriorityValue = typeof TicketPriority[keyof typeof TicketPriority];


export interface TicketRow {
  id: string;
  ticket_number: string;
  name:string;
  email:string;
  phone_number:string;
  component_type_id:string;
  component_id:string;
  plant_id:string;
  title: string;
  description?: string | null;
  status: TicketStatusValue;
  priority: TicketPriorityValue;
  attachment_ids?: string[] | null;
  created_by: string;
  created_by_name?: string;
  updated_by?: string | null;
  updated_by_name?: string | null;
  assigned_to?: string | string[] | null;
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
  status_metrics?: {
    status_durations_seconds: Record<string, number>;
    status_durations_human: Record<string, string>;
    on_hold_seconds: number;
    on_hold_human: string;
    current_status_age_seconds: number;
    current_status_age_human: string;
    total_resolution_seconds: number | null;
    total_resolution_human: string | null;
    active_resolution_seconds: number | null;
    active_resolution_human: string | null;
  };
  created_at: Date;
  updated_at?: Date | null;
  resolved_at?: Date | null;
  closed_at?: Date | null;

  // optional joined fields (like assignee_name, plant_name)
  assignee_name?: string;
  plant_name?: string;
  component_name?:string;
  component_type?:string;
}

export interface CreateTicketInput extends Omit<TicketRow, "id" | "created_at" | "updated_at" | "updated_by" | "updated_by_name" | "created_by_name" | "assigned_to"> {
  id?:string
}

export interface UpdateTicketInput extends Omit<TicketRow, "id" | "created_at" | "updated_at" | "created_by_name" | "updated_by_name"> {
  id?:string;
}

export interface TicketFilters {
  title?: string;
  status?: TicketStatusValue;
  priority?: TicketPriorityValue;
  plant_id?: string;
  plant_name?: string;
  assigned_to?: string;
  created_by?: string;
  updated_by?: string;
  for_user_id?: string;          // shows tickets where user is assigned or created
  created_from?: Date;
  created_to?: Date;
  updated_at?: Date;
  updated_from?: Date;
  updated_to?: Date;
  has_feedback?: boolean;
  feedback_rating?: number;
  overdue?: boolean;
  unassigned?: boolean;
  start_date?: Date;
  end_date?: Date;
  search?: string;                // search in title/description/ticket_number/plant_name
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TicketStatistics {
  total: number;
  byStatus: Record<TicketStatusValue, number>;
  byPriority: Record<TicketPriorityValue, number>;
  overdue: number;                // due_date < today and status not 'resolved'/'closed'
}
