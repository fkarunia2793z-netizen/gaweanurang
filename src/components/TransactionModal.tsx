import React, { useState, useEffect } from 'react';
import {
  formatRupiah,
  parseRupiahInput,
  calculateOutstandingBalance,
  normalizeTransactionCode,
  validateTransactionFormInput,
  parseDueDateToISO,
  formatDateToIndo,
  type PiutangRecord,
  type KategoriKendala,
  type StatusDokumen,
  type AccountingPeriodConfig,
} from '../utils/arLogic';

function addDaysToISO(isoDate: string, days: number): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    const now = new Date();
    isoDate = now.toISOString().slice(0, 10);
  }
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  const resY = date.getUTCFullYear();
  const resM = String(date.getUTCMonth() + 1).padStart(2, '0');
  const resD = String(date.getUTCDate()).padStart(2, '0');
  return `${resY}-${resM}-${resD}`;
}

function hitungHariTerminText(fromISO: string, toISO: string): string {
  if (!fromISO || !toISO) return '';
  const iso1 = parseDueDateToISO(fromISO) || fromISO;
  const iso2 = parseDueDateToISO(toISO) || toISO;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso1) || !/^\d{4}-\d{2}-\d{2}$/.test(iso2)) {
    return '';
  }
  const [y1, m1, d1] = iso1.split('-').map(Number);
  const [y2, m2, d2] = iso2.split('-').map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  const diff = Math.round((utc2 - utc1) / 86400000);
  if (diff < 0) return `Lewat tempo ${Math.abs(diff)} hari`;
  if (diff === 0) return 'Tempo hari ini (H-0)';
  return `Termin: ${diff} Hari`;
}

interface TransactionModalProps {
  isOpen: boolean;
  editingRecord: PiutangRecord | null;
  existingIds?: string[];
  activePeriod?: AccountingPeriodConfig;
  onClose: () => void;
  onSave: (record: PiutangRecord, isUpdate: boolean, originalId?: string) => void;
  onDelete?: (id: string) => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  editingRecord,
  existingIds = [],
  activePeriod,
  onClose,
  onSave,
  onDelete,
}) => {
  const [trxId, setTrxId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [namaPerusahaan, setNamaPerusahaan] = useState('');
  const [npwp, setNpwp] = useState('01.442.901.4-051.000');
  const [cabang, setCabang] = useState('Surabaya');
  const [picPenagihan, setPicPenagihan] = useState('Rina Purnama');
  const [totalTagihanInput, setTotalTagihanInput] = useState('');
  const [saldoCairInput, setSaldoCairInput] = useState('0');
  const [kategoriKendala, setKategoriKendala] = useState<KategoriKendala>('Kwitansi_Kurang');
  const [statusDokumen, setStatusDokumen] = useState<StatusDokumen>('Belum Lengkap');
  const [keteranganKendala, setKeteranganKendala] = useState('');
  const [detailDokumen, setDetailDokumen] = useState('');
  const [tanggalTransaksi, setTanggalTransaksi] = useState('');
  const [dueDateInput, setDueDateInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const activeYear = activePeriod?.year || new Date().getFullYear();

  useEffect(() => {
    setValidationError(null);
    if (editingRecord) {
      setTrxId(editingRecord.id);
      setInvoiceNo(editingRecord.invoiceNo);
      setNamaPerusahaan(editingRecord.namaPerusahaan);
      setNpwp(editingRecord.npwp);
      setCabang(editingRecord.cabang);
      setPicPenagihan(editingRecord.picPenagihan);
      setTotalTagihanInput(formatRupiah(editingRecord.totalTagihan, false));
      setSaldoCairInput(formatRupiah(editingRecord.saldoTerealisasi, false));
      setKategoriKendala(editingRecord.kategoriKendala);
      setStatusDokumen(editingRecord.statusDokumen);
      setKeteranganKendala(editingRecord.keteranganKendala);
      setDetailDokumen(editingRecord.detailDokumen);

      const parsedTrxDate = editingRecord.tanggalUpdate
        ? editingRecord.tanggalUpdate.slice(0, 10)
        : '';
      const validTrx = /^\d{4}-\d{2}-\d{2}$/.test(parsedTrxDate)
        ? parsedTrxDate
        : new Date().toISOString().slice(0, 10);
      setTanggalTransaksi(validTrx);

      const parsedDue = parseDueDateToISO(editingRecord.dueDate);
      setDueDateInput(parsedDue || addDaysToISO(validTrx, 30));
    } else {
      const defaultTrx =
        activePeriod?.referenceDateISO || new Date().toISOString().slice(0, 10);
      const randomSeq = Math.floor(1000 + Math.random() * 9000);
      setTrxId(`TRX-${activeYear}-${randomSeq}`);
      setInvoiceNo(`AR-${activeYear}-0${Math.floor(920 + Math.random() * 79)}`);
      setNamaPerusahaan('');
      setNpwp('01.442.901.4-051.000');
      setCabang('Jakarta');
      setPicPenagihan('Rina Purnama');
      setTotalTagihanInput('');
      setSaldoCairInput('0');
      setKategoriKendala('Kwitansi_Kurang');
      setStatusDokumen('Belum Lengkap');
      setKeteranganKendala('Kwitansi asli cap basah belum diterima oleh finance pusat.');
      setDetailDokumen('Faktur asli rangkap 3 dan e-Faktur belum divalidasi.');
      setTanggalTransaksi(defaultTrx);
      setDueDateInput(addDaysToISO(defaultTrx, 30));
    }
  }, [editingRecord, isOpen, activePeriod, activeYear]);

  if (!isOpen) return null;

  const grossNumeric = parseRupiahInput(totalTagihanInput);
  const cairNumeric = parseRupiahInput(saldoCairInput);
  const { sisa, isSettled, ratioCair } = calculateOutstandingBalance(
    grossNumeric,
    cairNumeric
  );

  const handleGrossChange = (val: string) => {
    const num = parseRupiahInput(val);
    setTotalTagihanInput(num > 0 ? formatRupiah(num, false) : '');
  };

  const handleCairChange = (val: string) => {
    const num = parseRupiahInput(val);
    setSaldoCairInput(val === '' ? '' : formatRupiah(num, false));
  };

  const handleKendalaPreset = (val: KategoriKendala) => {
    setKategoriKendala(val);
    if (val === 'Clear') {
      setKeteranganKendala(
        'Pembayaran sesuai termin kesepakatan B2B tanpa sengketa potongan atau dokumen.'
      );
    } else if (val === 'Promo') {
      setKeteranganKendala(
        'Potongan listing fee promosi toko modern 10% dan klaim rebate kuartal belum ditandatangani.'
      );
    } else if (val === 'Kwitansi_Kurang') {
      setKeteranganKendala(
        'Kwitansi asli cap basah belum diterima oleh finance pusat, pemotongan listing fee 10%.'
      );
    } else {
      setKeteranganKendala(
        'Sedang dalam proses rekonsiliasi faktur pajak pengganti dengan bagian perpajakan klien.'
      );
    }
  };

  const handleDocStatusSwitch = (status: StatusDokumen) => {
    setStatusDokumen(status);
    if (status === 'Lengkap') {
      setDetailDokumen(
        'Seluruh berkas fisik (Faktur Rangkap 3, Kwitansi, e-Faktur) telah diarsipkan lengkap.'
      );
    } else {
      setDetailDokumen(
        'Faktur asli rangkap 3 dan faktur pajak elektronik e-Faktur belum divalidasi oleh kasir operasional.'
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationMsg = validateTransactionFormInput({
      trxId,
      namaPerusahaan,
      grossNumeric,
      existingIds,
      isUpdate: Boolean(editingRecord),
      originalId: editingRecord?.id,
    });
    if (validationMsg) {
      setValidationError(validationMsg);
      return;
    }

    const cleanTrxId = normalizeTransactionCode(trxId);
    const cleanInvoiceNo =
      invoiceNo.trim() ||
      `AR-${activeYear}-0${Math.floor(920 + Math.random() * 79)}`;

    const now = new Date();
    const timePart = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
    const validTrxDate = /^\d{4}-\d{2}-\d{2}$/.test(tanggalTransaksi)
      ? tanggalTransaksi
      : now.toISOString().slice(0, 10);
    const formattedDate = `${validTrxDate} ${timePart}`;

    const formattedDueDate =
      formatDateToIndo(dueDateInput) || dueDateInput || '30 Hari';

    const matrix =
      statusDokumen === 'Lengkap'
        ? { fk: true, kw: true, sj: true, fp: true }
        : {
            fk: true,
            kw: kategoriKendala !== 'Kwitansi_Kurang',
            sj: kategoriKendala !== 'Promo',
            fp: kategoriKendala !== 'Lainnya',
          };

    const targetYear = validTrxDate.slice(0, 4) || String(activeYear);
    const newRecord: PiutangRecord = {
      id: cleanTrxId,
      invoiceNo: cleanInvoiceNo,
      tanggalUpdate: formattedDate,
      dueDate: formattedDueDate,
      namaPerusahaan: namaPerusahaan.trim(),
      npwp: npwp.trim() || '01.442.901.4-051.000',
      cabang: cabang.trim() || 'Jakarta',
      picPenagihan: picPenagihan.trim() || 'Rina Purnama',
      picRole: editingRecord?.picRole || 'AR Lead / Finance',
      totalTagihan: grossNumeric,
      saldoTerealisasi: cairNumeric,
      saldoBelumTerealisasi: sisa,
      kategoriKendala,
      keteranganKendala: keteranganKendala.trim() || '-',
      statusDokumen,
      detailDokumen: detailDokumen.trim() || '-',
      matrix,
      boxArsip:
        editingRecord?.boxArsip || `Box AR-${targetYear}/A1 - Binder ${cabang}`,
    };

    onSave(newRecord, Boolean(editingRecord), editingRecord?.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-container-lowest/85 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-crud-heading"
        className="relative w-full max-w-4xl bg-surface-card border border-border-accent shadow-2xl flex flex-col my-auto"
      >
        {/* Top Technical Status Bar */}
        <div className="bg-surface-container-highest px-6 py-1.5 flex items-center justify-between border-b border-border-grid">
          <div className="flex items-center gap-2">
            <span className="font-code-audit text-text-dim uppercase tracking-wider">
              LEDGER {editingRecord ? 'EDIT' : 'INSERT'} MODE • RECORD IDENTIFIER:{' '}
              <span className="text-tertiary font-bold">{trxId}</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-code-audit text-text-dim">
              Target Database:{' '}
              <span className="text-text-bright">Google Sheets (Data_Piutang)</span>
            </span>
            <span className="font-code-audit text-status-settled flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">cloud_done</span>{' '}
              Live Ready
            </span>
          </div>
        </div>

        {/* Modal Header */}
        <div className="px-6 pt-5 pb-4 bg-surface-card flex items-start justify-between border-b border-border-grid">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[22px]">
                receipt_long
              </span>
              <h2
                id="modal-crud-heading"
                className="font-headline-lg text-text-bright tracking-tight"
              >
                {editingRecord
                  ? `Edit Data Transaksi Piutang [${editingRecord.id}]`
                  : 'Tambah / Edit Data Transaksi Piutang'}
              </h2>
            </div>
            <p className="font-body-sm text-text-dim mt-1">
              Form pencatatan saldo piutang perusahaan. Perubahan divalidasi dan
              diunggah langsung ke baris lembar kerja{' '}
              <code className="px-1.5 py-0.5 bg-surface-input text-secondary font-code-audit">
                Data_Piutang
              </code>
              .
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Formulir Transaksi"
            className="p-1.5 bg-surface-input text-text-dim hover:text-text-bright hover:bg-surface-container-high border border-border-grid transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Live Calculation Dynamic Highlight Deck */}
        <div className="px-6 py-3 bg-surface-dim border-b border-border-grid">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-surface-container border border-border-grid">
            <div className="flex flex-col">
              <span className="font-label-caps text-text-dim uppercase tracking-wider">
                Gross Tagihan Terdaftar
              </span>
              <span className="font-headline-md text-text-bright mt-0.5 font-mono">
                {formatRupiah(grossNumeric)}
              </span>
              <span className="font-code-audit text-text-dim">
                Plafon Tagihan Resmi
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-caps text-text-dim uppercase tracking-wider">
                Total Kas Terealisasi
              </span>
              <span className="font-headline-md text-status-settled mt-0.5 font-mono">
                {formatRupiah(cairNumeric)}
              </span>
              <span className="font-code-audit text-status-settled">
                {ratioCair}% Dana Terkonfirmasi
              </span>
            </div>
            <div className="flex flex-col bg-surface-input p-2.5 pl-4 border border-border-grid">
              <div className="flex items-center justify-between">
                <span className="font-label-caps text-status-pending uppercase tracking-wider">
                  Saldo Belum Terealisasi
                </span>
                <span
                  className={`px-1.5 py-0.5 font-label-caps uppercase ${
                    isSettled
                      ? 'bg-status-settled-surface text-status-settled'
                      : 'bg-status-pending-surface text-status-pending'
                  }`}
                >
                  {isSettled ? 'LUNAS / RECONCILED' : 'PIUTANG AKTIF'}
                </span>
              </div>
              <span
                className={`font-numeric-kpi mt-0.5 ${
                  isSettled ? 'text-status-settled' : 'text-status-pending'
                }`}
              >
                {formatRupiah(sisa)}
              </span>
              <span className="font-code-audit text-text-dim">
                {isSettled
                  ? 'Seluruh tagihan telah terealisasi sempurna'
                  : 'Selisih defisit kas berjalan'}
              </span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 bg-surface-card">
          {validationError && (
            <div
              role="alert"
              className="p-3 bg-status-danger-surface border border-status-danger text-error font-body-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">warning</span>
              <span>{validationError}</span>
            </div>
          )}

          {/* Row 1: Kode / ID Transaksi (Manual/Auto), Nomor Invoice, Perusahaan, Cabang */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-start">
            <div className="md:col-span-4 flex flex-col gap-1">
              <label
                htmlFor="input-trx-id"
                className="flex items-center justify-between font-label-caps text-text-dim uppercase whitespace-nowrap"
              >
                <span>
                  Kode Transaksi <span className="text-status-danger">*</span>
                </span>
                <span className="text-secondary font-code-audit">Manual / Auto</span>
              </label>
              <div className="flex items-center bg-surface-input border border-border-grid px-2.5 h-10 focus-within:border-secondary">
                <span className="material-symbols-outlined text-[16px] text-secondary mr-1.5 shrink-0">
                  tag
                </span>
                <input
                  id="input-trx-id"
                  type="text"
                  value={trxId}
                  onChange={(e) => {
                    setTrxId(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder="Ketik kode transaksi manual..."
                  className="w-full bg-transparent text-text-bright font-code-audit focus:outline-none"
                />
                {trxId && (
                  <button
                    type="button"
                    onClick={() => setTrxId('')}
                    title="Kosongkan untuk ketik manual"
                    aria-label="Kosongkan Kode Transaksi"
                    className="text-text-dim hover:text-error p-0.5 cursor-pointer shrink-0"
                  >
                    <span className="material-symbols-outlined text-[15px]">close</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    setTrxId(`TRX-${activeYear}-${Math.floor(1000 + Math.random() * 9000)}`)
                  }
                  title="Generate Kode Otomatis"
                  aria-label="Generate Kode Transaksi Otomatis"
                  className="text-text-dim hover:text-text-bright p-0.5 ml-0.5 cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">sync</span>
                </button>
              </div>
              <span className="font-code-audit text-text-dim">
                Bebas ketik kode manual atau klik ikon putar (Auto)
              </span>
            </div>

            <div className="md:col-span-3 flex flex-col gap-1">
              <label
                htmlFor="input-invoice-no"
                className="flex items-center justify-between font-label-caps text-text-dim uppercase whitespace-nowrap"
              >
                <span>No. Invoice</span>
                <span className="text-text-dim font-code-audit">Manual</span>
              </label>
              <div className="flex items-center bg-surface-input border border-border-grid px-2.5 h-10 focus-within:border-secondary">
                <span className="material-symbols-outlined text-[16px] text-tertiary mr-1.5 shrink-0">
                  description
                </span>
                <input
                  id="input-invoice-no"
                  type="text"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  placeholder={`Contoh: INV/${activeYear}/001`}
                  className="w-full bg-transparent text-text-bright font-code-audit focus:outline-none"
                />
                {invoiceNo && (
                  <button
                    type="button"
                    onClick={() => setInvoiceNo('')}
                    title="Kosongkan Nomor Invoice"
                    aria-label="Kosongkan Nomor Invoice"
                    className="text-text-dim hover:text-error p-0.5 cursor-pointer shrink-0"
                  >
                    <span className="material-symbols-outlined text-[15px]">close</span>
                  </button>
                )}
              </div>
              <span className="font-code-audit text-text-dim">
                Nomor surat / faktur tagihan
              </span>
            </div>

            <div className="md:col-span-3 flex flex-col gap-1">
              <label
                htmlFor="input-client-name"
                className="flex items-center justify-between font-label-caps text-text-dim uppercase whitespace-nowrap"
              >
                <span>
                  Nama Perusahaan <span className="text-status-danger">*</span>
                </span>
                <span className="text-text-dim font-code-audit">Klien B2B</span>
              </label>
              <div className="flex items-center bg-surface-input border border-border-grid h-10 px-2.5 focus-within:border-secondary">
                <span className="material-symbols-outlined text-[17px] text-secondary mr-1.5 shrink-0">
                  corporate_fare
                </span>
                <input
                  id="input-client-name"
                  type="text"
                  value={namaPerusahaan}
                  onChange={(e) => {
                    setNamaPerusahaan(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder="Contoh: PT Surya Perkasa"
                  className="w-full bg-transparent text-text-bright font-body-sm focus:outline-none"
                />
              </div>
              <span className="font-code-audit text-text-dim">
                Nama entitas tertagih resmi
              </span>
            </div>

            <div className="md:col-span-2 flex flex-col gap-1">
              <label
                htmlFor="input-cabang"
                className="flex items-center justify-between font-label-caps text-text-dim uppercase whitespace-nowrap"
              >
                <span>Cabang</span>
              </label>
              <select
                id="input-cabang"
                value={cabang}
                onChange={(e) => setCabang(e.target.value)}
                className="h-10 px-2.5 bg-surface-input border border-border-grid text-text-bright font-body-sm focus:outline-none focus:border-secondary"
              >
                <option value="Jakarta">Jakarta HQ</option>
                <option value="Surabaya">Surabaya</option>
                <option value="Semarang">Semarang</option>
                <option value="Bandung">Bandung</option>
                <option value="Medan">Medan</option>
                <option value="Balikpapan">Balikpapan</option>
              </select>
              <span className="font-code-audit text-text-dim">
                Wilayah kerja
              </span>
            </div>
          </div>

          {/* Row Tanggal Transaksi & Jatuh Tempo (Termin Bebas Diisi Kapanpun) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 bg-surface-container-low p-3.5 border border-border-grid">
            <div className="md:col-span-5 flex flex-col gap-1">
              <label
                htmlFor="input-tgl-transaksi"
                className="flex items-center justify-between font-label-caps text-text-dim uppercase"
              >
                <span>
                  Tanggal Transaksi / Pencatatan{' '}
                  <span className="text-status-danger">*</span>
                </span>
                <span className="text-secondary font-code-audit">Buku Masuk</span>
              </label>
              <div className="flex items-center bg-surface-input border border-border-grid h-10 px-2.5 focus-within:border-secondary">
                <span className="material-symbols-outlined text-[17px] text-secondary mr-2 shrink-0">
                  calendar_today
                </span>
                <input
                  id="input-tgl-transaksi"
                  type="date"
                  required
                  value={tanggalTransaksi}
                  onChange={(e) => {
                    const nextDate = e.target.value;
                    setTanggalTransaksi(nextDate);
                    if (!dueDateInput && nextDate) {
                      setDueDateInput(addDaysToISO(nextDate, 30));
                    }
                  }}
                  className="w-full bg-transparent text-text-bright font-code-audit text-sm focus:outline-none cursor-pointer"
                />
              </div>
              <span className="font-code-audit text-text-dim text-[11px]">
                Bebas diisi tanggal kapanpun saat transaksi terjadi
              </span>
            </div>

            <div className="md:col-span-7 flex flex-col gap-1">
              <div className="flex items-center justify-between font-label-caps text-text-dim uppercase">
                <span>
                  Tanggal Jatuh Tempo (Due Date){' '}
                  <span className="text-status-danger">*</span>
                </span>
                <span className="text-tertiary font-code-audit font-semibold">
                  {hitungHariTerminText(tanggalTransaksi, dueDateInput)}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex items-center bg-surface-input border border-border-grid h-10 px-2.5 focus-within:border-secondary flex-1">
                  <span className="material-symbols-outlined text-[17px] text-tertiary mr-2 shrink-0">
                    event_upcoming
                  </span>
                  <input
                    id="input-due-date"
                    type="date"
                    required
                    value={dueDateInput}
                    onChange={(e) => setDueDateInput(e.target.value)}
                    className="w-full bg-transparent text-text-bright font-code-audit text-sm focus:outline-none cursor-pointer"
                  />
                </div>
                {/* Quick Termin presets */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setDueDateInput(addDaysToISO(tanggalTransaksi, 14))
                    }
                    className="px-2 py-2 bg-surface-input hover:bg-surface-container border border-border-grid font-code-audit text-[11px] text-text-dim hover:text-text-bright cursor-pointer"
                    title="Termin 14 Hari"
                  >
                    +14 Hr
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDueDateInput(addDaysToISO(tanggalTransaksi, 30))
                    }
                    className="px-2 py-2 bg-primary-container hover:bg-surface-container-high border border-secondary text-text-bright font-code-audit text-[11px] font-semibold cursor-pointer"
                    title="Termin 30 Hari (Net 30)"
                  >
                    +30 Hr (Net 30)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDueDateInput(addDaysToISO(tanggalTransaksi, 45))
                    }
                    className="px-2 py-2 bg-surface-input hover:bg-surface-container border border-border-grid font-code-audit text-[11px] text-text-dim hover:text-text-bright cursor-pointer"
                    title="Termin 45 Hari"
                  >
                    +45 Hr
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDueDateInput(addDaysToISO(tanggalTransaksi, 60))
                    }
                    className="px-2 py-2 bg-surface-input hover:bg-surface-container border border-border-grid font-code-audit text-[11px] text-text-dim hover:text-text-bright cursor-pointer"
                    title="Termin 60 Hari"
                  >
                    +60 Hr
                  </button>
                </div>
              </div>
              <span className="font-code-audit text-text-dim text-[11px]">
                Batas akhir pembayaran faktur untuk monitoring radar jatuh tempo mepet
              </span>
            </div>
          </div>

          {/* Row 2: Financial Realization Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface-container-low p-4 border border-border-grid">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="input-tagihan-gross"
                className="flex items-center justify-between font-label-caps text-text-dim uppercase"
              >
                <span>
                  Total Tagihan (Gross Plafond){' '}
                  <span className="text-status-danger">*</span>
                </span>
                <span className="text-text-dim font-code-audit">IDR Format</span>
              </label>
              <div className="flex items-center bg-surface-input border border-border-grid h-10 px-3 focus-within:border-secondary">
                <span className="font-label-caps text-text-dim mr-2.5">RP</span>
                <input
                  id="input-tagihan-gross"
                  type="text"
                  value={totalTagihanInput}
                  onChange={(e) => handleGrossChange(e.target.value)}
                  placeholder="0"
                  className="w-full bg-transparent font-numeric-table text-text-bright focus:outline-none"
                />
              </div>
              <span className="font-code-audit text-text-dim">
                Nominal kotor faktur sebelum potongan termin/pajak
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="input-saldo-cair"
                className="flex items-center justify-between font-label-caps text-text-dim uppercase"
              >
                <span>
                  Saldo Terealisasi (Kas Masuk / Cair){' '}
                  <span className="text-status-danger">*</span>
                </span>
                <span className="text-status-settled font-code-audit">
                  Verified Bank
                </span>
              </label>
              <div className="flex items-center bg-surface-input border border-border-grid h-10 px-3 focus-within:border-secondary">
                <span className="font-label-caps text-status-settled mr-2.5">
                  RP
                </span>
                <input
                  id="input-saldo-cair"
                  type="text"
                  value={saldoCairInput}
                  onChange={(e) => handleCairChange(e.target.value)}
                  placeholder="0"
                  className="w-full bg-transparent font-numeric-table text-status-settled focus:outline-none"
                />
              </div>
              <span className="font-code-audit text-text-dim">
                Dana kas rekening koran yang sudah di-clearing
              </span>
            </div>
          </div>

          {/* Row 3: Bottleneck Category & Status Dokumen Selector */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-5 flex flex-col gap-1">
              <label
                htmlFor="select-kendala"
                className="font-label-caps text-text-dim uppercase"
              >
                Kategori Kendala Pembayaran *
              </label>
              <select
                id="select-kendala"
                value={kategoriKendala}
                onChange={(e) =>
                  handleKendalaPreset(e.target.value as KategoriKendala)
                }
                className="h-10 px-3 bg-surface-input border border-border-grid text-text-bright font-body-sm focus:outline-none focus:border-secondary cursor-pointer"
              >
                <option value="Kwitansi_Kurang">
                  Kwitansi_Kurang (Berkas Kurang)
                </option>
                <option value="Promo">
                  Promo (Potongan Listing / Diskon Retur)
                </option>
                <option value="Lainnya">
                  Lainnya (Sengketa / Audit Internal)
                </option>
                <option value="Clear">
                  Clear (Tidak Ada Masalah Finansial)
                </option>
              </select>
            </div>

            <div className="md:col-span-7 flex flex-col gap-1">
              <span className="font-label-caps text-text-dim uppercase">
                Kelengkapan Berkas Fisik &amp; Pajak *
              </span>
              <div className="grid grid-cols-2 gap-2 h-10">
                <button
                  type="button"
                  onClick={() => handleDocStatusSwitch('Lengkap')}
                  className={`flex items-center justify-center gap-2 px-3 border transition-colors cursor-pointer ${
                    statusDokumen === 'Lengkap'
                      ? 'bg-status-settled-surface border-status-settled text-status-settled'
                      : 'bg-surface-input border-border-grid text-text-dim hover:text-text-bright'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    check_circle
                  </span>
                  <span className="font-label-caps uppercase">
                    LENGKAP (VERIFIED)
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDocStatusSwitch('Belum Lengkap')}
                  className={`flex items-center justify-center gap-2 px-3 border transition-colors cursor-pointer ${
                    statusDokumen === 'Belum Lengkap'
                      ? 'bg-status-danger-surface border-status-danger text-error'
                      : 'bg-surface-input border-border-grid text-text-dim hover:text-text-bright'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    warning
                  </span>
                  <span className="font-label-caps uppercase">
                    BELUM LENGKAP
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Row 4: Detailed Reason & Pending Documentation Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="text-alasan-kendala"
                className="font-label-caps text-text-dim uppercase"
              >
                Keterangan Alasan Kendala
              </label>
              <textarea
                id="text-alasan-kendala"
                rows={2}
                value={keteranganKendala}
                onChange={(e) => setKeteranganKendala(e.target.value)}
                className="w-full bg-surface-input border border-border-grid p-2.5 text-text-bright font-body-sm focus:outline-none focus:border-secondary resize-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="text-detail-dokumen"
                className="font-label-caps text-text-dim uppercase"
              >
                Detail Dokumen Pending / Hilang
              </label>
              <textarea
                id="text-detail-dokumen"
                rows={2}
                value={detailDokumen}
                onChange={(e) => setDetailDokumen(e.target.value)}
                className="w-full bg-surface-input border border-border-grid p-2.5 text-text-bright font-body-sm focus:outline-none focus:border-secondary resize-none"
              />
            </div>
          </div>

          {/* Modal Footer Action Bar */}
          <div className="pt-4 mt-2 border-t border-border-grid flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              {editingRecord && onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(editingRecord.id)}
                  className="px-4 py-2 bg-transparent hover:bg-status-danger-surface text-status-danger border border-status-danger font-label-caps uppercase transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    delete_forever
                  </span>
                  <span>Hapus Data Transaksi</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-surface-input border border-border-grid hover:bg-surface-container-highest text-text-bright font-label-caps uppercase transition-colors cursor-pointer"
              >
                Batal / Tutup
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-secondary-container hover:bg-on-secondary-fixed-variant border border-secondary text-text-bright font-label-caps uppercase transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px] text-tertiary">
                  cloud_sync
                </span>
                <span>Simpan ke Google Sheets</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
