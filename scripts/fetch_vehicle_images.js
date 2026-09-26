const https = require('https');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '..', 'public', 'images', 'vehicles');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const items = [
  // Motos
  { file: 'suzuki_gn.jpg', query: 'Suzuki GN125 red 01.jpg' },
  { file: 'suzuki_gn_250.jpg', query: 'Suzuki GN250 motorcycle' },
  { file: 'suzuki_gn_custom.jpg', query: 'Suzuki GN cafe racer' },
  { file: 'suzuki_hj_cool.jpg', query: 'Haojue motorcycle' },
  { file: 'suzuki_hj_150.jpg', query: 'Haojue HJ 150 motorcycle' },
  { file: 'suzuki_en.jpg', query: 'Suzuki EN125-2A' },
  { file: 'suzuki_ax100.jpg', query: 'Suzuki AX100 motorcycle' },
  { file: 'suzuki_dr.jpg', query: 'Suzuki DR650 motorcycle' },
  { file: 'suzuki_vstrom.jpg', query: 'Suzuki V-Strom 650' },
  { file: 'bera_sbr.jpg', query: '150cc motorcycle commuter' },
  { file: 'bera_socialista.jpg', query: 'CG125 motorcycle red' },
  { file: 'bera_leon.jpg', query: 'Standard motorcycle street' },
  { file: 'keeway_horse.jpg', query: 'Keeway Speed 125' },
  { file: 'keeway_arsen.jpg', query: 'Keeway RKV 125' },
  { file: 'keeway_owen.jpg', query: '125cc cruiser motorcycle' },
  { file: 'keeway_tx.jpg', query: 'Keeway TX 125' },
  { file: 'yamaha_dt.jpg', query: 'Yamaha DT125' },
  { file: 'yamaha_ybr.jpg', query: 'Yamaha YBR 125' },
  { file: 'yamaha_bws.jpg', query: 'Yamaha Zuma 125' },
  { file: 'yamaha_fz.jpg', query: 'Yamaha FZ16' },
  { file: 'honda_cg.jpg', query: 'Honda CG125' },
  { file: 'honda_xr.jpg', query: 'Honda XR125' },
  { file: 'honda_tornado.jpg', query: 'Honda XR 250 Tornado' },
  { file: 'moto_clasica.jpg', query: 'Classic motorcycle street' },
  { file: 'moto_scooter.jpg', query: 'Motor scooter modern' },
  { file: 'moto_enduro.jpg', query: 'Enduro motorcycle cross' },

  // Sedanes
  { file: 'chevrolet_aveo.jpg', query: 'Chevrolet Aveo T250 sedan' },
  { file: 'chevrolet_spark.jpg', query: 'Chevrolet Spark red' },
  { file: 'chevrolet_corsa.jpg', query: 'Opel Corsa B 5-door' },
  { file: 'chevrolet_optra.jpg', query: 'Daewoo Lacetti sedan' },
  { file: 'toyota_corolla.jpg', query: 'Toyota Corolla E120 sedan' },
  { file: 'toyota_yaris.jpg', query: 'Toyota Yaris XP90' },
  { file: 'ford_fiesta.jpg', query: 'Ford Fiesta Mk6' },
  { file: 'ford_focus.jpg', query: 'Ford Focus Mk1' },
  { file: 'hyundai_accent.jpg', query: 'Hyundai Accent MC sedan' },
  { file: 'kia_rio.jpg', query: 'Kia Rio JB' },
  { file: 'sedan_general.jpg', query: 'Modern compact sedan car' },

  // SUV
  { file: 'toyota_4runner.jpg', query: 'Toyota 4Runner N280' },
  { file: 'toyota_rav4.jpg', query: 'Toyota RAV4 XA30' },
  { file: 'chevrolet_vitara.jpg', query: 'Suzuki Grand Vitara 5-door' },
  { file: 'chevrolet_trailblazer.jpg', query: 'Chevrolet TrailBlazer 2002' },
  { file: 'ford_explorer.jpg', query: 'Ford Explorer 2006' },
  { file: 'ford_ecosport.jpg', query: 'Ford EcoSport 2013' },
  { file: 'hyundai_tucson.jpg', query: 'Hyundai Tucson JM' },
  { file: 'jeep_cherokee.jpg', query: 'Jeep Cherokee XJ' },
  { file: 'suv_general.jpg', query: 'Compact SUV vehicle' },

  // Pick-up
  { file: 'toyota_hilux.jpg', query: 'Toyota Hilux double cab' },
  { file: 'toyota_machito.jpg', query: 'Toyota Land Cruiser HZJ76' },
  { file: 'chevrolet_silverado.jpg', query: 'Chevrolet Silverado GMT900' },
  { file: 'chevrolet_dmax.jpg', query: 'Isuzu D-Max 2007' },
  { file: 'ford_f150.jpg', query: 'Ford F-150 eleventh generation' },
  { file: 'ford_ranger.jpg', query: 'Ford Ranger double cab' },
  { file: 'pickup_general.jpg', query: 'Pickup truck modern' }
];

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'PediGochosApp/1.0 (pedigochos@app.com)' } }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': 'PediGochosApp/1.0 (pedigochos@app.com)' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Status ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve());
      });
    }).on('error', err => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function run() {
  console.log(`Starting vehicle images download (${items.length} targets)...`);
  for (const item of items) {
    const dest = path.join(targetDir, item.file);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 5000) {
      console.log(`[SKIP] ${item.file} already exists (${fs.statSync(dest).size} bytes)`);
      continue;
    }

    try {
      // Search Wikimedia Commons for bitmap files
      const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(item.query + ' filetype:bitmap')}&prop=imageinfo&iiprop=url&iiurlwidth=480&format=json&gsrlimit=3`;
      const data = await fetchJson(searchUrl);
      const pages = data.query?.pages;
      let thumbUrl = null;
      if (pages) {
        for (const p of Object.values(pages)) {
          const info = p.imageinfo?.[0];
          if (info && info.thumburl && !info.thumburl.endsWith('.svg.png')) {
            thumbUrl = info.thumburl;
            break;
          }
        }
      }

      if (!thumbUrl) {
        // Fallback search with broader terms
        const broad = item.query.split(' ')[0] + ' ' + (item.file.includes('moto') ? 'motorcycle' : 'car');
        const fallbackUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(broad + ' filetype:bitmap')}&prop=imageinfo&iiprop=url&iiurlwidth=480&format=json&gsrlimit=3`;
        const fData = await fetchJson(fallbackUrl);
        const fPages = fData.query?.pages;
        if (fPages) {
          for (const p of Object.values(fPages)) {
            const info = p.imageinfo?.[0];
            if (info && info.thumburl && !info.thumburl.endsWith('.svg.png')) {
              thumbUrl = info.thumburl;
              break;
            }
          }
        }
      }

      if (thumbUrl) {
        console.log(`[DOWNLOADING] ${item.file} <- ${thumbUrl.slice(0, 80)}...`);
        await downloadFile(thumbUrl, dest);
        console.log(`[OK] ${item.file} (${fs.statSync(dest).size} bytes)`);
      } else {
        console.warn(`[WARN] No thumb found for ${item.file} (query: ${item.query})`);
      }
    } catch (err) {
      console.error(`[ERROR] ${item.file}:`, err.message);
    }
    // Respect Wikimedia rate limit
    await new Promise(r => setTimeout(r, 250));
  }
  console.log('Finished downloading vehicle images!');
}

run();
