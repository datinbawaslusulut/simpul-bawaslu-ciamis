# SIMPUL — Panduan Membuat Jadi Web Sungguhan (Gratis)

Ikuti 4 tahap ini secara berurutan. Tidak perlu jago coding — tinggal ikuti klik demi klik.

---

## TAHAP 1 — Siapkan Google Sheets sebagai tempat data

1. Buka **https://sheets.new** (otomatis membuat spreadsheet baru).
2. Beri nama spreadsheet-nya, misal **"Database SIMPUL"** (klik judul di kiri atas).
3. Klik kanan tab sheet di bagian bawah (biasanya bernama "Sheet1"), pilih **Rename**, ganti jadi persis: `Stakeholders`
4. Tidak perlu isi apa-apa lagi di sheet — kolom, serta 3 sheet lain (`Kolaborasi`, `Users`, `Sessions`), akan otomatis dibuat oleh kode di Tahap 2 saat pertama kali diakses.

## TAHAP 2 — Pasang "mesin" backend (Google Apps Script)

1. Di spreadsheet tadi, klik menu **Extensions** (Ekstensi) → **Apps Script**.
2. Akan terbuka tab baru berisi editor kode. Hapus semua tulisan `function myFunction() {...}` yang sudah ada di sana.
3. Buka file **`AppsScript_Code.gs`** dari folder yang saya siapkan, salin (copy) semua isinya.
4. Tempel (paste) ke editor Apps Script tadi, lalu klik ikon **Save** (gambar disket) di toolbar atau tekan `Ctrl+S`.
5. Klik tombol biru **Deploy** (kanan atas) → **New deployment**.
6. Klik ikon gerigi ⚙️ di sebelah "Select type", pilih **Web app**.
7. Isi:
   - **Execute as**: Me (email Anda)
   - **Who has access**: Anyone
8. Klik **Deploy**.
9. Akan muncul jendela minta izin — klik **Authorize access**, pilih akun Google Anda, klik **Advanced** → **Go to (nama proyek) (unsafe)** → **Allow**. (Ini normal, karena scriptnya belum "diverifikasi Google" — wajar untuk script buatan sendiri.)
10. Setelah selesai, akan muncul **Web app URL** — bentuknya seperti:
    `https://script.google.com/macros/s/AKfycb.../exec`

    **Salin URL ini, simpan dulu.** Ini adalah "alamat" backend Anda.

## TAHAP 2B — Buat akun login (Operator & Verifikator)

Kode backend otomatis membuat sheet baru bernama **Users** berisi satu akun contoh:
`admin` / `admin123` (peran: verifikator).

1. Kembali ke spreadsheet, lihat tab baru bernama **Users** di bagian bawah.
2. **Ganti password akun `admin`** tadi (jangan dipakai sebagai kata sandi produksi).
3. Tambahkan akun untuk pegawai lain, satu baris per orang, isi kolom:
   - `username` — bebas, misal `budi` atau `kasubbag.humas`
   - `password` — bebas, sebaiknya minimal 8 karakter
   - `role` — isi persis salah satu dari dua kata ini: `operator` atau `verifikator`
   - `nama` — nama lengkap yang akan tampil di aplikasi

   Contoh isi:

   | username | password | role | nama |
   |---|---|---|---|
   | admin | (ganti sendiri) | verifikator | Kepala Sekretariat |
   | budi.staf | budi2026 | operator | Budi Santoso |
   | kasubbag.humas | humas2026 | verifikator | Kasubbag Humas, Hukum, Data dan Informasi |

> **Siapa boleh jadi Verifikator?** Sebaiknya Kepala Sekretariat dan/atau Kasubbag Humas, Hukum, Data dan Informasi (penanggung jawab teknis SIMPUL). Operator biasanya diisi oleh Staf Pelaksana Teknis di tiap unit.

> ⚠️ **Catatan keamanan**: password di sheet ini tersimpan sebagai teks biasa (bukan dienkripsi), supaya mudah diatur tanpa kode tambahan. Untuk data internal kantor skala kecil ini umumnya cukup, tapi jangan pakai password yang sama dengan akun penting lain (email, dsb). Kalau nanti ingin ditingkatkan keamanannya, beri tahu saya.


> Kalau nanti Anda mengubah/menambah kode di Apps Script, ulangi dari langkah 5, tapi pilih **Manage deployments** → ikon pensil → **New version** → **Deploy**, supaya URL-nya tidak berubah-ubah.

## TAHAP 3 — Sambungkan aplikasi ke backend tadi

1. Buka folder proyek yang saya siapkan, cari file **`src/storage.js`**.
2. Cari baris ini di paling atas:
   ```js
   export const APPS_SCRIPT_URL = "TEMPEL_URL_APPS_SCRIPT_ANDA_DI_SINI";
   ```
3. Ganti bagian `"TEMPEL_URL_APPS_SCRIPT_ANDA_DI_SINI"` dengan URL yang Anda salin di Tahap 2, jadi seperti:
   ```js
   export const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycb.../exec";
   ```
4. Simpan file-nya.

## TAHAP 4 — Terbitkan (deploy) ke internet, gratis, via Vercel

**A. Unggah kode ke GitHub** (tempat menyimpan kode, gratis)

1. Buat akun di **https://github.com** jika belum punya (gratis).
2. Klik tombol hijau **New** (buat repository baru).
3. Beri nama, misal `simpul-bawaslu-ciamis`, biarkan **Public**, klik **Create repository**.
4. Di halaman repository kosong tadi, klik link kecil **"uploading an existing file"**.
5. Seret (drag) seluruh isi folder proyek (semua file dan folder `src`) ke halaman itu, lalu klik **Commit changes**.

**B. Sambungkan ke Vercel** (tempat menerbitkan web-nya, gratis)

1. Buka **https://vercel.com**, klik **Sign Up**, pilih **Continue with GitHub** (pakai akun GitHub tadi).
2. Setelah masuk, klik **Add New** → **Project**.
3. Pilih repository `simpul-bawaslu-ciamis` yang tadi diunggah, klik **Import**.
4. Biarkan semua pengaturan default (Vercel otomatis mengenali ini proyek Vite/React), klik **Deploy**.
5. Tunggu 1-2 menit. Setelah selesai, Vercel akan memberi Anda alamat web gratis, contoh:
   `https://simpul-bawaslu-ciamis.vercel.app`

**Selesai — itulah alamat web SIMPUL Anda**, bisa dibuka siapa saja, di mana saja, gratis.

---

## Catatan penting

- **Mengisi data pertama kali**: saat pertama dibuka, aplikasi akan menawarkan tombol "Isi data contoh" untuk mengisi 16 stakeholder dari dokumen RAP Anda secara otomatis. Klik sekali saja.
- **Kalau nanti ingin ubah tampilan/fitur**: edit file di folder `src`, lalu unggah ulang perubahannya ke GitHub (drag & drop file yang diubah, atau pakai GitHub Desktop kalau mau lebih mudah) — Vercel otomatis menerbitkan ulang setiap ada perubahan di GitHub.
- **Kalau mau pakai domain sendiri** (misal `simpul.bawaslu-ciamis.go.id`): buka pengaturan proyek di Vercel → tab **Domains** → tambahkan domain tersebut, lalu ikuti instruksi mengatur DNS-nya (biasanya dibantu oleh pengelola domain instansi).
- **Keamanan**: karena "Who has access: Anyone" di Apps Script, siapa pun yang tahu URL backend-nya secara teknis bisa mengakses data lewat URL itu langsung. Untuk penggunaan internal kantor skala kecil ini umumnya cukup aman, tapi kalau datanya sensitif, beri tahu saya — ada cara menambah lapisan kata sandi sederhana.

## Ringkasan Fitur Versi Ini

- **5 halaman**: Dashboard, Data Stakeholder, Pemetaan Stakeholder (matriks Influence × Interest), Kolaborasi (riwayat kegiatan), Laporan (export).
- **Kategori stakeholder**: Pemerintah, Penyelenggara, Akademisi, Ormas/LSM, Media, Komunitas.
- **Kuadran otomatis** (ambang tinggi ≥4 dari skala 1–5): Manage Closely, Keep Satisfied, Keep Informed, Monitor.
- **Status data**: Belum Verifikasi → Terverifikasi / Perlu Update (diproses oleh Verifikator).
- **Export**: Excel (unduh CSV langsung) dan PDF (lewat dialog cetak browser, pilih "Save as PDF").

## Isi Folder Ini

- `AppsScript_Code.gs` — kode backend (Stakeholders, Kolaborasi, Users, Sessions), ditempel ke Google Apps Script (Tahap 2)
- `src/storage.js` — penghubung ke Google Sheets (isi URL di sini, Tahap 3)
- `src/App.jsx` — seluruh tampilan dan logika aplikasi (5 halaman)
- `src/main.jsx` — titik masuk aplikasi React
- `index.html`, `package.json`, `vite.config.js` — kerangka proyek, tidak perlu diubah
