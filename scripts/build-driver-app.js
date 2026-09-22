const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const distDir = path.join(rootDir, 'dist_driver');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy public directories: css, js, images
const foldersToCopy = ['css', 'js', 'images'];
foldersToCopy.forEach(folder => {
  const src = path.join(publicDir, folder);
  const dest = path.join(distDir, folder);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
  }
});

// Copy driver.html as index.html and driver.html
let driverHtml = fs.readFileSync(path.join(publicDir, 'driver.html'), 'utf8');
// Ensure driver login gate is hidden by default for immediate operation
driverHtml = driverHtml.replace('id="driver-login-gate" class="driver-gate-overlay"', 'id="driver-login-gate" class="driver-gate-overlay hidden" style="display: none !important;"');
fs.writeFileSync(path.join(distDir, 'index.html'), driverHtml);
fs.writeFileSync(path.join(distDir, 'driver.html'), driverHtml);

// Copy manifest and sw if needed
if (fs.existsSync(path.join(publicDir, 'manifest.json'))) {
  fs.copyFileSync(path.join(publicDir, 'manifest.json'), path.join(distDir, 'manifest.json'));
}
if (fs.existsSync(path.join(publicDir, 'sw.js'))) {
  fs.copyFileSync(path.join(publicDir, 'sw.js'), path.join(distDir, 'sw.js'));
}

console.log('✅ Driver app web assets successfully prepared in dist_driver/');
