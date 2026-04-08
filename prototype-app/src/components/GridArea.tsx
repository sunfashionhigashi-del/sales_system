import { useState, useEffect, useMemo, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'
import { AllEnterpriseModule } from 'ag-grid-enterprise'

ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule])

import { supabase } from '../lib/supabase'
import OrderDetailModal from './OrderDetailModal'
import { Database } from 'lucide-react'

interface GridAreaProps {
  activeTab: string;
  session: any;
}

// Phase 1: Mock Item Master DB (品番による補完や、過去の価格乖離警告用)
const itemMasterDB: any = {
    "MW-0806T": { itemName: "モビロンテープ", category: "PUテープ", costPrice: 120.0, salesPrice: 200.0 },
    "RIBBON-001": { itemName: "サテンリボン", category: "リボン", costPrice: 50.0, salesPrice: 80.0 },
    "R-F-0099": { itemName: "ストレッチレース", category: "レース", costPrice: 15.5, salesPrice: 22.0 },
    "BT-RESIN-15": { itemName: "Resin Button 15mm", category: "ボタン", costPrice: 8.5, salesPrice: 15.0 },
    "ZIP-MET-10": { itemName: "Metal Zipper 10cm", category: "パーツ", costPrice: 45.0, salesPrice: 90.0 },
    "LACE-NY-05": { itemName: "Nylon Lace 5cm", category: "レース", costPrice: 22.0, salesPrice: 38.0 },
    "TAPE-COT-20": { itemName: "Cotton Tape 20mm", category: "PUテープ", costPrice: 14.0, salesPrice: 28.0 }
};

// ステータスバッジ — モジュールのクリーンなテキスト＋ドットデザイン
const StatusBadgeRenderer = (params: any) => {
  if (!params.value) return null;
  const styleMap: Record<string, { color: string, indicator: string }> = {
    '見積中':   { color: '#2563eb', indicator: '#93c5fd' }, 
    '発注待':   { color: '#dc2626', indicator: '#fca5a5' }, 
    '未請求':   { color: '#059669', indicator: '#6ee7b7' }, 
    '先行発注': { color: '#d97706', indicator: '#fcd34d' }, 
    '加工中':   { color: '#4f46e5', indicator: '#a5b4fc' }, 
    '材料充当': { color: '#64748b', indicator: '#cbd5e1' }, 
    '請求済':   { color: '#374151', indicator: '#d1d5db' }, 
    'キャンセル': { color: '#ef4444', indicator: '#f87171' }, 
  };
  const s = styleMap[params.value] || { color: '#374151', indicator: '#e5e7eb' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: '100%', fontWeight: 700, color: s.color, whiteSpace: 'nowrap' }}>
      <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: s.indicator, marginRight: '6px' }}></span>
      {params.value}
    </div>
  );
};

// マスタ価格のふんわりサジェスト表示 Renderer
const PriceCellRenderer = (params: any) => {
    let valStr = '';
    if (params.value !== null && params.value !== undefined && params.value !== '') {
        const n = parseFloat(params.value);
        valStr = isNaN(n) ? params.value : n.toLocaleString('ja-JP', { maximumFractionDigits: 4 });
    }
    
    const isCost = params.colDef?.field === 'cost_price';
    const master = params.data?.item_code ? itemMasterDB[params.data.item_code] : null;
    let suggestion = null;
    
    if (master) {
        const mPrice = isCost ? master.costPrice : master.salesPrice;
        const currentVal = parseFloat(params.value);
        // 現在値が空、またはマスタと異なる場合にふんわり提案を出す
        if (isNaN(currentVal) || currentVal !== mPrice) {
            suggestion = <div style={{ fontSize: '10px', color: '#9ca3af', lineHeight: '1', marginTop: '2px', fontStyle: 'italic' }}>[前回: {mPrice}]</div>;
        }
    }
    
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingTop: suggestion ? '4px' : '0px', justifyContent: suggestion ? 'flex-start' : 'center' }}>
            <div style={{ lineHeight: '1.2' }}>{valStr}</div>
            {suggestion}
        </div>
    );
};

const AG_GRID_LOCALE_JP = {
    // Columns Tool Panel
    columns: '列',
    filters: 'フィルター',
    selectMode: '選択モード',
    chooseColumns: '列の選択',
    columnChooser: '列の選択',
    
    // Sort & Pin Configuration Menu
    pinColumn: '列を固定する',
    pinLeft: '左に固定',
    pinRight: '右に固定',
    noPin: '固定解除',
    autosizeThiscolumn: 'この列の幅を自動調整',
    autosizeAllColumns: 'すべての列の幅を自動調整',
    autoSizeThisColumn: 'この列の幅を自動調整',
    autoSizeAllColumns: 'すべての列の幅を自動調整',
    groupBy: 'グループ化',
    ungroupBy: 'グループ化解除',
    resetColumns: '列をリセット',
    expandAll: 'すべて展開',
    collapseAll: 'すべて折りたたむ',
    toolPanel: 'ツールパネル',
    sortAscending: '昇順に並べ替え',
    sortDescending: '降順に並べ替え',
    sortUnSort: '並べ替えを解除',
    
    // Filters Menu
    filterOoo: 'フィルター...',
    equals: '等しい',
    notEqual: '等しくない',
    empty: '空白を選ぶ',
    blank: '空白',
    notBlank: '空白以外',
    contains: '含む',
    notContains: '含まない',
    startsWith: 'で始まる',
    endsWith: 'で終わる',
    searchOoo: '検索...',
    selectAll: '(すべて選択)',
    selectAllSearchResults: '(全検索結果を選択)',
    
    // Grid General
    noRowsToShow: '表示するデータがありません',
    enabled: '有効',
};

const GridArea = forwardRef(({ activeTab, session }: GridAreaProps, ref) => {
  const gridRef = useRef<AgGridReact>(null)
  const [rowData, setRowData] = useState<any[]>([])
  const [selectedRowData, setSelectedRowData] = useState<any>(null)

  const [undoStack, setUndoStack] = useState<any[]>([])
  const [redoStack, setRedoStack] = useState<any[]>([])

  const captureSnapshot = useCallback(() => {
     if(gridRef.current?.api) {
        const currentData: any[] = []
        gridRef.current.api.forEachNode(node => currentData.push({...node.data}))
        setUndoStack(prev => [...prev.slice(-49), currentData])
        setRedoStack([])
     }
  }, [])

  useImperativeHandle(ref, () => ({
    openDetailModal: () => {
       const selectedNodes = gridRef.current?.api.getSelectedNodes();
       if (selectedNodes && selectedNodes.length > 0) {
           setSelectedRowData(selectedNodes[0].data);
       } else {
           alert("詳細を開く行を選択してください。");
       }
    },
    addRow: (status: string) => {
      captureSnapshot()
      const today = new Date().toISOString().split('T')[0];
      const newRow = {
        id: crypto.randomUUID(),
        status: status,
        item_name: '新規アイテムを入力',
        rep: session?.user?.name || '',
        qty: 0,
        markup_rate: '1.0',
        order_date: (status === '発注待' || status === '先行発注') ? today : null,
        po_date: status === '先行発注' ? today : null,
        created_at: new Date().toISOString(),
        locked: false
      }
      gridRef.current?.api.applyTransaction({ add: [newRow], addIndex: 0 })
      gridRef.current?.api.onFilterChanged() 
    },
    splitRow: () => {
      captureSnapshot()
      const selectedNodes = gridRef.current?.api.getSelectedNodes()
      if (!selectedNodes || selectedNodes.length !== 1) {
          alert("分割したい行を【1行だけ】選択してください。");
          return;
      }
      const node = selectedNodes[0];
      const data = node.data;

      if (data.locked) {
          alert("書類発行済みの行はそのまま分割できません。\n先に「ロック解除(改版)」を行ってください。");
          return;
      }
      const currentQty = parseInt(data.qty) || 0;
      if (currentQty <= 1) {
          alert("数量が未入力、または1以下のため分割できません。");
          return;
      }

      const splitQtyStr = prompt(`現在の数量は ${currentQty} です。\n新しく切り出す数量を入力してください：`, "1");
      if (!splitQtyStr) return; // Cancel

      const splitQty = parseInt(splitQtyStr);
      if (isNaN(splitQty) || splitQty <= 0 || splitQty >= currentQty) {
          alert("無効な数量です。分割元の数量より小さい正の整数を入力してください。");
          return;
      }

      // リンクIDの付与（分割元グループ継承）
      let splitFamilyId = (data.link_id && data.link_id.includes('SPL-')) 
          ? data.link_id 
          : `SPL-${Math.floor(1000 + Math.random()*9000)}`;
      
      const updatedOriginal = {
          ...data,
          qty: currentQty - splitQty,
          link_id: splitFamilyId,
          updated_at: new Date().toISOString()
      };

      const newRowData = {
          ...data,
          id: crypto.randomUUID(),
          qty: splitQty,
          link_id: splitFamilyId,
          system_log: `[SYS] 分割 (元:${currentQty}) ` + (data.system_log || ""),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          locked: false
      };

      gridRef.current?.api.applyTransaction({ 
          update: [updatedOriginal],
          add: [newRowData],
          addIndex: node.rowIndex !== null ? node.rowIndex + 1 : 0 
      });
      gridRef.current?.api.onFilterChanged();
    },
    duplicateRow: () => {
      captureSnapshot()
      const selected = gridRef.current?.api.getSelectedNodes()
      if (selected && selected.length > 0) {
        const newRows = selected.map(node => ({
            ...node.data,
            id: crypto.randomUUID(),
            status: '見積中', 
            quote_no: null,
            po_no: null,
            invoice_no: null,
            po_date: null,
            invoice_date: null,
            order_date: null,
            payment_date: null,
            quote_remarks: null,
            po_remarks: null,
            invoice_remarks: null,
            revision: 0,
            last_qt_snapshot: null,
            last_po_snapshot: null,
            last_locked_state: null,
            locked: false,
            archived: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }))
        const maxIndex = Math.max(...selected.map(n => n.rowIndex || 0))
        gridRef.current?.api.applyTransaction({ add: newRows, addIndex: maxIndex + 1 })
        gridRef.current?.api.onFilterChanged()
      } else {
        alert("複製する行を選択してください。")
      }
    },
    kitRows: () => {
      captureSnapshot()
      const selectedNodes = gridRef.current?.api.getSelectedNodes()
      if (!selectedNodes || selectedNodes.length < 1) {
          alert("キット化・加工する材料の行を選択してください。");
          return;
      }

      let totalCostJpy = 0;
      // 仮の固定TTS
      const baseRateTTS = 145; 
      const appliedTTS = baseRateTTS - 0.5;

      for (let node of selectedNodes) {
         if (node.data.locked) {
             alert("すでに書類発行済みの行が選択されています。解除してから実行してください。");
             return;
         }
         let cCost = parseFloat(node.data.cost_price) || 0;
         let q = parseFloat(node.data.qty) || 0;
         let itemCostJPY = node.data.cost_currency === 'JPY' ? cCost : cCost * appliedTTS;
         totalCostJpy += (itemCostJPY * q);
      }

      const newItemCode = prompt(`材料 ${selectedNodes.length} 行を消費して新しいキット(加工品)を作成します。\n生成される【新しい品番】を入力してください：`, "KIT-001");
      if (!newItemCode) return;
      
      const newQtyStr = prompt("出来上がりの数量を入力してください：", "1");
      const newQty = parseInt(newQtyStr ?? '0');
      if(isNaN(newQty) || newQty <= 0) return;

      const extraCostStr = prompt("加工賃など、材料費以外に追加でかかる費用（日本円 総額）があれば入力してください：", "0");
      const extraCost = parseFloat(extraCostStr ?? '0') || 0;

      const prcId = `PRC-${Math.floor(1000 + Math.random()*9000)}`;

      let updatedNodes: any[] = [];
      selectedNodes.forEach(node => {
          let nData = { ...node.data };
          nData.status = '材料充当'; // 材料を消費して見当たらなくする
          nData.locked = true;
          nData.link_id = nData.link_id ? nData.link_id + ", " + prcId : prcId;
          nData.system_log = `[SYS] ${prcId}へ投入 ` + (nData.system_log || "");
          nData.updated_at = new Date().toISOString();
          updatedNodes.push(nData);
      });

      const finalUnitCost = (totalCostJpy + extraCost) / newQty;
      const newRow = {
          id: crypto.randomUUID(),
          status: '加工中',  // 生成されたキットは加工中として管理
          quote_no: "-",
          order_date: "-",
          order_id: "-",
          rep: session?.user?.role_id !== 'admin' ? session?.user?.name : "管理者",
          customer: "-",
          category: "キット/加工品",
          item_code: newItemCode,
          item_name: "加工セット品",
          qty: newQty,
          unit: "SET",
          cost_price: Math.ceil(finalUnitCost * 100) / 100,
          cost_currency: "JPY",
          sales_price: null,
          sales_currency: "JPY",
          link_id: prcId,
          po_date: new Date().toISOString().split('T')[0],
          system_log: `[SYS] 材料費 ${Math.floor(totalCostJpy)}円 + 加工賃 ${extraCost}円 = 仕入原価`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          locked: false
      };

      gridRef.current?.api.applyTransaction({ 
          update: updatedNodes,
          add: [newRow],
          addIndex: 0
      });
      gridRef.current?.api.onFilterChanged();
      alert(`【キット化完了】\n材料行を[材料充当]扱いとして保護し、新品番 ${newItemCode} を[加工中]として生成しました。\n(リンクID: ${prcId})`);
    },
    unlockRow: () => {
      captureSnapshot()
      const selected = gridRef.current?.api.getSelectedNodes()
      if (selected && selected.length > 0) {
        const updates = selected.map(node => {
            const shortDate = new Date().toISOString().split('T')[0]
            const prevInv = node.data.invoice_no || "不明"
            
            // ロジック点検: 請求済をロック解除した場合は「見積中」ではなく「未請求」に戻す。
            // そこで修正して再度Invoiceを発行するために Revision をカウントアップする。
            let newStatus = node.data.status;
            let currentRev = node.data.revision || 0;
            
            if (node.data.status === '請求済') {
                newStatus = '未請求';
                currentRev += 1; // Unlock時に改版カウントを上げる
            }

            return { 
               ...node.data, 
               locked: false, 
               status: newStatus,
               revision: currentRev,
               last_locked_state: JSON.stringify(node.data), // 変更差分比較用・改版直前のスナップショットを内部に隠し持つ
               system_log: `[SYS] ${shortDate} 改版解除 (${prevInv}) ` + (node.data.system_log || "")
            }
        })
        gridRef.current?.api.applyTransaction({ update: updates })
        gridRef.current?.api.onFilterChanged()
      }
    },
    archiveSelected: () => {
      captureSnapshot()
      const selected = gridRef.current?.api.getSelectedNodes()
      if (selected && selected.length > 0) {
        // ステータスを変更せず、archivedフラグで独立管理
        const updates = selected.map(node => ({ ...node.data, archived: true }))
        gridRef.current?.api.applyTransaction({ update: updates })
        gridRef.current?.api.onFilterChanged()
      }
    },
    restoreSelected: () => {
      captureSnapshot()
      const selected = gridRef.current?.api.getSelectedNodes()
      if (selected && selected.length > 0) {
        // 復元時はステータスをそのまま保持し、archivedフラグだけ解除
        const updates = selected.map(node => ({ ...node.data, archived: false }))
        gridRef.current?.api.applyTransaction({ update: updates })
        gridRef.current?.api.onFilterChanged()
      }
    },
    customUndo: () => {
      if(undoStack.length > 0) {
        const currentState: any[] = []
        gridRef.current?.api.forEachNode(node => currentState.push({...node.data}))
        setRedoStack(prev => [...prev, currentState])
        const prev = undoStack[undoStack.length - 1]
        setRowData(prev)
        setUndoStack(us => us.slice(0, -1))
      }
    },
    customRedo: () => {
      if(redoStack.length > 0) {
        const currentState: any[] = []
        gridRef.current?.api.forEachNode(node => currentState.push({...node.data}))
        setUndoStack(prev => [...prev, currentState])
        const next = redoStack[redoStack.length - 1]
        setRowData(next)
        setRedoStack(rs => rs.slice(0, -1))
      }
    },
    generateEstimate: () => {
       captureSnapshot()
       const selected = gridRef.current?.api.getSelectedNodes()
       if (!selected || selected.length === 0) { alert("見積情報を付与する行を選択してください。"); return }
       
       // 論理ガード：キャンセルや請求済のデータには見積を追加しない
       const invalid = selected.filter(node => node.data.locked || node.data.status === 'キャンセル');
       if (invalid.length > 0) {
           alert("【エラー】ロック済み（請求済など）またはキャンセルの行に対して、新たに見積番号を採番することはできません。");
           return;
       }

       const updates = selected.map(node => {
          let baseNo = node.data.quote_no;
          let diffMsg = "";

          if (!baseNo || baseNo.trim() === '' || baseNo === '-') {
              baseNo = `QT-${new Date().toISOString().split('T')[0].replace(/-/g, '').slice(2)}-${Math.floor(100 + Math.random()*900)}`
          } else {
              // 既に採番済の再発行（ソフト改版）
              let rev = 0;
              if (baseNo.includes('-Rev')) {
                  const parts = baseNo.split('-Rev');
                  rev = parseInt(parts[1]) || 0;
                  baseNo = parts[0];
              }
              rev += 1;
              baseNo = `${baseNo}-Rev${rev}`;

              // スナップショット比較
              if (node.data.last_qt_snapshot) {
                  try {
                      const old = JSON.parse(node.data.last_qt_snapshot);
                      const changes = [];
                      if (old.qty != node.data.qty) changes.push('数量');
                      if (old.sales_price != node.data.sales_price) changes.push('単価');
                      if (old.markup_rate != node.data.markup_rate) changes.push('掛率');
                      if (changes.length > 0) diffMsg = ` [SYS] QT改版: ${changes.join(',')}変更`;
                  } catch(e) {}
              }
          }

          return { 
              ...node.data, 
              quote_no: baseNo, 
              last_qt_snapshot: JSON.stringify(node.data), // 再発行用の最新スナップを保存
              system_log: diffMsg ? (node.data.system_log || "") + diffMsg : node.data.system_log,
              updated_at: new Date().toISOString() 
          }
       })
       gridRef.current?.api.applyTransaction({ update: updates })
       gridRef.current?.api.onFilterChanged()
    },
    registerOrder: () => {
       captureSnapshot()
       const selected = gridRef.current?.api.getSelectedNodes()
       if (!selected || selected.length === 0) { alert("受注登録する内容（見積中など）を選択してください。"); return }
       
       // 論理ガード：見積中、先行発注以外は受注処理できない（すでに発注済など）
       const invalid = selected.filter(node => !['見積中', '先行発注'].includes(node.data.status));
       if (invalid.length > 0) {
           alert("【エラー】選択された行の中に、受注登録ができないステータスが含まれています。\n※受注登録できるのは「見積中」または「先行発注」のデータのみです。");
           return;
       }

       const orderDate = prompt("受注日（Order Date）を入力してください（例: 2024-04-01）", new Date().toISOString().split('T')[0]);
       if (!orderDate) return;
       const customerPo = prompt("客先発注番号（Customer PO）を入力してください（任意）", "");

       const updates = selected.map(node => {
           // ロジック点検: 見積中なら「発注待」へ。既に先行発注済なら「未請求」へスライド。
           let newStatus = '発注待';
           // if it was preordered, ordering from customer means it goes straight into waiting for invoice.
           if (node.data.status === '先行発注') newStatus = '未請求';
           
           return {
               ...node.data, 
               status: newStatus, 
               order_date: orderDate,
               customer_po: customerPo !== null && customerPo.trim() !== '' ? customerPo : node.data.customer_po,
               updated_at: new Date().toISOString()
           };
       })
       gridRef.current?.api.applyTransaction({ update: updates })
       gridRef.current?.api.onFilterChanged()
    },
    generateSalesNote: () => {
       const selected = gridRef.current?.api.getSelectedNodes()
       if (!selected || selected.length === 0) { alert("Sales Noteを発行する行を選択してください。"); return }
       alert("Sales Note生成: （Phase 3実装予定）※ステータスの自動遷移は行いません。")
    },
    generatePO: () => {
       captureSnapshot()
       const selected = gridRef.current?.api.getSelectedNodes()
       if (!selected || selected.length === 0) { alert("発注書を生成する行を選択してください。"); return }

       // 論理ガード：すでに未請求みのものや、請求済のものは発注書出し直しの意味がない
       const invalid = selected.filter(node => 
           ['未請求', '請求済', 'キャンセル', '材料充当'].includes(node.data.status)
       );
       if (invalid.length > 0) {
           alert("【エラー】選択された行の中に、既に未請求み、または発注不可能なステータスのデータが含まれています。");
           return;
       }

       const updates = selected.map(node => {
          let baseNo = node.data.po_no;
          let diffMsg = "";

          if (!baseNo || baseNo.trim() === '' || baseNo === '-') {
              baseNo = `PO-${new Date().toISOString().split('T')[0].replace(/-/g, '').slice(2)}-${Math.floor(100 + Math.random()*900)}`
          } else {
              // 既に未請求の再出し（ソフト改版）
              let rev = 0;
              if (baseNo.includes('-Rev')) {
                  const parts = baseNo.split('-Rev');
                  rev = parseInt(parts[1]) || 0;
                  baseNo = parts[0];
              }
              rev += 1;
              baseNo = `${baseNo}-Rev${rev}`;

              // スナップショット比較
              if (node.data.last_po_snapshot) {
                  try {
                      const old = JSON.parse(node.data.last_po_snapshot);
                      const changes = [];
                      if (old.qty != node.data.qty) changes.push('数量');
                      if (old.cost_price != node.data.cost_price) changes.push('仕入単価');
                      if (old.supplier != node.data.supplier) changes.push('仕入先');
                      if (changes.length > 0) diffMsg = ` [SYS] PO改版: ${changes.join(',')}修正`;
                  } catch(e) {}
              }
          }
          
          let newStatus = '未請求';
          if (node.data.status === '見積中') newStatus = '先行発注';
          if (node.data.status === '加工中') newStatus = '加工中'; 

          return { 
              ...node.data, 
              status: newStatus, 
              po_date: new Date().toISOString().split('T')[0],
              po_no: baseNo,
              last_po_snapshot: JSON.stringify(node.data), // 再発行用の最新スナップ
              system_log: diffMsg ? (node.data.system_log || "") + diffMsg : node.data.system_log,
              updated_at: new Date().toISOString()
          }
       })
       gridRef.current?.api.applyTransaction({ update: updates })
       gridRef.current?.api.onFilterChanged()
    },
    generateInvoice: () => {
       captureSnapshot()
       const selected = gridRef.current?.api.getSelectedNodes()
       if (!selected || selected.length === 0) { alert("Invoice生成（請求ロック）する行を選択してください。"); return }

       // 論理ガード：見積中や発注も受注もされていない状態でのInvoice発行は異常
       const invalid = selected.filter(node => 
           ['見積中', '発注待', 'キャンセル', '材料充当', '請求済'].includes(node.data.status)
       );
       if (invalid.length > 0) {
           alert("【エラー】受注や発注が確定していない行、または既に請求確定済みの行に対して、Invoiceを発行することはできません。");
           return;
       }

       const updates = selected.map(node => {
          let baseNo = node.data.invoice_no;
          const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '').slice(2);
          if (!baseNo || baseNo.trim() === '' || baseNo === '-') {
              baseNo = `INV-${todayStr}-${Math.floor(1000 + Math.random()*9000)}`;
          } else if (baseNo.includes('-Rev')) {
              baseNo = baseNo.split('-Rev')[0]; // -Revが含まれていればベース部分だけ切り出す
          }
          
          const revision = node.data.revision || 0;
          if (revision > 0) {
              baseNo = `${baseNo}-Rev${revision}`; // 新しいRevisionを結合してRev管理を復活
          }

          // 改版時の変更差分監査ログ (Diff Engine)
          let diffMsg = "";
          if (node.data.last_locked_state) {
              try {
                  const oldData = JSON.parse(node.data.last_locked_state);
                  const changes = [];
                  if (oldData.qty != node.data.qty) changes.push(`数量[${oldData.qty}→${node.data.qty}]`);
                  if (oldData.sales_price != node.data.sales_price) changes.push(`単価[${oldData.sales_price}→${node.data.sales_price}]`);
                  if (oldData.markup_rate != node.data.markup_rate) changes.push(`掛率変更`);
                  if (oldData.item_name != node.data.item_name) changes.push(`品名変更`);
                  if (oldData.item_code != node.data.item_code) changes.push(`品番[${oldData.item_code}→${node.data.item_code}]`);
                  if (changes.length > 0) {
                      diffMsg = ` [SYS] Rev${revision}修正差分: ${changes.join(', ')}`;
                  }
              } catch (e) {
                 console.error("監査ログの生成に失敗", e);
              }
          }

          return { 
              ...node.data, 
              status: '請求済', // 入金待ちは管理しないため、これが論理的な最終点
              invoice_date: new Date().toISOString().split('T')[0],
              invoice_no: baseNo,
              locked: true,
              last_locked_state: null, // 差分チェック完了後にスナップショットを破棄
              system_log: diffMsg ? (node.data.system_log || "") + diffMsg : node.data.system_log,
              updated_at: new Date().toISOString()
          }
       })
       gridRef.current?.api.applyTransaction({ update: updates })
       gridRef.current?.api.onFilterChanged()
    },
    saveData: async () => {
       const rowDataToSave: any[] = []
       gridRef.current?.api.forEachNode(node => rowDataToSave.push({
           ...node.data,
           updated_at: new Date().toISOString()
       }))
       
       const { error } = await supabase
         .from('order_items')
         .upsert(rowDataToSave, { onConflict: 'id' })
       
       if (error) {
         alert('保存に失敗しました: ' + error.message)
       } else {
         alert('データをクラウドに保存しました！')
       }
    }
  }))

  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const PAGE_SIZE = 100;

  const buildBaseQuery = (withCount = false) => {
      let query = supabase.from('order_items').select('*', withCount ? { count: 'exact' } : undefined);
      
      // role ベースのフィルタ
      if (session?.user?.role_id !== 'admin' && session?.user?.name) {
          query = query.eq('rep', session.user.name);
      }

      // タブごとのフィルタ
      if (activeTab === 'archived') {
          query = query.eq('archived', true);
      } else {
          query = query.or('archived.is.null,archived.eq.false');
          if (activeTab === 'quote') query = query.eq('status', '見積中');
          if (activeTab === 'alert_po') query = query.eq('status', '発注待');
          if (activeTab === 'pre_order') query = query.eq('status', '先行発注');
          if (activeTab === 'process') query = query.in('status', ['加工中', '材料充当']);
          if (activeTab === 'pending_invoice') {
              query = query.in('status', ['未請求', '加工中']).is('invoice_no', null);
          }
      }
      return query;
  };

  useEffect(() => {
     fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const query = buildBaseQuery(true).order('created_at', { ascending: false }).order('id', { ascending: true }).range(0, PAGE_SIZE - 1);
      
      const { data, error, count } = await query;
      
      if (error) {
        console.error('Supabase fetch error:', error)
      } else {
        setRowData(data || [])
        setPage(1);
        if (count !== null) setTotalCount(count);
        setHasMore((data?.length || 0) === PAGE_SIZE);
      }
    } catch (e) {
      console.error('Fetch exception:', e)
    } finally {
      setIsLoading(false);
    }
  }

  const loadMoreData = async () => {
      if (!hasMore || isLoading) return;
      try {
          setIsLoading(true);
          const from = page * PAGE_SIZE;
          const to = from + PAGE_SIZE - 1;
          const query = buildBaseQuery(false).order('created_at', { ascending: false }).order('id', { ascending: true }).range(from, to);
          
          const { data, error } = await query;
          if (error) throw error;

          if (data && data.length > 0) {
              setRowData(prev => [...prev, ...data]);
              setPage(p => p + 1);
              if (data.length < PAGE_SIZE) setHasMore(false);
          } else {
              setHasMore(false);
          }
      } catch (e) {
          console.error("Load more error:", e);
      } finally {
          setIsLoading(false);
      }
  }

  // Handle local scroll for infinite loading
  const onBodyScroll = (event: any) => {
      if (event.direction === 'vertical') {
          const api = gridRef.current?.api;
          if (!api || !hasMore || isLoading) return;
          // Approximate check if we are near the bottom
          const lastRowIndex = api.getLastDisplayedRowIndex();
          if (lastRowIndex >= rowData.length - 10) {
              loadMoreData();
          }
      }
  };

  const isExternalFilterPresent = useCallback(() => true, [])
  const doesExternalFilterPass = useCallback((node: any) => {
     if (!node.data) return false;
     
     if (session?.user?.role_id !== 'admin' && node.data.rep) {
        if (node.data.rep !== session?.user?.name) return false;
     }

     if (activeTab === 'archived') {
        return node.data.archived === true;
     } else {
        if (node.data.archived === true) return false;
        if (activeTab === 'quote') return node.data.status === '見積中';
        if (activeTab === 'alert_po') return node.data.status === '発注待';
        if (activeTab === 'pre_order') return node.data.status === '先行発注';
        if (activeTab === 'process') return node.data.status === '加工中' || node.data.status === '材料充当';
        if (activeTab === 'pending_invoice') return (node.data.status === '未請求' || node.data.status === '加工中') && !node.data.invoice_no;
        return true; 
     }
  }, [activeTab, session])

  useEffect(() => {
     if (gridRef.current?.api) gridRef.current.api.onFilterChanged();
  }, [activeTab, session])


  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!gridRef.current?.api) return
      
      const editingCells = gridRef.current.api.getEditingCells()
      if (editingCells.length > 0) return 

      const focusedCell = gridRef.current.api.getFocusedCell()
      if (!focusedCell) return

      e.preventDefault()
      const pastedText = e.clipboardData?.getData('Text')
      if (!pastedText) return

      captureSnapshot()
      const rowsData = pastedText.split(/\r\n|\n|\r/)
      if (rowsData[rowsData.length - 1] === "") rowsData.pop()

      const displayedColumns = gridRef.current.api.getAllDisplayedColumns()
      const startColIndex = displayedColumns.findIndex(c => c.getColId() === focusedCell.column.getColId())
      if (startColIndex < 0) return
      
      const rowNodes: any[] = []
      gridRef.current.api.forEachNode(node => rowNodes.push(node))

      let startRowIndex = focusedCell.rowIndex || 0

      for (let i = 0; i < rowsData.length; i++) {
          const targetRowIndex = startRowIndex + i
          if (targetRowIndex >= rowNodes.length) {
              const newRow = { 
                  id: crypto.randomUUID(), 
                  status: '見積中',
                  rep: session?.user?.name || '',
                  created_at: new Date().toISOString(),
                  locked: false
              }
              gridRef.current.api.applyTransaction({ add: [newRow] })
              rowNodes.length = 0
              gridRef.current.api.forEachNode(node => rowNodes.push(node))
          }

          const targetNode = rowNodes[targetRowIndex]
          const cells = rowsData[i].split('\t')

          for (let j = 0; j < cells.length; j++) {
              const targetColIndex = startColIndex + j
              if (targetColIndex >= displayedColumns.length) break
              const col = displayedColumns[targetColIndex]
              
              if (col.getColDef().editable) {
                  const field = col.getColDef()?.field
                  if (!field) continue

                  let val: any = cells[j].trim()
                  if (col.getColDef().type === 'numericColumn' && val !== '') {
                      const num = parseFloat(val.toString().replace(/,/g, ''))
                      if (!isNaN(num)) val = num
                  }
                  
                  if (field === 'status' && targetRowIndex >= rowNodes.length - rowsData.length) {
                     val = '見積中'
                  }
                  
                  targetNode.setDataValue(field, val)
              }
          }
      }
      gridRef.current.api.onFilterChanged()
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [captureSnapshot, session])


  const getRowStyle = (params: any) => {
    if (!params.data) return {};
    const base = { backgroundColor: '', color: '', fontStyle: 'normal', fontWeight: 'normal', textDecoration: 'none' };
    if (params.data.archived) return { ...base, backgroundColor: '#f3f4f6', color: '#9ca3af', fontStyle: 'italic' };
    if (params.data.locked) return { ...base, backgroundColor: '#f8fafc', color: '#94a3b8' };
    if (params.data.status === '材料充当') return { ...base, backgroundColor: '#e2e8f0', color: '#64748b', fontStyle: 'italic' };
    if (params.data.status === '発注待') return { ...base, backgroundColor: '#fee2e2', color: '#b91c1c', fontWeight: '700' };
    if (params.data.status === '未請求') return { ...base, color: '#047857' };
    if (params.data.status === '加工中') return { ...base, backgroundColor: '#e0e7ff', color: '#3730a3', fontWeight: '700' };
    return base;
  }
  

  const getPriceWarningStyle = (params: any) => {
     if (!params.value || !params.data.item_code) return {};
     const history = itemMasterDB[params.data.item_code];
     if (!history) return {};
     
     if (params.colDef.field === 'cost_price' && parseFloat(params.value) !== history.costPrice) {
         return { backgroundColor: '#fffac9', color: '#d97706', fontWeight: 'bold' };
     }
     if (params.colDef.field === 'sales_price' && parseFloat(params.value) !== history.salesPrice) {
         return { backgroundColor: '#fffac9', color: '#d97706', fontWeight: 'bold' };
     }
     return {};
  }

  const numFmt = (params: any) => {
    if (params.value === null || params.value === undefined || params.value === '') return '';
    const n = parseFloat(params.value);
    if (isNaN(n)) return params.value;
    return n.toLocaleString('ja-JP', { maximumFractionDigits: 4 });
  };

  const columnDefs = useMemo(() => {
    const rawCols = [
        { 
           headerName: "1. 管理・取引先", 
           children: [
               { headerName: "", field: "selected", checkboxSelection: true, headerCheckboxSelection: true, width: 40, pinned: 'left', suppressHeaderMenuButton: true, filter: false, floatingFilter: false, sortable: false },
               { headerName: "ｽﾃｰﾀｽ", field: "status", editable: true, width: 88, pinned: 'left',
                 headerTooltip: "取引ステータス（見積中 / 発注待 / 未請求 / 先行発注 / 加工中 / 材料充当 / 請求済 / キャンセル）",
                 cellRenderer: StatusBadgeRenderer,
                 cellEditor: 'agSelectCellEditor', 
                 cellEditorParams: { values: ['見積中', '発注待', '未請求', '先行発注', '加工中', '材料充当', '請求済', 'キャンセル'] },
                 valueSetter: (params: any) => {
                     const allowed = ['見積中', '発注待', '未請求', '先行発注', '加工中', '材料充当', '請求済', 'キャンセル']
                     if (allowed.includes(params.newValue)) {
                         params.data.status = params.newValue
                         return true
                     }
                     return false 
                 }
               },
               { headerName: "担当", field: "rep", editable: false, width: 60,
                 headerTooltip: "担当営業" },
               { headerName: "リンク", field: "link_id", editable: false, width: 100,
                 headerTooltip: "関連行のリンクID（分割等で共通のグループIDが付与）",
                 cellStyle: { color: '#3b82f6', fontWeight: 'bold' } },
               { headerName: "客先発注No", field: "customer_po", editable: true, width: 110,
                 headerTooltip: "顧客側での発注番号(PO)" },
               { headerName: "当社発注No", field: "order_no", editable: false, width: 110,
                 headerTooltip: "自動採番",
                 cellStyle: { backgroundColor: '#f1f5f9', color: '#64748b' } },
               { headerName: "Invoice", field: "invoice_no", editable: false, width: 90,
                 headerTooltip: "自動採番",
                 cellStyle: { backgroundColor: '#f1f5f9', color: '#64748b' } },
               { headerName: "得意先", field: "customer", editable: true, width: 130, pinned: 'left',
                 headerTooltip: "請求先の顧客名（直接先）" },
               { headerName: "ユーザー", field: "end_user", editable: true, width: 120,
                 headerTooltip: "エンドユーザー（最終消費者・ブランド等）" },
               { headerName: "仕入先", field: "supplier", editable: true, width: 120,
                 headerTooltip: "仕入先（製造元・卸元）" },
           ]
        },
        { 
           headerName: "2. 商品情報", 
           children: [
               { headerName: "カテゴリ", field: "category", editable: true, width: 100,
                 headerTooltip: "商品カテゴリ",
                 cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['PUテープ', 'リボン', 'レース', 'ボタン', 'パーツ', 'キット/加工品'] } },
               { headerName: "当社品番", field: "item_code", editable: true, width: 110,
                 headerTooltip: "当社の管理品番" },
               { headerName: "仕入先品番", field: "supplier_item_code", editable: true, width: 120,
                 headerTooltip: "メーカーや仕入先での品番" },
               { headerName: "品名・仕様", field: "item_name", editable: true, width: 180,
                 headerTooltip: "商品名・仕様詳細（混率など）" },
               { headerName: "数量", field: "qty", editable: true, width: 75, type: 'numericColumn',
                 headerTooltip: "取引数量" },
               { headerName: "単位", field: "unit", editable: true, width: 65,
                 headerTooltip: "数量単位（roll / pcs 等）" },
               { headerName: "仕立(数)", field: "package_qty", editable: true, width: 85, type: 'numericColumn',
                 headerTooltip: "パッケージ（巻・箱）あたりの数量" },
               { headerName: "仕立(単位)", field: "package_unit", editable: true, width: 85,
                 headerTooltip: "パッケージあたりの単位（m / bobbin 等）" },
           ]
        },
        { 
           headerName: "3. 単価と採算計算",
           children: [
               { headerName: "[仕入] 通貨", field: "cost_currency", editable: true, width: 95,
                 headerTooltip: "仕入通貨",
                 cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['JPY', 'USD', 'EUR', 'CNY'] } },
               { headerName: "[仕入] 単価",  field: "cost_price", editable: true, width: 95, type: 'numericColumn',
                 headerTooltip: "仕入単価（仕入通貨ベース）。品番入力を起点に過去価格を提案",
                 cellRenderer: PriceCellRenderer,
                 cellStyle: getPriceWarningStyle },
               { headerName: "[仕入] 合計", field: "cost_total", editable: false, width: 100, type: 'numericColumn',
                 headerTooltip: "数量 × 仕入単価",
                 valueGetter: (params: any) => { if (!params.data.qty || !params.data.cost_price) return null; return params.data.qty * params.data.cost_price; },
                 valueFormatter: numFmt,
                 cellStyle: { backgroundColor: '#f1f5f9', color: '#64748b' } },
               { headerName: "採算為替", field: "internal_rate", 
                 editable: (p: any) => p.data.cost_currency === 'JPY' && p.data.sales_currency !== 'JPY', 
                 width: 85, type: 'numericColumn',
                 headerTooltip: "社内採算為替レート（円仕入・外貨販売の粗利計算用）",
                 valueFormatter: numFmt,
                 cellStyle: (p: any) => p.data.cost_currency === 'JPY' && p.data.sales_currency !== 'JPY' ? {} : { backgroundColor: '#f1f5f9', color: '#94a3b8' } },
               { headerName: "実勢為替", field: "exchange_rate", 
                 editable: (p: any) => p.data.cost_currency !== 'JPY' || p.data.sales_currency !== 'JPY', 
                 width: 85, type: 'numericColumn',
                 headerTooltip: "BL確定後の実勢為替レート",
                 valueFormatter: numFmt,
                 cellStyle: (p: any) => p.data.cost_currency !== 'JPY' || p.data.sales_currency !== 'JPY' ? { backgroundColor: '#eff6ff', color: '#1e3a8a'} : { backgroundColor: '#f1f5f9', color: '#94a3b8' } },
               { headerName: "[経費] 通貨", field: "misc_currency", editable: true, width: 95,
                 cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['JPY', 'USD', 'EUR', 'CNY'] } },
               { headerName: "[経費] 金額", field: "misc_cost", editable: true, width: 95, type: 'numericColumn',
                 valueFormatter: numFmt },
               { headerName: "掛率", field: "markup_rate", editable: true, width: 75,
                 headerTooltip: "販売掛率（例: 1.5。手動上書きで自動切替）",
                 cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['1.2', '1.3', '1.5', '2.0', '手動(ﾏﾆｭｱﾙ)', '現法自動'] } },
               { headerName: "[販売] 通貨", field: "sales_currency", editable: true, width: 95,
                 cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['JPY', 'USD', 'EUR', 'CNY'] } },
               { headerName: "[販売] 単価", field: "sales_price", editable: true, width: 95, type: 'numericColumn',
                 headerTooltip: "販売単価（販売通貨ベース）。過去価格提案の対象",
                 cellRenderer: PriceCellRenderer,
                 cellStyle: getPriceWarningStyle },
               { headerName: "[販売] 合計", field: "sales_total", editable: false, width: 100, type: 'numericColumn',
                 headerTooltip: "数量 × 販売単価",
                 valueGetter: (params: any) => { if (!params.data.qty || !params.data.sales_price) return null; return params.data.qty * params.data.sales_price; },
                 valueFormatter: numFmt,
                 cellStyle: { backgroundColor: '#f1f5f9', color: '#64748b' } },
               { headerName: "[ﾕｰｻﾞｰ]通貨", field: "end_user_currency", editable: true, width: 95,
                 headerTooltip: "ユーザー向け末端通貨",
                 cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['JPY', 'USD', 'EUR', 'CNY'] },
                 cellStyle: (params: any) => (params.data.customer==='Sun Fashion America' || params.data.customer==='NY Sub') ? {backgroundColor:'#fff7ed'} : {} },
               { headerName: "[ﾕｰｻﾞｰ]価格", field: "end_user_price", editable: true, width: 95, type: 'numericColumn',
                 headerTooltip: "エンドユーザー向け末端単価（3社間用）",
                 valueFormatter: numFmt,
                 cellStyle: (params: any) => (params.data.customer==='Sun Fashion America' || params.data.customer==='NY Sub') ? {backgroundColor:'#fff7ed'} : {} },
               { headerName: "[ﾕｰｻﾞｰ]合計", field: "end_user_total", editable: false, width: 95, type: 'numericColumn',
                 headerTooltip: "数量 × エンドユーザー単価",
                 valueGetter: (params: any) => { if (!params.data.qty || !params.data.end_user_price) return null; return params.data.qty * params.data.end_user_price; },
                 valueFormatter: numFmt,
                 cellStyle: { backgroundColor: '#f1f5f9', color: '#64748b' } },
               { headerName: "粗利(円)", field: "gross_profit", editable: false, width: 95, type: 'numericColumn',
                 headerTooltip: "粗利（円換算）。BL日付入力で自動的に実勢為替に切り替わり計算",
                 valueGetter: (params: any) => {
                     if (!params.data.sales_price || !params.data.qty || !params.data.cost_price) return null;
                     const isDomestic = params.data.cost_currency === 'JPY' && params.data.sales_currency === 'JPY';
                     let isFinalized = Boolean(params.data.bl_date && params.data.exchange_rate);
                     let baseRate = 1.0;
                     if (!isDomestic) {
                         baseRate = isFinalized ? params.data.exchange_rate : (params.data.internal_rate || 145.0);
                     }
                     const qty = params.data.qty;
                     let salesJPY = params.data.sales_currency === 'JPY' ? params.data.sales_price : params.data.sales_price * baseRate;
                     let costJPY = params.data.cost_currency === 'JPY' ? params.data.cost_price : params.data.cost_price * baseRate;
                     let miscJPY = params.data.misc_cost || 0;
                     const gp = (salesJPY * qty) - (costJPY * qty) - miscJPY;
                     return Math.floor(gp).toLocaleString();
                 },
                 cellStyle: { backgroundColor: '#f1f5f9', color: '#64748b', fontWeight: 'bold' }
               },
               { headerName: "粗利率", field: "gross_margin", editable: false, width: 85, type: 'numericColumn',
                 headerTooltip: "粗利額 ÷ [販売]合計金額",
                 valueGetter: (params: any) => {
                     if (!params.data.sales_price || !params.data.qty || !params.data.cost_price) return null;
                     const isDomestic = params.data.cost_currency === 'JPY' && params.data.sales_currency === 'JPY';
                     let isFinalized = Boolean(params.data.bl_date && params.data.exchange_rate);
                     let baseRate = 1.0;
                     if (!isDomestic) {
                         baseRate = isFinalized ? params.data.exchange_rate : (params.data.internal_rate || 145.0);
                     }
                     const qty = params.data.qty;
                     let salesJPY = params.data.sales_currency === 'JPY' ? params.data.sales_price : params.data.sales_price * baseRate;
                     let costJPY = params.data.cost_currency === 'JPY' ? params.data.cost_price : params.data.cost_price * baseRate;
                     let miscJPY = params.data.misc_cost || 0;
                     const salesTotalJPY = salesJPY * qty;
                     if (salesTotalJPY === 0) return null;
                     const gp = salesTotalJPY - (costJPY * qty) - miscJPY;
                     const margin = (gp / salesTotalJPY) * 100;
                     return margin.toFixed(1) + '%';
                 },
                 cellStyle: (params: any) => {
                     let color = '#059669'; // Green text
                     if (params.value) {
                         const m = parseFloat(params.value);
                         if (m < 0) color = '#ef4444'; // Red alarm
                     }
                     return { backgroundColor: '#f1f5f9', color: color, fontWeight: 'bold' };
                 }
               },
           ]
        },
        { 
           headerName: "4. 見積・受注", 
           children: [
               { headerName: "見積番 ※", field: "quote_no", editable: false, width: 105,
                 headerTooltip: "自動採番",
                 cellStyle: { backgroundColor: '#f1f5f9', color: '#64748b' } },
               { headerName: "見積備考", field: "quote_remarks", editable: true, width: 140,
                 headerTooltip: "見積書に表示させる用件・補足" },
               { headerName: "受注日", field: "order_date", editable: true, width: 95 },
           ]
        },
        { 
           headerName: "5. 発注・生産", 
           children: [
               { headerName: "発注日", field: "po_date", editable: false, width: 90 },
               { headerName: "出荷予定", field: "factory_date", editable: true, width: 95 },
               { headerName: "発注備考", field: "po_remarks", editable: true, width: 140,
                 headerTooltip: "発注書に表示させる用件・補足" },
           ]
        },
        { 
           headerName: "6. 出荷・請求・入金", 
           children: [
               { headerName: "BL DATE", field: "bl_date", editable: true, width: 100,
                 headerTooltip: "船積日（実勢為替発動スイッチ）",
                 cellStyle: { backgroundColor: '#eff6ff' } },
               { headerName: "請求書発行日", field: "invoice_date", editable: false, width: 100 },
               { headerName: "支払いTERM", field: "payment_term", editable: true, width: 100 },
               { headerName: "入金日", field: "payment_date", editable: true, width: 95 },
               { headerName: "請求備考", field: "invoice_remarks", editable: true, width: 140,
                 headerTooltip: "Invoiceに表示させる特記事項" },
           ]
        },
        { 
           headerName: "7. メモ・備考", 
           children: [
               { headerName: "コメント・備考", field: "comments", editable: true, width: 250,
                 headerTooltip: "各行に対する自由記述メモ等",
                 cellEditor: 'agLargeTextCellEditor', cellEditorPopup: true },
               { headerName: "システムログ", field: "system_log", editable: false, width: 250,
                 headerTooltip: "自動記録される改版や分割履歴",
                 cellStyle: { color: '#64748b', fontSize: '12px' } }
           ]
        }
    ];

    // 入金状況タブの場合、決済情報を左側の見やすい位置（管理情報のすぐ後）に繰り上げる
    if (activeTab === 'payment') {
        const pmtGroup = rawCols.find(g => g.headerName.startsWith('6.'));
        if (pmtGroup) {
            const others = rawCols.filter(g => !g.headerName.startsWith('6.'));
            others.splice(1, 0, pmtGroup); // 1. 管理・取引先の次に挿入
            return others;
        }
    }
    return rawCols;
  }, [activeTab]);

  const defaultColDef = useMemo(() => ({
    resizable: true,
    sortable: true,
    filter: true,
    floatingFilter: true, // 2段構成にする（下段にフィルターを追い出す）
    suppressHeaderMenuButton: true, // 1段目の項目名と同じ列にあるアイコンは完全に消して文字を広く見せる
    tooltipShowDelay: 0,
  }), [])

  // Phase 1: 高度なセルチェンジフック
  const onCellValueChanged = useCallback((params: any) => {
     captureSnapshot()
     
     const colId = params.colDef.field;
     const rowData = params.data;
     
     // 1. マスターDB補完
     if (colId === 'item_code' && params.newValue) {
         const masterData = itemMasterDB[params.newValue];
         if (masterData) {
             params.node.setDataValue('item_name', masterData.itemName);
             params.node.setDataValue('category', masterData.category);
             // 品番入力時、仕入/販売価格が未設定ならマスタ価格で初期補完
             if (!rowData.cost_price) params.node.setDataValue('cost_price', masterData.costPrice);
             if (!rowData.sales_price) params.node.setDataValue('sales_price', masterData.salesPrice);
             
             // リフレッシュによりWarningスタイルやサジェスト表示を即時評価
             if (params.api) {
                 params.api.refreshCells({ rowNodes: [params.node], columns: ['cost_price', 'sales_price'] });
             }
         }
     }

     // 2. SFA逆算ロジック
     const isSFA = (rowData.customer === 'Sun Fashion America' || rowData.customer === 'NY Sub' || rowData.customer === 'アメリカ現法');
     
     if (isSFA) {
         if (colId === 'cost_price' || colId === 'category' || colId === 'customer') {
             if (rowData.cost_price && rowData.category) {
                 let catRate = 2.0;
                 if(rowData.category === 'リボン') catRate = 2.5;
                 if(rowData.category === 'レース') catRate = 3.0;
                 if(rowData.category === 'PUテープ') catRate = 1.8;
                 
                 const endUserPrice = rowData.cost_price * catRate;
                 const hqSalesPrice = endUserPrice * 0.7; // 本社取り分30%マージン

                 if (rowData.end_user_price !== endUserPrice) params.node.setDataValue('end_user_price', endUserPrice);
                 if (rowData.sales_price !== hqSalesPrice) params.node.setDataValue('sales_price', hqSalesPrice);
                 if (rowData.markup_rate !== '現法自動') params.node.setDataValue('markup_rate', '現法自動');
             }
         }
     } else {
         // 通常の掛率・手動検知エンジン
         if (colId === 'sales_price') {
             let isAutoSet = false;
             if (rowData.markup_rate && rowData.markup_rate !== '手動(ﾏﾆｭｱﾙ)' && rowData.markup_rate !== '現法自動') {
                 const rate = parseFloat(rowData.markup_rate);
                 if (!isNaN(rate) && rowData.cost_price) {
                     const expected = rowData.cost_price * rate;
                     if (Math.abs(parseFloat(params.newValue) - expected) < 0.001) {
                         isAutoSet = true;
                     }
                 }
             }
             if (!isAutoSet && rowData.markup_rate !== '手動(ﾏﾆｭｱﾙ)' && rowData.markup_rate !== '現法自動') {
                 params.node.setDataValue('markup_rate', '手動(ﾏﾆｭｱﾙ)');
             }
         }
         
         if (colId === 'cost_price' || colId === 'markup_rate') {
             if (rowData.markup_rate && rowData.markup_rate !== '手動(ﾏﾆｭｱﾙ)' && rowData.markup_rate !== '現法自動') {
                 const rate = parseFloat(rowData.markup_rate);
                 if (!isNaN(rate) && rowData.cost_price) {
                     const calculatedSales = rowData.cost_price * rate;
                     if (rowData.sales_price !== calculatedSales) {
                         params.node.setDataValue('sales_price', calculatedSales);
                     }
                 }
             }
         }
     }

     if (gridRef.current?.api && colId === 'status') {
        gridRef.current.api.onFilterChanged()
     }
  }, [captureSnapshot])

  return (
    <div className="ag-theme-alpine w-full h-full text-sm relative">
      {totalCount !== null && (
         <div className="absolute bottom-6 right-6 z-50 bg-slate-800/90 backdrop-blur-sm text-white px-4 py-2 rounded-full shadow-xl border border-slate-700/50 flex items-center pointer-events-none">
             <Database size={14} className="mr-2 text-slate-400" />
             <span className="font-medium text-slate-300 text-xs tracking-wider mr-2">該当データ</span>
             <span className="font-bold text-amber-400 text-sm">{totalCount.toLocaleString()}</span>
             <span className="font-medium text-slate-300 text-xs tracking-wider ml-1">件</span>
         </div>
      )}
      <AgGridReact
        ref={gridRef}
        rowData={isLoading && page === 0 ? undefined : rowData} 
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        rowSelection="multiple"
        getRowStyle={getRowStyle}
        onCellValueChanged={onCellValueChanged}
        getRowId={(params) => params.data.id}
        enableRangeSelection={true}
        clipboardDelimiter={'\t'}
        isExternalFilterPresent={isExternalFilterPresent}
        doesExternalFilterPass={doesExternalFilterPass}
        onBodyScroll={onBodyScroll}
        localeText={AG_GRID_LOCALE_JP}
        autoSizeStrategy={{ type: 'fitCellContents' }}
      />
      {selectedRowData && (
         <OrderDetailModal 
            data={selectedRowData} 
            onClose={() => setSelectedRowData(null)} 
            onSave={(updatedData) => {
                captureSnapshot()
                const rowNode = gridRef.current?.api.getRowNode(updatedData.id)
                if (rowNode) {
                    rowNode.updateData(updatedData)
                } else {
                    gridRef.current?.api.applyTransaction({ update: [updatedData] })
                }
                gridRef.current?.api.onFilterChanged()
                setSelectedRowData(null)
            }} 
         />
      )}
    </div>
  )
})

export default GridArea
