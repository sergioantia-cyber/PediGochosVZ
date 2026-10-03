/* Customer Marketplace App Logic */

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

const CATEGORY_EMOJIS = {
  comidas: ['🍔', '🍕', '🌭', '🥤', '🍲', '🌯', '🫓', '🌽', '🍞', '🥖', '🍣', '🌮', '🍜', '🍰', '☕'],
  farmacias: ['💊', '🩹', '🧪', '🧼', '🧴', '🩺'],
  servicios: ['🛵', '🛞', '🚗', '🚕', '🔧', '🚨', '⛽'],
  mercados: ['🛒', '🍎', '🥛', '🍞', '🥩', '🧀', '🍌'],
  ferreterias: ['🛠️', '🔨', '🔩', '🔧', '🪚', '🧰', '📐']
};

const DEFAULT_IMAGES = {
  comidas: '/images/burger_royale.jpg',
  farmacias: '/images/vitamina_c.jpg',
  servicios: '/images/servicios.jpg',
  mercados: '/images/pack_frutas.jpg',
  ferreterias: '/images/ferreteria.jpg'
};

class MarketplaceController {
  constructor() {
    this.establishments = [];
    this.currentCategory = 'comidas';
    this.selectedEstablishment = null;
    this.cart = {
      establishment: null,
      items: [] // { product, quantity }
    };
    this.orderType = 'delivery'; // 'delivery' or 'mesa'
    this.currentLocation = localStorage.getItem('selected_location') || 'San Antonio';
    
    // Leaflet map instance variables
    this.leafMap = null;
    this.leafMarker = null;
    this.selectedLatitude = null;
    this.selectedLongitude = null;
    this.calculatedDistanceKm = null;
    
    // Default location coordinates (fallback center coordinate zones)
    this.locationCenters = {
      'San Antonio': [7.8131, -72.4439],
      'Ureña': [7.9221, -72.4419],
      'San Cristóbal': [7.7667, -72.2292]
    };

    this.activeCoupon = null;
    this.gochoPoints = parseInt(localStorage.getItem('gocho_points') || '0', 10);
    this.currentCategory = null; // Default to no category selected on home entry
    this.paymentMethod = 'Efectivo'; // Default payment method: 'Efectivo' or 'Transferencia'
    this.isTrackingMinimized = false; // Whether active order tracking is minimized

    // Ride-hailing service state
    this.rideOrigin = { lat: null, lng: null, address: '' };
    this.rideDestination = { lat: null, lng: null, address: '' };
    this.selectedVehicle = 'moto';
    this.rideDistanceKm = 0;
    this.rideFares = { moto: 4000, auto: 8000, lujo: 14000 };
    this.rideLeafMap = null;
    this.rideOriginMarker = null;
    this.rideDestMarker = null;
    this.rideRouteLine = null;

    // Merchant Diagnostic Wizard State
    this.merchantWizardStep = 1;
    this.merchantData = this.getDefaultMerchantData();
  }

  async forceCleanUpdate() {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let reg of registrations) {
          await reg.unregister();
        }
      }
      const url = new URL(window.location.href);
      url.searchParams.set('t_sync', Date.now());
      window.location.href = url.toString();
    } catch(e) {
      window.location.reload(true);
    }
  }

  async init() {
    // Auto-detect version update and clear stale caches
    const APP_VER = '190';
    try {
      const cachedVer = localStorage.getItem('pedigochos_app_ver');
      if (cachedVer && cachedVer !== APP_VER) {
        localStorage.setItem('pedigochos_app_ver', APP_VER);
        if ('caches' in window) {
          caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).then(() => {
            const url = new URL(window.location.href);
            url.searchParams.set('v_flush', Date.now());
            window.location.replace(url.toString());
          });
          return;
        }
      } else {
        localStorage.setItem('pedigochos_app_ver', APP_VER);
      }
    } catch(e) {}

    // Clear any lingering redirect flag
    localStorage.removeItem('redirect_after_google_login');

    // Parse URL query parameters for QR scan / direct store deep linking
    const urlParams = new URLSearchParams(window.location.search);
    const storeParam = urlParams.get('store') || urlParams.get('restaurant') || urlParams.get('r') || urlParams.get('shop') || urlParams.get('id');
    const tableParam = urlParams.get('mesa') || urlParams.get('table') || urlParams.get('m');

    if (tableParam) {
      // EXPLICIT Table QR scan (e.g. ?store=...&mesa=1) -> Lock strictly to this table
      this.currentTableNumber = tableParam;
      this.tableLockedByQR = true;
      this.orderType = 'mesa';
    } else {
      // General Store Menu QR (e.g. ?store=...) or normal browse -> DO NOT lock table! Allow Delivery and free choice
      this.currentTableNumber = null;
      this.tableLockedByQR = false;
      try {
        localStorage.removeItem('scanned_table_number');
        localStorage.removeItem('table_locked_by_qr');
        localStorage.removeItem('scanned_table_store');
      } catch(e) {}
    }

    // Set initial history state without stripping OAuth tokens if present
    if (!window.location.hash || (!window.location.hash.includes('access_token') && !window.location.hash.includes('refresh_token'))) {
      window.history.replaceState({ view: 'home' }, '', window.location.href);
    }
    window.addEventListener('popstate', (e) => this.handlePopState(e));

    await this.loadSystemSettings();
    await this.loadEstablishments();
    await this.loadServiceEstablishments();
    await this.loadPromotions();
    this.initWebSocket();
    
    // Check deep link ?promo=ID or ?oferta=ID
    const promoParam = urlParams.get('promo') || urlParams.get('oferta');
    if (promoParam) {
      setTimeout(() => {
        this.openDailyOfferOrderModal(promoParam);
      }, 500);
    }
    
    // Auto-detect user's GPS coordinates immediately on startup
    this.requestAutomaticGPS(false);

    this.currentCategory = 'comidas';
    this.currentServiceCategory = null;
    window.activeFoodTypeFilter = null;
    
    // Set active class on Restaurantes category card by default
    document.querySelectorAll('.category-card-delivercity').forEach(card => {
      if (card.dataset.category === 'comidas') {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });

    // Initialize floating bubbles (visible on home) and header SOS (hidden on home)
    this.updateFloatingAndHeaderSos(false);

    // Register resilient click & touch listeners on floating action buttons
    const servicesBtn = document.getElementById('floating-services-btn');
    if (servicesBtn) {
      servicesBtn.addEventListener('click', (e) => this.toggleServicesMenu(null, e));
      servicesBtn.addEventListener('touchend', (e) => this.toggleServicesMenu(null, e), { passive: false });
    }
    const sosBtn = document.getElementById('floating-sos-btn');
    if (sosBtn) {
      sosBtn.addEventListener('click', (e) => this.toggleSosMenu(null, e));
      sosBtn.addEventListener('touchend', (e) => this.toggleSosMenu(null, e), { passive: false });
    }

    this.renderEstablishments();
    this.updateCartBadge();
    await this.checkSupabaseSession();
    this.checkActiveOrderTracking();
    this.updateGochoPointsDisplay();
    this.initPushNotifications();
    this.initOfflineSync();
    this.checkFirstTimeWelcome();
    this.checkRidePromoVisibility();
    this.startActiveOrdersPolling();

    // Auto-open store if scanned via QR or visited via direct link
    if (storeParam && Array.isArray(this.establishments) && this.establishments.length > 0) {
      const normQuery = storeParam.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '').trim();
      const targetStore = this.establishments.find(e => {
        if (!e) return false;
        const eId = String(e.id || '').trim();
        const eNameNorm = (e.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '').trim();
        return eId === storeParam.trim() || eNameNorm === normQuery || eId.toLowerCase().includes(normQuery) || (e.linkKey && e.linkKey.toUpperCase() === storeParam.trim().toUpperCase());
      });

      if (targetStore) {
        setTimeout(() => {
          this.openEstablishment(targetStore.id, false);
          if (tableParam) {
            this.showToast(`🍽️ ¡Bienvenido a ${targetStore.name}! Conectado a Mesa #${tableParam}`);
          }
        }, 100);
      }
    } else if (!localStorage.getItem('location_tutorial_seen')) {
      // Show location selector tutorial if visiting home for the first time
      setTimeout(() => {
        this.showLocationTutorial();
      }, 1000);
    }

    // Dismiss login prompt bubble on scroll or outside tap
    let hasDismissedLoginPromptOnScroll = false;
    window.addEventListener('scroll', () => {
      if (!hasDismissedLoginPromptOnScroll && window.scrollY > 150) {
        hasDismissedLoginPromptOnScroll = true;
        const prompt = document.getElementById('login-reward-prompt');
        if (prompt && !prompt.classList.contains('hidden')) {
          prompt.classList.add('hidden');
        }
      }
    }, { passive: true });

    document.addEventListener('click', (e) => {
      const container = document.getElementById('auth-status-container');
      const prompt = document.getElementById('login-reward-prompt');
      if (prompt && !prompt.classList.contains('hidden')) {
        if (container && !container.contains(e.target)) {
          prompt.classList.add('hidden');
        }
      }
    });
  }

  checkFirstTimeWelcome() {
    try {
      const hasSeen = localStorage.getItem('pedigochos_welcome_shown_v1');
      if (!hasSeen) {
        const modal = document.getElementById('first-time-welcome-modal');
        if (modal) {
          setTimeout(() => {
            modal.classList.add('open');
            modal.style.setProperty('display', 'flex', 'important');
          }, 600);
        }
      }
    } catch(e) {}
  }

  closeWelcomeModal() {
    try {
      localStorage.setItem('pedigochos_welcome_shown_v1', 'true');
    } catch(e) {}
    const modal = document.getElementById('first-time-welcome-modal');
    if (modal) {
      modal.classList.remove('open');
      modal.style.display = 'none';
    }
  }

  initWebSocket() {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      this.ws = new WebSocket(`${protocol}//${window.location.host}`);
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ESTABLISHMENT_UPDATED' && data.establishment) {
            const updated = data.establishment;
            const index = this.establishments.findIndex(e => e.id === updated.id);
            if (index !== -1) {
              this.establishments[index] = { ...this.establishments[index], ...updated };
              this.renderEstablishments();
              if (this.selectedEstablishment && this.selectedEstablishment.id === updated.id) {
                this.openEstablishment(updated.id);
              }
            }
          }
          if (data.type === 'ORDER_UPDATED' && data.order) {
            const currentOrders = this.getUserOrdersHistory();
            const existingOrder = currentOrders.find(o => String(o.id) === String(data.order.id));
            if (existingOrder) {
              const oldStatus = existingOrder.status;
              this.saveUserOrderToHistory(data.order);
              const modal = document.getElementById('user-orders-modal');
              if (modal && modal.classList.contains('active')) {
                this.renderUserOrdersList();
              }
              this.handleCustomerOrderStatusUpdate(data.order, oldStatus);
            }
          }
          if (data.type === 'promotion_new') {
            this.loadPromotions();
            if (data.promotion && data.promotion.title) {
              this.sendPushNotification('🔥 ¡Nueva Oferta del Día!', `${data.promotion.title} - Solo por 24 horas.`);
            }
          }
          if (data.type === 'promotions_expired') {
            this.loadPromotions();
          }
          if (data.type === 'RESIN_QUOTE_UPDATE' && data.quote) {
            try {
              let resinQuotes = JSON.parse(localStorage.getItem('pg_my_resin_quotes') || '[]');
              const idx = resinQuotes.findIndex(q => q.id === data.quote.id);
              if (idx >= 0) {
                resinQuotes[idx] = { ...resinQuotes[idx], ...data.quote };
                localStorage.setItem('pg_my_resin_quotes', JSON.stringify(resinQuotes));
                this.sendPushNotification('✨ Shelli Art - Actualización', `Tu llavero de resina está ahora: ${data.quote.status}`);
                const modal = document.getElementById('user-orders-modal');
                if (modal && modal.classList.contains('active')) {
                  this.renderUserOrdersList();
                }
              }
            } catch(e) {}
          }
          if (data.type === 'PRINT3D_QUOTE_UPDATE' && data.quote) {
            try {
              let p3dQuotes = JSON.parse(localStorage.getItem('pg_my_print3d_quotes') || '[]');
              const idx = p3dQuotes.findIndex(q => q.id === data.quote.id);
              if (idx >= 0) {
                p3dQuotes[idx] = { ...p3dQuotes[idx], ...data.quote };
                localStorage.setItem('pg_my_print3d_quotes', JSON.stringify(p3dQuotes));
                this.sendPushNotification('🖨️ 3D Lab - Actualización', `Tu pieza 3D está ahora: ${data.quote.status}`);
                const modal = document.getElementById('user-orders-modal');
                if (modal && modal.classList.contains('active')) {
                  this.renderUserOrdersList();
                }
              }
            } catch(e) {}
          }
        } catch (e) {
          console.error(e);
        }
      };
    } catch (err) {
      console.error(err);
    }
  }

  async checkSupabaseSession() {
    if (typeof SupabaseApp === 'undefined') return;
    await SupabaseApp.init();

    // Listen to real-time auth changes from Supabase (e.g. Google OAuth redirect callback)
    if (SupabaseApp.client && SupabaseApp.client.auth) {
      SupabaseApp.client.auth.onAuthStateChange(async (event, session) => {
        if (session && session.user) {
          await this.handleUserSession(session.user);
        } else if (event === 'SIGNED_OUT') {
          this.handleUserSignOut();
        }
      });
    }

    const session = await SupabaseApp.getCurrentSession();
    if (session && session.user) {
      await this.handleUserSession(session.user);
    } else {
      this.renderAuthButton(null);
    }
  }

  async handleUserSession(user) {
    if (!user) return;
    this.currentUser = user;
    try {
      localStorage.setItem('pedigochos_user_email', user.email || '');
      localStorage.setItem('pedigochos_user_name', user.user_metadata?.full_name || user.email.split('@')[0]);
      if (user.id) localStorage.setItem('pedigochos_user_id', user.id);
    } catch(e) {}

    this.renderAuthButton(user);

    // Pre-fill checkout form name if empty
    const nameInput = document.getElementById('order-customer-name');
    if (nameInput && !nameInput.value.trim()) {
      nameInput.value = user.user_metadata?.full_name || user.email.split('@')[0];
    }

    // Synchronize and restore all user orders from server
    await this.syncUserOrdersWithServer(user.email, user.id);
  }

  handleUserSignOut() {
    this.currentUser = null;
    try {
      localStorage.removeItem('pedigochos_user_email');
      localStorage.removeItem('pedigochos_user_name');
      localStorage.removeItem('pedigochos_user_id');
    } catch(e) {}
    this.renderAuthButton(null);
  }

  renderAuthButton(user) {
    const container = document.getElementById('auth-status-container');
    if (!container) return;

    if (user) {
      const displayName = user.user_metadata?.full_name || user.email.split('@')[0];
      const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
      container.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); padding: 3px 8px 3px 6px; border-radius: 20px;">
          ${avatarUrl ? `<img src="${avatarUrl}" alt="Avatar" style="width: 18px; height: 18px; border-radius: 50%; object-fit: cover;">` : '<span style="font-size: 12px;">👤</span>'}
          <span style="font-size: 11px; color: #FFFFFF; font-weight: 700; max-width: 85px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${displayName}
          </span>
          <button type="button" onclick="MarketplaceApp.logout()" title="Cerrar Sesión" style="background: none; border: none; font-size: 13px; cursor: pointer; padding: 0 2px; color: #94A3B8; display: flex; align-items: center; justify-content: center; line-height: 1;">
            ✕
          </button>
        </div>
      `;
    } else {
      const isDismissed = sessionStorage.getItem('pedigochos_login_prompt_dismissed') === 'true';
      container.style.position = 'relative';
      container.innerHTML = `
        <button class="btn-notification btn-login-pulse" onclick="MarketplaceApp.loginWithGoogle()" onmouseenter="MarketplaceApp.showLoginPrompt()" title="Iniciar Sesión con Google">
          <span class="login-pulse-badge"></span>
          <span>🔑</span> <span>Ingresar</span>
        </button>
        <div id="login-reward-prompt" class="login-prompt-bubble ${isDismissed ? 'hidden' : ''}" onclick="MarketplaceApp.loginWithGoogle()">
          <div class="login-prompt-arrow"></div>
          <div class="login-prompt-header">
            <span class="login-prompt-tag">⚠️ ¡Inicia Sesión!</span>
            <button type="button" class="login-prompt-close-btn" onclick="event.stopPropagation(); MarketplaceApp.dismissLoginPrompt()" title="Cerrar aviso">✕</button>
          </div>
          <div class="login-prompt-body">
            Si no ingresas, <strong>no se guardarán tus datos</strong> de perfil ni <strong>acumularás GochoPoints ⭐</strong> en tus pedidos.
          </div>
          <div class="login-prompt-action">
            <span>Toca para ingresar con Google 🚀</span>
          </div>
        </div>
      `;
    }
  }

  dismissLoginPrompt() {
    const prompt = document.getElementById('login-reward-prompt');
    if (prompt) {
      prompt.classList.add('hidden');
    }
    sessionStorage.setItem('pedigochos_login_prompt_dismissed', 'true');
  }

  showLoginPrompt() {
    const prompt = document.getElementById('login-reward-prompt');
    if (prompt) {
      prompt.classList.remove('hidden');
    }
  }

  async syncUserOrdersWithServer(email, userId) {
    if (!email && !userId) return;
    try {
      const localOrders = this.getUserOrdersHistory();
      const localOrderIds = localOrders.map(o => o.id).filter(Boolean);

      const res = await fetch('/api/user/sync-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email || null,
          userId: userId || null,
          localOrderIds: localOrderIds
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.orders)) {
          // Merge server orders with local orders, prioritizing latest server state
          let merged = [...data.orders];
          const serverIds = new Set(merged.map(o => String(o.id)));
          
          localOrders.forEach(loc => {
            if (loc && loc.id && !serverIds.has(String(loc.id))) {
              merged.push(loc);
            }
          });

          // Sort by creation time descending
          merged.sort((a, b) => new Date(b.createdAt || b.timestamp || 0) - new Date(a.createdAt || a.timestamp || 0));

          if (merged.length > 50) merged = merged.slice(0, 50);
          localStorage.setItem('pedigochos_user_orders', JSON.stringify(merged));
          console.log(`✅ Historial de pedidos sincronizado con Google: ${merged.length} pedidos.`);
        }
      }
    } catch(e) {
      console.warn('Notice syncing user orders with server:', e);
    }
  }

  async loginWithGoogle() {
    if (typeof SupabaseApp === 'undefined') return;
    const returnPath = window.location.pathname || '/index.html';
    await SupabaseApp.loginWithGoogle(returnPath);
  }

  async logout() {
    if (typeof SupabaseApp !== 'undefined') {
      await SupabaseApp.logout();
    }
    this.handleUserSignOut();
    window.location.reload();
  }

  async loadEstablishments() {
    try {
      // Clear any stale localStorage disabled state - server disabled_stores.json is authoritative
      try { localStorage.removeItem('pedigochos_disabled_stores'); } catch(e) {}

      const res = await fetch('/api/establishments');
      this.establishments = await res.json();
      if (Array.isArray(this.establishments)) {
        this.establishments.forEach(est => {
          // Server already applies disabled_stores.json in readDB(), trust it directly
          est.disabled = Boolean(est.disabled);

          // Preserve custom GPS from server
          if (est.latitude !== undefined && est.latitude !== null && !isNaN(parseFloat(est.latitude)) && est.longitude !== undefined && est.longitude !== null && !isNaN(parseFloat(est.longitude))) {
            est.latitude = parseFloat(est.latitude);
            est.longitude = parseFloat(est.longitude);
          } else {
            est.latitude = null;
            est.longitude = null;
          }
          est.location_lat = est.latitude;
          est.location_lng = est.longitude;
        });
      }
    } catch (e) {
      console.error('Error fetching establishments:', e);
      this.showToast('Error de conexión al cargar comercios');
    }
  }

  async loadServiceEstablishments() {
    try {
      const res = await fetch('/api/service-establishments');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          this.serviceEstablishments = data;
          return;
        }
      }
    } catch (e) {
      console.warn('Could not load service establishments from API, using defaults:', e);
    }
    this.serviceEstablishments = this.getDefaultServiceEstablishments();
  }

  getDefaultServiceEstablishments() {
    return [
      {
        id: 'serv-resin',
        name: 'SHELLI ART',
        displayName: 'Shelli Art',
        category: 'resina',
        categoryLabel: 'Arte & Recuerdos',
        categoryIcon: '✨',
        slogan: 'Diseño y arte exclusivo en resina epóxica, llaveros personalizados con fotos, chip NFC, hojilla de oro 24K y recuerdos',
        serviceName: 'Llaveros Personalizados & Arte',
        logo: '/images/services/shelliart_logo.svg',
        image: '/images/services/shelliart_banner.jpg',
        rating: 5.0,
        reviewCount: 48,
        badges: ['🎨 Bajo Cotización', '📸 Fotos & NFC', '🎁 Llavero Personalizado'],
        actionType: 'resin',
        ctaText: 'Personalizar en Shelli Art ➔',
        themeColor: '#EC4899',
        phone: '+57 322 794 9751',
        location: 'San Antonio / Taller Shelli Art'
      },
      {
        id: 'serv-pinatas',
        name: 'CREACIONES LOLA',
        displayName: 'Creaciones Lola',
        category: 'pinatas',
        categoryLabel: 'Fiestas & Piñatas',
        categoryIcon: '🎉',
        slogan: 'Piñatas artesanales 3D, números temáticos con flores, siluetas y modelos personalizados por encargo',
        serviceName: 'Piñatas Personalizadas & Fiestas',
        logo: '/images/services/creaciones_lola_logo.svg',
        image: '/images/services/creaciones_lola_banner.png',
        rating: 5.0,
        reviewCount: 62,
        badges: ['🎉 100% Hecho a Mano', '⭐ Cualquier Motivo', '🎈 A Palo o Cintas'],
        actionType: 'pinatas',
        ctaText: 'Cotizar en Creaciones Lola ➔',
        themeColor: '#F43F5E',
        phone: '+57 322 794 9751',
        location: 'San Antonio / Taller Creaciones Lola'
      },
      {
        id: 'serv-print3d',
        name: 'PEDIGOCHOS 3D LAB',
        displayName: 'PediGochos 3D Lab',
        category: 'print3d',
        categoryLabel: 'Tecnología & 3D Lab',
        categoryIcon: '🖨️',
        slogan: 'Laboratorio de impresión 3D industrial, prototipado rápido, repuestos automotrices y piezas técnicas',
        serviceName: 'Laboratorio 3D & Prototipado',
        logo: '/images/services/print3d_logo.svg',
        image: '/images/servicios.jpg',
        rating: 5.0,
        reviewCount: 35,
        badges: ['🔄 Visor 3D 360°', '🖨️ PLA • Resina • PETG', '⚡ STL Inmediato'],
        actionType: 'print3d',
        ctaText: 'Prototipar en 3D Lab ➔',
        themeColor: '#6366F1',
        phone: '+57 322 794 9751',
        location: 'San Antonio / Laboratorio Central'
      },
      {
        id: 'serv-paint',
        name: 'TALLER AUTOMOTRIZ SAN ANTONIO',
        displayName: 'Taller Automotriz San Antonio',
        category: 'paint',
        categoryLabel: 'Automotriz & Latonería',
        categoryIcon: '🎨',
        slogan: 'Enderezado de chasis, sacado de golpes, latonería profesional y pintura con secado al horno',
        serviceName: 'Latonería & Pintura al Horno',
        logo: '/images/services/paint_logo.svg',
        image: '/images/vehicles/sedan_general.jpg',
        rating: 4.9,
        reviewCount: 54,
        badges: ['🔥 Secado al Horno', '🎨 DuPont / Glasurit', '🛡️ Garantía de Color'],
        actionType: 'paint',
        ctaText: 'Cotizar en Taller Automotriz ➔',
        themeColor: '#EA580C',
        phone: '+57 322 794 9751',
        location: 'San Antonio / Taller Central'
      },
      {
        id: 'serv-cauchera',
        name: 'CAUCHERA CACHU 24/7',
        displayName: 'Cauchera Cachu 24/7',
        category: 'cauchera',
        categoryLabel: 'Auxilio Vial & Montallantas',
        categoryIcon: '🔧',
        slogan: 'Montallantas a domicilio las 24 horas. Despinche, parches vulcanizados e inflado con GPS',
        serviceName: 'Cauchera Móvil & Despinche 24H',
        logo: '/images/services/cauchera_logo.svg',
        image: '/images/servicios.jpg',
        rating: 5.0,
        reviewCount: 89,
        badges: ['🔴 Guardia Activa 24/7', '📍 Auxilio por GPS', '⏱️ 15-20 min'],
        actionType: 'cauchera',
        ctaText: 'Solicitar Auxilio Inmediato ➔',
        themeColor: '#EF4444',
        phone: '+57 322 794 9751',
        location: 'San Antonio / Ureña / Cobertura Total'
      },
      {
        id: 'serv-ride',
        name: 'PEDIGOCHOS MÓVIL',
        displayName: 'PediGochos Móvil',
        category: 'movil',
        categoryLabel: 'Transporte & Movilidad',
        categoryIcon: '🛵',
        slogan: 'Tu transporte rápido y seguro en San Antonio. Moto Taxi, Auto estándar y Vehículo de Lujo',
        serviceName: 'Carreras Express & Movilidad',
        logo: '/images/services/movil_logo.svg',
        image: '/images/vehicles/moto_clasica.jpg',
        rating: 4.9,
        reviewCount: 140,
        badges: ['⚡ Tarifa Automática GPS', '🛵 Moto Taxi', '🚗 Auto & Lujo'],
        actionType: 'ride',
        ctaText: 'Pedir Móvil Ahora ➔',
        themeColor: '#FF6B00',
        phone: '+57 322 794 9751',
        location: 'San Antonio / Táchira'
      }
    ];
  }

  async loadPromotions() {
    try {
      const promoSection = document.getElementById('daily-promotions-section');
      const container = document.getElementById('daily-promotions-container');
      if (!container || !promoSection) return;

      if (this.currentCategory !== 'comidas') {
        promoSection.style.display = 'none';
        promoSection.classList.add('hidden');
        return;
      }

      const res = await fetch('/api/promotions');
      const promos = await res.json();
      this.dailyPromotionsList = Array.isArray(promos) ? promos : [];

      const now = Date.now();
      // Filter out any promotions where expiresAt has already passed (< 24h lifespan)
      const validPromos = this.dailyPromotionsList.filter(p => {
        const expiresMs = new Date(p.expiresAt || (new Date(p.createdAt).getTime() + 24 * 60 * 60 * 1000)).getTime();
        return p.active !== false && now < expiresMs;
      });

      if (validPromos.length === 0) {
        promoSection.style.display = 'none';
        promoSection.classList.add('hidden');
        return;
      }

      container.innerHTML = validPromos.map(p => {
        const expiresMs = new Date(p.expiresAt || (new Date(p.createdAt).getTime() + 24 * 60 * 60 * 1000)).getTime();
        const diffMs = Math.max(0, expiresMs - now);
        const hoursLeft = Math.floor(diffMs / (1000 * 60 * 60));
        const minsLeft = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        const origPrice = p.originalPrice || p.promoPrice;
        const discountPct = origPrice > p.promoPrice ? Math.round(((origPrice - p.promoPrice) / origPrice) * 100) : 0;
        const discountBadge = discountPct > 0 ? `<span style="background: #EF4444; color: #FFF; font-size: 10px; font-weight: 900; padding: 2px 7px; border-radius: 8px; position: absolute; top: 8px; left: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.5);">- ${discountPct}% OFF</span>` : '';
        const currency = p.currency || 'COP';
        const symbol = (currency === 'VES') ? 'Bs.' : '$';
        const stockRem = p.stockRemaining !== undefined ? p.stockRemaining : (p.stockTotal || 8);
        const stockBadge = `<span style="position: absolute; top: 8px; right: 8px; background: rgba(245, 158, 11, 0.92); color: #0F172A; font-size: 9px; font-weight: 900; padding: 2px 6px; border-radius: 6px; box-shadow: 0 2px 5px rgba(0,0,0,0.4);">⚡ Quedan ${stockRem}</span>`;

        return `
          <div onclick="MarketplaceApp.openDailyOfferOrderModal('${p.id}')" style="min-width: 220px; max-width: 220px; background: rgba(30, 41, 59, 0.95); border: 1.5px solid rgba(239, 68, 68, 0.45); border-radius: 14px; overflow: hidden; cursor: pointer; flex-shrink: 0; position: relative; scroll-snap-align: start; box-shadow: 0 4px 14px rgba(0,0,0,0.35); transition: transform 0.2s ease;">
            <div style="width: 100%; height: 110px; position: relative; background: #000;">
              <img src="${p.image || '/images/burger_royale.jpg'}" alt="${p.title}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='/images/burger_royale.jpg'">
              ${discountBadge}
              ${stockBadge}
              <span class="offer-countdown-timer" data-expires="${expiresMs}" style="position: absolute; bottom: 6px; right: 6px; background: rgba(15, 23, 42, 0.92); color: #FCA5A5; font-size: 9.5px; font-weight: 800; padding: 2px 7px; border-radius: 10px; border: 1px solid rgba(239,68,68,0.45); box-shadow: 0 2px 6px rgba(0,0,0,0.5);">
                ⏱️ ${hoursLeft}h ${minsLeft}m
              </span>
            </div>
            <div style="padding: 10px;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <span style="font-size: 13px;">🏪</span>
                <span style="font-size: 11px; font-weight: 700; color: #94A3B8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.establishmentName || 'Restaurante'}</span>
              </div>
              <h5 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 800; color: #FFF; line-height: 1.25; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.title}</h5>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 6px;">
                <div>
                  ${origPrice > p.promoPrice ? `<span style="font-size: 10px; color: #64748B; text-decoration: line-through; display: block;">${symbol}${Math.round(origPrice).toLocaleString('de-DE')}</span>` : ''}
                  <span style="font-size: 13.5px; font-weight: 900; color: #10B981;">${symbol}${Math.round(p.promoPrice).toLocaleString('de-DE')} ${currency}</span>
                </div>
                <span style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); color: #FFF; border-radius: 20px; font-size: 10px; font-weight: 800; padding: 4px 9px; box-shadow: 0 2px 6px rgba(239,68,68,0.4);">🔥 Pedir</span>
              </div>
            </div>
          </div>
        `;
      }).join('');

      promoSection.style.display = 'block';
      promoSection.classList.remove('hidden');
      this.startDailyOffersCountdown();
    } catch(e) {
      console.warn('Error loading daily promos:', e);
    }
  }

  // ==================== DIGITAL QUOTE & ORDER VOUCHER ====================
  currentVoucherData = null;

  openDigitalQuoteVoucher(data) {
    this.currentVoucherData = data;
    const modal = document.getElementById('modal-digital-quote-voucher');
    if (!modal) return;

    const codeEl = document.getElementById('voucher-display-code');
    const dateEl = document.getElementById('voucher-display-date');
    const contentEl = document.getElementById('voucher-display-content');
    const waBtn = document.getElementById('btn-voucher-whatsapp');

    const code = data.code || `COT-${Math.floor(1000 + Math.random() * 9000)}`;
    if (codeEl) codeEl.textContent = `#${code}`;
    if (dateEl) {
      const now = new Date();
      dateEl.textContent = `${now.toLocaleDateString()} • ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    if (contentEl) {
      contentEl.innerHTML = `
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px; margin-bottom: 12px; display: flex; gap: 12px; align-items: center;">
          ${data.image ? `<img src="${data.image}" style="width: 54px; height: 54px; border-radius: 10px; object-fit: cover; background: #000; flex-shrink: 0;" alt="Item">` : '<span style="font-size: 32px;">📦</span>'}
          <div style="min-width: 0; flex: 1;">
            <strong style="color: #FFF; font-size: 13.5px; display: block; line-height: 1.25; margin-bottom: 3px;">${data.title || 'Cotización'}</strong>
            <span style="font-size: 11px; color: #94A3B8;">${data.category || 'Servicio Personalizado'}</span>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 4px;">
          ${(data.details || []).map(d => `
            <div class="voucher-detail-row">
              <span class="voucher-detail-label">${d.label}</span>
              <span class="voucher-detail-value">${d.value}</span>
            </div>
          `).join('')}

          ${data.gpsLocation ? `
            <div class="voucher-detail-row">
              <span class="voucher-detail-label">📍 Ubicación GPS:</span>
              <span class="voucher-detail-value" style="color: #38BDF8;">
                <a href="${data.gpsLocation.mapsUrl}" target="_blank" style="color: #38BDF8; text-decoration: underline;">Ver en Google Maps</a>
              </span>
            </div>
          ` : ''}

          <div class="voucher-detail-row" style="border-top: 1px dashed rgba(255,255,255,0.15); margin-top: 6px; padding-top: 8px;">
            <span class="voucher-detail-label" style="font-weight: 800; color: #FFF;">Total / Modalidad:</span>
            <span class="voucher-detail-value" style="color: #34D399; font-size: 14px; font-weight: 900;">${data.total || 'Bajo Cotización'}</span>
          </div>
        </div>
      `;
    }

    if (waBtn) {
      waBtn.onclick = () => {
        if (data.whatsappUrl) {
          window.open(data.whatsappUrl, '_blank');
        }
      };
    }

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }

  closeDigitalQuoteVoucher() {
    const modal = document.getElementById('modal-digital-quote-voucher');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
  }

  copyVoucherSummary() {
    if (!this.currentVoucherData) return;
    const d = this.currentVoucherData;
    let text = `🧾 COMPROBANTE PEDIGOCHOS VZ\n`;
    text += `Código: #${d.code || 'COT-001'}\n`;
    text += `Item: ${d.title || ''}\n`;
    (d.details || []).forEach(item => {
      text += `• ${item.label}: ${item.value}\n`;
    });
    if (d.gpsLocation) text += `📍 GPS: ${d.gpsLocation.mapsUrl}\n`;
    text += `Total: ${d.total || 'Bajo Cotización'}\n`;

    navigator.clipboard.writeText(text).then(() => {
      this.showToast('📋 ¡Comprobante copiado al portapapeles!');
    }).catch(() => {
      alert('Resumen copiado.');
    });
  }

  startDailyOffersCountdown() {

    if (this._dailyOffersInterval) clearInterval(this._dailyOffersInterval);

    this._dailyOffersInterval = setInterval(() => {

      const now = Date.now();

      document.querySelectorAll('.offer-countdown-timer').forEach(el => {

        const exp = parseInt(el.dataset.expires, 10);

        if (!exp) return;

        const diff = Math.max(0, exp - now);

        if (diff <= 0) {

          el.textContent = '⌛ Expirada';

          el.style.background = '#475569';

        } else {

          const h = Math.floor(diff / 3600000);

          const m = Math.floor((diff % 3600000) / 60000);

          const s = Math.floor((diff % 60000) / 1000);

          el.textContent = `⏱️ ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

        }

      });

      const modalTimer = document.getElementById('offer-order-timer-badge');

      if (modalTimer && this.currentDailyOffer) {

        const exp = new Date(this.currentDailyOffer.expiresAt || (new Date(this.currentDailyOffer.createdAt).getTime() + 24 * 3600000)).getTime();

        const diff = Math.max(0, exp - now);

        const h = Math.floor(diff / 3600000);

        const m = Math.floor((diff % 3600000) / 60000);

        const s = Math.floor((diff % 60000) / 1000);

        modalTimer.textContent = `⏱️ Quedan ${h}h ${m}m ${s}s de oferta`;

      }

    }, 1000);

  }



  // ==================== OFERTAS DEL DÍA: EXPRESS ORDER & MANDATORY FIXED GPS ====================
  openDailyOfferOrderModal(promoId) {
    const promo = (this.dailyPromotionsList || []).find(p => p.id === promoId);
    if (!promo) {
      alert('Oferta no disponible.');
      return;
    }

    this.currentDailyOffer = promo;
    this.dailyOfferQty = 1;
    this.offerOrderGps = null;

    const modal = document.getElementById('modal-daily-offer-order');
    if (!modal) return;

    // Fill details
    const imgEl = document.getElementById('offer-order-img');
    const vendorEl = document.getElementById('offer-order-vendor');
    const titleEl = document.getElementById('offer-order-title');
    const priceEl = document.getElementById('offer-order-price');
    const origPriceEl = document.getElementById('offer-order-orig-price');
    const timerBadgeEl = document.getElementById('offer-order-timer-badge');
    const qtyEl = document.getElementById('offer-order-qty');
    const whatsappInput = document.getElementById('offer-order-client-whatsapp');
    const addressInput = document.getElementById('offer-order-client-address');
    const notesInput = document.getElementById('offer-order-client-notes');

    if (imgEl) imgEl.src = promo.image || '/images/burger_royale.jpg';
    if (vendorEl) vendorEl.textContent = `🏪 ${promo.establishmentName || 'Restaurante'}`;
    if (titleEl) titleEl.textContent = promo.title;

    const currency = promo.currency || 'COP';
    const symbol = (currency === 'VES') ? 'Bs.' : '$';
    if (priceEl) priceEl.textContent = `${symbol}${Math.round(promo.promoPrice).toLocaleString('de-DE')} ${currency}`;

    const orig = promo.originalPrice || promo.promoPrice;
    if (origPriceEl) {
      origPriceEl.textContent = (orig > promo.promoPrice) ? `${symbol}${Math.round(orig).toLocaleString('de-DE')}` : '';
    }

    // Remaining time
    const now = Date.now();
    const expiresMs = new Date(promo.expiresAt || (new Date(promo.createdAt).getTime() + 24 * 60 * 60 * 1000)).getTime();
    const diffMs = Math.max(0, expiresMs - now);
    const hoursLeft = Math.floor(diffMs / (1000 * 60 * 60));
    const minsLeft = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (timerBadgeEl) timerBadgeEl.textContent = `⏱️ Quedan ${hoursLeft}h ${minsLeft}m de oferta`;

    if (qtyEl) qtyEl.textContent = '1';
    if (notesInput) notesInput.value = '';

    // Render stock urgency progress bar
    const stockEl = document.getElementById('offer-order-stock-bar');
    if (stockEl) {
      const total = promo.stockTotal || 10;
      const remaining = promo.stockRemaining !== undefined ? promo.stockRemaining : total;
      const soldPct = Math.min(100, Math.max(18, Math.round(((total - remaining) / total) * 100)));
      stockEl.innerHTML = `
        <div style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 6px 10px;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 800; color: #FCA5A5; margin-bottom: 4px;">
            <span>🔥 ¡Solo quedan ${remaining} disponibles!</span>
            <span>${soldPct}% reservado</span>
          </div>
          <div style="width: 100%; height: 5px; background: rgba(255,255,255,0.12); border-radius: 4px; overflow: hidden;">
            <div style="width: ${soldPct}%; height: 100%; background: linear-gradient(90deg, #F59E0B 0%, #EF4444 100%); border-radius: 4px;"></div>
          </div>
        </div>
      `;
    }

    // Auto-fill saved client whatsapp & address
    try {
      const savedPhone = localStorage.getItem('pedigochos_client_whatsapp') || localStorage.getItem('pedigochos_customer_phone') || '';
      if (whatsappInput && !whatsappInput.value) whatsappInput.value = savedPhone;
      const savedAddr = localStorage.getItem('pedigochos_client_address') || localStorage.getItem('pedigochos_user_address') || '';
      if (addressInput && !addressInput.value) addressInput.value = savedAddr;
    } catch(e) {}

    this.updateDailyOfferTotal();

    modal.style.display = 'flex';
    modal.classList.remove('hidden');

    // Automatically trigger mandatory GPS detection immediately!
    this.detectDailyOfferGps(false);
  }

  closeDailyOfferOrderModal() {
    const modal = document.getElementById('modal-daily-offer-order');
    if (!modal) return;
    modal.style.display = 'none';
    modal.classList.add('hidden');
    if (this.offerOrderMap) {
      try {
        this.offerOrderMap.remove();
        this.offerOrderMap = null;
        this.offerOrderMarker = null;
      } catch(e) {}
    }
  }

  changeDailyOfferQty(delta) {
    let next = (this.dailyOfferQty || 1) + delta;
    if (next < 1) next = 1;
    if (next > 20) next = 20;
    this.dailyOfferQty = next;
    const qtyEl = document.getElementById('offer-order-qty');
    if (qtyEl) qtyEl.textContent = next;
    this.updateDailyOfferTotal();
  }

  updateDailyOfferTotal() {
    if (!this.currentDailyOffer) return;
    const qty = this.dailyOfferQty || 1;
    const total = (this.currentDailyOffer.promoPrice || 0) * qty;
    const currency = this.currentDailyOffer.currency || 'COP';
    const symbol = (currency === 'VES') ? 'Bs.' : '$';
    const totalEl = document.getElementById('offer-order-total-amount');
    if (totalEl) totalEl.textContent = `${symbol}${Math.round(total).toLocaleString('de-DE')} ${currency}`;
  }

  detectDailyOfferGps(userInitiated = false) {
    const statusEl = document.getElementById('offer-order-gps-status');

    if (statusEl) {
      statusEl.style.background = 'rgba(245, 158, 11, 0.15)';
      statusEl.style.borderColor = 'rgba(245, 158, 11, 0.35)';
      statusEl.style.color = '#FCD34D';
      statusEl.innerHTML = `
        <span class="spinner-small" style="display: inline-block;"></span>
        <span>${userInitiated ? 'Reintentando señal satelital obligatoria...' : 'Detectando ubicación satelital fija obligatoria...'}</span>
      `;
    }

    if (!navigator.geolocation) {
      if (statusEl) {
        statusEl.style.background = 'rgba(239, 68, 68, 0.15)';
        statusEl.style.borderColor = 'rgba(239, 68, 68, 0.35)';
        statusEl.style.color = '#FCA5A5';
        statusEl.innerHTML = '❌ Tu navegador no soporta geolocalización GPS.';
      }
      this.validateDailyOfferForm();
      return;
    }

    const geoOptions = {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy || 0);

        this.offerOrderGps = { lat, lng, accuracy };

        if (statusEl) {
          statusEl.style.background = 'rgba(16, 185, 129, 0.15)';
          statusEl.style.borderColor = 'rgba(16, 185, 129, 0.4)';
          statusEl.style.color = '#34D399';
          statusEl.innerHTML = `
            <span>✅ Ubicación satelital fija confirmada (±${accuracy}m)</span>
          `;
        }

        // Initialize or move Leaflet Map with STRICTLY IMMOVABLE PIN
        this.renderFixedGpsMap(lat, lng);

        // Reverse geocode to assist address input if empty
        const addressInput = document.getElementById('offer-order-client-address');
        if (addressInput && !addressInput.value.trim()) {
          this.reverseGeocodeDailyOffer(lat, lng);
        }

        this.validateDailyOfferForm();
      },
      (err) => {
        console.warn('Daily offer GPS detection error:', err);
        this.offerOrderGps = null;
        if (statusEl) {
          statusEl.style.background = 'rgba(239, 68, 68, 0.15)';
          statusEl.style.borderColor = 'rgba(239, 68, 68, 0.35)';
          statusEl.style.color = '#FCA5A5';
          statusEl.innerHTML = '<span>⚠️ GPS Requerido: Por favor activa la ubicación satelital de tu teléfono y permite el permiso para pedir.</span>';
        }
        this.validateDailyOfferForm();
      },
      geoOptions
    );
  }

  renderFixedGpsMap(lat, lng) {
    const mapEl = document.getElementById('offer-order-leaflet-map');
    if (!mapEl || typeof L === 'undefined') return;

    if (!this.offerOrderMap) {
      this.offerOrderMap = L.map(mapEl, {
        center: [lat, lng],
        zoom: 16,
        zoomControl: true,
        dragging: true,
        scrollWheelZoom: false,
        doubleClickZoom: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(this.offerOrderMap);

      // Create strictly NON-DRAGGABLE marker ("sin poder mover el punto de la ubicacion fija en el mapa")
      this.offerOrderMarker = L.marker([lat, lng], {
        draggable: false // STRICT REQUIREMENT: Point is locked and immovable
      }).addTo(this.offerOrderMap);

      // Ensure no clicks on the map can move the marker
      this.offerOrderMap.off('click');

      this.offerOrderMarker.bindPopup('<b>📍 Tu Ubicación GPS Fija</b><br>Coordenadas certificadas de entrega').openPopup();
    } else {
      this.offerOrderMap.setView([lat, lng], 16);
      if (this.offerOrderMarker) {
        this.offerOrderMarker.setLatLng([lat, lng]);
      } else {
        this.offerOrderMarker = L.marker([lat, lng], { draggable: false }).addTo(this.offerOrderMap);
      }
    }

    setTimeout(() => {
      if (this.offerOrderMap) {
        this.offerOrderMap.invalidateSize();
      }
    }, 250);
  }

  async reverseGeocodeDailyOffer(lat, lng) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      const data = await res.json();
      if (data && data.display_name) {
        const addressInput = document.getElementById('offer-order-client-address');
        if (addressInput && !addressInput.value.trim()) {
          addressInput.value = data.display_name;
          this.validateDailyOfferForm();
        }
      }
    } catch(e) {}
  }

  validateDailyOfferForm() {
    const whatsapp = (document.getElementById('offer-order-client-whatsapp')?.value || '').trim();
    const address = (document.getElementById('offer-order-client-address')?.value || '').trim();
    const hasGps = !!(this.offerOrderGps && this.offerOrderGps.lat && this.offerOrderGps.lng);
    const submitBtn = document.getElementById('btn-submit-offer-whatsapp');
    const hintEl = document.getElementById('offer-order-submit-hint');

    const phoneVal = (window.PhoneUtils && window.PhoneUtils.validateVECO)
      ? window.PhoneUtils.validateVECO(whatsapp)
      : { isValid: whatsapp.length >= 7 };

    const isValid = phoneVal.isValid && (address.length >= 4) && hasGps;

    if (submitBtn) {
      submitBtn.disabled = !isValid;
      submitBtn.style.opacity = isValid ? '1' : '0.45';
      submitBtn.style.cursor = isValid ? 'pointer' : 'not-allowed';
    }

    if (hintEl) {
      if (!hasGps) {
        hintEl.style.display = 'block';
        hintEl.style.color = '#F87171';
        hintEl.textContent = '⚠️ Obligatorio: Se requiere la detección automática de tu GPS satelital.';
      } else if (!phoneVal.isValid) {
        hintEl.style.display = 'block';
        hintEl.style.color = '#FCD34D';
        hintEl.textContent = `ℹ️ ${phoneVal.error || 'Ingresa un WhatsApp válido (VE: 0414... / CO: 320...).'}`;
      } else if (address.length < 4) {
        hintEl.style.display = 'block';
        hintEl.style.color = '#FCD34D';
        hintEl.textContent = 'ℹ️ Completa tu dirección o punto de referencia.';
      } else {
        hintEl.style.display = 'none';
      }
    }

    return isValid;
  }

  shareDailyOffer(id) {
    const promo = (this.promotions || []).find(p => p.id === id) || this.currentDailyOffer;
    if (!promo) return;
    const url = `${window.location.origin}/?promo=${encodeURIComponent(promo.id)}`;
    const text = `🔥 ¡Mira esta Oferta del Día en PediGochos!\n*${promo.title}*\n💰 Precio especial: $${Math.round(promo.promoPrice).toLocaleString('de-DE')} ${promo.currency}\n⏱️ Válida solo por 24 horas.\n👉 Pide aquí con entrega a domicilio: ${url}`;
    
    if (navigator.share) {
      navigator.share({
        title: `Oferta del Día: ${promo.title}`,
        text: text,
        url: url
      }).catch(() => {});
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    }
  }

  sendDailyOfferWhatsAppOrder() {
    if (!this.validateDailyOfferForm()) {
      alert('Por favor verifica que el GPS esté detectado y tus datos de contacto y dirección estén completos.');
      return;
    }

    const promo = this.currentDailyOffer;
    if (!promo) return;

    const whatsapp = (document.getElementById('offer-order-client-whatsapp')?.value || '').trim();
    const address = (document.getElementById('offer-order-client-address')?.value || '').trim();
    const notes = (document.getElementById('offer-order-client-notes')?.value || '').trim();
    const qty = this.dailyOfferQty || 1;
    const currency = promo.currency || 'COP';
    const symbol = (currency === 'VES') ? 'Bs.' : '$';
    const total = Math.round((promo.promoPrice || 0) * qty).toLocaleString('de-DE');

    const lat = this.offerOrderGps.lat.toFixed(6);
    const lng = this.offerOrderGps.lng.toFixed(6);
    const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;

    // Target vendor WhatsApp
    let targetPhone = promo.vendorWhatsapp || '';
    let cleanPhone = targetPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '58' + cleanPhone.substring(1);
    } else if (cleanPhone.length === 10 && cleanPhone.startsWith('4')) {
      cleanPhone = '58' + cleanPhone;
    } else if (cleanPhone.length === 10 && cleanPhone.startsWith('3')) {
      cleanPhone = '57' + cleanPhone;
    }

    if (!cleanPhone) {
      alert('El comercio emisor no tiene un número de WhatsApp configurado para recibir pedidos.');
      return;
    }

    // Save client info for future convenience
    try {
      localStorage.setItem('pedigochos_client_whatsapp', whatsapp);
      localStorage.setItem('pedigochos_client_address', address);
    } catch(e) {}

    const text = 
`🔥 *¡NUEVO PEDIDO DE OFERTA FLASH (24H)!*
━━━━━━━━━━━━━━━━━━━━
🍔 *Oferta:* ${promo.title}
🏪 *Negocio:* ${promo.establishmentName || 'Comercio'}
🔢 *Cantidad:* ${qty} combo(s)
💰 *Total a Pagar:* ${symbol}${total} ${currency}
━━━━━━━━━━━━━━━━━━━━
👤 *WhatsApp Cliente:* ${whatsapp}
🏠 *Dirección de Entrega:* ${address}
${notes ? `📝 *Notas:* ${notes}\n` : ''}📍 *UBICACIÓN GPS FIJA SATELITAL (OBLIGATORIA):*
${mapsLink}
━━━━━━━━━━━━━━━━━━━━
🚀 *Generado vía PediGochos*`;

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');

    this.closeDailyOfferOrderModal();
    if (typeof this.showToast === 'function') {
      this.showToast('🎉 ¡Redirigiendo a WhatsApp con tu pedido y ubicación satelital!');
    }
  }

  // Navigation
  selectCategory(category) {
    this.currentCategory = category;
    if (category === 'servicios') {
      this.currentServiceCategory = null;
    }
    window.activeFoodTypeFilter = null; // Always reset filter so Food Categories Grid shows first for comidas
    
    // Update active class in categories tabs (DeliverCity style)
    document.querySelectorAll('.category-card-delivercity').forEach(card => {
      if (card.dataset.category === category) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });

    // Daily offers only appear when category is 'comidas'
    if (category === 'comidas') {
      this.loadPromotions();
    } else {
      const promoSection = document.getElementById('daily-promotions-section');
      if (promoSection) {
        promoSection.style.display = 'none';
        promoSection.classList.add('hidden');
      }
    }

    // Category selected -> Keep floating action bubbles visible while browsing on home
    this.updateFloatingAndHeaderSos(false);

    this.renderEstablishments();

    // Smoothly scroll down so user immediately sees the category items (especially for Servicios)
    setTimeout(() => {
      const target = document.getElementById('all-restaurants-header') || document.getElementById('establishments-grid');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  }

  selectServiceCategory(categoryKey) {
    this.currentServiceCategory = categoryKey;
    this.renderEstablishments();
    setTimeout(() => {
      const target = document.getElementById('all-restaurants-header') || document.getElementById('establishments-grid');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  }

  resetServiceCategory() {
    this.currentServiceCategory = null;
    this.renderEstablishments();
    setTimeout(() => {
      const target = document.getElementById('all-restaurants-header') || document.getElementById('establishments-grid');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  }

  executeServiceAction(actionType) {
    this.updateFloatingAndHeaderSos(true);
    switch (actionType) {
      case 'resin':
        if (typeof ResinServiceApp !== 'undefined' && ResinServiceApp.open) {
          ResinServiceApp.open();
        } else {
          alert('Cargando servicio Shelli Art...');
        }
        break;
      case 'pinatas':
        if (typeof PinataServiceApp !== 'undefined' && PinataServiceApp.open) {
          PinataServiceApp.open();
        } else {
          alert('Cargando servicio Creaciones Lola...');
        }
        break;
      case 'print3d':
        if (typeof Print3DServiceApp !== 'undefined' && Print3DServiceApp.open) {
          Print3DServiceApp.open();
        } else {
          alert('Cargando servicio PediGochos 3D Lab...');
        }
        break;
      case 'paint':
        if (typeof PaintServiceApp !== 'undefined' && PaintServiceApp.open) {
          PaintServiceApp.open();
        } else {
          alert('Cargando Taller Automotriz San Antonio...');
        }
        break;
      case 'cauchera':
        this.openCaucheraModal();
        break;
      case 'ride':
        this.openRideModal();
        break;
      default:
        console.warn('Tipo de servicio no reconocido:', actionType);
    }
  }

  updateFloatingAndHeaderSos(isInSubCategoryOrStore) {
    const floatingContainer = document.querySelector('.floating-left-actions-container');
    const headerSosBtn = document.getElementById('header-sos-btn');
    const floatingSos = document.getElementById('floating-sos-btn');
    const floatingServices = document.getElementById('floating-services-btn');

    if (isInSubCategoryOrStore) {
      document.body.classList.add('in-establishment');
      if (floatingContainer) {
        floatingContainer.classList.add('hidden');
        floatingContainer.style.setProperty('display', 'none', 'important');
      }
      if (floatingSos) {
        floatingSos.classList.add('hidden');
        floatingSos.style.setProperty('display', 'none', 'important');
      }
      if (floatingServices) {
        floatingServices.classList.add('hidden');
        floatingServices.style.setProperty('display', 'none', 'important');
      }
      if (headerSosBtn) {
        headerSosBtn.classList.remove('hidden');
        headerSosBtn.style.removeProperty('display');
      }
    } else {
      document.body.classList.remove('in-establishment');
      if (floatingContainer) {
        floatingContainer.classList.remove('hidden');
        floatingContainer.style.removeProperty('display');
      }
      if (floatingSos) {
        floatingSos.classList.remove('hidden');
        floatingSos.style.removeProperty('display');
      }
      if (floatingServices) {
        floatingServices.classList.remove('hidden');
        floatingServices.style.removeProperty('display');
      }
      if (headerSosBtn) {
        headerSosBtn.classList.add('hidden');
        headerSosBtn.style.setProperty('display', 'none', 'important');
      }
    }
  }

  showFoodCategoriesGrid() {
    window.activeFoodTypeFilter = null;
    this.renderEstablishments();
  }

  goHome(pushState = true) {
    this.selectedEstablishment = null;
    this.currentCategory = 'comidas';
    window.activeFoodTypeFilter = null;

    // Reset URL query parameters (clear ?shop=... or #...)
    if (window.location.search || window.location.hash) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const estView = document.getElementById('establishment-view');
    const homeView = document.getElementById('home-view');
    if (estView) estView.classList.remove('active');
    if (homeView) homeView.classList.add('active');

    // Restore active state to main Restaurantes category card
    document.querySelectorAll('.category-card-delivercity').forEach(card => {
      if (card.dataset.category === 'comidas') {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });
    
    // Reset global theme to default
    document.documentElement.style.setProperty('--primary', '#FF5E3A');
    document.documentElement.style.setProperty('--primary-hover', '#E04A27');
    
    // Back to root home -> Show floating bubbles and hide header SOS button
    this.updateFloatingAndHeaderSos(false);

    this.renderEstablishments();
    this.setActiveMobileTab('home');
    this.closeAllModals();

    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch(e) {
      window.scrollTo(0, 0);
    }

    if (pushState) {
      window.history.pushState({ view: 'home' }, '');
    }
  }

  openEstablishment(estId, pushState = true) {
    const est = this.establishments.find(e => e.id === estId);
    if (!est) return;

    if (est.disabled) {
      this.showToast('⚠️ Este comercio se encuentra temporalmente inactivo.');
      this.goHome();
      return;
    }

    this.selectedEstablishment = est;

    if (!this.isEstablishmentOpen(est)) {
      this.showToast(`🔴 Local CERRADO (${this.formatTime12h(est.open_time)} - ${this.formatTime12h(est.close_time)}). Puedes explorar la carta.`);
    }

    if (pushState) {
      window.history.pushState({ view: 'establishment', estId: estId }, '');
    }

    // Inside establishment -> Hide floating bubbles and show header SOS button
    this.updateFloatingAndHeaderSos(true);

    // Apply custom accent theme color
    if (est.themeColor) {
      document.documentElement.style.setProperty('--primary', est.themeColor);
      // Darken accent color for hover state
      const darken = (hex, pct) => {
        hex = hex.replace(/^\s*#|\s*$/g, '');
        if (hex.length === 3) hex = hex.replace(/(.)/g, '$1$1');
        let r = parseInt(hex.substr(0, 2), 16),
            g = parseInt(hex.substr(2, 2), 16),
            b = parseInt(hex.substr(4, 2), 16);
        r = Math.max(0, Math.min(255, r - r * (pct / 100)));
        g = Math.max(0, Math.min(255, g - g * (pct / 100)));
        b = Math.max(0, Math.min(255, b - b * (pct / 100)));
        return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
      };
      document.documentElement.style.setProperty('--primary-hover', darken(est.themeColor, 12));
    } else {
      document.documentElement.style.setProperty('--primary', '#FF5E3A');
      document.documentElement.style.setProperty('--primary-hover', '#E04A27');
    }

    // Set header details
    const bannerDiv = document.getElementById('est-banner');
    const isImageBanner = est.banner && (est.banner.startsWith('http') || est.banner.startsWith('/') || est.bannerType === 'image');
    
    if (isImageBanner) {
      bannerDiv.style.background = `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7)), url('${est.banner}')`;
      bannerDiv.style.backgroundSize = 'cover';
      bannerDiv.style.backgroundPosition = 'center';
    } else {
      bannerDiv.style.background = est.banner || 'linear-gradient(135deg, #1F2937, #111827)';
    }

    const logoDiv = document.getElementById('est-logo');
    if (est.logoImage) {
      logoDiv.innerHTML = `<img src="${est.logoImage}" style="width: 100%; height: 100%; object-fit: cover;">`;
    } else {
      logoDiv.innerHTML = est.logo || '🏪';
    }
    document.getElementById('est-name').innerText = est.name;
    document.getElementById('est-desc').innerText = est.description || '';
    
    // Category mapping
    const categoryEmojis = {
      comidas: '🍔 Comida',
      farmacias: '💊 Farmacia',
      servicios: '🛵 Servicio',
      mercados: '🛒 Mercado',
      ferreterias: '🛠️ Ferretería'
    };
    const categoryBadge = document.getElementById('est-category-badge');
    categoryBadge.innerText = categoryEmojis[est.category] || est.category;
    categoryBadge.className = 'est-badge ' + est.category;

    // Delivery time (minutes)
    const deliverySpan = document.querySelector('.est-delivery-time');
    if (deliverySpan) {
      deliverySpan.innerText = this.getFormattedDeliveryTime(est);
    }

    // High traffic banner in store header
    let highTrafficBanner = document.getElementById('est-high-traffic-banner');
    if (!highTrafficBanner) {
      highTrafficBanner = document.createElement('div');
      highTrafficBanner.id = 'est-high-traffic-banner';
      const headerInfo = document.querySelector('.establishment-header .est-info') || document.querySelector('.establishment-header');
      if (headerInfo) headerInfo.appendChild(highTrafficBanner);
    }

    if (est && est.isHighTraffic) {
      const extra = est.extraPrepTime || 20;
      highTrafficBanner.innerHTML = `
        <div style="background: rgba(15, 23, 42, 0.92); border: 1.5px solid #F59E0B; color: #FFFFFF; padding: 12px 16px; border-radius: 14px; font-weight: 700; font-size: 12.5px; margin-top: 14px; display: flex; align-items: center; gap: 10px; box-shadow: 0 6px 20px rgba(0,0,0,0.5); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);">
          <span style="font-size: 22px; flex-shrink: 0;">🚨</span>
          <span style="line-height: 1.4;"><strong style="color: #FCD34D; font-size: 13px;">Tráfico Alto en Cocina:</strong> El tiempo estimado de entrega aumenta en <strong style="color: #FEF08A;">+${extra} min</strong> debido a la alta afluencia de personas en el local.</span>
        </div>
      `;
      highTrafficBanner.style.display = 'block';
    } else if (highTrafficBanner) {
      highTrafficBanner.style.display = 'none';
    }

    // Closed store banner in store header
    let closedStoreBanner = document.getElementById('est-closed-store-banner');
    if (!closedStoreBanner) {
      closedStoreBanner = document.createElement('div');
      closedStoreBanner.id = 'est-closed-store-banner';
      const headerInfo = document.querySelector('.establishment-header .est-info') || document.querySelector('.establishment-header');
      if (headerInfo) headerInfo.appendChild(closedStoreBanner);
    }

    const isOpen = this.isEstablishmentOpen(est);
    if (!isOpen) {
      closedStoreBanner.innerHTML = `
        <div style="background: rgba(15, 23, 42, 0.92); border: 1.5px solid #EF4444; color: #FFFFFF; padding: 12px 16px; border-radius: 14px; font-weight: 700; font-size: 12.5px; margin-top: 14px; display: flex; align-items: center; gap: 10px; box-shadow: 0 6px 20px rgba(0,0,0,0.5); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);">
          <span style="font-size: 22px; flex-shrink: 0;">🔴</span>
          <span style="line-height: 1.4;"><strong style="color: #FCA5A5; font-size: 13px;">Restaurante Cerrado:</strong> Horario de Atención: <strong style="color: #FEF08A;">${this.formatTime12h(est.open_time)} a ${this.formatTime12h(est.close_time)}</strong>. Puedes consultar el menú pero los pedidos están desactivados fuera de horario.</span>
        </div>
      `;
      closedStoreBanner.style.display = 'block';
    } else if (closedStoreBanner) {
      closedStoreBanner.style.display = 'none';
    }

    // Render internal categories and products
    this.renderInternalCategories(est);
    this.renderProducts(est.products);

    // Switch views
    document.getElementById('home-view').classList.remove('active');
    document.getElementById('establishment-view').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getFormattedDeliveryTime(est) {
    if (!est) return '⏱️ 20-30 min';
    let minTime = est.prep_time || 15;
    let maxTime = est.delivery_time || 25;
    const isHigh = Boolean(est.isHighTraffic);
    const extra = (est.extraPrepTime && parseInt(est.extraPrepTime)) || 20;

    if (isHigh) {
      minTime += extra;
      maxTime += extra;
      return `⏱️ ${minTime}-${maxTime} min (🚨 Tráfico Alto)`;
    } else {
      return `⏱️ ${minTime}-${maxTime} min`;
    }
  }

  renderFoodBubbleCarousel() {
    const container = document.getElementById('food-type-filters-container');
    if (!container) return;

    if (this.currentCategory !== 'comidas') {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'flex';
    container.className = 'food-bubbles-wrapper premium-scroll';

    const foodCategories = [
      { id: 'all', name: 'Todos', icon: '⭐' },
      { id: 'hamburguesas', name: 'Burgers', icon: '🍔' },
      { id: 'perros', name: 'Perros', icon: '🌭' },
      { id: 'pizzas', name: 'Pizzas', icon: '🍕' },
      { id: 'patacones', name: 'Patacones', icon: '🍌' },
      { id: 'arepas', name: 'Arepas', icon: '🫓' },
      { id: 'cachapas', name: 'Cachapas', icon: '🌽' },
      { id: 'sushi', name: 'Sushi', icon: '🍣' },
      { id: 'mariscos', name: 'Mariscos', icon: '🦐' },
      { id: 'sandwiches', name: 'Sándwiches', icon: '🥪' },
      { id: 'pepitos', name: 'Pepitos', icon: '🥖' },
      { id: 'alitas', name: 'Alitas', icon: '🍗' },
      { id: 'salchipapas', name: 'Salchipapas', icon: '🍟' },
      { id: 'picadas', name: 'Parrillas', icon: '🍖' },
      { id: 'bebidas', name: 'Bebidas', icon: '🥤' },
      { id: 'postres', name: 'Postres', icon: '🍰' }
    ];

    const activeFilter = window.activeFoodTypeFilter || 'all';

    container.innerHTML = `
      <div class="food-bubbles-container">
        ${foodCategories.map(cat => {
          const isActive = activeFilter === cat.id;
          return `
            <div class="bubble-story-item ${isActive ? 'active' : ''}" onclick="MarketplaceApp.filterRestaurantsByFoodType('${cat.id}')">
              <div class="bubble-ring">
                <div class="bubble-inner">
                  ${cat.icon}
                </div>
              </div>
              <span class="bubble-label">${cat.name}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // Legacy fallback grid
  renderFoodCategoriesGrid() {
    this.renderFoodBubbleCarousel();
  }

  // Render lists
  renderEstablishments(filtered = null, isDirectFilter = false) {
    const grid = document.getElementById('establishments-grid');
    if (!grid) return;

    const viewAllBtn = document.querySelector('.btn-view-all');

    // If no category is selected (initial home state)
    if (!this.currentCategory && !filtered && !isDirectFilter) {
      const titleEl = document.getElementById('establishments-title');
      if (titleEl) titleEl.innerText = '👇 Selecciona una Categoría arriba para explorar';
      const container = document.getElementById('food-type-filters-container');
      if (container) container.style.display = 'none';
      if (viewAllBtn) viewAllBtn.style.display = 'none';

      // Hide featured carousel & daily promo until 'Restaurantes' category is selected
      const featSection = document.getElementById('featured-carousel-section');
      if (featSection) {
        featSection.style.display = 'none';
        featSection.classList.add('hidden');
      }
      const promoSection = document.getElementById('daily-promotions-section');
      if (promoSection) {
        promoSection.style.display = 'none';
        promoSection.classList.add('hidden');
      }

      grid.style.cssText = 'display: block; width: 100%;';
      grid.innerHTML = `
        <div class="cart-empty-state welcome-home-card" style="grid-column: 1 / -1; padding: 28px 18px; text-align: center; background: #FFFFFF; border: 1.5px solid #E2E8F0; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.12); margin-top: 6px;">
          <span style="font-size: 44px; display: block; margin-bottom: 8px;">👆</span>
          <h3 style="font-size: 18px; font-weight: 900; color: #0F172A; margin: 0 0 6px 0; letter-spacing: -0.2px;">¡Bienvenido a Pedi Gochos!</h3>
          <p style="font-size: 13.5px; color: #334155; font-weight: 600; margin: 0; line-height: 1.5;">
            Presiona una de las categorías arriba (<strong style="color: #EA580C; font-weight: 800;">Restaurantes, Farmacias, Mercados o Ferreterías</strong>) para ver los comercios disponibles.
          </p>
        </div>
      `;
      return;
    }

    if (viewAllBtn) {
      viewAllBtn.style.display = (this.currentCategory === 'comidas') ? 'inline-flex' : 'none';
    }

    grid.style.cssText = ''; // restore standard grid layout
    this.renderFoodBubbleCarousel();

    const categoryNames = {
      'all': '✨ Todos los Restaurantes',
      'hamburguesas': '🍔 Hamburguesas',
      'perros': '🌭 Perros Calientes',
      'pizzas': '🍕 Pizzas',
      'patacones': '🍌 Patacones',
      'arepas': '🫓 Arepas',
      'cachapas': '🌽 Cachapas',
      'sushi': '🍣 Sushi & Asiatica',
      'mariscos': '🦐 Mariscos & Pescado',
      'sandwiches': '🥪 Sándwiches',
      'pepitos': '🥖 Pepitos / Baguettes',
      'alitas': '🍗 Alitas & Chicken',
      'salchipapas': '🍟 Salchipapas',
      'picadas': '🍖 Picadas & Parrillas',
      'bebidas': '🥤 Bebidas / Batidos',
      'postres': '🍰 Postres / Helados'
    };

    let displayTitle = '';
    if (filtered || window.activeFoodTypeFilter) {
      const activeLabel = categoryNames[window.activeFoodTypeFilter] || (window.activeFoodTypeFilter ? this.capitalize(window.activeFoodTypeFilter) : 'Resultados');
      displayTitle = `
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 10px;">
          <span>${activeLabel}</span>
          <button type="button" onclick="MarketplaceApp.filterRestaurantsByFoodType('all')" style="background: rgba(255, 94, 58, 0.15); color: var(--primary); border: 1px solid var(--primary); padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px; white-space: nowrap;">
            ⭐ Ver Todos
          </button>
        </div>
      `;
    } else {
      displayTitle = this.capitalize(this.currentCategory);
    }
    const titleEl = document.getElementById('establishments-title');
    if (titleEl) titleEl.innerHTML = displayTitle;

    // Special dedicated rendering for Servicios category with 2-stage flow (Categories Hub & Company-Protagonist Establishments)
    if (this.currentCategory === 'servicios' && !filtered) {
      grid.style.width = '100%';
      grid.style.maxWidth = '100%';
      grid.style.minWidth = '0';
      grid.style.boxSizing = 'border-box';
      const allRestHeader = document.getElementById('all-restaurants-header');
      const allRestTitle = document.getElementById('all-restaurants-title-text');
      if (allRestHeader) allRestHeader.style.display = 'block';

      const promoSection = document.getElementById('daily-promotions-section');
      if (promoSection) {
        promoSection.style.display = 'none';
        promoSection.classList.add('hidden');
      }

      const container = document.getElementById('food-type-filters-container');
      if (container) container.style.display = 'none';

      const featSection = document.getElementById('featured-carousel-section');
      if (featSection) {
        featSection.style.display = 'none';
        featSection.classList.add('hidden');
      }

      const servicesList = (this.serviceEstablishments && this.serviceEstablishments.length > 0)
        ? this.serviceEstablishments
        : this.getDefaultServiceEstablishments();

      // STAGE 1: Visual Grid of Service Categories (Hub)
      if (!this.currentServiceCategory) {
        if (allRestTitle) allRestTitle.textContent = 'Categorías de Servicios Disponibles (6)';

        const serviceCategories = [
          {
            key: 'resina',
            name: 'Arte & Resina Epóxica',
            iconImg: '/images/services/cat_resina.svg',
            color: '#EC4899',
            gradient: 'linear-gradient(135deg, rgba(236, 72, 153, 0.18) 0%, rgba(30, 41, 59, 0.9) 100%)',
            border: 'rgba(236, 72, 153, 0.55)',
            glow: 'rgba(236, 72, 153, 0.35)',
            badge: '💎 Pan de Oro 24K',
            items: [
              'Llaveros letras A-Z personalizados en resina epóxica',
              'Diseños con hojilla de oro 24K, borlas y dijes variados',
              'Recuerdos únicos para fiestas, aniversarios y eventos'
            ]
          },
          {
            key: 'pinatas',
            name: 'Fiestas & Piñatas Creativas',
            iconImg: '/images/services/cat_pinatas.svg',
            color: '#F43F5E',
            gradient: 'linear-gradient(135deg, rgba(244, 63, 94, 0.18) 0%, rgba(30, 41, 59, 0.9) 100%)',
            border: 'rgba(244, 63, 94, 0.55)',
            glow: 'rgba(244, 63, 94, 0.35)',
            badge: '🎉 100% Hecho a Mano',
            items: [
              'Piñatas artesanales 3D y siluetas con temática personalizada',
              'Números temáticos decorados con flores para cumpleaños',
              'Mini-piñatas de mesa y recuerdos festivos por encargo'
            ]
          },
          {
            key: 'print3d',
            name: 'Tecnología & Impresión 3D',
            iconImg: '/images/services/cat_print3d.svg',
            color: '#6366F1',
            gradient: 'linear-gradient(135deg, rgba(99, 102, 241, 0.18) 0%, rgba(30, 41, 59, 0.9) 100%)',
            border: 'rgba(99, 102, 241, 0.55)',
            glow: 'rgba(99, 102, 241, 0.35)',
            badge: '🔄 Visor 3D 360°',
            items: [
              'Prototipado rápido y fabricación de piezas técnicas a medida',
              'Repuestos automotrices descatalogados y soportes plásticos',
              'Coleccionables, modelos STL y visor interactivo 3D en vivo'
            ]
          },
          {
            key: 'paint',
            name: 'Automotriz & Latonería',
            iconImg: '/images/services/cat_paint.svg',
            color: '#EA580C',
            gradient: 'linear-gradient(135deg, rgba(234, 88, 12, 0.18) 0%, rgba(30, 41, 59, 0.9) 100%)',
            border: 'rgba(234, 88, 12, 0.55)',
            glow: 'rgba(234, 88, 12, 0.35)',
            badge: '🔥 Secado al Horno',
            items: [
              'Sacado de golpes en frío y desabollado profesional',
              'Latonería general y enderezada de chasis automotriz',
              'Pintura computarizada bicapa con secado al horno garantizado'
            ]
          },
          {
            key: 'cauchera',
            name: 'Auxilio Vial & Montallantas 24/7',
            iconImg: '/images/services/cat_cauchera.svg',
            color: '#EF4444',
            gradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.18) 0%, rgba(30, 41, 59, 0.9) 100%)',
            border: 'rgba(239, 68, 68, 0.55)',
            glow: 'rgba(239, 68, 68, 0.35)',
            badge: '🔴 Guardia Activa 24/7',
            items: [
              'Montallantas a domicilio para motos, autos y camionetas 24H',
              'Despinche express en ruta con parches vulcanizados de alta durabilidad',
              'Asistencia y auxilio vial inmediato con geolocalización GPS'
            ]
          },
          {
            key: 'movil',
            name: 'Transporte & Movilidad',
            iconImg: '/images/services/cat_movil.svg',
            color: '#FF6B00',
            gradient: 'linear-gradient(135deg, rgba(255, 107, 0, 0.18) 0%, rgba(30, 41, 59, 0.9) 100%)',
            border: 'rgba(255, 107, 0, 0.55)',
            glow: 'rgba(255, 107, 0, 0.35)',
            badge: '⚡ Tarifa Automática GPS',
            items: [
              'Moto Taxi express para traslados urbanos rápidos y económicos',
              'Carreras cómodas y seguras en autos estándar',
              'Vehículos ejecutivos y de gama lujo con tarifa automática por GPS'
            ]
          }
        ];

        let html = `
          <div style="grid-column: 1 / -1; width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box; margin-bottom: 6px; padding: 16px 20px; background: linear-gradient(135deg, rgba(255, 107, 0, 0.12) 0%, rgba(15, 23, 42, 0.75) 100%); border: 1.5px solid rgba(255, 107, 0, 0.3); border-radius: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
            <div>
              <h3 style="margin: 0 0 4px 0; font-size: 17px; font-weight: 900; color: #FFF; letter-spacing: -0.2px;">Explora Servicios Especializados</h3>
              <p style="margin: 0; font-size: 13px; color: #CBD5E1;">Selecciona una categoría para ver los productos, servicios y cotizaciones disponibles</p>
            </div>
            <button type="button" onclick="MarketplaceApp.selectServiceCategory('all')" style="background: rgba(255,255,255,0.08); border: 1.5px solid rgba(255,255,255,0.22); color: #FFF; padding: 9px 16px; border-radius: 20px; font-size: 12.5px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 6px; white-space: nowrap;">
              <span>🌟</span> Ver Todos los Servicios (6)
            </button>
          </div>
        `;

        serviceCategories.forEach(cat => {
          const itemsHtml = cat.items.map(item => `
            <div style="display: flex; align-items: flex-start; gap: 7px; margin-bottom: 5px;">
              <span style="color: ${cat.color}; font-size: 11px; margin-top: 1px; flex-shrink: 0;">✦</span>
              <span style="font-size: 12px; color: #E2E8F0; font-weight: 600; line-height: 1.35;">${item}</span>
            </div>
          `).join('');

          html += `
            <div class="est-row-card service-row-card" onclick="MarketplaceApp.selectServiceCategory('${cat.key}')" style="grid-column: 1 / -1; width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box; background: ${cat.gradient}; border: 1.5px solid ${cat.border}; cursor: pointer; padding: 18px; border-radius: 20px; transition: all 0.25s ease; box-shadow: 0 4px 20px rgba(0,0,0,0.25);">
              <div class="service-card-main-flex" style="display: flex; gap: 14px; align-items: flex-start;">
                <div class="service-card-icon-box" style="background: rgba(15, 23, 42, 0.75); border: 2px solid ${cat.color}; box-shadow: 0 0 20px ${cat.glow}; width: 68px; height: 68px; min-width: 68px; border-radius: 18px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; padding: 10px;">
                  <img src="${cat.iconImg}" alt="${cat.name}" style="width: 100%; height: 100%; object-fit: contain;">
                </div>
                <div style="flex: 1; min-width: 0;">
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
                    <h4 style="font-size: 17.5px; font-weight: 900; color: #FFFFFF; margin: 0; letter-spacing: -0.2px;">
                      ${cat.name}
                    </h4>
                    <span style="font-size: 11px; font-weight: 800; background: ${cat.color}; color: #FFF; padding: 3px 8px; border-radius: 7px; letter-spacing: 0.3px;">
                      ${cat.badge}
                    </span>
                  </div>
                  
                  <!-- Lo que encuentras en esta categoría (sin nombres de negocios) -->
                  <div style="margin-bottom: 12px;">
                    ${itemsHtml}
                  </div>

                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                    <span style="font-size: 11.5px; font-weight: 700; color: #94A3B8;">
                      Servicios Disponibles
                    </span>
                    <span style="font-size: 12.5px; font-weight: 900; color: #FFF; background: linear-gradient(135deg, ${cat.color} 0%, rgba(15,23,42,0.95) 160%); border: 1px solid ${cat.color}; padding: 6px 14px; border-radius: 10px; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 10px ${cat.glow};">
                      Explorar Servicios ➔
                    </span>
                  </div>
                </div>
              </div>
            </div>
          `;
        });

        // Add Merchant Registration Invite
        html += `
          <div style="grid-column: 1 / -1; margin-top: 10px; padding: 18px; text-align: center; background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.15); border-radius: 16px;">
            <p style="font-size: 12.5px; color: #94A3B8; margin: 0 0 10px 0;">
              ¿Ofreces un servicio técnico, grúa, cerrajería o profesional en San Antonio?
            </p>
            <button type="button" onclick="MarketplaceApp.openMerchantRegistrationModal('servicios')" style="background: rgba(255, 107, 0, 0.15); color: #FF6B00; border: 1px solid #FF6B00; padding: 8px 18px; border-radius: 20px; font-size: 12.5px; font-weight: 800; cursor: pointer;">
              ➕ Solicitar Registro de Servicio
            </button>
          </div>
        `;

        grid.innerHTML = html;
        return;
      }

      // STAGE 2: Establishments in Selected Category (or All)
      const targetCategory = this.currentServiceCategory;
      const targetEstablishments = (targetCategory && targetCategory !== 'all')
        ? servicesList.filter(e => e.category === targetCategory)
        : servicesList;

      if (allRestTitle) {
        const catMap = {
          'all': 'Todas las Empresas de Servicios',
          'resina': 'Empresas de Arte & Resina',
          'pinatas': 'Talleres de Piñatas & Fiestas',
          'print3d': 'Laboratorios de Impresión 3D',
          'paint': 'Talleres Automotriz & Latonería',
          'cauchera': 'Centros de Auxilio Vial & Montallantas',
          'movil': 'Flotas de Transporte & Movilidad'
        };
        allRestTitle.textContent = `${catMap[targetCategory] || 'Empresas de Servicios'} (${targetEstablishments.length})`;
      }

      const catPills = [
        { key: 'all', label: '🌟 Todas' },
        { key: 'resina', label: '✨ Arte & Resina' },
        { key: 'pinatas', label: '🎉 Piñatas' },
        { key: 'print3d', label: '🖨️ 3D Lab' },
        { key: 'paint', label: '🎨 Automotriz' },
        { key: 'cauchera', label: '🔧 Auxilio 24/7' },
        { key: 'movil', label: '🛵 Transporte' }
      ];

      let html = `
        <div style="grid-column: 1 / -1; width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box; margin-bottom: 10px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; width: 100%; box-sizing: border-box;">
            <button type="button" onclick="MarketplaceApp.resetServiceCategory()" style="background: rgba(255, 255, 255, 0.08); border: 1.5px solid rgba(255, 255, 255, 0.22); color: #FFF; padding: 9px 16px; border-radius: 12px; font-weight: 800; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s ease;">
              <span>⬅️</span> Volver a Categorías
            </button>
            <span style="font-size: 12px; color: #94A3B8; font-weight: 700;">
              ${targetEstablishments.length} establecimiento${targetEstablishments.length !== 1 ? 's' : ''} disponible${targetEstablishments.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 6px; -webkit-overflow-scrolling: touch; width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box;" class="no-scrollbar">
            ${catPills.map(p => `
              <button type="button" onclick="MarketplaceApp.selectServiceCategory('${p.key}')" style="background: ${(this.currentServiceCategory || 'all') === p.key ? 'linear-gradient(135deg, #FF6B00 0%, #EA580C 100%)' : 'rgba(30, 41, 59, 0.7)'}; color: ${(this.currentServiceCategory || 'all') === p.key ? '#FFF' : '#CBD5E1'}; border: 1.5px solid ${(this.currentServiceCategory || 'all') === p.key ? '#FF6B00' : 'rgba(255,255,255,0.1)'}; padding: 7px 14px; border-radius: 20px; font-size: 12px; font-weight: 800; white-space: nowrap; cursor: pointer; transition: all 0.2s ease;">
                ${p.label}
              </button>
            `).join('')}
          </div>
        </div>
      `;

      if (targetEstablishments.length === 0) {
        html += `
          <div style="grid-column: 1 / -1; width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box; padding: 36px 20px; text-align: center; background: rgba(30, 41, 59, 0.6); border: 1.5px solid rgba(255,255,255,0.08); border-radius: 18px;">
            <span style="font-size: 40px; display: block; margin-bottom: 8px;">🔍</span>
            <h4 style="font-size: 16px; font-weight: 800; color: #FFF; margin: 0 0 6px 0;">No hay empresas en esta categoría aún</h4>
            <p style="font-size: 13px; color: #94A3B8; margin: 0 0 14px 0;">¿Conoces o tienes un negocio en este rubro?</p>
            <button type="button" onclick="MarketplaceApp.resetServiceCategory()" style="background: #FF6B00; color: #FFF; border: none; padding: 8px 16px; border-radius: 12px; font-size: 12px; font-weight: 800; cursor: pointer;">
              Ver Otras Categorías
            </button>
          </div>
        `;
      } else {
        targetEstablishments.forEach(est => {
          const color = est.themeColor || '#FF6B00';
          const badgesHtml = (est.badges || []).map(b => `
            <span style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #E2E8F0; padding: 3px 8px; border-radius: 7px; font-size: 11px; font-weight: 700;">
              ${b}
            </span>
          `).join('');

          const cleanPhone = (est.phone || '+573227949751').replace(/[^0-9]/g, '');

          html += `
            <div class="est-row-card service-row-card" style="grid-column: 1 / -1; width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box; background: linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%); border: 1.5px solid ${color}60; border-radius: 20px; padding: 16px; box-shadow: 0 8px 28px rgba(0, 0, 0, 0.4); display: flex; flex-direction: column; gap: 14px; position: relative; overflow: hidden;">
              
              <!-- Subtle Accent Glow Line at Top -->
              <div style="position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, transparent, ${color}, transparent);"></div>

              <!-- Top: Business Identity Header (PROTAGONIST BUSINESS NAME) -->
              <div style="display: flex; align-items: center; gap: 14px; width: 100%; box-sizing: border-box;">
                <div style="width: 58px; height: 58px; border-radius: 16px; overflow: hidden; background: #0B0F19; border: 2px solid ${color}; box-shadow: 0 0 16px ${color}50; display: flex; align-items: center; justify-content: center; flex-shrink: 0; padding: 4px;">
                  <img src="${est.logo}" alt="${est.name}" style="width: 100%; height: 100%; object-fit: contain;" onerror="this.src='/images/services/shelliart_logo.svg'">
                </div>
                <div style="flex: 1; min-width: 0;">
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
                    <h3 style="font-size: 19px; font-weight: 900; color: #FFFFFF; letter-spacing: -0.2px; margin: 0; text-transform: uppercase;">
                      ${est.name}
                    </h3>
                    <span style="font-size: 10.5px; font-weight: 800; background: rgba(16, 185, 129, 0.18); border: 1px solid rgba(16, 185, 129, 0.45); color: #34D399; padding: 3px 8px; border-radius: 6px;">
                      🟢 OFICIAL
                    </span>
                  </div>
                  <div style="font-size: 12.5px; color: ${color}; font-weight: 800; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${est.categoryIcon || '✨'} ${est.categoryLabel} • <span style="color: #94A3B8; font-weight: 600;">${est.serviceName}</span>
                  </div>
                </div>
              </div>

              <!-- Middle: Real Photo / Fallback Banner - 100% Visible & Aesthetic Frame -->
              <div style="width: 100%; max-width: 100%; border-radius: 14px; overflow: hidden; background: #070B14; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 4px 16px rgba(0,0,0,0.35); display: flex; flex-direction: column; box-sizing: border-box;">
                <div style="width: 100%; max-width: 100%; height: 180px; overflow: hidden; position: relative; background: #0B0F19;">
                  <img src="${est.image}" alt="${est.name}" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" onerror="this.src='/images/servicios.jpg'">
                </div>
                <!-- Clean Meta Sub-Bar (100% Unobstructed Artwork) -->
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(15, 23, 42, 0.92); border-top: 1px solid rgba(255, 255, 255, 0.08); gap: 8px; flex-wrap: wrap; box-sizing: border-box;">
                  <span style="font-size: 11.5px; font-weight: 800; color: #FCD34D; display: inline-flex; align-items: center; gap: 4px;">
                    ⭐ ${Number(est.rating || 5.0).toFixed(1)} <span style="color: #94A3B8; font-weight: 600; font-size: 10.5px;">(${est.reviewCount || 45}+ opiniones)</span>
                  </span>
                  <span style="font-size: 11px; font-weight: 700; color: #CBD5E1; display: inline-flex; align-items: center; gap: 4px;">
                    📍 ${est.location || 'San Antonio'}
                  </span>
                </div>
              </div>

              <!-- Slogan / Personality -->
              <p style="font-size: 13px; color: #CBD5E1; margin: 0; line-height: 1.45; font-weight: 500; word-break: break-word; overflow-wrap: break-word;">
                ${est.slogan}
              </p>

              <!-- Specialty Badges -->
              <div style="display: flex; flex-wrap: wrap; gap: 6px; width: 100%; box-sizing: border-box;">
                ${badgesHtml}
              </div>

              <!-- Footer CTA Buttons -->
              <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px; width: 100%; box-sizing: border-box;">
                <button type="button" onclick="MarketplaceApp.executeServiceAction('${est.actionType}')" style="flex: 1; min-width: 0; background: linear-gradient(135deg, ${color} 0%, rgba(15, 23, 42, 0.95) 160%); border: 1.5px solid ${color}; color: #FFF; padding: 11px 14px; border-radius: 12px; font-size: 13px; font-weight: 900; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 4px 14px ${color}40; letter-spacing: -0.2px; overflow: hidden;">
                  <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${est.ctaText}</span>
                </button>
                <button type="button" onclick="window.open('https://wa.me/${cleanPhone}?text=Hola,%20quisiera%20consultar%20sobre%20${encodeURIComponent(est.name)}', '_blank')" style="background: rgba(37, 211, 102, 0.15); border: 1.5px solid #25D366; color: #25D366; padding: 10px 14px; border-radius: 12px; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0;" title="Consultar por WhatsApp">
                  💬
                </button>
              </div>

            </div>
          `;
        });
      }

      // Add Merchant Registration Invite
      html += `
        <div style="grid-column: 1 / -1; width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box; margin-top: 10px; padding: 18px; text-align: center; background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.15); border-radius: 16px;">
          <p style="font-size: 12.5px; color: #94A3B8; margin: 0 0 10px 0;">
            ¿Ofreces un servicio técnico, grúa, cerrajería o profesional en San Antonio?
          </p>
          <button type="button" onclick="MarketplaceApp.openMerchantRegistrationModal('servicios')" style="background: rgba(255, 107, 0, 0.15); color: #FF6B00; border: 1px solid #FF6B00; padding: 8px 18px; border-radius: 20px; font-size: 12.5px; font-weight: 800; cursor: pointer;">
            ➕ Solicitar Registro de Servicio
          </button>
        </div>
      `;

      grid.innerHTML = html;
      return;
    }

    // Get session seed for fair play rotation (Strictly exclude disabled establishments from ANY list)
    const baseList = filtered ? filtered.filter(e => !e.disabled) : this.establishments;
    const rawList = baseList.filter(e => {
      if (this.currentCategory === 'comidas') {
        const estCat = (e.category || '').toLowerCase();
        if (estCat !== 'comidas' && estCat !== 'pizzas' && estCat !== 'pizza' && estCat !== 'hamburguesas' && estCat !== 'arepas' && estCat !== 'restaurantes') return false;
      } else if (e.category !== this.currentCategory) {
        return false;
      }
      if (!this.currentLocation || this.currentLocation === 'all') return true;
      if (!e.location) return true;
      const normEstLoc = (e.location || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const normUserLoc = (this.currentLocation || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return normEstLoc.includes(normUserLoc) || normUserLoc.includes(normEstLoc);
    });
    const list = this.shuffleWithSeed(rawList, this.getSessionSeed());

    // Update the "Todos los Comercios" header dynamically with category name and count
    const allRestHeader = document.getElementById('all-restaurants-header');
    const allRestTitle = document.getElementById('all-restaurants-title-text');
    if (allRestHeader && allRestTitle) {
      if (list.length === 0) {
        allRestHeader.style.display = 'none';
      } else {
        allRestHeader.style.display = 'block';
        if (window.activeFoodTypeFilter && window.activeFoodTypeFilter !== 'all') {
          const catLabel = categoryNames[window.activeFoodTypeFilter] || this.capitalize(window.activeFoodTypeFilter);
          allRestTitle.textContent = `Comercios: ${catLabel} (${list.length})`;
        } else if (this.currentCategory && this.currentCategory !== 'comidas') {
          allRestTitle.textContent = `Comercios: ${this.capitalize(this.currentCategory)} (${list.length})`;
        } else {
          allRestTitle.textContent = 'Todos los Comercios';
        }
      }
    }

    // Hide daily promo section when filtering specific food type to avoid distraction
    const promoSection = document.getElementById('daily-promotions-section');
    if (promoSection) {
      if (this.currentCategory !== 'comidas' || (window.activeFoodTypeFilter && window.activeFoodTypeFilter !== 'all')) {
        promoSection.style.display = 'none';
        promoSection.classList.add('hidden');
      }
    }

    // Render Featured Horizontal Carousel
    this.renderFeaturedCarousel();

    grid.innerHTML = '';

    if (list.length === 0) {
      const activeName = (window.activeFoodTypeFilter && categoryNames[window.activeFoodTypeFilter]) 
        ? categoryNames[window.activeFoodTypeFilter] 
        : (this.capitalize(this.currentCategory) || 'esta categoría');

      const categoryEmoji = {
        'comidas': '🍔',
        'farmacias': '💊',
        'servicios': '🛵',
        'mercados': '🛒',
        'ferreterias': '🛠️'
      }[this.currentCategory] || '🏪';

      grid.innerHTML = `
        <div class="empty-category-registration-card" style="grid-column: 1 / -1; padding: 26px 18px; text-align: center; background: #242936; border: 1.5px solid rgba(255, 107, 0, 0.35); border-radius: 18px; margin: 10px 0; box-shadow: 0 8px 24px rgba(0,0,0,0.3);">
          <div style="width: 58px; height: 58px; border-radius: 50%; background: rgba(255, 107, 0, 0.12); border: 2px solid #FF6B00; display: inline-flex; align-items: center; justify-content: center; font-size: 26px; margin-bottom: 10px; box-shadow: 0 0 16px rgba(255, 107, 0, 0.4);">
            ${categoryEmoji}✨
          </div>

          <h3 style="font-size: 17px; font-weight: 900; color: #FFFFFF; margin: 0 0 6px 0; letter-spacing: -0.2px;">
            ¿Tienes un comercio de ${activeName}?
          </h3>
          
          <p style="font-size: 12.5px; color: #CBD5E1; margin: 0 auto 16px auto; max-width: 440px; line-height: 1.45; font-weight: 500;">
            Aún no hay comercios registrados en esta categoría. ¡Sé el primero en aparecer! Registra tu negocio y obtén tu <strong style="color: #FF6B00; font-weight: 800;">Catálogo Virtual & Menú QR</strong> 100% gratuito para recibir pedidos directos.
          </p>

          <div style="display: flex; flex-direction: column; gap: 8px; max-width: 360px; margin: 0 auto; width: 100%;">
            <button type="button" class="btn-register-empty-cta" onclick="MarketplaceApp.openMerchantRegistrationModal('${this.currentCategory}')" style="background: linear-gradient(135deg, #FF6B00 0%, #E05A00 100%); color: #FFFFFF; border: none; padding: 12px 18px; font-size: 13.5px; font-weight: 900; border-radius: 12px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 16px rgba(255, 107, 0, 0.4); transition: transform 0.2s, box-shadow 0.2s; touch-action: manipulation;">
              <span>🏪</span> Solicitar Registro y Catálogo Virtual
            </button>

            <button type="button" onclick="MarketplaceApp.filterRestaurantsByFoodType('all')" style="background: rgba(255, 255, 255, 0.06); color: #CBD5E1; border: 1px solid rgba(255, 255, 255, 0.1); padding: 8px 14px; font-size: 12px; font-weight: 700; border-radius: 10px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
              <span>⭐</span> Ver Otros Comercios Disponibles
            </button>
          </div>
        </div>
      `;
      return;
    }

    list.forEach(est => {
      const card = document.createElement('div');
      card.className = 'est-row-card est-brand-card';
      const isOpen = this.isEstablishmentOpen(est);
      const brand = this.getEstablishmentBrandTheme(est);

      if (!isOpen) {
        card.style.opacity = '0.78';
        card.style.filter = 'grayscale(0.25)';
      }

      card.onclick = () => this.openEstablishment(est.id);

      // Set CSS custom variables for dynamic brand styling
      card.style.setProperty('--card-brand-tint', brand.cardTint);
      card.style.setProperty('--card-brand-border', brand.cardBorder);
      card.style.setProperty('--card-brand-glow', brand.cardGlow);
      card.style.background = brand.cardBg;
      card.style.borderColor = brand.cardBorder;

      // Determine representation photo
      const photoUrl = est.logoImage || (est.products && est.products[0] ? est.products[0].image : null);
      let imgHTML = '';
      if (photoUrl) {
        imgHTML = `<img src="${photoUrl}" alt="${est.name}" class="est-row-img" style="object-fit: contain; width: 100%; height: 100%; padding: 3px; box-sizing: border-box;" onerror="this.style.display='none'; if (this.nextElementSibling) this.nextElementSibling.style.display='flex'">`;
      }

      const deliveryTimeStr = this.getFormattedDeliveryTime(est);

      const closedBadge = !isOpen 
        ? `<span class="est-closed-badge" style="background: rgba(239, 68, 68, 0.95); color: #FFF; padding: 2px 4px; border-radius: 6px; font-size: 8.5px; font-weight: 900; position: absolute; bottom: 3px; left: 3px; right: 3px; text-align: center; box-shadow: 0 2px 6px rgba(0,0,0,0.4); z-index: 2;">🔴 Cerrado</span>`
        : '';

      const highTrafficBadge = est.isHighTraffic 
        ? `<span class="est-traffic-badge" style="background: #dc2626; color: #ffffff; padding: 2px 4px; border-radius: 6px; font-size: 8px; font-weight: 900; position: absolute; top: 3px; left: 3px; right: 3px; text-align: center; z-index: 2;">🚨 Tráfico Alto</span>` 
        : '';

      const ratingVal = est.avgRating ? parseFloat(est.avgRating).toFixed(1) : '4.9';
      const totalRev = est.totalReviews !== undefined ? est.totalReviews : Math.floor(10 + Math.random() * 25);

      const descSnippet = (est.description || '').split('.')[0] || est.description || '';

      card.innerHTML = `
        <div class="est-row-img-wrapper" style="background: ${brand.logoBg}; border: 1.5px solid ${brand.logoBorder}; box-shadow: 0 4px 14px ${brand.logoShadow};">
          ${imgHTML}
          <div class="est-row-img-placeholder hidden">${est.logo || '🏪'}</div>
          ${closedBadge}
          ${highTrafficBadge}
        </div>
        <div class="est-row-info">
          <div class="est-row-header-flex">
            <h4 style="margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; color: #FFFFFF; font-weight: 900; font-size: 14px;">${est.name}</h4>
            <div class="est-row-rating" onclick="event.stopPropagation(); MarketplaceApp.openReviewsListModal('${est.id}')" style="cursor: pointer; background: rgba(255, 170, 0, 0.16); border: 1px solid rgba(255, 170, 0, 0.35); color: #FFAA00;">
              ⭐ ${ratingVal} <span style="opacity: 0.85; font-size: 9.5px;">(${totalRev})</span>
            </div>
          </div>
          <div class="est-row-desc" style="color: #94A3B8; font-size: 11.5px; margin: 2px 0;">
            <span class="est-pill-category" style="background: ${brand.pillBg}; color: ${brand.pillColor}; border: 1px solid ${brand.pillBorder}; padding: 1.5px 6px; border-radius: 5px; font-size: 10px; font-weight: 800; margin-right: 5px; display: inline-block;">
              ${brand.categoryTag}
            </span>
            <span>${descSnippet}</span>
          </div>
          <div class="est-row-details-row" style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 4px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="color: #94A3B8; font-weight: 700; font-size: 11px; display: flex; align-items: center; gap: 3px;">
                ⏱️ ${deliveryTimeStr}
              </span>
              <span class="free-delivery" style="background: ${isOpen ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; color: ${isOpen ? '#60A5FA' : '#F87171'}; border: 1px solid ${isOpen ? 'rgba(59, 130, 246, 0.3)' : 'rgba(239, 68, 68, 0.4)'}; padding: 1.5px 7px; border-radius: 6px; font-weight: 800; font-size: 10.5px;">
                ${isOpen ? '🛵 ' + this.formatPesos(est.delivery_fee || 5000) : '🔴 Cerrado'}
              </span>
            </div>
            
            <!-- BOTÓN BONITO PERSONALIZADO CON LA ESTÉTICA DE CADA LOGO -->
            <button type="button" class="btn-brand-menu-cta" onclick="event.stopPropagation(); MarketplaceApp.openEstablishment('${est.id}')" style="background: ${brand.btnGradient}; color: ${brand.btnTextColor || '#FFFFFF'}; border: 1px solid ${brand.btnBorder || 'rgba(255,255,255,0.25)'}; box-shadow: 0 3px 10px ${brand.btnShadow}; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; transition: all 0.22s ease;">
              <span style="font-size: 12px;">${brand.btnIcon}</span>
              <span>${brand.btnText}</span>
              <span class="cta-arrow" style="font-size: 10px; opacity: 0.9;">➔</span>
            </button>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  getEstablishmentBrandTheme(est) {
    if (!est) {
      return {
        cardBg: 'linear-gradient(135deg, rgba(255, 107, 0, 0.12) 0%, #1E2330 50%, #151821 100%)',
        cardBorder: 'rgba(255, 107, 0, 0.35)',
        cardGlow: 'rgba(255, 107, 0, 0.18)',
        cardTint: 'rgba(255, 107, 0, 0.12)',
        logoBg: '#12141C',
        logoBorder: 'rgba(255, 107, 0, 0.55)',
        logoShadow: 'rgba(255, 107, 0, 0.25)',
        pillBg: 'rgba(255, 107, 0, 0.16)',
        pillColor: '#FF8C00',
        pillBorder: 'rgba(255, 107, 0, 0.35)',
        categoryTag: '🍔 Comidas',
        btnText: 'Ver Menú',
        btnIcon: '🍔',
        btnGradient: 'linear-gradient(135deg, #FF6B00 0%, #EA580C 100%)',
        btnTextColor: '#FFFFFF',
        btnBorder: 'rgba(255, 255, 255, 0.25)',
        btnShadow: 'rgba(255, 107, 0, 0.35)'
      };
    }

    const normName = (est.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const estId = String(est.id || '').toLowerCase();

    // 1. Karritos De Manuel
    if (normName.includes('karritos') || normName.includes('carritos') || normName.includes('manuel') || estId.includes('manuel')) {
      return {
        cardBg: 'linear-gradient(135deg, rgba(255, 94, 0, 0.15) 0%, rgba(30, 36, 48, 0.95) 45%, #181C26 100%)',
        cardBorder: 'rgba(255, 107, 0, 0.45)',
        cardGlow: 'rgba(255, 94, 0, 0.22)',
        cardTint: 'rgba(255, 94, 0, 0.15)',
        logoBg: '#101116',
        logoBorder: '#FF5E00',
        logoShadow: 'rgba(255, 94, 0, 0.35)',
        pillBg: 'rgba(255, 94, 0, 0.18)',
        pillColor: '#FFA000',
        pillBorder: 'rgba(255, 160, 0, 0.4)',
        categoryTag: '🍔 Comidas Rápidas',
        btnText: 'Ver Menú & Pedir',
        btnIcon: '🍔',
        btnGradient: 'linear-gradient(135deg, #FF5E00 0%, #EA580C 100%)',
        btnTextColor: '#FFFFFF',
        btnBorder: 'rgba(255, 255, 255, 0.25)',
        btnShadow: 'rgba(255, 94, 0, 0.4)'
      };
    }

    // 2. Patacon Fire
    if (normName.includes('patacon') || normName.includes('fire') || estId.includes('patacon')) {
      return {
        cardBg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.14) 0%, rgba(24, 38, 32, 0.95) 45%, #131F1B 100%)',
        cardBorder: 'rgba(16, 185, 129, 0.45)',
        cardGlow: 'rgba(16, 185, 129, 0.22)',
        cardTint: 'rgba(16, 185, 129, 0.14)',
        logoBg: '#052219',
        logoBorder: '#10B981',
        logoShadow: 'rgba(16, 185, 129, 0.35)',
        pillBg: 'rgba(16, 185, 129, 0.18)',
        pillColor: '#34D399',
        pillBorder: 'rgba(52, 211, 153, 0.4)',
        categoryTag: '🍌 Patacón Criollo',
        btnText: 'Ver Menú Criollo',
        btnIcon: '🍌',
        btnGradient: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
        btnTextColor: '#FFFFFF',
        btnBorder: 'rgba(255, 255, 255, 0.25)',
        btnShadow: 'rgba(16, 185, 129, 0.4)'
      };
    }

    // 3. Frutihelados Gourmet / Fruty Del Bosque
    if (normName.includes('frutihelado') || normName.includes('fruty') || normName.includes('bosque') || normName.includes('helado') || estId.includes('frutihelado') || estId.includes('fruty')) {
      return {
        cardBg: 'linear-gradient(135deg, rgba(244, 63, 94, 0.15) 0%, rgba(38, 26, 36, 0.95) 45%, #1F151F 100%)',
        cardBorder: 'rgba(244, 63, 94, 0.45)',
        cardGlow: 'rgba(244, 63, 94, 0.22)',
        cardTint: 'rgba(244, 63, 94, 0.15)',
        logoBg: '#230815',
        logoBorder: '#F43F5E',
        logoShadow: 'rgba(244, 63, 94, 0.35)',
        pillBg: 'rgba(244, 63, 94, 0.18)',
        pillColor: '#FB7185',
        pillBorder: 'rgba(251, 113, 133, 0.4)',
        categoryTag: '🍨 Helados & Dulces',
        btnText: 'Ver Dulces & Helados',
        btnIcon: '🍨',
        btnGradient: 'linear-gradient(135deg, #E11D48 0%, #F43F5E 50%, #FB7185 100%)',
        btnTextColor: '#FFFFFF',
        btnBorder: 'rgba(255, 255, 255, 0.25)',
        btnShadow: 'rgba(244, 63, 94, 0.4)'
      };
    }

    // 4. Burger Grill Puente Sucre
    if (normName.includes('burger grill') || normName.includes('puente sucre') || normName.includes('grill') || estId.includes('puente-sucre')) {
      return {
        cardBg: 'linear-gradient(135deg, rgba(220, 38, 38, 0.15) 0%, rgba(38, 24, 26, 0.95) 45%, #1F1416 100%)',
        cardBorder: 'rgba(220, 38, 38, 0.45)',
        cardGlow: 'rgba(220, 38, 38, 0.22)',
        cardTint: 'rgba(220, 38, 38, 0.15)',
        logoBg: '#210606',
        logoBorder: '#DC2626',
        logoShadow: 'rgba(220, 38, 38, 0.35)',
        pillBg: 'rgba(220, 38, 38, 0.18)',
        pillColor: '#F87171',
        pillBorder: 'rgba(248, 113, 113, 0.4)',
        categoryTag: '🔥 Burgers & Parrilla',
        btnText: 'Ver Burgers & Grill',
        btnIcon: '🔥',
        btnGradient: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
        btnTextColor: '#FFFFFF',
        btnBorder: 'rgba(255, 255, 255, 0.25)',
        btnShadow: 'rgba(220, 38, 38, 0.4)'
      };
    }

    // 5. Latinos Burguer
    if (normName.includes('latinos') || estId.includes('latinos')) {
      return {
        cardBg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(38, 32, 24, 0.95) 45%, #1F1A13 100%)',
        cardBorder: 'rgba(245, 158, 11, 0.45)',
        cardGlow: 'rgba(245, 158, 11, 0.22)',
        cardTint: 'rgba(245, 158, 11, 0.15)',
        logoBg: '#241403',
        logoBorder: '#F59E0B',
        logoShadow: 'rgba(245, 158, 11, 0.35)',
        pillBg: 'rgba(245, 158, 11, 0.18)',
        pillColor: '#FBBF24',
        pillBorder: 'rgba(251, 191, 36, 0.4)',
        categoryTag: '🍔 Smash Burgers',
        btnText: 'Ordenar en Latinos',
        btnIcon: '🍔',
        btnGradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
        btnTextColor: '#FFFFFF',
        btnBorder: 'rgba(255, 255, 255, 0.25)',
        btnShadow: 'rgba(245, 158, 11, 0.4)'
      };
    }

    // 6. La casa de los batidos
    if (normName.includes('batidos') || estId.includes('batidos')) {
      return {
        cardBg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(32, 26, 42, 0.95) 45%, #181423 100%)',
        cardBorder: 'rgba(139, 92, 246, 0.45)',
        cardGlow: 'rgba(139, 92, 246, 0.22)',
        cardTint: 'rgba(139, 92, 246, 0.15)',
        logoBg: '#160829',
        logoBorder: '#8B5CF6',
        logoShadow: 'rgba(139, 92, 246, 0.35)',
        pillBg: 'rgba(139, 92, 246, 0.18)',
        pillColor: '#A78BFA',
        pillBorder: 'rgba(167, 139, 250, 0.4)',
        categoryTag: '🥤 Batidos & Smoothies',
        btnText: 'Ver Batidos & Bebidas',
        btnIcon: '🥤',
        btnGradient: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
        btnTextColor: '#FFFFFF',
        btnBorder: 'rgba(255, 255, 255, 0.25)',
        btnShadow: 'rgba(139, 92, 246, 0.4)'
      };
    }

    // 7. Míster Cachapa
    if (normName.includes('cachapa') || estId.includes('cachapa')) {
      return {
        cardBg: 'linear-gradient(135deg, rgba(202, 138, 4, 0.15) 0%, rgba(36, 32, 22, 0.95) 45%, #1E1B11 100%)',
        cardBorder: 'rgba(202, 138, 4, 0.45)',
        cardGlow: 'rgba(202, 138, 4, 0.22)',
        cardTint: 'rgba(202, 138, 4, 0.15)',
        logoBg: '#211802',
        logoBorder: '#EAB308',
        logoShadow: 'rgba(234, 179, 8, 0.35)',
        pillBg: 'rgba(202, 138, 4, 0.18)',
        pillColor: '#FACC15',
        pillBorder: 'rgba(250, 204, 21, 0.4)',
        categoryTag: '🌽 Cachapas con Queso',
        btnText: 'Pedir Cachapas 🌽',
        btnIcon: '🌽',
        btnGradient: 'linear-gradient(135deg, #CA8A04 0%, #EAB308 100%)',
        btnTextColor: '#FFFFFF',
        btnBorder: 'rgba(255, 255, 255, 0.25)',
        btnShadow: 'rgba(202, 138, 4, 0.4)'
      };
    }

    // 8. Mak Pizza
    if (normName.includes('pizza') || estId.includes('pizza')) {
      return {
        cardBg: 'linear-gradient(135deg, rgba(225, 29, 72, 0.15) 0%, rgba(38, 24, 28, 0.95) 45%, #1F1317 100%)',
        cardBorder: 'rgba(225, 29, 72, 0.45)',
        cardGlow: 'rgba(225, 29, 72, 0.22)',
        cardTint: 'rgba(225, 29, 72, 0.15)',
        logoBg: '#24040E',
        logoBorder: '#E11D48',
        logoShadow: 'rgba(225, 29, 72, 0.35)',
        pillBg: 'rgba(225, 29, 72, 0.18)',
        pillColor: '#FB7185',
        pillBorder: 'rgba(251, 113, 133, 0.4)',
        categoryTag: '🍕 Pizzas & Calzones',
        btnText: 'Ver Pizzas & Promos',
        btnIcon: '🍕',
        btnGradient: 'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)',
        btnTextColor: '#FFFFFF',
        btnBorder: 'rgba(255, 255, 255, 0.25)',
        btnShadow: 'rgba(225, 29, 72, 0.4)'
      };
    }

    // 9. Arepera Sabor Venezolano / Boki Arepas
    if (normName.includes('arepa') || normName.includes('venezolano') || estId.includes('arepa')) {
      return {
        cardBg: 'linear-gradient(135deg, rgba(249, 115, 22, 0.15) 0%, rgba(38, 30, 24, 0.95) 45%, #1F1813 100%)',
        cardBorder: 'rgba(249, 115, 22, 0.45)',
        cardGlow: 'rgba(249, 115, 22, 0.22)',
        cardTint: 'rgba(249, 115, 22, 0.15)',
        logoBg: '#211003',
        logoBorder: '#F97316',
        logoShadow: 'rgba(249, 115, 22, 0.35)',
        pillBg: 'rgba(249, 115, 22, 0.18)',
        pillColor: '#FB923C',
        pillBorder: 'rgba(251, 146, 60, 0.4)',
        categoryTag: '🫓 Arepas Tradicionales',
        btnText: 'Ver Arepas & Rellenos',
        btnIcon: '🫓',
        btnGradient: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
        btnTextColor: '#FFFFFF',
        btnBorder: 'rgba(255, 255, 255, 0.25)',
        btnShadow: 'rgba(249, 115, 22, 0.4)'
      };
    }

    // 10. Shawarma Dunes
    if (normName.includes('shawarma') || normName.includes('dunes') || estId.includes('shawarma')) {
      return {
        cardBg: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(32, 24, 40, 0.95) 45%, #191222 100%)',
        cardBorder: 'rgba(124, 58, 237, 0.45)',
        cardGlow: 'rgba(124, 58, 237, 0.22)',
        cardTint: 'rgba(124, 58, 237, 0.15)',
        logoBg: '#18072E',
        logoBorder: '#7C3AED',
        logoShadow: 'rgba(124, 58, 237, 0.35)',
        pillBg: 'rgba(124, 58, 237, 0.18)',
        pillColor: '#A78BFA',
        pillBorder: 'rgba(167, 139, 250, 0.4)',
        categoryTag: '🌯 Shawarma & Kebab',
        btnText: 'Ver Shawarmas',
        btnIcon: '🌯',
        btnGradient: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
        btnTextColor: '#FFFFFF',
        btnBorder: 'rgba(255, 255, 255, 0.25)',
        btnShadow: 'rgba(124, 58, 237, 0.4)'
      };
    }

    // 11. Luchos Burguer / Boby Burgers
    if (normName.includes('lucho') || normName.includes('boby')) {
      return {
        cardBg: 'linear-gradient(135deg, rgba(234, 88, 12, 0.15) 0%, rgba(38, 28, 24, 0.95) 45%, #1F1713 100%)',
        cardBorder: 'rgba(234, 88, 12, 0.45)',
        cardGlow: 'rgba(234, 88, 12, 0.22)',
        cardTint: 'rgba(234, 88, 12, 0.15)',
        logoBg: '#210C02',
        logoBorder: '#EA580C',
        logoShadow: 'rgba(234, 88, 12, 0.35)',
        pillBg: 'rgba(234, 88, 12, 0.18)',
        pillColor: '#FB923C',
        pillBorder: 'rgba(251, 146, 60, 0.4)',
        categoryTag: '🍔 Hamburguesas BBQ',
        btnText: 'Ver Carta de Burgers',
        btnIcon: '🍔',
        btnGradient: 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)',
        btnTextColor: '#FFFFFF',
        btnBorder: 'rgba(255, 255, 255, 0.25)',
        btnShadow: 'rgba(234, 88, 12, 0.4)'
      };
    }

    // 12. Tanos Resto Bar
    if (normName.includes('tano') || normName.includes('bar')) {
      return {
        cardBg: 'linear-gradient(135deg, rgba(2, 132, 199, 0.15) 0%, rgba(24, 32, 44, 0.95) 45%, #121924 100%)',
        cardBorder: 'rgba(2, 132, 199, 0.45)',
        cardGlow: 'rgba(2, 132, 199, 0.22)',
        cardTint: 'rgba(2, 132, 199, 0.15)',
        logoBg: '#031728',
        logoBorder: '#0284C7',
        logoShadow: 'rgba(2, 132, 199, 0.35)',
        pillBg: 'rgba(2, 132, 199, 0.18)',
        pillColor: '#38BDF8',
        pillBorder: 'rgba(56, 189, 248, 0.4)',
        categoryTag: '🍽️ Resto Bar & Grill',
        btnText: 'Ver Platos & Bebidas',
        btnIcon: '🍽️',
        btnGradient: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
        btnTextColor: '#FFFFFF',
        btnBorder: 'rgba(255, 255, 255, 0.25)',
        btnShadow: 'rgba(2, 132, 199, 0.4)'
      };
    }

    // 13. Café Plaza
    if (normName.includes('cafe') || normName.includes('plaza')) {
      return {
        cardBg: 'linear-gradient(135deg, rgba(146, 64, 14, 0.15) 0%, rgba(36, 28, 22, 0.95) 45%, #1E1610 100%)',
        cardBorder: 'rgba(146, 64, 14, 0.45)',
        cardGlow: 'rgba(146, 64, 14, 0.22)',
        cardTint: 'rgba(146, 64, 14, 0.15)',
        logoBg: '#1C0D05',
        logoBorder: '#92400E',
        logoShadow: 'rgba(146, 64, 14, 0.35)',
        pillBg: 'rgba(146, 64, 14, 0.18)',
        pillColor: '#F59E0B',
        pillBorder: 'rgba(245, 158, 11, 0.4)',
        categoryTag: '☕ Café & Repostería',
        btnText: 'Ver Cafés & Carta',
        btnIcon: '☕',
        btnGradient: 'linear-gradient(135deg, #92400E 0%, #B45309 100%)',
        btnTextColor: '#FFFFFF',
        btnBorder: 'rgba(255, 255, 255, 0.25)',
        btnShadow: 'rgba(146, 64, 14, 0.4)'
      };
    }

    // 14. Zeus Burger
    if (normName.includes('zeus')) {
      return {
        cardBg: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(22, 28, 44, 0.95) 45%, #101626 100%)',
        cardBorder: 'rgba(37, 99, 235, 0.45)',
        cardGlow: 'rgba(37, 99, 235, 0.22)',
        cardTint: 'rgba(37, 99, 235, 0.15)',
        logoBg: '#05112B',
        logoBorder: '#2563EB',
        logoShadow: 'rgba(37, 99, 235, 0.35)',
        pillBg: 'rgba(37, 99, 235, 0.18)',
        pillColor: '#60A5FA',
        pillBorder: 'rgba(96, 165, 250, 0.4)',
        categoryTag: '⚡ Zeus Burgers',
        btnText: 'Ver Menú Olímpico',
        btnIcon: '⚡',
        btnGradient: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
        btnTextColor: '#FFFFFF',
        btnBorder: 'rgba(255, 255, 255, 0.25)',
        btnShadow: 'rgba(37, 99, 235, 0.4)'
      };
    }

    // Dynamic fallback for any other restaurant / shop based on themeColor or category
    const cat = (est.category || '').toLowerCase();
    const primaryColor = est.themeColor || (cat === 'farmacias' ? '#059669' : (cat === 'mercados' ? '#10B981' : (cat === 'ferreterias' ? '#D97706' : (cat === 'servicios' ? '#8B5CF6' : '#FF6B00'))));
    const icon = est.logo || (cat === 'farmacias' ? '💊' : (cat === 'mercados' ? '🛒' : (cat === 'ferreterias' ? '🛠️' : (cat === 'servicios' ? '🛵' : '🍔'))));

    return {
      cardBg: `linear-gradient(135deg, ${primaryColor}22 0%, #1E2330 45%, #151821 100%)`,
      cardBorder: `${primaryColor}66`,
      cardGlow: `${primaryColor}33`,
      cardTint: `${primaryColor}22`,
      logoBg: '#12141C',
      logoBorder: primaryColor,
      logoShadow: `${primaryColor}55`,
      pillBg: `${primaryColor}25`,
      pillColor: '#FFFFFF',
      pillBorder: `${primaryColor}66`,
      categoryTag: `${icon} ${this.capitalize(est.category || 'Comercio')}`,
      btnText: 'Ver Catálogo & Pedir',
      btnIcon: icon,
      btnGradient: `linear-gradient(135deg, ${primaryColor} 0%, #EA580C 100%)`,
      btnTextColor: '#FFFFFF',
      btnBorder: 'rgba(255, 255, 255, 0.25)',
      btnShadow: `${primaryColor}66`
    };
  }

  getSessionSeed() {
    let seed = sessionStorage.getItem('pedigochos_session_seed');
    if (!seed) {
      seed = Date.now().toString() + '_' + Math.floor(Math.random() * 100000);
      sessionStorage.setItem('pedigochos_session_seed', seed);
    }
    return seed;
  }

  regenerateSessionSeed() {
    const newSeed = Date.now().toString() + '_' + Math.floor(Math.random() * 100000);
    sessionStorage.setItem('pedigochos_session_seed', newSeed);
    return newSeed;
  }

  seededRandom(seedStr) {
    let h = 0;
    for (let i = 0; i < (seedStr || 'default').length; i++) {
      h = Math.imul(31, h) + seedStr.charCodeAt(i) | 0;
    }
    return function() {
      h = Math.imul(h ^ (h >>> 15), h | 1);
      h ^= h + Math.imul(h ^ (h >>> 7), h | 61);
      return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
    };
  }

  shuffleWithSeed(array, seedStr) {
    if (!array || !Array.isArray(array)) return [];
    const arr = [...array];
    const rng = this.seededRandom(seedStr);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  renderFeaturedCarousel() {
    const container = document.getElementById('featured-carousel-container');
    const section = document.getElementById('featured-carousel-section');
    if (!container || !section) return;

    // Only display Destacados del Día if the selected category is Restaurantes (comidas)
    if (this.currentCategory !== 'comidas') {
      section.style.display = 'none';
      section.classList.add('hidden');
      return;
    }

    if (!this.establishments || this.establishments.length === 0) {
      section.style.display = 'none';
      section.classList.add('hidden');
      return;
    }

    // Filter active establishments, respecting location and current food category filter
    const activeEsts = (this.establishments || []).filter(e => {
      if (e.disabled === true) return false;
      const estCat = (e.category || '').toLowerCase();
      if (estCat !== 'comidas' && estCat !== 'pizzas' && estCat !== 'pizza' && estCat !== 'hamburguesas' && estCat !== 'arepas' && estCat !== 'restaurantes') return false;

      // Filter by active food category so Destacados never shows unrelated stores!
      if (window.activeFoodTypeFilter && window.activeFoodTypeFilter !== 'all') {
        if (!this.doesEstMatchFoodType(e, window.activeFoodTypeFilter)) return false;
      }

      if (!this.currentLocation || this.currentLocation === 'all') return true;
      if (!e.location) return true;
      const normEstLoc = (e.location || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const normUserLoc = (this.currentLocation || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return normEstLoc.includes(normUserLoc) || normUserLoc.includes(normEstLoc);
    });

    if (activeEsts.length === 0) {
      section.style.display = 'none';
      section.classList.add('hidden');
      return;
    }

    section.style.display = 'block';
    section.classList.remove('hidden');
    container.innerHTML = '';

    const featuredShuffled = this.shuffleWithSeed(activeEsts, this.getSessionSeed()).slice(0, 6);

    featuredShuffled.forEach(est => {
      const card = document.createElement('div');
      card.style.cssText = 'min-width: 200px; width: 200px; flex-shrink: 0; background: rgba(18, 18, 24, 0.95); border: 1px solid rgba(255, 94, 58, 0.2); border-radius: 14px; padding: 8px 10px; cursor: pointer; scroll-snap-align: start; transition: transform 0.2s, border-color 0.2s; display: flex; align-items: center; gap: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
      const isOpen = this.isEstablishmentOpen(est);

      if (!isOpen) {
        card.style.opacity = '0.75';
        card.style.filter = 'grayscale(0.3)';
      }

      card.onclick = () => this.openEstablishment(est.id);

      const photoUrl = est.logoImage || (est.products && est.products[0] ? est.products[0].image : null);
      let imgHTML = '';
      if (photoUrl) {
        imgHTML = `<img src="${photoUrl}" alt="${est.name}" style="object-fit: contain; width: 100%; height: 100%; padding: 2px; box-sizing: border-box;" onerror="this.style.display='none'; if (this.nextElementSibling) this.nextElementSibling.style.display='flex'">`;
      }

      card.innerHTML = `
        <div style="width: 54px; height: 54px; border-radius: 10px; overflow: hidden; background: rgba(255,255,255,0.04); display: flex; align-items: center; justify-content: center; flex-shrink: 0; position: relative; border: 1px solid rgba(255,255,255,0.1);">
          ${imgHTML}
          <div class="hidden" style="font-size: 22px;">${est.logo || '🏪'}</div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
            <h5 style="margin: 0; font-size: 12px; font-weight: 800; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;">${est.name}</h5>
            <span style="font-size: 9.5px; color: #FFCC00; font-weight: 800; flex-shrink: 0;">★ 0.0</span>
          </div>
          <div style="font-size: 10px; color: var(--accent); font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">✨ Destacado</div>
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 9.5px; margin-top: 2px;">
            <span style="color: #3B82F6; font-weight: 800;">🚲 ${this.formatPesos(est.delivery_fee || 5000)}</span>
            <span style="color: #94A3B8;">${this.getFormattedDeliveryTime(est)}</span>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  renderFoodTypeFilterButtons() {
    const container = document.getElementById('food-type-filters-container');
    if (!container) return;

    if (this.currentCategory !== 'comidas' || !window.activeFoodTypeFilter) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'flex';
    container.innerHTML = '';

    const foodTypes = [
      { id: 'all', name: '✨ Todos', icon: '🍽️' },
      { id: 'hamburguesas', name: 'Hamburguesas', icon: '🍔' },
      { id: 'perros', name: 'Perros Calientes', icon: '🌭' },
      { id: 'pizzas', name: 'Pizzas', icon: '🍕' },
      { id: 'patacones', name: 'Patacones', icon: '🍌' },
      { id: 'arepas', name: 'Arepas', icon: '🫓' },
      { id: 'cachapas', name: 'Cachapas', icon: '🌽' },
      { id: 'sushi', name: 'Sushi', icon: '🍣' },
      { id: 'mariscos', name: 'Mariscos', icon: '🦐' },
      { id: 'sandwiches', name: 'Sándwiches', icon: '🥪' },
      { id: 'pepitos', name: 'Pepitos', icon: '🥖' },
      { id: 'alitas', name: 'Alitas', icon: '🍗' },
      { id: 'salchipapas', name: 'Salchipapas', icon: '🍟' },
      { id: 'picadas', name: 'Picadas', icon: '🍖' },
      { id: 'bebidas', name: 'Bebidas', icon: '🥤' },
      { id: 'postres', name: 'Postres', icon: '🍰' }
    ];

    foodTypes.forEach(ft => {
      const btn = document.createElement('button');
      btn.type = 'button';
      const isActive = window.activeFoodTypeFilter === ft.id;
      btn.className = `food-type-chip ${isActive ? 'active' : ''}`;
      btn.style.cssText = `
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        border-radius: 20px;
        font-size: 12.5px;
        font-weight: 700;
        cursor: pointer;
        white-space: nowrap;
        border: 1px solid ${isActive ? '#ff5e3a' : 'rgba(0,0,0,0.08)'};
        background: ${isActive ? '#ff5e3a' : '#ffffff'};
        color: ${isActive ? '#ffffff' : '#334155'};
        box-shadow: ${isActive ? '0 4px 12px rgba(255, 94, 58, 0.3)' : '0 2px 4px rgba(0,0,0,0.04)'};
        transition: all 0.2s ease;
        flex-shrink: 0;
      `;
      btn.innerHTML = `<span>${ft.icon}</span> <span>${ft.name}</span>`;
      btn.onclick = (e) => {
        e.preventDefault();
        window.activeFoodTypeFilter = ft.id;
        this.filterRestaurantsByFoodType(ft.id);
      };
      container.appendChild(btn);
    });
  }

  filterRestaurantsByFoodType(foodTypeId) {
    if (!foodTypeId) {
      this.showFoodCategoriesGrid();
      return;
    }

    this.currentCategory = 'comidas';
    window.activeFoodTypeFilter = foodTypeId;

    document.querySelectorAll('.category-card-delivercity').forEach(card => {
      if (card.dataset.category === 'comidas') {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });

    const allEsts = this.establishments.filter(e => {
      if (e.disabled === true) return false;
      const estCat = (e.category || '').toLowerCase();
      if (estCat !== 'comidas' && estCat !== 'pizzas' && estCat !== 'pizza' && estCat !== 'hamburguesas' && estCat !== 'arepas' && estCat !== 'restaurantes') return false;
      if (!this.currentLocation || this.currentLocation === 'all') return true;
      if (!e.location) return true;
      const normEstLoc = (e.location || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const normUserLoc = (this.currentLocation || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return normEstLoc.includes(normUserLoc) || normUserLoc.includes(normEstLoc);
    });

    if (foodTypeId === 'all') {
      this.renderEstablishments(allEsts, true);
      return;
    }

    const filtered = allEsts.filter(est => this.doesEstMatchFoodType(est, foodTypeId));

    this.renderEstablishments(filtered, true);
  }

  doesEstMatchFoodType(est, foodTypeId) {
    if (!foodTypeId || foodTypeId === 'all') return true;
    const tid = foodTypeId.toLowerCase();

    const normalize = (str) => (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const estName = normalize(est.name);
    const products = Array.isArray(est.products) ? est.products : [];

    const isPizzaProduct = (p) => {
      const pCat = normalize(p.category || p.category_id || '');
      const pName = normalize(p.name);
      return pCat.includes('pizza') || /^pizza\b/i.test(pName);
    };

    const hasProductMatching = (checkFn) => {
      return products.some(p => {
        const pName = normalize(p.name);
        const pCat = normalize(p.category || p.category_id || '');
        return checkFn(pName, pCat, p);
      });
    };

    switch (tid) {
      case 'hamburguesas':
        return /hamburguesa|burger|burguer/i.test(estName) ||
          hasProductMatching((name, cat, p) => {
            if (isPizzaProduct(p)) return false;
            return /hamburguesa|burger|burguer/i.test(cat) || /hamburguesa|burger|burguer/i.test(name);
          });
      case 'perros':
        return /perro|hotdog|hot\s*dog/i.test(estName) ||
          hasProductMatching((name, cat, p) => {
            if (isPizzaProduct(p)) return false;
            return /perro|hot\s*dog|hotdog|salchicha/i.test(cat) || /\bperro\b|perro caliente|hot\s*dog|hotdog|salchicha frankfurt|choripan|choripán/i.test(name);
          });
      case 'pizzas':
        return /pizza|pizzer/i.test(estName) ||
          hasProductMatching((name, cat, p) => /pizza/i.test(cat) || /\bpizza\b|\bpizzas\b|calzone/i.test(name));
      case 'patacones':
        return /patacon/i.test(estName) ||
          hasProductMatching((name, cat, p) => /patacon/i.test(cat) || /\bpatacon\b|\bpatacones\b/i.test(name));
      case 'arepas':
        return /arep/i.test(estName) ||
          hasProductMatching((name, cat, p) => /arepa/i.test(cat) || /\barepa\b|\barepas\b|reina pepiada|pelua/i.test(name));
      case 'cachapas':
        return /cachapa/i.test(estName) ||
          hasProductMatching((name, cat, p) => /cachapa/i.test(cat) || /\bcachapa\b|\bcachapas\b/i.test(name));
      case 'sushi':
        return /sushi|asiatic/i.test(estName) ||
          hasProductMatching((name, cat, p) => {
            if (/enrrollado|enrollado/i.test(name)) return false;
            return /sushi/i.test(cat) || /\bsushi\b|\bmaki\b|\bnigiri\b|\bniguiri\b|\btempura\b|\buramaki\b|\bcalifornia roll\b|\bsashimi\b/i.test(name);
          });
      case 'mariscos':
        return /marisco|pescad|ceviche/i.test(estName) ||
          hasProductMatching((name, cat, p) => {
            if (/chicharron/i.test(name)) return false;
            return /pescado|marisco|mar y tierra/i.test(cat) || /marisco|camaron|calamar|pescado|paella|langostin/i.test(name);
          });
      case 'sandwiches':
        return /sandwich|sanduch/i.test(estName) ||
          hasProductMatching((name, cat, p) => /sandwich|sanduch|club house|club hause/i.test(cat) || /\bsandwich\b|\bsandwichs\b|\bsandwiches\b|\bsanduche\b|\bclub house\b|\bclub hause\b|\btostado\b/i.test(name));
      case 'pepitos':
        return /pepito/i.test(estName) ||
          hasProductMatching((name, cat, p) => /pepito/i.test(cat) || /\bpepito\b|\bpepitos\b/i.test(name));
      case 'alitas':
        return /alita|wings/i.test(estName) ||
          hasProductMatching((name, cat, p) => /alita|wings/i.test(cat) || /\balita\b|\balitas\b|\bwings\b|\bboneless\b/i.test(name));
      case 'salchipapas':
        return /salchipapa/i.test(estName) ||
          hasProductMatching((name, cat, p) => /salchipapa|sachipapa/i.test(cat) || /\bsalchipapa\b|\bsalchipapas\b|\bsachipapa\b|\bsalchipollo\b/i.test(name));
      case 'picadas':
        return /picada|parrilla/i.test(estName) ||
          hasProductMatching((name, cat, p) => {
            if (isPizzaProduct(p)) return false;
            return /picada|parrilla/i.test(cat) || /\bpicada\b|\bparrilla\b|\bchurrasco\b/i.test(name);
          });
      case 'bebidas':
        return /bebida|jugo|batido/i.test(estName) ||
          hasProductMatching((name, cat, p) => {
            if (/bebida|jugo|batido|malteada|frappe|refresco|malta|soda|merengada|sodas|frappes/i.test(cat)) return true;
            return /\bjugo\b|\bbatido\b|\bmalteada\b|\bfrappe\b|\brefresco\b|\bmalta\b|\bsoda\b|\bmerengada\b|\bgaseosa\b|\bagua mineral\b|\blimonada\b|\bagua panela\b/i.test(name);
          });
      case 'postres':
        return /postre|helado|dulce/i.test(estName) ||
          hasProductMatching((name, cat, p) => /postre|helado|dulce|waffle|fresas con crema|sundae|barquilla/i.test(cat) || /\bhelado\b|\bwaffle\b|\bwafle\b|fresas con crema|\btorta\b|\bmarquesa\b|\bbrownie\b|\bpaleta\b|\bsundae\b|\bbarquilla\b/i.test(name));
      default:
        return estName.includes(tid) || hasProductMatching((name, cat) => cat.includes(tid) || name.includes(tid));
    }
  }

  renderInternalCategories(est) {
    const listContainer = document.getElementById('internal-categories-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    // Collect all unique category names from products
    const rawCategories = {};
    if (est.products) {
      est.products.forEach(p => {
        // Try to identify category
        let catName = 'Otros';
        if (p.category) {
          catName = p.category;
        } else if (p.category_id) {
          // Find matching category in global categoriesList if loaded
          const found = (window.categoriesList || []).find(c => c.id === p.category_id);
          if (found) catName = found.name;
        }
        
        if (!rawCategories[catName]) {
          // Attempt to find a representative image for this category
          rawCategories[catName] = p.image || null;
        }
      });
    }

    const categories = Object.keys(rawCategories);
    if (categories.length <= 1) {
      // Hide category bar if there's only one category or none
      listContainer.parentElement.style.display = 'none';
      return;
    }
    listContainer.parentElement.style.display = 'block';

    // Add 'Todos' option first
    const allBtn = document.createElement('div');
    allBtn.className = 'internal-category-card active';
    allBtn.onclick = () => this.filterInternalCategory('all', allBtn);
    
    // Representative image for all
    const allImg = est.products && est.products.length > 0 && est.products[0].image ? est.products[0].image : DEFAULT_IMAGES[est.category];
    allBtn.innerHTML = `
      <div class="internal-category-img">
        <img src="${allImg}" alt="Todos">
      </div>
      <span>Todos</span>
    `;
    listContainer.appendChild(allBtn);

    // Add specific categories
    categories.forEach(cat => {
      const catBtn = document.createElement('div');
      catBtn.className = 'internal-category-card';
      catBtn.onclick = () => this.filterInternalCategory(cat, catBtn);

      const catImg = rawCategories[cat];
      
      // Extract emoji prefix if present in the category name (e.g. "🥤 Batidos" -> emoji = "🥤", name = "Batidos")
      const emojiMatch = cat.match(/^([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF])\s*(.*)$/);
      let displayEmoji = '';
      let displayLabel = cat;
      
      if (emojiMatch) {
        displayEmoji = emojiMatch[1];
        displayLabel = emojiMatch[2];
      }

      let imgHTML = '';
      if (catImg) {
        imgHTML = `<img src="${catImg}" alt="${cat}">`;
      } else {
        imgHTML = `<div style="font-size: 26px; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05);">${displayEmoji || '🍽️'}</div>`;
      }

      catBtn.innerHTML = `
        <div class="internal-category-img">
          ${imgHTML}
        </div>
        <span>${displayLabel}</span>
      `;
      listContainer.appendChild(catBtn);
    });
  }

  filterInternalCategory(categoryName, element) {
    if (!this.selectedEstablishment) return;

    // Toggle active classes
    document.querySelectorAll('.internal-category-card').forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');

    // Filter products
    let filteredProducts = this.selectedEstablishment.products || [];
    if (categoryName !== 'all') {
      filteredProducts = (this.selectedEstablishment.products || []).filter(p => {
        let pCat = 'Otros';
        if (p.category) {
          pCat = p.category;
        } else if (p.category_id) {
          const found = (window.categoriesList || []).find(c => c.id === p.category_id);
          if (found) pCat = found.name;
        }
        return pCat === categoryName;
      });
      document.getElementById('internal-section-title').innerText = categoryName;
    } else {
      document.getElementById('internal-section-title').innerText = 'Nuestros Productos';
    }

    // Render with scale animation
    const grid = document.getElementById('products-grid');
    grid.style.opacity = '0';
    grid.style.transform = 'translateY(10px)';
    grid.style.transition = 'opacity 0.25s ease, transform 0.25s ease';

    setTimeout(() => {
      this.renderProducts(filteredProducts);
      grid.style.opacity = '1';
      grid.style.transform = 'translateY(0)';
    }, 150);
  }

  renderProducts(products) {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = '';

    if (!products || products.length === 0) {
      grid.innerHTML = `
        <div class="cart-empty-state" style="grid-column: 1 / -1;">
          <span>📦</span>
          <p>No hay productos disponibles en esta categoría.</p>
        </div>
      `;
      return;
    }

    const isStoreOpen = this.isEstablishmentOpen(this.selectedEstablishment);
    const dayMap = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const todayDay = dayMap[new Date().getDay()];

    products.forEach((prod, index) => {
      const isAgotado = prod.out_of_stock === true || prod.agotado === true || prod.is_paused === true || prod.available === false;
      const days = (prod.available_days && Array.isArray(prod.available_days) && prod.available_days.length > 0)
        ? prod.available_days.map(d => String(d).toLowerCase())
        : ['todos'];
      
      const isDaySpecific = !days.includes('todos');
      const isAvailableToday = days.includes('todos') || days.includes(todayDay);

      let dayBadgeHTML = '';
      if (isAgotado) {
        dayBadgeHTML = `<span style="display: inline-block; font-size: 10px; font-weight: 800; background: rgba(239,68,68,0.2); color: #EF4444; border: 1px solid rgba(239,68,68,0.4); padding: 2px 6px; border-radius: 4px; margin-bottom: 4px;">🚫 Agotado por Hoy</span>`;
      } else if (isDaySpecific) {
        if (isAvailableToday) {
          dayBadgeHTML = `<span style="display: inline-block; font-size: 10px; font-weight: 800; background: rgba(245,158,11,0.2); color: #f59e0b; border: 1px solid rgba(245,158,11,0.3); padding: 2px 6px; border-radius: 4px; margin-bottom: 4px;">🔥 Especial de Hoy (${todayDay.toUpperCase()})</span>`;
        } else {
          const daysNames = days.map(d => d.slice(0, 3).toUpperCase()).join(', ');
          dayBadgeHTML = `<span style="display: inline-block; font-size: 9.5px; font-weight: 700; background: rgba(255,255,255,0.06); color: var(--text-muted); border: 1px solid rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; margin-bottom: 4px;">📅 Solo ${daysNames}</span>`;
        }
      }

      const isItemDisabled = !isStoreOpen || isAgotado || !isAvailableToday;

      const card = document.createElement('div');
      card.className = `product-card animate-fade-in-up ${isItemDisabled ? 'product-disabled' : ''}`;
      card.style.cursor = isItemDisabled ? 'not-allowed' : 'pointer';
      card.style.animationDelay = `${index * 0.05}s`;
      if (!isStoreOpen) {
        card.style.opacity = '0.6';
      } else if (isAgotado) {
        card.style.opacity = '0.5';
      } else if (!isAvailableToday) {
        card.style.opacity = '0.65';
      }

      if (!isItemDisabled) {
        card.setAttribute('onclick', `MarketplaceApp.openCustomizerModalById('${prod.id}')`);
      } else {
        card.onclick = () => {
          if (!isStoreOpen) {
            const est = this.selectedEstablishment;
            alert(`🔴 "${est ? est.name : 'Este comercio'}" se encuentra CERRADO en este momento.\nHorario de atención: ${this.formatTime12h(est?.open_time)} a ${this.formatTime12h(est?.close_time)}.\n\nSolo se pueden realizar pedidos cuando el restaurante esté abierto.`);
          } else if (isAgotado) {
            alert(`⛔ "${prod.name}" se encuentra AGOTADO POR HOY en la cocina.`);
          } else {
            const daysNames = days.map(d => d.toUpperCase()).join(', ');
            alert(`📅 "${prod.name}" solo se prepara los días: ${daysNames}.`);
          }
        };
      }

      // Check if image exists, otherwise use category fallback or emoji
      let imgHTML = '';
      const estLogo = (this.selectedEstablishment && this.selectedEstablishment.logo) ? this.selectedEstablishment.logo : '🏪';
      if (prod.image) {
        imgHTML = `<img src="${prod.image}" alt="${prod.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                   <div class="product-square-placeholder" style="display: none;">${estLogo}</div>`;
      } else {
        imgHTML = `<div class="product-square-placeholder">${estLogo}</div>`;
      }

      const formattedPrice = this.formatPesos(prod.price);

      const actionButtonHTML = !isStoreOpen
        ? `<span style="font-size: 11px; color: #ef4444; font-weight: 800; background: rgba(239,68,68,0.18); padding: 4px 8px; border-radius: 8px; border: 1px solid rgba(239,68,68,0.35);">🔴 Cerrado</span>`
        : (isAgotado
          ? `<span style="font-size: 11px; color: #EF4444; font-weight: 800; background: rgba(239,68,68,0.18); padding: 4px 8px; border-radius: 8px; border: 1px solid rgba(239,68,68,0.35);">🚫 Agotado</span>`
          : (!isAvailableToday
            ? `<span style="font-size: 11px; color: var(--text-muted); font-weight: 800; background: rgba(255,255,255,0.08); padding: 4px 8px; border-radius: 8px;">No hoy</span>`
            : `<button class="btn-add-product" onclick="event.stopPropagation(); MarketplaceApp.openCustomizerModalById('${prod.id}')" title="Personalizar y agregar">+</button>`));

      card.innerHTML = `
        <div class="product-square-media">
          ${imgHTML}
          ${dayBadgeHTML ? `<div class="product-badge-float">${dayBadgeHTML}</div>` : ''}
          <div class="product-price-pill">
            <span>${formattedPrice}</span>
          </div>
        </div>
        <div class="product-card-body">
          <div>
            <h4>${prod.name}</h4>
            <p>${prod.description || 'Deliciosa preparación artesanal elaborada con los mejores ingredientes.'}</p>
          </div>
          <div class="product-card-cta">
            <span class="btn-tap-details">
              <span>🔍 Ver detalles</span>
              <span>➔</span>
            </span>
            ${actionButtonHTML}
          </div>
        </div>
      `;

      grid.appendChild(card);
    });
  }

  openCustomizerModalById(productId) {
    let product = null;
    let store = this.selectedEstablishment;
    if (this.selectedEstablishment && Array.isArray(this.selectedEstablishment.products)) {
      product = this.selectedEstablishment.products.find(p => String(p.id) === String(productId));
    }
    
    if (!product && Array.isArray(this.establishments)) {
      for (const est of this.establishments) {
        if (Array.isArray(est.products)) {
          const found = est.products.find(p => String(p.id) === String(productId));
          if (found) {
            this.selectedEstablishment = est;
            store = est;
            product = found;
            break;
          }
        }
      }
    }

    if (store && !this.isEstablishmentOpen(store)) {
      alert(`🔴 "${store.name}" se encuentra CERRADO en este momento.\nHorario de atención: ${this.formatTime12h(store.open_time)} a ${this.formatTime12h(store.close_time)}.\n\nSolo se pueden realizar pedidos cuando el restaurante esté abierto.`);
      return;
    }

    if (product) {
      this.openCustomizerModal(product);
    } else {
      console.error('Product not found for ID:', productId);
    }
  }

  // Cart Management
  addToCart(productId) {
    this.openCustomizerModalById(productId);
  }

  addDirectToCart(product) {
    const store = (this.establishments || []).find(e => e.id === product.restaurant_id) || this.selectedEstablishment || {};
    if (store && store.id && !this.isEstablishmentOpen(store)) {
      alert(`🔴 "${store.name}" se encuentra CERRADO en este momento.\nHorario: ${this.formatTime12h(store.open_time)} a ${this.formatTime12h(store.close_time)}.\n\nSolo se puede pedir cuando el restaurante esté abierto.`);
      return;
    }

    const cartItemId = 'item-' + Date.now() + '-' + Math.floor(Math.random() * 100000);
    const cartItem = {
      cart_item_id: cartItemId,
      product_id: product.id,
      product_name: product.name,
      restaurant_id: store.id || product.restaurant_id || '',
      restaurant_name: store.name || product.restaurant_name || '',
      delivery_fee: store.delivery_fee || 0,
      quantity: 1,
      selected_specifications: {
        single_selections: [],
        add_ons: [],
        exclusions: [],
        special_notes: ""
      },
      unit_total_calculated: product.price,
      subtotal_combined: product.price,
      product: product
    };

    // Check if an identical item (no modifiers) is already in the cart
    const existing = this.cart.items.find(item => 
      item.product_id === product.id && 
      item.selected_specifications.single_selections.length === 0 &&
      item.selected_specifications.add_ons.length === 0 &&
      item.selected_specifications.exclusions.length === 0
    );

    if (existing) {
      existing.quantity += 1;
      existing.subtotal_combined = existing.unit_total_calculated * existing.quantity;
    } else {
      this.cart.items.push(cartItem);
    }

    this.updateCartBadge();
    this.showToast(`Agregado: ${product.name}`);
    this.animateFlyToCart(window.event);

    setTimeout(() => {
      this.checkBeveragesAndPrompt();
    }, 400);
  }

  isArepaOrHeladoProduct(prod) {
    if (!prod) return false;
    const name = (prod.name || '').toLowerCase();
    const cat = (prod.category || '').toLowerCase();
    return name.includes('arepa') || name.includes('helado') || name.includes('frappé') || name.includes('paleta') || name.includes('sundae') || name.includes('merengada') || name.includes('batido') || cat.includes('arepa') || cat.includes('helado');
  }

  isPizzaProduct(prod) {
    if (!prod) return false;
    const pName = (prod.name || '').toLowerCase();
    const pCat = (prod.category || prod.category_id || '').toLowerCase();
    const rName = (prod.restaurant_name || (this.selectedEstablishment ? this.selectedEstablishment.name : '')).toLowerCase();
    const isDrink = this.isDrinkOrBeverage(prod);
    if (isDrink) return false;

    return (
      pCat.includes('pizza') ||
      pName.includes('pizza') ||
      pName.includes('panzerotti') ||
      pName.includes('metro') ||
      (rName.includes('pizza') && !pCat.includes('bebida') && !pCat.includes('frappe') && !pCat.includes('plato') && !pCat.includes('postre'))
    );
  }

  openCustomizerModal(product) {
    if (!product) return;
    if (typeof product === 'string' || typeof product === 'number') {
      this.openCustomizerModalById(product);
      return;
    }

    const store = (this.establishments || []).find(e => e.id === product.restaurant_id) || this.selectedEstablishment;
    if (store && !this.isEstablishmentOpen(store)) {
      alert(`🔴 "${store.name}" se encuentra CERRADO en este momento.\nHorario: ${this.formatTime12h(store.open_time)} a ${this.formatTime12h(store.close_time)}.\n\nSolo se puede pedir cuando el restaurante esté abierto.`);
      return;
    }
    console.log('openCustomizerModal called for:', product.name);
    try {
      this.closeAllModals();

      // Show Modal FIRST guaranteed before any content calculation
      const modal = document.getElementById('customizer-modal');
      if (modal) {
        modal.classList.add('open');
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
        modal.style.pointerEvents = 'auto';
        modal.style.zIndex = '9999999';
        
        const content = modal.querySelector('.modal-content');
        if (content) {
          content.style.display = 'flex';
        }
      }
      window.history.pushState({ view: 'modal', modalId: 'customizer-modal' }, '');

      this.customizerState = {
        product: product,
        quantity: 1,
        pizzaMode: 'whole',
        specialtyA: null,
        specialtyB: null,
        selectedCrust: { id: 'tradicional', name: 'Borde Tradicional (Sin relleno)', price: 0 },
        baseIncluded: {
          whole: {},
          halfA: {},
          halfB: {}
        },
        quantities: {
          whole: {},
          halfA: {},
          halfB: {}
        },
        collapsedGroups: {}
      };

      const initSide = (sideKey, targetProduct = product) => {
        this.customizerState.quantities[sideKey] = {};
        this.customizerState.baseIncluded[sideKey] = {};
        if (targetProduct && targetProduct.exclusions && Array.isArray(targetProduct.exclusions)) {
          targetProduct.exclusions.forEach(item => {
            const itemName = typeof item === 'object' && item.name ? item.name : String(item);
            this.customizerState.quantities[sideKey]['base_' + itemName] = 0;
            this.customizerState.baseIncluded[sideKey][itemName] = true;
          });
        }

        if (targetProduct && targetProduct.modifiers && Array.isArray(targetProduct.modifiers)) {
          targetProduct.modifiers.forEach(group => {
            if (group && Array.isArray(group.options) && group.options.length > 0) {
              const isSingle = group.selection_type === 'single';
              const isSizeGroup = (group.group_name || '').toLowerCase().includes('tama') || (group.group_name || '').toLowerCase().includes('size');
              
              // Find the smallest / base size (lowest extra_price, or index 0) to preselect
              let defaultOptId = null;
              if (isSingle && isSizeGroup) {
                let bestOpt = group.options[0];
                let minPrice = Infinity;
                group.options.forEach(opt => {
                  const p = Number(opt.extra_price ?? opt.price ?? 0);
                  if (p < minPrice) {
                    minPrice = p;
                    bestOpt = opt;
                  }
                });
                if (bestOpt) {
                  defaultOptId = bestOpt.option_id || bestOpt.id;
                }
              }

              group.options.forEach(opt => {
                const optId = opt ? (opt.option_id || opt.id) : null;
                if (optId) {
                  if (isSingle && isSizeGroup && defaultOptId && optId === defaultOptId) {
                    this.customizerState.quantities[sideKey]['opt_' + optId] = 1;
                  } else {
                    this.customizerState.quantities[sideKey]['opt_' + optId] = 0;
                  }
                }
              });
            }
          });
        }
      };

      initSide('whole');

      // Populate UI text safely
      const nameEl = document.getElementById('customizer-product-name');
      if (nameEl) nameEl.innerText = product.name || 'Producto';

      const descEl = document.getElementById('customizer-product-desc');
      if (descEl) descEl.innerText = product.description || '';
      
      const ingredientsEl = document.getElementById('customizer-product-ingredients');
      if (ingredientsEl) {
        if (product.ingredients && Array.isArray(product.ingredients) && product.ingredients.length > 0) {
          ingredientsEl.innerText = `📝 Ingredientes: ${product.ingredients.join(', ')}`;
          ingredientsEl.style.display = 'block';
        } else if (product.exclusions && Array.isArray(product.exclusions) && product.exclusions.length > 0) {
          ingredientsEl.innerText = `📝 Ingredientes: ${product.exclusions.map(e => typeof e === 'object' && e.name ? e.name : String(e)).join(', ')}`;
          ingredientsEl.style.display = 'block';
        } else {
          ingredientsEl.style.display = 'none';
        }
      }
      
      const basePriceEl = document.getElementById('customizer-base-price');
      if (basePriceEl) basePriceEl.innerText = this.formatPesos(product.price || 0);

      const qtyDisp = document.getElementById('customizer-quantity-display');
      if (qtyDisp) qtyDisp.innerText = '1';

      const notesInput = document.getElementById('customizer-special-notes');
      if (notesInput) notesInput.value = '';

      // Image
      const imgWrapper = document.getElementById('customizer-product-img-wrapper');
      if (imgWrapper) {
        if (product.image) {
          imgWrapper.innerHTML = `<img src="${product.image}" alt="${product.name}">`;
        } else {
          imgWrapper.innerHTML = (this.selectedEstablishment && this.selectedEstablishment.logo) ? this.selectedEstablishment.logo : '🍔';
        }
      }

      // Reset columns view
      const colB = document.getElementById('customizer-col-b');
      const colAHeader = document.getElementById('col-a-header');
      if (colB) colB.classList.add('hidden');
      if (colAHeader) colAHeader.classList.add('hidden');
      
      // Pizza check
      const isPizza = this.isPizzaProduct(product);
      const pizzaSection = document.getElementById('pizza-halves-section');
      if (pizzaSection) {
        if (isPizza) {
          pizzaSection.classList.remove('hidden');
          pizzaSection.style.display = 'block';
          this.customizerState.pizzaMode = 'whole';
          const wholeBtn = document.getElementById('pizza-whole-btn');
          const halvesBtn = document.getElementById('pizza-halves-btn');
          if (wholeBtn) wholeBtn.classList.add('active');
          if (halvesBtn) halvesBtn.classList.remove('active');
        } else {
          pizzaSection.classList.add('hidden');
          pizzaSection.style.display = 'none';
        }
      }

      this.renderCustomizerModifiers();
    } catch (err) {
      console.error('Error setting up customizer modal:', err);
    }
  }

  renderCustomizerModifiers() {
    const product = this.customizerState.product;
    if (!product) return;
    const isHalves = this.customizerState.pizzaMode === 'halves';
    
    // Global Pizza Size Selector (rendered once for the whole pizza in halves mode)
    const globalSizeContainer = document.getElementById('pizza-global-size-container');
    if (globalSizeContainer) {
      globalSizeContainer.innerHTML = '';
      if (isHalves && product.modifiers && Array.isArray(product.modifiers)) {
        const sizeGroup = product.modifiers.find(g => (g.group_name || '').toLowerCase() === 'tamaño');
        if (sizeGroup && Array.isArray(sizeGroup.options)) {
          globalSizeContainer.style.display = 'block';
          const groupDiv = document.createElement('div');
          groupDiv.className = 'modifier-group';
          groupDiv.style.background = 'rgba(255, 94, 58, 0.08)';
          groupDiv.style.border = '1px solid rgba(255, 94, 58, 0.25)';
          groupDiv.style.borderRadius = '14px';
          groupDiv.style.padding = '12px';
          groupDiv.style.marginBottom = '14px';

          groupDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-weight: 800; color: #FFF; font-size: 13.5px;">📏 Tamaño de la Pizza Completa</span>
              <span class="required-badge" style="background: #EF4444; color: #fff; font-size: 10px; font-weight: 900; padding: 2px 6px; border-radius: 4px;">Requerido</span>
            </div>
            <div class="modifier-options-list" id="pizza-global-size-list"></div>
          `;
          const list = groupDiv.querySelector('#pizza-global-size-list');

          // Ensure default size selection if none active
          const hasActiveSize = sizeGroup.options.some(opt => this.customizerState.quantities.whole['opt_' + opt.option_id] === 1);
          if (!hasActiveSize && sizeGroup.options.length > 0) {
            this.customizerState.quantities.whole['opt_' + sizeGroup.options[0].option_id] = 1;
          }

          sizeGroup.options.forEach(opt => {
            const optId = opt.option_id;
            const isSelected = this.customizerState.quantities.whole['opt_' + optId] === 1;
            const deltaVal = this.normalizeCopPrice(opt.extra_price || opt.price || 0);
            const priceTag = deltaVal > 0 ? ` (+${this.formatPesos(deltaVal)})` : '';
            
            const optionDiv = document.createElement('div');
            optionDiv.className = `modifier-option ${isSelected ? 'option-single-active' : ''}`;
            optionDiv.style.cursor = 'pointer';
            optionDiv.onclick = () => {
              sizeGroup.options.forEach(o => {
                this.customizerState.quantities.whole['opt_' + o.option_id] = 0;
              });
              this.customizerState.quantities.whole['opt_' + optId] = 1;
              this.renderCustomizerModifiers();
            };
            optionDiv.innerHTML = `
              <div class="option-label-container">
                <input type="radio" name="radio_global_pizza_size" ${isSelected ? 'checked' : ''} style="margin: 0;">
                <span class="option-name" style="margin-left: 8px; font-weight: 700;">${opt.name || ''}</span>
              </div>
              <div style="display: flex; align-items: center;">
                <span class="option-extra-price" style="font-weight: 800; color: var(--primary);">${priceTag}</span>
              </div>
            `;
            list.appendChild(optionDiv);
          });
          globalSizeContainer.appendChild(groupDiv);
        } else {
          globalSizeContainer.style.display = 'none';
        }
      } else {
        globalSizeContainer.style.display = 'none';
      }
    }

    // Pizza Crust / Bordes Selector (for whole or halves)
    const isPizza = this.isPizzaProduct(product);
    const crustSection = document.getElementById('pizza-crust-section');
    if (crustSection) {
      if (isPizza) {
        crustSection.classList.remove('hidden');
        crustSection.style.display = 'block';
        
        const crustOptions = this.getPizzaCrustOptions(product);
        if (!this.customizerState.selectedCrust) {
          this.customizerState.selectedCrust = crustOptions[0] || { id: 'tradicional', name: 'Borde Tradicional (Sin relleno)', price: 0 };
        }

        const selectedOpt = this.customizerState.selectedCrust;
        const isAccordionOpen = !!this.customizerState.crustAccordionOpen;

        crustSection.innerHTML = `
          <div style="background: #FFFFFF; border: 1.5px solid #F59E0B; border-radius: 16px; margin-bottom: 16px; overflow: hidden; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.12);">
            <!-- Header (Always visible, acts as Accordion Trigger) -->
            <div onclick="MarketplaceApp.togglePizzaCrustAccordion()" 
                 style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; cursor: pointer; background: #FFFBEB; border-bottom: ${isAccordionOpen ? '1.5px solid rgba(245, 158, 11, 0.3)' : 'none'}; user-select: none;">
              <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                <span style="font-size: 20px;">🧀</span>
                <div>
                  <div style="font-weight: 900; color: #1E293B; font-size: 13.5px; display: flex; align-items: center; gap: 6px;">
                    Tipo de Borde de la Pizza
                    <span style="background: #FEF3C7; color: #B45309; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 6px; border: 1px solid #FCD34D;">Opcional</span>
                  </div>
                  <div style="font-size: 11.5px; color: #475569; font-weight: 700; margin-top: 1px;">
                    Seleccionado: <strong style="color: ${selectedOpt.price > 0 ? '#B45309' : '#059669'}; font-weight: 800;">${selectedOpt.name} (${selectedOpt.price > 0 ? `+${this.formatPesos(selectedOpt.price)}` : 'Sin costo'})</strong>
                  </div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 11.5px; font-weight: 800; color: #B45309; background: #FEF3C7; border: 1px solid #FCD34D; padding: 4px 10px; border-radius: 8px;">
                  ${isAccordionOpen ? 'Plegar ▴' : 'Cambiar ▾'}
                </span>
              </div>
            </div>

            <!-- Accordion Content (Visible only when isAccordionOpen) -->
            <div style="display: ${isAccordionOpen ? 'flex' : 'none'}; flex-direction: column; gap: 8px; padding: 12px 14px; background: #FAFAF9;">
              ${crustOptions.map(opt => {
                const isSelected = this.customizerState.selectedCrust && (this.customizerState.selectedCrust.id === opt.id || this.customizerState.selectedCrust.name === opt.name);
                const priceTag = opt.price > 0 ? `+${this.formatPesos(opt.price)}` : 'Sin costo';
                return `
                  <div onclick="MarketplaceApp.selectPizzaCrust('${opt.id}', '${opt.name}', ${opt.price})" 
                       style="display: flex; align-items: center; justify-content: space-between; padding: 11px 14px; border-radius: 12px; cursor: pointer; transition: all 0.2s; background: ${isSelected ? '#FFFBEB' : '#FFFFFF'}; border: 1.5px solid ${isSelected ? '#F59E0B' : '#E2E8F0'}; box-shadow: ${isSelected ? '0 2px 8px rgba(245, 158, 11, 0.2)' : 'none'};">
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <input type="radio" name="radio_pizza_crust" ${isSelected ? 'checked' : ''} style="margin: 0; accent-color: #F59E0B; width: 18px; height: 18px; pointer-events: none;">
                      <div>
                        <div style="font-weight: 800; font-size: 13.5px; color: ${isSelected ? '#92400E' : '#0F172A'};">${opt.icon || '🧀'} ${opt.name}</div>
                        ${opt.description ? `<div style="font-size: 11.5px; color: #64748B; margin-top: 1px;">${opt.description}</div>` : ''}
                      </div>
                    </div>
                    <span style="font-size: 12.5px; font-weight: 900; color: ${opt.price > 0 ? '#B45309' : '#059669'}; white-space: nowrap;">
                      ${priceTag}
                    </span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      } else {
        crustSection.classList.add('hidden');
        crustSection.style.display = 'none';
        this.customizerState.selectedCrust = null;
      }
    }

    // Col A (Whole / Mitad 1)
    const containerA = document.getElementById('modifiers-groups-a');
    if (containerA) {
      containerA.innerHTML = '';
      const sideKeyA = isHalves ? 'halfA' : 'whole';
      const labelSuffixA = isHalves ? '1' : '';
      this.renderUnifiedList(containerA, sideKeyA, labelSuffixA, isHalves);
    }

    // Col B (Mitad 2) if halves
    const containerB = document.getElementById('modifiers-groups-b');
    if (containerB) {
      containerB.innerHTML = '';
      if (isHalves) {
        const colB = document.getElementById('customizer-col-b');
        const colAHead = document.getElementById('col-a-header');
        if (colB) colB.classList.remove('hidden');
        if (colAHead) {
          colAHead.classList.remove('hidden');
          colAHead.innerHTML = '🌓 Mitad 1 (50%)';
        }
        const colBHead = document.querySelector('#customizer-col-b .customizer-column-header');
        if (colBHead) colBHead.innerHTML = '🌓 Mitad 2 (50%)';
        this.renderUnifiedList(containerB, 'halfB', '2', true);
      } else {
        const colB = document.getElementById('customizer-col-b');
        const colAHead = document.getElementById('col-a-header');
        if (colB) colB.classList.add('hidden');
        if (colAHead) colAHead.classList.add('hidden');
      }
    }

    this.updateCustomizerPrice();
  }

  togglePizzaCrustAccordion() {
    if (!this.customizerState) return;
    this.customizerState.crustAccordionOpen = !this.customizerState.crustAccordionOpen;
    this.renderCustomizerModifiers();
  }

  getPizzaCrustOptions(product) {
    const defaultCrusts = [
      { id: 'tradicional', name: 'Borde Tradicional (Sin relleno)', icon: '🥖', description: 'Masa clásica crujiente', price: 0 },
      { id: 'queso', name: 'Borde de Queso Mozzarella', icon: '🧀', description: 'Relleno de abundante queso fundido', price: 6000 },
      { id: 'salchicha', name: 'Borde de Salchicha', icon: '🌭', description: 'Relleno de salchicha especial', price: 6000 },
      { id: 'bocadillo_queso', name: 'Borde de Queso y Bocadillo', icon: '🍯', description: 'Queso fundido con dulce de guayaba', price: 6000 }
    ];

    let isGrande = false;
    if (product && product.modifiers && this.customizerState && this.customizerState.quantities && this.customizerState.quantities.whole) {
      const sizeGroup = product.modifiers.find(g => (g.group_name || '').toLowerCase() === 'tamaño');
      if (sizeGroup && Array.isArray(sizeGroup.options)) {
        const selectedSizeOpt = sizeGroup.options.find(opt => this.customizerState.quantities.whole['opt_' + opt.option_id] === 1);
        if (selectedSizeOpt && (selectedSizeOpt.name || '').toLowerCase().includes('grande')) {
          isGrande = true;
        }
      }
    }

    const calcPrice = (basePrice) => {
      const norm = this.normalizeCopPrice(basePrice || 0);
      if (norm <= 0) return 0;
      if (isGrande) {
        return norm === 6000 ? 9000 : Math.round(norm * 1.5);
      }
      return norm;
    };

    const storeId = product?.restaurant_id || this.customizerState?.product?.restaurant_id;
    const est = (this.establishments || []).find(e => e.id === storeId);
    if (est && Array.isArray(est.pizza_crusts) && est.pizza_crusts.length > 0) {
      const list = est.pizza_crusts.map(c => ({
        id: c.id || ('crust-' + c.name.toLowerCase().replace(/\s+/g, '-')),
        name: c.name,
        icon: c.icon || (c.name.toLowerCase().includes('salchicha') ? '🌭' : (c.name.toLowerCase().includes('bocadillo') ? '🍯' : '🧀')),
        description: c.description || '',
        price: calcPrice(c.price)
      }));
      const hasTrad = list.some(c => (c.name || '').toLowerCase().includes('tradicional'));
      if (!hasTrad) list.unshift(defaultCrusts[0]);
      return list;
    }

    if (product && product.modifiers && Array.isArray(product.modifiers)) {
      const crustGroup = product.modifiers.find(g => (g.group_name || '').toLowerCase().includes('borde'));
      if (crustGroup && Array.isArray(crustGroup.options) && crustGroup.options.length > 0) {
        const list = crustGroup.options.map(opt => ({
          id: opt.option_id || opt.id,
          name: opt.name,
          icon: opt.name.toLowerCase().includes('salchicha') ? '🌭' : (opt.name.toLowerCase().includes('bocadillo') ? '🍯' : '🧀'),
          description: '',
          price: calcPrice(opt.extra_price || opt.price || 0)
        }));
        const hasTrad = list.some(c => (c.name || '').toLowerCase().includes('tradicional'));
        if (!hasTrad) list.unshift(defaultCrusts[0]);
        return list;
      }
    }

    return defaultCrusts.map(c => ({ ...c, price: calcPrice(c.price) }));
  }

  selectPizzaCrust(id, name, price) {
    this.customizerState.selectedCrust = { id, name, price: Number(price) || 0 };
    this.renderCustomizerModifiers();
    this.updateCustomizerPrice();
  }

  renderUnifiedList(container, sideKey, labelSuffix, ignoreSize = false) {
    if (!container) return;
    const product = this.customizerState.product;
    if (!product) return;
    const isHalves = this.customizerState.pizzaMode === 'halves';
    const sideLabel = labelSuffix ? ` (Mitad ${labelSuffix})` : '';

    let activeProduct = product;
    if (isHalves) {
      const isPizzaCat = this.isPizzaProduct(product);
      if (isPizzaCat) {
        const specDiv = document.createElement('div');
        specDiv.className = 'modifier-group';
        
        const estProducts = (this.selectedEstablishment && Array.isArray(this.selectedEstablishment.products)) ? this.selectedEstablishment.products : [];
        const pizzaProducts = estProducts.filter(p => this.isPizzaProduct(p));
        const currentSpec = sideKey === 'halfA' ? this.customizerState.specialtyA : this.customizerState.specialtyB;
        
        let optionsHTML = '<option value="">-- Elige el sabor para esta mitad --</option>';
        pizzaProducts.forEach(p => {
          // NO PRICES IN HALVES SELECTOR (Size sets the price)
          optionsHTML += `<option value="${p.id}" ${currentSpec && currentSpec.id === p.id ? 'selected' : ''}>🍕 ${p.name}</option>`;
        });

        specDiv.innerHTML = `
          <label style="font-weight: 800; font-size: 13px; color: #F59E0B; display: block; margin-bottom: 8px;">Sabor de Pizza${sideLabel}</label>
          <select class="customizer-specialty-select" style="width: 100%; padding: 10px 12px; border-radius: 10px; border: 1.5px solid #F59E0B; background: #111827; color: #FFF; font-weight: 700; font-size: 13px;" onchange="MarketplaceApp.selectHalvesSpecialty('${sideKey}', this.value)">
            ${optionsHTML}
          </select>
        `;
        container.appendChild(specDiv);

        if (sideKey === 'halfA') {
          activeProduct = this.customizerState.specialtyA;
        } else {
          activeProduct = this.customizerState.specialtyB;
        }
      }
    }

    if (!activeProduct) {
      const msgDiv = document.createElement('div');
      msgDiv.style.padding = '12px';
      msgDiv.style.textAlign = 'center';
      msgDiv.style.color = '#777';
      msgDiv.innerText = 'Selecciona una especialidad para ver los ingredientes.';
      container.appendChild(msgDiv);
      return;
    }

    // Group 1: Required / Single Selections (Sequential Step-by-Step Accordion)
    if (activeProduct.modifiers && Array.isArray(activeProduct.modifiers)) {
      const singleGroups = activeProduct.modifiers.filter(g => {
        if (!g || g.selection_type !== 'single') return false;
        const gNameLower = (g.group_name || '').toLowerCase();
        if (ignoreSize && gNameLower === 'tamaño') return false;
        return true;
      });

      // Determine first uncompleted group index
      let firstPendingIndex = -1;
      singleGroups.forEach((group, gIdx) => {
        const hasSelection = Array.isArray(group.options) && group.options.some(opt => this.customizerState.quantities[sideKey]['opt_' + (opt.option_id || opt.id)] === 1);
        if (!hasSelection && firstPendingIndex === -1) {
          firstPendingIndex = gIdx;
        }
      });

      singleGroups.forEach((group, gIdx) => {
        const colId = `collapsible-${group.group_id}-${sideKey}`;
        const selectedOpt = Array.isArray(group.options) ? group.options.find(opt => this.customizerState.quantities[sideKey]['opt_' + (opt.option_id || opt.id)] === 1) : null;
        const isCompleted = !!selectedOpt;
        const isCurrentStep = (gIdx === firstPendingIndex) || (firstPendingIndex === -1 && gIdx === 0 && !isCompleted);

        const gNameLower = (group.group_name || '').toLowerCase();
        const isSizeGroup = gNameLower.includes('tama') || gNameLower.includes('size');

        // Determine if group is collapsed:
        let isCollapsed = false;
        if (isSizeGroup || singleGroups.length === 1) {
          // Size groups and single-group products must NEVER be collapsed by default!
          isCollapsed = (this.customizerState.collapsedGroups && this.customizerState.collapsedGroups[colId] === true);
        } else if (this.customizerState.collapsedGroups && this.customizerState.collapsedGroups[colId] !== undefined) {
          isCollapsed = this.customizerState.collapsedGroups[colId] === true;
        } else {
          // Default sequential accordion state:
          // Completed groups are collapsed, Current step is open, Future steps are collapsed!
          if (isCompleted) {
            isCollapsed = true;
          } else if (isCurrentStep) {
            isCollapsed = false;
          } else {
            isCollapsed = true;
          }
        }

        const groupDiv = document.createElement('div');
        groupDiv.className = `modifier-group ${isCurrentStep ? 'step-active' : (isCompleted ? 'step-completed' : '')}`;
        const listClass = isCollapsed ? 'modifier-options-list collapsed' : 'modifier-options-list';
        const chevronTransform = isCollapsed ? 'transform: rotate(-90deg);' : 'transform: rotate(0deg);';
        
        let badgeHTML = '';
        if (singleGroups.length === 1) {
          badgeHTML = selectedOpt ? `<span class="step-completed-badge" title="${selectedOpt.name}">✅ ${selectedOpt.name}</span>` : '';
        } else if (isCompleted) {
          badgeHTML = `<span class="step-completed-badge" title="${selectedOpt.name}">✅ ${selectedOpt.name}</span>`;
        } else if (isCurrentStep) {
          badgeHTML = `<span class="step-active-badge">👉 Paso ${gIdx + 1}: Elige aquí</span>`;
        } else {
          badgeHTML = `<span class="step-pending-badge">Paso ${gIdx + 1}</span>`;
        }

        groupDiv.innerHTML = `
          <div class="modifier-group-title" onclick="MarketplaceApp.toggleGroupCollapse('${colId}', this)" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center; padding: 4px 2px;">
            <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; padding-right: 6px;">
              <span style="font-weight: 800; font-size: 13px; color: ${isCurrentStep ? '#EA580C' : (isCompleted ? '#0F172A' : '#475569')};">${group.group_name || ''}${sideLabel}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
              ${badgeHTML}
              <span class="collapse-chevron" style="transition: transform 0.2s; font-size: 11px; color: #64748B; ${chevronTransform}">▼</span>
            </div>
          </div>
          <div class="${listClass}" id="${colId}"></div>
        `;
        const list = groupDiv.querySelector('.modifier-options-list');
        
        if (group.options && Array.isArray(group.options)) {
          group.options.forEach(opt => {
            if (!opt) return;
            const optId = opt.option_id || opt.id;
            const qty = this.customizerState.quantities[sideKey]['opt_' + optId] || 0;
            const extraPrice = Number(opt.extra_price ?? opt.price ?? 0);
            const extraPriceText = extraPrice > 0 ? `+ ${this.formatPesos(extraPrice)}` : '';
            
            const optionDiv = document.createElement('div');
            optionDiv.className = `modifier-option ${qty === 1 ? 'option-single-active' : ''}`;
            optionDiv.style.cssText = 'cursor: pointer; transition: all 0.2s ease;';
            
            optionDiv.onclick = (e) => {
              e.preventDefault();
              MarketplaceApp.setSingleSelection(group.group_id, optId, sideKey);
            };

            let subtitleTag = '';
            if (isSizeGroup) {
              if (extraPrice === 0) {
                subtitleTag = '<span style="font-size: 11px; color: #10B981; font-weight: 700; margin-left: 6px;">(Tamaño Base)</span>';
              } else {
                subtitleTag = '<span style="font-size: 11px; color: #F59E0B; font-weight: 700; margin-left: 6px;">(Agrandar)</span>';
              }
            }

            optionDiv.innerHTML = `
              <div class="option-label-container" style="display: flex; align-items: center; flex: 1; min-width: 0; pointer-events: none;">
                <input type="radio" name="radio_${group.group_id}_${sideKey}" ${qty === 1 ? 'checked' : ''} style="margin: 0; accent-color: #EA580C; width: 18px; height: 18px; flex-shrink: 0;">
                <span class="option-name" style="margin-left: 10px; font-weight: 700; font-size: 13.5px; color: ${qty === 1 ? '#EA580C' : '#1E293B'}; white-space: normal; line-height: 1.35;">
                  ${opt.name || ''}
                  ${subtitleTag}
                </span>
              </div>
              <div style="display: flex; align-items: center; flex-shrink: 0; margin-left: 8px;">
                <span class="option-extra-price" style="font-weight: 800; color: #EA580C; font-size: 12.5px;">${extraPriceText || '<span style="color: #64748B; font-size: 11.5px; font-weight: 600;">Incluido</span>'}</span>
              </div>
            `;
            if (list) list.appendChild(optionDiv);
          });
        }
        container.appendChild(groupDiv);
      });
    }

    // Group 2: Base Ingredients / Exclusions ($0 de base incluido, contador en 0 para adicionales)
    if (activeProduct.exclusions && Array.isArray(activeProduct.exclusions) && activeProduct.exclusions.length > 0) {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'modifier-group';
      const colId = `collapsible-base-ingredients-${sideKey}`;
      const isExplicitlyCollapsed = this.customizerState.collapsedGroups && this.customizerState.collapsedGroups[colId] === true;
      const listClass = isExplicitlyCollapsed ? 'modifier-options-list collapsed' : 'modifier-options-list';
      const chevronTransform = isExplicitlyCollapsed ? 'transform: rotate(-90deg);' : 'transform: rotate(0deg);';
      
      groupDiv.innerHTML = `
        <div class="modifier-group-title" onclick="MarketplaceApp.toggleGroupCollapse('${colId}', this)" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 700;">Ingredientes Incluidos${sideLabel}</span>
          <span class="collapse-chevron" style="transition: transform 0.2s; font-size: 12px; ${chevronTransform}">▼</span>
        </div>
        <div class="${listClass}" id="${colId}"></div>
      `;
      const list = groupDiv.querySelector('.modifier-options-list');

      activeProduct.exclusions.forEach(item => {
        const itemName = typeof item === 'object' && item.name ? item.name : String(item);
        if (!itemName) return;
        const key = 'base_' + itemName;
        const isIncluded = this.customizerState.baseIncluded?.[sideKey]?.[itemName] !== false;
        const extraQty = this.customizerState.quantities[sideKey][key] || 0;
        const baseExtraPrice = (typeof item === 'object' && item.price !== undefined) ? item.price : 4000;

        const optionDiv = document.createElement('div');
        optionDiv.className = `modifier-option ${isIncluded ? 'option-single-active' : 'option-excluded'}`;

        let rightControlHTML = '';
        if (!isIncluded) {
          rightControlHTML = `<span class="option-extra-price" style="color: #94A3B8; font-weight: 700; font-size: 11.5px;">Sin ingrediente</span>`;
        } else {
          const extraPriceDisplay = extraQty > 0 ? `<span class="option-extra-price" style="margin-right: 8px; color: #F59E0B; font-weight: 800; font-size: 11.5px;">+${this.formatPesos(extraQty * baseExtraPrice)}</span>` : '';
          rightControlHTML = `
            <div style="display: flex; align-items: center;">
              ${extraPriceDisplay}
              <div class="option-qty-control" style="display: flex;">
                <button type="button" class="btn-qty-mini" onclick="event.preventDefault(); event.stopPropagation(); MarketplaceApp.updateBaseIngredientQty('${itemName.replace(/'/g, "\\'")}', '${sideKey}', -1)">-</button>
                <span class="option-qty-val" style="min-width: 20px; text-align: center; font-weight: 800; font-size: 12px;">${extraQty}</span>
                <button type="button" class="btn-qty-mini" onclick="event.preventDefault(); event.stopPropagation(); MarketplaceApp.updateBaseIngredientQty('${itemName.replace(/'/g, "\\'")}', '${sideKey}', 1)">+</button>
              </div>
            </div>
          `;
        }

        optionDiv.innerHTML = `
          <div class="option-label-container" onclick="MarketplaceApp.toggleBaseIngredient('${itemName.replace(/'/g, "\\'")}', '${sideKey}')">
            <input type="checkbox" ${isIncluded ? 'checked' : ''} style="margin: 0;">
            <span class="option-name" style="margin-left: 8px; ${!isIncluded ? 'text-decoration: line-through; opacity: 0.55;' : ''}">${itemName}</span>
          </div>
          ${rightControlHTML}
        `;
        if (list) list.appendChild(optionDiv);
      });

      if (list && list.children.length > 0) {
        container.appendChild(groupDiv);
      }
    }

    // Group 3: Optional Additional Ingredients
    if (activeProduct.modifiers && Array.isArray(activeProduct.modifiers)) {
      let isSmallSizeSelected = false;
      const sizeGroup = activeProduct.modifiers.find(g => (g.group_name || '').toLowerCase() === 'tamaño');
      if (sizeGroup && Array.isArray(sizeGroup.options)) {
        const selectedSizeOpt = sizeGroup.options.find(opt => this.customizerState.quantities[sideKey]['opt_' + opt.option_id] === 1);
        if (selectedSizeOpt) {
          const sName = (selectedSizeOpt.name || '').toLowerCase();
          if (sName.includes('pequeña') || sName.includes('personal') || sName.includes('pequeño')) {
            isSmallSizeSelected = true;
          }
        }
      }

      activeProduct.modifiers.forEach(group => {
        if (group && group.selection_type === 'multiple') {
          const groupNameLower = (group.group_name || '').toLowerCase();
          if (groupNameLower === 'tamaño') return;

          const groupDiv = document.createElement('div');
          groupDiv.className = 'modifier-group';
          const colId = `collapsible-${group.group_id}-${sideKey}`;
          const isExplicitlyCollapsed = this.customizerState.collapsedGroups && this.customizerState.collapsedGroups[colId] === true;
          const listClass = isExplicitlyCollapsed ? 'modifier-options-list collapsed' : 'modifier-options-list';
          const chevronTransform = isExplicitlyCollapsed ? 'transform: rotate(-90deg);' : 'transform: rotate(0deg);';
          
          groupDiv.innerHTML = `
            <div class="modifier-group-title" onclick="MarketplaceApp.toggleGroupCollapse('${colId}', this)" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: 700;">${group.group_name || ''}${sideLabel}</span>
              <span class="collapse-chevron" style="transition: transform 0.2s; font-size: 12px; ${chevronTransform}">▼</span>
            </div>
            <div class="${listClass}" id="${colId}"></div>
          `;
          const list = groupDiv.querySelector('.modifier-options-list');

          if (group.options && Array.isArray(group.options)) {
            group.options.forEach(opt => {
              if (!opt) return;
              const optNameLower = (opt.name || '').toLowerCase().trim();

              // Strictly filter out duplicate sizes showing inside Adicionales
              if (optNameLower === 'personal' || optNameLower === 'mediana' || optNameLower === 'grande' || optNameLower === 'pequeña' || optNameLower === 'familiar') {
                return;
              }

              if (isSmallSizeSelected && optNameLower.includes('borde')) {
                this.customizerState.quantities[sideKey]['opt_' + opt.option_id] = 0;
                return;
              }

              const qty = this.customizerState.quantities[sideKey]['opt_' + opt.option_id] || 0;
              const extraPriceText = (opt.extra_price || 0) > 0 ? `+ ${this.formatPesos(opt.extra_price)}` : '';
              
              const optionDiv = document.createElement('div');
              let stateClass = qty > 0 ? 'ingredient-extra' : '';

              optionDiv.className = `modifier-option ${stateClass}`;
              optionDiv.innerHTML = `
                <div class="option-label-container" onclick="MarketplaceApp.toggleMultipleSelection('${opt.option_id}', '${sideKey}')">
                  <input type="checkbox" ${qty > 0 ? 'checked' : ''} style="margin: 0;">
                  <span class="option-name" style="margin-left: 8px;">${opt.name || ''}</span>
                </div>
                <div style="display: flex; align-items: center;">
                  <span class="option-extra-price" style="margin-right: 8px;">${extraPriceText}</span>
                  <div class="option-qty-control" style="display: ${qty > 0 ? 'flex' : 'none'}">
                    <button class="btn-qty-mini" onclick="event.preventDefault(); event.stopPropagation(); MarketplaceApp.updateUnifiedQty('opt_${opt.option_id}', '${sideKey}', -1)">-</button>
                    <span class="option-qty-val">${qty}</span>
                    <button class="btn-qty-mini" onclick="event.preventDefault(); event.stopPropagation(); MarketplaceApp.updateUnifiedQty('opt_${opt.option_id}', '${sideKey}', 1)">+</button>
                  </div>
                </div>
              `;
              if (list) list.appendChild(optionDiv);
            });
          }

          // Only append the group if it has visible options left
          if (list && list.children.length > 0) {
            container.appendChild(groupDiv);
          }
        }
      });
    }
  }

  selectHalvesSpecialty(sideKey, productId) {
    const estProducts = (this.selectedEstablishment && Array.isArray(this.selectedEstablishment.products)) ? this.selectedEstablishment.products : [];
    const selectedProduct = estProducts.find(p => p.id === productId);

    if (sideKey === 'halfA') {
      this.customizerState.specialtyA = selectedProduct || null;
    } else {
      this.customizerState.specialtyB = selectedProduct || null;
    }

    if (selectedProduct) {
      if (!this.customizerState.baseIncluded) this.customizerState.baseIncluded = { whole: {}, halfA: {}, halfB: {} };
      this.customizerState.baseIncluded[sideKey] = {};
      if (selectedProduct.exclusions && Array.isArray(selectedProduct.exclusions)) {
        selectedProduct.exclusions.forEach(item => {
          const itemName = typeof item === 'object' && item.name ? item.name : String(item);
          this.customizerState.quantities[sideKey]['base_' + itemName] = 0;
          this.customizerState.baseIncluded[sideKey][itemName] = true;
        });
      }

      if (selectedProduct.modifiers && Array.isArray(selectedProduct.modifiers)) {
        selectedProduct.modifiers.forEach(group => {
          const isSizeGroup = (group.group_name || '').toLowerCase() === 'tamaño';
          if (!isSizeGroup && group.options && Array.isArray(group.options)) {
            group.options.forEach((opt, idx) => {
              if (opt && opt.option_id) {
                if (group.selection_type === 'single') {
                  this.customizerState.quantities[sideKey]['opt_' + opt.option_id] = (idx === 0) ? 1 : 0;
                } else {
                  this.customizerState.quantities[sideKey]['opt_' + opt.option_id] = 0;
                }
              }
            });
          }
        });
      }
    } else {
      this.customizerState.quantities[sideKey] = {};
    }

    this.renderCustomizerModifiers();
  }

  setSingleSelection(groupId, optionId, sideKey) {
    const isHalves = this.customizerState.pizzaMode === 'halves';
    let product = this.customizerState.product;
    if (isHalves) {
      product = sideKey === 'halfA' ? this.customizerState.specialtyA : this.customizerState.specialtyB;
    }
    if (!product) return;

    if (!this.customizerState.collapsedGroups) {
      this.customizerState.collapsedGroups = {};
    }

    const group = product.modifiers ? product.modifiers.find(g => g.group_id === groupId) : null;
    if (group && group.options) {
      group.options.forEach(opt => {
        const optId = opt ? (opt.option_id || opt.id) : null;
        if (optId) {
          this.customizerState.quantities[sideKey]['opt_' + optId] = (optId === optionId) ? 1 : 0;
        }
      });
    }

    const gNameLower = (group?.group_name || '').toLowerCase();
    const isSizeGroup = gNameLower.includes('tama') || gNameLower.includes('size');

    // Find next uncompleted single selection group in sequential order
    const singleGroups = (product.modifiers || []).filter(g => g.selection_type === 'single');
    const currentGroupIdx = singleGroups.findIndex(g => g.group_id === groupId);

    let nextGroupToOpen = null;
    for (let i = currentGroupIdx + 1; i < singleGroups.length; i++) {
      const nextG = singleGroups[i];
      const hasSel = Array.isArray(nextG.options) && nextG.options.some(opt => this.customizerState.quantities[sideKey]['opt_' + (opt.option_id || opt.id)] === 1);
      if (!hasSel) {
        nextGroupToOpen = nextG;
        break;
      }
    }

    // If none found ahead, check if any earlier group is still unanswered
    if (!nextGroupToOpen) {
      for (let i = 0; i < singleGroups.length; i++) {
        const checkG = singleGroups[i];
        const hasSel = Array.isArray(checkG.options) && checkG.options.some(opt => this.customizerState.quantities[sideKey]['opt_' + (opt.option_id || opt.id)] === 1);
        if (!hasSel) {
          nextGroupToOpen = checkG;
          break;
        }
      }
    }

    const currentColId = `collapsible-${groupId}-${sideKey}`;
    // Never auto-collapse size group or when it's the only single selection group, or when no other group needs to open
    if (!isSizeGroup && singleGroups.length > 1 && nextGroupToOpen) {
      this.customizerState.collapsedGroups[currentColId] = true;
    } else {
      this.customizerState.collapsedGroups[currentColId] = false;
    }

    let nextColId = null;
    if (nextGroupToOpen) {
      nextColId = `collapsible-${nextGroupToOpen.group_id}-${sideKey}`;
      this.customizerState.collapsedGroups[nextColId] = false;
    }

    this.renderCustomizerModifiers();
    this.updateCustomizerPrice();

    if (nextColId) {
      setTimeout(() => {
        const nextListEl = document.getElementById(nextColId);
        if (nextListEl) {
          const groupCard = nextListEl.closest('.modifier-group');
          if (groupCard) {
            groupCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      }, 70);
    }
  }

  toggleBaseIngredient(itemName, sideKey = 'whole') {
    if (!this.customizerState) return;
    if (!this.customizerState.baseIncluded) this.customizerState.baseIncluded = { whole: {}, halfA: {}, halfB: {} };
    if (!this.customizerState.baseIncluded[sideKey]) this.customizerState.baseIncluded[sideKey] = {};
    
    const current = this.customizerState.baseIncluded[sideKey][itemName] !== false;
    this.customizerState.baseIncluded[sideKey][itemName] = !current;
    
    // If turned off, reset extra quantity to 0
    if (current === true) {
      if (!this.customizerState.quantities[sideKey]) this.customizerState.quantities[sideKey] = {};
      this.customizerState.quantities[sideKey]['base_' + itemName] = 0;
    }
    
    this.renderCustomizerModifiers();
    this.updateCustomizerPrice();
  }

  updateBaseIngredientQty(itemName, sideKey = 'whole', delta) {
    if (!this.customizerState) return;
    if (!this.customizerState.quantities) this.customizerState.quantities = { whole: {}, halfA: {}, halfB: {} };
    if (!this.customizerState.quantities[sideKey]) this.customizerState.quantities[sideKey] = {};
    if (!this.customizerState.baseIncluded) this.customizerState.baseIncluded = { whole: {}, halfA: {}, halfB: {} };
    if (!this.customizerState.baseIncluded[sideKey]) this.customizerState.baseIncluded[sideKey] = {};

    const key = 'base_' + itemName;
    let current = this.customizerState.quantities[sideKey][key] || 0;
    current += delta;
    if (current < 0) current = 0;
    if (current > 5) current = 5;
    
    this.customizerState.quantities[sideKey][key] = current;
    this.customizerState.baseIncluded[sideKey][itemName] = true;
    
    this.renderCustomizerModifiers();
    this.updateCustomizerPrice();
  }

  toggleMultipleSelection(optionId, sideKey) {
    const key = 'opt_' + optionId;
    const current = this.customizerState.quantities[sideKey][key] || 0;
    this.customizerState.quantities[sideKey][key] = (current === 0) ? 1 : 0;
    this.renderCustomizerModifiers();
  }

  updateUnifiedQty(itemKey, sideKey, delta) {
    let current = this.customizerState.quantities[sideKey][itemKey] || 0;
    current += delta;
    
    if (itemKey.startsWith('base_')) {
      if (current < 0) current = 0;
      if (current > 5) current = 5;
    } else {
      if (current < 0) current = 0;
    }
    
    this.customizerState.quantities[sideKey][itemKey] = current;
    this.renderCustomizerModifiers();
  }

  setPizzaMode(mode) {
    this.customizerState.pizzaMode = mode;
    
    const wholeBtn = document.getElementById('pizza-whole-btn');
    const halvesBtn = document.getElementById('pizza-halves-btn');
    
    if (mode === 'whole') {
      if (wholeBtn) wholeBtn.classList.add('active');
      if (halvesBtn) halvesBtn.classList.remove('active');
      
      this.customizerState.specialtyA = null;
      this.customizerState.specialtyB = null;
      this.customizerState.quantities.halfA = {};
      this.customizerState.quantities.halfB = {};
    } else {
      if (wholeBtn) wholeBtn.classList.remove('active');
      if (halvesBtn) halvesBtn.classList.add('active');
      
      // Default Mitad 1 to the current selected pizza product
      this.customizerState.specialtyA = this.customizerState.product;
      this.customizerState.quantities.halfA = {};
      if (this.customizerState.product && this.customizerState.product.exclusions && Array.isArray(this.customizerState.product.exclusions)) {
        this.customizerState.product.exclusions.forEach(item => {
          const itemName = typeof item === 'object' && item.name ? item.name : String(item);
          this.customizerState.quantities.halfA['base_' + itemName] = 1;
        });
      }

      this.customizerState.specialtyB = null;
      this.customizerState.quantities.halfB = {};
    }
    
    this.renderCustomizerModifiers();
  }

  validateRequiredModifiers() {
    const product = this.customizerState.product;
    const isHalves = this.customizerState.pizzaMode === 'halves';
    
    if (isHalves) {
      if (!this.customizerState.specialtyA || !this.customizerState.specialtyB) {
        return false;
      }
    }

    let allValid = true;
    
    const pName = product.name || '';
    const contornosMatch = pName.match(/(\d+)\s+Contornos/i);
    const maxContornosAllowed = contornosMatch ? parseInt(contornosMatch[1], 10) : null;
    
    const checkSide = (sideKey) => {
      let currentProduct = product;
      if (isHalves) {
        currentProduct = sideKey === 'halfA' ? this.customizerState.specialtyA : this.customizerState.specialtyB;
      }
      if (!currentProduct || !currentProduct.modifiers || !Array.isArray(currentProduct.modifiers)) return;

      let singleContornosCount = 0;
      let multipleContornosCount = 0;
      let hasSingleContornoGroups = false;

      currentProduct.modifiers.forEach(group => {
        const isSizeGroup = (group.group_name || '').toLowerCase() === 'tamaño';
        if (isHalves && isSizeGroup) return;

        const isRequired = group.required === true || group.is_required === true;
        const gNameLower = (group.group_name || group.title || '').toLowerCase();
        const isContorno = gNameLower.includes('contorno');

        if (group.selection_type === 'single') {
          const hasOptionSelected = Array.isArray(group.options) && group.options.some(opt => this.customizerState.quantities[sideKey]['opt_' + (opt.option_id || opt.id)] === 1);
          if (isContorno) {
            hasSingleContornoGroups = true;
            if (hasOptionSelected) singleContornosCount++;
          }
          if (isRequired && !hasOptionSelected) {
            allValid = false;
          }
        } else if (group.selection_type === 'multiple') {
          if (Array.isArray(group.options)) {
            group.options.forEach(opt => {
              const optId = opt ? (opt.option_id || opt.id) : null;
              const qty = optId ? (this.customizerState.quantities[sideKey]['opt_' + optId] || 0) : 0;
              if (qty > 0 && isContorno) {
                multipleContornosCount += qty;
              }
            });
          }
          if (isRequired) {
            const hasOptionSelected = Array.isArray(group.options) && group.options.some(opt => (this.customizerState.quantities[sideKey]['opt_' + (opt.option_id || opt.id)] || 0) > 0);
            if (!hasOptionSelected) allValid = false;
          }
        }
      });
      
      if (maxContornosAllowed !== null) {
        if (hasSingleContornoGroups) {
          if (singleContornosCount < maxContornosAllowed) {
            allValid = false;
          }
        } else if (multipleContornosCount < maxContornosAllowed) {
          allValid = false;
        }
      }
    };
    
    if (isHalves) {
      // Check whole product required size
      if (product && product.modifiers) {
        const sizeGroup = product.modifiers.find(g => (g.group_name || '').toLowerCase() === 'tamaño');
        if (sizeGroup && sizeGroup.options) {
          const active = sizeGroup.options.some(opt => this.customizerState.quantities.whole['opt_' + (opt.option_id || opt.id)] === 1);
          if (!active) allValid = false;
        }
      }
      checkSide('halfA');
      checkSide('halfB');
    } else {
      checkSide('whole');
    }
    
    return allValid;
  }

  calculateExtrasTotal() {
    if (!this.customizerState || !this.customizerState.product) return 0;
    const product = this.customizerState.product;
    const isHalves = this.customizerState.pizzaMode === 'halves';
    
    let totalExtras = 0;

    const sumSide = (targetProduct, sideKey, ignoreSize = false) => {
      let sideSum = 0;
      if (!targetProduct) return 0;

      if (targetProduct.exclusions && Array.isArray(targetProduct.exclusions)) {
        targetProduct.exclusions.forEach(item => {
          const itemName = typeof item === 'object' && item.name ? item.name : String(item);
          const basePrice = (typeof item === 'object' && item.price !== undefined) ? item.price : 4000;
          const isIncluded = this.customizerState.baseIncluded?.[sideKey]?.[itemName] !== false;
          const extraQty = this.customizerState.quantities[sideKey]['base_' + itemName] || 0;
          if (isIncluded && extraQty > 0) {
            sideSum += extraQty * basePrice;
          }
        });
      }

      if (targetProduct.modifiers && Array.isArray(targetProduct.modifiers)) {
        targetProduct.modifiers.forEach(group => {
          if (group && group.options && Array.isArray(group.options)) {
            const isSize = (group.group_name || '').toLowerCase() === 'tamaño';
            if (ignoreSize && isSize) return;

            group.options.forEach(opt => {
              const optId = opt ? (opt.option_id || opt.id) : null;
              if (optId) {
                const qty = this.customizerState.quantities[sideKey]['opt_' + optId] || 0;
                const extraPrice = this.normalizeCopPrice(opt.extra_price || opt.price || 0);
                if (qty > 0 && extraPrice > 0) {
                  if (group.selection_type === 'single') {
                    sideSum += extraPrice;
                  } else {
                    sideSum += extraPrice * qty;
                  }
                }
              }
            });
          }
        });
      }
      return sideSum;
    };

    if (isHalves) {
      // Global pizza size & extras from 'whole'
      totalExtras += sumSide(product, 'whole', false);
      // Extras / ingredients from Half 1 (ignore size)
      if (this.customizerState.specialtyA) {
        totalExtras += sumSide(this.customizerState.specialtyA, 'halfA', true);
      }
      // Extras / ingredients from Half 2 (ignore size)
      if (this.customizerState.specialtyB) {
        totalExtras += sumSide(this.customizerState.specialtyB, 'halfB', true);
      }
    } else {
      totalExtras += sumSide(product, 'whole', false);
    }

    // Include selected pizza crust price
    if (this.customizerState.selectedCrust && this.customizerState.selectedCrust.price > 0) {
      totalExtras += this.customizerState.selectedCrust.price;
    }

    return totalExtras;
  }

  updateCustomizerPrice() {
    if (!this.customizerState || !this.customizerState.product) return;
    const product = this.customizerState.product;
    const isHalves = this.customizerState.pizzaMode === 'halves';
    
    // Base price is strictly the main product price (Size delta is computed in calculateExtrasTotal)
    const basePrice = this.normalizeCopPrice(product.price);
    const extrasTotal = this.calculateExtrasTotal();
    const qty = this.customizerState.quantity || 1;
    
    const unitPrice = basePrice + extrasTotal;
    const combinedTotal = unitPrice * qty;
    
    const topPriceEl = document.getElementById('customizer-base-price');
    if (topPriceEl) {
      topPriceEl.innerText = this.formatPesos(unitPrice);
    }
    
    const allValid = this.validateRequiredModifiers();
    
    const pName = product.name || '';
    const contornosMatch = pName.match(/(\d+)\s+Contornos/i);
    const maxContornosAllowed = contornosMatch ? parseInt(contornosMatch[1], 10) : null;
    
    const sideKey = isHalves ? 'halfA' : 'whole';
    let singleContornosCount = 0;
    let multipleContornosCount = 0;
    let hasSingleContornoGroups = false;

    const activeProduct = isHalves ? this.customizerState.specialtyA : product;
    if (activeProduct && activeProduct.modifiers && Array.isArray(activeProduct.modifiers)) {
      activeProduct.modifiers.forEach(group => {
        const gNameLower = (group.group_name || group.title || '').toLowerCase();
        const isContorno = gNameLower.includes('contorno');

        if (group.selection_type === 'single') {
          if (isContorno) {
            hasSingleContornoGroups = true;
            const hasSel = Array.isArray(group.options) && group.options.some(opt => this.customizerState.quantities[sideKey]['opt_' + opt.option_id] === 1);
            if (hasSel) singleContornosCount++;
          }
        } else if (group.selection_type === 'multiple') {
          if (Array.isArray(group.options)) {
            group.options.forEach(opt => {
              if (opt && opt.option_id) {
                const selectedQty = this.customizerState.quantities[sideKey]['opt_' + opt.option_id] || 0;
                if (selectedQty > 0 && isContorno) {
                  multipleContornosCount += selectedQty;
                }
              }
            });
          }
        }
      });
    }

    const totalContornosSelected = hasSingleContornoGroups ? singleContornosCount : multipleContornosCount;

    const btn = document.getElementById('btn-confirm-add');
    if (btn) {
      if (maxContornosAllowed !== null && totalContornosSelected < maxContornosAllowed) {
        btn.innerText = `Elige ${maxContornosAllowed} Contorno(s) (${totalContornosSelected}/${maxContornosAllowed})`;
        btn.disabled = true;
      } else {
        btn.innerText = `🛒 Agregar al Carrito • ${this.formatPesos(combinedTotal)}`;
        btn.disabled = !allValid;
      }
    }
  }

  updateCustomizerQty(delta) {
    let currentQty = this.customizerState.quantity;
    currentQty += delta;
    if (currentQty < 1) currentQty = 1;
    
    this.customizerState.quantity = currentQty;
    const displayEl = document.getElementById('customizer-quantity-display');
    if (displayEl) displayEl.innerText = currentQty;
    this.updateCustomizerPrice();
  }

  addToCart() {
    if (!this.customizerState || !this.customizerState.product) return;

    if (this.selectedEstablishment && !this.isEstablishmentOpen(this.selectedEstablishment)) {
      alert(`🔴 ${this.selectedEstablishment.name} está actualmente CERRADO.\n\nHorario de Atención: ${this.formatTime12h(this.selectedEstablishment.open_time)} a ${this.formatTime12h(this.selectedEstablishment.close_time)}.\n\nPuedes explorar el menú completo, pero los pedidos están pausados hasta la hora de apertura.`);
      return;
    }
    
    if (!this.validateRequiredModifiers()) {
      alert('Por favor, selecciona las opciones obligatorias marcadas con *');
      return;
    }

    const product = this.customizerState.product;
    const isHalves = this.customizerState.pizzaMode === 'halves';
    
    const singleSelections = [];
    const addOns = [];
    const exclusions = [];
    
    const processSide = (sideKey) => {
      const activeProduct = isHalves 
        ? (sideKey === 'halfA' ? this.customizerState.specialtyA : this.customizerState.specialtyB)
        : product;
        
      if (!activeProduct || !activeProduct.modifiers) return;
      
      const prefix = isHalves ? (sideKey === 'halfA' ? '[Mitad 1] ' : '[Mitad 2] ') : '';

      activeProduct.modifiers.forEach(group => {
        if (!group || !group.options) return;

        if (group.selection_type === 'single') {
          const chosenOptId = this.customizerState.singleSelections[sideKey][group.group_id];
          if (chosenOptId) {
            const opt = group.options.find(o => o.option_id === chosenOptId);
            if (opt) {
              singleSelections.push({
                group_id: group.group_id,
                group_name: prefix + group.title,
                chosen_option: opt.name,
                extra_price: this.normalizeCopPrice(opt.extra_price)
              });
            }
          }
        } else if (group.selection_type === 'multiple') {
          group.options.forEach(opt => {
            const qty = this.customizerState.quantities[sideKey]['opt_' + opt.option_id] || 0;
            if (qty > 0) {
              addOns.push({
                option_id: opt.option_id,
                name: prefix + opt.name,
                quantity: qty,
                price_per_unit: this.normalizeCopPrice(opt.extra_price)
              });
            }
          });
        }
      });

      if (this.customizerState.baseIngredients[sideKey]) {
        Object.keys(this.customizerState.baseIngredients[sideKey]).forEach(ingName => {
          if (this.customizerState.baseIngredients[sideKey][ingName] === false) {
            exclusions.push({ name: prefix + ingName });
          }
        });
      }
    };

    if (isHalves) {
      processSide('halfA');
      processSide('halfB');
    } else {
      processSide('whole');
    }
    
    const specialNotes = document.getElementById('customizer-special-notes').value.trim();
    let basePrice = this.normalizeCopPrice(product.price);
    if (isHalves) {
      const priceA = this.customizerState.specialtyA ? this.normalizeCopPrice(this.customizerState.specialtyA.price) : 0;
      const priceB = this.customizerState.specialtyB ? this.normalizeCopPrice(this.customizerState.specialtyB.price) : 0;
      basePrice = (priceA + priceB) / 2;
    }
    const extrasTotal = this.calculateExtrasTotal();
    const unitTotalCalculated = basePrice + extrasTotal;
    const qty = this.customizerState.quantity;
    const subtotalCombined = unitTotalCalculated * qty;
    
    // Reset local state if needed
    
    this.customizerState.quantity = 1;
    document.getElementById('customizer-quantity-display').innerText = 1;
    this.updateCustomizerPrice();
  }

  closeCustomizerModal() {
    const modal = document.getElementById('customizer-modal');
    if (modal) {
      modal.classList.remove('open');
      modal.classList.remove('active');
      modal.style.display = 'none';
      modal.style.opacity = '0';
      modal.style.visibility = 'hidden';
      modal.style.pointerEvents = 'none';
    }
  }

  confirmCustomizerAdd() {
    const product = this.customizerState.product;
    const isHalves = this.customizerState.pizzaMode === 'halves';
    
    const singleSelections = [];
    const addOns = [];
    const exclusions = [];
    
    const formatSidePrefix = (sideKey) => {
      if (sideKey === 'halfA') return '[Mitad 1] ';
      if (sideKey === 'halfB') return '[Mitad 2] ';
      return '';
    };

    // Strict Validation: Ensure all required single selection steps are completed
    const validateSide = (sideKey) => {
      let activeProduct = product;
      if (isHalves) {
        activeProduct = sideKey === 'halfA' ? this.customizerState.specialtyA : this.customizerState.specialtyB;
      }
      if (!activeProduct) return true;

      if (activeProduct.modifiers && Array.isArray(activeProduct.modifiers)) {
        for (const group of activeProduct.modifiers) {
          if (group && group.selection_type === 'single') {
            const isSize = (group.group_name || '').toLowerCase() === 'tamaño';
            if (isHalves && isSize) continue;

            const hasSelection = Array.isArray(group.options) && group.options.some(opt => this.customizerState.quantities[sideKey]['opt_' + (opt.option_id || opt.id)] === 1);
            if (!hasSelection) {
              const colId = `collapsible-${group.group_id}-${sideKey}`;
              if (!this.customizerState.collapsedGroups) this.customizerState.collapsedGroups = {};
              this.customizerState.collapsedGroups[colId] = false;
              this.renderCustomizerModifiers();
              setTimeout(() => {
                const el = document.getElementById(colId);
                if (el) {
                  el.closest('.modifier-group')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }, 60);
              this.showToast(`⚠️ Por favor elige: ${group.group_name}`);
              return false;
            }
          }
        }
      }
      return true;
    };

    if (isHalves) {
      if (!validateSide('halfA') || !validateSide('halfB')) return;
    } else {
      if (!validateSide('whole')) return;
    }

    const processSide = (sideKey) => {
      const prefix = formatSidePrefix(sideKey);
      let activeProduct = product;
      if (isHalves) {
        activeProduct = sideKey === 'halfA' ? this.customizerState.specialtyA : this.customizerState.specialtyB;
      }
      if (!activeProduct) return;

      if (isHalves) {
        singleSelections.push({
          group_name: prefix + 'Sabor',
          chosen_option: activeProduct.name
        });
      }
      
      // 1. Base ingredients (exclusions and extras)
      if (activeProduct.exclusions && Array.isArray(activeProduct.exclusions)) {
        activeProduct.exclusions.forEach(item => {
          const itemName = typeof item === 'object' && item.name ? item.name : String(item);
          const basePrice = (typeof item === 'object' && item.price !== undefined) ? item.price : 4000;
          const isIncluded = this.customizerState.baseIncluded?.[sideKey]?.[itemName] !== false;
          const extraQty = this.customizerState.quantities[sideKey]['base_' + itemName] || 0;
          if (!isIncluded) {
            exclusions.push({ name: prefix + `Sin ${itemName}` });
          } else if (extraQty > 0) {
            addOns.push({
              name: prefix + `${itemName} Extra` + (extraQty > 1 ? ` (x${extraQty})` : ''),
              price_per_unit: basePrice,
              quantity: extraQty
            });
          }
        });
      }

      // 2. Modifiers
      if (activeProduct.modifiers && Array.isArray(activeProduct.modifiers)) {
        activeProduct.modifiers.forEach(group => {
          const isSize = (group.group_name || '').toLowerCase() === 'tamaño';
          if (isHalves && isSize) return;

          group.options.forEach(opt => {
            const optId = opt ? (opt.option_id || opt.id) : null;
            const qty = optId ? (this.customizerState.quantities[sideKey]['opt_' + optId] || 0) : 0;
            if (qty > 0) {
              const extraPrice = opt.extra_price || opt.price || 0;
              if (group.selection_type === 'single') {
                singleSelections.push({
                  group_name: prefix + group.group_name,
                  chosen_option: opt.name + (extraPrice > 0 ? ` (+${this.formatPesos(extraPrice)})` : '')
                });
              } else {
                addOns.push({
                  name: prefix + opt.name + (qty > 1 ? ` (x${qty})` : ''),
                  price_per_unit: extraPrice,
                  quantity: qty
                });
              }
            }
          });
        });
      }
    };
    
    if (isHalves) {
      // Process global pizza size from whole product
      if (product.modifiers && Array.isArray(product.modifiers)) {
        const sizeGroup = product.modifiers.find(g => (g.group_name || '').toLowerCase() === 'tamaño');
        if (sizeGroup && sizeGroup.options) {
          sizeGroup.options.forEach(opt => {
            const optId = opt ? (opt.option_id || opt.id) : null;
            if (optId && this.customizerState.quantities.whole['opt_' + optId] === 1) {
              const extraPrice = opt.extra_price || opt.price || 0;
              singleSelections.push({
                group_name: 'Tamaño',
                chosen_option: opt.name + (extraPrice > 0 ? ` (+${this.formatPesos(extraPrice)})` : '')
              });
            }
          });
        }
      }
      processSide('halfA');
      processSide('halfB');
    } else {
      processSide('whole');
    }

    // Process selected pizza crust
    if (this.customizerState.selectedCrust && this.customizerState.selectedCrust.id !== 'tradicional') {
      const extraPrice = this.customizerState.selectedCrust.price || 0;
      singleSelections.push({
        group_name: 'Tipo de Borde',
        chosen_option: `${this.customizerState.selectedCrust.name}` + (extraPrice > 0 ? ` (+${this.formatPesos(extraPrice)})` : ''),
        extra_price: extraPrice
      });
    }
    
    const specialNotes = document.getElementById('customizer-special-notes').value.trim();
    const basePrice = this.normalizeCopPrice(product.price);
    const extrasTotal = this.calculateExtrasTotal();
    const unitTotalCalculated = basePrice + extrasTotal;
    const qty = this.customizerState.quantity || 1;
    const subtotalCombined = unitTotalCalculated * qty;
    
    const cartItemId = 'item-' + Date.now() + '-' + Math.floor(Math.random() * 100000);
    
    let itemName = product.name;
    if (isHalves) {
      const nameA = this.customizerState.specialtyA ? this.customizerState.specialtyA.name.replace(/^pizza\s+/i, '') : 'Mitad 1';
      const nameB = this.customizerState.specialtyB ? this.customizerState.specialtyB.name.replace(/^pizza\s+/i, '') : 'Mitad 2';
      itemName = `Pizza Mitad y Mitad (${nameA} / ${nameB})`;
    }

    const cartItem = {
      cart_item_id: cartItemId,
      product_id: product.id,
      product_name: itemName,
      restaurant_id: this.selectedEstablishment.id,
      restaurant_name: this.selectedEstablishment.name,
      delivery_fee: this.selectedEstablishment.delivery_fee || 0,
      quantity: qty,
      selected_specifications: {
        single_selections: singleSelections,
        add_ons: addOns,
        exclusions: exclusions,
        special_notes: specialNotes
      },
      unit_total_calculated: unitTotalCalculated,
      subtotal_combined: subtotalCombined,
      product: product
    };
    
    this.cart.items.push(cartItem);
    
    this.updateCartBadge();
    this.closeCustomizerModal();
    this.showToast(`Agregado: ${product.name}`);
    
    this.animateFlyToCart(window.event);

    setTimeout(() => {
      this.checkBeveragesAndPrompt();
    }, 400);
  }

  animateFlyToCart(event) {
    let startX = window.innerWidth / 2;
    let startY = window.innerHeight / 2;
    
    if (event && event.clientX && event.clientY) {
      startX = event.clientX;
      startY = event.clientY;
    } else {
      const btn = document.getElementById('btn-confirm-add');
      if (btn) {
        const rect = btn.getBoundingClientRect();
        startX = rect.left + rect.width / 2;
        startY = rect.top + rect.height / 2;
      }
    }
    
    const cartBtn = document.getElementById('floating-cart');
    if (!cartBtn) return;
    const cartRect = cartBtn.getBoundingClientRect();
    const endX = cartRect.left + cartRect.width / 2;
    const endY = cartRect.top + cartRect.height / 2;
    
    const dot = document.createElement('div');
    dot.className = 'flying-dot';
    dot.style.left = startX + 'px';
    dot.style.top = startY + 'px';
    document.body.appendChild(dot);
    
    dot.style.transition = 'all 0.8s cubic-bezier(0.25, 1, 0.5, 1)';
    
    setTimeout(() => {
      dot.style.left = endX + 'px';
      dot.style.top = endY + 'px';
      dot.style.transform = 'scale(0.3)';
      dot.style.opacity = '0';
    }, 20);
    
    setTimeout(() => {
      dot.remove();
      
      // Trigger Cart Bounce animation with glow
      cartBtn.classList.remove('cart-bounce-effect');
      void cartBtn.offsetWidth;
      cartBtn.classList.add('cart-bounce-effect');
      setTimeout(() => cartBtn.classList.remove('cart-bounce-effect'), 700);

      const badgeCount = document.getElementById('cart-badge-count');
      if (badgeCount) {
        badgeCount.classList.remove('badge-pop');
        void badgeCount.offsetWidth;
        badgeCount.classList.add('badge-pop');
      }
    }, 600);
  }

  updateQty(cartItemId, delta) {
    const itemIndex = this.cart.items.findIndex(item => item.cart_item_id === cartItemId);
    if (itemIndex === -1) return;

    const item = this.cart.items[itemIndex];
    item.quantity += delta;

    if (item.quantity <= 0) {
      this.cart.items.splice(itemIndex, 1);
    } else {
      item.unit_total_calculated = this.normalizeCopPrice(item.unit_total_calculated);
      item.subtotal_combined = this.normalizeCopPrice(item.unit_total_calculated * item.quantity);
    }

    this.updateCartBadge();
    this.renderCartItems();
  }

  clearCart() {
    this.cart.items = [];
    this.updateCartBadge();
  }

  updateCartBadge() {
    const badge = document.getElementById('floating-cart');
    const badgeCount = document.getElementById('cart-badge-count');
    const badgeTotal = document.getElementById('cart-badge-total');

    const headerCount = document.getElementById('header-cart-badge-count');
    const headerTotal = document.getElementById('header-cart-badge-total');

    const totalCount = this.cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = this.cart.items.reduce((sum, item) => sum + this.normalizeCopPrice(item.subtotal_combined), 0);

    const formattedTotal = this.formatPesos(subtotal);

    if (badgeCount) badgeCount.innerText = totalCount;
    if (badgeTotal) badgeTotal.innerText = formattedTotal;

    if (headerCount) headerCount.innerText = totalCount;
    if (headerTotal) headerTotal.innerText = formattedTotal;

    if (totalCount > 0 && badgeCount) {
      badgeCount.classList.remove('badge-pop');
      void badgeCount.offsetWidth;
      badgeCount.classList.add('badge-pop');
    }

    if (badge) {
      badge.style.display = 'flex';
      badge.classList.add('visible');
    }
  }

  // Modals
  openTermsModal() {
    this.closeAllModals();
    const modal = document.getElementById('terms-modal');
    if (modal) {
      modal.classList.add('open');
      modal.style.setProperty('display', 'flex', 'important');
    }
  }

  openCartModal() {
    this.closeAllModals();
    const modal = document.getElementById('cart-modal');
    if (modal) {
      modal.classList.add('open');
      modal.style.setProperty('display', 'flex', 'important');
    }
    this.renderCartItems();
    this.setActiveMobileTab('cart');
    window.history.pushState({ view: 'modal', modalId: 'cart-modal' }, '');

    const cashInput = document.getElementById('order-cash-amount');
    if (cashInput && !cashInput.value.trim()) {
      document.querySelectorAll('.btn-cash-chip').forEach(btn => btn.classList.remove('active'));
      const previewEl = document.getElementById('cash-change-preview');
      if (previewEl) previewEl.style.display = 'none';
    }

    if (this.tableLockedByQR && this.currentTableNumber) {
      this.setOrderType('mesa');
      const tableInput = document.getElementById('order-table-number');
      if (tableInput) {
        tableInput.value = this.currentTableNumber;
        tableInput.readOnly = true;
        tableInput.style.background = 'rgba(255,255,255,0.05)';
        tableInput.style.color = '#10B981';
        tableInput.style.cursor = 'not-allowed';
      }

      const delBtn = document.getElementById('type-delivery-btn');
      if (delBtn) {
        delBtn.style.opacity = '0.35';
        delBtn.style.pointerEvents = 'none';
        delBtn.title = 'Bloqueado por escaneo de Código QR de Mesa';
      }

      const qrBanner = document.getElementById('customer-table-qr-active-banner');
      const qrInfo = document.getElementById('qr-scanned-table-info');
      if (qrBanner) {
        qrBanner.style.display = 'flex';
        if (qrInfo) qrInfo.innerText = `Mesa #${this.currentTableNumber} fijada exclusivamente por Código QR. Pedido a tu mesa.`;
      }

      const badge = document.getElementById('customer-selected-table-badge');
      if (badge) {
        badge.innerText = `🔒 Mesa #${this.currentTableNumber} fijada y bloqueada por Código QR`;
        badge.style.display = 'block';
      }
    } else {
      // General store QR or normal visit: DO NOT lock!
      const delBtn = document.getElementById('type-delivery-btn');
      if (delBtn) {
        delBtn.style.opacity = '1';
        delBtn.style.pointerEvents = 'auto';
        delBtn.title = '';
      }

      const tableInput = document.getElementById('order-table-number');
      if (tableInput) {
        tableInput.readOnly = false;
        tableInput.style.background = '';
        tableInput.style.color = '';
        tableInput.style.cursor = 'text';
      }

      const qrBanner = document.getElementById('customer-table-qr-active-banner');
      if (qrBanner) {
        qrBanner.style.display = 'none';
      }

      const badge = document.getElementById('customer-selected-table-badge');
      if (badge && !tableInput?.value) {
        badge.style.display = 'none';
      }

      if (this.orderType === 'delivery') {
        setTimeout(() => {
          this.initLeafletMap();
        }, 250);
      }
    }
  }

  closeCartModal() {
    const modal = document.getElementById('cart-modal');
    if (modal) {
      modal.classList.remove('open');
      modal.classList.remove('active');
      // Let CSS handle display via .open class
    }
    this.setActiveMobileTab('home');
  }

  renderCartItems() {
    const container = document.getElementById('cart-items-container');
    container.innerHTML = '';

    if (this.cart.items.length === 0) {
      container.innerHTML = `
        <div class="cart-empty-state">
          <span>🛒</span>
          <p>Tu carrito está vacío. Agrega productos del comercio activo.</p>
        </div>
      `;
      document.getElementById('checkout-form').style.display = 'none';
      return;
    }

    document.getElementById('checkout-form').style.display = 'block';
    
    // Group unique establishments
    const uniqueShops = {};
    this.cart.items.forEach(item => {
      if (!uniqueShops[item.restaurant_id]) {
        uniqueShops[item.restaurant_id] = {
          id: item.restaurant_id,
          name: item.restaurant_name,
          delivery_fee: item.delivery_fee || 0
        };
      }
    });

    const shopIds = Object.keys(uniqueShops);
    const numShops = shopIds.length;

    // Header listing shops we order from
    const shopNamesList = shopIds.map(id => uniqueShops[id].name).join(', ');
    const shopHeader = document.createElement('div');
    shopHeader.style.paddingBottom = '10px';
    shopHeader.style.fontWeight = 'bold';
    shopHeader.style.color = 'var(--primary)';
    shopHeader.innerText = `Ordenando de: ${shopNamesList}`;
    container.appendChild(shopHeader);

    // List items
    this.cart.items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'cart-item-row';
      
      let specsHTML = '';
      const specs = item.selected_specifications;
      const specsParts = [];
      
      if (specs.single_selections && specs.single_selections.length > 0) {
        specs.single_selections.forEach(sel => {
          specsParts.push(`${sel.group_name}: ${sel.chosen_option}`);
        });
      }
      if (specs.add_ons && specs.add_ons.length > 0) {
        specs.add_ons.forEach(add => {
          const qty = add.quantity || 1;
          const price = (add.price_per_unit || 0) * qty;
          const priceText = price > 0 ? ` (+${this.formatPesos(this.normalizeCopPrice(price))})` : '';
          specsParts.push(`+ ${qty}x ${add.name}${priceText}`);
        });
      }
      if (specs.exclusions && specs.exclusions.length > 0) {
        specs.exclusions.forEach(exc => {
          specsParts.push(`- Sin ${exc.name}`);
        });
      }
      if (specs.special_notes) {
        specsParts.push(`Nota: "${specs.special_notes}"`);
      }
      
      if (specsParts.length > 0) {
        specsHTML = `<div class="cart-item-specifications">${specsParts.join(', ')}</div>`;
      }

      row.innerHTML = `
        <div class="cart-item-details">
          <div class="cart-item-name" style="font-weight: 700;">${item.product_name}</div>
          ${specsHTML}
          <div class="cart-item-price" style="font-size: 13px; font-weight: 600; margin-top: 2px;">
            ${this.formatPesos(item.subtotal_combined)} <span style="color: var(--text-muted); font-weight: 500;">(${this.formatPesos(item.unit_total_calculated)} c/u)</span>
          </div>
        </div>
        <div class="cart-item-controls">
          <button class="btn-qty" onclick="MarketplaceApp.updateQty('${item.cart_item_id}', -1)">-</button>
          <span class="cart-item-qty" style="font-weight: 700;">${item.quantity}</span>
          <button class="btn-qty" onclick="MarketplaceApp.updateQty('${item.cart_item_id}', 1)">+</button>
        </div>
      `;
      container.appendChild(row);
    });
    let totalDeliveryFee = 0;
    if (this.orderType === 'delivery') {
      shopIds.forEach(id => {
        const shopItems = this.cart.items.filter(item => item.restaurant_id === id);
        const shopSubtotal = shopItems.reduce((sum, item) => sum + this.normalizeCopPrice(item.subtotal_combined), 0);

        const fee = this.calculateShopDeliveryFee(this.calculatedDistanceKm, uniqueShops[id].delivery_fee);
        uniqueShops[id].delivery_fee = fee;
        totalDeliveryFee += fee;
      });
    }

    // Render multi-delivery warning block if numShops > 1 and orderType is 'delivery'
    const warningDiv = document.getElementById('multi-delivery-warning');
    if (numShops > 1 && this.orderType === 'delivery') {
      let listItemsHTML = '';
      shopIds.forEach(id => {
        const shop = uniqueShops[id];
        listItemsHTML += `
          <li class="multi-delivery-item">
            <span>Envío desde '${shop.name}':</span>
            <span>${this.formatPesos(shop.delivery_fee)}</span>
          </li>
        `;
      });
      
      warningDiv.innerHTML = `
        <div class="multi-delivery-warning-title">
          <span>⚠️ AVISO DE ENVÍO MULTI-ESTABLECIMIENTO</span>
        </div>
        <p style="margin-bottom: 8px; font-weight: 500;">Tu pedido contiene productos de <strong>${numShops}</strong> locales diferentes.</p>
        <ul class="multi-delivery-list">
          ${listItemsHTML}
        </ul>
        <hr class="multi-delivery-divider">
        <div class="multi-delivery-total-row">
          <span>Total de servicio a domicilio:</span>
          <span>${this.formatPesos(totalDeliveryFee)}</span>
        </div>
      `;
      warningDiv.classList.remove('hidden');
    } else {
      warningDiv.classList.add('hidden');
      warningDiv.innerHTML = '';
    }

    const subtotal = this.cart.items.reduce((sum, item) => sum + this.normalizeCopPrice(item.subtotal_combined), 0);
    
    let discountAmount = 0;
    if (this.activeCoupon) {
      if (this.activeCoupon.type === 'delivery') {
        discountAmount = totalDeliveryFee;
      } else if (this.activeCoupon.type === 'fixed') {
        const usdRate = (window.systemSettings && window.systemSettings.cop_rate) ? window.systemSettings.cop_rate : 4000;
        discountAmount = this.activeCoupon.amount * usdRate;
      } else if (this.activeCoupon.type === 'percent') {
        discountAmount = Math.round(subtotal * (this.activeCoupon.amount / 100));
      }
    }
    discountAmount = Math.min(discountAmount, subtotal + totalDeliveryFee);
    const grandTotal = Math.max(0, subtotal + totalDeliveryFee - discountAmount);

    document.getElementById('cart-subtotal').innerText = this.formatPesos(subtotal);
    
    const deliveryCostSpan = document.getElementById('cart-delivery-cost');
    deliveryCostSpan.innerText = this.formatPesos(totalDeliveryFee);

    const discountRow = document.getElementById('cart-discount-row');
    const discountVal = document.getElementById('cart-discount-val');
    if (discountAmount > 0) {
      if (discountRow) discountRow.classList.remove('hidden');
      if (discountVal) discountVal.innerText = `-${this.formatPesos(discountAmount)}`;
    } else {
      if (discountRow) discountRow.classList.add('hidden');
    }
    
    document.getElementById('cart-grand-total').innerText = this.formatPesos(grandTotal);

    // Multi-currency calculation for Frontera (Bs and USD)
    const copPerBs = 100;
    const copPerUsd = 4000;
    const bsEl = document.getElementById('cart-total-bs');
    const usdEl = document.getElementById('cart-total-usd');
    if (bsEl) bsEl.innerText = 'Bs. ' + (grandTotal / copPerBs).toFixed(2);
    if (usdEl) usdEl.innerText = '$' + (grandTotal / copPerUsd).toFixed(2) + ' USD';
    
    const deliveryRow = document.querySelector('.delivery-cost-row');
    if (this.orderType === 'delivery') {
      deliveryRow.classList.remove('hidden');
      if (numShops === 1) {
        const singleShopId = shopIds[0];
        deliveryCostSpan.innerText = this.formatPesos(uniqueShops[singleShopId].delivery_fee);
      } else {
        deliveryCostSpan.innerText = this.formatPesos(totalDeliveryFee);
      }
    } else {
      deliveryRow.classList.add('hidden');
    }
  }

  setOrderType(type) {
    if (this.tableLockedByQR && type === 'delivery') {
      this.showToast(`🔒 Tu pedido está fijado exclusivamente a la Mesa #${this.currentTableNumber} por escaneo de Código QR.`);
      return;
    }
    this.orderType = type;
    const delBtn = document.getElementById('type-delivery-btn');
    const tableBtn = document.getElementById('type-mesa-btn');
    const groupDelivery = document.getElementById('group-delivery');
    const groupMesa = document.getElementById('group-mesa');

    if (type === 'delivery') {
      delBtn.classList.add('active');
      tableBtn.classList.remove('active');
      groupDelivery.classList.remove('hidden');
      groupMesa.classList.add('hidden');
      setTimeout(() => {
        this.initLeafletMap();
      }, 200);
    } else {
      delBtn.classList.remove('active');
      tableBtn.classList.add('active');
      groupDelivery.classList.add('hidden');
      groupMesa.classList.remove('hidden');
      this.renderCustomerTableMap();
    }

    this.renderCartItems();
  }

  setPaymentMethod(method) {
    this.paymentMethod = method;
    const cashBtn = document.getElementById('pay-cash-btn');
    const transferBtn = document.getElementById('pay-transfer-btn');
    const cashDetails = document.getElementById('payment-cash-details');
    const transferDetails = document.getElementById('payment-transfer-details');

    if (method === 'Efectivo') {
      if (cashBtn) cashBtn.classList.add('active');
      if (transferBtn) transferBtn.classList.remove('active');
      if (cashDetails) cashDetails.classList.remove('hidden');
      if (transferDetails) transferDetails.classList.add('hidden');
      this.calculateCashChange();
    } else {
      if (cashBtn) cashBtn.classList.remove('active');
      if (transferBtn) transferBtn.classList.add('active');
      if (cashDetails) cashDetails.classList.add('hidden');
      if (transferDetails) transferDetails.classList.remove('hidden');
      this.loadCheckoutPaymentMethods();
    }
  }

  async loadCheckoutPaymentMethods() {
    const container = document.getElementById('checkout-payment-methods-list');
    if (!container) return;

    // Get active store from cart
    const firstItem = this.cart.items[0];
    const estId = firstItem ? (firstItem.restaurant_id || firstItem.restaurantId || (this.selectedEstablishment ? this.selectedEstablishment.id : null)) : (this.selectedEstablishment ? this.selectedEstablishment.id : null);
    
    if (!estId) {
      container.innerHTML = '<div style="color: #94A3B8; font-size: 12px; text-align: center; padding: 10px;">Agrega productos al carrito para ver las cuentas bancarias del restaurante.</div>';
      return;
    }

    try {
      const res = await fetch(`/api/establishments/${estId}/payment-methods`);
      if (!res.ok) throw new Error('Error al cargar métodos');
      const data = await res.json();
      const methods = (data.paymentMethods || []).filter(m => m.active !== false);

      if (methods.length === 0) {
        container.innerHTML = '<div style="color: #94A3B8; font-size: 12px; text-align: center; padding: 10px;">El restaurante no tiene cuentas configuradas aún. Puedes acordar el pago por WhatsApp.</div>';
        return;
      }

      container.innerHTML = methods.map(m => {
        const typeIcon = m.type === 'pago_movil' ? '📲' : (m.type === 'zelle' ? '💵' : (m.type === 'binance' ? '🟡' : '🏦'));
        const typeLabel = m.type === 'pago_movil' ? 'Pago Móvil (Bs)' : (m.type === 'zelle' ? 'Zelle (USD)' : (m.type === 'binance' ? 'Binance USDT' : 'Transferencia Bancaria'));

        let fieldsHTML = '';
        if (m.bank) {
          fieldsHTML += `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="color: #94A3B8;">🏦 Banco:</span>
              <div style="display: flex; align-items: center; gap: 6px;">
                <strong style="color: #FFF;">${m.bank}</strong>
                <button type="button" onclick="MarketplaceApp.copyTextToClipboard('${m.bank}', 'Banco')" style="background: rgba(255,255,255,0.1); border: none; color: #60A5FA; border-radius: 4px; padding: 2px 6px; font-size: 10.5px; font-weight: 800; cursor: pointer;">📋 Copiar</button>
              </div>
            </div>
          `;
        }
        if (m.phone) {
          fieldsHTML += `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="color: #94A3B8;">📞 Teléfono:</span>
              <div style="display: flex; align-items: center; gap: 6px;">
                <strong style="color: #FDE047;">${m.phone}</strong>
                <button type="button" onclick="MarketplaceApp.copyTextToClipboard('${m.phone.replace(/[^0-9]/g, '')}', 'Teléfono')" style="background: rgba(255,255,255,0.1); border: none; color: #60A5FA; border-radius: 4px; padding: 2px 6px; font-size: 10.5px; font-weight: 800; cursor: pointer;">📋 Copiar</button>
              </div>
            </div>
          `;
        }
        if (m.idNumber) {
          fieldsHTML += `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="color: #94A3B8;">🪪 Cédula / RIF:</span>
              <div style="display: flex; align-items: center; gap: 6px;">
                <strong style="color: #FFF;">${m.idNumber}</strong>
                <button type="button" onclick="MarketplaceApp.copyTextToClipboard('${m.idNumber.replace(/[^0-9a-zA-Z]/g, '')}', 'Cédula/RIF')" style="background: rgba(255,255,255,0.1); border: none; color: #60A5FA; border-radius: 4px; padding: 2px 6px; font-size: 10.5px; font-weight: 800; cursor: pointer;">📋 Copiar</button>
              </div>
            </div>
          `;
        }
        if (m.account) {
          fieldsHTML += `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="color: #94A3B8;">💳 N° Cuenta:</span>
              <div style="display: flex; align-items: center; gap: 6px;">
                <strong style="color: #FFF; font-size: 11px;">${m.account}</strong>
                <button type="button" onclick="MarketplaceApp.copyTextToClipboard('${m.account.replace(/[^0-9]/g, '')}', 'Número de Cuenta')" style="background: rgba(255,255,255,0.1); border: none; color: #60A5FA; border-radius: 4px; padding: 2px 6px; font-size: 10.5px; font-weight: 800; cursor: pointer;">📋 Copiar</button>
              </div>
            </div>
          `;
        }
        if (m.accountType && String(m.accountType).trim()) {
          fieldsHTML += `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="color: #94A3B8;">📋 Tipo de Cuenta:</span>
              <strong style="color: #93C5FD; font-size: 11.5px;">${m.accountType}</strong>
            </div>
          `;
        }
        if (m.email) {
          fieldsHTML += `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="color: #94A3B8;">📧 Correo:</span>
              <div style="display: flex; align-items: center; gap: 6px;">
                <strong style="color: #FFF; font-size: 11.5px;">${m.email}</strong>
                <button type="button" onclick="MarketplaceApp.copyTextToClipboard('${m.email}', 'Correo')" style="background: rgba(255,255,255,0.1); border: none; color: #60A5FA; border-radius: 4px; padding: 2px 6px; font-size: 10.5px; font-weight: 800; cursor: pointer;">📋 Copiar</button>
              </div>
            </div>
          `;
        }
        if (m.titular) {
          fieldsHTML += `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="color: #94A3B8;">👤 Titular:</span>
              <strong style="color: #CBD5E1;">${m.titular}</strong>
            </div>
          `;
        }

        let qrSection = '';
        if (m.qrImage) {
          const qrDetailsEscaped = encodeURIComponent(`${m.title || ''} - ${m.bank || ''} - ${m.phone || m.account || ''}`);
          qrSection = `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.08);">
              <span style="font-size: 11.5px; color: #38BDF8; font-weight: 700;">📸 Código QR de Pago</span>
              <button type="button" onclick="MarketplaceApp.openPaymentQRZoom('${encodeURIComponent(m.title || 'QR de Pago')}', '${encodeURIComponent(m.qrImage)}', '${qrDetailsEscaped}')" style="background: #3B82F6; color: #FFF; border: none; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; cursor: pointer; display: flex; align-items: gap: 4px;">
                🔍 Ver QR en Grande
              </button>
            </div>
          `;
        }

        return `
          <div style="background: rgba(0,0,0,0.4); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 12px; padding: 12px; font-size: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 6px;">
              <span style="font-weight: 900; color: #FFF; font-size: 13px;">${typeIcon} ${m.title || typeLabel}</span>
              <span style="font-size: 10px; font-weight: 800; background: rgba(59,130,246,0.2); color: #93C5FD; padding: 2px 6px; border-radius: 4px;">${m.bank || typeLabel}</span>
            </div>
            ${fieldsHTML}
            ${m.notes ? `<div style="font-size: 11px; color: #FDE047; font-style: italic; margin-top: 4px;">⚠️ ${m.notes}</div>` : ''}
            ${qrSection}
          </div>
        `;
      }).join('');

    } catch (e) {
      console.error(e);
      container.innerHTML = '<div style="color: #EF4444; font-size: 12px; text-align: center; padding: 10px;">Error al cargar cuentas de pago.</div>';
    }
  }

  copyTextToClipboard(text, label = 'Dato') {
    if (!text) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          this.showToast(`✅ ${label} copiado al portapapeles: ${text}`);
        }).catch(() => {
          this.fallbackCopyText(text, label);
        });
      } else {
        this.fallbackCopyText(text, label);
      }
    } catch(e) {
      this.fallbackCopyText(text, label);
    }
  }

  fallbackCopyText(text, label) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      this.showToast(`✅ ${label} copiado: ${text}`);
    } catch (err) {
      prompt(`Copia el ${label} manualmente:`, text);
    }
    document.body.removeChild(textArea);
  }

  openPaymentQRZoom(encodedTitle, encodedUrl, encodedDetails) {
    const title = decodeURIComponent(encodedTitle);
    const url = decodeURIComponent(encodedUrl);
    const details = decodeURIComponent(encodedDetails);

    const modal = document.getElementById('payment-qr-zoom-modal');
    const titleEl = document.getElementById('qr-zoom-title');
    const imgEl = document.getElementById('qr-zoom-img');
    const detailsEl = document.getElementById('qr-zoom-details');

    if (titleEl) titleEl.innerText = title;
    if (imgEl) imgEl.src = url;
    if (detailsEl) detailsEl.innerText = details;

    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('active');
    }
  }

  closePaymentQRZoom() {
    const modal = document.getElementById('payment-qr-zoom-modal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('active');
    }
  }

  // Client-side image compression: Canvas resize to max 1200px & JPEG 0.75 quality
  async compressImageFile(file, maxDimension = 1200, quality = 0.75) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async handlePaymentReceiptSelected(event) {
    const input = event.target;
    if (!input || !input.files || !input.files[0]) return;

    const file = input.files[0];
    const previewContainer = document.getElementById('payment-receipt-preview-container');
    const previewImg = document.getElementById('payment-receipt-preview-img');
    const sizeLabel = document.getElementById('payment-receipt-size-label');
    const btnText = document.getElementById('btn-receipt-upload-text');

    if (btnText) btnText.innerText = '⏳ Comprimiendo imagen...';

    try {
      const compressedBase64 = await this.compressImageFile(file, 1200, 0.75);
      this.attachedReceiptBase64 = compressedBase64;
      
      const approxKb = Math.round(compressedBase64.length * (3/4) / 1024);

      if (previewImg) previewImg.src = compressedBase64;
      if (sizeLabel) sizeLabel.innerText = `${approxKb} KB • Listo para enviar`;
      if (previewContainer) previewContainer.classList.remove('hidden');
      if (btnText) btnText.innerText = '🔄 Cambiar Comprobante';

      this.showToast(`📸 Comprobante listo (${approxKb} KB)`);
    } catch(err) {
      console.error('Error compressing receipt:', err);
      alert('Error al procesar la imagen del comprobante.');
      if (btnText) btnText.innerText = 'Seleccionar o Tomar Foto del Comprobante';
    }
  }

  removePaymentReceipt() {
    this.attachedReceiptBase64 = null;
    const fileInput = document.getElementById('order-payment-receipt-file');
    if (fileInput) fileInput.value = '';
    const previewContainer = document.getElementById('payment-receipt-preview-container');
    if (previewContainer) previewContainer.classList.add('hidden');
    const btnText = document.getElementById('btn-receipt-upload-text');
    if (btnText) btnText.innerText = 'Seleccionar o Tomar Foto del Comprobante';
  }

  zoomPaymentReceipt() {
    if (!this.attachedReceiptBase64) return;
    this.openPaymentQRZoom('Comprobante de Pago', this.attachedReceiptBase64, 'Vista previa de tu comprobante antes de enviar el pedido.');
  }

  selectCashDenomination(val) {
    document.querySelectorAll('.btn-cash-chip').forEach(btn => {
      btn.classList.remove('active');
    });

    const cashInput = document.getElementById('order-cash-amount');
    const chipId = (val === 'exacto' || val === 'otro') ? `chip-cash-${val}` : `chip-cash-${val}`;
    const activeChip = document.getElementById(chipId);
    if (activeChip) {
      activeChip.classList.add('active');
    }

    if (val === 'exacto') {
      if (cashInput) cashInput.value = 'Pago Exacto (Sin vuelto)';
    } else if (val === 'otro') {
      if (cashInput) {
        cashInput.value = '';
        cashInput.focus();
      }
    } else {
      if (cashInput) cashInput.value = `$${Number(val).toLocaleString('de-DE')} COP`;
    }

    this.calculateCashChange();
  }

  calculateCashChange() {
    const cashInput = document.getElementById('order-cash-amount');
    const previewEl = document.getElementById('cash-change-preview');
    if (!cashInput || !previewEl) return;

    const valStr = cashInput.value.trim();
    if (!valStr) {
      previewEl.style.display = 'none';
      return;
    }

    previewEl.style.display = 'block';

    if (valStr.toLowerCase().includes('exacto')) {
      previewEl.style.color = '#6EE7B7';
      previewEl.style.background = '#042f2e';
      previewEl.style.borderColor = '#10B981';
      previewEl.innerHTML = `✅ <strong>Pago Exacto:</strong> No se requiere cambio para el repartidor.`;
      return;
    }

    const numMatch = valStr.replace(/\./g, '').replace(/,/g, '').match(/\d+/);
    if (!numMatch) {
      previewEl.style.display = 'none';
      return;
    }

    const paidNum = parseFloat(numMatch[0]);
    let totalCop = 0;
    const totalEl = document.getElementById('cart-total');
    if (totalEl) {
      const match = totalEl.innerText.replace(/\./g, '').replace(/,/g, '').match(/\d+/);
      if (match) totalCop = parseFloat(match[0]);
    }

    if (paidNum > 0 && totalCop > 0) {
      if (paidNum >= totalCop) {
        const change = paidNum - totalCop;
        previewEl.style.color = '#6EE7B7';
        previewEl.style.background = '#042f2e';
        previewEl.style.borderColor = '#10B981';
        previewEl.innerHTML = `💵 <strong>Pagas con:</strong> $${paidNum.toLocaleString('de-DE')} COP ➔ <strong style="color:#FDE047;">Llevar Vuelto:</strong> $${change.toLocaleString('de-DE')} COP`;
      } else {
        previewEl.style.color = '#FDE047';
        previewEl.style.background = '#451a03';
        previewEl.style.borderColor = '#F59E0B';
        previewEl.innerHTML = `⚠️ El monto ingresado ($${paidNum.toLocaleString('de-DE')}) es menor al total del pedido ($${totalCop.toLocaleString('de-DE')}).`;
      }
    }
  }

  isDrinkOrBeverage(item) {
    if (!item) return false;
    const cat = (item.category || '').toLowerCase().trim();
    const name = (item.name || '').toLowerCase().trim();

    // 1. Definitively exclude all solid foods, pizzas, meals and snacks
    const nonDrinkKeywords = [
      'pizza', 'pizzas', 'hamburguesa', 'burger', 'perro', 'hot dog', 'hotdog',
      'salchipapa', 'shawarma', 'pepito', 'arepa', 'empanada', 'taco', 'burrito',
      'pollo', 'carne', 'sandwich', 'sándwich', 'panzerotti', 'pasticho', 'pastiche',
      'gratinado', 'plato', 'entrada', 'almuerzo', 'sopa', 'caldo', 'arroz',
      'pasta', 'lasagna', 'postre', 'tequeño', 'croqueta', 'nugget', 'costilla',
      'alitas', 'papas', 'porcion', 'porción', 'torta', 'helado'
    ];
    if (nonDrinkKeywords.some(w => cat.includes(w) || name.includes(w))) {
      return false;
    }

    // 2. Exact positive drink categories
    const drinkCategories = [
      'bebida', 'bebidas', 'refresco', 'refrescos', 'gaseosa', 'gaseosas',
      'jugo', 'jugos', 'frappe', 'frappes', 'licor', 'licores', 'cerveza',
      'cervezas', 'coctel', 'cocteles', 'cafeteria', 'café', 'cafes', 'malteada', 'malteadas'
    ];
    if (drinkCategories.some(c => cat.includes(c))) {
      return true;
    }

    // 3. Positive drink names
    const drinkNames = [
      'refresco', 'gaseosa', 'jugo', 'frappe', 'frappé', 'agua mineral', 'agua pura', 'botella de agua',
      'coca-cola', 'coca cola', 'cocacola', 'pepsi', 'frescolita', 'chinotto', '7up', 'seven up',
      'hit ', 'postobon', 'sprite', 'fanta', 'quatro', 'cuatro', 'nestea', 'lipton',
      'monster', 'red bull', 'redbull', 'cerveza', 'polar', 'solera', 'heineken', 'corona',
      'aguila', 'pilsen', 'poker', 'costeña', 'club colombia', 'malta', 'maltin',
      'limonada', 'smoothie', 'batido', 'malteada', 'te frio', 'té frío', 'iced tea',
      'mocaccino', 'capuccino', 'cappuccino', 'espresso', 'latte', 'milo'
    ];
    return drinkNames.some(d => name.includes(d));
  }


  getAvailableBeveragesFromCartStores() {
    const storeIds = [...new Set(this.cart.items.map(i => i.restaurant_id || i.restaurantId || i.establishmentId || i.establishment_id || (this.selectedEstablishment ? this.selectedEstablishment.id : null)).filter(Boolean))];
    const drinks = [];

    storeIds.forEach(sId => {
      const est = (this.establishments || []).find(e => String(e.id) === String(sId));
      if (est && Array.isArray(est.products)) {
        est.products.forEach(p => {
          if (p && this.isDrinkOrBeverage(p) && !p.is_paused) {
            drinks.push({
              ...p,
              restaurant_id: est.id,
              restaurant_name: est.name
            });
          }
        });
      }
    });

    if (drinks.length === 0 && this.selectedEstablishment && Array.isArray(this.selectedEstablishment.products)) {
      this.selectedEstablishment.products.forEach(p => {
        if (p && this.isDrinkOrBeverage(p) && !p.is_paused) {
          drinks.push({
            ...p,
            restaurant_id: this.selectedEstablishment.id,
            restaurant_name: this.selectedEstablishment.name
          });
        }
      });
    }

    return drinks;
  }

  getPizzasWithoutSpecialCrustInCart() {
    return this.cart.items.filter(item => {
      const pName = (item.product_name || item.product?.name || item.name || '').toLowerCase();
      const pCat = (item.product?.category || item.category || '').toLowerCase();
      const rName = (item.restaurant_name || (this.selectedEstablishment ? this.selectedEstablishment.name : '')).toLowerCase();
      const isDrink = this.isDrinkOrBeverage(item);
      const isPizza = !isDrink && (
        pCat.includes('pizza') || 
        pName.includes('pizza') || 
        pName.includes('medio metro') || 
        pName.includes('un metro') || 
        pName.includes('metro y medio') || 
        pName.includes('panzerotti') ||
        (rName.includes('pizza') && !pCat.includes('bebida') && !pCat.includes('frappe') && !pCat.includes('plato'))
      );
      if (!isPizza) return false;
      const hasSpecialCrust = item.selected_specifications?.single_selections?.some(s => 
        (s.group_name || '').toLowerCase().includes('borde') && 
        !s.chosen_option.toLowerCase().includes('tradicional')
      );
      return !hasSpecialCrust;
    });
  }

  addCrustToCartItem(cartItemId, crustName, crustPrice) {
    const item = this.cart.items.find(i => i.cart_item_id === cartItemId);
    if (!item) return;

    if (!item.selected_specifications) {
      item.selected_specifications = { single_selections: [], add_ons: [], exclusions: [], special_notes: '' };
    }
    if (!Array.isArray(item.selected_specifications.single_selections)) {
      item.selected_specifications.single_selections = [];
    }

    const prevCrustIdx = item.selected_specifications.single_selections.findIndex(s => (s.group_name || '').toLowerCase().includes('borde'));
    let prevExtra = 0;
    if (prevCrustIdx !== -1) {
      prevExtra = item.selected_specifications.single_selections[prevCrustIdx].extra_price || 0;
      item.selected_specifications.single_selections.splice(prevCrustIdx, 1);
    }

    const normPrice = this.normalizeCopPrice(crustPrice);
    item.selected_specifications.single_selections.push({
      group_name: 'Tipo de Borde',
      chosen_option: `${crustName} (+${this.formatPesos(normPrice)})`,
      extra_price: normPrice
    });

    item.unit_total_calculated = (item.unit_total_calculated - prevExtra) + normPrice;
    item.subtotal_combined = item.unit_total_calculated * item.quantity;

    this.updateCartBadge();
    this.showToast(`🧀 ${crustName} agregado a tu pizza`);

    // Re-render upsell modal list so user sees updated status
    this.checkBeveragesAndPrompt();
  }

  getAvailableDessertsFromStores() {
    const desserts = [];
    const seenIds = new Set();
    const cartStoreIds = new Set(this.cart.items.map(i => i.restaurant_id || i.restaurantId || (this.selectedEstablishment ? this.selectedEstablishment.id : null)).filter(Boolean));

    (this.establishments || []).forEach(est => {
      if (est.disabled) return;
      const isCartStore = cartStoreIds.has(est.id);
      const isDessertShop = (est.name || '').toLowerCase().match(/fruty|helado|batido|dulce|postre|waffle/i) !== null;
      if (!isCartStore && !isDessertShop) return;

      if (Array.isArray(est.products)) {
        est.products.forEach(p => {
          if (p.out_of_stock || p.agotado) return;
          const pName = (p.name || '').toLowerCase();
          const pCat = (p.category || '').toLowerCase();
          const isDessert = pCat.includes('postre') || pCat.includes('helado') || pCat.includes('waffle') || pCat.includes('fresas') || pCat.includes('ensalada') || pName.includes('helado') || pName.includes('waffle') || pName.includes('fresas con crema') || pName.includes('dulce') || pName.includes('marquesa') || pName.includes('brownie');
          if (isDessert && !seenIds.has(p.id)) {
            seenIds.add(p.id);
            desserts.push({
              ...p,
              restaurant_id: est.id,
              restaurant_name: est.name,
              isFromSameStore: isCartStore
            });
          }
        });
      }
    });

    return desserts.slice(0, 10);
  }

  switchUpsellTab(tabName) {
    this.activeUpsellTab = tabName || 'all';
    document.querySelectorAll('.upsell-tab-btn').forEach(btn => {
      if (btn.id === `tab-btn-upsell-${this.activeUpsellTab}`) {
        btn.classList.add('active');
        btn.style.background = 'var(--primary)';
        btn.style.color = '#fff';
      } else {
        btn.classList.remove('active');
        btn.style.background = 'transparent';
        btn.style.color = '#94A3B8';
      }
    });
    this.renderUpsellContent();
  }

  renderUpsellContent() {
    const listContainer = document.getElementById('beverage-upsell-list');
    if (!listContainer) return;

    const activeTab = this.activeUpsellTab || 'all';
    const pizzasWithoutCrust = this.getPizzasWithoutSpecialCrustInCart();
    const availableDrinks = this.getAvailableBeveragesFromCartStores();
    const availableDesserts = this.getAvailableDessertsFromStores();

    let html = '';

    // 1. Pizza Crust Section
    if ((activeTab === 'all' || activeTab === 'crusts') && pizzasWithoutCrust.length > 0) {
      html += `
        <div style="background: rgba(245, 158, 11, 0.08); border: 1.5px solid rgba(245, 158, 11, 0.35); border-radius: 16px; padding: 14px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
            <span style="font-size: 20px;">🧀</span>
            <h4 style="margin: 0; color: #FCD34D; font-size: 14px; font-weight: 800;">Bordes Rellenos para tus Pizzas</h4>
          </div>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${pizzasWithoutCrust.map(pizza => {
              const restId = pizza.restaurant_id || pizza.restaurantId || pizza.establishmentId;
              let availCrusts = this.getPizzaCrustOptions({ restaurant_id: restId }).filter(c => (c.price || 0) > 0);
              if (availCrusts.length === 0) {
                availCrusts = [
                  { id: 'queso', name: 'Borde de Queso', icon: '🧀', price: 6000 },
                  { id: 'salchicha', name: 'Borde de Salchicha', icon: '🌭', price: 6000 },
                  { id: 'bocadillo_queso', name: 'Borde Queso y Bocadillo', icon: '🍯', price: 6000 }
                ];
              }
              return `
                <div style="background: rgba(0,0,0,0.35); border-radius: 12px; padding: 10px 12px; border: 1px solid rgba(255,255,255,0.08);">
                  <div style="font-weight: 800; font-size: 13px; color: #FFF; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <span>🍕 ${pizza.product_name || pizza.name}</span>
                    <span style="font-size: 11px; color: var(--text-muted);">${pizza.restaurant_name || ''}</span>
                  </div>
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 6px;">
                    ${availCrusts.map(c => `
                      <button type="button" onclick="MarketplaceApp.addCrustToCartItem('${pizza.cart_item_id}', '${c.name}', ${c.price})" style="background: rgba(245,158,11,0.15); border: 1px solid #F59E0B; color: #FFF; padding: 8px 10px; border-radius: 10px; font-size: 11px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; transition: all 0.2s;">
                        ${c.icon || '🧀'} ${c.name} (+${this.formatPesos(c.price)})
                      </button>
                    `).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    // 2. Drinks Section
    if ((activeTab === 'all' || activeTab === 'drinks') && availableDrinks.length > 0) {
      html += `
        <div style="background: rgba(59, 130, 246, 0.08); border: 1.5px solid rgba(59, 130, 246, 0.35); border-radius: 16px; padding: 14px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 20px;">🥤</span>
              <h4 style="margin: 0; color: #93C5FD; font-size: 14px; font-weight: 800;">Bebidas Frías y Refrescos</h4>
            </div>
            <span style="font-size: 11px; color: #93C5FD; font-weight: 700; background: rgba(59,130,246,0.2); padding: 2px 8px; border-radius: 8px;">${availableDrinks.length} opciones</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${availableDrinks.map(drink => {
              const rawPrice = drink.price || 0;
              const priceCop = rawPrice < 1000 ? rawPrice * 1000 : rawPrice;
              const imgUrl = drink.image || '/images/burger_royale.jpg';
              return `
                <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.08); padding: 9px 12px; border-radius: 12px; gap: 10px;">
                  <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
                    <img src="${imgUrl}" alt="${drink.name}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); flex-shrink: 0;">
                    <div style="min-width: 0; flex: 1;">
                      <div style="font-weight: 800; font-size: 13px; color: #FFF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${drink.name}</div>
                      <div style="font-size: 11px; color: var(--text-muted);">${drink.restaurant_name}</div>
                      <div style="font-size: 12px; font-weight: 800; color: var(--primary); margin-top: 1px;">${this.formatPesos(priceCop)}</div>
                    </div>
                  </div>
                  <button type="button" onclick="MarketplaceApp.addUpsellProductAndRefresh('${drink.id}', '${drink.restaurant_id}', '🥤')" style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #FFF; border: none; padding: 7px 12px; border-radius: 9px; font-weight: 800; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 4px; box-shadow: 0 4px 10px rgba(16,185,129,0.3); white-space: nowrap; flex-shrink: 0;">
                    ➕ Agregar
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    // 3. Desserts Section
    if ((activeTab === 'all' || activeTab === 'desserts') && availableDesserts.length > 0) {
      html += `
        <div style="background: rgba(236, 72, 153, 0.08); border: 1.5px solid rgba(236, 72, 153, 0.35); border-radius: 16px; padding: 14px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 20px;">🍨</span>
              <h4 style="margin: 0; color: #F472B6; font-size: 14px; font-weight: 800;">Postres & Antojos Dulces</h4>
            </div>
            <span style="font-size: 11px; color: #F472B6; font-weight: 700; background: rgba(236,72,153,0.2); padding: 2px 8px; border-radius: 8px;">${availableDesserts.length} opciones</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${availableDesserts.map(dessert => {
              const rawPrice = dessert.price || 0;
              const priceCop = rawPrice < 1000 ? rawPrice * 1000 : rawPrice;
              const imgUrl = dessert.image || '/images/burger_royale.jpg';
              return `
                <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.08); padding: 9px 12px; border-radius: 12px; gap: 10px;">
                  <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
                    <img src="${imgUrl}" alt="${dessert.name}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); flex-shrink: 0;">
                    <div style="min-width: 0; flex: 1;">
                      <div style="font-weight: 800; font-size: 13px; color: #FFF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${dessert.name}</div>
                      <div style="font-size: 11px; color: var(--text-muted);">${dessert.restaurant_name}</div>
                      <div style="font-size: 12px; font-weight: 800; color: #EC4899; margin-top: 1px;">${this.formatPesos(priceCop)}</div>
                    </div>
                  </div>
                  <button type="button" onclick="MarketplaceApp.addUpsellProductAndRefresh('${dessert.id}', '${dessert.restaurant_id}', '🍨')" style="background: linear-gradient(135deg, #EC4899 0%, #DB2777 100%); color: #FFF; border: none; padding: 7px 12px; border-radius: 9px; font-weight: 800; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 4px; box-shadow: 0 4px 10px rgba(236,72,153,0.3); white-space: nowrap; flex-shrink: 0;">
                    ➕ Agregar
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    if (!html) {
      html = `
        <div style="text-align: center; padding: 30px 10px; color: #94A3B8;">
          <span style="font-size: 32px; display: block; margin-bottom: 8px;">🎉</span>
          <p style="font-size: 13px; font-weight: 700; margin: 0; color: #FFF;">¡Tu carrito ya está súper completo!</p>
          <p style="font-size: 11.5px; margin-top: 4px;">Presiona Continuar para finalizar tu pedido.</p>
        </div>
      `;
    }

    listContainer.innerHTML = html;

    // Update live subtotal badge
    const subtotalEl = document.getElementById('upsell-subtotal-val');
    if (subtotalEl) {
      subtotalEl.innerText = this.formatPesos(this.calculateSubtotal());
    }
  }

  calculateSubtotal() {
    if (!this.cart || !Array.isArray(this.cart.items)) return 0;
    return this.cart.items.reduce((sum, item) => {
      let itemSubtotal = 0;
      if (item.subtotal_combined != null) {
        itemSubtotal = this.normalizeCopPrice(item.subtotal_combined);
      } else if (item.unit_total_calculated != null) {
        itemSubtotal = this.normalizeCopPrice(item.unit_total_calculated * (item.quantity || 1));
      } else {
        itemSubtotal = this.normalizeCopPrice((item.price || 0) * (item.quantity || 1));
      }
      return sum + itemSubtotal;
    }, 0);
  }

  checkBeveragesAndPrompt() {
    const pizzasWithoutCrust = this.getPizzasWithoutSpecialCrustInCart();
    const hasBeverages = this.cart.items.some(i => this.isDrinkOrBeverage(i));
    const availableDrinks = this.getAvailableBeveragesFromCartStores();
    const availableDesserts = this.getAvailableDessertsFromStores();

    // If no pizzas need crusts AND already has drinks AND no desserts available, skip
    if (pizzasWithoutCrust.length === 0 && hasBeverages && availableDesserts.length === 0) {
      return false;
    }

    this.activeUpsellTab = 'all';
    this.renderUpsellContent();

    const modal = document.getElementById('beverage-upsell-modal');
    if (modal) {
      modal.classList.add('open');
      modal.style.setProperty('display', 'flex', 'important');
      return true;
    }

    return false;
  }

  addUpsellProductAndRefresh(prodId, restId, emoji) {
    const est = (this.establishments || []).find(e => e.id === restId);
    if (!est) return;
    const prod = (est.products || []).find(p => p.id === prodId);
    if (!prod) return;

    this.addDirectToCart(prod);
    this.showToast(`${emoji || '✨'} ${prod.name} agregado al carrito`);

    // Re-render upsell content with updated subtotal
    this.renderUpsellContent();
  }

  addBeverageAndRefresh(prodId, restId) {
    this.addUpsellProductAndRefresh(prodId, restId, '🥤');
  }

  closeBeverageModalAndProceed() {
    const modal = document.getElementById('beverage-upsell-modal');
    if (modal) {
      modal.classList.remove('open');
      modal.style.setProperty('display', 'none', 'important');
    }
    this.submitOrder(true);
  }

  detectPhoneCountry() {
    const phoneInput = document.getElementById('order-phone');
    const countrySelect = document.getElementById('order-phone-country');
    const badgeEl = document.getElementById('phone-country-detected-badge');
    if (!phoneInput || !countrySelect) return;

    let raw = phoneInput.value.trim();
    if (!raw) {
      if (badgeEl) badgeEl.style.display = 'none';
      return;
    }

    let clean = raw.replace(/[^\d+]/g, '');
    let detectedCountry = null;

    // Check international prefixes
    if (clean.startsWith('+58') || clean.startsWith('58')) {
      detectedCountry = { code: '+58', name: 'Venezuela', flag: '🇻🇪' };
    } else if (clean.startsWith('+57') || clean.startsWith('57')) {
      detectedCountry = { code: '+57', name: 'Colombia', flag: '🇨🇴' };
    } else if (clean.startsWith('+52') || clean.startsWith('52')) {
      detectedCountry = { code: '+52', name: 'México', flag: '🇲🇽' };
    } else if (clean.startsWith('+1') || (clean.startsWith('1') && clean.length >= 10)) {
      detectedCountry = { code: '+1', name: 'EE.UU. / Canadá', flag: '🇺🇸' };
    } else if (clean.startsWith('+34') || clean.startsWith('34')) {
      detectedCountry = { code: '+34', name: 'España', flag: '🇪🇸' };
    } else if (clean.startsWith('+593') || clean.startsWith('593')) {
      detectedCountry = { code: '+593', name: 'Ecuador', flag: '🇪🇨' };
    } else if (clean.startsWith('+51') || clean.startsWith('51')) {
      detectedCountry = { code: '+51', name: 'Perú', flag: '🇵🇪' };
    } else if (clean.startsWith('+56') || clean.startsWith('56')) {
      detectedCountry = { code: '+56', name: 'Chile', flag: '🇨🇱' };
    } else if (clean.startsWith('+54') || clean.startsWith('54')) {
      detectedCountry = { code: '+54', name: 'Argentina', flag: '🇦🇷' };
    } 
    // Check local mobile prefixes
    else if (/^(0?412|0?414|0?424|0?416|0?426)/.test(clean)) {
      detectedCountry = { code: '+58', name: 'Venezuela', flag: '🇻🇪' };
    } else if (/^3[0-2,5]\d{8}/.test(clean) || /^3(0[0-5]|1[0-9]|2[0-4]|50)/.test(clean)) {
      detectedCountry = { code: '+57', name: 'Colombia', flag: '🇨🇴' };
    } else if (/^[67]\d{8}/.test(clean)) {
      detectedCountry = { code: '+34', name: 'España', flag: '🇪🇸' };
    }

    if (detectedCountry) {
      countrySelect.value = detectedCountry.code;

      // Auto-clean prefix from input text box if user typed country code
      if (raw.startsWith('+') || raw.startsWith(detectedCountry.code.replace('+', ''))) {
        let stripped = raw;
        if (stripped.startsWith(detectedCountry.code)) {
          stripped = stripped.replace(detectedCountry.code, '').trim();
        } else if (stripped.startsWith(detectedCountry.code.replace('+', ''))) {
          stripped = stripped.replace(detectedCountry.code.replace('+', ''), '').trim();
        }
        if (stripped !== raw && stripped.length > 0) {
          phoneInput.value = stripped;
        }
      }

      if (badgeEl) {
        badgeEl.style.display = 'inline-flex';
        badgeEl.innerHTML = `<span>${detectedCountry.flag}</span> ${detectedCountry.name} (${detectedCountry.code})`;
      }
    } else {
      if (badgeEl) badgeEl.style.display = 'none';
    }
  }

  async submitOrder(skipBeveragePrompt = false) {
    // 0. Verify that all restaurants in cart are currently OPEN
    for (const item of this.cart.items) {
      const store = (this.establishments || []).find(e => e.id === item.restaurant_id) || this.selectedEstablishment;
      if (store && !this.isEstablishmentOpen(store)) {
        alert(`🔴 No es posible enviar el pedido.\n\nEl restaurante "${store.name}" se encuentra CERRADO en este momento.\nHorario de Atención: ${this.formatTime12h(store.open_time)} a ${this.formatTime12h(store.close_time)}.\n\nSolo se pueden procesar pedidos de restaurantes que se encuentren abiertos.`);
        return;
      }
    }

    const acceptTerms = document.getElementById('checkout-accept-terms').checked;
    if (!acceptTerms) {
      alert('Debes aceptar los Términos y Condiciones y autorizar la verificación telefónica para enviar tu pedido.');
      return;
    }

    const customerName = document.getElementById('order-customer-name').value.trim();
    
    let tableNumber = null;
    let phone = null;
    let address = null;

    if (this.orderType === 'mesa') {
      tableNumber = document.getElementById('order-table-number').value.trim();
      if (!customerName || !tableNumber) {
        alert('Por favor, indica tu nombre y número de mesa.');
        return;
      }
    } else {
      // Upsell beverage suggestion before confirming final order
      if (!skipBeveragePrompt) {
        const openedPrompt = this.checkBeveragesAndPrompt();
        if (openedPrompt) {
          return;
        }
      }
      const countryCode = document.getElementById('order-phone-country') ? document.getElementById('order-phone-country').value : '+58';
      let rawPhone = document.getElementById('order-phone').value.trim();
      address = document.getElementById('order-address').value.trim();

      if (!customerName || !rawPhone || !address) {
        alert('Por favor, completa todos los campos de entrega.');
        return;
      }

      if (typeof PhoneUtils !== 'undefined' && PhoneUtils.validateVECO) {
        const fullToValidate = rawPhone.startsWith('+') ? rawPhone : `${countryCode}${rawPhone}`;
        const phoneValidation = PhoneUtils.validateVECO(fullToValidate);
        if (!phoneValidation.isValid) {
          alert(`Número de teléfono inválido: ${phoneValidation.error || 'Verifica que sea un número móvil válido de Venezuela (04xx) o Colombia (3xx).'}`);
          return;
        }
        phone = phoneValidation.formatted || fullToValidate;
      } else {
        if (rawPhone.startsWith('+')) {
          phone = rawPhone;
        } else {
          rawPhone = rawPhone.replace(/^0+/, '');
          phone = `${countryCode} ${rawPhone}`;
        }
      }
      if (this.selectedLatitude === null || this.selectedLongitude === null) {
        const cachedLat = localStorage.getItem('user_gps_lat');
        const cachedLng = localStorage.getItem('user_gps_lng');
        if (cachedLat && cachedLng) {
          this.selectedLatitude = parseFloat(cachedLat);
          this.selectedLongitude = parseFloat(cachedLng);
        } else {
          alert('📍 Por favor, toca tu ubicación exacta en el mapa para que el domiciliario sepa a dónde llevar tu pedido.');
          return;
        }
      }
    }

    const paymentMethod = this.paymentMethod || 'Efectivo';
    let paymentNotes = '';
    const cashAmtInpEl = document.getElementById('order-cash-amount');

    if (paymentMethod === 'Efectivo') {
      const cashVal = cashAmtInpEl ? cashAmtInpEl.value.trim() : '';
      if (!cashVal) {
        const cashBox = document.getElementById('payment-cash-details');
        if (cashBox) {
          cashBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
          cashBox.style.borderColor = '#EF4444';
          cashBox.style.boxShadow = '0 0 25px rgba(239, 68, 68, 0.9)';
          setTimeout(() => {
            cashBox.style.borderColor = '';
            cashBox.style.boxShadow = '';
          }, 3500);
        }
        alert('💵 Por favor, indica tu billete o selecciona "Pago Exacto" en el apartado de Efectivo para que el repartidor lleve tu cambio.');
        return;
      }
      const changeEl = document.getElementById('cash-change-preview');
      const changeText = (changeEl && changeEl.style.display !== 'none') ? ` (${changeEl.innerText.replace(/^[^\w]+/, '')})` : '';
      paymentNotes = `Paga con: ${cashVal}${changeText}`;
    }

    // Group items by restaurant_id
    const groupedItems = {};
    this.cart.items.forEach(item => {
      if (!groupedItems[item.restaurant_id]) {
        groupedItems[item.restaurant_id] = {
          id: item.restaurant_id,
          name: item.restaurant_name,
          delivery_fee: item.delivery_fee || 0,
          items: []
        };
      }
      groupedItems[item.restaurant_id].items.push(item);
    });

    // Upload house facade photo if attached
    let housePhotoUrl = null;
    const housePhotoInput = document.getElementById('order-house-photo');
    if (this.orderType === 'delivery' && housePhotoInput && housePhotoInput.files && housePhotoInput.files[0]) {
      try {
        const photoFile = housePhotoInput.files[0];
        const fileName = `uploads/house_${Date.now()}_${Math.floor(Math.random() * 1000)}.${photoFile.name.split('.').pop()}`;
        if (window.SupabaseHelper && window.SupabaseHelper.uploadImage) {
          housePhotoUrl = await window.SupabaseHelper.uploadImage(photoFile, fileName);
        }
        if (!housePhotoUrl) {
          // Fallback to Base64 data URL to guarantee delivery to kitchen KDS
          housePhotoUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(photoFile);
          });
        }
      } catch (err) {
        console.error('Error uploading house photo:', err);
      }
    }

    // Upload payment receipt if attached
    let paymentReceiptUrl = null;
    if (this.attachedReceiptBase64) {
      try {
        const uploadRes = await fetch('/api/upload-payment-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: this.attachedReceiptBase64 })
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          paymentReceiptUrl = uploadData.url;
        }
      } catch (err) {
        console.error('Error uploading payment receipt:', err);
      }
    }

    const refInput = document.getElementById('order-payment-ref-number');
    const refNum = refInput ? refInput.value.trim() : '';
    if (refNum) {
      paymentNotes = paymentNotes ? `${paymentNotes} | Ref: ${refNum}` : `Ref: ${refNum}`;
    }

    const shopIds = Object.keys(groupedItems);
    let lastCreatedOrderId = null;
    // Generate 4-digit security code for delivery
    const deliverySecurityCode = this.orderType === 'delivery' ? Math.floor(1000 + Math.random() * 9000).toString() : null;
    
    try {
      const promises = shopIds.map(async (shopId) => {
        const shop = groupedItems[shopId];
        const shopSubtotal = shop.items.reduce((sum, item) => sum + this.normalizeCopPrice(item.subtotal_combined), 0);
        let shopDeliveryCost = 0;
        if (this.orderType === 'delivery') {
          shopDeliveryCost = this.calculateShopDeliveryFee(this.calculatedDistanceKm, shop.delivery_fee);
        }
        
        const userEmail = this.currentUser?.email || localStorage.getItem('pedigochos_user_email') || null;
        const userId = this.currentUser?.id || localStorage.getItem('pedigochos_user_id') || null;

        const orderData = {
          establishmentId: shop.id,
          establishmentName: shop.name,
          items: shop.items.map(item => ({
            id: item.product_id,
            name: item.product_name,
            price: this.normalizeCopPrice(item.unit_total_calculated),
            quantity: item.quantity,
            specifications: this.getSpecsStringForKitchen(item.selected_specifications),
            selected_specifications: item.selected_specifications,
            unit_total_calculated: this.normalizeCopPrice(item.unit_total_calculated),
            subtotal_combined: this.normalizeCopPrice(item.subtotal_combined)
          })),
          total: shopSubtotal + shopDeliveryCost,
          orderType: this.orderType,
          paymentMethod,
          paymentNotes,
          paymentReceiptUrl: paymentReceiptUrl || null,
          customerName,
          customerPhone: phone,
          customerEmail: userEmail ? String(userEmail).toLowerCase().trim() : null,
          userId: userId || null,
          tableNumber: tableNumber ? parseInt(tableNumber, 10) : null,
          deliveryDetails: this.orderType === 'delivery' ? { 
            phone, 
            address, 
            code: deliverySecurityCode,
            latitude: this.selectedLatitude,
            longitude: this.selectedLongitude,
            distanceKm: this.calculatedDistanceKm,
            housePhotoUrl: housePhotoUrl || null,
            customerEmail: userEmail ? String(userEmail).toLowerCase().trim() : null,
            userId: userId || null
          } : null
        };

        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        });

        if (!response.ok) {
          throw new Error(`Error en el pedido para ${shop.name}`);
        }
        const createdOrder = await response.json();
        if (createdOrder && createdOrder.id) {
          lastCreatedOrderId = createdOrder.id;
          localStorage.setItem('active_order_id', createdOrder.id);
          this.saveUserOrderToHistory(createdOrder);
        }
        return createdOrder;
      });

      // Check if Offline
      if (!navigator.onLine) {
        const rawQueue = localStorage.getItem('pending_offline_orders') || '[]';
        const queue = JSON.parse(rawQueue);
        shopIds.forEach(shopId => {
          const shop = groupedItems[shopId];
          queue.push({
            id: 'ord-off-' + Date.now() + Math.floor(Math.random() * 1000),
            establishmentId: shop.id,
            establishmentName: shop.name,
            items: shop.items,
            total: shop.items.reduce((sum, item) => sum + this.normalizeCopPrice(item.subtotal_combined), 0),
            orderType: this.orderType,
            paymentMethod,
            paymentNotes,
            customerName,
            tableNumber,
            deliveryDetails: { phone, address, code: deliverySecurityCode, latitude: this.selectedLatitude, longitude: this.selectedLongitude }
          });
        });
        localStorage.setItem('pending_offline_orders', JSON.stringify(queue));
        this.addGochoPoints(25);
        this.showToast('📴 Pedido guardado sin conexión. Abriendo WhatsApp oficial...');

        // Also launch WhatsApp in offline mode
        const waMessage = this.buildRestaurantOrderWhatsAppMessage([], {
          customerName,
          phone,
          orderType: this.orderType,
          address,
          tableNumber,
          paymentMethod,
          paymentNotes,
          paymentReceiptUrl,
          distanceKm: this.calculatedDistanceKm,
          latitude: this.selectedLatitude,
          longitude: this.selectedLongitude,
          code: deliverySecurityCode,
          shopMap: groupedItems
        });
        const waUrl = `https://wa.me/573227949751?text=${encodeURIComponent(waMessage)}`;
        this.openWhatsAppUrl(waUrl);

        this.clearCart();
        this.closeCartModal();
        this.goHome();
        return;
      }

      const createdOrders = await Promise.all(promises);

      // Award GochoPoints (10 pts per $1 spent)
      const cartSubtotalCop = this.cart.items.reduce((sum, item) => sum + this.normalizeCopPrice(item.subtotal_combined), 0);
      const estUsd = Math.max(1, Math.round(cartSubtotalCop / 4000));
      const earnedPts = estUsd * 10;
      this.addGochoPoints(earnedPts);

      this.sendPushNotification('¡Pedido Enviado! 🚀', `Tu pedido en ${shopIds.length} comercio(s) fue recibido. ¡Ganaste +${earnedPts} GochoPoints! ⭐`);
      this.showToast(`🔔 ¡Pedido enviado con éxito! ⭐ Ganaste +${earnedPts} GochoPoints`);

      // Build formatted WhatsApp order message and URL for official Central PediGochos (+57 322 794 9751)
      const waMessage = this.buildRestaurantOrderWhatsAppMessage(createdOrders, {
        customerName,
        phone,
        orderType: this.orderType,
        address,
        tableNumber,
        paymentMethod,
        paymentNotes,
        paymentReceiptUrl,
        distanceKm: this.calculatedDistanceKm,
        latitude: this.selectedLatitude,
        longitude: this.selectedLongitude,
        code: deliverySecurityCode,
        shopMap: groupedItems
      });
      const officialWaNumber = '573227949751';
      const waUrl = `https://wa.me/${officialWaNumber}?text=${encodeURIComponent(waMessage)}`;

      // Automatically launch WhatsApp for the user
      this.openWhatsAppUrl(waUrl);

      this.clearCart();
      this.closeCartModal();
      
      // Reset form values safely
      const custNameInp = document.getElementById('order-customer-name');
      if (custNameInp) custNameInp.value = '';
      const tableInp = document.getElementById('order-table-number');
      if (tableInp) tableInp.value = '';
      const phoneInp = document.getElementById('order-phone');
      if (phoneInp) phoneInp.value = '';
      const addrInp = document.getElementById('order-address');
      if (addrInp) addrInp.value = '';
      const cashAmtInp = document.getElementById('order-cash-amount');
      if (cashAmtInp) cashAmtInp.value = '';
      const termsInp = document.getElementById('checkout-accept-terms');
      if (termsInp) termsInp.checked = false;
      
      // Reset map fields safely
      this.selectedLatitude = null;
      this.selectedLongitude = null;
      this.calculatedDistanceKm = null;
      const latInp = document.getElementById('order-lat');
      if (latInp) latInp.value = '';
      const lngInp = document.getElementById('order-lng');
      if (lngInp) lngInp.value = '';
      const distInp = document.getElementById('order-distance');
      if (distInp) distInp.value = '';
      const mapCont = document.getElementById('checkout-map-container');
      if (mapCont) mapCont.classList.add('hidden');
      const distSpan = document.getElementById('map-calc-distance');
      if (distSpan) distSpan.innerText = 'Esperando marcador...';

      // Activate real-time tracking map immediately without refreshing the page
      this.isTrackingMinimized = false;
      this.goHome();
      this.checkActiveOrderTracking();

      // Show prominent restaurant contact notice modal to reassure the user
      this.openOrderNoticeModal({
        storeNames: shopIds.map(id => groupedItems[id].name).join(', '),
        phone: phone,
        paymentMethod: paymentMethod,
        paymentNotes: paymentNotes,
        orderCount: shopIds.length,
        createdOrders: createdOrders,
        waUrl: waUrl
      });

    } catch (e) {
      console.error(e);
      alert('Error de conexión o problema al enviar el pedido: ' + e.message);
    }
  }

  openWhatsAppUrl(waUrl) {
    if (!waUrl) return;
    try {
      if (window.Capacitor) {
        window.open(waUrl, '_system');
        return;
      }
    } catch(e) {}

    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = waUrl;
      return;
    }

    try {
      const win = window.open(waUrl, '_blank');
      if (!win || win.closed || typeof win.closed === 'undefined') {
        window.location.href = waUrl;
      }
    } catch(err) {
      window.location.href = waUrl;
    }
  }

  buildRestaurantOrderWhatsAppMessage(createdOrders, context = {}) {
    let orders = Array.isArray(createdOrders) && createdOrders.length > 0 
      ? createdOrders 
      : (createdOrders && createdOrders.id ? [createdOrders] : []);

    if (orders.length === 0 && context.shopMap) {
      orders = Object.values(context.shopMap).map(shop => ({
        establishmentId: shop.id,
        establishmentName: shop.name,
        items: shop.items,
        total: (shop.items || []).reduce((sum, it) => sum + this.normalizeCopPrice(it.subtotal_combined || ((it.unit_total_calculated || it.price || 0) * (it.quantity || 1))), 0) + (shop.delivery_fee || 0)
      }));
    }
    if (orders.length === 0) return '';

    const firstOrder = orders[0] || {};
    const customerName = context.customerName || firstOrder.customerName || 'Cliente PediGochos';
    const phone = context.phone || firstOrder.customerPhone || (firstOrder.deliveryDetails && firstOrder.deliveryDetails.phone) || 'N/A';
    const orderType = context.orderType || firstOrder.orderType || 'delivery';
    const tableNumber = context.tableNumber || firstOrder.tableNumber;
    const paymentMethod = context.paymentMethod || firstOrder.paymentMethod || 'Efectivo';
    const paymentNotes = context.paymentNotes || firstOrder.paymentNotes || '';

    let modalityText = '🚴 Envío a Domicilio';
    if (orderType === 'mesa' || tableNumber) {
      modalityText = `🍽️ Consumo en Mesa (Mesa #${tableNumber || '1'})`;
    } else if (orderType === 'pickup') {
      modalityText = `🛍️ Para Llevar / Retiro en Restaurante`;
    }

    const lines = [];
    lines.push(`🛵 *¡NUEVO PEDIDO DE RESTAURANTE EN PEDIGOCHOS!* 🍔🍕`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`👤 *Cliente:* ${customerName}`);
    lines.push(`📞 *Teléfono / WhatsApp:* ${phone}`);
    lines.push(`🛵 *Modalidad:* ${modalityText}`);

    if (orderType === 'delivery') {
      const deliv = firstOrder.deliveryDetails || {};
      const address = deliv.address || context.address || 'Dirección acordada';
      const securityCode = context.code || deliv.code || 'N/A';
      lines.push(`📍 *Dirección de Entrega:* ${address}`);
      lines.push(`🔐 *Código de Seguridad:* *${securityCode}*`);
      if (deliv.distanceKm || context.distanceKm) {
        const dist = Number(deliv.distanceKm || context.distanceKm).toFixed(1);
        lines.push(`📏 *Distancia Estimada:* ${dist} km`);
      }
      const lat = deliv.latitude || context.latitude;
      const lng = deliv.longitude || context.longitude;
      if (lat && lng) {
        lines.push(`🗺️ *Ubicación GPS:* https://www.google.com/maps?q=${lat},${lng}`);
      }
      const facade = deliv.housePhotoUrl || context.housePhotoUrl;
      if (facade) {
        lines.push(`🏠 *Foto de Fachada:* ${facade}`);
      }
    }

    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);

    let grandTotal = 0;
    orders.forEach((ord, index) => {
      grandTotal += (ord.total || 0);
      const estName = ord.establishmentName || (context.shopMap && context.shopMap[ord.establishmentId]?.name) || 'Restaurante';
      const orderCode = ord.id ? (ord.id.length > 8 ? ord.id.slice(-6).toUpperCase() : ord.id) : `${index + 1}`;

      lines.push(`🏪 *RESTAURANTE:* *${estName}*`);
      lines.push(`🆔 *Código de Comanda:* #${orderCode}`);
      lines.push(`🛒 *Artículos Solicitados:*`);

      const items = (ord.items && ord.items.length > 0) ? ord.items : (context.shopMap && context.shopMap[ord.establishmentId]?.items) || [];
      if (items && items.length > 0) {
        items.forEach(it => {
          const qty = it.quantity || 1;
          const itemName = it.name || it.product_name || (it.product && it.product.name) || 'Producto';
          const subtotalPrice = this.formatPesos(this.normalizeCopPrice(it.subtotal_combined || ((it.unit_total_calculated || it.price || 0) * qty)));
          lines.push(`  • *${qty}x ${itemName}* (${subtotalPrice})`);
          const specs = it.specifications || (it.selected_specifications ? this.getSpecsStringForKitchen(it.selected_specifications) : '');
          if (specs && specs.trim()) {
            lines.push(`    ↳ _${specs}_`);
          }
        });
      }

      if (ord.nightSurcharge && ord.nightSurcharge > 0) {
        lines.push(`  🌙 *Recargo Nocturno:* +${this.formatPesos(ord.nightSurcharge)}`);
      }

      lines.push(`💰 *Subtotal Comercio:* *${this.formatPesos(ord.total || 0)}*`);
      if (index < orders.length - 1) {
        lines.push(`---------------------`);
      }
    });

    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`💵 *DETALLES DEL PAGO:*`);
    lines.push(`💳 *Forma de Pago:* ${paymentMethod}`);
    if (paymentNotes) {
      lines.push(`📝 *Detalles:* ${paymentNotes}`);
    }
    const receipt = firstOrder.paymentReceiptUrl || context.paymentReceiptUrl;
    if (receipt) {
      lines.push(`📎 *Comprobante Adjunto:* ${receipt}`);
    }
    lines.push(`💰 *TOTAL A PAGAR:* *${this.formatPesos(grandTotal)}*`);

    try {
      if (this.copToUsdRate && this.copToUsdRate > 0) {
        const usdVal = (grandTotal / this.copToUsdRate).toFixed(2);
        lines.push(`💵 *Equivalente USD:* $${usdVal} USD`);
      }
      if (this.copToVesRate && this.copToVesRate > 0) {
        const vesVal = (grandTotal * this.copToVesRate).toFixed(2);
        lines.push(`🇻🇪 *Equivalente Bs:* ${vesVal} Bs`);
      }
    } catch(e) {}

    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`🧾 *Comanda generada automáticamente en el app del restaurante.*`);
    lines.push(`📍 *Enviado desde PediGochos App*`);
    lines.push(`💬 *Central WhatsApp Oficial: +57 322 794 9751*`);

    return lines.join('\n');
  }

  openOrderNoticeModal(data = {}) {
    const modal = document.getElementById('order-confirmation-notice-modal');
    const summaryEl = document.getElementById('order-notice-summary');
    const waBtn = document.getElementById('order-notice-wa-btn');

    if (summaryEl) {
      const stores = data.storeNames || (this.selectedEstablishment ? this.selectedEstablishment.name : 'el restaurante');
      const phoneTxt = data.phone ? `<div style="margin-bottom: 4px;">📱 <strong>Teléfono de contacto:</strong> ${data.phone}</div>` : '';
      const payTxt = data.paymentMethod ? `<div>💵 <strong>Método de pago:</strong> ${data.paymentMethod}${data.paymentNotes ? ` <span style="color:#FDE047;">(${data.paymentNotes})</span>` : ''}</div>` : '';
      const comandaTxt = `<div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed rgba(255,255,255,0.1); color: #34D399; font-weight: 700; font-size: 12px; display: flex; align-items: center; gap: 6px;"><span>🧾</span> Comanda enviada a la App del Restaurante con éxito</div>`;

      summaryEl.innerHTML = `
        <div style="margin-bottom: 4px;">🏪 <strong>Establecimiento:</strong> ${stores}</div>
        ${phoneTxt}
        ${payTxt}
        ${comandaTxt}
      `;
    }

    if (waBtn) {
      const waUrl = data.waUrl || 'https://wa.me/573227949751';
      waBtn.href = waUrl;
      waBtn.onclick = (e) => {
        try {
          if (window.Capacitor) {
            e.preventDefault();
            window.open(waUrl, '_system');
          }
        } catch(err) {}
      };
    }

    if (modal) {
      modal.classList.add('open');
      modal.style.setProperty('display', 'flex', 'important');
    }
  }

  closeOrderNoticeModal() {
    const modal = document.getElementById('order-confirmation-notice-modal');
    if (modal) {
      modal.classList.remove('open');
      modal.style.display = 'none';
    }
    this.openUserOrdersModal({ highlightFirst: true });
  }

  getSpecsStringForKitchen(specs) {
    const parts = [];
    if (specs.single_selections && specs.single_selections.length > 0) {
      specs.single_selections.forEach(sel => {
        parts.push(`${sel.group_name}: ${sel.chosen_option}`);
      });
    }
    if (specs.add_ons && specs.add_ons.length > 0) {
      specs.add_ons.forEach(add => {
        const qty = add.quantity || 1;
        const price = (add.price_per_unit || 0) * qty;
        const priceText = price > 0 ? ` (+${this.formatPesos(this.normalizeCopPrice(price))})` : '';
        parts.push(`+ ${qty}x ${add.name}${priceText}`);
      });
    }
    if (specs.exclusions && specs.exclusions.length > 0) {
      specs.exclusions.forEach(exc => {
        parts.push(`- ${exc.name}`);
      });
    }
    if (specs.special_notes) {
      parts.push(`Nota: ${specs.special_notes}`);
    }
    return parts.join(' | ');
  }

  normalizeCopPrice(val) {
    let num = parseFloat(val);
    if (isNaN(num) || num <= 0) return 0;
    // Fix any 500000 COP price error (e.g. 500 pesos mistakenly saved as 500000)
    if (num >= 100000) {
      num = Math.round(num / 1000);
    }
    // Restore original thousand-multiplier logic for products saved in thousands notation (e.g. 20 -> 20.000 COP, 7.5 -> 7.500 COP, 15 -> 15.000 COP)
    if (num < 1000) {
      if (num >= 100 && num <= 999 && Number.isInteger(num)) {
        return Math.round(num);
      }
      return Math.round(num * 1000);
    }
    return Math.round(num);
  }

  formatPesos(val) {
    if (isNaN(val) || val === null || val === undefined) return '$0';
    let num = this.normalizeCopPrice(val);
    return '$' + num.toLocaleString('de-DE');
  }

  handleNavBack() {
    // 1. If any modal is open, close all modals
    const openModal = document.querySelector('.modal-overlay.open');
    if (openModal) {
      this.closeAllModals();
      return;
    }
    // 2. If viewing an establishment, go home to categories list
    if (this.selectedEstablishment) {
      this.goHome();
      return;
    }
    // 3. Fallback history back
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.goHome();
    }
  }

  setActiveMobileTab(tabName) {
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
      item.classList.remove('active');
    });
    const activeBtn = document.getElementById(`m-nav-${tabName}`);
    if (activeBtn) {
      activeBtn.classList.add('active');
    }
  }

  // Utilities
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  showToast(message) {
    const toast = document.getElementById('toast');
    toast.innerText = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  handleSearch(event) {
    const query = event.target.value.toLowerCase().trim();
    if (!query) {
      this.renderEstablishments();
      return;
    }

    // Filter establishments that match query (or have matching products) and active location (excluding disabled)
    const filtered = this.establishments.filter(est => {
      if (est.disabled === true) return false;
      const matchLoc = !this.currentLocation || this.currentLocation === 'all' || !est.location ||
        (est.location || '').toLowerCase().includes(this.currentLocation.toLowerCase()) ||
        this.currentLocation.toLowerCase().includes((est.location || '').toLowerCase());
      if (!matchLoc) return false;
      const matchEst = (est.name || '').toLowerCase().includes(query) || (est.description || '').toLowerCase().includes(query);
      const matchProd = Array.isArray(est.products) && est.products.some(p => (p.name || '').toLowerCase().includes(query) || (p.description || '').toLowerCase().includes(query));
      return matchEst || matchProd;
    });

    this.renderEstablishments(filtered);
  }

  openTermsModal(e) {
    if (e) e.preventDefault();
    document.getElementById('terms-modal').classList.add('open');
    window.history.pushState({ view: 'modal', modalId: 'terms-modal' }, '');
  }

  closeTermsModal() {
    document.getElementById('terms-modal').classList.remove('open');
    document.getElementById('checkout-accept-terms').checked = true;
    if (window.history.state && window.history.state.view === 'modal' && window.history.state.modalId === 'terms-modal') {
      window.history.back();
    }
  }

  requestAutomaticGPS(showToast = false) {
    const display = document.getElementById('active-location-display');
    if (display) display.innerText = '📡 Detectando GPS...';

    if (!navigator.geolocation) {
      if (showToast) this.showToast('⚠️ Tu navegador o dispositivo no soporta geolocalización.');
      if (display) display.innerText = '📍 Marca tu ubicación';
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        this.userGpsLat = userLat;
        this.userGpsLng = userLng;
        this.selectedLatitude = userLat;
        this.selectedLongitude = userLng;

        try {
          localStorage.setItem('user_gps_lat', userLat.toString());
          localStorage.setItem('user_gps_lng', userLng.toString());
        } catch(e) {}

        if (display) {
          display.innerText = `📍 GPS (${userLat.toFixed(4)}, ${userLng.toFixed(4)})`;
        }

        const shopCenter = this.getActiveShopCenter();
        if (this.leafMap) {
          this.setUserLocationOnMap([userLat, userLng], shopCenter, true);
        }

        const modalTitle = document.getElementById('modal-gps-status-title');
        if (modalTitle) modalTitle.innerText = `GPS Activo (${userLat.toFixed(4)}, ${userLng.toFixed(4)})`;

        if (showToast) {
          this.showToast(`🎯 ¡Ubicación GPS detectada con éxito!`);
        }
      },
      (err) => {
        console.warn('GPS error / permission denied:', err);
        const cachedLat = localStorage.getItem('user_gps_lat');
        const cachedLng = localStorage.getItem('user_gps_lng');
        if (cachedLat && cachedLng) {
          const latNum = parseFloat(cachedLat);
          const lngNum = parseFloat(cachedLng);
          this.userGpsLat = latNum;
          this.userGpsLng = lngNum;
          this.selectedLatitude = latNum;
          this.selectedLongitude = lngNum;
          if (display) display.innerText = `📍 GPS (${latNum.toFixed(4)}, ${lngNum.toFixed(4)})`;
          const shopCenter = this.getActiveShopCenter();
          if (this.leafMap) {
            this.setUserLocationOnMap([latNum, lngNum], shopCenter, true);
          }
        } else {
          if (display) display.innerText = '📍 Marca tu ubicación';
        }
        if (showToast) {
          this.showToast('⚠️ No se pudo obtener GPS automáticamente. Puedes tocar tu ubicación en el mapa al hacer tu pedido.', true);
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  openLocationModal() {
    this.requestAutomaticGPS(true);
    const modal = document.getElementById('location-modal');
    if (modal) {
      this.closeAllModals();
      modal.classList.add('open');
      modal.style.setProperty('display', 'flex', 'important');
      window.history.pushState({ view: 'modal', modalId: 'location-modal' }, '');
    }
  }

  closeLocationModal() {
    const modal = document.getElementById('location-modal');
    if (modal) modal.classList.remove('open');
    if (window.history.state && window.history.state.view === 'modal' && window.history.state.modalId === 'location-modal') {
      window.history.back();
    }
  }

  setLocation(location) {
    this.currentLocation = location;
    localStorage.setItem('selected_location', location);
    this.closeLocationModal();
    this.renderEstablishments();
  }

  closeAllModals() {
    ['cart-modal', 'location-modal', 'terms-modal', 'customizer-modal', 'services-menu-modal', 'sos-menu-modal', 'merchant-register-modal'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.remove('open');
        el.classList.remove('active');
        el.style.display = 'none';
        // Reset properties in case they were set inline
        el.style.opacity = '';
        el.style.visibility = '';
        el.style.pointerEvents = '';
      }
    });
  }

  handlePopState(event) {
    const state = event.state;
    
    this.closeAllModals();

    if (!state || state.view === 'home') {
      this.goHome(false);
    } else if (state.view === 'establishment') {
      if (state.estId) {
        this.openEstablishment(state.estId, false);
      } else {
        this.goHome(false);
      }
    } else if (state.view === 'modal') {
      const modal = document.getElementById(state.modalId);
      if (modal) {
        modal.classList.add('open');
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
        modal.style.pointerEvents = 'auto';
      }
    }
  }

  showLocationTutorial() {
    const target = document.querySelector('.delivery-address-area');
    if (!target) return;

    target.classList.add('pulse-effect');

    const tooltip = document.createElement('div');
    tooltip.className = 'tutorial-tooltip';
    tooltip.id = 'location-tutorial-tooltip';
    tooltip.innerHTML = `
      <div class="tutorial-tooltip-header">📍 ¡Selecciona tu zona!</div>
      <p style="margin: 0; font-size: 12px; font-weight: 500;">Haz clic aquí para cambiar tu pueblo y ver los establecimientos de tu zona: San Antonio, Ureña o San Cristóbal.</p>
      <button class="tutorial-tooltip-btn" onclick="MarketplaceApp.dismissLocationTutorial(event)">Entendido</button>
    `;

    const originalPosition = window.getComputedStyle(target).position;
    if (originalPosition === 'static') {
      target.style.position = 'relative';
    }

    target.appendChild(tooltip);

    // Auto-dismiss after 3 seconds
    if (this.tutorialTimer) clearTimeout(this.tutorialTimer);
    this.tutorialTimer = setTimeout(() => {
      this.dismissLocationTutorial();
    }, 3000);
  }

  dismissLocationTutorial(event) {
    if (event) event.stopPropagation();
    const tooltip = document.getElementById('location-tutorial-tooltip');
    if (tooltip) {
      tooltip.remove();
    }
    const target = document.querySelector('.delivery-address-area');
    if (target) {
      target.classList.remove('pulse-effect');
    }
    localStorage.setItem('location_tutorial_seen', 'true');
  }

  toggleDeliveryMap() {
    const container = document.getElementById('checkout-map-container');
    if (!container) return;

    if (container.classList.contains('hidden')) {
      container.classList.remove('hidden');
      setTimeout(() => {
        this.initLeafletMap();
      }, 200);
    } else {
      container.classList.add('hidden');
    }
  }

  createStoreMarkerIcon(est) {
    if (typeof L === 'undefined') return null;
    const photoUrl = est ? (est.logoImage || est.map_pin_image || null) : null;
    
    if (photoUrl) {
      return L.divIcon({
        className: 'custom-store-photo-marker',
        html: `<div style="background: #ffffff; width: 42px; height: 42px; border-radius: 50%; padding: 2px; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.6); border: 3px solid #3B82F6; display: flex; align-items: center; justify-content: center; overflow: hidden;"><img src="${photoUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block;"></div>`,
        iconSize: [42, 42],
        iconAnchor: [21, 21]
      });
    }

    const emoji = est ? (est.logo || '🏪') : '🏪';
    return L.divIcon({
      className: 'custom-rest-marker',
      html: `<div style="background-color: #3B82F6; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.4); border: 2px solid white;">${emoji}</div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
  }

  calculateShopDeliveryFee(distanceKm, baseStoreFee = 5000) {
    const minFee = Math.max(5000, parseInt(baseStoreFee, 10) || 5000);
    if (distanceKm === null || distanceKm === undefined || isNaN(distanceKm)) {
      return minFee;
    }
    const dist = parseFloat(distanceKm);
    // Distancia base que cubre la tarifa mínima de $5.000 COP (reducida de 2.5 km a 1.0 km)
    const baseDistanceLimit = 1.0;
    if (dist <= baseDistanceLimit) {
      return minFee;
    }
    // A partir de 1.0 km: tarifa base + $1.500 COP por cada km adicional (redondeado a la centena más cercana)
    const extraKm = dist - baseDistanceLimit;
    const extraFee = Math.round((extraKm * 1500) / 100) * 100;
    return minFee + extraFee;
  }

  getActiveShopCenter() {
    // Determine distance directly from the specific Restaurant's own registered GPS coordinates
    let est = this.selectedEstablishment;
    if (!est && this.cart && this.cart.items && this.cart.items.length > 0) {
      const shopId = this.cart.items[0].restaurant_id || this.cart.items[0].establishmentId;
      est = this.establishments.find(e => e.id === shopId);
    }
    if (est) {
      const lat = (est.location_lat !== undefined && est.location_lat !== null) 
        ? est.location_lat 
        : est.latitude;
      const lng = (est.location_lng !== undefined && est.location_lng !== null) 
        ? est.location_lng 
        : est.longitude;
      if (lat !== undefined && lat !== null && lng !== undefined && lng !== null && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
        return [parseFloat(lat), parseFloat(lng)];
      }
    }
    // Default fallback to city center coordinates
    return this.locationCenters[this.currentLocation] || [7.8145, -72.4430];
  }

  initLeafletMap() {
    if (typeof L === 'undefined') {
      console.error('Leaflet is not loaded yet');
      return;
    }

    // Determine Restaurant Origin Coordinates
    const shopCenter = this.getActiveShopCenter();

    if (this.leafMap) {
      this.leafMap.invalidateSize();
      this.fetchUserGPSLocation(shopCenter);
      return;
    }

    // Initialize Leaflet map centered at User GPS if available, otherwise Restaurant location
    const initialCenter = (this.selectedLatitude && this.selectedLongitude)
      ? [this.selectedLatitude, this.selectedLongitude]
      : shopCenter;

    this.leafMap = L.map('checkout-leaflet-map').setView(initialCenter, 15);

    // OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(this.leafMap);

    // 1. Create Restaurant Origin Marker
    const storeIcon = this.createStoreMarkerIcon(this.selectedEstablishment || { name: 'Restaurante', logo: '🏪' });
    this.sedeMarker = L.marker(shopCenter, { icon: storeIcon, draggable: false }).addTo(this.leafMap);
    const storeName = this.selectedEstablishment ? this.selectedEstablishment.name : 'Restaurante';
    this.sedeMarker.bindPopup(`<b>🏪 Restaurante: ${storeName}</b><br><small>Origen del Domicilio</small>`);

    // 2. Create User Destination Location Marker (Interactive / Draggable with radar effect)
    const userIcon = L.divIcon({
      className: 'custom-user-marker',
      html: `<div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
               <div style="position: absolute; width: 40px; height: 40px; background: rgba(239, 68, 68, 0.3); border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
               <div style="position: relative; background-color: #EF4444; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 17px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.5); border: 2.5px solid white; cursor: grab;">📍</div>
             </div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    const markerPos = (this.selectedLatitude && this.selectedLongitude)
      ? [this.selectedLatitude, this.selectedLongitude]
      : shopCenter;

    this.leafMarker = L.marker(markerPos, { icon: userIcon, draggable: true }).addTo(this.leafMap);

    this.leafMarker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      this.setUserLocationOnMap([pos.lat, pos.lng], shopCenter, true);
    });

    this.leafMap.on('click', (e) => {
      this.setUserLocationOnMap([e.latlng.lat, e.latlng.lng], shopCenter, true);
    });

    if (this.selectedLatitude && this.selectedLongitude) {
      this.setUserLocationOnMap([this.selectedLatitude, this.selectedLongitude], shopCenter, true);
    } else {
      this.fetchUserGPSLocation(shopCenter);
    }
  }

  setDeliveryZone(zoneKey) {
    // Deprecated in favor of exact GPS pin positioning
  }

  onAddressInput(val) {
    // Just accepts typed address text (e.g. Calle, Casa, Referencia)
  }

  fetchUserGPSLocation(shopCenter) {
    const distSpan = document.getElementById('map-calc-distance');
    if (distSpan) distSpan.innerText = '📡 Obteniendo GPS...';

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userLat = pos.coords.latitude;
          const userLng = pos.coords.longitude;
          this.userGpsLat = userLat;
          this.userGpsLng = userLng;
          this.setUserLocationOnMap([userLat, userLng], shopCenter, true);
        },
        (err) => {
          console.warn('Geolocation error or denied:', err);
          const cachedLat = localStorage.getItem('user_gps_lat');
          const cachedLng = localStorage.getItem('user_gps_lng');
          if (cachedLat && cachedLng) {
            this.setUserLocationOnMap([parseFloat(cachedLat), parseFloat(cachedLng)], shopCenter, true);
          } else {
            const fallbackUserPos = [shopCenter[0] + 0.005, shopCenter[1] + 0.005];
            this.setUserLocationOnMap(fallbackUserPos, shopCenter, false);
            if (distSpan) {
              distSpan.innerHTML = `⚠️ Toca en el mapa tu ubicación exacta`;
            }
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      const fallbackUserPos = [shopCenter[0] + 0.005, shopCenter[1] + 0.005];
      this.setUserLocationOnMap(fallbackUserPos, shopCenter, false);
    }
  }

  setUserLocationOnMap(userPos, shopCenter, isRealGps, sectorName = null) {
    const lat = userPos[0];
    const lng = userPos[1];

    this.selectedLatitude = lat;
    this.selectedLongitude = lng;

    const latInp = document.getElementById('order-lat');
    if (latInp) latInp.value = lat;
    const lngInp = document.getElementById('order-lng');
    if (lngInp) lngInp.value = lng;

    const coordsSpan = document.getElementById('map-pin-coords');
    if (coordsSpan) {
      coordsSpan.innerText = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }

    if (this.leafMarker) {
      this.leafMarker.setLatLng(userPos);
    }

    // Draw GREEN line connecting Sede to User
    if (this.connectionLine) {
      this.leafMap.removeLayer(this.connectionLine);
    }
    this.connectionLine = L.polyline([shopCenter, userPos], {
      color: '#10B981',
      weight: 4,
      dashArray: '6, 8'
    }).addTo(this.leafMap);

    // Fit map bounds so BOTH Sede (Green) and User (Pin) + Line are visible
    if (this.leafMap) {
      const bounds = L.latLngBounds([shopCenter, userPos]);
      this.leafMap.fitBounds(bounds, { padding: [35, 35] });
    }

    // Calculate exact geodesic distance
    const distance = this.calculateGeodesicDistance(lat, lng, shopCenter[0], shopCenter[1]);
    this.calculatedDistanceKm = parseFloat(distance.toFixed(2));

    const distInp = document.getElementById('order-distance');
    if (distInp) distInp.value = this.calculatedDistanceKm;

    const distSpan = document.getElementById('map-calc-distance');
    if (distSpan) {
      const labelPrefix = sectorName ? `📍 ${sectorName}: ` : (isRealGps ? `📍 GPS: ` : `📍 `);
      distSpan.innerText = `${labelPrefix}${this.calculatedDistanceKm} km`;
    }

    this.renderCartItems();
  }

  updateDeliveryCoordinates(lat, lng) {
    const shopCenter = this.getActiveShopCenter();
    this.setUserLocationOnMap([lat, lng], shopCenter, true);
  }

  calculateGeodesicDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toggleGroupCollapse(targetId, titleElement) {
    const target = document.getElementById(targetId);
    if (!target) return;

    if (!this.customizerState) {
      this.customizerState = {};
    }
    if (!this.customizerState.collapsedGroups) {
      this.customizerState.collapsedGroups = {};
    }

    const chevron = titleElement ? titleElement.querySelector('.collapse-chevron') : null;
    
    if (target.classList.contains('collapsed')) {
      target.classList.remove('collapsed');
      this.customizerState.collapsedGroups[targetId] = false;
      if (chevron) chevron.style.transform = 'rotate(0deg)';
    } else {
      target.classList.add('collapsed');
      this.customizerState.collapsedGroups[targetId] = true;
      if (chevron) chevron.style.transform = 'rotate(-90deg)';
    }
  }

  toggleBaseIngredientSelection(itemName, sideKey) {
    const key = 'base_' + itemName;
    const current = this.customizerState.quantities[sideKey][key] || 0;
    this.customizerState.quantities[sideKey][key] = (current === 0) ? 1 : 0;
    this.renderCustomizerModifiers();
  }

  async loadSystemSettings() {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        this.systemSettings = await res.json();
      }
    } catch (e) {
      console.warn('Could not load system settings:', e);
    }
  }

  dismissActiveOrderTracking() {
    localStorage.removeItem('active_order_id');
    this.isTrackingMinimized = false;
    if (this.trackingTimer) {
      clearTimeout(this.trackingTimer);
      this.trackingTimer = null;
    }
    const card = document.getElementById('active-order-tracking-card');
    if (card) card.classList.add('hidden');
    const pill = document.getElementById('active-order-minimized-pill');
    if (pill) pill.classList.add('hidden');
  }

  minimizeActiveOrderTracking() {
    this.isTrackingMinimized = true;
    const card = document.getElementById('active-order-tracking-card');
    if (card) card.classList.add('hidden');
    const pill = document.getElementById('active-order-minimized-pill');
    if (pill) pill.classList.remove('hidden');
    this.showToast('ℹ️ Mapa minimizado. Toca la barra flotante para volver a verlo.');
  }

  expandActiveOrderTracking() {
    this.isTrackingMinimized = false;
    const pill = document.getElementById('active-order-minimized-pill');
    if (pill) pill.classList.add('hidden');
    const card = document.getElementById('active-order-tracking-card');
    if (card) {
      card.classList.remove('hidden');
      if (this.trackingMap) {
        setTimeout(() => this.trackingMap.invalidateSize(), 150);
      }
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  checkActiveOrderTracking() {
    const activeOrderId = localStorage.getItem('active_order_id');
    const card = document.getElementById('active-order-tracking-card');
    const pill = document.getElementById('active-order-minimized-pill');

    if (!activeOrderId) {
      if (card) card.classList.add('hidden');
      if (pill) pill.classList.add('hidden');
      return;
    }

    if (this.isTrackingMinimized) {
      if (card) card.classList.add('hidden');
      if (pill) pill.classList.remove('hidden');
    } else {
      if (card) card.classList.remove('hidden');
      if (pill) pill.classList.add('hidden');
    }
    this.pollActiveOrder(activeOrderId);
  }

  trackActiveOrder(orderId) {
    localStorage.setItem('active_order_id', orderId);
    this.isTrackingMinimized = false;
    this.goHome();
    this.checkActiveOrderTracking();
    const card = document.getElementById('active-order-tracking-card');
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  openCancelRequestModal(orderId) {
    const targetOrderId = orderId || localStorage.getItem('active_order_id');
    if (!targetOrderId) return;

    let userOrders = this.getUserOrdersHistory();
    let order = userOrders.find(o => String(o.id) === String(targetOrderId));

    // Try fetching fresh order from server if possible
    fetch('/api/orders')
      .then(res => res.json())
      .then(orders => {
        const fresh = orders.find(o => String(o.id) === String(targetOrderId));
        if (fresh) order = fresh;
        this.renderCancelRequestModalContent(targetOrderId, order);
      })
      .catch(() => {
        this.renderCancelRequestModalContent(targetOrderId, order);
      });
  }

  renderCancelRequestModalContent(orderId, order) {
    const modal = document.getElementById('order-cancel-request-modal');
    if (!modal) return;

    this.pendingCancelOrderId = orderId;
    this.pendingCancelOrderObj = order;

    const status = order ? (order.status || 'Pendiente') : 'Pendiente';
    if (status === 'Entregado') {
      alert('✅ Este pedido ya fue entregado con éxito.');
      return;
    }
    if (status === 'Cancelado') {
      alert('❌ Este pedido ya se encuentra cancelado.');
      return;
    }

    const estName = order ? (order.establishmentName || order.restaurant_name || 'Restaurante') : 'Restaurante';
    const codeStr = String(orderId).slice(-6).toUpperCase();
    const totalVal = order ? (order.total || order.unit_total_calculated || 0) : 0;
    const totalStr = this.formatPesos(this.normalizeCopPrice(totalVal));

    const summaryBox = document.getElementById('cancel-order-summary-box');
    if (summaryBox) {
      summaryBox.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="font-size: 13.5px; font-weight: 900; color: #FFF;">📦 Pedido #${codeStr}</span>
          <span style="font-size: 11px; font-weight: 800; background: rgba(245, 158, 11, 0.2); color: #FCD34D; border: 1px solid #F59E0B; padding: 2px 7px; border-radius: 6px;">
            ${status}
          </span>
        </div>
        <div style="font-size: 12px; color: #94A3B8; line-height: 1.5;">
          🏪 <strong>Restaurante:</strong> <span style="color: #FFF;">${estName}</span><br>
          💵 <strong>Total:</strong> <span style="color: var(--primary); font-weight: 800;">${totalStr}</span>
        </div>
      `;
    }

    // Reset input and chips
    const reasonInput = document.getElementById('cancel-request-reason-input');
    if (reasonInput) reasonInput.value = '';

    document.querySelectorAll('.btn-cancel-chip').forEach(btn => {
      btn.style.background = 'rgba(255,255,255,0.06)';
      btn.style.borderColor = 'rgba(255,255,255,0.12)';
      btn.style.color = '#E2E8F0';
    });

    modal.classList.add('open');
    modal.style.setProperty('display', 'flex', 'important');
  }

  closeCancelRequestModal() {
    const modal = document.getElementById('order-cancel-request-modal');
    if (modal) {
      modal.classList.remove('open');
      modal.style.setProperty('display', 'none', 'important');
    }
    this.pendingCancelOrderId = null;
    this.pendingCancelOrderObj = null;
  }

  selectCancelReason(reasonText) {
    const reasonInput = document.getElementById('cancel-request-reason-input');
    if (reasonInput) reasonInput.value = reasonText;

    document.querySelectorAll('.btn-cancel-chip').forEach(btn => {
      if (btn.innerText.includes(reasonText)) {
        btn.style.background = 'rgba(245, 158, 11, 0.25)';
        btn.style.borderColor = '#F59E0B';
        btn.style.color = '#FCD34D';
      } else {
        btn.style.background = 'rgba(255,255,255,0.06)';
        btn.style.borderColor = 'rgba(255,255,255,0.12)';
        btn.style.color = '#E2E8F0';
      }
    });
  }

  sendCancellationToWhatsAppSupport() {
    const orderId = this.pendingCancelOrderId || localStorage.getItem('active_order_id');
    const order = this.pendingCancelOrderObj;
    const reasonInput = document.getElementById('cancel-request-reason-input');
    const reason = (reasonInput && reasonInput.value.trim()) ? reasonInput.value.trim() : 'Solicitud directa del cliente';

    const estName = order ? (order.establishmentName || order.restaurant_name || 'Restaurante') : 'Restaurante';
    const codeStr = orderId ? String(orderId).slice(-6).toUpperCase() : 'N/A';
    const statusStr = order ? (order.status || 'Pendiente') : 'Pendiente';
    const custName = order ? (order.deliveryDetails?.name || order.customerName || 'Cliente') : 'Cliente';
    const totalVal = order ? (order.total || order.unit_total_calculated || 0) : 0;
    const totalStr = this.formatPesos(this.normalizeCopPrice(totalVal));

    const message = `¡Hola *${estName}*! 👋 Saludos de Central PediGochos.\n\n` +
      `El cliente solicita la *CANCELACIÓN* de su pedido:\n\n` +
      `📦 *Pedido:* #${codeStr}\n` +
      `👤 *Cliente:* ${custName}\n` +
      `💵 *Monto:* ${totalStr}\n` +
      `📊 *Estado en sistema:* ${statusStr}\n` +
      `📝 *Motivo del cliente:* ${reason}\n\n` +
      `¿Por favor nos confirman si en cocina aún *NO* han preparado este pedido o si ya es muy tarde para cancelarlo? 🙏`;

    const supportPhone = '573227949751';
    const waUrl = `https://wa.me/${supportPhone}?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank');

    this.closeCancelRequestModal();
    this.showToast('💬 Mensaje listo para enviar a Soporte PediGochos.');
  }

  async copyCancellationMessage() {
    const orderId = this.pendingCancelOrderId || localStorage.getItem('active_order_id');
    const order = this.pendingCancelOrderObj;
    const reasonInput = document.getElementById('cancel-request-reason-input');
    const reason = (reasonInput && reasonInput.value.trim()) ? reasonInput.value.trim() : 'Solicitud directa del cliente';

    const estName = order ? (order.establishmentName || order.restaurant_name || 'Restaurante') : 'Restaurante';
    const codeStr = orderId ? String(orderId).slice(-6).toUpperCase() : 'N/A';
    const statusStr = order ? (order.status || 'Pendiente') : 'Pendiente';
    const custName = order ? (order.deliveryDetails?.name || order.customerName || 'Cliente') : 'Cliente';
    const totalVal = order ? (order.total || order.unit_total_calculated || 0) : 0;
    const totalStr = this.formatPesos(this.normalizeCopPrice(totalVal));

    const message = `¡Hola *${estName}*! 👋 Saludos de Central PediGochos.\n\n` +
      `El cliente solicita la *CANCELACIÓN* de su pedido:\n\n` +
      `📦 *Pedido:* #${codeStr}\n` +
      `👤 *Cliente:* ${custName}\n` +
      `💵 *Monto:* ${totalStr}\n` +
      `📊 *Estado en sistema:* ${statusStr}\n` +
      `📝 *Motivo del cliente:* ${reason}\n\n` +
      `¿Por favor nos confirman si en cocina aún *NO* han preparado este pedido o si ya es muy tarde para cancelarlo? 🙏`;

    try {
      await navigator.clipboard.writeText(message);
      this.showToast('📋 ¡Mensaje para el restaurante copiado al portapapeles!');
    } catch(err) {
      this.showToast('📋 Mensaje preparado');
    }
  }

  async pollActiveOrder(orderId) {
    try {
      const res = await fetch('/api/orders');
      if (!res.ok) return;
      const orders = await res.json();
      const order = orders.find(o => String(o.id) === String(orderId));
      
      const badge = document.getElementById('active-order-status-badge');
      const text = document.getElementById('active-order-info-text');
      const card = document.getElementById('active-order-tracking-card');
      const pill = document.getElementById('active-order-minimized-pill');
      const pillStatus = document.getElementById('minimized-pill-status');
      const cancelBtn = document.getElementById('active-order-cancel-btn');

      if (!order) {
        if (card) card.classList.add('hidden');
        if (pill) pill.classList.add('hidden');
        return;
      }

      const status = order.status || 'Pendiente';
      
      if (badge) {
        if (status === 'Pendiente') {
          badge.innerText = '⏳ Pendiente';
          badge.style.background = 'rgba(234, 179, 8, 0.2)';
          badge.style.color = '#eab308';
          if (text) text.innerText = `👨‍🍳 El restaurante (${order.establishmentName}) está recibiendo tu pedido...`;
          if (cancelBtn) cancelBtn.style.display = 'inline-flex';
        } else if (status === 'En Cocina' || status === 'En Preparacion' || status === 'En preparación' || status === 'Preparando') {
          badge.innerText = '👨‍🍳 Cocinando en Tienda';
          badge.style.background = 'rgba(59, 130, 246, 0.2)';
          badge.style.color = '#3b82f6';
          if (text) text.innerText = `🔥 ¡Tu pedido se está preparando en la cocina de ${order.establishmentName}!`;
          if (cancelBtn) cancelBtn.style.display = 'inline-flex';
        } else if (status === 'En Camino' || status === 'En camino' || status === 'Listo') {
          badge.innerText = '🚴 En Camino';
          badge.style.background = 'rgba(16, 185, 129, 0.2)';
          badge.style.color = '#10b981';
          if (text) text.innerText = `🛵 ¡El repartidor lleva tu pedido de ${order.establishmentName} en camino hacia tu dirección!`;
          if (cancelBtn) cancelBtn.style.display = 'none'; // Dispatched, hide cancel
        } else if (status === 'Entregado') {
          badge.innerText = '✅ Entregado';
          badge.style.background = 'rgba(16, 185, 129, 0.3)';
          badge.style.color = '#10b981';
          if (text) text.innerText = `🎉 ¡Pedido entregado con éxito! Buen provecho.`;
          if (cancelBtn) cancelBtn.style.display = 'none';
          setTimeout(() => {
            this.dismissActiveOrderTracking();
          }, 15000);
        } else if (status === 'Cancelado') {
          badge.innerText = '❌ Cancelado';
          badge.style.background = 'rgba(239, 68, 68, 0.2)';
          badge.style.color = '#ef4444';
          if (text) text.innerText = `❌ Este pedido fue cancelado. ${order.cancelReason ? `(${order.cancelReason})` : ''}`;
          if (cancelBtn) cancelBtn.style.display = 'none';
          setTimeout(() => {
            this.dismissActiveOrderTracking();
          }, 8000);
        }
      }

      if (pillStatus && badge) {
        pillStatus.innerText = badge.innerText;
        pillStatus.style.color = badge.style.color;
      }

      // Render Tracking Map for Active Order
      this.renderTrackingMap(order);

      // Continue polling if not finished yet
      if (status !== 'Entregado' && status !== 'Cancelado') {
        if (this.trackingTimer) clearTimeout(this.trackingTimer);
        this.trackingTimer = setTimeout(() => this.pollActiveOrder(orderId), 4000);
      }
    } catch (e) {
      console.warn('Error polling active order:', e);
    }
  }

  renderTrackingMap(order) {
    if (typeof L === 'undefined') return;
    const mapElem = document.getElementById('active-order-tracking-map');
    if (!mapElem) return;

    // Find restaurant coordinates
    let estCoords = [7.8131, -72.4439];
    if (this.establishments) {
      const est = this.establishments.find(e => e.id === order.establishmentId);
      if (est) {
        const lat = est.location_lat || est.latitude;
        const lng = est.location_lng || est.longitude;
        if (lat && lng) estCoords = [parseFloat(lat), parseFloat(lng)];
      }
    }

    // Customer coordinates
    let custCoords = [estCoords[0] + 0.005, estCoords[1] + 0.005];
    if (order.deliveryDetails && order.deliveryDetails.latitude && order.deliveryDetails.longitude) {
      custCoords = [parseFloat(order.deliveryDetails.latitude), parseFloat(order.deliveryDetails.longitude)];
    }

    if (!this.trackingMap) {
      this.trackingMap = L.map('active-order-tracking-map').setView(estCoords, 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(this.trackingMap);
    } else {
      this.trackingMap.invalidateSize();
    }

    // Clear previous tracking layers
    if (this.trackingLayers) {
      this.trackingLayers.forEach(layer => this.trackingMap.removeLayer(layer));
    }
    this.trackingLayers = [];

    // 1. Restaurant Marker (Sede Comercial con foto personalizada)
    let targetEst = null;
    if (this.establishments) {
      targetEst = this.establishments.find(e => e.id === order.establishmentId);
    }
    const restIcon = this.createStoreMarkerIcon(targetEst || { name: order.establishmentName, logo: '🏪' });
    const restMarker = L.marker(estCoords, { icon: restIcon }).addTo(this.trackingMap);
    restMarker.bindPopup(`<b>🏪 Sede Comercial: ${order.establishmentName || 'Tienda'}</b>`);
    this.trackingLayers.push(restMarker);

    // 2. Customer Marker (Casa)
    const custIcon = L.divIcon({
      className: 'custom-cust-marker',
      html: `<div style="background-color: #FF5E3A; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 4px 10px rgba(255, 94, 58, 0.4); border: 2px solid white;">🏠</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
    const custMarker = L.marker(custCoords, { icon: custIcon }).addTo(this.trackingMap);
    custMarker.bindPopup(`<b>Entrega: ${order.customerName || 'Cliente'}</b>`);
    this.trackingLayers.push(custMarker);

    // 3. Driver / Progress Position
    const status = order.status || 'Pendiente';
    if (status === 'En Camino' || status === 'En camino' || status === 'Listo') {
      const driverCoords = [ (estCoords[0] + custCoords[0]) / 2, (estCoords[1] + custCoords[1]) / 2 ];
      const driverIcon = L.divIcon({
        className: 'custom-driver-marker',
        html: `<div style="background-color: #10B981; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.5); border: 2px solid white;">🚴</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });
      const driverMarker = L.marker(driverCoords, { icon: driverIcon }).addTo(this.trackingMap);
      driverMarker.bindPopup(`<b>Repartidor en camino 🛵</b>`);
      this.trackingLayers.push(driverMarker);
    }

    // Connecting Polyline
    const line = L.polyline([estCoords, custCoords], { color: '#3B82F6', weight: 4, dashArray: '6, 8' }).addTo(this.trackingMap);
    this.trackingLayers.push(line);

    // Fit bounds
    const bounds = L.latLngBounds([estCoords, custCoords]);
    this.trackingMap.fitBounds(bounds, { padding: [30, 30] });
  }

  // GochoPoints & Coupon Methods
  updateGochoPointsDisplay() {
    const valSpan = document.getElementById('header-gochopoints-val');
    if (valSpan) valSpan.innerText = this.gochoPoints;
    const modalSpan = document.getElementById('modal-gochopoints-total');
    if (modalSpan) modalSpan.innerText = `${this.gochoPoints} Pts`;
  }

  openGochoPointsModal() {
    this.updateGochoPointsDisplay();
    const modal = document.getElementById('gochopoints-modal');
    if (modal) modal.classList.add('active');
  }

  closeGochoPointsModal() {
    const modal = document.getElementById('gochopoints-modal');
    if (modal) modal.classList.remove('active');
  }

  addGochoPoints(amount) {
    this.gochoPoints += amount;
    localStorage.setItem('gocho_points', this.gochoPoints.toString());
    this.updateGochoPointsDisplay();
  }

  redeemReward(rewardType, pointsCost) {

    if (this.gochoPoints < pointsCost) {

      alert("⚠️ Necesitas " + pointsCost + " Pts para canjear esta recompensa. Tu saldo actual es de " + this.gochoPoints + " Pts.");

      return;

    }

    this.gochoPoints -= pointsCost;

    localStorage.setItem('gocho_points', this.gochoPoints.toString());

    this.updateGochoPointsDisplay();

    this.closeGochoPointsModal();

    this.showToast('🎉 ¡Recompensa canjeada con éxito!');

  }

  applyCouponCode() {
    // Cupones desactivados
  }



  isEstablishmentOpen(est) {
    if (!est) return true;
    if (est.disabled) return false;

    // Working Days Schedule Check
    const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const todayName = daysOfWeek[new Date().getDay()];
    if (Array.isArray(est.working_days) && est.working_days.length > 0) {
      if (!est.working_days.includes(todayName)) {
        return false; // Closed today based on working_days schedule calendar
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
        return 1440; // 12:00 AM Midnight (24:00) is end of day
      }
      return h * 60 + m;
    };

    let openMin = parseMinutes(openTime);
    let closeMin = parseMinutes(closeTime);

    if (openMin <= closeMin) {
      return currentMinutes >= openMin && currentMinutes <= closeMin;
    } else {
      // Overnight wrap-around (e.g. 17:00 to 02:00)
      return currentMinutes >= openMin || currentMinutes <= closeMin;
    }
  }

  formatTime12h(timeStr) {
    if (!timeStr) return '5:00 PM';
    const parts = timeStr.split(':');
    let h = parseInt(parts[0], 10) || 0;
    let m = parseInt(parts[1], 10) || 0;
    
    if (h === 0 && m === 0) return '12:00 AM (Medianoche)';
    if (h === 12 && m === 0) return '12:00 PM (Mediodía)';
    if (h === 24) return '12:00 AM (Medianoche)';
    
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    const mStr = m < 10 ? '0' + m : m;
    return `${h}:${mStr} ${ampm}`;
  }

  // Web Push Notifications
  async initPushNotifications() {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      if (Notification.permission === 'default') {
        setTimeout(() => {
          try {
            const res = Notification.requestPermission();
            if (res && typeof res.then === 'function') {
              res.then(permission => {
                if (permission === 'granted') {
                  console.log('🔔 Web Push notification permission GRANTED');
                }
              }).catch(() => {});
            }
          } catch(e) {}
        }, 5000);
      }
    }
  }

  sendPushNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        if (navigator.serviceWorker && navigator.serviceWorker.ready) {
          navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(title, {
              body: body,
              icon: '/images/logo-pedigochos.png',
              badge: '/images/logo-pedigochos.png',
              vibrate: [200, 100, 200]
            });
          });
        } else {
          new Notification(title, { body: body, icon: '/images/logo-pedigochos.png' });
        }
      } catch(e) {
        console.warn('Local push notification fallback:', e);
      }
    }
  }

  // ========================================================
  // CUSTOMER ORDER STATUS NOTIFICATIONS & RIDE PROMO LOGIC
  // ========================================================

  handleCustomerOrderStatusUpdate(order, previousStatus = null) {
    if (!order) return;
    const newStatus = String(order.status || '').trim();
    if (!newStatus || newStatus === previousStatus) return;

    console.log(`🔔 Customer order status transition: #${order.id} ${previousStatus || 'inicial'} -> ${newStatus}`);

    const est = this.establishments.find(e => String(e.id) === String(order.establishmentId || order.establishment_id));
    const estName = est ? est.name : (order.establishmentName || 'Restaurante');
    const orderIdShort = String(order.id).slice(-4);

    let title = '';
    let body = '';
    let icon = '🔔';
    let statusClass = 'status-default';

    switch (newStatus) {
      case 'Preparando':
      case 'Aceptado':
        title = `👨‍🍳 ¡Pedido Aceptado! (#${orderIdShort})`;
        body = `El restaurante ${estName} ha aceptado tu pedido y comenzó su preparación en cocina.`;
        icon = '👨‍🍳';
        statusClass = 'status-preparando';
        // Show "¿Necesitas trasladarte?" promo notification banner
        this.showRidePromoNotification();
        break;

      case 'Listo':
        title = `📦 ¡Tu Pedido está Listo! (#${orderIdShort})`;
        body = order.orderType === 'mesa'
          ? `Tu pedido en ${estName} ya está servido en tu mesa. ¡Buen provecho!`
          : `El pedido en ${estName} está empacado y listo para despacho o retiro.`;
        icon = '📦';
        statusClass = 'status-listo';
        break;

      case 'En Camino':
        const driverName = order.driver && order.driver.name ? order.driver.name : null;
        title = `🛵 ¡Tu Pedido va en Camino! (#${orderIdShort})`;
        body = driverName
          ? `${driverName} va en ruta hacia tu dirección con tu pedido de ${estName}.`
          : `Tu domiciliario va en camino hacia tu dirección con tu pedido de ${estName}.`;
        icon = '🛵';
        statusClass = 'status-en-camino';
        break;

      case 'Entregado':
      case 'completed':
        title = `🎉 ¡Pedido Entregado! (#${orderIdShort})`;
        body = `Tu pedido de ${estName} fue entregado con éxito. ¡Gracias por preferir PediGochos!`;
        icon = '🎉';
        statusClass = 'status-entregado';
        this.checkRidePromoVisibility();
        break;

      case 'Cancelado':
      case 'cancelled':
        const reason = order.cancelReason ? ` (${order.cancelReason})` : '';
        title = `⚠️ Pedido Cancelado (#${orderIdShort})`;
        body = `Tu pedido en ${estName} fue cancelado${reason}.`;
        icon = '⚠️';
        statusClass = 'status-cancelado';
        this.checkRidePromoVisibility();
        break;

      default:
        title = `📋 Pedido Actualizado (#${orderIdShort})`;
        body = `Tu pedido en ${estName} cambió a: ${newStatus}`;
        icon = '📋';
        statusClass = 'status-default';
        break;
    }

    // 1. Play synthesized Web Audio chime
    if (window.Sound && typeof window.Sound.playCustomerStatusChime === 'function') {
      window.Sound.playCustomerStatusChime(newStatus);
    } else if (window.Sound && typeof window.Sound.playBell === 'function') {
      window.Sound.playBell();
    }

    // 2. Mobile haptic vibration
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        if (newStatus === 'En Camino') navigator.vibrate([100, 60, 100, 60, 200]);
        else if (newStatus === 'Entregado') navigator.vibrate([100, 50, 100, 50, 250]);
        else if (newStatus === 'Cancelado') navigator.vibrate([300, 100, 300]);
        else navigator.vibrate([150, 80, 150]);
      } catch (e) {}
    }

    // 3. Web Push / Native OS notification
    this.sendPushNotification(title, body);

    // 4. In-App Floating notification banner
    this.showCustomerAlertBanner({
      title,
      body,
      icon,
      statusClass,
      orderId: order.id
    });
  }

  showCustomerAlertBanner({ title, body, icon, statusClass, orderId }) {
    const banner = document.getElementById('customer-order-alert-banner');
    if (!banner) return;

    const iconEl = document.getElementById('banner-status-icon');
    const titleEl = document.getElementById('banner-status-title');
    const descEl = document.getElementById('banner-status-desc');
    const timeEl = document.getElementById('banner-status-time');

    if (iconEl) iconEl.innerText = icon || '🔔';
    if (titleEl) titleEl.innerText = title;
    if (descEl) descEl.innerText = body;
    if (timeEl) timeEl.innerText = 'Ahora';

    banner.className = `customer-order-banner show ${statusClass}`;
    banner.style.display = 'flex';
    banner.dataset.orderId = orderId;

    if (this._customerAlertBannerTimeout) {
      clearTimeout(this._customerAlertBannerTimeout);
    }

    // Auto-dismiss after 8.5 seconds
    this._customerAlertBannerTimeout = setTimeout(() => {
      this.dismissCustomerAlertBanner();
    }, 8500);
  }

  dismissCustomerAlertBanner() {
    const banner = document.getElementById('customer-order-alert-banner');
    if (!banner) return;
    banner.classList.remove('show');
    setTimeout(() => {
      if (!banner.classList.contains('show')) {
        banner.style.display = 'none';
      }
    }, 420);
  }

  onCustomerAlertBannerClick(event) {
    this.dismissCustomerAlertBanner();
    this.openUserOrdersModal();
  }

  // Ride Promotion Card Visibility & Swipe to Dismiss Handlers
  checkRidePromoVisibility() {
    const card = document.getElementById('ride-promo-card');
    if (!card) return;

    if (sessionStorage.getItem('ride_promo_dismissed') === 'true') {
      card.style.display = 'none';
      return;
    }

    const orders = this.getUserOrdersHistory();
    // Only display if merchant has accepted the order (Preparando, Aceptado, Listo, En Camino)
    const hasAcceptedOrder = orders.some(o => {
      const s = String(o.status || '').trim();
      return s === 'Preparando' || s === 'Aceptado' || s === 'Listo' || s === 'En Camino';
    });

    if (hasAcceptedOrder) {
      card.style.display = 'flex';
      this.initRidePromoSwipe();
    } else {
      card.style.display = 'none';
    }
  }

  showRidePromoNotification() {
    sessionStorage.removeItem('ride_promo_dismissed');
    const card = document.getElementById('ride-promo-card');
    if (!card) return;

    card.style.display = 'flex';
    card.style.transform = 'translateX(0)';
    card.style.opacity = '0';
    card.style.transition = 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
    setTimeout(() => {
      card.style.opacity = '1';
    }, 20);
    this.initRidePromoSwipe();
  }

  initRidePromoSwipe() {
    const card = document.getElementById('ride-promo-card');
    if (!card || this._ridePromoSwipeInitialized) return;

    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let isSwiping = false;
    let isHorizontal = null;
    let isMouseDown = false;

    const onStart = (clientX, clientY) => {
      startX = clientX;
      startY = clientY;
      currentX = 0;
      isSwiping = false;
      isHorizontal = null;
      card.style.transition = 'none';
    };

    const onMove = (clientX, clientY, e) => {
      const deltaX = clientX - startX;
      const deltaY = clientY - startY;

      if (isHorizontal === null) {
        if (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6) {
          isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
        }
      }

      if (isHorizontal) {
        // Only allow sliding to the left
        if (deltaX < 0) {
          if (e && e.cancelable) e.preventDefault();
          this._isRidePromoSwiping = true;
          isSwiping = true;
          currentX = deltaX;
          card.style.transform = `translateX(${deltaX}px)`;
          const opacity = Math.max(0, 1 - Math.abs(deltaX) / (card.offsetWidth * 0.75));
          card.style.opacity = opacity;
        } else {
          // Resist swipe to the right
          card.style.transform = `translateX(${deltaX * 0.15}px)`;
        }
      }
    };

    const onEnd = () => {
      if (isSwiping && currentX < -65) {
        // Disappear smoothly to the left
        card.style.transition = 'transform 0.28s cubic-bezier(0.2, 1, 0.3, 1), opacity 0.28s ease';
        card.style.transform = 'translateX(-120%)';
        card.style.opacity = '0';
        setTimeout(() => {
          card.style.display = 'none';
          card.style.transform = '';
          card.style.opacity = '';
          sessionStorage.setItem('ride_promo_dismissed', 'true');
          this._isRidePromoSwiping = false;
        }, 300);
      } else {
        // Snap back
        card.style.transition = 'transform 0.22s cubic-bezier(0.2, 1, 0.3, 1), opacity 0.22s ease';
        card.style.transform = 'translateX(0)';
        card.style.opacity = '1';
        setTimeout(() => {
          this._isRidePromoSwiping = false;
        }, 80);
      }
      isSwiping = false;
    };

    card.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length === 1) {
        onStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    card.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches.length === 1) {
        onMove(e.touches[0].clientX, e.touches[0].clientY, e);
      }
    }, { passive: false });

    card.addEventListener('touchend', () => {
      onEnd();
    });

    card.addEventListener('mousedown', (e) => {
      isMouseDown = true;
      onStart(e.clientX, e.clientY);
    });

    window.addEventListener('mousemove', (e) => {
      if (!isMouseDown) return;
      onMove(e.clientX, e.clientY, e);
    });

    window.addEventListener('mouseup', () => {
      if (isMouseDown) {
        isMouseDown = false;
        onEnd();
      }
    });

    this._ridePromoSwipeInitialized = true;
  }

  onRidePromoCardClick(event) {
    if (this._isRidePromoSwiping) return;
    this.openRideModal();
  }

  // Active Orders Polling Fallback
  startActiveOrdersPolling() {
    if (this._activeOrdersPollingInterval) return;
    this._activeOrdersPollingInterval = setInterval(() => {
      this.pollActiveUserOrders();
    }, 9000);
  }

  async pollActiveUserOrders() {
    const localOrders = this.getUserOrdersHistory();
    const activeOrders = localOrders.filter(o => {
      const s = String(o.status || '').trim();
      return s !== 'Entregado' && s !== 'completed' && s !== 'Cancelado' && s !== 'cancelled';
    });

    if (activeOrders.length === 0) return;

    try {
      const res = await fetch('/api/orders');
      if (!res.ok) return;
      const serverOrders = await res.json();
      if (!Array.isArray(serverOrders)) return;

      activeOrders.forEach(localOrd => {
        const fresh = serverOrders.find(s => String(s.id) === String(localOrd.id));
        if (fresh && String(fresh.status).trim() !== String(localOrd.status).trim()) {
          const oldStatus = localOrd.status;
          this.saveUserOrderToHistory(fresh);
          this.handleCustomerOrderStatusUpdate(fresh, oldStatus);
          const modal = document.getElementById('user-orders-modal');
          if (modal && modal.classList.contains('active')) {
            this.renderUserOrdersList();
          }
        }
      });
    } catch (e) {
      // silent
    }
  }

  // Offline First Auto-Sync
  initOfflineSync() {
    const banner = document.getElementById('offline-banner');
    const updateOnlineStatus = () => {
      if (!navigator.onLine) {
        if (banner) banner.style.display = 'block';
        this.showToast('📴 Modo Sin Conexión activado. Tus acciones se guardarán localmente.');
      } else {
        if (banner) banner.style.display = 'none';
        this.processPendingOfflineOrders();
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    if (!navigator.onLine && banner) {
      banner.style.display = 'block';
    }
  }

  async processPendingOfflineOrders() {
    const rawQueue = localStorage.getItem('pending_offline_orders');
    if (!rawQueue) return;

    try {
      const queue = JSON.parse(rawQueue);
      if (Array.isArray(queue) && queue.length > 0) {
        this.showToast(`⚡ Reconectado: Sincronizando ${queue.length} pedido(s) guardado(s)...`);
        for (const orderData of queue) {
          try {
            if (window.SupabaseHelper && window.SupabaseHelper.createOrder) {
              await window.SupabaseHelper.createOrder(orderData);
            }
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
              this.ws.send(JSON.stringify({ type: 'new_order', data: orderData }));
            }
          } catch(err) {
            console.warn('Error syncing queued order:', err);
          }
        }
        localStorage.removeItem('pending_offline_orders');
        this.showToast('🎉 ¡Pedidos guardados sincronizados con éxito!');
        this.sendPushNotification('¡Pedidos Sincronizados! 🚀', 'Tus pedidos sin conexión se enviaron correctamente a la cocina.');
      }
    } catch(e) {
      console.warn('Error parsing offline queue:', e);
    }
  }

  // Customer Table Selector (Mesa)
  renderCustomerTableMap() {
    const container = document.getElementById('customer-table-layout-container');
    const badge = document.getElementById('customer-selected-table-badge');
    const input = document.getElementById('order-table-number');
    if (!container) return;

    if (input && !input.value && this.currentTableNumber) {
      input.value = this.currentTableNumber;
    }

    // If table is locked by QR scan, show dedicated fixed table display and lock input
    if (this.tableLockedByQR && this.currentTableNumber) {
      container.innerHTML = `
        <div style="background: rgba(16, 185, 129, 0.12); border: 1.5px solid #10B981; border-radius: 14px; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 26px;">🪑</span>
            <div>
              <div style="font-size: 15px; font-weight: 900; color: #FFF;">Mesa #${this.currentTableNumber}</div>
              <div style="font-size: 11px; color: #6EE7B7; font-weight: 700;">🔒 Mesa Fija Asignada por Código QR</div>
            </div>
          </div>
          <span style="background: #10B981; color: #121216; font-size: 11px; font-weight: 900; padding: 3px 8px; border-radius: 6px;">Fijo por QR</span>
        </div>
      `;
      if (input) {
        input.value = this.currentTableNumber;
        input.readOnly = true;
        input.style.background = 'rgba(255,255,255,0.05)';
        input.style.color = '#10B981';
        input.style.cursor = 'not-allowed';
      }
      if (badge) {
        badge.innerText = `🔒 Mesa #${this.currentTableNumber} fijada por escaneo de Código QR`;
        badge.style.display = 'block';
      }
      return;
    }

    const shopId = this.cart.items[0]?.restaurant_id || (this.selectedEstablishment ? this.selectedEstablishment.id : null);
    const est = (this.establishments || []).find(e => e.id === shopId) || this.selectedEstablishment;
    let tables = (est && Array.isArray(est.tables) && est.tables.length > 0) ? est.tables : [];
    
    if (tables.length === 0) {
      if (est && Array.isArray(est.layout) && est.layout.length > 0) {
        tables = est.layout.filter(i => i.type === 'table').map(i => ({ id: `t-${i.number}`, name: `Mesa ${i.number}`, number: i.number }));
      } else {
        tables = [1, 2, 3, 4, 5, 6].map(n => ({ id: `t-${n}`, name: `Mesa ${n}`, number: n }));
      }
    }

    // Ensure scanned table is present in the list
    if (this.currentTableNumber && !tables.some(t => String(t.number) === String(this.currentTableNumber) || t.name === `Mesa ${this.currentTableNumber}`)) {
      tables = [{ id: `t-${this.currentTableNumber}`, name: isNaN(this.currentTableNumber) ? this.currentTableNumber : `Mesa ${this.currentTableNumber}`, number: this.currentTableNumber }, ...tables];
    }

    container.innerHTML = '';

    const currentVal = input ? String(input.value || this.currentTableNumber || '').trim() : String(this.currentTableNumber || '').trim();

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display: flex; flex-direction: column; gap: 8px; width: 100%;';
    
    const title = document.createElement('div');
    title.style.cssText = 'font-size: 12px; color: #94A3B8; font-weight: 700; display: flex; align-items: center; justify-content: space-between;';
    title.innerHTML = '<span>Mesa donde te encuentras sentado:</span> <span style="font-size: 10.5px; color: #10B981;">🟢 Mesas Disponibles</span>';
    wrapper.appendChild(title);

    const chipsGrid = document.createElement('div');
    chipsGrid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 8px; width: 100%;';

    tables.forEach((table, idx) => {
      const tNum = table.number || (idx + 1);
      const tName = table.name || `Mesa ${tNum}`;
      const btn = document.createElement('button');
      btn.type = 'button';
      const isSelected = String(currentVal).toLowerCase() === String(tNum).toLowerCase() || String(currentVal).toLowerCase() === String(tName).toLowerCase();
      btn.style.cssText = `
        padding: 10px 6px;
        border-radius: 10px;
        border: 1.5px solid ${isSelected ? '#10B981' : 'rgba(255,255,255,0.12)'};
        background: ${isSelected ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : 'rgba(255,255,255,0.05)'};
        color: ${isSelected ? '#ffffff' : '#FCD34D'};
        font-weight: 800;
        font-size: 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        box-shadow: ${isSelected ? '0 0 12px rgba(16, 185, 129, 0.4)' : 'none'};
        transition: all 0.2s ease;
      `;
      btn.innerHTML = `<span>🪑</span> <span>${tName}</span>`;
      btn.onclick = () => {
        if (input) input.value = tNum;
        this.currentTableNumber = tNum;
        if (badge) {
          badge.innerText = `✅ ${tName} Seleccionada para tu Pedido`;
          badge.style.display = 'block';
        }
        this.renderCustomerTableMap();
      };
      chipsGrid.appendChild(btn);
    });

    wrapper.appendChild(chipsGrid);
    container.appendChild(wrapper);

    if (currentVal && badge) {
      badge.innerText = `✅ Mesa #${currentVal} Seleccionada para tu Pedido`;
      badge.style.display = 'block';
    }
  }

  saveUserOrderToHistory(order) {
    if (!order || !order.id) return;
    try {
      const userEmail = this.currentUser?.email || localStorage.getItem('pedigochos_user_email') || null;
      const userId = this.currentUser?.id || localStorage.getItem('pedigochos_user_id') || null;

      if (userEmail && !order.customerEmail) {
        order.customerEmail = String(userEmail).toLowerCase().trim();
      }
      if (userId && !order.userId) {
        order.userId = String(userId);
      }

      let orders = JSON.parse(localStorage.getItem('pedigochos_user_orders') || '[]');
      if (!Array.isArray(orders)) orders = [];
      
      const index = orders.findIndex(o => String(o.id) === String(order.id));
      if (index !== -1) {
        orders[index] = { ...orders[index], ...order };
      } else {
        orders.unshift(order);
      }
      
      if (orders.length > 50) orders = orders.slice(0, 50);
      localStorage.setItem('pedigochos_user_orders', JSON.stringify(orders));
    } catch(e) {
      console.error('Error saving order to history:', e);
    }
  }

  getUserOrdersHistory() {
    try {
      let orders = JSON.parse(localStorage.getItem('pedigochos_user_orders') || '[]');
      return Array.isArray(orders) ? orders : [];
    } catch(e) {
      return [];
    }
  }

  async openUserOrdersModal(options = {}) {
    const modal = document.getElementById('user-orders-modal');
    if (modal) {
      modal.classList.add('active');
      const content = modal.querySelector('.modal-content');
      if (content) {
        content.classList.remove('smooth-modal-entry');
        void content.offsetWidth; // trigger reflow
        content.classList.add('smooth-modal-entry');
      }
    }
    document.body.classList.add('modal-open');

    // Fetch live status and sync with Google account / server
    try {
      const userEmail = this.currentUser?.email || localStorage.getItem('pedigochos_user_email');
      const userId = this.currentUser?.id || localStorage.getItem('pedigochos_user_id');

      if (userEmail || userId) {
        // Sync directly with account on server
        await this.syncUserOrdersWithServer(userEmail, userId);
      } else {
        // Fallback for guest devices without account
        const res = await fetch('/api/orders');
        if (res.ok) {
          const liveOrders = await res.json();
          let userOrders = this.getUserOrdersHistory();
          
          if (Array.isArray(liveOrders) && userOrders.length > 0) {
            userOrders.forEach(localOrd => {
              const serverOrd = liveOrders.find(o => String(o.id) === String(localOrd.id));
              if (serverOrd) {
                this.saveUserOrderToHistory(serverOrd);
              }
            });
          }
        }
      }
    } catch(e) {
      console.error('Error syncing live orders history:', e);
    }

    this.renderUserOrdersList('all', options.highlightFirst);
  }

  closeUserOrdersModal() {
    const modal = document.getElementById('user-orders-modal');
    if (modal) modal.classList.remove('active');
    document.body.classList.remove('modal-open');
  }

  filterUserOrders(filterType) {
    document.querySelectorAll('.active-order-filter').forEach(btn => {
      btn.style.background = 'rgba(255,255,255,0.06)';
      btn.style.color = '#FFF';
      btn.style.border = '1px solid rgba(255,255,255,0.1)';
      btn.classList.remove('active-order-filter');
    });

    const activeBtn = document.getElementById(`user-order-filter-${filterType}`);
    if (activeBtn) {
      activeBtn.style.background = 'var(--primary)';
      activeBtn.style.color = '#fff';
      activeBtn.style.border = 'none';
      activeBtn.classList.add('active-order-filter');
    }

    this.renderUserOrdersList(filterType, false);
  }

  renderUserOrdersList(filterType = 'all', highlightFirst = false) {
    const container = document.getElementById('user-orders-list-container');
    if (!container) return;

    let orders = this.getUserOrdersHistory();
    const userEmail = this.currentUser?.email || localStorage.getItem('pedigochos_user_email') || null;

    let customResin = [];
    try { customResin = JSON.parse(localStorage.getItem('pg_my_resin_quotes') || '[]'); } catch(e){}
    let custom3D = [];
    try { custom3D = JSON.parse(localStorage.getItem('pg_my_print3d_quotes') || '[]'); } catch(e){}

    const isFinished = (s) => s === 'Entregado' || s === 'completed' || s === 'Cancelado' || s === 'cancelled' || s === 'Listo' || s === 'Despachado';

    if (filterType === 'active') {
      orders = orders.filter(o => !isFinished(o.status));
      customResin = customResin.filter(o => !isFinished(o.status));
      custom3D = custom3D.filter(o => !isFinished(o.status));
    } else if (filterType === 'completed') {
      orders = orders.filter(o => isFinished(o.status));
      customResin = customResin.filter(o => isFinished(o.status));
      custom3D = custom3D.filter(o => isFinished(o.status));
    }

    if (orders.length === 0 && customResin.length === 0 && custom3D.length === 0) {
      if (userEmail) {
        container.innerHTML = `
          <div style="padding: 36px 20px; text-align: center; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1); border-radius: 16px;">
            <span style="font-size: 40px; display: block; margin-bottom: 10px;">📋✨</span>
            <h4 style="margin: 0 0 6px 0; color: #FFF; font-size: 15px; font-weight: 800;">No tienes pedidos ${filterType !== 'all' ? 'en esta categoría' : 'registrados aún'}</h4>
            <p style="margin: 0; font-size: 12px; color: #94A3B8; line-height: 1.5;">
              Conectado como <strong style="color: #FF6B00;">${userEmail}</strong>.<br>Tus pedidos se guardan y sincronizan automáticamente en tu cuenta.
            </p>
          </div>
        `;
      } else {
        container.innerHTML = `
          <div style="padding: 34px 20px; text-align: center; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.1); border-radius: 16px;">
            <span style="font-size: 40px; display: block; margin-bottom: 10px;">📋</span>
            <h4 style="margin: 0 0 6px 0; color: #FFF; font-size: 15px; font-weight: 800;">No tienes pedidos registrados en este dispositivo</h4>
            <p style="margin: 0 0 16px 0; font-size: 12px; color: #94A3B8; line-height: 1.5;">
              Inicia sesión con tu cuenta de Google para guardar tu historial en la nube y acceder a tus pedidos desde cualquier teléfono o computadora.
            </p>
            <button type="button" onclick="MarketplaceApp.loginWithGoogle()" style="background: linear-gradient(135deg, #FF6B00 0%, #EA580C 100%); color: #FFFFFF; border: none; padding: 10px 18px; border-radius: 12px; font-size: 13px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 14px rgba(255, 107, 0, 0.4);">
              <span>🔑</span> Iniciar Sesión con Google
            </button>
          </div>
        `;
      }
      return;
    }

    let headerHtml = '';
    if (userEmail) {
      headerHtml = `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 7px 12px; margin-bottom: 12px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 10px; font-size: 11.5px; color: #6EE7B7;">
          <span style="display: flex; align-items: center; gap: 5px;">
            <span>☁️</span> Historial respaldado en <strong>${userEmail}</strong>
          </span>
          <span style="font-size: 10.5px; opacity: 0.8;">Sincronizado ✓</span>
        </div>
      `;
    }

    let customCardsHtml = '';
    const allCustom = [
      ...customResin.map(r => ({ ...r, serviceType: 'resin', brandName: 'Shelli Art Resina', brandIcon: '🎨', openChatFn: `if(window.ResinServiceApp){ ResinServiceApp.openChatModalById('${r.id}'); } else { window.location.hash='#servicios/resina'; }` })),
      ...custom3D.map(p => ({ ...p, serviceType: 'print3d', brandName: '3D Lab PediGochos', brandIcon: '🖨️', openChatFn: `if(window.Print3DServiceApp){ Print3DServiceApp.openChatModalById('${p.id}'); } else { window.location.hash='#servicios/3d'; }` }))
    ].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    if (allCustom.length > 0) {
      customCardsHtml += `
        <div style="margin-bottom: 18px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <h4 style="margin: 0; font-size: 13.5px; font-weight: 900; color: #FFF; display: flex; align-items: center; gap: 6px;">
              <span>🎨</span> Mis Encargos Personalizados (Taller & 3D)
            </h4>
            <span style="font-size: 11px; color: #A78BFA; font-weight: 700; background: rgba(167, 139, 250, 0.12); padding: 2px 8px; border-radius: 6px;">${allCustom.length} activo(s)</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 10px;">
      `;

      allCustom.forEach(item => {
        const st = (item.status || '').toLowerCase();
        let currentStep = 1;
        let stepLabel = '1. Solicitud Recibida';
        let progressPct = 20;

        if (st.includes('listo') || st.includes('entregado') || st.includes('despachado') || st.includes('complet')) {
          currentStep = 5;
          stepLabel = '5. Listo para Entrega / Entregado';
          progressPct = 100;
        } else if (st.includes('curado') || st.includes('acabado') || st.includes('post')) {
          currentStep = 4;
          stepLabel = '4. Curado UV & Acabados Finales';
          progressPct = 80;
        } else if (st.includes('elaborac') || st.includes('producc') || st.includes('imprim')) {
          currentStep = 3;
          stepLabel = '3. En Elaboración en Taller';
          progressPct = 60;
        } else if (st.includes('presupuest') || st.includes('acordad') || item.agreedPriceUsd) {
          currentStep = 2;
          stepLabel = '2. Cotización y Presupuesto';
          progressPct = 40;
        }

        const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Reciente';
        const priceBadge = item.agreedPriceUsd ? `<span style="font-size: 13px; font-weight: 900; color: #34D399;">$${item.agreedPriceUsd} USD</span>` : `<span style="font-size: 11px; color: #F59E0B; font-weight: 700;">En Cotización</span>`;

        const steps = [
          { num: 1, name: 'Solicitud' },
          { num: 2, name: 'Cotización' },
          { num: 3, name: 'Taller' },
          { num: 4, name: 'Curado' },
          { num: 5, name: 'Listo' }
        ];

        const stepperDotsHtml = steps.map(s => {
          const isDone = s.num <= currentStep;
          const isCurrent = s.num === currentStep;
          const bg = isDone ? '#10B981' : 'rgba(255,255,255,0.15)';
          const color = isDone ? '#FFF' : '#64748B';
          return `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 3px; z-index: 2; flex: 1;">
              <div style="width: 20px; height: 20px; border-radius: 50%; background: ${bg}; color: ${color}; font-size: 10px; font-weight: 900; display: flex; align-items: center; justify-content: center; ${isCurrent ? 'box-shadow: 0 0 10px #10B981;' : ''}">
                ${isDone ? (s.num < currentStep ? '✓' : s.num) : s.num}
              </div>
              <span style="font-size: 9.5px; font-weight: ${isCurrent ? '800' : '600'}; color: ${isCurrent ? '#34D399' : '#94A3B8'}; text-align: center;">${s.name}</span>
            </div>
          `;
        }).join('');

        customCardsHtml += `
          <div style="background: rgba(22, 22, 28, 0.95); border: 1.5px solid rgba(167, 139, 250, 0.3); border-radius: 14px; padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 4px 14px rgba(0,0,0,0.4);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <span style="font-size: 11px; font-weight: 800; color: #A78BFA; display: flex; align-items: center; gap: 5px;">
                  <span>${item.brandIcon}</span> ${item.brandName} • #${item.id ? item.id.slice(0, 8) : '---'}
                </span>
                <h4 style="margin: 2px 0 0 0; font-size: 14px; font-weight: 900; color: #FFF;">${item.productTitle || item.modelName || 'Encargo Personalizado'}</h4>
                <span style="font-size: 10.5px; color: #64748B;">${dateStr}</span>
              </div>
              <div style="text-align: right;">
                ${priceBadge}
                <div style="margin-top: 3px;">
                  <span style="background: rgba(16, 185, 129, 0.15); color: #34D399; border: 1px solid rgba(16, 185, 129, 0.35); padding: 2px 7px; border-radius: 6px; font-size: 10px; font-weight: 800;">${item.status || 'En Proceso'}</span>
                </div>
              </div>
            </div>

            <!-- Stepper Progress Bar -->
            <div style="background: rgba(0,0,0,0.3); border-radius: 10px; padding: 10px 8px 8px 8px; border: 1px solid rgba(255,255,255,0.05); position: relative;">
              <div style="position: absolute; top: 18px; left: 10%; right: 10%; height: 3px; background: rgba(255,255,255,0.1); z-index: 1;">
                <div style="height: 100%; width: ${progressPct}%; background: linear-gradient(90deg, #10B981, #34D399); transition: width 0.3s ease;"></div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; position: relative;">
                ${stepperDotsHtml}
              </div>
              <div style="text-align: center; margin-top: 8px; font-size: 11px; color: #E2E8F0; font-weight: 700;">
                Estado actual: <strong style="color: #34D399;">${stepLabel}</strong>
              </div>
            </div>

            <!-- Actions: Chat con el taller -->
            <div style="display: flex; justify-content: flex-end; gap: 8px; align-items: center; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 8px;">
              <button type="button" onclick="MarketplaceApp.closeUserOrdersModal(); ${item.openChatFn};" style="background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); color: #FFF; border: none; padding: 7px 14px; border-radius: 8px; font-size: 12px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.35);">
                <span>💬</span> Abrir Chat con el Taller
              </button>
            </div>
          </div>
        `;
      });

      customCardsHtml += `
          </div>
        </div>
      `;
    }

    container.innerHTML = headerHtml + customCardsHtml;

    orders.forEach((ord, index) => {
      const est = this.establishments.find(e => e.id === ord.establishmentId || e.id === ord.establishment_id);
      const estName = est ? est.name : (ord.establishmentName || 'Restaurante');
      const estLogo = est ? (est.logo || '🏪') : '🏪';
      const estPhoto = est ? (est.logoImage || null) : null;

      const rawDate = ord.createdAt || ord.timestamp || ord.created_at;
      const dateObj = rawDate ? new Date(rawDate) : new Date();
      const dateStr = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

      const statusMap = {
        'Pendiente': { label: '⏳ Pendiente', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' },
        'Preparando': { label: '👨‍🍳 En Cocina', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' },
        'En Cocina': { label: '👨‍🍳 En Cocina', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' },
        'En Preparacion': { label: '👨‍🍳 En Cocina', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' },
        'En preparación': { label: '👨‍🍳 En Cocina', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' },
        'Listo': { label: '📦 Listo para Despacho', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)' },
        'En Camino': { label: '🛵 En Camino', color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.15)' },
        'En camino': { label: '🛵 En Camino', color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.15)' },
        'Entregado': { label: '✅ Entregado', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' },
        'Cancelado': { label: '❌ Cancelado', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' },
        // Fallbacks
        'pending': { label: '⏳ Pendiente', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' },
        'preparing': { label: '👨‍🍳 En Cocina', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' },
        'ready': { label: '📦 Listo', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)' },
        'on_the_way': { label: '🛵 En Camino', color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.15)' },
        'completed': { label: '✅ Entregado', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' },
        'cancelled': { label: '❌ Cancelado', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' }
      };

      const statusObj = statusMap[ord.status] || { label: ord.status || 'Enviado', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' };
      const codeStr = ord.deliveryDetails?.code || ord.orderCode || (ord.id ? ord.id.slice(-4) : '---');

      const payMethodLabel = ord.paymentMethod === 'Transferencia' ? '📲 Transferencia' : '💵 Efectivo';
      const payNotes = ord.paymentNotes ? ` (${ord.paymentNotes})` : '';

      // Build items breakdown
      let itemsHTML = '';
      if (Array.isArray(ord.items)) {
        itemsHTML = ord.items.map(item => {
          let specsHTML = '';
          
          // Render specifications / ingredients
          if (item.selected_specifications && typeof item.selected_specifications === 'object') {
            const specParts = [];
            Object.keys(item.selected_specifications).forEach(groupTitle => {
              const selections = item.selected_specifications[groupTitle];
              if (Array.isArray(selections) && selections.length > 0) {
                const names = selections.map(s => typeof s === 'string' ? s : (s.name || s.title)).join(', ');
                specParts.push(`<strong>${groupTitle}:</strong> ${names}`);
              } else if (typeof selections === 'string') {
                specParts.push(`<strong>${groupTitle}:</strong> ${selections}`);
              }
            });
            if (specParts.length > 0) {
              specsHTML = `<div style="font-size: 11px; color: #F59E0B; margin-top: 3px; background: rgba(245, 158, 11, 0.08); padding: 4px 8px; border-radius: 6px; border-left: 2px solid #F59E0B;">${specParts.join('<br>')}</div>`;
            }
          } else if (item.specifications) {
            specsHTML = `<div style="font-size: 11px; color: #F59E0B; margin-top: 3px; background: rgba(245, 158, 11, 0.08); padding: 4px 8px; border-radius: 6px; border-left: 2px solid #F59E0B;">${item.specifications}</div>`;
          }

          const priceVal = item.unit_total_calculated || item.price || 0;
          return `
            <div style="border-bottom: 1px dashed rgba(255,255,255,0.06); padding-bottom: 6px; margin-bottom: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12.5px; font-weight: 700; color: #FFF;">
                <span>x${item.quantity || 1} ${item.name || item.product_name}</span>
                <span style="color: var(--primary);">${this.formatPesos(this.normalizeCopPrice(priceVal) * (item.quantity || 1))}</span>
              </div>
              ${specsHTML}
            </div>
          `;
        }).join('');
      }

      const card = document.createElement('div');
      const isCardActive = !isFinished(ord.status);
      const isHighlighted = highlightFirst && index === 0;

      card.className = isHighlighted ? 'new-order-highlight' : '';
      card.style.cssText = 'background: rgba(22, 22, 28, 0.95); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 14px; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 4px 14px rgba(0,0,0,0.3); transition: all 0.3s ease;';

      const liveBtnHTML = isCardActive ? `
        <button type="button" onclick="MarketplaceApp.closeUserOrdersModal(); MarketplaceApp.trackActiveOrder('${ord.id}')" style="background: var(--primary); color: #FFF; border: none; padding: 6px 12px; border-radius: 8px; font-size: 11.5px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 4px;">
          🛵 Rastreo en Vivo
        </button>
        <button type="button" onclick="MarketplaceApp.openCancelRequestModal('${ord.id}')" style="background: rgba(245, 158, 11, 0.15); color: #FCD34D; border: 1px solid rgba(245, 158, 11, 0.3); padding: 6px 12px; border-radius: 8px; font-size: 11.5px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 4px;">
          🆘 Solicitar Cancelación
        </button>
      ` : '';

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 10px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 38px; height: 38px; border-radius: 8px; overflow: hidden; background: rgba(255,255,255,0.04); display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.1); font-size: 18px;">
              ${estPhoto ? `<img src="${estPhoto}" style="width:100%; height:100%; object-fit:cover;">` : estLogo}
            </div>
            <div>
              <h4 style="margin: 0; font-size: 14px; font-weight: 800; color: #FFF;">${estName}</h4>
              <span style="font-size: 11px; color: var(--text-muted);">${dateStr} • Código: #${codeStr}</span>
            </div>
          </div>
          <span style="background: ${statusObj.bg}; color: ${statusObj.color}; border: 1px solid ${statusObj.color}; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 800;">
            ${statusObj.label}
          </span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 4px; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.04);">
          ${itemsHTML}
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; background: rgba(255,255,255,0.02); padding: 8px 10px; border-radius: 8px; flex-wrap: wrap; gap: 6px;">
          <div style="color: var(--text-muted); display: flex; flex-direction: column; gap: 2px;">
            <span>${ord.orderType === 'delivery' ? `🚚 Domicilio: ${ord.deliveryDetails?.address || 'Dirección provista'}` : `🍽️ En Mesa #${ord.tableNumber || 1}`}</span>
            <span style="font-size: 11px; color: #94A3B8;">💳 Pago: <strong>${payMethodLabel}</strong>${payNotes}</span>
          </div>
          <span style="font-size: 14px; font-weight: 900; color: var(--primary);">Total: ${this.formatPesos(ord.total || 0)}</span>
        </div>

        ${isCardActive ? `
          <div style="background: rgba(16, 185, 129, 0.08); border: 1px dashed #10B981; border-radius: 10px; padding: 8px 12px; font-size: 12px; color: #6EE7B7; display: flex; align-items: center; gap: 8px; font-weight: 600;">
            <span style="font-size: 16px;">📞</span>
            <span>El restaurante se pondrá en contacto contigo en unos minutos para confirmar los detalles.</span>
          </div>
        ` : ''}

        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; flex-wrap: wrap;">
          ${liveBtnHTML}
          <a href="https://wa.me/573227949751?text=${encodeURIComponent(`Hola Central PediGochos, consulto sobre mi pedido #${codeStr} de ${estName}.`)}" target="_blank" rel="noopener noreferrer" style="background: rgba(37, 211, 102, 0.15); border: 1px solid #25D366; color: #25D366; padding: 6px 12px; border-radius: 8px; font-size: 11.5px; font-weight: 800; text-decoration: none; display: flex; align-items: center; gap: 4px;">
            🟢 WhatsApp (322 794 9751)
          </a>
          <button type="button" onclick="MarketplaceApp.openRatingModal('${ord.id}', '${ord.establishmentId || ord.establishment_id || ''}')" style="background: rgba(245, 158, 11, 0.15); color: #F59E0B; border: 1px solid rgba(245, 158, 11, 0.3); padding: 6px 12px; border-radius: 8px; font-size: 11.5px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 4px;">
            ⭐ Calificar
          </button>
          <button type="button" onclick="MarketplaceApp.repeatOrderFromHistory('${ord.id}')" style="background: rgba(255,255,255,0.06); color: #FFF; border: 1px solid rgba(255,255,255,0.12); padding: 6px 12px; border-radius: 8px; font-size: 11.5px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 4px;">
            🔄 Repetir Pedido
          </button>
        </div>
      `;
      container.appendChild(card);
    });
  }

  repeatOrderFromHistory(orderId) {
    const orders = this.getUserOrdersHistory();
    const ord = orders.find(o => o.id === orderId);
    if (!ord || !Array.isArray(ord.items) || ord.items.length === 0) {
      alert('No se pudo encontrar el detalle de este pedido para repetirlo.');
      return;
    }

    ord.items.forEach(item => {
      this.cart.addItem({
        product_id: item.id || item.product_id,
        product_name: item.name || item.product_name,
        unit_total_calculated: item.price || item.unit_total_calculated,
        subtotal_combined: (item.price || item.unit_total_calculated) * (item.quantity || 1),
        quantity: item.quantity || 1,
        selected_specifications: item.selected_specifications || {},
        restaurant_id: ord.establishmentId || ord.establishment_id
      });
    });

    this.updateCartBadge();
    this.closeUserOrdersModal();
    this.openCartModal();
    this.showToast('🛒 ¡Productos agregados al carrito con sus ingredientes!');
  }

  // ==========================================
  // REVIEWS & 5-STAR RATING SYSTEM METHODS
  // ==========================================

  setRatingStars(count) {
    this.currentRatingValue = count;
    const labels = {
      1: '⭐ (1 / 5 - Deficiente)',
      2: '⭐⭐ (2 / 5 - Regular)',
      3: '⭐⭐⭐ (3 / 5 - Bueno)',
      4: '⭐⭐⭐⭐ (4 / 5 - Muy Bueno)',
      5: '⭐⭐⭐⭐⭐ (5 / 5 - ¡Excelente!)'
    };

    const labelEl = document.getElementById('rating-label-text');
    if (labelEl) labelEl.innerText = labels[count] || '⭐⭐⭐⭐⭐ (5 / 5 - ¡Excelente!)';

    for (let i = 1; i <= 5; i++) {
      const star = document.getElementById(`star-${i}`);
      if (star) {
        if (i <= count) {
          star.style.opacity = '1';
          star.style.transform = 'scale(1.25)';
        } else {
          star.style.opacity = '0.3';
          star.style.transform = 'scale(1)';
        }
      }
    }
  }

  setReviewStarRating(rating) {
    this.currentRatingValue = rating;
    const stars = document.querySelectorAll('#star-rating-selector .star-rating-item');
    stars.forEach((s, idx) => {
      if (idx < rating) {
        s.style.opacity = '1';
        s.style.transform = 'scale(1.2)';
      } else {
        s.style.opacity = '0.3';
        s.style.transform = 'scale(1)';
      }
    });
    const textEl = document.getElementById('star-rating-text');
    const texts = [
      '⭐ Malo (1/5)',
      '⭐⭐ Regular (2/5)',
      '⭐⭐⭐ Bueno (3/5)',
      '⭐⭐⭐⭐ Muy Bueno (4/5)',
      '⭐⭐⭐⭐⭐ ¡Excelente! (5/5)'
    ];
    if (textEl) textEl.innerText = texts[rating - 1] || '⭐⭐⭐⭐⭐ ¡Excelente! (5/5)';
  }

  openRatingModal(orderId, estId) {
    this.ratingTargetOrderId = orderId;
    this.ratingTargetEstId = estId;
    this.currentRatingValue = 5;
    this.setReviewStarRating(5);

    const commentInput = document.getElementById('rating-modal-comment');
    if (commentInput) commentInput.value = '';

    const modal = document.getElementById('post-order-rating-modal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('active');
    }
  }

  closeRatingModal() {
    const modal = document.getElementById('post-order-rating-modal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('active');
    }
  }

  async submitPostOrderReview() {
    const estId = this.ratingTargetEstId;
    const orderId = this.ratingTargetOrderId;
    const commentInput = document.getElementById('rating-modal-comment');
    const comment = commentInput ? commentInput.value.trim() : '';
    const rating = this.currentRatingValue || 5;

    if (!estId) {
      this.closeRatingModal();
      return;
    }

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          establishmentId: estId,
          rating,
          comment,
          customerName: 'Cliente Pedi Gochos'
        })
      });

      if (res.ok) {
        this.showToast('🌟 ¡Muchas gracias por calificar tu pedido!');
        this.closeRatingModal();
        this.loadEstablishments();
      } else {
        const err = await res.json();
        alert(err.error || 'No se pudo registrar la reseña.');
        this.closeRatingModal();
      }
    } catch(e) {
      console.error(e);
      this.closeRatingModal();
    }
  }

  async submitReview() {
    return this.submitPostOrderReview();
  }

  async openReviewsListModal(estId) {
    const modal = document.getElementById('reviews-list-modal');
    const container = document.getElementById('reviews-modal-cards-list');
    if (!modal || !container) return;

    modal.classList.add('active');
    container.innerHTML = '<div style="color: #94A3B8; text-align: center; padding: 20px;">Cargando reseñas...</div>';

    try {
      const res = await fetch(`/api/establishments/${estId}/reviews`);
      if (!res.ok) throw new Error('Error API');
      const data = await res.json();

      const est = (this.establishments || []).find(e => e.id === estId);
      const titleEl = document.getElementById('reviews-modal-title');
      const subEl = document.getElementById('reviews-modal-sub');
      if (titleEl) titleEl.innerText = `⭐ Reseñas: ${est ? est.name : 'Restaurante'}`;
      if (subEl) subEl.innerText = `Promedio: ⭐ ${data.avgRating} / 5 (${data.totalReviews} opiniones de clientes)`;

      if (!data.reviews || data.reviews.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 30px; background: rgba(255,255,255,0.03); border-radius: 16px;">
            <span style="font-size: 36px; display: block; margin-bottom: 8px;">🌟</span>
            <strong style="color: #FFF; font-size: 14px;">Sin reseñas registradas aún</strong>
            <p style="color: #94A3B8; font-size: 12px; margin: 4px 0 0 0;">¡Haz tu pedido en este comercio y sé el primero en dejar tu calificación de 5 estrellas!</p>
          </div>
        `;
        return;
      }

      container.innerHTML = data.reviews.map(r => {
        const starsStr = '⭐'.repeat(r.rating || 5);
        const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleDateString('es-ES') : 'Reciente';

        return `
          <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); padding: 12px 14px; border-radius: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="color: #FFF; font-weight: 800; font-size: 13px;">👤 ${r.customerName}</span>
              <span style="font-size: 11px; color: #64748B;">${dateStr}</span>
            </div>
            <div style="font-size: 13px; color: #F59E0B; margin-bottom: 6px;">${starsStr} (${r.rating} / 5)</div>
            ${r.comment ? `<p style="font-size: 12.5px; color: #CBD5E1; margin: 0; line-height: 1.4;">"${r.comment}"</p>` : ''}
          </div>
        `;
      }).join('');

    } catch(e) {
      container.innerHTML = '<div style="color: #F87171; text-align: center; padding: 20px;">Error al cargar las reseñas.</div>';
    }
  }

  closeReviewsListModal() {
    const modal = document.getElementById('reviews-list-modal');
    if (modal) modal.classList.remove('active');
  }

  getDefaultMerchantData() {
    return {
      businessName: '',
      contactName: '',
      phone: '',
      city: 'San Cristóbal',
      address: '',
      businessModel: 'custom_craft', // 'custom_craft' | 'food' | 'retail' | 'service'
      productAttributes: {
        photo: true,
        size: true,
        customName: true,
        customNumber: true,
        colors: true,
        extras: true,
        leadTimeDays: true,
        variantsStock: false,
        tableIngredients: false
      },
      pricingModel: 'range', // 'fixed' | 'range' | 'custom_quote'
      sampleProduct: 'Piñata Número Temática Personalizada',
      prepTime: 'order_days', // 'immediate' | 'same_day' | 'order_days'
      deliveryMethod: 'pedigochos', // 'pedigochos' | 'own_delivery' | 'pickup'
      currencies: ['COP', 'USD', 'BS'],
      generatedTemplate: ''
    };
  }

  openMerchantRegistrationModal(category = '') {
    const modal = document.getElementById('merchant-register-modal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('active');
    }

    if (!this.merchantData) {
      this.merchantData = this.getDefaultMerchantData();
    }

    if (category) {
      if (category === 'comidas') {
        this.selectMerchantBusinessModel('food', false);
      } else if (category === 'servicios') {
        this.selectMerchantBusinessModel('service', false);
      } else if (['mercados', 'ferreterias', 'farmacias'].includes(category)) {
        this.selectMerchantBusinessModel('retail', false);
      } else {
        this.selectMerchantBusinessModel('custom_craft', false);
      }
    }

    this.merchantWizardStep = 1;
    this.renderMerchantStep();
  }

  closeMerchantRegistrationModal() {
    const modal = document.getElementById('merchant-register-modal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('active');
    }
  }

  syncCurrentStepInputs() {
    if (!this.merchantData) this.merchantData = this.getDefaultMerchantData();

    if (this.merchantWizardStep === 1) {
      const nameInput = document.getElementById('diag-merchant-name');
      const contactInput = document.getElementById('diag-contact-name');
      const phoneInput = document.getElementById('diag-merchant-phone');
      const cityInput = document.getElementById('diag-merchant-city');
      const addrInput = document.getElementById('diag-merchant-address');

      if (nameInput) this.merchantData.businessName = nameInput.value.trim();
      if (contactInput) this.merchantData.contactName = contactInput.value.trim();
      if (phoneInput) this.merchantData.phone = phoneInput.value.trim();
      if (cityInput) this.merchantData.city = cityInput.value.trim();
      if (addrInput) this.merchantData.address = addrInput.value.trim();
    } else if (this.merchantWizardStep === 3) {
      const sampleInput = document.getElementById('diag-sample-product');
      if (sampleInput) this.merchantData.sampleProduct = sampleInput.value.trim();
    }
  }

  nextMerchantStep() {
    this.syncCurrentStepInputs();

    if (this.merchantWizardStep === 1) {
      if (!this.merchantData.businessName || !this.merchantData.phone) {
        this.showToast('⚠️ Por favor ingresa el Nombre de tu Negocio y tu WhatsApp de contacto.');
        return;
      }
    }

    if (this.merchantWizardStep < 5) {
      this.merchantWizardStep++;
      this.renderMerchantStep();
    } else {
      this.sendMerchantRegistrationWhatsApp();
    }
  }

  prevMerchantStep() {
    this.syncCurrentStepInputs();
    if (this.merchantWizardStep > 1) {
      this.merchantWizardStep--;
      this.renderMerchantStep();
    } else {
      this.closeMerchantRegistrationModal();
    }
  }

  selectMerchantBusinessModel(modelKey, shouldRender = true) {
    if (!this.merchantData) this.merchantData = this.getDefaultMerchantData();
    this.merchantData.businessModel = modelKey;

    if (modelKey === 'custom_craft') {
      // Por encargo / Piñatas / Repostería / Resina
      this.merchantData.productAttributes = {
        photo: true,
        size: true,
        customName: true,
        customNumber: true,
        colors: true,
        extras: true,
        leadTimeDays: true,
        variantsStock: false,
        tableIngredients: false
      };
      this.merchantData.pricingModel = 'range';
      this.merchantData.prepTime = 'order_days';
      if (!this.merchantData.sampleProduct || this.merchantData.sampleProduct.includes('Hamburguesa')) {
        this.merchantData.sampleProduct = 'Piñata Número Temática Personalizada';
      }
    } else if (modelKey === 'food') {
      // Gastronomía / Restaurantes
      this.merchantData.productAttributes = {
        photo: true,
        size: false,
        customName: false,
        customNumber: false,
        colors: false,
        extras: true,
        leadTimeDays: false,
        variantsStock: false,
        tableIngredients: true
      };
      this.merchantData.pricingModel = 'fixed';
      this.merchantData.prepTime = 'immediate';
      this.merchantData.sampleProduct = 'Combo Especial Burger + Papas y Bebida';
    } else if (modelKey === 'retail') {
      // Tiendas físicas / Stock directo
      this.merchantData.productAttributes = {
        photo: true,
        size: false,
        customName: false,
        customNumber: false,
        colors: false,
        extras: false,
        leadTimeDays: false,
        variantsStock: true,
        tableIngredients: false
      };
      this.merchantData.pricingModel = 'fixed';
      this.merchantData.prepTime = 'same_day';
      this.merchantData.sampleProduct = 'Zapatillas Deportivas Talla 38-42';
    } else if (modelKey === 'service') {
      // Servicios técnicos / Auxilio vial / Latonería
      this.merchantData.productAttributes = {
        photo: true,
        size: false,
        customName: false,
        customNumber: false,
        colors: false,
        extras: true,
        leadTimeDays: false,
        variantsStock: false,
        tableIngredients: false
      };
      this.merchantData.pricingModel = 'custom_quote';
      this.merchantData.prepTime = 'immediate';
      this.merchantData.sampleProduct = 'Cotización Latonería y Pintura / Pieza';
    }

    if (shouldRender) {
      this.renderMerchantStep();
    }
  }

  toggleMerchantProductAttr(attrKey) {
    if (!this.merchantData) this.merchantData = this.getDefaultMerchantData();
    this.merchantData.productAttributes[attrKey] = !this.merchantData.productAttributes[attrKey];
    this.renderMerchantStep();
  }

  setMerchantPricingModel(model) {
    if (!this.merchantData) this.merchantData = this.getDefaultMerchantData();
    this.merchantData.pricingModel = model;
    this.renderMerchantStep();
  }

  setMerchantPrepTime(time) {
    if (!this.merchantData) this.merchantData = this.getDefaultMerchantData();
    this.merchantData.prepTime = time;
    this.renderMerchantStep();
  }

  setMerchantDelivery(method) {
    if (!this.merchantData) this.merchantData = this.getDefaultMerchantData();
    this.merchantData.deliveryMethod = method;
    this.renderMerchantStep();
  }

  toggleMerchantCurrency(curr) {
    if (!this.merchantData) this.merchantData = this.getDefaultMerchantData();
    const currs = this.merchantData.currencies || [];
    const idx = currs.indexOf(curr);
    if (idx >= 0) {
      if (currs.length > 1) currs.splice(idx, 1);
    } else {
      currs.push(curr);
    }
    this.merchantData.currencies = currs;
    this.renderMerchantStep();
  }

  generateMerchantTemplate() {
    const d = this.merchantData || this.getDefaultMerchantData();
    const modelLabels = {
      custom_craft: 'Por Encargo, Artesanías & Personalizados (Ej: Piñatas, Resina, Repostería)',
      food: 'Gastronomía & Comida Preparada (Restaurantes, Pizzerías, Hamburguesas)',
      retail: 'Retail, Moda & Stock Físico (Ropa, Calzado, Ferretería, Supermercado)',
      service: 'Servicios Técnicos & Auxilio (Mecánica, Latonería, Cerrajería, Grúas)'
    };

    const panelTypes = {
      custom_craft: 'Panel de Personalización por Encargo (Foto + Nombre + Tamaño + Extras + Anticipación)',
      food: 'Panel Menú Gastronómico & Comanda Cocina (KDS + Combos + Ingredientes)',
      retail: 'Panel Retail & Control de Inventario (Variantes + Tallas + Stock en Vivo)',
      service: 'Panel Despacho de Servicios & Geocasting (Ubicación GPS + Fotos de Daño)'
    };

    const activeAttrs = [];
    if (d.productAttributes.photo) activeAttrs.push('Foto obligatoria de referencia');
    if (d.productAttributes.size) activeAttrs.push('Tamaño / Medidas / Dimensiones (ej. Pequeña, Mediana, Grande)');
    if (d.productAttributes.customName) activeAttrs.push('Nombre o dedicatoria personalizada');
    if (d.productAttributes.customNumber) activeAttrs.push('Número / Motivo temático');
    if (d.productAttributes.colors) activeAttrs.push('Colores / Acabados');
    if (d.productAttributes.extras) activeAttrs.push('Extras / Rellenos / Adicionales opcionales');
    if (d.productAttributes.leadTimeDays) activeAttrs.push('Fecha / Días de anticipación requeridos');
    if (d.productAttributes.variantsStock) activeAttrs.push('Tallas / Variantes con control de stock');
    if (d.productAttributes.tableIngredients) activeAttrs.push('Selección de salsas / ingredientes');

    const prepLabels = {
      immediate: 'Inmediato (15 - 45 min)',
      same_day: 'Mismo día (1 - 4 horas)',
      order_days: 'Por encargo programado (2 a 5 días)'
    };

    const deliveryLabels = {
      pedigochos: 'Red de Domiciliarios PediGochos (Motorizados de la app)',
      own_delivery: 'Repartidores propios del comercio',
      pickup: 'Retiro en tienda física / Taller'
    };

    const pricingLabels = {
      fixed: 'Precio Fijo Directo en Menú',
      range: 'Precio Base Referencial + Rango según Tamaño',
      custom_quote: 'Cotización Personalizada Previa por Chat'
    };

    const template = 
`📋 *FICHA TÉCNICA & FIT PERSONALIZADO PEDIGOCHOS* 🚀
========================================
🏢 *Comercio:* ${d.businessName || 'Comercio Registrado'}
👤 *Responsable:* ${d.contactName || 'Encargado'}
📱 *WhatsApp:* ${d.phone}
📍 *Ciudad / Zona:* ${d.city || 'San Cristóbal'} ${d.address ? ' - ' + d.address : ''}
🏷️ *Rubro / Modelo:* ${modelLabels[d.businessModel] || d.businessModel}

⚙️ *TIPO DE PANEL ASIGNADO:*
👉 ${panelTypes[d.businessModel] || 'Panel Estándar PediGochos'}

📦 *CAMPOS REQUERIDOS PARA VENDER CADA PRODUCTO:*
${activeAttrs.map(a => `  • ✅ ${a}`).join('\n')}

💰 *MODALIDAD DE PRECIO:*
  • ${pricingLabels[d.pricingModel] || d.pricingModel}

⏱️ *TIEMPO DE PREPARACIÓN / ELABORACIÓN:*
  • ${prepLabels[d.prepTime] || d.prepTime}

🛵 *LOGÍSTICA DE DESPACHO:*
  • ${deliveryLabels[d.deliveryMethod] || d.deliveryMethod}

💵 *MONEDAS ACEPTADAS:*
  • ${(d.currencies || ['COP', 'USD']).join(', ')}

🌟 *PRODUCTO ESTRELLA DE EJEMPLO:*
  • "${d.sampleProduct || 'Producto Principal'}"
========================================
✨ Generado automáticamente por el Test Diagnóstico de PediGochos`;

    return template;
  }

  renderMerchantStep() {
    const d = this.merchantData || this.getDefaultMerchantData();
    const container = document.getElementById('merchant-diag-body-content');
    const label = document.getElementById('merchant-diag-step-label');
    const fill = document.getElementById('merchant-diag-progress-fill');
    const btnBack = document.getElementById('btn-merchant-diag-back');
    const btnNext = document.getElementById('btn-merchant-diag-next');

    if (!container) return;

    if (fill) fill.style.width = `${(this.merchantWizardStep / 5) * 100}%`;

    // Footer buttons configuration
    if (btnBack) {
      if (this.merchantWizardStep === 1) {
        btnBack.textContent = 'Cancelar';
        btnBack.onclick = () => this.closeMerchantRegistrationModal();
      } else {
        btnBack.textContent = '← Volver';
        btnBack.onclick = () => this.prevMerchantStep();
      }
    }

    if (btnNext) {
      if (this.merchantWizardStep < 5) {
        btnNext.innerHTML = '<span>Continuar</span> <span>➔</span>';
        btnNext.style.background = 'linear-gradient(135deg, #FF6B00 0%, #EA580C 100%)';
        btnNext.onclick = () => this.nextMerchantStep();
      } else {
        btnNext.innerHTML = '<span>📲 Enviar a WhatsApp (+57 322 794 9751)</span> <span>🚀</span>';
        btnNext.style.background = 'linear-gradient(135deg, #10B981 0%, #059669 100%)';
        btnNext.onclick = () => this.sendMerchantRegistrationWhatsApp();
      }
    }

    // Step 1: Identidad & Contacto
    if (this.merchantWizardStep === 1) {
      if (label) label.textContent = 'Paso 1 de 5: Datos de tu Negocio & Contacto';
      container.innerHTML = `
        <div style="margin-bottom: 16px;">
          <h4 style="color: #FFF; font-size: 15px; font-weight: 800; margin: 0 0 4px 0;">¡Inicia el Registro de tu Comercio!</h4>
          <p style="color: #94A3B8; font-size: 12px; margin: 0; line-height: 1.4;">
            Responde este breve test diagnóstico para diseñar la ficha técnica y el panel exacto que necesita tu negocio para vender en PediGochos.
          </p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div>
            <label style="font-size: 11.5px; color: #CBD5E1; font-weight: 800; display: block; margin-bottom: 5px;">Nombre Comercial de tu Negocio / Tienda *</label>
            <input type="text" id="diag-merchant-name" value="${d.businessName || ''}" placeholder="Ej: Piñatas Creativas Gochas / Burger Express" style="width: 100%; background: #0F172A; border: 1.5px solid rgba(255,255,255,0.15); color: #FFF; padding: 10px 12px; border-radius: 10px; font-size: 13px; box-sizing: border-box;">
          </div>

          <div>
            <label style="font-size: 11.5px; color: #CBD5E1; font-weight: 800; display: block; margin-bottom: 5px;">Nombre del Encargado o Propietario</label>
            <input type="text" id="diag-contact-name" value="${d.contactName || ''}" placeholder="Ej: Sergio Antía / María Gómez" style="width: 100%; background: #0F172A; border: 1.5px solid rgba(255,255,255,0.15); color: #FFF; padding: 10px 12px; border-radius: 10px; font-size: 13px; box-sizing: border-box;">
          </div>

          <div>
            <label style="font-size: 11.5px; color: #CBD5E1; font-weight: 800; display: block; margin-bottom: 5px;">WhatsApp Oficial para Pedidos & Comandas *</label>
            <input type="tel" id="diag-merchant-phone" value="${d.phone || ''}" placeholder="Ej: +57 322 794 9751 o +58 414 1234567" style="width: 100%; background: #0F172A; border: 1.5px solid #FF6B00; color: #FFF; padding: 10px 12px; border-radius: 10px; font-size: 13px; box-sizing: border-box;">
            <span style="font-size: 10px; color: #FDA4AF; display: block; margin-top: 3px;">A este número te llegarán las notificaciones automáticas de pedidos.</span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <label style="font-size: 11.5px; color: #CBD5E1; font-weight: 800; display: block; margin-bottom: 5px;">Ciudad / Zona *</label>
              <select id="diag-merchant-city" style="width: 100%; background: #0F172A; border: 1.5px solid rgba(255,255,255,0.15); color: #FFF; padding: 10px 12px; border-radius: 10px; font-size: 12.5px; box-sizing: border-box;">
                <option value="San Cristóbal" ${d.city === 'San Cristóbal' ? 'selected' : ''}>San Cristóbal</option>
                <option value="Táriba" ${d.city === 'Táriba' ? 'selected' : ''}>Táriba</option>
                <option value="San Antonio del Táchira" ${d.city === 'San Antonio del Táchira' ? 'selected' : ''}>San Antonio del Táchira</option>
                <option value="Ureña" ${d.city === 'Ureña' ? 'selected' : ''}>Ureña</option>
                <option value="Cúcuta" ${d.city === 'Cúcuta' ? 'selected' : ''}>Cúcuta (Colombia)</option>
                <option value="Otra Zona" ${d.city === 'Otra Zona' ? 'selected' : ''}>Otra Zona</option>
              </select>
            </div>
            <div>
              <label style="font-size: 11.5px; color: #CBD5E1; font-weight: 800; display: block; margin-bottom: 5px;">Sector o Dirección</label>
              <input type="text" id="diag-merchant-address" value="${d.address || ''}" placeholder="Ej: Barrio Obrero / Centro" style="width: 100%; background: #0F172A; border: 1.5px solid rgba(255,255,255,0.15); color: #FFF; padding: 10px 12px; border-radius: 10px; font-size: 12.5px; box-sizing: border-box;">
            </div>
          </div>
        </div>
      `;
      return;
    }

    // Step 2: Modelo & Rubro de Negocio
    if (this.merchantWizardStep === 2) {
      if (label) label.textContent = 'Paso 2 de 5: Modelo & Rubro de tu Negocio';
      container.innerHTML = `
        <div style="margin-bottom: 14px;">
          <h4 style="color: #FFF; font-size: 15px; font-weight: 800; margin: 0 0 4px 0;">¿Cuál es la naturaleza de tus ventas?</h4>
          <p style="color: #94A3B8; font-size: 12px; margin: 0; line-height: 1.4;">
            Selecciona la opción que mejor describe tu modelo comercial. Esto determinará el flujo de pedidos y el panel a medida:
          </p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          
          <!-- Opción 1: Por Encargo / Artesanías / Piñatas -->
          <div class="merchant-choice-card ${d.businessModel === 'custom_craft' ? 'selected' : ''}" onclick="MarketplaceApp.selectMerchantBusinessModel('custom_craft')">
            <span style="font-size: 26px;">🪅</span>
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <strong style="color: #FFF; font-size: 13.5px;">Por Encargo, Artesanías & Personalizados</strong>
                ${d.businessModel === 'custom_craft' ? '<span style="color: #FF6B00; font-weight: 900; font-size: 16px;">✓</span>' : ''}
              </div>
              <p style="color: #FDA4AF; font-size: 11px; margin: 2px 0 4px 0; font-weight: 700;">Piñatas a medida, repostería temática, resina epóxica, souvenirs, manualidades.</p>
              <span style="color: #94A3B8; font-size: 11px; line-height: 1.3; display: block;">
                ✨ Requiere: <strong>Foto de referencia + Medidas/Tamaño + Nombre personalizado + Días de anticipación</strong>.
              </span>
            </div>
          </div>

          <!-- Opción 2: Gastronomía & Comidas -->
          <div class="merchant-choice-card ${d.businessModel === 'food' ? 'selected' : ''}" onclick="MarketplaceApp.selectMerchantBusinessModel('food')">
            <span style="font-size: 26px;">🍔</span>
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <strong style="color: #FFF; font-size: 13.5px;">Gastronomía & Comida Preparada</strong>
                ${d.businessModel === 'food' ? '<span style="color: #FF6B00; font-weight: 900; font-size: 16px;">✓</span>' : ''}
              </div>
              <p style="color: #FCD34D; font-size: 11px; margin: 2px 0 4px 0; font-weight: 700;">Restaurantes, hamburgueserías, pizzerías, comida rápida, cafeterías.</p>
              <span style="color: #94A3B8; font-size: 11px; line-height: 1.3; display: block;">
                ⚡ Requiere: <strong>Comanda digital para cocina (KDS) + Selección de salsas/combos + Despacho rápido (20-40 min)</strong>.
              </span>
            </div>
          </div>

          <!-- Opción 3: Retail & Stock Físico -->
          <div class="merchant-choice-card ${d.businessModel === 'retail' ? 'selected' : ''}" onclick="MarketplaceApp.selectMerchantBusinessModel('retail')">
            <span style="font-size: 26px;">👗</span>
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <strong style="color: #FFF; font-size: 13.5px;">Retail, Moda & Stock Físico</strong>
                ${d.businessModel === 'retail' ? '<span style="color: #FF6B00; font-weight: 900; font-size: 16px;">✓</span>' : ''}
              </div>
              <p style="color: #93C5FD; font-size: 11px; margin: 2px 0 4px 0; font-weight: 700;">Tiendas de ropa, calzado, ferreterías, repuestos, cosméticos, minimercados.</p>
              <span style="color: #94A3B8; font-size: 11px; line-height: 1.3; display: block;">
                📦 Requiere: <strong>Control de inventario + Selección de tallas/colores + Despacho en el día</strong>.
              </span>
            </div>
          </div>

          <!-- Opción 4: Servicios Técnicos & Auxilio -->
          <div class="merchant-choice-card ${d.businessModel === 'service' ? 'selected' : ''}" onclick="MarketplaceApp.selectMerchantBusinessModel('service')">
            <span style="font-size: 26px;">🔧</span>
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <strong style="color: #FFF; font-size: 13.5px;">Servicios Técnicos & Auxilio Inmediato</strong>
                ${d.businessModel === 'service' ? '<span style="color: #FF6B00; font-weight: 900; font-size: 16px;">✓</span>' : ''}
              </div>
              <p style="color: #A7F3D0; font-size: 11px; margin: 2px 0 4px 0; font-weight: 700;">Latonería y pintura, mecánica automotriz, auxilio vial, cerrajería, plomería.</p>
              <span style="color: #94A3B8; font-size: 11px; line-height: 1.3; display: block;">
                🚨 Requiere: <strong>Subida de foto del vehículo/daño + Ubicación GPS en tiempo real + Cotización por chat</strong>.
              </span>
            </div>
          </div>

        </div>
      `;
      return;
    }

    // Step 3: Ficha Técnica & Atributos del Producto
    if (this.merchantWizardStep === 3) {
      if (label) label.textContent = 'Paso 3 de 5: Ficha Técnica (¿Qué necesitas para vender?)';
      const attrs = d.productAttributes || {};
      container.innerHTML = `
        <div style="margin-bottom: 12px;">
          <h4 style="color: #FFF; font-size: 15px; font-weight: 800; margin: 0 0 4px 0;">Configura los atributos de tus productos</h4>
          <p style="color: #94A3B8; font-size: 12px; margin: 0; line-height: 1.4;">
            Marca qué información obligatoria u opcional debe proporcionar el cliente al comprar en tu tienda:
          </p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px;">
          
          <div class="merchant-attr-checkbox ${attrs.photo ? 'selected' : ''}" onclick="MarketplaceApp.toggleMerchantProductAttr('photo')">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span>📸</span>
              <div>
                <strong style="color: #FFF; font-size: 12.5px;">Foto de Referencia Obligatoria</strong>
                <span style="display: block; font-size: 10.5px; color: #94A3B8;">El cliente debe adjuntar una imagen del modelo o daño que desea cotizar</span>
              </div>
            </div>
            <input type="checkbox" ${attrs.photo ? 'checked' : ''} style="pointer-events: none; accent-color: #FF6B00;">
          </div>

          <div class="merchant-attr-checkbox ${attrs.size ? 'selected' : ''}" onclick="MarketplaceApp.toggleMerchantProductAttr('size')">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span>📏</span>
              <div>
                <strong style="color: #FFF; font-size: 12.5px;">Tamaño, Dimensiones o Medidas</strong>
                <span style="display: block; font-size: 10.5px; color: #94A3B8;">Selección de medidas (ej: Pequeña 50cm, Mediana 80cm, Grande 1m+)</span>
              </div>
            </div>
            <input type="checkbox" ${attrs.size ? 'checked' : ''} style="pointer-events: none; accent-color: #FF6B00;">
          </div>

          <div class="merchant-attr-checkbox ${attrs.customName ? 'selected' : ''}" onclick="MarketplaceApp.toggleMerchantProductAttr('customName')">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span>✍️</span>
              <div>
                <strong style="color: #FFF; font-size: 12.5px;">Nombre o Texto Personalizado</strong>
                <span style="display: block; font-size: 10.5px; color: #94A3B8;">Campo de texto para dedicatorias, nombres del cumpleañero, etc.</span>
              </div>
            </div>
            <input type="checkbox" ${attrs.customName ? 'checked' : ''} style="pointer-events: none; accent-color: #FF6B00;">
          </div>

          <div class="merchant-attr-checkbox ${attrs.customNumber ? 'selected' : ''}" onclick="MarketplaceApp.toggleMerchantProductAttr('customNumber')">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span>🔢</span>
              <div>
                <strong style="color: #FFF; font-size: 12.5px;">Número o Edad Temática</strong>
                <span style="display: block; font-size: 10.5px; color: #94A3B8;">Selector de número temático para piñatas o aniversarios (1-99)</span>
              </div>
            </div>
            <input type="checkbox" ${attrs.customNumber ? 'checked' : ''} style="pointer-events: none; accent-color: #FF6B00;">
          </div>

          <div class="merchant-attr-checkbox ${attrs.extras ? 'selected' : ''}" onclick="MarketplaceApp.toggleMerchantProductAttr('extras')">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span>🎁</span>
              <div>
                <strong style="color: #FFF; font-size: 12.5px;">Extras, Rellenos o Adiciones Opcionales</strong>
                <span style="display: block; font-size: 10.5px; color: #94A3B8;">Palo decorado, antifaz, relleno de golosinas, salsas extra, etc.</span>
              </div>
            </div>
            <input type="checkbox" ${attrs.extras ? 'checked' : ''} style="pointer-events: none; accent-color: #FF6B00;">
          </div>

          <div class="merchant-attr-checkbox ${attrs.leadTimeDays ? 'selected' : ''}" onclick="MarketplaceApp.toggleMerchantProductAttr('leadTimeDays')">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span>📅</span>
              <div>
                <strong style="color: #FFF; font-size: 12.5px;">Días de Anticipación Requeridos</strong>
                <span style="display: block; font-size: 10.5px; color: #94A3B8;">El cliente debe elegir la fecha de entrega con margen mínimo de elaboración</span>
              </div>
            </div>
            <input type="checkbox" ${attrs.leadTimeDays ? 'checked' : ''} style="pointer-events: none; accent-color: #FF6B00;">
          </div>

          <div class="merchant-attr-checkbox ${attrs.variantsStock ? 'selected' : ''}" onclick="MarketplaceApp.toggleMerchantProductAttr('variantsStock')">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span>🏷️</span>
              <div>
                <strong style="color: #FFF; font-size: 12.5px;">Tallas & Control de Stock Físico</strong>
                <span style="display: block; font-size: 10.5px; color: #94A3B8;">Variantes de tallas (S, M, L / 38, 40) con descuento automático de inventario</span>
              </div>
            </div>
            <input type="checkbox" ${attrs.variantsStock ? 'checked' : ''} style="pointer-events: none; accent-color: #FF6B00;">
          </div>

        </div>

        <!-- Modalidad de Precio -->
        <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px; margin-bottom: 12px;">
          <label style="font-size: 11.5px; color: #FCD34D; font-weight: 800; display: block; margin-bottom: 8px;">💰 Modalidad de Precios:</label>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #CBD5E1; cursor: pointer;">
              <input type="radio" name="diag-pricing" value="fixed" ${d.pricingModel === 'fixed' ? 'checked' : ''} onchange="MarketplaceApp.setMerchantPricingModel('fixed')" style="accent-color: #FF6B00;">
              <span><strong>Precio Fijo Directo:</strong> Cada producto tiene su precio exacto para compra inmediata.</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #CBD5E1; cursor: pointer;">
              <input type="radio" name="diag-pricing" value="range" ${d.pricingModel === 'range' ? 'checked' : ''} onchange="MarketplaceApp.setMerchantPricingModel('range')" style="accent-color: #FF6B00;">
              <span><strong>Precio Referencial + Rango:</strong> El precio varía según el tamaño o personalización elegida.</span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #CBD5E1; cursor: pointer;">
              <input type="radio" name="diag-pricing" value="custom_quote" ${d.pricingModel === 'custom_quote' ? 'checked' : ''} onchange="MarketplaceApp.setMerchantPricingModel('custom_quote')" style="accent-color: #FF6B00;">
              <span><strong>Cotización por Chat / WhatsApp:</strong> Se calcula tras revisar las fotos y requerimientos del cliente.</span>
            </label>
          </div>
        </div>

        <div>
          <label style="font-size: 11.5px; color: #CBD5E1; font-weight: 800; display: block; margin-bottom: 5px;">Menciona un producto estrella de tu negocio:</label>
          <input type="text" id="diag-sample-product" value="${d.sampleProduct || ''}" placeholder="Ej: Piñata de Número 3D / Torta Temática / Combo Doble" style="width: 100%; background: #0F172A; border: 1.5px solid rgba(255,255,255,0.15); color: #FFF; padding: 10px 12px; border-radius: 10px; font-size: 12.5px; box-sizing: border-box;">
        </div>
      `;
      return;
    }

    // Step 4: Logística, Tiempos & Monedas
    if (this.merchantWizardStep === 4) {
      if (label) label.textContent = 'Paso 4 de 5: Tiempos de Entrega, Logística & Monedas';
      const currs = d.currencies || [];
      container.innerHTML = `
        <div style="margin-bottom: 12px;">
          <h4 style="color: #FFF; font-size: 15px; font-weight: 800; margin: 0 0 4px 0;">¿Cómo opera tu logística y pagos?</h4>
          <p style="color: #94A3B8; font-size: 12px; margin: 0; line-height: 1.4;">
            Define cómo gestionarás la preparación, los envíos a los clientes y las monedas que aceptas:
          </p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          
          <!-- Tiempos de preparación -->
          <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px;">
            <label style="font-size: 11.5px; color: #FDA4AF; font-weight: 800; display: block; margin-bottom: 8px;">⏱️ Tiempos de Preparación / Elaboración:</label>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
              <button type="button" onclick="MarketplaceApp.setMerchantPrepTime('immediate')" style="background: ${d.prepTime === 'immediate' ? '#FF6B00' : 'rgba(255,255,255,0.06)'}; border: 1px solid ${d.prepTime === 'immediate' ? '#FF6B00' : 'rgba(255,255,255,0.1)'}; color: #FFF; padding: 8px 6px; border-radius: 8px; font-size: 11px; font-weight: 800; cursor: pointer;">
                ⚡ 15-45 min (Inmediato)
              </button>
              <button type="button" onclick="MarketplaceApp.setMerchantPrepTime('same_day')" style="background: ${d.prepTime === 'same_day' ? '#FF6B00' : 'rgba(255,255,255,0.06)'}; border: 1px solid ${d.prepTime === 'same_day' ? '#FF6B00' : 'rgba(255,255,255,0.1)'}; color: #FFF; padding: 8px 6px; border-radius: 8px; font-size: 11px; font-weight: 800; cursor: pointer;">
                ⏱️ 1-4 horas (Mismo día)
              </button>
              <button type="button" onclick="MarketplaceApp.setMerchantPrepTime('order_days')" style="background: ${d.prepTime === 'order_days' ? '#FF6B00' : 'rgba(255,255,255,0.06)'}; border: 1px solid ${d.prepTime === 'order_days' ? '#FF6B00' : 'rgba(255,255,255,0.1)'}; color: #FFF; padding: 8px 6px; border-radius: 8px; font-size: 11px; font-weight: 800; cursor: pointer;">
                📅 2 a 5 días (Por Encargo)
              </button>
            </div>
          </div>

          <!-- Logística de Despacho -->
          <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px;">
            <label style="font-size: 11.5px; color: #93C5FD; font-weight: 800; display: block; margin-bottom: 8px;">🛵 Modalidad de Entrega al Cliente:</label>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #CBD5E1; cursor: pointer;">
                <input type="radio" name="diag-delivery" value="pedigochos" ${d.deliveryMethod === 'pedigochos' ? 'checked' : ''} onchange="MarketplaceApp.setMerchantDelivery('pedigochos')" style="accent-color: #FF6B00;">
                <span><strong>Red de Domiciliarios PediGochos:</strong> Los motorizados oficiales de la app retiran en tu local y entregan con rastreo en vivo.</span>
              </label>
              <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #CBD5E1; cursor: pointer;">
                <input type="radio" name="diag-delivery" value="own_delivery" ${d.deliveryMethod === 'own_delivery' ? 'checked' : ''} onchange="MarketplaceApp.setMerchantDelivery('own_delivery')" style="accent-color: #FF6B00;">
                <span><strong>Repartidores Propios:</strong> Tu negocio tiene su propio personal de entrega.</span>
              </label>
              <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #CBD5E1; cursor: pointer;">
                <input type="radio" name="diag-delivery" value="pickup" ${d.deliveryMethod === 'pickup' ? 'checked' : ''} onchange="MarketplaceApp.setMerchantDelivery('pickup')" style="accent-color: #FF6B00;">
                <span><strong>Retiro en Taller / Local Físico:</strong> El cliente busca su encargo en tu ubicación.</span>
              </label>
            </div>
          </div>

          <!-- Monedas Aceptadas -->
          <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px;">
            <label style="font-size: 11.5px; color: #6EE7B7; font-weight: 800; display: block; margin-bottom: 8px;">💵 Monedas & Métodos que aceptas:</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #CBD5E1; cursor: pointer;">
                <input type="checkbox" ${currs.includes('COP') ? 'checked' : ''} onchange="MarketplaceApp.toggleMerchantCurrency('COP')" style="accent-color: #FF6B00;">
                <span>🇨🇴 Pesos Colombianos (COP)</span>
              </label>
              <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #CBD5E1; cursor: pointer;">
                <input type="checkbox" ${currs.includes('USD') ? 'checked' : ''} onchange="MarketplaceApp.toggleMerchantCurrency('USD')" style="accent-color: #FF6B00;">
                <span>💵 Dólares en Efectivo (USD)</span>
              </label>
              <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #CBD5E1; cursor: pointer;">
                <input type="checkbox" ${currs.includes('BS') ? 'checked' : ''} onchange="MarketplaceApp.toggleMerchantCurrency('BS')" style="accent-color: #FF6B00;">
                <span>🇻🇪 Bolívares / Pago Móvil (Bs)</span>
              </label>
              <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #CBD5E1; cursor: pointer;">
                <input type="checkbox" ${currs.includes('ZELLE_BINANCE') ? 'checked' : ''} onchange="MarketplaceApp.toggleMerchantCurrency('ZELLE_BINANCE')" style="accent-color: #FF6B00;">
                <span>⚡ Zelle / Binance USDT</span>
              </label>
            </div>
          </div>

        </div>
      `;
      return;
    }

    // Step 5: Fit Personalizado & Plantilla Generada
    if (this.merchantWizardStep === 5) {
      if (label) label.textContent = 'Paso 5 de 5: Tu Fit Personalizado & Plantilla Lista';
      const template = this.generateMerchantTemplate();
      const modelNames = {
        custom_craft: 'Por Encargo & Artesanías (Piñatas / Resina / Repostería)',
        food: 'Gastronomía & Restaurante',
        retail: 'Retail & Stock Físico',
        service: 'Servicios Técnicos & Auxilio'
      };

      const panelBadge = {
        custom_craft: 'Panel de Personalización por Encargo (Foto + Nombre + Tamaño + Extras)',
        food: 'Panel Gastronómico & Comanda KDS',
        retail: 'Panel Retail & Control de Inventario',
        service: 'Panel Despacho de Servicios & Geocasting'
      };

      const attrs = d.productAttributes || {};
      const activeAttrTags = [];
      if (attrs.photo) activeAttrTags.push('📸 Foto Obligatoria');
      if (attrs.size) activeAttrTags.push('📏 Tamaño / Medidas');
      if (attrs.customName) activeAttrTags.push('✍️ Nombre Personalizado');
      if (attrs.customNumber) activeAttrTags.push('🔢 Número / Motivo');
      if (attrs.extras) activeAttrTags.push('🎁 Extras / Relleno');
      if (attrs.leadTimeDays) activeAttrTags.push('📅 Días Anticipación');
      if (attrs.variantsStock) activeAttrTags.push('🏷️ Control Stock / Tallas');
      if (attrs.tableIngredients) activeAttrTags.push('🍔 Salsas / Ingredientes');

      container.innerHTML = `
        <div style="margin-bottom: 12px; text-align: center;">
          <span style="font-size: 32px; display: block; margin-bottom: 4px;">🎉🚀</span>
          <h4 style="color: #FFF; font-size: 16px; font-weight: 900; margin: 0 0 4px 0;">¡Plantilla & Fit Personalizado Generado con Éxito!</h4>
          <span style="background: rgba(16, 185, 129, 0.15); border: 1px solid #10B981; color: #6EE7B7; font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 20px; display: inline-block;">
            Fit Optimizado para: ${d.businessName || 'Tu Negocio'}
          </span>
        </div>

        <!-- Technical Specification Card -->
        <div class="merchant-template-sheet" style="margin-bottom: 14px;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; margin-bottom: 10px;">
            <div>
              <strong style="color: #FFF; font-size: 14px; display: block;">${d.businessName || 'Comercio Registrado'}</strong>
              <span style="color: #FDA4AF; font-size: 11px;">${modelNames[d.businessModel] || d.businessModel}</span>
            </div>
            <span style="background: #FF6B00; color: #FFF; font-size: 10.5px; font-weight: 900; padding: 2px 8px; border-radius: 6px;">
              ${d.city || 'San Cristóbal'}
            </span>
          </div>

          <div style="margin-bottom: 10px;">
            <span style="font-size: 10.5px; color: #94A3B8; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 4px;">Panel Recomendado:</span>
            <div style="background: rgba(255, 107, 0, 0.15); border: 1px solid #FF6B00; border-radius: 8px; padding: 8px 10px; color: #FFA94D; font-size: 12px; font-weight: 800;">
              ⚙️ ${panelBadge[d.businessModel] || 'Panel PediGochos'}
            </div>
          </div>

          <div style="margin-bottom: 10px;">
            <span style="font-size: 10.5px; color: #94A3B8; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 6px;">Campos para Vender Cada Producto:</span>
            <div style="display: flex; flex-wrap: wrap; gap: 5px;">
              ${activeAttrTags.map(tag => `
                <span style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #FFF; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px;">
                  ${tag}
                </span>
              `).join('')}
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px; color: #CBD5E1; background: rgba(0,0,0,0.3); border-radius: 8px; padding: 8px 10px; margin-bottom: 10px;">
            <div><strong>⏱️ Tiempo:</strong> ${d.prepTime === 'order_days' ? '2 a 5 días' : d.prepTime === 'same_day' ? '1 a 4 horas' : '15-45 min'}</div>
            <div><strong>🛵 Entrega:</strong> ${d.deliveryMethod === 'pedigochos' ? 'PediGochos Moto' : d.deliveryMethod === 'own_delivery' ? 'Propio' : 'Retiro'}</div>
            <div><strong>💰 Precio:</strong> ${d.pricingModel === 'range' ? 'Base + Tamaño' : d.pricingModel === 'fixed' ? 'Fijo' : 'Cotización'}</div>
            <div><strong>💵 Monedas:</strong> ${(d.currencies || ['COP', 'USD']).join(', ')}</div>
          </div>

          <div>
            <span style="font-size: 10px; color: #94A3B8; font-weight: 800; display: block; margin-bottom: 4px;">Esquema de Plantilla Técnica:</span>
            <pre style="background: #050811; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 8px; font-size: 10.5px; color: #38BDF8; max-height: 110px; overflow-y: auto; white-space: pre-wrap; font-family: monospace; margin: 0;">${template}</pre>
          </div>
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; gap: 8px;">
            <button type="button" onclick="MarketplaceApp.saveMerchantRegistrationToSystem()" style="flex: 1; background: #2563EB; color: #FFF; border: none; padding: 10px; border-radius: 10px; font-size: 12px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 8px rgba(37, 99, 235, 0.4);">
              <span>💾</span>
              <span>Guardar en Plataforma</span>
            </button>
            <button type="button" onclick="MarketplaceApp.copyMerchantTemplateToClipboard()" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #FFF; padding: 10px 14px; border-radius: 10px; font-size: 12px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 6px;">
              <span>📋</span>
              <span>Copiar Ficha</span>
            </button>
          </div>

          <div style="font-size: 11px; color: #94A3B8; text-align: center; margin-top: 4px;">
            Al presionar <strong>"Enviar a WhatsApp"</strong> abajo, se abrirá el chat oficial de soporte con tu ficha técnica completa para activar tu tienda.
          </div>
        </div>
      `;
      return;
    }
  }

  async saveMerchantRegistrationToSystem() {
    this.syncCurrentStepInputs();
    const d = this.merchantData || this.getDefaultMerchantData();

    if (!d.businessName || !d.phone) {
      this.showToast('⚠️ Por favor completa el nombre del comercio y WhatsApp.');
      return;
    }

    const templateText = this.generateMerchantTemplate();

    const payload = {
      businessName: d.businessName,
      contactName: d.contactName || '',
      phone: d.phone,
      city: d.city || 'San Cristóbal',
      address: d.address || '',
      businessModel: d.businessModel,
      productAttributes: d.productAttributes,
      pricingModel: d.pricingModel,
      sampleProduct: d.sampleProduct,
      prepTime: d.prepTime,
      deliveryMethod: d.deliveryMethod,
      currencies: d.currencies,
      templateText: templateText
    };

    try {
      this.showToast('⏳ Registrando comercio en el sistema PediGochos...');
      const res = await fetch('/api/merchants/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        this.showToast('✅ ¡Comercio registrado exitosamente! La administración lo revisará.');
      } else {
        this.showToast(data.error || 'No se pudo guardar la solicitud.');
      }
    } catch(e) {
      console.warn('Error saving merchant registration lead:', e);
      this.showToast('✅ Solicitud guardada localmente.');
    }
  }

  copyMerchantTemplateToClipboard() {
    const template = this.generateMerchantTemplate();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(template).then(() => {
        this.showToast('📋 ¡Ficha técnica copiada al portapapeles!');
      }).catch(() => {
        this.fallbackCopyText(template);
      });
    } else {
      this.fallbackCopyText(template);
    }
  }

  fallbackCopyText(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      this.showToast('📋 ¡Ficha técnica copiada al portapapeles!');
    } catch(err) {
      this.showToast('⚠️ No se pudo copiar automáticamente.');
    }
    document.body.removeChild(textArea);
  }

  async sendMerchantRegistrationWhatsApp() {
    this.syncCurrentStepInputs();
    const d = this.merchantData || this.getDefaultMerchantData();

    if (!d.businessName || !d.phone) {
      this.showToast('⚠️ Por favor completa el nombre del comercio y WhatsApp.');
      this.merchantWizardStep = 1;
      this.renderMerchantStep();
      return;
    }

    // Auto-save to platform first
    await this.saveMerchantRegistrationToSystem();

    const template = this.generateMerchantTemplate();
    const supportPhone = '573227949751';
    const waUrl = `https://wa.me/${supportPhone}?text=${encodeURIComponent(template)}`;

    window.open(waUrl, '_blank');
    this.closeMerchantRegistrationModal();
    this.showToast('✅ ¡Abriendo WhatsApp con tu Ficha Técnica!');
  }

  getAppOfficialUrl() {
    let origin = window.location.origin;
    if (!origin || origin === 'null' || origin.includes('file://') || origin.includes('localhost')) {
      return 'https://pedigochos.onrender.com';
    }
    return origin;
  }

  renderAppOfficialQr() {
    const url = this.getAppOfficialUrl();
    
    // 1. Update text label in modal
    const urlTextEl = document.getElementById('app-official-url-text');
    if (urlTextEl) {
      urlTextEl.textContent = url;
    }

    // 2. Render Mini QR on Home Banner
    const miniContainer = document.getElementById('home-mini-qr');
    if (miniContainer) {
      miniContainer.innerHTML = '';
      if (typeof QRCode !== 'undefined') {
        try {
          new QRCode(miniContainer, {
            text: url,
            width: 44,
            height: 44,
            colorDark: '#0F172A',
            colorLight: '#FFFFFF',
            correctLevel: QRCode.CorrectLevel.M
          });
        } catch(e) {
          miniContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=44x44&data=${encodeURIComponent(url)}" style="width: 40px; height: 40px; border-radius: 6px;">`;
        }
      } else {
        miniContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=44x44&data=${encodeURIComponent(url)}" style="width: 40px; height: 40px; border-radius: 6px;">`;
      }
    }
  }

  openAppQrModal() {
    const modal = document.getElementById('app-qr-modal');
    if (!modal) return;

    const url = this.getAppOfficialUrl();
    const qrContainer = document.getElementById('app-official-qr-container');
    if (qrContainer) {
      qrContainer.innerHTML = '';
      if (typeof QRCode !== 'undefined') {
        try {
          new QRCode(qrContainer, {
            text: url,
            width: 220,
            height: 220,
            colorDark: '#0F172A',
            colorLight: '#FFFFFF',
            correctLevel: QRCode.CorrectLevel.H
          });
        } catch(e) {
          qrContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}" style="width: 200px; height: 200px; border-radius: 12px;">`;
        }
      } else {
        qrContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}" style="width: 200px; height: 200px; border-radius: 12px;">`;
      }
    }

    const urlTextEl = document.getElementById('app-official-url-text');
    if (urlTextEl) urlTextEl.textContent = url;

    modal.style.display = 'flex';
    modal.classList.add('open');
    modal.classList.add('active');

    try {
      window.history.pushState({ view: 'modal', modalId: 'app-qr-modal' }, '');
    } catch(e) {}
  }

  closeAppQrModal() {
    const modal = document.getElementById('app-qr-modal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('open');
      modal.classList.remove('active');
    }
  }

  copyAppOfficialLink() {
    const url = this.getAppOfficialUrl();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        this.showToast('📋 ¡Enlace oficial de PediGochos copiado!');
      }).catch(() => {
        this.fallbackCopyText(url);
      });
    } else {
      this.fallbackCopyText(url);
    }
  }

  fallbackCopyText(text) {
    const inp = document.createElement('input');
    inp.value = text;
    document.body.appendChild(inp);
    inp.select();
    try {
      document.execCommand('copy');
      this.showToast('📋 ¡Enlace oficial copiado al portapapeles!');
    } catch(e) {
      prompt('Copia el siguiente enlace:', text);
    }
    document.body.removeChild(inp);
  }

  shareAppOnWhatsApp() {
    const url = this.getAppOfficialUrl();
    const message = 
      `🍔 *¡Pide tu comida favorita en PediGochos!* 🛵💨\n\n` +
      `Explora los mejores restaurantes, catálogos digitales interactivos y pide a domicilio o a tu mesa desde cualquier celular:\n\n` +
      `👉 ${url}\n\n` +
      `¡Pide fácil, rápido y seguro con PediGochos! ✨`;

    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  }

  downloadAppQrImage() {
    const url = this.getAppOfficialUrl();
    const canvas = document.createElement('canvas');
    const width = 800;
    const height = 1050;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Background Gradient Dark Premium
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#0F172A');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Decorative Orange Neon Top Border
    const topGrad = ctx.createLinearGradient(0, 0, width, 0);
    topGrad.addColorStop(0, '#FF5E3A');
    topGrad.addColorStop(0.5, '#EA580C');
    topGrad.addColorStop(1, '#F59E0B');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, width, 14);

    // Header Logo & Branding
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 54px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PediGochos', width / 2, 90);

    ctx.fillStyle = '#10B981';
    ctx.font = '800 20px system-ui, -apple-system, sans-serif';
    ctx.fillText('🛵 DELIVERY & RESTAURANTES A DOMICILIO', width / 2, 130);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 24px system-ui, -apple-system, sans-serif';
    ctx.fillText('Escanea con tu cámara para pedir comida', width / 2, 180);

    // White Rounded Card for QR Code
    const cardX = 130;
    const cardY = 220;
    const cardW = 540;
    const cardH = 540;
    const radius = 32;

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, radius);
    ctx.fill();

    // Helper to draw QR on canvas
    const drawQRAndSave = (qrDrawable) => {
      const qrPadding = 30;
      ctx.drawImage(qrDrawable, cardX + qrPadding, cardY + qrPadding, cardW - (qrPadding * 2), cardH - (qrPadding * 2));

      // Bottom Footer Card
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.roundRect(100, 800, 600, 110, 20);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255, 94, 58, 0.4)';
      ctx.stroke();

      ctx.fillStyle = '#F59E0B';
      ctx.font = '800 22px system-ui, -apple-system, sans-serif';
      ctx.fillText('⭐ PIDE DIRECTO EN LÍNEA ⭐', width / 2, 842);

      ctx.fillStyle = '#38BDF8';
      ctx.font = '700 20px monospace';
      ctx.fillText(url, width / 2, 882);

      // Subtitle footer
      ctx.fillStyle = '#64748B';
      ctx.font = '600 16px system-ui, -apple-system, sans-serif';
      ctx.fillText('San Antonio del Táchira • Ureña • La Frontera', width / 2, 970);

      // Trigger Download
      const link = document.createElement('a');
      link.download = 'pedigochos-qr-oficial.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      this.showToast('📥 ¡Código QR Oficial descargado con éxito!');
    };

    // Try finding rendered canvas or generate from QR image
    const modalQrCanvas = document.querySelector('#app-official-qr-container canvas');
    if (modalQrCanvas) {
      drawQRAndSave(modalQrCanvas);
    } else {
      const qrImg = new Image();
      qrImg.crossOrigin = 'anonymous';
      qrImg.onload = () => drawQRAndSave(qrImg);
      qrImg.onerror = () => {
        this.showToast('⚠️ No se pudo descargar la imagen, intenta de nuevo.');
      };
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(url)}&color=0F172A&bgcolor=FFFFFF&margin=1`;
    }
  }

  // ==========================================
  // RIDE HAILING (MOTO TAXI, AUTO, LUJO) LOGIC
  // ==========================================

  openRideModal(vehicleType = null) {
    const modal = document.getElementById('ride-modal');
    if (!modal) return;

    if (vehicleType) {
      this.selectedVehicle = vehicleType;
    }

    modal.style.display = 'flex';
    modal.classList.add('open');
    modal.classList.add('active');
    modal.style.opacity = '1';
    modal.style.visibility = 'visible';
    modal.style.pointerEvents = 'auto';

    // Autofill user details if logged in or saved
    const savedName = localStorage.getItem('order_customer_name') || (this.currentUser && this.currentUser.name) || '';
    const savedPhone = localStorage.getItem('order_customer_phone') || (this.currentUser && this.currentUser.phone) || '';
    const nameInp = document.getElementById('ride-customer-name');
    const phoneInp = document.getElementById('ride-customer-phone');
    if (nameInp && !nameInp.value && savedName) nameInp.value = savedName;
    if (phoneInp && !phoneInp.value && savedPhone) phoneInp.value = savedPhone;

    // Set initial vehicle
    this.selectRideVehicle(this.selectedVehicle || 'moto');

    // Detect GPS origin if not set yet
    if (!this.rideOrigin || !this.rideOrigin.lat) {
      this.refreshRideOriginGPS();
    } else {
      this.setRideOrigin(this.rideOrigin.lat, this.rideOrigin.lng, this.rideOrigin.address || 'Mi Ubicación Actual');
    }

    // Initialize or resize map
    setTimeout(() => {
      this.initRideMap();
      if (this.rideLeafMap) {
        this.rideLeafMap.invalidateSize();
      }
    }, 300);

    setTimeout(() => {
      if (this.rideLeafMap) {
        this.rideLeafMap.invalidateSize();
      }
    }, 600);
  }

  closeRideModal() {
    const modal = document.getElementById('ride-modal');
    if (modal) {
      modal.classList.remove('open');
      modal.classList.remove('active');
      modal.style.display = 'none';
      modal.style.opacity = '';
      modal.style.visibility = '';
      modal.style.pointerEvents = '';
    }
    if (!this.selectedEstablishment) {
      this.updateFloatingAndHeaderSos(false);
    }
  }

  refreshRideOriginGPS() {
    const originInp = document.getElementById('ride-origin-input');
    const coordsSpan = document.getElementById('ride-origin-coords-text');
    if (originInp) originInp.value = 'Detectando ubicación GPS...';
    if (coordsSpan) coordsSpan.innerText = '📡 Obteniendo señal GPS...';

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          this.setRideOrigin(lat, lng, 'Mi Ubicación GPS Actual');
          this.showToast('📍 Ubicación GPS detectada');
        },
        (err) => {
          console.warn('Ride geolocation error:', err);
          const cachedLat = localStorage.getItem('user_gps_lat');
          const cachedLng = localStorage.getItem('user_gps_lng');
          if (cachedLat && cachedLng) {
            this.setRideOrigin(parseFloat(cachedLat), parseFloat(cachedLng), 'Última Ubicación Conocida');
          } else {
            this.setRideOrigin(7.8145, -72.4455, 'San Antonio del Táchira (Centro)');
          }
          this.showToast('📍 Puedes ajustar tu ubicación en el mapa');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      this.setRideOrigin(7.8145, -72.4455, 'San Antonio del Táchira (Centro)');
    }
  }

  setRideOrigin(lat, lng, label = 'Mi Ubicación') {
    this.rideOrigin = { lat, lng, address: label };
    const originInp = document.getElementById('ride-origin-input');
    const coordsSpan = document.getElementById('ride-origin-coords-text');
    if (originInp) originInp.value = label;
    if (coordsSpan) coordsSpan.innerText = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

    try {
      localStorage.setItem('user_gps_lat', lat.toString());
      localStorage.setItem('user_gps_lng', lng.toString());
    } catch (e) {}

    if (this.rideLeafMap && typeof L !== 'undefined') {
      const originIcon = L.divIcon({
        className: 'custom-ride-origin-marker',
        html: `<div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
                 <div style="position: absolute; width: 34px; height: 34px; background: rgba(16, 185, 129, 0.35); border-radius: 50%; animation: pulse 1.5s infinite;"></div>
                 <div style="position: relative; background: #10B981; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 3px 10px rgba(16, 185, 129, 0.6); border: 2px solid white;">🟢</div>
               </div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      if (this.rideOriginMarker) {
        this.rideOriginMarker.setLatLng([lat, lng]);
      } else {
        this.rideOriginMarker = L.marker([lat, lng], { icon: originIcon, draggable: true }).addTo(this.rideLeafMap);
        this.rideOriginMarker.on('dragend', (e) => {
          const newPos = e.target.getLatLng();
          this.setRideOrigin(newPos.lat, newPos.lng, 'Punto de recogida ajustado');
        });
      }
      this.updateRideRoute();
    }
  }

  initRideMap() {
    if (typeof L === 'undefined') {
      console.warn('Leaflet map library is not loaded');
      return;
    }
    const mapContainer = document.getElementById('ride-leaflet-map');
    if (!mapContainer) return;

    if (this.rideLeafMap) {
      this.rideLeafMap.invalidateSize();
      if (this.rideOrigin && this.rideOrigin.lat && this.rideOrigin.lng) {
        if (!this.rideOriginMarker) {
          this.setRideOrigin(this.rideOrigin.lat, this.rideOrigin.lng, this.rideOrigin.address);
        }
      }
      return;
    }

    const defaultCenter = (this.rideOrigin && this.rideOrigin.lat) 
      ? [this.rideOrigin.lat, this.rideOrigin.lng] 
      : [7.8145, -72.4455];

    this.rideLeafMap = L.map('ride-leaflet-map', {
      center: defaultCenter,
      zoom: 14,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.rideLeafMap);

    this.rideLeafMap.on('click', (e) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      this.setRideDestination(lat, lng, `Destino fijado en mapa (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    });

    if (this.rideOrigin && this.rideOrigin.lat && this.rideOrigin.lng) {
      this.setRideOrigin(this.rideOrigin.lat, this.rideOrigin.lng, this.rideOrigin.address);
    }
  }

  selectQuickDestination(name, lat, lng) {
    const destInp = document.getElementById('ride-dest-input');
    if (destInp) destInp.value = name;
    this.setRideDestination(lat, lng, name);
  }

  onRideDestInput(val, immediate = false) {
    const text = (val || '').trim();
    if (!this.rideDestination) {
      this.rideDestination = {};
    }
    this.rideDestination.address = text;

    const statusBadge = document.getElementById('ride-dest-status-text');
    const statusIcon = document.getElementById('ride-dest-status-icon');

    if (!text || text.length < 2) {
      if (statusBadge) statusBadge.innerText = 'Escribe tu lugar de llegada para ubicar el punto más cercano en el mapa';
      if (statusIcon) statusIcon.innerText = '🎯 Detección en mapa';
      return;
    }

    if (statusBadge) statusBadge.innerHTML = '<span style="color: #F59E0B;">⏳ Buscando el punto más cercano en el mapa...</span>';
    if (statusIcon) statusIcon.innerText = '🔍 Ubicando...';

    if (this._destGeocodeTimer) clearTimeout(this._destGeocodeTimer);

    if (immediate) {
      this.findClosestDestination(text);
    } else {
      this._destGeocodeTimer = setTimeout(() => {
        this.findClosestDestination(text);
      }, 350);
    }
  }

  getTachiraPlacesDatabase() {
    return [
      // San Antonio del Táchira & Frontera
      { keys: ['plaza bolivar', 'plaza san antonio', 'centro san antonio', 'alcaldia bolivar', 'banco banesco', 'banco mercantil', 'banco venezuela', 'centro', 'carrera 4', 'calle 4'], name: 'Plaza Bolívar / Centro (San Antonio)', lat: 7.8145, lng: -72.4455, city: 'San Antonio del Táchira' },
      { keys: ['terminal', 'expreso', 'bus', 'terminal san antonio', 'transporte'], name: 'Terminal de Pasajeros de San Antonio', lat: 7.8180, lng: -72.4410, city: 'San Antonio del Táchira' },
      { keys: ['puente', 'bolivar', 'simon bolivar', 'frontera', 'aduana', 'seniat', 'migracion', 'la linea', 'paso'], name: 'Puente Internacional Simón Bolívar', lat: 7.8285, lng: -72.4542, city: 'Frontera San Antonio - Cúcuta' },
      { keys: ['hospital', 'cdi', 'ambulatorio', 'seguro', 'samuel dario', 'clinica', 'medico', 'salud'], name: 'Hospital Dr. Samuel Darío Maldonado', lat: 7.8120, lng: -72.4430, city: 'San Antonio del Táchira' },
      { keys: ['aeropuerto', 'pista', 'avion', 'juan vicente gomez', 'aeropuerto san antonio'], name: 'Aeropuerto Juan Vicente Gómez', lat: 7.8398, lng: -72.4402, city: 'San Antonio del Táchira' },
      { keys: ['palotal', 'sector palotal'], name: 'Palotal', lat: 7.8020, lng: -72.4460, city: 'San Antonio del Táchira' },
      { keys: ['llano', 'el llano', 'barrio el llano'], name: 'Barrio El Llano', lat: 7.8115, lng: -72.4490, city: 'San Antonio del Táchira' },
      { keys: ['peracal', 'alcabala peracal', 'alcabala'], name: 'Alcabala de Peracal', lat: 7.8290, lng: -72.4210, city: 'Vía San Cristóbal' },
      { keys: ['libertadores', 'sector libertadores', '5 de julio'], name: 'Sector Libertadores / 5 de Julio', lat: 7.8170, lng: -72.4480, city: 'San Antonio del Táchira' },
      { keys: ['obrero', 'barrio obrero san antonio', 'miranda'], name: 'Barrio Obrero / Miranda (San Antonio)', lat: 7.8160, lng: -72.4495, city: 'San Antonio del Táchira' },
      { keys: ['cementerio', 'camposanto'], name: 'Cementerio Municipal', lat: 7.8090, lng: -72.4415, city: 'San Antonio del Táchira' },
      { keys: ['tienditas', 'atanasio girardot', 'puente nuevo tienditas'], name: 'Puente Atanasio Girardot (Tienditas)', lat: 7.8680, lng: -72.4560, city: 'Frontera Tienditas' },
      { keys: ['la popa', 'mirador la popa'], name: 'Mirador de La Popa', lat: 7.8190, lng: -72.4380, city: 'San Antonio del Táchira' },
      { keys: ['los proceres', 'proceres'], name: 'Barrio Los Próceres', lat: 7.8130, lng: -72.4410, city: 'San Antonio del Táchira' },
      { keys: ['las dantas', 'dantas'], name: 'Las Dantas (Vía Rubio)', lat: 7.7850, lng: -72.4150, city: 'Táchira' },

      // Pedro María Ureña
      { keys: ['urena', 'centro urena', 'plaza urena', 'pedro maria urena', 'alcaldia urena'], name: 'Ureña / Centro', lat: 7.9192, lng: -72.4468, city: 'Pedro María Ureña' },
      { keys: ['aguas calientes', 'aguascalientes', 'termas'], name: 'Aguas Calientes (Ureña)', lat: 7.9350, lng: -72.4350, city: 'Pedro María Ureña' },
      { keys: ['puente santander', 'puente francisco de paula santander'], name: 'Puente Francisco de Paula Santander (Ureña)', lat: 7.9255, lng: -72.4590, city: 'Frontera Ureña - Cúcuta' },
      { keys: ['zona industrial urena', 'zona industrial'], name: 'Zona Industrial de Ureña', lat: 7.9250, lng: -72.4420, city: 'Pedro María Ureña' },

      // Cúcuta & Área Metropolitana
      { keys: ['la parada', 'parada frontera', 'villa del rosario'], name: 'La Parada (Frontera Cúcuta)', lat: 7.8310, lng: -72.4600, city: 'Villa del Rosario / Cúcuta' },
      { keys: ['terminal cucuta', 'transporte cucuta'], name: 'Terminal de Transportes de Cúcuta', lat: 7.9010, lng: -72.5020, city: 'Cúcuta' },
      { keys: ['ventura', 'ventura plaza'], name: 'Ventura Plaza (Cúcuta)', lat: 7.8920, lng: -72.4970, city: 'Cúcuta' },
      { keys: ['centro cucuta', 'parque santander cucuta'], name: 'Centro de Cúcuta', lat: 7.8890, lng: -72.5050, city: 'Cúcuta' },
      { keys: ['aeropuerto cucuta', 'camilo daza'], name: 'Aeropuerto Camilo Daza (Cúcuta)', lat: 7.9270, lng: -72.5110, city: 'Cúcuta' },

      // San Cristóbal
      { keys: ['barrio obrero', 'obrero sc', 'plaza los mangos', 'los mangos', 'carrera 21', 'calle 10'], name: 'Plaza Los Mangos / Barrio Obrero (San Cristóbal)', lat: 7.7712, lng: -72.2223, city: 'San Cristóbal' },
      { keys: ['centro san cristobal', '5ta avenida', 'quinta avenida', 'plaza bolivar sc', 'catedral sc', 'ateneo'], name: 'Centro / 5ta Avenida (San Cristóbal)', lat: 7.7669, lng: -72.2280, city: 'San Cristóbal' },
      { keys: ['sambil', 'sambil san cristobal', 'centro comercial sambil', 'autopista'], name: 'Sambil San Cristóbal', lat: 7.7950, lng: -72.2030, city: 'San Cristóbal' },
      { keys: ['terminal san cristobal', 'terminal big low sc', 'terminal sc', 'expresos san cristobal'], name: 'Terminal de Pasajeros de San Cristóbal', lat: 7.7550, lng: -72.2350, city: 'San Cristóbal' },
      { keys: ['hospital central', 'hospital de san cristobal', 'hospital central sc', 'maternidad'], name: 'Hospital Central de San Cristóbal', lat: 7.7600, lng: -72.2210, city: 'San Cristóbal' },
      { keys: ['pueblo nuevo', 'polideportivo', 'estadio pueblo nuevo', 'plaza de toros', 'monumental'], name: 'Pueblo Nuevo / Polideportivo (San Cristóbal)', lat: 7.7920, lng: -72.2150, city: 'San Cristóbal' },
      { keys: ['pirineos', 'pirineos 1', 'pirineos 2', 'las lomas', 'avenida principal pirineos'], name: 'Pirineos / Las Lomas (San Cristóbal)', lat: 7.7850, lng: -72.2280, city: 'San Cristóbal' },
      { keys: ['la concordia', 'concordia', 'mercado la concordia', 'plaza miranda concordia'], name: 'La Concordia / Mercado (San Cristóbal)', lat: 7.7580, lng: -72.2380, city: 'San Cristóbal' },
      { keys: ['unet', 'universidad experimental del tachira'], name: 'UNET (San Cristóbal)', lat: 7.7985, lng: -72.2110, city: 'San Cristóbal' },
      { keys: ['ula', 'universidad de los andes', 'ula tachira', 'paramillo'], name: 'ULA Táchira / Paramillo', lat: 7.7810, lng: -72.2190, city: 'San Cristóbal' },
      { keys: ['palo gordo', 'paramillo palo gordo'], name: 'Palo Gordo', lat: 7.8150, lng: -72.2050, city: 'San Cristóbal' },

      // Capacho, Táriba, Palmira, Rubio
      { keys: ['capacho', 'capacho nuevo', 'independencia'], name: 'Capacho Nuevo', lat: 7.7950, lng: -72.3100, city: 'Capacho' },
      { keys: ['capacho viejo', 'libertad'], name: 'Capacho Viejo', lat: 7.7880, lng: -72.3250, city: 'Capacho' },
      { keys: ['tariba', 'plaza tariba', 'basilica tariba', 'cardenas'], name: 'Táriba / Basílica', lat: 7.8200, lng: -72.2230, city: 'Táriba' },
      { keys: ['palmira', 'plaza palmira', 'guasimos'], name: 'Palmira', lat: 7.8450, lng: -72.2280, city: 'Palmira' },
      { keys: ['rubio', 'junin', 'centro rubio', 'los teques'], name: 'Rubio / Centro', lat: 7.7020, lng: -72.3550, city: 'Rubio' }
    ];
  }

  async findClosestDestination(text) {
    if (!text || text.length < 2) return;

    const statusBadge = document.getElementById('ride-dest-status-text');
    const statusIcon = document.getElementById('ride-dest-status-icon');

    // Reference Origin Point (User GPS or Map Center)
    const originLat = (this.rideOrigin && this.rideOrigin.lat) ? this.rideOrigin.lat : (this.rideLeafMap ? this.rideLeafMap.getCenter().lat : 7.8145);
    const originLng = (this.rideOrigin && this.rideOrigin.lng) ? this.rideOrigin.lng : (this.rideLeafMap ? this.rideLeafMap.getCenter().lng : -72.4455);

    const norm = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    // Comprehensive Database of Landmarks & Sectors across Táchira & Frontera
    const localPlaces = this.getTachiraPlacesDatabase();

    const candidates = [];

    // Check Local Landmarks
    const words = norm.split(/\s+/).filter(w => w.length > 2);
    localPlaces.forEach(place => {
      let matched = false;
      if (place.keys.some(k => norm.includes(k) || k.includes(norm))) {
        matched = true;
      } else if (words.length > 0 && place.keys.some(k => words.some(w => k.includes(w)))) {
        matched = true;
      }
      if (matched) {
        candidates.push({
          name: place.name,
          lat: place.lat,
          lng: place.lng,
          source: 'local'
        });
      }
    });

    // Check Calles & Carreras
    const calleMatch = norm.match(/calle\s*(\d+)/i);
    const carreraMatch = norm.match(/carrera\s*(\d+)/i);
    if (calleMatch || carreraMatch) {
      const calleNum = calleMatch ? parseInt(calleMatch[1]) : 4;
      const carreraNum = carreraMatch ? parseInt(carreraMatch[1]) : 6;
      const isSC = Math.abs(originLat - 7.77) < 0.15 && Math.abs(originLng - (-72.22)) < 0.15;
      const baseLat = isSC ? (7.7669 - ((calleNum - 5) * 0.0008)) : (7.8145 - ((calleNum - 4) * 0.0009));
      const baseLng = isSC ? (-72.2280 + ((carreraNum - 5) * 0.0008)) : (-72.4455 + ((carreraNum - 6) * 0.0009));
      candidates.push({
        name: `Calle ${calleNum} con Carrera ${carreraNum}`,
        lat: baseLat,
        lng: baseLng,
        source: 'grid'
      });
    }

    // Query OpenStreetMap Nominatim with proximity around origin
    try {
      const qRegion = `${text}, Táchira, Venezuela`;
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(qRegion)}&limit=4`;
      const res = await fetch(url);
      if (res.ok) {
        const results = await res.json();
        if (Array.isArray(results) && results.length > 0) {
          results.forEach(r => {
            const rLat = parseFloat(r.lat);
            const rLng = parseFloat(r.lon);
            if (!isNaN(rLat) && !isNaN(rLng)) {
              candidates.push({
                name: (r.display_name ? r.display_name.split(',')[0] : text).trim(),
                lat: rLat,
                lng: rLng,
                source: 'osm'
              });
            }
          });
        }
      }
    } catch (e) {
      console.warn('Nominatim geocode query skipped:', e);
    }

    // Score candidates by lexical match relevance (exact match > prefix match > word match)
    if (candidates.length > 0) {
      candidates.forEach(c => {
        const cNorm = (c.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        let score = 0;
        if (cNorm === norm) score += 100;
        else if (cNorm.startsWith(norm)) score += 60;
        else if (cNorm.includes(norm)) score += 40;
        if (c.source === 'local') score += 20;
        c.matchScore = score;
        c.distance = this.calculateGeodesicDistance(originLat, originLng, c.lat, c.lng);
      });
      // Sort descending by match score
      candidates.sort((a, b) => b.matchScore - a.matchScore);
      const chosen = candidates[0];

      // Set destination on the map at the chosen point
      this.setRideDestination(chosen.lat, chosen.lng, chosen.name || text, false);

      if (statusBadge) {
        statusBadge.innerHTML = `✅ <strong style="color: #34D399;">Destino fijado:</strong> ${chosen.name} (<span style="color: #FBBF24; font-weight: 800;">${chosen.distance.toFixed(1)} km</span>)`;
      }
      if (statusIcon) statusIcon.innerText = '📍 Fijado';
    } else {
      // Fallback: place point in nearby area on map
      const fallbackLat = originLat + 0.010;
      const fallbackLng = originLng + 0.008;
      const fallbackDist = this.calculateGeodesicDistance(originLat, originLng, fallbackLat, fallbackLng);
      this.setRideDestination(fallbackLat, fallbackLng, text, false);

      if (statusBadge) {
        statusBadge.innerHTML = `📍 <span style="color: #38BDF8;">Punto fijado en mapa:</span> ${text} (${fallbackDist.toFixed(1)} km). Puedes mover el marcador si lo deseas.`;
      }
      if (statusIcon) statusIcon.innerText = '📍 Fijado';
    }
  }

  setRideDestination(lat, lng, addressName, updateInput = true) {
    this.rideDestination = { lat, lng, address: addressName };
    const destInp = document.getElementById('ride-dest-input');
    if (destInp && updateInput) destInp.value = addressName;

    if (this.rideLeafMap && typeof L !== 'undefined') {
      const destIcon = L.divIcon({
        className: 'custom-ride-dest-marker',
        html: `<div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
                 <div style="position: absolute; width: 34px; height: 34px; background: rgba(255, 107, 0, 0.35); border-radius: 50%; animation: pulse 1.5s infinite;"></div>
                 <div style="position: relative; background: #FF6B00; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 3px 10px rgba(255, 107, 0, 0.6); border: 2px solid white;">🏁</div>
               </div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      if (this.rideDestMarker) {
        this.rideDestMarker.setLatLng([lat, lng]);
      } else {
        this.rideDestMarker = L.marker([lat, lng], { icon: destIcon, draggable: true }).addTo(this.rideLeafMap);
        this.rideDestMarker.on('dragend', (e) => {
          const newPos = e.target.getLatLng();
          this.setRideDestination(newPos.lat, newPos.lng, `Destino ajustado (${newPos.lat.toFixed(4)}, ${newPos.lng.toFixed(4)})`, true);
        });
      }
      this.updateRideRoute();
    }
  }

  updateRideRoute() {
    if (!this.rideLeafMap || typeof L === 'undefined') return;

    if (this.rideOrigin && this.rideOrigin.lat && this.rideDestination && this.rideDestination.lat) {
      const dist = this.calculateGeodesicDistance(
        this.rideOrigin.lat,
        this.rideOrigin.lng,
        this.rideDestination.lat,
        this.rideDestination.lng
      );
      this.rideDistanceKm = Math.max(0.5, parseFloat(dist.toFixed(1)));

      const distBadge = document.getElementById('ride-distance-badge');
      if (distBadge) {
        distBadge.innerText = `📏 Distancia: ${this.rideDistanceKm} km`;
      }

      if (this.rideRouteLine) {
        this.rideLeafMap.removeLayer(this.rideRouteLine);
      }
      this.rideRouteLine = L.polyline([
        [this.rideOrigin.lat, this.rideOrigin.lng],
        [this.rideDestination.lat, this.rideDestination.lng]
      ], {
        color: '#FF6B00',
        weight: 4,
        dashArray: '6, 8'
      }).addTo(this.rideLeafMap);

      try {
        const bounds = L.latLngBounds([
          [this.rideOrigin.lat, this.rideOrigin.lng],
          [this.rideDestination.lat, this.rideDestination.lng]
        ]);
        this.rideLeafMap.fitBounds(bounds, { padding: [30, 30] });
      } catch (e) {}

      this.calculateRideFares(this.rideDistanceKm);
    } else {
      this.calculateRideFares(1.0);
    }
  }

  calculateRideFares(distanceKm = 1.0) {
    const d = parseFloat(distanceKm) || 1.0;
    
    // Moto Taxi: Base $4.000 COP (hasta 2 km) + $1.500 COP/km extra
    const moto = d <= 2 ? 4000 : 4000 + Math.ceil(d - 2) * 1500;

    // Auto Estándar: Base $8.000 COP (hasta 2 km) + $2.500 COP/km extra
    const auto = d <= 2 ? 8000 : 8000 + Math.ceil(d - 2) * 2500;

    // Lujo / VIP: Base $14.000 COP (hasta 2 km) + $4.000 COP/km extra
    const lujo = d <= 2 ? 14000 : 14000 + Math.ceil(d - 2) * 4000;

    this.rideFares = { moto, auto, lujo };

    const pMoto = document.getElementById('ride-price-moto');
    const pAuto = document.getElementById('ride-price-auto');
    const pLujo = document.getElementById('ride-price-lujo');
    if (pMoto) pMoto.innerText = `$${moto.toLocaleString('es-CO')}`;
    if (pAuto) pAuto.innerText = `$${auto.toLocaleString('es-CO')}`;
    if (pLujo) pLujo.innerText = `$${lujo.toLocaleString('es-CO')}`;

    this.updateRideSubmitButton();
  }

  selectRideVehicle(type) {
    this.selectedVehicle = type; // 'moto' | 'auto' | 'lujo'

    ['moto', 'auto', 'lujo'].forEach(v => {
      const card = document.getElementById(`vehicle-card-${v}`);
      if (card) {
        if (v === type) card.classList.add('active');
        else card.classList.remove('active');
      }
    });

    this.updateRideSubmitButton();
  }

  updateRideSubmitButton() {
    const btnText = document.getElementById('btn-submit-ride-text');
    if (!btnText) return;

    const vehicleNames = {
      moto: 'Moto Taxi',
      auto: 'Auto',
      lujo: 'Auto de Lujo'
    };

    const vType = this.selectedVehicle || 'moto';
    const name = vehicleNames[vType] || 'Moto Taxi';
    const fare = (this.rideFares && this.rideFares[vType]) ? this.rideFares[vType] : 4000;
    const formattedFare = `$${fare.toLocaleString('es-CO')} COP`;

    btnText.innerText = `Pedir ${name} por WhatsApp (${formattedFare})`;
  }

  sendRideRequestWhatsApp() {
    const nameInp = document.getElementById('ride-customer-name');
    const phoneInp = document.getElementById('ride-customer-phone');
    const originInp = document.getElementById('ride-origin-input');
    const destInp = document.getElementById('ride-dest-input');
    const notesInp = document.getElementById('ride-notes-input');

    const customerName = (nameInp ? nameInp.value : '').trim();
    const customerPhone = (phoneInp ? phoneInp.value : '').trim();
    const originAddress = (originInp ? originInp.value : '').trim() || (this.rideOrigin && this.rideOrigin.address) || 'Ubicación GPS';
    const destAddress = (destInp ? destInp.value : '').trim() || (this.rideDestination && this.rideDestination.address) || '';
    const notes = (notesInp ? notesInp.value : '').trim();

    if (!customerName) {
      this.showToast('⚠️ Por favor indica tu nombre');
      if (nameInp) nameInp.focus();
      return;
    }
    if (!customerPhone) {
      this.showToast('⚠️ Por favor indica tu número de teléfono / WhatsApp');
      if (phoneInp) phoneInp.focus();
      return;
    }
    if (!destAddress) {
      this.showToast('⚠️ Por favor selecciona o escribe tu destino');
      if (destInp) destInp.focus();
      return;
    }

    try {
      localStorage.setItem('order_customer_name', customerName);
      localStorage.setItem('order_customer_phone', customerPhone);
    } catch (e) {}

    const vType = this.selectedVehicle || 'moto';
    const vehicleNames = {
      moto: 'Moto Taxi',
      auto: 'Auto Estándar',
      lujo: 'Auto de Lujo'
    };
    const vehicleLabels = {
      moto: '🛵 *MOTO TAXI* (Rápido y económico)',
      auto: '🚗 *AUTO ESTÁNDAR* (Hasta 4 personas)',
      lujo: '✨ *AUTO DE LUJO / VIP* (Máximo confort con A/C)'
    };
    const vehicleTitle = vehicleLabels[vType] || '🛵 MOTO TAXI';
    const fare = (this.rideFares && this.rideFares[vType]) ? this.rideFares[vType] : 4000;
    const formattedFare = `$${fare.toLocaleString('es-CO')} COP`;

    // Guarantee destination coordinates and Google Maps GPS link
    let destLat = this.rideDestination?.lat;
    let destLng = this.rideDestination?.lng;

    if (!destLat || !destLng) {
      const valLower = (destAddress || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const landmarks = [
        { keys: ['terminal'], lat: 7.8180, lng: -72.4410 },
        { keys: ['puente', 'bolivar', 'simon', 'aduana'], lat: 7.8285, lng: -72.4542 },
        { keys: ['plaza', 'centro', 'alcaldia'], lat: 7.8145, lng: -72.4455 },
        { keys: ['urena', 'tienditas'], lat: 7.9192, lng: -72.4468 },
        { keys: ['hospital', 'ambulatorio', 'cdi'], lat: 7.8120, lng: -72.4430 },
        { keys: ['aeropuerto'], lat: 7.8398, lng: -72.4402 }
      ];
      const match = landmarks.find(l => l.keys.some(k => valLower.includes(k)));
      if (match) {
        destLat = match.lat;
        destLng = match.lng;
      } else if (this.rideOrigin && this.rideOrigin.lat) {
        destLat = this.rideOrigin.lat + 0.012;
        destLng = this.rideOrigin.lng + 0.008;
      } else {
        destLat = 7.8145;
        destLng = -72.4455;
      }
      this.rideDestination = { lat: destLat, lng: destLng, address: destAddress };
    }

    const originLat = (this.rideOrigin && this.rideOrigin.lat) ? this.rideOrigin.lat : 7.8145;
    const originLng = (this.rideOrigin && this.rideOrigin.lng) ? this.rideOrigin.lng : -72.4455;
    const originLink = `https://www.google.com/maps?q=${originLat},${originLng}`;
    const destLink = `https://www.google.com/maps?q=${destLat},${destLng}`;
    const destCoordsStr = `${destLat.toFixed(5)}, ${destLng.toFixed(5)}`;

    const message = `🚖 *¡SOLICITUD DE VEHÍCULO - PEDIGOCHOS!* 🚖\n\n` +
      `👤 *Cliente:* ${customerName}\n` +
      `📱 *Teléfono:* ${customerPhone}\n` +
      `🛞 *Tipo de Servicio:* ${vehicleTitle}\n\n` +
      `🟢 *Punto de Recogida (Origen):*\n${originAddress}\n` +
      `📍 *GPS Origen:* ${originLink}\n\n` +
      `🏁 *Destino Solicitado:*\n${destAddress}\n` +
      `📍 *GPS Destino:* ${destLink}\n` +
      `🌐 *Coordenadas Destino:* (${destCoordsStr})\n\n` +
      `📏 *Distancia Estimada:* ${this.rideDistanceKm || 1} km\n` +
      `💰 *Tarifa Estimada:* ${formattedFare}\n` +
      (notes ? `📝 *Referencia del Encuentro:* ${notes}\n\n` : `\n`) +
      `⚡ _Por favor confirmar disponibilidad del conductor para pasar a buscarme. ¡Gracias!_`;

    // Also register ride request in system database for Admin operations
    try {
      const ridePayload = {
        orderType: 'ride',
        serviceType: 'ride',
        vehicleType: vType,
        establishmentId: 'pedigochos-movil',
        establishmentName: `PediGochos Móvil (${vehicleNames[vType] || 'Transporte'})`,
        customerName: customerName,
        customerPhone: customerPhone,
        customerEmail: (this.currentUser && this.currentUser.email) || null,
        userId: (this.currentUser && this.currentUser.id) || null,
        total: fare,
        paymentMethod: 'Efectivo',
        items: [
          {
            name: `Servicio de ${vehicleNames[vType] || 'Móvil'}`,
            price: fare,
            quantity: 1,
            notes: `${originAddress} ➡️ ${destAddress} (${this.rideDistanceKm || 1} km)`
          }
        ],
        deliveryDetails: {
          name: customerName,
          phone: customerPhone,
          address: `${originAddress} ➡️ ${destAddress}`,
          origin: originAddress,
          destination: destAddress,
          originLat: originLat,
          originLng: originLng,
          destLat: destLat,
          destLng: destLng,
          distanceKm: this.rideDistanceKm || 1,
          notes: notes,
          serviceType: 'ride',
          vehicleType: vType
        }
      };

      fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ridePayload)
      }).then(r => r.json()).then(createdOrder => {
        console.log('✅ Ride order registered on backend:', createdOrder?.id);
        if (createdOrder && createdOrder.id) {
          const userOrders = JSON.parse(localStorage.getItem('pedigochos_user_orders') || '[]');
          userOrders.push(createdOrder.id);
          localStorage.setItem('pedigochos_user_orders', JSON.stringify(userOrders));
        }
      }).catch(err => {
        console.warn('Could not register ride order on backend:', err);
      });
    } catch (e) {
      console.warn('Error constructing ride order payload:', e);
    }

    const waUrl = `https://wa.me/573227949751?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
    this.showToast('🚀 Solicitud enviada por WhatsApp');
    this.closeRideModal();
  }

  // ========================================================
  // SERVICES MENU MODAL METHODS
  // ========================================================

  toggleServicesMenu(force = null, event = null) {
    if (event) {
      if (typeof event.stopPropagation === 'function') event.stopPropagation();
      if (typeof event.preventDefault === 'function') event.preventDefault();
    }

    const modal = document.getElementById('services-menu-modal');
    if (!modal) return;

    const now = Date.now();
    if (this._lastServicesToggle && now - this._lastServicesToggle < 350) return;
    this._lastServicesToggle = now;

    const isVisible = modal.classList.contains('open') || modal.classList.contains('active') || (modal.style.display === 'flex' && modal.style.opacity !== '0');
    const show = force !== null ? force : !isVisible;
    if (show) {
      this.closeSosMenu();
      this._servicesOpenedTimestamp = Date.now();

      modal.style.display = 'flex';
      void modal.offsetWidth; // Force reflow for smooth animation

      modal.classList.add('open', 'active');
      modal.style.opacity = '1';
      modal.style.visibility = 'visible';
      modal.style.pointerEvents = 'auto';

      const content = modal.querySelector('.services-drawer-content');
      if (content) {
        content.style.transform = 'translateX(0)';
      }
    } else {
      this.closeServicesMenu(event);
    }
  }

  closeServicesMenu(event = null) {
    if (event) {
      // Prevent instant dismissal from ghost-touch clicks on the overlay
      if (this._servicesOpenedTimestamp && Date.now() - this._servicesOpenedTimestamp < 400) {
        return;
      }
      if (typeof event.stopPropagation === 'function') event.stopPropagation();
    }

    const modal = document.getElementById('services-menu-modal');
    if (modal) {
      const content = modal.querySelector('.services-drawer-content');
      if (content) {
        content.style.transform = 'translateX(-100%)';
      }
      modal.classList.remove('open', 'active');
      setTimeout(() => {
        if (!modal.classList.contains('open')) {
          modal.style.display = 'none';
          modal.style.opacity = '';
          modal.style.visibility = '';
          modal.style.pointerEvents = '';
        }
      }, 250);
    }
  }

  toggleMovilidadAccordion() {
    const subitems = document.getElementById('drawer-movilidad-subitems');
    const arrow = document.getElementById('movilidad-accordion-arrow');
    if (!subitems) return;
    const isHidden = subitems.style.display === 'none';
    subitems.style.display = isHidden ? 'flex' : 'none';
    if (arrow) {
      arrow.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(-90deg)';
    }
  }

  // ========================================================
  // S.O.S EMERGENCY & 24H MOBILE CAUCHERA METHODS
  // ========================================================

  toggleSosMenu(force = null, event = null) {
    if (event) {
      if (typeof event.stopPropagation === 'function') event.stopPropagation();
      if (typeof event.preventDefault === 'function') event.preventDefault();
    }

    const modal = document.getElementById('sos-menu-modal');
    if (!modal) return;

    const now = Date.now();
    if (this._lastSosToggle && now - this._lastSosToggle < 350) return;
    this._lastSosToggle = now;

    const isVisible = modal.classList.contains('open') || modal.classList.contains('active') || (modal.style.display === 'flex' && modal.style.opacity !== '0');
    const show = force !== null ? force : !isVisible;
    if (show) {
      this.closeServicesMenu();
      this._sosOpenedTimestamp = Date.now();

      modal.style.display = 'flex';
      void modal.offsetWidth; // Force reflow

      modal.classList.add('open', 'active');
      modal.style.opacity = '1';
      modal.style.visibility = 'visible';
      modal.style.pointerEvents = 'auto';
    } else {
      this.closeSosMenu(event);
    }
  }

  closeSosMenu(event = null) {
    if (event) {
      if (this._sosOpenedTimestamp && Date.now() - this._sosOpenedTimestamp < 400) {
        return;
      }
      if (typeof event.stopPropagation === 'function') event.stopPropagation();
    }

    const modal = document.getElementById('sos-menu-modal');
    if (modal) {
      modal.classList.remove('open', 'active');
      setTimeout(() => {
        if (!modal.classList.contains('open')) {
          modal.style.display = 'none';
          modal.style.opacity = '';
          modal.style.visibility = '';
          modal.style.pointerEvents = '';
        }
      }, 250);
    }
  }

  openEmergencyNumbersModal(country = 'venezuela') {
    this.closeSosMenu();
    const modal = document.getElementById('emergency-numbers-modal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('open', 'active');
      modal.style.opacity = '1';
      modal.style.visibility = 'visible';
      modal.style.pointerEvents = 'auto';
      this.switchEmergencyCountry(country);
    }
  }

  closeEmergencyNumbersModal() {
    const modal = document.getElementById('emergency-numbers-modal');
    if (modal) {
      modal.classList.remove('open', 'active');
      modal.style.display = 'none';
      modal.style.opacity = '';
      modal.style.visibility = '';
      modal.style.pointerEvents = '';
    }
  }

  switchEmergencyCountry(country) {
    const tabVe = document.getElementById('tab-btn-emergency-ve');
    const tabCo = document.getElementById('tab-btn-emergency-co');
    const contVe = document.getElementById('emergency-country-venezuela');
    const contCo = document.getElementById('emergency-country-colombia');

    if (country === 'venezuela') {
      if (tabVe) tabVe.classList.add('active');
      if (tabCo) tabCo.classList.remove('active');
      if (contVe) contVe.style.display = 'flex';
      if (contCo) contCo.style.display = 'none';
    } else {
      if (tabCo) tabCo.classList.add('active');
      if (tabVe) tabVe.classList.remove('active');
      if (contCo) contCo.style.display = 'flex';
      if (contVe) contVe.style.display = 'none';
    }
  }

  openPaintService() {
    if (window.PaintServiceApp) {
      window.PaintServiceApp.open();
    }
  }

  openPrint3DService() {
    if (window.Print3DServiceApp) {
      window.Print3DServiceApp.open();
    }
  }

  openCaucheraModal() {
    this.closeSosMenu();
    const modal = document.getElementById('cauchera-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    modal.classList.add('open', 'active');
    modal.style.opacity = '1';
    modal.style.visibility = 'visible';
    modal.style.pointerEvents = 'auto';

    this.caucheraVehicle = this.caucheraVehicle || 'moto';
    this.caucheraService = this.caucheraService || 'frio';

    // Pre-fill user data if available
    const savedName = localStorage.getItem('customer_name') || localStorage.getItem('pedigochos_user_name') || '';
    const savedPhone = localStorage.getItem('customer_phone') || localStorage.getItem('pedigochos_user_phone') || '';
    const nameInp = document.getElementById('cauchera-customer-name');
    const phoneInp = document.getElementById('cauchera-customer-phone');
    if (nameInp && !nameInp.value && savedName) nameInp.value = savedName;
    if (phoneInp && !phoneInp.value && savedPhone) phoneInp.value = savedPhone;

    // Check night tariff
    this.updateCaucheraNightBanner();
    this.updateCaucheraPricing();

    // Initialize interactive Leaflet map for Cauchera
    setTimeout(() => {
      this.initCaucheraMap();
    }, 150);

    // Auto capture GPS if not yet captured or invalid
    const locInp = document.getElementById('cauchera-location-input');
    if (!locInp || !locInp.value || locInp.value.includes('Obteniendo') || !this.caucheraGps?.lat) {
      this.captureCaucheraGps();
    }
  }

  closeCaucheraModal() {
    const modal = document.getElementById('cauchera-modal');
    if (modal) {
      modal.classList.remove('open', 'active');
      modal.style.display = 'none';
      modal.style.opacity = '';
      modal.style.visibility = '';
      modal.style.pointerEvents = '';
    }
    const suggBox = document.getElementById('cauchera-suggestions-box');
    if (suggBox) suggBox.style.display = 'none';
    if (!this.selectedEstablishment) {
      this.updateFloatingAndHeaderSos(false);
    }
  }

  isNightRateActive() {
    const currentHour = new Date().getHours();
    return currentHour >= 20 || currentHour < 6; // 8:00 PM to 6:00 AM
  }

  updateCaucheraNightBanner() {
    const banner = document.getElementById('cauchera-night-rate-banner');
    if (!banner) return;
    const isNight = this.isNightRateActive();

    if (isNight) {
      banner.style.background = 'linear-gradient(135deg, rgba(147, 51, 234, 0.25) 0%, rgba(109, 40, 217, 0.15) 100%)';
      banner.style.border = '1px solid #9333EA';
      banner.style.color = '#E9D5FF';
      banner.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 16px;">🌙</span>
          <span>Horario Nocturno 24H (Servicio Disponible)</span>
        </div>
        <span style="background: #9333EA; color: #FFF; padding: 2px 8px; border-radius: 8px; font-size: 10.5px; font-weight: 900;">Bajo Cotización</span>
      `;
    } else {
      banner.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.1) 100%)';
      banner.style.border = '1px solid rgba(16, 185, 129, 0.4)';
      banner.style.color = '#A7F3D0';
      banner.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 16px;">☀️</span>
          <span>Horario Diurno Regular (Servicio Disponible)</span>
        </div>
        <span style="background: rgba(16, 185, 129, 0.3); color: #10B981; padding: 2px 8px; border-radius: 8px; font-size: 10.5px; font-weight: 900;">Bajo Cotización</span>
      `;
    }
  }

  selectCaucheraVehicle(vType) {
    this.caucheraVehicle = vType;
    ['moto', 'carro', 'camioneta', 'camion'].forEach(t => {
      const card = document.getElementById(`cauchera-v-${t}`);
      if (card) {
        if (t === vType) card.classList.add('active');
        else card.classList.remove('active');
      }
    });
    this.updateCaucheraPricing();
  }

  selectCaucheraService(sKey) {
    this.caucheraService = sKey;
    ['frio', 'caliente', 'aire', 'camara'].forEach(s => {
      const card = document.getElementById(`cauchera-s-${s}`);
      if (card) {
        if (s === sKey) card.classList.add('active');
        else card.classList.remove('active');
      }
    });
    this.updateCaucheraPricing();
  }

  updateCaucheraPricing() {
    const btnText = document.getElementById('btn-submit-cauchera-text');
    if (btnText) {
      btnText.innerText = 'Solicitar Cotización por WhatsApp';
    }
  }

  initCaucheraMap() {
    const mapContainer = document.getElementById('cauchera-leaflet-map');
    if (!mapContainer || typeof L === 'undefined') return;

    const defaultLat = (this.caucheraGps && this.caucheraGps.lat) || 7.8145; // San Antonio del Táchira
    const defaultLng = (this.caucheraGps && this.caucheraGps.lng) || -72.4455;

    if (!this.caucheraLeafMap) {
      this.caucheraLeafMap = L.map('cauchera-leaflet-map', {
        center: [defaultLat, defaultLng],
        zoom: 15,
        zoomControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(this.caucheraLeafMap);

      this.caucheraLeafMap.on('click', (e) => {
        const { lat, lng } = e.latlng;
        this.setCaucheraLocationFromCoords(lat, lng, null, true);
      });
    }

    setTimeout(() => {
      if (this.caucheraLeafMap) {
        this.caucheraLeafMap.invalidateSize();
        if (this.caucheraGps && this.caucheraGps.lat && this.caucheraGps.lng) {
          this.caucheraLeafMap.setView([this.caucheraGps.lat, this.caucheraGps.lng], 16);
        }
      }
    }, 200);

    this.ensureCaucheraMarker(defaultLat, defaultLng);
  }

  ensureCaucheraMarker(lat, lng) {
    if (!this.caucheraLeafMap || typeof L === 'undefined') return;

    const iconHtml = `
      <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 36px; height: 36px; background: rgba(239, 68, 68, 0.4); border-radius: 50%; animation: pulse 1.5s infinite;"></div>
        <div style="position: relative; background: #EF4444; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 15px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.6); border: 2px solid white;">🛞</div>
      </div>
    `;

    const markerIcon = L.divIcon({
      className: 'custom-cauchera-marker',
      html: iconHtml,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    if (this.caucheraMarker) {
      this.caucheraMarker.setLatLng([lat, lng]);
    } else {
      this.caucheraMarker = L.marker([lat, lng], { icon: markerIcon, draggable: true }).addTo(this.caucheraLeafMap);
      this.caucheraMarker.on('dragend', (e) => {
        const pos = e.target.getLatLng();
        this.setCaucheraLocationFromCoords(pos.lat, pos.lng, null, true);
      });
    }
  }

  setCaucheraLocationFromCoords(lat, lng, addressName = null, reverseGeocode = false) {
    this.caucheraGps = this.caucheraGps || {};
    this.caucheraGps.lat = lat;
    this.caucheraGps.lng = lng;

    const coordsText = document.getElementById('cauchera-gps-coords-text');
    if (coordsText) {
      coordsText.innerHTML = `✅ Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`;
    }

    this.ensureCaucheraMarker(lat, lng);

    if (this.caucheraLeafMap) {
      this.caucheraLeafMap.flyTo([lat, lng], 16, { duration: 0.8 });
    }

    if (addressName) {
      const locInp = document.getElementById('cauchera-location-input');
      if (locInp) locInp.value = addressName;
      this.caucheraGps.address = addressName;
    } else if (reverseGeocode) {
      this.reverseGeocodeCauchera(lat, lng);
    }
  }

  captureCaucheraGps() {
    const locInp = document.getElementById('cauchera-location-input');
    const coordsText = document.getElementById('cauchera-gps-coords-text');
    const gpsIcon = document.getElementById('cauchera-gps-icon');

    if (gpsIcon) gpsIcon.innerText = '⏳';
    if (coordsText) coordsText.innerHTML = '<span style="color:#FBBF24;">📡 Buscando señal satelital GPS...</span>';

    const applyCoords = (lat, lng, acc = 0) => {
      if (gpsIcon) gpsIcon.innerText = '✅';
      this.caucheraGps = { lat, lng };
      localStorage.setItem('user_gps_lat', String(lat));
      localStorage.setItem('user_gps_lng', String(lng));

      const accInfo = acc > 0 ? ` (±${Math.round(acc)}m)` : '';
      if (coordsText) {
        coordsText.innerHTML = `✅ Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)} <span style="color:#94A3B8; font-size:10px;">${accInfo}</span>`;
      }

      this.setCaucheraLocationFromCoords(lat, lng, null, true);
    };

    const handleFail = () => {
      const cachedLat = parseFloat(localStorage.getItem('user_gps_lat'));
      const cachedLng = parseFloat(localStorage.getItem('user_gps_lng'));
      if (!isNaN(cachedLat) && !isNaN(cachedLng)) {
        if (gpsIcon) gpsIcon.innerText = '📍';
        if (coordsText) {
          coordsText.innerHTML = `📍 Ubicación anterior (${cachedLat.toFixed(4)}, ${cachedLng.toFixed(4)}). Puedes ajustar en el mapa.`;
        }
        this.setCaucheraLocationFromCoords(cachedLat, cachedLng, null, false);
      } else {
        if (gpsIcon) gpsIcon.innerText = '📍';
        if (coordsText) {
          coordsText.innerHTML = `📍 <span style="color:#FCA5A5;">GPS no detectado. Toca el mapa o escribe tu lugar arriba.</span>`;
        }
        this.setCaucheraLocationFromCoords(7.8145, -72.4455, 'San Antonio del Táchira', false);
      }
    };

    if (!('geolocation' in navigator)) {
      handleFail();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyCoords(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
      },
      (err) => {
        console.warn('High accuracy GPS error/timeout, trying network geolocation:', err);
        navigator.geolocation.getCurrentPosition(
          (pos2) => {
            applyCoords(pos2.coords.latitude, pos2.coords.longitude, pos2.coords.accuracy);
          },
          (err2) => {
            console.warn('Network geolocation failed too:', err2);
            handleFail();
          },
          { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 10000 }
    );
  }

  reverseGeocodeCauchera(lat, lng) {
    const locInp = document.getElementById('cauchera-location-input');
    const db = this.getTachiraPlacesDatabase();
    let bestLocal = null;
    let minD = 999;
    db.forEach(p => {
      const d = this.calculateGeodesicDistance(lat, lng, p.lat, p.lng);
      if (d < 0.35 && d < minD) {
        minD = d;
        bestLocal = p;
      }
    });

    if (bestLocal) {
      const addr = `${bestLocal.name} (cerca)`;
      if (locInp) locInp.value = addr;
      if (this.caucheraGps) this.caucheraGps.address = addr;
      return;
    }

    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
      .then(r => r.json())
      .then(data => {
        if (data && data.display_name) {
          const parts = data.display_name.split(',').map(s => s.trim());
          const display = parts.slice(0, 3).join(', ');
          if (locInp) locInp.value = display;
          if (this.caucheraGps) this.caucheraGps.address = display;
        }
      })
      .catch(() => {
        const fallback = `Ubicación en mapa (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        if (locInp && (!locInp.value || locInp.value.includes('Obteniendo'))) {
          locInp.value = fallback;
        }
        if (this.caucheraGps) this.caucheraGps.address = fallback;
      });
  }

  onCaucheraLocationInput(val) {
    const suggBox = document.getElementById('cauchera-suggestions-box');
    if (!suggBox) return;

    if (!val || val.trim().length < 2) {
      suggBox.style.display = 'none';
      suggBox.innerHTML = '';
      return;
    }

    const query = val.trim();
    const norm = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    if (this._caucheraSearchTimer) clearTimeout(this._caucheraSearchTimer);

    this._caucheraSearchTimer = setTimeout(async () => {
      const dbPlaces = this.getTachiraPlacesDatabase();
      const candidates = [];

      // 1. Check local places database with relevance scoring (NOT closest distance!)
      const queryWords = norm.split(/\s+/).filter(w => w.length > 2);
      dbPlaces.forEach(p => {
        let score = 0;
        const pNorm = p.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (pNorm === norm) score += 100;
        else if (pNorm.startsWith(norm)) score += 60;
        else if (pNorm.includes(norm)) score += 40;
        else if (p.keys.some(k => k.includes(norm) || norm.includes(k))) score += 50;
        else if (queryWords.length > 0 && queryWords.some(w => p.keys.some(k => k.includes(w)))) score += 30;

        if (score > 0) {
          candidates.push({
            name: p.name,
            sub: p.city || 'Táchira',
            lat: p.lat,
            lng: p.lng,
            score: score + 20,
            icon: '📍'
          });
        }
      });

      // 2. Check Street and Carrera patterns (e.g. Calle 5, Carrera 8)
      const calleMatch = norm.match(/calle\s*(\d+)/i);
      const carreraMatch = norm.match(/carrera\s*(\d+)/i);
      if (calleMatch || carreraMatch) {
        const cNum = calleMatch ? parseInt(calleMatch[1]) : 4;
        const kNum = carreraMatch ? parseInt(carreraMatch[1]) : 5;
        const baseLat = 7.8145 - ((cNum - 4) * 0.0009);
        const baseLng = -72.4455 + ((kNum - 5) * 0.0009);
        candidates.push({
          name: `Calle ${cNum} con Carrera ${kNum}`,
          sub: 'San Antonio del Táchira (Centro)',
          lat: baseLat,
          lng: baseLng,
          score: 85,
          icon: '🛣️'
        });
      }

      // 3. Query OpenStreetMap Nominatim for exact locations
      if (navigator.onLine && query.length >= 3) {
        try {
          const regionQuery = `${query}, Táchira, Venezuela`;
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(regionQuery)}&limit=4`;
          const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              data.forEach(item => {
                const rLat = parseFloat(item.lat);
                const rLng = parseFloat(item.lon);
                if (!isNaN(rLat) && !isNaN(rLng)) {
                  const parts = (item.display_name || '').split(',');
                  const mainTitle = parts[0].trim();
                  const subTitle = parts.slice(1, 3).map(s => s.trim()).join(', ');
                  const exists = candidates.some(c => Math.abs(c.lat - rLat) < 0.002 && Math.abs(c.lng - rLng) < 0.002);
                  if (!exists) {
                    candidates.push({
                      name: mainTitle,
                      sub: subTitle || 'Táchira, Venezuela',
                      lat: rLat,
                      lng: rLng,
                      score: 40,
                      icon: '🔍'
                    });
                  }
                }
              });
            }
          }
        } catch (e) {
          console.warn('Nominatim search error:', e);
        }
      }

      // Sort by relevance score descending (HIGHEST MATCH FIRST - NOT by distance!)
      candidates.sort((a, b) => b.score - a.score);

      if (candidates.length === 0) {
        suggBox.innerHTML = `
          <div style="padding: 12px; color: #94A3B8; font-size: 12px; text-align: center;">
            No se encontraron sugerencias. Puedes marcar directamente tu punto en el mapa abajo 🗺️
          </div>
        `;
        suggBox.style.display = 'block';
        return;
      }

      const topCandidates = candidates.slice(0, 6);
      this._currentCaucheraSuggestions = topCandidates;

      suggBox.innerHTML = topCandidates.map((c, i) => `
        <div class="cauchera-sugg-item" 
          onclick="MarketplaceApp.selectCaucheraSuggestion(${c.lat}, ${c.lng}, '${c.name.replace(/'/g, "\\'")}')"
          style="padding: 10px 14px; cursor: pointer; border-bottom: ${i < topCandidates.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none'}; display: flex; align-items: center; justify-content: space-between; gap: 10px; transition: background 0.15s ease;"
          onmouseenter="this.style.background='rgba(239, 68, 68, 0.2)';"
          onmouseleave="this.style.background='transparent';">
          <div style="display: flex; align-items: center; gap: 10px; overflow: hidden;">
            <span style="font-size: 18px; flex-shrink: 0;">${c.icon || '📍'}</span>
            <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              <div style="font-weight: 800; font-size: 12.5px; color: #FFF; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${c.name}</div>
              <div style="font-size: 10.5px; color: #94A3B8; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${c.sub}</div>
            </div>
          </div>
          <span style="font-size: 10px; font-weight: 800; background: rgba(239, 68, 68, 0.2); color: #FCA5A5; border: 1px solid rgba(239, 68, 68, 0.4); padding: 2px 7px; border-radius: 6px; flex-shrink: 0;">Llevar 🎯</span>
        </div>
      `).join('');

      suggBox.style.display = 'block';
    }, 220);
  }

  selectCaucheraSuggestion(lat, lng, name) {
    const locInp = document.getElementById('cauchera-location-input');
    const suggBox = document.getElementById('cauchera-suggestions-box');
    if (locInp) locInp.value = name;
    if (suggBox) {
      suggBox.style.display = 'none';
      suggBox.innerHTML = '';
    }

    this.setCaucheraLocationFromCoords(lat, lng, name, false);
  }

  selectFirstCaucheraSuggestion() {
    if (this._currentCaucheraSuggestions && this._currentCaucheraSuggestions.length > 0) {
      const top = this._currentCaucheraSuggestions[0];
      this.selectCaucheraSuggestion(top.lat, top.lng, top.name);
    }
  }

  submitCaucheraRequest() {
    const nameInp = document.getElementById('cauchera-customer-name');
    const phoneInp = document.getElementById('cauchera-customer-phone');
    const locInp = document.getElementById('cauchera-location-input');
    const refInp = document.getElementById('cauchera-reference-input');

    const customerName = nameInp ? nameInp.value.trim() : '';
    const customerPhone = phoneInp ? phoneInp.value.trim() : '';
    const location = locInp ? locInp.value.trim() : '';
    const reference = refInp ? refInp.value.trim() : '';

    if (!customerName) {
      alert('⚠️ Por favor ingresa tu nombre.');
      if (nameInp) nameInp.focus();
      return;
    }
    if (!customerPhone || customerPhone.length < 7) {
      alert('⚠️ Por favor ingresa un número de teléfono / WhatsApp válido.');
      if (phoneInp) phoneInp.focus();
      return;
    }
    if (!location) {
      alert('⚠️ Por favor indica o captura tu ubicación donde estás varado.');
      if (locInp) locInp.focus();
      return;
    }

    // Save for next time
    localStorage.setItem('customer_name', customerName);
    localStorage.setItem('customer_phone', customerPhone);
    localStorage.setItem('pedigochos_user_name', customerName);
    localStorage.setItem('pedigochos_user_phone', customerPhone);

    const vType = this.caucheraVehicle || 'moto';
    const sKey = this.caucheraService || 'frio';
    const vNames = {
      moto: '🛵 Moto',
      carro: '🚗 Carro Particular',
      camioneta: '🚙 Camioneta / 4x4',
      camion: '🚚 Camión / Carga Pesada'
    };
    const sNames = {
      frio: '❄️ Parche Frío (Estándar)',
      caliente: '🔥 Vulcanizado / Parche Caliente',
      aire: '💨 Carga de Aire / Calibración',
      camara: '🔩 Reparación con Cámara / Neumático'
    };

    const vLabel = vNames[vType] || vType;
    const sLabel = sNames[sKey] || sKey;
    const isNight = this.isNightRateActive();

    const gpsLat = this.caucheraGps?.lat || (this.caucheraLeafMap ? this.caucheraLeafMap.getCenter().lat : 7.8145);
    const gpsLng = this.caucheraGps?.lng || (this.caucheraLeafMap ? this.caucheraLeafMap.getCenter().lng : -72.4455);
    const mapLink = `https://www.google.com/maps?q=${gpsLat},${gpsLng}`;

    // Construct WhatsApp message (Cotización model)
    let waMessage = `🛞 *¡SOLICITUD DE COTIZACIÓN - CAUCHERA MÓVIL 24H!* 🛞\n`;
    waMessage += `🏪 *Montallantas El Cachu - PediGochos*\n\n`;
    waMessage += `👤 *Conductor / Solicitante:* ${customerName}\n`;
    waMessage += `📱 *WhatsApp:* ${customerPhone}\n\n`;
    waMessage += `🚗 *Vehículo:* ${vLabel}\n`;
    waMessage += `🔧 *Trabajo Requerido:* ${sLabel}\n`;
    waMessage += `⏰ *Jornada:* ${isNight ? 'Horario Nocturno 24H' : 'Horario Diurno Regular'}\n`;
    waMessage += `📋 *Modalidad:* Cotización Previa (Servicio por encargo - no inmediato)\n\n`;
    waMessage += `📍 *Ubicación del vehículo:* ${location}\n`;
    if (reference) {
      waMessage += `📝 *Punto de Referencia:* ${reference}\n`;
    }
    if (mapLink) {
      waMessage += `🗺️ *Ubicación GPS en vivo:* ${mapLink}\n`;
    }
    waMessage += `\n💬 _Hola PediGochos, solicito la cotización y disponibilidad del auxilio vial para mi ubicación. Por favor indíquenme el presupuesto estimado y tiempo para coordinar. ¡Gracias!_`;

    // Persist order on backend
    try {
      const payload = {
        orderType: 'cauchera',
        serviceType: 'cauchera',
        establishmentId: 'montallantas-el-cachu',
        establishmentName: 'Montallantas El Cachu 24H',
        customerName: customerName,
        customerPhone: customerPhone,
        total: 0,
        isQuote: true,
        vehicleType: vType,
        items: [{
          id: `cauchera-${vType}-${sKey}`,
          name: `${vLabel} - ${sLabel} (Cotización)`,
          price: 0,
          quantity: 1
        }],
        serviceDetails: {
          vehicleType: vType,
          serviceKey: sKey,
          serviceTitle: `${vLabel} (${sLabel})`,
          isQuote: true,
          hasNightSurcharge: isNight
        },
        deliveryDetails: {
          name: customerName,
          phone: customerPhone,
          address: location,
          reference: reference,
          latitude: gpsLat,
          longitude: gpsLng,
          serviceType: 'cauchera',
          vehicleType: vType
        }
      };

      fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(r => r.json()).then(created => {
        console.log('✅ Cauchera mobile order registered on backend:', created?.id);
        if (created && created.id) {
          const userOrders = JSON.parse(localStorage.getItem('pedigochos_user_orders') || '[]');
          userOrders.push(created.id);
          localStorage.setItem('pedigochos_user_orders', JSON.stringify(userOrders));
        }
      }).catch(err => {
        console.warn('Could not persist cauchera order on backend:', err);
      });
    } catch(e) {
      console.warn('Error constructing cauchera payload:', e);
    }

    // Open WhatsApp to Central Oficial PediGochos (+57 322 794 9751)
    const targetWa = '573227949751';
    const waUrl = `https://wa.me/${targetWa}?text=${encodeURIComponent(waMessage)}`;
    window.open(waUrl, '_blank');

    this.showToast('🚀 Solicitud de auxilio enviada a PediGochos');
    this.closeCaucheraModal();
  }
}

const MarketplaceApp = new MarketplaceController();
window.MarketplaceApp = MarketplaceApp;

document.addEventListener('DOMContentLoaded', () => {
  MarketplaceApp.init();
});
