const API_URL = "https://script.google.com/macros/s/AKfycbyDXbFSu1qmSO8rulhbsgJAwefFzmLZAZOeXE_K8D_gbNtxU9lIEIKm797McWjbyUjJ/exec";

let globalRecords = [];
let budgetChartInstance = null;
let trendChartInstance = null;

async function fetchBudgetData() {
  try {
    const response = await fetch(API_URL);
    const payload = await response.json();
    
    globalRecords = payload.rawRecords;
    
    renderAdvisorAlerts(payload.advisorAlerts);
    populateMonthFilter(globalRecords);
    renderActiveMonthCharts();
    renderHistoricalTrendChart(globalRecords);
  } catch (err) {
    console.error("Dashboard engine failed to load:", err);
    const container = document.getElementById("advisor-insights");
    if (container) {
      container.innerHTML = `<div class="text-rose-400 p-4 bg-slate-800 rounded-xl border border-rose-900/30">Error establishing secure sheet link. Check your API settings.</div>`;
    }
  }
}

// Global fallback handler for index template setups
function refreshDashboard() {
  fetchBudgetData();
}

function renderAdvisorAlerts(alerts) {
  const container = document.getElementById("advisor-insights");
  if (!container) return;
  container.innerHTML = "";
  
  if (!alerts || alerts.length === 0) {
    container.innerHTML = `
      <div class="bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-sm p-4 rounded-xl">
        🎉 All critical commitments are safe. Spending velocities are tracking perfectly within targets.
      </div>`;
    return;
  }
  
  alerts.forEach(alert => {
    let style = "bg-amber-950/40 border-amber-800 text-amber-300";
    if (alert.type === "critical") style = "bg-rose-950/50 border-rose-800 text-rose-300 font-semibold animate-pulse";
    if (alert.type === "danger") style = "bg-rose-950/30 border-rose-900/50 text-rose-400";
    
    container.insertAdjacentHTML("beforeend", `
      <div class="border text-sm p-3 rounded-xl ${style}">
        ${alert.message}
      </div>
    `);
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
    filter.value = uniqueMonths[uniqueMonths.length - 1]; // Use latest month entry
  }
}

function renderActiveMonthCharts() {
  const filter = document.getElementById("month-filter");
  if (!filter || !filter.value) return;
  const targetMonth = filter.value;
  
  const filtered = globalRecords.filter(r => r.Month && r.Month.toString().substring(0, 7) === targetMonth);
  
  const labels = filtered.map(r => r.Item);
  const budgetedData = filtered.map(r => parseFloat(r.Budgeted) || 0);
  const actualData = filtered.map(r => parseFloat(r.Actual) || 0);
  
  if (budgetChartInstance) budgetChartInstance.destroy();
  
  const canvas = document.getElementById("budgetVsActualChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  
  budgetChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        { label: "Budgeted (£)", data: budgetedData, backgroundColor: "#6366f1" },
        { label: "Actual (£)", data: actualData, backgroundColor: "#10b981" }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { 
        y: { ticks: { color: "#94a3b8" }, grid: { color: "#334155" } }, 
        x: { ticks: { color: "#94a3b8" }, grid: { display: false } } 
      },
      plugins: { legend: { labels: { color: "#f8fafc" } } }
    }
  });
}

function renderHistoricalTrendChart(records) {
  const canvas = document.getElementById("historicalTrendChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const months = [...new Set(records.map(r => r.Month ? r.Month.toString().substring(0, 7) : ""))].filter(Boolean).sort();
  const monthlyTotals = months.map(m => {
    return records.filter(r => r.Month && r.Month.toString().substring(0, 7) === m)
                  .reduce((sum, r) => sum + (parseFloat(r.Actual) || 0), 0);
  });
  
  if (trendChartInstance) trendChartInstance.destroy();
  
  trendChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: months,
      datasets: [{
        label: "Total Outgoings (£)",
        data: monthlyTotals,
        borderColor: "#f59e0b",
        backgroundColor: "rgba(245, 158, 11, 0.1)",
        tension: 0.2,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { 
        y: { ticks: { color: "#94a3b8" }, grid: { color: "#334155" } }, 
        x: { ticks: { color: "#94a3b8" }, grid: { display: false } } 
      },
      plugins: { legend: { labels: { color: "#f8fafc" } } }
    }
  });
}

window.addEventListener("DOMContentLoaded", fetchBudgetData);
