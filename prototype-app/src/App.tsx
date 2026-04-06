import { useState, useEffect, useRef } from 'react'
import { Plus, Scissors, Package, LayoutGrid, Save, Unlock, EyeOff, Undo, Redo, Archive, Ship, Copy, BarChart2, CheckCircle } from 'lucide-react'
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

  // ショートカットキーバッジ（Windows実機で読みやすい表示）
  const Kbd = ({ children }: { children: string }) => (
    <span className="ml-1.5 text-[10px] font-mono bg-gray-700 text-gray-200 rounded px-1.5 py-0.5 leading-none tracking-tight border border-gray-600 shadow-inner">{children}</span>
  )

  // プロフェッショナルな統一UIボタン（リニアグラデーション・シャドウ・境界で立体感・タクタイルを出す）
  const btnStyle = "group whitespace-nowrap flex items-center px-3.5 py-1.5 rounded bg-gradient-to-b from-gray-50 to-gray-200 border border-gray-300 text-gray-700 shadow-sm hover:from-white hover:to-gray-100 hover:border-gray-400 active:from-gray-200 active:to-gray-300 active:shadow-inner text-sm font-semibold transition-all duration-100"

  return (
    <div className="h-screen w-full flex flex-col bg-gray-200 overflow-hidden text-gray-800 font-sans antialiased">
      
      {/* Login Overlay */}
      {showLogin && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-96 max-w-full">
                <div className="text-center mb-6">
                    <Ship size={50} className="text-blue-800 mx-auto mb-3 block" />
                    <h2 className="text-2xl font-bold text-gray-800">販売管理システム</h2>
                    <p className="text-sm text-gray-500 mt-1">デモンストレーション・ログイン</p>
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
      <header className="h-[60px] bg-gradient-to-r from-gray-700 to-gray-600 border-b border-gray-800 flex items-center justify-between px-6 shrink-0 z-10 shadow">
        <div className="flex items-center space-x-3">
          <div className="bg-gray-800 text-gray-100 p-2 rounded shadow-inner border border-gray-600">
             <LayoutGrid size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white drop-shadow-sm">販売管理システム <span className="text-xs font-bold text-gray-200 ml-2 bg-gray-800 px-2.5 py-0.5 rounded border border-gray-500">Phase 2</span></h1>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-gray-800 text-white px-4 py-1.5 rounded text-sm flex items-center border border-gray-600 cursor-pointer hover:bg-gray-900 shadow-inner transition" onClick={handleLogout} title="クリックでログアウト">
            <img src={`https://ui-avatars.com/api/?name=${session?.user?.name || 'Guest'}&background=4b5563&color=ffffff`} className="w-6 h-6 rounded mr-2 border border-gray-500" alt="Avatar"/>
            <span className="font-semibold text-gray-100">{session?.user?.name || '未ログイン'}</span>
          </div>
        </div>
      </header>

      {/* 2. Action Toolbar (プロフェッショナルグレーの計器盤風UI) */}
      <div className="bg-gray-100 border-b border-gray-300 shrink-0 shadow-sm z-0">
        
        {/* 上段：データ編集・操作のアクション */}
        <div className="px-6 pt-3 pb-2 flex flex-wrap items-center gap-2">
          {/* 保存とUndoRedo (システム操作) */}
          <button onClick={() => gridAreaRef.current?.saveData()} className="whitespace-nowrap flex items-center px-4 py-1.5 rounded shadow border border-blue-600 bg-blue-600 text-white hover:bg-blue-700 text-sm font-semibold transition" title="クラウドに保存します">
             <Save size={16} className="mr-1.5" />保存<Kbd>Ctrl+S</Kbd>
          </button>
          <button onClick={() => gridAreaRef.current?.customUndo()} className={btnStyle} title="元に戻す (Ctrl+Z)">
             <Undo size={14} className="mr-1.5 text-gray-500" />元に戻す
          </button>
          <button onClick={() => gridAreaRef.current?.customRedo()} className={btnStyle} title="やり直し (Ctrl+Y)">
             <Redo size={14} className="mr-1.5 text-gray-500" />やり直す
          </button>

          <span className="border-l border-gray-300 mx-2 h-6"></span>

          {/* 新規行とステータス変化 */}
          <button onClick={() => gridAreaRef.current?.addRow('見積中')} className={btnStyle} title="新規見積行を追加します">
             <Plus size={14} className="text-gray-500 mr-1.5" />見積追加<Kbd>Alt+Q</Kbd>
          </button>
          <button onClick={() => gridAreaRef.current?.addRow('発注待')} className={btnStyle} title="受注行（発注待）を追加します">
             <Plus size={14} className="text-gray-500 mr-1.5" />受注追加<Kbd>Alt+O</Kbd>
          </button>
          <button onClick={() => gridAreaRef.current?.addRow('先行発注')} className={btnStyle} title="先行発注行を追加します">
             <Plus size={14} className="text-gray-500 mr-1.5" />発注追加<Kbd>Alt+P</Kbd>
          </button>
          <button onClick={() => gridAreaRef.current?.registerOrder()} className={btnStyle} title="選択した見積行を受注登録します">
             <CheckCircle size={14} className="mr-1.5 text-gray-600" />受注登録<Kbd>Alt+R</Kbd>
          </button>

          <span className="border-l border-gray-300 mx-2 h-6 shadow-sm"></span>

          {/* 行の各種操作 (ユニバーサル表記) */}
          <button onClick={() => gridAreaRef.current?.duplicateRow()} className={btnStyle} title="選択行を複製して見積中行を追加">
            <Copy size={14} className="text-gray-600 mr-1.5" />行を複製<Kbd>Alt+C</Kbd>
          </button>
          <button onClick={() => gridAreaRef.current?.splitRow()} className={btnStyle} title="選択行の数量を分割して1行を追加">
            <Scissors size={14} className="text-gray-600 mr-1.5" />行を分割<Kbd>Alt+D</Kbd>
          </button>
          <button onClick={() => gridAreaRef.current?.kitRows()} className={btnStyle} title="選択行を材料としてキット加工品を生成">
            <Package size={14} className="text-gray-600 mr-1.5" />加工セット<Kbd>Alt+K</Kbd>
          </button>
          <button onClick={() => gridAreaRef.current?.unlockRow()} 
            className="group whitespace-nowrap flex items-center px-3.5 py-1.5 rounded bg-gradient-to-b from-amber-50 to-amber-200 border border-amber-400 text-amber-800 shadow-sm hover:from-amber-100 hover:to-amber-300 active:shadow-inner text-sm font-semibold transition-all duration-100"
            title="ロックされた行（請求済など）を解除して修正可能にします">
            <Unlock size={14} className="text-amber-600 mr-1.5" />行ロック解除<Kbd>Alt+U</Kbd>
          </button>
            
          <span className="border-l border-gray-300 mx-2 h-6 shadow-sm"></span>

          {/* アーカイブ操作 */}
          <button onClick={() => gridAreaRef.current?.archiveSelected()} 
            className="group whitespace-nowrap flex items-center px-3.5 py-1.5 rounded bg-gradient-to-b from-slate-100 to-slate-300 border border-slate-400 text-slate-700 shadow-sm hover:from-slate-200 hover:to-slate-400 active:shadow-inner text-sm font-semibold transition-all duration-100"
            title="選択行をアーカイブ（非表示）にします。ステータスは変わらず、アーカイブタブから復元可能">
             <EyeOff size={14} className="mr-1.5 text-slate-500" />行を非表示<Kbd>Alt+H</Kbd>
          </button>
          {activeTab === 'archived' && (
             <button onClick={() => gridAreaRef.current?.restoreSelected()} className={btnStyle} title="選択行を復元します。元のステータスが保持されます">
                <Archive size={14} className="mr-1.5 text-gray-600" />行を復元
             </button>
          )}
        </div>

        {/* 下段：書類生成のアクション */}
        <div className="px-6 py-2.5 flex flex-wrap items-center gap-2 bg-gray-200 border-t border-gray-300 shadow-inner">
           <span className="text-xs font-bold text-gray-600 mr-2 drop-shadow-sm flex items-center pr-2 border-r border-gray-400">書類出力を実行</span>
           <button onClick={() => gridAreaRef.current?.generateEstimate()} className={btnStyle}>見積書</button>
           <button onClick={() => gridAreaRef.current?.generateSalesNote()} className={btnStyle}>Sales Note</button>
           <button onClick={() => gridAreaRef.current?.generatePO()} className={btnStyle}>発注書</button>
           <button onClick={() => alert('Proforma 出力 (Phase 3予定)')} className={btnStyle}>Proforma</button>
           <button onClick={() => alert('Packing List 出力 (Phase 3予定)')} className={btnStyle}>Packing List</button>
           <button onClick={() => gridAreaRef.current?.generateInvoice()} className={btnStyle}>Invoice</button>
        </div>
      </div>

      {/* 3. Task Tabs (グレー背景に溶け込むタブ) */}
      <div className="flex space-x-6 border-b border-gray-300 px-8 pt-4 bg-gray-100 text-sm shrink-0">
         <button onClick={() => setActiveTab('dashboard')} className={`pb-3 font-semibold transition border-b-[3px] flex items-center -mb-[1px] ${activeTab === 'dashboard' ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><BarChart2 size={16} className="mr-1 mt-0.5" />ﾀﾞｯｼｭﾎﾞｰﾄﾞ</button>
         <button onClick={() => setActiveTab('all')} className={`pb-3 font-semibold transition border-b-[3px] -mb-[1px] ${activeTab === 'all' ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>全データ</button>
         <button onClick={() => setActiveTab('quote')} className={`pb-3 font-semibold transition border-b-[3px] -mb-[1px] ${activeTab === 'quote' ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>見積中</button>
         <button onClick={() => setActiveTab('alert_po')} className={`pb-3 font-semibold transition border-b-[3px] flex items-center -mb-[1px] ${activeTab === 'alert_po' ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><span className={`w-2 h-2 rounded-full mr-1.5 shadow-inner border border-black/10 ${activeTab === 'alert_po' ? 'bg-gray-800' : 'bg-red-500'}`}></span>発注待アラート</button>
         <button onClick={() => setActiveTab('pre_order')} className={`pb-3 font-semibold transition border-b-[3px] -mb-[1px] ${activeTab === 'pre_order' ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>先行発注</button>
         <button onClick={() => setActiveTab('process')} className={`pb-3 font-semibold transition border-b-[3px] -mb-[1px] ${activeTab === 'process' ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>加工中</button>
         <button onClick={() => setActiveTab('pending_invoice')} className={`pb-3 font-semibold transition border-b-[3px] flex items-center -mb-[1px] ${activeTab === 'pending_invoice' ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><span className={`w-2 h-2 rounded-full mr-1.5 shadow-inner border border-black/10 ${activeTab === 'pending_invoice' ? 'bg-gray-800' : 'bg-amber-400'}`}></span>未請求</button>
         <button onClick={() => setActiveTab('archived')} className={`pb-3 font-semibold transition border-b-[3px] flex items-center ml-auto -mb-[1px] ${activeTab === 'archived' ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><Archive size={14} className="mr-1 mt-0.5" />ｱｰｶｲﾌﾞ</button>
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
