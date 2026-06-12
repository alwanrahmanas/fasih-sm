# BPS FASIH Scraper

Script otomatisasi berbasis Python dan Playwright untuk mengumpulkan data survei secara otomatis dari portal **BPS FASIH** (Flexible Authentic Survey Instrument in Harmony) berdasarkan daftar email mitra.

---

## 📂 Struktur Proyek

Proyek ini telah dirapikan ke dalam struktur folder berikut agar lebih bersih dan profesional:

```text
scraper-fasih-sm/
├── data/
│   ├── email_mitra.txt          # Daftar lengkap email mitra (untuk scrape produksi)
│   └── email_mitra_test.txt     # Daftar email mitra untuk uji coba (3 email)
├── legacy/                      # Script lama (login terpisah & scraper manual)
│   ├── login.py
│   └── scraper.py
├── research/                    # File riset, screenshot, dan berkas analisis HTML offline
│   ├── analyze_html.py
│   ├── inspect_pagination.py
│   ├── FASIH_ Flexible Authentic Survey Instrument in Harmony.html
│   └── FASIH_ Flexible Authentic Survey Instrument in Harmony_files/
├── .gitignore                   # Konfigurasi pengabaian file sensitif / hasil scrape
├── README.md                    # Dokumentasi panduan ini
├── requirements.txt             # Dependensi pustaka Python
└── run_scraper.py               # Script utama scraper terpadu (login + auto-detect + scrape)
```

---

## ⚙️ Prasyarat & Instalasi

Sebelum menjalankan scraper, pastikan Anda memiliki **Python 3.8+** dan jalankan perintah berikut di terminal proyek Anda untuk menginstal pustaka yang dibutuhkan:

```powershell
# 1. Instal library pendukung (Playwright)
pip install -r requirements.txt

# 2. Instal browser Chromium untuk Playwright
playwright install chromium
```

---

## 🚀 Panduan Penggunaan

Script `run_scraper.py` menggabungkan proses autentikasi (login) dan penarikan data secara otomatis.

### Langkah-langkah Menjalankan:

1. **Jalankan script** melalui terminal:
   * **Mode Uji Coba (menggunakan 3 email dari `data/email_mitra_test.txt`):**
     ```powershell
     python run_scraper.py --test
     ```
   * **Mode Produksi (menggunakan seluruh email dari `data/email_mitra.txt`):**
     ```powershell
     python run_scraper.py
     ```

2. **Login & Navigasi:**
   * Jendela browser Chromium akan otomatis terbuka dan memuat halaman login BPS FASIH.
   * Silakan lakukan **login menggunakan akun SSO BPS** Anda (aktifkan VPN BPS jika diperlukan).
   * **Buka halaman tabel survei** yang ingin Anda ambil datanya.
   
3. **Scraping Otomatis:**
   * Setelah Anda berada di halaman tabel data survei, script di terminal akan mendeteksi kecocokan URL secara otomatis (`Target survey page detected`).
   * Sesi login Anda akan disimpan ke dalam berkas `auth_state.json`. Untuk penjalanan berikutnya, Anda tidak perlu login ulang selama sesi tersebut masih valid.
   * Browser akan dialihkan secara otomatis ke mode tampilan **50 baris per halaman** (`perPage=50`) untuk mempercepat penarikan.
   * Script akan mulai mencari setiap email secara berurutan pada kotak pencarian, mengekstrak data dari tabel, melakukan paginasi otomatis jika hasil pencarian lebih dari 50 baris, dan menyimpan hasilnya.

4. **Hasil Scraping:**
   * Data yang terkumpul akan disimpan atau ditambahkan (append) secara otomatis ke berkas **`scraped_data.csv`** di root direktori proyek. Berkas ini dapat langsung dibuka menggunakan Excel, Google Sheets, atau diimpor ke aplikasi analisis lainnya.

---

## 🔒 Catatan Keamanan Penting

> [!IMPORTANT]
> Berkas `auth_state.json` berisi cookie, token, dan sesi login aktif Anda ke BPS FASIH. **JANGAN PERNAH** menghapus berkas ini dari `.gitignore` atau mengunggahnya ke GitHub, karena orang lain dapat masuk ke akun BPS Anda menggunakan berkas tersebut.

---

## 📤 Langkah-langkah Push ke GitHub

Untuk mengunggah kode sumber proyek yang sudah rapi ini ke repositori GitHub Anda (`https://github.com/danimat15/fasih-sm-scrapper.git`), ikuti perintah berikut di terminal:

```powershell
# 1. Inisialisasi repositori Git lokal
git init

# 2. Tambahkan semua file yang tidak di-ignore ke staging area
git add .

# 3. Lakukan commit pertama Anda
git commit -m "Initial commit: restructured project with clean scraper flow"

# 4. Tentukan branch utama sebagai 'main'
git branch -M main

# 5. Hubungkan repositori lokal dengan repositori GitHub Anda
git remote add origin https://github.com/danimat15/fasih-sm-scrapper.git

# 6. Push kode ke GitHub (tambahkan bendera -u untuk push pertama kali)
git push -u origin main
```
