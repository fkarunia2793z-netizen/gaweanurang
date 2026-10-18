import type {
  PiutangRecord,
  CatalogFile,
  AuditLogEntry,
  GASUserAccount,
  GASConfig,
} from './arLogic';

export const BRAND_MARK_URL =
  'https://lh3.googleusercontent.com/aida/AEtjO1Vi67HMoyorEi43fK6EvZqKv8c7S4cLzEUp--yis90gt-ffJn5cWiT_8b4S83lAiYKG6yp9vcLjlJSTKATk6VjnxF1kuCRe5eNKOuj81NQWr_iVnf_CT_vbvnN_ey6kFtYgxlEX_8H2iQq6C9Rdd4ELsDJSJVYxlqj4cgmCBmxhdIWbTOhy5wJ6wTlcBLACKqsn9D4k8QnhsWOVHFBYTJMY5zFMWl8hcD4txMSFwe0iEmoZBEFf8IPzVXVc';

export const USER_AVATAR_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAYUx9hNtDBmWc_AcDfJFabkt8eF-skKZuyiS3wVIPjc-ovDg6URNcfVBiJXOm3aaaHVQpg_NEjLSQiUWZqP-guMS0GbYWE_DXkamHd4piOQzVsUFrbo-fuP2CnAIu8QKBglQS36R4PALntrESsp3pyKJC-MXWzp0ImkMQJUmUtW9PkI8SU6n80BPLP-1b_ul0yhOw6Ul6QkHm9U9x_ioRPl1YBnsKAyPnkXigPMeQjV8SAe0kNQTCKdQ';

export const INITIAL_GAS_USERS: GASUserAccount[] = [
  {
    username: 'rina.purnama',
    password: 'gas-admin-2025',
    fullName: 'Rina Purnama',
    role: 'AR Lead / Finance',
    initials: 'RP',
    branch: 'Jakarta HQ',
    avatarUrl: USER_AVATAR_URL,
    active: true,
  },
  {
    username: 'budi.santoso',
    password: 'collector-sby',
    fullName: 'Budi Santoso',
    role: 'Field Collector SBY',
    initials: 'BS',
    branch: 'Cabang Surabaya',
    avatarUrl: '',
    active: true,
  },
  {
    username: 'siti.rahma',
    password: 'verifier-ar',
    fullName: 'Siti Rahmawati',
    role: 'Internal AR Verifier',
    initials: 'SR',
    branch: 'Cabang Semarang',
    avatarUrl: '',
    active: true,
  },
  {
    username: 'hendro.tax',
    password: 'tax-djp-2025',
    fullName: 'Hendro Wicaksono',
    role: 'Tax Specialist DJP',
    initials: 'HW',
    branch: 'Jakarta HQ',
    avatarUrl: '',
    active: true,
  },
];

export const INITIAL_PIUTANG_RECORDS: PiutangRecord[] = [
  {
    id: 'TRX-9482-B2A',
    invoiceNo: 'AR-2025-0891',
    tanggalUpdate: '2025-05-14 09:24',
    dueDate: '27 Jan 2025',
    umurPiutangHari: 18,
    namaPerusahaan: 'PT Surya Perkasa Abadi',
    npwp: '01.384.992.4-012.000',
    cabang: 'Surabaya',
    picPenagihan: 'Dedi Mulyanto',
    picRole: 'Field Collector SBY',
    totalTagihan: 450000000,
    saldoTerealisasi: 200000000,
    saldoBelumTerealisasi: 250000000,
    kategoriKendala: 'Kwitansi_Kurang',
    keteranganKendala: 'Kwitansi asli cap basah hilang dalam kurir regional, butuh approval legal',
    statusDokumen: 'Belum Lengkap',
    detailDokumen: 'Faktur Pajak Asli & Kwitansi rangkap 3 bermaterai belum diterima AR',
    matrix: { fk: true, kw: false, sj: true, fp: true },
    boxArsip: 'Box AR-2025/A1 - Binder Audit Surabaya',
  },
  {
    id: 'TRX-7821-C8D',
    invoiceNo: 'AR-2025-0894',
    tanggalUpdate: '2025-05-13 16:11',
    dueDate: '29 Jan 2025',
    umurPiutangHari: 45,
    namaPerusahaan: 'PT Mitra Mandiri Utama',
    npwp: '02.190.443.2-021.000',
    cabang: 'Semarang',
    picPenagihan: 'Siti Rahma',
    picRole: 'Internal AR Verifier',
    totalTagihan: 320000000,
    saldoTerealisasi: 280000000,
    saldoBelumTerealisasi: 40000000,
    kategoriKendala: 'Promo',
    keteranganKendala: 'Pemotongan listing fee promo Q3 tidak dicantumkan di PO awal',
    statusDokumen: 'Belum Lengkap',
    detailDokumen: 'Perlu lampiran Form Klaim Promo yang disetujui Direktur Pemasaran & BAST Stempel',
    matrix: { fk: true, kw: true, sj: false, fp: true },
    boxArsip: 'Box AR-2025/A2 - Binder Semarang',
  },
  {
    id: 'TRX-6119-A11',
    invoiceNo: 'AR-2025-0902',
    tanggalUpdate: '2025-05-12 11:05',
    dueDate: '31 Jan 2025',
    umurPiutangHari: 24,
    namaPerusahaan: 'CV Graha Solusi Prima',
    npwp: '03.991.201.8-042.000',
    cabang: 'Jakarta',
    picPenagihan: 'Rina Purnama',
    picRole: 'AR Lead / Finance',
    totalTagihan: 650000000,
    saldoTerealisasi: 650000000,
    saldoBelumTerealisasi: 0,
    kategoriKendala: 'Clear',
    keteranganKendala: 'Lunas via Giro BNI Kliring Tgl 27 Okt',
    statusDokumen: 'Lengkap',
    detailDokumen: 'Faktur Pajak, BASTB, dan Kwitansi asli terarsip rapi di Folder 2025-B',
    matrix: { fk: true, kw: true, sj: true, fp: true },
    boxArsip: 'Box AR-2025/B1 - Brankas Pusat JKT',
  },
  {
    id: 'TRX-5023-F90',
    invoiceNo: 'AR-2025-0899',
    tanggalUpdate: '2025-05-11 14:40',
    dueDate: '30 Jan 2025',
    umurPiutangHari: 105,
    namaPerusahaan: 'PT Sentosa Pangan Jaya',
    npwp: '01.442.871.9-073.000',
    cabang: 'Bandung',
    picPenagihan: 'Bagus Pratama',
    picRole: 'Tax & AR Analyst',
    totalTagihan: 825500000,
    saldoTerealisasi: 450250000,
    saldoBelumTerealisasi: 375250000,
    kategoriKendala: 'Lainnya',
    keteranganKendala: 'Kompensasi retur barang rusak di gudang Cikarang batch #401',
    statusDokumen: 'Belum Lengkap',
    detailDokumen: 'Menunggu Nota Retur Pajak & Antrean Approval DJP E-Faktur',
    matrix: { fk: true, kw: true, sj: true, fp: false },
    boxArsip: 'Box AR-2025/C4 - Gudang Arsip Bandung',
  },
  {
    id: 'TRX-4412-E34',
    invoiceNo: 'AR-2025-0879',
    tanggalUpdate: '2025-05-10 10:19',
    dueDate: '10 Mar 2025',
    umurPiutangHari: 66,
    namaPerusahaan: 'PT Nusantara Logistik Sentral',
    npwp: '02.771.554.0-055.000',
    cabang: 'Jakarta',
    picPenagihan: 'Rina Purnama',
    picRole: 'AR Lead / Finance',
    totalTagihan: 600000000,
    saldoTerealisasi: 600000000,
    saldoBelumTerealisasi: 0,
    kategoriKendala: 'Clear',
    keteranganKendala: 'Transfer RTGS Bank Mandiri lunas sesuai kontrak termin akhir',
    statusDokumen: 'Lengkap',
    detailDokumen: 'Semua berkas invoice, e-faktur, dan tanda terima lengkap',
    matrix: { fk: true, kw: true, sj: true, fp: true },
    boxArsip: 'Box AR-2025/A3 - Brankas Pusat JKT',
  },
  {
    id: 'TRX-9477-K99',
    invoiceNo: 'AR-2025-0915',
    tanggalUpdate: '2025-05-09 17:30',
    dueDate: '02 Feb 2025',
    umurPiutangHari: 78,
    namaPerusahaan: 'PT Prima Distribusi Solusindo',
    npwp: '01.884.221.3-091.000',
    cabang: 'Surabaya',
    picPenagihan: 'Budi Santoso',
    picRole: 'Field Collector SBY',
    totalTagihan: 240000000,
    saldoTerealisasi: 39750000,
    saldoBelumTerealisasi: 200250000,
    kategoriKendala: 'Kwitansi_Kurang',
    keteranganKendala: 'Tagihan > Rp 50Jt tanpa materai Rp 10.000 asli pada kwitansi fisik',
    statusDokumen: 'Belum Lengkap',
    detailDokumen: 'Kwitansi bermaterai Rp 10.000 sedang dikirim ulang oleh cabang Surabaya',
    matrix: { fk: true, kw: false, sj: true, fp: true },
    boxArsip: 'Box AR-2025/A1 - Binder Audit Surabaya',
  },
];

export const INITIAL_CATALOG_FILES: CatalogFile[] = [
  {
    id: 'CAT-01',
    invoiceNo: 'INV/2025/03/401',
    transactionId: 'TRX-9482-B2A',
    clientName: 'PT Surya Perkasa Abadi',
    nominalTagihan: 245850000,
    fileName: 'Kwitansi_Materai_INV401.pdf',
    fileSize: '2.4 MB • 3 Lembar Dokumen',
    fileType: 'PDF',
    category: 'kwitansi',
    status: 'verified',
    statusLabel: 'TERVERIFIKASI',
    subInfo: 'Faktur Pajak: 010.000-25.8821941',
    highlightInfo: 'Materai Rp 10.000 Asli',
    boxArsip: 'Box AR-2025/A1',
    branch: 'jkt',
    branchLabel: 'Kantor Pusat JKT',
    extraLabel: 'Status Materai:',
    extraValue: 'Materai Rp 10.000 Asli',
    driveUrl: 'https://drive.google.com/file/d/1XyZ90A1_surya_inv401/view',
  },
  {
    id: 'CAT-02',
    invoiceNo: 'INV/2025/03/388',
    transactionId: 'TRX-7821-C8D',
    clientName: 'PT Mega Sarana Nusantara',
    nominalTagihan: 512400000,
    fileName: 'BAST_SuratJalan_MSN.pdf',
    fileSize: '4.1 MB • 6 Lampiran Ekspedisi',
    fileType: 'SCAN',
    category: 'bast',
    status: 'pending',
    statusLabel: 'MENUNGGU LEGALISIR',
    subInfo: 'Perlu TTD Stempel Basah Site',
    highlightInfo: 'JNE Trucking #8812',
    boxArsip: 'Cabang Surabaya (SBY)',
    branch: 'sby',
    branchLabel: 'Cabang Surabaya',
    extraLabel: 'Kurir Dispatch:',
    extraValue: 'JNE Trucking #8812',
    driveUrl: 'https://drive.google.com/file/d/2XyZ90B2_mega_inv388/view',
  },
  {
    id: 'CAT-03',
    invoiceNo: 'INV/2025/03/372',
    transactionId: 'TRX-6119-A11',
    clientName: 'CV Global Teknik Mandiri',
    nominalTagihan: 88220000,
    fileName: 'PO_FakturKomersial_GTM.pdf',
    fileSize: '1.8 MB • Paket Tagihan Komplit',
    fileType: 'PDF',
    category: 'faktur-komersial',
    status: 'verified',
    statusLabel: 'LENGKAP & AUDIT READY',
    subInfo: 'PO Client No: PO-GTM-992-2025',
    highlightInfo: 'Faktur Pajak Approved',
    boxArsip: 'Binder Audit-B / JKT',
    branch: 'jkt',
    branchLabel: 'Kantor Pusat JKT',
    extraLabel: 'Verifikasi Pajak:',
    extraValue: 'Faktur Pajak Approved',
    driveUrl: 'https://drive.google.com/file/d/3XyZ90C3_global_inv372/view',
  },
  {
    id: 'CAT-04',
    invoiceNo: 'INV/2025/03/350',
    transactionId: 'TRX-5023-F90',
    clientName: 'PT Duta Niaga Perkasa',
    nominalTagihan: 164500000,
    fileName: 'EFaktur_Reject_DNP_350.xml',
    fileSize: '64 KB • Anomali Sinkron DJP',
    fileType: 'XML',
    category: 'faktur-pajak',
    status: 'rejected',
    statusLabel: 'REJECT DJP (ETAX-20015)',
    subInfo: 'NPWP Lawan Transaksi Belum 16 Digit',
    highlightInfo: 'Re-upload E-Faktur',
    boxArsip: 'Re-upload E-Faktur',
    branch: 'med',
    branchLabel: 'Cabang Medan',
    extraLabel: 'Batas DJP Upload:',
    extraValue: '15 April 2025',
    driveUrl: 'https://drive.google.com/file/d/4XyZ90D4_duta_inv350/view',
  },
  {
    id: 'CAT-05',
    invoiceNo: 'INV/2025/03/321',
    transactionId: 'TRX-4412-E34',
    clientName: 'PT Samudra Pasifik Logistik',
    nominalTagihan: 74300000,
    fileName: 'Bupot_PPh23_Kwitansi_SPL.pdf',
    fileSize: '850 KB • Lengkap Bukti Potong Pajak',
    fileType: 'PDF',
    category: 'kwitansi',
    status: 'verified',
    statusLabel: 'TERVERIFIKASI',
    subInfo: 'Bukti Potong PPh 23: DIPOTONG 2%',
    highlightInfo: 'Rp 1.486.000',
    boxArsip: 'Box AR-2025/A2',
    branch: 'jkt',
    branchLabel: 'Kantor Pusat JKT',
    extraLabel: 'Potongan PPh 23:',
    extraValue: 'Rp 1.486.000',
    driveUrl: 'https://drive.google.com/file/d/5XyZ90E5_samudra_inv321/view',
  },
  {
    id: 'CAT-06',
    invoiceNo: 'INV/2025/03/310',
    transactionId: 'TRX-9477-K99',
    clientName: 'CV Berkah Mandiri Abadi',
    nominalTagihan: 192150000,
    fileName: 'BAST_Final_BMA_310.pdf',
    fileSize: '3.2 MB • BAST + Bukti Timbangan',
    fileType: 'PDF',
    category: 'bast',
    status: 'verified',
    statusLabel: 'TERVERIFIKASI',
    subInfo: 'Signed by Warehouse Receiver',
    highlightInfo: 'Balikpapan Port',
    boxArsip: 'Box AR-2025/A3',
    branch: 'bpp',
    branchLabel: 'Cabang Balikpapan',
    extraLabel: 'Lokasi Gudang:',
    extraValue: 'Balikpapan Port',
    driveUrl: 'https://drive.google.com/file/d/6XyZ90F6_berkah_inv310/view',
  },
];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 1,
    eventId: 'EVT-20250314-99014',
    timestamp: '2025-03-14 11:42:09',
    datePart: '14 Mar 2025',
    timePart: '11:42:09.124',
    actorName: 'Rina Purnama',
    actorInitials: 'RP',
    actorEmail: 'rina.purnama',
    actorRole: 'AR_LEAD',
    actorLocation: 'Jakarta HQ',
    ipAddress: '182.253.114.92',
    actionType: 'UPDATE_SALDO',
    actionBadge: 'UPDATE',
    moduleName: 'AR Ledger',
    description: 'Saldo terealisasi diubah Rp 150Jt → Rp 200Jt (Sisa tagihan Rp 250Jt).',
    targetId: 'TRX-9482-B2A',
    targetEntity: 'PT Surya Perkasa Abadi',
    severity: 'SUCCESS',
    sha256: 'a7f4bc8012e8b61c9441fd29',
    beforeState: {
      saldoTerealisasi: 150000000,
      saldoOutstanding: 300000000,
      statusBerkas: 'Menunggu Kwitansi Asli',
    },
    afterState: {
      saldoTerealisasi: 200000000,
      saldoOutstanding: 250000000,
      statusBerkas: 'Sebagian Terbayar (Verified)',
    },
  },
  {
    id: 2,
    eventId: 'EVT-20250314-99012',
    timestamp: '2025-03-14 11:30:15',
    datePart: '14 Mar 2025',
    timePart: '11:30:15.890',
    actorName: 'System GAS Bot',
    actorInitials: 'GB',
    actorEmail: 'gas.bot',
    actorRole: 'AUTOMATION_WORKER',
    actorLocation: 'gas-webhook@appengine',
    ipAddress: '35.198.241.10',
    actionType: 'SYNC_SHEETS',
    actionBadge: 'SYNC',
    moduleName: 'G-Sheets Auto',
    description: 'Batch reconciliation row #442 & #443 sinkron dengan spreadsheet master finance.',
    targetId: 'BATCH-GAS-991',
    targetEntity: 'PT Mitra Mandiri Utama',
    severity: 'SUCCESS',
    sha256: 'e992cc2194f180b1443a9102',
    beforeState: {
      saldoTerealisasi: 240000000,
      saldoOutstanding: 80000000,
      statusBerkas: 'Antrean Sinkronisasi',
    },
    afterState: {
      saldoTerealisasi: 280000000,
      saldoOutstanding: 40000000,
      statusBerkas: 'Sinkron Sheet Data_Piutang',
    },
  },
  {
    id: 3,
    eventId: 'EVT-20250314-99008',
    timestamp: '2025-03-14 10:55:02',
    datePart: '14 Mar 2025',
    timePart: '10:55:02.401',
    actorName: 'Budi Santoso',
    actorInitials: 'BS',
    actorEmail: 'budi.santoso',
    actorRole: 'FIELD_COLLECTOR',
    actorLocation: 'Surabaya Branch',
    ipAddress: '114.122.20.14',
    actionType: 'VERIFY_DOKUMEN',
    actionBadge: 'VERIFY',
    moduleName: 'Katalog Berkas',
    description: 'Unggah lampiran BAST fisik & validasi stempel penerimaan gudang.',
    targetId: 'DOC-BAST-7718',
    targetEntity: 'CV Graha Solusi Prima',
    severity: 'SUCCESS',
    sha256: '19aef3402bb87712c9043fa1',
    beforeState: {
      saldoTerealisasi: 650000000,
      saldoOutstanding: 0,
      statusBerkas: 'Belum Lengkap (BAST)',
    },
    afterState: {
      saldoTerealisasi: 650000000,
      saldoOutstanding: 0,
      statusBerkas: 'Lengkap & Terverifikasi',
    },
  },
  {
    id: 4,
    eventId: 'EVT-20250314-98994',
    timestamp: '2025-03-14 09:12:44',
    datePart: '14 Mar 2025',
    timePart: '09:12:44.712',
    actorName: 'Siti Rahmawati',
    actorInitials: 'SR',
    actorEmail: 'siti.rahma',
    actorRole: 'INTERNAL_AR',
    actorLocation: 'Surabaya',
    ipAddress: '180.252.88.19',
    actionType: 'EXPORT_EXCEL',
    actionBadge: 'EXPORT',
    moduleName: 'Security Auth',
    description: 'Export bulk report buku besar piutang periode Q1 2025 format .XLSX terenkripsi.',
    targetId: 'EXP-Q1-2025',
    targetEntity: '312 Piutang Baris',
    severity: 'INFO',
    sha256: 'cc084e12fa890123bc99102d',
    beforeState: {
      saldoTerealisasi: 1965250000,
      saldoOutstanding: 880250000,
      statusBerkas: 'Snapshot Ready',
    },
    afterState: {
      saldoTerealisasi: 1965250000,
      saldoOutstanding: 880250000,
      statusBerkas: 'Exported .XLSX & Logged',
    },
  },
  {
    id: 5,
    eventId: 'EVT-20250313-98910',
    timestamp: '2025-03-13 17:20:10',
    datePart: '13 Mar 2025',
    timePart: '17:20:10.002',
    actorName: 'Rina Purnama',
    actorInitials: 'RP',
    actorEmail: 'rina.purnama',
    actorRole: 'AR_LEAD',
    actorLocation: 'Jakarta HQ',
    ipAddress: '182.253.114.92',
    actionType: 'INSERT_TRANSAKSI',
    actionBadge: 'INSERT',
    moduleName: 'AR Ledger',
    description: 'Pembuatan berkas piutang baru senilai Rp 450.000.000 dari PO #PO-8819.',
    targetId: 'TRX-9482-B2A',
    targetEntity: 'PT Surya Perkasa Abadi',
    severity: 'WARN',
    sha256: '4b22ea8809123490ab1289ef',
    beforeState: {
      saldoTerealisasi: 0,
      saldoOutstanding: 0,
      statusBerkas: 'NEW_ENTRY',
    },
    afterState: {
      saldoTerealisasi: 150000000,
      saldoOutstanding: 300000000,
      statusBerkas: 'Belum Lengkap',
    },
  },
];

export const INITIAL_GAS_CONFIG: GASConfig = {
  spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
  sheetPiutang: 'Data_Piutang',
  sheetAudit: 'Audit_Log_Sys',
  sheetUsers: 'Users_Auth',
  sheetCatalog: 'Katalog_Drive_Arsip',
  driveFolderId: '1DriveFolder_AR_BuktiSurat_2025_Master',
  driveFolderName: 'AR_Tracker_Bukti_Surat_Diterima',
  webAppUrl: 'https://script.google.com/macros/s/AKfycbz_98sQ1hQv320_ARTrackerCore_API_v32/exec',
  deploymentId: 'AKfycbw9Qv-v3.2',
  execMode: 'Me (admin-finance@perusahaan.co.id)',
  reminderH3: true,
  alertSales: true,
  waProvider: 'Wablas Enterprise Gateway API',
  waToken: 'wb_prod_sec_9941a877bf0e44ac',
  waTemplate: `Yth. Bagian Keuangan {Nama_Perusahaan},\n\nPengingat otomatis dari AR Tracker Pro: Invoice Anda sebesar {Total_Tagihan} dengan sisa saldo terhutang {Saldo_Belum_Terealisasi} akan jatuh tempo dalam 3 hari ke depan.\n\nMohon konfirmasi proses pembayaran atau hubungi tim Finance kami via finance@perusahaan.co.id. Terima kasih atas kerjasamanya.`,
  batasMeterai: 50000000,
  defaultTermin: 30,
  gracePeriod: 14,
  githubRepo: 'https://github.com/finance-corp/ar-tracker-pro',
  githubBranch: 'main (GitHub Pages / Actions CI)',
};

export const COMPLETE_GAS_CODE_TEMPLATE = `/**
 * AR TRACKER PRO - FULL GOOGLE APPS SCRIPT BACKEND (v3.6 + DRIVEAPP BRIDGE)
 * Otomatis membuat Sheet: 'Data_Piutang', 'Audit_Log_Sys', 'Users_Auth', 'Katalog_Drive_Arsip'
 * Mendukung Upload Berkas Bukti Terima Surat ke Google Drive via DriveApp (Tanpa OAuth Client Popup)
 */

const CONFIG = {
  SHEET_PIUTANG: 'Data_Piutang',
  SHEET_AUDIT: 'Audit_Log_Sys',
  SHEET_USERS: 'Users_Auth',
  SHEET_CATALOG: 'Katalog_Drive_Arsip',
  DEFAULT_DRIVE_FOLDER_NAME: 'AR_Tracker_Bukti_Surat_Diterima',
  DEFAULT_USERS: [
    ['rina.purnama', 'gas-admin-2025', 'Rina Purnama', 'AR Lead / Finance', 'RP', 'Jakarta HQ', 'ACTIVE'],
    ['budi.santoso', 'collector-sby', 'Budi Santoso', 'Field Collector SBY', 'BS', 'Cabang Surabaya', 'ACTIVE'],
    ['siti.rahma', 'verifier-ar', 'Siti Rahmawati', 'Internal AR Verifier', 'SR', 'Cabang Semarang', 'ACTIVE'],
    ['hendro.tax', 'tax-djp-2025', 'Hendro Wicaksono', 'Tax Specialist DJP', 'HW', 'Jakarta HQ', 'ACTIVE']
  ]
};

function getSpreadsheet(customId) {
  if (customId && customId.length > 15 && customId !== '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms') {
    try { return SpreadsheetApp.openById(customId); } catch (e) {}
  }
  const prop = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (prop) {
    try { return SpreadsheetApp.openById(prop); } catch (e) {}
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function ensureSheetsInitialized(ss) {
  let userSheet = ss.getSheetByName(CONFIG.SHEET_USERS);
  if (!userSheet) {
    userSheet = ss.insertSheet(CONFIG.SHEET_USERS);
    userSheet.appendRow(['Username', 'Password', 'Full_Name', 'Role', 'Initials', 'Branch', 'Status']);
    CONFIG.DEFAULT_USERS.forEach(u => userSheet.appendRow(u));
  }

  let piutangSheet = ss.getSheetByName(CONFIG.SHEET_PIUTANG);
  if (!piutangSheet) {
    piutangSheet = ss.insertSheet(CONFIG.SHEET_PIUTANG);
    piutangSheet.appendRow([
      'ID_Transaksi', 'No_Invoice', 'Tanggal_Update', 'Due_Date',
      'Nama_Perusahaan', 'NPWP', 'Cabang', 'PIC_Penagihan', 'PIC_Role',
      'Total_Tagihan', 'Saldo_Terealisasi', 'Saldo_Belum_Terealisasi',
      'Kategori_Kendala', 'Keterangan_Kendala', 'Status_Dokumen',
      'Detail_Dokumen', 'Matrix_JSON', 'Box_Arsip'
    ]);
  }

  let auditSheet = ss.getSheetByName(CONFIG.SHEET_AUDIT);
  if (!auditSheet) {
    auditSheet = ss.insertSheet(CONFIG.SHEET_AUDIT);
    auditSheet.appendRow(['Timestamp', 'Event_ID', 'User', 'Role', 'Action', 'Target_ID', 'Entity', 'Detail', 'SHA256']);
  }

  let catalogSheet = ss.getSheetByName(CONFIG.SHEET_CATALOG);
  if (!catalogSheet) {
    catalogSheet = ss.insertSheet(CONFIG.SHEET_CATALOG);
    catalogSheet.appendRow([
      'ID_Berkas', 'ID_Transaksi', 'No_Invoice', 'Nama_Perusahaan',
      'Nama_Berkas', 'Ukuran', 'Penerima_Surat', 'Tgl_Terima',
      'Catatan', 'Drive_File_ID', 'Drive_URL', 'Timestamp'
    ]);
  }

  return { userSheet, piutangSheet, auditSheet, catalogSheet };
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const ss = getSpreadsheet(params.sheetId);
    ensureSheetsInitialized(ss);

    if (params.action === 'readAll') {
      return jsonResponse({
        status: 'success',
        piutang: readAllPiutang(ss),
        users: readAllUsers(ss)
      });
    }
    return jsonResponse({
      status: 'success',
      service: 'AR Tracker Pro GAS Engine v3.6 + DriveApp',
      spreadsheetName: ss.getName(),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

function doPost(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    const body = JSON.parse(raw);
    const ss = getSpreadsheet(body.spreadsheetId);
    ensureSheetsInitialized(ss);

    const action = body.action;
    if (action === 'login') {
      return jsonResponse(verifyUserCredentials(ss, body.username, body.password));
    }
    if (action === 'uploadDriveFile') {
      return jsonResponse(uploadFileToGoogleDrive(ss, body));
    }
    if (action === 'testDriveFolder') {
      return jsonResponse(verifyOrCreateDriveFolder(ss, body.driveFolderId, body.driveFolderName));
    }
    if (action === 'savePiutang') {
      return jsonResponse(saveRecordPiutang(ss, body.payload || body.record, body.actor));
    }
    if (action === 'deletePiutang') {
      return jsonResponse(deleteRecordPiutang(ss, body.id, body.actor));
    }
    if (action === 'saveUsers') {
      return jsonResponse(syncUsersList(ss, body.users, body.actor));
    }
    if (action === 'syncAllPiutang' || action === 'syncAll' || action === 'clearAllPiutang') {
      return jsonResponse(overwriteAllPiutang(ss, body.records || body.piutang || [], body.actor));
    }
    return jsonResponse({ status: 'error', message: 'Action tidak dikenali: ' + action });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

function verifyUserCredentials(ss, username, password) {
  const sheet = ss.getSheetByName(CONFIG.SHEET_USERS);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const [u, p, fullName, role, initials, branch, status] = rows[i];
    if (String(u).toLowerCase() === String(username).toLowerCase() && String(p) === String(password) && status === 'ACTIVE') {
      appendAudit(ss, u, role, 'USER_LOGIN', u, branch, 'Login berhasil via Web App');
      return {
        status: 'success',
        user: { username: u, fullName, role, initials: initials || 'OP', branch, active: true }
      };
    }
  }
  return { status: 'error', message: 'Username atau Password salah di Sheet Users_Auth.' };
}

function readAllUsers(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEET_USERS);
  const rows = sheet.getDataRange().getValues();
  const list = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0]) continue;
    list.push({
      username: String(r[0]),
      password: String(r[1]),
      fullName: String(r[2]),
      role: String(r[3]),
      initials: String(r[4] || 'OP'),
      branch: String(r[5] || 'Jakarta HQ'),
      avatarUrl: '',
      active: String(r[6] || 'ACTIVE') === 'ACTIVE'
    });
  }
  return list;
}

function syncUsersList(ss, users, actor) {
  const sheet = ss.getSheetByName(CONFIG.SHEET_USERS);
  sheet.clearContents();
  sheet.appendRow(['Username', 'Password', 'Full_Name', 'Role', 'Initials', 'Branch', 'Status']);
  users.forEach(u => {
    sheet.appendRow([u.username, u.password || 'gas-2025', u.fullName, u.role, u.initials, u.branch, u.active ? 'ACTIVE' : 'SUSPENDED']);
  });
  appendAudit(ss, actor || 'admin', 'AR_LEAD', 'UPDATE_USERS', 'Users_Auth', 'Sheet Users_Auth', 'Memperbarui daftar user & password');
  return { status: 'success', count: users.length };
}

function readAllPiutang(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEET_PIUTANG);
  const rows = sheet.getDataRange().getValues();
  const list = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0]) continue;
    let matrix = { fk: true, kw: true, sj: true, fp: true };
    try { if (r[16]) matrix = JSON.parse(r[16]); } catch (e) {}
    list.push({
      id: String(r[0]),
      invoiceNo: String(r[1] || r[0]),
      tanggalUpdate: String(r[2] || ''),
      dueDate: String(r[3] || ''),
      namaPerusahaan: String(r[4] || ''),
      npwp: String(r[5] || ''),
      cabang: String(r[6] || 'Jakarta'),
      picPenagihan: String(r[7] || 'Rina Purnama'),
      picRole: String(r[8] || 'AR Finance'),
      totalTagihan: Number(r[9]) || 0,
      saldoTerealisasi: Number(r[10]) || 0,
      saldoBelumTerealisasi: (Number(r[9]) || 0) - (Number(r[10]) || 0),
      kategoriKendala: String(r[12] || 'Clear'),
      keteranganKendala: String(r[13] || '-'),
      statusDokumen: String(r[14] || 'Belum Lengkap'),
      detailDokumen: String(r[15] || '-'),
      matrix: matrix,
      boxArsip: String(r[17] || 'Box AR-2025/A1')
    });
  }
  return list;
}

function saveRecordPiutang(ss, p, actor) {
  const sheet = ss.getSheetByName(CONFIG.SHEET_PIUTANG);
  const data = sheet.getDataRange().getValues();
  const sisa = (Number(p.totalTagihan) || 0) - (Number(p.saldoTerealisasi) || 0);
  const rowValues = [
    p.id, p.invoiceNo, p.tanggalUpdate, p.dueDate,
    p.namaPerusahaan, p.npwp, p.cabang, p.picPenagihan, p.picRole,
    Number(p.totalTagihan) || 0, Number(p.saldoTerealisasi) || 0, sisa,
    p.kategoriKendala, p.keteranganKendala, p.statusDokumen,
    p.detailDokumen, JSON.stringify(p.matrix || {}), p.boxArsip
  ];

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(p.id)) {
      sheet.getRange(i + 1, 1, 1, rowValues.length).setValues([rowValues]);
      appendAudit(ss, actor || 'operator', 'AR', 'UPDATE_SALDO', p.id, p.namaPerusahaan, 'Update transaksi piutang');
      return { status: 'success', mode: 'updated', id: p.id };
    }
  }

  sheet.appendRow(rowValues);
  appendAudit(ss, actor || 'operator', 'AR', 'INSERT_TRANSAKSI', p.id, p.namaPerusahaan, 'Tambah transaksi piutang baru');
  return { status: 'success', mode: 'inserted', id: p.id };
}

function overwriteAllPiutang(ss, records, actor) {
  const sheet = ss.getSheetByName(CONFIG.SHEET_PIUTANG);
  sheet.clearContents();
  sheet.appendRow([
    'ID_Transaksi', 'No_Invoice', 'Tanggal_Update', 'Due_Date',
    'Nama_Perusahaan', 'NPWP', 'Cabang', 'PIC_Penagihan', 'PIC_Role',
    'Total_Tagihan', 'Saldo_Terealisasi', 'Saldo_Belum_Terealisasi',
    'Kategori_Kendala', 'Keterangan_Kendala', 'Status_Dokumen',
    'Detail_Dokumen', 'Matrix_JSON', 'Box_Arsip'
  ]);
  records.forEach(p => {
    const sisa = (Number(p.totalTagihan) || 0) - (Number(p.saldoTerealisasi) || 0);
    sheet.appendRow([
      p.id, p.invoiceNo, p.tanggalUpdate, p.dueDate,
      p.namaPerusahaan, p.npwp, p.cabang, p.picPenagihan, p.picRole,
      Number(p.totalTagihan) || 0, Number(p.saldoTerealisasi) || 0, sisa,
      p.kategoriKendala, p.keteranganKendala, p.statusDokumen,
      p.detailDokumen, JSON.stringify(p.matrix || {}), p.boxArsip
    ]);
  });
  appendAudit(ss, actor || 'operator', 'AR', 'SYNC_SHEETS', 'BATCH', 'Data_Piutang', 'Sinkronisasi penuh ' + records.length + ' baris');
  return { status: 'success', count: records.length };
}

function deleteRecordPiutang(ss, id, actor) {
  const sheet = ss.getSheetByName(CONFIG.SHEET_PIUTANG);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      const company = data[i][4];
      sheet.deleteRow(i + 1);
      appendAudit(ss, actor || 'operator', 'AR', 'DELETE_RECORD', id, company, 'Hapus transaksi piutang');
      return { status: 'success', id: id };
    }
  }
  return { status: 'error', message: 'ID tidak ditemukan' };
}

function appendAudit(ss, user, role, action, targetId, entity, detail) {
  const sheet = ss.getSheetByName(CONFIG.SHEET_AUDIT);
  if (!sheet) return;
  const evtId = 'EVT-' + Utilities.getUuid().substring(0, 8).toUpperCase();
  sheet.appendRow([new Date(), evtId, user, role, action, targetId, entity, detail, Utilities.getUuid()]);
}

function getOrCreateDriveFolder(folderId, folderName) {
  const cleanName = folderName || CONFIG.DEFAULT_DRIVE_FOLDER_NAME;
  if (folderId && folderId.length > 10 && folderId.indexOf('1DriveFolder_') === -1) {
    try {
      return DriveApp.getFolderById(folderId);
    } catch (e) {}
  }
  const existing = DriveApp.getFoldersByName(cleanName);
  if (existing.hasNext()) {
    return existing.next();
  }
  return DriveApp.createFolder(cleanName);
}

function verifyOrCreateDriveFolder(ss, folderId, folderName) {
  const folder = getOrCreateDriveFolder(folderId, folderName);
  return {
    status: 'success',
    folderId: folder.getId(),
    folderName: folder.getName(),
    folderUrl: folder.getUrl()
  };
}

function uploadFileToGoogleDrive(ss, body) {
  const folder = getOrCreateDriveFolder(body.driveFolderId, body.driveFolderName);
  const decodedBytes = Utilities.base64Decode(body.base64Data || '');
  const blob = Utilities.newBlob(
    decodedBytes,
    body.mimeType || 'application/pdf',
    body.fileName || ('Bukti_Terima_' + (body.invoiceNo || 'AR') + '.pdf')
  );
  const driveFile = folder.createFile(blob);
  driveFile.setDescription(
    'Bukti Surat Diterima | Invoice: ' + (body.invoiceNo || '-') +
    ' | Klien: ' + (body.companyName || '-') +
    ' | Penerima: ' + (body.receiverName || '-') +
    ' | Tgl: ' + (body.receiptDate || '-')
  );

  const fileUrl = driveFile.getUrl();
  const fileId = driveFile.getId();

  const catSheet = ss.getSheetByName(CONFIG.SHEET_CATALOG);
  if (catSheet) {
    catSheet.appendRow([
      'CAT-' + new Date().getTime(),
      body.recordId || '-',
      body.invoiceNo || '-',
      body.companyName || '-',
      body.fileName || driveFile.getName(),
      body.fileSize || '-',
      body.receiverName || '-',
      body.receiptDate || '-',
      body.notes || '-',
      fileId,
      fileUrl,
      new Date()
    ]);
  }

  // Update Data_Piutang row automatically
  const piutangSheet = ss.getSheetByName(CONFIG.SHEET_PIUTANG);
  if (piutangSheet && body.recordId) {
    const rows = piutangSheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(body.recordId)) {
        const nextStatus = body.markComplete ? 'Lengkap' : rows[i][14];
        const summary = 'Bukti Terima Surat (' + (body.fileName || '') + ') diterima oleh ' +
          (body.receiverName || '-') + ' [' + fileUrl + ']';
        piutangSheet.getRange(i + 1, 15).setValue(nextStatus);
        piutangSheet.getRange(i + 1, 16).setValue(summary);
        break;
      }
    }
  }

  appendAudit(
    ss,
    body.actor || 'operator',
    'AR_FINANCE',
    'UPLOAD_DRIVE_GAS',
    body.recordId || fileId,
    body.companyName || '-',
    'Upload bukti surat diterima ke Google Drive (' + driveFile.getName() + '): ' + fileUrl
  );

  return {
    status: 'success',
    fileId: fileId,
    fileUrl: fileUrl,
    folderId: folder.getId(),
    folderName: folder.getName()
  };
}`;
