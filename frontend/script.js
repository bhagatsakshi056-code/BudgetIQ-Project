const API = "http://localhost:5000/api";

// ── GLOBAL STATE ───────────────────────────────────────────────────────────────
let allTransactions = [];
let allGoals        = [];
let flowChart       = null;
let budgetChartInst = null;
let walletChartInst = null;
let trendChartInst  = null;
let pieChartInst    = null;
let budgetPageInst  = null;
let currency        = localStorage.getItem("currency") || "₹";

// ── UTILS ──────────────────────────────────────────────────────────────────────

function showToast(msg, type = "success") {
  const t = document.getElementById("toast");
  if (!t) return;
  t.innerHTML = (type === "success" ? "✅ " : "❌ ") + msg;
  t.className = `toast ${type} show`;
  setTimeout(() => t.classList.remove("show"), 3000);
}

function fmtNum(n) {
  return currency + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateTime(d) {
  return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

// Category config
const CAT = {
  Food:          { icon: "🍔", color: "#f97316" },
  Travel:        { icon: "✈️", color: "#38bdf8" },
  Rent:          { icon: "🏠", color: "#8b5cf6" },
  Salary:        { icon: "💰", color: "#10b981" },
  Entertainment: { icon: "🎮", color: "#ec4899" },
  Healthcare:    { icon: "💊", color: "#06b6d4" },
  Shopping:      { icon: "🛍️", color: "#f59e0b" },
  Other:         { icon: "📦", color: "#94a3b8" },
};
function getCat(name) { return CAT[name] || CAT["Other"]; }

// ── ROUTE GUARD ────────────────────────────────────────────────────────────────

if (window.location.pathname.includes("dashboard.html")) {
  const userId = localStorage.getItem("userId");
  if (!userId) { window.location = "login.html"; }
}

// ── AUTH ───────────────────────────────────────────────────────────────────────

async function register() {
  const name     = document.getElementById("name").value.trim();
  const email    = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirm  = document.getElementById("confirm").value;

  if (!name || !email || !password) return showToast("Please fill all fields", "error");
  if (password.length < 6)           return showToast("Password must be at least 6 characters", "error");
  if (password !== confirm)           return showToast("Passwords don't match", "error");

  try {
    const res  = await fetch(API + "/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (data.success) {
      showToast("Account created! Redirecting to login...");
      setTimeout(() => window.location = "login.html", 1400);
    } else {
      showToast(data.msg || "Registration failed", "error");
    }
  } catch { showToast("Cannot reach server. Is it running on port 5000?", "error"); }
}

async function login() {
  const email    = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) return showToast("Please fill all fields", "error");

  try {
    const res  = await fetch(API + "/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.userId) {
      localStorage.setItem("userId",    data.userId);
      localStorage.setItem("userName",  data.name || email.split("@")[0]);
      localStorage.setItem("userEmail", email);
      showToast("Welcome back, " + (data.name || "User") + "!");
      setTimeout(() => window.location = "dashboard.html", 800);
    } else {
      showToast(data.msg || "Login failed", "error");
    }
  } catch { showToast("Cannot reach server. Is it running on port 5000?", "error"); }
}

function logout() {
  localStorage.clear();
  window.location = "login.html";
}

// ── NAVIGATION ─────────────────────────────────────────────────────────────────

function navigate(pageId) {
  // Hide all pages
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  // Deactivate all nav items
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));

  // Show target page
  const page = document.getElementById("page-" + pageId);
  if (page) page.classList.add("active");

  // Activate nav item
  const navBtn = document.querySelector(`[data-page="${pageId}"]`);
  if (navBtn) navBtn.classList.add("active");

  // Update topbar title
  const titles = {
    dashboard:    ["Welcome back, " + (localStorage.getItem("userName") || "User") + "!", "It is the best time to manage your finances"],
    transactions: ["Transactions", "View and manage all your transactions"],
    wallet:       ["Wallet", "Your complete financial picture"],
    goals:        ["Saving Goals", "Track progress towards your targets"],
    budget:       ["Budget", "Category-wise spending breakdown"],
    analytics:    ["Analytics", "Insights and trends from your data"],
    settings:     ["Settings", "Manage your account and preferences"],
    help:         ["Help & Support", "Learn how to use BudgetIQ"],
  };
  const [title, sub] = titles[pageId] || ["BudgetIQ", ""];
  document.getElementById("topbarTitle").textContent = title;
  document.getElementById("topbarSub").textContent   = sub;

  // Render page-specific content
  if (pageId === "wallet")      renderWallet();
  if (pageId === "budget")      renderBudgetPage();
  if (pageId === "analytics")   renderAnalytics();
  if (pageId === "goals")       renderGoalsPage();
  if (pageId === "transactions") renderAllTransactions();
  if (pageId === "settings")    initSettings();
}

// Wire up sidebar buttons
document.addEventListener("DOMContentLoaded", () => {
  // Sidebar nav
  document.querySelectorAll(".nav-item[data-page]").forEach(btn => {
    btn.addEventListener("click", () => navigate(btn.dataset.page));
  });

  // Modal close on overlay click
  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.classList.remove("open");
    });
  });

  // Theme toggle in sidebar
  document.getElementById("lightBtn")?.addEventListener("click", () => setTheme("light"));
  document.getElementById("darkBtn")?.addEventListener("click",  () => setTheme("dark"));

  // Apply saved theme
  const savedTheme = localStorage.getItem("theme") || "light";
  setTheme(savedTheme, true);

  // Init dashboard if on dashboard page
  if (window.location.pathname.includes("dashboard.html")) {
    initDashboard();
  }
});

// ── MODALS ─────────────────────────────────────────────────────────────────────

function openModal(id) {
  const m = document.getElementById("modal-" + id);
  if (m) m.classList.add("open");
  if (id === "addTx") {
    const d = document.getElementById("txDate");
    if (d && !d.value) d.value = new Date().toISOString().split("T")[0];
  }
}

function closeModal(id) {
  const m = document.getElementById("modal-" + id);
  if (m) m.classList.remove("open");
}

// ── INIT DASHBOARD ─────────────────────────────────────────────────────────────

function initDashboard() {
  const name  = localStorage.getItem("userName")  || "User";
  const email = localStorage.getItem("userEmail") || "";
  currency    = localStorage.getItem("currency")  || "₹";

  document.getElementById("topbarTitle").textContent    = `Welcome back, ${name}!`;
  document.getElementById("userName").textContent       = name;
  document.getElementById("userEmail").textContent      = email;
  document.getElementById("userAvatar").textContent     = name.charAt(0).toUpperCase();

  loadData();
}

// ── LOAD DATA (main fetch) ─────────────────────────────────────────────────────

async function loadData() {
  const userId = localStorage.getItem("userId");
  if (!userId) return;

  try {
    const res  = await fetch(API + "/transactions/" + userId);
    allTransactions = await res.json();
    refreshAll();
  } catch {
    showToast("Failed to load data. Is the server running?", "error");
  }

  // Load goals
  try {
    const res2 = await fetch(API + "/goals/all/" + userId);
    allGoals = await res2.json();
    renderGoalsMini();
    renderGoalsPage();
  } catch {
    // Goals endpoint may not support /all yet — try single
    try {
      const res2 = await fetch(API + "/goals/" + userId);
      const g = await res2.json();
      allGoals = g && g._id ? [g] : [];
      renderGoalsMini();
    } catch {}
  }
}

function refreshAll() {
  renderSummaryCards();
  renderRecentTx();
  renderBudgetDonut();
  renderMoneyFlow();
}

// ── SUMMARY CARDS ──────────────────────────────────────────────────────────────

function renderSummaryCards() {
  let income = 0, expense = 0;
  allTransactions.forEach(t => {
    if (t.type === "income") income += Number(t.amount);
    else expense += Number(t.amount);
  });

  document.getElementById("balMain").textContent     = fmtNum(income - expense);
  document.getElementById("incomeMain").textContent  = fmtNum(income);
  document.getElementById("expenseMain").textContent = fmtNum(expense);
  document.getElementById("savingsMain").textContent = fmtNum(Math.max(income - expense, 0));
}

// ── RECENT TRANSACTIONS (mini, dashboard) ──────────────────────────────────────

function renderRecentTx() {
  const wrap = document.getElementById("recentTxWrap");
  if (!wrap) return;

  const recent = [...allTransactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  if (!recent.length) {
    wrap.innerHTML = `<div class="empty-state"><div class="es-icon">💸</div><h4>No transactions yet</h4></div>`;
    return;
  }

  wrap.innerHTML = `
    <table>
      <thead><tr><th>Date</th><th>Amount</th><th>Category</th><th>Type</th></tr></thead>
      <tbody>
        ${recent.map(t => {
          const cfg  = getCat(t.category);
          const sign = t.type === "income" ? "+" : "-";
          return `<tr>
            <td>${fmtDate(t.date)}</td>
            <td class="tx-amount-cell ${t.type}">${sign}${fmtNum(t.amount)}</td>
            <td><span class="tx-cat-badge">${cfg.icon} ${t.category}</span></td>
            <td style="color:var(--text-mid);font-size:12px">${t.type}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>`;
}

// ── ALL TRANSACTIONS PAGE ─────────────────────────────────────────────────────

function renderAllTransactions() {
  const wrap    = document.getElementById("allTxWrap");
  if (!wrap) return;

  const typeF  = document.getElementById("filterType")?.value     || "all";
  const catF   = document.getElementById("filterCategory")?.value || "all";
  const monthF = document.getElementById("filterMonth")?.value    || "";

  let data = [...allTransactions].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (typeF  !== "all") data = data.filter(t => t.type === typeF);
  if (catF   !== "all") data = data.filter(t => t.category === catF);
  if (monthF)           data = data.filter(t => t.date?.slice(0, 7) === monthF);

  if (!data.length) {
    wrap.innerHTML = `<div class="empty-state"><div class="es-icon">🔍</div><h4>No transactions found</h4><p>Try changing your filters</p></div>`;
    return;
  }

  wrap.innerHTML = `
    <table>
      <thead><tr><th>Date</th><th>Amount</th><th>Category</th><th>Type</th><th>Actions</th></tr></thead>
      <tbody>
        ${data.map(t => {
          const cfg  = getCat(t.category);
          const sign = t.type === "income" ? "+" : "-";
          return `<tr>
            <td>${fmtDateTime(t.date)}</td>
            <td class="tx-amount-cell ${t.type}">${sign}${fmtNum(t.amount)}</td>
            <td><span class="tx-cat-badge">${cfg.icon} ${t.category}</span></td>
            <td style="color:var(--text-mid);font-size:12px;text-transform:capitalize">${t.type}</td>
            <td style="display:flex;gap:6px">
              <button class="tbl-btn" onclick="editTx('${t._id}', ${t.amount})">Edit</button>
              <button class="tbl-btn del" onclick="deleteTx('${t._id}')">Delete</button>
            </td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>`;
}

function clearFilters() {
  const ft = document.getElementById("filterType");
  const fc = document.getElementById("filterCategory");
  const fm = document.getElementById("filterMonth");
  if (ft) ft.value = "all";
  if (fc) fc.value = "all";
  if (fm) fm.value = "";
  renderAllTransactions();
}

// ── MONEY FLOW (bar chart) ────────────────────────────────────────────────────

function renderMoneyFlow() {
  const ctx = document.getElementById("moneyFlowChart");
  if (!ctx) return;

  const months   = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const incM     = new Array(12).fill(0);
  const expM     = new Array(12).fill(0);

  allTransactions.forEach(t => {
    const m = new Date(t.date).getMonth();
    if (t.type === "income") incM[m] += Number(t.amount);
    else                      expM[m] += Number(t.amount);
  });

  const cur    = new Date().getMonth();
  const labels = months.slice(0, cur + 1);
  const incD   = incM.slice(0, cur + 1);
  const expD   = expM.slice(0, cur + 1);

  if (flowChart) { flowChart.destroy(); flowChart = null; }

  flowChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Income",
          data: incD,
          borderColor: "#7c3aed",
          backgroundColor: "rgba(124,58,237,0.15)",
          tension: 0.45,
          fill: true,
          pointBackgroundColor: "#7c3aed",
          pointRadius: 5,
          pointHoverRadius: 7,
          borderWidth: 2.5
        },
        {
          label: "Expense",
          data: expD,
          borderColor: "#c4b5fd",
          backgroundColor: "rgba(196,181,253,0.10)",
          tension: 0.45,
          fill: true,
          pointBackgroundColor: "#c4b5fd",
          pointRadius: 5,
          pointHoverRadius: 7,
          borderWidth: 2.5
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${fmtNum(c.raw)}` }}
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#9ca3af", font: { size: 11 }}},
        y: { grid: { color: "#f3f4f6" }, ticks: { color: "#9ca3af", font: { size: 11 }, callback: v => fmtNum(v) }}
      }
    }
  });
}

// ── BUDGET DONUT (dashboard) ──────────────────────────────────────────────────

function renderBudgetDonut() {
  const catMap = {};
  let total = 0;
  allTransactions.forEach(t => {
    if (t.type === "expense") {
      const amt = Number(t.amount);
      catMap[t.category] = (catMap[t.category] || 0) + amt;
      total += amt;
    }
  });

  const totalEl  = document.getElementById("budgetTotal");
  const legendEl = document.getElementById("budgetLegend");
  if (totalEl) totalEl.textContent = fmtNum(total);

  const keys   = Object.keys(catMap);
  const vals   = keys.map(k => catMap[k]);
  const colors = keys.map(k => getCat(k).color);

  if (!keys.length) {
    if (legendEl) legendEl.innerHTML = `<p style="font-size:12px;color:var(--text-soft);text-align:center;padding:12px 0">No expense data yet</p>`;
    return;
  }

  const ctx = document.getElementById("budgetChart");
  if (!ctx) return;

  if (budgetChartInst) { budgetChartInst.destroy(); budgetChartInst = null; }

  budgetChartInst = new Chart(ctx, {
    type: "doughnut",
    data: { labels: keys, datasets: [{ data: vals, backgroundColor: colors, borderWidth:2, borderColor:"#fff", hoverOffset:6 }]},
    options: { cutout:"70%", plugins:{ legend:{ display:false }, tooltip:{ callbacks:{ label:(c)=>` ${c.label}: ${fmtNum(c.raw)}` }}}}
  });

  if (legendEl) {
    legendEl.innerHTML = keys.map((k, i) => {
      const pct = total > 0 ? Math.round((vals[i]/total)*100) : 0;
      return `<div class="budget-legend-item">
        <div class="budget-legend-left"><span class="legend-dot" style="background:${colors[i]}"></span>${getCat(k).icon} ${k}</div>
        <span class="budget-legend-pct">${pct}%</span>
      </div>`;
    }).join("");
  }
}

// ── WALLET PAGE ───────────────────────────────────────────────────────────────

function renderWallet() {
  let income = 0, expense = 0;
  const catMap = {};

  allTransactions.forEach(t => {
    const amt = Number(t.amount);
    if (t.type === "income") income += amt;
    else { expense += amt; catMap[t.category] = (catMap[t.category]||0)+amt; }
  });

  const wBal = document.getElementById("walletBalance");
  const wInc = document.getElementById("walletIncome");
  const wExp = document.getElementById("walletExpense");
  if (wBal) wBal.textContent = fmtNum(income - expense);
  if (wInc) wInc.textContent = fmtNum(income);
  if (wExp) wExp.textContent = fmtNum(expense);

  // Wallet bar chart
  const ctx = document.getElementById("walletChart");
  if (ctx) {
    if (walletChartInst) { walletChartInst.destroy(); walletChartInst = null; }
    walletChartInst = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Income", "Expense", "Net Balance"],
        datasets: [{
          data: [income, expense, income - expense],
          backgroundColor: ["#10b981", "#ef4444", "#7c3aed"],
          borderRadius: 10, borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        plugins: { legend:{ display:false }, tooltip:{ callbacks:{ label:(c)=>` ${fmtNum(c.raw)}` }}},
        scales: {
          x: { grid:{ display:false }, ticks:{ color:"#9ca3af" }},
          y: { grid:{ color:"#f3f4f6" }, ticks:{ color:"#9ca3af", callback:v=>fmtNum(v) }}
        }
      }
    });
  }

  // Category list
  const catEl = document.getElementById("walletCatList");
  if (catEl) {
    const sorted = Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
    const max    = sorted[0]?.[1] || 1;
    catEl.innerHTML = sorted.length ? sorted.map(([name, amt]) => {
      const cfg = getCat(name);
      const pct = Math.round((amt/max)*100);
      return `<div class="category-item" style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <span style="font-size:13px;font-weight:600">${cfg.icon} ${name}</span>
          <span style="font-size:13px;font-weight:700;color:var(--purple)">${fmtNum(amt)}</span>
        </div>
        <div style="height:6px;background:var(--purple-soft);border-radius:10px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${cfg.color};border-radius:10px"></div>
        </div>
      </div>`;
    }).join("") : `<div class="empty-state"><div class="es-icon">📊</div><h4>No expense data yet</h4></div>`;
  }
}

// ── BUDGET PAGE ───────────────────────────────────────────────────────────────

function renderBudgetPage() {
  const catMap = {};
  let total = 0;
  allTransactions.forEach(t => {
    if (t.type === "expense") {
      const amt = Number(t.amount);
      catMap[t.category] = (catMap[t.category]||0)+amt;
      total += amt;
    }
  });

  // Progress bars
  const barsEl = document.getElementById("budgetPageBars");
  if (barsEl) {
    const sorted = Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
    const max    = sorted[0]?.[1] || 1;
    barsEl.innerHTML = sorted.length ? sorted.map(([name, amt]) => {
      const cfg = getCat(name);
      const pct = Math.round((amt/max)*100);
      const share = total > 0 ? Math.round((amt/total)*100) : 0;
      return `<div style="margin-bottom:18px">
        <div style="display:flex;justify-content:space-between;margin-bottom:7px">
          <span style="font-size:14px;font-weight:600">${cfg.icon} ${name}</span>
          <span style="font-size:14px;font-weight:700">${fmtNum(amt)} <span style="color:var(--text-soft);font-weight:400;font-size:12px">(${share}%)</span></span>
        </div>
        <div style="height:8px;background:var(--purple-soft);border-radius:10px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${cfg.color};border-radius:10px"></div>
        </div>
      </div>`;
    }).join("") : `<div class="empty-state"><div class="es-icon">📋</div><h4>No expense data yet</h4><p>Add some expenses to see your budget breakdown</p></div>`;
  }

  // Budget donut
  const totalEl  = document.getElementById("budgetPageTotal");
  const legendEl = document.getElementById("budgetPageLegend");
  if (totalEl) totalEl.textContent = fmtNum(total);

  const keys   = Object.keys(catMap);
  const vals   = keys.map(k => catMap[k]);
  const colors = keys.map(k => getCat(k).color);

  if (!keys.length) return;

  const ctx = document.getElementById("budgetPageChart");
  if (ctx) {
    if (budgetPageInst) { budgetPageInst.destroy(); budgetPageInst = null; }
    budgetPageInst = new Chart(ctx, {
      type: "doughnut",
      data: { labels: keys, datasets: [{ data: vals, backgroundColor: colors, borderWidth:2, borderColor:"#fff", hoverOffset:6 }]},
      options: { cutout:"68%", plugins:{ legend:{ display:false }, tooltip:{ callbacks:{ label:(c)=>` ${c.label}: ${fmtNum(c.raw)}` }}}}
    });
  }

  if (legendEl) {
    legendEl.innerHTML = keys.map((k,i) => {
      const pct = total > 0 ? Math.round((vals[i]/total)*100) : 0;
      return `<div class="budget-legend-item">
        <div class="budget-legend-left"><span class="legend-dot" style="background:${colors[i]}"></span>${getCat(k).icon} ${k}</div>
        <span class="budget-legend-pct">${pct}%</span>
      </div>`;
    }).join("");
  }
}

// ── ANALYTICS PAGE ────────────────────────────────────────────────────────────

function renderAnalytics() {
  let income = 0, expense = 0;
  const catMap = {};
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const incM   = new Array(12).fill(0);
  const expM   = new Array(12).fill(0);
  let biggestCat = "—", biggestAmt = 0;

  allTransactions.forEach(t => {
    const amt = Number(t.amount);
    const m   = new Date(t.date).getMonth();
    if (t.type === "income") { income += amt; incM[m] += amt; }
    else {
      expense += amt; expM[m] += amt;
      catMap[t.category] = (catMap[t.category]||0)+amt;
      if (catMap[t.category] > biggestAmt) { biggestAmt = catMap[t.category]; biggestCat = t.category; }
    }
  });

  // Active months
  const activeMonths = months.reduce((acc, _, i) => (incM[i] || expM[i]) ? acc.concat(i) : acc, []);
  const mCount = activeMonths.length || 1;

  const ai = document.getElementById("avgIncome");
  const ae = document.getElementById("avgExpense");
  const be = document.getElementById("biggestExpense");
  const tc = document.getElementById("totalTxCount");
  if (ai) ai.textContent = fmtNum(Math.round(income / mCount));
  if (ae) ae.textContent = fmtNum(Math.round(expense / mCount));
  if (be) be.textContent = biggestCat !== "—" ? `${getCat(biggestCat).icon} ${biggestCat}` : "—";
  if (tc) tc.textContent = allTransactions.length;

  const cur    = new Date().getMonth();
  const labels = months.slice(0, cur + 1);

  // Trend line chart
  const tCtx = document.getElementById("trendChart");
  if (tCtx) {
    if (trendChartInst) { trendChartInst.destroy(); trendChartInst = null; }
    trendChartInst = new Chart(tCtx, {
      type: "line",
      data: {
        labels,
        datasets: [
          { label:"Income",  data:incM.slice(0,cur+1), borderColor:"#10b981", backgroundColor:"rgba(16,185,129,0.08)", tension:0.4, fill:true, pointRadius:4 },
          { label:"Expense", data:expM.slice(0,cur+1), borderColor:"#ef4444", backgroundColor:"rgba(239,68,68,0.08)",   tension:0.4, fill:true, pointRadius:4 }
        ]
      },
      options: {
        responsive:true,
        plugins:{ legend:{ labels:{ color:"#6b7280", font:{ size:12 }}}, tooltip:{ callbacks:{ label:(c)=>` ${c.dataset.label}: ${fmtNum(c.raw)}` }}},
        scales:{
          x:{ grid:{ display:false }, ticks:{ color:"#9ca3af", font:{ size:11 }}},
          y:{ grid:{ color:"#f3f4f6" }, ticks:{ color:"#9ca3af", callback:v=>fmtNum(v) }}
        }
      }
    });
  }

  // Pie chart
  const pCtx = document.getElementById("pieChart");
  const keys   = Object.keys(catMap);
  const vals   = keys.map(k => catMap[k]);
  const colors = keys.map(k => getCat(k).color);

  if (pCtx && keys.length) {
    if (pieChartInst) { pieChartInst.destroy(); pieChartInst = null; }
    pieChartInst = new Chart(pCtx, {
      type: "pie",
      data: { labels: keys.map(k=>getCat(k).icon+" "+k), datasets:[{ data:vals, backgroundColor:colors, borderWidth:2, borderColor:"#fff" }]},
      options: {
        responsive:true,
        plugins:{ legend:{ position:"bottom", labels:{ color:"#6b7280", padding:14, font:{ size:12 }}}, tooltip:{ callbacks:{ label:(c)=>` ${c.label}: ${fmtNum(c.raw)}` }}}
      }
    });
  } else if (pCtx) {
    if (pieChartInst) { pieChartInst.destroy(); pieChartInst = null; }
    // show placeholder
    pCtx.parentElement.innerHTML += `<div class="empty-state" style="padding:40px 0"><div class="es-icon">📊</div><h4>No expense data yet</h4></div>`;
  }
}

// ── GOALS ─────────────────────────────────────────────────────────────────────

function renderGoalsMini() {
  const el = document.getElementById("goalsWidget");
  if (!el) return;

  if (!allGoals.length) {
    el.innerHTML = `<div class="empty-state" style="padding:20px 0"><div class="es-icon">🎯</div><h4>No goals yet</h4><p>Go to Goals to create one</p></div>`;
    return;
  }

  el.innerHTML = allGoals.slice(0,3).map(g => {
    const pct = Math.min(Math.round((g.saved/g.target)*100), 100);
    return `<div class="goal-item">
      <div class="goal-row">
        <span class="goal-name">${g.name || "Savings Goal"}</span>
        <span class="goal-target">${fmtNum(g.target)}</span>
      </div>
      <div class="goal-bar"><div class="goal-fill" style="width:${pct}%"></div></div>
      <span class="goal-pct">${pct}% — ${fmtNum(g.saved)} saved</span>
    </div>`;
  }).join("");
}

function renderGoalsPage() {
  const el = document.getElementById("goalsPageList");
  if (!el) return;

  if (!allGoals.length) {
    el.innerHTML = `<div class="empty-state" style="padding:60px 0"><div class="es-icon">🎯</div><h4>No goals yet</h4><p>Click "+ Add Goal" to create your first saving goal</p></div>`;
    return;
  }

  el.innerHTML = `<div class="goals-grid">${allGoals.map((g,i) => {
    const pct = Math.min(Math.round((g.saved/g.target)*100),100);
    return `<div class="goal-card">
      <div class="goal-card-top">
        <div>
          <div class="goal-card-name">${g.name||"Savings Goal"}</div>
          <div class="goal-card-sub">${fmtNum(g.saved)} saved of ${fmtNum(g.target)}</div>
        </div>
        <button class="tbl-btn" onclick="openEditGoal(${i})" style="margin-right:6px">✏️ Edit</button>
        <button class="tbl-btn del" onclick="deleteGoal('${g._id}', ${i})">✕</button>
      </div>
      <div class="goal-bar" style="margin:14px 0 6px"><div class="goal-fill" style="width:${pct}%"></div></div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span class="goal-pct">${pct}% complete</span>
        <span style="font-size:13px;font-weight:700;color:var(--purple)">${fmtNum(g.target)}</span>
      </div>
    </div>`;
  }).join("")}</div>`;
}

async function addGoal() {
  const name   = document.getElementById("goalName").value.trim();
  const target = Number(document.getElementById("goalTarget").value);
  const saved  = Number(document.getElementById("goalSaved").value) || 0;
  const userId = localStorage.getItem("userId");

  if (!name || !target) return showToast("Please fill goal name and target", "error");

  try {
    await fetch(API + "/goals/set", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ userId, name, target, saved })
    });

    allGoals.push({ name, target, saved });
    renderGoalsMini();
    renderGoalsPage();
    closeModal("addGoal");
    document.getElementById("goalName").value   = "";
    document.getElementById("goalTarget").value = "";
    document.getElementById("goalSaved").value  = "";
    showToast("Goal added successfully!");
  } catch {
    // Save locally even if API fails
    allGoals.push({ name, target, saved });
    renderGoalsMini();
    renderGoalsPage();
    closeModal("addGoal");
    showToast("Goal saved locally!");
  }
}

function deleteGoal(id, index) {
  if (!confirm("Delete this goal?")) return;
  // Try API delete
  if (id && id !== "undefined") {
    fetch(API + "/goals/" + id, { method: "DELETE" }).catch(() => {});
  }
  allGoals.splice(index, 1);
  renderGoalsMini();
  renderGoalsPage();
  showToast("Goal deleted");
}
function openEditGoal(index) {
  const g = allGoals[index];
  if (!g) return;
  document.getElementById("editGoalIndex").value  = index;
  document.getElementById("editGoalId").value     = g._id || "";
  document.getElementById("editGoalName").value   = g.name || "";
  document.getElementById("editGoalTarget").value = g.target || "";
  document.getElementById("editGoalSaved").value  = g.saved || 0;
  openModal("editGoal");
}

async function saveEditGoal() {
  const index  = Number(document.getElementById("editGoalIndex").value);
  const id     = document.getElementById("editGoalId").value;
  const name   = document.getElementById("editGoalName").value.trim();
  const target = Number(document.getElementById("editGoalTarget").value);
  const saved  = Number(document.getElementById("editGoalSaved").value) || 0;

  if (!name || !target) return showToast("Please fill goal name and target", "error");

  // Try API update
  if (id) {
    try {
      await fetch(API + "/goals/" + id, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, target, saved })
      });
    } catch {}
  }

  allGoals[index] = { ...allGoals[index], name, target, saved };
  renderGoalsMini();
  renderGoalsPage();
  closeModal("editGoal");
  showToast("Goal updated!");
}
// ── ADD TRANSACTION ───────────────────────────────────────────────────────────

async function addTransaction() {
  const userId   = localStorage.getItem("userId");
  const amount   = Number(document.getElementById("amount").value);
  const type     = document.getElementById("type").value;
  const category = document.getElementById("category").value;
  const date     = document.getElementById("txDate").value;

  if (!amount || amount <= 0) return showToast("Enter a valid amount", "error");
  if (!date)                   return showToast("Please select a date", "error");

  try {
    await fetch(API + "/transactions/add", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ userId, amount, type, category, date })
    });
    document.getElementById("amount").value = "";
    closeModal("addTx");
    showToast("Transaction added!");
    await loadData();
  } catch {
    showToast("Failed to add transaction", "error");
  }
}

// ── EDIT / DELETE TX ──────────────────────────────────────────────────────────

async function deleteTx(id) {
  if (!confirm("Delete this transaction?")) return;
  try {
    await fetch(API + "/transactions/" + id, { method:"DELETE" });
    showToast("Transaction deleted");
    await loadData();
    renderAllTransactions();
  } catch { showToast("Delete failed", "error"); }
}

async function editTx(id, oldAmount) {
  const newAmount = prompt("Enter new amount:", oldAmount);
  if (!newAmount || isNaN(newAmount) || Number(newAmount) <= 0) return;
  try {
    await fetch(API + "/transactions/" + id, {
      method:"PUT", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ amount: Number(newAmount) })
    });
    showToast("Transaction updated!");
    await loadData();
    renderAllTransactions();
  } catch { showToast("Update failed", "error"); }
}

// ── SETTINGS ──────────────────────────────────────────────────────────────────

function initSettings() {
  const name  = localStorage.getItem("userName")  || "";
  const email = localStorage.getItem("userEmail") || "";

  const sn = document.getElementById("settingsName");
  const se = document.getElementById("settingsEmail");
  const sa = document.getElementById("settingsAvatar");
  const ni = document.getElementById("settingsNameInput");
  const ei = document.getElementById("settingsEmailInput");
  const cs = document.getElementById("currencySelect");

  if (sn) sn.textContent = name;
  if (se) se.textContent = email;
  if (sa) sa.textContent = name.charAt(0).toUpperCase();
  if (ni) ni.value = name;
  if (ei) ei.value = email;
  if (cs) cs.value = localStorage.getItem("currency") || "₹";

  // Theme buttons
  const theme = localStorage.getItem("theme") || "light";
  document.getElementById("settingsLightBtn")?.classList.toggle("active", theme === "light");
  document.getElementById("settingsDarkBtn")?.classList.toggle("active", theme === "dark");
}

function saveProfile() {
  const name  = document.getElementById("settingsNameInput")?.value.trim();
  const email = document.getElementById("settingsEmailInput")?.value.trim();
  if (!name) return showToast("Name cannot be empty", "error");

  localStorage.setItem("userName", name);
  if (email) localStorage.setItem("userEmail", email);

  // Update topbar
  document.getElementById("userName").textContent  = name;
  document.getElementById("userEmail").textContent = email;
  document.getElementById("userAvatar").textContent = name.charAt(0).toUpperCase();
  initSettings();
  showToast("Profile updated!");
}

function savePrefs() {
  const cs = document.getElementById("currencySelect");
  if (cs) {
    currency = cs.value;
    localStorage.setItem("currency", currency);
  }
  showToast("Preferences saved!");
  loadData(); // re-render with new currency
}

function setTheme(mode, silent = false) {
  localStorage.setItem("theme", mode);

  const root = document.documentElement;
  if (mode === "dark") {
    root.style.setProperty("--bg",         "#0f0f1a");
    root.style.setProperty("--sidebar-bg", "#13131f");
    root.style.setProperty("--card-bg",    "#1a1a2e");
    root.style.setProperty("--border",     "#2d2d44");
    root.style.setProperty("--text",       "#e8e8ff");
    root.style.setProperty("--text-mid",   "#9090bb");
    root.style.setProperty("--text-soft",  "#6060aa");
    root.style.setProperty("--purple-soft","#2d1f5e");
    root.style.setProperty("--purple-mid", "#3d2a7a");
  } else {
    root.style.setProperty("--bg",         "#f0ebff");
    root.style.setProperty("--sidebar-bg", "#ffffff");
    root.style.setProperty("--card-bg",    "#ffffff");
    root.style.setProperty("--border",     "#e5e7eb");
    root.style.setProperty("--text",       "#1e1b4b");
    root.style.setProperty("--text-mid",   "#6b7280");
    root.style.setProperty("--text-soft",  "#9ca3af");
    root.style.setProperty("--purple-soft","#ede9fe");
    root.style.setProperty("--purple-mid", "#ddd6fe");
  }

  // Update all theme buttons
  ["lightBtn","settingsLightBtn"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("active", mode === "light");
  });
  ["darkBtn","settingsDarkBtn"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("active", mode === "dark");
  });

  if (!silent) showToast(`${mode === "dark" ? "🌙 Dark" : "☀️ Light"} mode enabled`);
}

function confirmDelete() {
  if (confirm("This will delete ALL your transaction data locally. Continue?")) {
    allTransactions = [];
    allGoals = [];
    refreshAll();
    renderGoalsPage();
    renderAllTransactions();
    showToast("All data cleared locally");
  }
}

// ── HELP: FAQ TOGGLE ──────────────────────────────────────────────────────────

function toggleFaq(el) {
  const answer = el.nextElementSibling;
  const isOpen = answer.style.display === "block";
  // Close all
  document.querySelectorAll(".faq-a").forEach(a => a.style.display = "none");
  document.querySelectorAll(".faq-q span").forEach(s => s.textContent = "▾");
  // Open if was closed
  if (!isOpen) {
    answer.style.display = "block";
    el.querySelector("span").textContent = "▴";
  }
}