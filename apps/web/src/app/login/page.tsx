'use client';

import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { useState, type FormEvent } from 'react';
import { authClient } from '@/lib/auth-client';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleGoogleScriptLoad() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const container = document.getElementById('google-signin-button');
    if (!clientId || !container || !window.google) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        setError(null);
        try {
          await authClient.loginWithGoogle(response.credential);
          router.push('/');
        } catch (e) {
          setError((e as Error).message);
        }
      },
    });
    window.google.accounts.id.renderButton(container, { theme: 'outline', size: 'large', width: 320 });
  }

  async function handlePasswordLogin(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await authClient.loginWithPassword(email, password);
      router.push('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 p-8 pt-16">
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={handleGoogleScriptLoad} />

      <header>
        <h1 className="text-2xl font-semibold">Psyche</h1>
        <p className="mt-1 text-sm text-neutral-500">Google 계정으로 로그인하거나 가입하세요.</p>
      </header>

      <div id="google-signin-button" />

      <div className="flex items-center gap-3 text-xs text-neutral-400">
        <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
        관리자 로그인
        <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
      </div>

      <form onSubmit={handlePasswordLogin} className="flex flex-col gap-3">
        <input
          type="email"
          required
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-neutral-200 px-4 py-2.5 text-sm dark:border-neutral-800 dark:bg-transparent"
        />
        <input
          type="password"
          required
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-neutral-200 px-4 py-2.5 text-sm dark:border-neutral-800 dark:bg-transparent"
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {submitting ? '로그인 중...' : '로그인'}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </main>
  );
}
