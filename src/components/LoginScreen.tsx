import React, { useState, useEffect } from 'react';
import {
  authenticateGASUser,
  type GASUserAccount,
  type GASConfig,
} from '../utils/arLogic';
import { isLiveGASUrl, callGASPost } from '../utils/gasClient';
import { INITIAL_GAS_CONFIG } from '../utils/seedData';

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
  onUpdateWebAppUrl,
}) => {
  // Navigation tab on login screen
  const [activeTab, setActiveTab] = useState<'login' | 'gas_config'>('login');

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Exec URL configuration state
  const [execUrlInput, setExecUrlInput] = useState(gasConfig.webAppUrl || '');
  const [confirmFeedback, setConfirmFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [isTestingUrl, setIsTestingUrl] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  // Sync if gasConfig prop updates
  useEffect(() => {
    setExecUrlInput(gasConfig.webAppUrl || '');
  }, [gasConfig.webAppUrl]);

  const isLiveEndpoint = isLiveGASUrl(gasConfig.webAppUrl);
  const isInputLive = isLiveGASUrl(execUrlInput);

  // Handle Login submission
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
      await new Promise((r) => setTimeout(r, 300));
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

  // Handle confirming and saving Google Web App exec URL
  const handleConfirmUrl = () => {
    const trimmed = execUrlInput.trim();
    setTestResult(null);

    if (!trimmed) {
      setConfirmFeedback({
        type: 'error',
        message: 'URL Google Apps Script Exec tidak boleh kosong.',
      });
      return;
    }

    if (!trimmed.startsWith('https://script.google.com/macros/s/')) {
      setConfirmFeedback({
        type: 'error',
        message:
          'Format URL tidak valid. Tautan Google Web App harus diawali dengan: https://script.google.com/macros/s/...',
      });
      return;
    }

    if (!trimmed.endsWith('/exec') && !trimmed.endsWith('/dev')) {
      setConfirmFeedback({
        type: 'error',
        message:
          'Peringatan: URL Web App Google Apps Script harus berakhiran /exec (atau /dev untuk pengujian).',
      });
      return;
    }

    if (onUpdateWebAppUrl) {
      onUpdateWebAppUrl(trimmed);
    }

    setConfirmFeedback({
      type: 'success',
      message:
        '✓ Link URL Exec Google Apps Script berhasil dikonfirmasi dan disimpan sebagai koneksi cloud aktif!',
    });

    // Auto-clear success message after 7 seconds
    setTimeout(() => {
      setConfirmFeedback(null);
    }, 7000);
  };

  // Test ping to the Google Apps Script Web App exec URL
  const handleTestPing = async () => {
    const targetUrl = execUrlInput.trim();
    if (!targetUrl) {
      setTestResult({
        ok: false,
        message: 'Masukkan URL Exec terlebih dahulu untuk diuji.',
      });
      return;
    }

    setIsTestingUrl(true);
    setTestResult(null);

    const res = await callGASPost<{ status?: string; message?: string }>(
      targetUrl,
      {
        action: 'ping',
      }
    );

    setIsTestingUrl(false);
    if (res.ok) {
      setTestResult({
        ok: true,
        message: `Terhubung langsung ke Google Apps Script Web App (${res.latencyMs}ms)! Siap menyinkronkan data.`,
        latencyMs: res.latencyMs,
      });
    } else {
      setTestResult({
        ok: false,
        message:
          res.error ||
          'Tidak dapat menjangkau Web App. Pastikan Web App di-deploy dengan pengaturan: "Who has access: Anyone" (Siapa saja).',
        latencyMs: res.latencyMs,
      });
    }
  };

  // Paste from clipboard helper
  const handlePasteUrl = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setExecUrlInput(text.trim());
        setConfirmFeedback({
          type: 'info',
          message: 'Tautan disalin dari clipboard. Klik tombol "Konfirmasi & Simpan Link Exec" di bawah untuk mengaktifkannya.',
        });
      }
    } catch {
      setConfirmFeedback({
        type: 'error',
        message: 'Gagal membaca clipboard. Silakan tempel (Ctrl+V) langsung ke input URL.',
      });
    }
  };

  // Copy current URL helper
  const handleCopyUrl = () => {
    if (execUrlInput) {
      navigator.clipboard?.writeText(execUrlInput);
      setConfirmFeedback({
        type: 'info',
        message: 'URL disalin ke clipboard.',
      });
    }
  };

  // Reset to default sample URL
  const handleResetDefaultUrl = () => {
    setExecUrlInput(INITIAL_GAS_CONFIG.webAppUrl);
    if (onUpdateWebAppUrl) {
      onUpdateWebAppUrl(INITIAL_GAS_CONFIG.webAppUrl);
    }
    setTestResult(null);
    setConfirmFeedback({
      type: 'info',
      message: 'URL dikembalikan ke URL simulasi bawaan.',
    });
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col justify-between relative overflow-hidden">
      {/* Top Status Header */}
      <header className="min-h-16 py-2 px-4 sm:px-6 bg-surface-card border-b border-border-grid flex items-center justify-between gap-3 z-10 flex-wrap">
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
                ENTERPRISE LEDGER
              </span>
            </div>
            <span className="font-code-audit text-text-dim block truncate text-xs">
              Sistem Piutang Usaha Terintegrasi Google Apps Script &amp; Google Drive
            </span>
          </div>
        </div>

        {/* Header Right Status & Fast Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() =>
              setActiveTab(activeTab === 'login' ? 'gas_config' : 'login')
            }
            className={`px-3 py-1.5 border font-code-audit text-xs uppercase flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'gas_config'
                ? 'bg-secondary text-surface-card border-secondary font-semibold'
                : 'bg-surface-input hover:bg-surface-container-high border-border-grid text-text-bright'
            }`}
            title="Klik untuk membuka tempat konfirmasi Link URL Exec Google"
          >
            <span className="material-symbols-outlined text-[16px]">
              link
            </span>
            <span>
              {activeTab === 'gas_config'
                ? 'Kembali ke Form Login'
                : 'Konfirmasi Link URL Exec Google'}
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                isLiveEndpoint ? 'bg-status-settled animate-pulse' : 'bg-secondary'
              }`}
            />
          </button>

          <div className="hidden sm:flex items-center gap-2 bg-surface-input px-3 py-1 border border-border-grid">
            <span
              className={`w-2 h-2 ${
                isLiveEndpoint ? 'bg-status-settled' : 'bg-secondary'
              }`}
            />
            <span className="font-code-audit text-tertiary uppercase font-semibold text-xs">
              {isLiveEndpoint ? 'Live Cloud GAS' : 'Simulasi / Lokal'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10">
        <div className="w-full max-w-xl border border-border-grid bg-surface-card shadow-2xl flex flex-col">
          {/* Card Tabs Navigation Header */}
          <div className="grid grid-cols-2 border-b border-border-grid bg-surface-container-low">
            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className={`py-3.5 px-4 font-headline-sm uppercase tracking-wide flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer text-xs sm:text-sm ${
                activeTab === 'login'
                  ? 'border-secondary bg-surface-card text-text-bright font-bold'
                  : 'border-transparent text-text-dim hover:text-text-bright hover:bg-surface-input'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                lock
              </span>
              <span>1. Otentikasi Login</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('gas_config')}
              className={`py-3.5 px-4 font-headline-sm uppercase tracking-wide flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer text-xs sm:text-sm ${
                activeTab === 'gas_config'
                  ? 'border-secondary bg-surface-card text-secondary font-bold'
                  : 'border-transparent text-text-dim hover:text-text-bright hover:bg-surface-input'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                link
              </span>
              <span className="truncate">2. Link URL Exec Google</span>
              {isLiveEndpoint && (
                <span className="w-1.5 h-1.5 rounded-full bg-status-settled" />
              )}
            </button>
          </div>

          {/* TAB 1: FORM LOGIN STAF */}
          {activeTab === 'login' && (
            <div className="p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-border-grid">
                  <div>
                    <h1 className="font-headline-md text-text-bright uppercase tracking-wide text-lg sm:text-xl">
                      Masuk ke Sistem Piutang
                    </h1>
                    <p className="font-code-audit text-text-dim text-xs mt-0.5">
                      Masukkan Username &amp; Kata Sandi akun terdaftar
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-surface-input border border-border-grid flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-secondary text-[24px]">
                      badge
                    </span>
                  </div>
                </div>

                {/* Cloud Connection Quick Indicator Banner */}
                <div className="mt-4 p-2.5 bg-surface-input border border-border-grid flex items-center justify-between text-xs font-code-audit">
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={`w-2 h-2 shrink-0 rounded-full ${
                        isLiveEndpoint ? 'bg-status-settled' : 'bg-secondary'
                      }`}
                    />
                    <span className="text-text-dim truncate">
                      Koneksi GAS:{' '}
                      <strong className="text-text-bright">
                        {isLiveEndpoint
                          ? 'Live Google Script Terhubung'
                          : 'Mode Standar / Lokal'}
                      </strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('gas_config')}
                    className="text-secondary hover:underline ml-2 shrink-0 font-semibold"
                  >
                    Ganti URL Exec &rarr;
                  </button>
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
                  {errorMsg && (
                    <div
                      role="alert"
                      className="p-3 bg-status-danger-surface border border-status-danger text-error font-body-sm flex items-start gap-2 text-xs sm:text-sm"
                    >
                      <span className="material-symbols-outlined text-[18px] shrink-0">
                        error
                      </span>
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Username Field */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="login-username"
                      className="font-label-caps text-text-dim uppercase flex items-center justify-between text-xs"
                    >
                      <span>Username / ID Pegawai *</span>
                      <span className="font-code-audit text-text-dim text-[11px]">
                        ID Resmi
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
                        placeholder="Contoh: rina.purnama"
                        autoComplete="username"
                        className="w-full h-11 px-3 bg-transparent text-text-bright font-code-audit focus:outline-none text-sm"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="login-password"
                      className="font-label-caps text-text-dim uppercase flex items-center justify-between text-xs"
                    >
                      <span>Password / Kata Sandi *</span>
                      <span className="font-code-audit text-text-dim text-[11px]">
                        Rahasia
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
                        placeholder="Masukkan kata sandi..."
                        autoComplete="current-password"
                        className="w-full h-11 px-3 bg-transparent text-text-bright font-code-audit focus:outline-none text-sm"
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

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="w-full h-11 mt-2 bg-secondary-container hover:bg-on-secondary-fixed-variant text-text-bright border border-secondary font-headline-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 text-sm"
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
          )}

          {/* TAB 2: TEMPAT KONFIRMASI LINK URL EXEC GOOGLE */}
          {activeTab === 'gas_config' && (
            <div className="p-6 sm:p-8 flex flex-col justify-between">
              <div>
                {/* Header Title */}
                <div className="flex items-center justify-between pb-4 border-b border-border-grid">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-status-settled" />
                      <h2 className="font-headline-md text-text-bright uppercase tracking-wide text-base sm:text-lg">
                        Konfirmasi Link URL Exec Google
                      </h2>
                    </div>
                    <p className="font-code-audit text-text-dim text-xs mt-0.5">
                      Tautkan Google Apps Script Web App (/exec) ke aplikasi ini
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-surface-input border border-secondary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-secondary text-[24px]">
                      cloud_sync
                    </span>
                  </div>
                </div>

                {/* Status Indicator Card */}
                <div
                  className={`mt-4 p-3 border font-code-audit text-xs flex items-start gap-2.5 ${
                    isLiveEndpoint
                      ? 'bg-status-settled/10 border-status-settled/40 text-text-bright'
                      : 'bg-surface-input border-border-grid text-text-dim'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[20px] shrink-0 ${
                      isLiveEndpoint ? 'text-status-settled' : 'text-secondary'
                    }`}
                  >
                    {isLiveEndpoint ? 'verified' : 'info'}
                  </span>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <strong className="text-text-bright uppercase">
                        {isLiveEndpoint
                          ? 'STATUS: LIVE CLOUD GAS WEB APP AKTIF'
                          : 'STATUS: MENGGUNAKAN URL DEFAULT / SIMULASI'}
                      </strong>
                      <span
                        className={`px-1.5 py-0.2 font-mono text-[10px] uppercase font-bold border ${
                          isLiveEndpoint
                            ? 'bg-status-settled text-surface-card border-status-settled'
                            : 'bg-secondary/20 text-secondary border-secondary/40'
                        }`}
                      >
                        {isLiveEndpoint ? 'LIVE CLOUD' : 'SIMULASI'}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      {isLiveEndpoint
                        ? 'Aplikasi telah terhubung ke Web App Google Apps Script asli Anda. Semua data transaksi piutang dan berkas tersinkronisasi langsung ke Google Sheets & Drive.'
                        : 'Belum ada URL deployment aktif yang tersimpan. Tempelkan URL Exec Google Apps Script Anda di bawah lalu klik tombol "Konfirmasi & Simpan".'}
                    </p>
                  </div>
                </div>

                {/* Notification Banner */}
                {confirmFeedback && (
                  <div
                    role="alert"
                    className={`mt-4 p-3 border font-code-audit text-xs flex items-start gap-2 ${
                      confirmFeedback.type === 'success'
                        ? 'bg-status-settled/15 border-status-settled text-text-bright'
                        : confirmFeedback.type === 'error'
                        ? 'bg-status-danger-surface border-status-danger text-error'
                        : 'bg-surface-input border-secondary text-text-bright'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px] shrink-0">
                      {confirmFeedback.type === 'success'
                        ? 'check_circle'
                        : confirmFeedback.type === 'error'
                        ? 'error'
                        : 'info'}
                    </span>
                    <span className="leading-snug">{confirmFeedback.message}</span>
                  </div>
                )}

                {/* Test Result Banner */}
                {testResult && (
                  <div
                    className={`mt-4 p-3 border font-code-audit text-xs flex items-start gap-2 ${
                      testResult.ok
                        ? 'bg-status-settled/15 border-status-settled text-text-bright'
                        : 'bg-surface-container-high border-border-accent text-secondary'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px] shrink-0">
                      {testResult.ok ? 'speed' : 'warning'}
                    </span>
                    <div className="space-y-0.5">
                      <div className="font-bold">
                        {testResult.ok
                          ? 'Uji Koneksi Berhasil (200 OK)'
                          : 'Hasil Uji Koneksi'}
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        {testResult.message}
                      </p>
                    </div>
                  </div>
                )}

                {/* Main URL Input Form Section */}
                <div className="mt-5 space-y-3">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="exec-url-input"
                      className="font-label-caps text-text-dim uppercase flex items-center justify-between text-xs"
                    >
                      <span>URL Web App Google Apps Script (/exec) *</span>
                      <span className="font-code-audit text-secondary text-[11px]">
                        {isInputLive ? 'Format Sesuai' : 'Wajib berakhiran /exec'}
                      </span>
                    </label>

                    <div className="relative flex items-center bg-surface-input border border-border-grid focus-within:border-secondary">
                      <span className="material-symbols-outlined text-[18px] text-text-dim pl-3 shrink-0">
                        link
                      </span>
                      <input
                        id="exec-url-input"
                        type="url"
                        value={execUrlInput}
                        onChange={(e) => {
                          setExecUrlInput(e.target.value);
                          setConfirmFeedback(null);
                        }}
                        placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                        className="w-full h-11 px-3 bg-transparent text-text-bright font-code-audit text-xs focus:outline-none"
                      />
                      {execUrlInput && (
                        <button
                          type="button"
                          onClick={() => setExecUrlInput('')}
                          className="px-2 text-text-dim hover:text-text-bright cursor-pointer"
                          title="Hapus input"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            close
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Helper Tool Buttons */}
                  <div className="flex items-center gap-2 flex-wrap text-xs font-code-audit">
                    <button
                      type="button"
                      onClick={handlePasteUrl}
                      className="px-2.5 py-1 bg-surface-input hover:bg-surface-container border border-border-grid text-text-bright flex items-center gap-1.5 cursor-pointer"
                      title="Tempel URL dari clipboard sistem"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        content_paste
                      </span>
                      <span>Tempel Clipboard</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyUrl}
                      disabled={!execUrlInput}
                      className="px-2.5 py-1 bg-surface-input hover:bg-surface-container border border-border-grid text-text-bright flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                      title="Salin URL saat ini"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        content_copy
                      </span>
                      <span>Salin URL</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResetDefaultUrl}
                      className="px-2.5 py-1 bg-surface-input hover:bg-surface-container border border-border-grid text-text-dim hover:text-text-bright ml-auto cursor-pointer"
                      title="Reset ke URL simulasi bawaan"
                    >
                      Reset Default
                    </button>
                  </div>

                  {/* Primary Action Buttons */}
                  <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                    <button
                      type="button"
                      onClick={handleConfirmUrl}
                      className="flex-1 h-11 bg-secondary-container hover:bg-on-secondary-fixed-variant text-text-bright border border-secondary font-headline-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer text-xs sm:text-sm font-bold shadow-lg"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        check_circle
                      </span>
                      <span>Konfirmasi &amp; Simpan Link Exec</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTestPing}
                      disabled={isTestingUrl || !execUrlInput}
                      className="h-11 px-4 bg-surface-input hover:bg-surface-container-high text-text-bright border border-border-grid font-headline-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-40 text-xs sm:text-sm"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {isTestingUrl ? 'sync' : 'sensors'}
                      </span>
                      <span>{isTestingUrl ? 'Menguji...' : 'Uji Koneksi'}</span>
                    </button>
                  </div>
                </div>

                {/* Quick Step-by-Step Guide */}
                <div className="mt-5 p-3.5 bg-surface-container-low border border-border-grid text-xs font-code-audit text-text-dim space-y-2">
                  <div className="flex items-center gap-2 text-text-bright font-semibold">
                    <span className="material-symbols-outlined text-secondary text-[16px]">
                      menu_book
                    </span>
                    <span>Panduan Mendapatkan URL Exec dari Google Sheets:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed">
                    <li>Buka Spreadsheet Google Anda &gt; menu <strong>Extensions</strong> &gt; <strong>Apps Script</strong>.</li>
                    <li>Pastikan kode script terpasang dengan fungsi <code className="text-secondary">doGet()</code> dan <code className="text-secondary">doPost()</code>.</li>
                    <li>Klik tombol biru <strong>Deploy</strong> &gt; <strong>New deployment</strong> &gt; pilih tipe <strong>Web app</strong>.</li>
                    <li>Atur <em>Execute as:</em> <strong>Me</strong> dan <em>Who has access:</em> <strong>Anyone</strong> (Siapa saja).</li>
                    <li>Salin <strong>Web App URL</strong> yang berakhiran <code className="text-text-bright bg-surface-card px-1 border border-border-grid">/exec</code> dan tempelkan di kotak di atas.</li>
                  </ol>
                </div>
              </div>

              {/* Bottom Navigation */}
              <div className="mt-6 pt-4 border-t border-border-grid flex items-center justify-between font-code-audit text-text-dim text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className="text-secondary hover:underline flex items-center gap-1 font-semibold"
                >
                  &larr; Lanjut ke Form Login Staf
                </button>
                <span>AR Tracker Pro GAS Gateway</span>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-3 px-6 bg-surface-card border-t border-border-grid flex flex-col sm:flex-row items-center justify-between gap-2 font-code-audit text-text-dim text-xs z-10">
        <span>&copy; {new Date().getFullYear()} AR Tracker Pro — Enterprise Financial Ledger</span>
        <span>Google Apps Script Web App Integration Active</span>
      </footer>
    </div>
  );
};
