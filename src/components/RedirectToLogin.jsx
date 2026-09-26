import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

// Triggers the platform-hosted login flow (base44.auth.redirectToLogin).
// Used as ProtectedRoute's unauthenticatedElement so that:
//  - The automated Testing Agent is signed in automatically by the platform
//    (it cannot fill a custom login form).
//  - Real unauthenticated users are sent to the platform login and returned
//    to the page they originally requested.
// The custom /login, /register, /forgot-password, /reset-password routes
// remain registered for direct navigation and the password-reset flow.
export default function RedirectToLogin() {
  useEffect(() => {
    const nextUrl = window.location.pathname + window.location.search;
    base44.auth.redirectToLogin(nextUrl);
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
    </div>
  );
}