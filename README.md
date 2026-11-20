# Fifty (SmartCheck) — AI Homework Checker & AI Tutor 🎓

**Fifty** — Matematika fani bo'yicha sun'iy intellektga asoslangan zamonaviy ta'lim platformasi va Telegram WebApp tizimi. Ushbu platforma o'qituvchilarga o'quvchilarning daftardagi qo'lyozma vazifalarini soniyalar ichida tekshirish, sinf jurnali va o'zlashtirish tahlilini yuritish imkonini beradi. O'quvchilarga esa **Claude.ai** uslubidagi shaxsiy AI repetitor hamda chuqur pedagogik tahlil xulosalarini taqdim etadi.

---

## 🌟 Asosiy Imkoniyatlar

### 👨‍🏫 O'qituvchi Uchun:
* **Avtomatik Daftar Tekshirish (AI Vision)**: Darslik yoki varaqdagi misollar rasmini yuklab, yechimlarni bir zumda tekshirish va to'g'ri/xato misollar hisobotini olish.
* **Sinf va Jurnal Boshqaruvi**: Sinflar ochish, o'quvchilar ro'yxati, real vaqt rejimida baholar jurnali va dinamika grafigi.
* **Vazifalar Banki**: Maktab darsligi mavzulari bo'yicha tayyor topshiriqlar yaratish va sinflarga biriktirish.
* **Sinf va O'quvchi bo'yicha AI Xulosa**: Sinfdagi umumiy kamchiliklar, o'quvchining kuchli/zaif tomonlari va metodik tavsiyalarni 4 ta vizual kartada shakllantirish.

### 🎒 O'quvchi Uchun:
* **Telegram Bot orqali Bir zumda Kirish**: `@fifty_uz_bot` orqali hech qanday parol terishsiz avtomatik avtorizatsiya.
* **Claude.ai Uslubidagi AI Izoh (AI Tutor)**:
  - Chap tomondagi seanslar paneli (`+ Yangi suhbat`, suhbatlar tarixi, seanslarni boshqarish).
  - Savol matnidan kelib chiqib avtomatik sarlavha tanlash.
  - O'quvchining haqiqiy daftarlaridagi xatolarini bosqichma-bosqich, do'stona tushuntirib berish.
* **Shaxsiy AI Pedagogik Tahlil**: O'zlashtirish darajasi, yutuqlar, xatolar va individual oltin maslahatlarni bitta tugma bilan olish va nusxalash.
* **Mobilga Moslashtirilgan Interfeys**: Pastki menyular ekranga mahkamlangan (`fixed`), sahifalar va xabarlar erkin pastga skroll bo'ladi.

---

## 🛠 Texnologiyalar Staki

* **Frontend**: React 18, TypeScript, Vite, Lucide Icons, Modern CSS.
* **Hosting**: Cloudflare Pages (`https://fifty-app.pages.dev`).
* **Backend**: Python 3.10+, FastAPI, Uvicorn, Aiogram 3 (Telegram Bot).
* **Ma'lumotlar Bazasi**: Google Cloud Firebase Firestore.
* **Sun'iy Intellekt Modellar**:
  - **Groq API**: Tezkor LLaMA-3 modellar (AI izoh, chat seanslari va pedagogik xulosalar).
  - **Google Gemini API**: Gemini Vision & OCR (qo'lyozma daftarlar va formulalarni tanib olish).

---

## 🚀 O'rnatish va Ishga Tushirish

### 1. Repozitoriyani yuklab olish:
```bash
git clone https://github.com/Javlonbekh77/homework-ai-frontend.git
cd homework-ai-frontend
```

### 2. Backendni sozlash:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

`.env` faylini yaratish:
```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEB_APP_URL=https://fifty-app.pages.dev
MINI_APP_URL=https://fifty-app.pages.dev
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.6-flash
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
FIREBASE_CREDENTIALS_PATH=firebase-adminsdk.json
ENABLE_BOT_POLLING=true
ENABLE_BOT_WEBHOOK=false
```

Firebase kalitini `firebase-adminsdk.json` fayli sifatida loyiha ildiziga joylashtiring.

Backendni ishga tushirish:
```bash
python backend/main.py
```

### 3. Frontendni sozlash:
```bash
cd frontend
npm install
npm run build
```

Lokal ishlab chiqish uchun:
```bash
npm run dev
```

---

## ☁️ 24/7 Doimiy Ishlashini Ta'minlash (Deploy)

1. **Frontend**: Cloudflare Pages'da doimiy 24/7 onlayn ishlaydi:
   - URL: `https://fifty-app.pages.dev`
   - Har bir yangi versiya `npx wrangler pages deploy frontend/dist --project-name fifty-app --branch main` buyrug'i orqali Cloudflare'ga yuklanadi.

2. **Backend & Telegram Bot**:
   - Kompyuteringiz o'chirilganda ham bot va API ishlashi uchun backend kodini bulutli serverga (VPS, Render, Railway yoki Docker konteyneriga) joylashtirish tavsiya etiladi.
   - Loyihada `Dockerfile`, `render.yaml` va `Procfile` mavjud.

---

## 📱 Telegram Bot Buyruqlari
* `/start` — Foydalanuvchini avtomatik ro'yxatdan o'tkazadi va Fifty WebApp'ni ochadi.
* `/app` — Mini ilovani to'g'ridan-to'g'ri ochish havolasi.
* `/role` — O'qituvchi yoki o'quvchi rolini o'rnatish.
* `/status` — Tizim holati va foydalanuvchi ma'lumotlari.

---

## 📄 Litsenziya
Ushbu loyiha MIT litsenziyasi asosida tarqatiladi.
