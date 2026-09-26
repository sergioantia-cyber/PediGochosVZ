/* ==========================================================================
   PediGochos Servicios - Standalone Partner App Controller
   Supports: Pintura y Latonería, Impresión 3D Lab, Cauchera Móvil 24H
   ========================================================================== */

const ServicePartnerApp = {
  currentService: 'paint', // 'paint' | 'print3d' | 'cauchera'
  currentTab: 'quotes',
  quotesFilter: 'all',
  activeQuote: null,
  activeChatId: null,
  quotes: [],
  catalogItems: [],
  ws: null,
  isAudioUnlocked: false,

  // Universal API proxy configuration
  getApiBaseUrl() {
    const isCapacitor = window.location.protocol === 'capacitor:' ||
                        window.location.protocol === 'file:' ||
                        window.location.hostname === 'localhost' ||
                        window.location.hostname === '127.0.0.1';
    // If running in APK or local without direct backend, point to Render live backend
    return isCapacitor ? 'https://pedigochos.onrender.com' : '';
  },

  getServiceMeta() {
    switch (this.currentService) {
      case 'print3d':
        return {
          id: 'print3d',
          title: '3D Lab & Prototipado',
          icon: '🖨️',
          catalogEndpoint: '/api/print3d-services/catalog',
          quotesEndpoint: '/api/print3d-services/quotes',
          statsEndpoint: '/api/print3d-services/stats',
          wsQuoteNew: 'PRINT3D_QUOTE_NEW',
          wsQuoteMsg: 'PRINT3D_QUOTE_MESSAGE',
          wsQuoteUpdate: 'PRINT3D_QUOTE_UPDATE',
          wsCatalogUpdate: 'PRINT3D_CATALOG_UPDATE',
          roleName: 'Laboratorio 3D',
          presets: [
            "👋 ¡Hola! Modelo verificado en slicer, listo para imprimir.",
            "🖨️ Recomendamos PETG para máxima resistencia mecánica y calor.",
            "⏱️ Tiempo de impresión estimado: 4-6 horas.",
            "📦 ¡Pieza terminada, curada y lista para entrega!"
          ]
        };
      case 'resin':
        return {
          id: 'resin',
          title: 'ShelliArt Resina • Llaveros',
          icon: '✨',
          catalogEndpoint: '/api/resin-services/catalog',
          quotesEndpoint: '/api/resin-services/quotes',
          statsEndpoint: '/api/resin-services/stats',
          wsQuoteNew: 'RESIN_QUOTE_NEW',
          wsQuoteMsg: 'RESIN_QUOTE_MESSAGE',
          wsQuoteUpdate: 'RESIN_QUOTE_UPDATE',
          wsCatalogUpdate: 'RESIN_CATALOG_UPDATE',
          roleName: 'ShelliArt Resina',
          presets: [
            "👋 ¡Hola! Tu pedido de inicial en resina está anotado.",
            "🎨 Mezclando resina epóxica y pigmentos con pan de oro 24K.",
            "⏳ En tiempo de curado UV (24h) para máximo brillo cristal.",
            "✨ ¡Llavero listo y pulido! Con borla y argolla instalada."
          ]
        };
      case 'cauchera':
        return {
          id: 'cauchera',
          title: 'Cauchera & Auxilio 24H',
          icon: '🛞',
          catalogEndpoint: '',
          quotesEndpoint: '/api/admin/orders',
          statsEndpoint: '',
          roleName: 'Montallantas El Cachu',
          presets: [
            "🚨 Móvil de auxilio vial en camino a tu ubicación GPS.",
            "⏱️ Tiempo estimado de llegada: 15 a 20 minutos.",
            "🔧 Llevamos compresor de aire y parches vulcanizados."
          ]
        };
      case 'paint':
      default:
        return {
          id: 'paint',
          title: 'Taller Pintura & Latonería',
          icon: '🎨',
          catalogEndpoint: '/api/paint-services/catalog',
          quotesEndpoint: '/api/paint-services/quotes',
          statsEndpoint: '/api/paint-services/stats',
          wsQuoteNew: 'PAINT_QUOTE_NEW',
          wsQuoteMsg: 'PAINT_QUOTE_MESSAGE',
          wsQuoteUpdate: 'PAINT_QUOTE_UPDATE',
          wsCatalogUpdate: 'PAINT_CATALOG_UPDATE',
          roleName: 'Taller Maestro Latonería & Pintura',
          presets: [
            "👋 ¡Hola! ¿Podrías traernos el vehículo para chequearlo en persona?",
            "🎨 Igualamos el tono exacto con tu código VIN computarizado.",
            "🔧 Ofrecemos secado al horno y 2 años de garantía de brillo.",
            "💰 Presupuesto cerrado: podemos ajustar el precio acordado en el sistema.",
            "📅 Cita confirmada para recepción del vehículo en taller."
          ]
        };
    }
  },

  init() {
    this.setupAudioUnlock();
    this.restoreSavedService();
    this.setupWebSocket();
    this.updateHeaderUI();
    this.loadAllData();

    // Auto-refresh periodically every 30 seconds
    setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.fetchQuotes(false);
      }
    }, 30000);
  },

  setupAudioUnlock() {
    const unlock = () => {
      if (!this.isAudioUnlocked) {
        this.isAudioUnlocked = true;
        const chime = document.getElementById('sp-chime-quote');
        if (chime) {
          chime.play().then(() => { chime.pause(); chime.currentTime = 0; }).catch(() => {});
        }
        document.removeEventListener('click', unlock);
        document.removeEventListener('touchstart', unlock);
      }
    };
    document.addEventListener('click', unlock);
    document.addEventListener('touchstart', unlock);
  },

  playChime() {
    try {
      const chime = document.getElementById('sp-chime-quote');
      if (chime) {
        chime.currentTime = 0;
        chime.play().catch(() => {});
      }
    } catch(e) {}
  },

  restoreSavedService() {
    const saved = localStorage.getItem('pedigochos_service_partner_mode');
    if (saved && ['paint', 'print3d', 'resin', 'cauchera'].includes(saved)) {
      this.currentService = saved;
    } else {
      // Show gate on first open
      this.openServiceSelector();
    }
  },

  openServiceSelector() {
    const gate = document.getElementById('sp-service-selector-gate');
    if (gate) gate.classList.remove('hidden');
  },

  closeServiceSelector() {
    const gate = document.getElementById('sp-service-selector-gate');
    if (gate) gate.classList.add('hidden');
  },

  selectService(serviceKey) {
    this.currentService = serviceKey;
    const remember = document.getElementById('sp-remember-service');
    if (!remember || remember.checked) {
      localStorage.setItem('pedigochos_service_partner_mode', serviceKey);
    }
    this.closeServiceSelector();
    this.updateHeaderUI();
    this.loadAllData();
  },

  updateHeaderUI() {
    const meta = this.getServiceMeta();
    const iconEl = document.getElementById('sp-current-icon');
    const titleEl = document.getElementById('sp-current-title');
    if (iconEl) iconEl.textContent = meta.icon;
    if (titleEl) titleEl.textContent = meta.title;

    // Render quick response chips for chat
    this.renderQuickChips();
  },

  renderQuickChips() {
    const container = document.getElementById('sp-quick-chips-container');
    if (!container) return;
    const meta = this.getServiceMeta();
    container.innerHTML = (meta.presets || []).map(preset => `
      <button type="button" class="sp-chip-btn" onclick="ServicePartnerApp.fillChatMessage(${JSON.stringify(preset)})">
        ${preset}
      </button>
    `).join('');
  },

  fillChatMessage(text) {
    const input = document.getElementById('sp-chat-input-field');
    if (input) {
      input.value = text;
      input.focus();
    }
  },

  switchTab(tabKey) {
    this.currentTab = tabKey;
    document.querySelectorAll('.sp-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.sp-tab-content').forEach(content => content.classList.remove('active'));

    const btn = document.getElementById(`tab-btn-${tabKey}`);
    const view = document.getElementById(`view-${tabKey}`);
    if (btn) btn.classList.add('active');
    if (view) view.classList.add('active');

    if (tabKey === 'catalog') {
      this.fetchCatalog();
    } else if (tabKey === 'stats') {
      this.fetchStats();
    } else if (tabKey === 'quotes') {
      this.fetchQuotes();
    } else if (tabKey === 'chat') {
      this.renderChatThreads();
    }
  },

  refreshCurrentView() {
    this.loadAllData();
  },

  async loadAllData() {
    await Promise.all([
      this.fetchQuotes(true),
      this.fetchCatalog(),
      this.fetchStats()
    ]);
  },

  // =========================================================================
  // WebSocket Real-time Connectivity
  // =========================================================================
  setupWebSocket() {
    try {
      const isCapacitor = window.location.protocol === 'capacitor:' ||
                          window.location.protocol === 'file:' ||
                          window.location.hostname === 'localhost' ||
                          window.location.hostname === '127.0.0.1';
      const wsProtocol = isCapacitor ? 'wss:' : (window.location.protocol === 'https:' ? 'wss:' : 'ws:');
      const wsHost = isCapacitor ? 'pedigochos.onrender.com' : window.location.host;
      const wsUrl = `${wsProtocol}//${wsHost}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        const sub = document.getElementById('sp-current-sub');
        if (sub) {
          sub.textContent = '🟢 En Línea • Conectado';
          sub.style.color = '#10B981';
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketEvent(data);
        } catch(e) {
          console.warn('WS parse error:', e);
        }
      };

      this.ws.onclose = () => {
        const sub = document.getElementById('sp-current-sub');
        if (sub) {
          sub.textContent = '🟡 Reconectando...';
          sub.style.color = '#F59E0B';
        }
        setTimeout(() => this.setupWebSocket(), 4000);
      };
    } catch(e) {
      console.warn('WS init error:', e);
    }
  },

  handleWebSocketEvent(data) {
    const meta = this.getServiceMeta();

    if (data.type === meta.wsQuoteNew) {
      this.playChime();
      this.quotes.unshift(data.quote);
      this.updateQuotesBadge();
      this.renderQuotesList();
      this.renderChatThreads();
    } else if (data.type === meta.wsQuoteUpdate) {
      const idx = this.quotes.findIndex(q => q.id === data.quote.id);
      if (idx !== -1) {
        this.quotes[idx] = data.quote;
      }
      if (this.activeQuote && this.activeQuote.id === data.quote.id) {
        this.activeQuote = data.quote;
        this.updateStickyQuoteCard(data.quote);
      }
      this.renderQuotesList();
      this.renderChatThreads();
    } else if (data.type === meta.wsQuoteMsg) {
      this.playChime();
      const quote = this.quotes.find(q => q.id === data.quoteId || q.chatId === data.chatId);
      if (quote) {
        if (!quote.messages) quote.messages = [];
        quote.messages.push(data.message);
        quote.updatedAt = new Date().toISOString();
        if (data.status) quote.status = data.status;
      }
      if (this.activeQuote && (this.activeQuote.id === data.quoteId || this.activeQuote.chatId === data.chatId)) {
        this.appendChatMessageBubble(data.message);
      }
      this.renderChatThreads();
      this.renderQuotesList();
    } else if (data.type === meta.wsCatalogUpdate && Array.isArray(data.items)) {
      this.catalogItems = data.items;
      this.renderCatalogList();
    }
  },

  // =========================================================================
  // Quotes & Orders Tab
  // =========================================================================
  async fetchQuotes(showLoading = false) {
    const meta = this.getServiceMeta();
    if (!meta.quotesEndpoint) return;

    const listEl = document.getElementById('sp-quotes-list');
    if (showLoading && listEl) {
      listEl.innerHTML = `
        <div class="sp-loading-spinner">
          <div class="spinner"></div>
          <span>Cargando solicitudes...</span>
        </div>
      `;
    }

    try {
      const url = `${this.getApiBaseUrl()}${meta.quotesEndpoint}`;
      const res = await fetch(url);
      if (res.ok) {
        let data = await res.json();
        if (this.currentService === 'cauchera') {
          // Filter cauchera orders from general orders
          data = (Array.isArray(data) ? data : []).filter(o => o.type === 'cauchera' || o.establishmentId === 'montallantas-el-cachu');
        }
        this.quotes = Array.isArray(data) ? data : [];
        this.updateQuotesBadge();
        this.renderQuotesList();
        this.renderChatThreads();
        this.updateFilterCounts();
      }
    } catch(e) {
      console.warn('Error fetching quotes:', e);
    }
  },

  updateFilterCounts() {
    const all = this.quotes.length;
    const sol = this.quotes.filter(q => q.status === 'Solicitado').length;
    const conv = this.quotes.filter(q => q.status === 'En Conversación').length;
    const acord = this.quotes.filter(q => q.status === 'Precio Acordado' || q.status === 'Presupuestado').length;
    const conc = this.quotes.filter(q => q.status === 'Concretado' || q.status === 'En Producción').length;
    const fin = this.quotes.filter(q => q.status === 'Finalizado' || q.status === 'Completado').length;

    const setT = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setT('count-all', all);
    setT('count-solicitado', sol);
    setT('count-conversacion', conv);
    setT('count-acordado', acord);
    setT('count-concretado', conc);
    setT('count-finalizado', fin);
  },

  updateQuotesBadge() {
    const badge = document.getElementById('badge-quotes-count');
    const newQuotes = this.quotes.filter(q => q.status === 'Solicitado');
    if (badge) {
      if (newQuotes.length > 0) {
        badge.textContent = newQuotes.length;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  },

  setQuotesFilter(filter, btn) {
    this.quotesFilter = filter;
    document.querySelectorAll('.sp-filter-pill').forEach(p => p.classList.remove('active'));
    if (btn) btn.classList.add('active');
    this.renderQuotesList();
  },

  renderQuotesList() {
    const listEl = document.getElementById('sp-quotes-list');
    if (!listEl) return;

    let items = this.quotes;
    if (this.quotesFilter !== 'all') {
      items = items.filter(q => q.status === this.quotesFilter);
    }

    if (items.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 40px 16px; color: var(--sp-text-muted);">
          <div style="font-size: 34px; margin-bottom: 8px;">📭</div>
          <strong style="color: #FFF; font-size: 15px; display: block;">No hay solicitudes en esta categoría</strong>
          <span style="font-size: 12px;">Las nuevas cotizaciones de clientes aparecerán aquí automáticamente en tiempo real.</span>
        </div>
      `;
      return;
    }

    listEl.innerHTML = items.map(quote => this.renderQuoteCardHtml(quote)).join('');
  },

  renderQuoteCardHtml(q) {
    const isPaint = this.currentService === 'paint';
    const is3d = this.currentService === 'print3d';
    const isResin = this.currentService === 'resin';

    let title = '';
    let specs = '';
    let statusClass = 'badge-solicitado';
    if (q.status === 'En Conversación') statusClass = 'badge-conversacion';
    if (q.status === 'Precio Acordado' || q.status === 'Presupuestado') statusClass = 'badge-acordado';
    if (q.status === 'Concretado' || q.status === 'En Producción' || q.status === 'En Curado UV' || q.status === 'En Elaboración') statusClass = 'badge-concretado';
    if (q.status === 'Finalizado' || q.status === 'Completado' || q.status === 'Listo para Entrega' || q.status === 'Entregado') statusClass = 'badge-finalizado';

    if (isPaint) {
      title = `${q.vehicleModel || 'Vehículo'} • ${q.serviceName || 'Pintura y Latonería'}`;
      const partsText = Array.isArray(q.parts) ? q.parts.join(', ') : (q.parts || 'Piezas');
      const priceText = q.agreedPrice?.usd ? `$${q.agreedPrice.usd} USD (Acordado)` : `$${q.estimatedPriceRange?.minUsd || 50} - $${q.estimatedPriceRange?.maxUsd || 80} USD (Estimado)`;
      specs = `
        <div>
          <span class="sp-spec-label">PIEZAS / DETALLE</span>
          <span class="sp-spec-val">${partsText}</span>
        </div>
        <div>
          <span class="sp-spec-label">ACABADO</span>
          <span class="sp-spec-val">${q.finishName || 'Estándar'}</span>
        </div>
        <div>
          <span class="sp-spec-label">LATONERÍA</span>
          <span class="sp-spec-val">${q.hasBodywork ? '⚠️ Requiere Reparación' : 'No requerida'}</span>
        </div>
        <div>
          <span class="sp-spec-label">PRESUPUESTO</span>
          <span class="sp-spec-val" style="color: #38BDF8;">${priceText}</span>
        </div>
      `;
    } else if (is3d) {
      title = `Pieza 3D: ${q.modelName || q.productTitle || 'Modelo Personalizado'}`;
      const priceText = q.agreedPriceUsd ? `$${q.agreedPriceUsd} USD (Cerrado)` : `$${q.estimatedPriceUsd || 15} USD (Estimado)`;
      specs = `
        <div>
          <span class="sp-spec-label">MATERIAL & COLOR</span>
          <span class="sp-spec-val">${(q.material || 'PLA').toUpperCase()} • ${q.colorName || q.filamentColor || 'Negro'}</span>
        </div>
        <div>
          <span class="sp-spec-label">CANTIDAD & ESCALA</span>
          <span class="sp-spec-val">${q.quantity || 1} un. (${q.scale || 100}%)</span>
        </div>
        <div>
          <span class="sp-spec-label">DIMENSIONES</span>
          <span class="sp-spec-val">${q.dimensions?.x || 10}x${q.dimensions?.y || 10}x${q.dimensions?.z || 10} cm</span>
        </div>
        <div>
          <span class="sp-spec-label">PRESUPUESTO</span>
          <span class="sp-spec-val" style="color: #38BDF8;">${priceText}</span>
        </div>
      `;
    } else if (isResin) {
      title = `Llavero Letra "${q.letter || 'A'}" • ${q.clientName || 'Cliente'}`;
      const priceText = q.agreedPriceUsd ? `$${q.agreedPriceUsd} USD (Cerrado)` : `$${q.estimatedPriceUsd || 4.5} USD (Estimado)`;
      specs = `
        <div>
          <span class="sp-spec-label">INICIAL & ESTILO</span>
          <span class="sp-spec-val">Letra "${q.letter || 'A'}" • ${q.styleName || 'Personalizado'}</span>
        </div>
        <div>
          <span class="sp-spec-label">COLOR & BORLA</span>
          <span class="sp-spec-val">${q.baseColorName || 'Rosa'} • ${q.tasselColor || 'Borla'}</span>
        </div>
        <div>
          <span class="sp-spec-label">HERRAJE & DETALLES</span>
          <span class="sp-spec-val">${q.hardwareColor || 'Dorado'}${q.customName ? ` • "${q.customName}"` : ''}</span>
        </div>
        <div>
          <span class="sp-spec-label">PRESUPUESTO</span>
          <span class="sp-spec-val" style="color: #F472B6;">${priceText}</span>
        </div>
      `;
    } else {
      // Cauchera
      title = `SOS Cauchera • ${q.clientName || 'Cliente'}`;
      specs = `
        <div>
          <span class="sp-spec-label">SERVICIO</span>
          <span class="sp-spec-val">${q.serviceType || 'Auxilio Vial'}</span>
        </div>
        <div>
          <span class="sp-spec-label">UBICACIÓN</span>
          <span class="sp-spec-val">${q.deliveryAddress || 'GPS'}</span>
        </div>
      `;
    }

    const photosHtml = Array.isArray(q.photos) && q.photos.length > 0 ? `
      <div class="sp-card-photos">
        ${q.photos.map(src => `<img src="${src}" class="sp-thumb-photo" onclick="window.open('${src}')" alt="Foto cliente">`).join('')}
      </div>
    ` : '';

    const phone = q.clientPhone || q.customerPhone || '';
    const waUrl = phone ? `https://wa.me/${phone.replace(/[^0-9]/g, '')}` : '';

    return `
      <div class="sp-quote-card" id="card-${q.id}">
        <div class="sp-card-top">
          <div>
            <span class="sp-card-id">#${q.id} • ${new Date(q.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            <div class="sp-card-customer">👤 ${q.clientName || q.customerName || 'Cliente'} ${phone ? `(${phone})` : ''}</div>
            <strong style="font-size: 13px; color: #FFF; display: block; margin-top: 4px;">${title}</strong>
          </div>
          <span class="sp-card-badge ${statusClass}">${q.status}</span>
        </div>

        <div class="sp-card-specs">
          ${specs}
        </div>

        ${photosHtml}

        <div class="sp-card-actions">
          <button type="button" class="btn-card-action btn-action-chat" onclick="ServicePartnerApp.openChatForQuote('${q.id}')">
            <span>💬</span> Abrir Chat
          </button>
          <button type="button" class="btn-card-action btn-action-price" onclick="ServicePartnerApp.openPriceModalForQuote('${q.id}')">
            <span>💰</span> Fijar Presupuesto
          </button>
          <button type="button" class="btn-card-action btn-action-schedule" onclick="ServicePartnerApp.openAppointmentModalForQuote('${q.id}')">
            <span>📅</span> ${is3d ? 'Producción' : (isResin ? 'Curado UV' : 'Agendar Cita')}
          </button>
          ${waUrl ? `
            <a href="${waUrl}" target="_blank" rel="noopener" class="btn-card-action btn-action-wa" style="text-decoration: none;">
              <span>🟢</span> WhatsApp
            </a>
          ` : ''}
        </div>
      </div>
    `;
  },

  // =========================================================================
  // Live Chat System (2-Way)
  // =========================================================================
  renderChatThreads() {
    const listEl = document.getElementById('sp-chat-threads-list');
    if (!listEl) return;

    if (this.quotes.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 30px 16px; color: var(--sp-text-muted); font-size: 13px;">
          No hay conversaciones activas aún.
        </div>
      `;
      return;
    }

    listEl.innerHTML = this.quotes.map(q => {
      const lastMsg = (q.messages && q.messages.length > 0) ? q.messages[q.messages.length - 1] : null;
      const preview = lastMsg ? (lastMsg.text || 'Foto enviada') : 'Nueva cotización iniciada';
      const time = lastMsg ? new Date(lastMsg.timestamp || q.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      const name = q.clientName || q.customerName || 'Cliente';
      const detail = q.vehicleModel || q.modelName || q.productTitle || 'Servicio';

      return `
        <div class="sp-thread-item ${this.activeQuote?.id === q.id ? 'active' : ''}" onclick="ServicePartnerApp.openChatForQuote('${q.id}')">
          <div class="sp-thread-avatar">👤</div>
          <div class="sp-thread-info">
            <div class="sp-thread-top">
              <strong class="sp-thread-name">${name}</strong>
              <span class="sp-thread-time">${time}</span>
            </div>
            <div style="font-size: 11px; color: #38BDF8; font-weight: 700; margin-bottom: 2px;">${detail}</div>
            <div class="sp-thread-preview">${preview}</div>
          </div>
        </div>
      `;
    }).join('');
  },

  openChatForQuote(quoteId) {
    const quote = this.quotes.find(q => q.id === quoteId);
    if (!quote) return;
    this.activeQuote = quote;
    this.activeChatId = quote.chatId || quote.id;

    // Switch tab to Chat
    this.switchTab('chat');

    // On mobile, show active chat panel
    const sidebar = document.getElementById('sp-chat-sidebar');
    const activePanel = document.getElementById('sp-chat-active-panel');
    if (activePanel) activePanel.classList.remove('hidden');

    // Fill headers
    const nameEl = document.getElementById('sp-chat-target-name');
    const detailEl = document.getElementById('sp-chat-target-detail');
    if (nameEl) nameEl.textContent = `👤 ${quote.clientName || quote.customerName || 'Cliente'}`;
    if (detailEl) detailEl.textContent = `${quote.vehicleModel || quote.modelName || 'Servicio'} • #${quote.id}`;

    // Sticky summary
    this.updateStickyQuoteCard(quote);

    // Render messages stream
    this.renderChatMessagesStream(quote);
  },

  closeActiveChatMobile() {
    const activePanel = document.getElementById('sp-chat-active-panel');
    if (activePanel) activePanel.classList.add('hidden');
    this.activeQuote = null;
    this.renderChatThreads();
  },

  updateStickyQuoteCard(quote) {
    const sticky = document.getElementById('sp-chat-sticky-quote');
    if (!sticky) return;

    if (this.currentService === 'paint') {
      const price = quote.agreedPrice?.usd ? `$${quote.agreedPrice.usd} USD (Acordado)` : `$${quote.estimatedPriceRange?.minUsd || 50} - $${quote.estimatedPriceRange?.maxUsd || 80} USD (Estimado)`;
      sticky.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="color: #FFF;">🚗 ${quote.vehicleModel || 'Vehículo'}</strong> • <span style="color: #38BDF8; font-weight: 700;">${price}</span>
            <div style="font-size: 10.5px; color: #94A3B8;">Piezas: ${(quote.parts || []).join(', ')} • ${quote.finishName || 'Bicapa'}</div>
          </div>
          <span class="sp-card-badge badge-conversacion" style="font-size: 10px;">${quote.status}</span>
        </div>
      `;
    } else if (this.currentService === 'resin') {
      const price = quote.agreedPriceUsd ? `$${quote.agreedPriceUsd} USD` : `$${quote.estimatedPriceUsd || 4.5} USD`;
      sticky.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="color: #FFF;">✨ Letra "${quote.letter || 'A'}"</strong> • <span style="color: #F472B6; font-weight: 700;">${price}</span>
            <div style="font-size: 10.5px; color: #94A3B8;">Color: ${quote.baseColorName || 'Rosa'} • Borla: ${quote.tasselColor || 'Rosa'}${quote.customName ? ` • Nombre: "${quote.customName}"` : ''}</div>
          </div>
          <span class="sp-card-badge badge-conversacion" style="font-size: 10px;">${quote.status}</span>
        </div>
      `;
    } else {
      const price = quote.agreedPriceUsd ? `$${quote.agreedPriceUsd} USD` : `$${quote.estimatedPriceUsd || 15} USD`;
      sticky.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="color: #FFF;">🖨️ ${quote.modelName || 'Modelo 3D'}</strong> • <span style="color: #38BDF8; font-weight: 700;">${price}</span>
            <div style="font-size: 10.5px; color: #94A3B8;">${(quote.material || 'PLA').toUpperCase()} • ${quote.colorName || 'Color'} • ${quote.quantity || 1} un.</div>
          </div>
          <span class="sp-card-badge badge-conversacion" style="font-size: 10px;">${quote.status}</span>
        </div>
      `;
    }
  },

  renderChatMessagesStream(quote) {
    const stream = document.getElementById('sp-chat-messages-stream');
    if (!stream) return;
    stream.innerHTML = '';

    (quote.messages || []).forEach(msg => {
      this.appendChatMessageBubble(msg);
    });

    stream.scrollTop = stream.scrollHeight;
  },

  appendChatMessageBubble(msg) {
    const stream = document.getElementById('sp-chat-messages-stream');
    if (!stream) return;

    const isPartner = msg.senderRole === 'workshop' || msg.senderRole === 'admin' || msg.sender === 'lab' || msg.sender === 'admin';
    const bubble = document.createElement('div');
    bubble.className = `sp-chat-msg-bubble ${isPartner ? 'sp-chat-msg-outgoing' : 'sp-chat-msg-incoming'}`;

    const senderLabel = isPartner ? '🛠️ Tú (Taller)' : `👤 ${msg.senderName || 'Cliente'}`;
    const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    let contentHtml = msg.text ? `<div>${msg.text}</div>` : '';
    if (msg.photo) {
      contentHtml += `<img src="${msg.photo}" style="max-width: 100%; border-radius: 8px; margin-top: 6px; cursor: pointer;" onclick="window.open('${msg.photo}')" alt="Foto">`;
    }

    bubble.innerHTML = `
      ${contentHtml}
      <div class="sp-chat-msg-meta">${senderLabel} • ${time}</div>
    `;

    stream.appendChild(bubble);
    stream.scrollTop = stream.scrollHeight;
  },

  async sendCurrentChatMessage() {
    const input = document.getElementById('sp-chat-input-field');
    if (!input || !this.activeQuote) return;
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    const meta = this.getServiceMeta();

    const payload = {
      text,
      senderRole: 'workshop',
      senderName: meta.roleName,
      sender: 'lab'
    };

    try {
      const url = `${this.getApiBaseUrl()}${meta.quotesEndpoint}/${this.activeQuote.id}/messages`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.message) {
        if (!this.activeQuote.messages) this.activeQuote.messages = [];
        this.activeQuote.messages.push(data.message);
        this.appendChatMessageBubble(data.message);
        this.renderChatThreads();
      }
    } catch(e) {
      console.error('Error sending message:', e);
      alert('Error enviando mensaje. Verifica la conexión.');
    }
  },

  // =========================================================================
  // Catalog Management (CRUD)
  // =========================================================================
  async fetchCatalog() {
    const meta = this.getServiceMeta();
    if (!meta.catalogEndpoint) return;

    const grid = document.getElementById('sp-catalog-items-grid');
    if (grid && this.catalogItems.length === 0) {
      grid.innerHTML = `
        <div class="sp-loading-spinner">
          <div class="spinner"></div>
          <span>Cargando catálogo...</span>
        </div>
      `;
    }

    try {
      const url = `${this.getApiBaseUrl()}${meta.catalogEndpoint}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        this.catalogItems = Array.isArray(data) ? data : [];
        this.renderCatalogList();
      }
    } catch(e) {
      console.warn('Error fetching catalog:', e);
    }
  },

  renderCatalogList() {
    const grid = document.getElementById('sp-catalog-items-grid');
    if (!grid) return;

    if (this.catalogItems.length === 0) {
      grid.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--sp-text-muted); grid-column: 1 / -1;">
          <strong style="color: #FFF; display: block; margin-bottom: 6px;">Catálogo Vacío</strong>
          <span>Presiona "➕ Agregar Nuevo" para registrar tu primer servicio o producto.</span>
        </div>
      `;
      return;
    }

    grid.innerHTML = this.catalogItems.map(item => {
      const priceDisplay = item.priceUsd ? `$${item.priceUsd} USD` : (item.basePriceUsd ? `$${item.basePriceUsd.toFixed(2)} USD` : 'A Cotizar');
      const timeDisplay = item.estDays || (item.estPrintHours ? `${item.estPrintHours} horas` : 'Inmediato');
      const isActive = item.active !== false;

      return `
        <div class="sp-catalog-card" id="catalog-card-${item.id}">
          <div class="sp-catalog-card-banner" style="background-image: url('${item.image || '/images/servicios.jpg'}');">
            <span class="sp-card-active-pill ${isActive ? '' : 'inactive'}">
              ${isActive ? '🟢 Activo en App' : '🔴 Pausado'}
            </span>
          </div>
          <div class="sp-catalog-card-body">
            <h3>${item.title}</h3>
            <div class="sp-catalog-card-price">${priceDisplay}</div>
            <div style="font-size: 11px; color: #94A3B8; margin-bottom: 6px;">⏱️ Entrega / Tiempo: <strong>${timeDisplay}</strong></div>
            <div class="sp-catalog-card-desc">${item.desc || 'Sin descripción'}</div>
            <div class="sp-catalog-card-actions">
              <button type="button" class="btn-card-edit" onclick="ServicePartnerApp.openItemEditorModal('${item.id}')">
                ✏️ Modificar
              </button>
              <button type="button" class="btn-card-toggle" onclick="ServicePartnerApp.toggleItemActive('${item.id}')">
                ${isActive ? '⏸️ Pausar' : '▶️ Activar'}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  openItemEditorModal(itemId = null) {
    const modal = document.getElementById('sp-item-editor-modal');
    const deleteBtn = document.getElementById('btn-delete-item');
    const titleHeader = document.getElementById('item-editor-title');

    if (itemId) {
      const item = this.catalogItems.find(i => i.id === itemId);
      if (!item) return;
      titleHeader.textContent = 'Editar Servicio / Producto';
      document.getElementById('edit-item-id').value = item.id;
      document.getElementById('edit-item-title').value = item.title || '';
      document.getElementById('edit-item-price').value = item.priceUsd || item.basePriceUsd || '';
      document.getElementById('edit-item-days').value = item.estDays || (item.estPrintHours ? `${item.estPrintHours} horas` : '');
      document.getElementById('edit-item-category').value = item.category || '';
      document.getElementById('edit-item-vehicletype').value = item.vehicleType || item.material || '';
      document.getElementById('edit-item-desc').value = item.desc || '';
      document.getElementById('edit-item-image').value = item.image || '';
      document.getElementById('edit-item-tags').value = Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags || '');
      document.getElementById('edit-item-active').checked = item.active !== false;
      if (deleteBtn) deleteBtn.classList.remove('hidden');
    } else {
      titleHeader.textContent = 'Agregar Nuevo Servicio / Producto';
      document.getElementById('edit-item-id').value = '';
      document.getElementById('sp-item-form').reset();
      document.getElementById('edit-item-active').checked = true;
      if (deleteBtn) deleteBtn.classList.add('hidden');
    }

    if (modal) modal.classList.remove('hidden');
  },

  closeItemEditorModal() {
    const modal = document.getElementById('sp-item-editor-modal');
    if (modal) modal.classList.add('hidden');
  },

  async saveItemEditor() {
    const id = document.getElementById('edit-item-id').value;
    const title = document.getElementById('edit-item-title').value.trim();
    const price = document.getElementById('edit-item-price').value.trim();
    const days = document.getElementById('edit-item-days').value.trim();
    const category = document.getElementById('edit-item-category').value.trim();
    const vehType = document.getElementById('edit-item-vehicletype').value.trim();
    const desc = document.getElementById('edit-item-desc').value.trim();
    const image = document.getElementById('edit-item-image').value.trim() || '/images/servicios.jpg';
    const tagsStr = document.getElementById('edit-item-tags').value.trim();
    const active = document.getElementById('edit-item-active').checked;

    const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];

    let updatedList = [...this.catalogItems];

    if (id) {
      // Edit existing
      const idx = updatedList.findIndex(i => i.id === id);
      if (idx !== -1) {
        updatedList[idx] = {
          ...updatedList[idx],
          title,
          priceUsd: price,
          basePriceUsd: parseFloat(price) || updatedList[idx].basePriceUsd || 10,
          estDays: days,
          estPrintHours: parseFloat(days) || updatedList[idx].estPrintHours || 4,
          category,
          vehicleType: vehType,
          material: vehType,
          desc,
          image,
          tags,
          active
        };
      }
    } else {
      // Add new
      const newId = `${this.currentService}-${Date.now().toString().slice(-4)}`;
      const newItem = {
        id: newId,
        title,
        priceUsd: price,
        basePriceUsd: parseFloat(price) || 15,
        estDays: days,
        estPrintHours: parseFloat(days) || 4,
        category: category || 'general',
        vehicleType: vehType || 'General',
        material: vehType || 'pla',
        desc,
        image,
        tags,
        active
      };
      updatedList.push(newItem);
    }

    await this.persistCatalog(updatedList);
    this.closeItemEditorModal();
  },

  async toggleItemActive(itemId) {
    const updatedList = this.catalogItems.map(item => {
      if (item.id === itemId) {
        return { ...item, active: item.active === false ? true : false };
      }
      return item;
    });
    await this.persistCatalog(updatedList);
  },

  async deleteCurrentItem() {
    const id = document.getElementById('edit-item-id').value;
    if (!id) return;
    if (!confirm('¿Estás seguro de eliminar este servicio del catálogo?')) return;

    const updatedList = this.catalogItems.filter(i => i.id !== id);
    await this.persistCatalog(updatedList);
    this.closeItemEditorModal();
  },

  async persistCatalog(newList) {
    const meta = this.getServiceMeta();
    if (!meta.catalogEndpoint) return;

    try {
      const url = `${this.getApiBaseUrl()}${meta.catalogEndpoint}`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newList)
      });
      if (res.ok) {
        this.catalogItems = newList;
        this.renderCatalogList();
      }
    } catch(e) {
      console.error('Error saving catalog:', e);
      alert('Error guardando catálogo.');
    }
  },

  // =========================================================================
  // Action Modals: Agreed Price & Appointment
  // =========================================================================
  openPriceModalForQuote(quoteId) {
    const quote = this.quotes.find(q => q.id === quoteId);
    if (!quote) return;
    this.activeQuote = quote;
    const modal = document.getElementById('sp-price-modal');
    const input = document.getElementById('input-agreed-usd');
    if (input) {
      input.value = quote.agreedPrice?.usd || quote.agreedPriceUsd || quote.estimatedPriceRange?.minUsd || quote.estimatedPriceUsd || '';
    }
    if (modal) modal.classList.remove('hidden');
  },

  openPriceModalForActiveChat() {
    if (this.activeQuote) {
      this.openPriceModalForQuote(this.activeQuote.id);
    }
  },

  closePriceModal() {
    const modal = document.getElementById('sp-price-modal');
    if (modal) modal.classList.add('hidden');
  },

  async submitAgreedPrice() {
    if (!this.activeQuote) return;
    const usd = document.getElementById('input-agreed-usd').value;
    const notes = document.getElementById('input-agreed-notes').value.trim();
    if (!usd) return;

    const meta = this.getServiceMeta();
    const payload = {
      action: 'set_agreed_price',
      agreedPrice: { usd: parseFloat(usd), notes },
      agreedPriceUsd: parseFloat(usd),
      notes
    };

    try {
      const url = `${this.getApiBaseUrl()}${meta.quotesEndpoint}/${this.activeQuote.id}/action`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.quote) {
        const idx = this.quotes.findIndex(q => q.id === data.quote.id);
        if (idx !== -1) this.quotes[idx] = data.quote;
        this.activeQuote = data.quote;
        this.updateStickyQuoteCard(data.quote);
        this.renderQuotesList();
      }
      this.closePriceModal();
    } catch(e) {
      console.error('Error setting price:', e);
      alert('Error enviando precio.');
    }
  },

  openAppointmentModalForQuote(quoteId) {
    const quote = this.quotes.find(q => q.id === quoteId);
    if (!quote) return;
    this.activeQuote = quote;
    const modal = document.getElementById('sp-appointment-modal');
    if (modal) modal.classList.remove('hidden');
  },

  openAppointmentModalForActiveChat() {
    if (this.activeQuote) {
      this.openAppointmentModalForQuote(this.activeQuote.id);
    }
  },

  closeAppointmentModal() {
    const modal = document.getElementById('sp-appointment-modal');
    if (modal) modal.classList.add('hidden');
  },

  async submitAppointment() {
    if (!this.activeQuote) return;
    const dateVal = document.getElementById('input-appointment-date').value;
    const notes = document.getElementById('input-appointment-notes').value.trim();

    const meta = this.getServiceMeta();
    const is3d = this.currentService === 'print3d';
    const isResin = this.currentService === 'resin';
    const payload = is3d ? {
      action: 'start_production',
      notes
    } : (isResin ? {
      action: 'uv_curing',
      notes
    } : {
      action: 'schedule_appointment',
      appointmentDate: dateVal,
      notes
    });

    try {
      const url = `${this.getApiBaseUrl()}${meta.quotesEndpoint}/${this.activeQuote.id}/action`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.quote) {
        const idx = this.quotes.findIndex(q => q.id === data.quote.id);
        if (idx !== -1) this.quotes[idx] = data.quote;
        this.activeQuote = data.quote;
        this.updateStickyQuoteCard(data.quote);
        this.renderQuotesList();
      }
      this.closeAppointmentModal();
    } catch(e) {
      console.error('Error scheduling:', e);
      alert('Error agendando cita.');
    }
  },

  // =========================================================================
  // Stats & Performance Tab
  // =========================================================================
  async fetchStats() {
    const meta = this.getServiceMeta();
    if (!meta.statsEndpoint) return;

    try {
      const url = `${this.getApiBaseUrl()}${meta.statsEndpoint}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        this.renderStatsView(data);
      }
    } catch(e) {
      console.warn('Error fetching stats:', e);
    }
  },

  renderStatsView(data) {
    const setT = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    setT('stat-money-usd', `$${(data.totalMoneyUsd || 0).toLocaleString()} USD`);
    setT('stat-conversion-rate', `${data.conversionRate || 0}%`);
    setT('stat-total-quotes', data.total || 0);
    setT('stat-avg-response', `~${data.avgResponseTimeMin || 4} min`);

    setT('stat-funnel-solicitadas', data.solicitados || 0);
    setT('stat-funnel-conversacion', data.enConversacion || 0);
    setT('stat-funnel-acordadas', data.precioAcordado || data.presupuestados || 0);
    setT('stat-funnel-concretadas', data.concretados || data.enProduccion || 0);
    setT('stat-funnel-finalizadas', data.finalizados || data.completados || 0);
  }
};

window.ServicePartnerApp = ServicePartnerApp;
document.addEventListener('DOMContentLoaded', () => ServicePartnerApp.init());
