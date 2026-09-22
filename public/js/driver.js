// Driver Application Logic (driver.js) - Yoxman Portal & Group Chat
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
    this.activeTab = 'group_chat';
    this.orders = [];
    this.groupMessages = [];
    this.knownMessageIds = new Set();
    this.selectedRide = null;
    this.selectedRideMessages = [];
    this.financeFilter = 'all';
    this.pollingTimer = null;
    this.chatPollTimer = null;
    this.isFirstLoad = true;
    this.wakeLock = null;
  }

  init() {
    this.requestWakeLock();
    this.setupAudioUnlock();
    this.checkSession();
  }

  setupAudioUnlock() {
    const unlock = () => {
      if (typeof Sound !== 'undefined') Sound.init();
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

  checkSession() {
    try {
      const saved = localStorage.getItem('pedigochos_driver_session_yoxman');
      const gate = document.getElementById('driver-login-gate');

      if (saved) {
        this.driver = JSON.parse(saved);
        if (gate) {
          gate.classList.add('hidden');
          gate.style.display = 'none';
        }
        this.updateProfileUI();
        this.startServices();
      } else {
        if (gate) {
          gate.classList.remove('hidden');
          gate.style.display = 'flex';
        }
      }
    } catch(e) {
      console.warn('Session check warning:', e);
    }
  }

  async loginDriver() {
    const userInp = document.getElementById('driver-login-user');
    const passInp = document.getElementById('driver-login-pass');
    const errEl = document.getElementById('driver-login-error');

    const username = (userInp ? userInp.value : '').trim().toLowerCase();
    const password = (passInp ? passInp.value : '').trim();

    if (errEl) errEl.classList.add('hidden');

    if (username !== 'yoxman' || password !== '12345@') {
      if (errEl) {
        errEl.innerText = '⚠️ Credenciales inválidas. Cuenta autorizada: yoxman / 12345@';
        errEl.classList.remove('hidden');
      }
      return;
    }

    const driverProfile = {
      id: 'drv-yoxman',
      name: 'Yoxman',
      username: 'yoxman',
      role: 'delivery',
      isNameLocked: true,
      phone: '+573227949751',
      vehicleType: 'Moto 🛵',
      status: 'Disponible'
    };

    this.driver = driverProfile;
    localStorage.setItem('pedigochos_driver_session_yoxman', JSON.stringify(driverProfile));

    const gate = document.getElementById('driver-login-gate');
    if (gate) {
      gate.classList.add('hidden');
      gate.style.display = 'none';
    }

    this.updateProfileUI();
    this.startServices();

    if (typeof Sound !== 'undefined') Sound.playBell();
  }

  logout() {
    if (!confirm('¿Deseas cerrar el turno de domiciliario?')) return;
    localStorage.removeItem('pedigochos_driver_session_yoxman');
    this.driver = null;
    if (this.pollingTimer) clearInterval(this.pollingTimer);

    const gate = document.getElementById('driver-login-gate');
    if (gate) {
      gate.classList.remove('hidden');
      gate.style.display = 'flex';
    }
  }

  updateProfileUI() {
    const nameEl = document.getElementById('driver-profile-name');
    if (nameEl) nameEl.innerText = 'Yoxman';
  }

  startServices() {
    this.loadOrders();
    this.loadGroupChat();

    if (this.pollingTimer) clearInterval(this.pollingTimer);
    this.pollingTimer = setInterval(() => {
      this.loadOrders();
      this.loadGroupChat();
      if (this.selectedRide) {
        this.loadRidePrivateChat(this.selectedRide.id);
      }
    }, 3500);

    this.startGPSWatcher();
  }

  switchTab(tabName) {
    this.activeTab = tabName;
    ['group_chat', 'finances'].forEach(t => {
      const btn = document.getElementById(`tab-btn-${t}`);
      const view = document.getElementById(`tab-view-${t}`);
      if (btn) btn.classList.toggle('active', t === tabName);
      if (view) view.classList.toggle('hidden', t !== tabName);
    });

    if (tabName === 'group_chat') {
      this.renderGroupChat();
    } else if (tabName === 'finances') {
      this.renderFinances();
    }
  }

  async loadOrders() {
    try {
      const res = await fetch('/api/driver/orders');
      if (!res.ok) return;
      const data = await res.json();
      this.orders = Array.isArray(data) ? data : [];
      if (this.activeTab === 'finances') {
        this.renderFinances();
      }
    } catch(e) {
      console.warn('Error loading driver orders:', e);
    }
  }

  async loadGroupChat() {
    try {
      const res = await fetch('/api/driver/group-chat');
      if (!res.ok) return;
      const msgs = await res.json();
      if (!Array.isArray(msgs)) return;

      // Check for new service requests to play sound & vibrate
      const newItems = msgs.filter(m => !this.knownMessageIds.has(m.id));
      const hasNewService = newItems.some(m => m.isServiceCard);

      if (hasNewService && !this.isFirstLoad) {
        if (typeof Sound !== 'undefined') Sound.playLoudAlarmBurst();
        if (navigator.vibrate) navigator.vibrate([0, 800, 300, 800, 300, 1000]);
      }

      msgs.forEach(m => this.knownMessageIds.add(m.id));
      this.isFirstLoad = false;
      this.groupMessages = msgs;

      if (this.activeTab === 'group_chat') {
        this.renderGroupChat();
      }
    } catch(e) {
      console.warn('Error loading group chat:', e);
    }
  }

  renderGroupChat() {
    const container = document.getElementById('group-chat-feed');
    if (!container) return;

    if (this.groupMessages.length === 0) {
      container.innerHTML = `
        <div class="empty-state-card" style="margin-top: 10px;">
          <span class="empty-icon">🛵</span>
          <h3 style="color: #FFF; font-size: 15px;">Canal de Domiciliarios Listo</h3>
          <p style="color: #94A3B8; font-size: 12.5px;">Aquí recibirás al instante las solicitudes de vehículos y pedidos. ¡Atento a las alertas sonoras!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.groupMessages.map(msg => {
      const isMine = msg.senderId === 'drv-yoxman';

      // 1. Interactive Clickeable Service Card
      if (msg.isServiceCard) {
        const order = msg.orderData || this.orders.find(o => o.id === msg.orderId) || {};
        const isVeh = order.orderType === 'ride' || order.serviceType === 'ride';
        const vName = order.vehicleType === 'auto' ? '🚗 Auto Estándar' : (order.vehicleType === 'lujo' ? '✨ Auto VIP' : '🛵 Moto Taxi');
        const title = isVeh ? vName : `📦 Pedido Delivery • ${order.establishmentName || 'Restaurante'}`;
        
        const fare = order.total || order.deliveryDetails?.deliveryFee || 4000;
        const fareCop = Math.round(fare < 1000 ? fare * 1000 : fare);

        const origin = order.deliveryDetails?.origin || order.deliveryDetails?.address || 'Punto de recogida GPS';
        const dest = order.deliveryDetails?.destination || order.deliveryDetails?.address || 'Destino del cliente';
        const km = order.deliveryDetails?.distanceKm || 1.2;
        const custName = order.customerName || 'Pasajero';
        const custPhone = order.customerPhone || order.deliveryDetails?.phone || '';

        const isTakenByMe = order.driver && (order.driver.id === 'drv-yoxman' || order.driver.name === 'Yoxman');
        const isTakenByOther = order.driver && !isTakenByMe;
        const isCompleted = order.status === 'Entregado';

        let cardClass = 'service-chat-card';
        if (isTakenByMe) cardClass += ' taken-by-me';
        if (isCompleted) cardClass += ' completed';

        return `
          <div class="${cardClass}">
            <div class="service-header-row">
              <div>
                <span style="font-size: 10px; font-weight: 800; color: #F59E0B; text-transform: uppercase;">
                  ${isVeh ? '🚖 SOLICITUD DE VEHÍCULO' : '📦 PEDIDO DE ENCOMIENDA'}
                </span>
                <strong style="display: block; font-size: 14.5px; color: #FFF;">${title}</strong>
              </div>
              <span class="service-fare-badge">$${fareCop.toLocaleString('de-DE')} COP</span>
            </div>

            <div class="service-body-grid">
              <div><strong>🟢 Recogida:</strong> ${origin}</div>
              <div><strong>🏁 Destino:</strong> ${dest}</div>
              <div><strong>📏 Distancia:</strong> ${km} km aprox.</div>
              <div><strong>👤 Cliente:</strong> ${custName} ${custPhone ? `(${custPhone})` : ''}</div>
              ${order.paymentMethod ? `<div><strong>💵 Pago:</strong> ${order.paymentMethod}</div>` : ''}
              ${order.deliveryDetails?.notes ? `<div><strong>📝 Nota:</strong> ${order.deliveryDetails.notes}</div>` : ''}
            </div>

            ${isCompleted ? `
              <div style="background: rgba(71, 85, 105, 0.3); color: #94A3B8; text-align: center; padding: 8px; border-radius: 10px; font-size: 12px; font-weight: 800;">
                ✅ Servicio Completado
              </div>
            ` : isTakenByMe ? `
              <button type="button" class="btn-open-mine" onclick="DriverApp.openRideDetailById('${order.id || msg.orderId}')">
                💬 Servicio Tomado por Ti (Abrir Detalle y Chat)
              </button>
            ` : isTakenByOther ? `
              <div style="background: rgba(100, 116, 139, 0.2); color: #94A3B8; text-align: center; padding: 8px; border-radius: 10px; font-size: 12px; font-weight: 700;">
                🔒 Tomado por ${order.driver?.name || 'otro domiciliario'}
              </div>
            ` : `
              <button type="button" class="btn-take-ride" onclick="DriverApp.takeService('${order.id || msg.orderId}')">
                ⚡ Tomar Servicio Ahora ⚡
              </button>
            `}
          </div>
        `;
      }

      // 2. Standard Text Bubble
      return `
        <div class="chat-msg-row ${isMine ? 'mine' : 'other'}">
          <span class="chat-msg-sender">${msg.senderName || 'Repartidor'}</span>
          <div class="chat-msg-bubble">
            ${msg.text}
          </div>
        </div>
      `;
    }).join('');

    container.scrollTop = container.scrollHeight;
  }

  async sendGroupMessage() {
    const inp = document.getElementById('group-chat-input');
    const text = (inp ? inp.value : '').trim();
    if (!text) return;

    inp.value = '';

    try {
      const res = await fetch('/api/driver/group-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: 'drv-yoxman',
          senderName: 'Yoxman',
          text: text
        })
      });

      if (res.ok) {
        this.loadGroupChat();
      }
    } catch(e) {
      console.warn('Error sending group message:', e);
    }
  }

  async takeService(orderId) {
    if (!confirm('¿Deseas tomar este servicio inmediatamente?')) return;

    try {
      const res = await fetch('/api/driver/accept-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderId,
          driverId: 'drv-yoxman',
          driverName: 'Yoxman',
          driverPhone: '+573227949751'
        })
      });

      if (res.ok) {
        if (typeof Sound !== 'undefined') Sound.playBell();
        this.loadOrders();
        this.loadGroupChat();
        this.openRideDetailById(orderId);
      } else {
        alert('Este servicio ya fue tomado por otro compañero.');
        this.loadOrders();
        this.loadGroupChat();
      }
    } catch(e) {
      console.error(e);
      alert('Error de conexión al tomar el servicio.');
    }
  }

  openRideDetailById(orderId) {
    const order = this.orders.find(o => o.id === orderId) || (this.groupMessages.find(m => m.orderId === orderId)?.orderData);
    if (!order) return;
    this.selectedRide = order;

    const modal = document.getElementById('ride-modal-overlay');
    if (!modal) return;

    // Fill Modal Data
    const isVeh = order.orderType === 'ride' || order.serviceType === 'ride';
    const typeEl = document.getElementById('modal-service-type');
    const codeEl = document.getElementById('modal-service-code');
    const fareEl = document.getElementById('modal-service-fare');
    const payEl = document.getElementById('modal-service-payment');
    const origEl = document.getElementById('modal-service-origin');
    const destEl = document.getElementById('modal-service-dest');
    const kmEl = document.getElementById('modal-service-km');
    const custEl = document.getElementById('modal-service-customer');
    const phoneEl = document.getElementById('modal-service-phone');
    const callBtn = document.getElementById('modal-btn-call');
    const waBtn = document.getElementById('modal-btn-wa');
    const gmapsBtn = document.getElementById('modal-btn-gmaps');
    const wazeBtn = document.getElementById('modal-btn-waze');
    const notesBox = document.getElementById('modal-service-notes-container');
    const notesEl = document.getElementById('modal-service-notes');

    if (typeEl) typeEl.innerText = isVeh ? '🛵 Solicitud de Vehículo' : '📦 Encomienda Delivery';
    if (codeEl) codeEl.innerText = `#${order.id.slice(-6).toUpperCase()}`;
    
    const fare = order.total || order.deliveryDetails?.deliveryFee || 4000;
    const fareCop = Math.round(fare < 1000 ? fare * 1000 : fare);
    if (fareEl) fareEl.innerText = `$${fareCop.toLocaleString('de-DE')} COP`;
    if (payEl) payEl.innerText = order.paymentMethod || 'Efectivo';

    const origin = order.deliveryDetails?.origin || order.deliveryDetails?.address || 'Punto de recogida';
    const dest = order.deliveryDetails?.destination || order.deliveryDetails?.address || 'Destino';
    const km = order.deliveryDetails?.distanceKm || 1.2;

    if (origEl) origEl.innerText = origin;
    if (destEl) destEl.innerText = dest;
    if (kmEl) kmEl.innerText = `${km} km aprox.`;

    const cName = order.customerName || 'Cliente';
    const cPhone = order.customerPhone || order.deliveryDetails?.phone || '';
    if (custEl) custEl.innerText = cName;
    if (phoneEl) phoneEl.innerText = cPhone ? `📱 ${cPhone}` : 'Sin teléfono';

    if (callBtn) callBtn.href = cPhone ? `tel:${cPhone}` : '#';
    if (waBtn) {
      const cleanPhone = cPhone.replace(/[^0-9]/g, '');
      const waText = encodeURIComponent(`Hola ${cName}, soy Yoxman tu repartidor de PediGochos 🛵. He tomado tu servicio #${order.id.slice(-4)} y voy en camino.`);
      waBtn.href = cleanPhone ? `https://wa.me/${cleanPhone}?text=${waText}` : '#';
    }

    if (gmapsBtn) {
      gmapsBtn.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(origin)}`;
    }
    if (wazeBtn) {
      wazeBtn.href = `https://waze.com/ul?q=${encodeURIComponent(dest)}&navigate=yes`;
    }

    const notes = order.deliveryDetails?.notes || order.paymentNotes || '';
    if (notesBox && notesEl) {
      if (notes) {
        notesEl.innerText = notes;
        notesBox.style.display = 'block';
      } else {
        notesBox.style.display = 'none';
      }
    }

    modal.classList.remove('hidden');
    modal.style.display = 'flex';

    this.loadRidePrivateChat(order.id);
  }

  closeRideModal() {
    const modal = document.getElementById('ride-modal-overlay');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
    this.selectedRide = null;
  }

  async updateRideStatus(newStatus) {
    if (!this.selectedRide) return;
    const orderId = this.selectedRide.id;

    try {
      const endpoint = newStatus === 'Entregado' ? '/api/driver/complete-order' : '/api/driver/update-status';
      const bodyPayload = newStatus === 'Entregado' 
        ? { orderId, driverPhone: '+573227949751' }
        : { orderId, status: newStatus };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });

      if (res.ok) {
        alert(`✅ Estado actualizado: ${newStatus}`);
        if (newStatus === 'Entregado') {
          this.closeRideModal();
        }
        this.loadOrders();
        this.loadGroupChat();
      }
    } catch(e) {
      console.warn('Error updating ride status:', e);
    }
  }

  async loadRidePrivateChat(orderId) {
    try {
      const res = await fetch(`/api/orders/${orderId}/chat`);
      if (!res.ok) return;
      const msgs = await res.json();
      this.selectedRideMessages = Array.isArray(msgs) ? msgs : [];
      this.renderPrivateChat();
    } catch(e) {
      console.warn('Error loading private chat:', e);
    }
  }

  renderPrivateChat() {
    const feed = document.getElementById('private-chat-feed');
    if (!feed) return;

    if (this.selectedRideMessages.length === 0) {
      feed.innerHTML = `
        <div style="font-size: 11.5px; color: #64748B; text-align: center; padding: 10px;">
          Escribe un mensaje para coordinar la llegada con el cliente.
        </div>
      `;
      return;
    }

    feed.innerHTML = this.selectedRideMessages.map(m => {
      const isMine = m.senderId === 'drv-yoxman';
      return `
        <div class="chat-msg-row ${isMine ? 'mine' : 'other'}">
          <span class="chat-msg-sender">${m.senderName || (isMine ? 'Tú (Yoxman)' : 'Cliente')}</span>
          <div class="chat-msg-bubble" style="${isMine ? 'background: #10B981; color: #022C22;' : 'background: #1E293B; color: #FFF;'}">
            ${m.text}
          </div>
        </div>
      `;
    }).join('');

    feed.scrollTop = feed.scrollHeight;
  }

  async sendPrivateMessage() {
    if (!this.selectedRide) return;
    const inp = document.getElementById('private-chat-input');
    const text = (inp ? inp.value : '').trim();
    if (!text) return;
    inp.value = '';

    try {
      const res = await fetch(`/api/orders/${this.selectedRide.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: 'drv-yoxman',
          senderName: 'Yoxman (Repartidor)',
          text: text
        })
      });

      if (res.ok) {
        this.loadRidePrivateChat(this.selectedRide.id);
      }
    } catch(e) {
      console.warn('Error sending private message:', e);
    }
  }

  setFinanceFilter(filter) {
    this.financeFilter = filter;
    ['all', 'pending', 'completed'].forEach(f => {
      const chip = document.getElementById(`filter-chip-${f}`);
      if (chip) chip.classList.toggle('active', f === filter);
    });
    this.renderFinances();
  }

  renderFinances() {
    // 1. Calculate Metrics for Yoxman
    const myRides = this.orders.filter(o => o.driver && (o.driver.id === 'drv-yoxman' || o.driver.name === 'Yoxman'));
    const completed = myRides.filter(o => o.status === 'Entregado');
    const inCourse = myRides.filter(o => o.status === 'En Camino' || o.status === 'Llegó al Origen');

    let totalEarnings = 0;
    let cashInHand = 0;
    let digitalPayments = 0;

    completed.forEach(o => {
      const fare = o.total || o.deliveryDetails?.deliveryFee || 4000;
      const fareCop = Math.round(fare < 1000 ? fare * 1000 : fare);
      totalEarnings += fareCop;

      if (o.paymentMethod === 'Efectivo') {
        cashInHand += fareCop;
      } else {
        digitalPayments += fareCop;
      }
    });

    const earnEl = document.getElementById('f-earnings');
    const cashEl = document.getElementById('f-cash');
    const digEl = document.getElementById('f-digital');
    const countEl = document.getElementById('f-count');

    if (earnEl) earnEl.innerText = `$${totalEarnings.toLocaleString('de-DE')} COP`;
    if (cashEl) cashEl.innerText = `$${cashInHand.toLocaleString('de-DE')} COP`;
    if (digEl) digEl.innerText = `$${digitalPayments.toLocaleString('de-DE')} COP`;
    if (countEl) countEl.innerText = completed.length;

    // 2. Filter list
    let displayed = myRides;
    if (this.financeFilter === 'pending') {
      displayed = inCourse;
    } else if (this.financeFilter === 'completed') {
      displayed = completed;
    }

    const listEl = document.getElementById('finance-rides-list');
    if (!listEl) return;

    if (displayed.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state-card">
          <span class="empty-icon">📊</span>
          <h3 style="color: #FFF; font-size: 14px;">No hay domicilios para este filtro</h3>
          <p style="color: #94A3B8; font-size: 12px;">Las carreras tomadas y completadas aparecerán aquí con sus detalles de cobro.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = displayed.map(o => {
      const isVeh = o.orderType === 'ride' || o.serviceType === 'ride';
      const fare = o.total || o.deliveryDetails?.deliveryFee || 4000;
      const fareCop = Math.round(fare < 1000 ? fare * 1000 : fare);
      const isDone = o.status === 'Entregado';
      const dest = o.deliveryDetails?.destination || o.deliveryDetails?.address || 'Destino';

      return `
        <div class="service-chat-card ${isDone ? 'completed' : 'taken-by-me'}" style="margin-bottom: 8px;">
          <div class="service-header-row">
            <div>
              <strong style="color: #FFF; font-size: 13.5px;">#${o.id.slice(-6).toUpperCase()} • ${isVeh ? '🛵 Carrera' : '📦 Encomienda'}</strong>
              <span style="display: block; font-size: 11px; color: ${isDone ? '#10B981' : '#F59E0B'}; font-weight: 800;">
                ${o.status.toUpperCase()}
              </span>
            </div>
            <span class="service-fare-badge">$${fareCop.toLocaleString('de-DE')} COP</span>
          </div>

          <div style="font-size: 12px; color: #CBD5E1; margin-bottom: 8px;">
            <div>👤 <strong>Cliente:</strong> ${o.customerName || 'Cliente'}</div>
            <div>📍 <strong>Destino:</strong> ${dest}</div>
            <div>💵 <strong>Método:</strong> ${o.paymentMethod || 'Efectivo'}</div>
          </div>

          <button type="button" class="btn-open-mine" onclick="DriverApp.openRideDetailById('${o.id}')" style="padding: 8px; font-size: 12px;">
            🔍 Ver Detalles y Ruta GPS
          </button>
        </div>
      `;
    }).join('');
  }

  startGPSWatcher() {
    if ('geolocation' in navigator) {
      navigator.geolocation.watchPosition((pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        fetch('/api/driver/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            driverPhone: '+573227949751',
            latitude: lat,
            longitude: lng
          })
        }).catch(() => {});
      }, () => {}, {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000
      });
    }
  }
}

const DriverApp = new DriverController();
window.DriverApp = DriverApp;

document.addEventListener('DOMContentLoaded', () => {
  DriverApp.init();
});
