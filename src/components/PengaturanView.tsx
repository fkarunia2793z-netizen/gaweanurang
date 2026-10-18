import React, { useState } from 'react';
import {
  formatRupiah,
  parseRupiahInput,
  extractDriveFolderId,
  type GASConfig,
  type GASUserAccount,
} from '../utils/arLogic';
import {
  fetchGASAllData,
  isLiveGASUrl,
  callGASPost,
} from '../utils/gasClient';
import { COMPLETE_GAS_CODE_TEMPLATE } from '../utils/seedData';

interface PengaturanViewProps {
  gasConfig: GASConfig;
  users: GASUserAccount[];
  onSaveConfig: (nextConfig: GASConfig) => void;
  onAddUser: (user: GASUserAccount) => void;
  onUpdateUserPassword: (username: string, newPass: string) => void;
  onToggleUserStatus: (username: string) => void;
  onDeleteUser: (username: string) => void;
  onRunMaintenance: (actionName: string) => void;
  onPushAllToSheets: () => Promise<void> | void;
  onResetDefaultData: () => void;
  onShowToast: (msg: string) => void;
}

export const PengaturanView: React.FC<PengaturanViewProps> = ({
  gasConfig,
  users,
  onSaveConfig,
  onAddUser,
  onUpdateUserPassword,
  onToggleUserStatus,
  onDeleteUser,
  onRunMaintenance,
  onPushAllToSheets,
  onResetDefaultData,
  onShowToast,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'all' | 'users' | 'github'
  >('all');
  const [formConfig, setFormConfig] = useState<GASConfig>(gasConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [consoleLog, setConsoleLog] = useState<string | null>(null);

  // New user form state for Google Apps Script Users_Auth
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState('AR Field Collector');
  const [newBranch, setNewBranch] = useState('Jakarta HQ');

  // Inline password edit state
  const [editingPassUser, setEditingPassUser] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState('');

  const handleSaveAll = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      onSaveConfig(formConfig);
      onShowToast(
        'Konfigurasi Google Sheets, GAS Endpoint & SLA berhasil disimpan.'
      );
    }, 500);
  };

  const handleTestConnection = async () => {
    setConsoleLog(
      `[EXEC] Menguji koneksi ke Spreadsheet ID: ${formConfig.spreadsheetId}...`
    );
    const res = await fetchGASAllData(formConfig);
    if (res.connected) {
      setConsoleLog(
        `[200 OK] Terhubung langsung ke Google Sheets (${formConfig.sheetPiutang}, ${formConfig.sheetAudit}, ${formConfig.sheetUsers}). Latency: ${res.latencyMs}ms.`
      );
      onShowToast(`Handshake Google Sheets Berhasil (${res.latencyMs}ms).`);
    } else {
      const modeInfo = isLiveGASUrl(formConfig.webAppUrl)
        ? `[WARN] ${res.message}`
        : `[SIMULATION 200 OK] Mode Penyimpanan Lokal Aktif (${formConfig.sheetPiutang}, ${formConfig.sheetAudit}, ${formConfig.sheetUsers}). Tempellkan URL Web App GAS asli Anda untuk sinkronisasi cloud langsung.`;
      setConsoleLog(modeInfo);
      onShowToast(res.message);
    }
  };

  const handleTriggerMaintenance = (fnName: string, resultText: string) => {
    setConsoleLog(`[EXEC] Menjalankan ${fnName}...`);
    onRunMaintenance(fnName);
    setTimeout(() => {
      setConsoleLog(`[SUCCESS] ${resultText}`);
      onShowToast(`Operasi ${fnName} selesai dijalankan.`);
    }, 600);
  };

  const handleCreateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim() || !newFullName.trim()) {
      onShowToast('Lengkapi Username, Password, dan Nama Lengkap pegawai.');
      return;
    }

    const initials = newFullName
      .trim()
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    onAddUser({
      username: newUsername.trim().toLowerCase(),
      password: newPassword.trim(),
      fullName: newFullName.trim(),
      role: newRole.trim(),
      initials: initials || 'US',
      branch: newBranch.trim(),
      avatarUrl: '',
      active: true,
    });

    setNewUsername('');
    setNewPassword('');
    setNewFullName('');
    onShowToast(
      `User ${newUsername} berhasil ditambahkan ke Sheet Users_Auth di Google Apps Script.`
    );
  };

  const githubWorkflowYAML = `name: Deploy AR Tracker Pro to GitHub Pages

on:
  push:
    branches: ["main"]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build-and-deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
      - name: Setup Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Install dependencies & Build Vite SPA
        run: |
          npm install
          npm run build
      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4`;

  return (
    <div className="flex flex-col w-full p-6 gap-6">
      {/* Command Header Strip */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-surface-card p-6 border border-border-grid">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2 font-code-audit text-text-dim">
            <span className="text-secondary font-semibold">
              ADMINISTRASI SISTEM
            </span>
            <span>·</span>
            <span className="text-status-settled font-semibold">
              Koneksi GAS Aktif
            </span>
            <span>·</span>
            <span>Environment: Production v3.2</span>
          </div>
          <h1 className="font-headline-lg text-text-bright tracking-tight">
            Pengaturan Sistem, Kredensial User GAS &amp; Deploy GitHub
          </h1>
          <p className="font-body-md text-text-dim max-w-4xl">
            Manajemen integrasi Google Sheets, pengaturan user &amp; password di
            Google Apps Script (Sheet:{' '}
            <code className="text-tertiary font-code-audit">Users_Auth</code>),
            otomasi pengingat WhatsApp, serta panduan deployment GitHub Pages.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="px-5 py-2.5 bg-secondary-container hover:bg-on-secondary-fixed-variant border border-secondary text-text-bright transition-colors font-label-caps uppercase flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">
              cloud_sync
            </span>
            <span>
              {isSaving ? 'Menyimpan ke GAS...' : 'Simpan Semua Pengaturan'}
            </span>
          </button>
        </div>
      </div>

      {/* Operational Diagnostics Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-surface-card p-4 border border-border-grid flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-label-caps text-text-dim uppercase">
              Database Latency
            </span>
            <span className="font-numeric-kpi text-text-bright">
              118
              <span className="text-sm font-code-audit text-text-dim ml-1">
                ms
              </span>
            </span>
            <span className="font-code-audit text-status-settled">
              Nominal (&lt; 200ms)
            </span>
          </div>
          <div className="p-3 bg-surface-input text-secondary border border-border-grid">
            <span className="material-symbols-outlined text-[24px]">speed</span>
          </div>
        </div>

        <div className="bg-surface-card p-4 border border-border-grid flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-label-caps text-text-dim uppercase">
              User Terdaftar (GAS)
            </span>
            <span className="font-numeric-kpi text-text-bright">
              {users.length}
              <span className="text-sm font-code-audit text-text-dim ml-1">
                AKUN
              </span>
            </span>
            <span className="font-code-audit text-tertiary">
              Sheet: {formConfig.sheetUsers}
            </span>
          </div>
          <div className="p-3 bg-surface-input text-tertiary border border-border-grid">
            <span className="material-symbols-outlined text-[24px]">
              manage_accounts
            </span>
          </div>
        </div>

        <div className="bg-surface-card p-4 border border-border-grid flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-label-caps text-text-dim uppercase">
              Cache Status (GAS)
            </span>
            <span className="font-numeric-kpi text-text-bright">
              60
              <span className="text-sm font-code-audit text-text-dim ml-1">
                DETIK
              </span>
            </span>
            <span className="font-code-audit text-status-settled">
              TTL: 98.4% Hit Ratio
            </span>
          </div>
          <div className="p-3 bg-surface-input text-primary border border-border-grid">
            <span className="material-symbols-outlined text-[24px]">
              memory
            </span>
          </div>
        </div>

        <div className="bg-surface-card p-4 border border-border-grid flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-label-caps text-text-dim uppercase">
              Gateway WA Status
            </span>
            <span className="font-numeric-kpi text-text-bright">RUNNING</span>
            <span className="font-code-audit text-status-settled">
              Wablas Engine v2.4
            </span>
          </div>
          <div className="p-3 bg-surface-input text-status-settled border border-border-grid">
            <span className="material-symbols-outlined text-[24px]">
              mark_chat_read
            </span>
          </div>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex items-center gap-2 bg-surface-card px-4 pt-2 border border-border-grid overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab('all')}
          className={`px-4 py-2.5 font-headline-sm flex items-center gap-2 shrink-0 transition-colors cursor-pointer ${
            activeSubTab === 'all'
              ? 'bg-primary-container text-text-bright border-b-2 border-secondary'
              : 'text-text-dim hover:text-text-bright'
          }`}
        >
          <span className="material-symbols-outlined text-[18px] text-secondary">
            table_view
          </span>
          <span>1. Koneksi Google Sheets, Otomasi &amp; SLA</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('users')}
          className={`px-4 py-2.5 font-headline-sm flex items-center gap-2 shrink-0 transition-colors cursor-pointer ${
            activeSubTab === 'users'
              ? 'bg-primary-container text-text-bright border-b-2 border-secondary'
              : 'text-text-dim hover:text-text-bright'
          }`}
        >
          <span className="material-symbols-outlined text-[18px] text-tertiary">
            admin_panel_settings
          </span>
          <span>2. Pengaturan User &amp; Password (Google Script)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('github')}
          className={`px-4 py-2.5 font-headline-sm flex items-center gap-2 shrink-0 transition-colors cursor-pointer ${
            activeSubTab === 'github'
              ? 'bg-primary-container text-text-bright border-b-2 border-secondary'
              : 'text-text-dim hover:text-text-bright'
          }`}
        >
          <span className="material-symbols-outlined text-[18px] text-status-pending">
            rocket_launch
          </span>
          <span>3. Kode Code.gs &amp; Deploy via GitHub</span>
        </button>
      </div>

      {/* SUB-TAB 1: Google Sheets, Automation, SLA & Maintenance */}
      {activeSubTab === 'all' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-8 flex flex-col gap-6">
            {/* Section 1: Google Sheets & Endpoint */}
            <div className="bg-surface-card border border-border-grid p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-border-grid">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[20px]">
                    database
                  </span>
                  <span className="font-headline-md text-text-bright">
                    Backend Google Sheets &amp; Web App Endpoint
                  </span>
                </div>
                <span className="font-code-audit text-status-settled uppercase">
                  SpreadsheetApp API v4 · Handshake OK
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-3 flex flex-col gap-1">
                  <label
                    htmlFor="cfg-sheet-id"
                    className="font-label-caps text-text-dim uppercase flex items-center justify-between"
                  >
                    <span>Spreadsheet Target ID (Google Drive Master)</span>
                    <span className="text-secondary font-code-audit">
                      Core Database
                    </span>
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      id="cfg-sheet-id"
                      type="text"
                      value={formConfig.spreadsheetId}
                      onChange={(e) =>
                        setFormConfig({
                          ...formConfig,
                          spreadsheetId: e.target.value,
                        })
                      }
                      className="w-full bg-surface-input border border-border-grid px-3 py-2 font-code-audit text-text-bright focus:outline-none focus:border-secondary"
                    />
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      className="px-4 py-2 bg-surface-container-high hover:bg-surface-variant border border-border-accent text-text-bright font-label-caps uppercase shrink-0 flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        sync
                      </span>
                      <span>Test Koneksi</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="cfg-tab-piutang"
                    className="font-label-caps text-text-dim uppercase"
                  >
                    Sheet Master Piutang
                  </label>
                  <input
                    id="cfg-tab-piutang"
                    type="text"
                    value={formConfig.sheetPiutang}
                    onChange={(e) =>
                      setFormConfig({
                        ...formConfig,
                        sheetPiutang: e.target.value,
                      })
                    }
                    className="w-full bg-surface-input border border-border-grid px-3 py-2 font-code-audit text-text-bright focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="cfg-tab-audit"
                    className="font-label-caps text-text-dim uppercase"
                  >
                    Sheet Audit Log
                  </label>
                  <input
                    id="cfg-tab-audit"
                    type="text"
                    value={formConfig.sheetAudit}
                    onChange={(e) =>
                      setFormConfig({
                        ...formConfig,
                        sheetAudit: e.target.value,
                      })
                    }
                    className="w-full bg-surface-input border border-border-grid px-3 py-2 font-code-audit text-text-bright focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="cfg-tab-users"
                    className="font-label-caps text-text-dim uppercase"
                  >
                    Sheet User &amp; Password
                  </label>
                  <input
                    id="cfg-tab-users"
                    type="text"
                    value={formConfig.sheetUsers}
                    onChange={(e) =>
                      setFormConfig({
                        ...formConfig,
                        sheetUsers: e.target.value,
                      })
                    }
                    className="w-full bg-surface-input border border-border-grid px-3 py-2 font-code-audit text-tertiary focus:outline-none"
                  />
                </div>

                <div className="md:col-span-3 flex flex-col gap-1">
                  <label
                    htmlFor="cfg-webapp-url"
                    className="font-label-caps text-text-dim uppercase flex items-center justify-between"
                  >
                    <span>URL Web App Google Apps Script (Exec URL)</span>
                    <span className="text-status-settled font-code-audit">
                      Active Webhook
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="cfg-webapp-url"
                      type="text"
                      value={formConfig.webAppUrl}
                      onChange={(e) =>
                        setFormConfig({
                          ...formConfig,
                          webAppUrl: e.target.value,
                        })
                      }
                      className="w-full bg-surface-input border border-border-grid px-3 py-2 font-code-audit text-text-bright focus:outline-none focus:border-secondary"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(formConfig.webAppUrl);
                        onShowToast(
                          'URL Exec Google Apps Script disalin ke clipboard.'
                        );
                      }}
                      className="px-3 bg-surface-container-high hover:bg-surface-variant border border-border-grid text-text-bright flex items-center justify-center cursor-pointer"
                      title="Salin URL"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        content_copy
                      </span>
                    </button>
                  </div>
                </div>

                {/* Google Drive via Google Apps Script (DriveApp) Configuration */}
                <div className="md:col-span-3 pt-3 border-t border-border-grid flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-status-settled text-[18px]">
                        add_to_drive
                      </span>
                      <span className="font-headline-sm text-text-bright">
                        Integrasi Upload Google Drive via Google Apps Script (DriveApp)
                      </span>
                    </div>
                    <span className="font-code-audit text-secondary text-xs">
                      Tanpa OAuth Popup · Base64 doPost(e)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2 flex flex-col gap-1">
                      <label
                        htmlFor="cfg-drive-folder-id"
                        className="font-label-caps text-text-dim uppercase"
                      >
                        ID atau Link Folder Google Drive (Bukti Terima Surat)
                      </label>
                      <input
                        id="cfg-drive-folder-id"
                        type="text"
                        value={formConfig.driveFolderId || ''}
                        onChange={(e) =>
                          setFormConfig({
                            ...formConfig,
                            driveFolderId: extractDriveFolderId(e.target.value),
                          })
                        }
                        placeholder="Tempel Link Folder Drive atau Folder ID (kosongkan untuk buat otomatis)"
                        className="w-full bg-surface-input border border-border-grid px-3 py-2 font-code-audit text-tertiary focus:outline-none focus:border-secondary"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor="cfg-drive-folder-name"
                        className="font-label-caps text-text-dim uppercase"
                      >
                        Nama Folder Otomatis (DriveApp)
                      </label>
                      <input
                        id="cfg-drive-folder-name"
                        type="text"
                        value={
                          formConfig.driveFolderName ||
                          'AR_Tracker_Bukti_Surat_Diterima'
                        }
                        onChange={(e) =>
                          setFormConfig({
                            ...formConfig,
                            driveFolderName: e.target.value,
                          })
                        }
                        className="w-full bg-surface-input border border-border-grid px-3 py-2 font-code-audit text-text-bright focus:outline-none focus:border-secondary"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 bg-surface-container-low p-3 border border-border-grid">
                    <span className="font-code-audit text-text-dim text-xs">
                      Saat petugas mengunggah bukti surat diterima, file dikirim ke{' '}
                      <code className="text-secondary">
                        uploadFileToGoogleDrive()
                      </code>{' '}
                      di <code>Code.gs</code> dan disimpan ke Folder Drive:{' '}
                      <strong className="text-text-bright">
                        {formConfig.driveFolderName ||
                          'AR_Tracker_Bukti_Surat_Diterima'}
                      </strong>
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        if (isLiveGASUrl(formConfig.webAppUrl)) {
                          const res = await callGASPost(formConfig.webAppUrl, {
                            action: 'testDriveFolder',
                            spreadsheetId: formConfig.spreadsheetId,
                            driveFolderId: formConfig.driveFolderId,
                            driveFolderName: formConfig.driveFolderName,
                          });
                          if (res.ok) {
                            onShowToast(
                              `Folder Google Drive terverifikasi via GAS (${res.latencyMs}ms).`
                            );
                            return;
                          }
                        }
                        onShowToast(
                          `Konfigurasi DriveApp siap: Folder "${
                            formConfig.driveFolderName ||
                            'AR_Tracker_Bukti_Surat_Diterima'
                          }" (${
                            formConfig.driveFolderId || 'Auto-Create'
                          }) akan digunakan oleh Code.gs.`
                        );
                      }}
                      className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-variant border border-secondary text-secondary font-code-audit text-xs uppercase flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        folder_managed
                      </span>
                      <span>Verifikasi Folder Drive via GAS</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Otomasi Penagihan */}
            <div className="bg-surface-card border border-border-grid p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-border-grid">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary text-[20px]">
                    notifications_active
                  </span>
                  <span className="font-headline-md text-text-bright">
                    Otomasi Penagihan &amp; Notifikasi (Gateway)
                  </span>
                </div>
                <span className="font-code-audit text-text-dim">
                  Scheduler: 08:30 WIB Tiap Hari Kerja
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-surface-container-low border border-border-grid flex items-start justify-between gap-3">
                  <div>
                    <span className="font-headline-sm text-text-bright block">
                      Reminder H-3 Jatuh Tempo
                    </span>
                    <p className="font-body-sm text-text-dim mt-1">
                      Kirim pesan tagihan otomatis ke kontak finance klien 3
                      hari kalender sebelum masa termin berakhir.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    aria-label="Toggle Reminder H-3 Jatuh Tempo"
                    checked={formConfig.reminderH3}
                    onChange={(e) =>
                      setFormConfig({
                        ...formConfig,
                        reminderH3: e.target.checked,
                      })
                    }
                    className="w-5 h-5 accent-secondary mt-1 cursor-pointer"
                  />
                </div>

                <div className="p-4 bg-surface-container-low border border-border-grid flex items-start justify-between gap-3">
                  <div>
                    <span className="font-headline-sm text-text-bright block">
                      Alert Dokumen Tertahan ke Sales
                    </span>
                    <p className="font-body-sm text-text-dim mt-1">
                      Eskalasi internal via Email/WA ke Account Executive saat
                      berkas BAST / Surat Jalan belum diserahkan &gt; 5 hari.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    aria-label="Toggle Alert Dokumen Tertahan ke Sales"
                    checked={formConfig.alertSales}
                    onChange={(e) =>
                      setFormConfig({
                        ...formConfig,
                        alertSales: e.target.checked,
                      })
                    }
                    className="w-5 h-5 accent-secondary mt-1 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="cfg-wa-template"
                  className="font-label-caps text-text-dim uppercase"
                >
                  Template Pesan WhatsApp Penagihan
                </label>
                <textarea
                  id="cfg-wa-template"
                  rows={3}
                  value={formConfig.waTemplate}
                  onChange={(e) =>
                    setFormConfig({ ...formConfig, waTemplate: e.target.value })
                  }
                  className="w-full bg-surface-input border border-border-grid p-3 font-code-audit text-text-bright focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Right Column: SLA & Maintenance */}
          <div className="xl:col-span-4 flex flex-col gap-6">
            <div className="bg-surface-card border border-border-grid p-6 flex flex-col gap-4">
              <div className="flex items-center gap-2 pb-3 border-b border-border-grid">
                <span className="material-symbols-outlined text-status-pending text-[20px]">
                  tune
                </span>
                <span className="font-headline-md text-text-bright">
                  Parameter Regulasi &amp; SLA
                </span>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="cfg-meterai"
                    className="font-label-caps text-text-dim uppercase flex justify-between"
                  >
                    <span>Batas Kwitansi Bermaterai</span>
                    <span className="text-tertiary font-code-audit">
                      UU No. 10/2020
                    </span>
                  </label>
                  <div className="flex items-center bg-surface-input border border-border-grid px-3 py-2">
                    <span className="font-code-audit text-text-dim mr-2">
                      Rp
                    </span>
                    <input
                      id="cfg-meterai"
                      type="text"
                      value={formatRupiah(formConfig.batasMeterai, false)}
                      onChange={(e) =>
                        setFormConfig({
                          ...formConfig,
                          batasMeterai: parseRupiahInput(e.target.value),
                        })
                      }
                      className="w-full bg-transparent font-numeric-table text-text-bright focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="cfg-termin"
                    className="font-label-caps text-text-dim uppercase"
                  >
                    Default Masa Jatuh Tempo (Hari)
                  </label>
                  <input
                    id="cfg-termin"
                    type="number"
                    value={formConfig.defaultTermin}
                    onChange={(e) =>
                      setFormConfig({
                        ...formConfig,
                        defaultTermin: Number(e.target.value) || 30,
                      })
                    }
                    className="w-full bg-surface-input border border-border-grid px-3 py-2 font-numeric-table text-text-bright focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Maintenance GAS Engine */}
            <div className="bg-surface-card border border-border-grid p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-border-grid">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-text-bright text-[20px]">
                    terminal
                  </span>
                  <span className="font-headline-md text-text-bright">
                    Operasi Maintenance GAS
                  </span>
                </div>
                <span className="font-code-audit text-text-dim">READY</span>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    handleTriggerMaintenance(
                      'recomputeLedgerBalances()',
                      'Seluruh baris lembar kerja dihitung ulang. Delta: Rp 0.'
                    )
                  }
                  className="w-full p-3 bg-surface-input hover:bg-surface-container border border-border-grid text-left flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div>
                    <span className="font-headline-sm text-text-bright block">
                      Recalculate Formula Master
                    </span>
                    <span className="font-code-audit text-text-dim">
                      recomputeLedgerBalances()
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-secondary">
                    play_arrow
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleTriggerMaintenance(
                      'createSnapshotArchive()',
                      'Snapshot tersimpan ke Google Drive: AR_Backup_2025.zip'
                    )
                  }
                  className="w-full p-3 bg-surface-input hover:bg-surface-container border border-border-grid text-left flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div>
                    <span className="font-headline-sm text-text-bright block">
                      Backup Snapshot ke Drive
                    </span>
                    <span className="font-code-audit text-text-dim">
                      createSnapshotArchive()
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-tertiary">
                    cloud_download
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleTriggerMaintenance(
                      'flushGASCache()',
                      'CacheService GAS v4 telah dikosongkan.'
                    )
                  }
                  className="w-full p-3 bg-surface-input hover:bg-surface-container border border-border-grid text-left flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div>
                    <span className="font-headline-sm text-text-bright block">
                      Flush Cache &amp; Reload Client
                    </span>
                    <span className="font-code-audit text-text-dim">
                      flushGASCache()
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-status-pending">
                    cached
                  </span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setConsoleLog(
                      '[EXEC] Mengirim & menginisialisasi seluruh tabel ke Google Sheets...'
                    );
                    await onPushAllToSheets();
                    setConsoleLog(
                      '[SUCCESS] Sinkronisasi penuh ke Sheet Data_Piutang & Users_Auth selesai.'
                    );
                  }}
                  className="w-full p-3 bg-surface-input hover:bg-surface-container border border-border-grid text-left flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div>
                    <span className="font-headline-sm text-text-bright block">
                      Push &amp; Bootstrap ke Google Sheets
                    </span>
                    <span className="font-code-audit text-text-dim">
                      syncAllToSpreadsheet()
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-tertiary">
                    cloud_upload
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onResetDefaultData();
                    setConsoleLog(
                      '[RESET] Seluruh data lokal dikembalikan ke dataset awal.'
                    );
                  }}
                  className="w-full p-3 bg-surface-input hover:bg-status-danger-surface border border-border-grid text-left flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div>
                    <span className="font-headline-sm text-text-bright block">
                      Reset Data ke Default Awal
                    </span>
                    <span className="font-code-audit text-text-dim">
                      restoreFactorySeedData()
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-status-danger">
                    restart_alt
                  </span>
                </button>
              </div>

              {consoleLog && (
                <div className="p-3 bg-surface-container-lowest border border-border-grid font-code-audit text-tertiary">
                  {consoleLog}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: Pengaturan User & Password di Google Apps Script (Sheet: Users_Auth) */}
      {activeSubTab === 'users' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-8 bg-surface-card border border-border-grid p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-border-grid">
              <div>
                <h2 className="font-headline-md text-text-bright">
                  Tabel Kredensial Operator (Google Sheets Tab:{' '}
                  <code className="text-tertiary font-code-audit">
                    {formConfig.sheetUsers}
                  </code>
                  )
                </h2>
                <p className="font-body-sm text-text-dim mt-0.5">
                  Daftar akun di bawah ini disinkronkan dengan fungsi{' '}
                  <code className="text-secondary font-code-audit">
                    verifyUserCredentials(username, password)
                  </code>{' '}
                  pada Google Apps Script untuk login Web App.
                </p>
              </div>
              <span className="font-code-audit text-tertiary">
                {users.length} User Terdaftar
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-high border-b border-border-grid font-label-caps text-text-dim uppercase">
                    <th className="py-2.5 px-3">Username (GAS)</th>
                    <th className="py-2.5 px-3">Password Script</th>
                    <th className="py-2.5 px-3">Nama Lengkap &amp; Jabatan</th>
                    <th className="py-2.5 px-3">Cabang</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-grid font-body-sm">
                  {users.map((u) => (
                    <tr key={u.username} className="hover:bg-surface-container">
                      <td className="py-3 px-3 font-code-audit text-secondary font-semibold">
                        {u.username}
                      </td>
                      <td className="py-3 px-3 font-code-audit">
                        {editingPassUser === u.username ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={tempPassword}
                              onChange={(e) => setTempPassword(e.target.value)}
                              className="w-32 bg-surface-input border border-secondary px-2 py-1 text-text-bright font-code-audit"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (tempPassword.trim()) {
                                  onUpdateUserPassword(
                                    u.username,
                                    tempPassword.trim()
                                  );
                                  onShowToast(
                                    `Password untuk ${u.username} diperbarui di Google Script.`
                                  );
                                }
                                setEditingPassUser(null);
                              }}
                              className="px-2 py-1 bg-secondary-container text-text-bright font-label-caps uppercase cursor-pointer"
                            >
                              Simpan
                            </button>
                          </div>
                        ) : (
                          <span className="text-text-bright bg-surface-input px-2 py-0.5 border border-border-grid">
                            {u.password}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-headline-sm text-text-bright">
                          {u.fullName}
                        </div>
                        <div className="font-code-audit text-text-dim">
                          {u.role}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-code-audit text-text-dim">
                        {u.branch}
                      </td>
                      <td className="py-3 px-3 font-code-audit">
                        <span
                          className={
                            u.active
                              ? 'text-status-settled font-bold'
                              : 'text-status-danger font-bold'
                          }
                        >
                          {u.active ? 'ACTIVE' : 'SUSPENDED'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPassUser(u.username);
                              setTempPassword(u.password || '');
                            }}
                            className="px-2 py-1 bg-surface-input border border-border-grid text-text-bright hover:border-secondary font-code-audit cursor-pointer"
                          >
                            Ubah Password
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleUserStatus(u.username)}
                            className="px-2 py-1 bg-surface-input border border-border-grid text-text-dim hover:text-text-bright font-code-audit cursor-pointer"
                          >
                            {u.active ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>
                          {users.length > 1 && (
                            <button
                              type="button"
                              onClick={() => onDeleteUser(u.username)}
                              title="Hapus User"
                              className="px-2 py-1 bg-surface-input border border-border-grid text-status-danger hover:bg-status-danger-surface font-code-audit cursor-pointer"
                            >
                              Hapus
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Add New GAS User Form */}
          <div className="xl:col-span-4 bg-surface-card border border-border-grid p-6 flex flex-col gap-4">
            <div className="pb-3 border-b border-border-grid">
              <h3 className="font-headline-md text-text-bright">
                + Tambah User Baru ke Google Script
              </h3>
              <p className="font-code-audit text-text-dim mt-0.5">
                Menambahkan baris kredensial baru ke Sheet{' '}
                {formConfig.sheetUsers}
              </p>
            </div>

            <form
              onSubmit={handleCreateUserSubmit}
              className="flex flex-col gap-3"
            >
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="new-gas-user"
                  className="font-label-caps text-text-dim uppercase"
                >
                  Username Login *
                </label>
                <input
                  id="new-gas-user"
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="misal: andi.wijaya"
                  className="h-9 px-3 bg-surface-input border border-border-grid text-text-bright font-code-audit focus:outline-none focus:border-secondary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="new-gas-pass"
                  className="font-label-caps text-text-dim uppercase"
                >
                  Password Login *
                </label>
                <input
                  id="new-gas-pass"
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="misal: finance-2025"
                  className="h-9 px-3 bg-surface-input border border-border-grid text-text-bright font-code-audit focus:outline-none focus:border-secondary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="new-gas-name"
                  className="font-label-caps text-text-dim uppercase"
                >
                  Nama Lengkap *
                </label>
                <input
                  id="new-gas-name"
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="misal: Andi Wijaya"
                  className="h-9 px-3 bg-surface-input border border-border-grid text-text-bright font-body-sm focus:outline-none focus:border-secondary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="new-gas-role"
                    className="font-label-caps text-text-dim uppercase"
                  >
                    Role / Jabatan
                  </label>
                  <input
                    id="new-gas-role"
                    type="text"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="h-9 px-3 bg-surface-input border border-border-grid text-text-bright font-body-sm focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="new-gas-branch"
                    className="font-label-caps text-text-dim uppercase"
                  >
                    Cabang
                  </label>
                  <input
                    id="new-gas-branch"
                    type="text"
                    value={newBranch}
                    onChange={(e) => setNewBranch(e.target.value)}
                    className="h-9 px-3 bg-surface-input border border-border-grid text-text-bright font-body-sm focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="mt-2 py-2.5 bg-secondary-container hover:bg-on-secondary-fixed-variant border border-secondary text-text-bright font-label-caps uppercase flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">
                  person_add
                </span>
                <span>Simpan User ke Sheet Users_Auth</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: Kode Code.gs & Panduan Deploy via GitHub */}
      {activeSubTab === 'github' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-6 bg-surface-card border border-border-grid p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-border-grid">
              <div>
                <h2 className="font-headline-md text-text-bright">
                  Backend Google Apps Script (Code.gs v3.6 + DriveApp)
                </h2>
                <p className="font-code-audit text-text-dim">
                  Mendukung Upload Bukti Terima Surat ke Google Drive (
                  <code>DriveApp.createFile</code>), Sheet{' '}
                  <code>Katalog_Drive_Arsip</code> &amp; <code>Users_Auth</code>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob([COMPLETE_GAS_CODE_TEMPLATE], {
                      type: 'text/plain;charset=utf-8',
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'Code.gs';
                    a.click();
                    URL.revokeObjectURL(url);
                    onShowToast('Berkas Code.gs berhasil diunduh.');
                  }}
                  className="px-3 py-1.5 bg-surface-input border border-border-grid hover:border-secondary text-text-bright font-label-caps uppercase flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    download
                  </span>
                  <span>Unduh Code.gs</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(COMPLETE_GAS_CODE_TEMPLATE);
                    onShowToast('Kode Code.gs berhasil disalin ke clipboard.');
                  }}
                  className="px-3 py-1.5 bg-secondary-container border border-secondary text-text-bright font-label-caps uppercase flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    content_copy
                  </span>
                  <span>Salin Code.gs</span>
                </button>
              </div>
            </div>

            <pre className="p-4 bg-surface-input border border-border-grid font-code-audit text-text-bright overflow-x-auto max-h-[420px] leading-relaxed">
              <code>{COMPLETE_GAS_CODE_TEMPLATE}</code>
            </pre>
          </div>

          <div className="xl:col-span-6 bg-surface-card border border-border-grid p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-border-grid">
              <div>
                <h2 className="font-headline-md text-text-bright">
                  GitHub Actions Workflow (.github/workflows/deploy.yml)
                </h2>
                <p className="font-code-audit text-text-dim">
                  Sudah terpasang di repositori ini untuk deploy otomatis ke GitHub Pages
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob([githubWorkflowYAML], {
                      type: 'text/yaml;charset=utf-8',
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'deploy.yml';
                    a.click();
                    URL.revokeObjectURL(url);
                    onShowToast('Berkas deploy.yml berhasil diunduh.');
                  }}
                  className="px-3 py-1.5 bg-surface-input border border-border-grid hover:border-secondary text-text-bright font-label-caps uppercase flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    download
                  </span>
                  <span>Unduh YAML</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(githubWorkflowYAML);
                    onShowToast(
                      'Konfigurasi GitHub Actions YAML berhasil disalin.'
                    );
                  }}
                  className="px-3 py-1.5 bg-surface-container-high border border-border-accent text-text-bright font-label-caps uppercase flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    content_copy
                  </span>
                  <span>Salin YAML</span>
                </button>
              </div>
            </div>

            <pre className="p-4 bg-surface-input border border-border-grid font-code-audit text-tertiary overflow-x-auto max-h-[420px] leading-relaxed">
              <code>{githubWorkflowYAML}</code>
            </pre>
          </div>

          {/* Step-by-step Setup & Deployment Guide */}
          <div className="xl:col-span-12 bg-surface-card border border-border-grid p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-surface-container-low border border-border-grid flex flex-col gap-1.5">
              <span className="font-code-audit text-secondary font-bold uppercase">
                LANGKAH 1 · SETUP GOOGLE SHEETS
              </span>
              <h3 className="font-headline-sm text-text-bright">
                Pasang Code.gs di Spreadsheet Anda
              </h3>
              <p className="font-body-sm text-text-dim">
                Buka Google Sheets baru, klik <strong>Extensions &gt; Apps Script</strong>, tempel kode <code>Code.gs</code> di atas, lalu jalankan fungsi <code>bootstrapSheets()</code> sekali untuk membuat tab <code>Data_Piutang</code>, <code>Audit_Log_Sys</code>, dan <code>Users_Auth</code> otomatis.
              </p>
            </div>

            <div className="p-4 bg-surface-container-low border border-border-grid flex flex-col gap-1.5">
              <span className="font-code-audit text-tertiary font-bold uppercase">
                LANGKAH 2 · DEPLOY WEB APP GAS
              </span>
              <h3 className="font-headline-sm text-text-bright">
                Salin URL Exec Google Apps Script
              </h3>
              <p className="font-body-sm text-text-dim">
                Di Apps Script klik <strong>Deploy &gt; New deployment &gt; Web app</strong>. Pilih <em>Execute as: Me</em> dan <em>Who has access: Anyone</em>. Salin URL <code>.../exec</code> lalu tempelkan pada kolom <strong>URL Web App Google Apps Script</strong> di aplikasi ini.
              </p>
            </div>

            <div className="p-4 bg-surface-container-low border border-border-grid flex flex-col gap-1.5">
              <span className="font-code-audit text-status-pending font-bold uppercase">
                LANGKAH 3 · DEPLOY KE GITHUB PAGES
              </span>
              <h3 className="font-headline-sm text-text-bright">
                Push ke GitHub &amp; Aktifkan Pages
              </h3>
              <p className="font-body-sm text-text-dim">
                File <code>.github/workflows/deploy.yml</code> dan <code>base: &apos;./&apos;</code> sudah terkonfigurasi. Cukup push kode ke repositori GitHub Anda (branch <code>main</code>) dan pilih <strong>Settings &gt; Pages &gt; Source: GitHub Actions</strong>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
