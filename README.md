# Mortgage Comparison Calculator

A static HTML/CSS/JavaScript mortgage calculator that compares two loans side-by-side.

## Features
- Compare two mortgage scenarios with editable principal, rate, and term.
- Preloaded defaults:
  - Mortgage A: $290,000 @ 6.88% for 30 years
  - Mortgage B: $290,000 @ 5.88% for 20 years
- Independent prepayment settings for each mortgage:
  - Extra monthly prepayment
  - Annual lump-sum prepayment
  - One-time prepayment at a selected month
- Side-by-side summary metrics:
  - Monthly payment
  - Total interest
  - Total paid
  - Payoff time
- Visual comparison of remaining balances over time with chart hover hints.
- Full amortization schedules for each mortgage with CSV export.
- Inline form validation and a reset-to-defaults action.

## Run locally
Open `index.html` directly, or start a local server:

```bash
python -m http.server 8000
```
