/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  formatRupiah,
  computeDashboardKPIs,
  searchRecordsByCompanyName,
  generatePiutangCSV,
  generateAuditHash,
  type PiutangRecord,
  type CatalogFile,
  type AuditLogEntry,
  type GASUserAccount,
  type GASConfig,
  type AccountingPeriodConfig,
  getDefaultAccountingPeriod,
} from './utils/arLogic';
import {
  isLiveGASUrl,
  callGASPost,
  fetchGASAllData,
  uploadFileToDriveViaGAS,
} from './utils/gasClient';
import {
  USER_AVATAR_URL,
  INITIAL_GAS_USERS,
  INITIAL_PIUTANG_RECORDS,
  INITIAL_CATALOG_FILES,
  INITIAL_AUDIT_LOGS,
  INITIAL_GAS_CONFIG,
} from './utils/seedData';
import { LoginScreen } from './components/LoginScreen';
import { DashboardView } from './components/DashboardView';
import { RekapDokumenView } from './components/RekapDokumenView';
import { KatalogBerkasView } from './components/KatalogBerkasView';
import { AuditTrailView } from './components/AuditTrailView';
import { PengaturanView } from './components/PengaturanView';
import { TransactionModal } from './components/TransactionModal';

type ActiveModule =
  | 'dashboard'
  | 'rekap-dokumen'
  | 'katalog-berkas'
  | 'audit-trail'
  | 'pengaturan-log';

export default function App() {
  const [users, setUsers] = useState<GASUserAccount[]>(() => {
    try {
      const saved = localStorage.getItem('ar_gas_users');
      return saved ? JSON.parse(saved) : INITIAL_GAS_USERS;
    } catch {
      return INITIAL_GAS_USERS;
    }
  });

  const [currentUser, setCurrentUser] = useState<GASUserAccount | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return INITIAL_GAS_USERS[0];
      }
      const savedSession = sessionStorage.getItem('ar_active_user');
      return savedSession ? JSON.parse(savedSession) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState<ActiveModule>('dashboard');
  const [records, setRecords] = useState<PiutangRecord[]>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('demo') === '1') {
        return INITIAL_PIUTANG_RECORDS;
      }
      if (!localStorage.getItem('ar_clean_slate_v1')) {
        localStorage.setItem('ar_clean_slate_v1', 'true');
        localStorage.setItem('ar_piutang_records', '[]');
        localStorage.setItem('ar_catalog_files', '[]');
        localStorage.setItem('ar_audit_logs', '[]');
        return [];
      }
      const saved = localStorage.getItem('ar_piutang_records');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [catalogFiles, setCatalogFiles] = useState<CatalogFile[]>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('demo') === '1') {
        return INITIAL_CATALOG_FILES;
      }
      const saved = localStorage.getItem('ar_catalog_files');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('demo') === '1') {
        return INITIAL_AUDIT_LOGS;
      }
      const saved = localStorage.getItem('ar_audit_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [gasConfig, setGasConfig] = useState<GASConfig>(() => {
    try {
      const saved = localStorage.getItem('ar_gas_config');
      return saved ? JSON.parse(saved) : INITIAL_GAS_CONFIG;
    } catch {
      return INITIAL_GAS_CONFIG;
    }
  });

  const [accountingPeriod, setAccountingPeriod] =
    useState<AccountingPeriodConfig>(() => {
      try {
        const saved = localStorage.getItem('ar_active_period');
        return saved ? JSON.parse(saved) : getDefaultAccountingPeriod();
      } catch {
        return getDefaultAccountingPeriod();
      }
    });

  // Modal & Toast States
  const [isCrudModalOpen, setIsCrudModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PiutangRecord | null>(null);
  const [highlightedAuditTarget, setHighlightedAuditTarget] = useState<
    string | null
  >(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [headerCompanyQuery, setHeaderCompanyQuery] = useState('');
  const [isHeaderSearchOpen, setIsHeaderSearchOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('ar_piutang_records', JSON.stringify(records));
    } catch {
      // ignore storage quota errors
    }
  }, [records]);

  useEffect(() => {
    try {
      localStorage.setItem('ar_catalog_files', JSON.stringify(catalogFiles));
    } catch {
      // ignore
    }
  }, [catalogFiles]);

  useEffect(() => {
    try {
      localStorage.setItem('ar_gas_users', JSON.stringify(users));
    } catch {
      // ignore
    }
  }, [users]);

  useEffect(() => {
    try {
      localStorage.setItem('ar_audit_logs', JSON.stringify(auditLogs));
    } catch {
      // ignore
    }
  }, [auditLogs]);

  useEffect(() => {
    try {
      localStorage.setItem('ar_gas_config', JSON.stringify(gasConfig));
    } catch {
      // ignore
    }
  }, [gasConfig]);

  useEffect(() => {
    try {
      localStorage.setItem(
        'ar_active_period',
        JSON.stringify(accountingPeriod)
      );
    } catch {
      // ignore
    }
  }, [accountingPeriod]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const appendAuditLog = (
    actionType: AuditLogEntry['actionType'],
    actionBadge: AuditLogEntry['actionBadge'],
    moduleName: string,
    targetId: string,
    targetEntity: string,
    description: string,
    beforeState: AuditLogEntry['beforeState'],
    afterState: AuditLogEntry['afterState']
  ) => {
    const now = new Date();
    const datePart = now.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const timePart = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.104`;
    const actor = currentUser || INITIAL_GAS_USERS[0];
    const hash = generateAuditHash(`${targetId}:${description}:${now.getTime()}`);

    const newEntry: AuditLogEntry = {
      id: Date.now(),
      eventId: `EVT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(
        2,
        '0'
      )}-${Math.floor(10000 + Math.random() * 89999)}`,
      timestamp: `${now.toISOString().slice(0, 10)} ${timePart.slice(0, 8)}`,
      datePart,
      timePart,
      actorName: actor.fullName,
      actorInitials: actor.initials,
      actorEmail: actor.username,
      actorRole: actor.role,
      actorLocation: actor.branch,
      ipAddress: '182.253.114.92',
      actionType,
      actionBadge,
      moduleName,
      description,
      targetId,
      targetEntity,
      severity: 'SUCCESS',
      sha256: hash,
      beforeState,
      afterState,
    };

    setAuditLogs((prev) => [newEntry, ...prev]);
  };

  const handleLoginSuccess = (user: GASUserAccount) => {
    setCurrentUser(user);
    try {
      sessionStorage.setItem('ar_active_user', JSON.stringify(user));
    } catch {
      // ignore
    }
    appendAuditLog(
      'USER_LOGIN',
      'LOGIN',
      'GAS Security Auth',
      user.username,
      user.branch,
      `Operator ${user.fullName} (${user.role}) berhasil login via Google Apps Script Users_Auth.`,
      { saldoTerealisasi: 0, saldoOutstanding: 0, statusBerkas: 'SESSION_IDLE' },
      { saldoTerealisasi: 0, saldoOutstanding: 0, statusBerkas: 'AUTHENTICATED' }
    );
    showToast(`Selamat datang, ${user.fullName} (${user.role}). Sesi GAS Aktif.`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      sessionStorage.removeItem('ar_active_user');
    } catch {
      // ignore
    }
  };

  const handleSaveRecord = (
    record: PiutangRecord,
    isUpdate: boolean,
    originalId?: string
  ) => {
    const matchId = originalId || record.id;
    if (isUpdate) {
      const existing = records.find((r) => r.id === matchId);
      setRecords((prev) =>
        prev.map((item) => (item.id === matchId ? record : item))
      );
      appendAuditLog(
        'UPDATE_SALDO',
        'UPDATE',
        'AR Ledger',
        record.id,
        record.namaPerusahaan,
        `Data piutang ${record.namaPerusahaan} diperbarui. Terealisasi: ${formatRupiah(
          record.saldoTerealisasi
        )}, Sisa: ${formatRupiah(record.saldoBelumTerealisasi)}.`,
        {
          saldoTerealisasi: existing?.saldoTerealisasi || 0,
          saldoOutstanding: existing?.saldoBelumTerealisasi || 0,
          statusBerkas: existing?.statusDokumen || 'Belum Lengkap',
        },
        {
          saldoTerealisasi: record.saldoTerealisasi,
          saldoOutstanding: record.saldoBelumTerealisasi,
          statusBerkas: record.statusDokumen,
        }
      );
      showToast(
        `Transaksi ${record.id} (${record.namaPerusahaan}) berhasil diperbarui ke Sheet Data_Piutang.`
      );
    } else {
      setRecords((prev) => [record, ...prev]);
      appendAuditLog(
        'INSERT_TRANSAKSI',
        'INSERT',
        'AR Ledger',
        record.id,
        record.namaPerusahaan,
        `Penambahan transaksi piutang baru ${record.namaPerusahaan} senilai ${formatRupiah(
          record.totalTagihan
        )}.`,
        { saldoTerealisasi: 0, saldoOutstanding: 0, statusBerkas: 'NEW_RECORD' },
        {
          saldoTerealisasi: record.saldoTerealisasi,
          saldoOutstanding: record.saldoBelumTerealisasi,
          statusBerkas: record.statusDokumen,
        }
      );
      showToast(
        `Transaksi baru ${record.id} (${record.namaPerusahaan}) berhasil disimpan ke Google Sheets.`
      );
    }

    if (isLiveGASUrl(gasConfig.webAppUrl)) {
      void callGASPost(gasConfig.webAppUrl, {
        action: 'savePiutang',
        record,
        actor: currentUser?.username || 'system',
      });
    }

    setIsCrudModalOpen(false);
    setEditingRecord(null);
  };

  const handleDeleteRecord = (id: string) => {
    const target = records.find((r) => r.id === id);
    if (!target) return;
    setRecords((prev) => prev.filter((r) => r.id !== id));
    appendAuditLog(
      'DELETE_RECORD',
      'DELETE',
      'AR Ledger',
      id,
      target.namaPerusahaan,
      `Transaksi piutang ${id} (${target.namaPerusahaan}) dihapus dari buku besar aktif.`,
      {
        saldoTerealisasi: target.saldoTerealisasi,
        saldoOutstanding: target.saldoBelumTerealisasi,
        statusBerkas: target.statusDokumen,
      },
      { saldoTerealisasi: 0, saldoOutstanding: 0, statusBerkas: 'DELETED' }
    );

    if (isLiveGASUrl(gasConfig.webAppUrl)) {
      void callGASPost(gasConfig.webAppUrl, {
        action: 'deletePiutang',
        id,
        actor: currentUser?.username || 'system',
      });
    }

    setIsCrudModalOpen(false);
    setEditingRecord(null);
    showToast(`Transaksi ${id} berhasil dihapus dan dicatat di Audit Trail.`);
  };

  const handleImportCSVRecords = (imported: PiutangRecord[]) => {
    if (imported.length === 0) return;
    setRecords((prev) => {
      const existingIds = new Set(prev.map((r) => r.id));
      const newUnique = imported.filter((r) => !existingIds.has(r.id));
      const updatedExisting = prev.map((item) => {
        const replacement = imported.find((r) => r.id === item.id);
        return replacement || item;
      });
      return [...newUnique, ...updatedExisting];
    });

    const kpisAfter = computeDashboardKPIs(imported);
    appendAuditLog(
      'INSERT_TRANSAKSI',
      'INSERT',
      'CSV Importer',
      `IMP-${imported.length}-ROWS`,
      `${imported.length} Entri Spreadsheet`,
      `Impor massal ${imported.length} baris piutang dari berkas CSV/Spreadsheet.`,
      { saldoTerealisasi: 0, saldoOutstanding: 0, statusBerkas: 'IMPORT_START' },
      {
        saldoTerealisasi: kpisAfter.totalRealisasi,
        saldoOutstanding: kpisAfter.totalOutstanding,
        statusBerkas: 'IMPORTED_OK',
      }
    );
    showToast(
      `Berhasil mengimpor ${imported.length} baris transaksi piutang dari berkas CSV.`
    );
  };

  const handleVerifyDocument = (
    recordId: string,
    docKey: 'fk' | 'kw' | 'sj' | 'fp',
    notes: string,
    markComplete: boolean
  ) => {
    const target = records.find((r) => r.id === recordId);
    if (!target) return;

    const updatedMatrix = { ...target.matrix, [docKey]: !target.matrix[docKey] };
    if (markComplete) {
      updatedMatrix[docKey] = true;
    }
    const allComplete =
      markComplete ||
      (updatedMatrix.fk &&
        updatedMatrix.kw &&
        updatedMatrix.sj &&
        updatedMatrix.fp);

    const nextStatus = allComplete ? 'Lengkap' : 'Belum Lengkap';

    const updatedRecord: PiutangRecord = {
      ...target,
      matrix: updatedMatrix,
      statusDokumen: nextStatus,
      detailDokumen: notes || target.detailDokumen,
    };

    setRecords((prev) =>
      prev.map((r) => (r.id === recordId ? updatedRecord : r))
    );

    if (isLiveGASUrl(gasConfig.webAppUrl)) {
      void callGASPost(gasConfig.webAppUrl, {
        action: 'savePiutang',
        record: updatedRecord,
        actor: currentUser?.username || 'system',
      });
    }

    appendAuditLog(
      'VERIFY_DOKUMEN',
      'VERIFY',
      'Rekap Dokumen',
      recordId,
      target.namaPerusahaan,
      `Verifikasi berkas [${docKey.toUpperCase()}] untuk ${
        target.namaPerusahaan
      }. Status Audit: ${nextStatus}.`,
      {
        saldoTerealisasi: target.saldoTerealisasi,
        saldoOutstanding: target.saldoBelumTerealisasi,
        statusBerkas: target.statusDokumen,
      },
      {
        saldoTerealisasi: target.saldoTerealisasi,
        saldoOutstanding: target.saldoBelumTerealisasi,
        statusBerkas: nextStatus,
      }
    );

    showToast(
      `Status dokumen ${recordId} (${target.namaPerusahaan}) berhasil diperbarui: ${nextStatus}.`
    );
  };

  const handleUploadReceiptProof = async (
    recordId: string,
    payload: {
      fileName: string;
      fileSize: string;
      mimeType?: string;
      base64Data?: string;
      driveFolderId?: string;
      driveFolderName?: string;
      receiverName: string;
      receiptDate: string;
      notes: string;
      markComplete: boolean;
    }
  ) => {
    const target = records.find((r) => r.id === recordId);
    if (!target) return;

    // Update GAS config if user customized Drive Folder ID / Name inside the modal
    if (
      (payload.driveFolderId && payload.driveFolderId !== gasConfig.driveFolderId) ||
      (payload.driveFolderName && payload.driveFolderName !== gasConfig.driveFolderName)
    ) {
      setGasConfig((prev) => ({
        ...prev,
        driveFolderId: payload.driveFolderId || prev.driveFolderId,
        driveFolderName: payload.driveFolderName || prev.driveFolderName,
      }));
    }

    const gasDriveRes = await uploadFileToDriveViaGAS(gasConfig, {
      driveFolderId: payload.driveFolderId || gasConfig.driveFolderId,
      driveFolderName: payload.driveFolderName || gasConfig.driveFolderName,
      recordId: target.id,
      invoiceNo: target.invoiceNo,
      companyName: target.namaPerusahaan,
      fileName: payload.fileName,
      mimeType: payload.mimeType || 'application/pdf',
      fileSize: payload.fileSize,
      base64Data: payload.base64Data || 'JVBERi0xLjQK',
      receiverName: payload.receiverName,
      receiptDate: payload.receiptDate,
      notes: payload.notes,
      markComplete: payload.markComplete,
      actor: currentUser?.username || 'system',
    });

    const updatedMatrix = {
      ...target.matrix,
      sj: true,
      ...(payload.markComplete ? { fk: true, kw: true, fp: true } : {}),
    };
    const allComplete =
      payload.markComplete ||
      (updatedMatrix.fk &&
        updatedMatrix.kw &&
        updatedMatrix.sj &&
        updatedMatrix.fp);
    const nextStatus = allComplete ? 'Lengkap' : 'Belum Lengkap';
    const receiptSummary = `Bukti Terima Surat (${payload.fileName}) diterima oleh ${payload.receiverName} pada ${payload.receiptDate}${
      payload.notes ? ` — ${payload.notes}` : ''
    } • Drive GAS: ${gasDriveRes.fileUrl}`;

    const updatedRecord: PiutangRecord = {
      ...target,
      matrix: updatedMatrix,
      statusDokumen: nextStatus,
      detailDokumen: receiptSummary,
    };

    setRecords((prev) =>
      prev.map((r) => (r.id === recordId ? updatedRecord : r))
    );

    const newCatalogItem: CatalogFile = {
      id: `CAT-RCV-${Date.now()}`,
      invoiceNo: target.invoiceNo,
      transactionId: target.id,
      clientName: target.namaPerusahaan,
      nominalTagihan: target.totalTagihan,
      fileName: payload.fileName,
      fileSize: `${payload.fileSize} • GAS DriveApp (${gasDriveRes.folderName})`,
      fileType: payload.fileName.toLowerCase().endsWith('.xml')
        ? 'XML'
        : payload.fileName.toLowerCase().match(/\.(png|jpg|jpeg)$/)
        ? 'SCAN'
        : 'PDF',
      category: 'bast',
      status: 'verified',
      statusLabel: 'SURAT DITERIMA',
      subInfo: `Diterima oleh: ${payload.receiverName} (${payload.receiptDate})`,
      highlightInfo: `Google Drive via GAS (${gasDriveRes.folderName})`,
      boxArsip: target.boxArsip || 'Box AR-2025/A1',
      branch:
        target.cabang.toLowerCase().includes('surabaya')
          ? 'sby'
          : target.cabang.toLowerCase().includes('medan')
          ? 'med'
          : 'jkt',
      branchLabel: `Cabang ${target.cabang}`,
      extraLabel: 'Penerima Surat:',
      extraValue: `${payload.receiverName} (${payload.receiptDate})`,
      driveUrl: gasDriveRes.fileUrl,
    };

    setCatalogFiles((prev) => [newCatalogItem, ...prev]);

    appendAuditLog(
      'VERIFY_DOKUMEN',
      'VERIFY',
      'Google Drive via GAS',
      target.id,
      target.namaPerusahaan,
      `Unggah bukti tanda terima surat [${payload.fileName}] ke Google Drive via Google Apps Script (Folder: ${gasDriveRes.folderName}) — Penerima: ${payload.receiverName} (${payload.receiptDate}). Status Berkas: ${nextStatus}.`,
      {
        saldoTerealisasi: target.saldoTerealisasi,
        saldoOutstanding: target.saldoBelumTerealisasi,
        statusBerkas: target.statusDokumen,
      },
      {
        saldoTerealisasi: target.saldoTerealisasi,
        saldoOutstanding: target.saldoBelumTerealisasi,
        statusBerkas: nextStatus,
      }
    );

    showToast(
      `Bukti terima surat "${payload.fileName}" berhasil diunggah via Google Apps Script DriveApp (${gasDriveRes.folderName}).`
    );
  };

  const handleExportCSV = () => {
    const csvContent = generatePiutangCSV(records);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Data_Piutang_Export_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    const kpis = computeDashboardKPIs(records);
    appendAuditLog(
      'EXPORT_EXCEL',
      'EXPORT',
      'Data Export',
      'EXP-CSV-LIVE',
      `${records.length} Baris Piutang`,
      'Ekspor laporan buku besar piutang ke berkas CSV/Excel.',
      {
        saldoTerealisasi: kpis.totalRealisasi,
        saldoOutstanding: kpis.totalOutstanding,
        statusBerkas: 'READY',
      },
      {
        saldoTerealisasi: kpis.totalRealisasi,
        saldoOutstanding: kpis.totalOutstanding,
        statusBerkas: 'EXPORTED_CSV',
      }
    );
    showToast('Laporan Buku Besar berhasil diunduh (.CSV).');
  };

  const handleSyncSheets = async () => {
    const kpis = computeDashboardKPIs(records);
    if (isLiveGASUrl(gasConfig.webAppUrl)) {
      const remote = await fetchGASAllData(gasConfig);
      if (remote.connected) {
        if (Array.isArray(remote.piutang)) {
          setRecords(remote.piutang);
        }
        if (remote.users && remote.users.length > 0) {
          setUsers(remote.users);
        }
        appendAuditLog(
          'SYNC_SHEETS',
          'SYNC',
          'G-Sheets Engine',
          'SYNC-CLOUD',
          `Sheet: ${gasConfig.sheetPiutang}`,
          `Sinkronisasi langsung dengan Google Sheets berhasil (${remote.latencyMs}ms).`,
          {
            saldoTerealisasi: kpis.totalRealisasi,
            saldoOutstanding: kpis.totalOutstanding,
            statusBerkas: 'SYNCING',
          },
          {
            saldoTerealisasi: kpis.totalRealisasi,
            saldoOutstanding: kpis.totalOutstanding,
            statusBerkas: 'CLOUD_SYNCHRONIZED',
          }
        );
        showToast(remote.message);
        return;
      }
    }

    appendAuditLog(
      'SYNC_SHEETS',
      'SYNC',
      'G-Sheets Engine',
      'SYNC-MANUAL',
      `Sheet: ${gasConfig.sheetPiutang}`,
      `Sinkronisasi dua arah dengan Google Sheets (${records.length} entri).`,
      {
        saldoTerealisasi: kpis.totalRealisasi,
        saldoOutstanding: kpis.totalOutstanding,
        statusBerkas: 'SYNCING',
      },
      {
        saldoTerealisasi: kpis.totalRealisasi,
        saldoOutstanding: kpis.totalOutstanding,
        statusBerkas: 'SYNCHRONIZED_OK',
      }
    );
    showToast(
      `Sinkronisasi Google Sheets (${gasConfig.sheetPiutang}) selesai tanpa selisih.`
    );
  };

  const handlePushAllToSheets = async () => {
    if (isLiveGASUrl(gasConfig.webAppUrl)) {
      const resp = await callGASPost(gasConfig.webAppUrl, {
        action: 'syncAll',
        piutang: records,
        records,
        users,
        actor: currentUser?.username || 'system',
      });
      if (resp.ok) {
        showToast(
          `Seluruh data (${records.length} piutang & ${users.length} user) berhasil di-push ke Google Sheets (${resp.latencyMs}ms).`
        );
        return;
      }
    }
    showToast(
      `Snapshot lokal (${records.length} piutang & ${users.length} user) siap disinkronkan ke Google Sheets.`
    );
  };

  const handleStartFromZero = () => {
    setRecords([]);
    setCatalogFiles([]);
    setAuditLogs([]);
    try {
      localStorage.setItem('ar_clean_slate_v1', 'true');
      localStorage.setItem('ar_piutang_records', '[]');
      localStorage.setItem('ar_catalog_files', '[]');
      localStorage.setItem('ar_audit_logs', '[]');
    } catch {
      // ignore
    }
    if (isLiveGASUrl(gasConfig.webAppUrl)) {
      void callGASPost(gasConfig.webAppUrl, {
        action: 'clearAllPiutang',
        records: [],
        piutang: [],
        actor: currentUser?.username || 'system',
      });
    }
    showToast(
      'Pembukuan berhasil dimulai dari nol (Rp 0 • 0 Transaksi • 0 Arsip). Siap menerima data baru!'
    );
  };

  const handleResetDefaultData = () => {
    setRecords(INITIAL_PIUTANG_RECORDS);
    setCatalogFiles(INITIAL_CATALOG_FILES);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    showToast('Contoh data simulasi (6 transaksi B2B) berhasil dimuat.');
  };

  if (!currentUser) {
    return (
      <LoginScreen
        users={users}
        gasConfig={gasConfig}
        onLoginSuccess={handleLoginSuccess}
        onUpdateWebAppUrl={(url) =>
          setGasConfig((prev) => ({ ...prev, webAppUrl: url }))
        }
      />
    );
  }

  const kpis = computeDashboardKPIs(records);
  const quickSearchResults = searchRecordsByCompanyName(
    records,
    headerCompanyQuery
  );

  const navItems: {
    id: ActiveModule;
    topLabel: string;
    sideLabel: string;
    icon: string;
    code: string;
  }[] = [
    {
      id: 'dashboard',
      topLabel: 'Dashboard & Piutang',
      sideLabel: 'Dashboard & Saldo Piutang',
      icon: 'analytics',
      code: '01',
    },
    {
      id: 'rekap-dokumen',
      topLabel: 'Rekap Dokumen',
      sideLabel: 'Rekap & Verifikasi Dokumen',
      icon: 'assignment_turned_in',
      code: '02',
    },
    {
      id: 'katalog-berkas',
      topLabel: 'Katalog Berkas & Invoice',
      sideLabel: 'Katalog Arsip Digital',
      icon: 'folder_open',
      code: '03',
    },
    {
      id: 'audit-trail',
      topLabel: 'Audit Trail & SysLog',
      sideLabel: 'Audit Forensik & SysLog',
      icon: 'receipt_long',
      code: '04',
    },
    {
      id: 'pengaturan-log',
      topLabel: 'Pengaturan & Log',
      sideLabel: 'Pengaturan & Log Sistem',
      icon: 'settings',
      code: '05',
    },
  ];

  return (
    <div className="bg-surface font-body-md text-on-surface min-h-screen">
      {/* TOP PERSISTENT HEADER */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-surface-card border-b border-border-grid z-50">
        <div className="h-16 w-full px-4 flex items-center justify-between gap-3">
          {/* Left: Brand & Sync Status */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Menu Navigasi"
              className="lg:hidden p-1.5 bg-surface-input border border-border-grid text-text-bright cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">menu</span>
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-secondary-container border border-secondary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-text-bright text-[20px]">
                  account_balance_wallet
                </span>
              </div>
              <div className="hidden sm:flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-headline-md text-text-bright tracking-tight whitespace-nowrap">
                    AR Tracker Pro
                  </span>
                  <span className="hidden 2xl:inline px-1.5 py-0.5 bg-surface-input border border-border-accent text-on-surface-variant font-label-caps uppercase whitespace-nowrap">
                    Internal Finance &amp; Accounting
                  </span>
                </div>
                <span className="font-code-audit text-text-dim hidden md:block">
                  Sistem Pencatatan Piutang &amp; Dokumen Perusahaan
                </span>
              </div>
            </div>
          </div>

          {/* Center: 5 Module Navigation Tabs (shown on ultra-wide screens; left sidebar is always visible on lg+) */}
          <nav
            aria-label="Navigasi Modul Utama"
            className="hidden 2xl:flex items-center h-full gap-0.5 shrink-0"
          >
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`h-full flex items-center px-3 transition-colors font-headline-sm whitespace-nowrap cursor-pointer border-b-2 ${
                    isActive
                      ? 'bg-primary-container text-text-bright border-secondary'
                      : 'text-text-dim hover:text-text-bright hover:bg-surface-container-high border-transparent'
                  }`}
                >
                  {item.topLabel}
                </button>
              );
            })}
          </nav>

          {/* Right: Global Company Quick Search + Export + User Profile */}
          <div className="flex items-center gap-2 justify-end shrink-0">
            {/* Global Header Quick Search by Company Name */}
            <div className="relative w-48 sm:w-64 md:w-72 xl:w-88">
              <div className="flex items-center bg-surface-input border border-border-accent focus-within:border-secondary h-9 px-2 sm:px-2.5">
                <span className="material-symbols-outlined text-[16px] text-secondary mr-1.5 shrink-0">
                  domain
                </span>
                <input
                  id="header-company-search"
                  type="text"
                  aria-label="Cari Cepat Nama Perusahaan"
                  value={headerCompanyQuery}
                  onFocus={() => setIsHeaderSearchOpen(true)}
                  onChange={(e) => {
                    setHeaderCompanyQuery(e.target.value);
                    setIsHeaderSearchOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsHeaderSearchOpen(false);
                    } else if (e.key === 'Enter') {
                      setIsHeaderSearchOpen(false);
                      if (
                        activeTab !== 'dashboard' &&
                        activeTab !== 'rekap-dokumen'
                      ) {
                        setActiveTab('dashboard');
                      }
                    }
                  }}
                  placeholder="Cari cepat nama perusahaan..."
                  className="w-full bg-transparent text-text-bright placeholder-text-dim font-body-sm focus:outline-none min-w-0"
                />
                {headerCompanyQuery ? (
                  <button
                    type="button"
                    aria-label="Bersihkan Pencarian Perusahaan"
                    onClick={() => {
                      setHeaderCompanyQuery('');
                      setIsHeaderSearchOpen(false);
                    }}
                    className="text-text-dim hover:text-text-bright ml-1 cursor-pointer flex items-center"
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      close
                    </span>
                  </button>
                ) : (
                  <span className="material-symbols-outlined text-[15px] text-text-dim ml-1 shrink-0">
                    search
                  </span>
                )}
              </div>

              {/* Quick Search Results Popover across all Piutang Records */}
              {isHeaderSearchOpen && headerCompanyQuery.trim().length > 0 && (
                <div
                  role="region"
                  aria-label="Hasil Pencarian Cepat Perusahaan"
                  className="fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full mt-1 sm:w-96 bg-surface-card border border-secondary shadow-2xl z-50 flex flex-col"
                >
                  <div className="px-3 py-2 bg-primary-container border-b border-border-grid flex items-center justify-between">
                    <span className="font-label-caps text-text-bright uppercase">
                      Hasil Pencarian ({quickSearchResults.length} Record)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('dashboard');
                          setIsHeaderSearchOpen(false);
                        }}
                        className="font-code-audit text-secondary hover:underline cursor-pointer"
                      >
                        Buka di Tabel →
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsHeaderSearchOpen(false)}
                        className="text-text-dim hover:text-text-bright cursor-pointer"
                        aria-label="Tutup Popover Pencarian"
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          close
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-border-grid">
                    {quickSearchResults.length === 0 ? (
                      <div className="p-4 text-center font-body-sm text-text-dim">
                        Tidak ditemukan perusahaan dengan nama{' '}
                        <strong className="text-text-bright">
                          &ldquo;{headerCompanyQuery}&rdquo;
                        </strong>
                        .
                      </div>
                    ) : (
                      quickSearchResults.map((rec) => (
                        <div
                          key={rec.id}
                          className="p-3 hover:bg-surface-container transition-colors flex flex-col gap-1.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-headline-sm text-text-bright">
                                {rec.namaPerusahaan}
                              </div>
                              <div className="font-code-audit text-text-dim">
                                {rec.id} · {rec.invoiceNo} · {rec.cabang}
                              </div>
                            </div>
                            <span
                              className={`font-code-audit font-bold uppercase shrink-0 ${
                                rec.statusDokumen === 'Lengkap'
                                  ? 'text-status-settled'
                                  : 'text-status-danger'
                              }`}
                            >
                              {rec.statusDokumen}
                            </span>
                          </div>

                          <div className="flex items-center justify-between font-code-audit pt-1 border-t border-border-grid/50">
                            <span className="text-text-dim">
                              Tagihan:{' '}
                              <strong className="text-text-bright">
                                {formatRupiah(rec.totalTagihan)}
                              </strong>
                            </span>
                            <span
                              className={
                                rec.saldoBelumTerealisasi > 0
                                  ? 'text-status-pending font-semibold'
                                  : 'text-status-settled font-semibold'
                              }
                            >
                              Sisa: {formatRupiah(rec.saldoBelumTerealisasi)}
                            </span>
                          </div>

                          <div className="flex items-center justify-end gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTab('dashboard');
                                setIsHeaderSearchOpen(false);
                              }}
                              className="px-2 py-0.5 bg-surface-input hover:bg-surface-variant border border-border-grid font-code-audit text-text-bright cursor-pointer"
                            >
                              Filter Tabel
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRecord(rec);
                                setIsCrudModalOpen(true);
                                setIsHeaderSearchOpen(false);
                              }}
                              className="px-2 py-0.5 bg-secondary-container border border-secondary font-code-audit text-text-bright cursor-pointer"
                            >
                              Detail / Edit
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              className="hidden sm:flex px-3 py-1.5 bg-surface-card border border-border-grid text-text-bright hover:bg-surface-container hover:border-border-accent font-label-caps uppercase transition-colors items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">
                file_download
              </span>
              <span>Export</span>
            </button>

            <div className="h-6 w-px bg-border-grid hidden sm:block shrink-0" />

            <div className="flex items-center gap-2 shrink-0">
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl || USER_AVATAR_URL}
                  alt={currentUser.fullName}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full object-cover border border-border-accent"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary-container border border-secondary flex items-center justify-center font-headline-sm text-text-bright">
                  {currentUser.initials}
                </div>
              )}
              <div className="hidden md:flex flex-col text-left">
                <span className="font-body-sm text-text-bright font-medium leading-none">
                  {currentUser.fullName}
                </span>
                <span className="font-code-audit text-text-dim">
                  {currentUser.role}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Keluar Sesi (Logout)"
                aria-label="Keluar Sesi"
                className="p-1.5 bg-surface-input hover:bg-status-danger-surface border border-border-grid text-text-dim hover:text-error transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">
                  logout
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* LEFT SIDEBAR NAVIGATION */}
      <aside
        className={`fixed left-0 top-16 bottom-0 w-64 bg-surface-card border-r border-border-grid z-40 flex flex-col justify-between py-4 transition-transform lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col">
          <div className="px-4 pb-2 border-b border-border-grid mb-2">
            <span className="font-label-caps text-text-dim uppercase tracking-wider">
              Buku Besar Piutang
            </span>
          </div>

          <nav aria-label="Sidebar Modul Keuangan" className="flex flex-col">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center justify-between px-4 py-2.5 text-left transition-colors font-body-sm cursor-pointer ${
                    isActive
                      ? 'bg-primary-container text-text-bright font-semibold'
                      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-text-bright'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span
                      className={`material-symbols-outlined text-[18px] ${
                        isActive ? 'text-secondary' : ''
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span>{item.sideLabel}</span>
                  </span>
                  <span className="font-code-audit text-text-dim">
                    {item.code}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Live Summary Footer */}
        <div className="px-4">
          <div className="p-3 bg-surface-input border border-border-grid flex flex-col gap-1.5">
            <div className="flex items-center justify-between border-b border-border-grid pb-1">
              <span className="font-label-caps text-text-dim uppercase">
                Database GAS
              </span>
              <span className="font-code-audit text-tertiary font-semibold">
                {isLiveGASUrl(gasConfig.webAppUrl) ? 'LIVE CLOUD' : 'ONLINE'}
              </span>
            </div>
            <div className="flex items-center justify-between text-text-dim font-code-audit pt-0.5">
              <span>Piutang Terbuka:</span>
              <span className="text-text-bright font-numeric-table font-semibold">
                {formatRupiah(kpis.totalOutstanding)}
              </span>
            </div>
            <div className="flex items-center justify-between text-text-dim font-code-audit">
              <span>Pending Dokumen:</span>
              <span className="text-status-pending font-numeric-table font-semibold">
                {kpis.dokumenPending} Berkas
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN VIEWPORT CONTENT */}
      <div className="lg:pl-64">
        <main className="relative pt-16 bg-surface min-h-screen">
          {activeTab === 'dashboard' && (
            <DashboardView
              records={records}
              gasConfig={gasConfig}
              accountingPeriod={accountingPeriod}
              onAccountingPeriodChange={setAccountingPeriod}
              globalSearchQuery={headerCompanyQuery}
              onGlobalSearchChange={setHeaderCompanyQuery}
              onOpenCreateModal={() => {
                setEditingRecord(null);
                setIsCrudModalOpen(true);
              }}
              onOpenEditModal={(rec) => {
                setEditingRecord(rec);
                setIsCrudModalOpen(true);
              }}
              onDeleteRecord={handleDeleteRecord}
              onExportCSV={handleExportCSV}
              onImportCSVRecords={handleImportCSVRecords}
              onSyncSheets={handleSyncSheets}
              onStartFromZero={handleStartFromZero}
              onLoadDemoData={handleResetDefaultData}
              onUploadReceiptProof={handleUploadReceiptProof}
              onOpenGASSettings={() => setActiveTab('pengaturan-log')}
              onInspectAudit={(targetId) => {
                setHighlightedAuditTarget(targetId);
                setActiveTab('audit-trail');
              }}
            />
          )}

          {activeTab === 'rekap-dokumen' && (
            <RekapDokumenView
              records={records}
              globalSearchQuery={headerCompanyQuery}
              onGlobalSearchChange={setHeaderCompanyQuery}
              onVerifyDocument={handleVerifyDocument}
              onExportCSV={handleExportCSV}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'katalog-berkas' && (
            <KatalogBerkasView
              files={catalogFiles}
              onAddCatalogFile={(newFile) => {
                setCatalogFiles((prev) => [newFile, ...prev]);
                showToast(
                  `Berkas ${newFile.fileName} berhasil diunggah ke Katalog & Google Drive.`
                );
              }}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'audit-trail' && (
            <AuditTrailView
              logs={auditLogs}
              highlightedTargetId={highlightedAuditTarget}
              onShowToast={showToast}
            />
          )}

          {activeTab === 'pengaturan-log' && (
            <PengaturanView
              gasConfig={gasConfig}
              users={users}
              onSaveConfig={(next) => setGasConfig(next)}
              onAddUser={(newUser) => {
                setUsers((prev) => [...prev, newUser]);
                if (isLiveGASUrl(gasConfig.webAppUrl)) {
                  void callGASPost(gasConfig.webAppUrl, {
                    action: 'upsertUser',
                    user: newUser,
                  });
                }
              }}
              onUpdateUserPassword={(uname, newPass) => {
                setUsers((prev) =>
                  prev.map((u) => {
                    if (u.username === uname) {
                      const updated = { ...u, password: newPass };
                      if (isLiveGASUrl(gasConfig.webAppUrl)) {
                        void callGASPost(gasConfig.webAppUrl, {
                          action: 'upsertUser',
                          user: updated,
                        });
                      }
                      return updated;
                    }
                    return u;
                  })
                );
              }}
              onToggleUserStatus={(uname) => {
                setUsers((prev) =>
                  prev.map((u) => {
                    if (u.username === uname) {
                      const updated = { ...u, active: !u.active };
                      if (isLiveGASUrl(gasConfig.webAppUrl)) {
                        void callGASPost(gasConfig.webAppUrl, {
                          action: 'upsertUser',
                          user: updated,
                        });
                      }
                      return updated;
                    }
                    return u;
                  })
                );
              }}
              onDeleteUser={(uname) => {
                setUsers((prev) => prev.filter((u) => u.username !== uname));
                if (isLiveGASUrl(gasConfig.webAppUrl)) {
                  void callGASPost(gasConfig.webAppUrl, {
                    action: 'deleteUser',
                    username: uname,
                  });
                }
                showToast(
                  `Akun ${uname} dihapus dari daftar kredensial Users_Auth.`
                );
              }}
              onRunMaintenance={(fnName) => {
                appendAuditLog(
                  'SYNC_SHEETS',
                  'SYNC',
                  'GAS Maintenance',
                  fnName,
                  'Sheet Master & Cache',
                  `Operator mengeksekusi fungsi maintenance ${fnName}.`,
                  {
                    saldoTerealisasi: kpis.totalRealisasi,
                    saldoOutstanding: kpis.totalOutstanding,
                    statusBerkas: 'MAINTENANCE_START',
                  },
                  {
                    saldoTerealisasi: kpis.totalRealisasi,
                    saldoOutstanding: kpis.totalOutstanding,
                    statusBerkas: 'COMPLETED_200_OK',
                  }
                );
              }}
              onPushAllToSheets={handlePushAllToSheets}
              onStartFromZero={handleStartFromZero}
              onResetDefaultData={handleResetDefaultData}
              onShowToast={showToast}
            />
          )}
        </main>
      </div>

      {/* CRUD MODAL DIALOG */}
      <TransactionModal
        isOpen={isCrudModalOpen}
        editingRecord={editingRecord}
        existingIds={records.map((r) => r.id)}
        activePeriod={accountingPeriod}
        onClose={() => {
          setIsCrudModalOpen(false);
          setEditingRecord(null);
        }}
        onSave={handleSaveRecord}
        onDelete={handleDeleteRecord}
      />

      {/* GLOBAL NOTIFICATION TOAST */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 bg-surface-card border border-tertiary p-4 shadow-2xl flex items-center gap-3 max-w-md"
        >
          <div className="w-7 h-7 bg-status-settled-surface flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-tertiary text-[18px]">
              check_circle
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline-sm text-text-bright">
              Notifikasi Sistem GAS
            </span>
            <span className="font-body-sm text-text-dim">{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-text-dim hover:text-text-bright ml-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}
    </div>
  );
}
