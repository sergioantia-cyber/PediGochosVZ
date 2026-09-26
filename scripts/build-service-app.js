const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const distDir = path.join(rootDir, 'dist_service');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy public directories
const foldersToCopy = ['css', 'js', 'images'];
foldersToCopy.forEach(folder => {
  const src = path.join(publicDir, folder);
  const dest = path.join(distDir, folder);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
  }
});

// Copy service-partner.html as index.html
let serviceHtml = fs.readFileSync(path.join(publicDir, 'service-partner.html'), 'utf8');
fs.writeFileSync(path.join(distDir, 'index.html'), serviceHtml);
fs.writeFileSync(path.join(distDir, 'service-partner.html'), serviceHtml);

// Copy manifest and sw if needed
if (fs.existsSync(path.join(publicDir, 'manifest.json'))) {
  fs.copyFileSync(path.join(publicDir, 'manifest.json'), path.join(distDir, 'manifest.json'));
}
if (fs.existsSync(path.join(publicDir, 'sw.js'))) {
  fs.copyFileSync(path.join(publicDir, 'sw.js'), path.join(distDir, 'sw.js'));
}

console.log('✅ Service app web assets successfully prepared in dist_service/');
