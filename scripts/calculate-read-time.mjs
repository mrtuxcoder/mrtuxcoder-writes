#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const contentDir = path.join(projectRoot, 'content');

export function getReadingTimeStats(rawContent) {
  if (!rawContent || !rawContent.trim()) {
    return {
      minutes: 1,
      text: '1 min read',
      wordCount: 0,
      proseWords: 0,
      codeWords: 0,
      headingsCount: 0,
      codeBlocksCount: 0,
      tablesCount: 0,
      totalSeconds: 60,
    };
  }

  // 1. Strip YAML frontmatter
  const content = rawContent.replace(/^---[\s\S]*?---\s*/, '');

  // 2. Headings (# Title, ## Section, ### Subsection)
  const headingMatches = content.match(/^#{1,6}\s+.+$/gm) || [];
  const headingsCount = headingMatches.length;

  // 3. Code blocks (fenced by ```)
  const codeBlockMatches = content.match(/```[\s\S]*?```/g) || [];
  const codeBlocksCount = codeBlockMatches.length;

  let codeWords = 0;
  for (const block of codeBlockMatches) {
    const codeBody = block.replace(/```[a-zA-Z0-9_-]*\n?/g, '').replace(/```$/, '');
    codeWords += codeBody.trim().split(/\s+/).filter(Boolean).length;
  }

  // 4. Tables
  const tableMatches = content.match(/(?:^\|.+\|$\n?)+/gm) || [];
  const tablesCount = tableMatches.length;

  // 5. Clean prose content (without corrupting math/inequality signs like `< 2 seconds`)
  const proseWithoutCode = content.replace(/```[\s\S]*?```/g, ' ');
  const cleanProse = proseWithoutCode
    .replace(/<\/?[a-zA-Z][a-zA-Z0-9]*\b[^>]*>/g, ' ')
    .replace(/!\[.*?\]\(.*?\)/g, ' ')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/[#*`_~|]/g, ' ');

  const proseWords = cleanProse.trim().split(/\s+/).filter(Boolean).length;
  const wordCount = proseWords + codeWords;

  // 6. Realistic calculation:
  // - Prose: 200 wpm
  const proseSeconds = (proseWords / 200) * 60;
  // - Code: 80 wpm
  const codeSeconds = (codeWords / 80) * 60;
  // - Headings: 6s per heading/section transition
  const headingSeconds = headingsCount * 6;
  // - Tables: 10s per table
  const tableSeconds = tablesCount * 10;

  const totalSeconds = proseSeconds + codeSeconds + headingSeconds + tableSeconds;
  const minutes = Math.max(1, Math.round(totalSeconds / 60));

  return {
    minutes,
    text: `${minutes} min read`,
    wordCount,
    proseWords,
    codeWords,
    headingsCount,
    codeBlocksCount,
    tablesCount,
    totalSeconds: Math.round(totalSeconds),
  };
}

function findMarkdownFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      results.push(...findMarkdownFiles(filePath));
    } else if (file.endsWith('.md')) {
      results.push(filePath);
    }
  }
  return results;
}

function main() {
  const targetFile = process.argv[2];
  let files = [];

  if (targetFile) {
    const resolved = path.resolve(process.cwd(), targetFile);
    if (fs.existsSync(resolved)) {
      files = [resolved];
    } else {
      console.error(`File not found: ${targetFile}`);
      process.exit(1);
    }
  } else {
    files = findMarkdownFiles(contentDir);
  }

  if (files.length === 0) {
    console.log('No Markdown files found.');
    return;
  }

  console.log('\n📊 Article Reading Time Analysis:');
  console.log('═'.repeat(90));
  console.log(
    'File'.padEnd(28) +
    'Prose'.padStart(8) +
    'Code'.padStart(8) +
    'Headings'.padStart(10) +
    'CodeBlk'.padStart(9) +
    'Tables'.padStart(8) +
    'Time (sec)'.padStart(11) +
    'Calculated Read Time'.padStart(22)
  );
  console.log('─'.repeat(90));

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const stats = getReadingTimeStats(content);
    const relName = path.relative(contentDir, file);

    console.log(
      relName.padEnd(28) +
      String(stats.proseWords).padStart(8) +
      String(stats.codeWords).padStart(8) +
      String(stats.headingsCount).padStart(10) +
      String(stats.codeBlocksCount).padStart(9) +
      String(stats.tablesCount).padStart(8) +
      `${stats.totalSeconds}s`.padStart(11) +
      `  ✨ ${stats.text}`.padStart(20)
    );
  }
  console.log('═'.repeat(90) + '\n');
}

main();
