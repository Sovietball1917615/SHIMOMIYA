# SHIMOMIYA

ビルド不要でXREAなどの静的ホスティングへ配置できる動画コミュニティのフロントエンドです。動画投稿・保存にはSupabaseプロジェクトが必要です。

## Supabaseの初期設定

1. Supabaseでプロジェクトを作成し、Project URLと公開用のanon / publishable keyを確認します。`service_role` keyは絶対にブラウザーへ置かないでください。
2. SupabaseのSQL Editorで [`supabase/schema.sql`](supabase/schema.sql) を実行します。`videos`・`profiles`テーブル、RLSポリシー、100MB上限の公開動画Storage bucketを作成します。プロフィール機能を追加した後に更新した場合も、同じSQLを再実行して不足しているテーブルとポリシーを追加してください。
3. AuthenticationのURL Configurationで公開サイトのURLをSite URLおよびRedirect URLsに登録します。メール確認を有効にする場合は、ユーザーに確認メールが届くようメール設定も行ってください。
4. `supabase-config.js`の`url`と`anonKey`にProject URLとanon / publishable keyを設定します。anon keyはブラウザーに公開される前提のキーです。データ保護はSQLのRLSポリシーで行われます。

```js
window.SHIMOMIYA_SUPABASE_CONFIG = {
  url: "https://YOUR_PROJECT.supabase.co",
  anonKey: "YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY",
};
```

## 公開

`index.html`、`styles.css`、`app.js`、設定済みの`supabase-config.js`、`assets`フォルダーを、XREAのドキュメントルート（または他の静的ホスティングの公開ルート）に階層を保って配置します。HTTPSで公開してください。SQLファイルと`.git`などの開発用ファイルは公開ルートへ置く必要はありません。

## 実装範囲と制限

- Supabase Authのメールアドレス・パスワードで新規登録とログインを行います。
- ログインしたユーザーはMP4/WebM/MOVの動画を最大100MBまでアップロードできます。動画本体はStorage、タイトル・説明・カテゴリー・保存先はPostgresに保存され、一覧から再生できます。
- ログインユーザーはヘッダーのプロフィールアイコンから表示名と自己紹介を編集できます。公開プロフィールの表示名は投稿動画一覧にも反映されます。
- 匿名ユーザーは公開済み動画を閲覧できます。投稿・更新・削除の権限はRLSで投稿者自身に制限されます。
- Storage bucketは公開設定です。アップロードされた動画URLは、ログインしていない訪問者にも閲覧可能です。
- 動画一覧はSupabaseに保存された投稿だけを表示し、サンプル動画はありません。Supabaseの設定が空の場合は空の一覧が表示されます。
- 独自プレイヤーは再生・一時停止、シーク、音量、ミュート、全画面表示に対応します。プレイヤーの縦横比は動画ファイルの寸法から自動判定し、16:9、4:3、1:1、9:16などを表示します。
- コメントは視聴中に手動で投稿でき、画面上を流れます。自動コメントはありません。コメントといいねは現在のところSupabaseには保存されません。アップロード済み動画の削除UIも未実装です。
- ヒーロー画像、Webフォント、Supabase JS SDKは外部サービスから読み込みます。
