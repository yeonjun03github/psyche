'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReportChatMessage } from '@psyche/shared';
import { api } from '@/lib/api';

export function ReportChatPanel({
  reportId,
  initialMessage,
  onClose,
}: {
  reportId: string;
  initialMessage: string;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ReportChatMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [input, setInput] = useState(initialMessage);
  // 렌더 중에 prop 변화를 감지해 state를 조정하는 React 권장 패턴 — 이걸 useEffect에서
  // setState로 하면 커밋 후 리렌더가 한 번 더 발생해 eslint(react-hooks)가 금지한다.
  const [appliedQuote, setAppliedQuote] = useState(initialMessage);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  if (initialMessage !== appliedQuote) {
    setAppliedQuote(initialMessage);
    setInput(initialMessage);
  }

  useEffect(() => {
    let cancelled = false;
    api
      .getReportChat(reportId)
      .then((history) => {
        if (!cancelled) setMessages(history);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reportId]);

  // 새로 드래그해서 넘어온 인용문마다 입력창을 전체 선택(하이라이트)한 채로 포커스한다 —
  // 이 effect는 DOM에 직접 손대는 순수 부수효과만 하고 setState는 하지 않는다(위 참고).
  useEffect(() => {
    const el = textareaRef.current;
    if (el && initialMessage) {
      el.focus();
      el.select();
    }
  }, [initialMessage]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const message = input.trim();
    if (!message || sending) return;

    setSending(true);
    setError(null);
    setInput('');

    const optimisticId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: optimisticId, reportId, role: 'USER', content: message, createdAt: new Date().toISOString() },
    ]);

    try {
      const [userMessage, assistantMessage] = await api.sendReportChatMessage(reportId, message);
      setMessages((prev) => [...prev.filter((m) => m.id !== optimisticId), userMessage, assistantMessage]);
    } catch (e) {
      setError((e as Error).message);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setInput(message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <h2 className="text-sm font-semibold">Psyche AI 상담 세션</h2>
        <button
          onClick={onClose}
          aria-label="닫기"
          className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
        >
          ✕
        </button>
      </div>

      <div ref={listRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {loadingHistory && <p className="text-xs text-neutral-400">불러오는 중...</p>}
        {!loadingHistory && messages.length === 0 && (
          <p className="text-xs text-neutral-400">리포트 내용에 대해 무엇이든 물어보세요.</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === 'USER'
                ? 'max-w-[85%] self-end rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white dark:bg-neutral-100 dark:text-neutral-900'
                : 'max-w-[85%] self-start rounded-lg bg-neutral-100 px-3 py-2 text-sm dark:bg-neutral-900'
            }
          >
            <p className="whitespace-pre-line">{m.content}</p>
          </div>
        ))}
        {sending && <p className="self-start text-xs text-neutral-400">답변 작성 중...</p>}
      </div>

      {error && <p className="px-4 pb-2 text-xs text-red-600">{error}</p>}

      <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={3}
          placeholder="리포트에 대해 궁금한 점을 물어보세요"
          className="w-full resize-none rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800 dark:bg-transparent"
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="mt-2 w-full rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          전송
        </button>
      </div>
    </div>
  );
}
