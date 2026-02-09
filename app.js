const fmtCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2
});

const inputs = {
  loanAmount1: document.querySelector("#loanAmount1"),
  rate1: document.querySelector("#rate1"),
  years1: document.querySelector("#years1"),
  loanAmount2: document.querySelector("#loanAmount2"),
  rate2: document.querySelector("#rate2"),
  years2: document.querySelector("#years2"),
  extraMonthly: document.querySelector("#extraMonthly"),
  extraAnnual: document.querySelector("#extraAnnual"),
  extraOneTime: document.querySelector("#extraOneTime"),
  oneTimeMonth: document.querySelector("#oneTimeMonth")
};

const summary1 = document.querySelector("#summary1");
const summary2 = document.querySelector("#summary2");
const tableBody1 = document.querySelector("#table1 tbody");
const tableBody2 = document.querySelector("#table2 tbody");
const chart = document.querySelector("#balanceChart");
const comparisonBlurb = document.querySelector("#comparisonBlurb");

document.querySelector("#calculateBtn").addEventListener("click", runComparison);

function monthlyPayment(principal, annualRatePct, years) {
  const monthlyRate = annualRatePct / 100 / 12;
  const months = years * 12;

  if (monthlyRate === 0) {
    return principal / months;
  }

  return principal * (monthlyRate / (1 - (1 + monthlyRate) ** -months));
}

function buildSchedule(loanAmount, annualRatePct, years, scenario) {
  const monthlyRate = annualRatePct / 100 / 12;
  const payment = monthlyPayment(loanAmount, annualRatePct, years);
  const maxMonths = years * 12;

  let balance = loanAmount;
  let totalInterest = 0;
  let totalPaid = 0;
  const rows = [];

  for (let month = 1; month <= maxMonths && balance > 0; month += 1) {
    const interest = balance * monthlyRate;
    const scheduledPrincipal = Math.min(payment - interest, balance);

    let extra = scenario.extraMonthly;
    if (scenario.extraAnnual > 0 && month % 12 === 0) {
      extra += scenario.extraAnnual;
    }
    if (scenario.extraOneTime > 0 && month === scenario.oneTimeMonth) {
      extra += scenario.extraOneTime;
    }

    const appliedExtra = Math.min(extra, balance - scheduledPrincipal);
    const principal = scheduledPrincipal + appliedExtra;
    const actualPayment = principal + interest;

    balance = Math.max(0, balance - principal);
    totalInterest += interest;
    totalPaid += actualPayment;

    rows.push({
      month,
      payment: actualPayment,
      principal,
      interest,
      extra: appliedExtra,
      balance
    });
  }

  return {
    payment,
    rows,
    totalInterest,
    totalPaid,
    payoffMonths: rows.length
  };
}

function validateNumber(value, message) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    throw new Error(message);
  }
  return num;
}

function getInputs() {
  const oneTimeMonth = Math.max(1, Math.floor(validateNumber(inputs.oneTimeMonth.value, "Invalid one-time payment month")));
  return {
    loan1: {
      loanAmount: validateNumber(inputs.loanAmount1.value, "Invalid loan amount for Mortgage A"),
      rate: validateNumber(inputs.rate1.value, "Invalid interest rate for Mortgage A"),
      years: Math.max(1, Math.floor(validateNumber(inputs.years1.value, "Invalid years for Mortgage A")))
    },
    loan2: {
      loanAmount: validateNumber(inputs.loanAmount2.value, "Invalid loan amount for Mortgage B"),
      rate: validateNumber(inputs.rate2.value, "Invalid interest rate for Mortgage B"),
      years: Math.max(1, Math.floor(validateNumber(inputs.years2.value, "Invalid years for Mortgage B")))
    },
    scenario: {
      extraMonthly: validateNumber(inputs.extraMonthly.value, "Invalid monthly prepayment"),
      extraAnnual: validateNumber(inputs.extraAnnual.value, "Invalid annual prepayment"),
      extraOneTime: validateNumber(inputs.extraOneTime.value, "Invalid one-time prepayment"),
      oneTimeMonth
    }
  };
}

function monthsToYearsMonths(months) {
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return `${years}y ${rem}m (${months} months)`;
}

function addSummaryItem(el, label, value) {
  const li = document.createElement("li");
  li.innerHTML = `<strong>${label}</strong><span>${value}</span>`;
  el.append(li);
}

function renderSummary(el, schedule, title) {
  el.innerHTML = "";
  addSummaryItem(el, "Base Monthly Payment", fmtCurrency.format(schedule.payment));
  addSummaryItem(el, "Total Interest", fmtCurrency.format(schedule.totalInterest));
  addSummaryItem(el, "Total Paid", fmtCurrency.format(schedule.totalPaid));
  addSummaryItem(el, "Time to Payoff", monthsToYearsMonths(schedule.payoffMonths));

  if (!schedule.rows.length) {
    const li = document.createElement("li");
    li.textContent = `${title}: no amortization rows generated.`;
    el.append(li);
  }
}

function renderTable(body, rows) {
  body.innerHTML = "";
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.month}</td>
      <td>${fmtCurrency.format(row.payment)}</td>
      <td>${fmtCurrency.format(row.principal)}</td>
      <td>${fmtCurrency.format(row.interest)}</td>
      <td>${fmtCurrency.format(row.extra)}</td>
      <td>${fmtCurrency.format(row.balance)}</td>
    `;
    body.append(tr);
  });
}

function drawChart(rowsA, rowsB) {
  const ctx = chart.getContext("2d");
  const width = chart.width;
  const height = chart.height;
  const pad = { left: 64, right: 18, top: 18, bottom: 44 };

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);

  const maxMonths = Math.max(rowsA.length, rowsB.length);
  const maxBalance = Math.max(rowsA[0]?.balance ?? 0, rowsB[0]?.balance ?? 0);

  const mapX = (m) => pad.left + (m / Math.max(1, maxMonths)) * (width - pad.left - pad.right);
  const mapY = (bal) => pad.top + (1 - bal / Math.max(1, maxBalance)) * (height - pad.top - pad.bottom);

  ctx.strokeStyle = "#cad6e4";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, height - pad.bottom);
  ctx.lineTo(width - pad.right, height - pad.bottom);
  ctx.stroke();

  [0, 0.25, 0.5, 0.75, 1].forEach((tick) => {
    const value = maxBalance * (1 - tick);
    const y = pad.top + tick * (height - pad.top - pad.bottom);
    ctx.fillStyle = "#5f6b7a";
    ctx.font = "12px Inter, sans-serif";
    ctx.fillText(fmtCurrency.format(value), 5, y + 4);
    ctx.strokeStyle = "#eef3f9";
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
  });

  function plot(rows, color) {
    if (!rows.length) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    rows.forEach((row, i) => {
      const x = mapX(i + 1);
      const y = mapY(row.balance);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();
  }

  plot(rowsA, "#1f65d6");
  plot(rowsB, "#129364");

  ctx.fillStyle = "#5f6b7a";
  ctx.fillText("Months", width / 2 - 22, height - 12);
}

function runComparison() {
  try {
    const { loan1, loan2, scenario } = getInputs();
    const schedule1 = buildSchedule(loan1.loanAmount, loan1.rate, loan1.years, scenario);
    const schedule2 = buildSchedule(loan2.loanAmount, loan2.rate, loan2.years, scenario);

    renderSummary(summary1, schedule1, "Mortgage A");
    renderSummary(summary2, schedule2, "Mortgage B");
    renderTable(tableBody1, schedule1.rows);
    renderTable(tableBody2, schedule2.rows);
    drawChart(schedule1.rows, schedule2.rows);

    const interestDiff = schedule1.totalInterest - schedule2.totalInterest;
    const payoffDiff = schedule1.payoffMonths - schedule2.payoffMonths;

    const interestText =
      interestDiff === 0
        ? "Both mortgages have the same total interest"
        : `${interestDiff > 0 ? "Mortgage B" : "Mortgage A"} saves about ${fmtCurrency.format(Math.abs(interestDiff))} in total interest`;

    const payoffText =
      payoffDiff === 0
        ? "both finish in the same number of months."
        : `${payoffDiff > 0 ? "Mortgage B" : "Mortgage A"} pays off faster by ${Math.abs(payoffDiff)} months.`;

    comparisonBlurb.textContent = `${interestText}; ${payoffText}`;
  } catch (err) {
    comparisonBlurb.textContent = err.message;
  }
}

runComparison();
