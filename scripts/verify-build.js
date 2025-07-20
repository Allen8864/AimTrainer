#!/usr/bin/env node

/**
 * Build verification script for Vercel deployment
 * Checks that all required assets are present and properly optimized
 */

import { readFileSync, existsSync, statSync, readdirSync } from 'fs';
import { join } from 'path';

const DIST_DIR = 'dist';
const REQUIRED_FILES = [
  'index.html',
  'crosshair.svg',
  'favicon.svg',
  'site.webmanifest'
];

const REQUIRED_ASSET_PATTERNS = [
  /index-[a-zA-Z0-9-]+\.js$/,
  /index-[a-zA-Z0-9-]+\.css$/,
  /three-[a-zA-Z0-9-]+\.js$/,
  /managers-[a-zA-Z0-9]+\.js$/
];

function checkFileExists(filePath) {
  const fullPath = join(DIST_DIR, filePath);
  if (!existsSync(fullPath)) {
    throw new Error(`Required file missing: ${filePath}`);
  }
  console.log(`✓ Found: ${filePath}`);
  return fullPath;
}

function checkAssetPatterns() {
  const assetsDir = join(DIST_DIR, 'assets');
  if (!existsSync(assetsDir)) {
    throw new Error('Assets directory missing');
  }

  const files = readdirSync(assetsDir);
  
  for (const pattern of REQUIRED_ASSET_PATTERNS) {
    const found = files.some(file => pattern.test(file));
    if (!found) {
      throw new Error(`No file matching pattern: ${pattern}`);
    }
    const matchingFile = files.find(file => pattern.test(file));
    console.log(`✓ Found asset: ${matchingFile}`);
  }
}

function checkFileSize(filePath, maxSizeKB) {
  const stats = statSync(filePath);
  const sizeKB = stats.size / 1024;
  
  if (sizeKB > maxSizeKB) {
    console.warn(`⚠ Warning: ${filePath} is ${sizeKB.toFixed(2)}KB (max recommended: ${maxSizeKB}KB)`);
  } else {
    console.log(`✓ Size OK: ${filePath} (${sizeKB.toFixed(2)}KB)`);
  }
}

function checkHtmlOptimization(htmlPath) {
  const content = readFileSync(htmlPath, 'utf-8');
  
  // Check for essential meta tags
  const checks = [
    { pattern: /<meta name="viewport"/, name: 'viewport meta tag' },
    { pattern: /<meta name="description"/, name: 'description meta tag' },
    { pattern: /crossorigin/, name: 'crossorigin attributes' },
    { pattern: /modulepreload/, name: 'module preloading' }
  ];
  
  for (const check of checks) {
    if (check.pattern.test(content)) {
      console.log(`✓ HTML optimization: ${check.name}`);
    } else {
      console.warn(`⚠ Missing HTML optimization: ${check.name}`);
    }
  }
}

async function main() {
  try {
    console.log('🔍 Verifying build output...\n');
    
    // Check required files
    console.log('📁 Checking required files:');
    for (const file of REQUIRED_FILES) {
      checkFileExists(file);
    }
    
    // Check asset patterns
    console.log('\n📦 Checking asset files:');
    checkAssetPatterns();
    
    // Check file sizes
    console.log('\n📏 Checking file sizes:');
    const htmlPath = checkFileExists('index.html');
    checkFileSize(htmlPath, 10); // 10KB max for HTML
    
    // Check HTML optimizations
    console.log('\n🔧 Checking HTML optimizations:');
    checkHtmlOptimization(htmlPath);
    
    console.log('\n✅ Build verification completed successfully!');
    console.log('🚀 Ready for Vercel deployment');
    
  } catch (error) {
    console.error('\n❌ Build verification failed:');
    console.error(error.message);
    process.exit(1);
  }
}

main();