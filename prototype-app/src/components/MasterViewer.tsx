import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Truck, Package, Tag, Building, Plus, Trash } from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import MasterDetailModal from './MasterDetailModal';
import { translateMasterCol } from '../lib/masterTranslations';

ModuleRegistry.registerModules([AllCommunityModule]);

const MasterViewer = () => {
  const [activeMaster, setActiveMaster] = useState('suppliers');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const gridRef = useRef<AgGridReact>(null);
  const [selectedRowData, setSelectedRowData] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [activeMaster]);

  const fetchData = async () => {
    setLoading(true);
    const { data: result, error } = await supabase.from(activeMaster).select('*').order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      setData([]);
    } else {
      setData(result || []);
    }
    setLoading(false);
  };

  const columnDefs = useMemo(() => {
    if (data.length === 0) return [];
    
    // Auto-generate columns from the first row's keys
    const keys = Object.keys(data[0]).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at');
    
    return keys.map(key => ({
      field: key,
      headerName: translateMasterCol(key),
      editable: true,
      filter: true,
      sortable: true,
      resizable: true,
    }));
  }, [data]);

  const defaultColDef = useMemo(() => ({
    flex: 1,
    minWidth: 100,
  }), []);

  const onCellValueChanged = useCallback(async (params: any) => {
    const { data: rowData, colDef, newValue, oldValue } = params;
    if (newValue === oldValue) return;
    
    const field = colDef.field;
    
    if (rowData.id) {
       // UPDATE
       const { error } = await supabase.from(activeMaster).update({ [field]: newValue }).eq('id', rowData.id);
       if (error) {
          console.error("Update failed:", error);
          alert("保存に失敗しました。");
          params.node.setDataValue(field, oldValue); // revert
       }
    }
  }, [activeMaster]);

  const handleAddRow = () => {
     // 新規作成用に、既存データからカラム構造をコピーした空のテンプレートを作成してモーダルを開く
     const template: any = {};
     if (data.length > 0) {
        Object.keys(data[0]).forEach(k => {
            if (k !== 'id' && k !== 'created_at' && k !== 'updated_at') {
                template[k] = '';
            }
        });
     }
     setSelectedRowData(template); 
  };

  const handleDeleteRow = async () => {
      const selectedNodes = gridRef.current?.api.getSelectedNodes();
      if (!selectedNodes || selectedNodes.length === 0) return;
      
      if (!window.confirm("選択した行を削除してもよろしいですか？")) return;

      const idsToDelete = selectedNodes.map(node => node.data.id).filter(id => id);
      
      if (idsToDelete.length > 0) {
          const { error } = await supabase.from(activeMaster).delete().in('id', idsToDelete);
          if (error) {
             console.error(error);
             alert("削除に失敗しました。FOREIGN KEY制約などで使われている可能性があります。");
             return;
          }
      }
      
      gridRef.current?.api.applyTransaction({ remove: selectedNodes.map(n => n.data) });
  };
  
  const handleSaveModal = async (updatedData: any) => {
      const isNew = !updatedData.id;
      if (isNew) {
          const { data: inserted, error } = await supabase.from(activeMaster).insert(updatedData).select();
          if (error) {
              console.error(error);
              alert("登録に失敗しました。必須項目が入力されていない可能性があります。\n" + error.message);
              return;
          }
          if (inserted && inserted.length > 0) {
              gridRef.current?.api.applyTransaction({ add: [inserted[0]], addIndex: 0 });
              setData(prev => [inserted[0], ...prev]);
          }
      } else {
          // 予約語を除外してUpdate
          const { id, created_at, updated_at, ...updatePayload } = updatedData;
          const { error } = await supabase.from(activeMaster).update(updatePayload).eq('id', id);
          if (error) {
              console.error(error);
              alert("更新に失敗しました。\n" + error.message);
              return;
          }
          const rowNode = gridRef.current?.api.getRowNode(id);
          if (rowNode) {
              rowNode.updateData(updatedData);
          }
      }
      setSelectedRowData(null);
  };

  return (
    <div className="flex flex-col h-full w-full bg-gray-50">
      <div className="flex shrink-0 border-b border-gray-300 bg-white px-6 mt-4">
        <button 
          onClick={() => setActiveMaster('suppliers')} 
          className={`px-4 py-3 font-bold border-b-[3px] flex items-center -mb-[1px] transition ${activeMaster === 'suppliers' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Truck size={16} className="mr-2" />
          仕入先マスター
        </button>
        <button 
          onClick={() => setActiveMaster('products')} 
          className={`px-4 py-3 font-bold border-b-[3px] flex items-center ml-4 -mb-[1px] transition ${activeMaster === 'products' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Package size={16} className="mr-2" />
          製品マスター (親)
        </button>
        <button 
          onClick={() => setActiveMaster('product_prices')} 
          className={`px-4 py-3 font-bold border-b-[3px] flex items-center ml-4 -mb-[1px] transition ${activeMaster === 'product_prices' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Tag size={16} className="mr-2" />
          価格展開マスター (子)
        </button>
        <button 
          onClick={() => setActiveMaster('customers')} 
          className={`px-4 py-3 font-bold border-b-[3px] flex items-center ml-4 -mb-[1px] transition ${activeMaster === 'customers' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Building size={16} className="mr-2" />
          販売先マスター
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden p-6 gap-4">
        
        {/* Actions Toolbar */}
        <div className="flex items-center space-x-3 shrink-0">
            <button onClick={handleAddRow} className="flex items-center bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 flex-shrink-0 rounded shadow-sm text-sm font-bold transition">
                <Plus size={16} className="mr-2"/> 新規追加
            </button>
            <button onClick={handleDeleteRow} className="flex items-center border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 flex-shrink-0 rounded shadow-sm text-sm font-bold transition">
                <Trash size={16} className="mr-2"/> 選択行を削除
            </button>
            <span className="text-gray-500 text-xs ml-4">※セルを直接編集して保存するか、行をダブルクリックで詳細ポップアップを開きます。</span>
        </div>

        <div className="flex-1 bg-white rounded-lg shadow border border-gray-200 overflow-hidden ag-theme-alpine w-full h-full">
            {loading && data.length === 0 ? (
                 <div className="p-8 text-center text-gray-500">読み込み中...</div>
            ) : data.length === 0 ? (
                 <div className="p-8 text-center text-gray-500">データがありません。新規追加してください。</div>
            ) : (
                <AgGridReact
                    ref={gridRef}
                    rowData={data}
                    columnDefs={columnDefs}
                    defaultColDef={defaultColDef}
                    rowSelection="multiple"
                    onCellValueChanged={onCellValueChanged}
                    onRowDoubleClicked={(e) => setSelectedRowData(e.data)}
                    getRowId={(params) => params.data.id}
                />
            )}
        </div>
      </div>
      
      {selectedRowData && (
          <MasterDetailModal 
             data={selectedRowData}
             tableName={activeMaster}
             onClose={() => setSelectedRowData(null)}
             onSave={handleSaveModal}
          />
      )}
    </div>
  );
};

export default MasterViewer;
