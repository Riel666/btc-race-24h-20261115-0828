# Dip-Buy Bot — btc-race-24h-20261115-0828

A long-only mean-reversion bot that trades Coinbase Wrapped BTC (CBBTC)
against USDC minute by minute on make.fun's bars-replay harness.

## Strategy

- **Entry:** when the latest close is at least 2.2% below the close 60 bars
  ago (a sharp one-hour drop), buy with all available cash.
- **Exit:** sell the whole position when its value is 4% above its cost
  (take profit) or 2% below its cost (stop loss).
- Every order caps slippage at 100 bps past the close it was decided on.
- A full-size round trip pays about 26 bps in fees, slippage and price
  impact, so entries wait for a genuinely sharp drop rather than noise.

## Why this shape

The dev window falls about 4% over 24 hours with most of the move in one
sharp leg down and a fast rebound. Trend-following entries get whipsawed
there (the EMA-cross baselines lose money on it); buying only the sharp
drops and exiting on a fixed take-profit/stop-loss is the shape that ends
the dev window ahead after every fee.

## Files

- `main.ts` — the bot (Node 22, TypeScript with erasable syntax; entrypoint).
- `vendor/makefun_bars.py` — byte-identical copy of the kit's Python shim
  (`sdk/makefun_bars.py`), kept under `vendor/`.
- `LICENSE` — MIT.

## Run locally

Grade on the published dev window with the kit's own command line, from the
unpacked kit directory:

```
node cli/makefun.mjs grade-local --kit . --bot <this repository> --driver process
```
