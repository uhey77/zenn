# Zenn CLI

* [📘使い方](https://zenn.dev/zenn/articles/zenn-cli-guide)

## published: falseのファイルを.gitignoreに追加

`published: false`になっている記事ファイルを自動的に`.gitignore`に追加するスクリプトが用意しました。

```bash
npm run update-gitignore
```

または

```bash
node update-gitignore.js
```

このスクリプトを実行すると、`articles`ディレクトリ内のMarkdownファイルをチェックし、`published: false`が設定されているファイルを`.gitignore`に自動追加します。既に`.gitignore`に存在するファイルは重複して追加されません。