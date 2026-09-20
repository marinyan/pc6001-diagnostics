# 検証

Node.js 22以降、sjasmplus 1.24.0でビルドする。
Windows PowerShellでは必要に応じて以下を設定する。

```powershell
$env:SJASMPLUS='C:\path\to\sjasmplus.exe'
npm run build
npm test
```

srcの3つのASMはP60GUEから切り出した診断の固定版。
ゲーム、ローダーソース、ROMを参照せずに再ビルドできる。
フォントは同梱ASCII BDFから生成する。

## Champon8の任意試験

エミュレータ・互換ROM・セッションは各自で準備し、このリポジトリには含めない。
初期状態のpc6001mk2/N60m、ハンドルprogue-p6-tapeを使用する。
テストはsession.jsonの接続先と認証情報を読む。セッションファイルを公開しない。

```text
node tests/champon.mjs path/to/session.json
node tests/champon.mjs path/to/session.json --ports
node tests/champon.mjs path/to/session.json --f3
```

各コマンドは別のコールドブートしたインスタンスで実行する。
通常のキー入力でモード5・3ページ→CLOAD→RUN→EXECを操作する。
読み込まれたRAMの機械語、表示番号、タイトルRAM、印の反転を確認する。
各試験間はコピー完了時のチェックポイントへ戻す。
これはChampon8のmkIIモデルでの回帰試験で、SRのウェイト再現を検証するものではない。
