require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const app = express();

// Universal CORS configuration for web, Capacitor mobile apps, and external devices
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, isowner, code');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

// Write uncaught errors to debug_logs.txt
process.on('uncaughtException', (err) => {
  const time = new Date().toISOString();
  fs.appendFileSync(path.join(__dirname, 'debug_logs.txt'), `[${time}] [UNCAUGHT EXCEPTION] ${err.stack || err}\n`);
  process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
  const time = new Date().toISOString();
  fs.appendFileSync(path.join(__dirname, 'debug_logs.txt'), `[${time}] [UNHANDLED REJECTION] ${reason.stack || reason}\n`);
});

// Helper function to log application errors
function logAppError(context, err) {
  const time = new Date().toISOString();
  fs.appendFileSync(path.join(__dirname, 'debug_logs.txt'), `[${time}] [${context}] ${err.stack || err}\n`);
}

// Endpoint to view server logs
app.get('/api/debug/logs', (req, res) => {
  const logFile = path.join(__dirname, 'debug_logs.txt');
  if (fs.existsSync(logFile)) {
    res.type('text/plain').send(fs.readFileSync(logFile, 'utf8'));
  } else {
    res.send('No logs yet.');
  }
});

app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Helper functions for Database read/write
const DISABLED_STORES_FILE = path.join(__dirname, 'disabled_stores.json');

function readDisabledStores() {
  try {
    if (fs.existsSync(DISABLED_STORES_FILE)) {
      return JSON.parse(fs.readFileSync(DISABLED_STORES_FILE, 'utf8')) || {};
    }
  } catch (e) {
    console.error('Error reading disabled_stores.json:', e);
  }
  return {};
}

function writeDisabledStores(map) {
  try {
    fs.writeFileSync(DISABLED_STORES_FILE, JSON.stringify(map, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing disabled_stores.json:', e);
  }
}

const STORE_GPS_FILE = path.join(__dirname, 'store_gps.json');

function readStoreGps() {
  try {
    if (fs.existsSync(STORE_GPS_FILE)) {
      return JSON.parse(fs.readFileSync(STORE_GPS_FILE, 'utf8')) || {};
    }
  } catch (e) {
    console.error('Error reading store_gps.json:', e);
  }
  return {};
}

function writeStoreGps(map) {
  try {
    fs.writeFileSync(STORE_GPS_FILE, JSON.stringify(map, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing store_gps.json:', e);
  }
}

// GPS Deleted Blacklist: tracks establishments whose GPS was explicitly removed
const GPS_DELETED_FILE = path.join(__dirname, 'gps_deleted.json');

function readGpsDeleted() {
  try {
    if (fs.existsSync(GPS_DELETED_FILE)) {
      return JSON.parse(fs.readFileSync(GPS_DELETED_FILE, 'utf8')) || {};
    }
  } catch (e) {
    console.error('Error reading gps_deleted.json:', e);
  }
  return {};
}

function writeGpsDeleted(map) {
  try {
    fs.writeFileSync(GPS_DELETED_FILE, JSON.stringify(map, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing gps_deleted.json:', e);
  }
}

const DRIVERS_FILE = path.join(__dirname, 'drivers.json');
const DRIVER_CHAT_FILE = path.join(__dirname, 'driver_chat.json');

function ensureDefaultDrivers(drivers) {
  if (!Array.isArray(drivers)) drivers = [];
  const hasYoxman = drivers.some(d => d.username === 'yoxman' || d.id === 'drv-yoxman' || (d.name && d.name.toLowerCase() === 'yoxman'));
  if (!hasYoxman) {
    drivers.push({
      id: 'drv-yoxman',
      username: 'yoxman',
      name: 'Yoxman',
      phone: 'yoxman',
      linkKey: '12345@',
      vehicleType: 'Moto 🛵',
      status: 'Disponible',
      isLockedName: true,
      totalDeliveries: 0,
      lastActive: new Date().toISOString()
    });
  }
  return drivers;
}

function readDrivers() {
  try {
    if (fs.existsSync(DRIVERS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DRIVERS_FILE, 'utf8')) || [];
      return ensureDefaultDrivers(parsed);
    }
  } catch (e) {
    console.error('Error reading drivers.json:', e);
  }
  return ensureDefaultDrivers([]);
}

function writeDrivers(drivers) {
  try {
    if (Array.isArray(drivers)) {
      fs.writeFileSync(DRIVERS_FILE, JSON.stringify(ensureDefaultDrivers(drivers), null, 2), 'utf8');
    }
  } catch (e) {
    console.error('Error writing drivers.json:', e);
  }
}

function readDriverChat() {
  try {
    if (fs.existsSync(DRIVER_CHAT_FILE)) {
      return JSON.parse(fs.readFileSync(DRIVER_CHAT_FILE, 'utf8')) || [];
    }
  } catch (e) {
    console.error('Error reading driver_chat.json:', e);
  }
  return [];
}

function writeDriverChat(messages) {
  try {
    if (Array.isArray(messages)) {
      if (messages.length > 200) messages = messages.slice(-200);
      fs.writeFileSync(DRIVER_CHAT_FILE, JSON.stringify(messages, null, 2), 'utf8');
    }
  } catch (e) {
    console.error('Error writing driver_chat.json:', e);
  }
}

async function syncFromSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.log('Supabase env vars missing. Skipping cloud DB sync.');
    return;
  }
  try {
    const rootUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/menu_images/db_backup.json`;
    const uploadsUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/menu_images/uploads/db_backup.json`;
    console.log('Syncing database state from Supabase:', rootUrl);
    let res = await fetch(rootUrl);
    if (!res.ok) {
      console.log('Trying uploads path fallback:', uploadsUrl);
      res = await fetch(uploadsUrl);
    }
    if (res.ok) {
      const text = await res.text();
      const cloudData = JSON.parse(text);
      if (cloudData && Array.isArray(cloudData.establishments) && cloudData.establishments.length > 0) {
        const localData = readDB();
        const localEsts = (localData && Array.isArray(localData.establishments)) ? localData.establishments : [];
        localEsts.forEach(localEst => {
          if (!localEst || !localEst.id) return;
          const cloudIndex = cloudData.establishments.findIndex(e => String(e.id).trim() === String(localEst.id).trim());
          if (cloudIndex === -1) {
            cloudData.establishments.push(localEst);
          } else {
            const cloudEst = cloudData.establishments[cloudIndex];
            if (!Array.isArray(cloudEst.products) || cloudEst.products.length === 0 || (Array.isArray(localEst.products) && localEst.products.length > cloudEst.products.length)) {
              cloudEst.products = localEst.products || [];
            }
          }
        });
        cloudData.establishments = deduplicateEstablishments(cloudData.establishments);
        fs.writeFileSync(DB_FILE, JSON.stringify(cloudData, null, 2), 'utf8');
        console.log(`🎉 Database synced & deduplicated (${cloudData.establishments.length} unique stores) from Supabase Storage!`);
      }
    } else {
      console.log('No backup db.json found in Supabase Storage or request failed. Status:', res.status);
    }

    try {
      const disabledUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/menu_images/disabled_stores.json`;
      const disRes = await fetch(disabledUrl);
      if (disRes.ok) {
        try {
          const cloudDisabled = await disRes.json();
          const localDisabled = readDisabledStores();
          const mergedDisabled = { ...cloudDisabled, ...localDisabled };
          writeDisabledStores(mergedDisabled);
          console.log('🎉 disabled_stores.json restored and merged from Supabase Storage!');
        } catch(e) {}
      }

      const gpsUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/menu_images/store_gps.json`;
      const gpsRes = await fetch(gpsUrl);
      if (gpsRes.ok) {
        try {
          const cloudGps = await gpsRes.json();
          const localGps = readStoreGps();
          const mergedGps = { ...cloudGps, ...localGps };
          writeStoreGps(mergedGps);
          console.log('🎉 store_gps.json restored and merged from Supabase Storage!');
        } catch(e) {}
      }

      const drvUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/menu_images/drivers.json`;
      const drvRes = await fetch(drvUrl);
      if (drvRes.ok) {
        const drvText = await drvRes.text();
        const cloudDrivers = JSON.parse(drvText);
        if (Array.isArray(cloudDrivers) && cloudDrivers.length > 0) {
          const localDrivers = readDrivers();
          const cloudPhones = new Set(cloudDrivers.map(d => d.phone));
          localDrivers.forEach(ld => {
            if (ld && ld.phone && !cloudPhones.has(ld.phone)) {
              cloudDrivers.push(ld);
            }
          });
          writeDrivers(cloudDrivers);
          console.log('🎉 drivers.json restored from Supabase Storage!');
        }
      }

      const gpsDeletedUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/menu_images/gps_deleted.json`;
      const gpsDelRes = await fetch(gpsDeletedUrl);
      if (gpsDelRes.ok) {
        try {
          const cloudGpsDel = await gpsDelRes.json();
          const localGpsDel = readGpsDeleted();
          // Merge: local entries win (local deletions stay), cloud deletions also respected
          const mergedGpsDel = { ...cloudGpsDel, ...localGpsDel };
          writeGpsDeleted(mergedGpsDel);
          // Remove any entries in storeGpsMap that are in the deleted blacklist
          const storeGpsMap = readStoreGps();
          let gpsDirty = false;
          Object.keys(mergedGpsDel).forEach(delId => {
            if (storeGpsMap[delId]) {
              delete storeGpsMap[delId];
              gpsDirty = true;
            }
          });
          if (gpsDirty) writeStoreGps(storeGpsMap);
          console.log('🎉 gps_deleted.json restored and merged from Supabase Storage!');
        } catch(e) {}
      }
    } catch(e) {}
  } catch (err) {
    console.error('Error syncing database from Supabase:', err);
  }
}

async function uploadToSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) return;
  try {
    const fileContent = fs.readFileSync(DB_FILE, 'utf8');
    const headers = {
      'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      'apikey': process.env.SUPABASE_ANON_KEY,
      'x-upsert': 'true',
      'Content-Type': 'application/json'
    };
    const promises = [
      fetch(`${process.env.SUPABASE_URL}/storage/v1/object/menu_images/db_backup.json`, { method: 'POST', headers, body: fileContent }),
      fetch(`${process.env.SUPABASE_URL}/storage/v1/object/menu_images/uploads/db_backup.json`, { method: 'POST', headers, body: fileContent })
    ];

    if (fs.existsSync(DISABLED_STORES_FILE)) {
      const disabledContent = fs.readFileSync(DISABLED_STORES_FILE, 'utf8');
      promises.push(fetch(`${process.env.SUPABASE_URL}/storage/v1/object/menu_images/disabled_stores.json`, { method: 'POST', headers, body: disabledContent }));
    }

    if (fs.existsSync(STORE_GPS_FILE)) {
      const gpsContent = fs.readFileSync(STORE_GPS_FILE, 'utf8');
      promises.push(fetch(`${process.env.SUPABASE_URL}/storage/v1/object/menu_images/store_gps.json`, { method: 'POST', headers, body: gpsContent }));
    }

    if (fs.existsSync(DRIVERS_FILE)) {
      const driversContent = fs.readFileSync(DRIVERS_FILE, 'utf8');
      promises.push(fetch(`${process.env.SUPABASE_URL}/storage/v1/object/menu_images/drivers.json`, { method: 'POST', headers, body: driversContent }));
    }

    if (fs.existsSync(GPS_DELETED_FILE)) {
      const gpsDeletedContent = fs.readFileSync(GPS_DELETED_FILE, 'utf8');
      promises.push(fetch(`${process.env.SUPABASE_URL}/storage/v1/object/menu_images/gps_deleted.json`, { method: 'POST', headers, body: gpsDeletedContent }));
    }

    await Promise.all(promises);
    console.log('☁️ Database state, disabled stores, GPS & Drivers backup updated successfully in Supabase Storage!');
  } catch (err) {
    console.error('Error backing up database to Supabase:', err);
    logAppError('uploadToSupabase', err);
  }
}

async function saveChangesToCloud() {
  try {
    await uploadToSupabase();
    await saveToPostgres();
  } catch (err) {
    console.error('Error in saveChangesToCloud:', err);
  }
}

// Sync database state from Supabase PostgreSQL tables
async function syncFromPostgres() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.log('Supabase env vars missing. Skipping Postgres sync.');
    return false;
  }
  try {
    const estUrl = `${process.env.SUPABASE_URL}/rest/v1/establishments`;
    const ordUrl = `${process.env.SUPABASE_URL}/rest/v1/orders`;
    const headers = {
      'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      'apikey': process.env.SUPABASE_ANON_KEY
    };

    console.log('Syncing database state from Supabase PostgreSQL...');
    const [estRes, ordRes] = await Promise.all([
      fetch(estUrl, { headers }),
      fetch(ordUrl, { headers })
    ]);

    if (estRes.ok && ordRes.ok) {
      const establishments = await estRes.json();
      const orders = await ordRes.json();

      if (establishments && Array.isArray(establishments)) {
        const localData = readDB();
        const localEsts = (localData && Array.isArray(localData.establishments)) ? localData.establishments : [];

        // MERGE: Keep any local establishments that are not yet in Postgres
        const pgEstIds = new Set(establishments.map(e => String(e.id).trim()));
        localEsts.forEach(localEst => {
          if (localEst && localEst.id && !pgEstIds.has(String(localEst.id).trim())) {
            establishments.push(localEst);
          }
        });

        const disabledMap = readDisabledStores();
        const storeGpsMap = readStoreGps();
        establishments.forEach(est => {
          const localMatch = localEsts.find(l => String(l.id).trim() === String(est.id).trim());
          if (localMatch) {
            if (!Array.isArray(est.products) || est.products.length === 0 || (Array.isArray(localMatch.products) && localMatch.products.length > est.products.length)) {
              est.products = localMatch.products || [];
            }
            if (localMatch.linkKey && !est.linkKey) est.linkKey = localMatch.linkKey;
            if (localMatch.open_time && !est.open_time) est.open_time = localMatch.open_time;
            if (localMatch.close_time && !est.close_time) est.close_time = localMatch.close_time;
            if (localMatch.tables && (!est.tables || est.tables.length === 0)) est.tables = localMatch.tables;
            if (localMatch.layout && (!est.layout || est.layout.length === 0)) est.layout = localMatch.layout;
            if (localMatch.isHighTraffic !== undefined && est.isHighTraffic === undefined) est.isHighTraffic = localMatch.isHighTraffic;
            if (localMatch.extraPrepTime !== undefined && est.extraPrepTime === undefined) est.extraPrepTime = localMatch.extraPrepTime;
            if (localMatch.working_days && (!est.working_days || est.working_days.length === 0)) est.working_days = localMatch.working_days;
          }

          // Normalize food sub-categories to main 'comidas' category
          if (!est.category || ['pizzas', 'pizza', 'hamburguesas', 'arepas', 'comida', 'restaurante', 'restaurantes'].includes(String(est.category).toLowerCase())) {
            est.category = 'comidas';
          }

          // Respect authoritative disabled state from disabledMap / establishment record
          if (disabledMap[est.id] !== undefined) {
            est.disabled = Boolean(disabledMap[est.id]);
          } else if (est.disabled !== undefined) {
            est.disabled = Boolean(est.disabled);
            disabledMap[est.id] = est.disabled;
          } else if (localMatch && localMatch.disabled !== undefined) {
            est.disabled = Boolean(localMatch.disabled);
            disabledMap[est.id] = est.disabled;
          } else {
            est.disabled = false;
            disabledMap[est.id] = false;
          }

          // Preserve user-saved GPS
          if (storeGpsMap[est.id] && storeGpsMap[est.id].latitude && storeGpsMap[est.id].longitude) {
            est.latitude = parseFloat(storeGpsMap[est.id].latitude);
            est.longitude = parseFloat(storeGpsMap[est.id].longitude);
          } else if (est.latitude !== undefined && est.latitude !== null && !isNaN(parseFloat(est.latitude)) && est.longitude !== undefined && est.longitude !== null && !isNaN(parseFloat(est.longitude))) {
            est.latitude = parseFloat(est.latitude);
            est.longitude = parseFloat(est.longitude);
            storeGpsMap[est.id] = { latitude: est.latitude, longitude: est.longitude };
          } else {
            est.latitude = null;
            est.longitude = null;
          }
          est.location_lat = est.latitude;
          est.location_lng = est.longitude;
        });
        const dedupedEsts = deduplicateEstablishments(establishments);
        writeDisabledStores(disabledMap);
        writeStoreGps(storeGpsMap);

        const existingDrivers = (localData && Array.isArray(localData.drivers) && localData.drivers.length > 0)
          ? localData.drivers
          : readDrivers();
        const existingReviews = (localData && Array.isArray(localData.reviews)) ? localData.reviews : [];
        const existingPromos = (localData && Array.isArray(localData.promotions)) ? localData.promotions : [];

        const restoredOrders = (orders || []).map(ord => {
          const det = ord.deliveryDetails || {};
          return {
            ...ord,
            customerEmail: ord.customerEmail || det.customerEmail || null,
            userId: ord.userId || det.userId || null
          };
        });

        const dbState = {
          establishments: dedupedEsts,
          orders: restoredOrders,
          drivers: existingDrivers,
          reviews: existingReviews,
          promotions: existingPromos,
          lastUpdated: new Date().toISOString()
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), 'utf8');
        writeDrivers(existingDrivers);
        console.log('🎉 Database synced successfully from Supabase PostgreSQL tables!');
      }
      return true;
    } else {
      console.log(`Supabase PostgreSQL tables might not be created yet. Status: ${estRes.status} / ${ordRes.status}`);
      console.log('Please run the database script "supabase_setup_tables.sql" in your Supabase SQL Editor.');
      return false;
    }
  } catch (err) {
    console.error('Error syncing database from Supabase PostgreSQL:', err);
    logAppError('syncFromPostgres', err);
    return false;
  }
}

// Backup database state to Supabase PostgreSQL tables
async function saveToPostgres() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) return;
  try {
    const localData = readDB();
    const headers = {
      'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      'apikey': process.env.SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    };

    // 1. Bulk Upsert Establishments
    if (localData.establishments && localData.establishments.length > 0) {
      const PG_COLS = ['id', 'name', 'category', 'description', 'logo', 'bannerType', 'banner', 'linkKey', 'delivery_fee', 'themeColor', 'logoImage', 'tables', 'layout', 'products', 'prep_time', 'delivery_time', 'location'];
      const normalizedEsts = localData.establishments.map(est => {
        const obj = {};
        PG_COLS.forEach(col => {
          if (est[col] !== undefined) obj[col] = est[col];
        });
        return obj;
      });

      const estRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/establishments`, {
        method: 'POST',
        headers,
        body: JSON.stringify(normalizedEsts)
      });
      if (!estRes.ok) {
        const errText = await estRes.text();
        console.error('Failed to upsert establishments to Postgres:', estRes.status, errText);
        logAppError('saveToPostgres_establishments_http_error', new Error(`Status: ${estRes.status}, Body: ${errText}`));
      }
    }



    // 2. Bulk Upsert Orders
    if (localData.orders && localData.orders.length > 0) {
      const normalizedOrders = localData.orders.map(ord => ({
        id: ord.id,
        establishmentId: ord.establishmentId || null,
        establishmentName: ord.establishmentName || null,
        items: ord.items || [],
        total: ord.total !== undefined ? parseFloat(ord.total) : 0,
        orderType: ord.orderType || null,
        customerName: ord.customerName || null,
        tableNumber: ord.tableNumber || null,
        deliveryDetails: {
          ...(ord.deliveryDetails || {}),
          customerEmail: ord.customerEmail || (ord.deliveryDetails && ord.deliveryDetails.customerEmail) || null,
          userId: ord.userId || (ord.deliveryDetails && ord.deliveryDetails.userId) || null
        },
        status: ord.status || 'Pendiente',
        cancelReason: ord.cancelReason || null,
        paymentStatus: ord.paymentStatus || 'Pendiente',
        createdAt: ord.createdAt || new Date().toISOString(),
        updatedAt: ord.updatedAt || new Date().toISOString()
      }));

      const ordRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/orders`, {
        method: 'POST',
        headers,
        body: JSON.stringify(normalizedOrders)
      });
      if (!ordRes.ok) {
        const errText = await ordRes.text();
        console.error('Failed to upsert orders to Postgres:', ordRes.status, errText);
        logAppError('saveToPostgres_orders_http_error', new Error(`Status: ${ordRes.status}, Body: ${errText}`));
      }
    }

    // 3. Delete removed orders from PostgreSQL
    const cloudOrdRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/orders?select=id`, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        'apikey': process.env.SUPABASE_ANON_KEY
      }
    });
    if (cloudOrdRes.ok) {
      const cloudOrds = await cloudOrdRes.json();
      const localOrderIds = new Set((localData.orders || []).map(o => o.id));
      const deletedOrderIds = cloudOrds.map(o => o.id).filter(id => !localOrderIds.has(id));
      if (deletedOrderIds.length > 0) {
        console.log('Deleting removed orders from Postgres:', deletedOrderIds);
        const delUrl = `${process.env.SUPABASE_URL}/rest/v1/orders?id=in.(${deletedOrderIds.map(id => `"${id}"`).join(',')})`;
        await fetch(delUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
            'apikey': process.env.SUPABASE_ANON_KEY
          }
        });
      }
    }

    console.log('☁️ Database state backup updated successfully in Supabase PostgreSQL tables!');
  } catch (err) {
    console.error('Error backing up database to Supabase PostgreSQL:', err);
    logAppError('saveToPostgres', err);
  }
}

// Permanently delete an establishment from Supabase PostgreSQL tables
async function deleteEstablishmentFromPostgres(id) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || !id) return;
  try {
    const url = `${process.env.SUPABASE_URL}/rest/v1/establishments?id=eq.${encodeURIComponent(id)}`;
    const headers = {
      'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      'apikey': process.env.SUPABASE_ANON_KEY
    };
    const res = await fetch(url, { method: 'DELETE', headers });
    if (res.ok) {
      console.log(`🗑️ Successfully deleted establishment [${id}] from Supabase PostgreSQL!`);
    } else {
      console.error(`Failed to delete establishment [${id}] from Postgres:`, res.status, await res.text());
    }
  } catch (err) {
    console.error('Error in deleteEstablishmentFromPostgres:', err);
    logAppError('deleteEstablishmentFromPostgres', err);
  }
}

function normalizeStoreName(name) {
  if (!name) return '';
  return name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function isEstablishmentOpen(est) {
  if (!est) return true;
  if (est.disabled) return false;

  const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const todayName = daysOfWeek[new Date().getDay()];
  if (Array.isArray(est.working_days) && est.working_days.length > 0) {
    if (!est.working_days.includes(todayName)) {
      return false;
    }
  }

  const openTime = est.open_time || '17:00';
  const closeTime = est.close_time || '00:00';

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const parseMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    let h = parseInt(parts[0], 10) || 0;
    let m = parseInt(parts[1], 10) || 0;
    if ((h === 0 && m === 0 && (timeStr === '00:00' || timeStr === '24:00')) || h === 24) {
      return 1440;
    }
    return h * 60 + m;
  };

  let openMin = parseMinutes(openTime);
  let closeMin = parseMinutes(closeTime);

  if (openMin <= closeMin) {
    return currentMinutes >= openMin && currentMinutes <= closeMin;
  } else {
    return currentMinutes >= openMin || currentMinutes <= closeMin;
  }
}

function deduplicateEstablishments(establishments) {
  if (!Array.isArray(establishments)) return [];
  const seenIds = new Set();
  const unique = [];

  const storeGpsMap = readStoreGps();
  const disabledMap = readDisabledStores();

  establishments.forEach(est => {
    if (!est || !est.id || !est.name) return;
    const estIdStr = String(est.id).trim();

    if (disabledMap[est.id] !== undefined) {
      est.disabled = Boolean(disabledMap[est.id]);
    } else {
      est.disabled = Boolean(est.disabled);
      disabledMap[est.id] = est.disabled;
    }

    // Preserve user-saved GPS from store_gps.json or directly from establishment record
    if (storeGpsMap[est.id] && storeGpsMap[est.id].latitude && storeGpsMap[est.id].longitude) {
      est.latitude = parseFloat(storeGpsMap[est.id].latitude);
      est.longitude = parseFloat(storeGpsMap[est.id].longitude);
    } else if (est.latitude !== undefined && est.latitude !== null && !isNaN(parseFloat(est.latitude)) && est.longitude !== undefined && est.longitude !== null && !isNaN(parseFloat(est.longitude))) {
      est.latitude = parseFloat(est.latitude);
      est.longitude = parseFloat(est.longitude);
      storeGpsMap[est.id] = { latitude: est.latitude, longitude: est.longitude };
    } else {
      est.latitude = null;
      est.longitude = null;
    }
    est.location_lat = est.latitude;
    est.location_lng = est.longitude;

    if (!est.open_time) est.open_time = '17:00';
    if (!est.close_time) est.close_time = '00:00';
    if (!est.location) est.location = 'San Antonio';

    if (!seenIds.has(estIdStr)) {
      seenIds.add(estIdStr);
      unique.push(est);
    } else {
      // If exact duplicate ID exists, keep the one with most recent or most products
      const existingIdx = unique.findIndex(u => String(u.id).trim() === estIdStr);
      if (existingIdx !== -1) {
        const existing = unique[existingIdx];
        const existingProdCount = Array.isArray(existing.products) ? existing.products.length : 0;
        const newProdCount = Array.isArray(est.products) ? est.products.length : 0;
        if (newProdCount >= existingProdCount) {
          est.linkKey = est.linkKey || existing.linkKey;
          unique[existingIdx] = est;
        }
      }
    }
  });

  return unique;
}

function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      return { establishments: [], orders: [], reviews: [], drivers: [] };
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    const db = JSON.parse(data);
    if (!db.reviews) db.reviews = [];
    if (!db.drivers || db.drivers.length === 0) {
      db.drivers = readDrivers();
    } else {
      writeDrivers(db.drivers);
    }
    if (!db.promotions) db.promotions = [];

    // Filter out promotions older than 24h
    const nowMs = Date.now();
    db.promotions = db.promotions.filter(p => {
      const createdAtMs = new Date(p.createdAt || p.created_at || nowMs).getTime();
      return (nowMs - createdAtMs) < (24 * 60 * 60 * 1000);
    });

    if (db && Array.isArray(db.establishments)) {
      const origCount = db.establishments.length;
      db.establishments = deduplicateEstablishments(db.establishments);
      if (origCount !== db.establishments.length) {
        console.log(`🧹 Cleaned store duplicates: ${origCount} -> ${db.establishments.length} unique stores.`);
        try {
          fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
        } catch(e) {}
      }
    }
    return db;
  } catch (err) {
    console.error('Error reading DB:', err);
    logAppError('readDB', err);
    return { establishments: [], orders: [], reviews: [], drivers: readDrivers() };
  }
}

let cloudSaveTimeout = null;
function triggerAutoCloudSave() {
  if (cloudSaveTimeout) clearTimeout(cloudSaveTimeout);
  cloudSaveTimeout = setTimeout(async () => {
    try {
      console.log('☁️ Auto-syncing database changes to Supabase cloud...');
      await uploadToSupabase();
      await saveToPostgres();
      console.log('🎉 Cloud auto-sync finished successfully!');
    } catch(e) {
      console.warn('Auto cloud sync notice:', e);
    }
  }, 2500);
}

function writeDB(data) {
  try {
    data.lastUpdated = new Date().toISOString();
    if (data) {
      if (Array.isArray(data.drivers) && data.drivers.length > 0) {
        writeDrivers(data.drivers);
      } else {
        data.drivers = readDrivers();
      }

      if (Array.isArray(data.establishments)) {
        const disabledMap = readDisabledStores();
        const storeGpsMap = readStoreGps();
        data.establishments.forEach(est => {
          if (disabledMap[est.id] !== undefined) {
            est.disabled = Boolean(disabledMap[est.id]);
          } else if (est.disabled !== undefined) {
            disabledMap[est.id] = Boolean(est.disabled);
          }

          // Preserve user-saved GPS
          if (storeGpsMap[est.id] && storeGpsMap[est.id].latitude && storeGpsMap[est.id].longitude) {
            est.latitude = parseFloat(storeGpsMap[est.id].latitude);
            est.longitude = parseFloat(storeGpsMap[est.id].longitude);
          } else if (est.latitude !== undefined && est.latitude !== null && !isNaN(parseFloat(est.latitude)) && est.longitude !== undefined && est.longitude !== null && !isNaN(parseFloat(est.longitude))) {
            est.latitude = parseFloat(est.latitude);
            est.longitude = parseFloat(est.longitude);
            storeGpsMap[est.id] = { latitude: est.latitude, longitude: est.longitude };
          } else {
            est.latitude = null;
            est.longitude = null;
          }
          est.location_lat = est.latitude;
          est.location_lng = est.longitude;
        });
        writeDisabledStores(disabledMap);
        writeStoreGps(storeGpsMap);

        // Deduplicate establishments before writing to disk
        const seenWriteIds = new Set();
        const dedupedEsts = [];
        data.establishments.forEach(est => {
          if (!est || !est.id) return;
          const sid = String(est.id).trim();
          if (!seenWriteIds.has(sid)) {
            seenWriteIds.add(sid);
            dedupedEsts.push(est);
          }
        });
        if (dedupedEsts.length !== data.establishments.length) {
          console.log(`🧹 writeDB: Removed ${data.establishments.length - dedupedEsts.length} duplicate establishments before saving.`);
        }
        data.establishments = dedupedEsts;
      }
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    // Automatic debounced cloud backup to prevent data loss on Render restarts
    triggerAutoCloudSave();
  } catch (err) {
    console.error('Error writing DB:', err);
    logAppError('writeDB', err);
  }
}

// Owner Master Key Configuration
const OWNER_PASSWORDS = ['0424', 'DUEÑO123', 'DUENO123', 'OWNER123'];

// REST API Endpoints
// Verify Owner login and return complete establishments list with keys
app.post('/api/owner/login', (req, res) => {
  const { password } = req.body;
  const normalizedInput = password ? password.trim().toUpperCase() : '';
  
  console.log(`Intento de login de dueño: "${password}" (normalizado: "${normalizedInput}")`);

  if (OWNER_PASSWORDS.includes(normalizedInput)) {
    const db = readDB();
    res.json({ success: true, establishments: db.establishments });
  } else {
    res.status(401).json({ success: false, error: 'Clave de Dueño incorrecta' });
  }
});

// Manual Cloud Save - Only called when admin clicks "💾 Guardar Cambios" button
app.post('/api/cloud/save', async (req, res) => {
  try {
    console.log('☁️ Manual cloud save triggered by admin...');
    await Promise.all([uploadToSupabase(), saveToPostgres()]);
    console.log('☁️ Manual cloud save completed successfully.');
    res.json({ success: true, message: 'Datos guardados en la nube exitosamente.' });
  } catch (err) {
    console.error('Error during manual cloud save:', err);
    logAppError('manual_cloud_save', err);
    res.status(500).json({ success: false, error: 'Error al guardar en la nube.' });
  }
});

// Verify Merchant login by linkKey, code, id or Master Owner Key
app.post('/api/merchant/login', (req, res) => {
  const { key } = req.body;
  if (!key) {
    return res.status(400).json({ success: false, error: 'La clave de vinculación es requerida' });
  }
  const normalizedKey = key.toString().trim().toUpperCase();
  const db = readDB();
  
  // 1. Direct match by linkKey, adminKey, or ID (case-insensitive & trimmed)
  let est = (db.establishments || []).find(e => {
    if (!e) return false;
    const lk = (e.linkKey || e.link_key || e.adminKey || '').toString().trim().toUpperCase();
    const id = (e.id || '').toString().trim().toUpperCase();
    return lk === normalizedKey || id === normalizedKey;
  });

  // 2. Master Owner Key override ('0424' or 'DUEÑO123' or 'ADMIN123')
  if (!est && (normalizedKey === '0424' || normalizedKey === 'DUEÑO123' || normalizedKey === 'ADMIN123')) {
    est = (db.establishments || [])[0] || null;
  }
  
  if (est) {
    res.json({ success: true, establishment: est, establishments: db.establishments });
  } else {
    res.status(401).json({ success: false, error: 'Clave de vinculación incorrecta. Verifica la clave asignada a tu comercio.' });
  }
});

// Get system settings (including central delivery headquarters)
app.get('/api/settings', (req, res) => {
  const db = readDB();
  db.settings = db.settings || {
    central_delivery_lat: null,
    central_delivery_lng: null,
    central_delivery_name: 'Sede Central'
  };
  res.json(db.settings);
});

// Update system settings (App Owner / Admin)
app.put('/api/settings', (req, res) => {
  const { central_delivery_lat, central_delivery_lng, central_delivery_name } = req.body;
  const db = readDB();
  db.settings = db.settings || {};

  if (central_delivery_lat !== undefined) db.settings.central_delivery_lat = (central_delivery_lat !== null && central_delivery_lat !== '') ? parseFloat(central_delivery_lat) : null;
  if (central_delivery_lng !== undefined) db.settings.central_delivery_lng = (central_delivery_lng !== null && central_delivery_lng !== '') ? parseFloat(central_delivery_lng) : null;
  if (central_delivery_name) db.settings.central_delivery_name = central_delivery_name;

  writeDB(db);
  res.json({ success: true, settings: db.settings });
});

// AI Menu Extraction Endpoint (Gemini Multimodal Vision & Text)
app.post('/api/ai/parse-menu', async (req, res) => {
  try {
    const { imageBase64, menuText, apiKey, establishmentName, establishmentCategory } = req.body;

    if (!imageBase64 && !menuText) {
      return res.status(400).json({ error: 'Se requiere una imagen o texto del menú para analizar.' });
    }

    const key = (apiKey || process.env.GEMINI_API_KEY || '').trim();
    if (!key) {
      return res.status(400).json({ 
        error: 'Se requiere una clave de API de Gemini (Google AI Studio). Puedes ingresarla en la ventana de escaneo.' 
      });
    }

    const systemPrompt = `Eres un asistente experto en digitalización de menús y cartas gastronómicas para restaurantes en la plataforma PediGochos (San Antonio del Táchira / Cúcuta).
Analiza detalladamente la foto o texto del menú del restaurante "${establishmentName || 'Restaurante'}" (${establishmentCategory || 'General'}) y extrae TODOS los productos, categorías, precios y modificadores/adicionales.

REGLAS ESTRICTAS DE EXTRACCIÓN:
1. Extrae todas las categorías presentes en el menú (ej: "🍔 Hamburguesas", "🍕 Pizzas", "🌭 Perros Calientes", "🥤 Bebidas", "🍟 Entradas / Adicionales", etc.).
2. Para cada producto:
   - "name": Nombre completo del plato (ej: "Hamburguesa Especial", "Pizza Cuatro Estaciones").
   - "category": Nombre de la categoría a la que pertenece.
   - "description": Ingredientes, salsas o descripción de preparación.
   - "price": Precio base en Pesos Colombianos (COP) como número entero sin puntos ni símbolos (ej: 22000). Si dice '22k' o '22 mil' o '22', conviértelo a 22000. Si está en USD (ej: '$5'), conviértelo a su valor equivalente en COP (aprox 20000) o pon el valor numérico. Si el plato NO tiene precio visible, pon 0 y marca "price_pending": true.
   - "exclusions": Lista de ingredientes que el cliente podría querer excluir (ej: ["Cebolla", "Tomate", "Pepinillos", "Salsa tártara", "Mayonesa"]).
   - "modifiers": Grupos de opciones y adicionales del producto:
     * Si tiene Tamaños (Pequeña, Mediana, Grande, etc.), crea un grupo con group_name: "Tamaño", selection_type: "single", required: true y sus opciones con extra_price.
     * Si tiene Sabores, Tipos de Carne o Tipos de Pan, crea un grupo tipo "single" (ej: "Tipo de Carne": Res, Pollo, Mixta).
     * Si el menú tiene Adicionales o Extras (Tocineta, Queso extra, Papas fritas, Huevo, etc.), crea un grupo con group_name: "Adicionales", selection_type: "multiple", required: false.
     * ⚠️ MUY IMPORTANTE: Si un adicional, contorno o extra NO tiene precio visible o dice 'consultar', asígnale extra_price: 0 y marca "price_pending": true para que el sistema notifique al administrador para completarlo en persona.
3. Devuelve ÚNICAMENTE un objeto JSON válido con esta estructura:
{
  "restaurant_name": "Nombre detectado",
  "categories": [
    { "id": "hamburguesas", "name": "🍔 Hamburguesas", "icon": "🍔" }
  ],
  "products": [
    {
      "name": "Hamburguesa Especial",
      "category": "🍔 Hamburguesas",
      "description": "Carne artesanal, queso cheddar, tocineta, lechuga y tomate",
      "price": 18000,
      "price_pending": false,
      "image": "/images/burger_royale.jpg",
      "exclusions": ["Cebolla", "Tomate", "Pepinillos"],
      "modifiers": [
        {
          "group_name": "Tamaño",
          "selection_type": "single",
          "required": true,
          "options": [
            { "name": "Sencilla", "extra_price": 0 },
            { "name": "Doble", "extra_price": 6000 }
          ]
        },
        {
          "group_name": "Adicionales",
          "selection_type": "multiple",
          "required": false,
          "options": [
            { "name": "Extra Queso", "extra_price": 3000, "price_pending": false },
            { "name": "Tocineta Crujiente", "extra_price": 0, "price_pending": true }
          ]
        }
      ]
    }
  ],
  "missing_prices_count": 1
}`;

    const parts = [{ text: systemPrompt }];

    if (imageBase64) {
      let mimeType = 'image/jpeg';
      let data = imageBase64;
      if (imageBase64.includes(';base64,')) {
        const matches = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          data = matches[2];
        }
      }
      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: data
        }
      });
    }

    if (menuText) {
      parts.push({
        text: `Texto o contenido del menú a estructurar:\n${menuText}`
      });
    }

    // Attempt Gemini 2.5 Flash / 1.5 Flash models
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: parts }],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.2
        }
      })
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini API error:', errText);
      let userFriendlyError = 'Error al comunicarse con la IA de Google Gemini.';
      try {
        const parsedErr = JSON.parse(errText);
        if (parsedErr.error && parsedErr.error.message) {
          userFriendlyError = parsedErr.error.message;
        }
      } catch (e) {}
      return res.status(geminiRes.status).json({ error: userFriendlyError });
    }

    const geminiData = await geminiRes.json();
    const candidateText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      return res.status(500).json({ error: 'La IA no devolvió contenido parseable' });
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(candidateText);
    } catch (e) {
      const jsonMatch = candidateText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('La respuesta de la IA no contiene formato JSON válido');
      }
    }

    // Calculate missing prices count
    let missingPricesCount = 0;
    if (parsedResult.products && Array.isArray(parsedResult.products)) {
      parsedResult.products.forEach(p => {
        if (p.price_pending === true || !p.price || p.price <= 0) missingPricesCount++;
        if (p.modifiers && Array.isArray(p.modifiers)) {
          p.modifiers.forEach(m => {
            if (m.options && Array.isArray(m.options)) {
              m.options.forEach(opt => {
                if (opt.price_pending === true || (m.group_name?.toLowerCase().includes('adic') && (!opt.extra_price || opt.extra_price <= 0))) {
                  opt.price_pending = true;
                  missingPricesCount++;
                }
              });
            }
          });
        }
      });
    }
    parsedResult.missing_prices_count = missingPricesCount;

    res.json({ success: true, menu: parsedResult });
  } catch (err) {
    console.error('Error in /api/ai/parse-menu:', err);
    res.status(500).json({ error: err.message || 'Error al procesar el menú con IA' });
  }
});

// Get all establishments (Sanitized for client marketplace; strictly filters out disabled establishments)
app.get('/api/establishments', (req, res) => {
  const db = readDB();
  const includeDisabled = req.query.include_disabled === 'true' || req.query.all === 'true';
  const filtered = includeDisabled ? db.establishments : db.establishments.filter(e => !e.disabled);
  // Strip linkKey before sending to client for security
  const sanitized = filtered.map(({ linkKey, ...rest }) => rest);
  res.json(sanitized);
});

// Get all establishments with linkKeys (For Platform Owner only)
app.get('/api/owner/establishments', (req, res) => {
  const db = readDB();
  res.json(db.establishments);
});

// Register a new establishment
app.post('/api/establishments', (req, res) => {
  const db = readDB();
  const newEstablishment = req.body;

  // Simple validation
  if (!newEstablishment.name || !newEstablishment.category) {
    return res.status(400).json({ error: 'Name and category are required' });
  }

  // Generate unique ID
  const id = newEstablishment.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
  newEstablishment.id = id;
  
  // Set default products if none provided
  if (!newEstablishment.products || newEstablishment.products.length === 0) {
    newEstablishment.products = [];
  }

  // Save/generate the unique administration key
  if (newEstablishment.linkKey) {
    const keyCand = newEstablishment.linkKey.trim().toUpperCase();
    const conflict = db.establishments.find(e => e.linkKey === keyCand);
    if (conflict) {
      return res.status(400).json({ error: `La clave "${keyCand}" ya está en uso por "${conflict.name}". Debe ser única.` });
    }
    newEstablishment.linkKey = keyCand;
  } else {
    let genKey = '';
    do {
      genKey = Math.random().toString(36).substring(2, 8).toUpperCase();
    } while (db.establishments.some(e => e.linkKey === genKey));
    newEstablishment.linkKey = genKey;
  }
  newEstablishment.location = newEstablishment.location || 'San Antonio';
  newEstablishment.open_time = newEstablishment.open_time || '17:00';
  newEstablishment.close_time = newEstablishment.close_time || '00:00';

  if (newEstablishment.latitude && newEstablishment.longitude) {
    const storeGpsMap = readStoreGps();
    storeGpsMap[id] = { latitude: parseFloat(newEstablishment.latitude), longitude: parseFloat(newEstablishment.longitude) };
    writeStoreGps(storeGpsMap);
  }

  db.establishments.push(newEstablishment);
  writeDB(db);

  // Return the establishment including linkKey on initial creation so the registrar knows it
  res.status(201).json(newEstablishment);
});

// Get all orders (or filter by email, userId, phone)
app.get('/api/orders', (req, res) => {
  const db = readDB();
  const { email, userId, phone } = req.query;
  if (email || userId || phone) {
    const normEmail = email ? String(email).toLowerCase().trim() : null;
    const normPhone = phone ? String(phone).replace(/\D/g, '') : null;
    const filtered = (db.orders || []).filter(o => {
      if (normEmail && o.customerEmail && String(o.customerEmail).toLowerCase().trim() === normEmail) return true;
      if (userId && o.userId && String(o.userId) === String(userId)) return true;
      if (normPhone && o.deliveryDetails?.phone && String(o.deliveryDetails.phone).replace(/\D/g, '') === normPhone) return true;
      return false;
    });
    return res.json(filtered);
  }
  res.json(db.orders);
});

// WebSocket connection handling
// We store active merchant connections grouped by establishment ID
// Map: establishmentId -> Set of WS Client connections
const merchantConnections = new Map();

wss.on('connection', (ws) => {
  let registeredId = null;

  console.log('New WebSocket connection established');

  ws.on('message', (messageStr) => {
    try {
      const message = JSON.parse(messageStr);
      console.log('WS Message Received:', message);

      if (message.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG' }));
        return;
      }

      if (message.type === 'REGISTER_MERCHANT') {
        const { establishmentId, key } = message;
        
        // Authenticate merchant using their linking key OR master key
        const db = readDB();
        const est = db.establishments.find(e => String(e.id).trim() === String(establishmentId).trim());
        
        const cleanKey = String(key || '').trim().toUpperCase();
        const isMaster = cleanKey === '0424' || cleanKey === 'DUEÑO123' || cleanKey === 'ADMIN123' || cleanKey === 'MASTER_OWNER_2026';
        
        if (!est || (!isMaster && est.linkKey !== key)) {
          ws.send(JSON.stringify({ 
            type: 'AUTH_ERROR', 
            message: 'Clave de administración incorrecta. No tienes permisos para gestionar este comercio.' 
          }));
          return;
        }

        registeredId = establishmentId;
        
        if (!merchantConnections.has(establishmentId)) {
          merchantConnections.set(establishmentId, new Set());
        }
        merchantConnections.get(establishmentId).add(ws);
        console.log(`Merchant registered and authorized for establishment: ${establishmentId} (Master: ${isMaster})`);
        
        // Send initial orders to the registered merchant
        const merchantOrders = db.orders.filter(order => String(order.establishmentId).trim() === String(establishmentId).trim());
        ws.send(JSON.stringify({ type: 'INITIAL_ORDERS', orders: merchantOrders }));
      }

      if (message.type === 'UPDATE_STATUS') {
        const { orderId, status, reason, paymentStatus, driver } = message;
        const db = readDB();
        const order = db.orders.find(o => o.id === orderId);
        
        if (order) {
          if (status) order.status = status;
          if (reason) order.cancelReason = reason;
          if (paymentStatus) order.paymentStatus = paymentStatus;
          if (driver) order.driver = driver;
          order.updatedAt = new Date().toISOString();
          writeDB(db);
          console.log(`Order ${orderId} updated: status=${status || 'unchanged'}, reason=${reason || 'none'}, paymentStatus=${paymentStatus || 'unchanged'}, driver=${driver ? driver.name : 'unchanged'}`);

          // Broadcast status update to all connected clients for this establishment
          const estId = order.establishmentId;
          broadcastToMerchant(estId, {
            type: 'ORDER_UPDATED',
            orderId,
            status: order.status,
            order
          });
        }
      }
    } catch (err) {
      console.error('Error handling WS message:', err);
    }
  });

  ws.on('close', () => {
    console.log('WS Connection closed');
    if (registeredId && merchantConnections.has(registeredId)) {
      const connections = merchantConnections.get(registeredId);
      connections.delete(ws);
      if (connections.size === 0) {
        merchantConnections.delete(registeredId);
      }
      console.log(`Deregistered connection for merchant: ${registeredId}`);
    }
  });
});

// Helper function to broadcast message to all connected WS clients of a specific merchant
function broadcastToMerchant(establishmentId, data) {
  const targetId = String(establishmentId).trim();
  merchantConnections.forEach((clients, storedId) => {
    if (String(storedId).trim() === targetId) {
      const messageStr = JSON.stringify(data);
      clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(messageStr);
        }
      });
    }
  });
}

// HTTP endpoint to update order status (fallback for WebSocket)
app.put('/api/orders/:id/status', (req, res) => {
  const orderId = req.params.id;
  const { status, reason, paymentStatus, driver } = req.body;
  const db = readDB();
  const order = db.orders.find(o => o.id === orderId);

  if (!order) {
    return res.status(404).json({ success: false, error: 'Pedido no encontrado' });
  }

  if (status) order.status = status;
  if (reason) order.cancelReason = reason;
  if (paymentStatus) order.paymentStatus = paymentStatus;
  if (driver) order.driver = driver;
  order.updatedAt = new Date().toISOString();
  writeDB(db);

  broadcastToMerchant(order.establishmentId, {
    type: 'ORDER_UPDATED',
    orderId,
    status: order.status,
    order
  });

  // Also broadcast to connected customer clients and dashboard
  const updatePayload = JSON.stringify({
    type: 'ORDER_UPDATED',
    orderId,
    status: order.status,
    order
  });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(updatePayload);
    }
  });

  res.json({ success: true, order });
});

// API configuration endpoint for Supabase
app.get('/api/config/supabase', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || 'https://bvdwxgfixirisqaavskj.supabase.co',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'sb_publishable_8n4-tEnAx5J98ZMh_QwZiw_Qcncleqx'
  });
});

// Helper function to broadcast new ride or delivery order to driver group chat
function addOrderToDriverChat(order) {
  if (!order) return null;
  const isRide = order.orderType === 'ride' || order.serviceType === 'ride';
  const hasDelivery = Boolean(order.deliveryDetails && (order.deliveryDetails.address || order.deliveryDetails.destination));
  if (!isRide && !hasDelivery) return null;

  const dDetails = order.deliveryDetails || {};
  const origin = isRide ? (dDetails.origin || 'Ubicación GPS') : (order.establishmentName || 'Restaurante');
  const destination = isRide ? (dDetails.destination || dDetails.address || 'Destino') : (dDetails.address || 'Dirección de Entrega');
  const km = dDetails.distanceKm || (isRide ? 1.5 : 1);
  
  let vType = order.vehicleType || (isRide ? 'moto' : 'moto');
  let vLabel = 'Moto Taxi 🛵';
  if (vType === 'auto') vLabel = 'Auto Estándar 🚗';
  else if (vType === 'lujo') vLabel = 'Auto de Lujo ✨';
  else if (!isRide) vLabel = 'Delivery Encomienda 📦';

  let fareCop = 0;
  if (isRide) {
    fareCop = Math.round(order.total < 1000 ? order.total * 1000 : order.total);
  } else {
    const fee = parseFloat(dDetails.deliveryFee || 0);
    fareCop = Math.round(fee > 0 ? (fee < 100 ? fee * 4000 : fee) : 4000);
  }
  const fareUsd = (fareCop / 4000).toFixed(2);
  const fareBs = (fareCop / 100).toFixed(2);

  const chatMsg = {
    id: 'chat-' + order.id,
    orderId: order.id,
    type: 'service_request',
    serviceType: isRide ? 'ride' : 'delivery',
    vehicleType: vType,
    vehicleLabel: vLabel,
    senderName: isRide ? 'Central PediGochos Móvil' : (order.establishmentName || 'Central'),
    senderRole: 'system',
    customerName: order.customerName || 'Cliente',
    customerPhone: order.customerPhone || dDetails.phone || '',
    origin: origin,
    originLat: dDetails.originLat || dDetails.latitude || null,
    originLng: dDetails.originLng || dDetails.longitude || null,
    destination: destination,
    destLat: dDetails.destLat || null,
    destLng: dDetails.destLng || null,
    distanceKm: km,
    fare: fareCop,
    fareUsd: fareUsd,
    fareBs: fareBs,
    fareFormatted: `$${fareCop.toLocaleString('de-DE')} COP ($${fareUsd} USD)`,
    status: order.status === 'En Camino' ? 'Tomado' : (order.status === 'Entregado' ? 'Entregado' : 'Disponible'),
    takenBy: order.driver ? (order.driver.name || 'Repartidor') : null,
    notes: dDetails.notes || '',
    text: isRide
      ? `🚖 ¡NUEVA SOLICITUD DE VEHÍCULO!\n• Tipo: ${vLabel}\n• Tarifa: $${fareCop.toLocaleString('de-DE')} COP\n• Origen: ${origin}\n• Destino: ${destination}\n• Distancia: ${km} km`
      : `📦 ¡NUEVA ENCOMIENDA DISPONIBLE!\n• Local: ${order.establishmentName}\n• Ganancia Delivery: $${fareUsd} USD\n• Destino: ${destination}`,
    timestamp: order.createdAt || new Date().toISOString()
  };

  const msgs = readDriverChat();
  const existingIdx = msgs.findIndex(m => m.orderId === order.id);
  if (existingIdx !== -1) {
    msgs[existingIdx] = { ...msgs[existingIdx], ...chatMsg };
  } else {
    msgs.push(chatMsg);
  }
  writeDriverChat(msgs);

  const chatPayload = JSON.stringify({
    type: 'DRIVER_CHAT_MESSAGE',
    message: chatMsg
  });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(chatPayload);
    }
  });
  return chatMsg;
}

// REST API for placing orders (also triggers WebSocket broadcast)
app.post('/api/orders', (req, res) => {
  const db = readDB();
  const orderDetails = req.body;

  const isRide = orderDetails.orderType === 'ride' || orderDetails.serviceType === 'ride';
  const isCauchera = orderDetails.orderType === 'cauchera' || orderDetails.serviceType === 'cauchera' || orderDetails.establishmentId === 'montallantas-el-cachu';
  const isSpecial = isRide || isCauchera;

  if (!isSpecial && (!orderDetails.establishmentId || !orderDetails.items || orderDetails.items.length === 0)) {
    return res.status(400).json({ error: 'EstablishmentId and items are required' });
  }

  if (!isSpecial) {
    const targetEst = db.establishments.find(e => e.id === orderDetails.establishmentId);
    if (targetEst && !isEstablishmentOpen(targetEst)) {
      return res.status(400).json({ error: `El establecimiento "${targetEst.name}" se encuentra cerrado en este momento. Horario: ${targetEst.open_time} a ${targetEst.close_time}.` });
    }
  }

  // Extract user identity
  const customerEmail = orderDetails.customerEmail || orderDetails.userEmail || (orderDetails.deliveryDetails && orderDetails.deliveryDetails.customerEmail) || null;
  const userId = orderDetails.userId || (orderDetails.deliveryDetails && orderDetails.deliveryDetails.userId) || null;

  const prefix = isCauchera ? 'cauchera-' : (isRide ? 'movil-' : 'ord-');
  const defaultEstId = isCauchera ? 'montallantas-el-cachu' : (isRide ? 'pedigochos-movil' : '');
  const defaultEstName = isCauchera ? 'Montallantas El Cachu 24H' : (isRide ? 'PediGochos Móvil' : '');

  // Create new order object
  const order = {
    id: prefix + Date.now() + '-' + Math.floor(Math.random() * 1000),
    establishmentId: orderDetails.establishmentId || defaultEstId,
    establishmentName: orderDetails.establishmentName || defaultEstName,
    items: orderDetails.items || [],
    total: orderDetails.total || 0,
    orderType: isCauchera ? 'cauchera' : (isRide ? 'ride' : (orderDetails.orderType || 'delivery')),
    serviceType: isCauchera ? 'cauchera' : (isRide ? 'ride' : 'food'),
    vehicleType: orderDetails.vehicleType || (isRide ? 'moto' : null),
    serviceDetails: orderDetails.serviceDetails || null,
    nightSurcharge: orderDetails.nightSurcharge || 0,
    paymentMethod: orderDetails.paymentMethod || 'Efectivo', // 'Efectivo' or 'Transferencia'
    paymentNotes: orderDetails.paymentNotes || '',
    paymentReceiptUrl: orderDetails.paymentReceiptUrl || null,
    customerName: orderDetails.customerName,
    customerPhone: orderDetails.customerPhone || (orderDetails.deliveryDetails && orderDetails.deliveryDetails.phone) || null,
    customerEmail: customerEmail ? String(customerEmail).toLowerCase().trim() : null,
    userId: userId ? String(userId) : null,
    tableNumber: orderDetails.tableNumber || null,
    deliveryDetails: orderDetails.deliveryDetails ? {
      ...orderDetails.deliveryDetails,
      customerEmail: customerEmail ? String(customerEmail).toLowerCase().trim() : null,
      userId: userId ? String(userId) : null
    } : null,
    status: 'Pendiente', // 'Pendiente', 'Preparando', 'Listo', 'En Camino', 'Entregado', 'Cancelado'
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.orders.push(order);
  writeDB(db);

  console.log(`New order created: ${order.id} for establishment: ${order.establishmentId} (User: ${order.customerEmail || 'Guest'})`);

  // Automatically broadcast to Driver Group Chat if ride request or delivery
  try {
    addOrderToDriverChat(order);
  } catch (err) {
    console.error('Error adding order to driver chat:', err);
  }

  // Broadcast to all connected clients of this establishment in real-time
  broadcastToMerchant(order.establishmentId, {
    type: 'NEW_ORDER',
    order: order
  });

  // Broadcast to all connected clients (Admin/Owner dashboard)
  const globalPayload = JSON.stringify({
    type: 'GLOBAL_NEW_ORDER',
    order: order
  });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(globalPayload);
    }
  });

  res.status(201).json(order);
});

// Sync and link user orders (e.g. for Google OAuth sessions across devices)
app.post('/api/user/sync-orders', (req, res) => {
  const { email, userId, localOrderIds } = req.body;
  if (!email && !userId) {
    return res.status(400).json({ error: 'Email or userId is required' });
  }

  const db = readDB();
  const normEmail = email ? String(email).toLowerCase().trim() : null;
  let dbChanged = false;

  // 1. Link any local orders submitted before logging in
  if (Array.isArray(localOrderIds) && localOrderIds.length > 0) {
    const idSet = new Set(localOrderIds.map(id => String(id)));
    (db.orders || []).forEach(o => {
      if (idSet.has(String(o.id))) {
        if (normEmail && (!o.customerEmail || o.customerEmail !== normEmail)) {
          o.customerEmail = normEmail;
          if (o.deliveryDetails) o.deliveryDetails.customerEmail = normEmail;
          dbChanged = true;
        }
        if (userId && (!o.userId || o.userId !== String(userId))) {
          o.userId = String(userId);
          if (o.deliveryDetails) o.deliveryDetails.userId = String(userId);
          dbChanged = true;
        }
      }
    });
  }

  if (dbChanged) {
    writeDB(db);
  }

  // 2. Return all orders matching this user
  const userOrders = (db.orders || []).filter(o => {
    if (normEmail && o.customerEmail && String(o.customerEmail).toLowerCase().trim() === normEmail) return true;
    if (normEmail && o.deliveryDetails?.customerEmail && String(o.deliveryDetails.customerEmail).toLowerCase().trim() === normEmail) return true;
    if (userId && o.userId && String(o.userId) === String(userId)) return true;
    if (userId && o.deliveryDetails?.userId && String(o.deliveryDetails.userId) === String(userId)) return true;
    return false;
  });

  // Sort descending by date (most recent first)
  userOrders.sort((a, b) => new Date(b.createdAt || b.timestamp || 0) - new Date(a.createdAt || a.timestamp || 0));

  res.json({ success: true, orders: userOrders });
});

// PUT to update establishment details (authorized by linkKey or isOwner flag)
app.put('/api/establishments/:id', (req, res) => {
  const { id } = req.params;
  const { linkKey, products, name, description, logo, bannerType, banner, delivery_fee, themeColor, isOwner, logoImage, tables } = req.body;
  
  const db = readDB();
  const estIndex = db.establishments.findIndex(e => e.id === id);
  if (estIndex === -1) {
    return res.status(404).json({ error: 'Establecimiento no encontrado' });
  }
  
  const est = db.establishments[estIndex];
  if (!isOwner && est.linkKey !== linkKey) {
    return res.status(401).json({ error: 'Clave de vinculación incorrecta' });
  }
  
  if (products) {
    est.products = products;
  }
  if (name) {
    est.name = name;
  }
  if (description) {
    est.description = description;
  }
  if (logo) {
    est.logo = logo;
  }
  if (bannerType) {
    est.bannerType = bannerType;
  }
  if (banner) {
    est.banner = banner;
  }
  if (delivery_fee !== undefined) {
    est.delivery_fee = parseFloat(delivery_fee);
  }
  if (themeColor) {
    est.themeColor = themeColor;
  }
  if (logoImage !== undefined) {
    est.logoImage = logoImage;
  }
  if (tables !== undefined) {
    est.tables = tables;
  }
  if (req.body.pizza_crusts !== undefined) {
    est.pizza_crusts = req.body.pizza_crusts;
  }
  if (req.body.prep_time !== undefined) {
    est.prep_time = req.body.prep_time ? parseInt(req.body.prep_time) : null;
  }
  if (req.body.delivery_time !== undefined) {
    est.delivery_time = req.body.delivery_time ? parseInt(req.body.delivery_time) : null;
  }
  if (req.body.location) {
    est.location = req.body.location;
  }
  if (req.body.latitude !== undefined || req.body.location_lat !== undefined) {
    const latVal = req.body.latitude !== undefined ? req.body.latitude : req.body.location_lat;
    const parsedLat = (latVal !== null && latVal !== '') ? parseFloat(latVal) : null;
    est.latitude = parsedLat;
    est.location_lat = parsedLat;
  }
  if (req.body.longitude !== undefined || req.body.location_lng !== undefined) {
    const lngVal = req.body.longitude !== undefined ? req.body.longitude : req.body.location_lng;
    const parsedLng = (lngVal !== null && lngVal !== '') ? parseFloat(lngVal) : null;
    est.longitude = parsedLng;
    est.location_lng = parsedLng;
  }
  const storeGpsMap = readStoreGps();
  const gpsDeletedMap = readGpsDeleted();
  if (est.latitude && est.longitude) {
    storeGpsMap[id] = { latitude: est.latitude, longitude: est.longitude };
    writeStoreGps(storeGpsMap);
    // If GPS is being re-added, remove from deleted blacklist
    delete gpsDeletedMap[id];
    writeGpsDeleted(gpsDeletedMap);
    console.log(`📍 Establishment [${id}] (${est.name}) GPS locked to: ${est.latitude}, ${est.longitude}`);
  } else if (req.body.latitude === null || req.body.location_lat === null) {
    delete storeGpsMap[id];
    writeStoreGps(storeGpsMap);
    // Add to deleted blacklist so Postgres/Supabase syncs never restore GPS
    gpsDeletedMap[id] = true;
    writeGpsDeleted(gpsDeletedMap);
    console.log(`🗑️ Establishment [${id}] (${est.name}) GPS cleared and blacklisted from restore.`);
  }
  if (req.body.working_days !== undefined) {
    est.working_days = Array.isArray(req.body.working_days) ? req.body.working_days : [];
  }
  if (req.body.open_time !== undefined) {
    est.open_time = req.body.open_time;
  }
  if (req.body.close_time !== undefined) {
    est.close_time = req.body.close_time;
  }
  if (req.body.isHighTraffic !== undefined) {
    est.isHighTraffic = Boolean(req.body.isHighTraffic);
  }
  if (req.body.disabled !== undefined) {
    const isDisabled = Boolean(req.body.disabled);
    est.disabled = isDisabled;
    const disabledMap = readDisabledStores();
    disabledMap[id] = isDisabled;
    writeDisabledStores(disabledMap);
    console.log(`🔒 Establishment [${id}] (${est.name}) disabled state updated to: ${isDisabled}`);
  }
  if (req.body.extraPrepTime !== undefined) {
    est.extraPrepTime = req.body.extraPrepTime ? parseInt(req.body.extraPrepTime) : 20;
  }
  if (req.body.newLinkKey || req.body.linkKey) {
    const candidateKey = String(req.body.newLinkKey || req.body.linkKey).trim().toUpperCase();
    if (candidateKey) {
      const conflict = db.establishments.find(e => e.id !== id && e.linkKey === candidateKey);
      if (conflict) {
        return res.status(400).json({ error: `La clave "${candidateKey}" ya está en uso por "${conflict.name}". Debe ser única.` });
      }
      est.linkKey = candidateKey;
    }
  }
  
  writeDB(db);
  saveChangesToCloud().catch(err => console.error('Cloud backup error on establishment update:', err));

  // Broadcast WebSocket update if connected clients exist
  const updatePayload = JSON.stringify({
    type: 'ESTABLISHMENT_UPDATED',
    establishment: est
  });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(updatePayload);
    }
  });

  res.json({ success: true, establishment: est });
});

// DELETE to remove an establishment (authorized by code 0424)
app.delete('/api/establishments/:id', async (req, res) => {
  const { id } = req.params;
  const { code } = req.query;
  
  if (code !== '0424') {
    return res.status(403).json({ error: 'Código maestro incorrecto' });
  }
  
  const db = readDB();
  const estIndex = db.establishments.findIndex(e => e.id === id);
  if (estIndex === -1) {
    return res.status(404).json({ error: 'Establecimiento no encontrado' });
  }
  
  db.establishments.splice(estIndex, 1);
  writeDB(db);

  // Permanently delete from Supabase PostgreSQL cloud table
  await deleteEstablishmentFromPostgres(id);

  res.json({ success: true });
});

// POST to reset orders/billing history for an establishment (authorized by code 0424)
app.post('/api/establishments/:id/orders/reset', (req, res) => {
  const { id } = req.params;
  const { code } = req.query;

  if (code !== '0424') {
    return res.status(403).json({ error: 'Código maestro incorrecto' });
  }

  const db = readDB();
  const estExists = db.establishments.some(e => e.id === id);
  if (!estExists) {
    return res.status(404).json({ error: 'Establecimiento no encontrado' });
  }

  // Filter out any orders belonging to this establishment
  db.orders = db.orders.filter(o => o.establishmentId !== id);
  writeDB(db);
  res.json({ success: true });
});

// POST toggle product stock (Agotado por hoy)
app.post('/api/establishments/:id/toggle-product-stock', (req, res) => {
  const { id } = req.params;
  const { productId, outOfStock } = req.body;
  const db = readDB();
  const est = db.establishments.find(e => e.id === id);
  if (!est) return res.status(404).json({ error: 'Comercio no encontrado' });

  const prod = (est.products || []).find(p => p.id === productId);
  if (!prod) return res.status(404).json({ error: 'Producto no encontrado' });

  prod.out_of_stock = Boolean(outOfStock);
  prod.agotado = Boolean(outOfStock);

  writeDB(db);
  saveChangesToCloud(db);

  if (typeof broadcastWS === 'function') {
    broadcastWS({ type: 'product_stock_updated', establishmentId: id, productId, outOfStock: Boolean(outOfStock) });
  }

  res.json({ success: true, productId, outOfStock: Boolean(outOfStock) });
});

// GET & POST Multi-Currency Exchange Rates
app.get('/api/settings/exchange-rates', (req, res) => {
  const db = readDB();
  const rates = db.settings?.exchange_rates || {
    cop_per_usd: 4000,
    cop_per_bs: 100,
    bs_per_usd: 40
  };
  res.json(rates);
});

app.post('/api/settings/exchange-rates', (req, res) => {
  const { cop_per_usd, cop_per_bs, bs_per_usd } = req.body;
  const db = readDB();
  if (!db.settings) db.settings = {};
  db.settings.exchange_rates = {
    cop_per_usd: parseFloat(cop_per_usd) || 4000,
    cop_per_bs: parseFloat(cop_per_bs) || 100,
    bs_per_usd: parseFloat(bs_per_usd) || 40
  };
  writeDB(db);
  saveChangesToCloud(db);

  if (typeof broadcastWS === 'function') {
    broadcastWS({ type: 'exchange_rates_updated', rates: db.settings.exchange_rates });
  }

  res.json({ success: true, rates: db.settings.exchange_rates });
});

// ==========================================
// PAYMENT METHODS & RECEIPT UPLOAD ENDPOINTS
// ==========================================

// POST Upload Payment Receipt Image (Compressed base64 or file payload)
app.post('/api/upload-payment-receipt', (req, res) => {
  try {
    const { imageBase64, fileName } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'No image payload provided' });
    }

    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer;
    let extension = 'jpg';

    if (matches && matches.length === 3) {
      const mime = matches[1];
      if (mime.includes('png')) extension = 'png';
      else if (mime.includes('webp')) extension = 'webp';
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(imageBase64, 'base64');
    }

    const safeFileName = `rec_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}.${extension}`;
    const uploadDir = path.join(__dirname, 'public/uploads/receipts');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, safeFileName);
    fs.writeFileSync(filePath, buffer);

    const relativeUrl = `/uploads/receipts/${safeFileName}`;
    res.json({ success: true, url: relativeUrl });
  } catch (err) {
    console.error('Error in /api/upload-payment-receipt:', err);
    res.status(500).json({ error: 'Error guardando comprobante de pago' });
  }
});

// GET payment methods for an establishment (with global defaults fallback)
app.get('/api/establishments/:id/payment-methods', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const est = (db.establishments || []).find(e => e.id === id);

  if (est && Array.isArray(est.payment_methods)) {
    return res.json({ establishmentId: id, paymentMethods: est.payment_methods });
  }

  const globalMethods = db.settings?.payment_methods || [];
  res.json({ establishmentId: id, paymentMethods: globalMethods });
});

// POST update payment methods for an establishment
app.post('/api/establishments/:id/payment-methods', (req, res) => {
  const { id } = req.params;
  const { paymentMethods } = req.body;
  if (!Array.isArray(paymentMethods)) {
    return res.status(400).json({ error: 'paymentMethods array is required' });
  }

  const db = readDB();
  const est = (db.establishments || []).find(e => e.id === id);
  if (!est) return res.status(404).json({ error: 'Establecimiento no encontrado' });

  est.payment_methods = paymentMethods;
  writeDB(db);
  saveChangesToCloud(db);

  if (typeof broadcastWS === 'function') {
    broadcastWS({ type: 'payment_methods_updated', establishmentId: id, paymentMethods });
  }

  res.json({ success: true, paymentMethods });
});

// GET & POST global payment methods
app.get('/api/settings/payment-methods', (req, res) => {
  const db = readDB();
  const methods = db.settings?.payment_methods || [];
  res.json(methods);
});

app.post('/api/settings/payment-methods', (req, res) => {
  const { paymentMethods } = req.body;
  if (!Array.isArray(paymentMethods)) {
    return res.status(400).json({ error: 'paymentMethods array is required' });
  }
  const db = readDB();
  if (!db.settings) db.settings = {};
  db.settings.payment_methods = paymentMethods;
  writeDB(db);
  saveChangesToCloud(db);
  res.json({ success: true, paymentMethods });
});

// ==========================================
// REVIEWS & RATINGS (5-STAR SYSTEM) ENDPOINTS
// ==========================================

// GET reviews and average rating for an establishment
app.get('/api/establishments/:id/reviews', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const reviews = (db.reviews || []).filter(r => r.establishmentId === id);
  
  let avgRating = 5.0;
  if (reviews.length > 0) {
    const sum = reviews.reduce((acc, r) => acc + (parseFloat(r.rating) || 5), 0);
    avgRating = parseFloat((sum / reviews.length).toFixed(1));
  }

  res.json({
    establishmentId: id,
    avgRating: avgRating,
    totalReviews: reviews.length,
    reviews: reviews
  });
});

// POST submit a new review
app.post('/api/reviews', (req, res) => {
  const { orderId, establishmentId, customerName, rating, comment } = req.body;
  if (!establishmentId || !rating) {
    return res.status(400).json({ error: 'EstablishmentId and rating are required' });
  }

  const db = readDB();
  if (!db.reviews) db.reviews = [];

  // Prevent duplicate reviews for same order
  if (orderId && db.reviews.some(r => r.orderId === orderId)) {
    return res.status(400).json({ error: 'Ya has calificado este pedido.' });
  }

  const newReview = {
    id: 'rev-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    orderId: orderId || null,
    establishmentId,
    customerName: customerName || 'Cliente de Pedi Gochos',
    rating: Math.min(5, Math.max(1, parseFloat(rating))),
    comment: comment || '',
    createdAt: new Date().toISOString()
  };

  db.reviews.push(newReview);

  // Update establishment rating cache if establishment exists
  const est = db.establishments.find(e => e.id === establishmentId);
  if (est) {
    const estReviews = db.reviews.filter(r => r.establishmentId === establishmentId);
    const sum = estReviews.reduce((acc, r) => acc + r.rating, 0);
    est.avgRating = parseFloat((sum / estReviews.length).toFixed(1));
    est.totalReviews = estReviews.length;
  }

  writeDB(db);
  console.log(`⭐ New review added for establishment ${establishmentId}: ${newReview.rating} stars`);

  res.status(201).json(newReview);
});

// ==========================================
// DRIVER APP (REPARTIDORES) ENDPOINTS
// ==========================================

// GET all drivers (admin view)
app.get('/api/drivers', (req, res) => {
  const db = readDB();
  if (!db.drivers || db.drivers.length === 0) {
    db.drivers = [
      {
        id: 'drv-central-1',
        name: 'Central Gocho',
        phone: '+573227949751',
        linkKey: 'GOCHO-8821',
        vehicleType: 'Moto 🛵',
        status: 'Disponible',
        totalDeliveries: 0,
        latitude: 7.8131,
        longitude: -72.4439,
        lastActive: new Date().toISOString()
      }
    ];
    writeDB(db);
  }
  res.json(db.drivers || []);
});

// GET next available driver with fair round-robin rotation
app.get('/api/drivers/next-available', (req, res) => {
  const db = readDB();
  if (!db.drivers || db.drivers.length === 0) {
    db.drivers = [
      {
        id: 'drv-central-1',
        name: 'Central Gocho',
        phone: '+573227949751',
        linkKey: 'GOCHO-8821',
        vehicleType: 'Moto 🛵',
        status: 'Disponible',
        totalDeliveries: 0,
        latitude: 7.8131,
        longitude: -72.4439,
        lastActive: new Date().toISOString()
      }
    ];
    writeDB(db);
  }
  const drivers = db.drivers || [];

  // Prefer drivers with status 'Disponible', otherwise all registered drivers
  let available = drivers.filter(d => d.status === 'Disponible');
  if (available.length === 0) {
    available = drivers; // fallback to all drivers for fair rotation
  }

  // Sort by lastDispatchedAt ascending (oldest timestamp first = round robin fair turn)
  available.sort((a, b) => {
    const timeA = a.lastDispatchedAt ? new Date(a.lastDispatchedAt).getTime() : 0;
    const timeB = b.lastDispatchedAt ? new Date(b.lastDispatchedAt).getTime() : 0;
    return timeA - timeB;
  });

  const nextDriver = available[0];
  nextDriver.lastDispatchedAt = new Date().toISOString();
  nextDriver.totalDeliveries = (nextDriver.totalDeliveries || 0) + 1;
  writeDB(db);

  console.log(`🚴 Rotated next driver: ${nextDriver.name} (${nextDriver.phone}) - Total Deliveries: ${nextDriver.totalDeliveries}`);
  res.json({ success: true, driver: nextDriver });
});

// POST register or update driver (admin view)
app.post('/api/drivers/register', (req, res) => {
  const { name, phone, linkKey, vehicleType } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'Teléfono es obligatorio' });
  }

  const db = readDB();
  if (!db.drivers) db.drivers = [];

  const cleanPhone = String(phone).replace(/\D/g, '');
  const cleanKey = String(linkKey || '').trim().toUpperCase();

  const existingIndex = db.drivers.findIndex(d => {
    const dPhoneClean = String(d.phone || '').replace(/\D/g, '');
    return (dPhoneClean && (dPhoneClean === cleanPhone || dPhoneClean.endsWith(cleanPhone) || cleanPhone.endsWith(dPhoneClean))) || (d.linkKey && d.linkKey.toUpperCase() === cleanKey);
  });

  const driverData = {
    id: existingIndex !== -1 ? db.drivers[existingIndex].id : 'drv-' + Date.now(),
    name: name || (existingIndex !== -1 ? db.drivers[existingIndex].name : 'Repartidor ' + cleanPhone.slice(-4)),
    phone: phone,
    linkKey: cleanKey || (existingIndex !== -1 ? db.drivers[existingIndex].linkKey : 'GOCHO-' + Math.floor(1000 + Math.random() * 9000)),
    vehicleType: vehicleType || (existingIndex !== -1 ? db.drivers[existingIndex].vehicleType : 'Moto 🛵'),
    status: 'Disponible', // 'Disponible', 'En Camino', 'Fuera de Servicio'
    totalDeliveries: existingIndex !== -1 ? db.drivers[existingIndex].totalDeliveries || 0 : 0,
    latitude: existingIndex !== -1 ? db.drivers[existingIndex].latitude : null,
    longitude: existingIndex !== -1 ? db.drivers[existingIndex].longitude : null,
    lastActive: new Date().toISOString()
  };

  if (existingIndex !== -1) {
    db.drivers[existingIndex] = driverData;
  } else {
    db.drivers.push(driverData);
  }

  writeDB(db);
  res.status(201).json(driverData);
});

// POST driver login (yoxman / 12345@ and registered drivers)
app.post('/api/driver/login', (req, res) => {
  const { username, password, phone, linkKey } = req.body;
  const userClean = String(username || phone || '').trim().toLowerCase();
  const passClean = String(password || linkKey || '').trim();

  const db = readDB();
  if (!db.drivers) db.drivers = [];

  // Account requirement: yoxman / 12345@
  if (userClean === 'yoxman' && passClean === '12345@') {
    let yoxmanDriver = db.drivers.find(d => d.username === 'yoxman' || d.id === 'drv-yoxman' || (d.name && d.name.toLowerCase() === 'yoxman'));
    if (!yoxmanDriver) {
      yoxmanDriver = {
        id: 'drv-yoxman',
        username: 'yoxman',
        name: 'Yoxman',
        phone: 'yoxman',
        linkKey: '12345@',
        vehicleType: 'Moto 🛵',
        status: 'Disponible',
        isLockedName: true,
        totalDeliveries: 0,
        lastActive: new Date().toISOString()
      };
      db.drivers.push(yoxmanDriver);
      writeDB(db);
    }
    return res.json({ success: true, driver: yoxmanDriver });
  }

  // Check matching driver in db.drivers
  const match = db.drivers.find(d => {
    const dUser = String(d.username || d.phone || d.name || '').trim().toLowerCase();
    const dKey = String(d.linkKey || d.password || '').trim();
    return dUser === userClean && (dKey === passClean || dKey.toUpperCase() === passClean.toUpperCase());
  });

  if (match) {
    return res.json({ success: true, driver: match });
  }

  // Fallback for default Central driver: +573227949751 with GOCHO-8821
  if ((userClean === '+573227949751' || userClean === '573227949751' || userClean === 'central') && passClean.toUpperCase() === 'GOCHO-8821') {
    return res.json({
      success: true,
      driver: {
        id: 'drv-central-1',
        name: 'Central Gocho',
        phone: '+573227949751',
        linkKey: 'GOCHO-8821',
        vehicleType: 'Moto 🛵',
        status: 'Disponible'
      }
    });
  }

  res.status(401).json({ success: false, error: 'Usuario o clave de repartidor incorrecta.' });
});

// GET group chat messages for drivers
app.get('/api/driver/chat', (req, res) => {
  const db = readDB();
  const msgs = readDriverChat();

  // Ensure all recent active/pending orders and rides are represented in the group chat
  const recentOrders = (db.orders || []).filter(o => {
    const isRide = o.orderType === 'ride' || o.serviceType === 'ride';
    const hasDelivery = Boolean(o.deliveryDetails && (o.deliveryDetails.address || o.deliveryDetails.destination));
    return (isRide || hasDelivery) && (o.status === 'Pendiente' || o.status === 'Listo' || o.status === 'Preparando' || o.status === 'En Camino');
  });

  let changed = false;
  recentOrders.forEach(o => {
    if (!msgs.some(m => m.orderId === o.id)) {
      addOrderToDriverChat(o);
      changed = true;
    }
  });

  const finalMsgs = changed ? readDriverChat() : msgs;
  finalMsgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  res.json(finalMsgs);
});

// POST send message into driver group chat
app.post('/api/driver/chat', (req, res) => {
  const { senderName, senderPhone, text, senderRole } = req.body;
  if (!text || !String(text).trim()) {
    return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
  }

  const role = senderRole === 'owner' ? 'owner' : 'driver';
  const name = senderName || (role === 'owner' ? '👑 Dueño / Central' : 'Repartidor');

  const msgs = readDriverChat();
  const newMsg = {
    id: 'msg-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    type: 'chat_message',
    senderName: name,
    senderPhone: senderPhone || '',
    senderRole: role,
    text: String(text).trim(),
    timestamp: new Date().toISOString()
  };

  msgs.push(newMsg);
  writeDriverChat(msgs);

  const chatPayload = JSON.stringify({
    type: 'DRIVER_CHAT_MESSAGE',
    message: newMsg
  });
  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) c.send(chatPayload);
  });

  res.status(201).json(newMsg);
});

// GET orders ready for drivers (includes food deliveries and ride requests)
app.get('/api/driver/orders', (req, res) => {
  const { location } = req.query;
  const db = readDB();

  let readyOrders = db.orders.filter(o => {
    const isRide = o.orderType === 'ride' || o.serviceType === 'ride';
    if (isRide) {
      return o.status === 'Pendiente' || o.status === 'Listo' || o.status === 'En Camino';
    }
    return o.status === 'Listo' || o.status === 'Preparando' || o.status === 'En Camino';
  });

  if (location && location !== 'all') {
    const matchingEstIds = db.establishments
      .filter(e => (e.location || 'San Antonio').toLowerCase().includes(location.toLowerCase()))
      .map(e => e.id);
    readyOrders = readyOrders.filter(o => matchingEstIds.includes(o.establishmentId));
  }

  res.json(readyOrders);
});

// POST driver accepts order
app.post('/api/driver/accept-order', (req, res) => {
  const { orderId, driverId, driverName, driverPhone } = req.body;
  if (!orderId || !driverName) {
    return res.status(400).json({ error: 'OrderId and driverName are required' });
  }

  const db = readDB();
  const order = db.orders.find(o => o.id === orderId);
  if (!order) {
    return res.status(404).json({ error: 'Pedido no encontrado' });
  }

  order.status = 'En Camino';
  order.driver = {
    id: driverId || 'drv-temp',
    name: driverName,
    phone: driverPhone || '',
    acceptedAt: new Date().toISOString()
  };
  order.updatedAt = new Date().toISOString();

  // Update driver status
  if (db.drivers) {
    const drv = db.drivers.find(d => d.id === driverId || d.phone === driverPhone || d.name === driverName);
    if (drv) drv.status = 'En Camino';
  }

  writeDB(db);

  // Update in driver chat
  try {
    const chatMsgs = readDriverChat();
    const card = chatMsgs.find(m => m.orderId === order.id);
    if (card) {
      card.status = 'Tomado';
      card.takenBy = driverName;
      writeDriverChat(chatMsgs);

      const updatePayload = JSON.stringify({
        type: 'DRIVER_CHAT_UPDATE',
        orderId: order.id,
        status: 'Tomado',
        takenBy: driverName
      });
      wss.clients.forEach(c => {
        if (c.readyState === WebSocket.OPEN) c.send(updatePayload);
      });
    }
  } catch (err) {
    console.error('Error updating driver chat status:', err);
  }

  // Broadcast to merchant WebSocket clients
  broadcastToMerchant(order.establishmentId, {
    type: 'ORDER_UPDATED',
    orderId: order.id,
    status: 'En Camino',
    order: order
  });

  res.json({ success: true, order: order });
});

// POST driver completes order (marks Entregado)
app.post('/api/driver/complete-order', (req, res) => {
  const { orderId, driverPhone } = req.body;
  const db = readDB();
  const order = db.orders.find(o => o.id === orderId);
  if (!order) {
    return res.status(404).json({ error: 'Pedido no encontrado' });
  }

  order.status = 'Entregado';
  order.updatedAt = new Date().toISOString();

  if (db.drivers) {
    const drv = db.drivers.find(d => d.phone === driverPhone || (order.driver && (d.id === order.driver.id || d.name === order.driver.name)));
    if (drv) {
      drv.status = 'Disponible';
      drv.totalDeliveries = (drv.totalDeliveries || 0) + 1;
    }
  }

  writeDB(db);

  // Update in driver chat
  try {
    const chatMsgs = readDriverChat();
    const card = chatMsgs.find(m => m.orderId === order.id);
    if (card) {
      card.status = 'Entregado';
      writeDriverChat(chatMsgs);

      const updatePayload = JSON.stringify({
        type: 'DRIVER_CHAT_UPDATE',
        orderId: order.id,
        status: 'Entregado'
      });
      wss.clients.forEach(c => {
        if (c.readyState === WebSocket.OPEN) c.send(updatePayload);
      });
    }
  } catch (err) {
    console.error('Error updating driver chat completion:', err);
  }

  writeDB(db);

  broadcastToMerchant(order.establishmentId, {
    type: 'ORDER_UPDATED',
    orderId: order.id,
    status: 'Entregado',
    order: order
  });

  res.json({ success: true, order: order });
});

// POST driver broadcasts live GPS location
app.post('/api/driver/location', (req, res) => {
  const { driverPhone, latitude, longitude } = req.body;
  if (!driverPhone || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'driverPhone, latitude and longitude required' });
  }

  const db = readDB();
  let drv = (db.drivers || []).find(d => d.phone === driverPhone);
  if (drv) {
    drv.latitude = parseFloat(latitude);
    drv.longitude = parseFloat(longitude);
    drv.lastActive = new Date().toISOString();
    writeDB(db);
  }

  res.json({ success: true, latitude, longitude });
});

// ==========================================
// PLATFORM SETTINGS (EXCHANGE RATES & RAIN MODE)
// ==========================================
const PLATFORM_SETTINGS_FILE = path.join(__dirname, 'platform_settings.json');

function readPlatformSettings() {
  const defaultSettings = {
    rates: {
      copPerUsd: 4100,
      bsPerUsd: 135,
      copPerBs: 30.37
    },
    rainMode: false,
    rainExtraTimeMin: 25,
    rainExtraFeeCop: 1500,
    updatedAt: new Date().toISOString()
  };

  try {
    if (fs.existsSync(PLATFORM_SETTINGS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(PLATFORM_SETTINGS_FILE, 'utf8'));
      return { ...defaultSettings, ...parsed, rates: { ...defaultSettings.rates, ...(parsed.rates || {}) } };
    }
  } catch(e) {
    console.error('Error reading platform_settings.json:', e);
  }
  return defaultSettings;
}

function writePlatformSettings(settings) {
  try {
    fs.writeFileSync(PLATFORM_SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
  } catch(e) {
    console.error('Error writing platform_settings.json:', e);
  }
}

app.get('/api/platform-settings', (req, res) => {
  res.json(readPlatformSettings());
});

app.post('/api/platform-settings', (req, res) => {
  const current = readPlatformSettings();
  const updated = {
    ...current,
    ...req.body,
    rates: {
      ...current.rates,
      ...(req.body.rates || {})
    },
    updatedAt: new Date().toISOString()
  };

  // Recompute copPerBs if copPerUsd and bsPerUsd are provided
  if (updated.rates.copPerUsd && updated.rates.bsPerUsd && updated.rates.bsPerUsd > 0) {
    updated.rates.copPerBs = parseFloat((updated.rates.copPerUsd / updated.rates.bsPerUsd).toFixed(2));
  }

  writePlatformSettings(updated);

  // Broadcast settings update to all connected WebSocket clients
  const payload = JSON.stringify({
    type: 'PLATFORM_SETTINGS_UPDATE',
    settings: updated
  });
  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) {
      c.send(payload);
    }
  });

  res.json({ success: true, settings: updated });
});

// ==========================================
// 🎨 PINTURA Y LATONERÍA AUTOMOTRIZ SERVICES
// ==========================================
const PAINT_QUOTES_FILE = path.join(__dirname, 'paint_quotes.json');

function readPaintQuotes() {
  try {
    if (fs.existsSync(PAINT_QUOTES_FILE)) {
      const data = JSON.parse(fs.readFileSync(PAINT_QUOTES_FILE, 'utf8'));
      if (Array.isArray(data)) return data;
    }
  } catch(e) {
    console.warn('Error reading paint_quotes.json:', e.message);
  }
  return [];
}

function writePaintQuotes(data) {
  try {
    fs.writeFileSync(PAINT_QUOTES_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch(e) {
    console.error('Error writing paint_quotes.json:', e);
  }
}

// Seed initial realistic quotes if empty
if (!fs.existsSync(PAINT_QUOTES_FILE) || readPaintQuotes().length === 0) {
  const initialPaintQuotes = [
    {
      id: 'PNT-1082',
      chatId: 'chat-pnt-1082',
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      clientName: 'Alejandro Morales',
      clientPhone: '0414-7253819',
      clientLocation: 'San Cristóbal - Barrio Obrero',
      vehicleType: 'sedan',
      vehicleModel: 'Toyota Corolla 2019',
      serviceType: 'pieza',
      serviceName: 'Pintura por Pieza al Horno',
      finishType: 'perlado',
      finishName: 'Perlado Tricapa Metálico (PPG)',
      parts: ['Capó', 'Parachoques Delantero'],
      hasBodywork: true,
      estimatedPriceRange: { minUsd: 110, maxUsd: 140, minCop: 451000, maxCop: 574000, minBs: 14850, maxBs: 18900 },
      agreedPrice: { usd: 125, cop: 512500, notes: 'Incluye sacado de golpe en punta de capó y pulido general' },
      urgency: 'semana',
      targetDate: '2026-09-29',
      appointmentDate: '2026-09-29 08:30',
      status: 'Concretado',
      workshopName: 'Taller Maestro San Cristóbal (PPG Certified)',
      workshopId: 'taller-master-1',
      firstResponseTimeMinutes: 6,
      photos: [],
      messages: [
        {
          id: 'msg-1',
          senderRole: 'system',
          senderName: 'PediGochos Cotizador',
          type: 'quotation_card',
          timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
          text: 'Ficha de Cotización Inicial generada para Toyota Corolla 2019'
        },
        {
          id: 'msg-2',
          senderRole: 'workshop',
          senderName: 'Taller Maestro (Maestro Pintor)',
          type: 'text',
          timestamp: new Date(Date.now() - 3600000 * 4.9).toISOString(),
          text: '¡Hola Alejandro! Un gusto saludarte. Vimos las piezas seleccionadas. Tenemos el código de color exacto Toyota 070 (Blanco Perlado Tricapa). Podemos dejarte el trabajo completo con latonería en $125 USD.'
        },
        {
          id: 'msg-3',
          senderRole: 'client',
          senderName: 'Alejandro Morales',
          type: 'text',
          timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
          text: 'Excelente precio amigo. ¿Tienen disponibilidad para ingresarlo el martes temprano?'
        },
        {
          id: 'msg-4',
          senderRole: 'workshop',
          senderName: 'Taller Maestro (Maestro Pintor)',
          type: 'action_appointment',
          timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
          text: '📅 Cita agendada y confirmada para el martes 29 de septiembre a las 08:30 AM.'
        }
      ]
    },
    {
      id: 'PNT-1094',
      chatId: 'chat-pnt-1094',
      createdAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      updatedAt: new Date(Date.now() - 1800000).toISOString(),
      clientName: 'Carla Zambrano',
      clientPhone: '0424-7189023',
      clientLocation: 'San Antonio del Táchira',
      vehicleType: 'suv',
      vehicleModel: 'Ford Explorer 2016',
      serviceType: 'pulitura',
      serviceName: 'Corrección de Pintura & Tratamiento Cerámico 9H',
      finishType: 'brillante',
      finishName: 'Tratamiento Cerámico Graphene Pro',
      parts: ['Vehículo Completo'],
      hasBodywork: false,
      estimatedPriceRange: { minUsd: 90, maxUsd: 130, minCop: 369000, maxCop: 533000, minBs: 12150, maxBs: 17550 },
      agreedPrice: null,
      urgency: 'inmediato',
      targetDate: '2026-09-27',
      appointmentDate: null,
      status: 'En Conversación',
      workshopName: 'Detailing & Pintura Frontera',
      workshopId: 'taller-frontera',
      firstResponseTimeMinutes: 4,
      photos: [],
      messages: [
        {
          id: 'msg-1',
          senderRole: 'system',
          senderName: 'PediGochos Cotizador',
          type: 'quotation_card',
          timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
          text: 'Ficha de Cotización Inicial generada para Ford Explorer 2016'
        },
        {
          id: 'msg-2',
          senderRole: 'workshop',
          senderName: 'Detailing & Pintura Frontera',
          type: 'text',
          timestamp: new Date(Date.now() - 3600000 * 1.4).toISOString(),
          text: 'Hola Carla, un placer. Para la Explorer el tratamiento cerámico incluye corrección en 3 pasos para eliminar rayones de lavado y 3 años de protección hidrofóbica.'
        }
      ]
    }
  ];
  writePaintQuotes(initialPaintQuotes);
}

// Paint Services Catalog Persistence
const PAINT_CATALOG_FILE = path.join(__dirname, 'paint_catalog.json');
function readPaintCatalog() {
  try {
    if (fs.existsSync(PAINT_CATALOG_FILE)) {
      const data = JSON.parse(fs.readFileSync(PAINT_CATALOG_FILE, 'utf8'));
      if (Array.isArray(data)) return data;
    }
  } catch(e) {}
  return [
    {
      id: 'paint-1',
      title: 'Pintura General al Horno - Acabado Espejo',
      category: 'general',
      workshop: 'AutoPinturas Los Andes (San Antonio)',
      rating: 4.9,
      estDays: '5-7 días hábiles',
      vehicleType: 'Sedán / SUV',
      desc: 'Desarme completo de molduras, preparación de chapa, fondo epóxico, 3 manos de color bicapa y barniz cerámico secado al horno.',
      priceUsd: '380 - 550',
      image: '/images/burger_royale.jpg',
      tags: ['Horno de Pintura', 'Barniz Cerámico', 'Garantía 2 Años'],
      active: true
    },
    {
      id: 'paint-2',
      title: 'Pintura de Parachoques & Piezas Individuales',
      category: 'pieza',
      workshop: 'Taller Rápido El Tachirense',
      rating: 4.8,
      estDays: '24-48 horas',
      vehicleType: 'Cualquier Modelo',
      desc: 'Igualación computarizada del color original por código VIN. Eliminación de rayones y acabado de fábrica en parachoques o puertas.',
      priceUsd: '45 - 80 / pieza',
      image: '/images/servicios.jpg',
      tags: ['Mismo Tono Garantizado', 'Secado Express', 'Pintura PPG'],
      active: true
    },
    {
      id: 'paint-3',
      title: 'Latonería Especializada & Sacado de Golpes',
      category: 'latoneria',
      workshop: 'Latonería & Chasis San Cristóbal / Frontera',
      rating: 4.9,
      estDays: '2-4 días',
      vehicleType: 'Autos & Pick-ups',
      desc: 'Reparación con máquina spotter sin dañar temple de lámina, alineación de guardafangos, compactos y reconstrucción plástica.',
      priceUsd: '60 - 180',
      image: '/images/ferreteria.jpg',
      tags: ['Tiraje de Chasis', 'Spotter Eléctrico', 'Reparación de Plásticos'],
      active: true
    },
    {
      id: 'paint-4',
      title: 'Pulitura Corrección 3 Pasos & Tratamiento Cerámico 9H',
      category: 'pulitura',
      workshop: 'Detailing Gocho Studio',
      rating: 5.0,
      estDays: '1 día (8 horas)',
      vehicleType: 'Todos',
      desc: 'Corte fino de micro-rayas (swirls), abrillantado profundo y aplicación de sellador cerámico hidrofóbico con protección UV 9H.',
      priceUsd: '70 - 130',
      image: '/images/burger_royale.jpg',
      tags: ['Sellado 9H', 'Efecto Hidrofóbico', 'Brillo Máximo'],
      active: true
    },
    {
      id: 'paint-5',
      title: 'Acabados Especiales: Negro Satinado / Mate & Candy',
      category: 'especiales',
      workshop: 'Custom Paint Frontera',
      rating: 4.9,
      estDays: '7-10 días',
      vehicleType: 'Autos & Motos',
      desc: 'Personalización de alta gama con barnices mate de tacto sedoso, efectos perla tornasol y bicapas candy de profundidad única.',
      priceUsd: '450 - 750',
      image: '/images/servicios.jpg',
      tags: ['Poliuretano Mate', 'Efecto Tricapa', 'Show Car'],
      active: true
    }
  ];
}

function writePaintCatalog(data) {
  try {
    fs.writeFileSync(PAINT_CATALOG_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch(e) {
    console.error('Error writing paint_catalog.json:', e);
  }
}

if (!fs.existsSync(PAINT_CATALOG_FILE)) {
  writePaintCatalog(readPaintCatalog());
}

// GET paint catalog
app.get('/api/paint-services/catalog', (req, res) => {
  res.json(readPaintCatalog());
});

// PUT / UPDATE paint catalog
app.put('/api/paint-services/catalog', (req, res) => {
  const items = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'Formato inválido' });
  writePaintCatalog(items);

  // Broadcast catalog update via WebSocket
  const payload = JSON.stringify({ type: 'PAINT_CATALOG_UPDATE', items });
  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) c.send(payload);
  });

  res.json({ success: true, count: items.length });
});

// GET all paint quotes
app.get('/api/paint-services/quotes', (req, res) => {
  const quotes = readPaintQuotes();
  quotes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(quotes);
});

// GET single paint quote with chat
app.get('/api/paint-services/quotes/:id', (req, res) => {
  const quotes = readPaintQuotes();
  const quote = quotes.find(q => q.id === req.params.id || q.chatId === req.params.id);
  if (!quote) return res.status(404).json({ error: 'Cotización no encontrada' });
  res.json(quote);
});

// POST new paint quote
app.post('/api/paint-services/quotes', (req, res) => {
  const body = req.body || {};
  if (!body.vehicleType || !body.clientName) {
    return res.status(400).json({ error: 'Datos incompletos de vehículo o cliente' });
  }

  const quotes = readPaintQuotes();
  const newId = 'PNT-' + Math.floor(1000 + Math.random() * 9000);
  const chatId = 'chat-' + newId.toLowerCase();

  const newQuote = {
    id: newId,
    chatId: chatId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    clientName: body.clientName || 'Cliente',
    clientPhone: body.clientPhone || '',
    clientLocation: body.clientLocation || 'San Antonio del Táchira',
    vehicleType: body.vehicleType || 'sedan',
    vehicleModel: body.vehicleModel || 'Vehículo Particular',
    serviceType: body.serviceType || 'pieza',
    serviceName: body.serviceName || 'Latonería y Pintura',
    finishType: body.finishType || 'brillante',
    finishName: body.finishName || 'Brillante Estándar al Horno',
    parts: Array.isArray(body.parts) && body.parts.length > 0 ? body.parts : ['Piezas Seleccionadas'],
    hasBodywork: Boolean(body.hasBodywork),
    estimatedPriceRange: body.estimatedPriceRange || { minUsd: 50, maxUsd: 80 },
    agreedPrice: null,
    urgency: body.urgency || 'semana',
    targetDate: body.targetDate || '',
    appointmentDate: null,
    status: 'Solicitado',
    workshopName: body.workshopName || 'Taller Maestro Certificado PPG',
    workshopId: body.workshopId || 'taller-master-1',
    firstResponseTimeMinutes: null,
    photos: Array.isArray(body.photos) ? body.photos : [],
    messages: [
      {
        id: 'msg-' + Date.now(),
        senderRole: 'system',
        senderName: 'PediGochos Cotizador',
        type: 'quotation_card',
        timestamp: new Date().toISOString(),
        text: `Ficha de Cotización Interactiva generada para ${body.vehicleModel || 'Vehículo'}`,
        data: {
          vehicleType: body.vehicleType,
          vehicleModel: body.vehicleModel,
          serviceName: body.serviceName,
          finishName: body.finishName,
          parts: body.parts,
          hasBodywork: body.hasBodywork,
          estimatedPriceRange: body.estimatedPriceRange,
          urgency: body.urgency,
          photosCount: (body.photos || []).length
        }
      }
    ]
  };

  quotes.unshift(newQuote);
  writePaintQuotes(quotes);

  // Broadcast WebSocket
  const payload = JSON.stringify({
    type: 'PAINT_QUOTE_NEW',
    quote: newQuote
  });
  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) c.send(payload);
  });

  res.status(201).json({ success: true, quote: newQuote });
});

// POST message in paint quote chat
app.post('/api/paint-services/quotes/:id/messages', (req, res) => {
  const { text, senderRole, senderName, photo } = req.body;
  if (!text && !photo) {
    return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
  }

  const quotes = readPaintQuotes();
  const quote = quotes.find(q => q.id === req.params.id || q.chatId === req.params.id);
  if (!quote) return res.status(404).json({ error: 'Cotización no encontrada' });

  const role = senderRole || 'client';
  const name = senderName || (role === 'workshop' ? 'Taller Maestro' : role === 'admin' ? '👑 Dueño / Central' : 'Cliente');

  // Compute first response time if this is first reply from workshop or admin
  if ((role === 'workshop' || role === 'admin') && quote.status === 'Solicitado') {
    quote.status = 'En Conversación';
    const diffMin = Math.max(1, Math.round((Date.now() - new Date(quote.createdAt).getTime()) / 60000));
    quote.firstResponseTimeMinutes = diffMin;
  }

  const newMsg = {
    id: 'msg-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    senderRole: role,
    senderName: name,
    type: photo ? 'photo' : 'text',
    text: text ? String(text).trim() : '',
    photo: photo || null,
    timestamp: new Date().toISOString()
  };

  quote.messages.push(newMsg);
  quote.updatedAt = new Date().toISOString();
  writePaintQuotes(quotes);

  // Broadcast WebSocket
  const payload = JSON.stringify({
    type: 'PAINT_QUOTE_MESSAGE',
    quoteId: quote.id,
    chatId: quote.chatId,
    message: newMsg,
    status: quote.status
  });
  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) c.send(payload);
  });

  res.status(201).json({ success: true, message: newMsg, status: quote.status });
});

// PUT action on paint quote (set agreed price, schedule appointment, finalize)
app.put('/api/paint-services/quotes/:id/action', (req, res) => {
  const { action, agreedPrice, appointmentDate, status, notes } = req.body;
  const quotes = readPaintQuotes();
  const quote = quotes.find(q => q.id === req.params.id || q.chatId === req.params.id);
  if (!quote) return res.status(404).json({ error: 'Cotización no encontrada' });

  let actionText = '';
  if (action === 'set_agreed_price' && agreedPrice) {
    quote.agreedPrice = agreedPrice;
    quote.status = 'Precio Acordado';
    actionText = `💰 Precio oficial fijado y acordado: $${agreedPrice.usd || 0} USD (${agreedPrice.notes || 'Presupuesto cerrado'}).`;
  } else if (action === 'schedule_appointment' && appointmentDate) {
    quote.appointmentDate = appointmentDate;
    quote.status = 'Concretado';
    actionText = `📅 ¡Cita concretada con éxito! Fecha de ingreso del vehículo: ${appointmentDate}. ${notes || ''}`;
  } else if (action === 'finalize_service') {
    quote.status = 'Finalizado';
    actionText = `✅ Servicio finalizado y vehículo entregado al cliente con garantía de acabado.`;
  } else if (status) {
    quote.status = status;
    actionText = `ℹ️ Estado actualizado a: ${status}.`;
  }

  if (actionText) {
    const sysMsg = {
      id: 'msg-' + Date.now(),
      senderRole: 'system',
      senderName: 'PediGochos Central',
      type: 'action_notice',
      text: actionText,
      timestamp: new Date().toISOString()
    };
    quote.messages.push(sysMsg);
  }

  quote.updatedAt = new Date().toISOString();
  writePaintQuotes(quotes);

  // Broadcast WebSocket
  const payload = JSON.stringify({
    type: 'PAINT_QUOTE_UPDATE',
    quote: quote
  });
  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) c.send(payload);
  });

  res.json({ success: true, quote });
});

// GET stats for paint services (Admin Metrics)
app.get('/api/paint-services/stats', (req, res) => {
  const quotes = readPaintQuotes();
  const total = quotes.length;
  const solicitados = quotes.filter(q => q.status === 'Solicitado').length;
  const enConversacion = quotes.filter(q => q.status === 'En Conversación').length;
  const precioAcordado = quotes.filter(q => q.status === 'Precio Acordado').length;
  const concretados = quotes.filter(q => q.status === 'Concretado').length;
  const finalizados = quotes.filter(q => q.status === 'Finalizado').length;

  const totalConcretados = concretados + finalizados;
  const conversionRate = total > 0 ? Math.round((totalConcretados / total) * 100) : 0;

  let totalMoneyUsd = 0;
  quotes.forEach(q => {
    if ((q.status === 'Concretado' || q.status === 'Finalizado' || q.status === 'Precio Acordado') && q.agreedPrice && q.agreedPrice.usd) {
      totalMoneyUsd += parseFloat(q.agreedPrice.usd) || 0;
    }
  });

  const responseTimes = quotes.filter(q => q.firstResponseTimeMinutes != null).map(q => q.firstResponseTimeMinutes);
  const avgResponseTimeMin = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
    : 5;

  res.json({
    total,
    solicitados,
    enConversacion,
    precioAcordado,
    concretados,
    finalizados,
    totalConcretados,
    conversionRate,
    totalMoneyUsd,
    avgResponseTimeMin
  });
});


// ==========================================
// 🔬 IMPRESIÓN 3D & PROTOTIPADO LAB SERVICES
// ==========================================
const PRINT3D_QUOTES_FILE = path.join(__dirname, 'print3d_quotes.json');

function readPrint3dQuotes() {
  try {
    if (fs.existsSync(PRINT3D_QUOTES_FILE)) {
      const data = JSON.parse(fs.readFileSync(PRINT3D_QUOTES_FILE, 'utf8'));
      if (Array.isArray(data)) return data;
    }
  } catch(e) {
    console.warn('Error reading print3d_quotes.json:', e.message);
  }
  return [];
}

function writePrint3dQuotes(data) {
  try {
    fs.writeFileSync(PRINT3D_QUOTES_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch(e) {
    console.error('Error writing print3d_quotes.json:', e);
  }
}

// Seed initial realistic 3D quotes if empty
if (!fs.existsSync(PRINT3D_QUOTES_FILE) || readPrint3dQuotes().length === 0) {
  const initial3dQuotes = [
    {
      id: '3D-2041',
      chatId: 'chat-3d-2041',
      createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      clientName: 'Daniel Gómez',
      clientPhone: '0412-6548901',
      modelId: 'astronauta-cosmico',
      modelName: 'Astronauta Cósmico Articulado',
      category: 'coleccionables',
      material: 'resina',
      materialName: 'Resina 4K (Máximo Detalle)',
      color: '#D4AF37',
      colorName: 'Dorado Silk',
      scale: '100%',
      dimensions: { x: 8.5, y: 7.2, z: 15.0 },
      quantity: 1,
      estimatedPriceUsd: 18.0,
      agreedPriceUsd: 18.0,
      status: 'En Producción',
      notes: 'Impresión con soporte hidrosoluble y curado UV de 20 min',
      messages: [
        {
          id: 'msg-1',
          senderRole: 'system',
          senderName: 'PediGochos 3D Lab',
          type: 'quotation_card',
          timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
          text: 'Cotización iniciada para Astronauta Cósmico Articulado (Resina 4K, 15 cm)'
        },
        {
          id: 'msg-2',
          senderRole: 'workshop',
          senderName: 'Laboratorio 3D PediGochos',
          type: 'text',
          timestamp: new Date(Date.now() - 3600000 * 7.5).toISOString(),
          text: '¡Hola Daniel! Modelo verificado en el slicer con altura de capa a 0.05mm. El acabado dorado silk en resina queda espectacular.'
        },
        {
          id: 'msg-3',
          senderRole: 'workshop',
          senderName: 'Laboratorio 3D PediGochos',
          type: 'action_notice',
          timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
          text: '⚙️ Pieza aprobada y puesta en cama de impresión. Tiempo estimado de curado: 5 horas.'
        }
      ]
    },
    {
      id: '3D-2055',
      chatId: 'chat-3d-2055',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
      clientName: 'Mariana Duque',
      clientPhone: '0414-9872341',
      modelId: 'soporte-mando-pro',
      modelName: 'Soporte Mandos Dual Gaming',
      category: 'soportes',
      material: 'petg',
      materialName: 'PETG Resistente (Mecánico y Térmico)',
      color: '#0F172A',
      colorName: 'Negro Ónix',
      scale: '100%',
      dimensions: { x: 14.0, y: 12.0, z: 18.0 },
      quantity: 2,
      estimatedPriceUsd: 22.0,
      agreedPriceUsd: null,
      status: 'En Conversación',
      notes: 'Requiere relleno al 40% giroide para soporte de peso',
      messages: [
        {
          id: 'msg-1',
          senderRole: 'system',
          senderName: 'PediGochos 3D Lab',
          type: 'quotation_card',
          timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
          text: 'Cotización iniciada para Soporte Mandos Dual Gaming (PETG, 2 unidades)'
        },
        {
          id: 'msg-2',
          senderRole: 'workshop',
          senderName: 'Laboratorio 3D PediGochos',
          type: 'text',
          timestamp: new Date(Date.now() - 3600000 * 1.8).toISOString(),
          text: 'Hola Mariana, un saludo. Al llevar 2 unidades te aplicamos 10% de descuento por volumen, saldría en $22 USD el par en PETG de alta tenacidad.'
        }
      ]
    }
  ];
  writePrint3dQuotes(initial3dQuotes);
}

// Print 3D Services Catalog Persistence
const PRINT3D_CATALOG_FILE = path.join(__dirname, 'print3d_catalog.json');
function readPrint3dCatalog() {
  try {
    if (fs.existsSync(PRINT3D_CATALOG_FILE)) {
      const data = JSON.parse(fs.readFileSync(PRINT3D_CATALOG_FILE, 'utf8'));
      if (Array.isArray(data)) return data;
    }
  } catch(e) {}
  return [
    {
      id: 'print-1',
      slug: 'soporte-celular-volante',
      title: 'Soporte Celular Ergonómico para Auto / Moto',
      category: 'repuestos',
      material: 'petg',
      baseDimensions: { x: 8.5, y: 7.2, z: 9.0 },
      basePriceUsd: 12.0,
      estPrintHours: 4.5,
      weightGrams: 65,
      image: '/images/servicios.jpg',
      modelGlb: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
      desc: 'Soporte de alta durabilidad para sujetar smartphone en salpicadero o manillar. Resistente a vibraciones y exposición solar prolongada.',
      tags: ['Resistente UV', 'Antivibración', 'Grip Firme'],
      active: true
    },
    {
      id: 'print-2',
      slug: 'dragon-articulado-3d',
      title: 'Dragón Articulado Legendario (Print-in-Place)',
      category: 'coleccionables',
      material: 'pla',
      baseDimensions: { x: 32.0, y: 8.0, z: 6.5 },
      basePriceUsd: 18.0,
      estPrintHours: 8.0,
      weightGrams: 110,
      image: '/images/burger_royale.jpg',
      modelGlb: 'https://modelviewer.dev/shared-assets/models/RobotExpressive.glb',
      desc: 'Figura coleccionable totalmente articulada impresa en una sola pieza continua. Movimiento flexible suave ideal para regalo o escritorio.',
      tags: ['100% Articulado', 'Coleccionable', 'Sin Ensamblaje'],
      active: true
    },
    {
      id: 'print-3',
      slug: 'engranaje-repuesto-industrial',
      title: 'Engranaje de Reemplazo & Repuestos Mecánicos',
      category: 'repuestos',
      material: 'petg',
      baseDimensions: { x: 6.0, y: 6.0, z: 2.5 },
      basePriceUsd: 9.5,
      estPrintHours: 2.5,
      weightGrams: 35,
      image: '/images/ferreteria.jpg',
      modelGlb: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
      desc: 'Fabricación precisa de dientes y tolerancias para piezas descatalogadas de licuadoras, taladros, elevavidrios o maquinaria.',
      tags: ['Tolerancia 0.1mm', 'Alta Torsión', 'A Medida'],
      active: true
    },
    {
      id: 'print-4',
      slug: 'llavero-pedigochos-turbo',
      title: 'Llaveros Personalizados & Merch con Relieve',
      category: 'llaveros',
      material: 'pla',
      baseDimensions: { x: 5.5, y: 3.0, z: 0.6 },
      basePriceUsd: 3.5,
      estPrintHours: 0.8,
      weightGrams: 15,
      image: '/images/burger_royale.jpg',
      modelGlb: 'https://modelviewer.dev/shared-assets/models/RobotExpressive.glb',
      desc: 'Llaveros corporativos y souvenirs con logo en dos colores o relieve tridimensional. Descuentos por volumen para negocios.',
      tags: ['Doble Color', 'Empresarial', 'Bajo Costo'],
      active: true
    },
    {
      id: 'print-5',
      slug: 'soporte-auriculares-gamer',
      title: 'Soporte Minimalista para Auriculares Gamer / DJ',
      category: 'soportes',
      material: 'pla',
      baseDimensions: { x: 12.0, y: 14.0, z: 24.0 },
      basePriceUsd: 16.0,
      estPrintHours: 7.0,
      weightGrams: 140,
      image: '/images/servicios.jpg',
      modelGlb: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
      desc: 'Diseño geométrico moderno con base pesada antiderrapante y curvatura que cuida la diadema de tus audífonos.',
      tags: ['Estilo Gamer', 'Base Firme', 'Geométrico'],
      active: true
    },
    {
      id: 'print-6',
      slug: 'maceta-geometrica-voronoi',
      title: 'Maceta Geométrica Facetada & Lámpara Decorativa',
      category: 'decoracion',
      material: 'pla',
      baseDimensions: { x: 10.0, y: 10.0, z: 9.5 },
      basePriceUsd: 11.0,
      estPrintHours: 5.0,
      weightGrams: 85,
      image: '/images/burger_royale.jpg',
      modelGlb: 'https://modelviewer.dev/shared-assets/models/RobotExpressive.glb',
      desc: 'Maceta con patrón poligonal para suculentas o portavelas con drenaje oculto. Hermoso brillo en acabados seda y mármol.',
      tags: ['Diseño Poligonal', 'Decoración', 'Con Drenaje'],
      active: true
    }
  ];
}

function writePrint3dCatalog(data) {
  try {
    fs.writeFileSync(PRINT3D_CATALOG_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch(e) {
    console.error('Error writing print3d_catalog.json:', e);
  }
}

if (!fs.existsSync(PRINT3D_CATALOG_FILE)) {
  writePrint3dCatalog(readPrint3dCatalog());
}

// GET 3d catalog
app.get('/api/print3d-services/catalog', (req, res) => {
  res.json(readPrint3dCatalog());
});

// PUT / UPDATE 3d catalog
app.put('/api/print3d-services/catalog', (req, res) => {
  const items = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'Formato inválido' });
  writePrint3dCatalog(items);

  // Broadcast catalog update via WebSocket
  const payload = JSON.stringify({ type: 'PRINT3D_CATALOG_UPDATE', items });
  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) c.send(payload);
  });

  res.json({ success: true, count: items.length });
});

// GET all 3d quotes
app.get('/api/print3d-services/quotes', (req, res) => {
  const quotes = readPrint3dQuotes();
  quotes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(quotes);
});

// GET single 3d quote
app.get('/api/print3d-services/quotes/:id', (req, res) => {
  const quotes = readPrint3dQuotes();
  const quote = quotes.find(q => q.id === req.params.id || q.chatId === req.params.id);
  if (!quote) return res.status(404).json({ error: 'Cotización 3D no encontrada' });
  res.json(quote);
});

// POST new 3d quote
app.post('/api/print3d-services/quotes', (req, res) => {
  const body = req.body || {};
  if (!body.modelName || !body.clientName) {
    return res.status(400).json({ error: 'Datos incompletos de modelo o cliente' });
  }

  const quotes = readPrint3dQuotes();
  const newId = '3D-' + Math.floor(2000 + Math.random() * 8000);
  const chatId = 'chat-' + newId.toLowerCase();

  const newQuote = {
    id: newId,
    chatId: chatId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    clientName: body.clientName || 'Cliente',
    clientPhone: body.clientPhone || '',
    modelId: body.modelId || 'modelo-3d',
    modelName: body.modelName || 'Figura / Pieza 3D',
    category: body.category || 'coleccionables',
    material: body.material || 'pla',
    materialName: body.materialName || 'PLA Estándar',
    color: body.color || '#D4AF37',
    colorName: body.colorName || 'Dorado Silk',
    scale: body.scale || '100%',
    dimensions: body.dimensions || { x: 10, y: 10, z: 10 },
    quantity: parseInt(body.quantity) || 1,
    estimatedPriceUsd: parseFloat(body.estimatedPriceUsd) || 15.0,
    agreedPriceUsd: null,
    status: 'Solicitado',
    notes: body.notes || '',
    messages: [
      {
        id: 'msg-' + Date.now(),
        senderRole: 'system',
        senderName: 'PediGochos 3D Lab',
        type: 'quotation_card',
        timestamp: new Date().toISOString(),
        text: `Ficha Técnica 3D generada para ${body.modelName}`,
        data: {
          modelName: body.modelName,
          materialName: body.materialName,
          colorName: body.colorName,
          scale: body.scale,
          dimensions: body.dimensions,
          quantity: body.quantity,
          estimatedPriceUsd: body.estimatedPriceUsd
        }
      }
    ]
  };

  quotes.unshift(newQuote);
  writePrint3dQuotes(quotes);

  // Broadcast WebSocket
  const payload = JSON.stringify({
    type: 'PRINT3D_QUOTE_NEW',
    quote: newQuote
  });
  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) c.send(payload);
  });

  res.status(201).json({ success: true, quote: newQuote });
});

// POST message in 3d quote chat
app.post('/api/print3d-services/quotes/:id/messages', (req, res) => {
  const { text, senderRole, senderName } = req.body;
  if (!text || !String(text).trim()) {
    return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
  }

  const quotes = readPrint3dQuotes();
  const quote = quotes.find(q => q.id === req.params.id || q.chatId === req.params.id);
  if (!quote) return res.status(404).json({ error: 'Cotización 3D no encontrada' });

  const role = senderRole || 'client';
  const name = senderName || (role === 'workshop' ? 'Laboratorio 3D' : role === 'admin' ? '👑 Dueño / Central' : 'Cliente');

  if ((role === 'workshop' || role === 'admin') && quote.status === 'Solicitado') {
    quote.status = 'En Conversación';
  }

  const newMsg = {
    id: 'msg-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    senderRole: role,
    senderName: name,
    type: 'text',
    text: String(text).trim(),
    timestamp: new Date().toISOString()
  };

  quote.messages.push(newMsg);
  quote.updatedAt = new Date().toISOString();
  writePrint3dQuotes(quotes);

  // Broadcast WebSocket
  const payload = JSON.stringify({
    type: 'PRINT3D_QUOTE_MESSAGE',
    quoteId: quote.id,
    chatId: quote.chatId,
    message: newMsg,
    status: quote.status
  });
  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) c.send(payload);
  });

  res.status(201).json({ success: true, message: newMsg, status: quote.status });
});

// PUT action on 3d quote (set agreed price, production, complete)
app.put('/api/print3d-services/quotes/:id/action', (req, res) => {
  const { action, agreedPriceUsd, status, notes } = req.body;
  const quotes = readPrint3dQuotes();
  const quote = quotes.find(q => q.id === req.params.id || q.chatId === req.params.id);
  if (!quote) return res.status(404).json({ error: 'Cotización 3D no encontrada' });

  let actionText = '';
  if (action === 'set_agreed_price' && agreedPriceUsd) {
    quote.agreedPriceUsd = parseFloat(agreedPriceUsd);
    quote.status = 'Presupuestado';
    actionText = `💰 Presupuesto cerrado de impresión 3D: $${quote.agreedPriceUsd} USD.`;
  } else if (action === 'start_production') {
    quote.status = 'En Producción';
    actionText = `⚙️ ¡Pieza ingresada a la cola de impresión 3D! Iniciando calibración y extrusión. ${notes || ''}`;
  } else if (action === 'complete_print') {
    quote.status = 'Completado';
    actionText = `✅ ¡Impresión 3D finalizada con éxito y post-procesada! Lista para entrega.`;
  } else if (status) {
    quote.status = status;
    actionText = `ℹ️ Estado actualizado a: ${status}.`;
  }

  if (actionText) {
    const sysMsg = {
      id: 'msg-' + Date.now(),
      senderRole: 'system',
      senderName: 'PediGochos 3D Lab',
      type: 'action_notice',
      text: actionText,
      timestamp: new Date().toISOString()
    };
    quote.messages.push(sysMsg);
  }

  quote.updatedAt = new Date().toISOString();
  writePrint3dQuotes(quotes);

  // Broadcast WebSocket
  const payload = JSON.stringify({
    type: 'PRINT3D_QUOTE_UPDATE',
    quote: quote
  });
  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) c.send(payload);
  });

  res.json({ success: true, quote });
});

// GET stats for 3d print services (Admin Metrics)
app.get('/api/print3d-services/stats', (req, res) => {
  const quotes = readPrint3dQuotes();
  const total = quotes.length;
  const solicitados = quotes.filter(q => q.status === 'Solicitado').length;
  const enConversacion = quotes.filter(q => q.status === 'En Conversación').length;
  const presupuestados = quotes.filter(q => q.status === 'Presupuestado').length;
  const enProduccion = quotes.filter(q => q.status === 'En Producción').length;
  const completados = quotes.filter(q => q.status === 'Completado').length;

  const totalConcretados = enProduccion + completados;
  const conversionRate = total > 0 ? Math.round((totalConcretados / total) * 100) : 0;

  let totalMoneyUsd = 0;
  quotes.forEach(q => {
    const price = q.agreedPriceUsd || q.estimatedPriceUsd || 0;
    if (q.status === 'En Producción' || q.status === 'Completado' || q.status === 'Presupuestado') {
      totalMoneyUsd += parseFloat(price) || 0;
    }
  });

  res.json({
    total,
    solicitados,
    enConversacion,
    presupuestados,
    enProduccion,
    completados,
    totalConcretados,
    conversionRate,
    totalMoneyUsd
  });
});


// ==========================================
// ✨ SHELLIART RESINA - LLAVEROS & ARTE EN RESINA
// ==========================================
const RESIN_QUOTES_FILE = path.join(__dirname, 'resin_quotes.json');
const RESIN_CATALOG_FILE = path.join(__dirname, 'resin_catalog.json');

function readResinQuotes() {
  try {
    if (fs.existsSync(RESIN_QUOTES_FILE)) {
      const data = JSON.parse(fs.readFileSync(RESIN_QUOTES_FILE, 'utf8'));
      if (Array.isArray(data)) return data;
    }
  } catch(e) {
    console.warn('Error reading resin_quotes.json:', e.message);
  }
  return [];
}

function writeResinQuotes(data) {
  try {
    fs.writeFileSync(RESIN_QUOTES_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch(e) {
    console.error('Error writing resin_quotes.json:', e);
  }
}

// Seed initial realistic Resin quotes if empty
if (!fs.existsSync(RESIN_QUOTES_FILE) || readResinQuotes().length === 0) {
  const initialResinQuotes = [
    {
      id: 'RES-8041',
      chatId: 'chat-res-8041',
      createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      clientName: 'Valentina Roa',
      clientPhone: '0414-7891234',
      productType: 'keychain_letter',
      productTitle: 'Llavero de Inicial "S" - Rosa Pastel con Glitter',
      letter: 'S',
      resinStyle: 'bicolor',
      styleName: 'Bicolor con Glitter y Hoja de Oro',
      baseColor: '#F472B6',
      baseColorName: 'Rosa Pastel',
      secondaryColor: 'transparente',
      inclusions: 'Hojas de Oro 24K + Glitter Grueso',
      tasselColor: 'Rosa Pastel',
      tasselHex: '#F472B6',
      hardwareColor: 'Dorado Clásico ✨',
      customName: 'Sofía',
      extraCharm: 'Mini Corazón con Glitter',
      quantity: 1,
      basePriceUsd: 4.5,
      extrasPriceUsd: 0.8,
      estimatedPriceUsd: 5.3,
      agreedPriceUsd: 5.3,
      status: 'En Curado UV',
      notes: 'Curado en molde de 24 horas y pulido de bordes',
      messages: [
        {
          id: 'msg-1',
          senderRole: 'system',
          senderName: 'ShelliArt Resina',
          type: 'quotation_card',
          timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
          text: 'Ficha de Llavero Personalizado generada para letra "S" (Rosa Pastel con Pan de Oro)'
        },
        {
          id: 'msg-2',
          senderRole: 'workshop',
          senderName: 'ShelliArt Resina',
          type: 'text',
          timestamp: new Date(Date.now() - 3600000 * 5.8).toISOString(),
          text: '¡Hola Valentina! Tu pedido de la letra "S" con borla rosa y mini corazón quedó anotado. Mezcla epóxica vaciada sin burbujas.'
        },
        {
          id: 'msg-3',
          senderRole: 'workshop',
          senderName: 'ShelliArt Resina',
          type: 'action_notice',
          timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
          text: '⏳ Llavero en lámpara de curado UV. Listo mañana a primera hora con acabado cristal espejo.'
        }
      ]
    },
    {
      id: 'RES-8052',
      chatId: 'chat-res-8052',
      createdAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
      clientName: 'Andrés Mora',
      clientPhone: '0424-6543210',
      productType: 'keychain_letter',
      productTitle: 'Llavero de Inicial "A" - Azul Océano & Pan de Oro',
      letter: 'A',
      resinStyle: 'gold_flakes',
      styleName: 'Hoja de Oro 24K Encapsulada',
      baseColor: '#1E40AF',
      baseColorName: 'Azul Rey Profundo',
      secondaryColor: 'transparente',
      inclusions: 'Hojas de Oro Flakes',
      tasselColor: 'Celeste Suave',
      tasselHex: '#38BDF8',
      hardwareColor: 'Dorado Clásico ✨',
      customName: 'Andrés',
      extraCharm: 'Ninguno',
      quantity: 1,
      basePriceUsd: 4.5,
      extrasPriceUsd: 0.0,
      estimatedPriceUsd: 4.5,
      agreedPriceUsd: null,
      status: 'Solicitado',
      notes: 'Para regalo de cumpleaños',
      messages: [
        {
          id: 'msg-1',
          senderRole: 'system',
          senderName: 'ShelliArt Resina',
          type: 'quotation_card',
          timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
          text: 'Ficha de Llavero Personalizado generada para letra "A" (Azul Rey & Oro)'
        }
      ]
    }
  ];
  writeResinQuotes(initialResinQuotes);
}

// Resin Catalog Persistence
function readResinCatalog() {
  try {
    if (fs.existsSync(RESIN_CATALOG_FILE)) {
      const data = JSON.parse(fs.readFileSync(RESIN_CATALOG_FILE, 'utf8'));
      if (Array.isArray(data)) return data;
    }
  } catch(e) {}
  return [
    {
      id: 'resin-1',
      title: 'Llavero de Letra Personalizada (A-Z) con Borla & Herraje',
      category: 'llaveros',
      basePriceUsd: 4.5,
      estDays: '24-48 horas',
      vehicleType: 'Resina Epóxica UV',
      desc: 'Letra volumétrica con acabado brillo espejo. Personaliza tu inicial con pigmentos perlados, hoja de oro 24K, glitter o flores secas, más borla de gamuza a juego.',
      image: '/images/servicios.jpg',
      tags: ['100% Hecho a Mano', 'Hoja de Oro 24K', 'Borla de Gamuza', 'Anti-amarilleo'],
      active: true
    },
    {
      id: 'resin-2',
      title: 'Llavero de Corazón / Huesito para Mascotas con Nombre',
      category: 'llaveros',
      basePriceUsd: 4.0,
      estDays: '24-48 horas',
      vehicleType: 'Resina Epóxica UV',
      desc: 'Dije personalizado para collar de perrito o gatito con nombre y número de teléfono encapsulados en resina de alta resistencia.',
      image: '/images/burger_royale.jpg',
      tags: ['Identificador Mascota', 'Glitter Encapsulado', 'Ultra Liviano'],
      active: true
    },
    {
      id: 'resin-3',
      title: 'Set Dúo Llaveros de Letras para Parejas / Mejores Amigas',
      category: 'sets',
      basePriceUsd: 8.0,
      estDays: '24-48 horas',
      vehicleType: 'Resina Epóxica UV',
      desc: 'Dos llaveros de letras a juego combinados en tonos complementarios, con borlas y dijes adicionales de regalo.',
      image: '/images/ferreteria.jpg',
      tags: ['Ideal Regalo', 'Dúo Pareja', 'Empaque de Regalo'],
      active: true
    },
    {
      id: 'resin-4',
      title: 'Marcapáginas / Separador de Libros con Flores Secas',
      category: 'accesorios',
      basePriceUsd: 5.0,
      estDays: '2-3 días',
      vehicleType: 'Resina Cristal',
      desc: 'Separador de páginas delgado y cristalino con flores prensadas de colores, detalles en pan de oro y borla larga de seda.',
      image: '/images/servicios.jpg',
      tags: ['Flores Prensadas', 'Lectores', 'Pan de Oro'],
      active: true
    },
    {
      id: 'resin-5',
      title: 'Portavasos Geoda de Resina con Borde Dorado',
      category: 'hogar',
      basePriceUsd: 6.5,
      estDays: '2-3 días',
      vehicleType: 'Resina Térmica',
      desc: 'Portavasos artesanal estilo geoda natural con efecto cuarzo, polvo de mica perlada y borde pintado a mano en oro líquido.',
      image: '/images/burger_royale.jpg',
      tags: ['Resiste Calor', 'Efecto Geoda', 'Borde Dorado'],
      active: true
    }
  ];
}

function writeResinCatalog(data) {
  try {
    fs.writeFileSync(RESIN_CATALOG_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch(e) {
    console.error('Error writing resin_catalog.json:', e);
  }
}

if (!fs.existsSync(RESIN_CATALOG_FILE)) {
  writeResinCatalog(readResinCatalog());
}

// GET resin catalog
app.get('/api/resin-services/catalog', (req, res) => {
  res.json(readResinCatalog());
});

// PUT / UPDATE resin catalog
app.put('/api/resin-services/catalog', (req, res) => {
  const items = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'Formato inválido' });
  writeResinCatalog(items);

  // Broadcast catalog update via WebSocket
  const payload = JSON.stringify({ type: 'RESIN_CATALOG_UPDATE', items });
  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) c.send(payload);
  });

  res.json({ success: true, count: items.length });
});

// GET all resin quotes
app.get('/api/resin-services/quotes', (req, res) => {
  const quotes = readResinQuotes();
  quotes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(quotes);
});

// GET single resin quote
app.get('/api/resin-services/quotes/:id', (req, res) => {
  const quotes = readResinQuotes();
  const quote = quotes.find(q => q.id === req.params.id || q.chatId === req.params.id);
  if (!quote) return res.status(404).json({ error: 'Pedido de resina no encontrado' });
  res.json(quote);
});

// POST new resin quote / order
app.post('/api/resin-services/quotes', (req, res) => {
  const body = req.body || {};
  if (!body.letter || !body.clientName) {
    return res.status(400).json({ error: 'Datos incompletos de letra o cliente' });
  }

  const quotes = readResinQuotes();
  const newId = 'RES-' + Math.floor(8000 + Math.random() * 2000);
  const chatId = 'chat-' + newId.toLowerCase();

  const newQuote = {
    id: newId,
    chatId: chatId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    clientName: body.clientName || 'Cliente',
    clientPhone: body.clientPhone || '',
    productType: body.productType || 'keychain_letter',
    productTitle: body.productTitle || `Llavero de Inicial "${body.letter}"`,
    letter: (body.letter || 'A').toUpperCase(),
    resinStyle: body.resinStyle || 'bicolor',
    styleName: body.styleName || 'Bicolor con Glitter y Hoja de Oro',
    baseColor: body.baseColor || '#F472B6',
    baseColorName: body.baseColorName || 'Rosa Pastel',
    secondaryColor: body.secondaryColor || 'transparente',
    inclusions: body.inclusions || 'Hojas de Oro 24K + Glitter',
    tasselColor: body.tasselColor || 'Rosa Pastel',
    tasselHex: body.tasselHex || '#F472B6',
    hardwareColor: body.hardwareColor || 'Dorado Clásico ✨',
    customName: body.customName || '',
    extraCharm: body.extraCharm || 'Ninguno',
    quantity: parseInt(body.quantity) || 1,
    basePriceUsd: parseFloat(body.basePriceUsd) || 4.5,
    extrasPriceUsd: parseFloat(body.extrasPriceUsd) || 0.0,
    estimatedPriceUsd: parseFloat(body.estimatedPriceUsd) || 4.5,
    agreedPriceUsd: null,
    status: 'Solicitado',
    notes: body.notes || '',
    workshopName: 'ShelliArt Resina Cúcuta-Ureña',
    messages: [
      {
        id: 'msg-' + Date.now(),
        senderRole: 'system',
        senderName: 'ShelliArt Resina',
        type: 'quotation_card',
        timestamp: new Date().toISOString(),
        text: `Ficha Técnica de Llavero generada para inicial "${body.letter}" (${body.baseColorName || 'Color'})`,
        data: {
          letter: body.letter,
          styleName: body.styleName,
          baseColorName: body.baseColorName,
          inclusions: body.inclusions,
          tasselColor: body.tasselColor,
          hardwareColor: body.hardwareColor,
          customName: body.customName,
          extraCharm: body.extraCharm,
          estimatedPriceUsd: body.estimatedPriceUsd
        }
      }
    ]
  };

  quotes.unshift(newQuote);
  writeResinQuotes(quotes);

  // Broadcast WebSocket
  const payload = JSON.stringify({
    type: 'RESIN_QUOTE_NEW',
    quote: newQuote
  });
  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) c.send(payload);
  });

  res.status(201).json({ success: true, quote: newQuote });
});

// POST message in resin quote chat
app.post('/api/resin-services/quotes/:id/messages', (req, res) => {
  const { text, senderRole, senderName, photo } = req.body;
  if (!text && !photo) {
    return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
  }

  const quotes = readResinQuotes();
  const quote = quotes.find(q => q.id === req.params.id || q.chatId === req.params.id);
  if (!quote) return res.status(404).json({ error: 'Pedido de resina no encontrado' });

  const role = senderRole || 'client';
  const name = senderName || (role === 'workshop' ? 'ShelliArt Resina' : role === 'admin' ? '👑 Dueño / Central' : 'Cliente');

  if ((role === 'workshop' || role === 'admin') && quote.status === 'Solicitado') {
    quote.status = 'En Conversación';
  }

  const newMsg = {
    id: 'msg-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    senderRole: role,
    senderName: name,
    type: photo ? 'photo' : 'text',
    text: text ? String(text).trim() : '',
    photo: photo || null,
    timestamp: new Date().toISOString()
  };

  quote.messages.push(newMsg);
  quote.updatedAt = new Date().toISOString();
  writeResinQuotes(quotes);

  // Broadcast WebSocket
  const payload = JSON.stringify({
    type: 'RESIN_QUOTE_MESSAGE',
    quoteId: quote.id,
    chatId: quote.chatId,
    message: newMsg,
    status: quote.status
  });
  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) c.send(payload);
  });

  res.status(201).json({ success: true, message: newMsg, status: quote.status });
});

// PUT action on resin quote
app.put('/api/resin-services/quotes/:id/action', (req, res) => {
  const { action, agreedPriceUsd, status, notes } = req.body;
  const quotes = readResinQuotes();
  const quote = quotes.find(q => q.id === req.params.id || q.chatId === req.params.id);
  if (!quote) return res.status(404).json({ error: 'Pedido de resina no encontrado' });

  let actionText = '';
  if (action === 'set_agreed_price' && agreedPriceUsd) {
    quote.agreedPriceUsd = parseFloat(agreedPriceUsd);
    quote.status = 'Precio Acordado';
    actionText = `💰 Precio oficial fijado: $${quote.agreedPriceUsd} USD.`;
  } else if (action === 'start_casting') {
    quote.status = 'En Elaboración';
    actionText = `✨ ¡Moldes preparados y mezcla de resina epóxica vaciada! ${notes || ''}`;
  } else if (action === 'uv_curing') {
    quote.status = 'En Curado UV';
    actionText = `⏳ Pieza en tiempo de curado UV (24 horas) para lograr máxima transparencia y dureza.`;
  } else if (action === 'ready_for_delivery') {
    quote.status = 'Listo para Entrega';
    actionText = `🎀 ¡Llavero desmoldado, pulido y listo para entrega! Con borla y argolla instaladas.`;
  } else if (action === 'delivered') {
    quote.status = 'Entregado';
    actionText = `✅ Llavero entregado con éxito al cliente. ¡Gracias por apoyar a ShelliArt!`;
  } else if (status) {
    quote.status = status;
    actionText = `ℹ️ Estado actualizado a: ${status}.`;
  }

  if (actionText) {
    const sysMsg = {
      id: 'msg-' + Date.now(),
      senderRole: 'system',
      senderName: 'ShelliArt Resina',
      type: 'action_notice',
      text: actionText,
      timestamp: new Date().toISOString()
    };
    quote.messages.push(sysMsg);
  }

  quote.updatedAt = new Date().toISOString();
  writeResinQuotes(quotes);

  // Broadcast WebSocket
  const payload = JSON.stringify({
    type: 'RESIN_QUOTE_UPDATE',
    quote: quote
  });
  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) c.send(payload);
  });

  res.json({ success: true, quote });
});

// GET stats for resin services
app.get('/api/resin-services/stats', (req, res) => {
  const quotes = readResinQuotes();
  const total = quotes.length;
  const solicitados = quotes.filter(q => q.status === 'Solicitado').length;
  const enConversacion = quotes.filter(q => q.status === 'En Conversación').length;
  const enElaboracion = quotes.filter(q => q.status === 'En Elaboración' || q.status === 'En Curado UV').length;
  const listos = quotes.filter(q => q.status === 'Listo para Entrega').length;
  const entregados = quotes.filter(q => q.status === 'Entregado').length;

  const totalConcretados = enElaboracion + listos + entregados;
  const conversionRate = total > 0 ? Math.round((totalConcretados / total) * 100) : 0;

  let totalMoneyUsd = 0;
  quotes.forEach(q => {
    const price = q.agreedPriceUsd || q.estimatedPriceUsd || 0;
    if (q.status === 'En Elaboración' || q.status === 'En Curado UV' || q.status === 'Listo para Entrega' || q.status === 'Entregado') {
      totalMoneyUsd += parseFloat(price) || 0;
    }
  });

  res.json({
    total,
    solicitados,
    enConversacion,
    enElaboracion,
    listos,
    entregados,
    totalConcretados,
    conversionRate,
    totalMoneyUsd
  });
});

// Fallback for SPA routing (if any) or simple index.html
app.get('*', (req, res, next) => {
  // If request is for api, skip to next route handler (standard Express)
  if (req.url.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  // Always prioritize Supabase Storage (db_backup.json) as the authoritative master
  await syncFromSupabase();
  await syncFromPostgres();
});
