import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { AlertCircle, CheckCircle, Clock, FileText } from 'lucide-react'
import { fetchExchangeRateState, getLineCostJPY, getLineSalesJPY } from '../lib/exchangeRates'

export default function DashboardArea({ session, onTabChange }: { session: any, onTabChange: (tab: string) => void }) {
  const [stats, setStats] = useState({
    activeOrders: 0,
    shipping: 0,
    profit: 0,
    alertPo: 0,
    pendingInvoice: 0,
    process: 0,
  })

  useEffect(() => {
    const fetchStats = async () => {
      const [{ data }, exchangeRates] = await Promise.all([
        supabase.from('order_items').select('*').neq('status', 'キャンセル'),
        fetchExchangeRateState(),
      ])

      if (!data) return

      let myData = data
      if (session?.user?.role_id !== 'admin') {
        myData = data.filter((d: any) => d.rep === session?.user?.name)
      }

      const activeStatuses = ['見積中', '発注待', '先行発注', '加工中', '未請求', '請求済']
      const activeOrders = myData.filter((d: any) => activeStatuses.includes(d.status)).length
      const shipping = myData.filter((d: any) => d.factory_date && d.factory_date !== '').length

      let profit = 0
      myData.forEach((d: any) => {
        if (d.status !== '見積中' && d.sales_price && d.qty && d.cost_price) {
          profit += getLineSalesJPY(d, exchangeRates) - getLineCostJPY(d, exchangeRates)
        }
      })

      const alertPo = myData.filter((d: any) => d.status === '発注待').length
      const pendingInvoice = myData.filter((d: any) => {
        const today = new Date().toISOString().split('T')[0]
        return d.factory_date && d.factory_date <= today && !d.invoice_no
      }).length
      const process = myData.filter((d: any) => d.status === '加工中').length

      setStats({ activeOrders, shipping, profit, alertPo, pendingInvoice, process })
    }

    fetchStats()
  }, [session])

  return (
    <div className="flex-grow p-8 bg-slate-50 h-full overflow-y-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Dashboard & Action Center</h2>
          <p className="text-slate-500 mt-1">
            ようこそ {session?.user?.name} さん。現在の稼働状況と対応が必要なタスクです。
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-400 font-mono">
            {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' })}
          </p>
        </div>
      </div>

      <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center">
        <AlertCircle className="mr-2 text-rose-500" size={18} />
        要対応タスク
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <div
          onClick={() => onTabChange('alert_po')}
          className="group bg-white rounded-xl shadow-sm border border-rose-200 p-5 cursor-pointer hover:shadow-md hover:border-rose-400 transition-all flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center text-rose-600 font-bold">
              <Clock size={16} className="mr-1.5" />
              発注待ち
            </div>
            <span className="bg-rose-100 text-rose-700 text-xs px-2 py-1 rounded-full font-bold">優先</span>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <p className="text-sm text-slate-500">受注済みで未発注の案件</p>
            <p className="text-3xl font-black text-rose-600 group-hover:scale-110 transition-transform origin-bottom-right">
              {stats.alertPo}
              <span className="text-base font-bold ml-1 text-rose-400">件</span>
            </p>
          </div>
        </div>

        <div
          onClick={() => onTabChange('pending_invoice')}
          className="group bg-white rounded-xl shadow-sm border border-amber-200 p-5 cursor-pointer hover:shadow-md hover:border-amber-400 transition-all flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center text-amber-600 font-bold">
              <FileText size={16} className="mr-1.5" />
              未請求
            </div>
            <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full font-bold">確認</span>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <p className="text-sm text-slate-500">出荷予定日を過ぎて未請求の案件</p>
            <p className="text-3xl font-black text-amber-600 group-hover:scale-110 transition-transform origin-bottom-right">
              {stats.pendingInvoice}
              <span className="text-base font-bold ml-1 text-amber-400">件</span>
            </p>
          </div>
        </div>

        <div
          onClick={() => onTabChange('process')}
          className="group bg-white rounded-xl shadow-sm border border-indigo-200 p-5 cursor-pointer hover:shadow-md hover:border-indigo-400 transition-all flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center text-indigo-600 font-bold">
              <CheckCircle size={16} className="mr-1.5" />
              加工中
            </div>
            <span className="bg-indigo-50 text-indigo-500 text-xs px-2 py-1 rounded-full font-semibold">進行中</span>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <p className="text-sm text-slate-500">現在加工・セット中の案件</p>
            <p className="text-3xl font-black text-indigo-600 group-hover:scale-110 transition-transform origin-bottom-right">
              {stats.process}
              <span className="text-base font-bold ml-1 text-indigo-400">件</span>
            </p>
          </div>
        </div>
      </div>

      <h3 className="text-lg font-bold text-slate-700 mb-4">パフォーマンスサマリー</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-blue-500">
          <h3 className="text-slate-500 font-bold text-sm">進行中の全案件数</h3>
          <p className="text-4xl font-black text-slate-800 mt-3">
            {stats.activeOrders}
            <span className="text-lg font-bold text-slate-400 ml-1">件</span>
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-emerald-500">
          <h3 className="text-slate-500 font-bold text-sm">出荷予定がある案件</h3>
          <p className="text-4xl font-black text-slate-800 mt-3">
            {stats.shipping}
            <span className="text-lg font-bold text-slate-400 ml-1">件</span>
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-purple-500">
          <h3 className="text-slate-500 font-bold text-sm">推定粗利合計</h3>
          <p className="text-4xl font-black text-slate-800 mt-3">
            ¥{Math.floor(stats.profit).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-12 bg-blue-50/50 p-6 rounded-2xl border border-blue-100/50 text-center text-sm text-slate-500">
        <p>要対応タスクのカードをクリックすると、対象データを一覧画面で確認できます。</p>
      </div>
    </div>
  )
}
