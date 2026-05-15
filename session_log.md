# 開発・要件定義セッションログ

**記録日:** 2026-04-03 ～ 2026-04-04
**フェーズ:** モックアップ要件定義（Phase 1）完了、およびクラウド＆コンポーネント移行（Phase 2）完了

## 1. ユーザー（東様）からの主要な指示・ヒアリング要件
- **現状の課題:** 
  - メールのやり取り、Excelベースの受注管理、各種書類の個別生成により「属人化」と「重複作業」が発生し、退職者フォローに苦戦中。
  - 商品（特にリボンやレース等）はサイズ・色で900SKU以上に及ぶ物もあり、完全な事前マスタ化（マスタの強制）は不可能。
  - 価格の見直しが都度走り、一物二価も頻発するため、ガチガチのシステムだと業務が回らない。
- **必要な機能要件:**
  - マスタレスで自由に手打ちできる緩さと、完全なExcelライクな操作性（範囲選択・一括コピペ等）。
  - 為替を考慮した「粗利の自動計算」（独自ルール機能）。
  - 過去の価格から変更があった際のエラー/アラート機能。
  - 未発注や請求待ちが一目でわかるステータス管理と見え方の切り替え。
  - 書類一括作成（見積書, Sales Note, 発注書, Proforma, 本Invoice, Packing List 等のワンクリック出力と入力ガード）。
  - 各種項目拡充や表記ゆれの自動吸収機能。
  - 複雑化する物流（一部引当／分納／加工セット化）における確実なトレーサビリティの保持。
  - **(Phase 2 追加)**: 実際の業務運用における「社内採算為替（値付け用暫定レート）」と「実勢為替（BL確定後の正式レート）」の厳密な使い分けロジックの搭載。
  - **(Phase 2 追加)**: 行コピペ時に発生する「請求待ちステータスの引き継ぎ」等の誤操作を防ぐ保護フィルター。

## 2. システム側（AI）の作業および対応内容（Phase 1 ～ Phase 2 総括）
- **プロトタイプの構築（Phase 1）:** 
  - ブラウザだけで動く「JS単一ファイルの究極モックアップ」により、極めて高度なBOM（部品構成）トラッキングを含む UI/UX を検証完了。
- **Supabase＆React/Vite への本番移行（Phase 2）:**
  - PostgreSQL 上に `order_items` テーブルを設置し、データの永続化と一方向データフロー（React）への完全刷新を完了。
- **高度なハイブリッド計算エンジンの移植・拡張:**
  - Phase 1 のSFA専用逆算エンジン、手動上書き検知機構をReact環境に完全移植。
  - 新たに **「社内採算為替」と「実勢為替」の二層レイヤーを導入** し、BL DATE が確定する前後で粗利計算に使用する為替原価レートの自動スイッチ機能を搭載。
- **業務防護ロジックの実装:**
  - ペーストイベント（Ctrl+V）をインターセプトし、複数行がコピーされた場合でも「新UUIDの付与」と「ステータス強制見積中リセット」を行うことで、Excelライクな俊敏性を保ちつつデータの破損を防ぐ高度な裏側処理を実行。
  - Supabaseの一括Upsertにおける Not Null 制約への対策として、全行への `updated_at` 自動付与スタンプ機能を実装。
- **デザイン・UIアーキテクチャの完全維持:**
  - Mac の Numbers のように美しく、ブルー（保存）とグレーを基調としたユニバーサルデザインをTailwind v4を駆使して再現。

## 3. 現在の進捗と次回の展開
React 環境のコンポーネントにおける「行分割」「加工・セット」「非表示即時アーカイブ」といった高度なリンク機能を AG-Grid Enterprise と共に再構築し、**Phase 2（クラウドへの移行とコア業務ロジックのシステム化）は 100% 完了** しました。

**【次回の展開（Phase 3：書類出力と運用テスト）】**
1. **実データの流し込み**: 実際の業務データ（Excel等）をSupabaseに注入し運用を開始。
2. **書類生成の本格実装**: 画面上部の『Invoice』等のボタンを押した際、実際のフォーマット（PDF/Excel）を出力するバックエンド処理の実装。

## 4. 2026-04-04 書類生成オートメーション（ワークフローの自動前進）の導入と修正
- **ユーザーからの指摘:** "Sales Noteを自動で受注確定に紐付けると実務に合わない。Invoice後は『請求待ち』ではなく『入金待』が正しい。また、全体のボタンUIがごちゃついており、Invoiceボタンだけ浮いている。"
- **対応（オートメーションの分離と適正化）:**
  - `generateSalesNote`：ステータスの自動遷移機能を取り外し、純粋な書類出力のみに戻した。
  - `registerOrder`（★新設）：アクションバー上段に「受注登録」ボタンを新設。これを選択行に適用することで、「受注済」へのステータス切り替えと受注日打刻を行うように改修。
  - `generateInvoice`：ステータス遷移先を「入金待」に修正。
- **対応（モダンUI/UXのリファクタリング）:**
  - `App.tsx` のツールバーレイアウトを大幅に整理。無駄なBorderと背景の箱（グレーボックス）を排除し、Appleデバイスライクな「フラットでシームレスなUI（Segmented Control風）」へとモダナイズした。
  - Invoiceボタンから青の塗りつぶしを外し、すべてのドキュメントボタンが美しく一列のグループに収まるようデザイン言語をクリーンに統一した。

## 5. 2026-04-06 開発環境の抜本的改善（Boxからの脱却とGitHub連携）
- **課題:** Box同期フォルダ上での開発によるファイルロックやモジュール破損（`@supabase/functions-js`の欠落など）、およびシステム再起動トラブルやAI開発文脈喪失が顕在化。
- **対応:**
  - 開発環境をローカルディスク（`C:\Users\higashi\Projects\039_sales_system`）に転居しモジュールをクリーンインストール。
  - `.gitignore` を設定し、`node_modules` や環境変数(`.env*`) をクラウドソース・Git上で不用意に共有しない安全な構成へ変更。
  - Gitによるソースコード管理を初期化し、GitHub(`sales_system`)への初回Pushを完了。
  - **端末間連携の確立:** 本ファイル(`session_log.md`)を定期的にGitHubへコミットすることで、自宅や別のPCからでもシームレスにAIの開発文脈・タスク進捗を同期できる体制を構築。

## 6. 開発・運用ルール
- 今後も、ただのデータマスタデータベースではなく、**「現場の営業マンが考えなくても自動計算・自動連動する営業アシスタントエンジン」** としてのデザインとロジックを両立させる。
- **運用方法（複数端末でのシームレスなAI連携）**:
  GitHubを使った複数PC（例：自宅PCと会社PC）間のデータ同期を初心者でも確実化するため、以下の **「魔法のキーワード」** をAI（Antigravity）への指示として活用する。
  
  📥 **作業を始める時（キーワード：「Pullお願いします」または「最新に更新して」）**
  - 指示を受けたAIは、直ちに裏側で `git pull` を自動実行し、GitHubから最新の差分をダウンロードします。さらに自ら `session_log.md` を読み込み、前回別のPCで作業した文脈を完全に復元した上で今日の作業をスタートします。
  
  📤 **作業を終える時（キーワード：「Pushお願いします」または「本日の作業完了」）**
  - 指示を受けたAIは、自動的に `session_log.md` などの開発ログを最新の記録へ更新した上で、`git add .` → `git commit` → `git push` を裏側で全自動実行し、すべての頑張りを安全にクラウドへ保存（送信）して終了します。

## 7. 2026-04-06（午後） UI/UX改修とロジックの改善
- **ユーザーからの要望:** ステータス表示の視認性向上、為替情報の制御（JPY時のロック等）、ツールチップでの操作ガイド表示、マスタからの価格サジェスト表示、SPL（分割）機能のクリーンなリンクID採番。
- **対応:**
  - **Grid AreaのUI最適化**: `StatusBadgeRenderer`をクリーンなドットとテキスト表示に刷新。不要な`import React`を整理しVite環境への適合を実施。
  - **ツールチップの追加**: `ag-tooltip` を適用し、表示遅延ゼロで美しいフェードインの解説を表示するように変更。
  - **マスタ価格のふんわり表示**: `PriceCellRenderer`を作成。数値と違った場合にのみ、過去のマスタ金額がセル下部に小さく表示されるようにUI/UXを大幅改善。
  - **為替の制御**: 円取引（JPY->JPY）の場合は、採算為替などのセルの編集をロックし、強制的に係数を1.0とする国内取引専用の判定エンジンを実装。
  - **SPL（分割）ロジックの改善**: 既存の行を分割した際、新しく`SPL-`が付与され数珠つなぎになるのを回避し、親のグループナンバー（既存ファミリーID）をそのまま子要素に継承するようにロジックをスマート化。

## 8. 2026-04-08 マスターデータ管理（CRUD）機能の実装と「機能ロック（Feature Lock）」
- **課題:** 現場が運用開始するにあたり、製品・仕入先・販売先などのマスターデータをシステム画面上から直感的に登録・編集できる機能が必要不可欠となった。また、実際の取引データ（Transaction）とマスター構造の整合性がズレている問題が浮上した。
- **対応:**
  - **構造の完全一致化:** `products` マスターに `package_qty` や `package_unit` を新設し、元データでの `order_items` の粒度（仕立ての扱い）と厳密に1対1で連動するようにデータベーススキーマを再構築した。
  - **CRUD UIの実装:** 閲覧専用の HTML Table を廃止し、メイン画面と同じ **Ag-Grid** を使った「MasterViewer」へとアップグレード。セルをダブルクリックしての直感的なダイレクト編集と、Supabaseへのリアルタイム自動保存（UPDATE）を実現。
  - **詳細ポップアップ実装:** 列が横長になるマスター（販売先等）向けに、行ダブルクリックで立ち上がる「マスター詳細編集モーダル（MasterDetailModal）」を作成し、ユーザーフレンドリーな編集体験を提供。
  - **日本語UI対応:** カラム名等の内部システム識別子をすべて自然な日本語表現へマッピングし直した。
- **💥【Feature Lock 宣言】💥**
  - 本日のセッションをもって、**【フェーズ2.5：マスター連携およびコアCRUD機能群】の要件定義と基本実装を確定（機能ロック）**としました。

## 9. 2026-04-08 (午後) Phase 3: エンタープライズ化実装の完了
- **課題:** 実運用を見据え、入力ミス防止、履歴追跡、データ量増加に伴うパフォーマンス低下への事前対応が急務となった。
- **対応:** 以下の4ステップを連続して実装し、各機能をGitのブランチ運用ルールに則って開発、最終的に `main` ブランチへ統合した。
  1. **ダッシュボード（アクションセンター）拡張:** `DashboardArea` に「発注待ち」「未請求」「加工中」など、ユーザーが今対処すべきタスク件数をスマート・アラートとして表示する機能を実装。
  2. **入力フォームの堅牢化 (Zod + React Hook Form):** `OrderDetailModal` の入力管理を再構築。マイナス入力等の無効値ガード機能や、品番入力からの**価格マスタサジェスト機能（オートコンプリート）**を実装。
  3. **監査ログ・Audit Trail 実装:** PostgreSQLのトリガー機能を活用し、追加・編集・削除の全履歴を自動で `audit_logs` に記録する強固な基盤を構築。ModalUI上にタイムライン表示タブを新設。
  4. **全データ無限スクロール化の導入:** Ag-Grid の `onBodyScroll` を利用し、10万件を超えても100件ずつ継ぎ足し読み込みを行う無限スクロール機能と、Supabase側でのページネーションフィルタリングを完全連携させた。
- **次回の展開:** 
  - システムとしての「防具」は完璧に仕上がったため、次回はいよいよ Phase 3最大の要件である **アプローチB（バックエンド側アーキテクチャ）を用いたPDF・帳票出力機能** の開発に着手する。

## 10. 2026-05-02 Codex移管後 UI/UXレビュー指摘の反映
- **課題:** AntigravityからCodexへ開発環境を移管する過程で、UI/UX観点のレビューを実施。ショートカット表示の不一致、横幅不足時の操作導線、未実装帳票ボタンの誤解、マスター管理の即時保存状態、列フィルター適用中の見落としが改善対象として抽出された。
- **対応:**
  - `App.tsx` の分割ボタン表示を実装・仕様書と一致する `Alt+D` に修正。
  - ツールバーとタブに折り返し・横スクロール耐性を追加し、ノートPC幅や拡大表示でも主要操作が画面外に消えにくい構成へ改善。
  - Proforma / Packing List を押下可能なプレースホルダーから、無効化された「準備中」表示に変更。
  - `MasterViewer` に「保存中 / 保存済み / 保存失敗」の状態バッジを追加し、メイン取引グリッドの手動保存方式との違いを明示。
  - `GridArea` に列フィルター適用中チップと全解除ボタンを追加し、列ヘッダーのフィルター適用状態も視覚的に強調。
- **影響範囲:** UI表示・操作状態の見える化のみ。業務ロジック、ステータス遷移、Supabase保存データ構造には変更なし。

## 11. 2026-05-02 明細表示領域を優先するコマンドバー再設計
- **課題:** 初回UI改善後、ツールバーが折り返し表示される環境では、ボタンエリアが縦方向を占有し、肝心のデータ明細が見づらくなることが判明。
- **対応:**
  - `App.tsx` の上部操作エリアを1行のコンパクトコマンドバーへ再設計。
  - 常時表示する操作を「見積追加」「受注登録」「詳細編集」「保存」などに絞り、複製・分割・加工キット・ロック解除・非表示は「選択行」ドロップダウンへ集約。
  - 見積書・Sales Note・発注書・Invoiceは「帳票」ドロップダウンへ集約し、準備中の帳票はメニュー内の非活性表示に変更。
  - 「明細を広く」ボタンを追加し、入力作業中は操作バーを畳んでグリッド表示領域を優先できる集中モードを実装。
- **影響範囲:** UI配置と表示密度のみ。業務ロジック、保存処理、ステータス遷移、帳票処理の中身には変更なし。

---

## 12. 2026-05-02 採算入力ビュー・案件サマリー実装
- **バックアップ:** 現行版へ戻せるよう、作業前コミット `2c668f2` に `backup/before-margin-view-20260502` タグを作成してGitHubへPush済み。
- **実装:** `GridArea` に `採算入力 / 採算詳細 / 3社間/SFA / 全項目` の表示モードを追加。既定表示では仕入単価・販売単価・数量・行粗利・粗利率を中心にして、冗長な合計系列を必要時に切り替える構造に変更。
- **案件利益:** 選択行または同一案件キーの明細を集計し、販売合計、仕入合計、経費、粗利、粗利率をグリッド上部に表示。単価採算だけでなく、受注1件全体の利益額も確認できるようにした。
- **影響:** 表示列制御と画面上の集計のみ。保存、DB、ステータス、帳票ロジックは変更なし。

## 13. 2026-05-02 UIビジュアルリファイン
- **依頼:** Liquid Glassほど派手にせず、現行UIをよりスタイリッシュで洗練された業務アプリに寄せたい。
- **実装:** `App.tsx` に主要レイアウトクラスを付与し、`index.css` でヘッダー、コマンドバー、タブ、ワークスペース、AG-Grid、採算サマリーの質感を統一。
- **方針:** 業務利用の可読性を優先し、強いグラデーションや装飾を避けた薄いガラス感・控えめな影・整理された境界線に留めた。
- **検証:** `npm.cmd run build` 成功。大容量チャンク警告は既存傾向で、今回のUI変更によるビルドエラーはなし。

## 14. 2026-05-03 為替管理項目の追加
- **依頼:** 毎年度の採算確認用為替を管理者が設定できるようにし、出荷後はBL DATE基準でMUFG公表TTB/TTSを使って実為替確定したい。BL DATEが休日の場合は前営業日レートを使い、優遇レートも後から設定したい。
- **実装:** `MasterViewer` に `年度採算為替`、`MUFG実為替`、`優遇レート` タブを追加。`masterTranslations` に為替テーブル用の列名を追加。
- **DB:** 追加テーブル用のSQL `prototype-app/exchange_rate_schema.sql` を新規作成。`annual_exchange_rates`、`mufg_exchange_rates`、`exchange_rate_adjustments` を定義。
- **設計メモ:** MUFG公表レートの自動取得はフロントではなく、Supabase Edge Function等のサーバーサイド定期ジョブで実装する想定。販売換算はTTB、仕入換算はTTS。
- **DB反映:** `prototype-app/exchange_rate_schema.sql` をSupabase本番プロジェクトへ適用済み。`annual_exchange_rates`、`mufg_exchange_rates`、`exchange_rate_adjustments` の3テーブルがREST APIから参照可能であることを確認。
## 15. 2026-05-13 Supabase connection diagnosis and fallback
- Confirmed the Vite app was running on `http://localhost:4173/`, but Supabase reads failed with `TypeError: Failed to fetch`.
- Verified that generic `supabase.co` DNS and HTTPS access worked, while the configured project host did not resolve (`ENOTFOUND` / remote name could not be resolved). This indicates the current Supabase project URL is not reachable from the local environment.
- Updated `GridArea` so the main transaction grid falls back to bundled `gcga_data.json` sample rows when the Supabase read fails. The fallback is labeled in the UI and does not change the manual Supabase Save behavior.
- Follow-up decision: keep the sample-data fallback for development only. `GridArea` now gates the fallback behind `import.meta.env.DEV`; production builds show no silent sample replacement when Supabase is unavailable.
- Cleaned handover/runbook notes for the Codex transition: rewrote `HANDOVER.md` and `RUN_PROTOTYPE.md` in readable form without embedded credentials, and removed the redundant temporary `repo_understanding_20260513.md` memo.

## 16. 2026-05-14 MURC USD exchange-rate import
- **Decision:** Start exchange-rate operations with manual master/Excel import first, then add automatic fetching later.
- **Source:** MURC monthly Excel from the past-rate page is used for confirmed historical rates through the previous month. MUFG's daily public page remains the source for later daily automation/current-day checks.
- **Implementation:** Added `prototype-app/scripts/import_murc_usd_rates.py`, which reads the MURC `.xls` `data` sheet and imports USD `TTB`/`TTS` rows into `mufg_exchange_rates`. Non-business BL DATEs are stored with the previous business day's rate and `previous_business_date` populated.
- **DB update:** Imported 116 USD rows for 2026-01-05 through 2026-04-30 into Supabase: 79 published business-day rows and 37 non-business-day carry-forward rows.
- **Preferential rule:** Added the USD standard preferential adjustment rule in `exchange_rate_adjustments`: sales use `TTB + 0.50`, purchases use `TTS - 0.50`, effective from 2026-01-01.

## 17. 2026-05-14 Exchange-rate calculation integration
- **Implementation:** Added shared exchange calculation helpers in `prototype-app/src/lib/exchangeRates.ts` and connected them to `GridArea` and `DashboardArea`.
- **Grid behavior:** Gross profit, gross margin, deal summary, and kit-row material costing now use exchange master rates when `BL DATE` is present. Sales use TTB plus the active preferential adjustment; costs use TTS plus the active preferential adjustment.
- **Fallback behavior:** If a BL DATE has no matching master rate, the calculation falls back to the existing manual `exchange_rate`, then `internal_rate`, then 145.
- **Dashboard:** Rebuilt the dashboard text as clean Japanese and switched profit aggregation to the same shared calculation helper.
- **Verification:** `npm.cmd run build` completed successfully. Manual calculation spot check for 2026-04-30 USD produced sales rate `159.89`, cost rate `160.89`.

## 18. 2026-05-14 Exchange-rate visibility and daily MUFG import
- **Visibility:** Added `販売適用`, `仕入適用`, and `為替状態` columns to the margin/detail grid view. These show the applied sales/cost rates and whether the calculation used the exchange master, a previous business day, manual final rate, internal rate, annual budget rate, or default 145.
- **BL DATE helper behavior:** Editing BL DATE or price/currency/rate fields refreshes gross profit, gross margin, applied rate columns, and exchange status immediately.
- **Annual budget rate:** Seeded Supabase `annual_exchange_rates` with 2026 USD budget rate `145` for provisional profitability checks.
- **Daily import:** Added `prototype-app/scripts/import_mufg_daily_usd_rate.py`, which imports USD TTS/TTB from MUFG's official daily CSV and upserts `mufg_exchange_rates`. Imported the 2026-05-14 USD row: TTS `158.89`, TTB `156.89`.
- **Verification:** `npm.cmd run build`, `npx.cmd eslint src/lib/exchangeRates.ts`, and Python bytecode checks for exchange import scripts completed successfully.

## 19. 2026-05-14 Exchange-rate fallback guard
- **Issue:** When a future BL DATE such as 2026-05-15 had no exchange master row, some rows carried `exchange_rate=1` from JPY/domestic defaults. USD purchase rows then incorrectly showed applied exchange rate `1`.
- **Fix:** For non-JPY currencies, `exchange_rate` is treated as a usable manual final rate only when it is greater than `1`. If it is `1` or blank, the calculation falls back to `internal_rate`, then annual budget rate, then default 145.
- **UI:** Consolidated the exchange status label function so `為替状態` displays readable Japanese labels such as `未確定: 年度採算為替を使用`.
- **Verification:** `npm.cmd run build` and `npx.cmd eslint src/lib/exchangeRates.ts` completed successfully.

## 20. 2026-05-15 Exchange-rate operation UI and verification
- **Warning display:** Highlighted `為替状態` in yellow when the row is not finalized by the exchange master and is not JPY. This makes BL DATE blank, future dates, missing master rows, and budget-rate fallbacks visible in the grid.
- **Automated test:** Added `npm run test:exchange`, covering blank BL DATE, 2026-05-14 master-rate USD calculation, and 2026-05-15 missing-master fallback where `exchange_rate=1` must not be used for foreign currency.
- **Import UI:** Added `MUFG日次USD取込` and `MURC月次Excel取込` buttons to exchange master tabs. The buttons call local Vite API endpoints that execute the existing Python import scripts, keeping Supabase service credentials out of the browser bundle.
- **Import verification:** Confirmed the local APIs import the MUFG daily USD CSV and the local MURC monthly `.xls` into Supabase, then refresh the master grid.

## 21. 2026-05-15 Fiscal-year exchange boundary and historical FX policy
- **Fiscal year:** Updated annual budget exchange-rate selection to use the SUCCESS exchange fiscal year: June 1 through the following May 31. `fiscal_year` represents the starting year, so FY2025 is 2025-06-01 to 2026-05-31.
- **Historical rates:** Confirmed the past-order approach: import MURC year Excel files for 2025 and earlier into `mufg_exchange_rates`. The existing BL DATE lookup then works for historical orders because rates are stored by actual rate date and currency.
- **Preferential rule:** Changed the MURC import script default USD preferential adjustment start date to 1990-01-01 so historical USD rows receive the same TTB/TTS 50-sen rule unless a narrower rule is later added.

## 22. 2026-05-15 Historical MURC imports for 2021-2025
- **Input files:** Received local MURC Excel files `murc_2021.xls` through `murc_2025.xls` and kept them out of Git with a `murc_*.xls` ignore rule.
- **Parser fix:** Updated the MURC importer so full-year files include trailing year-end non-business days and ignore post-summary reference rows such as the 2024-08-07 public-rate halt note.
- **DB import:** Imported USD rows into `mufg_exchange_rates`: 2021=362, 2022=362, 2023=362, 2024=363, 2025=360. Verified 2026 currently has 117 USD rows through 2026-05-14.
- **Cleanup:** Removed duplicate USD preferential adjustment rows created by parallel import retries, leaving one active USD standard rule effective from 1990-01-01.

## 23. 2026-05-15 Mobiron legacy ledger import
- **Input file:** Received `サンプル/モビロン管理台帳(Sales Note台帳含む).xls`; the `管理表` sheet is the source ledger for Mobiron order/purchase rows.
- **Implementation:** Added `prototype-app/scripts/import_mobilon_ledger.py`. The script reads the legacy workbook, creates a dry-run JSON preview by default, and inserts into Supabase only with `--insert`. Generated preview output is ignored by Git.
- **Mapping decision:** Sales Note/order number maps to `order_no`; customer, category, order date, customer PO, PO date, item code, size/color, quantity/unit, sales/cost prices, EXW, ETD, invoice date/no, and memo fields map into `order_items`. ETD is used as the best available `bl_date` for historical exchange-rate calculation.
- **Status/archive decision:** Invoice-number rows import as `請求済` and locked. Rows are judged by EXW for archive visibility, but EXW dates from 2026-01-01 onward remain active because recent EXW rows may still be shipment-waiting, in-stock, missing ETD, or missing invoice follow-up. Older EXW rows are archived as shipped history while retaining their status.
- **Supplier decision:** Default supplier is `日清紡`; category `Code` and customer routes Min Yuen, SF Hong Kong/SF HK customer, Helby, Danesi, and R.M.X. import as `八木熊`.
- **DB import:** Inserted 2,800 Mobiron rows into Supabase `order_items`. After the recent-EXW visibility correction, verification counts are archived 2,497 / active 303, locked 565, supplier split `日清紡` 2,394 / `八木熊` 406, status split `未請求` 2,235 / `請求済` 565, currency split JPY 2,397 / USD 403.
- **Verification:** `npm.cmd run build` completed successfully. Supabase readback confirmed 2,800 imported rows via `system_log='Imported from Mobiron legacy ledger.'`.

## 24. 2026-05-15 Mobiron recent EXW archive correction
- **User correction:** EXW can be present even when ETD or invoice number is missing, and recent rows may represent shipment-waiting or stock situations. Hiding those rows in the archive could cause operational follow-up misses.
- **Implementation:** Updated `prototype-app/scripts/import_mobilon_ledger.py` so Mobiron rows with EXW/factory_date from 2026-01-01 onward are not archived on import.
- **DB correction:** Patched existing Mobiron import rows in Supabase where `factory_date >= 2026-01-01` and `archived=true` to `archived=false`.
- **Verification:** Supabase readback confirmed 2,800 Mobiron rows total, archived 2,497, active 303, and zero rows with `factory_date >= 2026-01-01` still archived.

## 25. 2026-05-15 Whole-dataset sort/filter preload
- **Issue:** The grid used page-based loading for responsiveness. AG Grid sort/filter then acted only on rows already loaded in the browser, so suppliers or users that existed lower in the dataset could be missing until the user scrolled down.
- **Implementation:** `GridArea` now loads the first Supabase page for fast initial paint, then preloads remaining rows for the active tab in the background. Sort and filter events trigger the same preload if the user acts before all rows are loaded.
- **UX:** The bottom-right record badge shows `loaded / total` while background preload is active, then returns to total count after all rows are available.
- **Verification:** `npm.cmd run build` completed successfully. A headless Chrome check against `http://localhost:4173/` confirmed the all-data tab progressed from `100 / 14,068` to `1,100 / 14,068`, then completed at `14,068`; Supabase network ranges reached the final `13100-14067` batch.
## 26. 2026-05-15 NY BackOrder import preview
- **Input file:** Analyzed `サンプル/千葉 NY-Backorder  - 20221227～.xlsm`, sheet `NY BackOrder`, together with the shared VBA workflow. The workbook contains three price layers: purchase JPY, Osaka-to-NY USD, and End User USD.
- **Implementation:** Added `prototype-app/scripts/preview_ny_backorder_import.py`. The script creates `ny_backorder_import_preview.json` and does not write to Supabase.
- **Mapping policy:** Title/context rows are excluded and inherited into detail rows. Regular item rows map into the existing `order_items` structure with SF America as `customer`, the legacy customer as `end_user`, SF Osaka as `supplier`, Osaka-to-NY price as `sales_price`, End User price as `end_user_price`, purchase price as `cost_price`, and the legacy 90/120 rate as `internal_rate`.
- **Fee policy:** Handling Fee, International Freight, Insurance, Cutting Fee, Dye, Setup, and other charge rows convert into linked `Order charge` rows under the same `NYBO-<PO>` `link_id`.
- **Structure decision:** No immediate SUCCESS database schema change is required. The current `order_items` columns can support Mobiron, NY BackOrder, and the upcoming China ledger through a common row-based import style. A future optional enhancement would be `source_ledger`, `source_row`, and `legacy_line_type` columns for easier auditing.
- **Verification:** Preview run scanned through row 5,329 and produced 4,258 converted rows: 2,452 detail rows and 1,806 fee rows. It excluded 1,018 title rows and left 31 exceptional rows unclassified for later policy review. Osaka-to-NY formula checks passed for most rows, with 119 mismatches out of 2,016 checked rows. End User theoretical pricing differed in 1,413 out of 2,015 checked rows, confirming the user-facing price must be preserved as a manual legacy value.
