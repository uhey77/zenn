const fs = require('fs');
const path = require('path');

const articlesDir = path.join(__dirname, 'articles');
const gitignorePath = path.join(__dirname, '.gitignore');

// 記事ファイルを読み込んで、publishedの状態をチェック
function checkArticleStatus() {
  const files = fs.readdirSync(articlesDir);
  const unpublishedFiles = [];
  const publishedFiles = [];

  files.forEach(file => {
    if (file.endsWith('.md')) {
      const filePath = path.join(articlesDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const gitignorePath = `articles/${file}`;
      
      // フロントマターからpublishedの状態を検出
      if (content.match(/^published:\s*false/m)) {
        unpublishedFiles.push(gitignorePath);
      } else if (content.match(/^published:\s*true/m)) {
        publishedFiles.push(gitignorePath);
      }
    }
  });

  return { unpublishedFiles, publishedFiles };
}

// .gitignoreを更新
function updateGitignore() {
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
  const { unpublishedFiles, publishedFiles } = checkArticleStatus();

  // .gitignoreの行を分割
  const lines = gitignoreContent.split('\n');
  const newLines = [];
  const existingArticleEntries = new Set();

  // 既存の.gitignoreの内容を保持しつつ、articles/で始まるエントリを記録
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('articles/')) {
      existingArticleEntries.add(trimmed);
    } else {
      // articles/で始まらない行はそのまま保持
      newLines.push(line);
    }
  });

  // published: falseのファイルを追加
  unpublishedFiles.forEach(file => {
    newLines.push(file);
    if (!existingArticleEntries.has(file)) {
      console.log(`追加: ${file}`);
    }
  });

  // published: trueのファイルが.gitignoreに含まれている場合は削除
  publishedFiles.forEach(file => {
    if (existingArticleEntries.has(file)) {
      console.log(`削除: ${file}`);
    }
  });

  const updatedContent = newLines.join('\n');
  const hasChanged = updatedContent !== gitignoreContent;

  if (hasChanged) {
    fs.writeFileSync(gitignorePath, updatedContent, 'utf-8');
    console.log('\n.gitignoreを更新しました。');
  } else {
    console.log('\n変更はありませんでした。');
  }
}

updateGitignore();

