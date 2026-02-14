const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

console.log('Creating package...');

// Files to exclude
const exclude = [
  '.claude',
  '.joycode',
  'node_modules',
  'create_icons.py',
  'create_png_icons.py',
  'convert_svg_to_png.js',
  'create-zip.js',
  'package.js',
  'package.json',
  'package-lock.json',
  'package.bat',
  'package.py',
  'edgerecenttab.zip',
  'edgerecenttab.tar.gz',
  'icons/README.md',
  'README.md'
];

// Directories to include recursively
const includeDirs = ['icons', '_locales'];

// Simple implementation using Node.js streams
const output = fs.createWriteStream(path.join(__dirname, 'edgerecenttab.zip'));
const archive = require('archiver')('zip', { zlib: { level: 9 } });

archive.on('error', (err) => {
  console.error('Archiver error:', err);
  if (fs.existsSync(path.join(__dirname, 'edgerecenttab.zip'))) {
    fs.unlinkSync(path.join(__dirname, 'edgerecenttab.zip'));
  }
});

output.on('close', () => {
  console.log('Package created: edgerecenttab.zip');
});

// Add files
fs.readdirSync(__dirname).forEach(file => {
  const filePath = path.join(__dirname, file);

  // Skip excluded files and directories
  if (exclude.includes(file)) {
    return;
  }

  const stat = fs.statSync(filePath);

  if (stat.isFile()) {
    console.log(`Adding: ${file}`);
    archive.file(filePath, { name: file });
  } else if (stat.isDirectory() && includeDirs.includes(file)) {
    // Add files from included directories recursively
    function addDirectoryRecursive(dirPath, relativePath) {
      fs.readdirSync(dirPath).forEach(dirFile => {
        const fullPath = path.join(dirPath, dirFile);
        const relativeFile = path.join(relativePath, dirFile);
        const stat = fs.statSync(fullPath);

        if (stat.isFile()) {
          if (!exclude.some(ex => relativeFile.includes(ex) || ex.includes(relativeFile))) {
            console.log(`Adding: ${relativeFile}`);
            archive.file(fullPath, { name: relativeFile });
          }
        } else if (stat.isDirectory()) {
          addDirectoryRecursive(fullPath, relativeFile);
        }
      });
    }
    addDirectoryRecursive(filePath, file);
  }
});

archive.pipe(output);
archive.finalize();
