# Mortgage Calculator Code Review

## Scope
Reviewed `index.html`, `app.js`, `style.css`, and ran lightweight runtime/syntax checks.

## Test results
- `node --check app.js` fails with a syntax error (`Unexpected identifier 'document'`), indicating JavaScript parse failure before app startup.
- Attempted browser smoke test with Playwright against a local `python -m http.server 8000`; the browser tool timed out before returning results.

## Bugs found
1. **Critical: JavaScript syntax is broken, app cannot run.**
   - `getInputs()` has an unterminated returned object/function block before code continues at top level.
   - This causes parse failure and prevents all calculator logic from executing.
2. **Critical: Large duplicated blocks of logic suggest accidental paste/merge corruption.**
   - `monthlyPayment`, `buildSchedule`, `validateNumber`, and `getInputs` appear duplicated mid-file.
   - Duplicate function declarations and partial blocks increase breakage risk and maintenance cost.
3. **Critical: `renderTable` has a missing closing brace in the first occurrence.**
   - After `rows.forEach(...)`, a new `function renderSummary(...)` starts immediately.
   - This structural error contributes to parse failure.
4. **Critical: Duplicate `const pad` declaration in `drawChart`.**
   - Redeclaring a `const` in the same scope is a syntax error.
5. **Potential correctness issue: comparison blurb does not handle ties.**
   - If interest or payoff differences are exactly `0`, logic still labels one mortgage as winner (`Mortgage A`).

## Suggested UI improvements
- Add inline validation states (error text and input border states) instead of only writing errors to `#comparisonBlurb`.
- Improve summary layout alignment for label/value pairs (current list styling is minimal and can be hard to scan).
- Add responsive behavior for large amortization tables (sticky first column and optional compact mode on mobile).
- Provide an explicit “Reset to defaults” button.
- Add keyboard/focus-visible styles for better accessibility.
- Consider adding chart tooltips and axis labels for readability.

## Suggested functionality improvements
- Let users set **different prepayment scenarios per mortgage** (currently one shared scenario).
- Add support for **property tax, insurance, PMI, HOA**, and show PITI vs principal+interest.
- Add **start date** support and display payoff date (calendar month/year).
- Export amortization tables to CSV.
- Add URL parameter/state persistence for sharing scenarios.
- Add unit tests for payment and schedule calculations, especially edge cases (0% rate, one-time payoff month beyond term, very high extra payments).
