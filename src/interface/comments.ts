export interface CommentsRow {
  id: string;
  entity_id: string;
  entity_name: string;
  comment: string;
  content: string | null;
  audio: CommentAudio | null;
  attachments_ids: string[] | null;
  created_by: string;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
  author: CommentAuthor;
}

export interface CommentWithUserNames extends CommentsRow {
  created_by_name: string;
  updated_by_name: string | null;
}

export interface CreateCommentBody {
  comment: string;
}

export interface UpdateCommentBody {
  comment?: string;
}

export interface CommentFilters {
  entity_name: string;
  entity_id: string;
  page?: number;
  limit?: number;
  sortBy?: 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

export interface CommentAudio {
  document_id?: string | null;
  file_key: string;
  file_name?: string | null;
  mime_type?: string | null;
  duration_seconds?: number | null;
}

export interface CommentAuthor {
  id: string | null;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
}
