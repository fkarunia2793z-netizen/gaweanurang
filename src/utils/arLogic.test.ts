import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatRupiah,
  parseRupiahInput,
  calculateOutstandingBalance,
  computeDashboardKPIs,
  computeSixMonthTrendData,
  parseDueDateToISO,
  evaluateDueDateUrgency,
  getUrgentDueRecords,
  getRecordAgingDays,
  getRecordAgingBucket,
  computeAgingSchedule,
  filterPiutangRecords,
  searchRecordsByCompanyName,
  authenticateGASUser,
  generatePiutangCSV,
  generateAuditHash,
  extractDriveFolderId,
  buildGASDriveUploadPayload,
  type PiutangRecord,
  type GASUserAccount,
} from './arLogic.ts';

test('formatRupiah and parseRupiahInput work accurately', () => {
  assert.equal(formatRupiah(450000000), 'Rp 450.000.000');
  assert.equal(formatRupiah(0), 'Rp 0');
  assert.equal(formatRupiah(118500000, false), '118.500.000');
  assert.equal(parseRupiahInput('Rp 450.000.000'), 450000000);
  assert.equal(parseRupiahInput('200.000.000'), 200000000);
  assert.equal(parseRupiahInput(''), 0);
});

test('calculateOutstandingBalance computes sisa and settlement status', () => {
  const partial = calculateOutstandingBalance(450000000, 200000000);
  assert.equal(partial.sisa, 250000000);
  assert.equal(partial.isSettled, false);
  assert.equal(partial.ratioCair, 44.44);

  const settled = calculateOutstandingBalance(650000000, 650000000);
  assert.equal(settled.sisa, 0);
  assert.equal(settled.isSettled, true);
  assert.equal(settled.ratioCair, 100);
});

const mockRecords: PiutangRecord[] = [
  {
    id: 'TRX-9482-B2A',
    invoiceNo: 'INV/25/03/401',
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
    keteranganKendala: 'Kwitansi asli cap basah hilang',
    statusDokumen: 'Belum Lengkap',
    detailDokumen: 'Faktur Pajak Asli & Kwitansi belum diterima',
    matrix: { fk: true, kw: false, sj: true, fp: true },
    boxArsip: 'Box AR-2025/A1',
  },
  {
    id: 'TRX-6119-A11',
    invoiceNo: 'INV/25/03/372',
    tanggalUpdate: '2025-05-12 11:05',
    dueDate: '31 Jan 2025',
    umurPiutangHari: 95,
    namaPerusahaan: 'CV Graha Solusi Prima',
    npwp: '03.991.201.8-042.000',
    cabang: 'Jakarta',
    picPenagihan: 'Rina Purnama',
    picRole: 'AR Lead / Finance',
    totalTagihan: 650000000,
    saldoTerealisasi: 650000000,
    saldoBelumTerealisasi: 0,
    kategoriKendala: 'Clear',
    keteranganKendala: 'Lunas via Giro BNI',
    statusDokumen: 'Lengkap',
    detailDokumen: 'Semua berkas lengkap',
    matrix: { fk: true, kw: true, sj: true, fp: true },
    boxArsip: 'Box AR-2025/B1',
  },
];

test('computeDashboardKPIs and computeAgingSchedule aggregate totals accurately', () => {
  const kpis = computeDashboardKPIs(mockRecords);
  assert.equal(kpis.totalPiutang, 1100000000);
  assert.equal(kpis.totalRealisasi, 850000000);
  assert.equal(kpis.totalOutstanding, 250000000);
  assert.equal(kpis.dokumenPending, 1);
  assert.equal(kpis.totalTransaksi, 2);

  const trend = computeSixMonthTrendData(mockRecords);
  assert.equal(trend.length, 6);
  assert.equal(trend[5].totalTagihan, 1100000000);
  assert.equal(trend[5].realisasiPembayaran, 850000000);
  assert.equal(trend[5].sisaOutstanding, 250000000);

  // Verify Aging Schedule classification (1-30, 31-60, 61-90, >90)
  assert.equal(getRecordAgingBucket(18), '1-30');
  assert.equal(getRecordAgingBucket(45), '31-60');
  assert.equal(getRecordAgingBucket(78), '61-90');
  assert.equal(getRecordAgingBucket(105), '>90');
  assert.equal(getRecordAgingDays(mockRecords[0]), 18);
  assert.equal(getRecordAgingDays(mockRecords[1]), 95);

  const aging = computeAgingSchedule(mockRecords);
  assert.equal(aging.buckets.length, 4);
  assert.equal(aging.buckets[0].key, '1-30');
  assert.equal(aging.buckets[0].totalPiutang, 450000000);
  assert.equal(aging.buckets[0].totalOutstanding, 250000000);
  assert.equal(aging.buckets[3].key, '>90');
  assert.equal(aging.buckets[3].totalPiutang, 650000000);
  assert.equal(aging.totalPiutang, 1100000000);
  assert.equal(
    filterPiutangRecords(mockRecords, '', 'ALL', 'ALL', 'ALL', '', '', 'ALL', '2025-01-26', '1-30')
      .length,
    1
  );
  assert.equal(
    filterPiutangRecords(mockRecords, '', 'ALL', 'ALL', 'ALL', '', '', 'ALL', '2025-01-26', '>90')
      .length,
    1
  );
});

test('filterPiutangRecords filters by query, kendala, status, missing doc type, and due date range', () => {
  assert.equal(filterPiutangRecords(mockRecords, 'Surya', 'ALL', 'ALL').length, 1);
  assert.equal(filterPiutangRecords(mockRecords, '', 'Clear', 'ALL').length, 1);
  assert.equal(filterPiutangRecords(mockRecords, '', 'ALL', 'Belum Lengkap').length, 1);
  assert.equal(filterPiutangRecords(mockRecords, '', 'ALL', 'ALL', 'Kwitansi').length, 1);
  assert.equal(filterPiutangRecords(mockRecords, '', 'ALL', 'ALL', 'BAST').length, 0);

  // Verify due date normalization and range filtering
  assert.equal(parseDueDateToISO('27 Jan 2025'), '2025-01-27');
  assert.equal(parseDueDateToISO('2025-03-10'), '2025-03-10');
  assert.equal(
    filterPiutangRecords(mockRecords, '', 'ALL', 'ALL', 'ALL', '2025-01-27', '2025-01-28').length,
    1
  );
  assert.equal(
    filterPiutangRecords(mockRecords, '', 'ALL', 'ALL', 'ALL', '2025-01-30', '2025-01-31').length,
    1
  );
  assert.equal(
    filterPiutangRecords(mockRecords, '', 'ALL', 'ALL', 'ALL', '2025-02-01', '2025-02-28').length,
    0
  );

  // Verify due date urgency evaluation ("tagihan mepet")
  const urg1 = evaluateDueDateUrgency(mockRecords[0], '2025-01-26');
  assert.equal(urg1.level, 'CRITICAL');
  assert.equal(urg1.daysRemaining, 1);
  assert.equal(urg1.isMepet, true);
  assert.equal(urg1.badgeLabel, 'H-1 SANGAT MEPET');

  const urg2 = evaluateDueDateUrgency(mockRecords[1], '2025-01-26');
  assert.equal(urg2.level, 'SETTLED');
  assert.equal(urg2.isMepet, false);

  const urgentList = getUrgentDueRecords(mockRecords, 7, '2025-01-26');
  assert.equal(urgentList.length, 1);
  assert.equal(urgentList[0].record.id, 'TRX-9482-B2A');

  assert.equal(
    filterPiutangRecords(mockRecords, '', 'ALL', 'ALL', 'ALL', '', '', 'CRITICAL_3', '2025-01-26').length,
    1
  );

  // Verify quick search by company name across all records
  assert.equal(searchRecordsByCompanyName(mockRecords, '').length, 0);
  assert.equal(searchRecordsByCompanyName(mockRecords, 'surya perkasa').length, 1);
  assert.equal(searchRecordsByCompanyName(mockRecords, 'graha solusi').length, 1);
  assert.equal(searchRecordsByCompanyName(mockRecords, 'tidak ada').length, 0);
});

test('authenticateGASUser validates GAS script user credentials', () => {
  const users: GASUserAccount[] = [
    {
      username: 'rina.purnama',
      password: 'gas-admin-2025',
      fullName: 'Rina Purnama',
      role: 'AR Lead / Finance',
      initials: 'RP',
      branch: 'Jakarta HQ',
      avatarUrl: '',
      active: true,
    },
  ];

  const failEmpty = authenticateGASUser(users, '', '');
  assert.equal(failEmpty.success, false);

  const failWrong = authenticateGASUser(users, 'rina.purnama', 'wrong');
  assert.equal(failWrong.success, false);

  const ok = authenticateGASUser(users, 'rina.purnama', 'gas-admin-2025');
  assert.equal(ok.success, true);
  assert.equal(ok.user?.fullName, 'Rina Purnama');
  assert.equal(ok.user?.password, undefined);
});

test('generatePiutangCSV and generateAuditHash produce deterministic output', async () => {
  const { isLiveGASUrl, parseImportedPiutangCSV } = await import('./gasClient.ts');
  const csv = generatePiutangCSV(mockRecords);
  assert.ok(csv.includes('ID_Transaksi,No_Invoice'));
  assert.ok(csv.includes('"TRX-9482-B2A"'));
  const hash1 = generateAuditHash('TRX-9482-B2A:200000000');
  const hash2 = generateAuditHash('TRX-9482-B2A:200000000');
  assert.equal(hash1, hash2);
  assert.ok(hash1.length >= 24);

  // Verify CSV roundtrip import
  const imported = parseImportedPiutangCSV(csv);
  assert.equal(imported.length, 2);
  assert.equal(imported[0].id, 'TRX-9482-B2A');
  assert.equal(imported[0].totalTagihan, 450000000);
  assert.equal(imported[0].saldoBelumTerealisasi, 250000000);

  // Verify GAS URL detector
  assert.equal(
    isLiveGASUrl('https://script.google.com/macros/s/AKfycbz_98sQ1hQv320_ARTrackerCore_API_v32/exec'),
    false
  );
  assert.equal(
    isLiveGASUrl('https://script.google.com/macros/s/AKfycbxRealCustomUrl12345/exec'),
    true
  );

  // Verify Google Drive Folder ID extraction and GAS DriveApp upload payload builder
  assert.equal(
    extractDriveFolderId(
      'https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz?usp=sharing'
    ),
    '1AbCdEfGhIjKlMnOpQrStUvWxYz'
  );
  assert.equal(
    extractDriveFolderId('1AbCdEfGhIjKlMnOpQrStUvWxYz'),
    '1AbCdEfGhIjKlMnOpQrStUvWxYz'
  );

  const drivePayload = buildGASDriveUploadPayload({
    spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    driveFolderId: 'https://drive.google.com/drive/folders/1FolderBuktiSurat999?usp=drive_link',
    driveFolderName: 'AR_Tracker_Bukti_Surat_Diterima',
    recordId: 'TRX-9482-B2A',
    invoiceNo: 'AR-2025-0891',
    companyName: 'PT Surya Perkasa Abadi',
    fileName: 'Bukti_Terima_AR-2025-0891.pdf',
    mimeType: 'application/pdf',
    fileSize: '142 KB',
    base64Data: 'data:application/pdf;base64,JVBERi0xLjQK',
    receiverName: 'Bpk. Hendra (Finance)',
    receiptDate: '2025-05-15',
    notes: 'Cap basah diterima',
    markComplete: true,
    actor: 'rina.purnama',
  });
  assert.equal(drivePayload.action, 'uploadDriveFile');
  assert.equal(drivePayload.driveFolderId, '1FolderBuktiSurat999');
  assert.equal(drivePayload.base64Data, 'JVBERi0xLjQK');
});

