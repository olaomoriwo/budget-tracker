const API_URL = "https://script.google.com/macros/library/d/1vCvkPU2j2blreGAZNznSqAKE3QtP8q5wDYoNC4HUw-YKFlhbC2Leszcz/6";

let globalRecords = [];
let budgetChartInstance = null;
let trendChartInstance = null;
let pieChartInstance = null;

async function fetchBudgetData() {
  try {
    const response = await fetch(API_URL);
    const payload = await response.json();
    
    globalRecords = payload.rawRecords;
    
    generateFinancialAdvisorInsights(globalRecords);
    populateMonthFilter(globalRecords);
    renderActiveMonthCharts();
    renderHistoricalTrendChart(globalRecords);
  } catch (err) {
    console.error("Dashboard engine failed to load:", err);
  }
}

function refreshDashboard() {
  fetchBudgetData();
}

function generateFinancialAdvisorInsights(records) {
  const container = document.getElementById("advisor-insights");
  if (!container) return;
  container.innerHTML = "";
  
  const filter = document.getElementById("month-filter");
  const targetMonth = filter && filter.value ? filter.value : new Date().toISOString().substring(0, 7);
  
  const currentMonthRecords = records.filter(r => r.Month && r.Month.toString().substring(0, 7) === targetMonth);
  const alerts = [];
  
  const incomeRow = currentMonthRecords.find(r => r.Item === "Net Take-Home");
  const actualIncome = incomeRow ? parseFloat(incomeRow.Actual) || 0 : 2040.35;
  const titheRow = currentMonthRecords.find(r => r.Item === "Tithe");
  
  if (titheRow) {
    const titheBudget = actualIncome * 0.1;
    const titheActual = parseFloat(titheRow.Actual) || 0;
    const titheDiff = titheBudget - titheActual;
    const banner = document.getElementById("tithe-floating-banner");
    const bannerAmount = document.getElementById("tithe-balance-amount");
    
    if (titheDiff > 0.01) {
      if (banner && bannerAmount) {
        bannerAmount.innerText = titheDiff.toFixed(2);
        banner.classList.remove("hidden");
      }
    } else {
      if (banner) banner.classList.add("hidden");
    }
  }

  currentMonthRecords.forEach(entry => {
    const budget = parseFloat(entry.Budgeted) || 0;
    const actual = parseFloat(entry.Actual) || 0;
    const isSavings = entry.Category.toLowerCase().includes("sav") || entry.Category.toLowerCase().includes("buffer");
    
    if (entry.Item === "Tithe" || entry.Item === "Net Take-Home") return;
    
    if (isSavings) {
      if (actual > budget) {
        alerts.push({
          type: "success",
          message: `🎉 Great discipline! You exceeded your savings goal for <strong>${entry.Item}</strong> by £${(actual - budget).toFixed(2)}.`
        });
      } else if (actual < budget && actual > 0) {
        alerts.push({
          type: "warning",
          message: `⚠️ Under-funded savings: You are £${(budget - actual).toFixed(2)} short of your target for <strong>${entry.Item}</strong>.`
        });
      }
    } else {
      if (actual > budget) {
        alerts.push({
          type: "danger",
          message: `🚨 Overspent on <strong>${entry.Item}</strong> by £${(actual - budget).toFixed(2)}.`
        });
      } else if (actual > budget * 0.85 && actual <= budget) {
        alerts.push({
          type: "warning",
          message: `👀 Pacing warning: <strong>${entry.Item}</strong> has consumed ${Math.round((actual / budget) * 100)}% of its allocation.`
        });
      }
    }
  });

  if (alerts.length === 0) {
    container.innerHTML = `<div class="bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-sm p-4 rounded-xl">🎉 Financial velocities are tracking perfectly within targets for this period.</div>`;
    return;
  }

  alerts.forEach(alert => {
    let style = "bg-amber-950/40 border-amber-800 text-amber-300";
    if (alert.type === "success") style = "bg-emerald-950/40 border-emerald-800 text-emerald-300";
    if (alert.type === "danger") style = "bg-rose-950/30 border-rose-900/50 text-rose-400";
    
    container.insertAdjacentHTML("beforeend", `<div class="border text-sm p-3 rounded-xl ${style}">${alert.message}</div>`);
  });
}

function populateMonthFilter(records) {
  const filter = document.getElementById("month-filter");
  if (!filter) return;
  
  const uniqueMonths = [...new Set(records.map(r => r.Month ? r.Month.toString().substring(0, 7) : ""))].filter(Boolean).sort();
  const currentSelection = filter.value;
  filter.innerHTML = "";
  
  uniqueMonths.forEach(m => {
    filter.insertAdjacentHTML("beforeend", `<option value="${m}">${m}</option>`);
  });
  
  if (currentSelection && uniqueMonths.includes(currentSelection)) {
    filter.value = currentSelection;
  } else if (uniqueMonths.length > 0) {
    filter.value = uniqueMonths[uniqueMonths.length - 1];
  }
}

function renderActiveMonthCharts() {
  const filter = document.getElementById("month-filter");
  if (!filter || !filter.value) return;
  const targetMonth = filter.value;
  
  generateFinancialAdvisorInsights(globalRecords);
  
  const filtered = globalRecords.filter(r => r.Month && r.Month.toString().substring(0, 7) === targetMonth);
  const incomeRow = filtered.find(r => r.Item === "Net Take-Home");
  const actualIncome = incomeRow ? parseFloat(incomeRow.Actual) || 0 : 2040.35;
  
  const expenseItems = filtered.filter(r => r.Item !== "Net Take-Home");
  const totalActualOutgoings = expenseItems.reduce((sum, r) => sum + (parseFloat(r.Actual) || 0), 0);
  const savingsItems = expenseItems.filter(r => r.Category.toLowerCase().includes("sav") || r.Category.toLowerCase().includes("buffer"));
  const totalActualSaved = savingsItems.reduce((sum, r) => sum + (parseFloat(r.Actual) || 0), 0);
  
  document.getElementById("metric-income").innerText = `£${actualIncome.toLocaleString('en-GB', {minimumFractionDigits: 2})}`;
  document.getElementById("metric-outgoings").innerText = `£${totalActualOutgoings.toLocaleString('en-GB', {minimumFractionDigits: 2})}`;
  document.getElementById("metric-saved").innerText = `£${totalActualSaved.toLocaleString('en-GB', {minimumFractionDigits: 2})}`;

  if (budgetChartInstance) budgetChartInstance.destroy();
  
  const ctx = document.getElementById("budgetVsActualChart").getContext("2d");
  budgetChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: expenseItems.map(r => r.Item),
      datasets: [
        { label: "Budgeted (£)", data: expenseItems.map(r => parseFloat(r.Budgeted) || 0), backgroundColor: "#6366f1" },
        { label: "Actual (£)", data: expenseItems.map(r => parseFloat(r.Actual) || 0), backgroundColor: "#10b981" }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { ticks: { color: "#94a3b8" }, grid: { color: "#334155" } }, x: { ticks: { color: "#94a3b8" }, grid: { display: false } } }
    }
  });

  renderUtilisationPie(actualIncome, totalActualOutgoings);
}

function renderUtilisationPie(income, outgoings) {
  if (pieChartInstance) pieChartInstance.destroy();
  const remainingBuffer = Math.max(income - outgoings, 0);
  const overspentAmount = Math.max(outgoings - income, 0);
  
  if (overspentAmount > 0) {
    document.getElementById("gauge-label").innerHTML = `<span class="text-rose-400 font-semibold">Overspent by £${overspentAmount.toFixed(2)}</span> of take-home pay.`;
  } else {
    document.getElementById("gauge-label").innerHTML = `Using <span class="text-indigo-400 font-semibold">${((outgoings / income) * 100).toFixed(0)}%</span> of total take-home pay.`;
  }

  const ctx = document.getElementById("utilisationPieChart").getContext("2d");
  pieChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Spent", "Remaining Buffer"],
      datasets: [{ data: [Math.min(outgoings, income), remainingBuffer], backgroundColor: ["#f43f5e", "#10b981"], borderWidth: 0 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: "75%" }
  });
}

function renderHistoricalTrendChart(records) {
  const months = [...new Set(records.map(r => r.Month ? r.Month.toString().substring(0, 7) : ""))].filter(Boolean).sort();
  const monthlyTotals = months.map(m => {
    return records.filter(r => r.Month && r.Month.toString().substring(0, 7) === m && r.Item !== "Net Take-Home")
                  .reduce((sum, r) => sum + (parseFloat(r.Actual) || 0), 0);
  });
  
  if (trendChartInstance) trendChartInstance.destroy();
  const ctx = document.getElementById("historicalTrendChart").getContext("2d");
  trendChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: months,
      datasets: [{ label: "Total Outgoings (£)", data: monthlyTotals, borderColor: "#f59e0b", backgroundColor: "rgba(245, 158, 11, 0.1)", tension: 0.2, fill: true }]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { ticks: { color: "#94a3b8" } }, x: { ticks: { color: "#94a3b8" } } } }
  });
}

function toggleChatWindow() {
  const triggerBtn = document.getElementById("chat-trigger-btn");
  const windowCard = document.getElementById("chat-window-card");
  
  if (windowCard.classList.contains("hidden")) {
    windowCard.classList.remove("hidden");
    triggerBtn.classList.add("hidden");
    const logsBox = document.getElementById("chat-logs-box");
    logsBox.scrollTop = logsBox.scrollHeight;
  } else {
    windowCard.classList.add("hidden");
    triggerBtn.classList.remove("hidden");
  }
}

async function handleUserMessage(event) {
  event.preventDefault();
  const inputField = document.getElementById("chat-input-field");
  const logsBox = document.getElementById("chat-logs-box");
  const promptQuery = inputField.value.trim();
  
  if (!promptQuery) return;
  
  logsBox.insertAdjacentHTML("beforeend", `
    <div class="bg-slate-800 border border-slate-700/50 p-3 rounded-xl text-slate-200 text-right max-w-[85%] ml-auto leading-relaxed">
      ${promptQuery}
    </div>
  `);
  
  inputField.value = "";
  logsBox.scrollTop = logsBox.scrollHeight;
  
  const loadingId = "msg-loader-" + Date.now();
  logsBox.insertAdjacentHTML("beforeend", `
    <div id="${loadingId}" class="bg-slate-950/40 border border-slate-800 text-slate-400 p-3 rounded-xl max-w-[85%] mr-auto italic animate-pulse">
      Consulting financial models...
    </div>
  `);
  logsBox.scrollTop = logsBox.scrollHeight;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        prompt: promptQuery,
        context: globalRecords
      })
    });
    
    const data = await response.json();
    const loaderElement = document.getElementById(loadingId);
    if (loaderElement) loaderElement.remove();
    
    const parsedReply = data.reply ? data.reply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') : "Operational routing variance detected.";
    
    logsBox.insertAdjacentHTML("beforeend", `
      <div class="bg-indigo-950/40 border border-indigo-900/50 p-3 rounded-xl text-slate-200 max-w-[85%] mr-auto leading-relaxed">
        ${parsedReply}
      </div>
    `);
    logsBox.scrollTop = logsBox.scrollHeight;

  } catch (err) {
    console.error(err);
    const loaderElement = document.getElementById(loadingId);
    if (loaderElement) loaderElement.remove();
    
    logsBox.insertAdjacentHTML("beforeend", `
      <div class="bg-rose-950/30 border border-rose-900/50 p-3 rounded-xl text-rose-400 max-w-[85%] mr-auto">
        Unable to route request stream to secure cloud core processor. Check connections.
      </div>
    `);
    logsBox.scrollTop = logsBox.scrollHeight;
  }
}

window.addEventListener("DOMContentLoaded", fetchBudgetData);
