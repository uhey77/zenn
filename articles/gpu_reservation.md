---
title: "完全無料で研究室向け GPU 予約システムを作ってデプロイした話"
emoji: "🖥️"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["React", "FastAPI", "Supabase", "CloudflarePages", "Render"]
published: True
publication_name: "transmedia_blog"
published_at: 2025-12-08 21:00
---

### はじめに

はじめまして、[TransMedia Tech Lab](https://www.transmedia-tech-lab.jp/) に所属している B4 の山田 祐平です。

研究室で GPU サーバーを複数人で共有していると、こんな問題が起きがちです。

- 「今誰が GPU 使ってる？」が分からない
- Slackで毎回「今日の 15 時から GPU 使います！」と宣言するのが面倒
- 予約がかぶって学習ジョブが落ちる悲劇

そこで、**GPU の予約状況を可視化し、Webから簡単に予約できるシステム**を作ることにしました。
また、研究室の予算は限られているため、**完全無料**で運用できることを目指しました。


### システム構成図

今回構築したシステムの全体像です。

![](/images/gpu_reservation/infra.png)

- フロントエンド (React): Cloudflare Pages でホスティング
- バックエンド (FastAPI): Render.com でホスティング
- データベース (PostgreSQL): Supabase でホスティング

すべて無料枠の範囲内で運用しています。


### 技術スタック & 技術選定

| レイヤー | 技術 | 選定理由 |
|---------|------|----------|
| フロントエンド | React + Vite | 高速な HMR、シンプルな構成 |
| バックエンド | FastAPI + SQLModel | Python 製でシンプル、型安全 |
| データベース | PostgreSQL (Supabase) | 無料枠あり、管理が楽 |
| フロントホスティング | Cloudflare Pages | 無料、高速 CDN、デプロイが簡単 |
| バックエンドホスティング | Render.com | 無料枠あり、GitHub 連携が楽 |
| パッケージ管理 | uv | pip より高速、ロックファイル対応 |

#### なぜ Vercel ではなく Cloudflare Pages？

[Vercel](https://vercel.com/home) も素晴らしいサービスですが、今回は以下の理由で Cloudflare Pages を選択しました。

- 無料枠の制限が緩い: ビルド回数やリクエスト数の制限が Vercel より緩い
- グローバルCDN: Cloudflare のエッジネットワークで高速配信
- シンプルな設定: 特別な設定ファイルなしでデプロイ可能

@[card](https://www.cloudflare.com/ja-jp/developer-platform/products/pages/)
@[card](https://zenn.dev/rivine/articles/2023-06-23-deploy-hugo-to-cloudflare-pages)

#### なぜ Supabase？

- PostgreSQL をそのまま使える: 独自拡張なしの素の PostgreSQL
- 無料枠が実用的: 500MB のストレージ、無制限の API リクエスト
- 接続プーリング対応: IPv4/IPv6 両方に対応

@[card](https://supabase.com/)
@[card](https://zenn.dev/kibe/articles/7a1dfc9bbd681c)


### それぞれ使用した技術についての深掘り

#### FastAPI + SQLModel

FastAPI は Python の高速な Web フレームワークで、型ヒントを活用した自動ドキュメント生成が魅力です。

```python
from fastapi import FastAPI
from sqlmodel import SQLModel, Field

class GPU(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    model: str | None = None
    memory_gb: float | None = None

app = FastAPI()

@app.get("/api/gpus")
def get_gpus():
    # DBからGPU一覧を取得
    ...
```

SQLModel は SQLAlchemy と Pydantic を統合したライブラリで、**1 つのクラス定義で DB モデルと API スキーマを兼用**できます。

#### uv によるパッケージ管理

uv は Rust 製の高速な Python パッケージマネージャーです。

```bash
uv sync
# スクリプトの実行
uv run main.py
```

`pyproject.toml` と `uv.lock` で依存関係を管理し、再現性のある環境を構築できます。

#### React + Vite

Vite は次世代のフロントエンドビルドツールで、開発時の HMR（Hot Module Replacement）が非常に高速です。

```jsx
// ReservationForm.jsx
const handleSubmit = async (e) => {
  e.preventDefault();
  await createReservation({
    gpu_id: selectedGpu,
    user: user,
    start_time: startTime,
    end_time: endTime,
  });
};
```


### ハマったポイント

ここからが本題です。デプロイ作業で遭遇したエラーとその解決策をまとめます。

#### 1. ルートディレクトリの指定忘れ

**エラー**
```
error: No `pyproject.toml` found in current directory
```

**原因**
モノレポ構成（`frontend/` と `backend/` が別フォルダ）なのに、Render がリポジトリのルートでビルドしようとしていました。

**解決策**
Render の Settings で **Root Directory** を `backend` に設定しました。

![](/images/gpu_reservation/render_root.png)

:::details 詳しい手順

1. Render を開く

2. **Settings** を開く

![](/images/gpu_reservation/root_00.png)

3. **Root Directory** を `backend` に設定する

:::

#### 2. IPv6 接続エラー

**エラー**
```
sqlalchemy.exc.OperationalError: Network is unreachable
```
（接続先が IPv6 アドレス 2406:da14:...）

**原因**
Supabase のデフォルト接続先が IPv6 でしたが、Render の一部環境では IPv6 が使えませんでした。

**解決策**
Supabase の **Connection Pooler** (ポート 6543) を使用する接続文字列に変更しました。

```diff
- postgres://user@db.xxx.supabase.co:5432/postgres
+ postgres://user@aws-0-region.pooler.supabase.com:6543/postgres
```

:::details 詳しい手順

1. Supabase を開く

2. 画面上部にある **Connect** を押す

![](/images/gpu_reservation/ipv6_00.png)

3. 赤枠の箇所を押す

![](/images/gpu_reservation/ipv6_01.png)

4. **Transaction pooler** を選択する

![](/images/gpu_reservation/ipv6_02.png)

5. 赤枠の値をコピーする

![](/images/gpu_reservation/ipv6_03.png)

6. Render を開く

7. 画面左部にある **Environment** を開く

![](/images/gpu_reservation/ipv6_04.png)

8. 赤枠の箇所に 5 でコピーした値を貼り付ける

![](/images/gpu_reservation/ipv6_05.png)

9. Save する

:::

#### 3. API パスの不一致

**エラー**
フロントエンドからのリクエストがすべて 404 になる。

**原因**
フロントエンドは `/gpus` にアクセスしていたが、バックエンドは `/api/gpus` で待っていました。

**解決策**
フロントエンドの `api.js` で、APIベースURLに /api を付与するように修正しました。

```javascript
const API_URL = import.meta.env.VITE_API_URL || '';
const API_BASE = `${API_URL}/api`;  // ← /api を追加
```

#### 4. `render.yaml` が無視される

**現象**
`render.yaml` で設定を変更しても反映されない。

**原因**
Render で「Web Service」を手動作成した場合、`render.yaml` は無視されます（Blueprint 機能専用）

**解決策**
Render ダッシュボードの Settings から Start Command を直接編集しました。

```bash
uv run python -m app.seed && uv run main.py
```

:::details 詳しい手順

1. Render を開く

2. **Settings** を開く

![](/images/gpu_reservation/root_00.png)

3. **Build & Deploy** セクションにある **Start Command** を以下のようにする

![](/images/gpu_reservation/render_yaml.png)

:::

#### 5. 無料プランのスリープ問題

**現象**
15分間アクセスがないとサーバーがスリープし、次のアクセス時に約1分待たされる。

**解決策（回避策）**
- **UptimeRobot** などの無料監視サービスで5分おきにアクセスさせる
- 「仕様」として受け入れる


---


### まとめ
今回、完全無料で GPU 予約システムを構築・デプロイしました。

学んだこと
1. モノレポ構成ではホスティングサービスの Root Directory 設定が重要
2. クラウドサービス間の接続には IPv4/IPv6 の互換性に注意
3. 無料プランには制限があるが、工夫次第で実用的なシステムが作れる

改善したい点
1. コールドスタート対策（現状は最大1分待ち）
2. 認証機能の追加
3. GPU 使用率の可視化（NVIDIA SMI連携）

無料でここまでできるのは良い時代ですね。ぜひ参考にしてみてください！

参考
- https://zenn.dev/kibe/articles/7a1dfc9bbd681c
- https://zenn.dev/rivine/articles/2023-06-23-deploy-hugo-to-cloudflare-pages
FastAPI 公式ドキュメント
SQLModel 公式ドキュメント
Vite 公式ドキュメント
Cloudflare Pages ドキュメント
Render ドキュメント
Supabase ドキュメント
uv - Python パッケージマネージャー
