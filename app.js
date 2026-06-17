const DEFAULT_CATEGORIES = [
  "Makanan", "Pengangkutan", "Hiburan", "Bil & Utiliti",
  "Kesihatan", "Pendidikan", "Belanja Rumah", "Gaji",
  "Freelance", "Lain-lain"
];

const EXPENSE_CATEGORIES = DEFAULT_CATEGORIES.filter(c => !["Gaji", "Freelance"].includes(c));

const AI_KEYWORDS = {
  "Makanan": ["makan", "nasi", "roti", "coffee", "cafe", "restaurant", "grab food", "foodpanda", "shopee food", "mcd", "kfc", "starbucks", "mamak", "kedai", "lunch", "dinner", "breakfast"],
  "Pengangkutan": ["grab", "bus", "lrt", "mrt", "monorail", "petrol", "shell", "petronas", "parking", "toll", "plus", "uber", "train", "bas"],
  "Hiburan": ["netflix", "spotify", "cinema", "tgv", "gsc", "game", "steam", "youtube premium", "disney", "astro", "unifi tv"],
  "Bil & Utiliti": ["unifi", "maxis", "celcom", "digi", "yes", "tnb", "air selangor", "bil elektrik", "bil air", "internet", "phone", "telco"],
  "Kesihatan": ["klinik", "hospital", "pharmacy", "watson", "guardian", "caring", "ubat", "doctor", "dental", "gym"],
  "Pendidikan": ["buku", "course", "udemy", "coursera", "school", "tuition", "yuran", "book"],
  "Belanja Rumah": ["shopee", "lazada", "mr diy", "ikea", "aeon", "tesco", "giant", "mydin", "groceries", "laundry", "dobi"],
};

const LS_KEYS = {
  apiUrl: "et_apiUrl",
  data: "et_data",
  budgets: "et_budgets",
  recurring: "et_recurring",
  aiEnabled: "et_aiEnabled",
  customCategories: "et_customCategories",
  loans: "et_loans",
  payslips: "et_payslips",
  salaries: "et_salaries",
  recurringPayments: "et_recurringPayments"
};

let allTransactions = [];
let categoryChart = null;
let trendChart = null;
let insightTrendChart = null;
let salaryChart = null;
let deductionChart = null;

function lsGet(key) {
  try {
    const v = localStorage.getItem(LS_KEYS[key] || key);
    return v ? JSON.parse(v) : null;
  } catch (e) {
    return null;
  }
}

function lsSet(key, value) {
  localStorage.setItem(LS_KEYS[key] || key, JSON.stringify(value));
}

function lsGetRaw(key) {
  return localStorage.getItem(LS_KEYS[key] || key);
}

function getApiUrl() { return lsGetRaw("apiUrl"); }
function getBudgets() { return lsGet("budgets") || {}; }
function getRecurring() { return lsGet("recurring") || []; }
function setRecurring(list) { lsSet("recurring", list); }
function getLoans() { return lsGet("loans") || []; }
function setLoans(list) { lsSet("loans", list); }
function getPayslips() { return lsGet("payslips") || []; }
function setPayslips(list) { lsSet("payslips", list); }
function getSalaries() { return lsGet("salaries") || []; }
function setSalaries(list) { lsSet("salaries", list); }
function getRecurringPayments() { return lsGet("recurringPayments") || {}; }
function setRecurringPayments(data) { lsSet("recurringPayments", data); }
function isAiEnabled() { const v = lsGet("aiEnabled"); return v === null ? true : v; }
function getAllCategories() {
  const custom = lsGet("customCategories") || [];
  return [...new Set([...DEFAULT_CATEGORIES, ...custom])];
}

function showToast(message, type) {
  type = type || "success";
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = "toast toast-" + type;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(function() { toast.remove(); }, 3000);
}

function showLoading() {
  var overlay = document.createElement("div");
  overlay.className = "loading-overlay";
  overlay.id = "loading-overlay";
  overlay.innerHTML = '<div class="spinner"></div>';
  document.body.appendChild(overlay);
}

function hideLoading() {
  var overlay = document.getElementById("loading-overlay");
  if (overlay) overlay.remove();
}

function formatCurrency(amount) { return "RM " + parseFloat(amount || 0).toFixed(2); }

function getCurrentMonth() {
  var now = new Date();
  return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
}

function getPreviousMonth() {
  var now = new Date();
  now.setMonth(now.getMonth() - 1);
  return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
}

function getRecentMonths(n) {
  n = n || 6;
  var months = [];
  var now = new Date();
  for (var i = 0; i < n; i++) {
    var m = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(m.getFullYear() + "-" + String(m.getMonth() + 1).padStart(2, "0"));
  }
  return months;
}

function formatMonthLabel(ym) {
  var parts = ym.split("-");
  var y = parts[0], m = parts[1];
  var names = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"];
  return names[parseInt(m) - 1] + " " + y;
}

function formatShortMonth(ym) {
  var parts = ym.split("-");
  var y = parts[0], m = parts[1];
  var names = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"];
  return names[parseInt(m) - 1] + " '" + String(y).slice(2);
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  var d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("ms-MY", { day: "2-digit", month: "short", year: "numeric" });
}

function switchTab(tabId) {
  document.querySelectorAll(".tab-btn").forEach(function(b) {
    b.classList.toggle("active", b.dataset.tab === tabId);
  });
  document.querySelectorAll(".tab-content").forEach(function(c) {
    c.classList.toggle("active", c.id === "tab-" + tabId);
  });
}

document.querySelectorAll(".tab-btn").forEach(function(btn) {
  btn.addEventListener("click", function() { switchTab(btn.dataset.tab); });
});

function safeStr(s) { return (s !== undefined && s !== null) ? String(s) : ""; }

async function fetchData() {
  var apiUrl = getApiUrl();
  if (!apiUrl) return lsGet("data") || [];
  showLoading();
  try {
    var response = await fetch(apiUrl + "?action=getAll");
    var data = await response.json();
    if (data.success && data.rows) {
      if (data.rows.length === 0) {
        var cached = lsGet("data") || [];
        if (cached.length > 0) {
          hideLoading();
          showToast("Sync " + cached.length + " transaksi lama ke Google Sheets...", "info");
          for (var i = 0; i < cached.length; i++) {
            var t = cached[i];
            await fetch(apiUrl, {
              method: "POST",
              headers: { "Content-Type": "text/plain;charset=utf-8" },
              body: JSON.stringify({
                action: "add",
                date: t.date,
                type: t.type,
                category: t.category,
                amount: t.amount,
                description: t.description || "",
                account: t.account || "cash"
              })
            });
          }
          showLoading();
          var freshResponse = await fetch(apiUrl + "?action=getAll");
          var freshData = await freshResponse.json();
          if (freshData.success && freshData.rows) {
            lsSet("data", freshData.rows);
            hideLoading();
            showToast("Sync berjaya!", "success");
            return freshData.rows;
          }
        }
      }
      lsSet("data", data.rows);
      hideLoading();
      return data.rows;
    }
    throw new Error(data.error || "Gagal");
  } catch (e) {
    hideLoading();
    var cached = lsGet("data") || [];
    showToast("Gagal memuatkan data. Guna cache.", "warning");
    return cached;
  }
}

async function apiAction(payload) {
  var apiUrl = getApiUrl();
  showLoading();
  try {
    if (!apiUrl) {
      var data = lsGet("data") || [];
      var action = payload.action;
      
      if (action === "add") {
        var newId = data.length > 0 ? Math.max.apply(null, data.map(function(d) { return d.rowId; })) + 1 : 1;
        payload.rowId = newId;
        data.push({
          rowId: newId,
          date: payload.date,
          type: payload.type,
          category: payload.category,
          amount: payload.amount,
          description: payload.description,
          account: payload.account || "cash"
        });
      } else if (action === "update") {
        for (var i = 0; i < data.length; i++) {
          if (data[i].rowId === payload.rowId) {
            data[i].date = payload.date;
            data[i].type = payload.type;
            data[i].category = payload.category;
            data[i].amount = payload.amount;
            data[i].description = payload.description;
            data[i].account = payload.account || "cash";
            break;
          }
        }
      } else if (action === "delete") {
        data = data.filter(function(d) { return d.rowId !== payload.rowId; });
      }
      
      lsSet("data", data);
      hideLoading();
      return true;
    }
    var response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    var data = await response.json();
    if (data.success) {
      hideLoading();
      return true;
    }
    throw new Error(data.error);
  } catch (err) {
    hideLoading();
    showToast("Gagal: " + err.message, "error");
    return false;
  }
}

function populateCategorySelects() {
  var cats = getAllCategories();
  var inputCat = document.getElementById("input-category");
  var filterCat = document.getElementById("filter-category");
  var recurringCat = document.getElementById("recurring-category");

  var formType = document.getElementById("input-type").value;
  var relevantCats = formType === "topup"
    ? cats.filter(function(c) { return ["Lain-lain"].indexOf(c) !== -1; })
    : cats.filter(function(c) { return ["Gaji", "Freelance"].indexOf(c) === -1; });

  inputCat.innerHTML = relevantCats.map(function(c) { return '<option value="' + c + '">' + c + '</option>'; }).join("");

  if (filterCat) {
    var currentVal = filterCat.value;
    filterCat.innerHTML = '<option value="all">Semua Kategori</option>' +
      cats.map(function(c) { return '<option value="' + c + '">' + c + '</option>'; }).join("");
    filterCat.value = currentVal || "all";
  }

  if (recurringCat) {
    recurringCat.innerHTML = EXPENSE_CATEGORIES.map(function(c) { return '<option value="' + c + '">' + c + '</option>'; }).join("");
  }
}

document.getElementById("input-type").addEventListener("change", populateCategorySelects);

function updateSummaryCards(transactions) {
  var currentMonth = getCurrentMonth();
  var monthTx = transactions.filter(function(t) { return t.date && t.date.startsWith(currentMonth); });
  
  var salaries = getSalaries() || PRE_LOADED_SALARIES;
  var latestSalary = salaries.filter(function(s) { return s.month && s.month.startsWith(currentMonth); })[0];
  var totalIncome = latestSalary ? latestSalary.nett : 0;
  
  var totalExpense = monthTx.filter(function(t) { return t.type === "expense"; }).reduce(function(s, t) { return s + parseFloat(t.amount || 0); }, 0);
  var balance = totalIncome - totalExpense;

  document.getElementById("val-balance").textContent = formatCurrency(balance);
  document.getElementById("val-income").textContent = formatCurrency(totalIncome);
  document.getElementById("val-expense").textContent = formatCurrency(totalExpense);
  document.getElementById("val-income-sm").textContent = "+ " + formatCurrency(totalIncome);
  document.getElementById("val-expense-sm").textContent = "- " + formatCurrency(totalExpense);
  document.getElementById("val-balance").style.color = balance >= 0 ? "#86efac" : "#fca5a5";
}

function renderCategoryChart(transactions, monthOverride) {
  var cm = monthOverride || getCurrentMonth();
  var monthExpenses = transactions.filter(function(t) { return t.type === "expense" && t.date && t.date.startsWith(cm); });
  var totals = {};
  monthExpenses.forEach(function(t) { totals[safeStr(t.category)] = (totals[safeStr(t.category)] || 0) + parseFloat(t.amount || 0); });
  var labels = Object.keys(totals);
  var values = Object.values(totals);
  var colors = ["#1e40af", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#84cc16", "#f97316", "#64748b"];
  var emptyEl = document.getElementById("chart-empty");
  var canvas = document.getElementById("category-chart");

  if (labels.length === 0) {
    if (emptyEl) emptyEl.style.display = "block";
    canvas.style.display = "none";
    if (categoryChart) { categoryChart.destroy(); categoryChart = null; }
    return;
  }
  emptyEl.style.display = "none";
  canvas.style.display = "block";
  if (categoryChart) categoryChart.destroy();

  categoryChart = new Chart(canvas.getContext("2d"), {
    type: "doughnut",
    data: { labels: labels, datasets: [{ data: values, backgroundColor: colors.slice(0, labels.length), borderWidth: 0 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: "right", labels: { padding: 12, usePointStyle: true, font: { size: 11 } } },
        tooltip: { callbacks: { label: function(ctx) { return " " + ctx.label + ": " + formatCurrency(ctx.parsed); } } }
      },
      cutout: "70%"
    }
  });
}

function renderTrendChart(transactions, canvasId, chartRef) {
  var months = getRecentMonths(6).reverse();
  var incomeData = [], expenseData = [], labels = [];
  var salaries = getSalaries() || PRE_LOADED_SALARIES;
  months.forEach(function(m) {
    labels.push(formatShortMonth(m));
    
    var salaryForMonth = salaries.filter(function(s) { return s.month && s.month.startsWith(m); })[0];
    var monthIncome = salaryForMonth ? salaryForMonth.nett : 0;
    incomeData.push(monthIncome);
    
    var mTx = transactions.filter(function(t) { return t.date && t.date.startsWith(m); });
    expenseData.push(mTx.filter(function(t) { return t.type === "expense"; }).reduce(function(s, t) { return s + parseFloat(t.amount || 0); }, 0));
  });
  var canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  if (chartRef) chartRef.destroy();

  return new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        { label: "Pendapatan", data: incomeData, borderColor: "#10b981", backgroundColor: "rgba(16,185,129,0.1)", tension: 0.35, fill: true, pointRadius: 4, pointBackgroundColor: "#10b981", borderWidth: 2 },
        { label: "Perbelanjaan", data: expenseData, borderColor: "#ef4444", backgroundColor: "rgba(239,68,68,0.1)", tension: 0.35, fill: true, pointRadius: 4, pointBackgroundColor: "#ef4444", borderWidth: 2 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { y: { grid: { color: "#f1f5f9" }, ticks: { callback: function(v) { return "RM " + v; }, font: { size: 11 } } }, x: { grid: { display: false }, ticks: { font: { size: 11 } } } },
      plugins: { legend: { labels: { usePointStyle: true, font: { size: 11 } } }, tooltip: { callbacks: { label: function(ctx) { return " " + ctx.dataset.label + ": " + formatCurrency(ctx.parsed.y); } } } }
    }
  });
}

function renderRecentTransactions(transactions) {
  var list = document.getElementById("recent-tx-list");
  var empty = document.getElementById("recent-empty");
  var sorted = [].concat(transactions).sort(function(a, b) { return new Date(b.date) - new Date(a.date); }).slice(0, 5);

  if (sorted.length === 0) { list.innerHTML = ""; empty.style.display = "block"; return; }
  empty.style.display = "none";

  list.innerHTML = sorted.map(function(t) {
    var isTopup = t.type === "topup";
    return '<li class="tx-item">' +
      '<div class="tx-info">' +
        '<div class="tx-category">' + safeStr(t.category) + '</div>' +
        '<div class="tx-date">' + formatDate(t.date) + ' · <span style="color:var(--primary-light)">' + getAccountDisplayName(t.account) + '</span></div>' +
        (t.description ? '<div class="tx-desc">' + safeStr(t.description) + '</div>' : '') +
      '</div>' +
      '<div class="tx-amount ' + (isTopup ? "income" : "expense") + '">' +
        (isTopup ? "+" : "-") + formatCurrency(t.amount) +
      '</div>' +
    '</li>';
  }).join("");
}

function renderTransactionsTable(transactions) {
  var filterType = document.getElementById("filter-type").value;
  var filterCategory = document.getElementById("filter-category").value;
  var filterMonth = document.getElementById("filter-month").value;
  var filtered = [].concat(transactions);
  if (filterType !== "all") filtered = filtered.filter(function(t) { return t.type === filterType; });
  if (filterCategory !== "all") filtered = filtered.filter(function(t) { return t.category === filterCategory; });
  if (filterMonth) filtered = filtered.filter(function(t) { return t.date && t.date.startsWith(filterMonth); });
  filtered.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
  var tbody = document.getElementById("transaction-body");
  var noDataMsg = document.getElementById("no-data-msg");
  if (filtered.length === 0) { tbody.innerHTML = ""; noDataMsg.style.display = "block"; return; }
  noDataMsg.style.display = "none";

  tbody.innerHTML = filtered.map(function(t) {
    var isTopup = t.type === "topup";
    return '<tr>' +
      '<td>' + formatDate(t.date) + '</td>' +
      '<td>' + safeStr(t.category) +
        '<br><small style="color:var(--text-muted)">' + (t.description || '') + '</small>' +
        '<br><small style="color:var(--primary-light)">' + getAccountDisplayName(t.account) + '</small></td>' +
      '<td style="color:' + (isTopup ? "var(--success)" : "var(--danger)") + ';font-weight:700">' + (isTopup ? "+" : "-") + formatCurrency(t.amount) + '</td>' +
      '<td><div class="tx-actions">' +
        '<button class="action-btn" onclick="editTransaction(' + t.rowId + ')">&#9998;</button>' +
        '<button class="action-btn delete" onclick="confirmDelete(' + t.rowId + ')">&#128465;</button>' +
      '</div></td></tr>';
  }).join("");
}

function updateCategoryFilter(transactions) {
  var select = document.getElementById("filter-category");
  var currentVal = select.value;
  var categories = [];
  transactions.forEach(function(t) { if (categories.indexOf(t.category) === -1) categories.push(t.category); });
  categories.sort();
  select.innerHTML = '<option value="all">Semua Kategori</option>' +
    categories.map(function(c) { return '<option value="' + c + '">' + c + '</option>'; }).join("");
  select.value = currentVal || "all";
}

function renderInsights(transactions) {
  renderComparisonView(transactions);
  insightTrendChart = renderTrendChart(transactions, "insight-trend-chart", insightTrendChart);
  renderTopCategories(transactions);
  renderInsightTips(transactions);
}

function renderComparisonView(transactions) {
  var view = document.getElementById("comparison-view");
  var cm = getCurrentMonth(), pm = getPreviousMonth();
  var currentTx = transactions.filter(function(t) { return t.type === "expense" && t.date && t.date.startsWith(cm); });
  var prevTx = transactions.filter(function(t) { return t.type === "expense" && t.date && t.date.startsWith(pm); });
  var currentByCat = {}, prevByCat = {};
  currentTx.forEach(function(t) { currentByCat[t.category] = (currentByCat[t.category] || 0) + parseFloat(t.amount || 0); });
  prevTx.forEach(function(t) { prevByCat[t.category] = (prevByCat[t.category] || 0) + parseFloat(t.amount || 0); });
  var allCats = [];
  Object.keys(currentByCat).forEach(function(c) { if (allCats.indexOf(c) === -1) allCats.push(c); });
  Object.keys(prevByCat).forEach(function(c) { if (allCats.indexOf(c) === -1) allCats.push(c); });

  if (allCats.length === 0) { view.innerHTML = '<p class="empty-state">Tiada data untuk perbandingan.</p>'; return; }

  view.innerHTML = allCats.map(function(cat) {
    var curr = currentByCat[cat] || 0, prev = prevByCat[cat] || 0;
    var diff = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
    var isUp = diff > 0;
    var changeHtml = prev > 0
      ? '<span class="comparison-change ' + (isUp ? "change-up" : "change-down") + '">' + (isUp ? "↑" : "↓") + " " + Math.abs(Math.round(diff)) + '%</span>'
      : '<span class="comparison-change change-up">Baru</span>';
    var diffAmt = formatCurrency(Math.abs(curr - prev));
    var diffColor = curr - prev > 0 ? 'var(--danger)' : 'var(--success)';

    return '<div class="comparison-card"><div class="comparison-header"><span class="comparison-category">' + cat + '</span>' + changeHtml + '</div>' +
      '<div class="comparison-values"><div><div style="font-size:0.72rem;color:var(--text-muted)">Bulan ini</div><div class="comparison-current">' + formatCurrency(curr) + '</div></div>' +
      '<div><div style="font-size:0.72rem;color:var(--text-muted)">Bulan lepas</div><div class="comparison-prev">' + formatCurrency(prev) + '</div></div>' +
      '<div style="text-align:right"><div style="font-size:0.72rem;color:var(--text-muted)">Beza</div><div style="font-weight:600;color:' + diffColor + '">' + diffAmt + '</div></div></div></div>';
  }).join("");
}

function renderTopCategories(transactions) {
  var view = document.getElementById("top-categories-view");
  var cm = getCurrentMonth();
  var monthExpenses = transactions.filter(function(t) { return t.type === "expense" && t.date && t.date.startsWith(cm); });
  var totals = {}, total = 0;
  monthExpenses.forEach(function(t) { totals[t.category] = (totals[t.category] || 0) + parseFloat(t.amount || 0); total += parseFloat(t.amount || 0); });
  var sorted = Object.entries(totals).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 5);

  if (sorted.length === 0) { view.innerHTML = '<p class="empty-state">Tiada data perbelanjaan.</p>'; return; }
  var max = sorted[0][1];

  view.innerHTML = '<div class="top-categories">' + sorted.map(function(entry, idx) {
    var cat = entry[0], amount = entry[1];
    return '<div class="top-item"><div class="top-rank">' + (idx + 1) + '</div><div class="top-info"><div class="top-category">' + cat + '</div>' +
      '<div class="top-progress"><div class="progress-bar"><div class="progress-fill" style="width:' + ((amount / max) * 100) + '%"></div></div></div></div>' +
      '<div class="top-amount">' + formatCurrency(amount) + '</div></div>';
  }).join("") + '</div>';
}

function renderInsightTips(transactions) {
  var list = document.getElementById("insight-tips");
  var tips = [];
  var cm = getCurrentMonth();
  var monthExpenses = transactions.filter(function(t) { return t.type === "expense" && t.date && t.date.startsWith(cm); });
  var totalMonthExpense = monthExpenses.reduce(function(s, t) { return s + parseFloat(t.amount || 0); }, 0);
  var catTotals = {};
  monthExpenses.forEach(function(t) { catTotals[t.category] = (catTotals[t.category] || 0) + parseFloat(t.amount || 0); });
  var sortedCats = Object.entries(catTotals).sort(function(a, b) { return b[1] - a[1]; });
  var topCat = sortedCats[0];

  if (topCat) {
    tips.push({ icon: "\u{1F3AF}", msg: "Anda spent " + Math.round((topCat[1] / totalMonthExpense) * 100) + "% perbelanjaan bulan ini pada <strong>" + topCat[0] + "</strong> (" + formatCurrency(topCat[1]) + ")." });
  }

  var historyTotals = {};
  transactions.filter(function(t) { return t.type === "expense"; }).forEach(function(t) {
    if (t.date) { var m = t.date.slice(0, 7); historyTotals[m] = (historyTotals[m] || 0) + parseFloat(t.amount || 0); }
  });
  var histEntries = Object.entries(historyTotals).sort(function(a, b) { return new Date(a[0]) - new Date(b[0]); }).slice(-6);
  var avgSixMonth = histEntries.length > 1 ? histEntries.slice(0, -1).reduce(function(s, e) { return s + e[1]; }, 0) / (histEntries.length - 1) : 0;
  var currentTotal = historyTotals[cm] || 0;

  if (avgSixMonth > 0 && currentTotal > avgSixMonth * 1.1) {
    tips.push({ icon: "\u{1F4C8}", msg: "Perbelanjaan bulan ini <strong>" + formatCurrency(currentTotal) + "</strong> adalah " + Math.round(((currentTotal - avgSixMonth) / avgSixMonth) * 100) + "% lebih tinggi dari purata 6 bulan (" + formatCurrency(avgSixMonth) + ")." });
  } else if (currentTotal > 0 && currentTotal < avgSixMonth * 0.9) {
    tips.push({ icon: "\u2728", msg: "Bagus! Anda sudah menjimatkan <strong>" + formatCurrency(avgSixMonth - currentTotal) + "</strong> berbanding purata 6 bulan." });
  }

  if (totalMonthExpense > 0) {
    var avgPerDay = totalMonthExpense / new Date().getDate();
    var projectedMonth = avgPerDay * new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    tips.push({ icon: "\u{1F4CA}", msg: "Purata perbelanjaan harian: <strong>" + formatCurrency(avgPerDay) + "</strong>. Projection keseluruhan bulan: " + formatCurrency(projectedMonth) + "." });
  }

  var budgets = getBudgets();
  Object.entries(budgets).forEach(function(entry) {
    var cat = entry[0], limit = entry[1];
    var spent = catTotals[cat] || 0;
    var pct = (spent / limit) * 100;
    if (pct >= 80) {
      tips.push({ icon: "\u26A0\uFE0F", msg: "<strong>" + cat + "</strong> sudah mencapai " + Math.round(pct) + "% dari budget (" + formatCurrency(spent) + " / " + formatCurrency(limit) + ")." });
    }
  });

  if (tips.length === 0) {
    tips.push({ icon: "\u{1F4DD}", msg: "Mula tambah transaksi untuk dapatkan analisis perbelanjaan!" });
  }

  list.innerHTML = tips.map(function(t) {
    return '<li class="insight-item"><span class="insight-icon">' + t.icon + '</span><span>' + t.msg + '</span></li>';
  }).join("");
}

function renderBudgetView(transactions) {
  var budgets = getBudgets();
  var cm = getCurrentMonth();
  document.getElementById("budget-month-label").textContent = formatMonthLabel(cm);
  var monthExpenses = transactions.filter(function(t) { return t.type === "expense" && t.date && t.date.startsWith(cm); });
  var spentByCat = {};
  monthExpenses.forEach(function(t) { spentByCat[t.category] = (spentByCat[t.category] || 0) + parseFloat(t.amount || 0); });
  var totalLimit = Object.values(budgets).reduce(function(s, v) { return s + v; }, 0);
  var totalSpent = 0;
  Object.keys(budgets).forEach(function(cat) { totalSpent += (spentByCat[cat] || 0); });

  var totalBarHtml = "";
  if (totalLimit > 0) {
    var pctTotal = Math.round((totalSpent / totalLimit) * 100);
    var fillClass = pctTotal >= 100 ? "danger" : (pctTotal >= 80 ? "warning" : "");
    totalBarHtml = '<div class="budget-item" style="padding:1rem;background:var(--bg);border-radius:var(--radius-sm);margin-bottom:1rem;">' +
      '<div class="budget-header"><span class="budget-category" style="font-size:0.95rem">Total Budget</span>' +
      '<div class="budget-amounts"><span class="budget-spent">' + formatCurrency(totalSpent) + '</span><span class="budget-limit">/ ' + formatCurrency(totalLimit) + '</span></div></div>' +
      '<div class="progress-bar"><div class="progress-fill ' + fillClass + '" style="width:' + Math.min(pctTotal, 100) + '%"></div></div>' +
      '<div class="budget-percent">' + pctTotal + '% digunakan \u00B7 Baki: ' + formatCurrency(Math.max(totalLimit - totalSpent, 0)) + '</div></div>';
  }
  document.getElementById("budget-total-bar").innerHTML = totalBarHtml;

  var entries = Object.entries(budgets);
  var list = document.getElementById("budget-list");
  var emptyMsg = document.getElementById("budget-empty-msg");
  if (entries.length === 0) { list.innerHTML = ""; emptyMsg.style.display = "block"; return; }
  emptyMsg.style.display = "none";

  list.innerHTML = entries.map(function(entry) {
    var cat = entry[0], limit = entry[1];
    var spent = spentByCat[cat] || 0;
    var pct = Math.round((spent / limit) * 100);
    var fillClass = pct >= 100 ? "danger" : (pct >= 80 ? "warning" : "");
    return '<div class="budget-item"><div class="budget-header"><span class="budget-category">' + cat + '</span>' +
      '<div class="budget-amounts"><span class="budget-spent">' + formatCurrency(spent) + '</span><span class="budget-limit">/ ' + formatCurrency(limit) + '</span></div></div>' +
      '<div class="progress-bar"><div class="progress-fill ' + fillClass + '" style="width:' + Math.min(pct, 100) + '%"></div></div>' +
      '<div class="budget-percent">' + pct + '% \u00B7 Baki: ' + formatCurrency(Math.max(limit - spent, 0)) + '</div></div>';
  }).join("");
}

function checkBudgetAlerts(transactions) {
  var budgets = getBudgets();
  var cm = getCurrentMonth();
  var alertSection = document.getElementById("budget-alert-section");
  var container = document.getElementById("alert-container");
  container.innerHTML = "";
  var monthExpenses = transactions.filter(function(t) { return t.type === "expense" && t.date && t.date.startsWith(cm); });
  var spendingByCategory = {};
  monthExpenses.forEach(function(t) { spendingByCategory[t.category] = (spendingByCategory[t.category] || 0) + parseFloat(t.amount || 0); });
  var hasAlerts = false;

  Object.entries(budgets).forEach(function(entry) {
    var cat = entry[0], budget = entry[1];
    if (budget <= 0) return;
    var spent = spendingByCategory[cat] || 0;
    var pct = (spent / budget) * 100;
    if (pct >= 80) {
      hasAlerts = true;
      var isDanger = pct >= 100;
      var div = document.createElement("div");
      div.className = "alert-item" + (isDanger ? " alert-danger" : "");
      div.innerHTML = '<span class="alert-icon">' + (isDanger ? "\u26A0\uFE0F" : "\u2139\uFE0F") + '</span>' +
        '<span class="alert-text"><strong>' + cat + ':</strong> ' + formatCurrency(spent) + ' / ' + formatCurrency(budget) + ' (' + Math.round(pct) + '%) ' + (isDanger ? " - Budget habis!" : " - Hampir limit") + '</span>';
      container.appendChild(div);
    }
  });
  alertSection.style.display = hasAlerts ? "block" : "none";
}

function suggestAiCategory(description) {
  if (!isAiEnabled() || !description) return null;
  var lc = description.toLowerCase();
  var keys = Object.keys(AI_KEYWORDS);
  for (var i = 0; i < keys.length; i++) {
    var cat = keys[i], keywords = AI_KEYWORDS[cat];
    for (var j = 0; j < keywords.length; j++) {
      if (lc.indexOf(keywords[j]) !== -1) return cat;
    }
  }
  return null;
}

document.getElementById("input-description").addEventListener("blur", function() {
  var suggested = suggestAiCategory(this.value);
  var hint = document.getElementById("ai-suggest");
  if (suggested) {
    hint.textContent = "AI suggest: " + suggested;
    hint.onclick = function() {
      document.getElementById("input-category").value = suggested;
      hint.textContent = "";
    };
  } else {
    hint.textContent = "";
  }
});

async function refreshData() {
  allTransactions = await fetchData();
  updateSummaryCards(allTransactions);
  checkBudgetAlerts(allTransactions);
  renderCategoryChart(allTransactions, document.getElementById("chart-month").value);
  trendChart = renderTrendChart(allTransactions, "trend-chart", trendChart);
  renderRecentTransactions(allTransactions);
  updateCategoryFilter(allTransactions);
  renderTransactionsTable(allTransactions);
  renderBudgetView(allTransactions);
  renderInsights(allTransactions);
  hideLoading();
}

document.getElementById("expense-form").addEventListener("submit", async function(e) {
  e.preventDefault();
  var rowId = document.getElementById("edit-row-id").value;
  var accountValue = document.getElementById("input-account").value;
  var tx = {
    date: document.getElementById("input-date").value,
    type: document.getElementById("input-type").value,
    category: document.getElementById("input-category").value,
    amount: document.getElementById("input-amount").value,
    description: document.getElementById("input-description").value,
    account: accountValue
  };
  var payload = rowId ? Object.assign({ action: "update", rowId: parseInt(rowId) }, tx) : Object.assign({ action: "add" }, tx);
  var success = await apiAction(payload);
  if (success) {
    var parsed = parseAccountValue(accountValue);
    updateAccountBalance(parsed.type, parsed.index, parseFloat(tx.amount), tx.type === "expense");
    
    this.reset();
    document.getElementById("input-date").value = new Date().toISOString().split("T")[0];
    document.getElementById("edit-row-id").value = "";
    document.getElementById("form-title").textContent = "Tambah Transaksi";
    document.getElementById("btn-submit").textContent = "Simpan";
    document.getElementById("btn-cancel").style.display = "none";
    populateCategorySelects();
    populateAccountSelect();
    await refreshData();
    showToast(rowId ? "Transaksi berjaya dikemaskini!" : "Transaksi berjaya ditambah!");
  }
});

window.editTransaction = function(rowId) {
  var tx = null;
  for (var i = 0; i < allTransactions.length; i++) {
    if (allTransactions[i].rowId === rowId) { tx = allTransactions[i]; break; }
  }
  if (!tx) return;
  document.getElementById("edit-row-id").value = tx.rowId;
  document.getElementById("input-date").value = tx.date;
  document.getElementById("input-type").value = tx.type;
  populateCategorySelects();
  populateAccountSelect();
  document.getElementById("input-category").value = tx.category;
  document.getElementById("input-amount").value = tx.amount;
  document.getElementById("input-account").value = tx.account || "cash";
  document.getElementById("input-description").value = tx.description || "";
  document.getElementById("form-title").textContent = "Kemaskini Transaksi";
  document.getElementById("btn-submit").textContent = "Kemaskini";
  document.getElementById("btn-cancel").style.display = "inline-block";
  switchTab("transactions");
};

window.confirmDelete = function(rowId) {
  if (!confirm("Padam transaksi ini?")) return;
  apiAction({ action: "delete", rowId: rowId }).then(function(ok) {
    if (ok) { showToast("Transaksi berjaya dipadam!"); refreshData(); }
  });
};

document.getElementById("btn-cancel").addEventListener("click", function() {
  document.getElementById("expense-form").reset();
  document.getElementById("input-date").value = new Date().toISOString().split("T")[0];
  document.getElementById("edit-row-id").value = "";
  document.getElementById("form-title").textContent = "Tambah Transaksi";
  document.getElementById("btn-submit").textContent = "Simpan";
  this.style.display = "none";
  populateAccountSelect();
});

document.getElementById("filter-type").addEventListener("change", function() { renderTransactionsTable(allTransactions); });
document.getElementById("filter-category").addEventListener("change", function() { renderTransactionsTable(allTransactions); });
document.getElementById("filter-month").addEventListener("change", function() { renderTransactionsTable(allTransactions); });
document.getElementById("chart-month").addEventListener("change", function(e) { renderCategoryChart(allTransactions, e.target.value); });

document.getElementById("btn-settings").addEventListener("click", function() {
  document.getElementById("config-api-url").value = getApiUrl() || "";
  document.getElementById("toggle-ai").checked = isAiEnabled();
  renderBudgetSettings();
  document.getElementById("settings-modal").classList.add("active");
});

document.getElementById("btn-save-settings").addEventListener("click", function() {
  var apiUrl = document.getElementById("config-api-url").value.trim();
  if (apiUrl) localStorage.setItem(LS_KEYS.apiUrl, apiUrl);
  lsSet("aiEnabled", document.getElementById("toggle-ai").checked);
  var budgetInputs = document.querySelectorAll(".budget-input");
  var budgets = {};
  budgetInputs.forEach(function(input) {
    var cat = input.dataset.category;
    var v = parseFloat(input.value) || 0;
    if (v > 0) budgets[cat] = v;
  });
  lsSet("budgets", budgets);
  document.getElementById("settings-modal").classList.remove("active");
  showToast("Tetapan berjaya disimpan!");
  refreshData();
});

function renderBudgetSettings() {
  var container = document.getElementById("budget-settings");
  var budgets = getBudgets();
  var cats = getAllCategories().filter(function(c) { return ["Gaji", "Freelance"].indexOf(c) === -1; });
  container.innerHTML = cats.map(function(cat) {
    return '<div class="budget-setting-row"><label>' + cat + '</label>' +
      '<input type="number" class="budget-input" data-category="' + cat + '" value="' + (budgets[cat] || "") + '" step="0.01" min="0" placeholder="0.00"></div>';
  }).join("");
}

var PRELOADED_RECURRING = [
  { id: "r-unifi", name: "Unifi (Internet)", category: "Bil & Utiliti", amount: 94.50, day: 28, status: "active" },
  { id: "r-maxis", name: "Maxis", category: "Bil & Utiliti", amount: 115.00, day: 28, status: "active" },
  { id: "r-air", name: "Bil Air", category: "Bil & Utiliti", amount: 50.00, day: 15, status: "active" },
  { id: "r-letrik", name: "Bil Letrik", category: "Bil & Utiliti", amount: 150.00, day: 15, status: "active" },
  { id: "r-motor", name: "Motor Pokya", category: "Pengangkutan", amount: 200.00, day: 1, status: "active" },
  { id: "r-taekwondo", name: "Taekwondo", category: "Hiburan", amount: 106.00, day: 1, status: "active" },
  { id: "r-asb", name: "ASB (Simpanan)", category: "Lain-lain", amount: 300.00, day: 25, status: "active" },
  { id: "r-cimb", name: "Personal Loan CIMB/Touch n Go", category: "Lain-lain", amount: 300.00, day: 5, status: "active" }
];

function validateRecurringItem(item) {
  return item && typeof item.id === "string" && typeof item.name === "string" && item.name.length > 0 &&
    typeof item.category === "string" && item.category.length > 0 &&
    typeof item.amount === "number" && typeof item.day === "number";
}

function renderRecurringList() {
  var list = document.getElementById("recurring-list");
  var empty = document.getElementById("recurring-empty");
  var items = getRecurring();

  items = items.filter(validateRecurringItem);

  if (!localStorage.getItem("et_recurring_preloaded")) {
    var existingIds = items.map(function(i) { return i.id; });
    PRELOADED_RECURRING.forEach(function(r) {
      if (existingIds.indexOf(r.id) === -1) items.push(Object.assign({}, r));
    });
    setRecurring(items);
    localStorage.setItem("et_recurring_preloaded", "true");
  }

  if (items.length === 0) { list.innerHTML = ""; empty.style.display = "block"; return; }
  empty.style.display = "none";

  var payments = getRecurringPayments();
  var cm = getCurrentMonth();
  var monthPayments = payments[cm] || {};
  var today = new Date();
  var currentDay = today.getDate();

  var activeItems = items.filter(function(i) { return i.status !== "paused"; });
  var total = activeItems.reduce(function(s, i) { return s + (i.amount || 0); }, 0);

  var paidCount = 0, paidAmount = 0, outstanding = 0, outstandingAmount = 0;
  var outstandingAlerts = [];

  activeItems.forEach(function(item) {
    var p = monthPayments[item.id];
    var isPaid = p && p.paid;
    if (isPaid) {
      paidCount++;
      paidAmount += item.amount;
    } else {
      outstanding++;
      outstandingAmount += item.amount;
      if (currentDay > item.day) outstandingAlerts.push(item);
    }
  });

  document.getElementById("recurring-total").textContent = formatCurrency(total);
  document.getElementById("recurring-paid-count").textContent = paidCount + " / " + activeItems.length;
  document.getElementById("recurring-paid-amount").textContent = formatCurrency(paidAmount);
  document.getElementById("recurring-outstanding-count").textContent = String(outstanding);
  document.getElementById("recurring-outstanding-amount").textContent = formatCurrency(outstandingAmount);
  document.getElementById("recurring-month-label").textContent = formatMonthLabel(cm);

  var alertContainer = document.getElementById("recurring-alerts");
  if (outstandingAlerts.length > 0) {
    alertContainer.innerHTML = outstandingAlerts.map(function(item) {
      return '<div class="recurring-alert alert-overdue">' +
        '<span class="alert-icon">\u26A0\uFE0F</span>' +
        '<div class="alert-text"><strong>' + item.name + '</strong> - ' + formatCurrency(item.amount) + ' <span class="overdue-badge">OVERDUE</span>' +
        '<div class="alert-sub">Due date ' + item.day + ' hb sudah lepas. Bayar segera untuk elak penalty atau disconnection.</div></div>' +
        '<button class="btn btn-sm btn-primary" onclick="toggleRecurringPayment(\'' + item.id + '\')">Bayar \u2714</button></div>';
    }).join("");
  } else if (outstanding === 0 && activeItems.length > 0) {
    alertContainer.innerHTML = '<div class="recurring-alert alert-complete"><span class="alert-icon">\u2705</span><div class="alert-text"><strong>Semua bil bulanan sudah dibayar!</strong></div></div>';
  } else {
    alertContainer.innerHTML = "";
  }

  list.innerHTML = items.map(function(item) {
    var p = monthPayments[item.id];
    var isPaid = p && p.paid;
    var isPaused = item.status === "paused";
    var isOverdue = !isPaid && !isPaused && currentDay > item.day;
    var paidClass = isPaid ? " item-paid" : "";
    var overdueClass = isOverdue ? " item-overdue" : "";
    var checkClass = isPaid ? " checked" : "";
    var badges = "";
    if (isOverdue) badges += '<span class="status-badge status-overdue">OVERDUE</span>';
    if (isPaid) badges += '<span class="status-badge status-paid">PAID</span>';
    if (isPaused) badges += '<span class="status-badge status-paused">Paused</span>';
    var paidDate = "";
    if (p && p.paidAt) paidDate = '<span class="paid-date">Paid: ' + formatDate(p.paidAt) + '</span>';
    var nameHtml = isPaid ? '<s>' + item.name + '</s>' : item.name;

    return '<li class="recurring-item' + paidClass + overdueClass + '">' +
      '<button class="check-btn' + checkClass + '" onclick="toggleRecurringPayment(\'' + item.id + '\')" ' + (isPaused ? "disabled" : "") + '>' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></button>' +
      '<div class="recurring-info"><div class="recurring-name">' + nameHtml + '</div>' +
      '<div class="recurring-meta">' + item.category + ' \u00B7 Due: ' + item.day + ' hb ' + badges + paidDate + '</div></div>' +
      '<div class="recurring-amount">' + formatCurrency(item.amount) + '</div>' +
      '<button class="action-btn" onclick="openRecurringPaymentModal(\'' + item.id + '\')" title="Rekod Pembayaran">\U0001F4B3</button>' +
      '<button class="action-btn" onclick="editRecurring(\'' + item.id + '\')">\u270E</button></li>';
  }).join("");
}

function currentMonthPaymentKey() { return getCurrentMonth(); }

window.toggleRecurringPayment = function(itemId) {
  var all = getRecurringPayments();
  var cm = currentMonthPaymentKey();
  if (!all[cm]) all[cm] = {};
  var current = all[cm][itemId];
  var isPaid = current && current.paid;
  all[cm][itemId] = { paid: !isPaid, paidAt: !isPaid ? new Date().toISOString() : null };
  setRecurringPayments(all);
  renderRecurringList();
  if (!isPaid) showToast("Bayaran ditandai sebagai selesai!", "success");
  else showToast("Bayaran ditandai sebagai belum selesai.", "warning");
};

window.editRecurring = function(id) {
  var items = getRecurring();
  var item = null;
  for (var i = 0; i < items.length; i++) {
    if (items[i].id === id) { item = items[i]; break; }
  }
  if (!item) { showToast("Item tidak dijumpai.", "error"); return; }

  document.getElementById("recurring-id").value = item.id;
  document.getElementById("recurring-name").value = item.name;
  document.getElementById("recurring-amount").value = item.amount;
  document.getElementById("recurring-day").value = item.day;
  document.getElementById("recurring-status").value = item.status || "active";
  populateCategorySelects();
  document.getElementById("recurring-category").value = item.category;
  document.getElementById("recurring-modal-title").textContent = "Kemaskini Recurring";
  document.getElementById("btn-delete-recurring").style.display = "inline-block";
  document.getElementById("recurring-modal").classList.add("active");
};

document.getElementById("btn-add-recurring").addEventListener("click", function() {
  document.getElementById("recurring-id").value = Date.now().toString();
  document.getElementById("recurring-form").reset();
  document.getElementById("recurring-day").value = "1";
  document.getElementById("recurring-modal-title").textContent = "Tambah Recurring";
  document.getElementById("btn-delete-recurring").style.display = "none";
  populateCategorySelects();
  document.getElementById("recurring-modal").classList.add("active");
});

document.getElementById("btn-save-recurring").addEventListener("click", function() {
  var id = document.getElementById("recurring-id").value;
  var name = document.getElementById("recurring-name").value.trim();
  var category = document.getElementById("recurring-category").value;
  var amount = parseFloat(document.getElementById("recurring-amount").value) || 0;
  var day = parseInt(document.getElementById("recurring-day").value) || 1;
  var status = document.getElementById("recurring-status").value;

  if (!name || !category || amount <= 0) { showToast("Sila lengkapkan semua field!", "error"); return; }

  var items = getRecurring();
  var idx = -1;
  for (var i = 0; i < items.length; i++) { if (items[i].id === id) { idx = i; break; } }

  if (idx > -1) {
    items[idx] = { id: items[idx].id, name: name, category: category, amount: amount, day: day, status: status };
  } else {
    items.push({ id: id, name: name, category: category, amount: amount, day: day, status: status });
  }

  setRecurring(items);
  document.getElementById("recurring-modal").classList.remove("active");
  renderRecurringList();
  showToast(idx > -1 ? "Recurring berjaya dikemaskini!" : "Recurring berjaya ditambah!");
});

document.getElementById("btn-delete-recurring").addEventListener("click", function() {
  var id = document.getElementById("recurring-id").value;
  if (!confirm("Padam recurring ini?")) return;
  setRecurring(getRecurring().filter(function(i) { return i.id !== id; }));
  document.getElementById("recurring-modal").classList.remove("active");
  renderRecurringList();
  showToast("Recurring berjaya dipadam!");
});

// ============= SPLIT PAYMENT FUNCTIONS =============

window.openRecurringPaymentModal = function(itemId) {
  var items = getRecurring();
  var item = null;
  for (var i = 0; i < items.length; i++) {
    if (items[i].id === itemId) { item = items[i]; break; }
  }
  if (!item) { showToast("Item tidak dijumpai.", "error"); return; }

  document.getElementById("recurring-payments-modal-title").textContent = "Rekod Pembayaran: " + item.name;
  document.getElementById("payment-recurring-id").value = itemId;
  document.getElementById("payment-amount").value = "";
  document.getElementById("payment-date").value = new Date().toISOString().split("T")[0];
  document.getElementById("payment-note").value = "";
  
  populatePaymentAccountSelect();
  updatePaymentSummary(itemId);
  renderPaymentsList(itemId);
  
  document.getElementById("recurring-payments-modal").classList.add("active");
};

function populatePaymentAccountSelect() {
  var select = document.getElementById("payment-account");
  var accounts = getAccounts();
  
  var html = '<option value="cash">Tunai</option>';
  
  accounts.ewallet.forEach(function(a) {
    html += '<option value="ewallet:' + a.id + '">' + safeStr(a.name) + '</option>';
  });
  
  accounts.creditcard.forEach(function(a) {
    html += '<option value="creditcard:' + a.id + '">' + safeStr(a.name) + '</option>';
  });
  
  select.innerHTML = html;
}

function updatePaymentSummary(itemId) {
  var items = getRecurring();
  var item = null;
  for (var i = 0; i < items.length; i++) {
    if (items[i].id === itemId) { item = items[i]; break; }
  }
  if (!item) return;
  
  var payments = item.splitPayments || [];
  var totalPaid = payments.reduce(function(s, p) { return s + (p.amount || 0); }, 0);
  var balance = item.amount - totalPaid;
  
  document.getElementById("payment-total").textContent = formatCurrency(totalPaid);
  var balEl = document.getElementById("payment-balance");
  balEl.textContent = formatCurrency(balance);
  balEl.className = "summary-value " + (balance <= 0 ? "zero" : "balance");
  
  var btn = document.getElementById("btn-mark-paid");
  if (balance <= 0) {
    btn.style.display = "inline-block";
    btn.onclick = function() { markRecurringAsPaid(itemId); };
  } else {
    btn.style.display = "none";
  }
}

function renderPaymentsList(itemId) {
  var items = getRecurring();
  var item = null;
  for (var i = 0; i < items.length; i++) {
    if (items[i].id === itemId) { item = items[i]; break; }
  }
  if (!item) return;
  
  var container = document.getElementById("payments-container");
  var payments = item.splitPayments || [];
  
  if (payments.length === 0) {
    container.innerHTML = '<p class="empty-state">Belum ada pembayaran direkodkan.</p>';
    return;
  }
  
  var html = payments.map(function(p, idx) {
    var accountName = "Tunai";
    if (p.account && p.account !== "cash") {
      var parts = p.account.split(":");
      if (parts.length === 2) {
        var accType = parts[0];
        var accId = parts[1];
        var accounts = getAccounts();
        var accList = accType === "ewallet" ? accounts.ewallet : accounts.creditcard;
        for (var j = 0; j < accList.length; j++) {
          if (accList[j].id === accId) {
            accountName = accList[j].name || accountName;
            break;
          }
        }
      }
    }
    
    return '<div class="payment-item">' +
      '<div class="payment-item-info">' +
        '<div class="payment-item-account">' + accountName + '</div>' +
        '<div class="payment-item-date">' + formatDate(p.date) + '</div>' +
        (p.note ? '<div class="payment-item-note">' + safeStr(p.note) + '</div>' : '') +
      '</div>' +
      '<div class="payment-item-amount">' + formatCurrency(p.amount) + '</div>' +
      '<button class="action-btn delete" onclick="deletePayment(\'' + itemId + '\', ' + idx + ')" title="Padam">&#128465;</button>' +
    '</div>';
  }).join("");
  
  container.innerHTML = html;
}

document.getElementById("payment-form").addEventListener("submit", function(e) {
  e.preventDefault();
  
  var itemId = document.getElementById("payment-recurring-id").value;
  var amount = parseFloat(document.getElementById("payment-amount").value);
  var account = document.getElementById("payment-account").value;
  var date = document.getElementById("payment-date").value;
  var note = document.getElementById("payment-note").value.trim();
  
  if (!itemId || !amount || !date) {
    showToast("Sila lengkapkan semua maklumat.", "error");
    return;
  }
  
  var items = getRecurring();
  for (var i = 0; i < items.length; i++) {
    if (items[i].id === itemId) {
      if (!items[i].splitPayments) items[i].splitPayments = [];
      items[i].splitPayments.push({
        amount: amount,
        account: account,
        date: date,
        note: note
      });
      
      // Auto-create transaction entry
      createLinkedTransaction(items[i], amount, account, date, note);
      
      setRecurring(items);
      break;
    }
  }
  
  document.getElementById("payment-amount").value = "";
  document.getElementById("payment-note").value = "";
  
  updatePaymentSummary(itemId);
  renderPaymentsList(itemId);
  showToast("Pembayaran berjaya ditambah!", "success");
});

window.deletePayment = function(itemId, paymentIdx) {
  if (!confirm("Padam pembayaran ini?")) return;
  
  var items = getRecurring();
  for (var i = 0; i < items.length; i++) {
    if (items[i].id === itemId) {
      var payment = items[i].splitPayments[paymentIdx];
      
      // Remove linked transaction
      removeLinkedTransaction(payment);
      
      items[i].splitPayments.splice(paymentIdx, 1);
      setRecurring(items);
      break;
    }
  }
  
  updatePaymentSummary(itemId);
  renderPaymentsList(itemId);
  showToast("Pembayaran berjaya dipadam!", "success");
};

function createLinkedTransaction(recurringItem, amount, account, date, note) {
  var description = recurringItem.name + " - " + (note || "Pembayaran sebahagian");
  
  var tx = {
    action: "add",
    date: date,
    type: "expense",
    category: recurringItem.category,
    amount: amount,
    description: description,
    account: account,
    linkedTo: recurringItem.id
  };
  
  apiAction(tx).then(function(success) {
    if (success) {
      allTransactions = lsGet("data") || [];
      updateSummaryCards(allTransactions);
    }
  });
}

function removeLinkedTransaction(payment) {
  if (!payment.transactionId) return;
  
  apiAction({ action: "delete", transactionId: payment.transactionId }).then(function(success) {
    if (success) {
      allTransactions = lsGet("data") || [];
      updateSummaryCards(allTransactions);
    }
  });
}

function markRecurringAsPaid(itemId) {
  var all = getRecurringPayments();
  var cm = getCurrentMonth();
  if (!all[cm]) all[cm] = {};
  all[cm][itemId] = { paid: true, paidAt: new Date().toISOString() };
  setRecurringPayments(all);
  
  renderRecurringList();
  showToast("Bayaran ditandakan sebagai selesai!", "success");
}

document.querySelectorAll("[data-close]").forEach(function(btn) {
  btn.addEventListener("click", function() {
    document.getElementById(btn.dataset.close).classList.remove("active");
  });
});

document.getElementById("btn-import").addEventListener("click", function() {
  document.getElementById("csv-file").value = "";
  document.getElementById("csv-preview").style.display = "none";
  document.getElementById("btn-confirm-import").disabled = true;
  document.getElementById("import-modal").classList.add("active");
});

document.getElementById("csv-file").addEventListener("change", async function() {
  var file = this.files[0];
  if (!file) return;
  var text = await file.text();
  var lines = text.split(/\r?\n/).filter(function(l) { return l.trim(); });
  var dateFormat = document.getElementById("csv-date-format").value;
  var csvRows = [];

  for (var i = 1; i < lines.length; i++) {
    var parts = lines[i].split(",").map(function(s) { return s.trim().replace(/^"|"$/g, ""); });
    if (parts.length < 4) continue;
    var rawDate = parts[0], type = parts[1], category = parts[2], amount = parts[3], description = parts[4] || "";
    var date = rawDate;
    if (dateFormat === "DD/MM/YYYY") { var sp = rawDate.split("/"); date = sp[2] + "-" + sp[1] + "-" + sp[0]; }
    else if (dateFormat === "MM/DD/YYYY") { var sp = rawDate.split("/"); date = sp[2] + "-" + sp[0] + "-" + sp[1]; }
    csvRows.push({ date: date, type: (type || "expense").toLowerCase(), category: category, amount: parseFloat(amount) || 0, description: description });
  }

  if (csvRows.length === 0) { showToast("CSV tiada data valid!", "error"); return; }

  var tbody = document.getElementById("csv-preview-body");
  tbody.innerHTML = csvRows.slice(0, 10).map(function(r) {
    return '<tr><td>' + formatDate(r.date) + '</td><td>' + safeStr(r.type) + '</td><td>' + safeStr(r.category) + '</td><td>' + formatCurrency(r.amount) + '</td></tr>';
  }).join("");
  document.getElementById("csv-count").textContent = "Menunjukkan " + Math.min(csvRows.length, 10) + " dari " + csvRows.length + " transaksi";
  document.getElementById("csv-preview").style.display = "block";
  document.getElementById("btn-confirm-import").disabled = false;
  window.__csvRows = csvRows;
});

document.getElementById("btn-confirm-import").addEventListener("click", async function() {
  if (!window.__csvRows) return;
  showLoading();
  var rows = window.__csvRows;
  for (var i = 0; i < rows.length; i++) {
    await apiAction(Object.assign({ action: "add" }, rows[i]));
  }
  hideLoading();
  document.getElementById("import-modal").classList.remove("active");
  showToast(rows.length + " transaksi berjaya diimport!");
  refreshData();
  window.__csvRows = null;
});

function checkSetup() {
  var apiUrl = getApiUrl();
  if (!apiUrl) {
    document.getElementById("setup-modal").classList.add("active");
  }
}

document.getElementById("btn-setup-save").addEventListener("click", function() {
  var apiUrl = document.getElementById("setup-api-url").value.trim();
  if (!apiUrl) { showToast("Sila masukkan URL!", "error"); return; }
  localStorage.setItem(LS_KEYS.apiUrl, apiUrl);
  document.getElementById("setup-modal").classList.remove("active");
  showToast("Berjaya! Memuatkan data...", "success");
  refreshData();
});

document.getElementById("btn-skip-setup").addEventListener("click", function() {
  document.getElementById("setup-modal").classList.remove("active");
  showToast("Demo mode aktif. Data disimpan dalam browser.", "success");
});

var LOAN_ICONS = {
  "PTPTN": "\u{1F393}", "Kereta": "\u{1F697}", "Rumah": "\u{1F3E0}", "Peribadi": "\u{1F4B3}",
  "Pendidikan": "\u{1F4DA}", "Kad Kredit": "\u{1F4B3}", "Lain-lain": "\u{1F4CB}"
};


// ============= LOAN INSIGHTS & STRATEGI =============

function renderLoanInsights(loans) {
  var salaries = getSalaries() || PRE_LOADED_SALARIES;
  var currentMonth = getCurrentMonth();
  var latestSalary = salaries.filter(function(s) { return s.month && s.month.startsWith(currentMonth); })[0];

  // Kira statistics
  var totalBalance = loans.reduce(function(s, l) { return s + parseFloat(l.balance || 0); }, 0);
  var totalMonthly = loans.reduce(function(s, l) { return s + parseFloat(l.monthly || 0); }, 0);
  var totalInterestPaid = 0;
  loans.forEach(function(l) {
    var amount = parseFloat(l.amount) || 0;
    var balance = parseFloat(l.balance) || 0;
    var paid = amount - balance;
    totalInterestPaid += Math.max(0, paid * (parseFloat(l.rate) || 0) / 100);
  });

  var netIncome = latestSalary ? latestSalary.nett : 0;
  var debtToIncomeRatio = netIncome > 0 ? Math.round((totalMonthly / netIncome) * 100) : 0;

  // Find loan paling mahal (highest interest rate)
  var highestInterestLoan = loans.reduce(function(max, l) {
    return (parseFloat(l.rate) || 0) > (parseFloat(max.rate) || 0) ? l : max;
  }, loans[0]);

  // Find loan paling lama nak habis
  var longestLoan = loans.reduce(function(max, l) {
    var maxMonths = calculateFinishDate(max);
    var lMonths = calculateFinishDate(l);
    if (typeof lMonths === "number" && (typeof maxMonths !== "number" || lMonths > maxMonths)) {
      return l;
    }
    return max;
  }, loans[0]);

  var insightsHtml = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem;">';

  // Debt-to-Income
  var dtiColor = debtToIncomeRatio < 30 ? 'var(--success)' : debtToIncomeRatio < 40 ? 'var(--warning)' : 'var(--danger)';
  var dtiStatus = debtToIncomeRatio < 30 ? '✅ Sihat' : debtToIncomeRatio < 40 ? '⚠️ Sederhana' : '🚨 Tinggi';
  insightsHtml += '<div class="stat-box" style="padding: 1rem; background: var(--bg); border-radius: 8px; border-left: 4px solid ' + dtiColor + ';">' +
    '<div style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem;">Nisbah Hutang/Pendapatan</div>' +
    '<div style="font-size: 1.5rem; font-weight: 700; color: ' + dtiColor + ';">' + debtToIncomeRatio + '%</div>' +
    '<div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.25rem;">' + dtiStatus + '</div></div>';

  // Total Balance
  insightsHtml += '<div class="stat-box" style="padding: 1rem; background: var(--bg); border-radius: 8px;">' +
    '<div style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem;">Jumlah Baki</div>' +
    '<div style="font-size: 1.5rem; font-weight: 700; color: var(--danger);">' + formatCurrency(totalBalance) + '</div>' +
    '<div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.25rem;">' + loans.length + ' loans aktif</div></div>';

  // Monthly Commitment
  insightsHtml += '<div class="stat-box" style="padding: 1rem; background: var(--bg); border-radius: 8px;">' +
    '<div style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem;">Komitmen Bulanan</div>' +
    '<div style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">' + formatCurrency(totalMonthly) + '</div>' +
    '<div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.25rem;">' + Math.round(totalMonthly / (netIncome || 1) * 100) + '% dari gaji</div></div>';

  insightsHtml += '</div>';

  // Analisis
  if (highestInterestLoan && parseFloat(highestInterestLoan.rate) > 0) {
    insightsHtml += '<div style="padding: 1rem; background: rgba(239, 68, 68, 0.1); border-radius: 8px; border-left: 3px solid var(--danger); margin-top: 1rem;">' +
      '<div style="font-weight: 600; margin-bottom: 0.5rem;">🔥 Loan Paling Mahal: ' + safeStr(highestInterestLoan.name) + '</div>' +
      '<div style="font-size: 0.875rem; color: var(--text-muted);">Interest rate ' + (parseFloat(highestInterestLoan.rate) || 0).toFixed(2) + '%. Ini sepatutnya jadi keutamaan untuk diselesaikan!</div></div>';
  }

  var longestMonths = calculateFinishDate(longestLoan);
  if (longestLoan && typeof longestMonths === "number") {
    var years = Math.floor(longestMonths / 12);
    var months = longestMonths % 12;
    insightsHtml += '<div style="padding: 1rem; background: rgba(59, 130, 246, 0.1); border-radius: 8px; border-left: 3px solid var(--primary); margin-top: 1rem;">' +
      '<div style="font-weight: 600; margin-bottom: 0.5rem;">⏱️ Loan Paling Lama: ' + safeStr(longestLoan.name) + '</div>' +
      '<div style="font-size: 0.875rem; color: var(--text-muted);">Akan ambil ' + years + ' tahun ' + months + ' bulan untuk habis dengan bayaran bulanan semasa.</div></div>';
  }

  document.getElementById("loan-insights-content").innerHTML = insightsHtml;

  // Render Strategy
  renderLoanStrategy(loans);
}

function renderLoanStrategy(loans) {
  if (loans.length < 2) {
    document.getElementById("loan-strategy-content").innerHTML = '<p class="sub-text">Strategi tersedia bila ada 2+ loans.</p>';
    return;
  }

  // Strategy 1: Avalanche (bayar interest tinggi dulu)
  var avalancheLoans = loans.slice().sort(function(a, b) {
    return (parseFloat(b.rate) || 0) - (parseFloat(a.rate) || 0);
  });

  // Strategy 2: Snowball (bayar balance kecil dulu)
  var snowballLoans = loans.slice().sort(function(a, b) {
    return (parseFloat(a.balance) || 0) - (parseFloat(b.balance) || 0);
  });

  var strategyHtml = '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">';

  // Snowball Strategy
  strategyHtml += '<div style="padding: 1rem; background: var(--bg); border-radius: 8px;">';
  strategyHtml += '<div style="font-weight: 700; margin-bottom: 0.5rem;">❄️ Snowball Method</div>';
  strategyHtml += '<div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">Bayar balance <strong>paling kecil</strong> dulu untuk "quick wins"</div>';
  strategyHtml += '<ol style="margin: 0; padding-left: 1.5rem; font-size: 0.85rem;">';
  snowballLoans.forEach(function(l, i) {
    strategyHtml += '<li style="margin-bottom: 0.5rem;"><strong>' + safeStr(l.name) + '</strong><br><span style="color: var(--text-muted);">Baki ' + formatCurrency(l.balance || 0) + '</span></li>';
  });
  strategyHtml += '</ol>';
  strategyHtml += '<div style="margin-top: 1rem; padding: 0.75rem; background: rgba(59, 130, 246, 0.1); border-radius: 4px; font-size: 0.8rem;">✅ Bagus untuk motivasi - terasa progress cepat!</div>';
  strategyHtml += '</div>';

  // Avalanche Strategy
  strategyHtml += '<div style="padding: 1rem; background: var(--bg); border-radius: 8px;">';
  strategyHtml += '<div style="font-weight: 700; margin-bottom: 0.5rem;">⛰️ Avalanche Method</div>';
  strategyHtml += '<div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">Bayar <strong>interest tertinggi</strong> dulu untuk jimat wang</div>';
  strategyHtml += '<ol style="margin: 0; padding-left: 1.5rem; font-size: 0.85rem;">';
  avalancheLoans.forEach(function(l, i) {
    strategyHtml += '<li style="margin-bottom: 0.5rem;"><strong>' + safeStr(l.name) + '</strong><br><span style="color: var(--text-muted);">Rate ' + (parseFloat(l.rate) || 0).toFixed(2) + '%</span></li>';
  });
  strategyHtml += '</ol>';
  strategyHtml += '<div style="margin-top: 1rem; padding: 0.75rem; background: rgba(16, 185, 129, 0.1); border-radius: 4px; font-size: 0.8rem;">💰 Paling jimat - bayar kurang interest dalam jangka panjang!</div>';
  strategyHtml += '</div>';

  strategyHtml += '</div>';

  // Recommendation
  var highestRate = parseFloat(avalancheLoans[0].rate) || 0;
  var lowestBalance = parseFloat(snowballLoans[0].balance) || 0;

  strategyHtml += '<div style="margin-top: 1rem; padding: 1rem; background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%); border-radius: 8px; border: 2px solid var(--success);">';
  if (highestRate > 8) {
    strategyHtml += '<div style="font-weight: 700; color: var(--danger); margin-bottom: 0.5rem;">💡 Cadangan: Guna Avalanche Method</div>';
    strategyHtml += '<div style="font-size: 0.875rem;">Anda ada loan dengan interest ' + highestRate.toFixed(2) + '% - terlalu tinggi! Selesaikan ni dulu untuk jimat banyak wang.</div>';
  } else if (lowestBalance < 5000) {
    strategyHtml += '<div style="font-weight: 700; color: var(--primary); margin-bottom: 0.5rem;">💡 Cadangan: Guna Snowball Method</div>';
    strategyHtml += '<div style="font-size: 0.875rem;">Anda ada loan kecil ' + formatCurrency(lowestBalance) + '! Selesaikan ni dulu untuk motivasi dan kurangkan monthly commitment.</div>';
  } else {
    strategyHtml += '<div style="font-weight: 700; color: var(--success); margin-bottom: 0.5rem;">💡 Cadangan: Mana-mana pun OK</div>';
    strategyHtml += '<div style="font-size: 0.875rem;">Loans anda seimbang. Fokus pada yang mana anda rasa lebih motivated!</div>';
  }
  strategyHtml += '</div>';

  document.getElementById("loan-strategy-content").innerHTML = strategyHtml;
}

window.simulateExtraPayment = function() {
  var extraPayment = parseFloat(document.getElementById("extra-payment-input").value) || 0;
  if (extraPayment <= 0) {
    document.getElementById("simulation-result").innerHTML = '';
    return;
  }

  var loans = getLoans().filter(function(l) {
    return l && typeof l.balance !== "undefined" && parseFloat(l.balance) > 0;
  });

  if (loans.length === 0) {
    document.getElementById("simulation-result").innerHTML = '<p class="sub-text">Tiada loan aktif.</p>';
    return;
  }

  var resultHtml = '';

  // Simulation: apply extra payment to each loan (prioritize by interest rate or balance)
  var sortedByInterest = loans.slice().sort(function(a, b) {
    return (parseFloat(b.rate) || 0) - (parseFloat(a.rate) || 0);
  });

  resultHtml += '<div style="margin-top: 1rem;">';
  resultHtml += '<h4 style="font-size: 0.9rem; font-weight: 700; margin-bottom: 0.75rem;">📊 Dengan RM ' + formatCurrency(extraPayment) + ' ekstra sebulan:</h4>';

  var totalSavings = 0;
  var totalMonthsSaved = 0;

  sortedByInterest.forEach(function(loan) {
    var balance = parseFloat(loan.balance) || 0;
    var monthly = parseFloat(loan.monthly) || 0;
    var rate = parseFloat(loan.rate) || 0;
    var monthlyRate = rate / 100 / 12;

    if (balance <= 0 || monthly <= 0) return;

    // Current scenario
    var currentMonths = calculateFinishDate(loan);
    if (typeof currentMonths !== "number") return;

    // With extra payment
    var extraTotal = monthly + extraPayment;
    var newMonths = 0;
    var tempBalance = balance;
    var newInterest = 0;

    // Simulate month by month
    while (tempBalance > 0 && newMonths < 360) { // max 30 years
      var interest = tempBalance * monthlyRate;
      newInterest += interest;
      tempBalance = tempBalance + interest - extraTotal;
      newMonths++;
    }

    // Calculate savings
    var oldInterest = currentMonths * monthly - balance;
    var interestSaved = Math.max(0, oldInterest - newInterest);
    var monthsSaved = currentMonths - newMonths;

    if (monthsSaved > 0) {
      totalSavings += interestSaved;
      totalMonthsSaved += monthsSaved;

      var yearsSaved = Math.floor(monthsSaved / 12);
      var monthsRemainder = monthsSaved % 12;

      resultHtml += '<div style="padding: 0.75rem; background: var(--bg); border-radius: 4px; margin-bottom: 0.5rem;">';
      resultHtml += '<div style="font-weight: 600; margin-bottom: 0.25rem;">' + safeStr(loan.name) + '</div>';
      resultHtml += '<div style="font-size: 0.8rem; color: var(--text-muted);">';
      resultHtml += '⚡ Siap ' + (yearsSaved > 0 ? yearsSaved + ' tahun ' : '') + monthsRemainder + ' bulan lebih cepat<br>';
      resultHtml += '💰 Jimat interest: ' + formatCurrency(interestSaved);
      resultHtml += '</div></div>';
    }
  });

  resultHtml += '<div style="margin-top: 1rem; padding: 1rem; background: rgba(16, 185, 129, 0.1); border-radius: 8px; border-left: 4px solid var(--success);">';
  resultHtml += '<div style="font-weight: 700; color: var(--success); margin-bottom: 0.5rem;">💰 Total Saving</div>';
  resultHtml += '<div style="font-size: 0.875rem;">Bayar ekstra RM ' + extraPayment + '/bulan boleh jimat <strong>' + formatCurrency(totalSavings) + '</strong> interest dan selesaikan semua loan <strong>' + Math.floor(totalMonthsSaved / 12) + ' tahun ' + (totalMonthsSaved % 12) + ' bulan</strong> lebih cepat!</div>';
  resultHtml += '</div>';

  resultHtml += '</div>';

  document.getElementById("simulation-result").innerHTML = resultHtml;
};

function calculateFinishDate(loan) {
  var balance = parseFloat(loan.balance) || 0;
  var monthly = parseFloat(loan.monthly) || 0;
  var rate = parseFloat(loan.rate) || 0;
  if (balance <= 0 || monthly <= 0) return null;
  if (rate === 0) return Math.ceil(balance / monthly);
  var monthlyRate = (rate / 100) / 12;
  if (monthly <= balance * monthlyRate) return "Tidak pernah habis";
  var n = Math.log(monthly / (monthly - balance * monthlyRate)) / Math.log(1 + monthlyRate);
  return Math.ceil(n);
}

function calculateMonthsToPayOff(principal, monthly, rate) {
  principal = parseFloat(principal) || 0;
  monthly = parseFloat(monthly) || 0;
  rate = parseFloat(rate) || 0;
  if (principal <= 0 || monthly <= 0) return null;
  if (rate === 0) return Math.ceil(principal / monthly);
  var monthlyRate = (rate / 100) / 12;
  if (monthly <= principal * monthlyRate) return "Tidak pernah habis";
  var n = Math.log(monthly / (monthly - principal * monthlyRate)) / Math.log(1 + monthlyRate);
  return Math.ceil(n);
}

function renderLoanList() {
  var list = document.getElementById("loan-list");
  var empty = document.getElementById("loan-empty");
  var loans = getLoans().filter(function(l) {
    return l && typeof l.id === "string" && typeof l.name === "string" && l.name.length > 0 &&
      typeof l.type === "string" && typeof l.amount !== "undefined" && typeof l.balance !== "undefined";
  });

  var totalAmount = loans.reduce(function(s, l) { return s + parseFloat(l.amount || 0); }, 0);
  var totalBalance = loans.reduce(function(s, l) { return s + parseFloat(l.balance || 0); }, 0);
  var totalMonthly = loans.reduce(function(s, l) { return s + parseFloat(l.monthly || 0); }, 0);

  document.getElementById("total-loan-amount").textContent = formatCurrency(totalAmount);
  document.getElementById("total-loan-balance").textContent = formatCurrency(totalBalance);
  document.getElementById("total-loan-monthly").textContent = formatCurrency(totalMonthly);

  if (loans.length === 0) {
    list.innerHTML = "";
    empty.style.display = "block";
    document.getElementById("loan-insights-container").style.display = "none";
    return;
  }
  empty.style.display = "none";
  document.getElementById("loan-insights-container").style.display = "block";
  renderLoanInsights(loans);

  list.innerHTML = loans.map(function(loan) {
    var amount = parseFloat(loan.amount) || 0;
    var balance = parseFloat(loan.balance) || 0;
    var paid = amount - balance;
    var pctPaid = amount > 0 ? Math.round((paid / amount) * 100) : 100;
    var monthly = parseFloat(loan.monthly) || 0;
    var rate = parseFloat(loan.rate) || 0;
    var monthsLeft = calculateFinishDate(loan);
    var originalMonths = calculateMonthsToPayOff(amount, monthly, rate);
    var finishDateStr = "", remainText = "", finishStatus = "";

    // Kira jumlah perlu bayar (total termasuk interest)
    var totalNeedToPay = 0;
    var remainingNeedToPay = 0;
    var totalInterest = 0;
    var hasInterestData = false;

    if (typeof originalMonths === "number" && !isNaN(originalMonths)) {
      totalNeedToPay = originalMonths * monthly;
      totalInterest = totalNeedToPay - amount;
      hasInterestData = true;
    }

    if (typeof monthsLeft === "number" && !isNaN(monthsLeft)) {
      remainingNeedToPay = monthsLeft * monthly;
    }

    if (typeof monthsLeft === "number" && !isNaN(monthsLeft)) {
      var finishDate = new Date();
      finishDate.setMonth(finishDate.getMonth() + monthsLeft);
      finishDateStr = finishDate.toLocaleDateString("ms-MY", { month: "long", year: "numeric" });
      var years = Math.floor(monthsLeft / 12);
      var months = monthsLeft % 12;
      remainText = years > 0 ? years + " tahun " + months + " bulan" : months + " bulan";
    } else if (monthsLeft === "Tidak pernah habis") {
      finishDateStr = "Tidak pernah habis";
      remainText = "-";
      finishStatus = "danger";
    } else {
      finishDateStr = "Sudah Settle";
      remainText = "0 bulan";
      finishStatus = "done";
    }

    var icon = LOAN_ICONS[loan.type] || "\u{1F4CB}";

    var totalPayableHtml = "";
    if (hasInterestData && rate > 0) {
      totalPayableHtml =
        '<div class="loan-total-payable">' +
          '<div class="loan-total-payable-main">' +
            '<div class="loan-total-payable-label">Jumlah Perlu Bayar</div>' +
            '<div class="loan-total-payable-value">' + formatCurrency(totalNeedToPay) + '</div>' +
          '</div>' +
          '<div class="loan-total-payable-info">Principal ' + formatCurrency(amount) + ' + Interest ' + formatCurrency(totalInterest) + '</div>' +
        '</div>';
    }

    return '<div class="loan-card"><div class="loan-header"><div class="loan-title"><div class="loan-icon">' + icon + '</div><div>' +
      '<div class="loan-name">' + safeStr(loan.name) + '</div><div class="loan-type">' + safeStr(loan.type) + '</div></div></div>' +
      '<div style="display:flex;gap:0.4rem;align-items:center">' +
        '<button class="action-btn" onclick="editLoan(\'' + loan.id + '\')" title="Edit">\u270E</button>' +
        '<button class="action-btn delete" onclick="confirmDeleteLoan(\'' + loan.id + '\')" title="Padam">\u{1F5D1}\uFE0F</button>' +
      '</div></div>' +
      totalPayableHtml +
      '<div class="loan-stats-grid">' +
      '<div class="loan-stat-col"><div class="loan-stat-label">Jumlah Asal</div><div class="loan-stat-value">' + formatCurrency(amount) + '</div></div>' +
      '<div class="loan-stat-col"><div class="loan-stat-label">Baki</div><div class="loan-stat-value" style="color:var(--danger)">' + formatCurrency(balance) + '</div></div>' +
      '<div class="loan-stat-col"><div class="loan-stat-label">Dibayar</div><div class="loan-stat-value" style="color:var(--success)">' + formatCurrency(paid) + '</div></div>' +
      (remainingNeedToPay > 0 ? '<div class="loan-stat-col"><div class="loan-stat-label">Baki+Interest</div><div class="loan-stat-value" style="color:var(--primary)">' + formatCurrency(remainingNeedToPay) + '</div></div>' : '') +
      '<div class="loan-stat-col"><div class="loan-stat-label">Bulanan</div><div class="loan-stat-value">' + formatCurrency(monthly) + '</div></div>' +
      (rate > 0 ? '<div class="loan-stat-col"><div class="loan-stat-label">Faedah</div><div class="loan-stat-value">' + rate + '%</div></div>' : '') +
      '</div>' +
      '<div class="loan-stat-full loan-stat-expected"><div class="loan-stat-label">Expected Abis</div><div class="loan-stat-value loan-finish-date loan-finish-' + finishStatus + '">' + finishDateStr + '</div><div class="loan-remain">' + remainText + ' lagi</div></div>' +
      '<div class="loan-progress"><div class="progress-bar"><div class="progress-fill ' + (finishStatus === "done" ? "done" : "") + '" style="width:' + pctPaid + '%"></div></div></div>' +
      '</div>';
  }).join("");
}

window.confirmDeleteLoan = function(id) {
  if (!confirm("Padam loan ini?")) return;
  var loans = getLoans().filter(function(l) { return l.id !== id; });
  setLoans(loans);
  renderLoanList();
  showToast("Loan berjaya dipadam!");
};

window.editLoan = function(id) {
  var loans = getLoans();
  var loan = null;
  for (var i = 0; i < loans.length; i++) {
    if (loans[i].id === id) { loan = loans[i]; break; }
  }
  if (!loan) { showToast("Loan tidak dijumpai.", "error"); return; }

  document.getElementById("loan-id").value = loan.id;
  document.getElementById("loan-name").value = loan.name;
  document.getElementById("loan-type").value = loan.type;
  document.getElementById("loan-amount").value = loan.amount;
  document.getElementById("loan-balance").value = loan.balance;
  document.getElementById("loan-rate").value = loan.rate || 0;
  document.getElementById("loan-monthly").value = loan.monthly;
  document.getElementById("loan-start").value = loan.start || "";
  document.getElementById("loan-notes").value = loan.notes || "";
  document.getElementById("loan-modal-title").textContent = "Kemaskini Loan";
  document.getElementById("btn-delete-loan").style.display = "inline-block";
  document.getElementById("loan-modal").classList.add("active");
};

document.getElementById("btn-add-loan").addEventListener("click", function() {
  document.getElementById("loan-form").reset();
  document.getElementById("loan-id").value = "";
  document.getElementById("loan-start").value = new Date().toISOString().split("T")[0];
  document.getElementById("loan-rate").value = "0";
  document.getElementById("loan-modal-title").textContent = "Tambah Loan";
  document.getElementById("btn-delete-loan").style.display = "none";
  document.getElementById("loan-modal").classList.add("active");
});

document.getElementById("btn-save-loan").addEventListener("click", function() {
  var id = document.getElementById("loan-id").value || Date.now().toString();
  var name = document.getElementById("loan-name").value.trim();
  var type = document.getElementById("loan-type").value;
  var amount = parseFloat(document.getElementById("loan-amount").value) || 0;
  var balance = parseFloat(document.getElementById("loan-balance").value) || 0;
  var rate = parseFloat(document.getElementById("loan-rate").value) || 0;
  var monthly = parseFloat(document.getElementById("loan-monthly").value) || 0;
  var start = document.getElementById("loan-start").value;
  var notes = document.getElementById("loan-notes").value.trim();

  if (!name || amount <= 0 || monthly <= 0) { showToast("Sila lengkapkan semua field wajib!", "error"); return; }

  var loans = getLoans();
  var idx = -1;
  for (var i = 0; i < loans.length; i++) { if (loans[i].id === id) { idx = i; break; } }

  var loanData = { id: id, name: name, type: type, amount: amount, balance: balance, rate: rate, monthly: monthly, start: start, notes: notes };

  if (idx > -1) { loans[idx] = loanData; } else { loans.push(loanData); }

  setLoans(loans);
  document.getElementById("loan-modal").classList.remove("active");
  renderLoanList();
  showToast(idx > -1 ? "Loan berjaya dikemaskini!" : "Loan berjaya ditambah!");
});

document.getElementById("btn-delete-loan").addEventListener("click", function() {
  var id = document.getElementById("loan-id").value;
  if (!confirm("Padam loan ini?")) return;
  setLoans(getLoans().filter(function(l) { return l.id !== id; }));
  document.getElementById("loan-modal").classList.remove("active");
  renderLoanList();
  showToast("Loan berjaya dipadam!");
});

var PRE_LOADED_SALARIES = [
  { month: "2025-01", basic: 4734, ot: 1606.12, travel: 196.40, earnings: 6492.52, deductions: 1196.44, nett: 5296.08, epf: 649, socso: 29.25, eis: 11.90, tax: 221.35, ptptn: 283.21, motobike: 78.23, surau: 50, club: 0, empEpf: 665 },
  { month: "2025-02", basic: 4734, ot: 328.53, travel: 49.10, earnings: 5102.63, deductions: 1245.64, nett: 3856.99, epf: 510, socso: 25.25, eis: 10.10, tax: 276.85, ptptn: 283.21, motobike: 78.23, surau: 50, club: 0, empEpf: 665 },
  { month: "2025-03", basic: 4734, ot: 219.02, travel: 49.10, earnings: 4996.12, deductions: 1053.04, nett: 3943.08, epf: 499, socso: 24.75, eis: 9.90, tax: 84.95, ptptn: 283.21, motobike: 78.23, surau: 50, club: 0, empEpf: 665 },
  { month: "2025-04", basic: 4734, ot: 0, travel: 0, earnings: 4734, deductions: 1038.64, nett: 3695.36, epf: 473, socso: 23.75, eis: 9.50, tax: 71.95, ptptn: 283.21, motobike: 78.23, surau: 50, club: 0, empEpf: 665 },
  { month: "2025-05", basic: 5019, ot: 0, travel: 0, earnings: 6159, deductions: 1335.14, nett: 4823.86, epf: 615, socso: 32, eis: 11.90, tax: 200.05, ptptn: 283.21, motobike: 78.23, surau: 50, club: 0, empEpf: 868 },
  { month: "2025-06", basic: 5019, ot: 0, travel: 0, earnings: 5019, deductions: 1126.09, nett: 3892.91, epf: 501, socso: 26.30, eis: 10.10, tax: 82.30, ptptn: 283.21, motobike: 78.23, surau: 50, club: 36, empEpf: 714 },
  { month: "2025-07", basic: 5019, ot: 0, travel: 196.40, earnings: 5235.40, deductions: 1113.99, nett: 4121.41, epf: 523, socso: 27.40, eis: 10.10, tax: 89.05, ptptn: 283.21, motobike: 78.23, surau: 50, club: 0, empEpf: 700 },
  { month: "2025-08", basic: 5019, ot: 1861.67, travel: 147.30, earnings: 6976.97, deductions: 1294.24, nett: 5682.73, epf: 697, socso: 34.15, eis: 11.90, tax: 280.15, ptptn: 283.21, motobike: 78.23, surau: 50, club: 0, empEpf: 714 },
  { month: "2025-09", basic: 5019, ot: 874.07, travel: 147.30, earnings: 6018.37, deductions: 1188.09, nett: 4830.28, epf: 601, socso: 29.40, eis: 11.70, tax: 174.70, ptptn: 283.21, motobike: 78.23, surau: 50, club: 0, empEpf: 714 },
  { month: "2025-10", basic: 5019, ot: 0, travel: 0, earnings: 5419, deductions: 1088.79, nett: 4330.21, epf: 501, socso: 27.40, eis: 10.10, tax: 81, ptptn: 283.21, motobike: 78.23, surau: 50, club: 0, empEpf: 714 },
  { month: "2025-11", basic: 5019, ot: 438.04, travel: 98.20, earnings: 5543.24, deductions: 1138.44, nett: 4404.80, epf: 554, socso: 27.40, eis: 10.90, tax: 127.85, ptptn: 283.21, motobike: 78.23, surau: 50, club: 0, empEpf: 714 },
  { month: "2025-12", basic: 5019, ot: 511.04, travel: 98.20, earnings: 5614.24, deductions: 1146.94, nett: 4467.30, epf: 561, socso: 27.75, eis: 11.10, tax: 135.65, ptptn: 283.21, motobike: 78.23, surau: 50, club: 0, empEpf: 714 },
  { month: "2026-01", basic: 5019, ot: 1441.87, travel: 138, earnings: 6559.37, deductions: 1249.24, nett: 5310.13, epf: 655, socso: 31.10, eis: 11.90, tax: 235.15, ptptn: 283.21, motobike: 78.23, surau: 50, club: 0, empEpf: 714 },
  { month: "2026-02", basic: 5019, ot: 0, travel: 0, earnings: 5019, deductions: 1103.99, nett: 3915.01, epf: 501, socso: 25.25, eis: 10.10, tax: 96.20, ptptn: 283.21, motobike: 78.23, surau: 50, club: 0, empEpf: 714 },
  { month: "2026-03", basic: 5019, ot: 0, travel: 0, earnings: 5019, deductions: 1103.79, nett: 3915.21, epf: 501, socso: 25.25, eis: 10.10, tax: 96, ptptn: 283.21, motobike: 78.23, surau: 50, club: 0, empEpf: 714 },
  { month: "2026-04", basic: 5019, ot: 0, travel: 0, earnings: 5019, deductions: 1115.54, nett: 3903.46, epf: 501, socso: 25.25, eis: 10.10, tax: 95.75, ptptn: 283.21, motobike: 78.23, surau: 50, club: 12, empEpf: 714 },
  { month: "2026-05", basic: 5019, ot: 0, travel: 0, earnings: 5019, deductions: 1106.29, nett: 3912.71, epf: 501, socso: 25.25, eis: 10.10, tax: 95.50, ptptn: 283.21, motobike: 78.23, surau: 50, club: 3, empEpf: 714 }
];

function ensureSalariesLoaded() {
  var salaries = getSalaries();
  if (salaries.length === 0) {
    setSalaries(PRE_LOADED_SALARIES);
    salaries = PRE_LOADED_SALARIES;
  }
  return salaries;
}

function renderPayslipList() {
  var list = document.getElementById("payslip-list");
  var empty = document.getElementById("payslip-empty");
  var salaries = ensureSalariesLoaded().slice().sort(function(a, b) { return b.month.localeCompare(a.month); });

  if (salaries.length === 0) {
    list.innerHTML = ""; empty.style.display = "block";
    document.getElementById("payslip-nett").textContent = "RM 0.00";
    document.getElementById("payslip-salary").textContent = "RM 0.00";
    return;
  }
  empty.style.display = "none";
  var latest = salaries[0];
  document.getElementById("payslip-nett").textContent = formatCurrency(latest.nett);
  document.getElementById("payslip-salary").textContent = formatCurrency(latest.basic);
  var n = salaries.length;
  var totalEarnings = salaries.reduce(function(s, x) { return s + x.earnings; }, 0);
  var totalEpf = salaries.reduce(function(s, x) { return s + x.epf + x.empEpf; }, 0);
  document.getElementById("payslip-avg-earnings").textContent = formatCurrency(totalEarnings / n);
  document.getElementById("payslip-total-epf").textContent = formatCurrency(totalEpf);

  list.innerHTML = salaries.map(function(s) {
    var parts = s.month.split("-");
    var year = parts[0], month = parts[1];
    var names = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"];
    var monthLabel = names[parseInt(month) - 1] + " " + year;
    var otHtml = s.ot > 0 ? " \u00B7 OT: " + formatCurrency(s.ot) : "";
    var travelHtml = s.travel > 0 ? " \u00B7 Travel: " + formatCurrency(s.travel) : "";

    return '<li class="payslip-item"><div class="payslip-info"><div class="payslip-month-label">' + monthLabel + '</div>' +
      '<div class="payslip-meta">Basic: ' + formatCurrency(s.basic) + otHtml + travelHtml + '</div>' +
      '<div class="payslip-meta" style="color:var(--text-muted);margin-top:4px">Nett: <strong style="color:var(--success)">' + formatCurrency(s.nett) + '</strong> \u00B7 Deductions: ' + formatCurrency(s.deductions) + '</div></div>' +
      '<div class="payslip-salary">' + formatCurrency(s.earnings) + '</div>' +
      '<div class="payslip-actions"><button class="action-btn" onclick="viewSalaryDetail(\'' + s.month + '\')" title="Detail">\u{1F4CA}</button></div></li>';
  }).join("");
}

window.viewSalaryDetail = function(month) {
  var salaries = ensureSalariesLoaded();
  var s = null;
  for (var i = 0; i < salaries.length; i++) { if (salaries[i].month === month) { s = salaries[i]; break; } }
  if (!s) return;
  var m = s.month.split("-");
  var mNames = ["Januari", "Februari", "Mac", "April", "Mei", "Jun", "Julai", "Ogos", "September", "Oktober", "November", "Disember"];
  var label = mNames[parseInt(m[1]) - 1] + " " + m[0];

  alert("=== " + label + " ===\n\n" +
    "Gaji Pokok: RM " + s.basic.toFixed(2) + "\n" +
    "Overtime: RM " + s.ot.toFixed(2) + "\n" +
    "Elaun Travel: RM " + s.travel.toFixed(2) + "\n" +
    "--------------------------------\n" +
    "Total Earnings: RM " + s.earnings.toFixed(2) + "\n\n" +
    "POTONGAN:\n" +
    "  EPF: RM " + s.epf.toFixed(2) + "\n" +
    "  SOCSO: RM " + s.socso.toFixed(2) + "\n" +
    "  EIS: RM " + s.eis.toFixed(2) + "\n" +
    "  PCB Tax: RM " + s.tax.toFixed(2) + "\n" +
    "  PTPTN: RM " + s.ptptn.toFixed(2) + "\n" +
    "  Motobike: RM " + s.motobike.toFixed(2) + "\n" +
    "  Surau: RM " + s.surau.toFixed(2) + "\n" +
    "--------------------------------\n" +
    "Total Deductions: RM " + s.deductions.toFixed(2) + "\n" +
    "NETT PAY: RM " + s.nett.toFixed(2));
};

window.deletePayslip = function(id) {
  if (!confirm("Padam slip gaji ini?")) return;
  setPayslips(getPayslips().filter(function(p) { return p.id !== id; }));
  renderPayslipList();
  showToast("Slip gaji berjaya dipadam!");
};

function renderSalaryChart() {
  var salaries = ensureSalariesLoaded();
  var canvas = document.getElementById("salary-chart");
  if (!canvas) return;
  if (salaryChart) salaryChart.destroy();
  var labels = salaries.map(function(s) { return formatShortMonth(s.month); });

  salaryChart = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        { label: "Basic Pay", data: salaries.map(function(s) { return s.basic; }), backgroundColor: "#1e40af", borderRadius: 4, barPercentage: 0.7 },
        { label: "Overtime + Allowances", data: salaries.map(function(s) { return s.ot + s.travel; }), backgroundColor: "#06b6d4", borderRadius: 4, barPercentage: 0.7 },
        { label: "Nett Pay", data: salaries.map(function(s) { return s.nett; }), type: "line", borderColor: "#10b981", backgroundColor: "rgba(16,185,129,0.1)", tension: 0.35, fill: false, pointRadius: 4, pointBackgroundColor: "#10b981", borderWidth: 2 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { x: { grid: { display: false }, stacked: true, ticks: { font: { size: 10 } } }, y: { grid: { color: "#f1f5f9" }, stacked: true, ticks: { callback: function(v) { return "RM " + v; }, font: { size: 10 } } } },
      plugins: { legend: { labels: { usePointStyle: true, font: { size: 11 } } }, tooltip: { callbacks: { label: function(ctx) { return " " + ctx.dataset.label + ": " + formatCurrency(ctx.parsed.y); } } } }
    }
  });
}

function renderDeductionChart() {
  var salaries = ensureSalariesLoaded();
  var canvas = document.getElementById("deduction-chart");
  if (!canvas) return;
  if (deductionChart) deductionChart.destroy();

  var totals = {};
  totals["EPF (Employee)"] = salaries.reduce(function(s, x) { return s + (x.epf || 0); }, 0);
  totals["PCB Tax"] = salaries.reduce(function(s, x) { return s + (x.tax || 0); }, 0);
  totals["PTPTN"] = salaries.reduce(function(s, x) { return s + (x.ptptn || 0); }, 0);
  totals["SOCSO"] = salaries.reduce(function(s, x) { return s + (x.socso || 0); }, 0);
  totals["EIS"] = salaries.reduce(function(s, x) { return s + (x.eis || 0); }, 0);
  totals["Motobike Loan"] = salaries.reduce(function(s, x) { return s + (x.motobike || 0); }, 0);
  totals["Surau Fund"] = salaries.reduce(function(s, x) { return s + (x.surau || 0); }, 0);

  var entries = Object.entries(totals).filter(function(e) { return e[1] > 0; }).sort(function(a, b) { return b[1] - a[1]; });
  var labels = entries.map(function(e) { return e[0]; });
  var values = entries.map(function(e) { return e[1]; });
  var colors = ["#1e40af", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#84cc16"];
  var total = values.reduce(function(s, v) { return s + v; }, 0);

  deductionChart = new Chart(canvas.getContext("2d"), {
    type: "doughnut",
    data: { labels: labels, datasets: [{ data: values, backgroundColor: colors.slice(0, labels.length), borderWidth: 0 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(ctx) { return " " + ctx.label + ": " + formatCurrency(ctx.parsed) + " (" + Math.round((ctx.parsed / total) * 100) + "%)"; } } } },
      cutout: "65%"
    }
  });

  var listEl = document.getElementById("deduction-list");
  listEl.innerHTML = entries.map(function(e, idx) {
    return '<div class="deduction-item"><div class="deduction-color" style="background:' + colors[idx] + '"></div>' +
      '<div class="deduction-info"><span class="deduction-name">' + e[0] + '</span><span class="deduction-amount">' + formatCurrency(e[1]) + '</span></div></div>';
  }).join("");
}

document.getElementById("btn-upload-payslip").addEventListener("click", function() {
  document.getElementById("payslip-form").reset();
  document.getElementById("payslip-month").value = getCurrentMonth();
  document.getElementById("payslip-modal").classList.add("active");
});

document.getElementById("btn-save-payslip").addEventListener("click", async function() {
  var month = document.getElementById("payslip-month").value;
  var salary = parseFloat(document.getElementById("payslip-salary-input").value) || 0;
  var file = document.getElementById("payslip-file").files[0];
  var notes = document.getElementById("payslip-notes").value.trim();

  if (!month || salary <= 0 || !file) { showToast("Sila lengkapkan semua field!", "error"); return; }
  if (file.size > 5 * 1024 * 1024) { showToast("Fail terlalu besar! Maksimum 5MB.", "error"); return; }

  showLoading();
  var reader = new FileReader();
  reader.onload = function() {
    var payslips = getPayslips();
    payslips.push({ id: Date.now().toString(), month: month, salary: salary, notes: notes, fileName: file.name, fileType: file.type, fileSize: file.size, fileData: reader.result, uploadedAt: new Date().toISOString() });
    setPayslips(payslips);
    hideLoading();
    document.getElementById("payslip-modal").classList.remove("active");
    renderPayslipList();
    showToast("Slip gaji berjaya diupload!");
  };
  reader.onerror = function() { hideLoading(); showToast("Gagal baca fail!", "error"); };
  reader.readAsDataURL(file);
});

const LS_KEY_ACCOUNTS = "et_accounts";

function getAccounts() {
  const accounts = lsGet(LS_KEY_ACCOUNTS);
  
  // If no accounts exist, create default test accounts
  if (!accounts) {
    const defaultAccounts = {
      cash: { balance: 0 },
      ewallet: [
        { name: "Touch n Go", balance: 100 },
        { name: "GrabPay", balance: 50 }
      ],
      creditcard: [
        { name: "Maybank Visa", balance: 0, limit: 5000 },
        { name: "CIMB Mastercard", balance: 0, limit: 3000 }
      ],
      bank: []
    };
    lsSet(LS_KEY_ACCOUNTS, defaultAccounts);
    return defaultAccounts;
  }
  
  return accounts;
}

function saveAccounts(accounts) {
  lsSet(LS_KEY_ACCOUNTS, accounts);
}

function renderAccounts() {
  const accounts = getAccounts();
  
  const allAccountsList = document.getElementById("all-accounts-list");
  if (!allAccountsList) return;
  
  // Build unified grid HTML - all account types
  let html = `
    <div class="account-item account-item-compact">
      <div class="account-info">
        <span class="account-icon">💵</span>
        <div class="account-details">
          <div class="account-name">Tunai</div>
          <div class="account-balance"><strong>${formatCurrency(accounts.cash.balance || 0)}</strong></div>
          <span class="account-card-type">Cash</span>
        </div>
      </div>
      <div class="account-actions">
        <button class="action-btn" onclick="editAccount('cash')" title="Edit">✏️</button>
      </div>
    </div>
  `;
  
  // E-Wallet cards
  if (accounts.ewallet.length > 0) {
    html += accounts.ewallet.map((item, idx) => `
      <div class="account-item account-item-compact">
        <div class="account-info">
          <span class="account-icon">📱</span>
          <div class="account-details">
            <div class="account-name">${item.name}</div>
            <div class="account-balance"><strong>${formatCurrency(item.balance)}</strong></div>
            <span class="account-card-type">E-Wallet</span>
          </div>
        </div>
        <div class="account-actions">
          <button class="action-btn" onclick="editAccount('ewallet', ${idx})" title="Edit">✏️</button>
          <button class="action-btn delete" onclick="deleteAccount('ewallet', ${idx})" title="Padam">🗑️</button>
        </div>
      </div>
    `).join("");
  }
  
  // Credit Card cards
  if (accounts.creditcard.length > 0) {
    html += accounts.creditcard.map((item, idx) => `
      <div class="account-item account-item-compact">
        <div class="account-info">
          <span class="account-icon">💳</span>
          <div class="account-details">
            <div class="account-name">${item.name}</div>
            <div class="account-balance"><strong>${formatCurrency(item.balance)}</strong></div>
            ${item.limit ? `<span class="account-card-type">Limit: ${formatCurrency(item.limit)}</span>` : ""}
            <span class="account-card-type">Credit Card</span>
          </div>
        </div>
        <div class="account-actions">
          <button class="action-btn" onclick="editAccount('creditcard', ${idx})" title="Edit">✏️</button>
          <button class="action-btn delete" onclick="deleteAccount('creditcard', ${idx})" title="Padam">🗑️</button>
        </div>
      </div>
    `).join("");
  }
  
  // Bank Account cards
  if (accounts.bank && accounts.bank.length > 0) {
    html += accounts.bank.map((item, idx) => `
      <div class="account-item account-item-compact">
        <div class="account-info">
          <span class="account-icon">🏦</span>
          <div class="account-details">
            <div class="account-name">${item.name}</div>
            <div class="account-balance"><strong>${formatCurrency(item.balance)}</strong></div>
            ${item.bankName ? `<span class="account-card-type">${item.bankName}${item.bankType ? ' - ' + item.bankType : ''}</span>` : ""}
            ${item.accountNumber ? `<span class="account-card-type">No: ${item.accountNumber}</span>` : ""}
          </div>
        </div>
        <div class="account-actions">
          <button class="action-btn" onclick="editAccount('bank', ${idx})" title="Edit">✏️</button>
          <button class="action-btn delete" onclick="deleteAccount('bank', ${idx})" title="Padam">🗑️</button>
        </div>
      </div>
    `).join("");
  }
  
  allAccountsList.innerHTML = html;
  
  populateAccountSelect();
}

window.showAddAccountModal = function(type) {
  document.getElementById("account-form").reset();
  document.getElementById("account-id").value = "";
  document.getElementById("account-type").value = type;
  document.getElementById("account-modal-title").textContent = "Tambah " + getAccountTypeLabel(type);
  document.getElementById("account-limit-group").style.display = type === "creditcard" ? "block" : "none";
  const bankFieldsGroup = document.getElementById("bank-fields-group");
  if (bankFieldsGroup) {
    bankFieldsGroup.style.display = type === "bank" ? "block" : "none";
  }
  document.getElementById("account-modal").classList.add("active");
};

window.editAccount = function(type, index) {
  const accounts = getAccounts();
  
  if (type === "cash") {
    document.getElementById("account-form").reset();
    document.getElementById("account-id").value = "cash";
    document.getElementById("account-type").value = "cash";
    document.getElementById("account-name").value = "Tunai";
    document.getElementById("account-name").disabled = true;
    document.getElementById("account-balance-input").value = accounts.cash.balance || 0;
    document.getElementById("account-modal-title").textContent = "Edit Tunai";
    document.getElementById("account-limit-group").style.display = "none";
    const bankFieldsGroup = document.getElementById("bank-fields-group");
    if (bankFieldsGroup) bankFieldsGroup.style.display = "none";
    document.getElementById("account-modal").classList.add("active");
  } else {
    let item;
    if (type === "ewallet") {
      item = accounts.ewallet[index];
    } else if (type === "creditcard") {
      item = accounts.creditcard[index];
    } else if (type === "bank") {
      item = accounts.bank ? accounts.bank[index] : null;
    }
    if (!item) return;
    
    document.getElementById("account-form").reset();
    document.getElementById("account-id").value = index;
    document.getElementById("account-type").value = type;
    document.getElementById("account-name").value = item.name;
    document.getElementById("account-name").disabled = false;
    document.getElementById("account-balance-input").value = item.balance;
    document.getElementById("account-modal-title").textContent = "Edit " + getAccountTypeLabel(type);
    document.getElementById("account-limit-group").style.display = type === "creditcard" ? "block" : "none";
    document.getElementById("account-limit").value = item.limit || "";
    
    const bankFieldsGroup = document.getElementById("bank-fields-group");
    if (bankFieldsGroup) {
      bankFieldsGroup.style.display = type === "bank" ? "block" : "none";
      if (type === "bank") {
        document.getElementById("account-bank-name").value = item.bankName || "Maybank";
        document.getElementById("account-number").value = item.accountNumber || "";
        document.getElementById("account-bank-type").value = item.bankType || "Savings";
      }
    }
    
    document.getElementById("account-modal").classList.add("active");
  }
};

window.deleteAccount = function(type, index) {
  if (!confirm("Padam akaun ini?")) return;
  
  const accounts = getAccounts();
  if (type === "ewallet") {
    accounts.ewallet.splice(index, 1);
  } else if (type === "creditcard") {
    accounts.creditcard.splice(index, 1);
  } else if (type === "bank" && accounts.bank) {
    accounts.bank.splice(index, 1);
  }
  
  saveAccounts(accounts);
  renderAccounts();
  showToast("Akaun berjaya dipadam!", "success");
};

function getAccountTypeLabel(type) {
  const labels = { cash: "Tunai", ewallet: "E-Wallet", creditcard: "Credit Card", bank: "Bank Account" };
  return labels[type] || type;
}

function populateAccountSelect() {
  const accounts = getAccounts();
  const select = document.getElementById("input-account");
  if (!select) return;
  
  let options = '<option value="cash">Tunai</option>';
  
  if (accounts.ewallet.length > 0) {
    options += '<optgroup label="E-Wallet">';
    accounts.ewallet.forEach(function(item, idx) {
      options += `<option value="ewallet:${idx}">${item.name}</option>`;
    });
    options += '</optgroup>';
  }
  
  if (accounts.creditcard.length > 0) {
    options += '<optgroup label="Credit Card">';
    accounts.creditcard.forEach(function(item, idx) {
      options += `<option value="creditcard:${idx}">${item.name}</option>`;
    });
    options += '</optgroup>';
  }
  
  if (accounts.bank && accounts.bank.length > 0) {
    options += '<optgroup label="Bank Account">';
    accounts.bank.forEach(function(item, idx) {
      options += `<option value="bank:${idx}">${item.name}</option>`;
    });
    options += '</optgroup>';
  }
  
  select.innerHTML = options;
}

function updateAccountBalance(accountType, accountIndex, amount, isExpense) {
  const accounts = getAccounts();
  const delta = isExpense ? -amount : amount;
  
  if (accountType === "cash") {
    accounts.cash.balance = (accounts.cash.balance || 0) + delta;
  } else if (accountType === "ewallet" && accounts.ewallet[accountIndex]) {
    accounts.ewallet[accountIndex].balance = (accounts.ewallet[accountIndex].balance || 0) + delta;
  } else if (accountType === "creditcard" && accounts.creditcard[accountIndex]) {
    accounts.creditcard[accountIndex].balance = (accounts.creditcard[accountIndex].balance || 0) + delta;
  } else if (accountType === "bank" && accounts.bank && accounts.bank[accountIndex]) {
    accounts.bank[accountIndex].balance = (accounts.bank[accountIndex].balance || 0) + delta;
  }
  
  saveAccounts(accounts);
  renderAccounts();
}

function parseAccountValue(value) {
  if (value === "cash") return { type: "cash", index: null };
  const parts = value.split(":");
  return { type: parts[0], index: parseInt(parts[1]) };
}

function getAccountDisplayName(accountValue) {
  if (!accountValue || accountValue === "cash") return "Tunai";
  const accounts = getAccounts();
  const parsed = parseAccountValue(accountValue);
  if (parsed.type === "ewallet" && accounts.ewallet[parsed.index]) {
    return accounts.ewallet[parsed.index].name;
  }
  if (parsed.type === "creditcard" && accounts.creditcard[parsed.index]) {
    return accounts.creditcard[parsed.index].name;
  }
  if (parsed.type === "bank" && accounts.bank && accounts.bank[parsed.index]) {
    return accounts.bank[parsed.index].name;
  }
  return "Tunai";
}

document.getElementById("account-form").addEventListener("submit", function(e) {
  e.preventDefault();
  
  const type = document.getElementById("account-type").value;
  const id = document.getElementById("account-id").value;
  const name = document.getElementById("account-name").value.trim();
  const balance = parseFloat(document.getElementById("account-balance-input").value) || 0;
  const limit = parseFloat(document.getElementById("account-limit").value) || 0;
  
  if (!name) {
    showToast("Nama akaun diperlukan!", "error");
    return;
  }
  
  const accounts = getAccounts();
  if (!accounts.bank) accounts.bank = [];
  
  if (type === "cash") {
    accounts.cash.balance = balance;
  } else if (type === "ewallet") {
    if (id === "") {
      accounts.ewallet.push({ name, balance });
    } else {
      accounts.ewallet[parseInt(id)] = { name, balance };
    }
  } else if (type === "creditcard") {
    if (id === "") {
      accounts.creditcard.push({ name, balance, limit });
    } else {
      accounts.creditcard[parseInt(id)] = { name, balance, limit };
    }
  } else if (type === "bank") {
    const bankName = document.getElementById("account-bank-name").value;
    const accountNumber = document.getElementById("account-number").value.trim();
    const bankType = document.getElementById("account-bank-type").value;
    
    if (id === "") {
      accounts.bank.push({ name, balance, bankName, accountNumber, bankType });
    } else {
      accounts.bank[parseInt(id)] = { name, balance, bankName, accountNumber, bankType };
    }
  }
  
  saveAccounts(accounts);
  document.getElementById("account-modal").classList.remove("active");
  document.getElementById("account-name").disabled = false;
  renderAccounts();
  showToast("Akaun berjaya disimpan!", "success");
});

function applySmartDecimal(el) {
  if (!el) return;
  el.addEventListener("blur", function() {
    var val = this.value.trim();
    if (!val) return;
    if (val.indexOf(".") !== -1 || val.indexOf(",") !== -1) {
      val = val.replace(",", ".");
      var num = parseFloat(val);
      if (!isNaN(num)) this.value = num.toFixed(2);
      return;
    }
    if (/^\d+$/.test(val)) {
      var num = parseInt(val, 10) / 100;
      this.value = num.toFixed(2);
    }
  });
}

function init() {
  document.getElementById("input-date").value = new Date().toISOString().split("T")[0];
  document.getElementById("filter-month").value = getCurrentMonth();

  var monthSelect = document.getElementById("chart-month");
  var months = getRecentMonths(12);
  monthSelect.innerHTML = months.map(function(m) {
    return '<option value="' + m + '"' + (m === getCurrentMonth() ? " selected" : "") + '>' + formatMonthLabel(m) + '</option>';
  }).join("");

  populateCategorySelects();
  populateAccountSelect();
  renderRecurringList();
  renderLoanList();
  renderPayslipList();
  renderSalaryChart();
  renderDeductionChart();
  renderAccounts();

  applySmartDecimal(document.getElementById("input-amount"));
  applySmartDecimal(document.getElementById("recurring-amount"));

  // Setup mobile menu
  setupMobileMenu();

  var apiUrl = getApiUrl();
  if (!apiUrl) {
    var cached = lsGet("data") || [];
    if (cached.length > 0) {
      allTransactions = cached;
      updateSummaryCards(allTransactions);
      checkBudgetAlerts(allTransactions);
      renderCategoryChart(allTransactions, getCurrentMonth());
      trendChart = renderTrendChart(allTransactions, "trend-chart", trendChart);
      renderRecentTransactions(allTransactions);
      updateCategoryFilter(allTransactions);
      renderTransactionsTable(allTransactions);
      renderBudgetView(allTransactions);
      renderInsights(allTransactions);
    } else {
      renderBudgetView([]);
      checkBudgetAlerts([]);
    }
    checkSetup();
  } else {
    refreshData();
  }
}

// Mobile menu functionality
function setupMobileMenu() {
  var hamburgerBtn = document.getElementById('hamburgerMenu');
  var mobileOverlay = document.getElementById('mobileOverlay');
  var sidebar = document.querySelector('.sidebar');
  
  if (!hamburgerBtn || !mobileOverlay || !sidebar) return;
  
  hamburgerBtn.addEventListener('click', function() {
    hamburgerBtn.classList.toggle('active');
    mobileOverlay.classList.toggle('active');
    sidebar.classList.toggle('mobile-open');
  });
  
  mobileOverlay.addEventListener('click', function() {
    hamburgerBtn.classList.remove('active');
    mobileOverlay.classList.remove('active');
    sidebar.classList.remove('mobile-open');
  });
  
  // Close menu when clicking nav buttons on mobile
  var navButtons = document.querySelectorAll('.sidebar-nav .tab-btn, .btn-import, .btn-settings');
  navButtons.forEach(function(btn) {
    btn.addEventListener('click', function() {
      if (window.innerWidth <= 768) {
        hamburgerBtn.classList.remove('active');
        mobileOverlay.classList.remove('active');
        sidebar.classList.remove('mobile-open');
      }
    });
  });
}

// ============= CALCULATOR FUNCTIONS =============

let basicCalcExpression = "";

window.basicCalcAppend = function(value) {
  basicCalcExpression += value;
  document.getElementById("basic-calc-display").value = basicCalcExpression;
};

window.basicCalcClear = function() {
  basicCalcExpression = "";
  document.getElementById("basic-calc-display").value = "";
};

window.basicCalcBackspace = function() {
  basicCalcExpression = basicCalcExpression.slice(0, -1);
  document.getElementById("basic-calc-display").value = basicCalcExpression;
};

window.basicCalcEquals = function() {
  try {
    // Safe eval by replacing operators
    var expr = basicCalcExpression
      .replace(/\*/g, "*")
      .replace(/\//g, "/")
      .replace(/\+/g, "+")
      .replace(/-/g, "-");
    var result = eval(expr);
    document.getElementById("basic-calc-display").value = result;
    basicCalcExpression = String(result);
  } catch (e) {
    document.getElementById("basic-calc-display").value = "Error";
    basicCalcExpression = "";
  }
};

window.calculateBillSplit = function() {
  var amount = parseFloat(document.getElementById("bill-amount").value) || 0;
  var people = parseInt(document.getElementById("bill-people").value) || 1;
  var tipPercent = parseFloat(document.getElementById("bill-tip").value) || 0;
  var taxPercent = parseFloat(document.getElementById("bill-tax").value) || 0;

  if (amount <= 0) {
    showToast("Sila masukkan jumlah bil", "error");
    return;
  }

  var taxAmount = amount * (taxPercent / 100);
  var subtotal = amount + taxAmount;
  var tipAmount = subtotal * (tipPercent / 100);
  var total = subtotal + tipAmount;
  var perPerson = total / people;

  var html = '<div class="calc-result">';
  html += '<p><strong>Jumlah Keseluruhan: RM ' + total.toFixed(2) + '</strong></p>';
  html += '<p>Bahan Asal: RM ' + amount.toFixed(2) + '</p>';
  if (taxPercent > 0) {
    html += '<p>Tax (' + taxPercent + '%): RM ' + taxAmount.toFixed(2) + '</p>';
  }
  if (tipPercent > 0) {
    html += '<p>Tip (' + tipPercent + '%): RM ' + tipAmount.toFixed(2) + '</p>';
  }
  html += '<p><strong>Setiap Orang (' + people + ' orang): RM ' + perPerson.toFixed(2) + '</strong></p>';
  html += '</div>';

  document.getElementById("bill-result").innerHTML = html;
};

window.calculateLoan = function() {
  var principal = parseFloat(document.getElementById("loan-calc-amount").value) || 0;
  var annualRate = parseFloat(document.getElementById("loan-calc-rate").value) || 0;
  var years = parseFloat(document.getElementById("loan-calc-years").value) || 0;
  var wantedMonthly = parseFloat(document.getElementById("loan-calc-monthly").value) || 0;

  if (principal <= 0 || annualRate <= 0 || years <= 0) {
    showToast("Sila lengkapkan jumlah loan, interest rate, dan tempoh", "error");
    return;
  }

  var monthlyRate = (annualRate / 100) / 12;
  var numPayments = years * 12;

  // Standard formula: M = P [r(1+r)^n] / [(1+r)^n - 1]
  var monthly;
  if (monthlyRate === 0) {
    monthly = principal / numPayments;
  } else {
    monthly = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
  }

  var totalPaid = monthly * numPayments;
  var totalInterest = totalPaid - principal;

  // If user wants specific monthly payment
  var alternativeInfo = "";
  if (wantedMonthly > 0 && wantedMonthly < monthly) {
    // Recalculate years needed
    var altNumPayments = 0;
    if (monthlyRate === 0) {
      altNumPayments = Math.ceil(principal / wantedMonthly);
    } else {
      var base = (wantedMonthly) / (principal * monthlyRate);
      altNumPayments = Math.ceil(-Math.log(1 - 1/base) / Math.log(1 + monthlyRate));
    }
    var altYears = altNumPayments / 12;
    var altTotal = wantedMonthly * altNumPayments;
    var altInterest = altTotal - principal;
    alternativeInfo = '<p style="margin-top:1rem;border-top:1px solid rgba(255,255,255,0.2);padding-top:1rem;">' +
      '<strong>Untuk RM ' + wantedMonthly.toFixed(2) + '/bulan:</strong></p>' +
      '<p>Tempoh Baru: ' + altYears.toFixed(1) + ' tahun</p>' +
      '<p>Total Bayar: RM ' + altTotal.toFixed(2) + '</p>' +
      '<p>Interest Baru: RM ' + altInterest.toFixed(2) + '</p>' +
      '<p style="color:var(--success);margin-top:0.5rem;">Jimat Interest: RM ' + (totalInterest - altInterest).toFixed(2) + '</p>';
  }

  var html = '<div class="calc-result">';
  html += '<p><strong>Bayaran Bulanan: RM ' + monthly.toFixed(2) + '</strong></p>';
  html += '<p>Total Bayar: RM ' + totalPaid.toFixed(2) + '</p>';
  html += '<p>Total Interest: RM ' + totalInterest.toFixed(2) + '</p>';
  html += '<p>Tempoh: ' + years + ' tahun (' + numPayments + ' bulan)</p>';
  html += alternativeInfo;
  html += '</div>';

  document.getElementById("loan-result").innerHTML = html;
};

window.calculateSavings = function() {
  var goal = parseFloat(document.getElementById("savings-goal").value) || 0;
  var current = parseFloat(document.getElementById("savings-current").value) || 0;
  var monthly = parseFloat(document.getElementById("savings-monthly").value) || 0;
  var annualRate = parseFloat(document.getElementById("savings-interest").value) || 0;

  if (goal <= 0 || monthly <= 0) {
    showToast("Sila masukkan sasaran dan simpanan bulanan", "error");
    return;
  }

  var needed = Math.max(0, goal - current);
  var months = 0;
  var monthlyRate = (annualRate / 100) / 12;
  var totalContributed = current;

  // Simulate month by month with interest
  var accumulated = current;
  while (accumulated < goal && months < 360) {
    var interest = accumulated * monthlyRate;
    accumulated = accumulated * (1 + monthlyRate) + monthly;
    totalContributed += monthly;
    months++;
  }

  var years = Math.floor(months / 12);
  var remainingMonths = months % 12;
  var timeStr = years > 0 ? years + " tahun " + remainingMonths + " bulan" : remainingMonths + " bulan";

  var withoutInterest = monthly > 0 ? Math.ceil(needed / monthly) : 0;

  var html = '<div class="calc-result">';
  html += '<p><strong>Masa Diperlukan: ' + timeStr + '</strong></p>';
  html += '<p>Sasaran: RM ' + goal.toFixed(2) + '</p>';
  html += '<p>Sudah Ada: RM ' + current.toFixed(2) + '</p>';
  html += '<p>Perlu Tambah: RM ' + needed.toFixed(2) + '</p>';
  html += '<p>Simpanan Bulanan: RM ' + monthly.toFixed(2) + '</p>';
  html += '<p>Total Sumbangan: RM ' + totalContributed.toFixed(2) + '</p>';
  if (annualRate > 0) {
    var earnedInterest = accumulated - totalContributed;
    html += '<p>Interest Diperolehi: RM ' + earnedInterest.toFixed(2) + '</p>';
    html += '<p style="color:var(--success);">Jimat ' + (withoutInterest - months) + ' bulan dengan interest!</p>';
  }
  html += '</div>';

  document.getElementById("savings-result").innerHTML = html;
};

window.calcPercentage = function() {
  var x = parseFloat(document.getElementById("pct-x").value) || 0;
  var y = parseFloat(document.getElementById("pct-y").value) || 0;
  var result = (x / 100) * y;
  document.getElementById("pct-result-1").innerHTML = '<strong>' + x + '% daripada ' + y + ' = ' + result.toFixed(2) + '</strong>';
};

window.calcPercentOf = function() {
  var x = parseFloat(document.getElementById("pct-of-x").value) || 0;
  var y = parseFloat(document.getElementById("pct-of-y").value) || 0;
  if (y === 0) {
    document.getElementById("pct-result-2").innerHTML = '<strong>Sila masukkan nilai Y yang bukan 0</strong>';
    return;
  }
  var result = (x / y) * 100;
  document.getElementById("pct-result-2").innerHTML = '<strong>' + x + ' adalah ' + result.toFixed(2) + '% daripada ' + y + '</strong>';
};

window.calcPercentChange = function() {
  var from = parseFloat(document.getElementById("pct-from").value) || 0;
  var to = parseFloat(document.getElementById("pct-to").value) || 0;
  if (from === 0) {
    document.getElementById("pct-result-3").innerHTML = '<strong>Sila masukkan nilai "Dari" yang bukan 0</strong>';
    return;
  }
  var change = ((to - from) / Math.abs(from)) * 100;
  var sign = change >= 0 ? "+" : "";
  var color = change >= 0 ? "var(--success)" : "var(--danger)";
  document.getElementById("pct-result-3").innerHTML = '<strong style="color:' + color + ';">Perubahan: ' + sign + change.toFixed(2) + '% (RM ' + (to - from).toFixed(2) + ')</strong>';
};

// ============= REPORTING FUNCTIONS =============

let reportCategoryChart = null;
let reportTrendChart = null;

function generateReport() {
  var startDate = document.getElementById("report-start-date").value;
  var endDate = document.getElementById("report-end-date").value;
  
  if (!startDate || !endDate) {
    showToast("Sila pilih tarikh mula dan tarikh akhir", "error");
    return;
  }
  
  // Validate date range
  var start = new Date(startDate);
  var end = new Date(endDate);
  
  if (start > end) {
    showToast("Tarikh mula mesti sebelum tarikh akhir", "error");
    return;
  }
  
  // Filter transactions
  var transactions = allTransactions.filter(function(tx) {
    var txDate = new Date(tx.date);
    return txDate >= start && txDate <= end;
  });
  
  // Calculate summary stats
  var totalIncome = 0;
  var totalExpense = 0;
  
  transactions.forEach(function(tx) {
    if (tx.type === "income") {
      totalIncome += parseFloat(tx.amount) || 0;
    } else {
      totalExpense += parseFloat(tx.amount) || 0;
    }
  });
  
  var netBalance = totalIncome - totalExpense;
  
  // Update summary cards
  document.getElementById("report-total-income").textContent = formatCurrency(totalIncome);
  document.getElementById("report-total-income").className = "summary-value income";
  
  document.getElementById("report-total-expense").textContent = formatCurrency(totalExpense);
  document.getElementById("report-total-expense").className = "summary-value expense";
  
  document.getElementById("report-net-balance").textContent = formatCurrency(netBalance);
  document.getElementById("report-net-balance").className = "summary-value " + (netBalance >= 0 ? "income" : "expense");
  
  document.getElementById("report-total-count").textContent = transactions.length;
  
  // Render charts
  renderReportCategoryChart(transactions);
  renderReportTrendChart(transactions);
  
  // Render top expenses
  renderTopExpenses(transactions);
  
  // Render all transactions table
  renderReportTransactions(transactions);
  
  showToast("Laporan berjaya dijana!", "success");
}

function renderReportCategoryChart(transactions) {
  var categoryData = {};
  
  transactions.forEach(function(tx) {
    if (tx.type === "expense") {
      var category = tx.category || "Lain-lain";
      categoryData[category] = (categoryData[category] || 0) + (parseFloat(tx.amount) || 0);
    }
  });
  
  var labels = Object.keys(categoryData);
  var data = Object.values(categoryData);
  
  if (reportCategoryChart) {
    reportCategoryChart.destroy();
  }
  
  var ctx = document.getElementById("report-category-chart").getContext("2d");
  
  if (labels.length === 0) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.font = "16px sans-serif";
    ctx.fillStyle = "#999";
    ctx.textAlign = "center";
    ctx.fillText("Tiada data perbelanjaan", ctx.canvas.width / 2, ctx.canvas.height / 2);
    return;
  }
  
  reportCategoryChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: [
          "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
          "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16"
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            padding: 15,
            usePointStyle: true,
            font: { size: 12 }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              var label = context.label || "";
              var value = context.parsed || 0;
              var total = context.dataset.data.reduce(function(a, b) { return a + b; }, 0);
              var percentage = ((value / total) * 100).toFixed(1);
              return label + ": RM " + value.toFixed(2) + " (" + percentage + "%)";
            }
          }
        }
      },
      cutout: "60%"
    }
  });
}

function renderReportTrendChart(transactions) {
  var monthlyData = {};
  
  transactions.forEach(function(tx) {
    var date = new Date(tx.date);
    var monthKey = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { income: 0, expense: 0 };
    }
    
    if (tx.type === "income") {
      monthlyData[monthKey].income += parseFloat(tx.amount) || 0;
    } else {
      monthlyData[monthKey].expense += parseFloat(tx.amount) || 0;
    }
  });
  
  var months = Object.keys(monthlyData).sort();
  var incomeData = months.map(function(m) { return monthlyData[m].income; });
  var expenseData = months.map(function(m) { return monthlyData[m].expense; });
  
  var labels = months.map(function(m) {
    var parts = m.split("-");
    var monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"];
    return monthNames[parseInt(parts[1]) - 1] + " " + parts[0];
  });
  
  if (reportTrendChart) {
    reportTrendChart.destroy();
  }
  
  var ctx = document.getElementById("report-trend-chart").getContext("2d");
  
  if (months.length === 0) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.font = "16px sans-serif";
    ctx.fillStyle = "#999";
    ctx.textAlign = "center";
    ctx.fillText("Tiada data trend", ctx.canvas.width / 2, ctx.canvas.height / 2);
    return;
  }
  
  reportTrendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Income",
          data: incomeData,
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          tension: 0.4,
          fill: true
        },
        {
          label: "Expenses",
          data: expenseData,
          borderColor: "#ef4444",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            padding: 15,
            usePointStyle: true,
            font: { size: 12 }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.dataset.label + ": RM " + context.parsed.y.toFixed(2);
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return "RM " + value;
            }
          }
        }
      }
    }
  });
}

function renderTopExpenses(transactions) {
  var expenses = transactions
    .filter(function(tx) { return tx.type === "expense"; })
    .map(function(tx) {
      return {
        date: tx.date,
        description: tx.description || "-",
        category: tx.category || "-",
        account: getAccountDisplayName(tx.account) || "-",
        amount: parseFloat(tx.amount) || 0
      };
    })
    .sort(function(a, b) { return b.amount - a.amount; })
    .slice(0, 10);
  
  var tbody = document.getElementById("report-top-expenses");
  
  if (expenses.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Tiada perbelanjaan direkodkan</td></tr>';
    return;
  }
  
  tbody.innerHTML = expenses.map(function(exp) {
    return '<tr>' +
      '<td>' + formatDate(exp.date) + '</td>' +
      '<td>' + exp.description + '</td>' +
      '<td>' + exp.category + '</td>' +
      '<td>' + exp.account + '</td>' +
      '<td class="expense">' + formatCurrency(exp.amount) + '</td>' +
    '</tr>';
  }).join("");
}

function renderReportTransactions(transactions) {
  var tbody = document.getElementById("report-all-transactions");
  
  var sorted = transactions.slice().sort(function(a, b) {
    return new Date(b.date) - new Date(a.date);
  });
  
  if (sorted.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Tiada transaksi dalam tempoh ini</td></tr>';
    return;
  }
  
  tbody.innerHTML = sorted.map(function(tx) {
    var typeLabel = tx.type === "income" ? "Income" : "Expense";
    var typeClass = tx.type === "income" ? "income" : "expense";
    var sign = tx.type === "income" ? "+" : "-";
    
    return '<tr>' +
      '<td>' + formatDate(tx.date) + '</td>' +
      '<td class="' + typeClass + '">' + typeLabel + '</td>' +
      '<td>' + (tx.category || "-") + '</td>' +
      '<td>' + (tx.description || "-") + '</td>' +
      '<td>' + (getAccountDisplayName(tx.account) || "-") + '</td>' +
      '<td class="' + typeClass + '">' + sign + formatCurrency(tx.amount) + '</td>' +
    '</tr>';
  }).join("");
}

function exportReportCSV() {
  var startDate = document.getElementById("report-start-date").value;
  var endDate = document.getElementById("report-end-date").value;
  
  if (!startDate || !endDate) {
    showToast("Sila generate report terlebih dahulu", "error");
    return;
  }
  
  var start = new Date(startDate);
  var end = new Date(endDate);
  
  var transactions = allTransactions.filter(function(tx) {
    var txDate = new Date(tx.date);
    return txDate >= start && txDate <= end;
  });
  
  if (transactions.length === 0) {
    showToast("Tiada data untuk dieksport", "error");
    return;
  }
  
  // Create CSV content
  var csv = "Date,Type,Category,Description,Account,Amount\n";
  
  transactions.forEach(function(tx) {
    var sign = tx.type === "income" ? "" : "-";
    csv += '"' + tx.date + '","' +
      tx.type + '","' +
      (tx.category || "") + '","' +
      (tx.description || "").replace(/"/g, '""') + '","' +
      (getAccountDisplayName(tx.account) || "") + '","' +
      sign + (parseFloat(tx.amount) || 0).toFixed(2) + '"\n';
  });
  
  // Download CSV
  var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  var link = document.createElement("a");
  var url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", "expense-report-" + startDate + "-to-" + endDate + ".csv");
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showToast("CSV berjaya dieksport!", "success");
}

function printReport() {
  window.print();
}

// Initialize reporting tab
function initReporting() {
  // Set default date range (current month)
  var today = new Date();
  var startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  var endDate = today;
  
  document.getElementById("report-start-date").value = startDate.toISOString().split("T")[0];
  document.getElementById("report-end-date").value = endDate.toISOString().split("T")[0];
}

// Call initReporting when tab is clicked
document.addEventListener("DOMContentLoaded", function() {
  var tabButtons = document.querySelectorAll("[data-tab]");
  tabButtons.forEach(function(btn) {
    btn.addEventListener("click", function() {
      if (btn.getAttribute("data-tab") === "reporting") {
        setTimeout(initReporting, 100);
      }
    });
  });
});

init();
