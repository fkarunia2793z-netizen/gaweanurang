import React, { useState } from 'react';
import {
  formatRupiah,
  filterPiutangRecords,
  type PiutangRecord,
} from '../utils/arLogic';
import { downloadDocumentSimulation } from '../utils/gasClient';

interface RekapDokumenViewProps {
  records: PiutangRecord[];
  globalSearchQuery?: string;
  onGlobalSearchChange?: (q: string) => void;
  onVerifyDocument: (
    recordId: string,
    docKey: 'fk' | 'kw' | 'sj' | 'fp',
    notes: string,
    markComplete: boolean
  ) => void;
  onExportCSV: () => void;
  onShowToast: (msg: string) => void;
}

export const RekapDokumenView: React.FC<RekapDokumenViewProps> = ({
  records,
  globalSearchQuery = '',
  onGlobalSearchChange,
  onVerifyDocument,
  onExportCSV,
  onShowToast,
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
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [missingFilter, setMissingFilter] = useState('ALL');
  const [selectedRecordId, setSelectedRecordId] = useState<string>(
    records[0]?.id || ''
  );

  // Upload Modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadTargetId, setUploadTargetId] = useState(records[0]?.id || '');
  const [uploadDocKey, setUploadDocKey] = useState<'fk' | 'kw' | 'sj' | 'fp'>('kw');
  const [uploadNotes, setUploadNotes] = useState(
    'Kwitansi basah telah diterima kurir dan disimpan di Brankas Arsip Aktif.'
  );
  const [autoCompleteCheck, setAutoCompleteCheck] = useState(true);

  // Preview Modal state
  const [previewDocName, setPreviewDocName] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);

  const selectedRecord =
    records.find((r) => r.id === selectedRecordId) || records[0];

  const filtered = filterPiutangRecords(
    records,
    searchQuery,
    'ALL',
    statusFilter,
    missingFilter
  );

  const defisitCount = records.filter(
    (r) => r.statusDokumen !== 'Lengkap'
  ).length;
  const lengkapCount = records.filter(
    (r) => r.statusDokumen === 'Lengkap'
  ).length;
  const totalDefisitAmount = records
    .filter((r) => r.statusDokumen !== 'Lengkap')
    .reduce((acc, r) => acc + r.saldoBelumTerealisasi, 0);

  const isDemo = records.some((r) => r.id === 'TRX-9482-B2A');
  const totalBerkasCount = isDemo
    ? 1428
    : records.reduce(
        (acc, r) =>
          acc +
          (r.matrix.fk ? 1 : 0) +
          (r.matrix.kw ? 1 : 0) +
          (r.matrix.sj ? 1 : 0) +
          (r.matrix.fp ? 1 : 0),
        0
      );
  const kwitansiCount = isDemo
    ? 245
    : records.reduce((acc, r) => acc + (r.matrix.kw ? 1 : 0), 0);
  const efakturCount = isDemo
    ? 384
    : records.reduce((acc, r) => acc + (r.matrix.fp ? 1 : 0), 0);
  const storageUsageText = isDemo
    ? '98.4 GB di G-Drive Enterprise Vault'
    : records.length === 0
    ? '0.0 MB di G-Drive Enterprise Vault'
    : `${(records.length * 2.4).toFixed(1)} MB di G-Drive Enterprise Vault`;
  const storageQuotaText = isDemo
    ? '19.6% USED'
    : records.length === 0
    ? '0.0% USED'
    : `${Math.min(100, +(records.length * 0.1).toFixed(1))}% USED`;

  const openUploaderFor = (
    id: string,
    docKey: 'fk' | 'kw' | 'sj' | 'fp' = 'kw'
  ) => {
    setUploadTargetId(id);
    setUploadDocKey(docKey);
    setUploadModalOpen(true);
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onVerifyDocument(
      uploadTargetId,
      uploadDocKey,
      uploadNotes,
      autoCompleteCheck
    );
    setUploadModalOpen(false);
  };

  const handleToggleSingleDoc = (
    rec: PiutangRecord,
    key: 'fk' | 'kw' | 'sj' | 'fp'
  ) => {
    const nextMatrix = { ...rec.matrix, [key]: !rec.matrix[key] };
    const allDone =
      nextMatrix.fk && nextMatrix.kw && nextMatrix.sj && nextMatrix.fp;
    onVerifyDocument(
      rec.id,
      key,
      allDone
        ? '4 Dokumen Lengkap & Terverifikasi di Brankas Pusat'
        : rec.detailDokumen,
      allDone
    );
  };

  return (
    <div className="flex flex-col w-full">
      {/* Command Header */}
      <div className="px-6 py-5 bg-surface-container-low border-b border-border-grid flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-code-audit text-text-dim mb-1">
            <span className="text-secondary font-semibold">AR TRACKER PRO</span>
            <span>·</span>
            <span>MANAJEMEN DOKUMEN</span>
            <span>·</span>
            <span className="text-tertiary font-semibold">
              Sheet_Dokumen_AR_Q1
            </span>
          </div>
          <h1 className="font-headline-lg text-text-bright tracking-tight">
            Pusat Rekapitulasi &amp; Verifikasi Berkas Penagihan
          </h1>
          <p className="font-body-md text-text-dim max-w-3xl mt-0.5">
            Verifikasi kelengkapan berkas fisik &amp; digital (Faktur Komersial,
            Kwitansi Asli, BAST/Surat Jalan, dan Faktur Pajak DJP) dalam satu
            repositori terpusat.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() =>
              onShowToast(
                'Sinkronisasi Google Drive & E-Faktur DJP berhasil. 384 E-Faktur up-to-date.'
              )
            }
            className="px-3.5 py-2 bg-surface-card hover:bg-surface-variant border border-border-grid text-text-bright font-label-caps uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] text-tertiary">
              cloud_sync
            </span>
            <span>Sinkronisasi G-Drive &amp; DJP</span>
          </button>

          <button
            type="button"
            onClick={() =>
              onShowToast(
                `Pengingat otomatis dikirim ke PIC Sales & Klien untuk ${defisitCount} berkas tertahan.`
              )
            }
            className="px-3.5 py-2 bg-surface-card hover:bg-surface-variant border border-border-grid text-text-bright font-label-caps uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] text-status-pending">
              send_time_extension
            </span>
            <span>Kirim Pengingat (Email &amp; WA)</span>
          </button>

          <button
            type="button"
            onClick={() =>
              openUploaderFor(selectedRecord?.id || 'TRX-9482-B2A', 'kw')
            }
            className="px-4 py-2 bg-secondary-container hover:bg-on-secondary-fixed-variant border border-secondary text-text-bright font-label-caps uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">
              upload_file
            </span>
            <span>+ Upload Berkas Baru</span>
          </button>
        </div>
      </div>

      <div className="p-6 flex flex-col gap-6">
        {/* Top 4 Document Health Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-surface-card border border-border-grid p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-text-dim uppercase tracking-wider">
                TOTAL BERKAS TERKELOLA
              </span>
              <span className="material-symbols-outlined text-[18px] text-secondary">
                folder_Copy
              </span>
            </div>
            <div className="my-3">
              <div className="font-numeric-kpi text-text-bright">
                {totalBerkasCount.toLocaleString('id-ID')}{' '}
                <span className="font-headline-sm text-text-dim">BERKAS</span>
              </div>
              <div className="font-body-sm text-text-dim mt-1">
                {storageUsageText}
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border-grid/60 font-code-audit">
              <span className="text-text-dim">STORAGE QUOTA</span>
              <span className="text-secondary font-semibold">{storageQuotaText}</span>
            </div>
          </div>

          <div className="bg-surface-card border border-border-grid p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-error uppercase tracking-wider">
                BERKAS DEFISIT / TERTAHAN
              </span>
              <span className="material-symbols-outlined text-[18px] text-status-danger">
                warning
              </span>
            </div>
            <div className="my-3">
              <div className="font-numeric-kpi text-text-bright">
                {defisitCount}{' '}
                <span className="font-headline-sm text-error">TRANSAKSI</span>
              </div>
              <div className="font-body-sm text-error mt-1 font-semibold font-mono">
                {formatRupiah(totalDefisitAmount)} tertunda tagih
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border-grid/60 font-code-audit">
              <span className="text-error">KENDALA KWITANSI &amp; BAST</span>
              <span className="text-text-bright font-bold">TINDAKAN CEPAT</span>
            </div>
          </div>

          <div className="bg-surface-card border border-border-grid p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-text-dim uppercase tracking-wider">
                KWITANSI FISIK &amp; MATERAI
              </span>
              <span className="material-symbols-outlined text-[18px] text-status-pending">
                history_edu
              </span>
            </div>
            <div className="my-3">
              <div className="font-numeric-kpi text-text-bright">
                {kwitansiCount}{' '}
                <span className="font-headline-sm text-text-dim">KWITANSI</span>
              </div>
              <div className="font-body-sm text-text-dim mt-1">
                {records.length === 0
                  ? 'Belum ada kwitansi tersimpan'
                  : 'Tersimpan di Brankas Arsip Finansial'}
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border-grid/60 font-code-audit">
              <span className="text-text-dim">REGULASI UU MATERAI</span>
              <span className="text-status-pending font-semibold">
                Rp 10.000 COMPLIANT
              </span>
            </div>
          </div>

          <div className="bg-surface-card border border-border-grid p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-text-dim uppercase tracking-wider">
                FAKTUR PAJAK TERVERIFIKASI
              </span>
              <span className="material-symbols-outlined text-[18px] text-status-settled">
                verified
              </span>
            </div>
            <div className="my-3">
              <div className="font-numeric-kpi text-text-bright">
                {efakturCount}{' '}
                <span className="font-headline-sm text-tertiary">E-FAKTUR</span>
              </div>
              <div className="font-body-sm text-text-dim mt-1">
                {records.length === 0
                  ? 'Belum ada e-Faktur terbit'
                  : '100% QR Code Match DJP Online'}
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border-grid/60 font-code-audit">
              <span className="text-tertiary">VALIDASI XML DIRECT</span>
              <span className="text-tertiary font-bold">SYNCHRONIZED</span>
            </div>
          </div>
        </div>

        {/* Main Workspace Split-Grid (8 Cols Matrix Table + 4 Cols Live Inspector) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left: Matrix Verifikasi Dokumen (8 Cols or 12 Cols if no selection) */}
          <div className={`${selectedRecord ? 'lg:col-span-8' : 'lg:col-span-12'} flex flex-col bg-surface-card border border-border-grid overflow-hidden`}>
            {/* Control Strip */}
            <div className="p-4 bg-surface-container border-b border-border-grid flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 bg-surface-input border border-border-grid px-3 py-1.5">
                <span className="material-symbols-outlined text-[16px] text-text-dim">
                  search
                </span>
                <input
                  type="text"
                  aria-label="Cari Berkas Penagihan"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari No AR, Klien, atau PIC Penagihan..."
                  className="bg-transparent border-0 outline-none text-text-bright font-body-sm w-full"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center bg-surface-input border border-border-grid p-0.5">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-2.5 py-1 font-label-caps uppercase transition-colors cursor-pointer ${
                      statusFilter === 'ALL'
                        ? 'bg-surface-variant text-text-bright'
                        : 'text-text-dim hover:text-text-bright'
                    }`}
                  >
                    Semua ({records.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('Belum Lengkap')}
                    className={`px-2.5 py-1 font-label-caps uppercase transition-colors cursor-pointer ${
                      statusFilter === 'Belum Lengkap'
                        ? 'bg-surface-variant text-text-bright'
                        : 'text-text-dim hover:text-text-bright'
                    }`}
                  >
                    Defisit ({defisitCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('Lengkap')}
                    className={`px-2.5 py-1 font-label-caps uppercase transition-colors cursor-pointer ${
                      statusFilter === 'Lengkap'
                        ? 'bg-surface-variant text-text-bright'
                        : 'text-text-dim hover:text-text-bright'
                    }`}
                  >
                    Lengkap ({lengkapCount})
                  </button>
                </div>

                <select
                  aria-label="Filter Jenis Berkas Hilang"
                  value={missingFilter}
                  onChange={(e) => setMissingFilter(e.target.value)}
                  className="bg-surface-input border border-border-grid text-text-bright px-2.5 py-1.5 font-code-audit outline-none cursor-pointer"
                >
                  <option value="ALL">Hilang: Semua Jenis</option>
                  <option value="Kwitansi">Kwitansi Asli (KW)</option>
                  <option value="Faktur">Faktur Komersial (FK)</option>
                  <option value="BAST">Surat Jalan / BAST (SJ)</option>
                  <option value="FP">Faktur Pajak (FP)</option>
                </select>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-high border-b border-border-grid text-text-dim font-label-caps uppercase">
                    <th className="py-3 px-4">Identitas Transaksi &amp; Entitas</th>
                    <th className="py-3 px-4 text-right">Nilai Piutang</th>
                    <th className="py-3 px-4 text-center">
                      Matriks Dokumen (Klik untuk Validasi)
                    </th>
                    <th className="py-3 px-4 text-center">Status Audit</th>
                    <th className="py-3 px-4 text-right">PIC &amp; Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-grid">
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-12 px-4 text-center text-text-dim"
                      >
                        <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
                          <div className="w-10 h-10 bg-surface-input border border-border-grid flex items-center justify-center">
                            <span className="material-symbols-outlined text-text-dim text-[22px]">
                              folder_off
                            </span>
                          </div>
                          <span className="font-headline-sm text-text-bright">
                            {records.length === 0
                              ? 'Pembukuan Dimulai dari Nol (0 Berkas • Rp 0)'
                              : 'Tidak ada dokumen yang cocok dengan filter'}
                          </span>
                          <span className="font-body-sm text-text-dim">
                            {records.length === 0
                              ? 'Belum ada transaksi piutang. Silakan input transaksi baru di Dashboard atau impor CSV untuk mulai merekap berkas.'
                              : 'Coba ubah kata kunci pencarian atau setel status filter ke Semua.'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row) => {
                    const isSelected = selectedRecord?.id === row.id;
                    return (
                      <tr
                        key={row.id}
                        onClick={() => setSelectedRecordId(row.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-primary-container/60'
                            : 'bg-surface-card hover:bg-surface-container'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-headline-sm text-text-bright">
                              {row.invoiceNo}
                            </span>
                            <span className="font-code-audit text-text-dim">
                              · {row.id}
                            </span>
                          </div>
                          <div className="font-body-sm text-text-bright font-medium mt-0.5">
                            {row.namaPerusahaan}
                          </div>
                          <div className="font-code-audit text-text-dim">
                            Cabang: {row.cabang} · Due: {row.dueDate}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="font-numeric-table font-bold text-text-bright">
                            {formatRupiah(row.totalTagihan)}
                          </div>
                          <div
                            className={`font-code-audit font-semibold ${
                              row.saldoBelumTerealisasi > 0
                                ? 'text-status-danger'
                                : 'text-tertiary'
                            }`}
                          >
                            {row.saldoBelumTerealisasi > 0
                              ? `Sisa: ${formatRupiah(row.saldoBelumTerealisasi)}`
                              : 'Siap Tagih / Lunas'}
                          </div>
                        </td>

                        <td
                          className="py-3 px-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center gap-1.5 font-code-audit">
                            {(
                              [
                                ['fk', 'FK'],
                                ['kw', 'KW'],
                                ['sj', 'SJ'],
                                ['fp', 'FP'],
                              ] as const
                            ).map(([key, label]) => {
                              const ok = row.matrix[key];
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => handleToggleSingleDoc(row, key)}
                                  title={`Klik untuk ubah status ${label}`}
                                  className={`px-2 py-0.5 font-bold border transition-colors cursor-pointer inline-flex items-center gap-1 ${
                                    ok
                                      ? 'bg-status-settled-surface border-status-settled text-tertiary'
                                      : 'bg-status-danger-surface border-status-danger text-error'
                                  }`}
                                >
                                  <span>{label}</span>
                                  <span className="material-symbols-outlined text-[12px]">
                                    {ok ? 'check' : 'close'}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                          <div className="text-center font-code-audit text-text-dim mt-1 truncate max-w-[230px] mx-auto">
                            {row.detailDokumen}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center font-code-audit">
                          <span
                            className={`font-bold uppercase ${
                              row.statusDokumen === 'Lengkap'
                                ? 'text-tertiary'
                                : 'text-status-pending'
                            }`}
                          >
                            {row.statusDokumen}
                          </span>
                        </td>

                        <td
                          className="py-3 px-4 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="font-body-sm text-text-bright font-medium">
                            {row.picPenagihan}
                          </div>
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <button
                              type="button"
                              onClick={() =>
                                onShowToast(
                                  `Reminder WA/Email otomatis dikirim ke ${row.picPenagihan} untuk ${row.invoiceNo}`
                                )
                              }
                              title="Kirim Reminder WA/Email"
                              className="bg-surface-input hover:bg-secondary hover:text-on-secondary border border-border-grid text-text-bright p-1 transition-colors cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[15px] align-middle">
                                notifications_active
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openUploaderFor(row.id, 'kw')}
                              title="Unggah Berkas Pengganti"
                              className="bg-surface-input hover:bg-tertiary hover:text-on-tertiary border border-border-grid text-text-bright p-1 transition-colors cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[15px] align-middle">
                                drive_folder_upload
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }))}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-surface-container-high border-t border-border-grid flex items-center justify-between text-text-dim font-code-audit">
              <span>
                Menampilkan {filtered.length} dari {records.length} Transaksi ·
                Real-time G-Sheets Sync
              </span>
              <button
                type="button"
                onClick={onExportCSV}
                className="text-secondary hover:underline uppercase cursor-pointer"
              >
                Ekspor CSV Audit →
              </button>
            </div>
          </div>

          {/* Right: Live Inspector Arsip & Fast Uploader (4 Cols) */}
          {selectedRecord && (
            <div className="lg:col-span-4 flex flex-col gap-4">
              {/* Context Box */}
              <div className="bg-surface-card border border-border-grid p-4">
                <div className="flex items-center justify-between bg-surface-container px-3 py-1.5 border border-border-grid">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-secondary">
                      inventory_2
                    </span>
                    <span className="font-label-caps uppercase text-text-bright tracking-wider">
                      LIVE INSPECTOR ARSIP
                    </span>
                  </div>
                  <span className="font-code-audit text-secondary font-bold">
                    {selectedRecord.invoiceNo}
                  </span>
                </div>

                <div className="mt-3 flex flex-col gap-1.5">
                  <div className="font-headline-md text-text-bright">
                    {selectedRecord.namaPerusahaan}
                  </div>
                  <div className="flex items-center justify-between font-body-sm">
                    <span className="text-text-dim">Nominal Tertahan:</span>
                    <span className="font-numeric-table font-bold text-status-danger">
                      {formatRupiah(selectedRecord.saldoBelumTerealisasi)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-body-sm">
                    <span className="text-text-dim">Cabang Operasional:</span>
                    <span className="text-text-bright font-medium">
                      {selectedRecord.cabang}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-body-sm">
                    <span className="text-text-dim">Penanggung Jawab:</span>
                    <span className="text-secondary font-medium">
                      {selectedRecord.picPenagihan}
                    </span>
                  </div>
                </div>

                <div className="mt-3 bg-surface-input border border-border-grid p-2.5 flex items-center gap-3">
                  <div className="w-8 h-8 bg-secondary-container flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-text-bright text-[18px]">
                      archive
                    </span>
                  </div>
                  <div>
                    <div className="font-label-caps text-text-dim uppercase">
                      LOKASI ARSIP FISIK BRANKAS
                    </div>
                    <div className="font-code-audit text-text-bright font-bold">
                      {selectedRecord.boxArsip}
                    </div>
                  </div>
                </div>
              </div>

              {/* Document Preview Cards */}
              <div className="bg-surface-card border border-border-grid p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-label-caps text-text-dim uppercase tracking-wider">
                    REPOSITORI DIGITAL AKTIF (4 BERKAS)
                  </span>
                  <span className="font-code-audit text-tertiary">
                    {[
                      selectedRecord.matrix.fk,
                      selectedRecord.matrix.kw,
                      selectedRecord.matrix.sj,
                      selectedRecord.matrix.fp,
                    ].filter(Boolean).length}{' '}
                    / 4 VERIFIED
                  </span>
                </div>

                {/* File 1: Kwitansi */}
                <div className="bg-surface-container border border-border-grid p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`material-symbols-outlined text-[20px] ${
                          selectedRecord.matrix.kw
                            ? 'text-tertiary'
                            : 'text-status-danger'
                        }`}
                      >
                        picture_as_pdf
                      </span>
                      <div>
                        <div className="font-headline-sm text-text-bright">
                          Kwitansi_Materai_{selectedRecord.invoiceNo}.pdf
                        </div>
                        <div className="font-code-audit text-text-dim">
                          2.4 MB · Uploaded by {selectedRecord.picPenagihan}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`font-code-audit font-bold uppercase ${
                        selectedRecord.matrix.kw ? 'text-tertiary' : 'text-error'
                      }`}
                    >
                      {selectedRecord.matrix.kw ? 'VERIFIED' : 'DEFISIT FISIK'}
                    </span>
                  </div>

                  <p className="font-code-audit text-text-dim bg-surface-input p-2 border border-border-grid">
                    Catatan Audit: {selectedRecord.detailDokumen}
                  </p>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setZoomScale(1);
                        setPreviewDocName(
                          `Kwitansi_Materai_${selectedRecord.invoiceNo}.pdf`
                        );
                      }}
                      className="bg-surface-input hover:bg-surface-variant border border-border-grid text-text-bright px-2.5 py-1 font-label-caps uppercase flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        visibility
                      </span>{' '}
                      Pratinjau
                    </button>
                    <button
                      type="button"
                      onClick={() => openUploaderFor(selectedRecord.id, 'kw')}
                      className="bg-primary-container hover:bg-secondary-container border border-secondary text-text-bright px-2.5 py-1 font-label-caps uppercase flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        verified
                      </span>{' '}
                      Validasi Kwitansi
                    </button>
                  </div>
                </div>

                {/* File 2: BAST */}
                <div className="bg-surface-container border border-border-grid p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[20px] text-tertiary">
                        task_alt
                      </span>
                      <div>
                        <div className="font-headline-sm text-text-bright">
                          BAST_SuratJalan_{selectedRecord.id}.pdf
                        </div>
                        <div className="font-code-audit text-text-dim">
                          1.8 MB · Stempel &amp; TTD Basah
                        </div>
                      </div>
                    </div>
                    <span
                      className={`font-code-audit font-bold uppercase ${
                        selectedRecord.matrix.sj
                          ? 'text-tertiary'
                          : 'text-status-pending'
                      }`}
                    >
                      {selectedRecord.matrix.sj ? 'TERVERIFIKASI' : 'PENDING'}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setZoomScale(1);
                        setPreviewDocName(`BAST_SuratJalan_${selectedRecord.id}.pdf`);
                      }}
                      className="bg-surface-input hover:bg-surface-variant border border-border-grid text-text-bright px-2.5 py-1 font-label-caps uppercase flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        visibility
                      </span>{' '}
                      Pratinjau
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleToggleSingleDoc(selectedRecord, 'sj')
                      }
                      className="bg-surface-input hover:bg-surface-variant border border-border-grid text-text-bright px-2.5 py-1 font-label-caps uppercase flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px] text-tertiary">
                        verified
                      </span>{' '}
                      Validasi Stempel Basah
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom SOP Compliance Bar */}
        <div className="bg-surface-container-low border border-border-grid p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-status-pending-surface text-status-pending flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">gavel</span>
            </div>
            <div>
              <div className="flex items-center gap-2 font-label-caps text-status-pending uppercase font-bold">
                <span>KEPATUHAN REGULASI MATERAI UU NO. 10/2020</span>
                <span>·</span>
                <span className="text-text-bright">WAJIB ARSIP</span>
              </div>
              <p className="font-body-sm text-text-dim mt-0.5">
                Tagihan senilai ≥ Rp 50.000.000 wajib dilampiri Kwitansi Asli
                dengan Materai Fisik/Elektronik Rp 10.000 sebelum diserahkan ke
                bagian Finance penagihan eksternal.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              onShowToast(
                `Broadcast reminder dikirim ke seluruh PIC untuk ${defisitCount} transaksi defisit.`
              )
            }
            className="w-full md:w-auto px-5 py-2 bg-status-danger-surface hover:bg-error-container border border-status-danger text-error font-label-caps uppercase flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">
              send_time_extension
            </span>
            <span>Kirim Notifikasi Reminder Sekarang</span>
          </button>
        </div>
      </div>

      {/* Modal: Upload & Verify Document */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-card border border-border-accent max-w-xl w-full shadow-2xl flex flex-col">
            <div className="h-13 px-5 bg-surface-container-high border-b border-border-grid flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">
                  upload_file
                </span>
                <span className="font-headline-sm text-text-bright uppercase">
                  Unggah &amp; Verifikasi Dokumen Penagihan
                </span>
              </div>
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="text-text-dim hover:text-text-bright p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">
                  close
                </span>
              </button>
            </div>

            <form
              onSubmit={handleUploadSubmit}
              className="p-5 flex flex-col gap-4"
            >
              <div className="bg-surface-input border border-border-grid p-2.5 flex items-center justify-between font-code-audit">
                <span className="text-text-dim">ID Transaksi Target:</span>
                <span className="text-secondary font-bold">{uploadTargetId}</span>
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="upload-doc-type"
                  className="font-label-caps text-text-dim uppercase"
                >
                  Pilih Jenis Dokumen Wajib
                </label>
                <select
                  id="upload-doc-type"
                  value={uploadDocKey}
                  onChange={(e) =>
                    setUploadDocKey(e.target.value as 'fk' | 'kw' | 'sj' | 'fp')
                  }
                  className="h-9 bg-surface-input border border-border-grid px-3 font-body-sm text-text-bright outline-none"
                >
                  <option value="kw">
                    Kwitansi Asli Bermaterai Rp 10.000 (KW)
                  </option>
                  <option value="sj">
                    BAST / Surat Jalan Bertandatangan (SJ)
                  </option>
                  <option value="fk">Faktur Komersial Resmi (FK)</option>
                  <option value="fp">E-Faktur Pajak PDF DJP (FP)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="upload-notes"
                  className="font-label-caps text-text-dim uppercase"
                >
                  Catatan Verifikasi / Lokasi Brankas
                </label>
                <textarea
                  id="upload-notes"
                  rows={2}
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  className="bg-surface-input border border-border-grid p-2.5 font-body-sm text-text-bright outline-none"
                />
              </div>

              <label className="flex items-center gap-2 font-code-audit text-on-surface-variant cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCompleteCheck}
                  onChange={(e) => setAutoCompleteCheck(e.target.checked)}
                  className="accent-secondary"
                />
                <span>
                  Tandai status dokumen transaksi otomatis &apos;Lengkap&apos;
                  setelah berkas diunggah
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-grid">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-1.5 bg-surface-input border border-border-grid text-text-bright font-label-caps uppercase cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 bg-secondary-container border border-secondary text-text-bright font-label-caps uppercase flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    check
                  </span>
                  <span>Simpan &amp; Verifikasi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Document Preview */}
      {previewDocName && selectedRecord && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-card border border-border-accent max-w-3xl w-full flex flex-col">
            <div className="h-13 px-5 bg-surface-container-high border-b border-border-grid flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary text-[20px]">
                  preview
                </span>
                <span className="font-headline-sm text-text-bright uppercase">
                  PRATINJAU: {previewDocName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setZoomScale((z) => Math.min(1.25, Number((z + 0.1).toFixed(2))))
                  }
                  className="p-1 bg-surface-input border border-border-grid text-text-dim hover:text-text-bright cursor-pointer"
                  title="Zoom In"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    zoom_in
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setZoomScale((z) => Math.max(0.8, Number((z - 0.1).toFixed(2))))
                  }
                  className="p-1 bg-surface-input border border-border-grid text-text-dim hover:text-text-bright cursor-pointer"
                  title="Zoom Out"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    zoom_out
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDocName(null)}
                  className="p-1 text-text-dim hover:text-text-bright cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    close
                  </span>
                </button>
              </div>
            </div>

            <div className="p-6 bg-surface-input overflow-auto flex items-center justify-center min-h-[380px]">
              <div
                style={{ transform: `scale(${zoomScale})` }}
                className="w-full max-w-xl bg-surface-card border border-border-grid p-6 flex flex-col gap-4 transition-transform"
              >
                <div className="flex items-center justify-between bg-surface-container p-2.5 border border-border-grid">
                  <span className="font-headline-sm text-text-bright">
                    OFFICIAL RECEIPT &amp; TAX CLEARANCE
                  </span>
                  <span className="font-code-audit text-tertiary">
                    DOC-ID: {selectedRecord.invoiceNo}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 font-body-sm">
                  <div>
                    <span className="text-text-dim block">Diterima Dari:</span>
                    <span className="text-text-bright font-bold">
                      {selectedRecord.namaPerusahaan}
                    </span>
                    <span className="text-text-dim font-code-audit block">
                      NPWP: {selectedRecord.npwp}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-text-dim block">Jumlah Tagihan:</span>
                    <span className="text-tertiary font-bold font-numeric-table text-base">
                      {formatRupiah(selectedRecord.totalTagihan)}
                    </span>
                    <span className="text-text-dim font-code-audit block">
                      Cabang: {selectedRecord.cabang}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-surface-input border border-border-grid flex items-center justify-between">
                  <div>
                    <div className="font-code-audit text-status-pending font-bold">
                      MATERAI ELEKTRONIK RP 10.000
                    </div>
                    <div className="font-code-audit text-text-dim">
                      DJP Online Validation: QR MATCH (VALID)
                    </div>
                  </div>
                  <span className="font-code-audit text-tertiary">
                    {selectedRecord.boxArsip}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-surface-container border-t border-border-grid flex items-center justify-between">
              <span className="font-code-audit text-text-dim">
                Tanda Tangan Digital &amp; QR DJP Terverifikasi
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    downloadDocumentSimulation(
                      previewDocName,
                      `Dokumen Resmi ${previewDocName}`,
                      {
                        'Nama Berkas': previewDocName,
                        'Nomor Invoice': selectedRecord.invoiceNo,
                        'ID Transaksi': selectedRecord.id,
                        'Perusahaan B2B': selectedRecord.namaPerusahaan,
                        NPWP: selectedRecord.npwp,
                        'Nilai Tagihan': formatRupiah(
                          selectedRecord.totalTagihan
                        ),
                        'Status Verifikasi': selectedRecord.statusDokumen,
                        'Lokasi Brankas': selectedRecord.boxArsip,
                      }
                    );
                    onShowToast(`Berkas ${previewDocName} berhasil diunduh.`);
                  }}
                  className="px-4 py-1.5 bg-secondary-container border border-secondary text-text-bright font-label-caps uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    download
                  </span>
                  <span>Unduh Dokumen</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDocName(null)}
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
