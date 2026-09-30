const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');

const SERVICES_CONFIG = {
  shelliart: {
    key: 'resin',
    name: 'ShekkiArt',
    appId: 'com.pedigochos.service.shekkiart',
    apkName: 'PediGochos-ShekkiArt.apk'
  },
  shekkiart: {
    key: 'resin',
    name: 'ShekkiArt',
    appId: 'com.pedigochos.service.shekkiart',
    apkName: 'PediGochos-ShekkiArt.apk'
  },
  pinatas: {
    key: 'pinatas',
    name: 'Creaciones Lola Piñatas',
    appId: 'com.pedigochos.service.creacioneslola',
    apkName: 'PediGochos-CreacionesLola.apk'
  },
  cauchera: {
    key: 'cauchera',
    name: 'Cauchera Cachu 24H',
    appId: 'com.pedigochos.service.cauchera',
    apkName: 'PediGochos-Cauchera.apk'
  },
  latoneria: {
    key: 'paint',
    name: 'Latonería y Pintura',
    appId: 'com.pedigochos.service.latoneria',
    apkName: 'PediGochos-Latoneria.apk'
  },
  print3d: {
    key: 'print3d',
    name: 'PediGochos 3D Lab',
    appId: 'com.pedigochos.service.print3d',
    apkName: 'PediGochos-3DLab.apk'
  }
};

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

function buildSingleApk(targetKey, config) {
  console.log(`\n======================================================`);
  console.log(`🔨 INICIANDO COMPILACIÓN DE APK: ${config.name} (${config.apkName})`);
  console.log(`======================================================`);

  console.log('🚀 [1/5] Preparando archivos web para ' + config.name + '...');
  execSync(`node scripts/build-service-app.js ${config.key}`.trim(), { stdio: 'inherit', cwd: rootDir });

  console.log('⚙️ [2/5] Configurando Capacitor para ' + config.name + '...');
  fs.copyFileSync(
    path.join(rootDir, 'capacitor.service.json'),
    path.join(rootDir, 'capacitor.config.json')
  );

  // Update strings.xml
  const stringsXmlPath = path.join(rootDir, 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml');
  if (fs.existsSync(stringsXmlPath)) {
    const stringsContent = `<?xml version='1.0' encoding='utf-8'?>
<resources>
    <string name="app_name">${config.name}</string>
    <string name="title_activity_main">${config.name}</string>
    <string name="package_name">${config.appId}</string>
    <string name="custom_url_scheme">${config.appId}</string>
</resources>
`;
    fs.writeFileSync(stringsXmlPath, stringsContent, 'utf8');
  }

  // Ensure unique Android package applicationId in build.gradle
  const buildGradlePath = path.join(rootDir, 'android', 'app', 'build.gradle');
  if (fs.existsSync(buildGradlePath)) {
    let gradleContent = fs.readFileSync(buildGradlePath, 'utf8');
    gradleContent = gradleContent.replace(/applicationId\s+["'][^"']+["']/, `applicationId "${config.appId}"`);
    fs.writeFileSync(buildGradlePath, gradleContent, 'utf8');
    console.log(`📱 ApplicationId configurado: ${config.appId}`);
  }

  console.log('🔄 [3/5] Sincronizando con plataforma Android nativa...');
  execSync('npx cap sync android', { stdio: 'inherit', cwd: rootDir });

  console.log('🔨 [4/5] Compilando APK nativo con Gradle...');
  const gradlewPath = path.join(rootDir, 'android', 'gradlew.bat');
  execSync(`"${gradlewPath}" assembleDebug`, { stdio: 'inherit', cwd: path.join(rootDir, 'android'), env });

  console.log('📦 [5/5] Exportando ' + config.apkName + '...');
  const apkSrc = path.join(rootDir, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
  const apkDestProject = path.join(rootDir, config.apkName);
  const userDesktop = path.join(process.env.USERPROFILE || 'C:\\Users\\DerEine', 'Desktop');
  const apkDestDesktop = path.join(userDesktop, config.apkName);

  if (fs.existsSync(apkSrc)) {
    fs.copyFileSync(apkSrc, apkDestProject);
    try {
      fs.copyFileSync(apkSrc, apkDestDesktop);
      console.log(`✅ ${config.apkName} exportado exitosamente a:\n   - ${apkDestDesktop}\n   - ${apkDestProject}`);
    } catch (err) {
      console.log(`✅ ${config.apkName} exportado a: ${apkDestProject}`);
    }
  } else {
    console.error('❌ Error: No se encontró el APK generado en ' + apkSrc);
  }
}

// Argument parsing: 'all', specific key, or unified
const targetArg = (process.argv[2] || '').toLowerCase();

if (targetArg === 'all') {
  console.log('🌟 Compilando los 5 APKs de servicios en lote...');
  for (const [key, cfg] of Object.entries(SERVICES_CONFIG)) {
    buildSingleApk(key, cfg);
  }
  console.log('\n🎉 ¡Todos los APKs de servicios han sido compilados y exportados!');
} else if (SERVICES_CONFIG[targetArg]) {
  buildSingleApk(targetArg, SERVICES_CONFIG[targetArg]);
} else {
  // Build unified PediGochos-Servicios.apk
  buildSingleApk('portal', {
    key: '',
    name: 'PediGochos Servicios',
    appId: 'com.pedigochos.service',
    apkName: 'PediGochos-Servicios.apk'
  });
}
