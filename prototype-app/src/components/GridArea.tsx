import React from 'react'
import { useState, useEffect, useMemo, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'
import { AllEnterpriseModule } from 'ag-grid-enterprise'

ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule])

import { supabase } from '../lib/supabase'

interface GridAreaProps {
  activeTab: string;
  session: any;
}

// Phase 1: Mock Item Master DB (品番による補完や、過去の価格乖離警告用)
const itemMasterDB: any = {
    "MW-0806T": { itemName: "モビロンテープ", category: "PUテープ", costPrice: 120.0, salesPrice: 200.0 },
    "RIBBON-001": { itemName: "サテンリボン", category: "リボン", costPrice: 50.0, salesPrice: 80.0 },
    "R-F-0099": { itemName: "ストレッチレース", category: "レース", costPrice: 15.5, salesPrice: 22.0 }
};

// ステータスバッジ — モジュールレベルのReact関数コンポーネント（AG Grid React必須形式）
const StatusBadgeRenderer = (params: any) => {
  if (!params.value) return null;
  const styleMap: Record<string, React.CSSProperties> = {
    '見積中':   { background: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe' },
    '発注待':   { background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', fontWeight: 700 },
    '発注済':   { background: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0' },
    '先行発注': { background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' },
    '加工中':   { background: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe', fontWeight: 700 },
    '材料充当': { background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' },
    '請求済':   { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' },
    'キャンセル': { background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca' },
  };
  const s = styleMap[params.value] || { background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' };
  return (
    <span style={{ ...s, padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', whiteSpace: 'nowrap', display: 'inline-block', marginTop: '3px' }}>
      {params.value}
    </span>
  );
};

const GridArea = forwardRef(({ activeTab, session }: GridAreaProps, ref) => {
  const gridRef = useRef<AgGridReact>(null)
  const [rowData, setRowData] = useState<any[]>([])

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
    addRow: (status: string) => {
      captureSnapshot()
      const newRow = {
        id: crypto.randomUUID(),
        status: status,
        item_name: '新規アイテムを入力',
        rep: session?.user?.name || '',
        qty: 0,
        markup_rate: '1.0',
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

      // リンクIDの付与（分割グループ）
      let spId = `SPL-${Math.floor(1000 + Math.random()*9000)}`;
      let newLinkId = data.link_id ? data.link_id + ", " + spId : spId;
      
      const updatedOriginal = {
          ...data,
          qty: currentQty - splitQty,
          link_id: newLinkId,
          updated_at: new Date().toISOString()
      };

      const newRowData = {
          ...data,
          id: crypto.randomUUID(),
          qty: splitQty,
          link_id: newLinkId,
          comments: `[SYS] ${spId}により分割 ` + (data.comments || ""),
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
          nData.comments = `[SYS] ${prcId}へ投入 ` + (nData.comments || "");
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
          comments: `[SYS] 材料費 ${Math.floor(totalCostJpy)}円 + 加工賃 ${extraCost}円 = 仕入原価`,
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
            
            // ロジック点検: 請求済をロック解除した場合は「見積中」ではなく「発注済」に戻す。
            // そこで修正して再度Invoiceを発行するために Revision をカウントアップする。
            let newStatus = node.data.status;
            let currentRev = node.data.revision || 0;
            
            if (node.data.status === '請求済') {
                newStatus = '発注済';
                currentRev += 1; // Unlock時に改版カウントを上げる
            }

            return { 
               ...node.data, 
               locked: false, 
               status: newStatus,
               revision: currentRev,
               last_locked_state: JSON.stringify(node.data), // 変更差分比較用・改版直前のスナップショットを内部に隠し持つ
               comments: `[SYS] ${shortDate} 改版解除 (${prevInv}) ` + (node.data.comments || "")
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
              comments: (node.data.comments || "") + diffMsg,
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

       const updates = selected.map(node => {
           // ロジック点検: 見積中なら「発注待」へ。既に先行発注済なら「発注済」へスライド。
           let newStatus = '発注待';
           if (node.data.status === '先行発注') newStatus = '発注済';
           
           return {
               ...node.data, 
               status: newStatus, 
               order_date: new Date().toISOString().split('T')[0],
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

       // 論理ガード：すでに発注済みのものや、請求済のものは発注書出し直しの意味がない
       const invalid = selected.filter(node => 
           ['発注済', '請求済', 'キャンセル', '材料充当'].includes(node.data.status)
       );
       if (invalid.length > 0) {
           alert("【エラー】選択された行の中に、既に発注済み、または発注不可能なステータスのデータが含まれています。");
           return;
       }

       const updates = selected.map(node => {
          let baseNo = node.data.po_no;
          let diffMsg = "";

          if (!baseNo || baseNo.trim() === '' || baseNo === '-') {
              baseNo = `PO-${new Date().toISOString().split('T')[0].replace(/-/g, '').slice(2)}-${Math.floor(100 + Math.random()*900)}`
          } else {
              // 既に発注済の再出し（ソフト改版）
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
          
          let newStatus = '発注済';
          if (node.data.status === '見積中') newStatus = '先行発注';
          if (node.data.status === '加工中') newStatus = '加工中'; 

          return { 
              ...node.data, 
              status: newStatus, 
              po_date: new Date().toISOString().split('T')[0],
              po_no: baseNo,
              last_po_snapshot: JSON.stringify(node.data), // 再発行用の最新スナップ
              comments: (node.data.comments || "") + diffMsg,
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
              comments: (node.data.comments || "") + diffMsg,
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

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Supabase fetch error:', error)
      } else {
        setRowData(data || [])
      }
    } catch (e) {
      console.error('Fetch exception:', e)
    }
  }

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
        if (activeTab === 'pending_invoice') return (node.data.status === '発注済' || node.data.status === '加工中') && !node.data.invoice_no;
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
    if (params.data.status === '発注済') return { ...base, color: '#047857' };
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

  const [columnDefs] = useState<any>([
    { 
       headerName: "基本情報", 
       children: [
           { headerName: "", field: "selected", checkboxSelection: true, headerCheckboxSelection: true, width: 40, pinned: 'left', suppressHeaderMenuButton: true, filter: false, floatingFilter: false, sortable: false },
           { headerName: "ｽﾃｰﾀｽ", field: "status", editable: true, width: 88, pinned: 'left',
             headerTooltip: "取引ステータス（見積中 / 発注待 / 発注済 / 先行発注 / 加工中 / 材料充当 / 請求済 / キャンセル）",
             cellRenderer: StatusBadgeRenderer,
             cellEditor: 'agSelectCellEditor', 
             cellEditorParams: { values: ['見積中', '発注待', '発注済', '先行発注', '加工中', '材料充当', '請求済', 'キャンセル'] },
             valueSetter: (params: any) => {
                 const allowed = ['見積中', '発注待', '発注済', '先行発注', '加工中', '材料充当', '請求済', 'キャンセル']
                 if (allowed.includes(params.newValue)) {
                     params.data.status = params.newValue
                     return true
                 }
                 return false 
             }
           },
           { headerName: "見積番 ※", field: "quote_no", editable: false, width: 105, pinned: 'left',
             headerTooltip: "※ システム自動採番（見積書生成時に付与）",
             cellStyle: { backgroundColor: '#f1f5f9', color: '#64748b' } },
           { headerName: "受注日", field: "order_date", editable: true, width: 95, pinned: 'left',
             headerTooltip: "受注登録ボタン押下時に自動打刻される受注確定日" },
           { headerName: "受注番号", field: "order_id", editable: true, width: 110, pinned: 'left',
             headerTooltip: "顧客から通知された発注番号（PO番号等）を手入力" },
           { headerName: "担当", field: "rep", editable: false, width: 60,
             headerTooltip: "担当営業（ログインユーザーから自動設定）" },
       ]
    },
    { 
       headerName: "取引先", 
       children: [
           { headerName: "得意先", field: "customer", editable: true, width: 130,
             headerTooltip: "請求先の顧客名（直接先）" },
           { headerName: "ユーザー", field: "end_user", editable: true, width: 120,
             headerTooltip: "エンドユーザー（最終消費者・商品ブランド等）" },
           { headerName: "仕入先", field: "supplier", editable: true, width: 120,
             headerTooltip: "仕入先（製造元・卸元）" },
       ]
    },
    { 
       headerName: "商品情報", 
       children: [
           { headerName: "カテゴリ", field: "category", editable: true, width: 100,
             headerTooltip: "商品カテゴリ（PUテープ / リボン / レース / ボタン / パーツ / キット/加工品）",
             cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['PUテープ', 'リボン', 'レース', 'ボタン', 'パーツ', 'キット/加工品'] } },
           { headerName: "品番", field: "item_code", editable: true, width: 110,
             headerTooltip: "商品コード（品番）。入力でマスタ自動補完" },
           { headerName: "品名・仕様", field: "item_name", editable: true, width: 180,
             headerTooltip: "商品名・仕様詳細" },
           { headerName: "数量", field: "qty", editable: true, width: 75, type: 'numericColumn',
             headerTooltip: "取引数量" },
           { headerName: "単位", field: "unit", editable: true, width: 65,
             headerTooltip: "数量の単位（PCS / MTR / YRD / SET / GRS 等）" },
       ]
    },
    { 
       headerName: "単価 / 採算",
       children: [
           { headerName: "仕入",  field: "cost_price", editable: true, width: 80, type: 'numericColumn',
             headerTooltip: "仕入単価（仕入通貨ベース）。過去実績と乖離がある場合、黄色で警告",
             valueFormatter: numFmt,
             cellStyle: getPriceWarningStyle },
           { headerName: "通貨", field: "cost_currency", editable: true, width: 65,
             headerTooltip: "仕入通貨（JPY / USD / EUR / CNY）",
             cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['JPY', 'USD', 'EUR', 'CNY'] } },
           { headerName: "採算為替", field: "internal_rate", editable: true, width: 80, type: 'numericColumn',
             headerTooltip: "社内採算為替レート（見積・値付け時の基準レート。BL確定前の粗利計算に使用）",
             valueFormatter: numFmt },
           { headerName: "掛率", field: "markup_rate", editable: true, width: 72,
             headerTooltip: "販売掛率（例: 1.5 = 仕入の1.5倍。手動入力時は自動で〈手動〉に切替）",
             cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['1.2', '1.3', '1.5', '2.0', '手動(ﾏﾆｭｱﾙ)', '現法自動'] } },
           { headerName: "販売", field: "sales_price", editable: true, width: 80, type: 'numericColumn',
             headerTooltip: "販売単価（販売通貨ベース）。掛率から自動計算。手動で上書きした場合は掛率が〈手動〉に変わる",
             valueFormatter: numFmt,
             cellStyle: getPriceWarningStyle },
           { headerName: "通貨", field: "sales_currency", editable: true, width: 65,
             headerTooltip: "販売通貨（JPY / USD / EUR / CNY）",
             cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['JPY', 'USD', 'EUR', 'CNY'] } },
           { headerName: "ユーザー単価", field: "end_user_price", editable: true, width: 92, type: 'numericColumn',
             headerTooltip: "エンドユーザー向け販売単価（Sun Fashion America等の3社間取引で自動算出）",
             valueFormatter: numFmt,
             cellStyle: (params: any) => (params.data.customer==='Sun Fashion America' || params.data.customer==='NY Sub') ? {backgroundColor:'#fff7ed'} : {} },
           { headerName: "諸経費", field: "misc_cost", editable: true, width: 75, type: 'numericColumn',
             headerTooltip: "諸経費（送料・関税・梱包費等）。粗利計算に含まれる",
             valueFormatter: numFmt },
           { headerName: "経費通貨", field: "misc_currency", editable: true, width: 72,
             headerTooltip: "諸経費の通貨",
             cellEditor: 'agSelectCellEditor', cellEditorParams: { values: ['JPY', 'USD', 'EUR', 'CNY'] } },
           { headerName: "実勢為替", field: "exchange_rate", editable: true, width: 80, type: 'numericColumn',
             headerTooltip: "BL確定時の実勢為替レート（BL DATEと共に入力すると粗利計算が確定値に自動切替）",
             valueFormatter: numFmt,
             cellStyle: { backgroundColor: '#f1f5f9', color: '#64748b'} },
           { headerName: "粗利(円)", field: "gross_profit", editable: false, width: 95, type: 'numericColumn',
             headerTooltip: "粗利（円換算・自動計算）。BL DATE未入力時は採算為替、入力後は実勢為替で計算",
             valueGetter: (params: any) => {
                 if (!params.data.sales_price || !params.data.qty || !params.data.cost_price) return null;
                 let isFinalized = Boolean(params.data.bl_date && params.data.exchange_rate);
                 let baseRate = isFinalized ? params.data.exchange_rate : (params.data.internal_rate || 145.0);
                 const qty = params.data.qty;
                 let salesJPY = params.data.sales_currency === 'JPY' ? params.data.sales_price : params.data.sales_price * baseRate;
                 let costJPY = params.data.cost_currency === 'JPY' ? params.data.cost_price : params.data.cost_price * baseRate;
                 let miscJPY = params.data.misc_cost || 0;
                 const gp = (salesJPY * qty) - (costJPY * qty) - miscJPY;
                 return Math.floor(gp).toLocaleString();
             }
           },
       ]
    },
    { 
       headerName: "日程・書類 ※自動採番", 
       children: [
           { headerName: "出荷予定", field: "factory_date", editable: true, width: 95,
             headerTooltip: "工場出荷予定日" },
           { headerName: "BL DATE", field: "bl_date", editable: true, width: 100,
             headerTooltip: "B/L発行日（船積日）。記入すると粗利が実勢為替ベースに切替",
             cellStyle: { backgroundColor: '#eff6ff' } },
           { headerName: "発注日", field: "po_date", editable: false, width: 90,
             headerTooltip: "発注書生成時に自動打刻される発注日" },
           { headerName: "PO番 ※", field: "po_no", editable: false, width: 110,
             headerTooltip: "※ システム自動採番（発注書生成時に付与）",
             cellStyle: { backgroundColor: '#f1f5f9', color: '#64748b' } },
           { headerName: "INV日", field: "invoice_date", editable: false, width: 88,
             headerTooltip: "Invoice生成時に自動打刻される発行日" },
           { headerName: "INV番 ※", field: "invoice_no", editable: false, width: 120,
             headerTooltip: "※ システム自動採番（Invoice生成時付与。改版時は -Rev1 等枝番追加）",
             cellStyle: { backgroundColor: '#f1f5f9', color: '#64748b' } },
           { headerName: "リンク", field: "link_id", editable: false, width: 100,
             headerTooltip: "関連行のリンクID（分割・キット化等で共通のグループIDが付与）",
             cellStyle: { color: '#3b82f6', fontWeight: 'bold' } },
           { headerName: "備考1", field: "comments", editable: true, width: 150,
             headerTooltip: "社内備考1（自由記述・システムログも自動追記）" },
           { headerName: "備考2", field: "comments2", editable: true, width: 150,
             headerTooltip: "社内備考2（自由記述）" },
       ]
    }
  ])

  const defaultColDef = useMemo(() => ({
    resizable: true,
    sortable: true,
    filter: true,
    floatingFilter: true,
    suppressHeaderMenuButton: true, // 「・・・」メニューボタンを全列で非表示にしてフィルター行に一本化
    tooltipShowDelay: 400,          // ツールチップ表示を400ms後に
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
             // リフレッシュによりWarningスタイルを即時評価
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
    <div className="ag-theme-alpine w-full h-full text-sm">
      <AgGridReact
        ref={gridRef}
        rowData={rowData.length === 0 ? undefined : rowData} 
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
      />
    </div>
  )
})

export default GridArea
