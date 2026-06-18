export interface CommentsRow {
  id: string;
  entity_id: string;
  entity_name: string;
  comments: string;
  created_by: string;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
  audio: Record<string, unknown> | null;
  fiels: string[] | null;
}

export interface CommentWithUserNames extends CommentsRow {
  created_by_name: string;
  updated_by_name: string | null;
}

export interface CreateCommentBody {
  entity_id: string;
  entity_name: string;
  comments: string;
  audio?: Record<string, unknown>;
  fiels?: string[];
}

export interface UpdateCommentBody {
  entity_id?: string;
  entity_name?: string;
  comments?: string;
  audio?: Record<string, unknown>;
  fiels?: string[];
}