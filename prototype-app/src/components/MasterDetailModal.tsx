import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { translateMasterCol } from '../lib/masterTranslations';

interface MasterDetailModalProps {
  data: any;
  tableName: string;
  onClose: () => void;
  onSave: (updatedData: any) => void;
}

const MasterDetailModal = ({ data, tableName, onClose, onSave }: MasterDetailModalProps) => {
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
  
  const columns = Object.keys(formData).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[110] p-4">
      <div className="bg-gray-50 flex flex-col rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-900 text-white shrink-0">
          <h2 className="text-lg font-bold flex items-center tracking-widest">
            <span className="bg-blue-600 px-2 py-1 rounded text-xs mr-3 font-mono transform uppercase">{tableName}</span>
            マスター詳細マニュアル編集
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
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm grid grid-cols-2 gap-4">
             {columns.map(col => (
                 <div key={col}>
                    <label className={labelStyle}>{translateMasterCol(col)}</label>
                    {col === 'notes' ? (
                       <textarea name={col} value={formData[col] || ''} onChange={handleChange} rows={3} className={inputStyle}></textarea>
                    ) : (
                       <input type={col.includes('date') ? 'date' : 'text'} name={col} value={formData[col] || ''} onChange={handleChange} className={inputStyle} />
                    )}
                 </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MasterDetailModal;
