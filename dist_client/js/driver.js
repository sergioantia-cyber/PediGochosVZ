// Driver Application Logic (driver.js)
// Dedicated portal for Domiciliario Yoxman with Group Chat, Service Dispatch & Daily Finance Table

// Universal Capacitor / Native Android API proxy
(function() {
  const isWebRender = window.location.origin.includes('pedigochos.onrender.com');
  const isLocalDev = window.location.hostname === 'localhost' && window.location.port === '3000';
  
  if (!isWebRender && !isLocalDev) {
    const TARGET_HOST = 'https://pedigochos.onrender.com';
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
      if (typeof input === 'string') {
        if (input.startsWith('/api/')) {
          input = TARGET_HOST + input;
        } else if (input.startsWith('api/')) {
          input = TARGET_HOST + '/' + input;
        }
      } else if (input && input.url) {
        if (input.url.startsWith('/') || input.url.includes('localhost/api/')) {
          const newUrl = input.url.replace(/^(?:https?:\/\/[^\/]+)?\/api\//, TARGET_HOST + '/api/');
          input = new Request(newUrl, input);
        }
      }
      return originalFetch.call(this, input, init);
    };
  }
})();

class DriverController {
  constructor() {
    this.driver = null;
    this.activeTab = 'chat';
    this.chatMessages = [];
    this.activeOrder = null;
    this.knownMessageIds = new Set();
    this.knownOrderIds = new Set();
    this.pollingTimer = null;
    this.chatPollingTimer = null;
    this.watchId = null;
    this.wakeLock = null;
    this.isFirstLoad = true;
    this.ws = null;
    this.routeMap = null;
    this.currentLat = 7.7669;
    this.currentLng = -72.2250;
    this.dismissedOrderIds = new Set();
    this.chatFilter = 'all';
    this.voiceAlertsEnabled = localStorage.getItem('driver_voice_alerts_enabled') !== 'false';
    this.currentProofPhoto = null;
    this.showChangeCalc = false;
    try {
      const savedDismissed = JSON.parse(localStorage.getItem('pedigochos_dismissed_services') || '[]');
      if (Array.isArray(savedDismissed)) {
        savedDismissed.forEach(id => this.dismissedOrderIds.add(id));
      }
    } catch(e) {}
  }

  init() {
    this.requestWakeLock();
    this.setupAudioUnlock();
    this.updateVoiceToggleUI();
    this.checkLocalSession();
  }

  toggleVoiceAlerts() {
    this.voiceAlertsEnabled = !this.voiceAlertsEnabled;
    localStorage.setItem('driver_voice_alerts_enabled', this.voiceAlertsEnabled ? 'true' : 'false');
    this.updateVoiceToggleUI();
    if (this.voiceAlertsEnabled) {
      this.speakText('Alertas por voz activadas');
    }
  }

  updateVoiceToggleUI() {
    const btn = document.getElementById('btn-voice-toggle');
    const icon = document.getElementById('voice-icon');
    const label = document.getElementById('voice-label');
    if (btn && icon && label) {
      if (this.voiceAlertsEnabled) {
        btn.classList.remove('off');
        icon.innerText = '🔊';
        label.innerText = 'Voz Activa';
      } else {
        btn.classList.add('off');
        icon.innerText = '🔇';
        label.innerText = 'Voz Silenciada';
      }
    }
  }

  speakText(text) {
    if (!this.voiceAlertsEnabled || !text) return;
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        
        const voices = window.speechSynthesis.getVoices();
        const esVoice = voices.find(v => v.lang && (v.lang.startsWith('es') || v.lang.includes('ES')));
        if (esVoice) utterance.voice = esVoice;

        window.speechSynthesis.speak(utterance);
      }
    } catch(err) {
      console.warn('Speech synthesis notice:', err);
    }
  }

  speakServiceAlert(msg) {
    if (!this.voiceAlertsEnabled || !msg) return;
    const isRide = msg.serviceType === 'ride';
    const origin = (msg.origin || 'ubicación actual').replace(/[^\w\s\u00C0-\u00FF]/gi, ' ').trim();
    const dest = (msg.destination || 'destino').replace(/[^\w\s\u00C0-\u00FF]/gi, ' ').trim();
    const fare = msg.fare || 0;
    
    let text = '';
    if (isRide) {
      text = `¡Atención! Nueva carrera móvil de ${origin} hacia ${dest}. Ganancia: ${fare} pesos.`;
    } else {
      text = `¡Atención! Nuevo pedido en ${origin} para entregar en ${dest}. Ganancia: ${fare} pesos.`;
    }
    this.speakText(text);
  }

  setupAudioUnlock() {
    const unlock = () => {
      if (typeof Sound !== 'undefined') {
        Sound.init();
      }
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
    };
    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('touchstart', unlock, { once: true });
  }

  async requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        if (!this.wakeLock || this.wakeLock.released) {
          this.wakeLock = await navigator.wakeLock.request('screen');
        }
      }
    } catch(err) {
      console.warn('Wake Lock notice:', err);
    }
  }

  checkLocalSession() {
    try {
      const saved = JSON.parse(localStorage.getItem('pedigochos_active_driver') || 'null');
      if (saved && (saved.username === 'yoxman' || saved.id === 'drv-yoxman' || saved.phone === 'yoxman' || saved.name === 'Yoxman')) {
        this.driver = saved;
        // Lock name strictly to Yoxman
        this.driver.name = 'Yoxman';
        this.driver.isLockedName = true;
        this.onSessionAuthenticated();
        return;
      }
      // Show login gate if no session
      this.showLoginGate();
    } catch(e) {
      this.showLoginGate();
    }
  }

  showLoginGate() {
    const gate = document.getElementById('driver-login-gate');
    if (gate) {
      gate.classList.remove('hidden');
      gate.style.display = 'flex';
    }
    const uInp = document.getElementById('driver-input-username');
    const pInp = document.getElementById('driver-input-password');
    if (uInp && !uInp.value) uInp.value = 'yoxman';
    if (pInp && !pInp.value) pInp.value = '12345@';
  }

  async loginDriver() {
    const uInp = document.getElementById('driver-input-username');
    const pInp = document.getElementById('driver-input-password');
    const errEl = document.getElementById('driver-login-error');

    const username = (uInp ? uInp.value : '').trim();
    const password = (pInp ? pInp.value : '').trim();

    if (!username || !password) {
      if (errEl) {
        errEl.innerText = '⚠️ Ingresa usuario y clave.';
        errEl.classList.remove('hidden');
      }
      return;
    }

    try {
      const res = await fetch('/api/driver/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        const data = await res.json();
        this.driver = data.driver;
        // Guarantee locked name
        this.driver.name = 'Yoxman';
        this.driver.isLockedName = true;
        localStorage.setItem('pedigochos_active_driver', JSON.stringify(this.driver));
        this.onSessionAuthenticated();
      } else {
        const errData = await res.json().catch(() => ({}));
        if (errEl) {
          errEl.innerText = errData.error || '⚠️ Credenciales incorrectas. Verifica usuario y clave.';
          errEl.classList.remove('hidden');
        }
      }
    } catch(e) {
      console.error(e);
      if (errEl) {
        errEl.innerText = 'Error de conexión con el servidor.';
        errEl.classList.remove('hidden');
      }
    }
  }

  onSessionAuthenticated() {
    const gate = document.getElementById('driver-login-gate');
    if (gate) {
      gate.classList.add('hidden');
      gate.style.display = 'none';
    }

    this.updateProfileUI();
    this.startDriverServices();
    this.initWebSocket();
  }

  logout() {
    if (!confirm('¿Deseas cerrar tu sesión de repartidor?')) return;
    localStorage.removeItem('pedigochos_active_driver');
    this.driver = null;
    if (this.pollingTimer) clearInterval(this.pollingTimer);
    if (this.chatPollingTimer) clearInterval(this.chatPollingTimer);
    if (this.watchId) navigator.geolocation.clearWatch(this.watchId);
    this.showLoginGate();
  }

  updateProfileUI() {
    if (!this.driver) return;
    const nameEl = document.getElementById('driver-profile-name');
    const phoneEl = document.getElementById('driver-profile-phone');
    if (nameEl) nameEl.innerText = 'Yoxman';
    if (phoneEl) phoneEl.innerText = `Repartidor Oficial • ${this.driver.vehicleType || 'Moto 🛵'}`;
  }

  startDriverServices() {
    // 1. Enable Duty Status
    const toggle = document.getElementById('driver-duty-toggle');
    if (toggle) toggle.checked = true;
    this.toggleDutyStatus(true);

    // 2. Start Group Chat Polling (every 3 seconds)
    this.loadChatMessages();
    if (this.chatPollingTimer) clearInterval(this.chatPollingTimer);
    this.chatPollingTimer = setInterval(() => {
      this.loadChatMessages();
    }, 3000);

    // 3. Start Orders Polling (every 4 seconds)
    this.checkActiveOrders();
    if (this.pollingTimer) clearInterval(this.pollingTimer);
    this.pollingTimer = setInterval(() => {
      this.checkActiveOrders();
    }, 4000);

    // 4. Start Live GPS Watcher
    this.startGPSWatcher();
  }

  toggleDutyStatus(isOnline) {
    const badge = document.getElementById('duty-status-badge');
    if (badge) {
      if (isOnline) {
        badge.innerText = '🟢 En Línea';
        badge.className = 'duty-badge badge-online';
      } else {
        badge.innerText = '🔴 Fuera';
        badge.className = 'duty-badge badge-offline';
      }
    }
  }

  switchTab(tabName) {
    this.activeTab = tabName;
    ['chat', 'active', 'history'].forEach(t => {
      const btn = document.getElementById(`tab-btn-${t}`);
      const view = document.getElementById(`tab-view-${t}`);
      if (btn) btn.classList.toggle('active', t === tabName);
      if (view) view.classList.toggle('hidden', t !== tabName);
    });

    if (tabName === 'chat') {
      this.loadChatMessages();
      this.scrollChatToBottom();
    }
    if (tabName === 'active') this.renderActiveOrderTab();
    if (tabName === 'history') this.loadDailyHistory();
  }

  // ==========================================
  // GROUP CHAT & INCOMING SERVICE REQUESTS
  // ==========================================
  setChatFilter(filter) {
    this.chatFilter = filter;
    document.querySelectorAll('.chat-filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-filter') === filter);
    });
    this.renderChatFeed();
  }

  async loadChatMessages() {
    try {
      const res = await fetch('/api/driver/chat');
      if (!res.ok) return;
      const messages = await res.json();
      if (!Array.isArray(messages)) return;

      // Check for newly arrived available service requests to sound loud alarm & speak voice
      const newServiceRequests = messages.filter(m => m.type === 'service_request' && m.status === 'Disponible');
      const brandNewList = newServiceRequests.filter(r => !this.knownMessageIds.has(r.id));

      if (brandNewList.length > 0 && !this.isFirstLoad) {
        if (typeof Sound !== 'undefined') {
          Sound.playLoudAlarmBurst();
        }
        if (navigator.vibrate) {
          navigator.vibrate([0, 800, 300, 800, 300, 1000]);
        }
        // Speak incoming service announcement aloud
        this.speakServiceAlert(brandNewList[0]);
      }

      messages.forEach(m => this.knownMessageIds.add(m.id));
      this.isFirstLoad = false;
      this.chatMessages = messages;

      this.renderChatFeed();
    } catch(e) {
      console.warn('Error fetching driver chat:', e);
    }
  }

  renderChatFeed() {
    const feed = document.getElementById('driver-chat-feed');
    if (!feed) return;

    // Update filter badge counters
    let countAll = 0;
    let countRide = 0;
    let countFood = 0;
    let countParcel = 0;
    let countMessages = 0;

    this.chatMessages.forEach(m => {
      countAll++;
      if (m.type === 'service_request') {
        const isRide = m.serviceType === 'ride';
        const isParcel = m.serviceType === 'parcel' || m.serviceType === 'encomienda' || m.vehicleType === 'encomienda';
        if (isRide) countRide++;
        else if (isParcel) countParcel++;
        else countFood++;
      } else {
        countMessages++;
      }
    });

    const elAll = document.getElementById('filter-count-all');
    const elRide = document.getElementById('filter-count-ride');
    const elFood = document.getElementById('filter-count-food');
    const elParcel = document.getElementById('filter-count-parcel');
    const elMessages = document.getElementById('filter-count-messages');

    if (elAll) elAll.innerText = countAll;
    if (elRide) elRide.innerText = countRide;
    if (elFood) elFood.innerText = countFood;
    if (elParcel) elParcel.innerText = countParcel;
    if (elMessages) elMessages.innerText = countMessages;

    // Filter messages according to current filter
    const visibleMessages = this.chatMessages.filter(msg => {
      if (this.chatFilter === 'all') return true;
      if (this.chatFilter === 'messages') return msg.type !== 'service_request';
      if (msg.type !== 'service_request') return false;
      const isRide = msg.serviceType === 'ride';
      const isParcel = msg.serviceType === 'parcel' || msg.serviceType === 'encomienda' || msg.vehicleType === 'encomienda';
      if (this.chatFilter === 'ride') return isRide;
      if (this.chatFilter === 'parcel') return isParcel;
      if (this.chatFilter === 'food') return !isRide && !isParcel;
      return true;
    });

    if (visibleMessages.length === 0) {
      const filterLabels = {
        all: 'solicitudes en tiempo real',
        ride: 'solicitudes de carreras de motos/autos',
        food: 'pedidos de restaurantes',
        parcel: 'solicitudes de encomiendas',
        messages: 'mensajes de texto'
      };
      feed.innerHTML = `
        <div class="empty-state-card" style="margin-top: 10px; padding: 24px;">
          <span class="empty-icon">💬</span>
          <h3 style="font-size: 15px; margin: 0 0 6px 0;">Sin elementos para este filtro</h3>
          <p style="font-size: 12px; color: #94A3B8; margin: 0;">No hay ${filterLabels[this.chatFilter] || 'elementos'} en este momento.</p>
        </div>
      `;
      return;
    }

    const html = visibleMessages.map(msg => {
      const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

      if (msg.type === 'service_request') {
        const isRide = msg.serviceType === 'ride';
        const isLujo = msg.vehicleType === 'lujo';
        const isTaken = msg.status === 'Tomado';
        const isEntregado = msg.status === 'Entregado';
        const takenByMe = isTaken && (msg.takenBy === 'Yoxman' || msg.takenBy === this.driver?.name);
        const isDismissed = this.dismissedOrderIds.has(msg.orderId);

        // Folded & greyed out collapsed card when dismissed by driver
        if (isDismissed) {
          return `
            <div class="service-request-card service-card-dismissed" id="service-card-${msg.orderId}">
              <div class="service-card-top">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="service-type-badge">✖ Descartado</span>
                  <span style="font-size: 12px; color: #94A3B8; font-weight: 700;">
                    ${isRide ? '🚖 Traslado' : '📦 Encomienda'} #${(msg.orderId || '').slice(-4)} • ${msg.fareFormatted || `$${msg.fare} COP`}
                  </span>
                </div>
                <button type="button" class="btn-restore-card" onclick="event.stopPropagation(); DriverApp.restoreServiceCard('${msg.orderId}')" title="Restaurar y ver detalles">
                  ↩ Restaurar
                </button>
              </div>
            </div>
          `;
        }

        const safeOrigin = (msg.origin || 'Ubicación GPS').replace(/'/g, "\\'");
        const safeDest = (msg.destination || 'Dirección de entrega').replace(/'/g, "\\'");

        return `
          <div class="service-request-card ${isTaken ? 'taken' : ''} ${isLujo ? 'ride-lujo' : ''}" id="service-card-${msg.orderId}">
            <div class="service-card-top">
              <span class="service-type-badge ${isLujo ? 'lujo' : ''}">
                ${isRide ? '🚖 TRASLADO MÓVIL' : '📦 ENCOMIENDA DELIVERY'} • ${msg.vehicleLabel || 'Moto Taxi'}
              </span>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="service-price-pill">${msg.fareFormatted || `$${msg.fare} COP`}</span>
                <button type="button" class="btn-dismiss-card" onclick="event.stopPropagation(); DriverApp.dismissServiceCard('${msg.orderId}')" title="Cerrar / Descartar servicio">
                  ✕ Cerrar
                </button>
              </div>
            </div>

            <!-- Route Details -->
            <div class="service-route-box">
              <div class="route-step">
                <span class="route-icon" style="color: #10B981;">🟢</span>
                <div class="route-text" style="flex: 1;">
                  <strong>Recogida (Origen):</strong>
                  <span>${msg.origin || 'Ubicación GPS'}</span>
                  <button type="button" class="btn-mini-map-action" onclick="event.stopPropagation(); DriverApp.openMapLocation('${msg.originLat || ''}', '${msg.originLng || ''}', '${safeOrigin}')">
                    🗺️ Ver mapa
                  </button>
                </div>
              </div>

              <div class="route-step" style="margin-top: 8px;">
                <span class="route-icon" style="color: #EF4444;">🏁</span>
                <div class="route-text" style="flex: 1;">
                  <strong>Destino (Llegada):</strong>
                  <span>${msg.destination || 'Dirección de entrega'}</span>
                  <button type="button" class="btn-mini-map-action" onclick="event.stopPropagation(); DriverApp.openMapLocation('${msg.destLat || ''}', '${msg.destLng || ''}', '${safeDest}')">
                    🗺️ Ver mapa
                  </button>
                </div>
              </div>
            </div>

            <!-- Info Bar with Voice Button -->
            <div class="service-details-row">
              <span>📏 <strong>${msg.distanceKm || 1} km</strong></span>
              <span>👤 <strong>${msg.customerName || 'Cliente'}</strong></span>
              <button type="button" class="btn-mini-map-action" onclick="event.stopPropagation(); DriverApp.speakServiceAlert({ serviceType: '${msg.serviceType || ''}', origin: '${safeOrigin}', destination: '${safeDest}', fare: ${msg.fare || 0} })" title="Escuchar detalles por audio de voz" style="color: #38BDF8; background: rgba(56, 189, 248, 0.15); border-color: rgba(56, 189, 248, 0.3);">
                🔊 Oír
              </button>
              <span style="color: #94A3B8; margin-left: auto;">⏰ ${timeStr}</span>
            </div>

            <!-- Clickable Action Button -->
            ${!isTaken && !isEntregado ? `
              <button type="button" class="btn-take-service" onclick="DriverApp.takeService('${msg.orderId}')">
                🛵 TOMAR SERVICIO / ACEPTAR CARRERA
              </button>
            ` : takenByMe ? `
              <button type="button" class="btn-take-service" onclick="DriverApp.switchTab('active')" style="background: linear-gradient(180deg, #059669 0%, #047857 100%);">
                🛵 VER MI SERVICIO ACTIVO EN CURSO
              </button>
            ` : `
              <div class="btn-take-service disabled">
                🔒 Tomado por ${msg.takenBy || 'otro repartidor'}
              </div>
            `}
          </div>
        `;
      }

      // Regular text chat message
      const isSelf = msg.senderName === 'Yoxman' || msg.senderName === this.driver?.name;
      const isOwner = msg.senderRole === 'owner';
      return `
        <div class="chat-bubble-msg ${isSelf ? 'self' : ''} ${isOwner ? 'owner-msg' : ''}">
          <div class="chat-sender-name">
            <span>${msg.senderName || 'Repartidor'}</span>
            <span class="chat-time-tag">${timeStr}</span>
          </div>
          <div class="chat-body-text">${this.escapeHtml(msg.text || '')}</div>
        </div>
      `;
    }).join('');

    const isAtBottom = feed.scrollHeight - feed.scrollTop <= feed.clientHeight + 100;
    feed.innerHTML = html;
    if (isAtBottom) {
      feed.scrollTop = feed.scrollHeight;
    }
  }

  scrollChatToBottom() {
    const feed = document.getElementById('driver-chat-feed');
    if (feed) {
      setTimeout(() => { feed.scrollTop = feed.scrollHeight; }, 100);
    }
  }

  async sendChatMessage() {
    const inp = document.getElementById('driver-chat-input');
    if (!inp) return;
    const text = inp.value.trim();
    if (!text) return;

    try {
      inp.value = '';
      const res = await fetch('/api/driver/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName: 'Yoxman',
          senderPhone: this.driver?.phone || 'yoxman',
          text: text
        })
      });

      if (res.ok) {
        const msg = await res.json();
        this.chatMessages.push(msg);
        this.renderChatFeed();
        this.scrollChatToBottom();
      }
    } catch(e) {
      console.error('Error sending chat message:', e);
    }
  }

  // Dismiss and fold a service card ("se recoge y se queda gris como deshabilitada y se cierra la ventana de informacion")
  dismissServiceCard(orderId) {
    if (!orderId) return;
    this.dismissedOrderIds.add(orderId);
    try {
      localStorage.setItem('pedigochos_dismissed_services', JSON.stringify(Array.from(this.dismissedOrderIds)));
    } catch(e) {}

    // Close active info card if it was open for this order
    if (this.activeOrder && this.activeOrder.id === orderId) {
      this.activeOrder = null;
    }
    
    // Switch to chat tab to close any active window/view
    this.switchTab('chat');
    this.renderChatFeed();
  }

  // Restore a folded/dismissed service card
  restoreServiceCard(orderId) {
    if (!orderId) return;
    this.dismissedOrderIds.delete(orderId);
    try {
      localStorage.setItem('pedigochos_dismissed_services', JSON.stringify(Array.from(this.dismissedOrderIds)));
    } catch(e) {}
    this.renderChatFeed();
  }

  // Open location in Google Maps (Fixed for Android Capacitor WebView)
  openMapLocation(lat, lng, address) {
    let query = '';
    const numLat = parseFloat(lat);
    const numLng = parseFloat(lng);

    if (!isNaN(numLat) && !isNaN(numLng) && numLat !== 0 && numLng !== 0) {
      query = `${numLat},${numLng}`;
    } else if (address && address.trim()) {
      query = address.trim();
    } else {
      query = 'San Cristóbal, Táchira';
    }

    const gmapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    
    try {
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
        window.open(gmapsUrl, '_system');
      } else {
        const opened = window.open(gmapsUrl, '_system') || window.open(gmapsUrl, '_blank');
        if (!opened) window.location.href = gmapsUrl;
      }
    } catch(e) {
      window.location.href = gmapsUrl;
    }
  }

  // Open full route with origin and destination in Google Maps
  openFullRouteInGoogleMaps(oLat, oLng, dLat, dLng, originName, destName) {
    const oQuery = (oLat && oLng && !isNaN(parseFloat(oLat))) ? `${oLat},${oLng}` : (originName || 'Punto de Recogida');
    const dQuery = (dLat && dLng && !isNaN(parseFloat(dLat))) ? `${dLat},${dLng}` : (destName || 'Destino');
    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(oQuery)}&destination=${encodeURIComponent(dQuery)}&travelmode=driving`;

    try {
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
        window.open(url, '_system');
      } else {
        const opened = window.open(url, '_system') || window.open(url, '_blank');
        if (!opened) window.location.href = url;
      }
    } catch(e) {
      window.location.href = url;
    }
  }

  // Open Destination in Waze GPS
  openWazeNavigation(dLat, dLng, destName) {
    let wazeUrl = '';
    if (dLat && dLng && !isNaN(parseFloat(dLat))) {
      wazeUrl = `https://waze.com/ul?ll=${dLat},${dLng}&navigate=yes`;
    } else {
      wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(destName || 'Destino')}&navigate=yes`;
    }

    try {
      const opened = window.open(wazeUrl, '_system') || window.open(wazeUrl, '_blank');
      if (!opened) window.location.href = wazeUrl;
    } catch(e) {
      window.location.href = wazeUrl;
    }
  }

  // ==========================================
  // TAKE & ACCEPT SERVICE
  // ==========================================
  async takeService(orderId) {
    if (!orderId) return;

    try {
      const res = await fetch('/api/driver/accept-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderId,
          driverId: this.driver?.id || 'drv-yoxman',
          driverName: 'Yoxman',
          driverPhone: this.driver?.phone || 'yoxman'
        })
      });

      if (res.ok) {
        const data = await res.json();
        this.activeOrder = data.order;
        if (typeof Sound !== 'undefined') Sound.playBell();
        if (navigator.vibrate) navigator.vibrate([0, 500, 150, 500]);
        
        // Update local message state
        const chatCard = this.chatMessages.find(m => m.orderId === orderId);
        if (chatCard) {
          chatCard.status = 'Tomado';
          chatCard.takenBy = 'Yoxman';
          this.renderChatFeed();
        }

        // Switch directly to active order detail tab
        this.switchTab('active');
      } else {
        alert('Este servicio ya fue tomado por otro compañero repartidor.');
        this.loadChatMessages();
      }
    } catch(e) {
      console.error(e);
      alert('Error de conexión al tomar el servicio.');
    }
  }

  // ==========================================
  // ACTIVE ORDER VIEW & CUSTOMER DETAILS
  // ==========================================
  async checkActiveOrders() {
    try {
      const res = await fetch('/api/driver/orders');
      if (!res.ok) return;
      const orders = await res.json();
      if (!Array.isArray(orders)) return;

      const myActive = orders.find(o => 
        o.driver && 
        (o.driver.name === 'Yoxman' || o.driver.id === this.driver?.id) && 
        o.status === 'En Camino'
      );

      if (myActive) {
        this.activeOrder = myActive;
        if (this.activeTab === 'active') this.renderActiveOrderTab();
      } else if (this.activeOrder && this.activeOrder.status === 'En Camino') {
        const fresh = orders.find(o => o.id === this.activeOrder.id);
        if (!fresh || fresh.status === 'Entregado') {
          this.activeOrder = null;
          if (this.activeTab === 'active') this.renderActiveOrderTab();
        }
      }
    } catch(e) {
      console.warn('Check active orders notice:', e);
    }
  }

  renderActiveOrderTab() {
    const emptyMsg = document.getElementById('no-active-order-msg');
    const detailsCard = document.getElementById('active-order-details-card');

    if (!this.activeOrder || this.activeOrder.status === 'Entregado') {
      if (emptyMsg) emptyMsg.classList.remove('hidden');
      if (detailsCard) detailsCard.classList.add('hidden');
      return;
    }

    if (emptyMsg) emptyMsg.classList.add('hidden');
    if (detailsCard) detailsCard.classList.remove('hidden');

    const order = this.activeOrder;
    const isRide = order.orderType === 'ride' || order.serviceType === 'ride';
    const dDetails = order.deliveryDetails || {};

    const custName = order.customerName || dDetails.name || 'Cliente';
    const custPhone = order.customerPhone || dDetails.phone || '';
    const originAddr = isRide ? (dDetails.origin || 'Ubicación GPS') : (order.establishmentName || 'Restaurante');
    const destAddr = isRide ? (dDetails.destination || dDetails.address || 'Destino') : (dDetails.address || 'Dirección de Entrega');
    
    // GPS Links
    const originLat = dDetails.originLat || dDetails.latitude;
    const originLng = dDetails.originLng || dDetails.longitude;
    const destLat = dDetails.destLat;
    const destLng = dDetails.destLng;

    const gmapsOrigin = (originLat && originLng)
      ? `https://www.google.com/maps?q=${originLat},${originLng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(originAddr)}`;

    const gmapsDest = (destLat && destLng)
      ? `https://www.google.com/maps?q=${destLat},${destLng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destAddr)}`;

    const wazeDest = (destLat && destLng)
      ? `https://waze.com/ul?ll=${destLat},${destLng}&navigate=yes`
      : `https://waze.com/ul?q=${encodeURIComponent(destAddr)}&navigate=yes`;

    // Pricing calculation
    const totalCop = Math.round(order.total < 1000 ? order.total * 1000 : order.total);
    const totalBs = (totalCop / 100).toFixed(2);
    const totalUsd = (totalCop / 4000).toFixed(2);

    const whatsappGreeting = encodeURIComponent(`Hola ${custName}, soy Yoxman de PediGochos 🛵. Ya tomé tu servicio y voy en camino hacia tu ubicación.`);
    const cleanPhone = custPhone ? custPhone.replace(/\D/g, '') : '';
    const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${whatsappGreeting}` : '#';

    detailsCard.innerHTML = `
      <div class="order-card-3d" style="border: 2px solid #10B981; padding: 18px;">
        <div class="card-header-bar" style="margin-bottom: 14px;">
          <div>
            <span class="card-shop-name" style="font-size: 16px;">🛵 ${isRide ? 'Carrera Móvil' : 'Encomienda'} #${order.id.slice(-5)}</span>
            <span style="display: block; font-size: 11.5px; color: #10B981; font-weight: 800; margin-top: 2px;">🟢 EN SERVICIO ACTIVO</span>
          </div>
          <span class="card-fee-badge" style="font-size: 14px;">💰 $${totalCop.toLocaleString('de-DE')} COP</span>
        </div>

        <!-- 0. Interactive Leaflet Route Map (Two Marked Points: Origen ➡️ Destino) -->
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 12px; margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 11px; text-transform: uppercase; color: #10B981; font-weight: 800; display: flex; align-items: center; gap: 6px;">
              🗺️ Mapa de la Carrera (Inicio ➔ Destino)
            </span>
            <span style="font-size: 11px; color: #94A3B8; font-weight: 700;">
              📏 ${dDetails.distanceKm || 1} km
            </span>
          </div>

          <div id="driver-route-map" class="driver-route-map"></div>

          <!-- Direct Navigation Launchers -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px;">
            <button type="button" class="btn-3d btn-3d-blue" onclick="DriverApp.openFullRouteInGoogleMaps('${originLat || ''}', '${originLng || ''}', '${destLat || ''}', '${destLng || ''}', '${originAddr.replace(/'/g, "\\'")}', '${destAddr.replace(/'/g, "\\'")}')" style="font-size: 11.5px; padding: 10px;">
              🗺️ Ruta Google Maps
            </button>
            <button type="button" class="btn-3d" onclick="DriverApp.openWazeNavigation('${destLat || ''}', '${destLng || ''}', '${destAddr.replace(/'/g, "\\'")}')" style="background: #33CCFF; color: #000; font-weight: 900; font-size: 11.5px; padding: 10px;">
              🧭 Navegar en Waze
            </button>
          </div>
        </div>

        <!-- 1. Customer Details & Direct Contact -->
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 14px; margin-bottom: 12px;">
          <span style="font-size: 11px; text-transform: uppercase; color: #94A3B8; font-weight: 800; display: block; margin-bottom: 6px;">👤 Datos del Cliente</span>
          <div style="font-size: 16px; font-weight: 900; color: #FFF; margin-bottom: 2px;">${custName}</div>
          <div style="font-size: 13px; color: #CBD5E1; margin-bottom: 12px;">📱 ${custPhone || 'Sin teléfono especificado'}</div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            ${custPhone ? `
              <a href="tel:${custPhone}" class="btn-3d btn-3d-emerald" style="font-size: 12.5px; padding: 10px;">
                📞 Llamar Cliente
              </a>
              <a href="${whatsappUrl}" target="_blank" class="btn-3d" style="background: #25D366; color: #FFF; font-size: 12.5px; padding: 10px; font-weight: 800;">
                💬 WhatsApp
              </a>
            ` : `<div style="grid-column: span 2; font-size: 12px; color: #94A3B8;">Sin número de contacto directo</div>`}
          </div>
        </div>

        <!-- 2. Route & Navigation GPS -->
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 14px; margin-bottom: 12px;">
          <span style="font-size: 11px; text-transform: uppercase; color: #94A3B8; font-weight: 800; display: block; margin-bottom: 8px;">📍 Ruta de Recogida y Destino</span>
          
          <div style="margin-bottom: 10px;">
            <span style="color: #10B981; font-weight: 800; font-size: 12px;">🟢 1. Punto de Recogida:</span>
            <div style="font-size: 13.5px; color: #FFF; font-weight: 700; margin: 2px 0 4px 0;">${originAddr}</div>
            <button type="button" class="btn-3d btn-3d-blue" onclick="DriverApp.openMapLocation('${originLat || ''}', '${originLng || ''}', '${originAddr.replace(/'/g, "\\'")}')" style="font-size: 11.5px; padding: 6px 12px; display: inline-flex;">
              📍 Navegar al Origen (Google Maps)
            </button>
          </div>

          <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.06); margin: 8px 0;">

          <div>
            <span style="color: #EF4444; font-weight: 800; font-size: 12px;">🏁 2. Punto de Destino:</span>
            <div style="font-size: 13.5px; color: #FFF; font-weight: 700; margin: 2px 0 6px 0;">${destAddr}</div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <button type="button" class="btn-3d btn-3d-blue" onclick="DriverApp.openMapLocation('${destLat || ''}', '${destLng || ''}', '${destAddr.replace(/'/g, "\\'")}')" style="font-size: 11.5px; padding: 8px;">
                📍 Google Maps
              </button>
              <button type="button" class="btn-3d" onclick="DriverApp.openWazeNavigation('${destLat || ''}', '${destLng || ''}', '${destAddr.replace(/'/g, "\\'")}')" style="background: #33CCFF; color: #000; font-weight: 900; font-size: 11.5px; padding: 8px;">
                🗺️ Waze GPS
              </button>
            </div>
          </div>
        </div>

        <!-- 3. Payment & Money Details -->
        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 14px; padding: 14px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-size: 11px; text-transform: uppercase; color: #10B981; font-weight: 800;">💵 Cobro en Destino</span>
            <button type="button" class="btn-mini-map-action" onclick="DriverApp.toggleChangeCalc()" style="background: #10B981; color: #000; font-weight: 900; border: none; padding: 4px 10px; cursor: pointer;">
              🧮 Calcular Vuelto
            </button>
          </div>
          <div style="font-size: 18px; font-weight: 900; color: #FFF;">Total: $${totalCop.toLocaleString('de-DE')} COP</div>
          <div style="display: flex; gap: 8px; font-size: 11.5px; color: #CBD5E1; margin-top: 4px;">
            <span>🇻🇪 Bs. ${totalBs}</span>
            <span>•</span>
            <span>💵 $${totalUsd} USD</span>
          </div>
          <div style="font-size: 12.5px; font-weight: 800; color: #34D399; margin-top: 6px;">
            ${order.paymentMethod === 'Transferencia' ? '📲 Pagado por Transferencia / Pago Móvil' : `💵 Efectivo: ${order.paymentNotes || 'Monto exacto'}`}
          </div>

          <!-- Quick Change / Vuelto Calculator Box -->
          <div id="driver-change-calc-box" class="change-calc-box ${this.showChangeCalc ? '' : 'hidden'}">
            <div style="font-size: 11.5px; color: #94A3B8; font-weight: 800; margin-bottom: 6px;">¿Con cuánto paga el cliente?</div>
            <div class="calc-quick-pills">
              <button type="button" class="calc-pill-btn" onclick="DriverApp.calculateChange(${totalCop})">Monto Exacto</button>
              <button type="button" class="calc-pill-btn" onclick="DriverApp.calculateChange(10000)">$10.000 COP</button>
              <button type="button" class="calc-pill-btn" onclick="DriverApp.calculateChange(20000)">$20.000 COP</button>
              <button type="button" class="calc-pill-btn" onclick="DriverApp.calculateChange(50000)">$50.000 COP</button>
              <button type="button" class="calc-pill-btn" onclick="DriverApp.calculateChange(100000)">$100.000 COP</button>
              <button type="button" class="calc-pill-btn" onclick="DriverApp.calculateChange(20000)" style="border-color: #38BDF8; color: #38BDF8;">$5 USD ($20k)</button>
              <button type="button" class="calc-pill-btn" onclick="DriverApp.calculateChange(40000)" style="border-color: #38BDF8; color: #38BDF8;">$10 USD ($40k)</button>
              <button type="button" class="calc-pill-btn" onclick="DriverApp.calculateChange(80000)" style="border-color: #38BDF8; color: #38BDF8;">$20 USD ($80k)</button>
            </div>
            <div style="display: flex; gap: 8px; margin-top: 6px;">
              <input type="number" id="calc-received-input" placeholder="Otro monto en pesos ($ COP)" class="input-3d" style="padding: 8px 12px; font-size: 13px;" oninput="DriverApp.calculateChange()">
            </div>
            <div id="calc-change-result" class="calc-result-badge hidden"></div>
          </div>
        </div>

        <!-- 4. Photo Proof of Delivery -->
        <div class="proof-photo-section">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; text-transform: uppercase; color: #94A3B8; font-weight: 800;">📸 Foto de Comprobante (Opcional)</span>
            <span style="font-size: 11px; color: #10B981; font-weight: 700;">Prueba de Entrega</span>
          </div>
          <p style="font-size: 11.5px; color: #64748B; margin: 4px 0 10px 0;">Toma una foto de la fachada o el paquete entregado como respaldo.</p>
          <input type="file" id="driver-proof-file-input" accept="image/*" capture="environment" style="display: none;" onchange="DriverApp.handleProofPhoto(event)">
          <button type="button" class="btn-3d" onclick="DriverApp.triggerProofPhoto()" style="background: #1E293B; border: 1px solid #334155; color: #F8FAFC; width: 100%; font-size: 12.5px; padding: 10px;">
            📷 Tomar / Adjuntar Foto de Entrega
          </button>
          <div id="driver-proof-preview-wrap" class="hidden"></div>
        </div>

        <!-- 5. Complete Action Button -->
        <button type="button" class="btn-3d btn-3d-emerald" onclick="DriverApp.completeOrder('${order.id}')" style="width: 100%; font-size: 15px; padding: 16px; background: linear-gradient(180deg, #059669 0%, #047857 100%);">
          ✅ Confirmar Entrega Realizada / Carrera Finalizada
        </button>
      </div>
    `;

    // Initialize interactive Leaflet map with Start and Destination marked
    this.initActiveRouteMap(order);

    // If proof photo exists in state, restore preview
    if (this.currentProofPhoto) {
      this.renderProofPhotoPreview();
    }
  }

  toggleChangeCalc() {
    this.showChangeCalc = !this.showChangeCalc;
    const box = document.getElementById('driver-change-calc-box');
    if (box) box.classList.toggle('hidden', !this.showChangeCalc);
  }

  calculateChange(receivedAmount) {
    if (!this.activeOrder) return;
    const totalCop = Math.round(this.activeOrder.total < 1000 ? this.activeOrder.total * 1000 : this.activeOrder.total);
    const inp = document.getElementById('calc-received-input');
    if (inp && receivedAmount !== undefined) {
      inp.value = receivedAmount;
    }
    const val = parseFloat(inp ? inp.value : receivedAmount) || 0;
    const changeCop = Math.max(0, val - totalCop);
    const changeBs = (changeCop / 100).toFixed(2);
    const changeUsd = (changeCop / 4000).toFixed(2);

    const resBox = document.getElementById('calc-change-result');
    if (resBox) {
      if (val < totalCop && val > 0) {
        resBox.innerHTML = `
          <div style="color: #F87171; font-weight: 800; font-size: 13px;">
            ⚠️ Falta dinero: Faltan $${(totalCop - val).toLocaleString('de-DE')} COP por cobrar.
          </div>
        `;
        resBox.classList.remove('hidden');
      } else if (val >= totalCop) {
        resBox.innerHTML = `
          <div style="font-size: 11px; text-transform: uppercase; color: #10B981; font-weight: 800;">💰 Vuelto a entregar al Cliente:</div>
          <div style="font-size: 22px; font-weight: 900; color: #34D399; margin: 4px 0;">$${changeCop.toLocaleString('de-DE')} COP</div>
          <div style="font-size: 12px; color: #CBD5E1; font-weight: 700; display: flex; gap: 8px;">
            <span>🇻🇪 Bs. ${changeBs}</span>
            <span>•</span>
            <span>💵 $${changeUsd} USD</span>
          </div>
        `;
        resBox.classList.remove('hidden');
      } else {
        resBox.classList.add('hidden');
      }
    }
  }

  triggerProofPhoto() {
    const fileInp = document.getElementById('driver-proof-file-input');
    if (fileInp) fileInp.click();
  }

  handleProofPhoto(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Compress image using canvas
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 960;
        const scale = Math.min(1, MAX_WIDTH / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
        this.currentProofPhoto = compressedBase64;
        this.renderProofPhotoPreview();
        this.speakText('Foto de comprobante capturada correctamente');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  removeProofPhoto() {
    this.currentProofPhoto = null;
    this.renderProofPhotoPreview();
    const fileInp = document.getElementById('driver-proof-file-input');
    if (fileInp) fileInp.value = '';
  }

  renderProofPhotoPreview() {
    const previewContainer = document.getElementById('driver-proof-preview-wrap');
    if (!previewContainer) return;
    if (this.currentProofPhoto) {
      previewContainer.innerHTML = `
        <div class="proof-photo-preview">
          <img src="${this.currentProofPhoto}" alt="Foto de Entrega">
          <button type="button" class="btn-remove-photo" onclick="DriverApp.removeProofPhoto()">✕ Eliminar Foto</button>
        </div>
      `;
      previewContainer.classList.remove('hidden');
    } else {
      previewContainer.innerHTML = '';
      previewContainer.classList.add('hidden');
    }
  }

  viewSavedProofPhoto(orderId) {
    if (!orderId) return;
    const photo = localStorage.getItem('proof_photo_' + orderId);
    if (!photo) {
      alert('No se encontró foto guardada para este pedido.');
      return;
    }
    const modal = document.getElementById('modal-view-proof-photo');
    const img = document.getElementById('modal-proof-img');
    if (modal && img) {
      img.src = photo;
      modal.classList.remove('hidden');
    }
  }

  closeProofPhotoModal() {
    const modal = document.getElementById('modal-view-proof-photo');
    if (modal) modal.classList.add('hidden');
  }

  // Render Leaflet Route Map with both points marked (Inicio a Destino)
  initActiveRouteMap(order) {
    const mapContainer = document.getElementById('driver-route-map');
    if (!mapContainer || typeof L === 'undefined') return;

    if (this.routeMap) {
      try {
        this.routeMap.remove();
      } catch(e) {}
      this.routeMap = null;
    }

    const dDetails = order.deliveryDetails || {};
    const isRide = order.orderType === 'ride' || order.serviceType === 'ride';
    const originName = isRide ? (dDetails.origin || 'Punto de Recogida') : (order.establishmentName || 'Restaurante / Negocio');
    const destName = isRide ? (dDetails.destination || dDetails.address || 'Destino') : (dDetails.address || 'Dirección de Entrega');

    // Parse coordinates or provide sensible regional defaults
    let oLat = parseFloat(dDetails.originLat || dDetails.latitude);
    let oLng = parseFloat(dDetails.originLng || dDetails.longitude);
    let dLat = parseFloat(dDetails.destLat);
    let dLng = parseFloat(dDetails.destLng);

    if ((isNaN(oLat) || oLat === 0) && this.currentLat) {
      oLat = this.currentLat;
      oLng = this.currentLng;
    }

    // Default regional coordinates (San Cristóbal central zone)
    if (isNaN(oLat) || oLat === 0) {
      oLat = 7.7669;
      oLng = -72.2250;
    }
    if (isNaN(dLat) || dLat === 0) {
      dLat = oLat + 0.0120;
      dLng = oLng + 0.0110;
    }

    const originCoords = [oLat, oLng];
    const destCoords = [dLat, dLng];

    try {
      const map = L.map('driver-route-map', {
        zoomControl: true,
        attributionControl: false
      }).setView(originCoords, 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      // Custom Origin Pin (Green 🟢)
      const originIcon = L.divIcon({
        className: 'custom-map-marker marker-origin',
        html: `
          <div class="marker-pulse-wrapper">
            <div class="marker-bubble origin-bubble">🟢 Recogida</div>
            <div class="marker-icon-pin">📍</div>
          </div>
        `,
        iconSize: [60, 50],
        iconAnchor: [30, 46],
        popupAnchor: [0, -45]
      });

      // Custom Destination Pin (Red 🏁)
      const destIcon = L.divIcon({
        className: 'custom-map-marker marker-dest',
        html: `
          <div class="marker-pulse-wrapper">
            <div class="marker-bubble dest-bubble">🏁 Destino</div>
            <div class="marker-icon-pin">📍</div>
          </div>
        `,
        iconSize: [60, 50],
        iconAnchor: [30, 46],
        popupAnchor: [0, -45]
      });

      // Add markers
      const markerOrigin = L.marker(originCoords, { icon: originIcon }).addTo(map);
      markerOrigin.bindPopup(`<strong>🟢 Punto de Recogida:</strong><br>${this.escapeHtml(originName)}`);

      const markerDest = L.marker(destCoords, { icon: destIcon }).addTo(map);
      markerDest.bindPopup(`<strong>🏁 Punto de Destino:</strong><br>${this.escapeHtml(destName)}`);

      // Add connecting route polyline
      L.polyline([originCoords, destCoords], {
        color: '#10B981',
        weight: 5,
        opacity: 0.9,
        dashArray: '8, 8'
      }).addTo(map);

      // Fit bounds so both points are visible
      const bounds = L.latLngBounds([originCoords, destCoords]);
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 });

      this.routeMap = map;

      // Invalidate size in next ticks to ensure smooth rendering
      setTimeout(() => {
        if (this.routeMap) {
          this.routeMap.invalidateSize();
          this.routeMap.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 });
        }
      }, 250);
      setTimeout(() => {
        if (this.routeMap) this.routeMap.invalidateSize();
      }, 600);

    } catch(err) {
      console.warn('Error initializing active route map:', err);
    }
  }

  async completeOrder(orderId) {
    if (!confirm('¿Confirmas que has completado el servicio y entregado al cliente exitosamente?')) return;

    try {
      if (this.currentProofPhoto) {
        try {
          localStorage.setItem('proof_photo_' + orderId, this.currentProofPhoto);
        } catch(err) {
          console.warn('Could not save proof photo locally:', err);
        }
      }

      const res = await fetch('/api/driver/complete-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderId,
          driverPhone: this.driver?.phone || 'yoxman',
          hasProof: !!this.currentProofPhoto
        })
      });

      if (res.ok) {
        if (typeof Sound !== 'undefined') Sound.playSuccessChime();
        if (navigator.vibrate) navigator.vibrate([0, 250, 100, 250]);
        this.speakText('¡Servicio completado con éxito! Buen trabajo.');
        alert('🎉 ¡Excelente trabajo Yoxman! Servicio completado con éxito.');
        this.currentProofPhoto = null;
        this.activeOrder = null;
        this.switchTab('history');
      }
    } catch(e) {
      console.error(e);
      alert('Error de conexión al completar el pedido.');
    }
  }

  // ==========================================
  // DAILY DELIVERIES TABLE & FINANCES
  // ==========================================
  async loadDailyHistory() {
    try {
      const res = await fetch('/api/orders');
      if (!res.ok) return;
      const orders = await res.json();
      if (!Array.isArray(orders)) return;

      const todayStr = new Date().toISOString().slice(0, 10);
      
      // Filter orders belonging to Yoxman of today
      const todayOrders = orders.filter(o => {
        const isToday = (o.createdAt || '').startsWith(todayStr);
        const isYoxman = o.driver && (o.driver.name === 'Yoxman' || o.driver.id === 'drv-yoxman' || o.driver.id === this.driver?.id);
        return isToday && isYoxman;
      });

      // Calculate finances
      let totalGananciasCop = 0;
      let totalCashCop = 0;
      let totalTransferCop = 0;

      todayOrders.forEach(o => {
        if (o.status === 'Entregado' || o.status === 'En Camino') {
          const isRide = o.orderType === 'ride' || o.serviceType === 'ride';
          let fare = 0;
          if (isRide) {
            fare = Math.round(o.total < 1000 ? o.total * 1000 : o.total);
          } else {
            const fee = parseFloat(o.deliveryDetails?.deliveryFee || 0);
            fare = Math.round(fee > 0 ? (fee < 100 ? fee * 4000 : fee) : 4000);
          }
          totalGananciasCop += fare;

          if (o.paymentMethod === 'Transferencia') {
            totalTransferCop += fare;
          } else {
            totalCashCop += fare;
          }
        }
      });

      const totalGananciasUsd = (totalGananciasCop / 4000).toFixed(2);

      // Update UI cards
      const earnCopEl = document.getElementById('fin-today-earnings');
      const earnUsdEl = document.getElementById('fin-today-usd');
      const countEl = document.getElementById('fin-today-count');
      const cashEl = document.getElementById('fin-today-cash');
      const transferEl = document.getElementById('fin-today-transfers');

      if (earnCopEl) earnCopEl.innerText = `$${totalGananciasCop.toLocaleString('de-DE')} COP`;
      if (earnUsdEl) earnUsdEl.innerText = `≈ $${totalGananciasUsd} USD`;
      if (countEl) countEl.innerText = todayOrders.filter(o => o.status === 'Entregado').length;
      if (cashEl) cashEl.innerText = `$${totalCashCop.toLocaleString('de-DE')} COP`;
      if (transferEl) transferEl.innerText = `$${totalTransferCop.toLocaleString('de-DE')} COP`;

      // Render Table rows
      const tbody = document.getElementById('daily-orders-table-body');
      if (!tbody) return;

      if (todayOrders.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" style="text-align: center; color: #94A3B8; padding: 28px;">
              Aún no has completado servicios hoy. ¡Toma carreras en el chat grupal para empezar!
            </td>
          </tr>
        `;
        return;
      }

      todayOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      tbody.innerHTML = todayOrders.map(o => {
        const time = o.createdAt ? new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
        const isRide = o.orderType === 'ride' || o.serviceType === 'ride';
        const typeLabel = isRide ? `🚖 ${o.vehicleType || 'Móvil'}` : `📦 Delivery`;
        const cust = o.customerName || 'Cliente';
        const dDetails = o.deliveryDetails || {};
        const origin = isRide ? (dDetails.origin || 'GPS') : (o.establishmentName || 'Restaurante');
        const dest = isRide ? (dDetails.destination || dDetails.address || '') : (dDetails.address || '');
        const route = `${origin} ➡️ ${dest}`;
        const km = `${dDetails.distanceKm || 1} km`;

        let fare = 0;
        if (isRide) {
          fare = Math.round(o.total < 1000 ? o.total * 1000 : o.total);
        } else {
          const fee = parseFloat(dDetails.deliveryFee || 0);
          fare = Math.round(fee > 0 ? (fee < 100 ? fee * 4000 : fee) : 4000);
        }

        const isEntregado = o.status === 'Entregado';
        const badgeClass = isEntregado ? 'badge-status-completed' : 'badge-status-active';
        const statusText = isEntregado ? '✅ Entregado' : '🛵 En Camino';
        const savedPhoto = localStorage.getItem('proof_photo_' + o.id);

        return `
          <tr>
            <td style="font-weight: 700; color: #94A3B8;">${time}</td>
            <td><strong style="color: #FFF;">${typeLabel}</strong></td>
            <td>${cust}</td>
            <td style="max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${route}">${route}</td>
            <td>${km}</td>
            <td style="color: #10B981; font-weight: 900;">$${fare.toLocaleString('de-DE')}</td>
            <td>
              ${savedPhoto ? `
                <button type="button" class="btn-mini-map-action" style="background: rgba(16,185,129,0.15); color: #34D399; border-color: rgba(16,185,129,0.3); padding: 3px 8px;" onclick="DriverApp.viewSavedProofPhoto('${o.id}')">
                  📷 Ver
                </button>
              ` : `<span style="color: #64748B; font-size: 11px;">-</span>`}
            </td>
            <td><span class="badge-status ${badgeClass}">${statusText}</span></td>
          </tr>
        `;
      }).join('');

    } catch(e) {
      console.error('Error loading daily history:', e);
    }
  }

  // ==========================================
  // GPS & WEBSOCKET SYNC
  // ==========================================
  startGPSWatcher() {
    if ('geolocation' in navigator) {
      this.watchId = navigator.geolocation.watchPosition((pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        fetch('/api/driver/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            driverPhone: 'yoxman',
            latitude: lat,
            longitude: lng
          })
        }).catch(() => {});
      }, (err) => {
        console.warn('GPS watch warning:', err);
      }, {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000
      });
    }
  }

  initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let host = window.location.host;
    if (window.location.origin.includes('localhost') && window.location.port !== '3000') {
      host = 'pedigochos.onrender.com';
    }
    const wsUrl = `${protocol}//${host}`;

    try {
      this.ws = new WebSocket(wsUrl);
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'DRIVER_CHAT_MESSAGE') {
            this.loadChatMessages();
          } else if (data.type === 'DRIVER_CHAT_UPDATE') {
            this.loadChatMessages();
          } else if (data.type === 'GLOBAL_NEW_ORDER') {
            this.loadChatMessages();
          }
        } catch(e) {}
      };
      this.ws.onclose = () => {
        setTimeout(() => this.initWebSocket(), 5000);
      };
    } catch(e) {
      console.warn('WS connection notice:', e);
    }
  }

  escapeHtml(str) {
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }
}

const DriverApp = new DriverController();
window.DriverApp = DriverApp;

document.addEventListener('DOMContentLoaded', () => {
  DriverApp.init();
});
