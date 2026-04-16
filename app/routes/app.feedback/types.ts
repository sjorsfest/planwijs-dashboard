export type FeedbackType = "BUG" | "SUGGESTION" | "OTHER"

export interface Feedback {
  id: string
  user_id: string
  user_name: string
  route: string
  name: string
  description: string
  type: FeedbackType
  vote_count: number
  has_voted: boolean
  comment_count: number
  created_at: string
}

export interface Comment {
  id: string
  user_id: string
  user_name: string
  text: string
  created_at: string
}

export interface VoteResponse {
  voted: boolean
  vote_count: number
}
