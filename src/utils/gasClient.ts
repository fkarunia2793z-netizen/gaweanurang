import {
  formatRupiah,
  parseRupiahInput,
  generateAuditHash,
  extractDriveFolderId,
  buildGASDriveUploadPayload,
  type GASDriveUploadPayloadInput,
  type PiutangRecord,
  type CatalogFile,
  type AuditLogEntry,
  type GASUserAccount,
  type GASConfig,
} from './arLogic.ts';

export interface GASHandshakeResult {
  connected: boolean;
  mode: 'LIVE_GAS' | 'LOCAL_FALLBACK';
  latencyMs: number;
  message: string;
  piutang?: PiutangRecord[];
  catalog?: CatalogFile[];
  logs?: AuditLogEntry[];
  users?: GASUserAccount[];
}

/**
 * Checks whether a Web App URL is a real user-configured Google Apps Script URL
 * rather than the initial placeholder demo URL.
 */
export function isLiveGASUrl(url: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith('https://script.google.com/macros/s/')) return false;
  if (trimmed.includes('AKfycbz_98sQ1hQv320_ARTrackerCore_API_v32')) return false;
  if (trimmed.includes('AKfycbz_9z3mXkP819fL-7LqwAR_Ledger_API_v3')) return false;
  return trimmed.endsWith('/exec') || trimmed.endsWith('/dev');
}

/**
 * Sends a POST payload to Google Apps Script using text/plain to avoid CORS preflight block.
 */
export async function callGASPost<T = Record<string, unknown>>(
  webAppUrl: string,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; data?: T; latencyMs: number; error?: string }> {
  const start = performance.now();
  if (!isLiveGASUrl(webAppUrl)) {
    return {
      ok: false,
      latencyMs: Math.round(performance.now() - start),
      error: 'URL masih menggunakan template demo. Mode penyimpanan lokal aktif.',
    };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const response = await fetch(webAppUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timer);

    const latencyMs = Math.round(performance.now() - start);
    if (!response.ok) {
      return {
        ok: false,
        latencyMs,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const json = (await response.json()) as T;
    return { ok: true, data: json, latencyMs };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Math.round(performance.now() - start),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Fetches full spreadsheet data from Google Apps Script via GET ?action=readAll
 */
export async function fetchGASAllData(
  config: GASConfig
): Promise<GASHandshakeResult> {
  const start = performance.now();
  if (!isLiveGASUrl(config.webAppUrl)) {
    return {
      connected: false,
      mode: 'LOCAL_FALLBACK',
      latencyMs: 42,
      message:
        'Mode Simulasi Lokal Aktif. Masukkan URL Web App Google Apps Script asli Anda untuk sinkronisasi Spreadsheet langsung.',
    };
  }

  try {
    const sep = config.webAppUrl.includes('?') ? '&' : '?';
    const targetUrl = `${config.webAppUrl.trim()}${sep}action=readAll&sheetId=${encodeURIComponent(
      config.spreadsheetId
    )}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(targetUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timer);

    const latencyMs = Math.round(performance.now() - start);
    if (!res.ok) {
      return {
        connected: false,
        mode: 'LOCAL_FALLBACK',
        latencyMs,
        message: `Gagal menghubungi GAS (HTTP ${res.status}). Pastikan akses Web App disetel ke "Anyone".`,
      };
    }

    const data = await res.json();
    if (data && data.status === 'success') {
      return {
        connected: true,
        mode: 'LIVE_GAS',
        latencyMs,
        message: `Tersinkronisasi langsung dengan Google Sheets (${latencyMs}ms).`,
        piutang: Array.isArray(data.piutang) ? data.piutang : undefined,
        catalog: Array.isArray(data.catalog) ? data.catalog : undefined,
        logs: Array.isArray(data.logs) ? data.logs : undefined,
        users: Array.isArray(data.users) ? data.users : undefined,
      };
    }

    return {
      connected: false,
      mode: 'LOCAL_FALLBACK',
      latencyMs,
      message: data?.message || 'Respons GAS tidak valid.',
    };
  } catch (err) {
    return {
      connected: false,
      mode: 'LOCAL_FALLBACK',
      latencyMs: Math.round(performance.now() - start),
      message: `Koneksi ke GAS gagal (${
        err instanceof Error ? err.message : 'Network Error'
      }). Menggunakan data lokal.`,
    };
  }
}

/**
 * Generates an HTML-based printable receipt / document or triggers a real file download
 */
export function downloadDocumentSimulation(
  fileName: string,
  title: string,
  details: Record<string, string>
): void {
  const rowsHtml = Object.entries(details)
    .map(
      ([k, v]) => `
      <tr>
        <td style="padding:8px 12px;border:1px solid #cbd5e1;font-weight:600;color:#334155;width:38%;">${k}</td>
        <td style="padding:8px 12px;border:1px solid #cbd5e1;color:#0f172a;font-family:monospace;">${v}</td>
      </tr>`
    )
    .join('');

  const content = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>${fileName} — AR Tracker Pro</title>
  <style>
    body { font-family: sans-serif; padding: 32px; color: #0f172a; background: #f8fafc; }
    .card { max-width: 720px; margin: 0 auto; background: #fff; border: 2px solid #0f172a; padding: 28px; }
    h1 { font-size: 20px; margin: 0 0 4px 0; text-transform: uppercase; }
    .sub { font-size: 12px; color: #475569; margin-bottom: 20px; font-family: monospace; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
    .stamp { display: inline-block; padding: 8px 14px; border: 2px solid #059669; color: #059669; font-weight: bold; font-size: 12px; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <div class="sub">Dokumen Digital Terverifikasi • Berkas: ${fileName}</div>
    <table>${rowsHtml}</table>
    <div class="stamp">TERVERIFIKASI SISTEM AR TRACKER PRO • SHA-256: ${generateAuditHash(
      fileName
    ).slice(0, 16)}</div>
  </div>
</body>
</html>`;

  const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.xml')
    ? fileName
    : `${fileName.replace(/\.[^/.]+$/, '')}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Parses CSV text imported by user into PiutangRecord array
 */
export function parseImportedPiutangCSV(csvText: string): PiutangRecord[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length <= 1) return [];

  const results: PiutangRecord[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]
      .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
      .map((c) => c.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
    if (cols.length < 4) continue;

    const id = cols[0] || `TRX-2025-${1000 + i}`;
    const invoiceNo = cols[1] || `AR-2025-0${900 + i}`;
    const tanggalUpdate = cols[2] || new Date().toISOString().slice(0, 16).replace('T', ' ');
    const namaPerusahaan = cols[3] || `PT Klien Impor ${i}`;
    const npwp = cols[4] || '01.384.992.4-012.000';
    const cabang = cols[5] || 'Jakarta';
    const totalTagihan = parseRupiahInput(cols[6] || '0');
    const saldoTerealisasi = parseRupiahInput(cols[7] || '0');
    const saldoBelumTerealisasi = Math.max(0, totalTagihan - saldoTerealisasi);
    const rawKendala = cols[9] || 'Clear';
    const kategoriKendala = (
      ['Clear', 'Kwitansi_Kurang', 'Promo', 'Lainnya'].includes(rawKendala)
        ? rawKendala
        : 'Clear'
    ) as PiutangRecord['kategoriKendala'];
    const keteranganKendala = cols[10] || '-';
    const statusDokumen = (
      String(cols[11] || '').toLowerCase() === 'lengkap'
        ? 'Lengkap'
        : 'Belum Lengkap'
    ) as PiutangRecord['statusDokumen'];
    const detailDokumen = cols[12] || '-';
    const picPenagihan = cols[13] || 'Rina Purnama';

    results.push({
      id,
      invoiceNo,
      tanggalUpdate,
      dueDate: '30 Mar 2025',
      namaPerusahaan,
      npwp,
      cabang,
      picPenagihan,
      picRole: 'AR Finance',
      totalTagihan,
      saldoTerealisasi,
      saldoBelumTerealisasi,
      kategoriKendala,
      keteranganKendala,
      statusDokumen,
      detailDokumen,
      matrix: {
        fk: true,
        kw: statusDokumen === 'Lengkap',
        sj: true,
        fp: true,
      },
      boxArsip: `Box AR-2025/IMP-${i}`,
    });
  }
  return results;
}

/**
 * Reads a browser File object into a Base64 string (stripped of data URL header)
 * ready for Google Apps Script Utilities.base64Decode() + DriveApp.createFile().
 */
export function readFileAsBase64(file: File): Promise<{
  base64Data: string;
  mimeType: string;
  sizeBytes: number;
  formattedSize: string;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = typeof reader.result === 'string' ? reader.result : '';
      const base64Data = resultStr.includes('base64,')
        ? resultStr.split('base64,')[1]
        : resultStr;
      const sizeBytes = file.size;
      const formattedSize =
        sizeBytes >= 1024 * 1024
          ? `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`
          : `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
      resolve({
        base64Data,
        mimeType: file.type || 'application/pdf',
        sizeBytes,
        formattedSize,
      });
    };
    reader.onerror = () => reject(new Error('Gagal membaca berkas lokal.'));
    reader.readAsDataURL(file);
  });
}

export interface GASDriveUploadResponse {
  ok: boolean;
  mode: 'LIVE_GAS_DRIVE' | 'GAS_BRIDGE_SIMULATION';
  fileId: string;
  fileUrl: string;
  folderId: string;
  folderName: string;
  latencyMs: number;
  message: string;
}

/**
 * Uploads a document (e.g., Bukti Surat Sudah Diterima / BAST / Kwitansi) to Google Drive
 * via Google Apps Script Web App (doPost -> action: 'uploadDriveFile' -> DriveApp.createFile).
 * Does NOT require client-side OAuth popup because the Apps Script runs as the deployer ("Execute as: Me").
 */
export async function uploadFileToDriveViaGAS(
  config: GASConfig,
  input: Omit<GASDriveUploadPayloadInput, 'spreadsheetId'>
): Promise<GASDriveUploadResponse> {
  const start = performance.now();
  const folderId = extractDriveFolderId(
    input.driveFolderId || config.driveFolderId || '1DriveFolder_AR_BuktiSurat_2025_Master'
  );
  const folderName =
    input.driveFolderName ||
    config.driveFolderName ||
    'AR_Tracker_Bukti_Surat_Diterima';

  const payload = buildGASDriveUploadPayload({
    ...input,
    spreadsheetId: config.spreadsheetId,
    driveFolderId: folderId,
    driveFolderName: folderName,
  });

  if (isLiveGASUrl(config.webAppUrl)) {
    const postRes = await callGASPost<{
      status?: string;
      fileId?: string;
      fileUrl?: string;
      folderId?: string;
      folderName?: string;
      message?: string;
    }>(config.webAppUrl, payload);

    if (postRes.ok && postRes.data && postRes.data.status === 'success') {
      const returnedFileId = postRes.data.fileId || `gas_drv_${Date.now()}`;
      const returnedUrl =
        postRes.data.fileUrl ||
        `https://drive.google.com/file/d/${returnedFileId}/view`;
      return {
        ok: true,
        mode: 'LIVE_GAS_DRIVE',
        fileId: returnedFileId,
        fileUrl: returnedUrl,
        folderId: postRes.data.folderId || folderId,
        folderName: postRes.data.folderName || folderName,
        latencyMs: postRes.latencyMs,
        message: `Berhasil diunggah ke Google Drive via Google Apps Script (${postRes.latencyMs}ms).`,
      };
    }

    const fallbackId = `gas_fallback_${input.recordId}_${Date.now()}`;
    return {
      ok: false,
      mode: 'GAS_BRIDGE_SIMULATION',
      fileId: fallbackId,
      fileUrl: `https://drive.google.com/file/d/${fallbackId}/view?usp=drivesdk`,
      folderId,
      folderName,
      latencyMs: postRes.latencyMs,
      message: `Endpoint GAS merespons (${
        postRes.error || postRes.data?.message || 'Fallback'
      }). Berkas dicatat pada Katalog & siap disinkronkan.`,
    };
  }

  // Simulated GAS DriveApp bridge when WebApp URL is still the default template
  const simFileId = `1GAS_DriveApp_${input.recordId}_${Date.now().toString(36)}`;
  const latencyMs = Math.max(18, Math.round(performance.now() - start));
  return {
    ok: true,
    mode: 'GAS_BRIDGE_SIMULATION',
    fileId: simFileId,
    fileUrl: `https://drive.google.com/file/d/${simFileId}/view?usp=sharing`,
    folderId,
    folderName,
    latencyMs,
    message: `Payload Base64 siap & tercatat via jembatan Google Apps Script (Folder: ${folderName}). Tempel URL Web App Code.gs Anda di Pengaturan untuk upload langsung ke Google Drive Anda.`,
  };
}

