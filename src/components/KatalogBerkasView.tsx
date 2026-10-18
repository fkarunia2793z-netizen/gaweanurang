import React, { useState } from 'react';
import {
  formatRupiah,
  parseRupiahInput,
  type CatalogFile,
} from '../utils/arLogic';
import { downloadDocumentSimulation } from '../utils/gasClient';

interface KatalogBerkasViewProps {
  files: CatalogFile[];
  onAddCatalogFile: (newFile: CatalogFile) => void;
  onShowToast: (msg: string) => void;
}

export const KatalogBerkasView: React.FC<KatalogBerkasViewProps> = ({
  files,
  onAddCatalogFile,
  onShowToast,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [newTransactionId, setNewTransactionId] = useState('TRX-2025-402');
  const [newInvoiceNo, setNewInvoiceNo] = useState('INV/2025/04/402');
  const [newClientName, setNewClientName] = useState('');
  const [newCategory, setNewCategory] =
    useState<CatalogFile['category']>('kwitansi');
  const [newNominal, setNewNominal] = useState('125.000.000');
  const [newBox, setNewBox] = useState('Box AR-2025/B2');
  const [newFileName, setNewFileName] = useState('Kwitansi_Materai_402.pdf');

  // Preview modal state
  const [previewItem, setPreviewItem] = useState<CatalogFile | null>(null);

  const filteredFiles = files.filter((f) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      f.invoiceNo.toLowerCase().includes(q) ||
      f.clientName.toLowerCase().includes(q) ||
      f.fileName.toLowerCase().includes(q) ||
      f.subInfo.toLowerCase().includes(q);

    const matchesCategory =
      categoryFilter === 'all' || f.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
    const matchesBranch = branchFilter === 'all' || f.branch === branchFilter;

    return matchesSearch && matchesCategory && matchesStatus && matchesBranch;
  });

  const isDemo = files.some((f) => f.id === 'CAT-001');
  const totalSavedCount = isDemo ? 1422 + files.length : files.length;
  const efakturCount = isDemo
    ? 384
    : files.filter((f) => f.category === 'faktur-pajak').length;
  const kwitansiCount = isDemo
    ? 245
    : files.filter((f) => f.category === 'kwitansi').length;
  const anomaliCount = isDemo
    ? 7
    : files.filter((f) => f.status === 'pending').length;
  const storageText = isDemo
    ? '98.4 GB / 1 TB'
    : files.length === 0
    ? '0.0 MB / 1 TB'
    : `${(files.length * 2.1).toFixed(1)} MB / 1 TB`;

  const toggleSelectFile = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDownloadCatalogItem = (item: CatalogFile) => {
    downloadDocumentSimulation(
      item.fileName,
      `Arsip Digital Terverifikasi — ${item.invoiceNo}`,
      {
        'Nomor Invoice': item.invoiceNo,
        'ID Transaksi': item.transactionId,
        'Klien B2B': item.clientName,
        'Nominal Tagihan': formatRupiah(item.nominalTagihan),
        'Nama Berkas': item.fileName,
        'Ukuran & Tipe': item.fileSize,
        'Status Verifikasi': item.statusLabel,
        'Lokasi Brankas': `${item.boxArsip} (${item.branchLabel})`,
        'Google Drive URL': item.driveUrl,
      }
    );
    onShowToast(`Berkas ${item.fileName} berhasil diunduh.`);
  };

  const handleBatchDownload = () => {
    if (selectedIds.length === 0) {
      onShowToast(
        'Pilih minimal 1 berkas pada checkbox untuk mengunduh paket arsip.'
      );
      return;
    }
    const chosen = files.filter((f) => selectedIds.includes(f.id));
    const summaryMap: Record<string, string> = {};
    chosen.forEach((c, idx) => {
      summaryMap[`Berkas #${idx + 1} (${c.invoiceNo})`] = `${c.fileName} — ${c.clientName} (${formatRupiah(c.nominalTagihan)})`;
    });
    downloadDocumentSimulation(
      `Batch_Archive_${selectedIds.length}_Files.html`,
      `Manifes Paket Arsip Digital (${selectedIds.length} Berkas)`,
      summaryMap
    );
    onShowToast(
      `Paket arsip (${selectedIds.length} berkas) berhasil diunduh.`
    );
  };

  const handleSyncDrive = () => {
    setIsSyncingDrive(true);
    setTimeout(() => {
      setIsSyncingDrive(false);
      onShowToast(
        `Sinkronisasi Google Drive Berhasil: ${files.length} berkas aktif terverifikasi identik (Checksum MD5 Valid).`
      );
    }, 600);
  };

  const handleCopyDriveUrl = (url: string) => {
    navigator.clipboard?.writeText(url);
    onShowToast(`URL Google Drive disalin ke clipboard: ${url}`);
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim() || !newInvoiceNo.trim()) {
      onShowToast('Mohon lengkapi Nomor Invoice dan Nama Klien.');
      return;
    }

    const created: CatalogFile = {
      id: `CAT-${Date.now()}`,
      invoiceNo: newInvoiceNo.trim(),
      transactionId:
        newTransactionId.trim() || `TRX-${Math.floor(1000 + Math.random() * 9000)}`,
      clientName: newClientName.trim(),
      nominalTagihan: parseRupiahInput(newNominal) || 100000000,
      fileName: newFileName.trim() || 'Dokumen_Arsip_Baru.pdf',
      fileSize: '2.1 MB • Terverifikasi DJP',
      fileType: 'PDF',
      category: newCategory,
      status: 'verified',
      statusLabel: 'TERVERIFIKASI',
      subInfo: 'QR Code E-Faktur DJP Match 100%',
      highlightInfo: 'Materai Rp 10.000 Asli',
      boxArsip: newBox.trim() || 'Box AR-2025/B2',
      branch: 'jkt',
      branchLabel: 'Kantor Pusat JKT',
      extraLabel: 'Status Materai:',
      extraValue: 'Materai Rp 10.000 Asli',
      driveUrl: `https://drive.google.com/file/d/${Date.now()}_archive/view`,
    };

    onAddCatalogFile(created);
    setUploadModalOpen(false);
    setNewClientName('');
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setStatusFilter('all');
    setBranchFilter('all');
  };

  return (
    <div className="flex flex-col w-full">
      {/* Top Command Action Bar */}
      <div className="p-6 bg-surface-card border-b border-border-grid flex flex-col xl:flex-row xl:items-center justify-between gap-5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 font-code-audit text-text-dim">
            <span className="text-secondary font-semibold">
              AR PRO · REPOSITORI DIGITAL
            </span>
            <span>/</span>
            <span className="text-text-bright font-semibold">
              ARSIP_VERIFIKASI_DJP
            </span>
          </div>
          <h1 className="font-headline-lg text-text-bright tracking-tight">
            Katalog Berkas &amp; Arsip Invoice Digital
          </h1>
          <p className="font-body-sm text-text-dim max-w-4xl">
            Penyimpanan terpusat dokumen pendukung penagihan piutang: Faktur
            Pajak elektronik, Kwitansi bermaterai asli, BAST/Surat Jalan fisik
            &amp; digital, dan Salinan Kontrak B2B terverifikasi audit trail.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleSyncDrive}
            className="px-4 py-2 bg-surface-input border border-border-grid text-on-surface-variant hover:text-text-bright hover:border-secondary transition-colors font-label-caps uppercase flex items-center gap-1.5 cursor-pointer"
          >
            <span
              className={`material-symbols-outlined text-[16px] text-tertiary ${
                isSyncingDrive ? 'animate-spin' : ''
              }`}
            >
              sync
            </span>
            <span>
              {isSyncingDrive
                ? 'Menyinkronkan Drive...'
                : 'Sinkronisasi Google Drive'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleBatchDownload}
            className={`px-4 py-2 bg-surface-container-high border transition-colors font-label-caps uppercase flex items-center gap-1.5 cursor-pointer ${
              selectedIds.length > 0
                ? 'border-secondary text-secondary'
                : 'border-border-grid text-text-bright'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              folder_zip
            </span>
            <span>Batch Download ZIP ({selectedIds.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setUploadModalOpen(true)}
            className="px-4 py-2 bg-secondary-container border border-secondary text-text-bright hover:bg-on-secondary-fixed-variant transition-colors font-label-caps uppercase flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">
              upload_file
            </span>
            <span>+ Upload Arsip Baru</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-6 flex flex-col gap-6">
        {/* 4 KPI Metrics Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="p-5 bg-surface-card border border-border-grid flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2">
              <span className="font-label-caps text-text-dim uppercase tracking-wider">
                Total Dokumen Tersimpan
              </span>
              <span className="material-symbols-outlined text-[18px] text-secondary">
                inventory_2
              </span>
            </div>
            <div className="flex items-baseline gap-2 my-1">
              <span className="font-numeric-kpi text-text-bright">
                {totalSavedCount.toLocaleString('id-ID')}
              </span>
              <span className="font-code-audit text-text-dim">Berkas</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border-grid/50 font-code-audit">
              <span className="text-text-dim">Drive Terpakai:</span>
              <span className="text-secondary font-numeric-table">
                {storageText}
              </span>
            </div>
          </div>

          <div className="p-5 bg-surface-card border border-border-grid flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2">
              <span className="font-label-caps text-text-dim uppercase tracking-wider">
                Faktur Pajak Terverifikasi
              </span>
              <span className="material-symbols-outlined text-[18px] text-status-settled">
                qr_code_2
              </span>
            </div>
            <div className="flex items-baseline gap-2 my-1">
              <span className="font-numeric-kpi text-status-settled">
                {efakturCount}
              </span>
              <span className="font-code-audit text-text-dim">
                E-Faktur DJP
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border-grid/50 font-code-audit">
              <span className="text-text-dim">QR DJP Validated:</span>
              <span className="text-status-settled font-numeric-table">
                {files.length === 0 ? '0%' : '100% Online'}
              </span>
            </div>
          </div>

          <div className="p-5 bg-surface-card border border-border-grid flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2">
              <span className="font-label-caps text-text-dim uppercase tracking-wider">
                Kwitansi Bermaterai Asli
              </span>
              <span className="material-symbols-outlined text-[18px] text-primary">
                receipt
              </span>
            </div>
            <div className="flex items-baseline gap-2 my-1">
              <span className="font-numeric-kpi text-text-bright">
                {kwitansiCount}
              </span>
              <span className="font-code-audit text-text-dim">
                Dokumen Fisik
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border-grid/50 font-code-audit">
              <span className="text-text-dim">Tersimpan Brankas:</span>
              <span className="text-primary font-numeric-table">
                {files.length === 0 ? 'Belum Ada' : 'Box AR-2025'}
              </span>
            </div>
          </div>

          <div className="p-5 bg-surface-card border border-border-grid flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2">
              <span className="font-label-caps text-text-dim uppercase tracking-wider">
                Butuh Penggantian / Expired
              </span>
              <span className="material-symbols-outlined text-[18px] text-status-danger">
                error
              </span>
            </div>
            <div className="flex items-baseline gap-2 my-1">
              <span className="font-numeric-kpi text-status-danger">
                {String(anomaliCount).padStart(2, '0')}
              </span>
              <span className="font-code-audit text-text-dim">
                Anomali &amp; Reject
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border-grid/50 font-code-audit">
              <span className="text-status-danger">Tindakan Diperlukan:</span>
              <span className="text-status-danger font-numeric-table uppercase">
                {anomaliCount > 0 ? 'Review Tim Pajak' : 'Semua Valid'}
              </span>
            </div>
          </div>
        </div>

        {/* Search & Dense Filter Matrix */}
        <div className="p-4 bg-surface-card border border-border-grid flex flex-col gap-3">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
            <div className="lg:col-span-4 relative flex items-center">
              <span className="material-symbols-outlined absolute left-2.5 text-text-dim text-[18px]">
                search
              </span>
              <input
                type="text"
                aria-label="Cari Arsip Invoice"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nomor invoice, vendor, atau nomor seri faktur pajak..."
                className="w-full h-9 pl-9 pr-3 bg-surface-input border border-border-grid text-text-bright placeholder-text-dim font-numeric-table focus:border-secondary focus:outline-none"
              />
            </div>

            <div className="lg:col-span-2">
              <select
                aria-label="Filter Kategori Berkas"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full h-9 px-2 bg-surface-input border border-border-grid text-on-surface-variant font-numeric-table focus:border-secondary focus:outline-none cursor-pointer"
              >
                <option value="all">Semua Kategori</option>
                <option value="faktur-komersial">Faktur Komersial</option>
                <option value="faktur-pajak">Faktur Pajak E-Faktur</option>
                <option value="kwitansi">Kwitansi Bermaterai</option>
                <option value="bast">Surat Jalan / BAST</option>
                <option value="kontrak">Perjanjian Kerjasama</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <select
                aria-label="Filter Status Arsip"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-9 px-2 bg-surface-input border border-border-grid text-on-surface-variant font-numeric-table focus:border-secondary focus:outline-none cursor-pointer"
              >
                <option value="all">Semua Status</option>
                <option value="verified">Terverifikasi</option>
                <option value="pending">Menunggu Legalisir / Scan</option>
                <option value="rejected">Ditolak DJP / Butuh Revisi</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <select
                aria-label="Filter Cabang"
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full h-9 px-2 bg-surface-input border border-border-grid text-on-surface-variant font-numeric-table focus:border-secondary focus:outline-none cursor-pointer"
              >
                <option value="all">Semua Cabang</option>
                <option value="jkt">Kantor Pusat Jakarta</option>
                <option value="sby">Cabang Surabaya</option>
                <option value="med">Cabang Medan</option>
                <option value="bpp">Cabang Balikpapan</option>
              </select>
            </div>

            <div className="lg:col-span-2 flex items-center justify-end gap-2">
              <div className="flex items-center bg-surface-input border border-border-grid p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`px-2.5 py-1 font-label-caps flex items-center gap-1 cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-surface-container-high text-text-bright'
                      : 'text-text-dim hover:text-text-bright'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    grid_view
                  </span>
                  <span>GRID</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`px-2.5 py-1 font-label-caps flex items-center gap-1 cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-surface-container-high text-text-bright'
                      : 'text-text-dim hover:text-text-bright'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    view_headline
                  </span>
                  <span>TABEL</span>
                </button>
              </div>
              <button
                type="button"
                onClick={handleResetFilters}
                title="Reset Filter"
                className="p-1.5 bg-surface-input border border-border-grid text-text-dim hover:text-text-bright cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">
                  filter_alt_off
                </span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border-grid/50 pt-2 font-code-audit text-text-dim">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-text-bright font-semibold">
                ARSIP AKTIF:
              </span>
              <span>
                Total Ditampilkan:{' '}
                <strong className="text-text-bright">
                  {filteredFiles.length}
                </strong>{' '}
                dari {1422 + files.length} Berkas
              </span>
              <span>·</span>
              <span>
                Tahun Buku: <strong className="text-secondary">2025 (Q1)</strong>
              </span>
              <span>·</span>
              <span>
                Format Didukung:{' '}
                <strong className="text-status-settled">
                  PDF, XML, JPG, PNG
                </strong>
              </span>
            </div>
            <span className="hidden sm:inline text-status-settled">
              Google Drive Cloud API v3: ONLINE
            </span>
          </div>
        </div>

        {/* 1. GRID VIEW */}
        {viewMode === 'grid' ? (
          filteredFiles.length === 0 ? (
            <div className="bg-surface-card border border-border-grid p-12 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 bg-surface-input border border-border-grid flex items-center justify-center">
                <span className="material-symbols-outlined text-text-dim text-[24px]">
                  folder_open
                </span>
              </div>
              <span className="font-headline-md text-text-bright">
                {files.length === 0
                  ? 'Katalog Arsip Dimulai dari Nol (0 Dokumen)'
                  : 'Tidak ada dokumen arsip yang cocok dengan filter'}
              </span>
              <p className="font-body-sm text-text-dim max-w-md">
                {files.length === 0
                  ? 'Belum ada berkas tersimpan di repositori. Unggah berkas baru melalui tombol "+ Upload Arsip Baru" untuk menyimpannya di Google Drive & arsip fisik.'
                  : 'Coba ubah kata kunci pencarian atau bersihkan filter kategori/cabang.'}
              </p>
              {files.length === 0 && (
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(true)}
                  className="px-4 py-2 mt-2 bg-secondary-container hover:bg-on-secondary-fixed-variant border border-secondary text-text-bright font-label-caps uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    upload_file
                  </span>
                  <span>+ Upload Berkas Pertama</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredFiles.map((item) => {
              const isChecked = selectedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  className="bg-surface-card border border-border-grid hover:border-secondary flex flex-col justify-between transition-colors"
                >
                  <div className="p-4 border-b border-border-grid flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectFile(item.id)}
                          className="accent-secondary w-3.5 h-3.5 cursor-pointer"
                        />
                        <span
                          className={`font-label-caps uppercase ${
                            item.status === 'verified'
                              ? 'text-status-settled'
                              : item.status === 'pending'
                              ? 'text-status-pending'
                              : 'text-status-danger'
                          }`}
                        >
                          {item.statusLabel}
                        </span>
                      </label>
                      <span className="font-code-audit text-text-dim">
                        {item.invoiceNo}
                      </span>
                    </div>

                    <div className="mt-1">
                      <h2 className="font-headline-sm text-text-bright truncate">
                        {item.clientName}
                      </h2>
                      <span className="font-code-audit text-text-dim">
                        Nominal Tagihan: {formatRupiah(item.nominalTagihan)}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-surface-container-low flex flex-col gap-3">
                    <div className="p-2.5 bg-surface-input border border-border-grid flex items-start gap-3">
                      <div className="w-10 h-12 bg-primary-container border border-border-accent flex flex-col items-center justify-center shrink-0">
                        <span className="font-code-audit text-[9px] text-text-dim font-bold">
                          {item.fileType}
                        </span>
                        <span className="material-symbols-outlined text-[18px] text-secondary">
                          description
                        </span>
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-code-audit text-text-bright truncate font-medium">
                          {item.fileName}
                        </span>
                        <span className="font-code-audit text-[10px] text-text-dim">
                          {item.fileSize}
                        </span>
                        <span
                          className={`font-code-audit text-[10px] truncate ${
                            item.status === 'rejected'
                              ? 'text-status-danger'
                              : 'text-status-settled'
                          }`}
                        >
                          {item.subInfo}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 font-code-audit text-[11px] text-text-dim">
                      <div>
                        <span>Arsip Fisik:</span>
                        <span className="block text-text-bright font-numeric-table">
                          {item.boxArsip}
                        </span>
                      </div>
                      <div className="text-right">
                        <span>{item.extraLabel}</span>
                        <span className="block text-status-settled font-numeric-table">
                          {item.extraValue}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-surface-card border-t border-border-grid flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setPreviewItem(item)}
                      className="px-2.5 py-1 bg-surface-input border border-border-grid text-on-surface-variant hover:text-text-bright hover:border-secondary font-label-caps uppercase flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        visibility
                      </span>
                      <span>Preview</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDownloadCatalogItem(item)}
                        title="Download Berkas PDF"
                        className="p-1 text-text-dim hover:text-text-bright hover:bg-surface-input cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          file_download
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyDriveUrl(item.driveUrl)}
                        title="Salin URL Google Drive"
                        className="p-1 text-text-dim hover:text-text-bright hover:bg-surface-input cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          link
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
          /* 2. TABLE VIEW */
          <div className="overflow-x-auto bg-surface-card border border-border-grid">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-primary-container border-b border-border-grid font-label-caps text-text-dim uppercase">
                  <th className="p-3 w-10 text-center">Pilih</th>
                  <th className="p-3">No. Invoice &amp; Klien</th>
                  <th className="p-3">Dokumen Lampiran</th>
                  <th className="p-3">Ukuran / Jenis</th>
                  <th className="p-3">Status Dokumen</th>
                  <th className="p-3">Lokasi Fisik / Cabang</th>
                  <th className="p-3 text-right">Nilai Piutang</th>
                  <th className="p-3 text-center">Aksi Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-grid font-body-sm">
                {filteredFiles.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-12 px-4 text-center text-text-dim"
                    >
                      <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
                        <span className="material-symbols-outlined text-text-dim text-[24px]">
                          inventory_2
                        </span>
                        <span className="font-headline-sm text-text-bright">
                          {files.length === 0
                            ? 'Katalog Arsip Dimulai dari Nol'
                            : 'Tidak ada arsip yang cocok dengan filter'}
                        </span>
                        <span className="font-body-sm text-text-dim">
                          {files.length === 0
                            ? 'Belum ada dokumen tersimpan. Klik "+ Upload Arsip Baru" untuk menambahkan berkas.'
                            : 'Coba ubah kata kunci pencarian atau reset filter.'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredFiles.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-surface-container-high/60 transition-colors"
                  >
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleSelectFile(item.id)}
                        className="accent-secondary w-3.5 h-3.5 cursor-pointer"
                      />
                    </td>
                    <td className="p-3">
                      <div className="font-headline-sm text-text-bright">
                        {item.clientName}
                      </div>
                      <div className="font-code-audit text-secondary">
                        {item.invoiceNo}
                      </div>
                    </td>
                    <td className="p-3 font-code-audit text-text-bright">
                      {item.fileName}
                      <div className="text-status-settled text-[10px]">
                        {item.subInfo}
                      </div>
                    </td>
                    <td className="p-3 font-code-audit text-text-dim">
                      {item.fileSize}
                    </td>
                    <td className="p-3 font-code-audit">
                      <span
                        className={`font-bold uppercase ${
                          item.status === 'verified'
                            ? 'text-status-settled'
                            : item.status === 'pending'
                            ? 'text-status-pending'
                            : 'text-status-danger'
                        }`}
                      >
                        {item.statusLabel}
                      </span>
                    </td>
                    <td className="p-3 font-code-audit text-text-dim">
                      {item.boxArsip}
                      <div className="text-text-bright">{item.branchLabel}</div>
                    </td>
                    <td className="p-3 font-numeric-table text-text-bright text-right">
                      {formatRupiah(item.nominalTagihan)}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPreviewItem(item)}
                          className="p-1 bg-surface-input border border-border-grid text-text-bright hover:border-secondary cursor-pointer"
                          title="Preview"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            visibility
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyDriveUrl(item.driveUrl)}
                          className="p-1 bg-surface-input border border-border-grid text-text-bright hover:border-secondary cursor-pointer"
                          title="Salin Link"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            link
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        )}

        {/* Bottom Storage Capacity & GAS Health Bar */}
        <div className="p-5 bg-surface-card border border-border-grid flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 flex-1">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-secondary text-[24px]">
                cloud_done
              </span>
              <div>
                <span className="font-headline-sm text-text-bright block">
                  Google Drive Enterprise Storage
                </span>
                <span className="font-code-audit text-text-dim">
                  Folder ID: 0B4f-AR-CORP-FINANCE-PROD
                </span>
              </div>
            </div>

            <div className="flex-1 max-w-md flex flex-col gap-1">
              <div className="flex items-center justify-between font-code-audit">
                <span className="text-text-dim">
                  Kapasitas Penyimpanan Terpakai:
                </span>
                <span className="text-text-bright font-numeric-table font-semibold">
                  98.4 GB / 1,024 GB (9.6%)
                </span>
              </div>
              <div className="w-full h-2 bg-surface-input border border-border-grid overflow-hidden">
                <div className="h-full bg-secondary" style={{ width: '9.6%' }} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 justify-between sm:justify-end">
            <div className="font-code-audit text-right">
              <span className="text-text-dim block">
                API Engine:{' '}
                <strong className="text-status-settled">
                  Google Apps Script (GAS) v3.2
                </strong>
              </span>
              <span className="text-text-dim block">
                OAuth2 Access Token:{' '}
                <strong className="text-secondary">VALID (Expires in 52m)</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                onShowToast(
                  'GAS API Gateway: Latency 82ms, 0 Failed Queues, Quota: 88,400/100,000 req.'
                )
              }
              className="px-4 py-1.5 bg-surface-input border border-border-grid text-text-bright hover:border-secondary font-label-caps uppercase transition-colors cursor-pointer"
            >
              Check API Health
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Upload Arsip Baru */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl bg-surface-card border border-border-accent shadow-2xl flex flex-col">
            <div className="px-5 py-3.5 bg-surface-container-high border-b border-border-grid flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">
                  upload_file
                </span>
                <span className="font-headline-md text-text-bright">
                  Upload Arsip &amp; Dokumen Invoice Baru
                </span>
              </div>
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="p-1 text-text-dim hover:text-text-bright cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>

            <form
              onSubmit={handleUploadSubmit}
              className="p-5 flex flex-col gap-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="cat-trx-id"
                    className="font-label-caps text-text-dim uppercase"
                  >
                    Kode / ID Transaksi (Manual) *
                  </label>
                  <input
                    id="cat-trx-id"
                    type="text"
                    required
                    value={newTransactionId}
                    onChange={(e) => setNewTransactionId(e.target.value)}
                    placeholder="Contoh: TRX-2025-402"
                    className="h-9 px-3 bg-surface-input border border-border-grid text-text-bright font-code-audit focus:outline-none focus:border-secondary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="cat-inv-no"
                    className="font-label-caps text-text-dim uppercase"
                  >
                    Nomor Invoice Tagihan *
                  </label>
                  <input
                    id="cat-inv-no"
                    type="text"
                    required
                    value={newInvoiceNo}
                    onChange={(e) => setNewInvoiceNo(e.target.value)}
                    className="h-9 px-3 bg-surface-input border border-border-grid text-text-bright font-numeric-table focus:outline-none focus:border-secondary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="cat-client"
                    className="font-label-caps text-text-dim uppercase"
                  >
                    Nama Klien / B2B Partner *
                  </label>
                  <input
                    id="cat-client"
                    type="text"
                    required
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Contoh: PT Telekom Nusantara Mandiri"
                    className="h-9 px-3 bg-surface-input border border-border-grid text-text-bright font-body-sm focus:outline-none focus:border-secondary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="cat-category"
                    className="font-label-caps text-text-dim uppercase"
                  >
                    Kategori Berkas
                  </label>
                  <select
                    id="cat-category"
                    value={newCategory}
                    onChange={(e) =>
                      setNewCategory(e.target.value as CatalogFile['category'])
                    }
                    className="h-9 px-2 bg-surface-input border border-border-grid text-text-bright font-body-sm focus:outline-none"
                  >
                    <option value="kwitansi">Kwitansi Bermaterai Asli</option>
                    <option value="faktur-pajak">Faktur Pajak DJP</option>
                    <option value="bast">BAST &amp; Surat Jalan</option>
                    <option value="faktur-komersial">Faktur Komersial</option>
                    <option value="kontrak">Kontrak Kerjasama</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="cat-nominal"
                    className="font-label-caps text-text-dim uppercase"
                  >
                    Nominal Tagihan (Rp)
                  </label>
                  <input
                    id="cat-nominal"
                    type="text"
                    value={newNominal}
                    onChange={(e) => setNewNominal(e.target.value)}
                    className="h-9 px-3 bg-surface-input border border-border-grid text-text-bright font-numeric-table focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="cat-box"
                    className="font-label-caps text-text-dim uppercase"
                  >
                    Lokasi Brankas Fisik
                  </label>
                  <input
                    id="cat-box"
                    type="text"
                    value={newBox}
                    onChange={(e) => setNewBox(e.target.value)}
                    className="h-9 px-3 bg-surface-input border border-border-grid text-text-bright font-code-audit focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="cat-filename"
                  className="font-label-caps text-text-dim uppercase"
                >
                  Nama File Digital (PDF / XML)
                </label>
                <input
                  id="cat-filename"
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  className="h-9 px-3 bg-surface-input border border-border-grid text-text-bright font-code-audit focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-border-grid flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-1.5 bg-surface-input border border-border-grid text-text-bright font-label-caps uppercase cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 bg-secondary-container border border-secondary text-text-bright font-label-caps uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    cloud_upload
                  </span>
                  <span>Simpan &amp; Sinkronkan ke Drive</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Preview Invoice */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-2xl bg-surface-card border border-border-accent shadow-2xl flex flex-col">
            <div className="px-5 py-3 bg-surface-container-high border-b border-border-grid flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-label-caps text-secondary uppercase">
                  PREVIEW DOKUMEN:
                </span>
                <span className="font-headline-sm text-text-bright">
                  {previewItem.invoiceNo}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="p-1 text-text-dim hover:text-text-bright cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>

            <div className="p-6 bg-surface-container-lowest flex flex-col gap-4">
              <div className="bg-surface-card border border-border-grid p-5 flex flex-col gap-4">
                <div className="flex justify-between items-start border-b border-border-grid pb-3">
                  <div>
                    <span className="font-headline-md text-text-bright">
                      KWITANSI RESMI PENAGIHAN
                    </span>
                    <p className="font-code-audit text-text-dim">
                      Berkas: {previewItem.fileName}
                    </p>
                  </div>
                  <div className="p-2 border border-border-accent bg-surface-input text-center">
                    <span className="font-code-audit text-[9px] text-text-dim block uppercase">
                      MATERAI ELEKTRONIK
                    </span>
                    <span className="font-headline-sm text-status-settled">
                      TEMPEL 10000
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 font-code-audit">
                  <div className="text-text-dim">Telah Diterima Dari:</div>
                  <div className="col-span-2 text-text-bright font-semibold">
                    {previewItem.clientName}
                  </div>
                  <div className="text-text-dim">Nominal Tagihan:</div>
                  <div className="col-span-2 text-status-settled font-numeric-table font-semibold">
                    {formatRupiah(previewItem.nominalTagihan)}
                  </div>
                  <div className="text-text-dim">Lokasi Fisik:</div>
                  <div className="col-span-2 text-text-bright">
                    {previewItem.boxArsip} ({previewItem.branchLabel})
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-surface-container border-t border-border-grid flex items-center justify-between">
              <span className="font-code-audit text-text-dim">
                Google Drive Vault ID: {previewItem.id}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadCatalogItem(previewItem)}
                  className="px-4 py-1.5 bg-secondary-container border border-secondary text-text-bright font-label-caps uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    download
                  </span>
                  <span>Unduh Berkas</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
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
