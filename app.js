const fmtCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2
});

const defaults = {
  loanAmount1: 290000,
  rate1: 6.88,
  years1: 30,
  extraMonthly1: 0,
  extraAnnual1: 0,
  extraOneTime1: 0,
  oneTimeMonth1: 12,
  loanAmount2: 290000,
  rate2: 5.88,
  years2: 20,
  extraMonthly2: 0,
  extraAnnual2: 0,
  extraOneTime2: 0,
  oneTimeMonth2: 12
};

const inputs = {
  loanAmount1: document.querySelector("#loanAmount1"),
  rate1: document.querySelector("#rate1"),
  years1: document.querySelector("#years1"),
  extraMonthly1: document.querySelector("#extraMonthly1"),
  extraAnnual1: document.querySelector("#extraAnnual1"),
  extraOneTime1: document.querySelector("#extraOneTime1"),
  oneTimeMonth1: document.querySelector("#oneTimeMonth1"),
  loanAmount2: document.querySelector("#loanAmount2"),
  rate2: document.querySelector("#rate2"),
  years2: document.querySelector("#years2"),
  extraMonthly2: document.querySelector("#extraMonthly2"),
  extraAnnual2: document.querySelector("#extraAnnual2"),
  extraOneTime2: document.querySelector("#extraOneTime2"),
  oneTimeMonth2: document.querySelector("#oneTimeMonth2")
};

const summary1 = document.querySelector("#summary1");
const summary2 = document.querySelector("#summary2");
const tableBody1 = document.querySelector("#table1 tbody");
const tableBody2 = document.querySelector("#table2 tbody");
const chart = document.querySelector("#balanceChart");
const chartTooltip = document.querySelector("#chartTooltip");
const comparisonBlurb = document.querySelector("#comparisonBlurb");
const formError = document.querySelector("#formError");
const calculateBtn = document.querySelector("#calculateBtn");
const resetBtn = document.querySelector("#resetBtn");
const exportCsv1 = document.querySelector("#exportCsv1");
const exportCsv2 = document.querySelector("#exportCsv2");

let latestRows1 = [];
let latestRows2 = [];

calculateBtn.addEventListener("click", runComparison);
resetBtn.addEventListener("click", resetDefaults);
chart.addEventListener("mousemove", onChartHover);
chart.addEventListener("mouseleave", () => {
  chartTooltip.hidden = true;
});
exportCsv1.addEventListener("click", () => exportRowsToCsv(latestRows1, "mortgage-a-amortization.csv"));
exportCsv2.addEventListener("click", () => exportRowsToCsv(latestRows2, "mortgage-b-amortization.csv"));

Object.values(inputs).forEach((input) => {
  input.addEventListener("input", () => {
    input.classList.remove("invalid");
    formError.textContent = "";
  });
});

function monthlyPayment(principal, annualRatePct, years) {
  const monthlyRate = annualRatePct / 100 / 12;
  const months = years * 12;

  if (monthlyRate === 0) return principal / months;

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
    if (scenario.extraAnnual > 0 && month % 12 === 0) extra += scenario.extraAnnual;
    if (scenario.extraOneTime > 0 && month === scenario.oneTimeMonth) extra += scenario.extraOneTime;

    const appliedExtra = Math.min(Math.max(0, extra), Math.max(0, balance - scheduledPrincipal));
    const principal = Math.max(0, scheduledPrincipal + appliedExtra);
    const actualPayment = principal + interest;

    balance = Math.max(0, balance - principal);
    totalInterest += interest;
    totalPaid += actualPayment;

    rows.push({ month, payment: actualPayment, principal, interest, extra: appliedExtra, balance });
  }

  return {
    payment,
    rows,
    totalInterest,
    totalPaid,
    payoffMonths: rows.length
  };
}

function validateNumber(input, message, { min = 0, integer = false } = {}) {
  const num = Number(input.value);
  if (!Number.isFinite(num) || num < min) {
    input.classList.add("invalid");
    throw new Error(message);
  }

  if (integer && !Number.isInteger(num)) {
    input.classList.add("invalid");
    throw new Error(message);
  }

  input.classList.remove("invalid");
  return num;
}

function getInputs() {
  return {
    loan1: {
      loanAmount: validateNumber(inputs.loanAmount1, "Invalid loan amount for Mortgage A"),
      rate: validateNumber(inputs.rate1, "Invalid interest rate for Mortgage A"),
      years: validateNumber(inputs.years1, "Invalid years for Mortgage A", { min: 1, integer: true })
    },
    loan2: {
      loanAmount: validateNumber(inputs.loanAmount2, "Invalid loan amount for Mortgage B"),
      rate: validateNumber(inputs.rate2, "Invalid interest rate for Mortgage B"),
      years: validateNumber(inputs.years2, "Invalid years for Mortgage B", { min: 1, integer: true })
    },
    scenario1: {
      extraMonthly: validateNumber(inputs.extraMonthly1, "Invalid monthly prepayment for Mortgage A"),
      extraAnnual: validateNumber(inputs.extraAnnual1, "Invalid annual prepayment for Mortgage A"),
      extraOneTime: validateNumber(inputs.extraOneTime1, "Invalid one-time prepayment for Mortgage A"),
      oneTimeMonth: validateNumber(inputs.oneTimeMonth1, "Invalid one-time month for Mortgage A", { min: 1, integer: true })
    },
    scenario2: {
      extraMonthly: validateNumber(inputs.extraMonthly2, "Invalid monthly prepayment for Mortgage B"),
      extraAnnual: validateNumber(inputs.extraAnnual2, "Invalid annual prepayment for Mortgage B"),
      extraOneTime: validateNumber(inputs.extraOneTime2, "Invalid one-time prepayment for Mortgage B"),
      oneTimeMonth: validateNumber(inputs.oneTimeMonth2, "Invalid one-time month for Mortgage B", { min: 1, integer: true })
    }
  };
}

function monthsToYearsMonths(months) {
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return `${years}y ${rem}m (${months} months)`;
}

function renderSummary(el, schedule) {
  el.innerHTML = "";
  const entries = [
    ["Base Monthly Payment", fmtCurrency.format(schedule.payment)],
    ["Total Interest", fmtCurrency.format(schedule.totalInterest)],
    ["Total Paid", fmtCurrency.format(schedule.totalPaid)],
    ["Time to Payoff", monthsToYearsMonths(schedule.payoffMonths)]
  ];

  entries.forEach(([label, value]) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${label}</strong><span>${value}</span>`;
    el.append(li);
  });
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
  const pad = { left: 70, right: 20, top: 24, bottom: 46 };

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);

  const maxMonths = Math.max(rowsA.length, rowsB.length, 1);
  const maxBalance = Math.max(rowsA[0]?.balance ?? 0, rowsB[0]?.balance ?? 0, 1);

  const mapX = (m) => pad.left + (m / maxMonths) * (width - pad.left - pad.right);
  const mapY = (bal) => pad.top + (1 - bal / maxBalance) * (height - pad.top - pad.bottom);

  ctx.strokeStyle = "#c8d4e5";
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
    ctx.font = "12px sans-serif";
    ctx.fillText(fmtCurrency.format(value), 4, y + 4);
    ctx.strokeStyle = "#edf2f7";
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
  });

  [0, 0.25, 0.5, 0.75, 1].forEach((tick) => {
    const month = Math.round(maxMonths * tick);
    const x = mapX(month);
    ctx.fillStyle = "#5f6b7a";
    ctx.fillText(String(month), x - 10, height - 18);
  });

  const plot = (rows, color) => {
    if (!rows.length) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    rows.forEach((row, i) => {
      const x = mapX(i + 1);
      const y = mapY(row.balance);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();
  };

  plot(rowsA, "#2f6fed");
  plot(rowsB, "#20a16b");

  ctx.save();
  ctx.fillStyle = "#5f6b7a";
  ctx.fillText("Months", width / 2 - 20, height - 4);
  ctx.translate(16, height / 2 + 30);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Remaining Balance", 0, 0);
  ctx.restore();
}

function onChartHover(event) {
  if (!latestRows1.length && !latestRows2.length) {
    chartTooltip.hidden = true;
    return;
  }

  const rect = chart.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const monthGuess = Math.round((x / rect.width) * Math.max(latestRows1.length, latestRows2.length, 1));
  const month = Math.max(1, monthGuess);
  const rowA = latestRows1[Math.min(month - 1, Math.max(0, latestRows1.length - 1))];
  const rowB = latestRows2[Math.min(month - 1, Math.max(0, latestRows2.length - 1))];

  chartTooltip.textContent = `Month ${month}: A ${fmtCurrency.format(rowA?.balance ?? 0)} | B ${fmtCurrency.format(rowB?.balance ?? 0)}`;
  chartTooltip.hidden = false;
}

function exportRowsToCsv(rows, filename) {
  if (!rows.length) return;
  const lines = ["Month,Payment,Principal,Interest,Extra,Balance"];
  rows.forEach((row) => {
    lines.push([
      row.month,
      row.payment.toFixed(2),
      row.principal.toFixed(2),
      row.interest.toFixed(2),
      row.extra.toFixed(2),
      row.balance.toFixed(2)
    ].join(","));
  });

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function resetDefaults() {
  Object.entries(defaults).forEach(([key, value]) => {
    inputs[key].value = String(value);
    inputs[key].classList.remove("invalid");
  });

  formError.textContent = "";
  runComparison();
}

function buildComparisonBlurb(schedule1, schedule2) {
  const interestDiff = schedule1.totalInterest - schedule2.totalInterest;
  const payoffDiff = schedule1.payoffMonths - schedule2.payoffMonths;

  const interestText = interestDiff === 0
    ? "Both mortgages have the same total interest cost"
    : `${interestDiff > 0 ? "Mortgage B" : "Mortgage A"} saves about ${fmtCurrency.format(Math.abs(interestDiff))} in total interest`;

  const payoffText = payoffDiff === 0
    ? "both mortgages pay off in the same time"
    : `${payoffDiff > 0 ? "Mortgage B" : "Mortgage A"} pays off faster by ${Math.abs(payoffDiff)} months`;

  return `${interestText}. ${payoffText}.`;
}

function runComparison() {
  try {
    formError.textContent = "";
    const { loan1, loan2, scenario1, scenario2 } = getInputs();
    const schedule1 = buildSchedule(loan1.loanAmount, loan1.rate, loan1.years, scenario1);
    const schedule2 = buildSchedule(loan2.loanAmount, loan2.rate, loan2.years, scenario2);

    latestRows1 = schedule1.rows;
    latestRows2 = schedule2.rows;

    renderSummary(summary1, schedule1);
    renderSummary(summary2, schedule2);
    renderTable(tableBody1, schedule1.rows);
    renderTable(tableBody2, schedule2.rows);
    drawChart(schedule1.rows, schedule2.rows);

    comparisonBlurb.textContent = buildComparisonBlurb(schedule1, schedule2);
  } catch (err) {
    formError.textContent = err.message;
    comparisonBlurb.textContent = "";
  }
}

runComparison();
