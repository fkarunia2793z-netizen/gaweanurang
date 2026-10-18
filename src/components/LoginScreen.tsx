import React, { useState } from 'react';
import {
  authenticateGASUser,
  type GASUserAccount,
  type GASConfig,
} from '../utils/arLogic';
import { isLiveGASUrl, callGASPost } from '../utils/gasClient';

interface LoginScreenProps {
  users: GASUserAccount[];
  gasConfig: GASConfig;
  onLoginSuccess: (user: GASUserAccount) => void;
  onUpdateWebAppUrl?: (url: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  users,
  gasConfig,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const isLiveEndpoint = isLiveGASUrl(gasConfig.webAppUrl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Mohon masukkan Username dan Password Anda.');
      return;
    }

    setErrorMsg(null);
    setIsVerifying(true);

    // 1. If a real Google Apps Script Web App URL is configured, verify directly against GAS Users_Auth
    if (isLiveEndpoint) {
      const liveResp = await callGASPost<{
        status: string;
        success?: boolean;
        user?: GASUserAccount;
        error?: string;
      }>(gasConfig.webAppUrl, {
        action: 'login',
        username: username.trim(),
        password: password.trim(),
      });

      if (liveResp.ok && liveResp.data) {
        setIsVerifying(false);
        if (liveResp.data.success && liveResp.data.user) {
          onLoginSuccess(liveResp.data.user);
          return;
        }
        if (liveResp.data.error) {
          setErrorMsg(liveResp.data.error);
          return;
        }
      }
    } else {
      await new Promise((r) => setTimeout(r, 350));
    }

    // 2. Local / Synchronized GAS Users_Auth table verification
    const result = authenticateGASUser(users, username.trim(), password.trim());
    setIsVerifying(false);

    if (!result.success || !result.user) {
      setErrorMsg(
        result.error ||
          'Kredensial tidak valid. Periksa kembali username dan password Anda.'
      );
      return;
    }

    onLoginSuccess(result.user);
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col justify-between relative overflow-hidden">
      {/* Top Status Header */}
      <header className="min-h-16 py-2 px-4 sm:px-6 bg-surface-card border-b border-border-grid flex items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-secondary-container border border-secondary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-text-bright text-[20px]">
              account_balance_wallet
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-headline-md text-text-bright tracking-tight whitespace-nowrap">
                AR Tracker Pro
              </span>
              <span className="px-1.5 py-0.5 bg-surface-input border border-border-accent text-secondary font-label-caps uppercase whitespace-nowrap">
                INTERNAL ACCESS
              </span>
            </div>
            <span className="font-code-audit text-text-dim block truncate">
              Sistem Pencatatan Piutang &amp; Manajemen Dokumen Perusahaan
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-surface-input px-3 py-1 border border-border-grid">
            <span
              className={`w-2 h-2 ${
                isLiveEndpoint ? 'bg-status-settled' : 'bg-secondary'
              }`}
            />
            <span className="font-code-audit text-tertiary uppercase font-semibold">
              Koneksi Aman
            </span>
            <span className="font-code-audit text-text-dim border-l border-border-grid pl-2">
              {isLiveEndpoint ? 'Live Cloud GAS' : 'Terenkripsi'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content: Focused Secure Login Card */}
      <main className="flex-1 flex items-center justify-center p-6 z-10">
        <div className="w-full max-w-md border border-border-grid bg-surface-card shadow-2xl p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-border-grid">
              <div>
                <h1 className="font-headline-md text-text-bright uppercase tracking-wide">
                  Otentikasi Pengguna
                </h1>
                <p className="font-code-audit text-text-dim mt-0.5">
                  Masukkan ID Pengguna &amp; Kata Sandi Anda
                </p>
              </div>
              <div className="w-10 h-10 bg-surface-input border border-border-grid flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-secondary text-[24px]">
                  lock
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
              {errorMsg && (
                <div
                  role="alert"
                  className="p-3 bg-status-danger-surface border border-status-danger text-error font-body-sm flex items-start gap-2"
                >
                  <span className="material-symbols-outlined text-[18px] shrink-0">
                    error
                  </span>
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="login-username"
                  className="font-label-caps text-text-dim uppercase flex items-center justify-between"
                >
                  <span>Username / ID Pegawai *</span>
                  <span className="font-code-audit text-text-dim">
                    Kredensial Resmi
                  </span>
                </label>
                <div className="relative flex items-center bg-surface-input border border-border-grid focus-within:border-secondary">
                  <span className="material-symbols-outlined text-[18px] text-text-dim pl-3">
                    person
                  </span>
                  <input
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username Anda..."
                    autoComplete="username"
                    className="w-full h-11 px-3 bg-transparent text-text-bright font-code-audit focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="login-password"
                  className="font-label-caps text-text-dim uppercase flex items-center justify-between"
                >
                  <span>Password / Kata Sandi *</span>
                  <span className="font-code-audit text-text-dim">Rahasia</span>
                </label>
                <div className="relative flex items-center bg-surface-input border border-border-grid focus-within:border-secondary">
                  <span className="material-symbols-outlined text-[18px] text-text-dim pl-3">
                    key
                  </span>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi..."
                    autoComplete="current-password"
                    className="w-full h-11 px-3 bg-transparent text-text-bright font-code-audit focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword
                        ? 'Sembunyikan Password'
                        : 'Tampilkan Password'
                    }
                    className="px-3 text-text-dim hover:text-text-bright cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-surface-container-low border border-border-grid flex items-center justify-between font-code-audit text-text-dim">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary text-[18px]">
                    verified_user
                  </span>
                  <span className="text-xs">
                    Sesi terenkripsi &amp; diverifikasi aman
                  </span>
                </div>
                <span className="text-status-settled font-semibold">SECURE</span>
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full h-11 bg-secondary-container hover:bg-on-secondary-fixed-variant text-text-bright border border-secondary font-headline-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isVerifying ? 'sync' : 'login'}
                </span>
                <span>
                  {isVerifying
                    ? 'Memverifikasi Kredensial...'
                    : 'Masuk ke Sistem'}
                </span>
              </button>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-border-grid flex items-center justify-between font-code-audit text-text-dim text-xs">
            <span>Akses Khusus Staf Resmi</span>
            <span className="text-secondary font-medium">AR Tracker Pro</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-3 px-6 bg-surface-card border-t border-border-grid flex flex-col sm:flex-row items-center justify-between gap-2 font-code-audit text-text-dim text-xs z-10">
        <span>&copy; {new Date().getFullYear()} AR Tracker Pro — Enterprise Financial Ledger</span>
        <span>Kerahasiaan &amp; Keamanan Data Terjaga</span>
      </footer>
    </div>
  );
};
