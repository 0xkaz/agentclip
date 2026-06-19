# AgentClip(日本語)

ブラウザで選択したテキストを、**確認・編集してから** Cloudflare 上の個人ストアに保存し、
ユーザごとの Bearer トークンで認証する **REST API / MCP サーバ**経由で AI エージェントや
自作ツールから引き出せる、個人ナレッジクリッパです。

- **agent** — AI クライアントが MCP / REST + ユーザトークンでクリップにアクセス。
- **clip** — Chrome 拡張(MV3)が右クリックメニュー「Save to AgentClip」を追加。保存前に編集可能。

本番は **単一 Cloudflare Worker** として `https://agentclip.0xkaz.com` で動作し、
API・MCP・Google OAuth・ダッシュボードを同一オリジンで配信します。

- **ライブアプリ:** https://agentclip.0xkaz.com
- **ソース:** https://github.com/0xkaz/agentclip

## 機能

- **クリップ&編集** — 右クリックで選択範囲を保存。content/title/tags/source を編集可能。
- **キーワード検索** — content/title/tags への部分一致(日本語もOK)。
- **セマンティック検索** — Workers AI 埋め込み + Vectorize による意味検索。
- **クリップ単位の暗号化** — 保存時暗号化。暗号化クリップは検索対象外・一覧で既定マスク(表示トグルあり)。
- **共有リンク** — 1クリップを公開読み取り専用 `/s/<slug>` で共有。失効可(暗号化クリップは共有不可)。
- **MCP + REST** — ユーザトークンで AI エージェント/ツールが読み書き。
- ダッシュボードは Google ログイン、マシンは不透明 Bearer トークン。

## ホスト版をそのまま使う

ローカル構築不要の最短ルート:

1. **https://agentclip.0xkaz.com** を開き **Google でログイン**。
2. **API Tokens** ページでトークン発行(`ac_live_…`、初回のみ表示 → コピー)。
3. アプリ内の **Setup & Usage** ページに、あなた専用の MCP 設定・`curl` 例・拡張の設定手順が表示されます。

ダッシュボードは3ページ構成:

| ページ | 役割 |
|--------|------|
| **Snippets** | クリップの一覧・全文検索 |
| **API Tokens** | ユーザごと Bearer トークンの発行 / 失効 |
| **Setup & Usage** | MCP 設定・REST `curl`・拡張セットアップをコピペで案内 |

## モノレポ構成

```
apps/api         Cloudflare Worker(REST + MCP + Google OAuth, D1, ダッシュボード配信)
apps/web         React + Vite ダッシュボード(ランディング + Snippets / Tokens / Setup)
apps/extension   Chrome MV3 拡張(取得 + 確認/編集)
packages/shared  共有 TypeScript 型
```

以降はローカル実行・自前デプロイの手順です。
要件: **Node 20+**、**pnpm 9+**(`npm i -g pnpm`)、Cloudflare アカウント、Google OAuth クライアント。

---

## 1. クローン & インストール

```sh
git clone https://github.com/0xkaz/agentclip.git
cd agentclip
pnpm install      # または make install
```

## 2. Cloudflare D1 を設定

```sh
pnpm --filter @agentclip/api exec wrangler d1 create agentclip
```

返ってきた `database_id` を `apps/api/wrangler.toml` の **2 箇所**の `[[d1_databases]]`
(トップレベルと `[env.production]`)に貼ります。

```sh
make db-init                                  # ローカル D1 に schema.sql を適用
pnpm --filter @agentclip/api db:init:remote   # 本番 D1 に適用(後で)
```

## 3. Google OAuth を設定

Google Cloud Console → 認証情報 → **OAuth クライアント ID(ウェブ アプリケーション)**を作成。
承認済みリダイレクト URI を追加:

- ローカル: `http://localhost:8787/auth/google/callback`
- 本番: `https://agentclip.0xkaz.com/auth/google/callback`

ローカル用シークレットを作成:

```sh
cp apps/api/.dev.vars.example apps/api/.dev.vars
# apps/api/.dev.vars を編集:
#   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / SESSION_SECRET(任意のランダム 32+ バイト文字列)
```

## 4. ローカル起動

```sh
make dev                              # API + MCP: http://localhost:8787
pnpm --filter @agentclip/web dev      # ダッシュボード: http://localhost:5173
```

`http://localhost:5173` を開き、Google でログイン → API トークンを発行。

## 5. Chrome 拡張のインストール

```sh
pnpm --filter @agentclip/extension build      # apps/extension/dist を生成
```

1. `chrome://extensions` を開き **デベロッパーモード**を有効化。
2. **パッケージ化されていない拡張機能を読み込む** → `apps/extension/dist` を選択。
3. AgentClip アイコン → **API ベース URL** と、ダッシュボードで発行した**トークン**を設定。
   - ローカル: `http://localhost:8787`
   - 本番: `https://agentclip.0xkaz.com`
4. 任意のページでテキスト選択 → 右クリック → **Save to AgentClip** → 編集 → **Save**。

## 6. 本番デプロイ(`agentclip.0xkaz.com`)

```sh
# 一度だけ: 本番シークレットを設定
pnpm --filter @agentclip/api exec wrangler secret put GOOGLE_CLIENT_ID --env production
pnpm --filter @agentclip/api exec wrangler secret put GOOGLE_CLIENT_SECRET --env production
pnpm --filter @agentclip/api exec wrangler secret put SESSION_SECRET --env production
pnpm --filter @agentclip/api db:init:remote        # 本番 D1 にスキーマ

make deploy        # ダッシュボードをビルド → Worker をデプロイ(--env production)
```

> カスタムドメイン(`agentclip.0xkaz.com`)の紐付けには、Cloudflare API トークンに
> Workers/D1 編集に加え **Zone:Edit(0xkaz.com)** が必要です。未付与の場合は Worker を
> デプロイしてダッシュボードからドメインを紐付けるか、`*.workers.dev` URL を使ってください。

---

## REST API の利用

```sh
# 保存("encrypted": true で暗号化 + 検索除外)
curl -X POST https://agentclip.0xkaz.com/api/snippets \
  -H "Authorization: Bearer ac_live_..." -H "Content-Type: application/json" \
  -d '{"content":"hello","tags":"demo"}'

# キーワード検索(部分一致・日本語OK)
curl "https://agentclip.0xkaz.com/api/snippets?q=hello" -H "Authorization: Bearer ac_live_..."
# セマンティック検索(意味)
curl "https://agentclip.0xkaz.com/api/snippets?q=greeting&mode=semantic" -H "Authorization: Bearer ac_live_..."
# 更新 / 削除
curl -X PATCH  https://agentclip.0xkaz.com/api/snippets/1 -H "Authorization: Bearer ac_live_..." -H "Content-Type: application/json" -d '{"content":"updated"}'
curl -X DELETE https://agentclip.0xkaz.com/api/snippets/1 -H "Authorization: Bearer ac_live_..."
```

## MCP の利用

MCP クライアントを `https://agentclip.0xkaz.com/mcp` に向け、ヘッダ
`Authorization: Bearer ac_live_...` を設定。ツール: `store_snippet` / `search_snippets`
/ `semantic_search` / `get_snippet` / `list_recent` / `update_snippet` / `delete_snippet`。

> セマンティック検索は新規保存分を自動インデックス。過去分は **Snippets → Semantic →
> Rebuild index**(または `POST /api/my/reindex`)で索引化。Vectorize は結果整合のため
> 反映に約1分かかります。

詳細は [docs/architecture.md](docs/architecture.md)、
[docs/agent-workflow.md](docs/agent-workflow.md) を参照。
