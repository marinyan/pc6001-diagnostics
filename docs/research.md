# SRのF3設定に関する調査（2026-09-20）

## 結論と未確定事項

実機では基準診断が表示され、F3=E7を追加するとEXEC後に黒画面になる。
別のプログラムでもE6で同様の症状が出たとの報告がある。
まだCPU停止そのものや原因ビットを測定したわけではない。

公開資料・実装を調べた範囲では、SRでE6/E7が禁止値という根拠は得られなかった。
一方、エミュレータが動くことをもって実機のウェイト問題を否定できない理由が見つかった。
特にPC6001VXではROM/RAMウェイト変更が元のメモリブロックへ届かない実装になっている。
これはエミュレータ側の静的解析結果であって、SR実機の停止原因を証明するものではない。

## 互換ROM

対象はbasic66-v053。同梱systemrom1.asmはSRから互換動作に移るためのコードで、
60h–6Fhのマッピング、FA/FBの割込み制御、B8h–BFhのベクタ、C8=FD、C1=07を設定してRST 00hする。
basicrom.asmのIOTBLF0ではF3=C2。COLDのF0LPがOUTIでF0～F8の表を実際に出力する。
表だけの未使用定数ではないことも確認した。

E7とC2の差は25h（bit5、bit2、bit0）、E6とC2の差は24h（bit5、bit2）。
このROM作者のビット解釈では、E6/E7はC2よりRAMウェイトを有効化し、タイマ割込みを止める。
E7はさらにサブCPU割込みを止める。純正ROMのF3初期値は未確認。

- [互換BASIC配布元](https://000.la.coocan.jp/p6/basic66.html)
- ローカル: research/PC6001VX/compatible_rom/basic66-v053/src/basicrom.asm:685、COLD:5213付近
- ローカル: 同ディレクトリ/systemrom1.asm

## PC6001VXの実装

調査したローカルのコミットは bcecd94e83725f7dbf90e94c4ec2d38e63ef3bf5。
2026-09-20に公開masterのmemory.cppとmemblk.hも取得し、下記の値コピー処理が同じことを確認した。

1. SRのF3出力はIRQ側とMEM側の両方に接続される（p6vm.cpp:1321、1364）。
2. IRQ64のF3処理は互換モードで下位5bitを扱う。SRモードでは従来の割込み設定を無効にする
   （intr.cpp:434、523）。これはモード5でF3全体を無視する実装ではない。
3. MEM64はMEM62を継承し、F3出力からMEM62::SetWaitを呼ぶ。
4. SetWaitはbit7をM1Waitに直接代入する。MEM64::Fetchはこの値を実際に加算する。
5. しかしbit6/bit5の設定では、IRom/IRam/EMemの要素をローカルの
   `std::vector<MemBlock>`へ値コピーし、そのコピーにSetWaitを呼ぶ。
6. MemBlockのWaitは普通のintメンバー。SetWaitはそのメンバーに代入するだけで、
   コピー元へ反映する共有状態や独自コピー処理はない。RAMデータへのポインタを共有してもWaitは共有しない。
7. 実際のメモリアクセスは元のブロックを参照するため、この経路でROM/RAMウェイト値は更新されない。

したがって、このソースのPC6001VXでE7とC7（またはE6とC6）を比較しても、
bit5によるRAMアクセスウェイト差を正しく検証できない。実行ファイルでの再現試験はまだ行っていない。
MEM64::InF3Hはメモリ側でFFを返すので、IN F3をそのまま完全な設定値の保存に使う案も避ける。
割込み側も同じポートの読み出しに参加するため、CPUが読む合成値をFFと断定してはいけない。

- [memory.cpp](https://github.com/eighttails/PC6001VX/blob/bcecd94e83725f7dbf90e94c4ec2d38e63ef3bf5/src/memory.cpp#L1186)
- [memblk.h](https://github.com/eighttails/PC6001VX/blob/bcecd94e83725f7dbf90e94c4ec2d38e63ef3bf5/src/memblk.h#L87)
- [memblk.cpp](https://github.com/eighttails/PC6001VX/blob/bcecd94e83725f7dbf90e94c4ec2d38e63ef3bf5/src/memblk.cpp#L353)
- [intr.cpp](https://github.com/eighttails/PC6001VX/blob/bcecd94e83725f7dbf90e94c4ec2d38e63ef3bf5/src/intr.cpp#L434)

## MAMEと実機回路図

MAME pc6001.cppはwaitstatesの実装をTODOに挙げている。
F3ハンドラmk2_0xf3_wはタイマ割込みマスクだけを変更している。
こちらもウェイト起因の問題の否定材料にはならない。

- [MAMEのソース](https://github.com/mamedev/mame/blob/master/src/mame/nec/pc6001.cpp)

えすび氏公開のPC-6601SRメモリ/I/O制御とCPU回路図を取得して目視確認。
PCZ80-09メモリコントローラ、PCZ80-10 I/Oコントローラの接続は追えるが、
カスタムLSI内部のF3レジスタ論理までは描かれておらず、E6/E7での停止を説明するには不足する。

- [公開ページ](https://sbeach.seesaa.net/category/22105308-1.html)
- [メモリ/I/O制御図](https://sbeach.up.seesaa.net/image/140131_02_pc6601SR_memiocnt.PNG)
- [CPU回路図](https://sbeach.up.seesaa.net/image/140131_02_pc6601SR_cpu_extend.PNG)

## 次に比較すべき条件

配布済みV3の00/20/40/80/E0/E7/E6は大枠の切り分けになる。
さらに原因候補のRAMウェイトだけを比較するならE7対C7、E6対C6が有用。
bit2（タイマ停止）だけの比較はC2対C6。
これらは候補であり、まだ動作確認済みの修正値ではない。
元の診断にC6/C7は入っていない。今回の調査ではゲームや診断WAVを変更していない。
