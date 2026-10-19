const fs = require('fs');
fs.copyFileSync('manifest.json', 'dist/manifest.json');
if (fs.existsSync('icons')) {
  fs.cpSync('icons', 'dist/icons', { recursive: true });
}
console.log('Assets successfully copied to dist/');
