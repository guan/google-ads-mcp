# 環境変数セットアップガイド

## 必要な環境変数一覧

| 変数名 | 取得元 | 説明 |
|--------|--------|------|
| GOOGLE_ADS_CLIENT_ID | Google Cloud Console | OAuth クライアントID |
| GOOGLE_ADS_CLIENT_SECRET | Google Cloud Console | OAuth クライアントシークレット |
| GOOGLE_ADS_REFRESH_TOKEN | get_refresh_token.py | OAuthリフレッシュトークン |
| GOOGLE_ADS_DEVELOPER_TOKEN | Google Ads API Center | API デベロッパートークン |
| GOOGLE_ADS_LOGIN_CUSTOMER_ID | Google Ads 管理画面 | MCC アカウントID（ハイフンなし） |
| GOOGLE_ADS_CUSTOMER_ID | Google Ads 管理画面 | 広告アカウントID（ハイフンなし） |
| SESSION_SECRET | ローカル生成 | セッション署名用ランダム文字列 |

## 取得手順

### 1. GOOGLE_ADS_CLIENT_ID / GOOGLE_ADS_CLIENT_SECRET

1. [console.cloud.google.com](https://console.cloud.google.com) にアクセス
2. プロジェクトを作成（または既存を選択）
3. 「APIとサービス」→「ライブラリ」→ **Google Ads API** を有効化
4. 「APIとサービス」→「認証情報」→「認証情報を作成」→「OAuth 2.0 クライアント ID」
5. アプリケーションの種類: **デスクトップ アプリケーション**
6. 作成後に表示される **クライアントID** と **クライアントシークレット** をコピー

### 2. GOOGLE_ADS_DEVELOPER_TOKEN

1. [ads.google.com/aw/apicenter](https://ads.google.com/aw/apicenter) にアクセス（MCCアカウントでログイン）
2. 「APIセンター」にデベロッパートークンが表示される
3. 初回は「申請」が必要（テストアカウントなら承認不要でそのまま使える）

### 3. GOOGLE_ADS_REFRESH_TOKEN

1. `scripts/get_refresh_token.py` を編集:
   ```python
   CLIENT_ID = "手順1で取得したクライアントID"
   CLIENT_SECRET = "手順1で取得したクライアントシークレット"
   ```
2. 実行:
   ```bash
   python3 scripts/get_refresh_token.py
   ```
3. ブラウザが開く → Googleアカウントでログイン → 広告アクセス許可
4. ターミナルに **refresh_token** が表示される

### 4. GOOGLE_ADS_LOGIN_CUSTOMER_ID

1. [ads.google.com](https://ads.google.com) にMCCアカウントでログイン
2. 右上のアカウントIDをコピー（例: `123-456-7890`）
3. **ハイフンを除去**: `1234567890`

### 5. GOOGLE_ADS_CUSTOMER_ID

1. MCC内で分析対象の広告アカウントを選択
2. そのアカウントID（例: `987-654-3210`）をコピー
3. **ハイフンを除去**: `9876543210`

### 6. SESSION_SECRET

```bash
openssl rand -base64 32
```

## 最短手順

```
① Google Cloud Console
   → プロジェクト作成 → Google Ads API有効化 → OAuth認証情報作成
   → CLIENT_ID, CLIENT_SECRET 取得

② Google Ads API Center
   → DEVELOPER_TOKEN 取得

③ get_refresh_token.py にCLIENT_ID/SECRET入れて実行
   → REFRESH_TOKEN 取得

④ Google Ads画面
   → LOGIN_CUSTOMER_ID (MCC), CUSTOMER_ID (広告アカウント) をメモ

⑤ openssl rand -base64 32
   → SESSION_SECRET 生成

⑥ cp .env.example .env して値を埋めて完了
```
