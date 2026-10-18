import React, { useState } from 'react';
import {
  authenticateGASUser,
  type GASUserAccount,
  type GASConfig,
} from '../utils/arLogic';
import { isLiveGASUrl, callGASPost } from '../utils/gasClient';
import { COMPLETE_GAS_CODE_TEMPLATE } from '../utils/seedData';

interface LoginScreenProps {
  users: GASUserAccount[];
  gasConfig: GASConfig;
  onLoginSuccess: (user: GASUserAccount) => void;
  onUpdateWebAppUrl: (url: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  users,
  gasConfig,
  onLoginSuccess,
  onUpdateWebAppUrl,
}) => {
  const [username, setUsername] = useState('rina.purnama');
  const [password, setPassword] = useState('gas-admin-2025');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showScriptPreview, setShowScriptPreview] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const isLiveEndpoint = isLiveGASUrl(gasConfig.webAppUrl);
  const activeUsers = users.filter((u) => u.active);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        username,
        password,
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
      await new Promise((r) => setTimeout(r, 300));
    }

    // 2. Local / Synchronized GAS Users_Auth table verification
    const result = authenticateGASUser(users, username, password);
    setIsVerifying(false);

    if (!result.success || !result.user) {
      setErrorMsg(result.error || 'Otentikasi gagal.');
      return;
    }

    onLoginSuccess(result.user);
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMsg(null);
  };

  const handleCopyGAS = () => {
    navigator.clipboard?.writeText(COMPLETE_GAS_CODE_TEMPLATE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadGASFile = () => {
    const blob = new Blob([COMPLETE_GAS_CODE_TEMPLATE], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Code.gs';
    a.click();
    URL.revokeObjectURL(url);
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
                ENTERPRISE AUTH
              </span>
            </div>
            <span className="font-code-audit text-text-dim block truncate">
              Google Sheets &amp; Apps Script Authentication Gateway
            </span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-2 bg-surface-input px-3 py-1 border border-border-grid">
            <span
              className={`w-2 h-2 ${
                isLiveEndpoint ? 'bg-status-settled' : 'bg-secondary'
              }`}
            />
            <span className="font-code-audit text-tertiary uppercase font-semibold">
              Sheet: {gasConfig.sheetUsers}
            </span>
            <span className="font-code-audit text-text-dim border-l border-border-grid pl-2">
              {isLiveEndpoint ? 'Live GAS Endpoint' : 'GitHub Ready'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowScriptPreview(!showScriptPreview)}
            className="px-3 py-1.5 bg-surface-container-high border border-border-accent hover:bg-surface-variant text-text-bright font-label-caps uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] text-secondary">
              code
            </span>
            <span>Lihat Kode Auth Code.gs</span>
          </button>
        </div>
      </header>

      {/* Main Content Split */}
      <main className="flex-1 flex items-center justify-center p-6 z-10">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 border border-border-grid bg-surface-card shadow-2xl">
          {/* Left Panel: Enterprise Security Context & Quick Role Selector */}
          <div className="lg:col-span-6 p-8 bg-surface-container-low border-b lg:border-b-0 lg:border-r border-border-grid flex flex-col justify-between gap-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 font-code-audit text-secondary">
                <span>AR TRACKER PRO</span>
                <span>/</span>
                <span>GOOGLE APPS SCRIPT AUTH</span>
              </div>
              <h1 className="font-headline-lg text-text-bright tracking-tight">
                Sistem Pencatatan Piutang &amp; Verifikasi Berkas Terpusat
              </h1>
              <p className="font-body-md text-text-dim leading-relaxed">
                Otentikasi pengguna dikelola langsung melalui lembar kerja{' '}
                <code className="px-1.5 py-0.5 bg-surface-input text-tertiary font-code-audit border border-border-grid">
                  {gasConfig.sheetUsers}
                </code>{' '}
                dan fungsi{' '}
                <code className="px-1.5 py-0.5 bg-surface-input text-secondary font-code-audit border border-border-grid">
                  verifyUserCredentials()
                </code>{' '}
                pada Google Apps Script. Mendukung deployment statis via GitHub
                Pages.
              </p>

              {/* Active GAS Endpoint Box */}
              <div className="p-3 bg-surface-input border border-border-grid flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-label-caps text-text-dim uppercase">
                    URL Endpoint Google Apps Script (Web App)
                  </span>
                  <span
                    className={`font-code-audit ${
                      isLiveEndpoint
                        ? 'text-status-settled'
                        : 'text-status-pending'
                    }`}
                  >
                    {isLiveEndpoint ? 'LIVE GAS AKTIF' : 'SIMULASI LOKAL / DEMO'}
                  </span>
                </div>
                <input
                  type="text"
                  aria-label="URL Endpoint Google Apps Script"
                  value={gasConfig.webAppUrl}
                  onChange={(e) => onUpdateWebAppUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full bg-surface-card border border-border-grid px-2.5 py-1.5 font-code-audit text-text-bright focus:outline-none focus:border-secondary"
                />
                <span className="font-code-audit text-[10px] text-text-dim">
                  Kredensial login diverifikasi terhadap Spreadsheet ID:{' '}
                  {gasConfig.spreadsheetId.slice(0, 18)}...
                </span>
              </div>
            </div>

            {/* Quick Role Switcher dynamically mapped from Users_Auth */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-label-caps text-text-dim uppercase">
                  Akun Terdaftar di Google Script (Klik untuk Isi Cepat)
                </span>
                <span className="font-code-audit text-tertiary">
                  {activeUsers.length} Akun Aktif
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {users.map((u) => (
                  <button
                    key={u.username}
                    type="button"
                    onClick={() =>
                      handleQuickFill(u.username, u.password || '')
                    }
                    className={`p-2.5 text-left border transition-colors cursor-pointer ${
                      username === u.username
                        ? 'bg-primary-container border-secondary text-text-bright'
                        : 'bg-surface-input border-border-grid text-text-dim hover:text-text-bright'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-headline-sm text-text-bright truncate">
                        {u.fullName}
                      </span>
                      <span
                        className={`font-code-audit shrink-0 ${
                          u.active ? 'text-secondary' : 'text-status-danger'
                        }`}
                      >
                        {u.active ? u.role.split('/')[0].trim() : 'NONAKTIF'}
                      </span>
                    </div>
                    <div className="font-code-audit text-text-dim mt-0.5 truncate">
                      {u.username} / {u.password}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel: Login Form */}
          <div className="lg:col-span-6 p-8 flex flex-col justify-between bg-surface-card">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-border-grid">
                <div>
                  <h2 className="font-headline-md text-text-bright uppercase tracking-wide">
                    Otentikasi Sesi Operator
                  </h2>
                  <p className="font-code-audit text-text-dim mt-0.5">
                    Verifikasi User &amp; Password via Google Apps Script
                  </p>
                </div>
                <span className="material-symbols-outlined text-secondary text-[28px]">
                  lock_person
                </span>
              </div>

              <form
                onSubmit={handleSubmit}
                className="mt-6 flex flex-col gap-5"
              >
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
                    <span>Username / ID Pegawai (GAS) *</span>
                    <span className="font-code-audit text-secondary">
                      Kolom A: Username
                    </span>
                  </label>
                  <div className="relative flex items-center bg-surface-input border border-border-grid focus-within:border-secondary">
                    <span className="material-symbols-outlined text-[18px] text-text-dim pl-3">
                      badge
                    </span>
                    <input
                      id="login-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Masukkan username (misal: rina.purnama)"
                      className="w-full h-10 px-3 bg-transparent text-text-bright font-code-audit focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="login-password"
                    className="font-label-caps text-text-dim uppercase flex items-center justify-between"
                  >
                    <span>Password Kredensial GAS *</span>
                    <span className="font-code-audit text-secondary">
                      Kolom B: Password
                    </span>
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
                      placeholder="Masukkan password..."
                      className="w-full h-10 px-3 bg-transparent text-text-bright font-code-audit focus:outline-none"
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
                    <span>
                      Log masuk dicatat otomatis ke tab {gasConfig.sheetAudit}
                    </span>
                  </div>
                  <span className="text-tertiary">SHA-256</span>
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
                      ? 'Memverifikasi Kredensial GAS...'
                      : 'Masuk ke Pusat Kendali Piutang'}
                  </span>
                </button>
              </form>
            </div>

            <div className="mt-6 pt-4 border-t border-border-grid flex items-center justify-between font-code-audit text-text-dim">
              <span>
                Target Sheet: {gasConfig.sheetPiutang} &amp;{' '}
                {gasConfig.sheetUsers}
              </span>
              <span>GitHub Pages Compatible Build</span>
            </div>
          </div>
        </div>
      </main>

      {/* Modal: Preview Code.gs for User & Password Management */}
      {showScriptPreview && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-surface-card border border-border-accent flex flex-col max-h-[85vh]">
            <div className="px-5 py-3 bg-surface-container-high border-b border-border-grid flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">
                  terminal
                </span>
                <span className="font-headline-sm text-text-bright uppercase">
                  Kode Google Apps Script (Code.gs) — Pengaturan User &amp;
                  Password
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowScriptPreview(false)}
                aria-label="Tutup Modal Kode"
                className="p-1 text-text-dim hover:text-text-bright cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">
                  close
                </span>
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-3">
              <p className="font-body-sm text-text-dim">
                Salin skrip di bawah ini ke dalam editor{' '}
                <strong className="text-text-bright">
                  Extensions &gt; Apps Script
                </strong>{' '}
                di Google Sheets Anda. Fungsi{' '}
                <code className="text-tertiary font-code-audit">
                  verifyUserCredentials()
                </code>{' '}
                dan{' '}
                <code className="text-tertiary font-code-audit">
                  bootstrapSheets()
                </code>{' '}
                secara otomatis membuat dan membaca tab{' '}
                <code className="text-secondary font-code-audit">
                  Users_Auth
                </code>
                ,{' '}
                <code className="text-secondary font-code-audit">
                  Data_Piutang
                </code>
                , serta{' '}
                <code className="text-secondary font-code-audit">
                  Audit_Log_Sys
                </code>
                :
              </p>
              <pre className="p-4 bg-surface-input border border-border-grid font-code-audit text-text-bright overflow-x-auto leading-relaxed">
                <code>{COMPLETE_GAS_CODE_TEMPLATE}</code>
              </pre>
            </div>
            <div className="px-5 py-3 bg-surface-container border-t border-border-grid flex flex-wrap items-center justify-between gap-2">
              <span className="font-code-audit text-text-dim">
                Deploy sebagai Web App (Execute as: Me, Who has access: Anyone)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadGASFile}
                  className="px-3 py-1.5 bg-surface-input border border-border-grid text-text-bright font-label-caps uppercase flex items-center gap-1 cursor-pointer hover:border-secondary"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    download
                  </span>
                  <span>Unduh Code.gs</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyGAS}
                  className="px-4 py-1.5 bg-secondary-container text-text-bright font-label-caps uppercase flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    content_copy
                  </span>
                  <span>{copiedCode ? 'Kode Tersalin!' : 'Salin Code.gs'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowScriptPreview(false)}
                  className="px-4 py-1.5 bg-surface-input border border-border-grid text-text-bright font-label-caps uppercase cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
