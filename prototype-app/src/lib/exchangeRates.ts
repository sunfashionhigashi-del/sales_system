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

export type AnnualExchangeRate = {
  fiscal_year: number | string
  currency: string
  budget_rate: number | string
  effective_from: string
  effective_to: string
}

export type ExchangeRateState = {
  rates: ExchangeRateRow[]
  adjustments: ExchangeRateAdjustment[]
  annualRates: AnnualExchangeRate[]
  rateMap?: Map<string, ExchangeRateRow>
}

type RateSide = 'sales' | 'cost'
type RateSource = 'master' | 'manual-final' | 'annual-budget' | 'internal' | 'default' | 'domestic'

const DEFAULT_RATE = 145

type OrderLike = Record<string, unknown>

export type AppliedRateDetail = {
  side: RateSide
  currency: string
  appliedRate: number
  baseRate: number
  adjustment: number
  source: RateSource
  rateDate: string
  referenceDate: string
  isBusinessDay?: boolean | null
}

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
  const [{ data: rates }, { data: adjustments }, { data: annualRates }] = await Promise.all([
    supabase
      .from('mufg_exchange_rates')
      .select('rate_date,currency,ttb_rate,tts_rate,previous_business_date,is_business_day'),
    supabase
      .from('exchange_rate_adjustments')
      .select('currency,customer_code,supplier_code,preferential_ttb_adjustment,preferential_tts_adjustment,effective_from,effective_to,priority,is_active')
      .eq('is_active', true)
      .order('priority', { ascending: true }),
    supabase
      .from('annual_exchange_rates')
      .select('fiscal_year,currency,budget_rate,effective_from,effective_to'),
  ])

  return {
    rates: rates ?? [],
    adjustments: adjustments ?? [],
    annualRates: annualRates ?? [],
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

const resolveBudgetDate = (data: OrderLike) =>
  normalizeDate(data?.bl_date) || normalizeDate(data?.order_date) || new Date().toISOString().slice(0, 10)

export const getFiscalYearFromDate = (value: unknown) => {
  const normalized = normalizeDate(value)
  if (!normalized) return null
  const year = Number(normalized.slice(0, 4))
  const month = Number(normalized.slice(5, 7))
  if (!year || !month) return null
  return month >= 6 ? year : year - 1
}

const findAnnualRate = (data: OrderLike, side: RateSide, state: ExchangeRateState) => {
  const currency = normalizeCurrency(side === 'sales' ? data?.sales_currency : data?.cost_currency)
  const targetDate = resolveBudgetDate(data)
  const targetFiscalYear = getFiscalYearFromDate(targetDate)

  const candidates = state.annualRates.filter((rate) => {
    if (normalizeCurrency(rate.currency) !== currency) return false
    const from = normalizeDate(rate.effective_from)
    const to = normalizeDate(rate.effective_to)
    if (from && targetDate < from) return false
    if (to && targetDate > to) return false
    return true
  })
  if (candidates.length > 0) return candidates[0]

  return state.annualRates.find((rate) => {
    if (normalizeCurrency(rate.currency) !== currency) return false
    const fiscalYear = Number(rate.fiscal_year)
    if (!targetFiscalYear) return false
    if (!normalizeDate(rate.effective_from) && !normalizeDate(rate.effective_to)) {
      return fiscalYear === targetFiscalYear
    }
    const expectedFrom = `${fiscalYear}-06-01`
    const expectedTo = `${fiscalYear + 1}-05-31`
    if (targetDate < expectedFrom || targetDate > expectedTo) return false
    return fiscalYear === targetFiscalYear
  })
}

export const getAppliedRateDetail = (
  data: OrderLike,
  side: RateSide,
  state: ExchangeRateState,
) => {
  const currency = normalizeCurrency(side === 'sales' ? data?.sales_currency : data?.cost_currency)
  if (currency === 'JPY') {
    return {
      side,
      currency,
      appliedRate: 1,
      baseRate: 1,
      adjustment: 0,
      source: 'domestic',
      rateDate: '',
      referenceDate: '',
    } satisfies AppliedRateDetail
  }

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

      return {
        side,
        currency,
        appliedRate: baseRate + adjustmentValue,
        baseRate,
        adjustment: adjustmentValue,
        source: 'master',
        rateDate,
        referenceDate: baseRateRow.previous_business_date || baseRateRow.rate_date,
        isBusinessDay: baseRateRow.is_business_day,
      } satisfies AppliedRateDetail
    }

    const manualFinalRate = toNumber(data?.exchange_rate)
    if (manualFinalRate > 1) {
      return {
        side,
        currency,
        appliedRate: manualFinalRate,
        baseRate: manualFinalRate,
        adjustment: 0,
        source: 'manual-final',
        rateDate,
        referenceDate: '',
      } satisfies AppliedRateDetail
    }
  }

  const manualInternalRate = toNumber(data?.internal_rate)
  if (manualInternalRate) {
    return {
      side,
      currency,
      appliedRate: manualInternalRate,
      baseRate: manualInternalRate,
      adjustment: 0,
      source: 'internal',
      rateDate,
      referenceDate: '',
    } satisfies AppliedRateDetail
  }

  const annualRate = findAnnualRate(data, side, state)
  if (annualRate) {
    const budgetRate = toNumber(annualRate.budget_rate)
    return {
      side,
      currency,
      appliedRate: budgetRate,
      baseRate: budgetRate,
      adjustment: 0,
      source: 'annual-budget',
      rateDate,
      referenceDate: normalizeDate(annualRate.effective_from),
    } satisfies AppliedRateDetail
  }

  return {
    side,
    currency,
    appliedRate: DEFAULT_RATE,
    baseRate: DEFAULT_RATE,
    adjustment: 0,
    source: 'default',
    rateDate,
    referenceDate: '',
  } satisfies AppliedRateDetail
}

export const getAppliedRate = (
  data: OrderLike,
  side: RateSide,
  state: ExchangeRateState,
) => {
  return getAppliedRateDetail(data, side, state).appliedRate
}

export const getExchangeRateStatusLabel = (data: OrderLike, state: ExchangeRateState) => {
  const sales = getAppliedRateDetail(data, 'sales', state)
  const cost = getAppliedRateDetail(data, 'cost', state)
  const details = [sales, cost].filter((item) => item.currency !== 'JPY')
  if (details.length === 0) return '円建て'

  const master = details.find((item) => item.source === 'master')
  if (master) {
    return master.isBusinessDay === false
      ? `為替マスター: ${master.rateDate}（参照 ${master.referenceDate}）`
      : `為替マスター: ${master.rateDate}`
  }

  if (details.some((item) => item.source === 'manual-final')) return '為替マスター未登録: 実勢為替を使用'
  if (details.some((item) => item.source === 'internal')) return '未確定: 社内採算為替を使用'
  if (details.some((item) => item.source === 'annual-budget')) return '未確定: 年度採算為替を使用'
  return '未確定: 既定145を使用'
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
