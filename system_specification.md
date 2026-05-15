<!-- 
[AI SYSTEM RULE: MANDATORY DOC AUTO-UPDATE]
If any logic, UI, or architecture is updated in the codebase during a session, the AI agent MUST autonomously update `system_specification.md`, `user_manual_draft.md`, and `session_log.md` to reflect the changes WITHOUT asking the user for permission or waiting for explicit instructions.
-->
# 販売管理システム 究極仕様書

**作成日:** 2026-04-03
**更新日:** 2026-04-04 (Phase 2 クラウド・コンポーネント完全移行完了)
**ドキュメントバージョン:** 2.0 (React/Supabase連携版)

---

## 1. システム概要と基本コンセプト
本システムは、海外営業部門における「受発注」「見積」「発注」「請求（Invoice）」の各業務プロセスをひとつの統合されたグリッド上で完結・一元管理するためのWebアプリケーションです。

最大の設計コンセプトは**「完全なエクセルライクな操作感の維持」**と**「ガチガチの制約を排除したマスタレスな柔軟性」**です。900種以上にのぼる多岐にわたる商材や一物二価など、変動の激しい貿易実務に耐えうるよう、強力な自動計算・自動書類生成等、システムならではの保護サポート機能を融合させています。

---

## 2. システムアーキテクチャ (Phase 2 移行後)
プロトタイプの検証を終え、データ永続化と複数人での安全な運用のため、本格的なモダンWebスタックへと全面刷新しました。

*   **フロントエンド**: React 19 + Vite + TypeScript による堅牢なコンポーネント設計。
*   **デザインシステム**: Tailwind CSS v4 を採用し、Appleのエコシステムのような洗練された透明感のあるユニバーサルデザインを構築。
*   **データグリッド**: AG-Grid Enterprise を搭載し、無制限の範囲選択や右下ドラッグコピー等、エクセルと寸分違わぬ操作感を実現。
*   **バックエンド / データベース**: **Supabase (PostgreSQL)** をBaasとして採用。ローカルの仮データから本番稼働可能なリレーショナル状態への完全移行済み。

---

## 3. 権限管理と表示制御機構（RBAC / Filter）
*   **アーキテクチャ**: アプリケーション起動時のログインモーダルで割り当てられた `role_id` に応じて振る舞いが切り替わります。
*   **一般営業職（松岡・大谷等）**: AG-Gridの `isExternalFilterPresent` 機構により、全件・アーカイブのどのタブを開いても**強制的に自身が担当する案件のみがフィルタリング表示**され、他者のデータによる画面の乱れを防ぎます。
*   **役員・管理者（admin）**: 全営業担当者のすべてのデータ、全体のアラート状況を一つの画面で俯瞰・閲覧可能です。

---

## 4. データトレーサビリティと高度なリンク保護
サプライチェーンの複雑化に対応する「究極のトレーサビリティ」を担保する仕組みです。

### 4.1. 行の分割（一部引当・分納）
*   該当行を選択し**「✂️ 行を分割 (`Alt+D`)」**を実行すると、分割指定数量に基づいてトランザクションベースで現在の行の数分を減算し、新UUIDを持つ分納用の行を瞬時に追加します。
*   **リンクIDの蓄積（タグ化）:** 双方に `SPL-xxxx` という分割グループIDが付与・蓄積（カンマ区切りで追記）され、数量が散らばっても親が同一であることが保証されます。

### 4.2. キット化・加工外注プロセス（消費と生産）
*   2つ以上の資材を選択して**「📦 加工・セット (`Alt+K`)」**を実行するボトムアップ型BOM構成ロジックです。
    1. 選択された材料行はステータスが「加工消費」へ遷移・ロック保護されます。
    2. 新品番の完成品行が生成され、仕入原価は「全材料の費用合計 ＋ 加工賃(為替計算ベース)」として自動合算されます。
    3. 全関連行に共通の `PRC-xxxx` 加工グループIDが付与され、完全な双方向追跡が可能になります。

### 4.3. 操作の安全機構 (コピーペースト制約)
*   **「見積中」への強制リセット**: コピーペーストや「行を複製」ボタンを介して行が複製された際、元の行が「請求待ち」や「発注済」であっても、システムが内部でインターセプトし、**新しい行のステータスは絶対に「見積中」に初期化**されます。これにより旧式の書式や権限制約が意図せず波及することを防ぎます。
*   **UI状態の見える化**: 列フィルター適用中はグリッド右上に「列フィルター中」チップを表示し、ワンクリックで列フィルターのみ解除できます。タブによる業務絞り込みは維持されます。
*   **誤操作防止UI**: Phase 3未実装の帳票ボタンは通常操作ボタンとして扱わず、無効化された「準備中」表示とします。実装済み機能と未実装機能を視覚的に区別します。
*   **明細優先のコンパクト操作バー**: 常時表示する操作は「見積追加」「受注登録」「詳細編集」「保存」などの主要操作に絞り、複製・分割・加工キット・ロック解除・非表示は「選択行」メニュー、帳票出力は「帳票」メニューへ格納します。
*   **明細集中モード**: 入力・確認作業中は「明細を広く」ボタンで操作バーを畳み、グリッドの表示領域を優先できます。業務タブは維持し、必要時に操作バーを再表示できます。

---

## 5. 書類生成・ステータス連動（Workflow Automation）と監査ログ

### 5.1. ステータス連動アクションと書類生成
ユーザーのクリック数を極限まで減らし、人的ミスを防ぐため、書類の生成・特定アクションをステータスマシンのトリガーとしています。
*   **受注登録**：対象行のステータスを強制的に「受注済」へ遷移・受注日スタンプ（書類生成とは独立して動作可能）。
*   **発注書発行**：対象行を「発注済」に遷移させ、PO Noと発注日をスタンプ。
*   **Invoice発行**：対象行を「入金待」へ移行させ、Invoice Noを採番し、ただちに**編集不可（グレーアウト・Freeze）**へとロックします。

### 5.2. 改版（Revision）と監査ログの自動生成
*   ロック行を修正する必要がある場合、対象行で**「🔓 ロック解除 (`Alt+U`)」**を実行します。
*   解除時、システムはスナップショットを取り、再度の書​​類発行時に「変更差分（例：数量[100→150]）」をシステムログとして備考欄に刻み込み、Invoice No に `REV` フラグを付与して監査証跡を残します。

---

## 6. 価格・為替 ハイブリッド計算エンジン

本システムにおける全ての複雑な価格ロジックは `GridArea.tsx` 内の `valueGetter` および `onCellValueChanged` に集約・自動化されています。

### 6.1. 『2層レイヤー為替計算ルール』（Phase 2 中核機構）
*   **社内採算為替（暫定）**: 受注確定前の見積・値付段階では、変動リスクバッファーを含んだ事前指定の「社内採算為替レート」を最優先して粗利(円)を計算します。
*   **実勢為替の自動スイッチ**: 出荷指示が完了し「BL DATE」と「実勢為替」セルが埋まった瞬間、**システムは自動で評価エンジンを実勢為替ベースに切り替え**、確定した最終粗利を再算出します。

### 6.2. マスタ補完と手動オーバーライドの賢いブレイク
*   品番入力時、仮マスタと照合し「品名・カテゴリ」を自動補完しつつ、過去の単価と大きく乖離した金額が打ち込まれた場合はただちにセルを警告色（黄色）でハイライトします。
*   掛率設定に基づく利益自動計算が走ったのち、営業担当が丸め誤差調整などで「販売単価をエイヤで手動上書き」した場合、システムは自動で競合から身を引き、掛率ステータスを「手動(ﾏﾆｭｱﾙ)」文字に切り替えます。

### 6.3. SFA（3社間特例取引）全自動エンジン
*   得意先が「Sun Fashion America」等になった場合、専用モードに切り替わります。材料（リボン・レース等）のカテゴリ毎に定められた規定倍率を用いて「エンド顧客向け単価」を自動算出し、そこから現法利益(30%)を差し引いて「本社販売単価」まで全て連鎖的に自動入力（リバースエンジニアリング計算）します。

---

## 12. 2026-05-02 採算入力ビューと案件サマリー
- **目的:** 仕入単価・販売単価・行粗利率を確認しながら入力する現場Excelの思想を保ちつつ、通貨・単価・合計が3系列に並ぶ冗長さを通常作業から減らす。
- **GridArea:** `採算入力 / 採算詳細 / 3社間/SFA / 全項目` の表示モードを追加。既定の `採算入力` では、仕入通貨・仕入単価・販売通貨・販売単価・行粗利・粗利率を残し、合計・為替・経費・ユーザー価格などは必要時に切り替えて確認する。
- **案件サマリー:** 明細を選択すると、選択行または同一案件キー（受注No、見積No、顧客PO、Invoice No）の行を集計し、販売合計、仕入合計、経費、粗利、粗利率をグリッド上部に表示する。単価採算と案件全体の利益額を同時に追えるようにした。
- **影響範囲:** DBスキーマ、保存処理、ステータス遷移、帳票処理には変更なし。AG-Gridの表示列制御と選択行集計のみ。

## 13. 2026-05-02 UIビジュアルリファイン
- **目的:** 業務アプリとしての高密度・視認性を保ちながら、macOS/Linear系の控えめなガラス感と精密な操作パネル感へ寄せる。
- **対象:** アプリシェル、ヘッダー、コマンドバー、タブ、作業カード、採算ビュー切替、案件サマリー、AG-Gridテーマ。
- **内容:** 半透明レイヤー、薄い境界線、控えめな影、落ち着いたグレー/ネイビー基調、AG-Gridヘッダー・選択行・フォーカス枠の整理を追加。
- **影響範囲:** CSSと表示クラスのみ。保存処理、データ構造、集計ロジック、帳票ロジックには変更なし。

## 14. 2026-05-03 為替管理方針
- **年度採算為替:** 毎年度、管理者が年間の採算確認用レートを `annual_exchange_rates` に設定する。SUCCESSの為替年度は6月1日開始、翌年5月末終了とし、`fiscal_year` は開始年を表す。これは見積・受注前後の暫定採算確認に使う。
- **実為替確定:** 出荷後は `BL DATE` を基準に、MUFG公表為替レートを使って採算を確定する。販売換算は `TTB`、仕入換算は `TTS` を使う。
- **休日処理:** `BL DATE` が銀行休業日などで公表レートが存在しない場合は、前営業日のレートを適用する。`mufg_exchange_rates.previous_business_date` に実際に参照した営業日を保存する。
- **優遇レート:** MUFG基準レートに対する優遇幅は `exchange_rate_adjustments` で後から設定できるようにする。販売先・仕入先・通貨・期間・優先度を持たせ、適用TTB/TTSを算出する。
- **自動取得:** MUFGの公表為替ページ（例: https://www.bk.mufg.jp/ippan/kinri/list_j/kinri/kawase.html ）を毎営業日または毎日ジョブで取得し、`mufg_exchange_rates` に蓄積する設計とする。実装はSupabase Edge Function + スケジュール実行を想定する。
- **今回の追加:** マスター画面に `年度採算為替`、`MUFG実為替`、`優遇レート` の管理タブを追加し、DB追加用SQL `prototype-app/exchange_rate_schema.sql` を作成した。
## 15. 2026-05-14 MURC月次Excel取り込み方針
- **運用方針:** 為替はまず手動マスター/Excel取り込み方式で安定運用し、自動取得は後続フェーズで追加する。公式ソースはMURC過去相場ページ（https://www.murc-kawasesouba.jp/fx/past_3month.php ）とMUFG銀行の日次相場ページ（https://www.bk.mufg.jp/ippan/kinri/list_j/kinri/kawase.html ）を使う。
- **MURC Excel:** 月初に前月末までの相場を含むExcelを取得し、`data` シートのUSD `TTS` / `TTB` を `mufg_exchange_rates` へ投入する。営業日レートは公表値のまま保存し、休日・銀行休業日は前営業日の公表値をコピーして `is_business_day=false`、`previous_business_date` に参照元営業日を保存する。
- **過去実為替:** 2025年以前の受発注データは、MURCの年別Excelを同じ取り込みスクリプトで投入する。`mufg_exchange_rates` は日付・通貨単位の蓄積テーブルなので、過去年のExcelを順番に取り込めばBL DATE基準で過去実為替を参照できる。
- **USD優遇:** 公表レート自体は変更せず、御社のUSD優遇は `exchange_rate_adjustments` に保持する。販売換算は `TTB + 0.50`、仕入換算は `TTS - 0.50` として適用する。
- **補助ツール:** `prototype-app/scripts/import_murc_usd_rates.py` を追加し、ローカルのMURC `.xls` からUSD日次レートとUSD標準優遇ルールをSupabaseへ投入できるようにした。秘密鍵は `.env.admin.local` から読み取り、コードやログには保存しない。
## 16. 2026-05-14 為替マスター計算接続
- **共通計算:** `prototype-app/src/lib/exchangeRates.ts` を追加し、Grid/Dashboard共通で販売JPY、仕入JPY、粗利JPYを算出する。
- **BL DATE確定後:** `BL DATE` と通貨に一致する `mufg_exchange_rates` が存在する場合、販売は `ttb_rate + preferential_ttb_adjustment`、仕入は `tts_rate + preferential_tts_adjustment` で換算する。
- **未確定・未登録日:** `BL DATE` が未入力、または該当日の為替マスターが未登録の場合は、既存運用どおり `exchange_rate` 手入力値、なければ `internal_rate`、さらに未入力なら `145` をフォールバックとして使う。
- **表示範囲:** グリッドの `粗利(円)`、`粗利率`、案件サマリー、キット化材料原価、ダッシュボード粗利集計が同じ計算関数を使う。
## 17. 2026-05-14 為替計算の見える化と日次取り込み
- **採算詳細ビュー:** `販売適用`、`仕入適用`、`為替状態` の表示列を追加。BL DATEが為替マスターに一致する場合は適用済みTTB/TTS優遇後レートと参照日を表示する。休日補完行では参照元営業日も表示する。
- **BL DATE補助:** BL DATE、通貨、単価、採算為替、実勢為替、経費が変更された場合、粗利・粗利率・適用レート・為替状態を即時再計算する。為替マスター未登録日は、手入力実勢為替、社内採算為替、年度採算為替、既定145の順で状態表示する。
- **年度採算為替:** USDの暫定採算レートとして `annual_exchange_rates` に `145` を登録。年度境界は6月1日から翌年5月末までで判定し、未確定段階で `internal_rate` が空の場合の採算確認に使う。
- **MUFG日次:** `prototype-app/scripts/import_mufg_daily_usd_rate.py` を追加。MUFG公式CSV `https://www.bk.mufg.jp/gdocs/kinri/list_j/kinri/spot_rate.csv` からUSD日次TTS/TTBを取得し、`mufg_exchange_rates` にupsertする。
- **外貨の1.0保護:** JPY行由来の `exchange_rate=1` がUSDなど外貨行に残っていても、実勢為替としては採用しない。外貨で為替マスター未登録の場合は、社内採算為替、年度採算為替、既定145へフォールバックする。
## 18. 2026-05-15 為替運用UIと検証
- **警告表示:** `為替状態` が `為替マスター` または `円建て` 以外の場合は黄色表示にし、未登録日や採算為替フォールバックが現場で見落とされにくいようにした。
- **自動テスト:** `npm run test:exchange` を追加し、BL DATE空白、2026-05-14、2026-05-15未登録日のUSD換算を自動検証する。外貨で `exchange_rate=1` を採用しない保護もテスト対象。
- **取り込みUI:** `マスター` 画面の為替系タブに `MUFG日次USD取込` と `MURC月次Excel取込` ボタンを追加。ローカルVite APIがPython取り込みスクリプトを実行するため、秘密情報はブラウザへ渡さない。
- **ローカルAPI:** Vite dev serverに `/api/import-mufg-daily-usd` と `/api/import-murc-usd` を追加。前者はMUFG公式CSV、後者は指定されたローカルMURC `.xls` をSupabaseへupsertする。
## 2026-05-13 Supabase connectivity fallback
- If the configured Supabase project endpoint cannot be reached during the main transaction grid load, the prototype now displays the bundled `src/gcga_data.json` sample rows instead of leaving the grid blank.
- The bundled sample fallback is limited to Vite development mode (`import.meta.env.DEV`) so production builds do not silently replace live data with sample data.
- The fallback is read-only from a persistence perspective: explicit Save still attempts to write to Supabase and will fail until a valid `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are configured.
- The grid shows a small `Dev only: Supabase offline, showing bundled sample data` indicator while this fallback is active, so operators can distinguish sample data from live database data.

## 2026-05-15 Mobiron legacy ledger import
- Added `prototype-app/scripts/import_mobilon_ledger.py` to convert the legacy Mobiron workbook `管理表` sheet into `order_items` rows. The script defaults to dry-run preview JSON and requires `--insert` for Supabase writes.
- Mapping policy: `B` becomes `order_no`, `C` customer/end user, `D` category, `E` order date, `F` customer PO, `H` PO date, `K/L` invoice date/no, `M` item code, `P/Q/R/S` size/color, `T/U` quantity/unit, `V/W/Z` sales and cost prices, `AG` factory date, and `AI` BL DATE fallback for exchange calculation. Legacy branch numbers, customer item codes, cautions, transport, ETA, old totals, and memo text are preserved in `comments`.
- Status policy: rows with invoice numbers import as `請求済` and locked. Rows are judged by EXW for archive visibility, but EXW dates from 2026-01-01 onward are not archived because recent EXW rows may still be waiting for shipment, stock movement, ETD, or invoice follow-up. Older EXW rows are archived as shipped history while remaining reviewable.
- Supplier policy: default Mobiron supplier is `日清紡`. Rows are assigned `八木熊` when the category is `Code` or the customer matches Min Yuen, SF Hong Kong/SF HK customer routes, Helby, Danesi, or R.M.X.
- Imported 2,800 Mobiron rows into Supabase. Current verification counts after the recent-EXW visibility correction: archived 2,497, active 303, locked 565, suppliers `日清紡` 2,394 and `八木熊` 406, currencies JPY 2,397 and USD 403.

## 2026-05-15 Grid preloading for whole-dataset sort/filter
- The main AG Grid still renders the first Supabase page quickly, but after the initial page is displayed it preloads the remaining rows for the active tab in the background.
- While background preload is in progress, the record badge shows loaded rows versus total rows. Once preload completes, client-side sorting and filtering operate on the full active-tab dataset instead of only the initially visible page.
- Sort and filter events also trigger the same full-dataset preload when the user acts before background preload has completed. This prevents suppliers, users, or other values that are lower in the result set from being absent from sort/filter outcomes.
## 2026-05-15 NY BackOrder legacy import preview policy
- Added `prototype-app/scripts/preview_ny_backorder_import.py` as the first migration bridge for the NY BackOrder workbook. It is preview-only and does not write to Supabase.
- The converter separates the legacy sheet into note rows, title/context rows, regular detail rows, and order-level fee rows. Title rows such as `(per meter)`, `(per roll)`, `(per piece)`, and other context-only rows are excluded from `order_items`; their product/composition text is inherited into the following detail rows.
- Regular item rows map to the existing `order_items` schema: SF America is treated as the customer, the legacy customer becomes `end_user`, SF Osaka is treated as supplier, Osaka-to-NY price maps to `sales_price`, End User price maps to `end_user_price`, purchase JPY maps to `cost_price`, and the legacy 90/120 rate maps to `internal_rate`.
- Handling Fee, International Freight, Insurance, Cutting Fee, Dye, Setup, and other charge lines are represented as linked fee rows in the same order block with `category='Order charge'` and a normalized `item_code` such as `HANDLING_FEE` or `INTERNATIONAL_FREIGHT`.
- SUCCESS does not currently require a database schema change for this workbook because `link_id`, `comments`, `system_log`, `end_user_price`, and `markup_rate` can preserve the legacy source and the three-price-layer structure. If later imports need stronger audit/search, add optional `source_ledger`, `source_row`, and `legacy_line_type` columns rather than making a separate table per legacy workbook.

## 2026-05-15 NY BackOrder rollbackable Supabase import
- `preview_ny_backorder_import.py` now supports `--insert`, `--verify-batch-id`, and `--rollback-batch-id`. Every inserted row is stamped with `import_batch_id=<batch>` in `system_log` and `comments`.
- The first NY BackOrder Supabase import was inserted under batch `NYBO-20260515174348`. Verification counted 4,258 rows, matching the preview conversion count.
- Rollback is scoped to the batch id only, so `python scripts/preview_ny_backorder_import.py --rollback-batch-id NYBO-20260515174348` deletes this NY BackOrder import without touching Mobiron or manually entered rows.

## 2026-05-15 Regional BackOrder import bridge for LA/EU
- Added `prototype-app/scripts/preview_regional_backorder_import.py` to handle NY, LA, and EU BackOrder ledgers with the same preview/insert/verify/rollback contract.
- LA uses the same title/detail/fee-row structure as NY, but the Osaka-to-NY price is validated as `End User price × category factor` rather than `purchase ÷ rate ÷ factor`. LA preview currently converts 3,637 rows: 2,313 details and 1,324 fee rows.
- EU uses `EU BackOrder`, has no category code control in the same way, and preserves the internal outgoing price as JPY while keeping the end-user unit price separately. EU preview currently converts 1,747 rows: 1,135 details and 612 fee rows.
- No LA/EU rows have been inserted yet. They can be inserted later with `--insert` and rolled back by the generated `LABO-...` or `EUBO-...` batch id.
