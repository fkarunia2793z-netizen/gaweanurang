/**
 * Pure business logic for AR Tracker Pro
 * Handles currency formatting, KPI calculations, balance computations,
 * Google Apps Script (GAS) user authentication, and audit SHA-256 simulation.
 */

export type KategoriKendala = 'Clear' | 'Kwitansi_Kurang' | 'Promo' | 'Lainnya';
export type StatusDokumen = 'Lengkap' | 'Belum Lengkap';

export interface DocumentMatrix {
  fk: boolean; // Faktur Komersial
  kw: boolean; // Kwitansi Bermaterai
  sj: boolean; // Surat Jalan / BAST
  fp: boolean; // Faktur Pajak DJP
}

export interface PiutangRecord {
  id: string;
  invoiceNo: string;
  tanggalUpdate: string;
  dueDate: string;
  umurPiutangHari?: number;
  namaPerusahaan: string;
  npwp: string;
  cabang: string;
  picPenagihan: string;
  picRole: string;
  totalTagihan: number;
  saldoTerealisasi: number;
  saldoBelumTerealisasi: number;
  kategoriKendala: KategoriKendala;
  keteranganKendala: string;
  statusDokumen: StatusDokumen;
  detailDokumen: string;
  matrix: DocumentMatrix;
  boxArsip: string;
}

export interface CatalogFile {
  id: string;
  invoiceNo: string;
  transactionId: string;
  clientName: string;
  nominalTagihan: number;
  fileName: string;
  fileSize: string;
  fileType: 'PDF' | 'SCAN' | 'XML';
  category: 'faktur-komersial' | 'faktur-pajak' | 'kwitansi' | 'bast' | 'kontrak';
  status: 'verified' | 'pending' | 'rejected';
  statusLabel: string;
  subInfo: string;
  highlightInfo: string;
  boxArsip: string;
  branch: 'jkt' | 'sby' | 'med' | 'bpp';
  branchLabel: string;
  extraLabel: string;
  extraValue: string;
  driveUrl: string;
}

export interface AuditLogEntry {
  id: number;
  eventId: string;
  timestamp: string;
  datePart: string;
  timePart: string;
  actorName: string;
  actorInitials: string;
  actorEmail: string;
  actorRole: string;
  actorLocation: string;
  ipAddress: string;
  actionType: 'UPDATE_SALDO' | 'INSERT_TRANSAKSI' | 'VERIFY_DOKUMEN' | 'SYNC_SHEETS' | 'EXPORT_EXCEL' | 'DELETE_RECORD' | 'USER_LOGIN';
  actionBadge: 'UPDATE' | 'SYNC' | 'VERIFY' | 'EXPORT' | 'INSERT' | 'DELETE' | 'LOGIN';
  moduleName: string;
  description: string;
  targetId: string;
  targetEntity: string;
  severity: 'INFO' | 'SUCCESS' | 'WARN' | 'CRITICAL';
  sha256: string;
  beforeState: {
    saldoTerealisasi: number;
    saldoOutstanding: number;
    statusBerkas: string;
  };
  afterState: {
    saldoTerealisasi: number;
    saldoOutstanding: number;
    statusBerkas: string;
  };
}

export interface GASUserAccount {
  username: string;
  password?: string;
  fullName: string;
  role: string;
  initials: string;
  branch: string;
  avatarUrl: string;
  active: boolean;
}

export interface GASConfig {
  spreadsheetId: string;
  sheetPiutang: string;
  sheetAudit: string;
  sheetUsers: string;
  sheetCatalog?: string;
  driveFolderId?: string;
  driveFolderName?: string;
  webAppUrl: string;
  deploymentId: string;
  execMode: string;
  reminderH3: boolean;
  alertSales: boolean;
  waProvider: string;
  waToken: string;
  waTemplate: string;
  batasMeterai: number;
  defaultTermin: number;
  gracePeriod: number;
  githubRepo: string;
  githubBranch: string;
}

export interface DashboardKPIs {
  totalPiutang: number;
  totalRealisasi: number;
  totalOutstanding: number;
  dokumenPending: number;
  totalTransaksi: number;
  realisasiRatio: number;
  outstandingRatio: number;
}

/**
 * Formats a number into Indonesian Rupiah string (e.g. "Rp 450.000.000")
 */
export function formatRupiah(amount: number, includePrefix = true): string {
  const safeNum = Math.max(0, Math.round(Number(amount) || 0));
  const formatted = safeNum.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return includePrefix ? `Rp ${formatted}` : formatted;
}

/**
 * Parses a formatted Rupiah string or number into a clean numeric integer
 */
export function parseRupiahInput(raw: string | number): number {
  if (typeof raw === 'number') return Math.max(0, Math.round(raw));
  const cleaned = String(raw || '').replace(/[^0-9]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
}

/**
 * Calculates live remaining receivable balance (Saldo Belum Terealisasi)
 */
export function calculateOutstandingBalance(totalTagihan: number, saldoTerealisasi: number): {
  sisa: number;
  isSettled: boolean;
  ratioCair: number;
} {
  const total = Math.max(0, Number(totalTagihan) || 0);
  const cair = Math.max(0, Number(saldoTerealisasi) || 0);
  const sisa = Math.max(0, total - cair);
  const isSettled = total > 0 && sisa === 0;
  const ratioCair = total > 0 ? Number(((Math.min(cair, total) / total) * 100).toFixed(2)) : 0;
  return { sisa, isSettled, ratioCair };
}

/**
 * Computes aggregate KPIs from the list of Piutang records
 */
export function computeDashboardKPIs(records: PiutangRecord[]): DashboardKPIs {
  let totalPiutang = 0;
  let totalRealisasi = 0;
  let totalOutstanding = 0;
  let dokumenPending = 0;

  for (const r of records) {
    const tagihan = Math.max(0, Number(r.totalTagihan) || 0);
    const cair = Math.max(0, Number(r.saldoTerealisasi) || 0);
    const sisa = Math.max(0, tagihan - cair);

    totalPiutang += tagihan;
    totalRealisasi += cair;
    totalOutstanding += sisa;

    if (r.statusDokumen !== 'Lengkap') {
      dokumenPending += 1;
    }
  }

  const realisasiRatio = totalPiutang > 0 ? Number(((totalRealisasi / totalPiutang) * 100).toFixed(2)) : 0;
  const outstandingRatio = totalPiutang > 0 ? Number(((totalOutstanding / totalPiutang) * 100).toFixed(2)) : 0;

  return {
    totalPiutang,
    totalRealisasi,
    totalOutstanding,
    dokumenPending,
    totalTransaksi: records.length,
    realisasiRatio,
    outstandingRatio,
  };
}

export interface MonthlyTrendPoint {
  monthKey: string;
  monthLabel: string;
  totalTagihan: number;
  realisasiPembayaran: number;
  sisaOutstanding: number;
  rasioCair: number;
  jumlahFaktur: number;
}

/**
 * Computes 6-month trend data (Total Tagihan vs Realisasi Pembayaran)
 * combining historical monthly ledger closes with live active records.
 */
export function computeSixMonthTrendData(
  records: PiutangRecord[]
): MonthlyTrendPoint[] {
  const kpis = computeDashboardKPIs(records);
  const isDemoDataset =
    records.some((r) => r.id === 'TRX-9482-B2A') &&
    records.some((r) => r.id === 'TRX-3092-M04');

  // Historical 5 months + current active month (Mei 2025) linked to live ledger KPIs.
  // When starting bookkeeping from zero (or using real user records), historical months start at Rp 0.
  const baseMonths: Omit<MonthlyTrendPoint, 'sisaOutstanding' | 'rasioCair'>[] = [
    {
      monthKey: '2024-12',
      monthLabel: 'Des 2024',
      totalTagihan: isDemoDataset ? 2450000000 : 0,
      realisasiPembayaran: isDemoDataset ? 2180000000 : 0,
      jumlahFaktur: isDemoDataset ? 14 : 0,
    },
    {
      monthKey: '2025-01',
      monthLabel: 'Jan 2025',
      totalTagihan: isDemoDataset ? 2680000000 : 0,
      realisasiPembayaran: isDemoDataset ? 2310000000 : 0,
      jumlahFaktur: isDemoDataset ? 16 : 0,
    },
    {
      monthKey: '2025-02',
      monthLabel: 'Feb 2025',
      totalTagihan: isDemoDataset ? 2390000000 : 0,
      realisasiPembayaran: isDemoDataset ? 1985000000 : 0,
      jumlahFaktur: isDemoDataset ? 12 : 0,
    },
    {
      monthKey: '2025-03',
      monthLabel: 'Mar 2025',
      totalTagihan: isDemoDataset ? 2890000000 : 0,
      realisasiPembayaran: isDemoDataset ? 2420000000 : 0,
      jumlahFaktur: isDemoDataset ? 18 : 0,
    },
    {
      monthKey: '2025-04',
      monthLabel: 'Apr 2025',
      totalTagihan: isDemoDataset ? 2740000000 : 0,
      realisasiPembayaran: isDemoDataset ? 2190000000 : 0,
      jumlahFaktur: isDemoDataset ? 15 : 0,
    },
    {
      monthKey: '2025-05',
      monthLabel: 'Mei 2025',
      totalTagihan: kpis.totalPiutang,
      realisasiPembayaran: kpis.totalRealisasi,
      jumlahFaktur: kpis.totalTransaksi,
    },
  ];

  return baseMonths.map((m) => {
    const sisaOutstanding = Math.max(0, m.totalTagihan - m.realisasiPembayaran);
    const rasioCair =
      m.totalTagihan > 0
        ? Number(((m.realisasiPembayaran / m.totalTagihan) * 100).toFixed(1))
        : 0;
    return {
      ...m,
      sisaOutstanding,
      rasioCair,
    };
  });
}

/**
 * Normalizes a due date string (e.g. "27 Jan 2025", "10 Mar 2025", "2025-01-27")
 * into ISO YYYY-MM-DD format for reliable chronological comparison.
 */
export function parseDueDateToISO(dueDateStr: string): string {
  const raw = (dueDateStr || '').trim();
  if (!raw) return '';

  // Match ISO format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  // Match DD MMM YYYY (Indonesian & English month abbreviations)
  const monthMap: Record<string, string> = {
    jan: '01',
    feb: '02',
    mar: '03',
    apr: '04',
    mei: '05',
    may: '05',
    jun: '06',
    jul: '07',
    agu: '08',
    ags: '08',
    aug: '08',
    sep: '09',
    okt: '10',
    oct: '10',
    nov: '11',
    des: '12',
    dec: '12',
  };

  const parts = raw.split(/[\s/-]+/);
  if (parts.length === 3) {
    // Check DD MMM YYYY
    const dayNum = parseInt(parts[0], 10);
    const monKey = parts[1].toLowerCase().slice(0, 3);
    const yearNum = parseInt(parts[2], 10);
    if (!isNaN(dayNum) && monthMap[monKey] && !isNaN(yearNum) && yearNum > 1900) {
      return `${yearNum}-${monthMap[monKey]}-${String(dayNum).padStart(2, '0')}`;
    }
  }

  return '';
}

export type DueDateUrgencyLevel =
  | 'OVERDUE'
  | 'CRITICAL'
  | 'WARNING'
  | 'SAFE'
  | 'SETTLED';

export interface DueDateUrgencyInfo {
  level: DueDateUrgencyLevel;
  daysRemaining: number;
  isMepet: boolean;
  isCritical: boolean;
  badgeLabel: string;
  description: string;
}

/**
 * Evaluates how urgent ("mepet") an invoice's dueDate is relative to a reference date
 * (defaults to '2025-01-26' for the active Q1/May ledger cycle).
 */
export function evaluateDueDateUrgency(
  record: Pick<PiutangRecord, 'dueDate' | 'saldoBelumTerealisasi'>,
  referenceDateISO: string = '2025-01-26'
): DueDateUrgencyInfo {
  if ((Number(record.saldoBelumTerealisasi) || 0) <= 0) {
    return {
      level: 'SETTLED',
      daysRemaining: 999,
      isMepet: false,
      isCritical: false,
      badgeLabel: 'LUNAS',
      description: 'Tagihan telah lunas sepenuhnya',
    };
  }

  const dueISO = parseDueDateToISO(record.dueDate);
  const refISO = parseDueDateToISO(referenceDateISO) || '2025-01-26';
  if (!dueISO) {
    return {
      level: 'SAFE',
      daysRemaining: 30,
      isMepet: false,
      isCritical: false,
      badgeLabel: 'TERJADWAL',
      description: 'Tanggal jatuh tempo terjadwal',
    };
  }

  const [dY, dM, dD] = dueISO.split('-').map(Number);
  const [rY, rM, rD] = refISO.split('-').map(Number);
  const dueUTC = Date.UTC(dY, dM - 1, dD);
  const refUTC = Date.UTC(rY, rM - 1, rD);
  const daysRemaining = Math.round((dueUTC - refUTC) / 86400000);

  if (daysRemaining < 0) {
    const overdueDays = Math.abs(daysRemaining);
    return {
      level: 'OVERDUE',
      daysRemaining,
      isMepet: true,
      isCritical: true,
      badgeLabel: `LEWAT ${overdueDays} HARI`,
      description: `Melewati batas jatuh tempo ${overdueDays} hari`,
    };
  }

  if (daysRemaining === 0) {
    return {
      level: 'CRITICAL',
      daysRemaining: 0,
      isMepet: true,
      isCritical: true,
      badgeLabel: 'HARI INI (H-0)',
      description: 'Jatuh tempo tepat hari ini — wajib penagihan segera',
    };
  }

  if (daysRemaining <= 3) {
    return {
      level: 'CRITICAL',
      daysRemaining,
      isMepet: true,
      isCritical: true,
      badgeLabel: `H-${daysRemaining} SANGAT MEPET`,
      description: `Jatuh tempo ${daysRemaining} hari lagi (prioritas H-3)`,
    };
  }

  if (daysRemaining <= 7) {
    return {
      level: 'WARNING',
      daysRemaining,
      isMepet: true,
      isCritical: false,
      badgeLabel: `H-${daysRemaining} MEPET`,
      description: `Mendekati jatuh tempo dalam ${daysRemaining} hari`,
    };
  }

  return {
    level: 'SAFE',
    daysRemaining,
    isMepet: false,
    isCritical: false,
    badgeLabel: `H-${daysRemaining} AMAN`,
    description: `${daysRemaining} hari menuju jatuh tempo`,
  };
}

/**
 * Returns unpaid Piutang records whose due date is "mepet" (within maxDaysThreshold or overdue),
 * sorted from most urgent (lowest daysRemaining) to least urgent.
 */
export function getUrgentDueRecords(
  records: PiutangRecord[],
  maxDaysThreshold: number = 7,
  referenceDateISO: string = '2025-01-26'
): Array<{ record: PiutangRecord; urgency: DueDateUrgencyInfo }> {
  return records
    .map((record) => ({
      record,
      urgency: evaluateDueDateUrgency(record, referenceDateISO),
    }))
    .filter(
      (item) =>
        item.record.saldoBelumTerealisasi > 0 &&
        item.urgency.daysRemaining <= maxDaysThreshold
    )
    .sort((a, b) => a.urgency.daysRemaining - b.urgency.daysRemaining);
}

export type AgingBucketKey = '1-30' | '31-60' | '61-90' | '>90';

export interface AgingScheduleBucket {
  key: AgingBucketKey;
  label: string;
  shortLabel: string;
  rangeDescription: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  totalPiutang: number;
  totalRealisasi: number;
  totalOutstanding: number;
  invoiceCount: number;
  unpaidCount: number;
  shareOfTotalPiutang: number;
  shareOfOutstanding: number;
  collectionRate: number;
  records: PiutangRecord[];
}

export interface AgingScheduleSummary {
  buckets: AgingScheduleBucket[];
  totalPiutang: number;
  totalRealisasi: number;
  totalOutstanding: number;
  totalInvoices: number;
  weightedAverageAgeDays: number;
  performingLiquidityAmount: number;
  performingLiquidityRatio: number;
  atRisk60PlusAmount: number;
  atRisk60PlusRatio: number;
}

/**
 * Computes the invoice aging in days (1..N) for a Piutang record.
 * Uses explicit umurPiutangHari if available; otherwise derives age from dueDate
 * relative to referenceDateISO assuming a standard 30-day invoice credit term.
 */
export function getRecordAgingDays(
  record: Pick<PiutangRecord, 'dueDate' | 'umurPiutangHari'>,
  referenceDateISO: string = '2025-03-15'
): number {
  if (
    typeof record.umurPiutangHari === 'number' &&
    !isNaN(record.umurPiutangHari) &&
    record.umurPiutangHari > 0
  ) {
    return Math.round(record.umurPiutangHari);
  }

  const dueISO = parseDueDateToISO(record.dueDate);
  const refISO = parseDueDateToISO(referenceDateISO) || '2025-03-15';
  if (!dueISO) return 15;

  const [dY, dM, dD] = dueISO.split('-').map(Number);
  const [rY, rM, rD] = refISO.split('-').map(Number);
  const dueUTC = Date.UTC(dY, dM - 1, dD);
  const refUTC = Date.UTC(rY, rM - 1, rD);
  const diffFromIssue = Math.round((refUTC - dueUTC) / 86400000) + 30;
  return Math.max(1, diffFromIssue);
}

/**
 * Classifies aging days into one of the 4 standard AR Aging Schedule buckets:
 * '1-30', '31-60', '61-90', or '>90'.
 */
export function getRecordAgingBucket(days: number): AgingBucketKey {
  const safeDays = Math.max(1, Math.round(Number(days) || 1));
  if (safeDays <= 30) return '1-30';
  if (safeDays <= 60) return '31-60';
  if (safeDays <= 90) return '61-90';
  return '>90';
}

/**
 * Computes a complete AR Aging Schedule across the 4 buckets
 * (1-30, 31-60, 61-90, and >90 days) with liquidity metrics.
 */
export function computeAgingSchedule(
  records: PiutangRecord[],
  referenceDateISO: string = '2025-03-15'
): AgingScheduleSummary {
  const bucketDefs: Array<{
    key: AgingBucketKey;
    label: string;
    shortLabel: string;
    rangeDescription: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }> = [
    {
      key: '1-30',
      label: '1–30 Hari',
      shortLabel: '1-30 Hari',
      rangeDescription: 'Lancar (Current Liquidity)',
      riskLevel: 'LOW',
    },
    {
      key: '31-60',
      label: '31–60 Hari',
      shortLabel: '31-60 Hari',
      rangeDescription: 'Perhatian Khusus (Watch)',
      riskLevel: 'MEDIUM',
    },
    {
      key: '61-90',
      label: '61–90 Hari',
      shortLabel: '61-90 Hari',
      rangeDescription: 'Kurang Lancar (Substandard)',
      riskLevel: 'HIGH',
    },
    {
      key: '>90',
      label: '> 90 Hari',
      shortLabel: '>90 Hari',
      rangeDescription: 'Risiko Macet (Doubtful)',
      riskLevel: 'CRITICAL',
    },
  ];

  const accumulators: Record<
    AgingBucketKey,
    {
      totalPiutang: number;
      totalRealisasi: number;
      totalOutstanding: number;
      invoiceCount: number;
      unpaidCount: number;
      records: PiutangRecord[];
    }
  > = {
    '1-30': {
      totalPiutang: 0,
      totalRealisasi: 0,
      totalOutstanding: 0,
      invoiceCount: 0,
      unpaidCount: 0,
      records: [],
    },
    '31-60': {
      totalPiutang: 0,
      totalRealisasi: 0,
      totalOutstanding: 0,
      invoiceCount: 0,
      unpaidCount: 0,
      records: [],
    },
    '61-90': {
      totalPiutang: 0,
      totalRealisasi: 0,
      totalOutstanding: 0,
      invoiceCount: 0,
      unpaidCount: 0,
      records: [],
    },
    '>90': {
      totalPiutang: 0,
      totalRealisasi: 0,
      totalOutstanding: 0,
      invoiceCount: 0,
      unpaidCount: 0,
      records: [],
    },
  };

  let grandTotalPiutang = 0;
  let grandTotalRealisasi = 0;
  let grandTotalOutstanding = 0;
  let weightedAgeProductSum = 0;

  for (const r of records) {
    const ageDays = getRecordAgingDays(r, referenceDateISO);
    const bucketKey = getRecordAgingBucket(ageDays);
    const tagihan = Math.max(0, Number(r.totalTagihan) || 0);
    const cair = Math.max(0, Number(r.saldoTerealisasi) || 0);
    const sisa = Math.max(0, tagihan - cair);

    const bucket = accumulators[bucketKey];
    bucket.totalPiutang += tagihan;
    bucket.totalRealisasi += cair;
    bucket.totalOutstanding += sisa;
    bucket.invoiceCount += 1;
    if (sisa > 0) {
      bucket.unpaidCount += 1;
    }
    bucket.records.push(r);

    grandTotalPiutang += tagihan;
    grandTotalRealisasi += cair;
    grandTotalOutstanding += sisa;
    weightedAgeProductSum += tagihan * ageDays;
  }

  const buckets: AgingScheduleBucket[] = bucketDefs.map((def) => {
    const acc = accumulators[def.key];
    const shareOfTotalPiutang =
      grandTotalPiutang > 0
        ? Number(((acc.totalPiutang / grandTotalPiutang) * 100).toFixed(1))
        : 0;
    const shareOfOutstanding =
      grandTotalOutstanding > 0
        ? Number(((acc.totalOutstanding / grandTotalOutstanding) * 100).toFixed(1))
        : 0;
    const collectionRate =
      acc.totalPiutang > 0
        ? Number(((acc.totalRealisasi / acc.totalPiutang) * 100).toFixed(1))
        : 0;

    return {
      ...def,
      totalPiutang: acc.totalPiutang,
      totalRealisasi: acc.totalRealisasi,
      totalOutstanding: acc.totalOutstanding,
      invoiceCount: acc.invoiceCount,
      unpaidCount: acc.unpaidCount,
      shareOfTotalPiutang,
      shareOfOutstanding,
      collectionRate,
      records: acc.records,
    };
  });

  const weightedAverageAgeDays =
    grandTotalPiutang > 0
      ? Math.round(weightedAgeProductSum / grandTotalPiutang)
      : 0;

  const performingLiquidityAmount =
    accumulators['1-30'].totalPiutang + accumulators['31-60'].totalPiutang;
  const performingLiquidityRatio =
    grandTotalPiutang > 0
      ? Number(((performingLiquidityAmount / grandTotalPiutang) * 100).toFixed(1))
      : 0;

  const atRisk60PlusAmount =
    accumulators['61-90'].totalOutstanding + accumulators['>90'].totalOutstanding;
  const atRisk60PlusRatio =
    grandTotalOutstanding > 0
      ? Number(((atRisk60PlusAmount / grandTotalOutstanding) * 100).toFixed(1))
      : 0;

  return {
    buckets,
    totalPiutang: grandTotalPiutang,
    totalRealisasi: grandTotalRealisasi,
    totalOutstanding: grandTotalOutstanding,
    totalInvoices: records.length,
    weightedAverageAgeDays,
    performingLiquidityAmount,
    performingLiquidityRatio,
    atRisk60PlusAmount,
    atRisk60PlusRatio,
  };
}

/**
 * Filters Piutang records by search query, kategoriKendala, statusDokumen,
 * missing document type, optional dueDate range, optional urgency filter, and optional aging bucket.
 */
export function filterPiutangRecords(
  records: PiutangRecord[],
  query: string,
  kendala: string,
  statusDok: string,
  missingType: string = 'ALL',
  dueDateFrom: string = '',
  dueDateTo: string = '',
  urgencyFilter: 'ALL' | 'MEPET_7' | 'CRITICAL_3' = 'ALL',
  referenceDateISO: string = '2025-01-26',
  agingBucketFilter: 'ALL' | AgingBucketKey = 'ALL'
): PiutangRecord[] {
  const q = (query || '').toLowerCase().trim();
  const fromISO = parseDueDateToISO(dueDateFrom);
  const toISO = parseDueDateToISO(dueDateTo);

  return records.filter((r) => {
    const matchesQuery =
      !q ||
      r.id.toLowerCase().includes(q) ||
      r.invoiceNo.toLowerCase().includes(q) ||
      r.namaPerusahaan.toLowerCase().includes(q) ||
      r.npwp.toLowerCase().includes(q) ||
      r.picPenagihan.toLowerCase().includes(q) ||
      r.keteranganKendala.toLowerCase().includes(q) ||
      r.detailDokumen.toLowerCase().includes(q) ||
      r.dueDate.toLowerCase().includes(q);

    const matchesKendala = !kendala || kendala === 'ALL' || r.kategoriKendala === kendala;
    const matchesStatus = !statusDok || statusDok === 'ALL' || r.statusDokumen === statusDok;

    let matchesMissing = true;
    if (missingType && missingType !== 'ALL') {
      if (missingType === 'Kwitansi') matchesMissing = !r.matrix.kw;
      else if (missingType === 'Faktur') matchesMissing = !r.matrix.fk;
      else if (missingType === 'BAST') matchesMissing = !r.matrix.sj;
      else if (missingType === 'FP') matchesMissing = !r.matrix.fp;
    }

    let matchesDueDate = true;
    if (fromISO || toISO) {
      const recordDueISO = parseDueDateToISO(r.dueDate);
      if (!recordDueISO) {
        matchesDueDate = false;
      } else {
        if (fromISO && recordDueISO < fromISO) matchesDueDate = false;
        if (toISO && recordDueISO > toISO) matchesDueDate = false;
      }
    }

    let matchesUrgency = true;
    if (urgencyFilter !== 'ALL') {
      const urg = evaluateDueDateUrgency(r, referenceDateISO);
      if (urgencyFilter === 'CRITICAL_3') {
        matchesUrgency = urg.isCritical;
      } else if (urgencyFilter === 'MEPET_7') {
        matchesUrgency = urg.isMepet;
      }
    }

    let matchesAgingBucket = true;
    if (agingBucketFilter !== 'ALL') {
      const ageDays = getRecordAgingDays(r);
      const bucket = getRecordAgingBucket(ageDays);
      matchesAgingBucket = bucket === agingBucketFilter;
    }

    return (
      matchesQuery &&
      matchesKendala &&
      matchesStatus &&
      matchesMissing &&
      matchesDueDate &&
      matchesUrgency &&
      matchesAgingBucket
    );
  });
}

/**
 * Quick-searches Piutang records by company name (namaPerusahaan) across all records,
 * also matching ID / Invoice No if the user types a transaction code.
 */
export function searchRecordsByCompanyName(
  records: PiutangRecord[],
  companyQuery: string
): PiutangRecord[] {
  const q = (companyQuery || '').toLowerCase().trim();
  if (!q) return [];
  return records.filter(
    (r) =>
      r.namaPerusahaan.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q) ||
      r.invoiceNo.toLowerCase().includes(q)
  );
}

/**
 * Authenticates a user against the Google Apps Script (GAS) user table
 */
export function authenticateGASUser(
  users: GASUserAccount[],
  usernameInput: string,
  passwordInput: string
): { success: boolean; user?: GASUserAccount; error?: string } {
  const cleanUser = (usernameInput || '').trim().toLowerCase();
  const cleanPass = (passwordInput || '').trim();

  if (!cleanUser || !cleanPass) {
    return {
      success: false,
      error: 'Username dan Password wajib diisi sesuai kredensial Google Apps Script.',
    };
  }

  const found = users.find(
    (u) =>
      u.active &&
      (u.username.toLowerCase() === cleanUser ||
        `${u.username.toLowerCase()}@perusahaan.co.id` === cleanUser ||
        `${u.username.toLowerCase()}@corp.id` === cleanUser) &&
      u.password === cleanPass
  );

  if (!found) {
    return {
      success: false,
      error: 'Otentikasi GAS Gagal: Username atau Password tidak terdaftar pada Sheet Users_Auth.',
    };
  }

  const { password: _, ...safeUser } = found;
  return { success: true, user: safeUser };
}

/**
 * Generates CSV content for Piutang records export
 */
export function generatePiutangCSV(records: PiutangRecord[]): string {
  const headers = [
    'ID_Transaksi',
    'No_Invoice',
    'Tanggal_Update',
    'Nama_Perusahaan',
    'NPWP',
    'Cabang',
    'Total_Tagihan',
    'Saldo_Terealisasi',
    'Saldo_Belum_Terealisasi',
    'Kategori_Kendala',
    'Keterangan_Kendala',
    'Status_Dokumen',
    'Detail_Dokumen',
    'PIC_Penagihan',
  ];

  const escapeCell = (val: string | number) => {
    const str = String(val ?? '').replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = records.map((r) =>
    [
      r.id,
      r.invoiceNo,
      r.tanggalUpdate,
      r.namaPerusahaan,
      r.npwp,
      r.cabang,
      r.totalTagihan,
      r.saldoTerealisasi,
      r.saldoBelumTerealisasi,
      r.kategoriKendala,
      r.keteranganKendala,
      r.statusDokumen,
      r.detailDokumen,
      r.picPenagihan,
    ]
      .map(escapeCell)
      .join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Generates deterministic pseudo SHA-256 hash for forensic audit logging
 */
export function generateAuditHash(payload: string): string {
  let h1 = 0xdeadbeef ^ payload.length;
  let h2 = 0x41c6ce57 ^ payload.length;
  for (let i = 0, ch; i < payload.length; i++) {
    ch = payload.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `${hex1}${hex2}a7f4bc8012e8b61c9441fd29`;
}

/**
 * Extracts a clean Google Drive Folder ID from either a full Google Drive folder URL
 * (e.g., https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz?usp=sharing)
 * or a raw Folder ID string.
 */
export function extractDriveFolderId(rawInput: string): string {
  if (!rawInput) return '';
  const trimmed = rawInput.trim();
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch && folderMatch[1]) {
    return folderMatch[1];
  }
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && idParamMatch[1]) {
    return idParamMatch[1];
  }
  return trimmed.split(/[?#]/)[0].trim();
}

export interface GASDriveUploadPayloadInput {
  spreadsheetId: string;
  driveFolderId?: string;
  driveFolderName?: string;
  recordId: string;
  invoiceNo: string;
  companyName: string;
  fileName: string;
  mimeType: string;
  fileSize: string;
  base64Data: string;
  receiverName: string;
  receiptDate: string;
  notes: string;
  markComplete: boolean;
  actor: string;
}

/**
 * Builds the JSON payload sent via POST to Google Apps Script (doPost -> uploadDriveFile)
 * so DriveApp can create the file in Google Drive without requiring client-side OAuth.
 */
export function buildGASDriveUploadPayload(input: GASDriveUploadPayloadInput): Record<string, unknown> {
  const cleanFolderId = extractDriveFolderId(input.driveFolderId || '');
  const cleanBase64 = input.base64Data.includes('base64,')
    ? input.base64Data.split('base64,')[1]
    : input.base64Data;

  return {
    action: 'uploadDriveFile',
    spreadsheetId: input.spreadsheetId.trim(),
    driveFolderId: cleanFolderId,
    driveFolderName: (input.driveFolderName || 'AR_Tracker_Bukti_Surat_Diterima').trim(),
    recordId: input.recordId,
    invoiceNo: input.invoiceNo,
    companyName: input.companyName,
    fileName: input.fileName.trim(),
    mimeType: input.mimeType || 'application/pdf',
    fileSize: input.fileSize,
    base64Data: cleanBase64,
    receiverName: input.receiverName.trim(),
    receiptDate: input.receiptDate,
    notes: input.notes.trim(),
    markComplete: Boolean(input.markComplete),
    actor: input.actor || 'operator',
  };
}

/**
 * Normalizes a manual or auto-generated transaction code (trims whitespace).
 */
export function normalizeTransactionCode(rawCode: string): string {
  return (rawCode || '').trim();
}

export interface TransactionFormValidationInput {
  trxId: string;
  namaPerusahaan: string;
  grossNumeric: number;
  existingIds?: string[];
  isUpdate?: boolean;
  originalId?: string;
}

/**
 * Validates transaction form input, supporting manual transaction codes (ID Transaksi).
 * Returns null if valid, or a user-facing Indonesian validation error message.
 */
export function validateTransactionFormInput(
  input: TransactionFormValidationInput
): string | null {
  const cleanId = normalizeTransactionCode(input.trxId);
  if (!cleanId) {
    return 'Kode / ID Transaksi wajib diisi (dapat diketik manual atau klik tombol Auto).';
  }
  if (
    input.existingIds &&
    input.existingIds.some(
      (id) =>
        id.toLowerCase() === cleanId.toLowerCase() &&
        (!input.isUpdate ||
          (input.originalId &&
            id.toLowerCase() !== input.originalId.trim().toLowerCase()))
    )
  ) {
    return `Kode Transaksi "${cleanId}" sudah digunakan pada transaksi lain. Gunakan kode unik atau edit transaksi tersebut.`;
  }
  if (!input.namaPerusahaan || !input.namaPerusahaan.trim()) {
    return 'Nama Perusahaan / Klien B2B wajib diisi.';
  }
  if (input.grossNumeric <= 0) {
    return 'Total Tagihan (Gross Plafond) harus lebih besar dari Rp 0.';
  }
  return null;
}


