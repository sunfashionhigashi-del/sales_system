import { useState, useEffect, useRef } from 'react'
import { Plus, Scissors, Package, LayoutGrid, Save, Unlock, EyeOff, Undo, Redo, Archive, Ship, Copy, BarChart2, CheckCircle, FileText, Database, Edit, ChevronDown, Maximize2, Minimize2, MoreHorizontal } from 'lucide-react'
import GridArea from './components/GridArea'
import DashboardArea from './components/DashboardArea'
import MasterViewer from './components/MasterViewer'

function App() {
  const [session, setSession] = useState<any>(null)
  const [showLogin, setShowLogin] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard') // Phase 1仕様: デフォルトはダッシュボード
  const [openMenu, setOpenMenu] = useState<'row' | 'docs' | null>(null)
  const [isFocusMode, setIsFocusMode] = useState(false)
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

  const runGridAction = (action: () => void) => {
     action()
     setOpenMenu(null)
  }

  // [FIXED] 確定済みUI: ショートカットキーは視認性重視で必ず黒背景・白文字とする (APP_SPEC参照)
  const Kbd = ({ children }: { children: string }) => (
    <span className="kbd-token">{children}</span>
  )

  return (
    <div className="app-shell h-screen w-full flex flex-col overflow-hidden text-gray-800 font-sans antialiased">
      
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
      <header className="app-header h-[60px] flex items-center justify-between px-6 shrink-0 z-10 text-white">
        <div className="flex items-center space-x-3">
          <div className="brand-tile text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-teal-300 p-2 rounded-lg">
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

      {/* 2. Compact Command Bar */}
      {!isFocusMode && (
        <div className="command-bar shrink-0 px-5 py-2.5 flex items-center justify-between gap-3 overflow-visible relative z-20">
          <div className="flex items-center gap-2 min-w-0">
            <div className="panel-control flex items-center rounded-md p-0.5">
              <button onClick={() => gridAreaRef.current?.customUndo()} className="p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 rounded transition" title="元に戻す (Ctrl+Z)"><Undo size={15} /></button>
              <div className="w-[1px] h-4 bg-gray-200 mx-0.5"></div>
              <button onClick={() => gridAreaRef.current?.customRedo()} className="p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 rounded transition" title="やり直す (Ctrl+Y)"><Redo size={15} /></button>
            </div>

            <div className="panel-control flex items-center rounded-md p-0.5">
              <button onClick={() => gridAreaRef.current?.addRow('見積中')} className="flex items-center px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-gray-100 hover:text-gray-900 rounded transition" title="新しい空行（見積中）を追加します"><Plus size={14} className="mr-1.5 opacity-70"/>見積追加<Kbd>Alt+Q</Kbd></button>
              <div className="w-[1px] h-4 bg-gray-200 mx-1"></div>
              <button onClick={() => gridAreaRef.current?.registerOrder()} className="flex items-center px-3 py-1.5 text-sm font-bold text-slate-700 hover:bg-gray-100 hover:text-gray-900 rounded transition" title="選択した見積を受注として確定します"><CheckCircle size={15} className="mr-1.5 text-gray-500" />受注登録<Kbd>Alt+R</Kbd></button>
              <div className="w-[1px] h-4 bg-gray-200 mx-1"></div>
              <button onClick={() => gridAreaRef.current?.openDetailModal()} className="flex items-center px-3 py-1.5 text-sm font-bold text-blue-700 hover:bg-blue-50 rounded transition" title="選択した行の詳細入力画面を開く"><Edit size={15} className="mr-1.5 text-blue-500"/>詳細編集</button>
            </div>

            <div className="relative">
              <button onClick={() => setOpenMenu(openMenu === 'row' ? null : 'row')} className="flex items-center px-3 py-2 bg-white border border-slate-300 rounded-md hover:bg-slate-50 text-slate-700 text-sm font-bold transition shadow-sm" title="複製、分割、加工キットなど"><MoreHorizontal size={16} className="mr-1.5 text-slate-500"/>選択行<ChevronDown size={14} className="ml-1.5 text-slate-400"/></button>
              {openMenu === 'row' && (
                <div className="absolute left-0 top-[calc(100%+6px)] w-56 bg-white border border-slate-200 rounded-md shadow-xl z-50 p-1.5">
                  <button onClick={() => runGridAction(() => gridAreaRef.current?.addRow('発注待'))} className="w-full flex items-center px-3 py-2 rounded hover:bg-slate-50 text-sm font-semibold text-slate-700"><Plus size={14} className="mr-2 text-slate-500"/>受注追加<Kbd>Alt+O</Kbd></button>
                  <button onClick={() => runGridAction(() => gridAreaRef.current?.addRow('先行発注'))} className="w-full flex items-center px-3 py-2 rounded hover:bg-slate-50 text-sm font-semibold text-slate-700"><Plus size={14} className="mr-2 text-slate-500"/>発注追加<Kbd>Alt+P</Kbd></button>
                  <div className="my-1 border-t border-slate-100"></div>
                  <button onClick={() => runGridAction(() => gridAreaRef.current?.duplicateRow())} className="w-full flex items-center px-3 py-2 rounded hover:bg-slate-50 text-sm font-semibold text-slate-700"><Copy size={14} className="mr-2 text-slate-500"/>複製<Kbd>Alt+C</Kbd></button>
                  <button onClick={() => runGridAction(() => gridAreaRef.current?.splitRow())} className="w-full flex items-center px-3 py-2 rounded hover:bg-slate-50 text-sm font-semibold text-slate-700"><Scissors size={14} className="mr-2 text-slate-500"/>分割<Kbd>Alt+D</Kbd></button>
                  <button onClick={() => runGridAction(() => gridAreaRef.current?.kitRows())} className="w-full flex items-center px-3 py-2 rounded hover:bg-slate-50 text-sm font-semibold text-slate-700"><Package size={14} className="mr-2 text-slate-500"/>加工キット<Kbd>Alt+K</Kbd></button>
                  <div className="my-1 border-t border-slate-100"></div>
                  <button onClick={() => runGridAction(() => gridAreaRef.current?.unlockRow())} className="w-full flex items-center px-3 py-2 rounded hover:bg-amber-50 hover:text-amber-800 text-sm font-semibold text-slate-700"><Unlock size={14} className="mr-2 text-slate-500"/>ロック解除<Kbd>Alt+U</Kbd></button>
                  <button onClick={() => runGridAction(() => gridAreaRef.current?.archiveSelected())} className="w-full flex items-center px-3 py-2 rounded hover:bg-slate-50 text-sm font-semibold text-slate-700"><EyeOff size={14} className="mr-2 text-slate-500"/>非表示<Kbd>Alt+H</Kbd></button>
                  {activeTab === 'archived' && <button onClick={() => runGridAction(() => gridAreaRef.current?.restoreSelected())} className="w-full flex items-center px-3 py-2 rounded hover:bg-slate-50 text-sm font-semibold text-slate-700"><Archive size={14} className="mr-2 text-slate-500"/>復元</button>}
                </div>
              )}
            </div>

            <div className="relative">
              <button onClick={() => setOpenMenu(openMenu === 'docs' ? null : 'docs')} className="flex items-center px-3 py-2 bg-white border border-slate-300 rounded-md hover:bg-slate-50 text-slate-700 text-sm font-bold transition shadow-sm" title="見積書、Sales Note、発注書、Invoice"><FileText size={15} className="mr-1.5 text-slate-500"/>帳票<ChevronDown size={14} className="ml-1.5 text-slate-400"/></button>
              {openMenu === 'docs' && (
                <div className="absolute left-0 top-[calc(100%+6px)] w-56 bg-white border border-slate-200 rounded-md shadow-xl z-50 p-1.5">
                  <button onClick={() => runGridAction(() => gridAreaRef.current?.generateEstimate())} className="w-full flex items-center px-3 py-2 rounded hover:bg-blue-50 hover:text-blue-700 text-sm font-semibold text-slate-700"><FileText size={14} className="mr-2 text-slate-500"/>見積書</button>
                  <button onClick={() => runGridAction(() => gridAreaRef.current?.generateSalesNote())} className="w-full flex items-center px-3 py-2 rounded hover:bg-blue-50 hover:text-blue-700 text-sm font-semibold text-slate-700"><FileText size={14} className="mr-2 text-slate-500"/>Sales Note</button>
                  <button onClick={() => runGridAction(() => gridAreaRef.current?.generatePO())} className="w-full flex items-center px-3 py-2 rounded hover:bg-blue-50 hover:text-blue-700 text-sm font-semibold text-slate-700"><FileText size={14} className="mr-2 text-slate-500"/>発注書</button>
                  <button onClick={() => runGridAction(() => gridAreaRef.current?.generateInvoice())} className="w-full flex items-center px-3 py-2 rounded hover:bg-blue-50 hover:text-blue-700 text-sm font-semibold text-slate-700"><FileText size={14} className="mr-2 text-slate-500"/>Invoice</button>
                  <div className="my-1 border-t border-slate-100"></div>
                  <div className="flex items-center px-3 py-2 text-sm font-semibold text-slate-400"><FileText size={14} className="mr-2 text-slate-300"/>Proforma<span className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">準備中</span></div>
                  <div className="flex items-center px-3 py-2 text-sm font-semibold text-slate-400"><FileText size={14} className="mr-2 text-slate-300"/>Packing List<span className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">準備中</span></div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setIsFocusMode(true)} className="flex items-center px-3 py-2 bg-white border border-slate-300 rounded-md hover:bg-slate-50 text-slate-700 text-sm font-bold transition shadow-sm" title="ツールバーを畳んで明細を広く表示します"><Maximize2 size={15} className="mr-1.5 text-slate-500"/>明細を広く</button>
            <button onClick={() => gridAreaRef.current?.saveData()} className="group flex items-center px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow text-sm font-bold transition-all focus:ring-4 focus:ring-blue-100">
              <Save size={16} className="mr-2 group-hover:scale-110 transition-transform" />保存
              <span className="ml-2 px-1.5 py-0.5 bg-blue-800 rounded font-mono text-[10px]">Ctrl+S</span>
            </button>
          </div>
        </div>
      )}

      {isFocusMode && (
        <div className="shrink-0 bg-blue-50 border-b border-blue-100 px-5 py-1.5 flex items-center justify-between text-xs text-blue-800">
          <span className="font-bold">明細集中モード</span>
          <button onClick={() => setIsFocusMode(false)} className="flex items-center rounded border border-blue-200 bg-white px-2.5 py-1 font-bold text-blue-700 hover:bg-blue-100">
            <Minimize2 size={13} className="mr-1.5" />操作バーを表示
          </button>
        </div>
      )}

      {/* 3. Task Tabs (グレー背景に溶け込むタブ) */}
      <div className="task-tabs flex space-x-6 px-8 pt-4 text-sm shrink-0 overflow-x-auto whitespace-nowrap">
         <button onClick={() => setActiveTab('dashboard')} className={`pb-3 font-semibold transition border-b-[3px] flex items-center -mb-[1px] flex-shrink-0 ${activeTab === 'dashboard' ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`} title="売上推移などのダッシュボードを表示します"><BarChart2 size={16} className="mr-1 mt-0.5" />ﾀﾞｯｼｭﾎﾞｰﾄﾞ</button>
         <button onClick={() => setActiveTab('all')} className={`pb-3 font-semibold transition border-b-[3px] -mb-[1px] flex-shrink-0 ${activeTab === 'all' ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`} title="すべての案件（非表示以外）を一覧で表示します">全データ</button>
         <button onClick={() => setActiveTab('quote')} className={`pb-3 font-semibold transition border-b-[3px] -mb-[1px] flex-shrink-0 ${activeTab === 'quote' ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`} title="現在「見積中」の案件のみを絞り込んで表示します">見積中</button>
         <button onClick={() => setActiveTab('alert_po')} className={`pb-3 font-semibold transition border-b-[3px] flex items-center -mb-[1px] flex-shrink-0 ${activeTab === 'alert_po' ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`} title="受注が確定しているのに、まだメーカーに「発注」していない警告行を表示します"><span className={`w-2 h-2 rounded-full mr-1.5 shadow-inner border border-black/10 ${activeTab === 'alert_po' ? 'bg-gray-800' : 'bg-red-500'}`}></span>発注待アラート</button>
         <button onClick={() => setActiveTab('pre_order')} className={`pb-3 font-semibold transition border-b-[3px] -mb-[1px] flex-shrink-0 ${activeTab === 'pre_order' ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`} title="受注確定前に先行してメーカーへ「発注」した特殊な案件を表示します">先行発注</button>
         <button onClick={() => setActiveTab('process')} className={`pb-3 font-semibold transition border-b-[3px] -mb-[1px] flex-shrink-0 ${activeTab === 'process' ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`} title="セットアップや加工手配中の案件を表示します">加工中</button>
         <button onClick={() => setActiveTab('pending_invoice')} className={`pb-3 font-semibold transition border-b-[3px] flex items-center -mb-[1px] flex-shrink-0 ${activeTab === 'pending_invoice' ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`} title="出荷（メーカー発注）済みですが、まだ顧客へ「請求（Invoice発行）」していない案件を表示します"><span className={`w-2 h-2 rounded-full mr-1.5 shadow-inner border border-black/10 ${activeTab === 'pending_invoice' ? 'bg-gray-800' : 'bg-amber-400'}`}></span>未請求</button>
         <button onClick={() => setActiveTab('payment')} className={`pb-3 font-semibold transition border-b-[3px] flex items-center -mb-[1px] flex-shrink-0 ${activeTab === 'payment' ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`} title="BL DATE（船積日）以降の、入金確認や予実管理に特化した表示モードに切り替えます"><span className={`w-2 h-2 rounded-full mr-1.5 shadow-inner border border-black/10 ${activeTab === 'payment' ? 'bg-gray-800' : 'bg-green-500'}`}></span>入金状況</button>
         <button onClick={() => setActiveTab('master')} className={`pb-3 font-semibold transition border-b-[3px] flex items-center ml-auto -mb-[1px] flex-shrink-0 ${activeTab === 'master' ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`} title="マスター管理データの閲覧・修正"><Database size={14} className="mr-1 mt-0.5" />ﾏｽﾀｰ</button>
         <button onClick={() => setActiveTab('archived')} className={`pb-3 font-semibold transition border-b-[3px] flex items-center ml-4 -mb-[1px] flex-shrink-0 ${activeTab === 'archived' ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`} title="過去に非表示化（アーカイブ化）したデータを閲覧・復元します"><Archive size={14} className="mr-1 mt-0.5" />ｱｰｶｲﾌﾞ</button>
      </div>

      {/* 4. Main Area (Grid or Dashboard) */}
      <div className="flex-1 w-full overflow-hidden relative">
          {activeTab === 'dashboard' ? (
              <DashboardArea session={session} onTabChange={setActiveTab} />
          ) : activeTab === 'master' ? (
              <MasterViewer />
          ) : (
              <div className="workspace-wrap p-4 pt-4 w-full h-full">
                  <div className="workspace-card w-full h-full overflow-hidden">
                      <GridArea activeTab={activeTab} session={session} ref={gridAreaRef} />
                  </div>
              </div>
          )}
      </div>

    </div>
  )
}

export default App
