export const masterColMap: Record<string, string> = {
  id: 'システムID',
  customer_code: '販売先コード',
  supplier_code: '仕入先コード',
  item_code: '当社品番',
  supplier_item_code: 'メーカー品番',
  company_type: '会社種類',
  company_type_position: '種類位置(前/後)',
  company_name: '会社名',
  postal_code: '郵便番号',
  address: '住所',
  phone: '電話番号',
  fax: 'FAX番号',
  email: 'メールアドレス',
  contact_person: '担当者',
  payment_terms: '支払/回収条件',
  markup_rate: '基準掛率',
  notes: '備考',
  category: 'カテゴリ',
  item_name: '品名',
  origin: '原産国',
  package_qty: '仕立/入数',
  package_unit: '仕立単位',
  unit: '基本単位',
  size: 'サイズ',
  cost_price: '仕入価格',
  cost_currency: '仕入通貨',
  base_sales_price: '基本販売価格',
  sales_currency: '販売通貨',
  effective_date: '価格適用開始日',
  color_exception: '例外カラー',
  created_at: '作成日時',
  updated_at: '更新日時'
};

export const translateMasterCol = (key: string): string => {
  return masterColMap[key] || key;
};
