-- Exchange rate master tables for SUCCESS.
-- Run this in the Supabase SQL Editor before using the exchange-rate tabs in Master.
-- The tables are additive and do not drop existing business data.

CREATE TABLE IF NOT EXISTS annual_exchange_rates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  fiscal_year integer NOT NULL,
  currency text NOT NULL,
  budget_rate numeric NOT NULL,
  effective_from date NOT NULL,
  effective_to date NOT NULL,
  memo text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (fiscal_year, currency)
);

ALTER TABLE annual_exchange_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read access annual_exchange_rates"
  ON annual_exchange_rates FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert access annual_exchange_rates"
  ON annual_exchange_rates FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update access annual_exchange_rates"
  ON annual_exchange_rates FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete access annual_exchange_rates"
  ON annual_exchange_rates FOR DELETE USING (true);

CREATE TABLE IF NOT EXISTS mufg_exchange_rates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  rate_date date NOT NULL,
  currency text NOT NULL,
  ttb_rate numeric NOT NULL,
  tts_rate numeric NOT NULL,
  source_date date,
  source_name text DEFAULT 'MUFG',
  source_url text,
  is_business_day boolean DEFAULT true,
  previous_business_date date,
  fetched_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (rate_date, currency)
);

ALTER TABLE mufg_exchange_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read access mufg_exchange_rates"
  ON mufg_exchange_rates FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert access mufg_exchange_rates"
  ON mufg_exchange_rates FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update access mufg_exchange_rates"
  ON mufg_exchange_rates FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete access mufg_exchange_rates"
  ON mufg_exchange_rates FOR DELETE USING (true);

CREATE TABLE IF NOT EXISTS exchange_rate_adjustments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  adjustment_name text NOT NULL,
  currency text NOT NULL,
  customer_code text,
  supplier_code text,
  preferential_ttb_adjustment numeric DEFAULT 0,
  preferential_tts_adjustment numeric DEFAULT 0,
  effective_from date NOT NULL,
  effective_to date,
  priority integer DEFAULT 100,
  is_active boolean DEFAULT true,
  memo text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE exchange_rate_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read access exchange_rate_adjustments"
  ON exchange_rate_adjustments FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert access exchange_rate_adjustments"
  ON exchange_rate_adjustments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update access exchange_rate_adjustments"
  ON exchange_rate_adjustments FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete access exchange_rate_adjustments"
  ON exchange_rate_adjustments FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_mufg_exchange_rates_date_currency
  ON mufg_exchange_rates (rate_date, currency);

CREATE INDEX IF NOT EXISTS idx_annual_exchange_rates_year_currency
  ON annual_exchange_rates (fiscal_year, currency);

CREATE INDEX IF NOT EXISTS idx_exchange_rate_adjustments_lookup
  ON exchange_rate_adjustments (currency, is_active, effective_from, effective_to, priority);

COMMENT ON TABLE annual_exchange_rates IS
  'Annual budget rates manually set by management for in-year profitability checks before shipment finalization.';
COMMENT ON TABLE mufg_exchange_rates IS
  'Daily MUFG public TTB/TTS rates. For non-business BL DATEs, store the previous business day rate under the BL DATE with previous_business_date populated.';
COMMENT ON TABLE exchange_rate_adjustments IS
  'Preferential rate adjustments applied after MUFG base TTB/TTS rates are collected.';
