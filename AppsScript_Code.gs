/**
 * SIMPUL — Backend Google Apps Script
 * -------------------------------------------------
 * CARA PAKAI — lihat README.md untuk panduan lengkap.
 * Sheet yang dipakai (dibuat otomatis kalau belum ada):
 *   - Stakeholders  : data lembaga/organisasi
 *   - Kolaborasi    : riwayat kegiatan/koordinasi
 *   - Users         : akun login (username, password, role, nama)
 *   - Sessions      : token login aktif (jangan diedit manual)
 * -------------------------------------------------
 */

const SHEET_NAME = "Stakeholders";
const HEADERS = ["id", "nama", "kategori", "wilayah", "namaPIC", "kontak", "influence", "interest", "isuKolaborasi", "status", "updatedAt", "dibuatOleh", "catatanVerifikasi"];

const KOLAB_SHEET_NAME = "Kolaborasi";
const KOLAB_HEADERS = ["id", "tanggal", "stakeholderId", "stakeholderNama", "kegiatan", "hasil", "status", "catatan", "dicatatOleh"];

const USERS_SHEET_NAME = "Users";
const USERS_HEADERS = ["username", "password", "role", "nama"];

const SESSIONS_SHEET_NAME = "Sessions";
const SESSIONS_HEADERS = ["token", "username", "role", "nama", "createdAt"];

// ---------- Sheet helpers ----------

function getSheetOrCreate_(name, headers, seedRows) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    (seedRows || []).forEach((r) => sheet.appendRow(r));
  }
  return sheet;
}

function getSheet_() { return getSheetOrCreate_(SHEET_NAME, HEADERS); }
function getKolabSheet_() { return getSheetOrCreate_(KOLAB_SHEET_NAME, KOLAB_HEADERS); }
function getUsersSheet_() {
  return getSheetOrCreate_(USERS_SHEET_NAME, USERS_HEADERS, [["admin", "admin123", "verifikator", "Admin Sementara"]]);
}
function getSessionsSheet_() { return getSheetOrCreate_(SESSIONS_SHEET_NAME, SESSIONS_HEADERS); }

function readAllRows_(sheet, headers) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const [fileHeaders, ...rows] = values;
  return rows
    .filter((r) => r[0] !== "" && r[0] !== null)
    .map((r) => {
      const obj = {};
      fileHeaders.forEach((h, i) => { obj[h] = r[i]; });
      return obj;
    });
}

function readAllStakeholders_() {
  const rows = readAllRows_(getSheet_(), HEADERS);
  return rows.map((o) => ({ ...o, influence: Number(o.influence), interest: Number(o.interest) }));
}

function readAllKolaborasi_() {
  return readAllRows_(getKolabSheet_(), KOLAB_HEADERS);
}

function findRowIndexById_(sheet, id) {
  const ids = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 0), 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------- Auth helpers ----------

function findUserByUsername_(username) {
  const sheet = getUsersSheet_();
  const [headers, ...rows] = sheet.getDataRange().getValues();
  for (const r of rows) {
    if (String(r[0]) === String(username)) {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = r[i]; });
      return obj;
    }
  }
  return null;
}

function findSessionByToken_(token) {
  const sheet = getSessionsSheet_();
  const [headers, ...rows] = sheet.getDataRange().getValues();
  for (const r of rows) {
    if (String(r[0]) === String(token)) {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = r[i]; });
      return obj;
    }
  }
  return null;
}

function authenticate_(token) {
  if (!token) return null;
  const session = findSessionByToken_(token);
  if (!session) return null;
  const user = findUserByUsername_(session.username);
  if (!user) return null;
  return { username: user.username, role: user.role, nama: user.nama };
}

function doLogin_(username, password) {
  const user = findUserByUsername_(username);
  if (!user || String(user.password) !== String(password)) {
    return { ok: false, error: "Username atau password salah" };
  }
  const token = Utilities.getUuid();
  getSessionsSheet_().appendRow([token, user.username, user.role, user.nama, new Date().toISOString()]);
  return { ok: true, token, user: { username: user.username, role: user.role, nama: user.nama } };
}

function doLogout_(token) {
  const sheet = getSessionsSheet_();
  const values = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 0), 1).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]) === String(token)) { sheet.deleteRow(i + 2); break; }
  }
  return { ok: true };
}

// ---------- HTTP entry points ----------

function doGet(e) {
  try {
    return jsonOut_({ ok: true, stakeholders: readAllStakeholders_(), kolaborasi: readAllKolaborasi_() });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    if (action === "login") return jsonOut_(doLogin_(body.username, body.password));
    if (action === "logout") return jsonOut_(doLogout_(body.token));

    const actor = authenticate_(body.token);
    if (!actor) return jsonOut_({ ok: false, error: "Sesi tidak valid. Silakan login ulang." });

    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");

    // ----- Stakeholder actions -----
    if (action === "add") {
      const sheet = getSheet_();
      const id = "S" + Utilities.getUuid().slice(0, 8);
      const status = actor.role === "verifikator" ? "Terverifikasi" : "Belum Verifikasi";
      const rec = { ...body.data, id, updatedAt: today, status, dibuatOleh: actor.nama, catatanVerifikasi: "" };
      sheet.appendRow(HEADERS.map((h) => rec[h] ?? ""));
      return jsonOut_({ ok: true, data: rec });
    }

    if (action === "update") {
      const sheet = getSheet_();
      const rowIndex = findRowIndexById_(sheet, body.id);
      if (rowIndex === -1) return jsonOut_({ ok: false, error: "ID tidak ditemukan" });
      const status = actor.role === "verifikator" ? "Terverifikasi" : "Belum Verifikasi";
      const rec = { ...body.data, id: body.id, updatedAt: today, status, catatanVerifikasi: "" };
      sheet.getRange(rowIndex, 1, 1, HEADERS.length).setValues([HEADERS.map((h) => rec[h] ?? "")]);
      return jsonOut_({ ok: true, data: rec });
    }

    if (action === "delete") {
      if (actor.role !== "verifikator") return jsonOut_({ ok: false, error: "Hanya Verifikator yang dapat menghapus data" });
      const sheet = getSheet_();
      const rowIndex = findRowIndexById_(sheet, body.id);
      if (rowIndex === -1) return jsonOut_({ ok: false, error: "ID tidak ditemukan" });
      sheet.deleteRow(rowIndex);
      return jsonOut_({ ok: true });
    }

    if (action === "verify") {
      if (actor.role !== "verifikator") return jsonOut_({ ok: false, error: "Hanya Verifikator yang dapat memverifikasi data" });
      const sheet = getSheet_();
      const rowIndex = findRowIndexById_(sheet, body.id);
      if (rowIndex === -1) return jsonOut_({ ok: false, error: "ID tidak ditemukan" });
      const values = sheet.getRange(rowIndex, 1, 1, HEADERS.length).getValues()[0];
      const rec = {};
      HEADERS.forEach((h, i) => { rec[h] = values[i]; });
      rec.status = body.decision === "update" ? "Perlu Update" : "Terverifikasi";
      rec.catatanVerifikasi = body.catatan || "";
      sheet.getRange(rowIndex, 1, 1, HEADERS.length).setValues([HEADERS.map((h) => rec[h] ?? "")]);
      return jsonOut_({ ok: true, data: rec });
    }

    // ----- Kolaborasi actions -----
    if (action === "addKolaborasi") {
      const sheet = getKolabSheet_();
      const id = "K" + Utilities.getUuid().slice(0, 8);
      const rec = { ...body.data, id, dicatatOleh: actor.nama };
      sheet.appendRow(KOLAB_HEADERS.map((h) => rec[h] ?? ""));
      return jsonOut_({ ok: true, data: rec });
    }

    if (action === "updateKolaborasi") {
      const sheet = getKolabSheet_();
      const rowIndex = findRowIndexById_(sheet, body.id);
      if (rowIndex === -1) return jsonOut_({ ok: false, error: "ID tidak ditemukan" });
      const rec = { ...body.data, id: body.id };
      sheet.getRange(rowIndex, 1, 1, KOLAB_HEADERS.length).setValues([KOLAB_HEADERS.map((h) => rec[h] ?? "")]);
      return jsonOut_({ ok: true, data: rec });
    }

    if (action === "deleteKolaborasi") {
      if (actor.role !== "verifikator") return jsonOut_({ ok: false, error: "Hanya Verifikator yang dapat menghapus catatan" });
      const sheet = getKolabSheet_();
      const rowIndex = findRowIndexById_(sheet, body.id);
      if (rowIndex === -1) return jsonOut_({ ok: false, error: "ID tidak ditemukan" });
      sheet.deleteRow(rowIndex);
      return jsonOut_({ ok: true });
    }

    return jsonOut_({ ok: false, error: "Aksi tidak dikenali: " + action });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}
