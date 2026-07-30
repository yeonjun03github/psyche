'use client';

import { useRouter } from 'next/navigation';
import { clearAuthCookies } from '@/lib/auth-client';

export function LogoutButton() {
  const router = useRouter();

  function handleLogout() {
    clearAuthCookies();
    router.push('/login');
  }

  return (
    <button onClick={handleLogout} className="text-sm text-neutral-500 underline">
      로그아웃
    </button>
  );
}
