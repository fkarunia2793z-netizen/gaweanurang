import React, { useState, useRef } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Bar,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  formatRupiah,
  computeDashboardKPIs,
  computeSixMonthTrendData,
  evaluateDueDateUrgency,
  getUrgentDueRecords,
  getRecordAgingDays,
  getRecordAgingBucket,
  computeAgingSchedule,
  filterPiutangRecords,
  extractDriveFolderId,
  getDefaultAccountingPeriod,
  formatPeriodLabel,
  getSixMonthPeriodRangeLabel,
  type PiutangRecord,
  type AgingBucketKey,
  type GASConfig,
  type AccountingPeriodConfig,
} from '../utils/arLogic';
import {
  downloadDocumentSimulation,
  parseImportedPiutangCSV,
  isLiveGASUrl,
  readFileAsBase64,
} from '../utils/gasClient';

interface DashboardViewProps {
  records: PiutangRecord[];
  gasConfig?: GASConfig;
  accountingPeriod?: AccountingPeriodConfig;
  onAccountingPeriodChange?: (period: AccountingPeriodConfig) => void;
  globalSearchQuery?: string;
  onGlobalSearchChange?: (q: string) => void;
  onOpenCreateModal: () => void;
  onOpenEditModal: (record: PiutangRecord) => void;
  onDeleteRecord: (id: string) => void;
  onExportCSV: () => void;
  onImportCSVRecords: (imported: PiutangRecord[]) => void;
  onSyncSheets: () => Promise<void> | void;
  onUploadReceiptProof?: (
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
  ) => Promise<void> | void;
  onOpenGASSettings?: () => void;
  onStartFromZero?: () => void;
  onLoadDemoData?: () => void;
  onInspectAudit: (targetId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  records,
  gasConfig,
  accountingPeriod,
  onAccountingPeriodChange,
  globalSearchQuery = '',
  onGlobalSearchChange,
  onOpenCreateModal,
  onOpenEditModal,
  onDeleteRecord,
  onExportCSV,
  onImportCSVRecords,
  onSyncSheets,
  onUploadReceiptProof,
  onOpenGASSettings,
  onStartFromZero,
  onLoadDemoData,
  onInspectAudit,
}) => {
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const searchQuery =
    globalSearchQuery !== undefined && onGlobalSearchChange
      ? globalSearchQuery
      : localSearchQuery;
  const setSearchQuery = (val: string) => {
    setLocalSearchQuery(val);
    onGlobalSearchChange?.(val);
  };

  const [internalPeriod, setInternalPeriod] = useState<AccountingPeriodConfig>(
    () => accountingPeriod || getDefaultAccountingPeriod()
  );
  const currentPeriod = accountingPeriod || internalPeriod;
  const setPeriod = (next: AccountingPeriodConfig) => {
    setInternalPeriod(next);
    onAccountingPeriodChange?.(next);
  };

  const [filterKendala, setFilterKendala] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [dueDateFrom, setDueDateFrom] = useState('');
  const [dueDateTo, setDueDateTo] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState<
    'ALL' | 'MEPET_7' | 'CRITICAL_3'
  >('ALL');
  const [agingBucketFilter, setAgingBucketFilter] = useState<
    'ALL' | AgingBucketKey
  >('ALL');
  const [radarThresholdDays, setRadarThresholdDays] = useState<7 | 3>(7);
  const [chartType, setChartType] = useState<'composed' | 'area'>('composed');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncText, setLastSyncText] = useState(
    'Terakhir disinkron: 2 menit lalu'
  );
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  // Proof of receipt (Bukti Terima Surat via Google Apps Script DriveApp) modal state
  const [receiptTarget, setReceiptTarget] = useState<PiutangRecord | null>(
    null
  );
  const [receiptFileName, setReceiptFileName] = useState('');
  const [receiptFileSize, setReceiptFileSize] = useState('1.4 MB');
  const [receiptMimeType, setReceiptMimeType] = useState('application/pdf');
  const [receiptBase64, setReceiptBase64] = useState('JVBERi0xLjQK');
  const [receiptDriveFolderInput, setReceiptDriveFolderInput] = useState(
    gasConfig?.driveFolderId ||
      `1DriveFolder_AR_BuktiSurat_${currentPeriod.year}_Master`
  );
  const [receiptDriveFolderName, setReceiptDriveFolderName] = useState(
    gasConfig?.driveFolderName || 'AR_Tracker_Bukti_Surat_Diterima'
  );
  const [receiptReceiver, setReceiptReceiver] = useState('');
  const [receiptDate, setReceiptDate] = useState(
    currentPeriod.referenceDateISO || new Date().toISOString().slice(0, 10)
  );
  const [receiptNotes, setReceiptNotes] = useState('');
  const [receiptMarkComplete, setReceiptMarkComplete] = useState(true);
  const [isUploadingToGAS, setIsUploadingToGAS] = useState(false);
  const receiptFileInputRef = useRef<HTMLInputElement | null>(null);

  const openReceiptUploadModal = (row: PiutangRecord) => {
    setReceiptTarget(row);
    setReceiptFileName(
      `Bukti_Terima_Surat_${row.invoiceNo.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`
    );
    setReceiptFileSize('1.4 MB');
    setReceiptMimeType('application/pdf');
    setReceiptBase64('JVBERi0xLjQK');
    setReceiptDriveFolderInput(
      gasConfig?.driveFolderId || '1DriveFolder_AR_BuktiSurat_2025_Master'
    );
    setReceiptDriveFolderName(
      gasConfig?.driveFolderName || 'AR_Tracker_Bukti_Surat_Diterima'
    );
    setReceiptReceiver(`Bagian Keuangan — ${row.namaPerusahaan}`);
    setReceiptDate('2025-05-15');
    setReceiptNotes('Tanda terima surat tagihan & BAST berstempel basah.');
    setReceiptMarkComplete(true);
  };

  const handleReceiptFilePick = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFileName(file.name);
    try {
      const encoded = await readFileAsBase64(file);
      setReceiptFileSize(encoded.formattedSize);
      setReceiptMimeType(encoded.mimeType);
      setReceiptBase64(encoded.base64Data);
    } catch {
      const sizeKB = Math.max(1, Math.round(file.size / 1024));
      setReceiptFileSize(
        sizeKB >= 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`
      );
    }
  };

  const handleSubmitReceiptUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptTarget || !receiptFileName.trim() || !receiptReceiver.trim()) {
      return;
    }
    setIsUploadingToGAS(true);
    try {
      await onUploadReceiptProof?.(receiptTarget.id, {
        fileName: receiptFileName.trim(),
        fileSize: receiptFileSize,
        mimeType: receiptMimeType,
        base64Data: receiptBase64,
        driveFolderId: extractDriveFolderId(receiptDriveFolderInput),
        driveFolderName:
          receiptDriveFolderName.trim() || 'AR_Tracker_Bukti_Surat_Diterima',
        receiverName: receiptReceiver.trim(),
        receiptDate: receiptDate || '2025-05-15',
        notes: receiptNotes.trim(),
        markComplete: receiptMarkComplete,
      });
      setReceiptTarget(null);
    } finally {
      setIsUploadingToGAS(false);
    }
  };

  const activeYearMonth = `${currentPeriod.year}-${String(
    currentPeriod.month
  ).padStart(2, '0')}`;
  const refISO = currentPeriod.referenceDateISO || `${activeYearMonth}-01`;

  const urgentAllMepet = getUrgentDueRecords(records, 7, refISO);
  const urgentCriticalH3 = getUrgentDueRecords(records, 3, refISO);
  const displayedUrgentItems =
    radarThresholdDays === 3 ? urgentCriticalH3 : urgentAllMepet;
  const totalUrgentNominal = displayedUrgentItems.reduce(
    (sum, item) => sum + item.record.saldoBelumTerealisasi,
    0
  );

  const baseRecordsForAging = filterPiutangRecords(
    records,
    searchQuery,
    filterKendala,
    filterStatus,
    'ALL',
    dueDateFrom,
    dueDateTo,
    urgencyFilter,
    refISO,
    'ALL'
  );
  const agingSchedule = computeAgingSchedule(baseRecordsForAging, refISO);

  const filteredRecords = filterPiutangRecords(
    records,
    searchQuery,
    filterKendala,
    filterStatus,
    'ALL',
    dueDateFrom,
    dueDateTo,
    urgencyFilter,
    refISO,
    agingBucketFilter
  );
  const kpis = computeDashboardKPIs(filteredRecords);
  const sixMonthTrend = computeSixMonthTrendData(records, activeYearMonth);
  const totalSixMonthTagihan = sixMonthTrend.reduce(
    (sum, item) => sum + item.totalTagihan,
    0
  );
  const totalSixMonthRealisasi = sixMonthTrend.reduce(
    (sum, item) => sum + item.realisasiPembayaran,
    0
  );
  const sixMonthCollectionRate =
    totalSixMonthTagihan > 0
      ? Number(
          ((totalSixMonthRealisasi / totalSixMonthTagihan) * 100).toFixed(1)
        )
      : 0;

  const handleSyncClick = async () => {
    setIsSyncing(true);
    setLastSyncText('Menghubungkan GAS...');
    try {
      await onSyncSheets();
    } finally {
      setTimeout(() => {
        setIsSyncing(false);
        setLastSyncText('Terakhir disinkron: Baru saja');
      }, 450);
    }
  };

  const handleFileImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const parsed = parseImportedPiutangCSV(text);
      if (parsed.length > 0) {
        onImportCSVRecords(parsed);
      }
      if (csvInputRef.current) {
        csvInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterKendala('ALL');
    setFilterStatus('ALL');
    setDueDateFrom('');
    setDueDateTo('');
    setUrgencyFilter('ALL');
    setAgingBucketFilter('ALL');
  };

  const handleDownloadRowReceipt = (row: PiutangRecord) => {
    downloadDocumentSimulation(
      `Kwitansi_${row.id}.html`,
      `Kwitansi & Bukti Rekonsiliasi Piutang — ${row.id}`,
      {
        'ID Transaksi': row.id,
        'Nomor Invoice': row.invoiceNo,
        'Perusahaan / Debitur B2B': row.namaPerusahaan,
        NPWP: row.npwp,
        'Cabang Operasional': row.cabang,
        'Total Tagihan (Gross)': formatRupiah(row.totalTagihan),
        'Saldo Terealisasi (Cair)': formatRupiah(row.saldoTerealisasi),
        'Sisa Belum Terealisasi': formatRupiah(row.saldoBelumTerealisasi),
        'Kategori Kendala': row.kategoriKendala,
        'Keterangan Alasan': row.keteranganKendala,
        'Status Kelengkapan Berkas': row.statusDokumen,
        'Detail Catatan Berkas': row.detailDokumen,
        'PIC Penagihan': `${row.picPenagihan} (${row.picRole})`,
      }
    );
  };

  return (
    <div className="flex flex-col w-full">
      {/* Command Header Strip */}
      <div className="w-full bg-surface-card p-6 border-b border-border-grid flex flex-col xl:flex-row xl:items-center justify-between gap-5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-text-dim font-code-audit">
            <span className="text-secondary font-semibold">AR TRACKER PRO</span>
            <span>·</span>
            <span>OPERASIONAL</span>
            <span>·</span>
            <span className="text-text-bright font-medium">
              Sheet: Data_Piutang
            </span>
          </div>
          <h1 className="font-headline-lg text-text-bright tracking-tight">
            Pusat Kendali Piutang &amp; Buku Besar Transaksi
          </h1>
          <p className="font-body-md text-text-dim max-w-3xl">
            Monitoring real-time sinkronisasi Google Sheets dengan penelusuran
            dispute klaim promo, verifikasi faktur, dan rekonsiliasi kas.
          </p>
        </div>

        {/* Quick Action Bar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleSyncClick}
            className="px-3.5 py-2 bg-surface-input hover:bg-surface-container border border-border-grid text-text-bright transition-colors flex items-center gap-2 cursor-pointer"
          >
            <span
              className={`material-symbols-outlined text-[18px] text-tertiary ${
                isSyncing ? 'animate-spin' : ''
              }`}
            >
              sync
            </span>
            <div className="flex flex-col text-left">
              <span className="font-label-caps leading-none uppercase">
                Sinkronisasi Sheets
              </span>
              <span className="font-code-audit text-[10px] text-text-dim leading-tight mt-0.5">
                {lastSyncText}
              </span>
            </div>
          </button>

          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileImportChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => csvInputRef.current?.click()}
            className="px-3.5 py-2.5 bg-surface-container hover:bg-surface-container-high border border-border-grid text-text-bright transition-colors flex items-center gap-1.5 font-label-caps uppercase cursor-pointer"
            title="Impor berkas CSV dari Google Sheets atau Excel"
          >
            <span className="material-symbols-outlined text-[18px] text-secondary">
              upload_file
            </span>
            <span>Import CSV</span>
          </button>

          {onStartFromZero && records.length > 0 && (
            <button
              type="button"
              onClick={onStartFromZero}
              className="px-3.5 py-2.5 bg-surface-container hover:bg-status-danger-surface border border-border-grid hover:border-status-danger text-text-dim hover:text-error transition-colors flex items-center gap-1.5 font-label-caps uppercase cursor-pointer"
              title="Kosongkan seluruh data dan mulai pembukuan baru dari nol (Rp 0)"
            >
              <span className="material-symbols-outlined text-[18px] text-status-danger">
                restart_alt
              </span>
              <span>Mulai dari Nol (Rp 0)</span>
            </button>
          )}

          <button
            type="button"
            onClick={onExportCSV}
            className="px-3.5 py-2.5 bg-surface-container hover:bg-surface-container-high border border-border-grid text-text-bright transition-colors flex items-center gap-1.5 font-label-caps uppercase cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px] text-status-settled">
              table_view
            </span>
            <span>Export (.CSV)</span>
          </button>

          <button
            type="button"
            onClick={onOpenCreateModal}
            className="px-5 py-2.5 bg-secondary-container hover:bg-on-secondary-fixed-variant border border-secondary text-text-bright transition-colors flex items-center gap-1.5 font-headline-sm uppercase tracking-wide cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">
              add_box
            </span>
            <span>+ Tambah Transaksi Piutang</span>
          </button>
        </div>
      </div>

      <div className="p-6 flex flex-col gap-6">
        {/* PANEL KONTROL PERIODE PEMBUKUAN (Bebas Diisi Sesuai Kapanpun Mulai Pembukuan) */}
        <div className="bg-surface-card border border-border-grid p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 bg-secondary-container border border-secondary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-text-bright text-[22px]">
                calendar_month
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2 font-code-audit flex-wrap">
                <span className="text-secondary font-bold uppercase tracking-wider">
                  PERIODE PEMBUKUAN &amp; TAHUN BUKU
                </span>
                <span className="text-text-dim">·</span>
                <span className="text-status-settled font-semibold">
                  {formatPeriodLabel(currentPeriod.year, currentPeriod.month)}
                </span>
                <span className="text-text-dim hidden sm:inline">·</span>
                <span className="text-tertiary font-code-audit text-xs hidden sm:inline">
                  Tgl Buku: {currentPeriod.referenceDateISO}
                </span>
              </div>
              <p className="font-body-sm text-text-dim mt-0.5">
                Bebas atur periode akuntansi, bulan berjalan, tahun buku, dan tanggal referensi jatuh tempo sesuai kebutuhan.
              </p>
            </div>
          </div>

          {/* Form Selector Periode Bebas Diisi */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 bg-surface-input border border-border-grid p-2.5 shrink-0 self-start xl:self-auto">
            {/* Bulan Selector */}
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="period-month-select"
                className="font-code-audit text-[11px] text-text-dim uppercase"
              >
                Bulan:
              </label>
              <select
                id="period-month-select"
                aria-label="Pilih Bulan Pembukuan"
                value={currentPeriod.month}
                onChange={(e) => {
                  const newMonth = parseInt(e.target.value, 10);
                  const mStr = String(newMonth).padStart(2, '0');
                  const day =
                    currentPeriod.referenceDateISO?.split('-')[2] || '01';
                  setPeriod({
                    ...currentPeriod,
                    month: newMonth,
                    referenceDateISO: `${currentPeriod.year}-${mStr}-${day}`,
                  });
                }}
                className="h-8 px-2 bg-surface-card border border-border-grid text-text-bright font-code-audit text-xs focus:outline-none focus:border-secondary cursor-pointer"
              >
                <option value={1}>01 - Jan</option>
                <option value={2}>02 - Feb</option>
                <option value={3}>03 - Mar</option>
                <option value={4}>04 - Apr</option>
                <option value={5}>05 - Mei</option>
                <option value={6}>06 - Jun</option>
                <option value={7}>07 - Jul</option>
                <option value={8}>08 - Agu</option>
                <option value={9}>09 - Sep</option>
                <option value={10}>10 - Okt</option>
                <option value={11}>11 - Nov</option>
                <option value={12}>12 - Des</option>
              </select>
            </div>

            {/* Tahun Input (Bebas diketik tahun berapapun) */}
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="period-year-input"
                className="font-code-audit text-[11px] text-text-dim uppercase"
              >
                Tahun:
              </label>
              <input
                id="period-year-input"
                type="number"
                min={2000}
                max={2099}
                aria-label="Ketik Tahun Pembukuan"
                value={currentPeriod.year}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) {
                    const mStr = String(currentPeriod.month).padStart(2, '0');
                    const day =
                      currentPeriod.referenceDateISO?.split('-')[2] || '01';
                    setPeriod({
                      ...currentPeriod,
                      year: val,
                      referenceDateISO: `${val}-${mStr}-${day}`,
                    });
                  }
                }}
                className="w-20 h-8 px-2 bg-surface-card border border-border-grid text-text-bright font-code-audit text-xs focus:outline-none focus:border-secondary text-center"
              />
            </div>

            {/* Tanggal Referensi Input */}
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="period-ref-date"
                className="font-code-audit text-[11px] text-text-dim uppercase"
              >
                Tgl Buku:
              </label>
              <input
                id="period-ref-date"
                type="date"
                aria-label="Tanggal Referensi Pembukuan"
                value={currentPeriod.referenceDateISO}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
                    const [y, m] = val.split('-').map(Number);
                    setPeriod({
                      year: y,
                      month: m,
                      referenceDateISO: val,
                    });
                  }
                }}
                className="h-8 px-2 bg-surface-card border border-border-grid text-text-bright font-code-audit text-xs focus:outline-none focus:border-secondary cursor-pointer"
              />
            </div>

            {/* Button Set Hari Ini */}
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const y = now.getFullYear();
                const m = now.getMonth() + 1;
                const d = String(now.getDate()).padStart(2, '0');
                const mStr = String(m).padStart(2, '0');
                setPeriod({
                  year: y,
                  month: m,
                  referenceDateISO: `${y}-${mStr}-${d}`,
                });
              }}
              title="Set periode ke tanggal hari ini"
              className="px-2.5 py-1 bg-surface-container hover:bg-surface-container-high border border-border-grid text-secondary hover:text-text-bright font-code-audit text-xs flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">today</span>
              <span>Hari Ini</span>
            </button>
          </div>
        </div>

        {/* FITUR 1: KPI Dashboard Cards (4 Metrik Utama PRD) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* KPI 1: Total Piutang */}
          <div className="bg-surface-card border border-border-grid p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-text-dim uppercase tracking-wider">
                Total Piutang (Gross)
              </span>
              <span className="material-symbols-outlined text-[18px] text-primary">
                account_balance
              </span>
            </div>
            <div className="my-3">
              <div className="font-numeric-kpi text-text-bright tracking-tight">
                {formatRupiah(kpis.totalPiutang)}
              </div>
              <span className="font-code-audit text-text-dim block mt-1">
                Akumulasi Total_Tagihan dari {kpis.totalTransaksi} transaksi
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border-grid/60">
              <span className="font-label-caps text-on-surface-variant">
                PORTFOLIO EXPOSURE
              </span>
              <span className="font-code-audit text-secondary">
                100% Invoiced Terbit
              </span>
            </div>
          </div>

          {/* KPI 2: Total Terealisasi */}
          <div className="bg-surface-card border border-border-grid p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-status-settled uppercase tracking-wider">
                Total Terealisasi (Collected)
              </span>
              <span className="material-symbols-outlined text-[18px] text-status-settled">
                check_circle
              </span>
            </div>
            <div className="my-3">
              <div className="font-numeric-kpi text-status-settled tracking-tight">
                {formatRupiah(kpis.totalRealisasi)}
              </div>
              <div className="flex items-center gap-2 mt-1 font-code-audit text-text-dim">
                <span className="text-status-settled font-semibold">
                  {kpis.realisasiRatio}% CAIR
                </span>
                <span>·</span>
                <span>Kas masuk terkonfirmasi</span>
              </div>
            </div>
            <div className="w-full bg-surface-input h-1.5 overflow-hidden">
              <div
                className="bg-status-settled h-full"
                style={{ width: `${Math.min(100, kpis.realisasiRatio)}%` }}
              />
            </div>
          </div>

          {/* KPI 3: Total Outstanding */}
          <div className="bg-surface-card border border-border-grid p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-status-pending uppercase tracking-wider">
                Total Outstanding (Kurang Bayar)
              </span>
              <span className="material-symbols-outlined text-[18px] text-status-pending">
                pending_actions
              </span>
            </div>
            <div className="my-3">
              <div className="font-numeric-kpi text-status-pending tracking-tight">
                {formatRupiah(kpis.totalOutstanding)}
              </div>
              <div className="flex items-center gap-2 mt-1 font-code-audit text-text-dim">
                <span className="text-status-pending font-semibold">
                  {kpis.outstandingRatio}% TERTUNDA
                </span>
                <span>·</span>
                <span>Dispute &amp; tempo terbuka</span>
              </div>
            </div>
            <div className="w-full bg-surface-input h-1.5 overflow-hidden">
              <div
                className="bg-status-pending h-full"
                style={{ width: `${Math.min(100, kpis.outstandingRatio)}%` }}
              />
            </div>
          </div>

          {/* KPI 4: Dokumen Pending */}
          <div className="bg-surface-card border border-border-grid p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-status-danger uppercase tracking-wider">
                Dokumen Pending
              </span>
              <span className="material-symbols-outlined text-[18px] text-status-danger">
                warning
              </span>
            </div>
            <div className="my-3 flex items-baseline gap-2">
              <div className="font-numeric-kpi text-text-bright tracking-tight">
                {kpis.dokumenPending}
              </div>
              <span className="font-label-caps text-status-danger uppercase">
                BERKAS DEFISIT
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border-grid/60">
              <span className="font-code-audit text-text-dim">
                Defisit Kwitansi / Faktur
              </span>
              <span className="font-code-audit text-status-danger font-semibold">
                ACTION REQUIRED
              </span>
            </div>
          </div>
        </div>

        {/* FITUR 1B: Visualisasi Recharts Tren 6 Bulan Terakhir (Total Tagihan vs Realisasi Pembayaran) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          {/* Left 8 Cols: Interactive Recharts Chart */}
          <div className="xl:col-span-8 bg-surface-card border border-border-grid p-5 flex flex-col justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-grid">
              <div>
                <div className="flex items-center gap-2 font-code-audit text-text-dim">
                  <span className="text-secondary font-semibold uppercase">
                    ANALITIK ARUS KAS PIUTANG
                  </span>
                  <span>·</span>
                  <span className="text-tertiary">
                    6 BULAN TERAKHIR ({getSixMonthPeriodRangeLabel(sixMonthTrend)})
                  </span>
                </div>
                <h2 className="font-headline-md text-text-bright mt-0.5">
                  Tren Total Tagihan vs Realisasi Pembayaran ({getSixMonthPeriodRangeLabel(sixMonthTrend)})
                </h2>
              </div>

              <div className="flex items-center bg-surface-input border border-border-grid p-0.5 shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setChartType('composed')}
                  className={`px-3 py-1 font-label-caps uppercase transition-colors flex items-center gap-1 cursor-pointer ${
                    chartType === 'composed'
                      ? 'bg-primary-container text-text-bright border border-secondary'
                      : 'text-text-dim hover:text-text-bright'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">
                    bar_chart
                  </span>
                  <span>Komparasi Bar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChartType('area')}
                  className={`px-3 py-1 font-label-caps uppercase transition-colors flex items-center gap-1 cursor-pointer ${
                    chartType === 'area'
                      ? 'bg-primary-container text-text-bright border border-secondary'
                      : 'text-text-dim hover:text-text-bright'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">
                    stacked_line_chart
                  </span>
                  <span>Kurva Area</span>
                </button>
              </div>
            </div>

            {/* Recharts Canvas Container */}
            <div
              className="w-full h-[290px] min-w-0"
              aria-label="Grafik Tren Total Tagihan vs Realisasi Pembayaran 6 Bulan Terakhir"
            >
              <ResponsiveContainer width="100%" height={290}>
                {chartType === 'composed' ? (
                  <ComposedChart
                    data={sixMonthTrend}
                    margin={{ top: 10, right: 16, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#222a3d"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="monthLabel"
                      stroke="#8c9bbd"
                      padding={{ left: 12, right: 12 }}
                      tick={{ fill: '#8c9bbd', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                      axisLine={{ stroke: '#222a3d' }}
                      tickLine={false}
                    />
                    <YAxis
                      width={68}
                      stroke="#8c9bbd"
                      tick={{ fill: '#8c9bbd', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                      axisLine={{ stroke: '#222a3d' }}
                      tickLine={false}
                      tickFormatter={(val: number) =>
                        `Rp ${(val / 1000000000).toFixed(1)}M`
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#131b2e',
                        borderColor: '#3b82f6',
                        borderRadius: '0px',
                        color: '#f8fafc',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '12px',
                      }}
                      formatter={(value: any, name: any) => [
                        formatRupiah(Number(value) || 0),
                        name,
                      ]}
                    />
                    <Legend
                      wrapperStyle={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '12px',
                        paddingTop: '8px',
                      }}
                    />
                    <Bar
                      dataKey="totalTagihan"
                      name="Total Tagihan (Invoiced)"
                      fill="#3b82f6"
                      barSize={26}
                    />
                    <Bar
                      dataKey="realisasiPembayaran"
                      name="Realisasi Pembayaran (Cair)"
                      fill="#10b981"
                      barSize={26}
                    />
                    <Line
                      type="monotone"
                      dataKey="sisaOutstanding"
                      name="Sisa Outstanding (Kurang Bayar)"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ r: 4, fill: '#f59e0b' }}
                    />
                  </ComposedChart>
                ) : (
                  <AreaChart
                    data={sixMonthTrend}
                    margin={{ top: 10, right: 20, left: 8, bottom: 4 }}
                  >
                    <defs>
                      <linearGradient id="gradTagihan" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="gradRealisasi" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#222a3d"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="monthLabel"
                      stroke="#8c9bbd"
                      padding={{ left: 16, right: 16 }}
                      tick={{ fill: '#8c9bbd', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                      axisLine={{ stroke: '#222a3d' }}
                      tickLine={false}
                    />
                    <YAxis
                      width={68}
                      stroke="#8c9bbd"
                      tick={{ fill: '#8c9bbd', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                      axisLine={{ stroke: '#222a3d' }}
                      tickLine={false}
                      tickFormatter={(val: number) =>
                        `Rp ${(val / 1000000000).toFixed(1)}M`
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#131b2e',
                        borderColor: '#3b82f6',
                        borderRadius: '0px',
                        color: '#f8fafc',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '12px',
                      }}
                      formatter={(value: any, name: any) => [
                        formatRupiah(Number(value) || 0),
                        name,
                      ]}
                    />
                    <Legend
                      wrapperStyle={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '12px',
                        paddingTop: '8px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="totalTagihan"
                      name="Total Tagihan (Invoiced)"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#gradTagihan)"
                    />
                    <Area
                      type="monotone"
                      dataKey="realisasiPembayaran"
                      name="Realisasi Pembayaran (Cair)"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#gradRealisasi)"
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right 4 Cols: 6-Month Summary & Monthly Realization Breakdown */}
          <div className="xl:col-span-4 bg-surface-card border border-border-grid p-5 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-border-grid">
                <div>
                  <span className="font-label-caps text-text-dim uppercase block">
                    REKAPITULASI 6 BULAN TERAKHIR
                  </span>
                  <h3 className="font-headline-sm text-text-bright mt-0.5">
                    Performa Realisasi Bulanan
                  </h3>
                </div>
                <span className="px-2 py-0.5 bg-status-settled-surface border border-status-settled text-tertiary font-code-audit font-bold">
                  {sixMonthCollectionRate}% CAIR
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 my-3">
                <div className="p-2.5 bg-surface-input border border-border-grid">
                  <span className="font-label-caps text-text-dim uppercase block">
                    Tagihan 6 Bln
                  </span>
                  <span className="font-numeric-table text-text-bright font-bold">
                    {formatRupiah(totalSixMonthTagihan)}
                  </span>
                </div>
                <div className="p-2.5 bg-surface-input border border-border-grid">
                  <span className="font-label-caps text-status-settled uppercase block">
                    Realisasi 6 Bln
                  </span>
                  <span className="font-numeric-table text-status-settled font-bold">
                    {formatRupiah(totalSixMonthRealisasi)}
                  </span>
                </div>
              </div>

              {/* Monthly table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-code-audit">
                  <thead>
                    <tr className="border-b border-border-grid text-text-dim uppercase">
                      <th className="py-1.5">Periode</th>
                      <th className="py-1.5 text-right">Tagihan</th>
                      <th className="py-1.5 text-right">Realisasi</th>
                      <th className="py-1.5 text-right">Rasio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-grid/60">
                    {sixMonthTrend.map((m) => (
                      <tr key={m.monthKey} className="hover:bg-surface-container">
                        <td className="py-1.5 text-text-bright font-medium">
                          {m.monthKey === activeYearMonth
                            ? `${m.monthLabel}*`
                            : m.monthLabel}
                        </td>
                        <td className="py-1.5 text-right text-text-dim font-numeric-table">
                          {(m.totalTagihan / 1000000).toFixed(0)} Jt
                        </td>
                        <td className="py-1.5 text-right text-status-settled font-numeric-table">
                          {(m.realisasiPembayaran / 1000000).toFixed(0)} Jt
                        </td>
                        <td className="py-1.5 text-right font-bold text-tertiary">
                          {m.rasioCair}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-2 border-t border-border-grid flex items-center justify-between font-code-audit text-text-dim">
              <span>
                *{formatPeriodLabel(currentPeriod.year, currentPeriod.month)}{' '}
                terhubung real-time ke tabel aktif
              </span>
              <span className="text-secondary">Recharts Engine</span>
            </div>
          </div>
        </div>

        {/* FITUR 1B-2: Aging Schedule Piutang & Analisis Likuiditas (1-30, 31-60, 61-90, >90 Hari) */}
        <div className="bg-surface-card border border-border-grid p-5 flex flex-col gap-4">
          {/* Aging Schedule Header & Filter Strip */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-border-grid">
            <div>
              <div className="flex items-center gap-2 font-code-audit text-text-dim flex-wrap">
                <span className="text-secondary font-semibold uppercase tracking-wider">
                  AGING SCHEDULE &amp; INSIGHT LIKUIDITAS
                </span>
                <span>·</span>
                <span className="text-tertiary font-semibold">
                  STRATIFIKASI UMUR PIUTANG (1–30, 31–60, 61–90, &gt;90 HARI)
                </span>
                <span>·</span>
                <span>
                  Rata-Rata Tertimbang Umur:{' '}
                  <strong className="text-text-bright">
                    {agingSchedule.weightedAverageAgeDays} Hari
                  </strong>
                </span>
              </div>
              <h2 className="font-headline-md text-text-bright mt-0.5">
                Analisis Umur Piutang (Aging Schedule) &amp; Profil Risiko Likuiditas
              </h2>
            </div>

            {/* Quick Aging Bucket Filter Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap shrink-0">
              <span className="font-code-audit text-text-dim mr-0.5 whitespace-nowrap">
                Filter Umur:
              </span>
              <button
                type="button"
                onClick={() => setAgingBucketFilter('ALL')}
                className={`px-2.5 py-1 font-code-audit uppercase border whitespace-nowrap transition-colors cursor-pointer ${
                  agingBucketFilter === 'ALL'
                    ? 'bg-primary-container border-secondary text-text-bright font-bold'
                    : 'bg-surface-input border-border-grid text-text-dim hover:text-text-bright'
                }`}
              >
                Semua Umur ({agingSchedule.totalInvoices})
              </button>
              {agingSchedule.buckets.map((b) => {
                const isSelected = agingBucketFilter === b.key;
                return (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() =>
                      setAgingBucketFilter((prev) =>
                        prev === b.key ? 'ALL' : b.key
                      )
                    }
                    className={`px-2.5 py-1 font-code-audit uppercase border whitespace-nowrap transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-primary-container border-secondary text-text-bright font-bold'
                        : 'bg-surface-input border-border-grid text-text-dim hover:text-text-bright'
                    }`}
                  >
                    {b.shortLabel} ({b.invoiceCount})
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3 Liquidity Insight Mini-KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-surface-input border border-border-grid flex items-center justify-between gap-3">
              <div>
                <span className="font-label-caps text-status-settled uppercase block">
                  Likuiditas Lancar &amp; Watch (1–60 Hari)
                </span>
                <div className="font-numeric-table text-text-bright font-bold text-base mt-0.5">
                  {formatRupiah(agingSchedule.performingLiquidityAmount)}
                </div>
                <span className="font-code-audit text-text-dim text-[11px]">
                  {agingSchedule.performingLiquidityRatio}% dari Total Piutang berada di siklus sehat ≤60 hari
                </span>
              </div>
              <span className="px-2 py-1 bg-status-settled-surface border border-status-settled text-status-settled font-code-audit font-bold whitespace-nowrap">
                {agingSchedule.performingLiquidityRatio}% SEHAT
              </span>
            </div>

            <div className="p-3 bg-surface-input border border-border-grid flex items-center justify-between gap-3">
              <div>
                <span className="font-label-caps text-status-danger uppercase block">
                  Eksposur Tertahan (&gt; 60 Hari Belum Cair)
                </span>
                <div className="font-numeric-table text-status-danger font-bold text-base mt-0.5">
                  {formatRupiah(agingSchedule.atRisk60PlusAmount)}
                </div>
                <span className="font-code-audit text-text-dim text-[11px]">
                  {agingSchedule.atRisk60PlusRatio}% dari Sisa Outstanding tertahan di umur 61–90 &amp; &gt;90 hari
                </span>
              </div>
              <span className="px-2 py-1 bg-status-danger-surface border border-status-danger text-status-danger font-code-audit font-bold whitespace-nowrap">
                {agingSchedule.atRisk60PlusRatio}% RISIKO
              </span>
            </div>

            <div className="p-3 bg-surface-input border border-border-grid flex flex-col justify-between gap-1.5">
              <div className="flex items-center justify-between font-code-audit">
                <span className="font-label-caps text-text-dim uppercase">
                  Proporsi Distribusi Umur Piutang
                </span>
                <span className="text-secondary font-bold">
                  W.A. {agingSchedule.weightedAverageAgeDays} Hari
                </span>
              </div>
              {/* Stacked visual distribution bar */}
              <div className="w-full h-3 bg-surface-card border border-border-grid flex overflow-hidden">
                {agingSchedule.buckets.map((b) => {
                  const barColor =
                    b.key === '1-30'
                      ? 'bg-status-settled'
                      : b.key === '31-60'
                      ? 'bg-secondary'
                      : b.key === '61-90'
                      ? 'bg-status-pending'
                      : 'bg-status-danger';
                  return (
                    <div
                      key={b.key}
                      style={{ width: `${Math.max(0, b.shareOfTotalPiutang)}%` }}
                      className={`${barColor} h-full transition-all`}
                      title={`${b.shortLabel}: ${formatRupiah(b.totalPiutang)} (${b.shareOfTotalPiutang}%)`}
                    />
                  );
                })}
              </div>
              <div className="flex items-center justify-between font-code-audit text-[10px] text-text-dim">
                <span className="text-status-settled">■ 1-30 ({agingSchedule.buckets[0]?.shareOfTotalPiutang}%)</span>
                <span className="text-secondary">■ 31-60 ({agingSchedule.buckets[1]?.shareOfTotalPiutang}%)</span>
                <span className="text-status-pending">■ 61-90 ({agingSchedule.buckets[2]?.shareOfTotalPiutang}%)</span>
                <span className="text-status-danger">■ &gt;90 ({agingSchedule.buckets[3]?.shareOfTotalPiutang}%)</span>
              </div>
            </div>
          </div>

          {/* Main Aging Schedule Content: Left 5 Cols Chart + Right 7 Cols Table */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
            {/* Left 5 Cols: Recharts Aging Schedule Bar Chart */}
            <div className="xl:col-span-5 bg-surface-input border border-border-grid p-4 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-border-grid">
                <div>
                  <span className="font-label-caps text-secondary uppercase block">
                    VISUALISASI CHART AGING SCHEDULE
                  </span>
                  <h3 className="font-headline-sm text-text-bright">
                    Komparasi Piutang, Realisasi &amp; Sisa per Umur
                  </h3>
                </div>
                <span className="font-code-audit text-text-dim text-[11px] whitespace-nowrap">
                  4 Kategori Umur
                </span>
              </div>

              <div
                className="w-full h-[250px] min-w-0"
                aria-label="Grafik Aging Schedule Piutang Berdasarkan Kategori Umur"
              >
                <ResponsiveContainer width="100%" height={250}>
                  <ComposedChart
                    data={agingSchedule.buckets}
                    margin={{ top: 10, right: 12, left: 4, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#222a3d"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="shortLabel"
                      stroke="#8c9bbd"
                      padding={{ left: 10, right: 10 }}
                      tick={{
                        fill: '#f8fafc',
                        fontSize: 11,
                        fontFamily: 'JetBrains Mono',
                      }}
                      axisLine={{ stroke: '#222a3d' }}
                      tickLine={false}
                    />
                    <YAxis
                      width={64}
                      stroke="#8c9bbd"
                      tick={{
                        fill: '#8c9bbd',
                        fontSize: 11,
                        fontFamily: 'JetBrains Mono',
                      }}
                      axisLine={{ stroke: '#222a3d' }}
                      tickLine={false}
                      tickFormatter={(val: number) =>
                        `Rp ${(val / 1000000000).toFixed(1)}M`
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#131b2e',
                        borderColor: '#3b82f6',
                        borderRadius: '0px',
                        color: '#f8fafc',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '12px',
                      }}
                      formatter={(value: any, name: any) => [
                        formatRupiah(Number(value) || 0),
                        name,
                      ]}
                    />
                    <Legend
                      wrapperStyle={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '11px',
                        paddingTop: '6px',
                      }}
                    />
                    <Bar
                      dataKey="totalPiutang"
                      name="Total Piutang (Gross)"
                      fill="#3b82f6"
                      barSize={20}
                    />
                    <Bar
                      dataKey="totalRealisasi"
                      name="Terealisasi (Cair)"
                      fill="#10b981"
                      barSize={20}
                    />
                    <Bar
                      dataKey="totalOutstanding"
                      name="Sisa Outstanding"
                      fill="#ef4444"
                      barSize={20}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right 7 Cols: Structured Aging Schedule Table */}
            <div className="xl:col-span-7 bg-surface-input border border-border-grid p-4 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-border-grid">
                <div>
                  <span className="font-label-caps text-tertiary uppercase block">
                    TABEL MATRIKS AGING SCHEDULE
                  </span>
                  <h3 className="font-headline-sm text-text-bright">
                    Rincian Kelompok Umur Piutang &amp; Rasio Kolektibilitas
                  </h3>
                </div>
                <span className="font-code-audit text-text-dim text-[11px] whitespace-nowrap">
                  Klik baris untuk filter tabel
                </span>
              </div>

              <div className="overflow-x-auto">
                <table
                  className="w-full text-left border-collapse font-code-audit text-[11px]"
                  aria-label="Tabel Aging Schedule Piutang"
                >
                  <thead>
                    <tr className="border-b border-border-grid text-text-dim uppercase text-[10px]">
                      <th className="py-2 pr-1.5">Kategori Umur</th>
                      <th className="py-2 px-1 text-center">Faktur</th>
                      <th className="py-2 px-1 text-right">Total Piutang</th>
                      <th className="py-2 px-1 text-right">Realisasi</th>
                      <th className="py-2 pl-1 text-right">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-grid/70">
                    {agingSchedule.buckets.map((bucket) => {
                      const isRowActive = agingBucketFilter === bucket.key;
                      const riskBadgeClass =
                        bucket.riskLevel === 'LOW'
                          ? 'bg-status-settled-surface border-status-settled text-status-settled'
                          : bucket.riskLevel === 'MEDIUM'
                          ? 'bg-primary-container border-secondary text-secondary'
                          : bucket.riskLevel === 'HIGH'
                          ? 'bg-status-pending-surface border-status-pending text-status-pending'
                          : 'bg-status-danger-surface border-status-danger text-status-danger';

                      return (
                        <tr
                          key={bucket.key}
                          onClick={() =>
                            setAgingBucketFilter((prev) =>
                              prev === bucket.key ? 'ALL' : bucket.key
                            )
                          }
                          className={`transition-colors cursor-pointer ${
                            isRowActive
                              ? 'bg-primary-container/50'
                              : 'hover:bg-surface-card'
                          }`}
                        >
                          <td className="py-2 pr-1.5 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <span className="text-text-bright font-bold">
                                {bucket.shortLabel}
                              </span>
                              <span
                                className={`px-1 py-0.5 text-[9px] font-bold uppercase border ${riskBadgeClass}`}
                              >
                                {bucket.riskLevel === 'LOW'
                                  ? 'LANCAR'
                                  : bucket.riskLevel === 'MEDIUM'
                                  ? 'WATCH'
                                  : bucket.riskLevel === 'HIGH'
                                  ? 'KURANG LANCAR'
                                  : 'MACET'}
                              </span>
                            </div>
                            <span className="text-[10px] text-text-dim block">
                              {bucket.rangeDescription}
                            </span>
                          </td>
                          <td className="py-2 px-1 text-center whitespace-nowrap">
                            <span className="text-text-bright font-bold">
                              {bucket.invoiceCount}
                            </span>
                            <span className="text-text-dim text-[10px] block">
                              {bucket.unpaidCount} aktif
                            </span>
                          </td>
                          <td className="py-2 px-1 text-right font-mono whitespace-nowrap">
                            <div className="text-text-bright font-semibold">
                              {formatRupiah(bucket.totalPiutang)}
                            </div>
                            <span className="text-[10px] text-secondary">
                              {bucket.shareOfTotalPiutang}% porsi
                            </span>
                          </td>
                          <td className="py-2 px-1 text-right font-mono whitespace-nowrap">
                            <div className="text-status-settled font-semibold">
                              {formatRupiah(bucket.totalRealisasi)}
                            </div>
                            <span className="text-[10px] text-tertiary">
                              {bucket.collectionRate}% cair
                            </span>
                          </td>
                          <td className="py-2 pl-1 text-right font-mono whitespace-nowrap">
                            <div
                              className={`font-bold ${
                                bucket.totalOutstanding > 0
                                  ? 'text-status-danger'
                                  : 'text-status-settled'
                              }`}
                            >
                              {formatRupiah(bucket.totalOutstanding)}
                            </div>
                            <span className="text-[10px] text-text-dim">
                              {bucket.shareOfOutstanding}% risiko
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border-grid bg-surface-card text-text-bright font-bold font-mono text-[11px]">
                      <td className="py-2 pr-1.5 uppercase font-code-audit">
                        Total Portofolio
                      </td>
                      <td className="py-2 px-1 text-center">
                        {agingSchedule.totalInvoices}
                      </td>
                      <td className="py-2 px-1 text-right whitespace-nowrap">
                        {formatRupiah(agingSchedule.totalPiutang)}
                      </td>
                      <td className="py-2 px-1 text-right text-status-settled whitespace-nowrap">
                        {formatRupiah(agingSchedule.totalRealisasi)}
                      </td>
                      <td className="py-2 pl-1 text-right text-status-danger whitespace-nowrap">
                        {formatRupiah(agingSchedule.totalOutstanding)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* FITUR 1C: Radar Tagihan Jatuh Tempo Mepet (Early Warning & Priority Collection) */}
        <div className="bg-surface-card border border-status-danger/60 p-5 flex flex-col gap-4">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3 border-b border-border-grid">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 bg-status-danger-surface border border-status-danger flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-status-danger text-[20px]">
                  notification_important
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2 font-code-audit flex-wrap">
                  <span className="text-status-danger font-bold uppercase tracking-wider">
                    RADAR JATUH TEMPO MEPET (EARLY WARNING)
                  </span>
                  <span className="text-text-dim">·</span>
                  <span className="text-status-pending font-semibold">
                    {displayedUrgentItems.length} FAKTUR BELUM LUNAS MENDEKATI TEMPO
                  </span>
                </div>
                <h2 className="font-headline-md text-text-bright mt-0.5">
                  Prioritas Penagihan Tagihan Mepet — Total Risiko:{' '}
                  <span className="text-status-danger font-mono whitespace-nowrap">
                    {formatRupiah(totalUrgentNominal)}
                  </span>
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap xl:flex-nowrap shrink-0">
              <div className="flex items-center bg-surface-input border border-border-grid p-0.5 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => setRadarThresholdDays(7)}
                  className={`px-3 py-1 font-code-audit uppercase transition-colors cursor-pointer ${
                    radarThresholdDays === 7
                      ? 'bg-primary-container border border-secondary text-text-bright font-bold'
                      : 'text-text-dim hover:text-text-bright'
                  }`}
                >
                  Mepet ≤ 7 Hari ({urgentAllMepet.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRadarThresholdDays(3)}
                  className={`px-3 py-1 font-code-audit uppercase transition-colors cursor-pointer ${
                    radarThresholdDays === 3
                      ? 'bg-status-danger-surface border border-status-danger text-status-danger font-bold'
                      : 'text-text-dim hover:text-text-bright'
                  }`}
                >
                  Kritis H-3 ({urgentCriticalH3.length})
                </button>
              </div>

              <button
                type="button"
                onClick={() =>
                  setUrgencyFilter((prev) =>
                    prev === (radarThresholdDays === 3 ? 'CRITICAL_3' : 'MEPET_7')
                      ? 'ALL'
                      : radarThresholdDays === 3
                      ? 'CRITICAL_3'
                      : 'MEPET_7'
                  )
                }
                className={`px-3 py-1.5 font-label-caps uppercase border transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  urgencyFilter !== 'ALL'
                    ? 'bg-status-danger-surface border-status-danger text-status-danger font-bold'
                    : 'bg-surface-container-high hover:bg-surface-variant border-border-grid text-text-bright'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">
                  filter_alt
                </span>
                <span>
                  {urgencyFilter !== 'ALL'
                    ? 'Tampilkan Semua'
                    : 'Filter di Tabel'}
                </span>
              </button>
            </div>
          </div>

          {displayedUrgentItems.length === 0 ? (
            <div className="p-4 bg-surface-input border border-border-grid text-center font-body-sm text-text-dim">
              Tidak ada tagihan belum lunas yang jatuh tempo dalam rentang ≤{' '}
              {radarThresholdDays} hari.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {displayedUrgentItems.map(({ record: item, urgency }) => {
                const isCrit = urgency.isCritical;
                return (
                  <div
                    key={item.id}
                    className={`p-3.5 bg-surface-input border flex flex-col justify-between gap-2.5 ${
                      isCrit
                        ? 'border-status-danger/80'
                        : 'border-status-pending/70'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`px-2 py-0.5 font-code-audit text-[10px] font-bold uppercase border whitespace-nowrap ${
                            isCrit
                              ? 'bg-status-danger-surface border-status-danger text-status-danger'
                              : 'bg-status-pending-surface border-status-pending text-status-pending'
                          }`}
                        >
                          {urgency.badgeLabel}
                        </span>
                        <span className="font-code-audit text-secondary font-semibold whitespace-nowrap">
                          {item.id}
                        </span>
                      </div>

                      <div className="font-headline-sm text-text-bright mt-2 truncate">
                        {item.namaPerusahaan}
                      </div>

                      <div className="flex items-center justify-between font-code-audit text-text-dim mt-1">
                        <span className="flex items-center gap-1 text-text-bright whitespace-nowrap">
                          <span className="material-symbols-outlined text-[13px] text-status-pending">
                            event
                          </span>
                          Tempo: {item.dueDate}
                        </span>
                        <span className="truncate">{item.cabang}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border-grid/70 flex items-end justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-label-caps text-text-dim uppercase block text-[10px] whitespace-nowrap">
                          Sisa Belum Cair
                        </span>
                        <span className="font-numeric-table text-status-danger font-bold whitespace-nowrap block">
                          {formatRupiah(item.saldoBelumTerealisasi)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenEditModal(item)}
                        className="px-2.5 py-1 bg-surface-card hover:bg-primary-container border border-border-grid hover:border-secondary text-text-bright font-code-audit text-[10px] uppercase whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                      >
                        Tindak Lanjut
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Filter & Operational Toolbar */}
        <div className="bg-surface-card border border-border-grid p-4 flex flex-col gap-3.5">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            <div className="flex-1 flex flex-col md:flex-row items-stretch md:items-center gap-3">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-text-dim text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  aria-label="Cari Transaksi Piutang"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari ID_Transaksi, Nama Perusahaan B2B, NPWP, atau Keterangan..."
                  className="w-full h-9 bg-surface-input border border-border-grid text-text-bright pl-9 pr-3 font-body-sm focus:outline-none focus:border-secondary"
                />
              </div>

              <div className="w-full md:w-52">
                <select
                  aria-label="Filter Kategori Kendala"
                  value={filterKendala}
                  onChange={(e) => setFilterKendala(e.target.value)}
                  className="w-full h-9 bg-surface-input border border-border-grid text-text-bright px-3 font-body-sm focus:outline-none focus:border-secondary cursor-pointer"
                >
                  <option value="ALL">Kategori Kendala: Semua</option>
                  <option value="Clear">Clear (Rekonsiliasi)</option>
                  <option value="Kwitansi_Kurang">Kwitansi_Kurang</option>
                  <option value="Promo">Promo Diskon</option>
                  <option value="Lainnya">Lainnya (Dispute)</option>
                </select>
              </div>

              <div className="w-full md:w-48">
                <select
                  aria-label="Filter Status Dokumen"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full h-9 bg-surface-input border border-border-grid text-text-bright px-3 font-body-sm focus:outline-none focus:border-secondary cursor-pointer"
                >
                  <option value="ALL">Status Dokumen: Semua</option>
                  <option value="Lengkap">Lengkap</option>
                  <option value="Belum Lengkap">Belum Lengkap</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-4">
              <div className="flex items-center gap-1.5 font-code-audit text-text-dim">
                <span>Menampilkan:</span>
                <span className="text-text-bright font-semibold">
                  {filteredRecords.length} dari {records.length} Entri
                </span>
              </div>
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 py-1 bg-surface-container-high hover:bg-surface-variant text-text-bright font-code-audit uppercase transition-colors cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Row 2: Filter Rentang Tanggal Jatuh Tempo */}
          <div className="pt-3 border-t border-border-grid flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
              <div className="flex items-center gap-1.5 font-label-caps text-secondary uppercase tracking-wider whitespace-nowrap">
                <span className="material-symbols-outlined text-[16px]">
                  date_range
                </span>
                <span>Rentang Jatuh Tempo:</span>
              </div>

              <div className="flex items-center bg-surface-input border border-border-grid h-8 px-2 gap-1.5 whitespace-nowrap">
                <label
                  htmlFor="due-date-from"
                  className="font-code-audit text-text-dim uppercase text-[10px]"
                >
                  Dari
                </label>
                <input
                  id="due-date-from"
                  type="date"
                  aria-label="Tanggal Jatuh Tempo Dari"
                  value={dueDateFrom}
                  onChange={(e) => setDueDateFrom(e.target.value)}
                  className="bg-transparent text-text-bright font-code-audit text-xs focus:outline-none cursor-pointer"
                />
              </div>

              <span className="font-code-audit text-text-dim">s/d</span>

              <div className="flex items-center bg-surface-input border border-border-grid h-8 px-2 gap-1.5 whitespace-nowrap">
                <label
                  htmlFor="due-date-to"
                  className="font-code-audit text-text-dim uppercase text-[10px]"
                >
                  Sampai
                </label>
                <input
                  id="due-date-to"
                  type="date"
                  aria-label="Tanggal Jatuh Tempo Sampai"
                  value={dueDateTo}
                  onChange={(e) => setDueDateTo(e.target.value)}
                  className="bg-transparent text-text-bright font-code-audit text-xs focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            {/* Quick Due Date Range Presets */}
            <div className="flex items-center gap-1.5 flex-wrap xl:flex-nowrap shrink-0">
              <span className="font-code-audit text-text-dim mr-0.5 whitespace-nowrap">
                Filter Cepat:
              </span>
              <button
                type="button"
                onClick={() => {
                  setDueDateFrom('');
                  setDueDateTo('');
                  setUrgencyFilter('ALL');
                }}
                className={`px-2 py-1 font-code-audit uppercase border whitespace-nowrap transition-colors cursor-pointer ${
                  !dueDateFrom && !dueDateTo && urgencyFilter === 'ALL'
                    ? 'bg-primary-container border-secondary text-text-bright font-semibold'
                    : 'bg-surface-input border-border-grid text-text-dim hover:text-text-bright'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => {
                  setDueDateFrom('');
                  setDueDateTo('');
                  setUrgencyFilter((prev) =>
                    prev === 'MEPET_7' ? 'ALL' : 'MEPET_7'
                  );
                }}
                className={`px-2 py-1 font-code-audit uppercase border whitespace-nowrap transition-colors cursor-pointer ${
                  urgencyFilter === 'MEPET_7'
                    ? 'bg-status-pending-surface border-status-pending text-status-pending font-bold'
                    : 'bg-surface-input border-border-grid text-status-pending hover:text-text-bright'
                }`}
              >
                Mepet ≤7Hr ({urgentAllMepet.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setDueDateFrom('');
                  setDueDateTo('');
                  setUrgencyFilter((prev) =>
                    prev === 'CRITICAL_3' ? 'ALL' : 'CRITICAL_3'
                  );
                }}
                className={`px-2 py-1 font-code-audit uppercase border whitespace-nowrap transition-colors cursor-pointer ${
                  urgencyFilter === 'CRITICAL_3'
                    ? 'bg-status-danger-surface border-status-danger text-status-danger font-bold'
                    : 'bg-surface-input border-border-grid text-status-danger hover:text-text-bright'
                }`}
              >
                H-3 Kritis ({urgentCriticalH3.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setUrgencyFilter('ALL');
                  const mStr = String(currentPeriod.month).padStart(2, '0');
                  const daysInMonth = new Date(
                    currentPeriod.year,
                    currentPeriod.month,
                    0
                  ).getDate();
                  setDueDateFrom(`${currentPeriod.year}-${mStr}-01`);
                  setDueDateTo(
                    `${currentPeriod.year}-${mStr}-${String(
                      daysInMonth
                    ).padStart(2, '0')}`
                  );
                }}
                className={`px-2 py-1 font-code-audit uppercase border whitespace-nowrap transition-colors cursor-pointer ${
                  dueDateFrom ===
                  `${currentPeriod.year}-${String(
                    currentPeriod.month
                  ).padStart(2, '0')}-01`
                    ? 'bg-primary-container border-secondary text-text-bright font-semibold'
                    : 'bg-surface-input border-border-grid text-text-dim hover:text-text-bright'
                }`}
              >
                Bulan Ini ({currentPeriod.month}/{currentPeriod.year})
              </button>
              <button
                type="button"
                onClick={() => {
                  setUrgencyFilter('ALL');
                  const quarter = Math.ceil(currentPeriod.month / 3);
                  const startMonth = String((quarter - 1) * 3 + 1).padStart(
                    2,
                    '0'
                  );
                  const endMonthNum = quarter * 3;
                  const endMonth = String(endMonthNum).padStart(2, '0');
                  const lastDay = new Date(
                    currentPeriod.year,
                    endMonthNum,
                    0
                  ).getDate();
                  setDueDateFrom(`${currentPeriod.year}-${startMonth}-01`);
                  setDueDateTo(
                    `${currentPeriod.year}-${endMonth}-${String(
                      lastDay
                    ).padStart(2, '0')}`
                  );
                }}
                className={`px-2 py-1 font-code-audit uppercase border whitespace-nowrap transition-colors cursor-pointer ${
                  dueDateFrom &&
                  dueDateTo &&
                  dueDateFrom.startsWith(`${currentPeriod.year}-`) &&
                  dueDateFrom.endsWith('-01') &&
                  !dueDateFrom.includes(
                    `-${String(currentPeriod.month).padStart(2, '0')}-`
                  )
                    ? 'bg-primary-container border-secondary text-text-bright font-semibold'
                    : 'bg-surface-input border-border-grid text-text-dim hover:text-text-bright'
                }`}
              >
                Kuartal Q{Math.ceil(currentPeriod.month / 3)} {currentPeriod.year}
              </button>
              <button
                type="button"
                onClick={() => {
                  setUrgencyFilter('ALL');
                  setDueDateFrom(`${currentPeriod.year}-01-01`);
                  setDueDateTo(`${currentPeriod.year}-12-31`);
                }}
                className={`px-2 py-1 font-code-audit uppercase border whitespace-nowrap transition-colors cursor-pointer ${
                  dueDateFrom === `${currentPeriod.year}-01-01` &&
                  dueDateTo === `${currentPeriod.year}-12-31`
                    ? 'bg-primary-container border-secondary text-text-bright font-semibold'
                    : 'bg-surface-input border-border-grid text-text-dim hover:text-text-bright'
                }`}
              >
                Tahun {currentPeriod.year}
              </button>
            </div>
          </div>
        </div>

        {/* FITUR 2: Tabel Manajemen Data Piutang Utama */}
        <div className="bg-surface-card border border-border-grid overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[1150px]">
              <thead>
                <tr className="bg-surface-container-high border-b border-border-grid text-text-dim font-label-caps uppercase">
                  <th className="py-3 px-4">ID Transaksi</th>
                  <th className="py-3 px-4 whitespace-nowrap">Jatuh Tempo &amp; Update</th>
                  <th className="py-3 px-4">Perusahaan B2B</th>
                  <th className="py-3 px-4 text-right">Total Tagihan</th>
                  <th className="py-3 px-4 text-right">Realisasi (Cair)</th>
                  <th className="py-3 px-4 text-right">Sisa Belum Cair</th>
                  <th className="py-3 px-4">Kategori Kendala</th>
                  <th className="py-3 px-4">Keterangan Alasan</th>
                  <th className="py-3 px-4">Status Berkas</th>
                  <th className="py-3 px-4">Detail Catatan Berkas</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-grid font-body-sm">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="py-12 px-4 text-center text-text-dim font-body-md"
                    >
                      {records.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 max-w-lg mx-auto">
                          <div className="w-11 h-11 bg-surface-input border border-secondary flex items-center justify-center">
                            <span className="material-symbols-outlined text-secondary text-[24px]">
                              library_add
                            </span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="font-headline-md text-text-bright">
                              Pembukuan Dimulai dari Nol (Rp 0 • 0 Transaksi)
                            </span>
                            <span className="font-body-sm text-text-dim">
                              Buku besar piutang dalam keadaan bersih tanpa data simulasi. Silakan masukkan transaksi piutang pertama Anda (kode transaksi bebas diketik manual) atau impor dari berkas CSV.
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-1">
                            <button
                              type="button"
                              onClick={onOpenCreateModal}
                              className="px-4 py-2 bg-secondary-container hover:bg-on-secondary-fixed-variant border border-secondary text-text-bright font-label-caps uppercase flex items-center gap-1.5 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                add_box
                              </span>
                              <span>+ Input Transaksi Pertama</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => csvInputRef.current?.click()}
                              className="px-3.5 py-2 bg-surface-input hover:bg-surface-container-high border border-border-grid text-text-bright font-label-caps uppercase flex items-center gap-1.5 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px] text-secondary">
                                upload_file
                              </span>
                              <span>Import CSV</span>
                            </button>
                            {onLoadDemoData && (
                              <button
                                type="button"
                                onClick={onLoadDemoData}
                                className="px-3.5 py-2 bg-surface-input hover:bg-surface-container-high border border-border-grid text-text-dim hover:text-text-bright font-label-caps uppercase flex items-center gap-1.5 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  dataset
                                </span>
                                <span>Muat Contoh Simulasi</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        'Tidak ditemukan transaksi piutang yang sesuai dengan filter pencarian atau rentang tanggal jatuh tempo.'
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((row) => {
                    const isSettled =
                      row.saldoBelumTerealisasi === 0 &&
                      row.statusDokumen === 'Lengkap';
                    const rowUrgency = evaluateDueDateUrgency(row);
                    const rowAgeDays = getRecordAgingDays(row);
                    const rowAgingBucket = getRecordAgingBucket(rowAgeDays);
                    return (
                      <tr
                        key={row.id}
                        className={`${
                          isSettled
                            ? 'bg-status-settled-surface/10'
                            : 'bg-surface-card'
                        } hover:bg-surface-container transition-colors`}
                      >
                        <td className="py-3 px-4 font-code-audit font-semibold text-secondary whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onOpenEditModal(row)}
                            className="hover:underline cursor-pointer text-left"
                          >
                            {row.id}
                          </button>
                        </td>
                        <td className="py-3 px-4 font-code-audit whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-text-bright font-semibold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px] text-status-pending">
                                event
                              </span>
                              <span>{row.dueDate}</span>
                            </span>
                            <span
                              className={`px-1.5 py-0.5 text-[10px] font-bold uppercase border ${
                                rowUrgency.level === 'CRITICAL' ||
                                rowUrgency.level === 'OVERDUE'
                                  ? 'bg-status-danger-surface border-status-danger text-status-danger'
                                  : rowUrgency.level === 'WARNING'
                                  ? 'bg-status-pending-surface border-status-pending text-status-pending'
                                  : rowUrgency.level === 'SETTLED'
                                  ? 'bg-status-settled-surface border-status-settled text-status-settled'
                                  : 'bg-surface-input border-border-grid text-text-dim'
                              }`}
                            >
                              {rowUrgency.badgeLabel}
                            </span>
                          </div>
                          <div className="text-text-dim text-[11px] mt-0.5 flex items-center gap-1.5">
                            <span>Umur: {rowAgeDays} Hr ({rowAgingBucket})</span>
                            <span>·</span>
                            <span>Upd: {row.tanggalUpdate}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-headline-sm text-text-bright">
                            {row.namaPerusahaan}
                          </div>
                          <div className="font-code-audit text-text-dim">
                            NPWP: {row.npwp}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-numeric-table text-text-bright">
                          {formatRupiah(row.totalTagihan)}
                        </td>
                        <td className="py-3 px-4 text-right font-numeric-table text-status-settled">
                          {formatRupiah(row.saldoTerealisasi)}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-numeric-table font-semibold ${
                            row.saldoBelumTerealisasi > 0
                              ? 'text-status-danger'
                              : 'text-status-settled'
                          }`}
                        >
                          {formatRupiah(row.saldoBelumTerealisasi)}
                        </td>
                        <td className="py-3 px-4 font-code-audit">
                          <span
                            className={
                              row.kategoriKendala === 'Clear'
                                ? 'text-status-settled font-semibold'
                                : row.kategoriKendala === 'Kwitansi_Kurang'
                                ? 'text-status-pending font-semibold'
                                : 'text-secondary font-semibold'
                            }
                          >
                            {row.kategoriKendala}
                          </span>
                        </td>
                        <td
                          className="py-3 px-4 text-text-dim max-w-[200px] truncate"
                          title={row.keteranganKendala}
                        >
                          {row.keteranganKendala}
                        </td>
                        <td className="py-3 px-4 font-code-audit">
                          <span
                            className={`inline-flex items-center gap-1 font-semibold uppercase ${
                              row.statusDokumen === 'Lengkap'
                                ? 'text-status-settled'
                                : 'text-status-danger'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {row.statusDokumen === 'Lengkap'
                                ? 'verified'
                                : 'cancel'}
                            </span>
                            {row.statusDokumen}
                          </span>
                        </td>
                        <td
                          className="py-3 px-4 text-text-dim max-w-[210px] truncate"
                          title={row.detailDokumen}
                        >
                          {row.detailDokumen}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openReceiptUploadModal(row)}
                              aria-label={`Unggah Bukti Terima Surat ${row.id}`}
                              title="Unggah Bukti Surat Sudah Diterima (BAST / Tanda Terima)"
                              className="p-1 bg-surface-container hover:bg-status-settled-surface text-status-settled border border-border-grid hover:border-status-settled transition-colors cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                cloud_upload
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenEditModal(row)}
                              aria-label={`Edit ${row.id}`}
                              title="Edit Transaksi"
                              className="p-1 bg-surface-container hover:bg-surface-input text-secondary border border-border-grid transition-colors cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                edit
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadRowReceipt(row)}
                              aria-label={`Unduh Kwitansi ${row.id}`}
                              title="Unduh Kwitansi / Bukti Transaksi"
                              className="p-1 bg-surface-container hover:bg-surface-input text-tertiary border border-border-grid transition-colors cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                download
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onInspectAudit(row.id)}
                              aria-label={`Audit Trail ${row.id}`}
                              title="Lihat Audit Trail"
                              className="p-1 bg-surface-container hover:bg-surface-input text-text-bright border border-border-grid transition-colors cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                visibility
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteRecord(row.id)}
                              aria-label={`Hapus ${row.id}`}
                              title="Hapus Transaksi"
                              className="p-1 bg-surface-container hover:bg-status-danger-surface text-status-danger border border-border-grid transition-colors cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                delete
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="bg-surface-container-high px-4 py-2.5 border-t border-border-grid flex flex-col sm:flex-row items-center justify-between gap-2 text-text-dim font-code-audit">
            <div className="flex items-center gap-3">
              <span>
                Menampilkan {filteredRecords.length} dari {records.length}{' '}
                transaksi aktif
              </span>
              <span>·</span>
              <span className="text-tertiary">GAS Data Layer Connected</span>
              <span>·</span>
              <span>Auto-formula: Total - Realized = Balance</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="px-2.5 py-1 bg-primary-container text-text-bright font-bold">
                Halaman 1 / 1
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Unggah Bukti Surat Sudah Diterima via Google Apps Script (DriveApp) */}
      {receiptTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Unggah Bukti Tanda Terima Surat via Google Apps Script"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto"
        >
          <div className="w-full max-w-xl bg-surface-card border border-border-accent shadow-2xl flex flex-col my-auto">
            <div className="px-5 py-3.5 bg-surface-container-high border-b border-border-grid flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-status-settled text-[20px]">
                  add_to_drive
                </span>
                <div>
                  <span className="font-headline-sm text-text-bright block">
                    Unggah Bukti Terima Surat ke Google Drive (Via Google Script)
                  </span>
                  <span className="font-code-audit text-text-dim text-[11px]">
                    {receiptTarget.id} · {receiptTarget.invoiceNo} ·{' '}
                    {receiptTarget.namaPerusahaan}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReceiptTarget(null)}
                aria-label="Tutup Modal Unggah Bukti"
                className="p-1 text-text-dim hover:text-text-bright cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>

            <form
              onSubmit={handleSubmitReceiptUpload}
              className="p-5 flex flex-col gap-3.5"
            >
              {/* Google Apps Script DriveApp Bridge Status Banner */}
              <div className="p-3 bg-surface-container-low border border-border-grid flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-code-audit text-secondary font-semibold">
                    <span className="material-symbols-outlined text-[16px]">
                      terminal
                    </span>
                    <span>
                      JEMBATAN GOOGLE APPS SCRIPT (DriveApp.createFile)
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 font-code-audit text-[10px] font-bold uppercase border ${
                      isLiveGASUrl(gasConfig?.webAppUrl || '')
                        ? 'bg-status-settled-surface border-status-settled text-status-settled'
                        : 'bg-primary-container border-secondary text-secondary'
                    }`}
                  >
                    {isLiveGASUrl(gasConfig?.webAppUrl || '')
                      ? 'LIVE GAS WEBHOOK AKTIF'
                      : 'BASE64 GAS BRIDGE SIAP'}
                  </span>
                </div>
                <p className="font-body-sm text-text-dim text-xs leading-relaxed">
                  Berkas dienkode ke <code>Base64</code> lalu dikirim melalui{' '}
                  <code>doPost(e) &rarr; action: &quot;uploadDriveFile&quot;</code>{' '}
                  pada Google Apps Script tanpa memerlukan login OAuth tambahan.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="gas-drive-folder-name"
                      className="font-code-audit text-[10px] text-text-dim uppercase"
                    >
                      Nama Folder di Google Drive
                    </label>
                    <input
                      id="gas-drive-folder-name"
                      type="text"
                      value={receiptDriveFolderName}
                      onChange={(e) =>
                        setReceiptDriveFolderName(e.target.value)
                      }
                      placeholder="AR_Tracker_Bukti_Surat_Diterima"
                      className="h-8 px-2.5 bg-surface-input border border-border-grid text-text-bright font-code-audit text-xs focus:outline-none focus:border-secondary"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="gas-drive-folder-id"
                      className="font-code-audit text-[10px] text-text-dim uppercase"
                    >
                      ID / Link Folder Drive (Opsional)
                    </label>
                    <input
                      id="gas-drive-folder-id"
                      type="text"
                      value={receiptDriveFolderInput}
                      onChange={(e) =>
                        setReceiptDriveFolderInput(e.target.value)
                      }
                      placeholder="Tempel link/ID folder Google Drive..."
                      className="h-8 px-2.5 bg-surface-input border border-border-grid text-tertiary font-code-audit text-xs focus:outline-none focus:border-secondary"
                    />
                  </div>
                </div>
              </div>

              {/* Local file picker dropzone (auto-converts to Base64 for GAS DriveApp) */}
              <div className="p-3.5 bg-surface-input border border-dashed border-secondary/70 flex flex-col items-center justify-center gap-1.5 text-center">
                <input
                  ref={receiptFileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  onChange={handleReceiptFilePick}
                  className="hidden"
                />
                <span className="material-symbols-outlined text-secondary text-[24px]">
                  upload_file
                </span>
                <div className="font-body-sm text-text-bright font-medium">
                  Pilih Berkas Scan / Foto Tanda Terima Surat dari Perangkat
                </div>
                <span className="font-code-audit text-text-dim text-[11px]">
                  Otomatis dikonversi ke Base64 ({receiptFileSize} ·{' '}
                  {receiptMimeType}) untuk dikirim ke <code>DriveApp</code>
                </span>
                <button
                  type="button"
                  onClick={() => receiptFileInputRef.current?.click()}
                  className="mt-1 px-3.5 py-1 bg-primary-container hover:bg-secondary-container border border-secondary text-text-bright font-code-audit uppercase cursor-pointer"
                >
                  Pilih File dari Komputer
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="receipt-file-name"
                    className="font-label-caps text-text-dim uppercase"
                  >
                    Nama Berkas di Google Drive *
                  </label>
                  <input
                    id="receipt-file-name"
                    type="text"
                    required
                    value={receiptFileName}
                    onChange={(e) => setReceiptFileName(e.target.value)}
                    className="h-9 px-3 bg-surface-input border border-border-grid text-text-bright font-code-audit focus:outline-none focus:border-secondary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="receipt-date"
                    className="font-label-caps text-text-dim uppercase"
                  >
                    Tanggal Diterima *
                  </label>
                  <input
                    id="receipt-date"
                    type="date"
                    required
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                    className="h-9 px-3 bg-surface-input border border-border-grid text-text-bright font-code-audit focus:outline-none focus:border-secondary"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="receipt-receiver"
                  className="font-label-caps text-text-dim uppercase"
                >
                  Nama Penerima Surat / Bagian Keuangan *
                </label>
                <input
                  id="receipt-receiver"
                  type="text"
                  required
                  value={receiptReceiver}
                  onChange={(e) => setReceiptReceiver(e.target.value)}
                  placeholder="Contoh: Bpk. Hendra (Staf Finance / Cap Basah)"
                  className="h-9 px-3 bg-surface-input border border-border-grid text-text-bright font-body-sm focus:outline-none focus:border-secondary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="receipt-notes"
                  className="font-label-caps text-text-dim uppercase"
                >
                  Catatan Bukti Penerimaan
                </label>
                <input
                  id="receipt-notes"
                  type="text"
                  value={receiptNotes}
                  onChange={(e) => setReceiptNotes(e.target.value)}
                  className="h-9 px-3 bg-surface-input border border-border-grid text-text-bright font-body-sm focus:outline-none focus:border-secondary"
                />
              </div>

              <label className="flex items-center gap-2 font-body-sm text-text-bright cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={receiptMarkComplete}
                  onChange={(e) => setReceiptMarkComplete(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500"
                />
                <span>
                  Otomatis tandai status dokumen transaksi menjadi{' '}
                  <strong className="text-status-settled">Lengkap</strong>
                </span>
              </label>

              <div className="pt-3 border-t border-border-grid flex flex-wrap items-center justify-between gap-2">
                {onOpenGASSettings ? (
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptTarget(null);
                      onOpenGASSettings();
                    }}
                    className="px-3 py-1.5 bg-surface-container hover:bg-surface-input border border-border-grid text-secondary font-code-audit text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      code
                    </span>
                    <span>Lihat Script Code.gs DriveApp</span>
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setReceiptTarget(null)}
                    className="px-4 py-1.5 bg-surface-input border border-border-grid text-text-bright font-label-caps uppercase cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isUploadingToGAS}
                    className="px-5 py-1.5 bg-status-settled-surface border border-status-settled text-status-settled font-label-caps uppercase font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      cloud_upload
                    </span>
                    <span>
                      {isUploadingToGAS
                        ? 'Mengunggah via GAS...'
                        : 'Upload ke Drive via GAS'}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
