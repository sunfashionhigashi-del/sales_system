# 外部プレビュー手順（GitHub Pages）

このリポジトリには `attendance_app.html` を一時公開するための GitHub Actions を追加しています。

## 1) GitHub に push
```bash
git push origin work
```

## 2) Actions 実行
- GitHub の `Actions` タブを開く
- `Deploy Attendance Preview` を選択
- `Run workflow` を押す（または `attendance_app.html` 更新時の push で自動実行）

## 3) 公開 URL を確認
- 実行完了後、job の `Deploy to GitHub Pages` ステップに `page_url` が出ます
- 形式は通常:
  - `https://<GitHubユーザー名>.github.io/<リポジトリ名>/`

この URL は iPhone / Android どちらのブラウザからもアクセスできます。
