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

export interface CommentAudio {
  document_id?: string | null;
  file_key: string;
  file_name?: string | null;
  mime_type?: string | null;
  duration_seconds?: number | null;
}

