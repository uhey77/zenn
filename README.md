# Zenn CLI

### 使い方    
[📘 How to use](https://zenn.dev/zenn/articles/zenn-cli-guide) に記載してあります。

### published: falseのファイルを.gitignoreに追加

`published: false`になっている記事ファイルを自動的に`.gitignore`に追加し、`published: true`になったファイルを`.gitignore`から削除するスクリプトが用意しました。

```bash
npm run update-gitignore
```

または

```bash
node update-gitignore.js
```

このスクリプトを実行すると、`articles`ディレクトリ内のMarkdownファイルをチェックし、以下の処理を行います：

- `published: false`が設定されているファイルを`.gitignore`に自動追加
- `published: true`が設定されているファイルを`.gitignore`から自動削除
