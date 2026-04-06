import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function DashboardArea({ session }: { session: any }) {
    const [stats, setStats] = useState({ orders: 0, shipping: 0, profit: 0 })

    useEffect(() => {
        const fetchStats = async () => {
            const { data } = await supabase.from('order_items').select('*')
            if (data) {
                let myData = data;
                if (session?.user?.role_id !== 'admin') {
                    myData = data.filter(d => d.rep === session?.user?.name)
                }

                const orders = myData.filter((d: any) => ['受注済', '先行発注', '出荷済', '請求待ち'].includes(d.status)).length
                const shipping = myData.filter((d: any) => d.factory_date && d.factory_date !== "").length
                
                let profit = 0
                myData.forEach((d: any) => {
                    if (d.status !== '見積中' && d.status !== 'キャンセル' && d.sales_price && d.qty && d.cost_price) {
                        // ざっくりとした推定計算
                        const sJPY = d.sales_currency === 'JPY' ? d.sales_price : d.sales_price * 143.5
                        const cJPY = d.cost_currency === 'JPY' ? d.cost_price : d.cost_price * 144.5
                        profit += (sJPY * d.qty) - (cJPY * d.qty)
                    }
                })

                setStats({ orders, shipping, profit })
            }
        }
        fetchStats()
    }, [session])

    return (
        <div className="flex-grow p-6 pt-4 bg-gray-50 h-full overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-800 mb-6">個人ダッシュボード（進行中のタスクサマリー）</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-blue-500">
                    <h3 className="text-gray-500 font-bold text-sm">自分が担当する有効案件</h3>
                    <p className="text-4xl font-black text-gray-800 mt-3">{stats.orders}<span className="text-lg font-bold text-gray-500 ml-1">件</span></p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-green-500">
                    <h3 className="text-gray-500 font-bold text-sm">今月の出荷予約/予定</h3>
                    <p className="text-4xl font-black text-gray-800 mt-3">{stats.shipping}<span className="text-lg font-bold text-gray-500 ml-1">件</span></p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-indigo-500">
                    <h3 className="text-gray-500 font-bold text-sm">推定 粗利合計 (月間)</h3>
                    <p className="text-4xl font-black text-gray-800 mt-3">¥{Math.floor(stats.profit).toLocaleString()}</p>
                </div>
            </div>
            
            <div className="mt-8 bg-blue-50 p-6 rounded-xl border border-blue-100">
                <h3 className="text-blue-800 font-bold mb-3">ダッシュボードの拡張方針（Phase 4以降）</h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                    現在の数値は簡易推定（仮計算）ですが、本番環境移行後は「売上推移グラフ（棒グラフや折れ線グラフ）」や「最近のエラー一覧」など、ログインユーザーの業務に必要な重要指標をここに一元化します。<br/>
                    これにより、全データをグリッド上でフィルタリングする前に、現状の営業成績や要対応案件をダッシュボード上で瞬時に把握できるようになります。
                </p>
            </div>
        </div>
    )
}
