---
title: "完全無料で GPU 予約システムを作ってデプロイした話"
emoji: "🖥️"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["React", "FastAPI", "Supabase", "CloudflarePages", "Render"]
published: true
publication_name: "transmedia_blog"
published_at: 2025-12-07 12:00
---

### はじめに

はじめまして、[TransMedia Tech Lab](https://www.transmedia-tech-lab.jp/) に所属している B4 の山田 祐平です。

研究室で GPU サーバーを複数人で共有していると、こんな問題が起きがちです。

- 「今誰が GPU 使ってる？」が分からない
- Slack で毎回「今日の 15 時から GPU 使います！」と宣言するのが面倒
- 予約がかぶって学習ジョブが落ちる悲劇

そこで、**GPU の予約状況を可視化し、Webから簡単に予約できるシステム**を作ることにしました。
また、研究室の予算は限られているため、**完全無料**で運用できることを目指しました。

実際の画面は以下のようになっています。

![](/images/gpu_reservation/complete.png)


### システム構成図

今回構築したシステムの全体像です。

![](/images/gpu_reservation/infra.png)

- **フロントエンド (React)**: [Cloudflare Pages](https://www.cloudflare.com/ja-jp/developer-platform/products/pages/) でホスティング（画面の表示）
- **バックエンド (FastAPI)**: [Render.com](https://render.com/) でホスティング（データの処理）
- **データベース (PostgreSQL)**: [Supabase](https://supabase.com/) でホスティング（データの保存）

これらすべて、各サービスの無料枠（Free Tier）の範囲内で運用しています。


### 技術スタック & 技術選定

| レイヤー | 技術 | 選定理由 |
|---------|------|----------|
| フロントエンド | React + Vite | **HMR (コード保存時に自動で画面が更新される機能)**、シンプルな構成 |
| バックエンド | FastAPI + SQLModel | Python 製でシンプル、**型安全（変数の種類を明示してミスを防ぐ仕組み）** |
| データベース | PostgreSQL (Supabase) | 無料枠あり、管理が楽 |
| フロントホスティング | Cloudflare Pages | 無料、高速 CDN、デプロイが簡単 |
| バックエンドホスティング | Render.com | 無料枠あり、GitHub 連携が楽 |
| パッケージ管理 | uv | **pip より爆速**、ロックファイル対応 |

#### なぜ Vercel ではなく Cloudflare Pages？

[Vercel](https://vercel.com/home) も素晴らしいサービスですが、今回は以下の理由で Cloudflare Pages を選択しました。

- **無料枠の制限が緩い**: 商用利用の制限やビルド回数が Vercel より寛容
- **グローバル CDN（世界中にサーバーを配置して近くから配信する仕組み）**: Cloudflare の強力なネットワークで、世界中どこからでも高速に表示される
- **シンプルな設定**: 特別な設定ファイル (`vercel.json` など) なしで、Git に Push するだけでデプロイ可能

@[card](https://zenn.dev/rivine/articles/2023-06-23-deploy-hugo-to-cloudflare-pages)
@[card](https://zenn.dev/rivine/articles/2023-05-31-update-rivine-hp)
@[card](https://zenn.dev/catnose99/scraps/6780379210136f)

#### なぜ Supabase？

- **PostgreSQL をそのまま使える**: 独自拡張が少なく、他の環境への移行もしやすい「普通の PostgreSQL」として使える
- **無料枠が実用的**: 500MB のストレージは、テキスト主体の予約データなら十分すぎる
- **接続プーリング対応**: データベースへの接続を使い回して効率化する機能が標準でついており、サーバーレス環境（Render など）からの多数の接続をうまく捌いてくれる

@[card](https://zenn.dev/kibe/articles/7a1dfc9bbd681c)
@[card](https://zenn.dev/iminux/articles/2b2a2bbab15330)
@[card](https://zenn.dev/berry_blog/articles/cfce64da076878)


### 使用技術の深掘り

#### FastAPI + SQLModel

FastAPI は近年人気の Python Web フレームワークです。「型ヒント」を使うことで、コードを書くだけで自動的に仕様書 ( [Swagger UI](https://swagger.io/tools/swagger-ui/) ) が作られるのが最大の特徴です。

```python
from fastapi import FastAPI
from sqlmodel import SQLModel, Field

# データベースのテーブル定義と、APIのデータ定義をこれ1つで兼ねる！
class GPU(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    model: str | None = None
    memory_gb: float | None = None

app = FastAPI()

@app.get("/api/gpus")
def get_gpus():
    # Pythonの関数を書くだけでAPIになる
    ...
```

SQLModel を使うと、通常は「データベース用」と「API用」で2回書かないといけない定義を1つのクラスでまとめて書けます。コードの重複が減り、「片方だけ修正して、もう片方を直し忘れる」というミスを防げます。

#### uv によるパッケージ管理

uv は Rust 製の非常に高速な Python パッケージマネージャーです。
従来の `pip` や `poetry` に代わるもので、インストールの待ち時間が劇的に短くなります。

```bash
# 依存関係を一瞬でインストール
uv sync

# 仮想環境を意識せずにスクリプトを実行
uv run main.py
```

`pyproject.toml`（プロジェクトの設定ファイル）で使うライブラリを管理し、誰が実行しても同じ環境が再現できるようにしています。

#### React + Vite

Vite (ヴィート) は、フロントエンドの開発ツールです。
コードを保存した瞬間にブラウザ上の画面が更新される **HMR (Hot Module Replacement)** という機能が非常に高速で、開発のストレスが全くありません。

```jsx
// ReservationForm.jsx（予約フォームのコンポーネント）
// モダンな React の書き方でサクサク実装
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

ここからが本題です。ローカルでは動いていたのに、デプロイしようとしたら動かない...という「デプロイあるある」なエラーとその解決策をまとめます。

#### 1. ルートディレクトリの指定忘れ

**エラー**
```
error: No `pyproject.toml` found in current directory
```
（訳：設定ファイルが見つからないよ！）

**原因**
今回のプロジェクトは、1つのリポジトリの中に `frontend/` フォルダと `backend/` フォルダが入っている「モノレポ構成」でした。
しかし、Render はデフォルトでは **「一番上の階層（ルート）」** に `pyproject.toml`（Pythonの設定ファイル）があると思い込んで探してしまうため、エラーになっていました。

**解決策**
Render の Settings で **Root Directory** （作業場所）を `backend` に指定しました。
「一番上じゃなくて、`backend` フォルダの中を見てね」と教えてあげる設定です。

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
（接続先が IPv6 アドレス `2406:da14:...` になっている）

**原因**
データベースの Supabase は最新の通信規格 **IPv6** を使おうとしましたが、アプリを動かしている Render の一部のサーバーがまだ IPv6 に完全対応していませんでした。
「住所は分かってるけど、その道を通る手段がない」ような状態です。

**解決策**
Supabase には、従来の **IPv4** でも接続できるようにする **Connection Pooler** という機能があります。
これを使うための設定（ポート番号 `6543`）に変更することで、Render からも無事に接続できるようになりました。

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
フロントエンドからのリクエストがすべて `404 Not Found` になる。

**原因**
PC間での手紙のやり取りで、宛先を間違えていたようなミスです。
- フロントエンド：「`/gpus` さん、データください」
- バックエンド：「私は `/api/gpus` で待ってます（`/gpus` なんて知らないよ）」

**解決策**
フロントエンドの通信用コードである `api.js` を修正し、必ず `/api` を付けてアクセスするようにしました。

```javascript
// api.js (API通信を管理するファイル)
const API_URL = import.meta.env.VITE_API_URL || '';
const API_BASE = `${API_URL}/api`;  // ← 必ず /api を付けるように修正
```

#### 4. `render.yaml` が無視される

**現象**
設定ファイル (`render.yaml`) を書き換えてコミットしたのに、Render 上の設定が変わらない。

**原因**
Render には 2 通りの作り方があります。
1. **Blueprint**: `render.yaml`（インフラ構成を記述したファイル）で全自動管理
2. **Web Service**: 画面上でポチポチ手動設定

今回は「2. 手動設定」で作っていたため、リポジトリ内の設定ファイルは完全に無視されていました。

**解決策**
Render ダッシュボードの Settings 画面から、**Start Command** を直接編集しました。

```bash
# データ投入(seed)をしてから、アプリを起動(main)する
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
久しぶりにサイトを開くと、最初の表示に 1 分くらいかかる。

**解説**
これは Render の無料プランの**仕様（コールドスタート）**です。
15 分間誰もアクセスしないと、サーバーは節約のために「スリープモード」に入ります。
叩き起こすのに少し時間がかかるため、最初の 1 人目だけ待たされてしまいます。

**解決策（回避策）**
- **UptimeRobot** などの無料監視サービスを使って、5 分おきに自動でアクセスさせ、スリープを阻止する
- 「無料だし仕方ない」と割り切る


---


### まとめ
今回、完全無料で GPU 予約システムを構築・デプロイしました。

**学んだこと**
1. **モノレポ構成の罠**: ホスティングサービス側の「Root Directory」設定を忘れずに
2. **IPv6 の壁**: クラウドサービス間の接続では、まだ IPv4 互換設定が必要なことがある
3. **無料の力**: Cloudflare Pages や Render の無料枠を組み合わせれば、十分実用的なアプリが作れる

**今後の展望**
1. **認証機能**: 研究室のメンバーだけが使えるようにログイン機能を付ける
2. **GPU 使用率の可視化**: 単なる予約だけでなく、「今実際に動いているか」を `nvidia-smi` コマンドなどで取得して表示したい

学生エンジニアの方や、研究室の DX を進めたい方の参考になれば幸いです！
