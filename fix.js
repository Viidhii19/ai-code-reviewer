const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();

// 1. sync-from-backend.js
const syncFile = path.join(repoRoot, 'github-action/scripts/sync-from-backend.js');
let syncContent = fs.readFileSync(syncFile, 'utf8');
syncContent = syncContent.replace(
  "{ src: 'backend/utils/diffParser.js', dest: 'github-action/utils/diffParser.js' },\n]",
  "{ src: 'backend/utils/diffParser.js', dest: 'github-action/utils/diffParser.js' },\n  { src: 'shared-safety-config.json', dest: 'github-action/shared-safety-config.json' },\n]"
);
syncContent = syncContent.replace(
  "{ src: 'backend/utils/diffParser.js', dest: 'github-action/utils/diffParser.js' },\r\n]",
  "{ src: 'backend/utils/diffParser.js', dest: 'github-action/utils/diffParser.js' },\r\n  { src: 'shared-safety-config.json', dest: 'github-action/shared-safety-config.json' },\r\n]"
);
fs.writeFileSync(syncFile, syncContent);
console.log('Fixed sync-from-backend.js');

// 2. tests/actionUtils.test.js -> globToRegex.test.js
const testFile = path.join(repoRoot, 'github-action/tests/actionUtils.test.js');
let testContent = fs.readFileSync(testFile, 'utf8');
testContent = testContent.replace(
  "import { globToRegex, cleanAndParseJSON } from '../utils/actionUtils.js';",
  "import { globToRegex } from '../utils/globToRegex.js';"
);
const cleanParseStart = testContent.indexOf('// ---------------------------------------------------------------------------\r\n// cleanAndParseJSON');
if (cleanParseStart === -1) {
  const cleanParseStart2 = testContent.indexOf('// ---------------------------------------------------------------------------\n// cleanAndParseJSON');
  if (cleanParseStart2 !== -1) {
    testContent = testContent.substring(0, cleanParseStart2);
  }
} else {
  testContent = testContent.substring(0, cleanParseStart);
}
fs.writeFileSync(testFile, testContent.trim() + '\n');
fs.renameSync(testFile, path.join(repoRoot, 'github-action/tests/globToRegex.test.js'));
console.log('Fixed globToRegex.test.js');

// 3. index.js
const indexFile = path.join(repoRoot, 'github-action/index.js');
let indexContent = fs.readFileSync(indexFile, 'utf8');

// replace imports and DANGEROUS_PHRASES
const importReplace = "import { readFileSync } from 'node:fs';\nimport { dirname, resolve } from 'node:path';\nimport { fileURLToPath } from 'node:url';\n\nconst __filename = fileURLToPath(import.meta.url);\nconst __dirname = dirname(__filename);\nconst safetyConfigPath = resolve(__dirname, 'shared-safety-config.json');\nconst safetyConfig = JSON.parse(readFileSync(safetyConfigPath, 'utf8'));\nconst DANGEROUS_PHRASES = safetyConfig.dangerous_phrases;";

indexContent = indexContent.replace(
  /\/\/\s*Keep in sync with shared-safety-config\.json[\s\S]*?const DANGEROUS_PHRASES = \[[\s\S]*?\];/,
  importReplace
);

// dedup fix
indexContent = indexContent.replace(
  /const alreadyFlagged = commentsToPost\.some\(c => c\.path === file\.path && c\.line === issue\.line\);\s*if \(!alreadyFlagged\) \{\s*commentsToPost\.push\(\{\s*path: file\.path,\s*line: issue\.line,\s*body: `<!-- RepoSage Review Comment -->\\n\$\{issue\.comment\}`\s*\}\);\s*\}/,
  "const bodyText = `<!-- RepoSage Review Comment -->\\n${issue.comment}`;\n              const alreadyFlagged = commentsToPost.some(c => c.path === file.path && c.line === issue.line && c.body === bodyText);\n              if (!alreadyFlagged) {\n                commentsToPost.push({\n                  path: file.path,\n                  line: issue.line,\n                  body: bodyText\n                });\n              }"
);

// end of file logic
indexContent = indexContent.replace(
  /\} else if \(reviewedFilesCount > 0 && successfulReviewsCount > 0 && failedReviewsCount === 0\) \{[\s\S]*?\} else \{\s*core\.setFailed\([\s\S]*?\);\s*return;\s*\}/,
  `} else if (reviewedFilesCount > 0 && successfulReviewsCount > 0) {
      console.log('🎉 No code issues or recommendations found in successful reviews. Posting review status...');

      const reviewEvent = (autoApprove && failedReviewsCount === 0) ? 'APPROVE' : 'COMMENT';
      const issuesText = failedReviewsCount === 0 
        ? \`🎉 Outstanding work! I have scanned the PR and found **0 issues**. Your changes look pristine, clean, and optimized! Approved! 🚀\`
        : \`⚠️ I have scanned **\${successfulReviewsCount}** files and found **0 issues** in them. However, **\${failedReviewsCount}** files could not be reviewed due to errors.\`;
        
      await octokit.rest.pulls.createReview({
        owner,
        repo,
        pull_number: pullNumber,
        event: reviewEvent,
        body: \`## 🛡️ RepoSage AI Code Review Audit Completed!\n\n🧐 **I have professionally reviewed and checked all your changes** to ensure they meet our project's high quality standards.\n\n\${issuesText}\n\n---\n⭐ **Support RepoSage!** If you find this AI helpful, please consider giving us a **Star** 🌟 on GitHub! Your support helps us win GSSoC '26 and grow professionally!\`
      });

      if (autoApprove && failedReviewsCount === 0) {
        try {
          await octokit.rest.issues.addLabels({
            owner,
            repo,
            issue_number: pullNumber,
            labels: ['gssoc:approved']
          });
          console.log('✅ Added gssoc:approved label to PR');
        } catch (err) {
          console.warn('⚠️ Could not add gssoc:approved label:', err.message);
        }
      }
    }

    if (failedReviewsCount > 0) {
      core.setFailed(
        \`Review incomplete: \${successfulReviewsCount} file review(s) succeeded and \${failedReviewsCount} failed.\`
      );
      return;
    }`
);

fs.writeFileSync(indexFile, indexContent);
console.log('Fixed index.js');

// 4. Delete actionUtils.js
const actionUtilsPath = path.join(repoRoot, 'github-action/utils/actionUtils.js');
if (fs.existsSync(actionUtilsPath)) {
  fs.unlinkSync(actionUtilsPath);
  console.log('Deleted actionUtils.js');
}
