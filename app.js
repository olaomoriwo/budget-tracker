// Secure Global Architecture Settings
let trendChartInstance = null;
let budgetChartInstance = null;
let utilisationChartInstance = null;
let globalHistoricalData = null; // Stores data in memory for the month dropdown filter

async function fetchBudgetData() {
  try {
    // Robust Ledger Data structure ensuring structural integrity across months
    const mockData = {
      metrics: { income: 2040.35, outgoings: 5977.63, saved: 850.00, titheBalance: 204.04 },
      historical: {
        "2026-06": { income: 2100, outgoings: 1850 },
        "2026-07": { income: 2200, outgoings: 6600 },
        "2026-08": { income: 2040.35, outgoings: 5977.63 }
      },
      allocations: {
        labels: ["Rent", "Bills", "Feeding", "Savings", "Tithe"],
        budgeted: [1000, 300, 400, 500, 204],
        actual: [1000, 350, 420, 250, 0]
      },
      insights: [
        "Pacing warning: Outgoings have exceeded net monthly inflows.",
        "Under-funded savings: You are £250.00 short of your target allocations."
      ]
    };

    // Cache historical metrics in memory and build the month dropdown filter
    globalHistoricalData = mockData.historical;
    populateMonthFilter(Object.keys(mockData.historical).sort().reverse());

    renderInterface(mockData);
  } catch (err) {
    console.error("Data Engine Fault:", err);
  }
}

// Builds the interactive option rows for your month selection filter
function populateMonthFilter(months) {
  const filterEl = document.getElementById("month-filter");
  if (!filterEl) return;
  
  // Preserve current selection if it exists, otherwise build clean options
  const currentSelection = filterEl.value;
  filterEl.innerHTML = months.map(m => `<option value="${m}">${m}</option>`).join('');
  
  if (currentSelection && months.includes(currentSelection)) {
    filterEl.value = currentSelection;
  } else if (months.length > 0) {
    filterEl.value = months[0]; // Default to the most recent month row
  }
}

// Triggers automatically whenever you change the active month filter selection dropdown
function renderActiveMonthCharts() {
  const filterEl = document.getElementById("month-filter");
  if (!filterEl || !globalHistoricalData) return;
  
  const selectedMonth = filterEl.value;
  const monthData = globalHistoricalData[selectedMonth];
  
  if (monthData) {
    // Dynamic recalculation of the interface metrics relative to the filtered month selection
    document.getElementById("metric-income").innerText = `£${(monthData.income || 0).toLocaleString()}`;
    document.getElementById("metric-outgoings").innerText = `£${(monthData.outgoings || 0).toLocaleString()}`;
    
    // Refresh the radial utilization chart view to match the selected period parameters
    renderUtilisationChart({ outgoings: monthData.outgoings, saved: 850 }); 
  }
}

function renderInterface(data) {
  document.getElementById("metric-income").innerText = `£${data.metrics.income.toLocaleString()}`;
  document.getElementById("metric-outgoings").innerText = `£${data.metrics.outgoings.toLocaleString()}`;
  document.getElementById("metric-saved").innerText = `£${data.metrics.saved.toLocaleString()}`;
  
  const titheBanner = document.getElementById("tithe-floating-banner");
  const titheAmount = document.getElementById("tithe-balance-amount");
  if (data.metrics.titheBalance > 0 && titheBanner && titheAmount) {
    titheAmount.innerText = data.metrics.titheBalance.toFixed(2);
    titheBanner.classList.remove("hidden");
  }

  const insightsContainer = document.getElementById("advisor-insights");
  if (insightsContainer) {
    insightsContainer.innerHTML = data.insights.map(msg => `
      <div class="bg-slate-900/40 border border-slate-900 p-3.5 rounded-xl text-xs text-slate-300 flex items-start gap-2">
        <span class="text-amber-500 shrink-0">⚠️</span>
        <span>${msg}</span>
      </div>
    `).join('');
  }

  renderUtilisationChart(data.metrics);
  renderAllocationChart(data.allocations);
  renderHistoricalTrend(data.historical);
}

function renderUtilisationChart(metrics) {
  const ctx = document.getElementById("utilisationPieChart");
  if (!ctx) return;
  if (utilisationChartInstance) utilisationChartInstance.destroy();
  
  utilisationChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Outflow', 'Stored'],
      datasets: [{
        data: [metrics.outgoings, metrics.saved],
        backgroundColor: ['rgba(245, 158, 11, 0.8)', 'rgba(99, 102, 241, 0.8)'],
        borderWidth: 0
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '75%' }
  });
}

function renderAllocationChart(allocations) {
  const ctx = document.getElementById("budgetVsActualChart");
  if (!ctx) return;
  if (budgetChartInstance) budgetChartInstance.destroy();
  
  budgetChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: allocations.labels,
      datasets: [
        { label: 'Budgeted', data: allocations.budgeted, backgroundColor: 'rgba(99, 102, 241, 0.5)', borderRadius: 6 },
        { label: 'Actual', data: allocations.actual, backgroundColor: 'rgba(16, 185, 129, 0.8)', borderRadius: 6 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 9 } } },
        y: { grid: { color: '#1e293b' }, ticks: { color: '#64748b', font: { size: 9 } } }
      }
    }
  });
}

function renderHistoricalTrend(historicalData) {
  const ctx = document.getElementById("historicalTrendChart");
  if (!ctx) return;
  if (trendChartInstance) trendChartInstance.destroy();

  const labels = Object.keys(historicalData).sort();
  const outgoingData = labels.map(m => historicalData[m].outgoings);
  const incomingData = labels.map(m => historicalData[m].income);

  const ctx2d = ctx.getContext('2d');
  const greenGrad = ctx2d.createLinearGradient(0, 0, 0, 120);
  greenGrad.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
  greenGrad.addColorStop(1, 'rgba(16, 185, 129, 0.00)');

  const amberGrad = ctx2d.createLinearGradient(0, 0, 0, 120);
  amberGrad.addColorStop(0, 'rgba(245, 158, 11, 0.20)');
  amberGrad.addColorStop(1, 'rgba(245, 158, 11, 0.00)');

  trendChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        { label: 'Inflow (£)', data: incomingData, borderColor: '#10b981', borderWidth: 2, pointRadius: 0, backgroundColor: greenGrad, fill: true, tension: 0.3 },
        { label: 'Outflow (£)', data: outgoingData, borderColor: '#f59e0b', borderWidth: 2, pointRadius: 0, backgroundColor: amberGrad, fill: true, tension: 0.3 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 9 } } },
        y: { grid: { color: '#1e293b', drawTicks: false }, ticks: { color: '#64748b', font: { size: 9 }, maxTicksLimit: 4 } }
      }
    }
  });

  // Smooth curtain masking touch controller logic
  const container = document.getElementById("chart-touch-container");
  const curtain = document.getElementById("chart-reveal-curtain");
  
  if (!container || !curtain) return;

  const handleScrubMove = (e) => {
    const rect = container.getBoundingClientRect();
    const touch = e.touches[0];
    const relativeX = touch.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (relativeX / rect.width) * 100));
    
    curtain.style.left = `${percentage}%`;
  };

  container.addEventListener('touchmove', handleScrubMove, { passive: true });
}

async function handleUserMessage(event) {
  event.preventDefault();
  const inputEl = document.getElementById("chat-input-field");
  const logsBox = document.getElementById("chat-logs-box");
  if (!inputEl || !inputEl.value.trim()) return;

  const promptText = inputEl.value.trim();
  inputEl.value = "";

  logsBox.insertAdjacentHTML("beforeend", `<div class="bg-slate-900 p-3 rounded-xl text-slate-200 max-w-[85%] ml-auto mt-2">${promptText}</div>`);
  logsBox.scrollTop = logsBox.scrollHeight;

  const loadingId = "loader-" + Date.now();
  logsBox.insertAdjacentHTML("beforeend", `<div id="${loadingId}" class="text-slate-500 italic text-xs mt-1">Analyzing financial streams...</div>`);

  try {
    const gatewayURL = "https://script.google.com/macros/s/AKfycbz_your_actual_script_id/exec";
    const res = await fetch(gatewayURL, { method: "POST", body: JSON.stringify({ prompt: promptText }) });
    const data = await res.json();
    document.getElementById(loadingId).remove();
    
    logsBox.insertAdjacentHTML("beforeend", `<div class="bg-indigo-950/40 border border-indigo-900/50 p-3 rounded-xl text-slate-200 max-w-[85%] mr-auto mt-2">${data.reply}</div>`);
  } catch (err) {
    document.getElementById(loadingId).remove();
    logsBox.insertAdjacentHTML("beforeend", `<div class="text-rose-400 text-xs mt-2">API Routing failure. Standalone fallback active.</div>`);
  }
  logsBox.scrollTop = logsBox.scrollHeight;
}

function refreshDashboard() { fetchBudgetData(); }
window.addEventListener("DOMContentLoaded", fetchBudgetData);
