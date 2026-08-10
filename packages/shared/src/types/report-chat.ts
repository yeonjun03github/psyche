export type ChatRole = 'USER' | 'ASSISTANT';

/** 리포트 상세 화면에서 텍스트를 드래그 선택해 던지는 후속 질문 스레드의 메시지 하나. */
export interface ReportChatMessage {
  id: string;
  reportId: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}
