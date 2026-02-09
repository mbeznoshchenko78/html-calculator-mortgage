export function calc(a, b, op) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    throw new Error("Invalid number");
  }

  switch (op) {
    case "add":
      return a + b;
    case "sub":
      return a - b;
    case "mul":
      return a * b;
    case "div":
      if (b === 0) {
        throw new Error("Division by zero");
      }
      return a / b;
    default:
      throw new Error("Unknown operation");
  }
}

const aEl = document.querySelector("#a");
const bEl = document.querySelector("#b");
const resultEl = document.querySelector("#result");

document.querySelectorAll("button[data-op]").forEach(button => {
  button.addEventListener("click", () => {
    try {
      const a = Number(aEl.value);
      const b = Number(bEl.value);
      const op = button.dataset.op;

      const value = calc(a, b, op);
      resultEl.textContent = value;
    } catch (err) {
      resultEl.textContent = err.message;
    }
  });
});
