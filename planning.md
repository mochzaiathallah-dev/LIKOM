# Planning & System Requirements (SRS)

## 1. System Requirements Specification (SRS)
### A. Validasi
- URL yang dibuka harus valid domain `instagram.com`.
- Extension hanya bereaksi jika terdapat query parameter `?auto_comment=` di URL.

### B. Behavior
- **Web App:** Saat klik "Eksekusi", buka di tab baru (`target="_blank"`).
- **Extension:** Harus menunggu DOM Instagram selesai loading (karena IG pakai React SPA) sebelum mencoba inject teks. Bisa gunakan `MutationObserver` atau `setTimeout` berlapis.
- **Human Delay:** Extension DILARANG mengklik tombol Post atau Like. Murni hanya mengisi teks.

### C. Aturan Aplikasi
- Frontend Web App tidak boleh menyimpan API Key AI di sisi client. Gunakan Server Actions / API Routes Next.js.

## 2. Task Breakdown
- **Phase 1: Web App - Dashboard & Parser**
  - Setup Next.js + Tailwind + Shadcn.
  - Buat input text, parser regex, dan integrasi AI Prompt.
- **Phase 2: Chrome Extension - Manifest & Content Script**
  - Setup folder `extension/` terpisah.
  - Buat `manifest.json` (V3) dengan permission `activeTab` dan `scripting` di domain `*://*.instagram.com/*`.
  - Buat `content.js` untuk logic DOM manipulation.
- **Phase 3: Integration & Testing**
  - Testing workflow: Paste Text -> Web App Generate -> Klik -> Buka Tab IG -> Autofill -> Manual Post.