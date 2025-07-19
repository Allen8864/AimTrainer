#!/usr/bin/env node

/**
 * Performance Test Script
 * 
 * This script runs basic performance checks on the built application
 * to ensure it meets the requirements for smooth gameplay.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎯 3D Aim Trainer - Performance Test');
console.log('=====================================\n');

// Check if build exists
const distPath = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distPath)) {
    console.error('❌ Build not found. Please run "npm run build" first.');
    process.exit(1);
}

// Analyze bundle sizes
console.log('📦 Bundle Analysis:');
console.log('-------------------');

const distFiles = fs.readdirSync(distPath);
const assetFiles = fs.readdirSync(path.join(distPath, 'assets'));
const jsFiles = assetFiles.filter(file => file.endsWith('.js'));
const cssFiles = assetFiles.filter(file => file.endsWith('.css'));

let totalJSSize = 0;
let totalCSSSize = 0;

jsFiles.forEach(file => {
    const filePath = path.join(distPath, 'assets', file);
    const stats = fs.statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    totalJSSize += stats.size;
    console.log(`📄 ${file}: ${sizeKB} KB`);
});

cssFiles.forEach(file => {
    const filePath = path.join(distPath, 'assets', file);
    const stats = fs.statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    totalCSSSize += stats.size;
    console.log(`🎨 ${file}: ${sizeKB} KB`);
});

const totalSizeMB = ((totalJSSize + totalCSSSize) / (1024 * 1024)).toFixed(2);
console.log(`\n📊 Total Bundle Size: ${totalSizeMB} MB`);

// Performance recommendations
console.log('\n🚀 Performance Analysis:');
console.log('------------------------');

if (totalSizeMB < 1) {
    console.log('✅ Bundle size is excellent (< 1MB)');
} else if (totalSizeMB < 2) {
    console.log('✅ Bundle size is good (< 2MB)');
} else if (totalSizeMB < 5) {
    console.log('⚠️  Bundle size is acceptable (< 5MB)');
} else {
    console.log('❌ Bundle size is large (> 5MB) - consider optimization');
}

// Check for critical files
const indexHtml = path.join(distPath, 'index.html');
if (fs.existsSync(indexHtml)) {
    console.log('✅ index.html found');
} else {
    console.log('❌ index.html missing');
}

// Test loading time estimation
const estimatedLoadTime3G = (totalSizeMB * 8) / 0.4; // 400 Kbps for 3G
const estimatedLoadTime4G = (totalSizeMB * 8) / 5;   // 5 Mbps for 4G
const estimatedLoadTimeFiber = (totalSizeMB * 8) / 100; // 100 Mbps for fiber

console.log('\n⏱️  Estimated Load Times:');
console.log(`   3G (400 Kbps): ${estimatedLoadTime3G.toFixed(1)}s`);
console.log(`   4G (5 Mbps): ${estimatedLoadTime4G.toFixed(1)}s`);
console.log(`   Fiber (100 Mbps): ${estimatedLoadTimeFiber.toFixed(1)}s`);

// Performance requirements check
console.log('\n📋 Requirements Check:');
console.log('---------------------');

const requirements = [
    {
        name: 'Bundle size < 5MB',
        passed: totalSizeMB < 5,
        value: `${totalSizeMB} MB`
    },
    {
        name: 'Load time on 4G < 10s',
        passed: estimatedLoadTime4G < 10,
        value: `${estimatedLoadTime4G.toFixed(1)}s`
    },
    {
        name: 'Three.js bundle present',
        passed: jsFiles.some(file => file.includes('three')),
        value: jsFiles.find(file => file.includes('three')) || 'Not found'
    },
    {
        name: 'CSS bundle present',
        passed: cssFiles.length > 0,
        value: `${cssFiles.length} file(s)`
    }
];

let allPassed = true;
requirements.forEach(req => {
    const status = req.passed ? '✅' : '❌';
    console.log(`${status} ${req.name}: ${req.value}`);
    if (!req.passed) allPassed = false;
});

// Final result
console.log('\n🏁 Final Result:');
console.log('================');

if (allPassed) {
    console.log('✅ All performance requirements met!');
    console.log('🎯 Application is ready for deployment.');
} else {
    console.log('⚠️  Some performance requirements not met.');
    console.log('💡 Consider optimizing bundle size or assets.');
}

// Additional recommendations
console.log('\n💡 Optimization Tips:');
console.log('--------------------');
console.log('• Enable gzip compression on your server');
console.log('• Use a CDN for faster global delivery');
console.log('• Consider code splitting for larger applications');
console.log('• Optimize textures and 3D assets');
console.log('• Use browser caching for static assets');

console.log('\n🎮 Ready to aim and train!');