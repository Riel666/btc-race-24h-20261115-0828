// Dip-buy bot for make.fun btc-race-24h-20261115-0828.
//
// Strategy: long-only mean reversion on sharp intraday drops of Coinbase
// Wrapped BTC (CBBTC) against USDC, traded minute by minute on the
// bars-replay harness.
//
//   - Entry: when the latest close is at least 2.2% below the close 60 bars
//     ago (a sharp one-hour drop), buy with all available cash. The drop is
//     measured on closes only, so the signal is known exactly when the batch
//     arrives.
//   - Exit: sell the whole position when its value is 4% above its cost
//     (take profit) or 2% below its cost (stop loss). Cost is the sum of the
//     notionals spent, exactly as the harness books it.
//   - Every order caps slippage at 100 bps past the close it was decided on.
//   - No network, no wall clock, no environment reads: the only state is the
//     list of closes seen and the account the harness reports each batch, so
//     two executions on the same bars send the same orders.
//
// A full-size round trip pays about 26 bps in fees, slippage and price
// impact, so entries wait for a genuinely sharp drop rather than noise.

import { BPS, runBars, type BarsState, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const LOOKBACK_BARS = 60;
const DROP_BPS = 220;
const TAKE_PROFIT_BPS = 400;
const STOP_LOSS_BPS = 200;
const MAX_SLIPPAGE_BPS = 100;
// Plain number copy of the SDK's bigint BPS, for the close comparison.
const BPS_NUM = 10000;

const closes: number[] = [];

await runBars({
  onBatch(state: BarsState, batch) {
    for (const bar of batch.bars) {
      if (bar.symbol === SYMBOL) closes.push(Number(bar.c));
    }
    if (state.warmingUp) return [];
    const held = state.positions.get(SYMBOL);
    if (held !== undefined) {
      const value = state.value(SYMBOL, held.qty);
      if (value * BPS >= held.cost * (BPS + BigInt(TAKE_PROFIT_BPS))) {
        const sell: SellInput = { side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS };
        return [sell];
      }
      if (value * BPS <= held.cost * (BPS - BigInt(STOP_LOSS_BPS))) {
        const sell: SellInput = { side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS };
        return [sell];
      }
      return [];
    }
    if (closes.length > LOOKBACK_BARS) {
      const now = closes[closes.length - 1];
      const then = closes[closes.length - 1 - LOOKBACK_BARS];
      if (now * BPS_NUM <= then * (BPS_NUM - DROP_BPS)) {
        const amount = state.cash;
        if (amount >= BigInt(state.hello.fees.min_notional_quote_units)) {
          const buy: BuyInput = { side: 'buy', symbol: SYMBOL, notional_quote_units: amount, max_slippage_bps: MAX_SLIPPAGE_BPS };
          return [buy];
        }
      }
    }
    return [];
  },
});
