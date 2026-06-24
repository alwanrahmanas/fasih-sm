# Panduan Clone & Setup Repositori Scraper-Fasih-SM untuk Kabupaten Lain

Panduan ini ditujukan bagi pengguna baru dari kabupaten lain yang ingin menduplikasi (clone) repositori ini, memindahkannya ke repositori GitHub mereka sendiri, menyesuaikan data daerah masing-masing, serta menjalankan proses monitoring secara otomatis.

---

## 1. Persiapan Awal di GitHub Baru

Sebelum melakukan clone, buatlah repositori baru di akun GitHub Anda:
1. Masuk ke GitHub, klik **New repository**.
2. Beri nama repositori (contoh: `scraper-fasih-sm-[nama-daerah]`).
3. Set visibilitas sesuai kebutuhan (bisa **Public** atau **Private**).
4. **Jangan** centang opsi *Add a README file*, *Add .gitignore*, atau *Choose a license* (biarkan repositori kosong).
5. Salin URL repositori baru Anda (contoh: `https://github.com/[username-anda]/[repo-baru].git`).

---

## 2. Proses Duplikasi & Pindah Repositori

Buka terminal (Git Bash, Command Prompt, atau PowerShell) di komputer lokal Anda, lalu ikuti langkah-langkah berikut:

### Langkah A: Clone Repositori Asal
Clone repositori ini terlebih dahulu ke komputer lokal Anda:
```bash
git clone https://github.com/danimat15/fasih-sm-scrapper.git
cd fasih-sm-scrapper
```

### Langkah B: Ubah Alamat Remote Git
Ubah alamat *remote origin* dari repositori asal ke alamat repositori baru yang telah Anda buat di Langkah 1:
```bash
# Ubah URL remote origin ke repo baru Anda
git remote set-url origin https://github.com/[username-anda]/[repo-baru].git

# Verifikasi apakah remote URL sudah berubah
git remote -v
```

### Langkah C: Push Kode ke Repositori Baru Anda
Kirim semua berkas dan riwayat commit ke repositori baru Anda di GitHub:
```bash
git push -u origin main
```

---

## 3. Konfigurasi Autentikasi Git & Akun Lokal

Agar skrip Python dapat melakukan `git commit` dan `git push` otomatis tanpa kendala:
1. **Atur Identitas Git Lokal**:
   Jalankan perintah ini di komputer/server Anda (jika belum pernah dilakukan):
   ```bash
   git config --global user.name "Nama Anda"
   git config --global user.email "email-anda@domain.com"
   ```
2. **Kredensial Git**:
   Pastikan Anda sudah login atau terautentikasi ke GitHub pada komputer tersebut (menggunakan SSH Key atau memasukkan *Personal Access Token* saat pertama kali push manual), agar perintah `git push` otomatis dari skrip tidak meminta verifikasi kata sandi secara berulang di background.

---

## 4. Konfigurasi File Lingkungan (`.env`)

Buat file `.env` baru di root folder project dengan menyalin berkas `.env.example`:
```bash
copy .env.example .env
```
Buka file `.env` tersebut menggunakan teks editor dan sesuaikan dengan akun BPS SSO Anda:
```env
USERNAME=akun_sso_bps_anda
PASSWORD=password_sso_anda
```

---

## 5. Penyesuaian Data Spesifik Wilayah

Seluruh data di folder `/data` dan beberapa berkas dashboard defaultnya dikonfigurasi untuk **Kabupaten Kepulauan Sangihe (7103)**. Anda harus menyesuaikan berkas berikut dengan data wilayah Anda sendiri:

### A. File di Folder `data/`
* **`data/koseka.csv`**: Ubah isi tabel ini dengan daftar kode kecamatan (`kd_kec`), nama kecamatan, dan nama Koseka daerah Anda. Gunakan pemisah titik koma (`;`).
* **`data/pml_ppl.csv`**: Isi dengan email petugas, nama petugas, dan jabatannya (PML/PPL) di wilayah Anda. Gunakan pemisah titik koma (`;`).
* **`data/email_mitra.txt`**: Isi berkas ini dengan daftar email petugas pencacah di daerah Anda yang ingin dipantau (satu email per baris).
* **`data/kdsls_prioritas.txt`**: Masukkan daftar kode SLS prioritas daerah Anda (satu kode SLS per baris).

### B. Target Data SBR (`dashboard/public/sbr_data.json`)
Berkas ini menyimpan target data Sensus Basis Register (SBR) per level wilayah (Kabupaten, Kecamatan, Desa/Kelurahan, SLS, dan Sub-SLS).
* Format JSON di dalamnya memiliki struktur seperti `"kab"`, `"kec"`, `"desa"`, `"sls"`, dan `"sub_sls"`.
* Gantilah data di dalam file [sbr_data.json](file:///dashboard/public/sbr_data.json) dengan target data SBR yang sesuai dengan wilayah kabupaten Anda.

### C. Ganti Hardcode Kode Kabupaten di Dashboard Frontend
Buka file **[dashboard/src/app/comparison-sbr/page.tsx](file:///dashboard/src/app/comparison-sbr/page.tsx)** dan cari teks `7103` serta `"Kepulauan Sangihe"`. Ganti kode tersebut dengan kode kabupaten Anda (misal `7104` untuk Kepulauan Talaud) dan sesuaikan nama kabupatennya pada beberapa bagian berikut:
* **Filter Pencarian**:
  ```tsx
  if (activeLevel === "kab" && r.kode === "7103") { // <-- Ganti 7103
    nameMatch = "kepulauan sangihe".includes(q); // <-- Ganti nama kabupaten (huruf kecil)
  }
  ```
* **Ekspor CSV**:
  ```tsx
  if (activeLevel === "kab" && r.kode === "7103") { // <-- Ganti 7103
    namaWilayah = "Kabupaten Kepulauan Sangihe"; // <-- Ganti nama kabupaten
  }
  ```
* **Tampilan Tabel Row**:
  ```tsx
  {activeLevel === "kab" && row.kode === "7103" && ( // <-- Ganti 7103
    <span className="...">
      Kab. Kepulauan Sangihe // <-- Ganti nama kabupaten
    </span>
  )}
  ```

---

## 6. Cara Menjalankan Scraper & Update Data

Setelah setup selesai, Anda dapat menjalankan skrip monitoring:

1. **Jalankan Scraper Utama**:
   ```bash
   python run_se2026.py
   ```
   *Skrip ini akan mengambil data dari situs FASIH, memprosesnya, memperbarui dashboard lokal, dan otomatis melakukan `git commit` serta `git push` ke repositori GitHub baru Anda jika terdeteksi perubahan data.*

2. **Jalankan Mode Dashboard Saja (Cepat)**:
   Jika hanya ingin memperbarui ringkasan rekap petugas:
   ```bash
   python run_se2026_dashboard.py
   ```

---

## 7. Deployment Dashboard ke Cloud (Vercel)

Agar dashboard dapat diakses oleh publik secara online dan selalu terupdate secara otomatis:
1. Masuk ke [Vercel](https://vercel.com/) dan hubungkan dengan akun GitHub Anda.
2. Klik **Add New** -> **Project**.
3. Pilih repositori baru Anda (misal `scraper-fasih-sm-[nama-daerah]`).
4. Pada bagian **Root Directory**, pilih folder `dashboard/` (atau biarkan default jika konfigurasi Vercel otomatis mendeteksi folder Next.js).
5. Klik **Deploy**.
6. Selesai! Setiap kali skrip scraper Anda dijalankan dan melakukan push ke GitHub, Vercel akan otomatis melakukan *build* ulang dan memperbarui dashboard online Anda dalam hitungan detik.
