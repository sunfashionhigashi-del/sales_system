import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

interface OrderDetailModalProps {
  data: any;
  onClose: () => void;
  onSave: (updatedData: any) => void;
}

const OrderDetailModal = ({ data, onClose, onSave }: OrderDetailModalProps) => {
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    setFormData(data ? { ...data } : {});
  }, [data]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  if (!data) return null;

  const inputStyle = "w-full border border-gray-300 rounded p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white";
  const labelStyle = "block text-xs font-bold text-gray-500 mb-1 tracking-wider";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4">
      <div className="bg-gray-50 flex flex-col rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-900 text-white shrink-0">
          <h2 className="text-lg font-bold flex items-center tracking-widest">
            <span className="bg-blue-600 px-2 py-1 rounded text-xs mr-3 font-mono">ID: {formData.id?.slice(0,8)}</span>
            オーダー詳細・直接入力
          </h2>
          <div className="flex items-center space-x-3">
             <button onClick={handleSave} className="flex items-center bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded font-bold transition shadow-sm">
                <Save size={16} className="mr-2" /> 保存して閉じる
             </button>
             <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white transition rounded border border-transparent hover:border-gray-600 bg-gray-800">
                <X size={20} />
             </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Section 1: 基本・取引情報 */}
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
             <h3 className="text-sm font-bold text-gray-700 border-b pb-2 mb-4">取引・ステータス情報</h3>
             <div className="grid grid-cols-4 gap-4">
               <div>
                  <label className={labelStyle}>ステータス</label>
                  <select name="status" value={formData.status || ''} onChange={handleChange} className={inputStyle}>
                    <option value="見積中">見積中</option>
                    <option value="発注待">発注待</option>
                    <option value="発注済">発注済</option>
                    <option value="先行発注">先行発注</option>
                    <option value="加工中">加工中</option>
                    <option value="材料充当">材料充当</option>
                    <option value="請求済">請求済</option>
                    <option value="キャンセル">キャンセル</option>
                  </select>
               </div>
               <div><label className={labelStyle}>担当者</label><input type="text" name="rep" value={formData.rep || ''} onChange={handleChange} className={inputStyle} /></div>
               <div><label className={labelStyle}>得意先 (Customer)</label><input type="text" name="customer" value={formData.customer || ''} onChange={handleChange} className={inputStyle} /></div>
               <div><label className={labelStyle}>仕入先 (Supplier)</label><input type="text" name="supplier" value={formData.supplier || ''} onChange={handleChange} className={inputStyle} /></div>
             </div>
          </div>

          {/* Section 2: 製品・明細情報 */}
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
             <h3 className="text-sm font-bold text-gray-700 border-b pb-2 mb-4">製品・明細情報</h3>
             <div className="grid grid-cols-12 gap-4">
                <div className="col-span-3"><label className={labelStyle}>カテゴリー</label><input type="text" name="category" value={formData.category || ''} onChange={handleChange} className={inputStyle} /></div>
                <div className="col-span-3"><label className={labelStyle}>品番</label><input type="text" name="item_code" value={formData.item_code || ''} onChange={handleChange} className={inputStyle} /></div>
                <div className="col-span-6"><label className={labelStyle}>品名・製品詳細</label><input type="text" name="item_name" value={formData.item_name || ''} onChange={handleChange} className={inputStyle} /></div>
                
                <div className="col-span-3"><label className={labelStyle}>サイズ</label><input type="text" name="item_size" value={formData.item_size || ''} onChange={handleChange} className={inputStyle} /></div>
                <div className="col-span-3"><label className={labelStyle}>カラー</label><input type="text" name="item_color" value={formData.item_color || ''} onChange={handleChange} className={inputStyle} /></div>
                <div className="col-span-3"><label className={labelStyle}>数量</label><input type="number" step="any" name="qty" value={formData.qty || ''} onChange={handleChange} className={inputStyle} /></div>
                <div className="col-span-3"><label className={labelStyle}>単位</label><input type="text" name="unit" value={formData.unit || ''} onChange={handleChange} className={inputStyle} /></div>
                
                <div className="col-span-4"><label className={labelStyle}>仕入先品番</label><input type="text" name="supplier_item_code" value={formData.supplier_item_code || ''} onChange={handleChange} className={inputStyle} /></div>
                <div className="col-span-4"><label className={labelStyle}>原産国</label><input type="text" name="origin" value={formData.origin || ''} onChange={handleChange} className={inputStyle} /></div>
             </div>
          </div>

          {/* Section 3: 金額・為替情報 */}
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
             <h3 className="text-sm font-bold text-gray-700 border-b pb-2 mb-4">金額・為替情報</h3>
             <div className="grid grid-cols-4 gap-4">
                <div><label className={labelStyle}>仕入単価</label><input type="number" step="any" name="cost_price" value={formData.cost_price || ''} onChange={handleChange} className={inputStyle} /></div>
                <div><label className={labelStyle}>仕入通貨</label><input type="text" name="cost_currency" value={formData.cost_currency || 'JPY'} onChange={handleChange} className={inputStyle} /></div>
                <div><label className={labelStyle}>掛率・マークアップ</label><input type="text" name="markup_rate" value={formData.markup_rate || ''} onChange={handleChange} className={inputStyle} /></div>
                <div><label className={labelStyle}>販売単価</label><input type="number" step="any" name="sales_price" value={formData.sales_price || ''} onChange={handleChange} className={inputStyle} /></div>
                
                <div><label className={labelStyle}>販売通貨</label><input type="text" name="sales_currency" value={formData.sales_currency || 'USD'} onChange={handleChange} className={inputStyle} /></div>
                <div><label className={labelStyle}>社内為替相場</label><input type="number" step="any" name="internal_rate" value={formData.internal_rate || ''} onChange={handleChange} className={inputStyle} /></div>
                <div><label className={labelStyle}>実勢為替相場</label><input type="number" step="any" name="exchange_rate" value={formData.exchange_rate || ''} onChange={handleChange} className={inputStyle} /></div>
             </div>
          </div>

          {/* Section 4: 日付・番号管理 */}
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
             <h3 className="text-sm font-bold text-gray-700 border-b pb-2 mb-4">書類番号・日付管理</h3>
             <div className="grid grid-cols-4 gap-4">
                <div><label className={labelStyle}>Quote No (見積)</label><input type="text" name="quote_no" value={formData.quote_no || ''} readOnly className={`${inputStyle} bg-gray-100 text-gray-500 cursor-not-allowed`} title="システムで自動発番されます" /></div>
                <div><label className={labelStyle}>Customer PO</label><input type="text" name="customer_po" value={formData.customer_po || ''} onChange={handleChange} className={inputStyle} /></div>
                <div><label className={labelStyle}>受注日</label><input type="date" name="order_date" value={formData.order_date?.replace(/\//g, '-') || ''} onChange={handleChange} className={inputStyle} /></div>
                <div><label className={labelStyle}>出荷予定日 (Factory)</label><input type="date" name="factory_date" value={formData.factory_date?.replace(/\//g, '-') || ''} onChange={handleChange} className={inputStyle} /></div>
                
                <div><label className={labelStyle}>PO No (発注書)</label><input type="text" name="po_no" value={formData.order_no || formData.po_no || ''} onChange={(e)=>{handleChange(e); setFormData((prev:any)=>({...prev, order_no: e.target.value}))}} className={`${inputStyle} bg-gray-100 text-gray-500 cursor-not-allowed`} readOnly title="システムで自動発番されます" /></div>
                <div><label className={labelStyle}>発注日</label><input type="date" name="po_date" value={formData.po_date?.replace(/\//g, '-') || ''} onChange={handleChange} className={inputStyle} /></div>
                <div><label className={labelStyle}>Invoice No (請求)</label><input type="text" name="invoice_no" value={formData.invoice_no || ''} readOnly className={`${inputStyle} bg-gray-100 text-gray-500 cursor-not-allowed`} title="システムで自動発番されます" /></div>
                <div><label className={labelStyle}>Invoice Date</label><input type="date" name="invoice_date" value={formData.invoice_date?.replace(/\//g, '-') || ''} onChange={handleChange} className={inputStyle} /></div>
             </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-700 border-b pb-2 mb-4">コメント・備考</h3>
                  <textarea name="comments" value={formData.comments || ''} onChange={handleChange} rows={3} className={inputStyle} placeholder="手動で入力する備考やメモ"></textarea>
              </div>
              <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-700 border-b pb-2 mb-4">システムログ</h3>
                  <textarea name="system_log" value={formData.system_log || ''} readOnly rows={3} className={`${inputStyle} bg-slate-50 text-slate-500 font-mono text-xs`} placeholder="システムの自動処理履歴がここに記録されます"></textarea>
              </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default OrderDetailModal;
