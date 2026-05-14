import { supabase } from './supabase'

export type ExchangeRateRow = {
  rate_date: string
  currency: string
  ttb_rate: number | string
  tts_rate: number | string
  previous_business_date?: string | null
  is_business_day?: boolean | null
}

export type ExchangeRateAdjustment = {
  currency: string
  customer_code?: string | null
  supplier_code?: string | null
  preferential_ttb_adjustment?: number | string | null
  preferential_tts_adjustment?: number | string | null
  effective_from: string
  effective_to?: string | null
  priority?: number | null
  is_active?: boolean | null
}

export type ExchangeRateState = {
  rates: ExchangeRateRow[]
  adjustments: ExchangeRateAdjustment[]
  rateMap?: Map<string, ExchangeRateRow>
}

type RateSide = 'sales' | 'cost'

const DEFAULT_RATE = 145

type OrderLike = Record<string, unknown>

export const toNumber = (value: unknown) => {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}

export const normalizeCurrency = (value: unknown) => String(value || 'JPY').trim().toUpperCase()

export const normalizeDate = (value: unknown) => {
  if (!value) return ''
  const raw = String(value).trim()
  if (!raw) return ''
  const match = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (!match) return ''
  const [, y, m, d] = match
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

export const fetchExchangeRateState = async (): Promise<ExchangeRateState> => {
  const [{ data: rates }, { data: adjustments }] = await Promise.all([
    supabase
      .from('mufg_exchange_rates')
      .select('rate_date,currency,ttb_rate,tts_rate,previous_business_date,is_business_day'),
    supabase
      .from('exchange_rate_adjustments')
      .select('currency,customer_code,supplier_code,preferential_ttb_adjustment,preferential_tts_adjustment,effective_from,effective_to,priority,is_active')
      .eq('is_active', true)
      .order('priority', { ascending: true }),
  ])

  return {
    rates: rates ?? [],
    adjustments: adjustments ?? [],
    rateMap: buildExchangeRateMap(rates ?? []),
  }
}

export const makeExchangeRateKey = (date: string, currency: string) =>
  `${normalizeDate(date)}::${normalizeCurrency(currency)}`

export const buildExchangeRateMap = (rates: ExchangeRateRow[]) => {
  const map = new Map<string, ExchangeRateRow>()
  rates.forEach((rate) => {
    map.set(makeExchangeRateKey(rate.rate_date, rate.currency), rate)
  })
  return map
}

const adjustmentApplies = (
  adjustment: ExchangeRateAdjustment,
  data: OrderLike,
  currency: string,
  rateDate: string,
) => {
  if (normalizeCurrency(adjustment.currency) !== currency) return false
  if (adjustment.customer_code && adjustment.customer_code !== data?.customer_code && adjustment.customer_code !== data?.customer) return false
  if (adjustment.supplier_code && adjustment.supplier_code !== data?.supplier_code && adjustment.supplier_code !== data?.supplier) return false

  const from = normalizeDate(adjustment.effective_from)
  const to = normalizeDate(adjustment.effective_to)
  if (from && rateDate < from) return false
  if (to && rateDate > to) return false
  return true
}

export const getAppliedRate = (
  data: OrderLike,
  side: RateSide,
  state: ExchangeRateState,
) => {
  const currency = normalizeCurrency(side === 'sales' ? data?.sales_currency : data?.cost_currency)
  if (currency === 'JPY') return 1

  const rateDate = normalizeDate(data?.bl_date)
  if (rateDate) {
    const rateMap = state.rateMap ?? buildExchangeRateMap(state.rates)
    const baseRateRow = rateMap.get(makeExchangeRateKey(rateDate, currency))

    if (baseRateRow) {
      const baseRate = side === 'sales' ? toNumber(baseRateRow.ttb_rate) : toNumber(baseRateRow.tts_rate)
      const adjustment = state.adjustments.find((item) => adjustmentApplies(item, data, currency, rateDate))
      const adjustmentValue = side === 'sales'
        ? toNumber(adjustment?.preferential_ttb_adjustment)
        : toNumber(adjustment?.preferential_tts_adjustment)

      return baseRate + adjustmentValue
    }

    const manualFinalRate = toNumber(data?.exchange_rate)
    if (manualFinalRate) return manualFinalRate
  }

  return toNumber(data?.internal_rate) || DEFAULT_RATE
}

export const getLineSalesJPY = (data: OrderLike, state: ExchangeRateState) => {
  const qty = toNumber(data?.qty)
  const salesPrice = toNumber(data?.sales_price)
  if (!qty || !salesPrice) return 0
  const rate = getAppliedRate(data, 'sales', state)
  return salesPrice * rate * qty
}

export const getLineCostJPY = (data: OrderLike, state: ExchangeRateState) => {
  const qty = toNumber(data?.qty)
  const costPrice = toNumber(data?.cost_price)
  if (!qty || !costPrice) return 0
  const rate = getAppliedRate(data, 'cost', state)
  return costPrice * rate * qty
}

export const getLineProfitJPY = (data: OrderLike, state: ExchangeRateState) => {
  const qty = toNumber(data?.qty)
  const salesPrice = toNumber(data?.sales_price)
  const costPrice = toNumber(data?.cost_price)
  if (!qty || !salesPrice || !costPrice) return null

  const salesJPY = getLineSalesJPY(data, state)
  const costJPY = getLineCostJPY(data, state)
  const miscJPY = toNumber(data?.misc_cost)
  return salesJPY - costJPY - miscJPY
}
