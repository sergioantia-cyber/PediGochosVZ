/* ==========================================================================
   PediGochosDrive - Next-Gen Ride Hailing & Mobility App
   Standalone-like Ride Experience inside PediGochos
   ========================================================================== */

const PediGochosDriveApp = {
  isOpen: false,
  map: null,
  passengerMarker: null,
  destinationMarker: null,
  routePolyline: null,
  roamingDrivers: [],
  roamingInterval: null,
  currentPanel: 'route', // 'route' | 'fleet' | 'payment' | 'searching'
  selectedVehicle: 'moto',
  selectedPayment: 'cop',
  pickup: null,
  destination: null,
  distanceKm: 1.0,
  estimatedMinutes: 5,
  fares: {},
  activeRideRequest: null,

  // Landmark presets for quick selection
  landmarks: {
    puente: { name: 'Puente Int. Simón Bolívar (Aduana)', lat: 7.8285, lng: -72.4542 },
    centro: { name: 'Plaza Bolívar / Centro San Antonio', lat: 7.8145, lng: -72.4455 },
    terminal: { name: 'Terminal de Pasajeros de San Antonio', lat: 7.8180, lng: -72.4410 },
    aeropuerto: { name: 'Aeropuerto / Peracal', lat: 7.8398, lng: -72.4402 },
    hospital: { name: 'Hospital Dr. Samuel Darío Maldonado', lat: 7.8120, lng: -72.4430 },
    laparada: { name: 'La Parada (Frontera Cúcuta)', lat: 7.8340, lng: -72.4580 },
    urena: { name: 'Ureña (Tienditas / Aduana)', lat: 7.9192, lng: -72.4468 },
    mercado: { name: 'Mercado Municipal San Antonio', lat: 7.8130, lng: -72.4475 }
  },

  // Vehicle fleet configurations
  fleet: {
    moto: {
      id: 'moto',
      name: 'Moto Taxi Express',
      tag: '⚡ MÁS RÁPIDO',
      tagClass: 'badge-fast',
      specs: '1 Pasajero · Casco higienizado · Esquiva el tráfico',
      capacity: '👤 1',
      eta: '2-4 min',
      base: 4000,
      perKm: 1500,
      image: '/images/vehicles/moto_clasica.jpg',
      emoji: '🛵'
    },
    auto: {
      id: 'auto',
      name: 'Auto Estándar',
      tag: '⭐ POPULAR',
      tagClass: 'badge-popular',
      specs: 'Hasta 4 pasajeros · Maleta mediana · Cómodo y seguro',
      capacity: '👥 4',
      eta: '4-7 min',
      base: 8000,
      perKm: 2500,
      image: '/images/vehicles/sedan_general.jpg',
      emoji: '🚗'
    },
    lujo: {
      id: 'lujo',
      name: 'Confort VIP Lujo',
      tag: '💎 MÁXIMO CONFORT',
      tagClass: 'badge-vip',
      specs: 'Vehículo moderno full Aire Acondicionado (A/C) · Maletero amplio',
      capacity: '👥 4',
      eta: '5-8 min',
      base: 14000,
      perKm: 4000,
      image: '/images/vehicles/toyota_corolla.jpg',
      emoji: '✨'
    },
    encomienda: {
      id: 'encomienda',
      name: 'PediGochos Encomienda',
      tag: '📦 ENCARGOS',
      tagClass: 'badge-express',
      specs: 'Envío express de paquetes, encargos o compras puerta a puerta',
      capacity: '📦 15kg',
      eta: 'Inmediato',
      base: 4500,
      perKm: 1500,
      image: '/images/vehicles/keeway_horse.jpg',
      emoji: '📦'
    },
    van: {
      id: 'van',
      name: 'Van / Grupal',
      tag: '👥 GRUPAL',
      tagClass: 'badge-group',
      specs: 'Espacio para grupos o familias completas con equipaje grande',
      capacity: '👥 6',
      eta: '7-10 min',
      base: 16000,
      perKm: 4500,
      image: '/images/vehicles/suv_general.jpg',
      emoji: '🚐'
    }
  },

  init() {
    // Fill saved name & phone if available
    const nameInp = document.getElementById('drive-cust-name');
    const phoneInp = document.getElementById('drive-cust-phone');
    const savedName = localStorage.getItem('order_customer_name') || (window.MarketplaceApp && window.MarketplaceApp.currentUser?.name) || '';
    const savedPhone = localStorage.getItem('order_customer_phone') || (window.MarketplaceApp && window.MarketplaceApp.currentUser?.phone) || '';
    if (nameInp && savedName) nameInp.value = savedName;
    if (phoneInp && savedPhone) phoneInp.value = savedPhone;

    this.calculateFares(1.0);
  },

  open(initialVehicle = null) {
    const appEl = document.getElementById('pedigochos-drive-app');
    if (!appEl) return;

    if (initialVehicle && this.fleet[initialVehicle]) {
      this.selectedVehicle = initialVehicle;
    }

    appEl.classList.remove('hidden');
    appEl.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    this.isOpen = true;

    // Haptic feedback if supported
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(30);
    }

    this.init();

    // Initialize or resize map
    setTimeout(() => {
      this.initMap();
    }, 200);

    setTimeout(() => {
      if (this.map) this.map.invalidateSize();
    }, 500);

    // Auto-detect GPS if not set
    if (!this.pickup) {
      this.detectGPS();
    }
  },

  close() {
    const appEl = document.getElementById('pedigochos-drive-app');
    if (appEl) {
      appEl.classList.add('hidden');
      appEl.style.display = 'none';
    }
    document.body.style.overflow = '';
    this.isOpen = false;

    if (this.roamingInterval) {
      clearInterval(this.roamingInterval);
      this.roamingInterval = null;
    }
  },

  initMap() {
    const mapContainer = document.getElementById('drive-leaflet-map');
    if (!mapContainer || typeof L === 'undefined') return;

    const defaultLat = 7.8145;
    const defaultLng = -72.4455;

    if (!this.map) {
      this.map = L.map('drive-leaflet-map', {
        zoomControl: false,
        attributionControl: false
      }).setView([defaultLat, defaultLng], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(this.map);

      // On map click -> set or move destination
      this.map.on('click', (e) => {
        this.setDestination(e.latlng.lat, e.latlng.lng, `Punto en mapa (${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)})`);
      });
    } else {
      this.map.invalidateSize();
    }

    this.spawnRoamingDrivers(defaultLat, defaultLng);
  },

  spawnRoamingDrivers(centerLat, centerLng) {
    if (!this.map || typeof L === 'undefined') return;

    // Clear existing roaming markers
    this.roamingDrivers.forEach(m => {
      try { this.map.removeLayer(m); } catch (e) {}
    });
    this.roamingDrivers = [];

    // Create 5 nearby simulated drivers (3 motos, 2 autos)
    const driverConfigs = [
      { emoji: '🛵', offsetLat: 0.003, offsetLng: 0.002, name: 'Moto 12' },
      { emoji: '🛵', offsetLat: -0.002, offsetLng: 0.003, name: 'Moto 08' },
      { emoji: '🛵', offsetLat: 0.001, offsetLng: -0.003, name: 'Moto 24' },
      { emoji: '🚗', offsetLat: -0.003, offsetLng: -0.002, name: 'Taxi 15' },
      { emoji: '🚗', offsetLat: 0.004, offsetLng: -0.001, name: 'Taxi 04' }
    ];

    driverConfigs.forEach(d => {
      const lat = centerLat + d.offsetLat;
      const lng = centerLng + d.offsetLng;

      const icon = L.divIcon({
        className: 'drive-car-marker',
        html: `<div class="drive-car-marker-icon" title="${d.name}">${d.emoji}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([lat, lng], { icon }).addTo(this.map);
      marker._driftData = { lat, lng, speedLat: (Math.random() - 0.5) * 0.0004, speedLng: (Math.random() - 0.5) * 0.0004 };
      this.roamingDrivers.push(marker);
    });

    // Slight animated roaming movement every 3 seconds to emulate real Uber/DiDi activity
    if (!this.roamingInterval) {
      this.roamingInterval = setInterval(() => {
        if (!this.isOpen || !this.map) return;
        this.roamingDrivers.forEach(m => {
          if (!m._driftData) return;
          m._driftData.lat += m._driftData.speedLat;
          m._driftData.lng += m._driftData.speedLng;
          // Boundary bounce
          if (Math.abs(m._driftData.lat - centerLat) > 0.008) m._driftData.speedLat *= -1;
          if (Math.abs(m._driftData.lng - centerLng) > 0.008) m._driftData.speedLng *= -1;
          m.setLatLng([m._driftData.lat, m._driftData.lng]);
        });
      }, 3000);
    }
  },

  detectGPS() {
    const originInp = document.getElementById('drive-origin-input');
    if (originInp) originInp.value = 'Localizando tu posición GPS...';

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          this.setPickupLocation(lat, lng, 'Mi Ubicación Actual');
        },
        (err) => {
          console.warn('Drive GPS fallback:', err);
          this.setPickupLocation(7.8145, -72.4455, 'San Antonio del Táchira (Centro)');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      this.setPickupLocation(7.8145, -72.4455, 'San Antonio del Táchira (Centro)');
    }
  },

  setPickupLocation(lat, lng, address = 'Mi Ubicación') {
    this.pickup = { lat, lng, address };
    const originInp = document.getElementById('drive-origin-input');
    if (originInp) originInp.value = address;

    if (!this.map || typeof L === 'undefined') return;

    if (this.passengerMarker) {
      this.passengerMarker.setLatLng([lat, lng]);
    } else {
      const passengerIcon = L.divIcon({
        className: 'drive-passenger-marker',
        html: '<div class="drive-pulse-circle"></div>',
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });
      this.passengerMarker = L.marker([lat, lng], { icon: passengerIcon }).addTo(this.map);
    }

    if (!this.destination) {
      this.map.setView([lat, lng], 15);
    } else {
      this.updateRoute();
    }
  },

  setDestination(lat, lng, address) {
    this.destination = { lat, lng, address };
    const destInp = document.getElementById('drive-dest-input');
    if (destInp) destInp.value = address;

    if (!this.map || typeof L === 'undefined') return;

    if (this.destinationMarker) {
      this.destinationMarker.setLatLng([lat, lng]);
    } else {
      const destIcon = L.divIcon({
        className: 'drive-dest-marker',
        html: '<div style="background: #FF6B00; color: #FFF; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; border: 2.5px solid #FFFFFF; box-shadow: 0 4px 14px rgba(255,107,0,0.7);">🏁</div>',
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });
      this.destinationMarker = L.marker([lat, lng], { icon: destIcon }).addTo(this.map);
    }

    this.updateRoute();

    // Automatically transition to fleet selection if still on route panel
    if (this.currentPanel === 'route') {
      this.switchPanel('fleet');
    }
  },

  selectQuickPlace(placeKey) {
    const place = this.landmarks[placeKey];
    if (!place) return;
    this.setDestination(place.lat, place.lng, place.name);
  },

  handleDestinationSearch(val) {
    const q = (val || '').toLowerCase().trim();
    if (!q) return;

    // Check if matches known landmarks
    const match = Object.values(this.landmarks).find(l => l.name.toLowerCase().includes(q));
    if (match) {
      this.setDestination(match.lat, match.lng, match.name);
    }
  },

  updateRoute() {
    if (!this.pickup || !this.destination || !this.map || typeof L === 'undefined') return;

    // Calculate straight-line distance with Haversine + 1.25 urban route factor
    const R = 6371; // Earth's radius in km
    const dLat = (this.destination.lat - this.pickup.lat) * Math.PI / 180;
    const dLon = (this.destination.lng - this.pickup.lng) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.pickup.lat * Math.PI / 180) * Math.cos(this.destination.lat * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const rawDist = R * c;
    this.distanceKm = Math.max(0.8, parseFloat((rawDist * 1.25).toFixed(1)));
    this.estimatedMinutes = Math.max(3, Math.round(this.distanceKm * 2.8));

    // Update floating route pill
    const distText = document.getElementById('drive-route-dist-text');
    if (distText) {
      distText.innerText = `📏 ${this.distanceKm} km · ~${this.estimatedMinutes} min`;
    }

    // Draw route polyline
    if (this.routePolyline) {
      this.map.removeLayer(this.routePolyline);
    }

    const latlngs = [
      [this.pickup.lat, this.pickup.lng],
      [this.destination.lat, this.destination.lng]
    ];

    this.routePolyline = L.polyline(latlngs, {
      color: '#FF6B00',
      weight: 5,
      opacity: 0.85,
      dashArray: '8, 8'
    }).addTo(this.map);

    try {
      const bounds = L.latLngBounds(latlngs);
      this.map.fitBounds(bounds, { padding: [50, 50] });
    } catch (e) {}

    this.calculateFares(this.distanceKm);
  },

  calculateFares(d) {
    const dist = parseFloat(d) || 1.0;
    const copToUsd = (cop) => (cop / 4000).toFixed(2);
    const copToVes = (cop) => (cop / 100).toFixed(1); // approximate border exchange

    Object.keys(this.fleet).forEach(vKey => {
      const v = this.fleet[vKey];
      const fareCop = dist <= 2.0 ? v.base : v.base + Math.ceil(dist - 2.0) * v.perKm;
      this.fares[vKey] = {
        cop: fareCop,
        usd: copToUsd(fareCop),
        ves: copToVes(fareCop)
      };

      const copEl = document.getElementById(`drive-price-${vKey}-cop`);
      const usdEl = document.getElementById(`drive-price-${vKey}-usd`);
      const vesEl = document.getElementById(`drive-price-${vKey}-ves`);
      if (copEl) copEl.innerText = `$${fareCop.toLocaleString('es-CO')} COP`;
      if (usdEl) usdEl.innerText = `$${this.fares[vKey].usd} USD`;
      if (vesEl) vesEl.innerText = `≈ ${this.fares[vKey].ves} Bs.`;
    });

    this.updateCTAButton();
  },

  selectVehicle(vKey) {
    if (!this.fleet[vKey]) return;
    this.selectedVehicle = vKey;

    Object.keys(this.fleet).forEach(k => {
      const card = document.getElementById(`drive-vcard-${k}`);
      if (card) {
        if (k === vKey) card.classList.add('active');
        else card.classList.remove('active');
      }
    });

    this.updateCTAButton();
  },

  selectPayment(payKey) {
    this.selectedPayment = payKey;
    const chips = document.querySelectorAll('.drive-pay-chip');
    chips.forEach(c => {
      if (c.getAttribute('data-pay') === payKey) c.classList.add('active');
      else c.classList.remove('active');
    });
  },

  switchPanel(panelId) {
    this.currentPanel = panelId;

    // Tabs
    const tabs = document.querySelectorAll('.drive-step-tab');
    tabs.forEach(t => {
      if (t.getAttribute('data-panel') === panelId) t.classList.add('active');
      else t.classList.remove('active');
    });

    // Panel sections
    ['route', 'fleet', 'payment', 'searching'].forEach(p => {
      const el = document.getElementById(`drive-panel-${p}`);
      if (el) {
        el.style.display = p === panelId ? 'block' : 'none';
      }
    });

    // If searching, trigger animation
    if (panelId === 'searching') {
      this.renderSearchingSummary();
    }
  },

  updateCTAButton() {
    const ctaText = document.getElementById('drive-cta-text');
    if (!ctaText) return;

    const v = this.fleet[this.selectedVehicle] || this.fleet.moto;
    const fare = this.fares[this.selectedVehicle]?.cop || v.base;
    ctaText.innerText = `⚡ Pedir ${v.name} ($${fare.toLocaleString('es-CO')} COP)`;
  },

  requestRide() {
    const nameInp = document.getElementById('drive-cust-name');
    const phoneInp = document.getElementById('drive-cust-phone');
    const notesInp = document.getElementById('drive-cust-notes');

    const customerName = (nameInp ? nameInp.value : '').trim();
    const customerPhone = (phoneInp ? phoneInp.value : '').trim();
    const notes = (notesInp ? notesInp.value : '').trim();

    if (!customerName) {
      if (window.MarketplaceApp) window.MarketplaceApp.showToast('⚠️ Por favor ingresa tu nombre');
      else alert('Por favor ingresa tu nombre');
      if (nameInp) nameInp.focus();
      return;
    }

    if (!customerPhone) {
      if (window.MarketplaceApp) window.MarketplaceApp.showToast('⚠️ Por favor ingresa tu WhatsApp de contacto');
      else alert('Por favor ingresa tu WhatsApp de contacto');
      if (phoneInp) phoneInp.focus();
      return;
    }

    if (!this.destination) {
      if (window.MarketplaceApp) window.MarketplaceApp.showToast('⚠️ Selecciona tu punto de destino');
      else alert('Selecciona tu punto de destino');
      this.switchPanel('route');
      return;
    }

    // Persist details
    try {
      localStorage.setItem('order_customer_name', customerName);
      localStorage.setItem('order_customer_phone', customerPhone);
    } catch (e) {}

    const v = this.fleet[this.selectedVehicle] || this.fleet.moto;
    const fareCop = this.fares[this.selectedVehicle]?.cop || v.base;

    this.activeRideRequest = {
      id: 'DRIVE-' + Date.now().toString().slice(-6),
      vehicleType: this.selectedVehicle,
      vehicleName: v.name,
      vehicleEmoji: v.emoji,
      customerName,
      customerPhone,
      notes,
      origin: this.pickup?.address || 'Ubicación GPS',
      originLat: this.pickup?.lat || 7.8145,
      originLng: this.pickup?.lng || -72.4455,
      destination: this.destination?.address || 'Destino seleccionado',
      destLat: this.destination?.lat || 7.8285,
      destLng: this.destination?.lng || -72.4542,
      distanceKm: this.distanceKm,
      fareCop,
      fareUsd: this.fares[this.selectedVehicle]?.usd || (fareCop / 4000).toFixed(2),
      paymentMethod: this.selectedPayment.toUpperCase(),
      createdAt: new Date().toISOString()
    };

    // Save to local ride history
    try {
      const history = JSON.parse(localStorage.getItem('pedigochos_drive_history') || '[]');
      history.unshift(this.activeRideRequest);
      localStorage.setItem('pedigochos_drive_history', JSON.stringify(history.slice(0, 15)));
    } catch (e) {}

    // Dispatch to Marketplace / WebSocket if connected
    if (window.MarketplaceApp && typeof window.MarketplaceApp.sendCustomServiceWebSocket === 'function') {
      try {
        window.MarketplaceApp.sendCustomServiceWebSocket({
          orderType: 'ride',
          serviceType: 'ride',
          vehicleType: this.selectedVehicle,
          customerName,
          customerPhone,
          total: fareCop,
          pickup: this.activeRideRequest.origin,
          destination: this.activeRideRequest.destination,
          distanceKm: this.distanceKm
        });
      } catch (e) {}
    }

    this.switchPanel('searching');
  },

  renderSearchingSummary() {
    const sumEl = document.getElementById('drive-radar-summary-box');
    if (!sumEl || !this.activeRideRequest) return;

    const r = this.activeRideRequest;
    sumEl.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <span style="font-weight: 900; color: #FF9B42; font-size: 13px;">${r.vehicleEmoji} ${r.vehicleName}</span>
        <span style="font-weight: 900; color: #FFF; font-size: 13.5px;">$${r.fareCop.toLocaleString('es-CO')} COP</span>
      </div>
      <div style="font-size: 11.5px; color: #CBD5E1; margin-bottom: 4px;">
        <strong>🟢 Recogida:</strong> ${r.origin}
      </div>
      <div style="font-size: 11.5px; color: #CBD5E1; margin-bottom: 4px;">
        <strong>🏁 Destino:</strong> ${r.destination}
      </div>
      <div style="font-size: 11px; color: #94A3B8;">
        📏 ${r.distanceKm} km · Pago: <strong>${r.paymentMethod}</strong>
      </div>
    `;
  },

  openWhatsAppForRide() {
    if (!this.activeRideRequest) return;
    const r = this.activeRideRequest;

    const originLink = `https://www.google.com/maps?q=${r.originLat},${r.originLng}`;
    const destLink = `https://www.google.com/maps?q=${r.destLat},${r.destLng}`;

    const text =
`⚡ *¡NUEVO VIAJE EN PEDIGOCHOSDRIVE!* ⚡
━━━━━━━━━━━━━━━━━━━━
🚖 *Vehículo:* ${r.vehicleEmoji} ${r.vehicleName.toUpperCase()}
🆔 *Solicitud:* #${r.id}
👤 *Pasajero:* ${r.customerName}
📱 *WhatsApp:* ${r.customerPhone}

🟢 *Punto de Recogida:*
${r.origin}
📍 GPS: ${originLink}

🏁 *Destino:*
${r.destination}
📍 GPS: ${destLink}

📏 *Distancia:* ${r.distanceKm} km
💰 *Tarifa Oficial:* $${r.fareCop.toLocaleString('es-CO')} COP (~$${r.fareUsd} USD)
💵 *Método de Pago:* ${r.paymentMethod}
${r.notes ? `📝 *Observaciones:* ${r.notes}\n` : ''}━━━━━━━━━━━━━━━━━━━━
⚡ _Por favor confirmar conductor disponible para recogida inmediata._`;

    const centralPhone = '573227949751';
    const waUrl = `https://wa.me/${centralPhone}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  },

  cancelSearching() {
    this.activeRideRequest = null;
    this.switchPanel('fleet');
  },

  toggleFaresModal(show = true) {
    const modal = document.getElementById('drive-fares-modal');
    if (!modal) return;
    modal.style.display = show ? 'flex' : 'none';
  },

  toggleHistoryModal(show = true) {
    const modal = document.getElementById('drive-history-modal');
    if (!modal) return;
    modal.style.display = show ? 'flex' : 'none';

    if (show) {
      this.renderHistory();
    }
  },

  renderHistory() {
    const list = document.getElementById('drive-history-list');
    if (!list) return;

    let history = [];
    try {
      history = JSON.parse(localStorage.getItem('pedigochos_drive_history') || '[]');
    } catch (e) {}

    if (history.length === 0) {
      list.innerHTML = `
        <div style="text-align: center; padding: 24px 10px; color: #94A3B8;">
          <div style="font-size: 32px; margin-bottom: 8px;">🚖</div>
          <p style="margin: 0; font-size: 13px; font-weight: 700;">Aún no tienes viajes registrados</p>
          <span style="font-size: 11px;">Tus solicitudes recientes aparecerán aquí</span>
        </div>
      `;
      return;
    }

    list.innerHTML = history.map(h => `
      <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; padding: 12px; margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-weight: 900; color: #FF9B42; font-size: 13px;">${h.vehicleEmoji} ${h.vehicleName}</span>
          <span style="font-weight: 900; color: #FFF; font-size: 13px;">$${h.fareCop.toLocaleString('es-CO')}</span>
        </div>
        <div style="font-size: 11px; color: #94A3B8; margin-bottom: 2px;">
          <strong>De:</strong> ${h.origin}
        </div>
        <div style="font-size: 11px; color: #94A3B8; margin-bottom: 6px;">
          <strong>A:</strong> ${h.destination}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 10px; color: #64748B;">${new Date(h.createdAt).toLocaleDateString()}</span>
          <button type="button" onclick="PediGochosDriveApp.repeatTrip('${h.destLat}', '${h.destLng}', '${h.destination.replace(/'/g, "\\'")}')" style="background: rgba(255,107,0,0.15); border: 1px solid #FF6B00; color: #FF9B42; padding: 4px 10px; border-radius: 8px; font-size: 10.5px; font-weight: 800; cursor: pointer;">
            Repetir Ruta ➔
          </button>
        </div>
      </div>
    `).join('');
  },

  repeatTrip(lat, lng, address) {
    this.toggleHistoryModal(false);
    this.setDestination(parseFloat(lat), parseFloat(lng), address);
    this.switchPanel('fleet');
  },

  callEmergencySOS() {
    if (confirm('🚨 ¿Deseas comunicar con la Central de Auxilio y Emergencias Viales de PediGochos?')) {
      window.location.href = 'tel:+573227949751';
    }
  }
};

window.PediGochosDriveApp = PediGochosDriveApp;
