# PC-6001 Diagnostics

PC-6001mkII / PC-6601 / SR互換モードの実機動作を比較する診断ツールです。
現在は **PC-6601SRのモード5で、F3への書き込み後に表示が消える問題**を調べています。
原因は未確定。実機の観察とエミュレータの実装調査は分けて記録しています。

## 実機で試す

**最初はF3診断 V3を使ってください。** PC-6001初代向けではありません。

- [F3診断WAVをダウンロード（約5.7MB・59.15秒）](https://github.com/marinyan/pc6001-diagnostics/raw/main/dist/p60gue-sr-f3.wav)
- [テスト番号・実行コマンド一覧](docs/running.md)
- [実機結果を報告する](https://github.com/marinyan/pc6001-diagnostics/issues/new?template=hardware.yml)
- [確認済みの結果](docs/results.md)

1. リセットして **モード5・画面3ページ**を選択。
2. `CLOAD` とReturnの後、WAVを先頭から再生。名前は `SRF3V3`。
3. 読み込みが完了して入力待ちに戻ったら `RUN`。
4. コピーが終わり、9つのコマンドが表示されたら、まず `EXEC 57344`。
5. `SR F3 V3 - TEST 1` と縦の印の点滅を確認。

別のテストには **リセット→同じモードでCLOAD→RUN** をやり直し、EXECの番号を変えます。
本体ゲームのWAVは不要です。診断は点滅を繰り返すだけで、終了はリセットです。
`?FC error in 30` などが出た回はコピー未完了のため、EXECせず読み直してください。

## 診断セット

|セット|内容|WAV時間|
|---|---|---|
|[F3 V3](dist/p60gue-sr-f3.wav)|F3の9設定。現在の調査対象|59.15秒|
|[Ports V2](dist/p60gue-sr-ports.wav)|F3/F8/F2を個別比較|54.47秒|
|[初期診断](dist/p60gue-sr-diagnostic.wav)|画面・RAM・PPIを段階比較|57.36秒|

セット間でテスト番号の意味が異なります。報告にはセット名を必ず含めてください。
ファイル名はP60GUEで配布した診断との照合用に維持しています。ゲーム本体は含みません。
`dist/`にWAV・CMT・BASICリスト・機械語とSHA-256マニフェストを収録しています。

## ビルド・検証

Node.js 22以降とsjasmplus 1.24.0を使用。外部npmパッケージは不要です。
`sjasmplus`をPATHに入れるか、環境変数`SJASMPLUS`に実行ファイルのパスを設定します。

```text
npm run build
npm test
```

配布物の検証だけならNode.jsのみで `npm test` を実行できます。
テストはWAVの全バイト復号、SHA-256、BASICのDATAと機械語の一致を確認します。
エミュレータ試験の説明は [検証環境](docs/testing.md) を参照してください。

## 調査資料・ライセンス

- [F3とPC6001VXの調査記録](docs/research.md)
- 診断コード・ツール・文書：MIT。[LICENSE](LICENSE)
- フォント：美咲ゴシック第2、Num Kadoma氏。ASCII抜粋を使用。
  [配布元](https://littlelimit.net/misaki.htm) / [原文ライセンス](third_party/misaki/misaki.txt)

本体ROMやエミュレータの実行ファイルは含みません。
