# LIKOM Assistant (v1.3 Pro)

Otomatisasi Like & Komen Instagram Berbasis AI untuk Instagram (Web & Extension)

## 🚀 Fitur Utama
- **Auto-Generate Comment (AI):** Menghasilkan komentar yang relevan dengan isi caption secara otomatis menggunakan AI model.
- **Dukungan Multi-Platform (Desktop & Mobile):**
  - **Desktop (Chrome/Edge Extension):** Otomatis melakukan Like dan pengisian Komentar di tab Instagram.
  - **HP / Tablet (Mobile Mode):** Otomatis menyalin komentar ke Clipboard dan membuka aplikasi/web Instagram untuk dipaste oleh pengguna.
- **Clean Navigation & Zero Rate-Limit:** Menghindari galat HTTP 429 dengan pemanggilan tab tanpa HTTP Referer berlebih.
- **Penyinkronan Realtime:** Menampilkan status Like & Komen secara live pada Dashboard LIKOM.

## 🛠️ Cara Menerapkan di Vercel

1. Import repository ini ke [Vercel](https://vercel.com).
2. Tambahkan **Environment Variables** di Vercel Project Settings:
   - `OPENAI_API_KEY`: Key API AI Anda
   - `OPENAI_BASE_URL`: `https://id.solution.qzz.io/v1`
   - `OPENAI_MODEL`: `deepseek-v4-flash-oc`
3. Deploy!

## 📦 Ekstensi Chrome (LIKOM Semi-Auto Helper)

1. Buka `chrome://extensions/` di browser.
2. Aktifkan **Developer mode**.
3. Klik **Load unpacked** / **Muat ekstensi yang membuka folder** dan pilih folder `chrome-extension`.

---
*Built with Next.js 15, Tailwind CSS, & Chrome Extension Manifest V3.*
