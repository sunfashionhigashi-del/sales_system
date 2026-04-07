import { useState, useEffect, useRef } from 'react'
import { Plus, Scissors, Package, LayoutGrid, Save, Unlock, EyeOff, Undo, Redo, Archive, Ship, Copy, BarChart2, CheckCircle, FileText } from 'lucide-react'
import GridArea from './components/GridArea'
import DashboardArea from './components/DashboardArea'

function App() {
  const [session, setSession] = useState<any>(null)
  const [showLogin, setShowLogin] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard') // Phase 1仕様: デフォルトはダッシュボード
  const gridAreaRef = useRef<any>(null)

  useEffect(() => {
    // 過去のログインセッションを復元
    const savedRole = localStorage.getItem('user_role_id')
    const savedName = localStorage.getItem('user_name')
    if (savedRole && savedName) {
       setSession({ user: { role_id: savedRole, name: savedName } })
       setShowLogin(false)
    }

    // キーボードショートカット
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) { gridAreaRef.current?.customRedo() } 
        else { gridAreaRef.current?.customUndo() }
        e.preventDefault()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        gridAreaRef.current?.customRedo()
        e.preventDefault()
      } else if (e.altKey && e.key.toLowerCase() === 'q') {
        gridAreaRef.current?.addRow('見積中')
        e.preventDefault()
      } else if (e.altKey && e.key.toLowerCase() === 'o') {
        gridAreaRef.current?.addRow('発注待')
        e.preventDefault()
      } else if (e.altKey && e.key.toLowerCase() === 'p') {
        gridAreaRef.current?.addRow('先行発注')
        e.preventDefault()
      } else if (e.altKey && e.key.toLowerCase() === 'c') {
        gridAreaRef.current?.duplicateRow()
        e.preventDefault()
      } else if (e.altKey && e.key.toLowerCase() === 'd') {
        gridAreaRef.current?.splitRow()
        e.preventDefault()
      } else if (e.altKey && e.key.toLowerCase() === 'k') {
        gridAreaRef.current?.kitRows()
        e.preventDefault()
      } else if (e.altKey && e.key.toLowerCase() === 'u') {
        gridAreaRef.current?.unlockRow()
        e.preventDefault()
      } else if (e.altKey && e.key.toLowerCase() === 'r') {
        gridAreaRef.current?.registerOrder()
        e.preventDefault()
      } else if (e.altKey && e.key.toLowerCase() === 'h') {
        gridAreaRef.current?.archiveSelected()
        e.preventDefault()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        gridAreaRef.current?.saveData()
        e.preventDefault()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleLogin = () => {
     const select = document.getElementById('loginUserSelect') as HTMLSelectElement
     const val = select.value
     let name = '管理者'
     if (val === 'matsuoka') name = '松岡'
     if (val === 'ohtani') name = '大谷'
     
     const newSession = { user: { role_id: val, name: name } }
     setSession(newSession)
     localStorage.setItem('user_role_id', val)
     localStorage.setItem('user_name', name)
     setShowLogin(false)
  }

  const handleLogout = () => {
     localStorage.removeItem('user_role_id')
     localStorage.removeItem('user_name')
     setSession(null)
     setShowLogin(true)
  }

  // [FIXED] 確定済みUI: ショートカットキーは視認性重視で必ず黒背景・白文字とする (APP_SPEC参照)
  const Kbd = ({ children }: { children: string }) => (
    <span className="ml-1.5 text-[10px] font-mono bg-gray-700 text-gray-200 rounded px-1.5 py-0.5 leading-none tracking-tight border border-gray-600 shadow-inner">{children}</span>
  )

  return (
    <div className="h-screen w-full flex flex-col bg-gray-50 overflow-hidden text-gray-800 font-sans antialiased">
      
      {/* Login Overlay */}
      {showLogin && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-96 max-w-full">
                <div className="text-center mb-6">
                    <div className="mx-auto mb-4 flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-teal-400 shadow-lg text-white">
                        <Ship size={36} strokeWidth={1.5} />
                    </div>
                    <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-teal-600 tracking-widest">SUCCESS</h2>
                    <p className="text-[10px] text-gray-500 mt-2 font-medium tracking-wider uppercase">
                       <span className="text-blue-600 font-bold">S</span>un Fashion <span className="text-blue-600 font-bold">U</span>nified <span className="text-blue-600 font-bold">C</span>loud <br/><span className="text-blue-600 font-bold">C</span>ontrol <span className="text-blue-600 font-bold">E</span>nterprise <span className="text-blue-600 font-bold">S</span>ales <span className="text-blue-600 font-bold">S</span>ystem
                    </p>
                    <div className="mt-4">
                        <span className="text-xs text-blue-800 bg-blue-50 border border-blue-100 py-1 px-3 rounded-full inline-block font-semibold">デモンストレーション・ログイン</span>
                    </div>
                </div>
                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">ユーザー / 権限の選択</label>
                        <select id="loginUserSelect" className="w-full border-gray-300 rounded shadow-sm p-2.5 bg-gray-50 border focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none">
                            <option value="admin">役員・管理者 (全データ閲覧)</option>
                            <option value="matsuoka">営業: 松岡 (自身のデータのみ)</option>
                            <option value="ohtani">営業: 大谷 (自身のデータのみ)</option>
                        </select>
                    </div>
                    <button onClick={handleLogin} className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 px-4 rounded-lg shadow transition">
                        システムにログイン
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* 1. Header Area */}
      <header className="h-[60px] bg-gray-900 flex items-center justify-between px-6 shrink-0 z-10 shadow-sm text-white">
        <div className="flex items-center space-x-3">
          <div className="bg-gray-800 text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-teal-300 p-2 rounded-lg border border-gray-700 shadow-inner">
             <LayoutGrid size={22} className="text-teal-400" />
          </div>
          <div className="flex flex-col justify-center">
             <h1 className="text-xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300 flex items-baseline leading-none">
                 SUCCESS
                 <span className="text-[10px] font-bold text-blue-300 ml-3 bg-blue-900/50 px-2 py-0.5 rounded-full border border-blue-800 tracking-normal translate-y-[-2px]">Phase 2</span>
             </h1>
             <p className="text-[9px] text-gray-400 tracking-widest mt-1 uppercase font-medium">
                 <span className="text-teal-300">S</span>un Fashion <span className="text-teal-300">U</span>nified <span className="text-teal-300">C</span>loud <span className="text-teal-300">C</span>ontrol <span className="text-teal-300">E</span>nterprise <span className="text-teal-300">S</span>ales <span className="text-teal-300">S</span>ystem
             </p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm flex items-center border border-gray-700 cursor-pointer hover:bg-gray-700 transition" onClick={handleLogout} title="クリックでログアウト">
            <img src={`https://ui-avatars.com/api/?name=${session?.user?.name || 'Guest'}&background=374151&color=ffffff`} className="w-6 h-6 rounded mr-2" alt="Avatar"/>
            <span className="font-medium text-gray-200">{session?.user?.name || '未ログイン'}</span>
          </div>
        </div>
      </header>

      {/* [FIXED] 確定済みUI: ツールバーはSaaSピル型（文字なし・境界線で区切る）とし、勝手に旧仕様（縦棒等）へ書き換えないこと */}
      {/* 2. Primary Toolbars (World Class Modern UI) */}
      <div className="flex flex-col shrink-0 bg-white border-b border-gray-200 shadow-sm relative z-0">
        
        {/* 上段：主要ワークフローと保存アクション */}
        <div className="px-6 py-3 flex items-center justify-between">
           
           <div className="flex items-center gap-4">
              
              {/* Undo / Redo グループ */}
              <div className="flex items-center bg-white rounded-md border border-gray-300 shadow-sm p-0.5">
                 <button onClick={() => gridAreaRef.current?.customUndo()} className="p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 rounded transition" title="元に戻す (Ctrl+Z)"><Undo size={15} /></button>
                 <div className="w-[1px] h-4 bg-gray-200 mx-0.5"></div>
                 <button onClick={() => gridAreaRef.current?.customRedo()} className="p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 rounded transition" title="やり直す (Ctrl+Y)"><Redo size={15} /></button>
              </div>

              {/* 行の追加と進行（ワークフロー） グループ */}
              <div className="flex items-center bg-white rounded-md border border-gray-300 shadow-sm p-0.5">
                 <button onClick={() => gridAreaRef.current?.addRow('見積中')} className="flex items-center px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-gray-100 hover:text-gray-900 rounded transition" title="新しい空行（見積中）を追加します"><Plus size={14} className="mr-1.5 opacity-70"/>見積追加<Kbd>Alt+Q</Kbd></button>
                 <div className="w-[1px] h-4 bg-gray-200 mx-1"></div>
                 <button onClick={() => gridAreaRef.current?.addRow('発注待')} className="flex items-center px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-gray-100 hover:text-gray-900 rounded transition" title="新しい受注行（発注待）を追加します"><Plus size={14} className="mr-1.5 opacity-70"/>受注追加<Kbd>Alt+O</Kbd></button>
                 <div className="w-[1px] h-4 bg-gray-200 mx-1"></div>
                 <button onClick={() => gridAreaRef.current?.addRow('先行発注')} className="flex items-center px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-gray-100 hover:text-gray-900 rounded transition" title="新しい先行発注の行を追加します"><Plus size={14} className="mr-1.5 opacity-70"/>発注追加<Kbd>Alt+P</Kbd></button>
                 
                 <div className="w-[1px] h-5 bg-gray-300 mx-2"></div>
                 
                 <button onClick={() => gridAreaRef.current?.registerOrder()} className="flex items-center px-3 py-1.5 text-sm font-bold text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded transition" title="選択した見積を「受注済」として確定します">
                    <CheckCircle size={15} className="mr-1.5 text-gray-500" />受注登録<Kbd>Alt+R</Kbd>
                 </button>
              </div>

           </div>

           {/* HERO: クラウドに保存ボタン */}
           <button onClick={() => gridAreaRef.current?.saveData()} className="group flex items-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow text-sm font-bold transition-all focus:ring-4 focus:ring-blue-100">
              <Save size={16} className="mr-2 group-hover:scale-110 transition-transform" />変更をクラウドに保存
              <span className="ml-3 px-1.5 py-0.5 bg-blue-800 rounded font-mono text-[10px]">Ctrl+S</span>
           </button>

        </div>

        {/* 下段：サブアクション（行の個別操作と書類出力） */}
        <div className="px-6 py-2 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs">
          
          {/* [FIXED] 確定済みUI: 選択行の操作グループ（Kbd付き） */}
          <div className="flex items-center gap-1.5">
             <span className="font-bold text-slate-500 tracking-wider mr-2 text-[11px] bg-slate-200/50 px-2 py-0.5 rounded-full">選択行の操作</span>
             
             <button onClick={() => gridAreaRef.current?.duplicateRow()} className="flex items-center px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-100 text-slate-700 font-medium transition shadow-sm" title="選択した行を複製して新しい行を作成"><Copy size={13} className="mr-1.5 text-slate-500"/>複製<Kbd>Alt+C</Kbd></button>
             <button onClick={() => gridAreaRef.current?.splitRow()} className="flex items-center px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-100 text-slate-700 font-medium transition shadow-sm" title="選択した行の数量を分割して新しい行を派生"><Scissors size={13} className="mr-1.5 text-slate-500"/>分割<Kbd>Alt+S</Kbd></button>
             <button onClick={() => gridAreaRef.current?.kitRows()} className="flex items-center px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-100 text-slate-700 font-medium transition shadow-sm" title="複数の行をまたいで加工セット品を生成"><Package size={13} className="mr-1.5 text-slate-500"/>加工キット<Kbd>Alt+K</Kbd></button>
             
             <div className="w-[1px] h-4 bg-slate-200 mx-1"></div>
             
             {/* 黄ベタ塗りをやめ、ホバー時のみ僅かな色気が出るニュートラルなロック解除ボタン */}
             <button onClick={() => gridAreaRef.current?.unlockRow()} className="flex items-center px-3 py-1.5 bg-white border border-slate-300 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 rounded text-slate-700 font-medium transition shadow-sm" title="請求済等のロック行を無理やり編集可能状態に戻す">
                 <Unlock size={13} className="mr-1.5 text-slate-400 group-hover:text-amber-500"/>ロック解除<Kbd>Alt+U</Kbd>
             </button>
             <button onClick={() => gridAreaRef.current?.archiveSelected()} className="flex items-center px-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-100 rounded text-slate-700 font-medium transition shadow-sm" title="選択行をアーカイブ（非表示）状態にする">
                 <EyeOff size={13} className="mr-1.5 text-slate-400"/>非表示<Kbd>Del</Kbd>
             </button>
             {activeTab === 'archived' && (
                 <button onClick={() => gridAreaRef.current?.restoreSelected()} className="flex items-center px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded text-slate-700 font-medium transition shadow-sm" title="非表示の行を元の画面へ復元させる">
                     <Archive size={13} className="mr-1.5 text-slate-500"/>復元<Kbd>Alt+R</Kbd>
                 </button>
             )}
          </div>

          {/* ドキュメントエクスポート */}
          <div className="flex items-center gap-1.5">
             <span className="font-bold text-slate-400 tracking-widest mr-2 text-[10px]">EXPORT (Phase 3)</span>
             <button onClick={() => gridAreaRef.current?.generateEstimate()} className="flex items-center px-3 py-1.5 bg-white border border-slate-300 rounded hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-medium transition shadow-sm" title="選択した行からExcel見積書を生成"><FileText size={13} className="mr-1.5 text-slate-400"/>見積書</button>
             <button onClick={() => gridAreaRef.current?.generateSalesNote()} className="flex items-center px-3 py-1.5 bg-white border border-slate-300 rounded hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-medium transition shadow-sm" title="受注確定済みの行から社内用 Sales Note を生成"><FileText size={13} className="mr-1.5 text-slate-400"/>Sales Note</button>
             <button onClick={() => gridAreaRef.current?.generatePO()} className="flex items-center px-3 py-1.5 bg-white border border-slate-300 rounded hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-medium transition shadow-sm" title="発注待の行からメーカー向け PO (Purchasing Order) を生成"><FileText size={13} className="mr-1.5 text-slate-400"/>発注書</button>
             <button onClick={() => gridAreaRef.current?.generateInvoice()} className="flex items-center px-3 py-1.5 bg-white border border-slate-300 rounded hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-medium transition shadow-sm" title="出荷済みの行から顧客向け Invoice を生成"><FileText size={13} className="mr-1.5 text-slate-400"/>Invoice</button>
             
             <div className="hidden 2xl:flex items-center gap-1.5 ml-1">
                 <button onClick={() => alert('Proforma (Phase 3)')} className="flex items-center px-3 py-1.5 bg-white border border-slate-200 rounded text-slate-400 font-medium opacity-50" title="事前送金用の Proforma Invoice を生成"><FileText size={13} className="mr-1.5 text-slate-300"/>Proforma</button>
                 <button onClick={() => alert('Packing List (Phase 3)')} className="flex items-center px-3 py-1.5 bg-white border border-slate-200 rounded text-slate-400 font-medium opacity-50" title="出荷用の Packing List を生成"><FileText size={13} className="mr-1.5 text-slate-300"/>Packing List</button>
             </div>
          </div>
        </div>
      </div>

      {/* 3. Task Tabs (グレー背景に溶け込むタブ) */}
      <div className="flex space-x-6 border-b border-gray-300 px-8 pt-4 bg-gray-100 text-sm shrink-0">
         <button onClick={() => setActiveTab('dashboard')} className={`pb-3 font-semibold transition border-b-[3px] flex items-center -mb-[1px] ${activeTab === 'dashboard' ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`} title="売上推移などのダッシュボードを表示します"><BarChart2 size={16} className="mr-1 mt-0.5" />ﾀﾞｯｼｭﾎﾞｰﾄﾞ</button>
         <button onClick={() => setActiveTab('all')} className={`pb-3 font-semibold transition border-b-[3px] -mb-[1px] ${activeTab === 'all' ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`} title="すべての案件（非表示以外）を一覧で表示します">全データ</button>
         <button onClick={() => setActiveTab('quote')} className={`pb-3 font-semibold transition border-b-[3px] -mb-[1px] ${activeTab === 'quote' ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`} title="現在「見積中」の案件のみを絞り込んで表示します">見積中</button>
         <button onClick={() => setActiveTab('alert_po')} className={`pb-3 font-semibold transition border-b-[3px] flex items-center -mb-[1px] ${activeTab === 'alert_po' ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`} title="受注が確定しているのに、まだメーカーに「発注」していない警告行を表示します"><span className={`w-2 h-2 rounded-full mr-1.5 shadow-inner border border-black/10 ${activeTab === 'alert_po' ? 'bg-gray-800' : 'bg-red-500'}`}></span>発注待アラート</button>
         <button onClick={() => setActiveTab('pre_order')} className={`pb-3 font-semibold transition border-b-[3px] -mb-[1px] ${activeTab === 'pre_order' ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`} title="受注確定前に先行してメーカーへ「発注」した特殊な案件を表示します">先行発注</button>
         <button onClick={() => setActiveTab('process')} className={`pb-3 font-semibold transition border-b-[3px] -mb-[1px] ${activeTab === 'process' ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`} title="セットアップや加工手配中の案件を表示します">加工中</button>
         <button onClick={() => setActiveTab('pending_invoice')} className={`pb-3 font-semibold transition border-b-[3px] flex items-center -mb-[1px] ${activeTab === 'pending_invoice' ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`} title="出荷（メーカー発注）済みですが、まだ顧客へ「請求（Invoice発行）」していない案件を表示します"><span className={`w-2 h-2 rounded-full mr-1.5 shadow-inner border border-black/10 ${activeTab === 'pending_invoice' ? 'bg-gray-800' : 'bg-amber-400'}`}></span>未請求</button>
         <button onClick={() => setActiveTab('payment')} className={`pb-3 font-semibold transition border-b-[3px] flex items-center -mb-[1px] ${activeTab === 'payment' ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`} title="BL DATE（船積日）以降の、入金確認や予実管理に特化した表示モードに切り替えます"><span className={`w-2 h-2 rounded-full mr-1.5 shadow-inner border border-black/10 ${activeTab === 'payment' ? 'bg-gray-800' : 'bg-green-500'}`}></span>入金状況</button>
         <button onClick={() => setActiveTab('archived')} className={`pb-3 font-semibold transition border-b-[3px] flex items-center ml-auto -mb-[1px] ${activeTab === 'archived' ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`} title="過去に非表示化（アーカイブ化）したデータを閲覧・復元します"><Archive size={14} className="mr-1 mt-0.5" />ｱｰｶｲﾌﾞ</button>
      </div>

      {/* 4. Main Area (Grid or Dashboard) */}
      <div className="flex-1 w-full overflow-hidden relative">
          {activeTab === 'dashboard' ? (
              <DashboardArea session={session} />
          ) : (
              <div className="p-4 pt-4 w-full h-full">
                  <div className="bg-white rounded shadow w-full h-full border border-gray-300 overflow-hidden">
                      <GridArea activeTab={activeTab} session={session} ref={gridAreaRef} />
                  </div>
              </div>
          )}
      </div>

    </div>
  )
}

export default App
