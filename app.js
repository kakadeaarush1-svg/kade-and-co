/**
 * Kade & Co. - Paper Trading Simulator Logic
 */

let state = {
  cash: 100000.00,
  portfolio: {}, // { TICKER: { shares: N, avgCost: P } }
  history: [],
  currentQuote: null,
  chartData: []
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  updateUI();
  
  // Setup chart
  const ctx = document.getElementById('price-chart').getContext('2d');
  window.priceChart = {
    ctx: ctx,
    draw: function(data) {
      const canvas = ctx.canvas;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (data.length < 2) return;
      
      const min = Math.min(...data) * 0.999;
      const max = Math.max(...data) * 1.001;
      const range = max - min;
      
      ctx.beginPath();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      
      data.forEach((val, i) => {
        const x = (i / (data.length - 1)) * canvas.width;
        const y = canvas.height - ((val - min) / range) * canvas.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
  };
});

function updateUI() {
  document.getElementById('cash-balance').textContent = '$' + state.cash.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
  
  let portfolioValue = 0;
  const body = document.getElementById('portfolio-body');
  body.innerHTML = '';
  
  const tickers = Object.keys(state.portfolio);
  if (tickers.length === 0) {
    body.innerHTML = '<tr><td colspan=\"7\" class=\"empty-state\">No active positions.</td></tr>';
  } else {
    tickers.forEach(ticker => {
      const pos = state.portfolio[ticker];
      if (pos.shares <= 0) return;
      
      // For simulation, we assume current price = avgCost if not fetching
      const currentPrice = (state.currentQuote && state.currentQuote.symbol === ticker) ? state.currentQuote.price : pos.avgCost;
      const mktValue = pos.shares * currentPrice;
      const pnl = mktValue - (pos.shares * pos.avgCost);
      const returns = (pnl / (pos.shares * pos.avgCost)) * 100;
      
      portfolioValue += mktValue;
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class=\"ticker-cell\">${ticker}</td>
        <td>${pos.shares}</td>
        <td>$${pos.avgCost.toFixed(2)}</td>
        <td>$${currentPrice.toFixed(2)}</td>
        <td>$${mktValue.toLocaleString()}</td>
        <td class=\"${pnl >= 0 ? 'pos-change' : 'neg-change'}\">${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}</td>
        <td class=\"${returns >= 0 ? 'pos-change' : 'neg-change'}\">${returns >= 0 ? '+' : ''}${returns.toFixed(2)}%</td>
      `;
      body.appendChild(row);
    });
  }
  
  const total = state.cash + portfolioValue;
  document.getElementById('portfolio-value').textContent = '$' + total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
  const totalPnl = total - 100000;
  const pnlEl = document.getElementById('total-pnl');
  pnlEl.textContent = (totalPnl >= 0 ? '+' : '') + '$' + totalPnl.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
  pnlEl.className = 'metric-value ' + (totalPnl >= 0 ? 'pos-change' : 'neg-change');
  
  // History
  const histBody = document.getElementById('history-body');
  histBody.innerHTML = '';
  if (state.history.length === 0) {
    histBody.innerHTML = '<tr><td colspan=\"6\" class=\"empty-state\">No orders executed.</td></tr>';
  } else {
    state.history.slice().reverse().forEach(ord => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${ord.time}</td>
        <td>${ord.ticker}</td>
        <td style=\"color: var(${ord.side === 'BUY' ? '--accent-buy' : '--accent-sell'})\">${ord.side}</td>
        <td>${ord.shares}</td>
        <td>$${ord.price.toFixed(2)}</td>
        <td>$${(ord.shares * ord.price).toLocaleString()}</td>
      `;
      histBody.appendChild(row);
    });
  }
  
  saveState();
}

async function fetchQuote() {
  const ticker = document.getElementById('quote-ticker').value.toUpperCase();
  if (!ticker) return;
  
  // Mocking quote
  const basePrice = 100 + Math.random() * 500;
  const change = (Math.random() - 0.45) * 5;
  
  state.currentQuote = {
    symbol: ticker,
    price: basePrice,
    change: change,
    open: basePrice - 2,
    high: basePrice + 5,
    low: basePrice - 3,
    vol: '1.2M'
  };
  
  // Show result
  document.getElementById('quote-result').classList.remove('hidden');
  document.getElementById('q-symbol').textContent = ticker;
  document.getElementById('q-price').textContent = '$' + basePrice.toFixed(2);
  const cEl = document.getElementById('q-change');
  cEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
  cEl.className = 'quote-change ' + (change >= 0 ? 'pos-change' : 'neg-change');
  
  document.getElementById('q-open').textContent = '$' + state.currentQuote.open.toFixed(2);
  document.getElementById('q-high').textContent = '$' + state.currentQuote.high.toFixed(2);
  document.getElementById('q-low').textContent = '$' + state.currentQuote.low.toFixed(2);
  document.getElementById('q-vol').textContent = state.currentQuote.vol;
  
  // Chart
  state.chartData = Array.from({length: 30}, () => basePrice + (Math.random() - 0.5) * 10);
  document.getElementById('chart-ticker-label').textContent = ticker;
  window.priceChart.draw(state.chartData);
  
  updateUI();
}

function useQuotePrice() {
  if (!state.currentQuote) return;
  document.getElementById('ticker').value = state.currentQuote.symbol;
  if (document.getElementById('order-type').value === 'limit') {
    document.getElementById('limit-price').value = state.currentQuote.price.toFixed(2);
  }
}

function toggleLimitPrice() {
  const type = document.getElementById('order-type').value;
  document.getElementById('limit-price-group').style.display = type === 'limit' ? 'block' : 'none';
}

function placeOrder(side) {
  const ticker = document.getElementById('ticker').value.toUpperCase();
  const shares = parseInt(document.getElementById('quantity').value);
  const type = document.getElementById('order-type').value;
  let price = (state.currentQuote && state.currentQuote.symbol === ticker) ? state.currentQuote.price : 150.00; // default mock price
  
  if (type === 'limit') {
    price = parseFloat(document.getElementById('limit-price').value);
  }
  
  if (!ticker || isNaN(shares) || shares <= 0) {
    showMessage('Please enter valid ticker and quantity.', true);
    return;
  }
  
  const totalCost = shares * price;
  
  if (side === 'buy') {
    if (totalCost > state.cash) {
      showMessage('Insufficient cash balance.', true);
      return;
    }
    
    state.cash -= totalCost;
    if (!state.portfolio[ticker]) {
      state.portfolio[ticker] = { shares: 0, avgCost: 0 };
    }
    const currentPos = state.portfolio[ticker];
    const newTotalShares = currentPos.shares + shares;
    currentPos.avgCost = ((currentPos.shares * currentPos.avgCost) + totalCost) / newTotalShares;
    currentPos.shares = newTotalShares;
    
    addHistory('BUY', ticker, shares, price);
    showMessage(`Successfully bought ${shares} shares of ${ticker}.`);
  } else {
    if (!state.portfolio[ticker] || state.portfolio[ticker].shares < shares) {
      showMessage('Not enough shares to sell.', true);
      return;
    }
    
    state.cash += totalCost;
    state.portfolio[ticker].shares -= shares;
    addHistory('SELL', ticker, shares, price);
    showMessage(`Successfully sold ${shares} shares of ${ticker}.`);
  }
  
  updateUI();
}

function addHistory(side, ticker, shares, price) {
  state.history.push({
    time: new Date().toLocaleTimeString(),
    side: side,
    ticker: ticker,
    shares: shares,
    price: price
  });
}

function showMessage(text, isError = false) {
  const el = document.getElementById('trade-message');
  el.textContent = text;
  el.style.color = isError ? 'var(--accent-sell)' : 'var(--accent-buy)';
  setTimeout(() => el.textContent = '', 5000);
}

function resetSimulator() {
  if (confirm('Are you sure you want to reset all progress?')) {
    localStorage.removeItem('kade_simulator_state');
    location.reload();
  }
}

function saveState() {
  localStorage.setItem('kade_simulator_state', JSON.stringify(state));
}

function loadState() {
  const saved = localStorage.getItem('kade_simulator_state');
  if (saved) {
    state = JSON.parse(saved);
  }
}
