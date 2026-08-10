'use client';

import { useEffect, useState, type RefObject } from 'react';

interface SelectionPopup {
  top: number;
  left: number;
  text: string;
}

/**
 * containerRef 안에서 텍스트를 드래그 선택하면 선택 영역 우상단에 "이 부분에 대해 질문하기"
 * 버튼을 띄운다. 클릭 시점의 selection이 아니라 mouseup 시점에 캡처해둔 텍스트를 쓴다 —
 * 버튼을 누르는 mousedown 자체가 브라우저 기본 동작으로 선택을 해제시키기 때문이다.
 */
export function TextSelectionPopup({
  containerRef,
  onAsk,
}: {
  containerRef: RefObject<HTMLElement | null>;
  onAsk: (text: string) => void;
}) {
  const [popup, setPopup] = useState<SelectionPopup | null>(null);

  useEffect(() => {
    function handleMouseUp() {
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      const container = containerRef.current;

      if (!text || !selection || selection.rangeCount === 0 || !container || !container.contains(selection.anchorNode)) {
        setPopup(null);
        return;
      }

      const rect = selection.getRangeAt(0).getBoundingClientRect();
      setPopup({ top: Math.max(rect.top - 44, 8), left: Math.min(rect.right, window.innerWidth - 190), text });
    }

    function handleScrollOrResize() {
      setPopup(null);
    }

    document.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [containerRef]);

  if (!popup) return null;

  return (
    <button
      style={{ position: 'fixed', top: popup.top, left: popup.left }}
      // onClick이 아니라 onMouseDown + preventDefault를 쓴다 — mousedown의 브라우저 기본 동작이
      // 텍스트 선택을 즉시 해제해버려서, onClick(=mouseup 이후) 시점에는 이미 document의 전역
      // mouseup 핸들러가 "선택 해제됨"으로 판단해 이 버튼을 먼저 사라지게 만들어 클릭이 무시된다.
      onMouseDown={(e) => {
        e.preventDefault();
        onAsk(popup.text);
        window.getSelection()?.removeAllRanges();
        setPopup(null);
      }}
      className="z-50 rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-white shadow-lg hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
    >
      이 부분에 대해 질문하기
    </button>
  );
}
