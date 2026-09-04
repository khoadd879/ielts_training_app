export interface ModerationForumMessage {
  postId: string;
  userId: string;
  content: string;
  threadTitle: string;
  hasAttachment: boolean;
  enqueuedAt: string;
}

export interface VocabSuggestMessage {
  jobId: string;
  word: string;
  requestedByUserId: string;
  enqueuedAt: string;
}
