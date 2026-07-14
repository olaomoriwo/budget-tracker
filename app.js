// Replace this placeholder string with your deployed Google Apps Script Web App URL
const API_URL = "https://script.google.com/macros/s/AKfycbw_muzejs1mczNr8d0KTVNxOrxujASOSgsB80LlELwl-oO91ItHEVWKycGs5INr6rEE/exec";

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(() => console.log('Service Worker Registered'))
    .catch((err) => console.error('Service Worker registration failed:', err));
}

async function fetchBudgetData() {
  const budgetList = document.getElementById('budget-list');
  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    
    document.getElementById('salary-before').innerText = `£${parseFloat(data.income.beforeTax).toFixed(2)}`;
    document.getElementById('salary-after').innerText = `£${parseFloat(data.income.afterTax).toFixed(2)}`;
    
    budgetList.innerHTML = '';
    
    const categories = [
      ...data.fixedCommitments,
      ...data.variableExpenses,
      ...data.savings
    ];
    
    categories.forEach(item => {
      const budget = parseFloat(item.budgeted) || 0;
      const actual = parseFloat(item.actual) || 0;
      const percentage = budget > 0 ? Math.min((actual / budget) * 100, 100) : 0;
      
      let progressColor = 'bg-indigo-500';
      if (percentage > 90) progressColor = 'bg-rose-500';
      else if (percentage > 70) progressColor = 'bg-amber-500';
      
      const itemHTML = `
        <div class="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <div class="flex justify-between items-center mb-1">
            <div>
              <span class="font-medium text-white block">${item.item}</span>
              <span class="text-xxs text-slate-400 uppercase tracking-wider">${item.category}</span>
            </div>
            <div class="text-right">
              <span class="text-sm font-semibold text-slate-200">£${actual.toFixed(2)}</span>
              <span class="text-xs text-slate-400">/ £${budget.toFixed(2)}</span>
            </div>
          </div>
          <div class="w-full bg-slate-950 h-2 rounded-full overflow-hidden mt-2">
            <div class="${progressColor} h-full transition-all duration-500" style="width: ${percentage}%"></div>
          </div>
        </div>
      `;
      budgetList.insertAdjacentHTML('beforeend', itemHTML);
    });
    
  } catch (err) {
    console.error(err);
    budgetList.innerHTML = `<div class="text-rose-400 text-center py-4">Error loading data. Verify your App Script URL.</div>`;
  }
}

async function logExpense(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('submit-btn');
  const itemName = document.getElementById('expense-item').value;
  const amount = document.getElementById('expense-amount').value;
  
  submitBtn.disabled = true;
  submitBtn.innerText = 'Posting...';
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ itemName, amount })
    });
    const resData = await response.json();
    
    if (resData.status === 'success') {
      document.getElementById('expense-amount').value = '';
      alert('Expense logged successfully!');
      fetchBudgetData();
    } else {
      alert('Failed to log expense: ' + resData.message);
    }
  } catch (err) {
    console.error(err);
    alert('An error occurred while posting data.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = 'Post to Spreadsheet';
  }
}

window.addEventListener('DOMContentLoaded', fetchBudgetData);
