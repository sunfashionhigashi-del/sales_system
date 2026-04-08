import { useEffect, useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '../lib/supabase';

const orderSchema = z.object({
  status: z.string(),
  rep: z.string().optional(),
  customer: z.string().optional(),
  supplier: z.string().optional(),
  
  category: z.string().optional(),
  item_code: z.string().optional(),
  item_name: z.string().optional(),
  item_size: z.string().optional(),
  item_color: z.string().optional(),
  qty: z.coerce.number().min(0, "数量は0以上にしてください").optional(),
  unit: z.string().optional(),
  supplier_item_code: z.string().optional(),
  origin: z.string().optional(),
  
  cost_price: z.coerce.number().min(0, "単価はマイナス不可です").optional(),
  cost_currency: z.string().optional(),
  markup_rate: z.string().optional(),
  sales_price: z.coerce.number().min(0, "単価はマイナス不可です").optional(),
  sales_currency: z.string().optional(),
  internal_rate: z.coerce.number().optional(),
  exchange_rate: z.coerce.number().optional(),
  
  customer_po: z.string().optional(),
  order_date: z.string().optional(),
  factory_date: z.string().optional(),
  po_date: z.string().optional(),
  invoice_date: z.string().optional(),
  
  comments: z.string().optional(),
}).passthrough();

type OrderFormValues = z.infer<typeof orderSchema>;

interface OrderDetailModalProps {
  data: any;
  onClose: () => void;
  onSave: (updatedData: any) => void;
}

const OrderDetailModal = ({ data, onClose, onSave }: OrderDetailModalProps) => {
  const [priceSuggestion, setPriceSuggestion] = useState<any>(null);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema) as any,
    defaultValues: data || {}
  });

  const watchItemCode = watch("item_code");

  useEffect(() => {
    if (data) {
       // Convert dates to YYYY-MM-DD for input[type="date"]
       const safeData = { ...data };
       ['order_date', 'factory_date', 'po_date', 'invoice_date'].forEach(f => {
           if (safeData[f]) safeData[f] = safeData[f].replace(/\//g, '-');
       });
       reset(safeData);
    }
  }, [data, reset]);

  // オートコンプリート（品番からのマスター検索）
  useEffect(() => {
    const fetchMaster = async () => {
        if (!watchItemCode || watchItemCode.length < 3) {
            setPriceSuggestion(null);
            return;
        }
        const { data: mData } = await supabase.from('product_prices').select('cost_price, sales_price, sales_currency').eq('item_code', watchItemCode).limit(1).maybeSingle();
        if (mData) {
            setPriceSuggestion(mData);
        } else {
            setPriceSuggestion(null);
        }
    };
    fetchMaster();
  }, [watchItemCode]);

  const applySuggestion = () => {
     if (priceSuggestion) {
         setValue('cost_price', priceSuggestion.cost_price);
         setValue('sales_price', priceSuggestion.sales_price);
         setValue('sales_currency', priceSuggestion.sales_currency || 'USD');
     }
  };

  const onSubmit = (formData: any) => {
    // Merge with original data (for IDs and read-only fields)
    onSave({ ...data, ...formData });
  };

  const [activeTab, setActiveTab] = useState<'detail'|'audit'>('detail');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
     if (activeTab === 'audit' && data?.id) {
         supabase.from('audit_logs').select('*').eq('order_id', data.id).order('created_at', { ascending: false }).then(({data: logs}) => {
             if (logs) setAuditLogs(logs);
         });
     }
  }, [activeTab, data?.id]);

  if (!data) return null;

  const inputStyle = "w-full border rounded p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white transition-colors";
  const errorInputStyle = "border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-500";
  const labelStyle = "block text-xs font-bold text-gray-500 mb-1 tracking-wider";

  const ErrorMsg = ({ field }: { field: keyof OrderFormValues }) => {
     const error = errors[field];
     if (!error) return null;
     return <p className="text-red-500 text-xs mt-1 font-bold flex items-center"><AlertCircle size={12} className="mr-1"/>{error.message as string}</p>;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-gray-50 flex flex-col rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-slate-700">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center space-x-6">
            <h2 className="text-lg font-bold flex items-center tracking-widest mr-4">
              <span className="bg-blue-600 px-2 py-1 rounded text-xs mr-3 font-mono">ID: {data.id?.slice(0,8)}</span>
              オーダー詳細
            </h2>
            <div className="flex space-x-1 border-l border-slate-700 pl-6">
               <button type="button" onClick={() => setActiveTab('detail')} className={`px-4 py-1.5 rounded-full text-sm font-bold transition ${activeTab === 'detail' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}>基本情報</button>
               <button type="button" onClick={() => setActiveTab('audit')} className={`px-4 py-1.5 rounded-full text-sm font-bold transition flex items-center ${activeTab === 'audit' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}>変更履歴 (Logs)</button>
            </div>
          </div>
          <div className="flex items-center space-x-3">
             {activeTab === 'detail' && (
                <button type="submit" disabled={isSubmitting} className="flex items-center bg-blue-600 hover:bg-blue-500 text-white px-5 py-1.5 rounded font-bold transition shadow-sm disabled:opacity-50">
                   <Save size={16} className="mr-2" /> 保存して閉じる
                </button>
             )}
             <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-white transition rounded border border-transparent hover:border-slate-600 bg-slate-800">
                <X size={20} />
             </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'detail' ? (
            <>
          
          {/* Section 1: 基本・取引情報 */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm relative">
             <h3 className="text-sm font-bold text-slate-700 border-b pb-2 mb-4">取引・ステータス情報</h3>
             <div className="grid grid-cols-4 gap-4">
               <div>
                  <label className={labelStyle}>ステータス</label>
                  <select {...register('status')} className={inputStyle}>
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
               <div><label className={labelStyle}>担当者</label><input type="text" {...register('rep')} className={inputStyle} /></div>
               <div><label className={labelStyle}>得意先 (Customer)</label><input type="text" {...register('customer')} className={inputStyle} /></div>
               <div><label className={labelStyle}>仕入先 (Supplier)</label><input type="text" {...register('supplier')} className={inputStyle} /></div>
             </div>
          </div>

          {/* Section 2: 製品・明細情報 */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
             <div className="flex items-center justify-between border-b pb-2 mb-4">
                <h3 className="text-sm font-bold text-slate-700">製品・明細情報</h3>
                {priceSuggestion && (
                   <span onClick={applySuggestion} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded cursor-pointer hover:bg-emerald-200 font-bold transition">
                      ✨ マスタから単価を自動入力 (仕入:{priceSuggestion.cost_price} / 販売:{priceSuggestion.sales_price})
                   </span>
                )}
             </div>
             <div className="grid grid-cols-12 gap-4">
                <div className="col-span-3"><label className={labelStyle}>カテゴリー</label><input type="text" {...register('category')} className={inputStyle} /></div>
                <div className="col-span-3"><label className={labelStyle}>品番</label><input type="text" {...register('item_code')} className={inputStyle} /></div>
                <div className="col-span-6"><label className={labelStyle}>品名・製品詳細</label><input type="text" {...register('item_name')} className={inputStyle} /></div>
                
                <div className="col-span-3"><label className={labelStyle}>サイズ</label><input type="text" {...register('item_size')} className={inputStyle} /></div>
                <div className="col-span-3"><label className={labelStyle}>カラー</label><input type="text" {...register('item_color')} className={inputStyle} /></div>
                
                <div className="col-span-3">
                   <label className={labelStyle}>数量</label>
                   <input type="number" step="any" {...register('qty')} className={`${inputStyle} ${errors.qty ? errorInputStyle : 'border-slate-300'}`} />
                   <ErrorMsg field="qty" />
                </div>
                
                <div className="col-span-3"><label className={labelStyle}>単位</label><input type="text" {...register('unit')} className={inputStyle} /></div>
                
                <div className="col-span-4"><label className={labelStyle}>仕入先品番</label><input type="text" {...register('supplier_item_code')} className={inputStyle} /></div>
                <div className="col-span-4"><label className={labelStyle}>原産国</label><input type="text" {...register('origin')} className={inputStyle} /></div>
             </div>
          </div>

          {/* Section 3: 金額・為替情報 */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
             <h3 className="text-sm font-bold text-slate-700 border-b pb-2 mb-4">金額・為替情報</h3>
             <div className="grid grid-cols-4 gap-4">
                <div>
                   <label className={labelStyle}>仕入単価</label>
                   <input type="number" step="any" {...register('cost_price')} className={`${inputStyle} ${errors.cost_price ? errorInputStyle : 'border-slate-300'}`} />
                   <ErrorMsg field="cost_price" />
                </div>
                <div><label className={labelStyle}>仕入通貨</label><input type="text" {...register('cost_currency')} className={inputStyle} /></div>
                <div><label className={labelStyle}>掛率・マークアップ</label><input type="text" {...register('markup_rate')} className={inputStyle} /></div>
                <div>
                   <label className={labelStyle}>販売単価</label>
                   <input type="number" step="any" {...register('sales_price')} className={`${inputStyle} ${errors.sales_price ? errorInputStyle : 'border-slate-300'}`} />
                   <ErrorMsg field="sales_price" />
                </div>
                
                <div><label className={labelStyle}>販売通貨</label><input type="text" {...register('sales_currency')} className={inputStyle} /></div>
                <div><label className={labelStyle}>社内為替相場</label><input type="number" step="any" {...register('internal_rate')} className={inputStyle} /></div>
                <div><label className={labelStyle}>実勢為替相場</label><input type="number" step="any" {...register('exchange_rate')} className={inputStyle} /></div>
             </div>
          </div>

          {/* Section 4: 日付・番号管理 */}
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
             <h3 className="text-sm font-bold text-slate-700 border-b pb-2 mb-4">書類番号・日付管理</h3>
             <div className="grid grid-cols-4 gap-4">
                <div><label className={labelStyle}>Quote No (見積)</label><input type="text" value={data.quote_no || ''} readOnly className={`${inputStyle} bg-slate-100 text-slate-500 cursor-not-allowed`} title="自動発番" /></div>
                <div><label className={labelStyle}>Customer PO</label><input type="text" {...register('customer_po')} className={inputStyle} /></div>
                <div><label className={labelStyle}>受注日</label><input type="date" {...register('order_date')} className={inputStyle} /></div>
                <div><label className={labelStyle}>出荷予定日</label><input type="date" {...register('factory_date')} className={inputStyle} /></div>
                
                <div><label className={labelStyle}>当社発注No / PO</label><input type="text" value={data.order_no || data.po_no || ''} readOnly className={`${inputStyle} bg-slate-100 text-slate-500 cursor-not-allowed`} title="自動発番" /></div>
                <div><label className={labelStyle}>発注日</label><input type="date" {...register('po_date')} className={inputStyle} /></div>
                <div><label className={labelStyle}>Invoice No (請求)</label><input type="text" value={data.invoice_no || ''} readOnly className={`${inputStyle} bg-slate-100 text-slate-500 cursor-not-allowed`} title="自動発番" /></div>
                <div><label className={labelStyle}>Invoice Date</label><input type="date" {...register('invoice_date')} className={inputStyle} /></div>
             </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-700 border-b pb-2 mb-4">コメント・備考</h3>
                  <textarea {...register('comments')} rows={3} className={inputStyle} placeholder="手動で入力する備考やメモ"></textarea>
              </div>
              <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-700 border-b pb-2 mb-4">システムログ</h3>
                  <textarea value={data.system_log || ''} readOnly rows={3} className={`${inputStyle} bg-slate-100 text-slate-500 font-mono text-xs`} placeholder="システムの自動処理履歴がここに記録されます"></textarea>
              </div>
          </div>
          </>
          ) : (
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm h-full flex flex-col">
               <h3 className="text-sm font-bold text-slate-700 border-b pb-4 mb-4 flex items-center">
                  データベース監査ログ（Audit Trail）
                  <span className="ml-3 text-xs font-normal text-slate-500">このオーダーに関する変更履歴が新しい順に表示されます。</span>
               </h3>
               <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                  {auditLogs.length === 0 ? (
                      <p className="text-center text-slate-400 py-10">履歴データがありません</p>
                  ) : (
                      auditLogs.map((log: any) => (
                          <div key={log.id} className="border-l-4 border-l-blue-500 pl-4 py-2 border-b border-slate-100 last:border-0 relative">
                             <div className="flex items-center justify-between mb-2">
                                <strong className={`text-xs px-2 py-0.5 rounded ${log.action === 'UPDATE' ? 'bg-amber-100 text-amber-700' : log.action === 'INSERT' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                   {log.action}
                                </strong>
                                <span className="text-xs text-slate-400">{new Date(log.created_at).toLocaleString('ja-JP')}</span>
                             </div>
                             <p className="text-sm text-slate-600 mb-2"><span className="font-bold mr-2">ユーザー:</span> {log.user_name}</p>
                             {log.changes_json && (
                                <pre className="bg-slate-50 p-2 text-[10px] text-slate-500 font-mono rounded overflow-x-auto border border-slate-200">
                                   {JSON.stringify(log.changes_json, null, 2)}
                                </pre>
                             )}
                          </div>
                      ))
                  )}
               </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default OrderDetailModal;
