export interface ChatMessage {
  id: number;
  senderId: number;
  senderName: string;
  senderRole: string | null;
  content: string;
  sentAt: string;
}