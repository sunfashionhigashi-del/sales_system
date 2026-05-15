const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

const sourcePath = path.join(__dirname, '..', 'src', 'lib', 'exchangeRates.ts');
const source = fs
  .readFileSync(sourcePath, 'utf8')
  .replace("import { supabase } from './supabase'", 'const supabase = null');

const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;

const context = { exports: {}, require, console };
vm.createContext(context);
vm.runInContext(compiled, context);

const fx = context.exports;
const rates = [
  {
    rate_date: '2026-05-14',
    currency: 'USD',
    ttb_rate: 156.89,
    tts_rate: 158.89,
    is_business_day: true,
    previous_business_date: null,
  },
];

const state = {
  rates,
  adjustments: [
    {
      currency: 'USD',
      preferential_ttb_adjustment: 0.5,
      preferential_tts_adjustment: -0.5,
      effective_from: '2026-01-01',
      is_active: true,
    },
  ],
  annualRates: [
    {
      fiscal_year: 2026,
      currency: 'USD',
      budget_rate: 145,
      effective_from: '2026-01-01',
      effective_to: '2026-12-31',
    },
  ],
  rateMap: fx.buildExchangeRateMap(rates),
};

const baseRow = {
  sales_currency: 'USD',
  cost_currency: 'USD',
  sales_price: 100,
  cost_price: 60,
  qty: 10,
  exchange_rate: 1,
  internal_rate: '',
  order_date: '2026-05-14',
};

const cases = [
  {
    label: 'blank BL DATE uses annual budget',
    row: { ...baseRow, bl_date: '' },
    salesRate: 145,
    costRate: 145,
    status: '未確定: 年度採算為替を使用',
    profit: 58000,
  },
  {
    label: 'registered BL DATE uses MUFG plus preferential adjustments',
    row: { ...baseRow, bl_date: '2026-05-14' },
    salesRate: 157.39,
    costRate: 158.39,
    status: '為替マスター: 2026-05-14',
    profit: 62356,
  },
  {
    label: 'future unregistered BL DATE ignores exchange_rate 1',
    row: { ...baseRow, bl_date: '2026-05-15' },
    salesRate: 145,
    costRate: 145,
    status: '未確定: 年度採算為替を使用',
    profit: 58000,
  },
];

for (const testCase of cases) {
  const sales = fx.getAppliedRateDetail(testCase.row, 'sales', state);
  const cost = fx.getAppliedRateDetail(testCase.row, 'cost', state);
  const profit = fx.getLineProfitJPY(testCase.row, state);

  assert.equal(sales.appliedRate, testCase.salesRate, `${testCase.label}: sales rate`);
  assert.equal(cost.appliedRate, testCase.costRate, `${testCase.label}: cost rate`);
  assert.equal(fx.getExchangeRateStatusLabel(testCase.row, state), testCase.status, `${testCase.label}: status`);
  assert.equal(Math.round(profit), testCase.profit, `${testCase.label}: profit`);
}

console.log('exchange rate tests passed');
