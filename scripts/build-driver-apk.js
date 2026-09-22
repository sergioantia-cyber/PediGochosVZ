const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');

console.log('🚀 [1/5] Preparando archivos web para PediGochos Repartidor...');
execSync('node scripts/build-driver-app.js', { stdio: 'inherit', cwd: rootDir });

console.log('⚙️ [2/5] Configurando Capacitor para PediGochos Repartidor...');
fs.copyFileSync(
  path.join(rootDir, 'capacitor.driver.json'),
  path.join(rootDir, 'capacitor.config.json')
);

// Update strings.xml
const stringsXmlPath = path.join(rootDir, 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml');
if (fs.existsSync(stringsXmlPath)) {
  const stringsContent = `<?xml version='1.0' encoding='utf-8'?>
<resources>
    <string name="app_name">PediGochos Repartidor</string>
    <string name="title_activity_main">PediGochos Repartidor</string>
    <string name="package_name">com.pedigochos.driver</string>
    <string name="custom_url_scheme">com.pedigochos.driver</string>
</resources>
`;
  fs.writeFileSync(stringsXmlPath, stringsContent, 'utf8');
}

console.log('🔄 [3/5] Sincronizando con plataforma Android nativa...');
execSync('npx cap sync android', { stdio: 'inherit', cwd: rootDir });

console.log('🔨 [4/5] Compilando APK nativo con Gradle...');
const candidateJavas = [
  process.env.JAVA_HOME,
  'C:\\Program Files\\Android\\Android Studio\\jbr',
  'C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.12.8-hotspot',
  'C:\\Program Files\\Java\\jdk-21'
].filter(Boolean);
const javaHome = candidateJavas.find(p => fs.existsSync(p)) || 'C:\\Program Files\\Android\\Android Studio\\jbr';

const candidateAndroids = [
  process.env.ANDROID_HOME,
  path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk'),
  'C:\\Users\\DerEine\\AppData\\Local\\Android\\Sdk',
  'C:\\Users\\Owen\\AppData\\Local\\Android\\Sdk'
].filter(Boolean);
const androidHome = candidateAndroids.find(p => fs.existsSync(p)) || 'C:\\Users\\DerEine\\AppData\\Local\\Android\\Sdk';

console.log(`☕ Usando JAVA_HOME: ${javaHome}`);
console.log(`📱 Usando ANDROID_HOME: ${androidHome}`);

const env = {
  ...process.env,
  JAVA_HOME: javaHome,
  ANDROID_HOME: androidHome,
  PATH: `${javaHome}\\bin;${process.env.PATH}`
};

const gradlewPath = path.join(rootDir, 'android', 'gradlew.bat');
execSync(`"${gradlewPath}" assembleDebug`, { stdio: 'inherit', cwd: path.join(rootDir, 'android'), env });

console.log('📦 [5/5] Exportando PediGochos-Domiciliario.apk...');
const apkSrc = path.join(rootDir, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const apkDestProject = path.join(rootDir, 'PediGochos-Domiciliario.apk');
const userDesktop = path.join(process.env.USERPROFILE || 'C:\\Users\\DerEine', 'Desktop');
const apkDestDesktop = path.join(userDesktop, 'PediGochos-Domiciliario.apk');

if (fs.existsSync(apkSrc)) {
  fs.copyFileSync(apkSrc, apkDestProject);
  try {
    fs.copyFileSync(apkSrc, apkDestDesktop);
    console.log(`✅ APK exportado exitosamente a:\n   - ${apkDestDesktop}\n   - ${apkDestProject}`);
  } catch (err) {
    console.log(`✅ APK exportado a: ${apkDestProject}`);
  }
} else {
  console.error('❌ Error: No se encontró el APK generado en ' + apkSrc);
}
