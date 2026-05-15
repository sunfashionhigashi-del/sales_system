import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  AlertCircle,
  Building,
  CheckCircle,
  CircleDollarSign,
  Landmark,
  Loader2,
  Package,
  Percent,
  Plus,
  RefreshCw,
  Tag,
  Trash,
  Truck,
  Upload,
} from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, type CellValueChangedEvent } from 'ag-grid-community';
import MasterDetailModal from './MasterDetailModal';
import { translateMasterCol } from '../lib/masterTranslations';

ModuleRegistry.registerModules([AllCommunityModule]);

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type MasterRow = Record<string, unknown> & { id?: string };

const masterTabs = [
  { id: 'suppliers', label: '仕入先マスター', icon: Truck },
  { id: 'products', label: '製品マスター', icon: Package },
  { id: 'product_prices', label: '価格展開マスター', icon: Tag },
  { id: 'customers', label: '販売先マスター', icon: Building },
  { id: 'annual_exchange_rates', label: '年度採算為替', icon: CircleDollarSign },
  { id: 'mufg_exchange_rates', label: 'MUFG実為替', icon: Landmark },
  { id: 'exchange_rate_adjustments', label: '優遇レート', icon: Percent },
];

const exchangeTables = new Set(['annual_exchange_rates', 'mufg_exchange_rates', 'exchange_rate_adjustments']);

const MasterViewer = () => {
  const [activeMaster, setActiveMaster] = useState('suppliers');
  const [data, setData] = useState<MasterRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [selectedRowData, setSelectedRowData] = useState<MasterRow | null>(null);
  const [importStatus, setImportStatus] = useState('');
  const gridRef = useRef<AgGridReact<MasterRow>>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: result, error } = await supabase.from(activeMaster).select('*').order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      setData([]);
    } else {
      setData(result || []);
    }
    setLoading(false);
  }, [activeMaster]);

  useEffect(() => {
    void Promise.resolve().then(fetchData);
  }, [fetchData]);

  const columnDefs = useMemo(() => {
    if (data.length === 0) return [];
    const keys = Object.keys(data[0]).filter((key) => key !== 'id' && key !== 'created_at' && key !== 'updated_at');
    return keys.map((key) => ({
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

  const onCellValueChanged = useCallback(async (params: CellValueChangedEvent<MasterRow>) => {
    const { data: rowData, colDef, newValue, oldValue } = params;
    const field = colDef.field;
    if (newValue === oldValue || !rowData?.id || !field) return;

    setSaveStatus('saving');
    const { error } = await supabase.from(activeMaster).update({ [field]: newValue }).eq('id', rowData.id);
    if (error) {
      console.error('Update failed:', error);
      setSaveStatus('error');
      alert(`保存に失敗しました。\n${error.message}`);
      params.node.setDataValue(field, oldValue);
      return;
    }
    setSaveStatus('saved');
  }, [activeMaster]);

  const handleAddRow = () => {
    const template: MasterRow = {};
    if (data.length > 0) {
      Object.keys(data[0]).forEach((key) => {
        if (key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
          template[key] = '';
        }
      });
    }
    setSelectedRowData(template);
  };

  const handleDeleteRow = async () => {
    const selectedNodes = gridRef.current?.api.getSelectedNodes();
    if (!selectedNodes || selectedNodes.length === 0) return;
    if (!window.confirm('選択した行を削除しますか？')) return;

    const selectedRows = selectedNodes
      .map((node) => node.data)
      .filter((row): row is MasterRow => Boolean(row?.id));
    const idsToDelete = selectedRows.map((row) => row.id as string);
    if (idsToDelete.length === 0) return;

    setSaveStatus('saving');
    const { error } = await supabase.from(activeMaster).delete().in('id', idsToDelete);
    if (error) {
      console.error(error);
      setSaveStatus('error');
      alert(`削除に失敗しました。\n${error.message}`);
      return;
    }

    setSaveStatus('saved');
    gridRef.current?.api.applyTransaction({ remove: selectedRows });
  };

  const handleSaveModal = async (updatedData: MasterRow) => {
    const isNew = !updatedData.id;
    setSaveStatus('saving');

    if (isNew) {
      const { data: inserted, error } = await supabase.from(activeMaster).insert(updatedData).select();
      if (error) {
        console.error(error);
        setSaveStatus('error');
        alert(`登録に失敗しました。\n${error.message}`);
        return;
      }
      if (inserted && inserted.length > 0) {
        gridRef.current?.api.applyTransaction({ add: [inserted[0]], addIndex: 0 });
        setData((prev) => [inserted[0], ...prev]);
      }
    } else {
      const { id } = updatedData;
      if (!id) return;
      const updatePayload = Object.fromEntries(
        Object.entries(updatedData).filter(([key]) => !['id', 'created_at', 'updated_at'].includes(key)),
      );
      const { error } = await supabase.from(activeMaster).update(updatePayload).eq('id', id);
      if (error) {
        console.error(error);
        setSaveStatus('error');
        alert(`更新に失敗しました。\n${error.message}`);
        return;
      }
      gridRef.current?.api.getRowNode(id)?.updateData(updatedData);
    }

    setSaveStatus('saved');
    setSelectedRowData(null);
  };

  const runExchangeImport = async (endpoint: string, payload?: Record<string, string>) => {
    setImportStatus('取り込み中...');
    setSaveStatus('saving');
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {}),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result.error || '取り込みに失敗しました');
      }
      setImportStatus((result.stdout || '取り込みが完了しました').trim());
      setSaveStatus('saved');
      await fetchData();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setImportStatus(message);
      setSaveStatus('error');
      alert(`為替取り込みに失敗しました。\n${message}`);
    }
  };

  const handleImportMufgDaily = () => {
    runExchangeImport('/api/import-mufg-daily-usd');
  };

  const handleImportMurcMonthly = () => {
    const defaultPath = 'C:\\Users\\higashi\\Downloads\\murc_2026.xls';
    const xlsPath = window.prompt('MURC月次Excelの保存場所を入力してください。', defaultPath);
    if (!xlsPath) return;
    runExchangeImport('/api/import-murc-usd', { xlsPath });
  };

  const saveStatusView = {
    idle: { label: 'セル編集で即時保存', icon: CheckCircle, className: 'bg-slate-100 text-slate-500 border-slate-200' },
    saving: { label: '保存中...', icon: Loader2, className: 'bg-blue-50 text-blue-700 border-blue-100 animate-pulse' },
    saved: { label: '保存済み', icon: CheckCircle, className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    error: { label: '保存失敗', icon: AlertCircle, className: 'bg-rose-50 text-rose-700 border-rose-100' },
  }[saveStatus];

  const SaveStatusIcon = saveStatusView.icon;

  return (
    <div className="flex flex-col h-full w-full bg-gray-50">
      <div className="flex shrink-0 border-b border-gray-300 bg-white px-6 mt-4 overflow-x-auto">
        {masterTabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeMaster === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveMaster(tab.id);
                setImportStatus('');
              }}
              className={`px-4 py-3 font-bold border-b-[3px] flex items-center ml-4 first:ml-0 -mb-[1px] transition whitespace-nowrap ${active ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <Icon size={16} className="mr-2" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden p-6 gap-4">
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <button onClick={handleAddRow} className="flex items-center bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 flex-shrink-0 rounded shadow-sm text-sm font-bold transition">
            <Plus size={16} className="mr-2" />
            新規追加
          </button>
          <button onClick={handleDeleteRow} className="flex items-center border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 flex-shrink-0 rounded shadow-sm text-sm font-bold transition">
            <Trash size={16} className="mr-2" />
            選択行を削除
          </button>
          <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-bold ${saveStatusView.className}`}>
            <SaveStatusIcon size={14} className={`mr-1.5 ${saveStatus === 'saving' ? 'animate-spin' : ''}`} />
            {saveStatusView.label}
          </span>

          {exchangeTables.has(activeMaster) && (
            <>
              <button onClick={handleImportMufgDaily} className="flex items-center border border-blue-200 text-blue-700 hover:bg-blue-50 px-4 py-2 flex-shrink-0 rounded shadow-sm text-sm font-bold transition">
                <RefreshCw size={16} className="mr-2" />
                MUFG日次USD取込
              </button>
              <button onClick={handleImportMurcMonthly} className="flex items-center border border-emerald-200 text-emerald-700 hover:bg-emerald-50 px-4 py-2 flex-shrink-0 rounded shadow-sm text-sm font-bold transition">
                <Upload size={16} className="mr-2" />
                MURC月次Excel取込
              </button>
            </>
          )}

          <span className="text-gray-500 text-xs">行をダブルクリックすると詳細編集を開きます。</span>
          {importStatus && <span className="text-xs text-slate-600 truncate max-w-xl">{importStatus}</span>}
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
              onRowDoubleClicked={(event) => {
                if (event.data) setSelectedRowData(event.data);
              }}
              getRowId={(params) => String(params.data.id || '')}
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
