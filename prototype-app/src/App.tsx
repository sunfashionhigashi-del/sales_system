import './App.css'

type StoryPreset = {
  title: string
  length: string
  tone: string
}

const presets: StoryPreset[] = [
  { title: 'おやすみの森の小さな灯り', length: '5分', tone: 'やさしい' },
  { title: 'りくくんと月のふね', length: '3分', tone: '静か' },
  { title: 'きょうがんばった星', length: '8分', tone: '安心' },
]

function App() {
  return (
    <div className="site">
      <header className="topbar">
        <div className="brand">🌙 おやすみ物語</div>
        <nav>
          <a href="#app">アプリ</a>
          <a href="#lp">LP</a>
          <a href="#pricing">料金</a>
        </nav>
      </header>

      <main>
        <section className="hero" id="lp">
          <p className="pill">親子の眠りに、やさしい物語を。</p>
          <h1>1〜2タップで寝かしつけ。<br />日本語AIおやすみアプリ</h1>
          <p>
            「今日はもう限界」ボタンで3分の物語を即再生。子どもの名前・今日の出来事を反映し、
            画面より音声中心で静かな就寝ルーティンをつくります。
          </p>
          <div className="cta">
            <button>無料ではじめる</button>
            <button className="ghost">デモを見る</button>
          </div>
        </section>

        <section className="app" id="app">
          <h2>アプリプレビュー</h2>
          <div className="app-card">
            <div className="status">今夜 20:30 / 目標 21:00</div>
            <h3>今日は3分で大丈夫です。</h3>
            <textarea defaultValue="プールをがんばった" aria-label="できごと" />
            <div className="actions">
              <button>今夜の物語を始める</button>
              <button className="secondary">3分に短くする</button>
              <button className="outline">今日はもう限界</button>
            </div>
          </div>
          <div className="preset-grid">
            {presets.map((p) => (
              <article key={p.title}>
                <h4>{p.title}</h4>
                <p>{p.length}・{p.tone}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="pricing" id="pricing">
          <h2>料金プラン</h2>
          <div className="price-grid">
            <div><h3>無料</h3><p>週3話 / 3分・5分</p></div>
            <div><h3>有料 880円/月</h3><p>8分・12分 / 複数音声 / 睡眠記録</p></div>
            <div><h3>プレミアム 1,780円/月</h3><p>家族録音 / 兄弟管理 / 週次提案</p></div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
