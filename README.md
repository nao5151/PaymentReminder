# PaymentReminder

gas

https://github.com/google/clasp

## push環境構築

cloneすると.clasp.jsonファイルができます。

```
# https://github.com/google/clasp#clone
npx clasp clone xxxx
```

```.clasp.json
{
  "scriptId": "xxxxxxxxxx",
}
```

.clasp.jsonファイルを環境に合わせて修正します。

```.clasp.json
{
  "scriptId": "xxxxxxxxxx",
  "rootDir": "dist/"
}
```

これでpush環境構築完了です。
```
npm run push
```

※ ブラウザでスクリプトエディタを開いていると、pushしても更新されないことがありそうです。
※ push後はconfig.jsが空になるので再設定します。