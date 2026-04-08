-- Supabase プロジェクトの SQL Editor で実行して、販売管理システム用のテーブルを作成してください。
-- すでに古いテーブルがある場合は、一度このスクリプトを通してDROP・再作成します。

DROP TABLE IF EXISTS order_items;

-- 1. order_items (販売管理メインテーブル) の作成
CREATE TABLE IF NOT EXISTS order_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  status text NOT NULL DEFAULT '見積中',
  quote_no text,
  order_date text,
  customer_po text,
  rep text,
  customer text,
  end_user text,
  supplier text,
  
  category text,
  item_code text,
  supplier_item_code text,
  item_size text,
  item_color text,
  item_name text,
  origin text,
  qty numeric,
  unit text,
  package_qty numeric,
  package_unit text,
  
  cost_price numeric,
  cost_currency text DEFAULT 'JPY',
  markup_rate text,
  sales_price numeric,
  sales_currency text DEFAULT 'USD',
  end_user_price numeric,
  end_user_currency text DEFAULT 'USD',
  misc_cost numeric,
  misc_currency text DEFAULT 'JPY',
  
  exchange_rate numeric, -- 実勢為替 (BL時点レートなど、インボイス用参考)
  internal_rate numeric, -- 社内採算為替 (見積時の為替予約など、粗利計算ベース)

  factory_date text,
  bl_date text,
  po_date text,
  order_no text,
  invoice_date text,
  invoice_no text,
  link_id text,
  comments text,
  system_log text,
  locked boolean DEFAULT false,
  archived boolean DEFAULT false,
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
  status, quote_no, order_date, customer_po, rep, customer, end_user, supplier,
  category, item_code, supplier_item_code, item_size, item_color, item_name, origin, qty, unit, package_qty, package_unit,
  cost_price, cost_currency, markup_rate, sales_price, sales_currency, misc_cost, misc_currency,
  exchange_rate, internal_rate, factory_date, bl_date, order_no, invoice_no, po_date, invoice_date, comments
) VALUES 
(
  '発注済', 'QT-260320-01', '2026/04/01', 'ABC-123', '松岡', 'Shanghai Sub', '', 'A社',
  'PUテープ', 'MW-0806T', '', '8000D 6mm', '透明(Clear)', 'モビロンテープ', 'JP', 20, 'kg', 1, 'bag',
  120.0, 'JPY', '1.5', 200.0, 'USD', 50, 'JPY',
  148.50, 145.00, '2026/04/10', '2026/04/15', 'PO-260401-A-01', 'INV-SH-001', '2026/04/02', '', '特になし'
),
(
  '請求待ち', 'QT-260325-05', '2026/04/02', 'USPO-9876', '松岡', 'NY Sub', '', '国内メーカーB',
  'リボン', 'RIBBON-001', '', '9mm', '赤(Red)', 'サテンリボン', 'CN', 500, 'Roll', 30, 'm',
  50.0, 'CNY', '1.3', 80.0, 'JPY', 0, 'JPY',
  21.50, 20.00, '2026/04/05', '2026/04/08', 'PO-260402-B-01', '', '2026/04/02', '', '前受け不要'
),
(
  '見積中', '', '', '', '大谷', '米国客先C', '', '栄レース',
  'レース', 'R-F-0099', '', '20mm', '黒(Black)', 'ストレッチレース', 'JP', 1000, 'm', 100, 'm',
  15.5, 'JPY', '手動(ﾏﾆｭｱﾙ)', 22.0, 'USD', 0, 'JPY',
  152.00, 150.00, '', '', '', '', '', '', '見積回答待ち'
);

-- ==========================================
-- マスター用テーブルの追加
-- ==========================================

-- 3. 仕入先マスター (suppliers)
DROP TABLE IF EXISTS suppliers CASCADE;
CREATE TABLE suppliers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_code text UNIQUE,
  company_type text,             -- 株式会社、有限会社 など
  company_type_position text,    -- 前株、後株、なし
  company_name text NOT NULL,
  postal_code text,
  address text,
  phone text,
  fax text,
  email text,
  contact_person text,
  payment_terms text,            -- 締日・支払日
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read access suppliers" ON suppliers FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert access suppliers" ON suppliers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update access suppliers" ON suppliers FOR UPDATE USING (true);

-- 4. 製品マスター 基本設定 (products) - 親テーブル
DROP TABLE IF EXISTS products CASCADE;
CREATE TABLE products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  item_code text UNIQUE NOT NULL,        -- 当社品番 (例: TAPE-001)
  supplier_item_code text,               -- メーカー品番 / 仕入先品番
  category text,                         -- カテゴリ (PUテープ、リボンなど)
  item_name text,                        -- 品名
  package_qty numeric,                   -- 入り数・仕立て数量 (例: 50)
  package_unit text,                     -- 入り数・仕立て単位 (例: m)
  unit text,                             -- 販売・仕入単位 (例: Roll)
  origin text,                           -- 原産国 (例: JP, CNなど)
  notes text,                            -- 備考
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read access products" ON products FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert access products" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update access products" ON products FOR UPDATE USING (true);

-- 5. 価格・サイズ展開マスター (product_prices) - 子テーブル
DROP TABLE IF EXISTS product_prices CASCADE;
CREATE TABLE product_prices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  item_code text NOT NULL,               -- 当社品番で親と紐付け
  size text NOT NULL,                    -- サイズ (10mm, S など。サイズ無しの場合は '-')
  cost_price numeric NOT NULL,           -- 仕入価格
  cost_currency text DEFAULT 'JPY',      -- 仕入通貨
  base_sales_price numeric,              -- 基本販売価格（定価的なものがある場合）
  sales_currency text DEFAULT 'JPY',     -- 販売通貨
  effective_date date NOT NULL,          -- 価格適用開始日
  color_exception text,                  -- 例外カラー (特染め、金・銀など。通常は空白)
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE product_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read access product_prices" ON product_prices FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert access product_prices" ON product_prices FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update access product_prices" ON product_prices FOR UPDATE USING (true);

-- 6. 販売先マスター (customers)
DROP TABLE IF EXISTS customers CASCADE;
CREATE TABLE customers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_code text UNIQUE,
  company_type text,             -- 株式会社、有限会社 など
  company_type_position text,    -- 前株、後株、なし
  company_name text NOT NULL,
  postal_code text,
  address text,
  phone text,
  fax text,
  email text,
  contact_person text,
  payment_terms text,            -- 締日・支払日
  markup_rate text,              -- 掛け率（手動入力・任意）
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read access customers" ON customers FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert access customers" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update access customers" ON customers FOR UPDATE USING (true);

-- ==========================================
-- 監査ログ関連 (Phase 3)
-- ==========================================

-- 7. 監査ログテーブル (audit_logs)
DROP TABLE IF EXISTS audit_logs CASCADE;
CREATE TABLE audit_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id uuid,                           -- 外部キー制約を外す（DELETE時のログ保存のため）
    action text NOT NULL,                    -- INSERT, UPDATE, DELETE
    user_name text DEFAULT 'system',         -- 操作ユーザー（Supabaseのauth.uid()やAPIリクエストから）
    changes_json jsonb,                      -- 変更前後の差異などを記録
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read access audit_logs" ON audit_logs FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert access audit_logs" ON audit_logs FOR INSERT WITH CHECK (true);

-- 8. 監査ログ記録用トリガー関数 (PostgreSQL Trigger)
CREATE OR REPLACE FUNCTION log_order_changes()
RETURNS trigger AS $$
DECLARE
    changed_data jsonb;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- 古い行と新しい行を比較し、変更があったカラムだけを抽出する実装例（簡易版として全体を保存）
        changed_data := jsonb_build_object(
            'old', row_to_json(OLD),
            'new', row_to_json(NEW)
        );
        INSERT INTO audit_logs (order_id, action, user_name, changes_json)
        VALUES (NEW.id, 'UPDATE', coalesce(current_setting('request.jwt.claims', true)::jsonb->>'email', 'system_update'), changed_data);
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        changed_data := jsonb_build_object('new', row_to_json(NEW));
        INSERT INTO audit_logs (order_id, action, user_name, changes_json)
        VALUES (NEW.id, 'INSERT', coalesce(current_setting('request.jwt.claims', true)::jsonb->>'email', 'system_insert'), changed_data);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        changed_data := jsonb_build_object('old', row_to_json(OLD));
        INSERT INTO audit_logs (order_id, action, user_name, changes_json)
        VALUES (OLD.id, 'DELETE', coalesce(current_setting('request.jwt.claims', true)::jsonb->>'email', 'system_delete'), changed_data);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガーの登録 (order_itemsへの変更を監視)
DROP TRIGGER IF EXISTS trigger_log_order_changes ON order_items;
CREATE TRIGGER trigger_log_order_changes
    AFTER INSERT OR UPDATE OR DELETE ON order_items
    FOR EACH ROW EXECUTE FUNCTION log_order_changes();
