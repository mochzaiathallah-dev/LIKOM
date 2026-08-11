# System Design & UI/UX Flow

## 1. System Design (SDD)
### A. Arsitektur Komunikasi (Stateless)
Sistem tidak menggunakan `sendMessage` antara web dan ekstensi agar ringan. 
- **Data Transfer:** Melalui Query Parameter URL.
- **Web App URL Builder:** `const igUrl = new URL(parsedUrl); igUrl.searchParams.append('auto_comment', aiResult); window.open(igUrl.toString());`

### B. Arsitektur Chrome Extension (Manifest V3)
- `manifest.json`: Definisi ekstensi.
- `content.js`: Script yang diinjeksi ke halaman Instagram. Bertugas:
  1. Cek `window.location.search`.
  2. Parse parameter `auto_comment`.
  3. Cari elemen kolom komentar IG (biasanya `div[contenteditable="true"]` atau `textarea`).
  4. Dispatch event `input` atau `change` agar React mendeteksi perubahan state.

### C. UI Web App
- **Clean Interface:** Satu Textarea besar di atas. Daftar hasil (Cards) di bawah.
- Tiap Card punya: URL, Instruksi, Hasil Komentar, dan tombol utama **"Eksekusi (Buka IG)"**.

## 2. UI/UX Flow
1. User paste tugas LIKOM harian ke web app.
2. Tunggu AI selesai memproses semua komentar.
3. User mengklik tombol "Eksekusi" di baris pertama. Tab Instagram terbuka.
4. Ekstensi langsung mengisi kolom komentar IG.
5. User (manusia) mengklik ikon *Heart* (Like) dan menekan *Enter* (Post) di tab IG.
6. User tutup tab IG, kembali ke web app, klik "Eksekusi" baris kedua, dst.