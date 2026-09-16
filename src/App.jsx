import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  LayoutGrid, Building2, Grid2x2, ArrowLeftRight, FileText, LogOut,
  Search, Plus, Pencil, Trash2, ShieldCheck, AlertTriangle,
  RefreshCw, Lock, Download, Printer,
} from "lucide-react";
import {
  fetchAll, addRecord, updateRecord, deleteRecord, verifyRecord,
  addKolaborasi, updateKolaborasi, deleteKolaborasi,
  login, logout, getSavedSession, APPS_SCRIPT_URL,
} from "./storage.js";

// ---------- Palet warna & konstanta (mengikuti acuan desain) ----------
const C = {
  bg: "#f4f6f8", card: "#ffffff", text: "#172033", muted: "#6b7280", line: "#e5e7eb",
  primary: "#173b72", primaryDark: "#102e59", primaryHover: "#214a82", accent: "#d6a84f",
  danger: "#b42318", ok: "#067647",
};
const TAG = {
  green: { bg: "#e7f6ee", fg: "#067647" },
  yellow: { bg: "#fff5d9", fg: "#8a5b00" },
  red: { bg: "#fdecec", fg: "#b42318" },
  blue: { bg: "#eaf0ff", fg: "#234f9b" },
};
const KATEGORI_LIST = ["Pemerintah", "Penyelenggara", "Akademisi", "Ormas/LSM", "Media", "Komunitas"];
const STATUS_TAG = { "Terverifikasi": "green", "Belum Verifikasi": "yellow", "Perlu Update": "red" };
const QUADRANT_TAG = { "Prioritas Utama": "red", "Jaga Hubungan Strategis": "yellow", "Informasi & Pelibatan": "blue", "Pantau": "green" };
const STALE_DAYS = 90;

function classify(influence, interest) {
  const hi = Number(influence) >= 4, hInt = Number(interest) >= 4;
  if (hi && hInt) return "Prioritas Utama";
  if (hi && !hInt) return "Jaga Hubungan Strategis";
  if (!hi && hInt) return "Informasi & Pelibatan";
  return "Pantau";
}
function daysSince(dateStr) {
  if (!dateStr) return 9999;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}
function formatTanggal(dateStr) {
  try { return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return dateStr; }
}
function initial(name) { return (name || "?").trim().charAt(0).toUpperCase(); }

const emptyForm = { nama: "", kategori: KATEGORI_LIST[0], wilayah: "", namaPIC: "", kontak: "", influence: 3, interest: 3, isuKolaborasi: "" };
const emptyKolabForm = { tanggal: new Date().toISOString().slice(0, 10), stakeholderId: "", kegiatan: "", hasil: "", status: "Tindak Lanjut", catatan: "" };

const SEED = [
  { nama: "KPU Kabupaten Ciamis", kategori: "Penyelenggara", wilayah: "Ciamis", namaPIC: "", kontak: "", influence: 5, interest: 5, isuKolaborasi: "Koordinasi kelembagaan, sinkronisasi data" },
  { nama: "Pemerintah Kabupaten Ciamis", kategori: "Pemerintah", wilayah: "Ciamis", namaPIC: "", kontak: "", influence: 5, interest: 4, isuKolaborasi: "Koordinasi lintas instansi" },
  { nama: "Universitas Islam Darussalam", kategori: "Akademisi", wilayah: "Ciamis", namaPIC: "", kontak: "", influence: 4, interest: 5, isuKolaborasi: "Pendidikan pemilih, riset kepemiluan" },
  { nama: "Media Lokal Ciamis", kategori: "Media", wilayah: "Ciamis", namaPIC: "", kontak: "", influence: 3, interest: 4, isuKolaborasi: "Publikasi dan diseminasi informasi" },
  { nama: "Kesbangpol Kabupaten Ciamis", kategori: "Pemerintah", wilayah: "Ciamis", namaPIC: "", kontak: "", influence: 4, interest: 3, isuKolaborasi: "Stabilitas politik lokal" },
  { nama: "Organisasi Pengawas Partisipatif", kategori: "Ormas/LSM", wilayah: "Ciamis", namaPIC: "", kontak: "", influence: 2, interest: 4, isuKolaborasi: "Pengawasan partisipatif" },
  { nama: "Parpol Peserta Pemilu", kategori: "Ormas/LSM", wilayah: "Ciamis", namaPIC: "", kontak: "", influence: 3, interest: 2, isuKolaborasi: "Kepatuhan kampanye" },
  { nama: "Komunitas Pemuda Ciamis", kategori: "Komunitas", wilayah: "Ciamis", namaPIC: "", kontak: "", influence: 2, interest: 3, isuKolaborasi: "Edukasi pemilih pemula" },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const saved = getSavedSession();
    if (saved) setUser(saved.user);
    setChecking(false);
  }, []);

  const notConfigured = !APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes("TEMPEL_URL");
  if (notConfigured) {
    return (
      <div style={{ backgroundColor: C.bg, minHeight: "100vh", fontFamily: "Inter, 'Segoe UI', Arial, sans-serif" }} className="flex items-center justify-center p-6">
        <div className="max-w-md p-6 rounded-2xl border" style={{ backgroundColor: C.card, borderColor: C.line }}>
          <h1 className="font-bold text-lg mb-2">Belum terhubung ke Google Sheets</h1>
          <p className="text-sm" style={{ color: C.muted }}>
            Buka <code>src/storage.js</code>, ganti <code>APPS_SCRIPT_URL</code> dengan URL Web App Apps Script Anda, lalu muat ulang.
          </p>
        </div>
      </div>
    );
  }
  if (checking) return null;
  if (!user) return <LoginScreen onLoggedIn={setUser} />;
  return <Shell user={user} onLoggedOut={() => setUser(null)} />;
}

function LoginScreen({ onLoggedIn }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError("");
    try { onLoggedIn(await login(username.trim(), password)); }
    catch (err) { setError(err.message || "Login gagal"); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ backgroundColor: C.primaryDark, minHeight: "100vh", fontFamily: "Inter, 'Segoe UI', Arial, sans-serif" }} className="flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-white font-extrabold text-3xl tracking-wide">SIMPUL</div>
          <div className="text-xs mt-2" style={{ color: "#9db3d6" }}>Sekretariat Bawaslu Kabupaten Ciamis</div>
        </div>
        <form onSubmit={submit} className="p-6 rounded-2xl" style={{ backgroundColor: C.card }}>
          <div className="flex items-center gap-2 mb-5" style={{ color: C.muted }}><Lock size={15} /><span className="text-sm font-semibold">Masuk ke akun Anda</span></div>
          {error && <div className="mb-4 px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: TAG.red.bg, color: TAG.red.fg }}>{error}</div>}
          <div className="mb-4">
            <label className="text-xs font-semibold block mb-1.5" style={{ color: C.muted }}>Username</label>
            <input autoFocus value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border text-sm" style={{ borderColor: "#d6dbe2" }} required />
          </div>
          <div className="mb-6">
            <label className="text-xs font-semibold block mb-1.5" style={{ color: C.muted }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border text-sm" style={{ borderColor: "#d6dbe2" }} required />
          </div>
          <button disabled={busy} className="w-full py-2.5 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: C.primary }}>{busy ? "Memeriksa…" : "Masuk"}</button>
        </form>
        <p className="text-center text-xs mt-5" style={{ color: "#9db3d6" }}>Belum punya akun? Hubungi Verifikator/pengelola SIMPUL.</p>
      </div>
    </div>
  );
}

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutGrid, title: "Dashboard Strategis" },
  { key: "stakeholder", label: "Data Stakeholder", icon: Building2, title: "Data Stakeholder" },
  { key: "mapping", label: "Pemetaan Stakeholder", icon: Grid2x2, title: "Pemetaan Stakeholder" },
  { key: "collab", label: "Kolaborasi", icon: ArrowLeftRight, title: "Kolaborasi" },
  { key: "report", label: "Laporan", icon: FileText, title: "Laporan" },
];

function Shell({ user, onLoggedOut }) {
  const [page, setPage] = useState("dashboard");
  const [stakeholders, setStakeholders] = useState([]);
  const [kolaborasi, setKolaborasi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [seeding, setSeeding] = useState(false);

  const [query, setQuery] = useState("");
  const [collabQuery, setCollabQuery] = useState("");
  const [reportFilter, setReportFilter] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [profileItem, setProfileItem] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [verifyTarget, setVerifyTarget] = useState(null);

  const [kolabFormOpen, setKolabFormOpen] = useState(false);
  const [editingKolabId, setEditingKolabId] = useState(null);
  const [kolabForm, setKolabForm] = useState(emptyKolabForm);
  const [confirmDeleteKolabId, setConfirmDeleteKolabId] = useState(null);

  const isVerifikator = user.role === "verifikator";

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const { stakeholders, kolaborasi } = await fetchAll();
      setStakeholders(stakeholders || []);
      setKolaborasi(kolaborasi || []);
    } catch (e) { setError("Tidak dapat memuat data dari Google Sheets."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function handleLogout() { await logout(); onLoggedOut(); }

  async function seedInitialData() {
    setSeeding(true); setError("");
    try { for (const item of SEED) await addRecord(item); await load(); }
    catch (e) { setError("Gagal mengisi data awal."); }
    finally { setSeeding(false); }
  }

  const enriched = useMemo(() => stakeholders.map((d) => ({ ...d, quadrant: classify(d.influence, d.interest), stale: daysSince(d.updatedAt) > STALE_DAYS })), [stakeholders]);

  const stats = useMemo(() => {
    const total = enriched.length;
    const prioritas = enriched.filter((d) => d.quadrant === "Prioritas Utama").length;
    const perluUpdate = enriched.filter((d) => d.status === "Perlu Update" || d.stale).length;
    const kolaborasiAktif = kolaborasi.filter((k) => k.status === "Tindak Lanjut").length;
    const byKategori = {};
    KATEGORI_LIST.forEach((k) => { byKategori[k] = enriched.filter((d) => d.kategori === k).length; });
    const byStatus = {
      "Terverifikasi": enriched.filter((d) => d.status === "Terverifikasi").length,
      "Belum Verifikasi": enriched.filter((d) => d.status === "Belum Verifikasi").length,
      "Perlu Update": enriched.filter((d) => d.status === "Perlu Update").length,
    };
    const byQuadrant = { "Prioritas Utama": 0, "Jaga Hubungan Strategis": 0, "Informasi & Pelibatan": 0, "Pantau": 0 };
    enriched.forEach((d) => { byQuadrant[d.quadrant] += 1; });
    return { total, prioritas, perluUpdate, kolaborasiAktif, byKategori, byStatus, byQuadrant };
  }, [enriched, kolaborasi]);

  const filteredStakeholders = useMemo(() => {
    let list = enriched;
    if (reportFilter === "prioritas") list = list.filter((d) => d.quadrant === "Prioritas Utama");
    if (reportFilter === "update") list = list.filter((d) => d.status === "Perlu Update" || d.stale);
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter((d) => [d.nama, d.kategori, d.wilayah].join(" ").toLowerCase().includes(q));
  }, [enriched, query, reportFilter]);

  const filteredKolaborasi = useMemo(() => {
    if (!collabQuery.trim()) return kolaborasi;
    const q = collabQuery.toLowerCase();
    return kolaborasi.filter((k) => [k.stakeholderNama, k.kegiatan, k.hasil].join(" ").toLowerCase().includes(q));
  }, [kolaborasi, collabQuery]);

  function openAdd() { setEditingId(null); setForm(emptyForm); setFormOpen(true); }
  function openEdit(item) {
    setEditingId(item.id);
    setForm({ nama: item.nama, kategori: item.kategori, wilayah: item.wilayah || "", namaPIC: item.namaPIC || "", kontak: item.kontak || "", influence: item.influence, interest: item.interest, isuKolaborasi: item.isuKolaborasi || "" });
    setFormOpen(true);
  }
  function closeForm() { setFormOpen(false); setEditingId(null); setForm(emptyForm); }

  async function submitForm(e) {
    e.preventDefault();
    if (!form.nama.trim()) return;
    setSaving(true); setError("");
    try {
      const payload = { ...form, influence: Number(form.influence), interest: Number(form.interest) };
      if (editingId) await updateRecord(editingId, payload); else await addRecord(payload);
      await load(); closeForm();
    } catch (e2) { setError(e2.message); }
    finally { setSaving(false); }
  }

  async function doDelete(id) {
    setSaving(true);
    try { await deleteRecord(id); await load(); }
    catch (e) { setError(e.message); }
    finally { setSaving(false); setConfirmDeleteId(null); }
  }

  async function submitVerify(decision, catatan) {
    setSaving(true);
    try { await verifyRecord(verifyTarget.id, decision, catatan); await load(); setVerifyTarget(null); }
    catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  function openAddKolab(stakeholderId) {
    setEditingKolabId(null);
    setKolabForm({ ...emptyKolabForm, stakeholderId: stakeholderId || (stakeholders[0] && stakeholders[0].id) || "" });
    setKolabFormOpen(true);
  }
  function closeKolabForm() { setKolabFormOpen(false); setEditingKolabId(null); setKolabForm(emptyKolabForm); }

  async function submitKolabForm(e) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      const stakeholder = stakeholders.find((s) => s.id === kolabForm.stakeholderId);
      const payload = { ...kolabForm, stakeholderNama: stakeholder ? stakeholder.nama : "" };
      if (editingKolabId) await updateKolaborasi(editingKolabId, payload); else await addKolaborasi(payload);
      await load(); closeKolabForm();
    } catch (e2) { setError(e2.message); }
    finally { setSaving(false); }
  }

  async function doDeleteKolab(id) {
    setSaving(true);
    try { await deleteKolaborasi(id); await load(); }
    catch (e) { setError(e.message); }
    finally { setSaving(false); setConfirmDeleteKolabId(null); }
  }

  function exportCsv() {
    const header = ["Nama", "Kategori", "Wilayah", "PIC", "Pengaruh", "Kepentingan", "Kuadran", "Status", "Diperbarui"];
    const rows = enriched.map((d) => [d.nama, d.kategori, d.wilayah, d.namaPIC, d.influence, d.interest, d.quadrant, d.status, d.updatedAt]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "simpul-stakeholder.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const activeNav = NAV_ITEMS.find((n) => n.key === page);

  return (
    <div style={{ fontFamily: "Inter, 'Segoe UI', Arial, sans-serif", backgroundColor: C.bg, color: C.text, minHeight: "100vh" }}>
      <style>{`@media print { .no-print { display:none !important; } }`}</style>
      <div className="flex min-h-screen">
        <aside className="no-print w-60 shrink-0 hidden md:block" style={{ backgroundColor: C.primaryDark, color: "#fff" }}>
          <div className="p-6">
            <div className="font-extrabold text-2xl tracking-wide">SIMPUL</div>
            <div className="text-[10px] mt-1 opacity-70 leading-snug">Sistem Informasi Manajemen Pemutakhiran Data Stakeholder</div>
          </div>
          <nav className="px-3">
            {NAV_ITEMS.map((it) => {
              const Icon = it.icon; const active = page === it.key;
              return (
                <button key={it.key} onClick={() => { setPage(it.key); setReportFilter(null); }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 mb-1 rounded-lg text-sm text-left"
                  style={{ backgroundColor: active ? C.primaryHover : "transparent", color: active ? "#fff" : "#dbe7f5" }}>
                  <Icon size={16} strokeWidth={2} />{it.label}
                  {it.key === "stakeholder" && stats.byStatus["Belum Verifikasi"] > 0 && (
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: C.accent, color: C.primaryDark }}>{stats.byStatus["Belum Verifikasi"]}</span>
                  )}
                </button>
              );
            })}
          </nav>
          <div className="px-6 py-5 mt-4" style={{ borderTop: "1px solid #22406e" }}>
            <div className="flex items-center gap-2 mb-1">
              {isVerifikator ? <ShieldCheck size={13} style={{ color: C.accent }} /> : <Pencil size={13} style={{ color: "#9db3d6" }} />}
              <span className="text-sm font-semibold">{user.nama}</span>
            </div>
            <div className="text-xs mb-3" style={{ color: "#9db3d6" }}>{isVerifikator ? "Verifikator" : "Operator"}</div>
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs" style={{ color: "#9db3d6" }}><LogOut size={12} /> Keluar</button>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <header className="no-print h-[70px] flex items-center justify-between px-8" style={{ backgroundColor: C.card, borderBottom: `1px solid ${C.line}` }}>
            <strong>{activeNav.title}</strong>
            <div className="flex items-center gap-3">
              {saving && <span className="text-xs flex items-center gap-1.5" style={{ color: C.muted }}><RefreshCw size={12} className="animate-spin" /> Menyimpan…</span>}
              <button onClick={load} className="p-2 rounded-lg hover:bg-black/5" aria-label="Muat ulang"><RefreshCw size={15} style={{ color: C.muted }} /></button>
              <div className="text-sm" style={{ color: C.muted }}>● {user.nama}</div>
            </div>
          </header>

          <div className="p-7 max-w-[1400px] mx-auto">
            {error && (
              <div className="mb-4 px-4 py-3 rounded-lg flex items-center gap-2 text-sm" style={{ backgroundColor: TAG.red.bg, color: TAG.red.fg }}>
                <AlertTriangle size={16} /> {error}
              </div>
            )}

            {loading ? (
              <div className="text-sm" style={{ color: C.muted }}>Memuat data dari Google Sheets…</div>
            ) : stakeholders.length === 0 ? (
              <div>
                <p className="text-sm mb-3" style={{ color: C.muted }}>Spreadsheet masih kosong. Isi dengan data contoh?</p>
                <button onClick={seedInitialData} disabled={seeding} className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: C.primary }}>
                  {seeding ? "Mengisi…" : "Isi data contoh"}
                </button>
              </div>
            ) : page === "dashboard" ? (
              <DashboardPage stats={stats} enriched={enriched} setPage={setPage} setReportFilter={setReportFilter} />
            ) : page === "stakeholder" ? (
              <StakeholderPage
                data={filteredStakeholders} query={query} setQuery={setQuery} onAdd={openAdd} onEdit={openEdit}
                onProfile={setProfileItem} onDelete={(id) => setConfirmDeleteId(id)} onVerify={setVerifyTarget}
                isVerifikator={isVerifikator} reportFilter={reportFilter} clearFilter={() => setReportFilter(null)}
              />
            ) : page === "mapping" ? (
              <MappingPage enriched={enriched} stats={stats} />
            ) : page === "collab" ? (
              <CollabPage
                data={filteredKolaborasi} query={collabQuery} setQuery={setCollabQuery}
                onAdd={() => openAddKolab()} onDelete={(id) => setConfirmDeleteKolabId(id)}
                isVerifikator={isVerifikator}
              />
            ) : (
              <ReportPage stats={stats} onPreview={(f) => { setReportFilter(f); setPage("stakeholder"); }} onExportCsv={exportCsv} />
            )}
          </div>
        </main>
      </div>

      {formOpen && <StakeholderForm form={form} setForm={setForm} editing={!!editingId} onClose={closeForm} onSubmit={submitForm} />}
      {profileItem && <ProfileModal item={profileItem} onClose={() => setProfileItem(null)} />}
      {confirmDeleteId && (
        <ConfirmDialog title="Hapus stakeholder ini?" desc={`"${stakeholders.find((d) => d.id === confirmDeleteId)?.nama}" akan dihapus dari basis data.`}
          onCancel={() => setConfirmDeleteId(null)} onConfirm={() => doDelete(confirmDeleteId)} />
      )}
      {verifyTarget && <VerifyDialog item={verifyTarget} onClose={() => setVerifyTarget(null)} onSubmit={submitVerify} />}

      {kolabFormOpen && (
        <KolaborasiForm form={kolabForm} setForm={setKolabForm} stakeholders={stakeholders} editing={!!editingKolabId} onClose={closeKolabForm} onSubmit={submitKolabForm} />
      )}
      {confirmDeleteKolabId && (
        <ConfirmDialog title="Hapus catatan kegiatan ini?" desc="Riwayat kolaborasi ini akan dihapus."
          onCancel={() => setConfirmDeleteKolabId(null)} onConfirm={() => doDeleteKolab(confirmDeleteKolabId)} />
      )}
    </div>
  );
}

// ---------- Komponen kecil ----------

function Tag({ children, color = "blue" }) {
  const t = TAG[color] || TAG.blue;
  return <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: t.bg, color: t.fg }}>{children}</span>;
}
function StatusTag({ status }) { return <Tag color={STATUS_TAG[status] || "yellow"}>{status || "Belum Verifikasi"}</Tag>; }
function QuadrantTag({ quadrant }) { return <Tag color={QUADRANT_TAG[quadrant] || "blue"}>{quadrant}</Tag>; }

function Card({ label, value, hint, hintColor }) {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
      <div className="text-sm" style={{ color: C.muted }}>{label}</div>
      <div className="text-3xl font-extrabold my-2">{value}</div>
      <div className="text-xs" style={{ color: hintColor || C.ok }}>{hint}</div>
    </div>
  );
}
function Panel({ title, children, style }) {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, ...style }}>
      {title && <h3 className="text-base font-bold mb-4">{title}</h3>}
      {children}
    </div>
  );
}
function BarRow({ label, value, max }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2.5 my-3">
      <span className="text-sm" style={{ width: 125 }}>{label}</span>
      <div className="flex-1 h-2.5 rounded-lg overflow-hidden" style={{ backgroundColor: "#edf0f4" }}>
        <div className="h-full rounded-lg" style={{ width: `${pct}%`, backgroundColor: "#315f9d" }} />
      </div>
      <span className="text-xs" style={{ color: C.muted }}>{value}</span>
    </div>
  );
}
function Toolbar({ children }) { return <div className="flex gap-2.5 mb-4">{children}</div>; }
function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="relative flex-1">
      <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: C.muted }} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full pl-10 pr-3 py-2.5 rounded-lg border text-sm" style={{ borderColor: "#d6dbe2" }} />
    </div>
  );
}
function Btn({ children, onClick, variant = "primary", type = "button", disabled }) {
  const styles = {
    primary: { backgroundColor: C.primary, color: "#fff" },
    secondary: { backgroundColor: "#eef2f7", color: C.primary },
    gold: { backgroundColor: C.accent, color: C.text },
    danger: { backgroundColor: TAG.red.bg, color: TAG.red.fg },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className="rounded-lg px-4 py-2.5 text-sm font-semibold whitespace-nowrap" style={styles[variant]}>
      {children}
    </button>
  );
}

// ---------- Dashboard ----------

function DashboardPage({ stats, enriched, setPage, setReportFilter }) {
  const maxKategori = Math.max(1, ...Object.values(stats.byKategori));
  const maxStatus = Math.max(1, ...Object.values(stats.byStatus));
  const prioritasList = enriched.filter((d) => d.quadrant === "Prioritas Utama").slice(0, 6);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1.5">Dashboard Strategis Stakeholder</h1>
      <div className="text-sm mb-6" style={{ color: C.muted }}>Ringkasan kondisi data stakeholder dan informasi strategis Bawaslu Kabupaten Ciamis.</div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="Total Stakeholder" value={stats.total} hint="Basis data terintegrasi" />
        <Card label="Stakeholder Prioritas" value={stats.prioritas}
          hint={`${stats.total ? Math.round((stats.prioritas / stats.total) * 100) : 0}% dari total`} />
        <Card label="Perlu Pemutakhiran" value={stats.perluUpdate} hint="Perlu tindak lanjut" hintColor={C.danger} />
        <Card label="Kolaborasi Aktif" value={stats.kolaborasiAktif} hint="Status tindak lanjut" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <Panel title="Stakeholder berdasarkan kategori">
          {KATEGORI_LIST.map((k) => <BarRow key={k} label={k} value={stats.byKategori[k]} max={maxKategori} />)}
        </Panel>
        <Panel title="Status kualitas data">
          {Object.entries(stats.byStatus).map(([k, v]) => <BarRow key={k} label={k} value={v} max={maxStatus} />)}
        </Panel>
      </div>

      <Panel title="Stakeholder prioritas terbaru" style={{ marginTop: 18 }}>
        {prioritasList.length === 0 ? (
          <p className="text-sm" style={{ color: C.muted }}>Belum ada stakeholder pada kuadran Prioritas Utama.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr style={{ color: C.muted }}><th className="text-left font-semibold py-2.5">Stakeholder</th><th className="text-left font-semibold py-2.5">Kategori</th><th className="text-left font-semibold py-2.5">Pengaruh</th><th className="text-left font-semibold py-2.5">Kepentingan</th><th className="text-left font-semibold py-2.5">Posisi</th></tr></thead>
            <tbody>
              {prioritasList.map((d) => (
                <tr key={d.id} style={{ borderTop: `1px solid ${C.line}` }}>
                  <td className="py-3 font-bold">{d.nama}</td>
                  <td className="py-3">{d.kategori}</td>
                  <td className="py-3">{d.influence}/5</td>
                  <td className="py-3">{d.interest}/5</td>
                  <td className="py-3"><QuadrantTag quadrant={d.quadrant} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}

// ---------- Data Stakeholder ----------

function StakeholderPage({ data, query, setQuery, onAdd, onEdit, onProfile, onDelete, onVerify, isVerifikator, reportFilter, clearFilter }) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1.5">Data Stakeholder</h1>
      <div className="text-sm mb-6" style={{ color: C.muted }}>Database terintegrasi, terverifikasi, dan dapat dimutakhirkan secara berkala.</div>

      {reportFilter && (
        <div className="mb-4 px-4 py-2.5 rounded-lg text-sm flex items-center justify-between" style={{ backgroundColor: TAG.blue.bg, color: TAG.blue.fg }}>
          <span>Menampilkan hasil saring dari halaman Laporan.</span>
          <button onClick={clearFilter} className="font-semibold underline">Tampilkan semua</button>
        </div>
      )}

      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Cari nama stakeholder, kategori, atau wilayah..." />
        <Btn onClick={onAdd}><span className="inline-flex items-center gap-1.5"><Plus size={15} /> Tambah Stakeholder</span></Btn>
      </Toolbar>

      <Panel>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: C.muted }}>
              <th className="text-left font-semibold py-2.5">Stakeholder</th>
              <th className="text-left font-semibold py-2.5">Kategori</th>
              <th className="text-left font-semibold py-2.5">Wilayah</th>
              <th className="text-left font-semibold py-2.5">Pengaruh</th>
              <th className="text-left font-semibold py-2.5">Kepentingan</th>
              <th className="text-left font-semibold py-2.5">Status Data</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.id} style={{ borderTop: `1px solid ${C.line}` }}>
                <td className="py-3 font-bold">{d.nama}</td>
                <td className="py-3">{d.kategori}</td>
                <td className="py-3">{d.wilayah}</td>
                <td className="py-3">{d.influence}</td>
                <td className="py-3">{d.interest}</td>
                <td className="py-3">
                  <StatusTag status={d.status} />
                  {d.status === "Perlu Update" && d.catatanVerifikasi && (
                    <div className="text-xs mt-1" style={{ color: C.danger }}>{d.catatanVerifikasi}</div>
                  )}
                </td>
                <td className="py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    {isVerifikator && d.status === "Belum Verifikasi" && (
                      <button onClick={() => onVerify(d)} className="text-xs px-2.5 py-1.5 rounded-lg font-semibold" style={{ backgroundColor: TAG.green.bg, color: TAG.green.fg }}>Verifikasi</button>
                    )}
                    <Btn variant="secondary" onClick={() => onProfile(d)}>Profil</Btn>
                    <button onClick={() => onEdit(d)} className="p-1.5 rounded-lg hover:bg-black/5" aria-label="Ubah"><Pencil size={15} style={{ color: C.muted }} /></button>
                    {isVerifikator && <button onClick={() => onDelete(d.id)} className="p-1.5 rounded-lg hover:bg-black/5" aria-label="Hapus"><Trash2 size={15} style={{ color: C.muted }} /></button>}
                  </div>
                </td>
              </tr>
            ))}
            {data.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-sm" style={{ color: C.muted }}>Tidak ada stakeholder yang cocok.</td></tr>}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

function FieldLabel({ children }) { return <label className="text-xs font-semibold block mb-1.5" style={{ color: C.muted }}>{children}</label>; }
function Field({ label, children, full }) {
  return <div className={full ? "col-span-2" : ""}><FieldLabel>{label}</FieldLabel>{children}</div>;
}
const inputCls = "w-full px-3 py-2.5 rounded-lg border text-sm";
const inputStyle = { borderColor: "#d7dce3" };

function ModalShell({ title, sub, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "#00000077" }}>
      <div className={`w-full ${wide ? "max-w-2xl" : "max-w-lg"} rounded-2xl p-6 max-h-[90vh] overflow-auto`} style={{ backgroundColor: C.card }}>
        <div className="flex items-start justify-between">
          <div><h2 className="text-xl font-bold">{title}</h2>{sub && <p className="text-sm mt-1" style={{ color: C.muted }}>{sub}</p>}</div>
          <button onClick={onClose} className="text-2xl leading-none" aria-label="Tutup">×</button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

function StakeholderForm({ form, setForm, editing, onClose, onSubmit }) {
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <ModalShell title={editing ? "Ubah Stakeholder" : "Tambah Stakeholder"} sub="Data akan masuk antrean verifikasi bila diperlukan." onClose={onClose} wide>
      <form onSubmit={onSubmit}>
        {editing && (
          <div className="text-xs px-3 py-2 rounded-lg mb-4" style={{ backgroundColor: "#f1efe7", color: C.muted }}>
            Perubahan pada data terverifikasi akan mengembalikannya ke status "Belum Verifikasi" (kecuali Anda Verifikator).
          </div>
        )}
        <div className="grid grid-cols-2 gap-3.5">
          <Field label="Nama Lembaga/Organisasi" full>
            <input required value={form.nama} onChange={set("nama")} placeholder="Contoh: KPU Kabupaten Ciamis" className={inputCls} style={inputStyle} />
          </Field>
          <Field label="Kategori">
            <select value={form.kategori} onChange={set("kategori")} className={inputCls} style={inputStyle}>
              {KATEGORI_LIST.map((k) => <option key={k}>{k}</option>)}
            </select>
          </Field>
          <Field label="Wilayah">
            <input value={form.wilayah} onChange={set("wilayah")} placeholder="Kecamatan" className={inputCls} style={inputStyle} />
          </Field>
          <Field label="Nama PIC">
            <input value={form.namaPIC} onChange={set("namaPIC")} placeholder="Nama penanggung jawab" className={inputCls} style={inputStyle} />
          </Field>
          <Field label="Kontak PIC (opsional)">
            <input value={form.kontak} onChange={set("kontak")} placeholder="No. HP / email" className={inputCls} style={inputStyle} />
          </Field>
          <Field label="Pengaruh (1–5)">
            <select value={form.influence} onChange={set("influence")} className={inputCls} style={inputStyle}>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
          <Field label="Kepentingan (1–5)">
            <select value={form.interest} onChange={set("interest")} className={inputCls} style={inputStyle}>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
          <Field label="Isu/Potensi Kolaborasi" full>
            <textarea rows={3} value={form.isuKolaborasi} onChange={set("isuKolaborasi")} placeholder="Pendidikan pemilih, pengawasan partisipatif, dll." className={inputCls} style={inputStyle} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Btn variant="secondary" onClick={onClose}>Batal</Btn>
          <button type="submit" className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: C.primary }}>
            {editing ? "Simpan Perubahan" : "Simpan & Ajukan Verifikasi"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ProfileModal({ item, onClose }) {
  return (
    <ModalShell title="" onClose={onClose} wide>
      <div className="grid grid-cols-[110px_1fr] gap-5">
        <div className="w-[110px] h-[110px] rounded-full flex items-center justify-center text-3xl font-extrabold" style={{ backgroundColor: "#e9eef5", color: "#315f9d" }}>{initial(item.nama)}</div>
        <div>
          <h2 className="text-xl font-bold">{item.nama}</h2>
          <p className="text-sm mt-0.5" style={{ color: C.muted }}>Profil Stakeholder Strategis</p>
          <div className="flex gap-2 mt-2"><StatusTag status={item.status} /><QuadrantTag quadrant={item.quadrant} /></div>
        </div>
      </div>
      <hr className="my-5" style={{ borderColor: C.line }} />
      <div className="grid grid-cols-2 gap-3.5">
        <Field label="Kategori"><input readOnly value={item.kategori} className={inputCls} style={inputStyle} /></Field>
        <Field label="Wilayah"><input readOnly value={item.wilayah || "-"} className={inputCls} style={inputStyle} /></Field>
        <Field label="Nama PIC"><input readOnly value={item.namaPIC || "-"} className={inputCls} style={inputStyle} /></Field>
        <Field label="Kontak PIC"><input readOnly value={item.kontak || "-"} className={inputCls} style={inputStyle} /></Field>
        <Field label="Pengaruh"><input readOnly value={`${item.influence} / 5`} className={inputCls} style={inputStyle} /></Field>
        <Field label="Kepentingan"><input readOnly value={`${item.interest} / 5`} className={inputCls} style={inputStyle} /></Field>
        <Field label="Isu/Potensi Kolaborasi" full><textarea readOnly rows={3} value={item.isuKolaborasi || "-"} className={inputCls} style={inputStyle} /></Field>
        <Field label="Terakhir diperbarui"><input readOnly value={formatTanggal(item.updatedAt)} className={inputCls} style={inputStyle} /></Field>
        <Field label="Dibuat oleh"><input readOnly value={item.dibuatOleh || "-"} className={inputCls} style={inputStyle} /></Field>
      </div>
    </ModalShell>
  );
}

function VerifyDialog({ item, onClose, onSubmit }) {
  const [catatan, setCatatan] = useState("");
  return (
    <ModalShell title="Verifikasi Data" onClose={onClose}>
      <p className="text-sm font-bold">{item.nama}</p>
      <p className="text-xs mb-4" style={{ color: C.muted }}>{item.kategori} · {item.wilayah}</p>
      <FieldLabel>Catatan (opsional, terutama jika meminta update)</FieldLabel>
      <textarea rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)} className={inputCls} style={{ ...inputStyle, marginBottom: 20 }} placeholder="Contoh: mohon lengkapi kontak PIC" />
      <div className="flex justify-end gap-2">
        <Btn variant="danger" onClick={() => onSubmit("update", catatan)}>Minta Update</Btn>
        <button onClick={() => onSubmit("approve", catatan)} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: C.ok }}>Setujui / Verifikasi</button>
      </div>
    </ModalShell>
  );
}

function ConfirmDialog({ title, desc, onCancel, onConfirm }) {
  return (
    <ModalShell title={title} onClose={onCancel}>
      <p className="text-sm mb-5" style={{ color: C.muted }}>{desc} Tindakan ini tidak dapat dibatalkan.</p>
      <div className="flex justify-end gap-2">
        <Btn variant="secondary" onClick={onCancel}>Batal</Btn>
        <button onClick={onConfirm} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: C.danger }}>Hapus</button>
      </div>
    </ModalShell>
  );
}

// ---------- Pemetaan Stakeholder ----------

function MappingPage({ enriched, stats }) {
  const groups = { "Jaga Hubungan Strategis": [], "Prioritas Utama": [], "Pantau": [], "Informasi & Pelibatan": [] };
  enriched.forEach((d) => groups[d.quadrant].push(d));

  const QuadBox = ({ name }) => (
    <div className="border p-3.5 text-xs" style={{ borderColor: "#dfe4ea" }}>
      <b>{name.toUpperCase()}</b>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {groups[name].length === 0 && <span style={{ color: C.muted }}>Belum ada</span>}
        {groups[name].map((d) => (
          <span key={d.id} className="px-2 py-1 rounded-full" style={{ backgroundColor: "#eaf0f8" }}>{d.nama}</span>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1.5">Pemetaan Stakeholder</h1>
      <div className="text-sm mb-6" style={{ color: C.muted }}>Matriks Pengaruh × Kepentingan untuk menentukan prioritas pendekatan.</div>

      <Panel>
        <div className="grid gap-0" style={{ gridTemplateColumns: "80px 1fr 1fr", gridTemplateRows: "1fr 1fr 45px", height: 350 }}>
          <div className="flex items-center justify-center font-bold text-sm" style={{ writingMode: "vertical-rl", color: C.muted, gridColumn: 1, gridRow: "1 / 3" }}>PENGARUH →</div>
          <QuadBox name="Jaga Hubungan Strategis" />
          <QuadBox name="Prioritas Utama" />
          <QuadBox name="Pantau" />
          <QuadBox name="Informasi & Pelibatan" />
          <div className="text-center font-bold text-sm py-3" style={{ gridColumn: "2 / 4", color: C.muted }}>KEPENTINGAN →</div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <Panel title="Prioritas">
          <p className="mb-2"><QuadrantTag quadrant="Prioritas Utama" /> <span className="ml-1.5 text-sm">{stats.byQuadrant["Prioritas Utama"]} stakeholder</span></p>
          <p className="mb-2"><QuadrantTag quadrant="Jaga Hubungan Strategis" /> <span className="ml-1.5 text-sm">{stats.byQuadrant["Jaga Hubungan Strategis"]} stakeholder</span></p>
          <p className="mb-2"><QuadrantTag quadrant="Informasi & Pelibatan" /> <span className="ml-1.5 text-sm">{stats.byQuadrant["Informasi & Pelibatan"]} stakeholder</span></p>
          <p><QuadrantTag quadrant="Pantau" /> <span className="ml-1.5 text-sm">{stats.byQuadrant["Pantau"]} stakeholder</span></p>
        </Panel>
        <Panel title="Logika sistem">
          <p className="text-sm" style={{ color: C.muted }}>Operator/Verifikator memasukkan skor Pengaruh dan Kepentingan (1–5) saat menambah atau mengubah data. SIMPUL menentukan kuadran secara otomatis (ambang tinggi ≥4) sehingga pemetaan lebih konsisten dan terdokumentasi.</p>
        </Panel>
      </div>
    </div>
  );
}

// ---------- Kolaborasi ----------

function CollabPage({ data, query, setQuery, onAdd, onDelete, isVerifikator }) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1.5">Kolaborasi</h1>
      <div className="text-sm mb-6" style={{ color: C.muted }}>Riwayat koordinasi, hasil kegiatan, dan tindak lanjut stakeholder.</div>
      <Panel>
        <Toolbar>
          <SearchInput value={query} onChange={setQuery} placeholder="Cari kegiatan atau stakeholder..." />
          <Btn onClick={onAdd}><span className="inline-flex items-center gap-1.5"><Plus size={15} /> Catat Kegiatan</span></Btn>
        </Toolbar>
        <table className="w-full text-sm">
          <thead><tr style={{ color: C.muted }}><th className="text-left font-semibold py-2.5">Tanggal</th><th className="text-left font-semibold py-2.5">Stakeholder</th><th className="text-left font-semibold py-2.5">Kegiatan</th><th className="text-left font-semibold py-2.5">Hasil</th><th className="text-left font-semibold py-2.5">Status</th><th></th></tr></thead>
          <tbody>
            {data.map((k) => (
              <tr key={k.id} style={{ borderTop: `1px solid ${C.line}` }}>
                <td className="py-3">{formatTanggal(k.tanggal)}</td>
                <td className="py-3 font-semibold">{k.stakeholderNama}</td>
                <td className="py-3">{k.kegiatan}</td>
                <td className="py-3">{k.hasil}</td>
                <td className="py-3"><Tag color={k.status === "Selesai" ? "green" : "yellow"}>{k.status}</Tag></td>
                <td className="py-3 text-right">
                  {isVerifikator && <button onClick={() => onDelete(k.id)} className="p-1.5 rounded-lg hover:bg-black/5" aria-label="Hapus"><Trash2 size={15} style={{ color: C.muted }} /></button>}
                </td>
              </tr>
            ))}
            {data.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-sm" style={{ color: C.muted }}>Belum ada riwayat kolaborasi.</td></tr>}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

function KolaborasiForm({ form, setForm, stakeholders, editing, onClose, onSubmit }) {
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <ModalShell title={editing ? "Ubah Kegiatan" : "Catat Kegiatan Kolaborasi"} onClose={onClose} wide>
      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-2 gap-3.5">
          <Field label="Tanggal"><input type="date" required value={form.tanggal} onChange={set("tanggal")} className={inputCls} style={inputStyle} /></Field>
          <Field label="Stakeholder">
            <select required value={form.stakeholderId} onChange={set("stakeholderId")} className={inputCls} style={inputStyle}>
              <option value="" disabled>Pilih stakeholder</option>
              {stakeholders.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
            </select>
          </Field>
          <Field label="Kegiatan" full><input required value={form.kegiatan} onChange={set("kegiatan")} placeholder="Contoh: Koordinasi kelembagaan" className={inputCls} style={inputStyle} /></Field>
          <Field label="Hasil" full><input value={form.hasil} onChange={set("hasil")} placeholder="Contoh: Sinkronisasi agenda" className={inputCls} style={inputStyle} /></Field>
          <Field label="Status">
            <select value={form.status} onChange={set("status")} className={inputCls} style={inputStyle}>
              <option>Tindak Lanjut</option><option>Selesai</option>
            </select>
          </Field>
          <Field label="Catatan (opsional)"><input value={form.catatan} onChange={set("catatan")} className={inputCls} style={inputStyle} /></Field>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Btn variant="secondary" onClick={onClose}>Batal</Btn>
          <button type="submit" className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: C.primary }}>Simpan</button>
        </div>
      </form>
    </ModalShell>
  );
}

// ---------- Laporan ----------

function ReportPage({ stats, onPreview, onExportCsv }) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1.5">Laporan</h1>
      <div className="text-sm mb-6" style={{ color: C.muted }}>Output informasi strategis untuk kebutuhan pimpinan dan pelaporan.</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
          <div className="text-sm" style={{ color: C.muted }}>Daftar Stakeholder</div>
          <div className="text-3xl font-extrabold my-2">{stats.total}</div>
          <Btn variant="secondary" onClick={() => onPreview(null)}>Preview</Btn>
        </div>
        <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
          <div className="text-sm" style={{ color: C.muted }}>Stakeholder Prioritas</div>
          <div className="text-3xl font-extrabold my-2">{stats.prioritas}</div>
          <Btn variant="secondary" onClick={() => onPreview("prioritas")}>Preview</Btn>
        </div>
        <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
          <div className="text-sm" style={{ color: C.muted }}>Perlu Pemutakhiran</div>
          <div className="text-3xl font-extrabold my-2">{stats.perluUpdate}</div>
          <Btn variant="secondary" onClick={() => onPreview("update")}>Preview</Btn>
        </div>
        <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.line}` }}>
          <div className="text-sm" style={{ color: C.muted }}>Kolaborasi Aktif</div>
          <div className="text-3xl font-extrabold my-2">{stats.kolaborasiAktif}</div>
          <Btn variant="secondary" onClick={() => {}}>Preview</Btn>
        </div>
      </div>
      <Panel title="Export" style={{ marginTop: 18 }}>
        <div className="flex gap-2.5">
          <Btn onClick={onExportCsv}><span className="inline-flex items-center gap-1.5"><Download size={15} /> Export Excel (CSV)</span></Btn>
          <Btn variant="gold" onClick={() => window.print()}><span className="inline-flex items-center gap-1.5"><Printer size={15} /> Export PDF (Cetak)</span></Btn>
        </div>
        <p className="text-xs mt-3" style={{ color: C.muted }}>Export PDF membuka dialog cetak browser — pilih "Save as PDF" sebagai tujuan cetak.</p>
      </Panel>
    </div>
  );
}
