#!/usr/bin/env node

/**
 * Copies webview build output from packages/webviews/out to packages/extension/webviews/out
 * This is needed for production packaging where webviews must be inside the extension package
 */

const fs = require('fs');
const path = require('path');

const extensionRoot = path.resolve(__dirname, '..');
const webviewsSource = path.resolve(extensionRoot, '..', 'webviews', 'out');
const webviewsDest = path.resolve(extensionRoot, 'webviews', 'out');

console.log('Copying webviews for production...');
console.log(`Source: ${webviewsSource}`);
console.log(`Destination: ${webviewsDest}`);

// Check if source exists
if (!fs.existsSync(webviewsSource)) {
  console.error(`Error: Webviews source directory not found: ${webviewsSource}`);
  console.error('Make sure to run "pnpm build:webviews" first.');
  process.exit(1);
}

// Create destination directory if it doesn't exist
if (!fs.existsSync(path.dirname(webviewsDest))) {
  fs.mkdirSync(path.dirname(webviewsDest), { recursive: true });
}

// Remove existing destination if it exists
if (fs.existsSync(webviewsDest)) {
  fs.rmSync(webviewsDest, { recursive: true, force: true });
}

// Copy directory recursively
function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  
  if (stats.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      copyRecursive(
        path.join(src, entry),
        path.join(dest, entry)
      );
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

copyRecursive(webviewsSource, webviewsDest);

console.log('✓ Webviews copied successfully!');

