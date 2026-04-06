<!-- 
[AI SYSTEM RULE: MANDATORY DOC AUTO-UPDATE]
If any logic, UI, or architecture is updated in the codebase during a session, the AI agent MUST autonomously update `system_specification.md`, `user_manual_draft.md`, and `session_log.md` to reflect the changes WITHOUT asking the user for permission or waiting for explicit instructions.
-->
# 販売管理システム 導入・開発ロードマップ

現在のプロトタイプ検証から、社内での正式運用開始までのステップを整理しました。

## Phase 1: UI/UX & 業務ロジックの検証（現在完了）
- **目的**: 実際の使い勝手がExcelに勝てるか、計算ロジックが正しいかを検証。
- **成果物**: `mockup.html` (単一ファイルで全ての動きが試せるデモ)
- **確認内容**: 
  - [x] Excel並みの爆速入力・コピペが可能か
  - [x] ロック・改版（枝番）のワークフローが実務に即しているか
  - [x] 3社間取引などの複雑な自動計算が正確か

## Phase 2: クラウド基盤構築 & データ共有（次ステップ）
- **目的**: データの永続保存と、複数人でのリアルタイムなデータ共有（マスタ共有）を実現する。
- **作業内容**:
  - **Supabase連携**: クラウドデータベースを設置し、ブラウザを閉じてもデータが消えないようにする。
  - **ログイン/認証機能**: 担当者ごとの「マイビュー」を本番化（ログインした本人のデータのみ表示）。
  - **システム移行**: メンテナンス性を高めるため、プロの開発環境（Vite / React）へ移行。
- **費用**: $0 (Supabase無料枠内で十分に運用可能)

## Phase 3: 実データ移行 & マスタ正規化（現場検証）
- **目的**: 営業担当者が持つ既存Excelデータをすべて集約し、マスタを「生きた状態」にする。
- **作業内容**:
  - 各自のExcelから受注・発注データの一括インポート。
  - 取引先・商品マスタの正規化（「全角/半角」「大文字/小文字」の揺れを一律修正）。
  - **共有マスタの稼働**: 誰かが新しく追加した品番が、全員のサジェストに即座に反映される。

## Phase 4: 正式リリース & 書類出力の自動化
- **目的**: システムから「本物のPDF/Excel書類」を出力し、Excel業務を完全撤廃する。
- **作業内容**:
  - **PDF/Excel生成エンジン**: ボタン一つで会社指定フォーマットのInvoice/Packing Listを出力。
  - **モバイル対応**: 出先や倉庫からiPhone/iPadで進捗を確認。
  - **経営ダッシュボード**: リアルタイムな売上・粗利推移を可視化。

---

> [!NOTE]
> **費用の心配について**
> Supabaseは、現在の業務規模であれば無料枠でほぼ収まります。「まずはタダで動くものを作り、便利さを全員が実感してから必要に応じて有料化を検討する」ことが可能です。
