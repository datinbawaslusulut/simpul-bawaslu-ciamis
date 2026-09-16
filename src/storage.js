// ⚠️ GANTI baris di bawah ini dengan URL Web App Google Apps Script Anda sendiri
export const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzn8pAmAVQBHpPTY0hzQUTp3kp3Dg3mgdl8TE6gKEvnKiuqPKz1oabmu5UfF9hAzgSG/exec";

const TOKEN_KEY = "simpul_token";
const USER_KEY = "simpul_user";

export function getSavedSession() {
  const token = localStorage.getItem(TOKEN_KEY);
  const userRaw = localStorage.getItem(USER_KEY);
  if (!token || !userRaw) return null;
  try { return { token, user: JSON.parse(userRaw) }; } catch { return null; }
}
function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function callApi(action, payload) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" }, // hindari CORS preflight
    body: JSON.stringify({ action, ...payload }),
  });
  return res.json();
}

export async function login(username, password) {
  const json = await callApi("login", { username, password });
  if (!json.ok) throw new Error(json.error || "Login gagal");
  saveSession(json.token, json.user);
  return json.user;
}

export async function logout() {
  const session = getSavedSession();
  if (session) { try { await callApi("logout", { token: session.token }); } catch (e) {} }
  clearSession();
}

export async function fetchAll() {
  const res = await fetch(APPS_SCRIPT_URL, { method: "GET" });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Gagal memuat data");
  return { stakeholders: json.stakeholders, kolaborasi: json.kolaborasi };
}

function requireToken() {
  const session = getSavedSession();
  if (!session) throw new Error("Belum login");
  return session.token;
}

// ---- Stakeholder ----
export async function addRecord(data) {
  const json = await callApi("add", { token: requireToken(), data });
  if (!json.ok) throw new Error(json.error || "Gagal menambah data");
  return json.data;
}
export async function updateRecord(id, data) {
  const json = await callApi("update", { token: requireToken(), id, data });
  if (!json.ok) throw new Error(json.error || "Gagal menyimpan perubahan");
  return json.data;
}
export async function deleteRecord(id) {
  const json = await callApi("delete", { token: requireToken(), id });
  if (!json.ok) throw new Error(json.error || "Gagal menghapus data");
}
export async function verifyRecord(id, decision, catatan) {
  const json = await callApi("verify", { token: requireToken(), id, decision, catatan });
  if (!json.ok) throw new Error(json.error || "Gagal memproses verifikasi");
  return json.data;
}

// ---- Kolaborasi ----
export async function addKolaborasi(data) {
  const json = await callApi("addKolaborasi", { token: requireToken(), data });
  if (!json.ok) throw new Error(json.error || "Gagal menyimpan kegiatan");
  return json.data;
}
export async function updateKolaborasi(id, data) {
  const json = await callApi("updateKolaborasi", { token: requireToken(), id, data });
  if (!json.ok) throw new Error(json.error || "Gagal menyimpan perubahan");
  return json.data;
}
export async function deleteKolaborasi(id) {
  const json = await callApi("deleteKolaborasi", { token: requireToken(), id });
  if (!json.ok) throw new Error(json.error || "Gagal menghapus catatan");
}
