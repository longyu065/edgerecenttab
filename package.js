const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Files to include
const files = [
  'manifest.json',
  'background.js',
  'float.js',
  'float.css',
  'history.html',
  'history.css',
  'history.js',
  'popup.html',
  'popup.css',
  'popup.js',
  'icons/icon.svg',
  'README.md'
];

console.log('Creating package...');
console.log('Files to include:', files);

// Try using PowerShell Compress-Archive
try {
  const filesParam = files.map(f => `-Path "${path.join(__dirname, f)}"`).join(' ');
  const psCommand = `Compress-Archive -Path "${path.join(__dirname, 'edgerecenttab.zip')}" ${filesParam} -CompressionLevel Optimal`;
  execSync(psCommand, { shell: 'powershell.exe', stdio: 'inherit' });
  console.log('Package created: edgerecenttab.zip');
} catch (e) {
  console.error('Error creating package:', e.message || e);
  console.log('If error persists, try manually creating the zip.');
}
