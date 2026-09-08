# Ayowebku Assist

Chatbot customer service Ayowebku dengan sumber pengetahuan yang diambil dari website resmi Ayowebku dan Groq API melalui Vercel Functions.

## Jalankan lokal

1. Install Vercel CLI: `npm i -g vercel`
2. Jalankan `vercel dev`
3. Isi `GROQ_API_KEY` pada environment lokal atau Vercel.

Salin `.env.example` menjadi `.env.local` untuk pengembangan lokal. API key hanya dibaca oleh `/api/chat.js`, sehingga tidak dikirim ke browser.

## Deploy ke Vercel

Import repository/folder ini di Vercel, lalu tambahkan environment variable `GROQ_API_KEY`. `GROQ_MODEL` bersifat opsional dan default ke `llama-3.1-8b-instant`.

Serverless function `/api/scrape` membaca beberapa halaman Ayowebku. Untuk menambahkan halaman baru, buka `api/scrape.js` lalu tambahkan URL ke array `AYOWEBKU_URLS`:

```js
const AYOWEBKU_URLS = [
	'https://ayowebku.vercel.app/',
	'https://ayowebku.vercel.app/halaman-baru',
];
```

Semua URL akan dibaca paralel dan hanya hostname `ayowebku.vercel.app` yang diizinkan.