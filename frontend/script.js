const API = "https://budgetiq-backend-oays.onrender.com/api";

// ── GLOBAL STATE ───────────────────────────────────────────────────────────────
let allTransactions = [];
let allGoals        = [];
let flowChart       = null;
let budgetChartInst = null;
let trendChartInst  = null;
let pieChartInst    = null;
let budgetPageInst  = null;
let savingsTrendInst= null;
let currency        = localStorage.getItem("currency") || "₹";
let currentTxFilter = "all";

// ── UTILS ──────────────────────────────────────────────────────────────────────

function showToast(msg, type = "success") {
  const t = document.getElementById("toast");
  if (!t) return;
  t.innerHTML = (type === "success" ? "✅ " : "❌ ") + msg;
  t.className = `toast ${type} show`;
  setTimeout(() => t.classList.remove("show"), 3000);
}

function fmtNum(n) {
  return currency + Number(n).toLocaleString("en-IN", {
    minimumFractionDigits: 0, maximumFractionDigits: 0
  });
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric"
  });
}

function fmtDateTime(d) {
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
  });
}

const CAT = {
  Food:          { icon: "🍔", color: "#f97316" },
  Travel:        { icon: "✈️",  color: "#38bdf8" },
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

  if (!name || !email || !password || !confirm)
    return showToast("Please fill all fields", "error");

  if (!/^[A-Za-z\s]+$/.test(name))
    return showToast("Name must contain letters only", "error");

  if (name.length < 2)
    return showToast("Name must be at least 2 characters", "error");

  if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email))
    return showToast("Email must be a valid @gmail.com address", "error");

  if (password.length < 6)
    return showToast("Password must be at least 6 characters", "error");

  if (password !== confirm)
    return showToast("Passwords don't match", "error");

  try {
    const res  = await fetch(API + "/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (data.success) {
      showToast("Account created! Redirecting...");
      setTimeout(() => window.location = "login.html", 1400);
    } else {
      showToast(data.msg || "Registration failed", "error");
    }
  } catch {
    showToast("Cannot reach server. Is it running on port 5000?", "error");
  }
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
  } catch {
    showToast("Cannot reach server. Is it running on port 5000?", "error");
  }
}

function logout() {
  localStorage.clear();
  window.location = "login.html";
}

// ── NAVIGATION ─────────────────────────────────────────────────────────────────

function navigate(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));

  const page = document.getElementById("page-" + pageId);
  if (page) page.classList.add("active");

  const navBtn = document.querySelector(`[data-page="${pageId}"]`);
  if (navBtn) navBtn.classList.add("active");

  // Safe title update — these elements may not exist
  const titleEl = document.getElementById("topbarTitle");
  const subEl   = document.getElementById("topbarSub");
  const titles  = {
    dashboard:    ["Dashboard", "Here's your financial overview"],
    transactions: ["Transactions", "View and manage all your transactions"],
    goals:        ["Saving Goals", "Track progress towards your targets"],
    budget:       ["Budget", "Category-wise spending breakdown"],
    analytics:    ["Insights", "Insights and trends from your data"],
    settings:     ["Settings", "Manage your account and preferences"],
    help:         ["Help & Support", "Learn how to use BudgetIQ"],
    ai:           ["AI Assistant", "Your personal finance advisor"],
  };
  const [title, sub] = titles[pageId] || ["BudgetIQ", ""];
  if (titleEl) titleEl.textContent = title;
  if (subEl)   subEl.textContent   = sub;

  // Page-specific renders
  if (pageId === "budget")       renderBudgetPage();
  if (pageId === "analytics")    renderAnalytics();
  if (pageId === "goals")        renderGoalsPage();
  if (pageId === "transactions") renderAllTransactions();
  if (pageId === "settings")     initSettings();
  if (pageId === "dashboard")    refreshAll();
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".nav-item[data-page]").forEach(btn => {
    btn.addEventListener("click", () => navigate(btn.dataset.page));
  });

  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.classList.remove("open");
    });
  });

  const savedTheme = localStorage.getItem("theme") || "dark";
  setTheme(savedTheme, true);

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
    populateGoalDropdown();
  }
}

function closeModal(id) {
  const m = document.getElementById("modal-" + id);
  if (m) m.classList.remove("open");
}

// ── GOAL DROPDOWN ─────────────────────────────────────────────────────────────

function populateGoalDropdown() {
  const select = document.getElementById("txGoalSelect");
  if (!select) return;
  select.innerHTML = `<option value="">— None —</option>`;
  allGoals.forEach(g => {
    if (!g._id) return;
    const pct       = Math.min(Math.round((g.saved / g.target) * 100), 100);
    const remaining = fmtNum(g.target - g.saved);
    if (pct < 100) {
      const opt = document.createElement("option");
      opt.value       = g._id;
      opt.textContent = `${g.name} (${pct}% — ${remaining} left)`;
      select.appendChild(opt);
    }
  });
  const group = document.getElementById("goalLinkGroup");
  if (group) group.style.display = allGoals.length ? "block" : "none";
}

// ── INIT DASHBOARD ─────────────────────────────────────────────────────────────

function initDashboard() {
  const name  = localStorage.getItem("userName")  || "User";
  const email = localStorage.getItem("userEmail") || "";
  currency    = localStorage.getItem("currency")  || "₹";

  // Safe element updates
  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setEl("userName",      name);
  setEl("userEmail",     email);
  setEl("userAvatar",    name.charAt(0).toUpperCase());
  setEl("topbarTitle",   `Welcome back, ${name}!`);
  setEl("welcomeUserName", name);

  loadBudgetUI();
  loadData();
}

// ── LOAD DATA ─────────────────────────────────────────────────────────────────

async function loadData() {
  const userId = localStorage.getItem("userId");
  if (!userId) return;

  try {
    const res = await fetch(API + "/transactions/" + userId);
    const data = await res.json();
    allTransactions = Array.isArray(data) ? data : [];
  } catch {
    showToast("Failed to load transactions. Is the server running?", "error");
    allTransactions = [];
  }

  try {
    const res2 = await fetch(API + "/goals/" + userId);
    const data2 = await res2.json();
    allGoals = Array.isArray(data2) ? data2 : [];
  } catch {
    showToast("Failed to load goals", "error");
    allGoals = [];
  }

  refreshAll();
  renderGoalsMini();
  renderGoalsPage();
}

function refreshAll() {
  renderSummaryCards();
  renderRecentTx();
  renderBudgetDonut();
  renderMoneyFlow();
  renderSavingsTrend();
  checkBudgetAlert();
}

// ── SUMMARY CARDS ──────────────────────────────────────────────────────────────

function renderSummaryCards() {
  let income = 0, expense = 0;
  const now   = new Date();
  const month = now.getMonth();
  const year  = now.getFullYear();

  allTransactions.forEach(t => {
    const d = new Date(t.date);
    if (d.getMonth() === month && d.getFullYear() === year) {
      if (t.type === "income") income += Number(t.amount);
      else                     expense += Number(t.amount);
    }
  });

  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl("balMain",     fmtNum(income - expense));
  setEl("incomeMain",  fmtNum(income));
  setEl("expenseMain", fmtNum(expense));
  setEl("savingsMain", fmtNum(Math.max(income - expense, 0)));
}

// ── RECENT TRANSACTIONS ────────────────────────────────────────────────────────

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

function setTxFilter(filter, btn) {
  currentTxFilter = filter;
  document.querySelectorAll(".tx-tab").forEach(t => t.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderAllTransactions();
}

function renderAllTransactions() {
  const wrap = document.getElementById("allTxWrap");
  if (!wrap) return;

  const search = (document.getElementById("txSearch")?.value || "").toLowerCase();
  const catF   = document.getElementById("filterCategory")?.value || "all";
  const monthF = document.getElementById("filterMonth")?.value    || "";

  let data = [...allTransactions].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (currentTxFilter !== "all") data = data.filter(t => t.type === currentTxFilter);
  if (catF !== "all")            data = data.filter(t => t.category === catF);
  if (monthF)                    data = data.filter(t => t.date?.slice(0, 7) === monthF);
  if (search)                    data = data.filter(t =>
    t.category?.toLowerCase().includes(search) ||
    t.type?.toLowerCase().includes(search) ||
    String(t.amount).includes(search)
  );

  if (!data.length) {
    wrap.innerHTML = `<div class="empty-state"><div class="es-icon">🔍</div><h4>No transactions found</h4><p>Try changing your filters</p></div>`;
    return;
  }

  wrap.innerHTML = `
    <table>
      <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th>Actions</th></tr></thead>
      <tbody>
        ${data.map(t => {
          const cfg       = getCat(t.category);
          const sign      = t.type === "income" ? "+" : "-";
          const linkedGoal = t.goalId ? allGoals.find(g => g._id === t.goalId) : null;
          const desc = linkedGoal
            ? `<div style="font-weight:600">${cfg.icon} ${t.category}</div><div style="font-size:11px;color:var(--text-soft)">🎯 ${linkedGoal.name}</div>`
            : `<div style="font-weight:600">${cfg.icon} ${t.category}</div>`;
          return `<tr>
            <td style="color:var(--text-mid);font-size:12px">${fmtDate(t.date)}</td>
            <td>${desc}</td>
            <td><span class="tx-cat-badge">${t.category}</span></td>
            <td class="tx-amount-cell ${t.type}">${sign}${fmtNum(t.amount)}</td>
            <td><div style="display:flex;gap:6px">
              <button class="tbl-btn" onclick="openEditTxModal('${t._id}', ${t.amount}, '${t.type}', '${t.category}', '${t.date?.slice(0,10)}')">✏️ Edit</button>
              <button class="tbl-btn del" onclick="deleteTx('${t._id}')">🗑️ Delete</button>
            </div></td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>`;
}

function clearFilters() {
  const fc = document.getElementById("filterCategory");
  const fm = document.getElementById("filterMonth");
  const ts = document.getElementById("txSearch");
  if (fc) fc.value = "all";
  if (fm) fm.value = "";
  if (ts) ts.value = "";
  currentTxFilter = "all";
  document.querySelectorAll(".tx-tab").forEach(t => t.classList.remove("active"));
  const allTab = document.querySelector('.tx-tab[data-filter="all"]');
  if (allTab) allTab.classList.add("active");
  renderAllTransactions();
}

// ── MONEY FLOW CHART ──────────────────────────────────────────────────────────

function destroyChart(ref) {
  if (ref) { try { ref.destroy(); } catch(e){} }
  return null;
}

function renderMoneyFlow() {
  const ctx = document.getElementById("moneyFlowChart");
  if (!ctx) return;

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const incM   = new Array(12).fill(0);
  const expM   = new Array(12).fill(0);

  allTransactions.forEach(t => {
    const m = new Date(t.date).getMonth();
    if (t.type === "income") incM[m] += Number(t.amount);
    else                     expM[m] += Number(t.amount);
  });

  const cur    = new Date().getMonth();
  const labels = months.slice(0, cur + 1);

  flowChart = destroyChart(flowChart);
  flowChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Income", data: incM.slice(0, cur + 1),
          borderColor: "#22c97a", backgroundColor: "rgba(34,201,122,0.10)",
          tension: 0.45, fill: true, pointBackgroundColor: "#22c97a",
          pointRadius: 5, pointHoverRadius: 7, borderWidth: 2.5
        },
        {
          label: "Expense", data: expM.slice(0, cur + 1),
          borderColor: "#ff5e6d", backgroundColor: "rgba(255,94,109,0.10)",
          tension: 0.45, fill: true, pointBackgroundColor: "#ff5e6d",
          pointRadius: 5, pointHoverRadius: 7, borderWidth: 2.5
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
        x: { grid: { display: false }, ticks: { color: "#8b90b8", font: { size: 11 }}},
        y: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#8b90b8", font: { size: 11 }, callback: v => fmtNum(v) }}
      }
    }
  });
}

// ── SAVINGS TREND ─────────────────────────────────────────────────────────────

function renderSavingsTrend() {
  const ctx = document.getElementById("savingsTrendChart");
  if (!ctx) return;

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const incM   = new Array(12).fill(0);
  const expM   = new Array(12).fill(0);

  allTransactions.forEach(t => {
    const m = new Date(t.date).getMonth();
    if (t.type === "income") incM[m] += Number(t.amount);
    else                     expM[m] += Number(t.amount);
  });

  const cur         = new Date().getMonth();
  const savingsData = incM.slice(0, cur + 1).map((v, i) => v - expM[i]);
  const labels      = months.slice(0, cur + 1);

  savingsTrendInst = destroyChart(savingsTrendInst);
  savingsTrendInst = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Savings", data: savingsData,
        borderColor: "#7c5cfc", backgroundColor: "rgba(124,92,252,0.08)",
        tension: 0.45, fill: true,
        pointBackgroundColor: "#7c5cfc", pointRadius: 5, pointHoverRadius: 7, borderWidth: 2.5
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: "#8b90b8", font: { size: 12 }}},
        tooltip: { callbacks: { label: (c) => ` Savings: ${fmtNum(c.raw)}` }}
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#8b90b8", font: { size: 11 }}},
        y: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#8b90b8", callback: v => fmtNum(v) }}
      }
    }
  });
}

// ── BUDGET DONUT ──────────────────────────────────────────────────────────────

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
  budgetChartInst = destroyChart(budgetChartInst);
  budgetChartInst = new Chart(ctx, {
    type: "doughnut",
    data: { labels: keys, datasets: [{ data: vals, backgroundColor: colors, borderWidth: 0, hoverOffset: 8 }]},
    options: { cutout: "70%", plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${c.label}: ${fmtNum(c.raw)}` }}}}
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

// ── BUDGET PAGE ───────────────────────────────────────────────────────────────

function renderBudgetPage() {
  const catMap = {};
  let total = 0;
  allTransactions.forEach(t => {
    if (t.type === "expense") {
      const amt = Number(t.amount);
      catMap[t.category] = (catMap[t.category] || 0) + amt;
      total += amt;
    }
  });

  const monthlyBudget = Number(localStorage.getItem("monthlyBudget") || 0);
  const remaining     = monthlyBudget - total;
  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl("budgetTotalCard",    fmtNum(monthlyBudget || total));
  setEl("budgetSpentCard",    fmtNum(total));
  setEl("budgetRemainingCard",fmtNum(monthlyBudget ? Math.max(remaining, 0) : 0));

  const CAT_ICONS = { Food:'🍔', Travel:'✈️', Rent:'🏠', Salary:'💰', Entertainment:'🎮', Healthcare:'💊', Shopping:'🛍️', Other:'📦' };
  const CAT_GRAD  = {
    Food:          'linear-gradient(135deg,#ea580c,#f97316)',
    Travel:        'linear-gradient(135deg,#0284c7,#38bdf8)',
    Rent:          'linear-gradient(135deg,#4f46e5,#818cf8)',
    Salary:        'linear-gradient(135deg,#059669,#34d399)',
    Entertainment: 'linear-gradient(135deg,#9d174d,#ec4899)',
    Healthcare:    'linear-gradient(135deg,#0891b2,#22d3ee)',
    Shopping:      'linear-gradient(135deg,#b45309,#fbbf24)',
    Other:         'linear-gradient(135deg,#475569,#94a3b8)',
  };

  const barsEl = document.getElementById("budgetPageBars");
  const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

  if (barsEl) {
    if (!sorted.length) {
      barsEl.innerHTML = `<div class="empty-state" style="grid-column:1/-1;padding:60px 0"><div class="es-icon">📋</div><h4>No expense data yet</h4><p>Add some expenses to see your budget breakdown</p></div>`;
    } else {
      const catBudget = monthlyBudget / Math.max(sorted.length, 1);
      barsEl.innerHTML = sorted.map(([name, amt]) => {
        const cfg   = getCat(name);
        const pct   = catBudget > 0 ? Math.min(Math.round((amt/catBudget)*100), 110) : 100;
        const over  = pct >= 100;
        const rem   = catBudget > 0 ? catBudget - amt : 0;
        const grad  = CAT_GRAD[name] || CAT_GRAD.Other;
        return `<div class="budget-cat-card">
          <div class="budget-cat-top">
            <div class="budget-cat-icon" style="background:${grad}">${CAT_ICONS[name]||'📦'}</div>
            <div style="flex:1">
              <div class="budget-cat-name">${name}</div>
              <div class="budget-cat-range">${fmtNum(amt)}${catBudget>0?' of '+fmtNum(catBudget):''}</div>
            </div>
            ${over ? `<div class="budget-over-icon">⚠️</div>` : ''}
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <span style="font-size:12px;color:var(--text-mid)">Progress</span>
            <span class="budget-cat-pct" style="color:${over?'var(--red)':'var(--text)'}">${pct}%</span>
          </div>
          <div class="budget-progress-bar">
            <div class="budget-progress-fill" style="width:${Math.min(pct,100)}%;background:${over?'var(--red)':cfg.color}"></div>
          </div>
          ${catBudget>0 ? `<div class="budget-cat-remaining ${rem>=0&&!over?'ok':'over'}" style="margin-top:8px;font-size:13px">
            ${over ? `-${fmtNum(Math.abs(rem))} over budget` : `${fmtNum(rem)} remaining`}
          </div>` : ''}
        </div>`;
      }).join("");
    }
  }

  // Side bar chart
  const catBarsEl = document.getElementById("budgetCatBars");
  if (catBarsEl) {
    const max = sorted[0]?.[1] || 1;
    catBarsEl.innerHTML = sorted.map(([name, amt]) => {
      const cfg   = getCat(name);
      const pct   = Math.round((amt/max)*100);
      const share = total > 0 ? Math.round((amt/total)*100) : 0;
      return `<div style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;margin-bottom:7px">
          <span style="font-size:14px;font-weight:600">${cfg.icon} ${name}</span>
          <span style="font-size:14px;font-weight:700;font-family:var(--font-mono)">${fmtNum(amt)} <span style="color:var(--text-soft);font-size:11px">${share}%</span></span>
        </div>
        <div style="height:7px;background:var(--card-bg-2);border-radius:10px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${cfg.color};border-radius:10px"></div>
        </div>
      </div>`;
    }).join("") || `<div class="empty-state"><div class="es-icon">📊</div><h4>No data</h4></div>`;
  }

  // Donut
  const keys   = Object.keys(catMap);
  const vals   = keys.map(k => catMap[k]);
  const colors = keys.map(k => getCat(k).color);
  setEl("budgetPageTotal", fmtNum(total));

  const legendEl = document.getElementById("budgetPageLegend");
  if (legendEl) {
    legendEl.innerHTML = keys.map((k, i) => {
      const pct = total > 0 ? Math.round((vals[i]/total)*100) : 0;
      return `<div class="budget-legend-item">
        <div class="budget-legend-left"><span class="legend-dot" style="background:${colors[i]}"></span>${getCat(k).icon} ${k}</div>
        <span class="budget-legend-pct">${pct}%</span>
      </div>`;
    }).join("");
  }

  if (!keys.length) return;
  const ctx = document.getElementById("budgetPageChart");
  if (ctx) {
    budgetPageInst = destroyChart(budgetPageInst);
    budgetPageInst = new Chart(ctx, {
      type: "doughnut",
      data: { labels: keys, datasets: [{ data: vals, backgroundColor: colors, borderWidth: 0, hoverOffset: 8 }]},
      options: { cutout: "68%", plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${c.label}: ${fmtNum(c.raw)}` }}}}
    });
  }
}

// ── ANALYTICS ─────────────────────────────────────────────────────────────────

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
      catMap[t.category] = (catMap[t.category] || 0) + amt;
      if (catMap[t.category] > biggestAmt) { biggestAmt = catMap[t.category]; biggestCat = t.category; }
    }
  });

  const activeMonths = months.reduce((acc, _, i) => (incM[i] || expM[i]) ? acc.concat(i) : acc, []);
  const mCount = activeMonths.length || 1;

  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl("avgIncome",     fmtNum(Math.round(income / mCount)));
  setEl("avgExpense",    fmtNum(Math.round(expense / mCount)));
  setEl("biggestExpense", biggestCat !== "—" ? `${getCat(biggestCat).icon} ${biggestCat}` : "—");
  setEl("totalTxCount",  allTransactions.length);

  const cur    = new Date().getMonth();
  const labels = months.slice(0, cur + 1);

  const tCtx = document.getElementById("trendChart");
  if (tCtx) {
    trendChartInst = destroyChart(trendChartInst);
    trendChartInst = new Chart(tCtx, {
      type: "line",
      data: {
        labels,
        datasets: [
          { label: "Income",  data: incM.slice(0,cur+1), borderColor: "#22c97a", backgroundColor: "rgba(34,201,122,0.08)",  tension: 0.4, fill: true, pointRadius: 4 },
          { label: "Expense", data: expM.slice(0,cur+1), borderColor: "#ff5e6d", backgroundColor: "rgba(255,94,109,0.08)", tension: 0.4, fill: true, pointRadius: 4 }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: "#8b90b8", font: { size: 12 }}},
          tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${fmtNum(c.raw)}` }}
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: "#8b90b8", font: { size: 11 }}},
          y: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "#8b90b8", callback: v => fmtNum(v) }}
        }
      }
    });
  }

  const pCtx   = document.getElementById("pieChart");
  const keys   = Object.keys(catMap);
  const vals   = keys.map(k => catMap[k]);
  const colors = keys.map(k => getCat(k).color);

  if (pCtx && keys.length) {
    pieChartInst = destroyChart(pieChartInst);
    pieChartInst = new Chart(pCtx, {
      type: "pie",
      data: { labels: keys.map(k => getCat(k).icon+" "+k), datasets: [{ data: vals, backgroundColor: colors, borderWidth: 2, borderColor: "rgba(0,0,0,0.2)" }]},
      options: {
        responsive: true,
        plugins: {
          legend: { position: "bottom", labels: { color: "#8b90b8", padding: 14, font: { size: 12 }}},
          tooltip: { callbacks: { label: (c) => ` ${c.label}: ${fmtNum(c.raw)}` }}
        }
      }
    });
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

  el.innerHTML = allGoals.slice(0, 3).map(g => {
    const pct = Math.min(Math.round((g.saved / g.target) * 100), 100);
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
  // Summary cards
  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl("activeGoalsCount", allGoals.length);
  const totalSaved  = allGoals.reduce((s, g) => s + Number(g.saved || 0), 0);
  const totalTarget = allGoals.reduce((s, g) => s + Number(g.target || 0), 0);
  setEl("totalSavedAmount", fmtNum(totalSaved));
  setEl("overallProgress",  totalTarget > 0 ? Math.round((totalSaved/totalTarget)*100)+"%" : "0%");

  const el = document.getElementById("goalsPageList");
  if (!el) return;

  if (!allGoals.length) {
    el.innerHTML = `<div class="empty-state" style="padding:60px 0"><div class="es-icon">🎯</div><h4>No goals yet</h4><p>Click "+ Create New Goal" to get started</p></div>`;
    return;
  }

  const GRADIENTS = [
    'linear-gradient(135deg,#4ea8ff,#2563eb)',
    'linear-gradient(135deg,#a855f7,#7c3aed)',
    'linear-gradient(135deg,#22c97a,#059669)',
    'linear-gradient(135deg,#ff9f43,#f59e0b)',
    'linear-gradient(135deg,#ff5e6d,#dc2626)',
    'linear-gradient(135deg,#06b6d4,#0891b2)',
  ];
  const ICONS = { 'Emergency':'🛡️','Vacation':'✈️','MacBook':'💻','Car':'🚗','Home':'🏠','Wedding':'💍' };

  el.innerHTML = `<div class="goals-grid">${allGoals.map((g, i) => {
    const pct       = Math.min(Math.round((g.saved / g.target) * 100), 100);
    const grad      = GRADIENTS[i % GRADIENTS.length];
    const icon      = Object.entries(ICONS).find(([k]) => g.name?.includes(k))?.[1] || '🎯';
    const remaining = Math.max(Number(g.target) - Number(g.saved), 0);

    return `<div class="goal-card">
      <div class="goal-card-top">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:44px;height:44px;border-radius:12px;background:${grad};display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">${icon}</div>
          <div>
            <div class="goal-card-name">${g.name || "Savings Goal"}</div>
            <div class="goal-card-sub">${fmtNum(g.saved)} / ${fmtNum(g.target)}</div>
          </div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="tbl-btn" onclick="openEditGoal(${i})">✏️</button>
          <button class="tbl-btn del" onclick="deleteGoal('${g._id}', ${i})">🗑️</button>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin:14px 0 6px">
        <span style="font-size:12px;color:var(--text-mid)">Progress</span>
        <span style="font-size:14px;font-weight:700;color:var(--text);font-family:var(--font-mono)">${pct >= 100 ? '✅ 100%' : pct + '%'}</span>
      </div>
      <div class="goal-bar"><div class="goal-fill" style="width:${pct}%;background:${grad}"></div></div>
      <div class="goal-info-chips">
        <div class="goal-chip" style="flex:1">
          <div class="goal-chip-label">💵 Remaining</div>
          <div class="goal-chip-val">${fmtNum(remaining)}</div>
        </div>
        <div class="goal-chip" style="flex:1">
          <div class="goal-chip-label">📅 Status</div>
          <div class="goal-chip-val" style="font-size:13px">${pct >= 100 ? '✅ Done!' : '🔄 Active'}</div>
        </div>
      </div>
      <button class="goal-contrib-btn" style="background:${grad};color:white;box-shadow:0 4px 16px rgba(0,0,0,0.3)"
        onclick="openModal('addTx')">+ Add Contribution</button>
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
    const res  = await fetch(API + "/goals/set", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, name, target, saved })
    });
    const data = await res.json();
    allGoals.push(data.goal);
    renderGoalsMini();
    renderGoalsPage();
    closeModal("addGoal");
    document.getElementById("goalName").value   = "";
    document.getElementById("goalTarget").value = "";
    document.getElementById("goalSaved").value  = "";
    showToast("Goal created!");
  } catch {
    showToast("Failed to save goal. Is the server running?", "error");
  }
}

function deleteGoal(id, index) {
  if (!confirm("Delete this goal?")) return;
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
  const goalId   = document.getElementById("txGoalSelect")?.value || "";

  if (!amount || amount <= 0) return showToast("Enter a valid amount", "error");
  if (!date)                   return showToast("Please select a date", "error");

  try {
    const txRes = await fetch(API + "/transactions/add", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, amount, type, category, date, goalId: goalId || null })
    });
    if (!txRes.ok) throw new Error("TX failed");

    if (goalId) {
      const res  = await fetch(API + "/goals/" + goalId + "/add", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount })
      });
      const data = await res.json();
      const goalIndex = allGoals.findIndex(g => g._id === goalId);
      if (goalIndex !== -1 && data.goal) allGoals[goalIndex] = data.goal;
      const goalName = allGoals.find(g => g._id === goalId)?.name || "goal";
      showToast(`Saved & ${fmtNum(amount)} added to "${goalName}"!`);
    } else {
      showToast("Transaction added!");
    }

    document.getElementById("amount").value = "";
    const goalSel = document.getElementById("txGoalSelect");
    if (goalSel) goalSel.value = "";
    closeModal("addTx");
    await loadData();
  } catch {
    showToast("Failed to add transaction", "error");
  }
}

// ── EDIT TRANSACTION MODAL ────────────────────────────────────────────────────

function openEditTxModal(id, amount, type, category, date) {
  document.getElementById("editTxId").value       = id;
  document.getElementById("editTxAmount").value   = amount;
  document.getElementById("editTxType").value     = type;
  document.getElementById("editTxCategory").value = category;
  document.getElementById("editTxDate").value     = date;
  openModal("editTx");
}

async function saveEditTx() {
  const id       = document.getElementById("editTxId").value;
  const amount   = Number(document.getElementById("editTxAmount").value);
  const type     = document.getElementById("editTxType").value;
  const category = document.getElementById("editTxCategory").value;
  const date     = document.getElementById("editTxDate").value;

  if (!amount || amount <= 0) return showToast("Enter a valid amount", "error");
  if (!date)                   return showToast("Please select a date", "error");

  try {
    await fetch(API + "/transactions/" + id, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, type, category, date })
    });
    showToast("Transaction updated!");
    closeModal("editTx");
    await loadData();
    renderAllTransactions();
  } catch {
    showToast("Update failed", "error");
  }
}

// ── DELETE TRANSACTION ────────────────────────────────────────────────────────

async function deleteTx(id) {
  if (!confirm("Delete this transaction?")) return;
  try {
    await fetch(API + "/transactions/" + id, { method: "DELETE" });
    showToast("Transaction deleted");
    await loadData();
    renderAllTransactions();
  } catch {
    showToast("Delete failed", "error");
  }
}

// ── SETTINGS ──────────────────────────────────────────────────────────────────

function initSettings() {
  const name  = localStorage.getItem("userName")  || "";
  const email = localStorage.getItem("userEmail") || "";

  const setEl  = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };

  setEl("settingsName",  name);
  setEl("settingsEmail", email);
  const sa = document.getElementById("settingsAvatar");
  if (sa) sa.textContent = name.charAt(0).toUpperCase();
  setVal("settingsNameInput",  name);
  setVal("settingsEmailInput", email);
  setVal("currencySelect",     localStorage.getItem("currency") || "₹");

  const theme = localStorage.getItem("theme") || "dark";
  document.getElementById("settingsLightBtn")?.classList.toggle("active", theme === "light");
  document.getElementById("settingsDarkBtn")?.classList.toggle("active",  theme === "dark");
}

function saveProfile() {
  const name  = document.getElementById("settingsNameInput")?.value.trim();
  const email = document.getElementById("settingsEmailInput")?.value.trim();
  if (!name) return showToast("Name cannot be empty", "error");

  localStorage.setItem("userName", name);
  if (email) localStorage.setItem("userEmail", email);

  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setEl("userName",  name);
  setEl("userEmail", email);
  const av = document.getElementById("userAvatar");
  if (av) av.textContent = name.charAt(0).toUpperCase();
  initSettings();
  showToast("Profile updated!");
}

function savePrefs() {
  const cs = document.getElementById("currencySelect");
  if (cs) { currency = cs.value; localStorage.setItem("currency", currency); }
  showToast("Preferences saved!");
  loadData();
}

function setTheme(mode, silent = false) {
  localStorage.setItem("theme", mode);
  const root = document.documentElement;
  if (mode === "dark") {
    root.style.setProperty("--bg",          "#0d0f1a");
    root.style.setProperty("--bg-2",        "#111320");
    root.style.setProperty("--card-bg",     "#151829");
    root.style.setProperty("--card-bg-2",   "#1a1e35");
    root.style.setProperty("--border",      "rgba(255,255,255,0.07)");
    root.style.setProperty("--text",        "#f0f2ff");
    root.style.setProperty("--text-mid",    "#8b90b8");
    root.style.setProperty("--text-soft",   "#555a80");
    root.style.setProperty("--purple-soft", "rgba(124,92,252,0.15)");
    root.style.setProperty("--purple-glow", "rgba(124,92,252,0.3)");
  } else {
    root.style.setProperty("--bg",          "#f0ebff");
    root.style.setProperty("--bg-2",        "#ffffff");
    root.style.setProperty("--card-bg",     "#ffffff");
    root.style.setProperty("--card-bg-2",   "#f4f2ff");
    root.style.setProperty("--border",      "rgba(0,0,0,0.08)");
    root.style.setProperty("--text",        "#1e1b4b");
    root.style.setProperty("--text-mid",    "#6b7280");
    root.style.setProperty("--text-soft",   "#9ca3af");
    root.style.setProperty("--purple-soft", "rgba(124,92,252,0.1)");
    root.style.setProperty("--purple-glow", "rgba(124,92,252,0.2)");
  }
  ["settingsLightBtn"].forEach(id => document.getElementById(id)?.classList.toggle("active", mode === "light"));
  ["settingsDarkBtn"].forEach(id  => document.getElementById(id)?.classList.toggle("active", mode === "dark"));
  if (!silent) showToast(`${mode === "dark" ? "🌙 Dark" : "☀️ Light"} mode enabled`);
}

// ── CONFIRM DELETE (hits DB) ──────────────────────────────────────────────────

async function confirmDelete() {
  if (!confirm("⚠️ This will permanently delete ALL your transactions and goals. Continue?")) return;

  const userId = localStorage.getItem("userId");
  if (!userId) return;

  try {
    await Promise.all([
      fetch(`${API}/transactions/all/${userId}`, { method: "DELETE" }),
      fetch(`${API}/goals/all/${userId}`,        { method: "DELETE" })
    ]);
    allTransactions = [];
    allGoals        = [];
    refreshAll();
    renderGoalsPage();
    renderGoalsMini();
    renderAllTransactions();
    showToast("All data deleted from server");
  } catch {
    showToast("Delete failed. Is the server running?", "error");
  }
}

// ── HELP FAQ ──────────────────────────────────────────────────────────────────

function toggleFaq(el) {
  const answer = el.nextElementSibling;
  const isOpen = answer.style.display === "block";
  document.querySelectorAll(".faq-a").forEach(a => a.style.display = "none");
  document.querySelectorAll(".faq-q span").forEach(s => s.textContent = "▾");
  if (!isOpen) {
    answer.style.display = "block";
    el.querySelector("span").textContent = "▴";
  }
}

// ── BUDGET WIDGET ─────────────────────────────────────────────────────────────

function saveBudget() {
  const budget = Number(document.getElementById("budgetInput")?.value);
  if (!budget || budget <= 0) { showToast("Enter a valid budget", "error"); return; }
  localStorage.setItem("monthlyBudget", budget);
  const el = document.getElementById("budgetStatus");
  if (el) el.textContent = "Budget: " + fmtNum(budget);
  showToast("Budget saved!");
  checkBudgetAlert();
}

function checkBudgetAlert() {
  const budget = Number(localStorage.getItem("monthlyBudget"));
  if (!budget) return;
  const now     = new Date();
  const month   = now.getMonth();
  const year    = now.getFullYear();
  let total = 0;
  allTransactions.forEach(t => {
    const d = new Date(t.date);
    if (t.type === "expense" && d.getMonth() === month && d.getFullYear() === year)
      total += Number(t.amount);
  });
  const statusEl = document.getElementById("budgetStatus");
  if (!statusEl) return;
  if (total > budget) {
    statusEl.textContent = "🚨 Budget exceeded by " + fmtNum(total - budget);
    statusEl.style.color = "var(--red)";
  } else {
    statusEl.textContent = "✅ Remaining: " + fmtNum(budget - total);
    statusEl.style.color = "var(--green)";
  }
}

function loadBudgetUI() {
  const saved = localStorage.getItem("monthlyBudget");
  if (saved) {
    const el = document.getElementById("budgetInput");
    if (el) el.value = saved;
    checkBudgetAlert();
  }
}

// ── CHART.JS DARK MODE DEFAULTS ────────────────────────────────────────────────
if (typeof Chart !== "undefined") {
  Chart.defaults.color        = "#8b90b8";
  Chart.defaults.borderColor  = "rgba(255,255,255,0.04)";
}