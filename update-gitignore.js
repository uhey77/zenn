const fs = require('fs');
const path = require('path');

const articlesDir = path.join(__dirname, 'articles');
const gitignorePath = path.join(__dirname, '.gitignore');

// 記事ファイルを読み込んで、published: falseのものを検出
function findUnpublishedArticles() {
  const files = fs.readdirSync(articlesDir);
  const unpublishedFiles = [];

  files.forEach(file => {
    if (file.endsWith('.md')) {
      const filePath = path.join(articlesDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // フロントマターからpublished: falseを検出
      if (content.match(/^published:\s*false/m)) {
        unpublishedFiles.push(`articles/${file}`);
      }
    }
  });

  return unpublishedFiles;
}

// .gitignoreを更新
function updateGitignore() {
  let gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
  const unpublishedFiles = findUnpublishedArticles();

  if (unpublishedFiles.length === 0) {
    console.log('published: falseのファイルは見つかりませんでした。');
    return;
  }

  // 既存のエントリを確認
  const lines = gitignoreContent.split('\n');
  const existingEntries = new Set(lines.map(line => line.trim()));

  // 新しいエントリを追加
  let added = false;
  unpublishedFiles.forEach(file => {
    if (!existingEntries.has(file)) {
      gitignoreContent += `\n${file}`;
      added = true;
      console.log(`追加: ${file}`);
    } else {
      console.log(`既に存在: ${file}`);
    }
  });

  if (added) {
    fs.writeFileSync(gitignorePath, gitignoreContent, 'utf-8');
    console.log('\n.gitignoreを更新しました。');
  } else {
    console.log('\n追加する新しいエントリはありませんでした。');
  }
}

updateGitignore();

