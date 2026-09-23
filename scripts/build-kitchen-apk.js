const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');

console.log('🚀 [1/5] Preparando archivos web para PediGochos Cocina...');
execSync('node scripts/build-kitchen-app.js', { stdio: 'inherit', cwd: rootDir });

console.log('⚙️ [2/5] Configurando Capacitor para PediGochos Cocina...');
fs.copyFileSync(
  path.join(rootDir, 'capacitor.kitchen.json'),
  path.join(rootDir, 'capacitor.config.json')
);

// Update strings.xml
const stringsXmlPath = path.join(rootDir, 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml');
if (fs.existsSync(stringsXmlPath)) {
  const stringsContent = `<?xml version='1.0' encoding='utf-8'?>
<resources>
    <string name="app_name">PediGochos Dueño</string>
    <string name="title_activity_main">PediGochos Dueño</string>
    <string name="package_name">com.pedigochos.kitchen</string>
    <string name="custom_url_scheme">com.pedigochos.kitchen</string>
</resources>
`;
  fs.writeFileSync(stringsXmlPath, stringsContent, 'utf8');
}

// Ensure unique Android package applicationId in build.gradle
const buildGradlePath = path.join(rootDir, 'android', 'app', 'build.gradle');
if (fs.existsSync(buildGradlePath)) {
  let gradleContent = fs.readFileSync(buildGradlePath, 'utf8');
  gradleContent = gradleContent.replace(/applicationId\s+["'][^"']+["']/, 'applicationId "com.pedigochos.kitchen"');
  fs.writeFileSync(buildGradlePath, gradleContent, 'utf8');
  console.log('📱 ApplicationId configurado como independiente: com.pedigochos.kitchen');
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

console.log('📦 [5/5] Exportando APKs de Cocina / Dueño...');
const apkSrc = path.join(rootDir, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const userDesktop = path.join(process.env.USERPROFILE || 'C:\\Users\\DerEine', 'Desktop');

if (fs.existsSync(apkSrc)) {
  const targets = [
    path.join(rootDir, 'PediGochos-Cocina.apk'),
    path.join(rootDir, 'PediGochos-Duenio.apk'),
    path.join(userDesktop, 'PediGochos-Cocina.apk'),
    path.join(userDesktop, 'PediGochos-Duenio.apk')
  ];
  targets.forEach(tgt => {
    try {
      fs.copyFileSync(apkSrc, tgt);
      console.log(`✅ APK exportado exitosamente a: ${tgt}`);
    } catch (e) {}
  });
} else {
  console.error('❌ Error: No se encontró el APK generado en ' + apkSrc);
}
