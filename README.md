# Expense Tracker

Aplikasi tracking perbelanjaan moden menggunakan vanilla HTML/CSS/JS dengan Google Sheets sebagai database.

## Tech Stack
- **Frontend**: HTML5 + CSS3 + Vanilla JavaScript
- **Database**: Google Sheets (via Apps Script Web App)
- **Hosting**: Cloudflare Pages
- **Charts**: Chart.js 4.x (CDN)

---

## Features

### Dashboard
- Summary cards dengan baki, pendapatan & perbelanjaan bulan ini
- Doughnut chart perbelanjaan mengikut kategori
- Trend chart pendapatan vs perbelanjaan (6 bulan)
- Senarai 5 transaksi terkini

### Transaksi
- Tambah, edit, padam transaksi (CRUD penuh)
- Filter mengikut jenis, kategori, dan bulan
- Kategori customizable

### Insights & Analytics
- Perbandingan bulan ini vs bulan lepas (dengan % perubahan)
- Trend graf 6 bulan untuk income & expense
- Top 5 kategori perbelanjaan tertinggi dengan progress bar
- AI-driven analisis & cadangan penjimatan

### Recurring & Subscriptions
- Track bil bulanan tetap (Netflix, Unifi, sewa, dll.)
- Set tarikh payment bulanan
- Status aktif/paused
- Edit & delete recurring items

### Budget Management
- Custom budget limit untuk setiap kategori
- Progress bar dengan warna (hijau/kuning/merah)
- Alert automatik bila capai 80% atau 100% budget
- Total budget overview seluruh kategori

### AI Auto-Category
- Suggest kategori automatik berdasarkan catatan transaksi
- Toggle on/off di settings
- Belajar dari keyword patterns (makan, grab, netflix, dll.)

### Import CSV
- Upload bank statement dalam format CSV
- Support pelbagai format tarikh (YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY)
- Preview data sebelum import
- Bulk import sekaligus

### Design & UX
- Modern Blue professional theme
- Card stack layout (mobile-first)
- Tab navigation yang smooth
- Fully responsive (mobile, tablet, desktop)
- Toast notifications
- Loading states

---

## Setup Google Sheets

### Langkah 1: Buat Google Sheet Baru

1. Pergi ke [Google Sheets](https://sheets.google.com) dan buat spreadsheet baru
2. Namakan sheet pertama sebagai **Expenses**
3. Tambah header berikut di Row 1:

| A | B | C | D | E |
|---|---|---|---|---|
| Date | Type | Category | Amount | Description |

4. Buat sheet kedua bernama **Recurring** untuk track recurring bills (optional)

### Langkah 2: Buka Apps Script

1. Di Google Sheet, klik **Extensions** > **Apps Script**
2. Padam semua code sedia ada
3. Copy dan paste code berikut:

```javascript
const SHEET_NAME = "Expenses";

function doGet(e) {
  const action = e.parameter.action;
  
  if (action === "getAll") {
    return getAllExpenses();
  }
  
  return jsonResponse({ success: false, error: "Unknown action" });
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  
  switch (action) {
    case "add":
      return addExpense(data);
    case "update":
      return updateExpense(data);
    case "delete":
      return deleteExpense(data);
    default:
      return jsonResponse({ success: false, error: "Unknown action" });
  }
}

function getAllExpenses() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return jsonResponse({ success: true, rows: [] });
  }
  
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    rows.push({
      rowId: i + 1,
      date: data[i][0] ? formatDate(data[i][0]) : "",
      type: data[i][1] || "",
      category: data[i][2] || "",
      amount: data[i][3] || 0,
      description: data[i][4] || ""
    });
  }
  
  return jsonResponse({ success: true, rows: rows });
}

function addExpense(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  sheet.appendRow([
    data.date,
    data.type,
    data.category,
    parseFloat(data.amount),
    data.description || ""
  ]);
  
  return jsonResponse({ success: true });
}

function updateExpense(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const row = parseInt(data.rowId);
  
  sheet.getRange(row, 1, 1, 5).setValues([[
    data.date,
    data.type,
    data.category,
    parseFloat(data.amount),
    data.description || ""
  ]]);
  
  return jsonResponse({ success: true });
}

function deleteExpense(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const row = parseInt(data.rowId);
  sheet.deleteRow(row);
  
  return jsonResponse({ success: true });
}

function formatDate(date) {
  if (date instanceof Date) {
    return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(date);
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

### Langkah 3: Deploy sebagai Web App

1. Klik butang **Deploy** > **New deployment**
2. Pilih type: **Web app**
3. Tetapkan:
   - **Description**: Expense Tracker API
   - **Execute as**: Me
   - **Who has access**: Anyone
4. Klik **Deploy**
5. Authorize akses (jika diminta)
6. **Copy Web App URL** yang diberikan

---

## Setup Aplikasi Frontend

### Langkah 1: Buka Aplikasi

1. Buka `index.html` di browser
2. Modal "Selamat Datang" akan muncul
3. Paste Google Apps Script Web App URL atau klik "Demo Sahaja"
4. App sedia digunakan!

### Langkah 2: Configuration (Optional)

Klik ikon gear (⚙️) di header untuk:
- Tetapkan API URL (jika belum set)
- Enable/disable AI auto-category
- Tetapkan budget bulanan untuk setiap kategori

---

## Deploy ke Cloudflare Pages

### Langkah 1: Upload ke GitHub

```bash
git init
git add .
git commit -m "Initial commit: expense tracker v2"

git remote add origin https://github.com/username/expense-tracker.git
git branch -M main
git push -u origin main
```

### Langkah 2: Deploy di Cloudflare Pages

1. Login ke [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Klik **Workers & Pages** > **Create application** > **Pages**
3. Pilih **Connect to Git**
4. Pilih repo `expense-tracker`
5. Tetapkan:
   - **Framework preset**: None
   - **Root directory**: /
   - **Build command**: (kosongkan)
   - **Build output directory**: /
6. Klik **Save and Deploy**

### Langkah 3: Akses Aplikasi

Setelah deploy selesai, buka URL seperti:
```
https://expense-tracker.pages.dev
```

---

## Kategori Tersedia

### Perbelanjaan
- Makanan
- Pengangkutan
- Hiburan
- Bil & Utiliti
- Kesihatan
- Pendidikan
- Belanja Rumah
- Lain-lain

### Pendapatan
- Gaji
- Freelance
- Lain-lain

---

## CSV Import Format

Format CSV yang diterima:

```csv
date,type,category,amount,description
2024-01-15,expense,Makanan,45.00,Makan tengahari
2024-01-15,income,Gaji,5000.00,Gaji Januari
15/01/2024,expense,Pengangkutan,12.50,Grab ke office
```

Format tarikh yang disokong:
- YYYY-MM-DD (default)
- DD/MM/YYYY
- MM/DD/YYYY

---

## Local Storage Keys

App menggunakan localStorage untuk simpan:
- `et_apiUrl` - Google Apps Script URL
- `et_data` - Transaksi cache
- `et_budgets` - Budget limits per kategori
- `et_recurring` - Recurring items
- `et_aiEnabled` - AI auto-category toggle
- `et_customCategories` - Custom categories added by user

---

## Troubleshooting

### Data tidak dipaparkan selepas setup
1. Pastikan Apps Script deployment access set kepada **Anyone**
2. Test URL: `[URL]?action=getAll` - patut return JSON
3. Pastikan header di Google Sheet betul: Date, Type, Category, Amount, Description

### Gagal tambah/edit/delete transaksi
1. Pastikan Apps Script ada permission untuk edit Google Sheet
2. Buka Apps Script editor dan run function `getAllExpenses` untuk authorize
3. Check browser console (F12) untuk error messages

### Chart tidak muncul
1. Pastikan ada transaksi perbelanjaan untuk bulan dipilih
2. Check jika Chart.js CDN berjaya dimuatkan (Network tab di DevTools)

### AI suggest tidak keluar
1. Pastikan AI toggle enabled di Settings
2. Tambah keyword dalam deskripsi (contoh: "grab", "netflix", "makan")
3. AI hanya suggest lepas blur (click luar dari field)

---

## Security Notes

- Apps Script Web App URL adalah public - sesiapa yang ada URL boleh akses data
- Untuk keselamatan tambahan:
  1. Tambah API key validation di Apps Script
  2. Gunakan Google OAuth (lebih kompleks)
  3. Deploy sebagai internal app sahaja
  4. Jangan share URL Apps Script secara public

---

## Browser Support

- Chrome/Edge (terkini)
- Firefox (terkini)
- Safari (terkini)
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## Development

Struktur folder:
```
expense-tracker/
├── index.html
├── style.css
├── app.js
├── README.md
└── .gitignore
```

Tiada build step diperlukan. Terus edit dan refresh browser.

---

## License

MIT License - Free to use and modify.

---

**Made with vanilla JavaScript**
