# Product Requirements Document (PRD) - LIKOM Semi-Auto System

## 1. Project Goal
Membangun sistem semi-otomatis untuk eksekusi jasa Like & Comment (LIKOM) Instagram yang terdiri dari dua komponen:
1. **Web Dashboard (Next.js):** Untuk parsing teks mentah dan generate komentar via AI.
2. **Chrome Extension:** Untuk auto-fill (menempelkan otomatis) komentar ke kolom input Instagram tanpa menekan tombol post (menghindari deteksi bot).

## 2. Target User
- Admin LIKOM / Buzzer.

## 3. Problem Statement
Full automation API di Instagram dilarang dan berisiko Banned permanen. Copy-paste manual satu per satu memakan waktu. Dibutuhkan solusi "jalan tengah" di mana AI membuat teks, sistem menempelkan teks, dan manusia hanya perlu klik "Like" dan "Post".

## 4. Main Features
- **Smart Parser (Web):** Ekstrak URL dan instruksi dari teks berantakan.
- **AI Generator (Web):** Generate komentar berdasarkan instruksi dengan default 2 kata.
- **Action Button (Web):** Tombol "Eksekusi" yang akan membuka tab baru dengan menyisipkan URL parameter `?auto_comment=hasil_ai`.
- **Auto-Fill Listener (Extension):** Script berjalan di `instagram.com`, membaca URL parameter, lalu otomatis mengisi elemen `contenteditable` (kolom komentar Instagram) dengan teks tersebut.

## 5. Success Criteria
- Akun Instagram aman karena klik akhir (Post/Like) dilakukan manusia dengan delay natural.
- Eksekusi 1 link Instagram turun dari 30 detik menjadi hanya 3 detik per link.