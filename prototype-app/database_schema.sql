-- Supabase プロジェクトの SQL Editor で実行して、販売管理システム用のテーブルを作成してください。
-- すでに古いテーブルがある場合は、一度このスクリプトを通してDROP・再作成します。

DROP TABLE IF EXISTS order_items;

-- 1. order_items (販売管理メインテーブル) の作成
CREATE TABLE IF NOT EXISTS order_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  status text NOT NULL DEFAULT '見積中',
  quote_no text,
  order_date text,
  order_id text,
  rep text,
  customer text,
  end_user text,
  supplier text,
  
  category text,
  item_code text,
  item_size text,
  item_color text,
  item_name text,
  origin text,
  qty integer,
  unit text,
  
  cost_price numeric,
  cost_currency text DEFAULT 'JPY',
  markup_rate text,
  sales_price numeric,
  end_user_price numeric,
  sales_currency text DEFAULT 'USD',
  misc_cost numeric,
  misc_currency text DEFAULT 'JPY',
  
  exchange_rate numeric, -- 実勢為替 (BL時点レートなど、インボイス用参考)
  internal_rate numeric, -- 社内採算為替 (見積時の為替予約など、粗利計算ベース)

  factory_date text,
  bl_date text,
  po_date text,
  po_no text,
  invoice_date text,
  invoice_no text,
  link_id text,
  comments text,
  locked boolean DEFAULT false,
  revision integer DEFAULT 0,
  
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security) の設定
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read access"
  ON order_items FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert access"
  ON order_items FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update access"
  ON order_items FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous delete access"
  ON order_items FOR DELETE USING (true);

-- 2. ダミーデータの挿入
INSERT INTO order_items (
  status, quote_no, order_date, order_id, rep, customer, end_user, supplier,
  category, item_code, item_size, item_color, item_name, origin, qty, unit,
  cost_price, cost_currency, markup_rate, sales_price, sales_currency, misc_cost, misc_currency,
  exchange_rate, internal_rate, factory_date, bl_date, po_no, invoice_no, po_date, invoice_date, comments
) VALUES 
(
  '発注済', 'QT-260320-01', '2026/04/01', 'ABC-123', '松岡', 'Shanghai Sub', '', 'A社',
  'PUテープ', 'MW-0806T', '8000D 6mm', '透明(Clear)', 'モビロンテープ', 'JP', 20, 'kg',
  120.0, 'JPY', '1.5', 200.0, 'USD', 50, 'JPY',
  148.50, 145.00, '2026/04/10', '2026/04/15', 'PO-260401-A-01', 'INV-SH-001', '2026/04/02', '', '特になし'
),
(
  '請求待ち', 'QT-260325-05', '2026/04/02', 'USPO-9876', '松岡', 'NY Sub', '', '国内メーカーB',
  'リボン', 'RIBBON-001', '9mm', '赤(Red)', 'サテンリボン', 'CN', 500, 'Roll',
  50.0, 'CNY', '1.3', 80.0, 'JPY', 0, 'JPY',
  21.50, 20.00, '2026/04/05', '2026/04/08', 'PO-260402-B-01', '', '2026/04/02', '', '前受け不要'
),
(
  '見積中', '', '', '', '大谷', '米国客先C', '', '栄レース',
  'レース', 'R-F-0099', '20mm', '黒(Black)', 'ストレッチレース', 'JP', 1000, 'm',
  15.5, 'JPY', '手動(ﾏﾆｭｱﾙ)', 22.0, 'USD', 0, 'JPY',
  152.00, 150.00, '', '', '', '', '', '', '見積回答待ち'
);
