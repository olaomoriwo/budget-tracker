const API_URL = "https://script.google.com/macros/s/AKfycbyDXbFSu1qmSO8rulhbsgJAwefFzmLZAZOeXE_K8D_gbNtxU9lIEIKm797McWjbyUjJ/exec";

let globalRecords = [];
let budgetChartInstance = null;
let trendChartInstance = null;

async function refreshDashboard() {
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
  }
}

function renderAdvisorAlerts(alerts) {
  const container = document.getElementById("advisor-insights");
  container.innerHTML = "";
  
  if (alerts.length === 0) {
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
  const targetMonth = document.getElementById("month-filter").value;
  const filtered = globalRecords.filter(r => r.Month && r.Month.toString().substring(0, 7) === targetMonth);
  
  const labels = filtered.map(r => r.Item);
  const budgetedData = filtered.map(r => parseFloat(r.Budgeted) || 0);
  const actualData = filtered.map(r => parseFloat(r.Actual) || 0);
  
  if (budgetChartInstance) budgetChartInstance.destroy();
  
  const ctx = document.getElementById("budgetVsActualChart").getContext("2d");
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
      scales: { y: { ticks: { color: "#94a3b8" } }, x: { ticks: { color: "#94a3b8" } } }
    }
  });
}

function renderHistoricalTrendChart(records) {
  const months = [...new Set(records.map(r => r.Month ? r.Month.toString().substring(0, 7) : ""))].filter(Boolean).sort();
  const monthlyTotals = months.map(m => {
    return records.filter(r => r.Month && r.Month.toString().substring(0, 7) === m)
                  .reduce((sum, r) => sum + (parseFloat(r.Actual) || 0), 0);
  });
  
  if (trendChartInstance) trendChartInstance.destroy();
  
  const ctx = document.getElementById("historicalTrendChart").getContext("2d");
  trendChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: months,
      datasets: [{
        label: "Total Outgoings (£)",
        data: monthlyTotals,
        borderColor: "#f59e0b",
        tension: 0.2,
        fill: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { ticks: { color: "#94a3b8" } }, x: { ticks: { color: "#94a3b8" } } }
    }
  });
}

window.addEventListener("DOMContentLoaded", refreshDashboard);
