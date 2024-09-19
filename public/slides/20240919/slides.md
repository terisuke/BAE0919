---
marp: true
theme: dark
header: "toB向け AIアプリ開発のススメ"
footer: "Cor.Inc."
headingDivider: 1
paginate: true
size: 16:9
math: katex
---

#

![bg left](./images/tsumugi.jpg)

<div align="center">
  <h2 style="font-size: 60px; font-weight: bold;">
  toB向け</h2>
  <h2 style="font-size: 60px; font-weight: bold;">
  AIアプリ開発の</h2>
  <h2 style="font-size: 60px; font-weight: bold;">
  ススメ</h2>
  <h4>presented by テリスケ</h4>

  ![width:150px](./images/profile.png)
</div>



# 

![bg](./images/apple.png)


# なぜ流行らなかったのか？

- チャットではなく、会話できる AI が欲しい
- 自分から話しかけないと会話が成立しない
- 相手の顔や表情が見えないと人間らしさが感じられないから話が続かない
- 会話は途中であらぬ方向に進むことがあるから、会話に一貫性が欲しい
  ![width:350px height:200px](./images/vpal.webp)![width:350px height:200px](./images/meena.png)![width:350px height:200px](./images/talkingai.webp)

#### 結論/表情豊かで話に一貫性のある会話できる AI じゃないと流行らない！

# フロントに ChatVRM を採用しよう！

- Vrm という 3D モデルを使用してキャラクターを作ることができる
- Vroid で作った VRM モデルを使って、表情豊かな会話ができる
- フロントエンドから設定の変更ができる
- VRM なら以前使ったことがあるので、カスタムも簡単だった
  ![width:350px height:250px](./images/ChatVRM.png)![width:350px height:250px](./images/ogp.png)![width:350px height:250px](./images/IMG_0773.PNG)

# nike ちゃんの「AITuber」がすごい！

- 現在も週 1 で更新している
- Youtube 配信に対応しており、その他機能も豊富
- 会話継続モードなど、会話を続ける工夫がされている
- ただ、環境構築は初心者には難しい
  ![width:350px height:250px](./images/aituber.jpg) ![width:250px height:250px](./images/aituberqr.png) ![width:500px height:250px](./images/DDA2CA17-F825-4810-A558-C30A3484C2ED_1_105_c.jpeg)

#

![bg](./images/スクリーンショット%202024-08-30%2016.01.47.png)

# なぜか使ってもらえない・・・

- やっぱりこちらから話さないといけないので、話が続かない
- 自分の呼び方を変える機能が欲しい
- 外国語対応もしてほしい
- google ログイン以外も対応して欲しい

  ![center width:500px](./images/スクリーンショット%202024-08-30%2016.13.59.png)

# 改善点

- ログインしたら話しかけてくれる機能追加
- 2 分間話しかけないと自動で話しかけてくれる機能追加(オプション)
- 5 つの表情の表示時間を調整、自然な表情変化を実現
- ボタンひとつでキャラクターを変更可能に！
- プロンプトもインターフェースも音声も、多言語対応
  ![width:400px height:250px](./images/135E42F1-230A-4B3B-9FE7-49DADACE0DC0_1_105_c.jpeg)![width:400px height:250px](./images/スクリーンショット%202024-08-30%2016.26.24.png)![width:250px height:250px](./images/スクリーンショット%202024-08-30%2016.37.56.png)

# 今後

- リファクタリング(Now)
- Dify との連携(Now)
- しばらく会話がないと画面から退場するモーション(来週)
- OpenAIAPI→Llama などローカル AI への乗り換え(9 月)
- モバイルアプリ化(11 月)
- **プロンプトやキャラデザ、キャラ設定の自動修正システム(10~11 月?)**

### 理想の AI パートナーへの旅はまだまだ続く・・・

# おしまい！

- AIPartner はこちらから！
  ![width:150px](./images/aipartnerqr.png)
- 今回の全自動プレゼンテーションはこちらから！
  ![width:150px](./images/marpQiita.png)

![bg right](./images/tumugi2.webp)
