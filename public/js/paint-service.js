/* ==========================================================================
   Pintura y Latonería Automotriz ("Pinta tu Vehículo") - Logic
   PediGochos Specialized Services Module
   ========================================================================== */

const PaintServiceApp = {
  currentCategoryFilter: 'all',
  activeQuote: null,
  ws: null,

  // Sample catalog of workshop jobs & partner shops
  catalogItems: [
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
      image: '/images/burger_royale.jpg', // fallback or workshop photo
      tags: ['Horno de Pintura', 'Barniz Cerámico', 'Garantía 2 Años']
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
      tags: ['Mismo Tono Garantizado', 'Secado Express', 'Pintura PPG']
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
      tags: ['Tiraje de Chasis', 'Spotter Eléctrico', 'Reparación de Plásticos']
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
      tags: ['Sellado 9H', 'Efecto Hidrofóbico', 'Brillo Máximo']
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
      tags: ['Poliuretano Mate', 'Efecto Tricapa', 'Show Car']
    }
  ],

  // Quoter state
  wizardState: {
    currentStep: 1,
    vehicleType: 'sedan',
    selectedPieces: ['parachoque_del'],
    hasLatoneria: false,
    latoneriaSeverity: 'leve',
    finishType: 'bicapa',
    photos: [],
    urgency: 'estandar',
    date: '',
    customerName: '',
    customerPhone: '',
    notes: ''
  },

  // Vehicle piece labels & base costs
  pieceLabels: {
    'parachoque_del': 'Parachoques Delantero',
    'parachoque_tra': 'Parachoques Trasero',
    'capo': 'Capó / Bonete',
    'techo': 'Techo',
    'puerta_del_izq': 'Puerta Delantera Izquierda',
    'puerta_del_der': 'Puerta Delantera Derecha',
    'puerta_tra_izq': 'Puerta Trasera Izquierda',
    'puerta_tra_der': 'Puerta Trasera Derecha',
    'guardafango_del': 'Guardafangos Delanteros',
    'maleta': 'Maleta / Compuerta Trasera',
    'espejos': 'Espejos Retrovisores (Par)'
  },

  vehicleMultipliers: {
    'moto': 0.65,
    'sedan': 1.0,
    'suv': 1.25,
    'pickup': 1.4
  },

  finishMultipliers: {
    'monocapa': 0.85,
    'bicapa': 1.0,
    'tricapa': 1.3,
    'mate': 1.25
  },

  latoneriaCosts: {
    'none': 0,
    'leve': 25,
    'moderada': 55,
    'fuerte': 110
  },

  init() {
    this.setupWebSocket();
    this.loadCatalog();
    this.checkHashRoute();
    window.addEventListener('hashchange', () => this.checkHashRoute());
  },

  async loadCatalog() {
    try {
      const res = await fetch('/api/paint-services/catalog');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          this.services = data;
          const grid = document.getElementById('paint-catalog-grid');
          if (grid) this.renderCatalog();
        }
      }
    } catch(e) {
      console.warn('Could not load paint catalog from backend:', e);
    }
  },

  checkHashRoute() {
    const hash = window.location.hash || '';
    if (hash === '#servicios/pintura-automotriz' || hash.startsWith('#servicios/pintura-automotriz')) {
      this.open();
    }
  },

  setupWebSocket() {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'PAINT_QUOTE_MESSAGE' && this.activeQuote && data.quoteId === this.activeQuote.id) {
            this.appendChatMessage(data.message);
          } else if (data.type === 'PAINT_QUOTE_UPDATE' && this.activeQuote && data.quote.id === this.activeQuote.id) {
            this.activeQuote = data.quote;
            this.updateFichaTecnica(data.quote);
          } else if (data.type === 'PAINT_CATALOG_UPDATE' && Array.isArray(data.items)) {
            this.services = data.items;
            const grid = document.getElementById('paint-catalog-grid');
            if (grid) this.renderCatalog();
          }
        } catch (e) {
          console.warn('WS paint message parse error:', e);
        }
      };

      this.ws.onclose = () => {
        setTimeout(() => this.setupWebSocket(), 5000);
      };
    } catch (e) {
      console.warn('WS connection failed:', e);
    }
  },

  open() {
    const modal = document.getElementById('paint-service-modal');
    if (!modal) {
      this.renderMainModalMarkup();
    }
    const targetModal = document.getElementById('paint-service-modal');
    if (targetModal) {
      targetModal.classList.remove('hidden');
      window.history.pushState({ modal: 'paint-service' }, '', '#servicios/pintura-automotriz');
      this.renderCatalog();
      this.initComparisonSlider();
    }
  },

  close() {
    const modal = document.getElementById('paint-service-modal');
    if (modal) {
      modal.classList.add('hidden');
      if (window.location.hash.includes('pintura-automotriz')) {
        window.history.pushState({}, '', window.location.pathname);
      }
    }
  },

  renderMainModalMarkup() {
    const div = document.createElement('div');
    div.id = 'paint-service-modal';
    div.className = 'paint-service-modal';
    div.innerHTML = `
      <!-- Header -->
      <header class="paint-header">
        <div class="paint-header-left">
          <button type="button" class="paint-back-btn" onclick="PaintServiceApp.close()" title="Volver a Servicios">
            ←
          </button>
          <div class="paint-title-wrap">
            <h2>🎨 Pintura y Latonería Automotriz</h2>
            <p>Pinta tu vehículo con talleres verificados y acabado al horno</p>
          </div>
        </div>
        <div class="paint-header-actions">
          <button type="button" class="btn-open-quoter" onclick="PaintServiceApp.openQuoter()">
            ⚡ Cotizar Mi Auto
          </button>
        </div>
      </header>

      <!-- Body Content -->
      <main class="paint-body">
        <!-- Hero Card -->
        <section class="paint-hero-card">
          <div class="paint-hero-badge">✨ Servicio Especializado PediGochos</div>
          <h1 class="paint-hero-title">Devuélvele a tu Vehículo el Brillo de Agencia</h1>
          <p class="paint-hero-desc">
            Cotiza en segundos piezas individuales o pintura general completa. Talleres aliados con cabina de pintura al horno, igualación computarizada y garantía certificada en San Antonio y Frontera.
          </p>
          <div class="paint-hero-stats">
            <div class="paint-stat-item">
              <span class="paint-stat-icon">🔥</span>
              <span>Horno Presurizado</span>
            </div>
            <div class="paint-stat-item">
              <span class="paint-stat-icon">🛡️</span>
              <span>Garantía de Color 100%</span>
            </div>
            <div class="paint-stat-item">
              <span class="paint-stat-icon">💬</span>
              <span>Chat Directo con el Taller</span>
            </div>
            <div class="paint-stat-item">
              <span class="paint-stat-icon">💵</span>
              <span>Multimoneda USD • COP • Bs</span>
            </div>
          </div>
        </section>

        <!-- Before and After Interactive Comparison Slider -->
        <section class="paint-comparison-section">
          <div class="paint-section-header">
            <h3 class="paint-section-title">
              <span>🔄</span> Resultados Reales: Antes y Después
            </h3>
            <span style="font-size: 11.5px; color: #94A3B8; font-weight: 700;">Desliza el control</span>
          </div>

          <div class="paint-slider-container" id="paint-slider-container">
            <!-- Before Image (Base background) -->
            <div class="paint-img-layer paint-img-before" style="background-image: url('https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80'); filter: grayscale(40%) contrast(90%);"></div>
            <span class="paint-tag-badge paint-tag-before">ANTES (Golpe y Rayón)</span>

            <!-- After Image (Clipped layer) -->
            <div class="paint-img-layer paint-img-after" id="paint-img-after" style="background-image: url('https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80'); filter: saturate(140%) contrast(110%);">
              <span class="paint-tag-badge paint-tag-after">DESPUÉS (Acabado Espejo)</span>
            </div>

            <!-- Divider handle -->
            <div class="paint-slider-handle" id="paint-slider-handle">
              <div class="paint-handle-button">↔</div>
            </div>

            <!-- Interactive range input overlay -->
            <input type="range" min="0" max="100" value="50" class="paint-slider-range-input" id="paint-slider-input" aria-label="Deslizar comparación Antes y Después">
          </div>
        </section>

        <!-- Category Filter Chips -->
        <div class="paint-filter-scroll">
          <button type="button" class="paint-filter-btn active" onclick="PaintServiceApp.filterCategory('all', this)">
            ✨ Todos los Trabajos
          </button>
          <button type="button" class="paint-filter-btn" onclick="PaintServiceApp.filterCategory('general', this)">
            🚗 Pintura General Completa
          </button>
          <button type="button" class="paint-filter-btn" onclick="PaintServiceApp.filterCategory('pieza', this)">
            🚪 Pintura por Pieza
          </button>
          <button type="button" class="paint-filter-btn" onclick="PaintServiceApp.filterCategory('latoneria', this)">
            🔨 Latonería / Golpes
          </button>
          <button type="button" class="paint-filter-btn" onclick="PaintServiceApp.filterCategory('pulitura', this)">
            ✨ Pulitura & Cerámico
          </button>
          <button type="button" class="paint-filter-btn" onclick="PaintServiceApp.filterCategory('especiales', this)">
            🎨 Acabados Especiales (Mate/Candy)
          </button>
        </div>

        <!-- Workshops / Jobs Grid -->
        <div class="paint-workshops-grid" id="paint-workshops-grid">
          <!-- Populated dynamically -->
        </div>

        <!-- Cross Selling Carousel -->
        <section class="paint-cross-sell">
          <h4 style="margin: 0 0 14px 0; font-size: 15px; font-weight: 800; color: #FFF; display: flex; align-items: center; gap: 8px;">
            <span>🤝</span> Servicios Recomendados para tu Vehículo
          </h4>
          <div class="paint-cross-scroll">
            <div class="paint-cross-card" onclick="PaintServiceApp.close(); MarketplaceApp.openCaucheraModal();">
              <span style="font-size: 26px;">🛞</span>
              <strong style="color: #FFF; font-size: 13px;">Cauchera Móvil 24/7</strong>
              <span style="color: #94A3B8; font-size: 11px;">Auxilio vial y despinche a domicilio en San Antonio.</span>
              <span style="color: #EF4444; font-weight: 800; font-size: 11px; margin-top: 4px;">Solicitar Auxilio →</span>
            </div>
            <div class="paint-cross-card" onclick="PaintServiceApp.close(); MarketplaceApp.openRideModal();">
              <span style="font-size: 26px;">🛵</span>
              <strong style="color: #FFF; font-size: 13px;">PediGochos Móvil</strong>
              <span style="color: #94A3B8; font-size: 11px;">Moto Taxi, Autos y Lujo con tarifa por GPS en vivo.</span>
              <span style="color: #FF6B00; font-weight: 800; font-size: 11px; margin-top: 4px;">Pedir Móvil →</span>
            </div>
            <div class="paint-cross-card" onclick="PaintServiceApp.close(); Print3DServiceApp.open();">
              <span style="font-size: 26px;">🖨️</span>
              <strong style="color: #FFF; font-size: 13px;">PediGochos 3D Lab</strong>
              <span style="color: #94A3B8; font-size: 11px;">Fabricación y prototipado 3D de repuestos automotrices.</span>
              <span style="color: #38BDF8; font-weight: 800; font-size: 11px; margin-top: 4px;">Ver 3D Lab →</span>
            </div>
          </div>
        </section>
      </main>
    `;
    document.body.appendChild(div);
  },

  initComparisonSlider() {
    const input = document.getElementById('paint-slider-input');
    const afterLayer = document.getElementById('paint-img-after');
    const handle = document.getElementById('paint-slider-handle');

    if (!input || !afterLayer || !handle) return;

    input.addEventListener('input', (e) => {
      const val = e.target.value;
      afterLayer.style.width = `${val}%`;
      handle.style.left = `${val}%`;
    });
  },

  filterCategory(cat, btnEl) {
    this.currentCategoryFilter = cat;
    document.querySelectorAll('.paint-filter-btn').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    this.renderCatalog();
  },

  renderCatalog() {
    const grid = document.getElementById('paint-workshops-grid');
    if (!grid) return;

    const items = this.catalogItems.filter(item => {
      if (this.currentCategoryFilter === 'all') return true;
      return item.category === this.currentCategoryFilter;
    });

    grid.innerHTML = items.map(item => `
      <div class="paint-workshop-card">
        <div class="paint-card-img-wrap" style="background-image: url('${item.image}');">
          <div class="paint-card-overlay"></div>
          <span class="paint-card-badge">${item.vehicleType}</span>
          <span class="paint-card-rating">★ ${item.rating}</span>
        </div>
        <div class="paint-card-content">
          <h4 class="paint-card-title">${item.title}</h4>
          <span style="font-size: 11px; color: #EF4444; font-weight: 800; margin-bottom: 6px;">📍 ${item.workshop}</span>
          <p class="paint-card-desc">${item.desc}</p>
          <div class="paint-card-tags">
            ${item.tags.map(t => `<span class="paint-pill-tag">${t}</span>`).join('')}
            <span class="paint-pill-tag">⏱️ ${item.estDays}</span>
          </div>
          <div class="paint-card-footer">
            <div class="paint-price-est">
              <span class="paint-price-label">Estimado referencial</span>
              <span class="paint-price-val">$${item.priceUsd} USD</span>
            </div>
            <button type="button" class="paint-btn-quote-card" onclick="PaintServiceApp.openQuoterFor('${item.category}')">
              Cotizar Pieza ➔
            </button>
          </div>
        </div>
      </div>
    `).join('');
  },

  // 4-Step Interactive Quoter Wizard
  openQuoterFor(category) {
    if (category === 'general') {
      this.wizardState.selectedPieces = Object.keys(this.pieceLabels);
    } else {
      this.wizardState.selectedPieces = ['parachoque_del'];
    }
    this.openQuoter();
  },

  openQuoter() {
    let modal = document.getElementById('paint-wizard-modal');
    if (!modal) {
      this.renderQuoterModalMarkup();
      modal = document.getElementById('paint-wizard-modal');
    }
    this.wizardState.currentStep = 1;
    this.renderQuoterStep();
    modal.classList.remove('hidden');
  },

  closeQuoter() {
    const modal = document.getElementById('paint-wizard-modal');
    if (modal) modal.classList.add('hidden');
  },

  renderQuoterModalMarkup() {
    const div = document.createElement('div');
    div.id = 'paint-wizard-modal';
    div.className = 'paint-wizard-modal';
    div.innerHTML = `
      <div class="paint-wizard-container">
        <!-- Wizard Header -->
        <div class="paint-wizard-header">
          <h3><span>🎨</span> Cotizador Inteligente de Pintura</h3>
          <button type="button" class="paint-wizard-close" onclick="PaintServiceApp.closeQuoter()">✕</button>
        </div>

        <!-- Progress Steps -->
        <div class="paint-steps-bar">
          <div class="paint-step-indicator active" id="pstep-1">
            <div class="paint-step-line"></div>
            <span class="paint-step-label">1. Vehículo</span>
          </div>
          <div class="paint-step-indicator" id="pstep-2">
            <div class="paint-step-line"></div>
            <span class="paint-step-label">2. Piezas & Latonería</span>
          </div>
          <div class="paint-step-indicator" id="pstep-3">
            <div class="paint-step-line"></div>
            <span class="paint-step-label">3. Fotos Reales</span>
          </div>
          <div class="paint-step-indicator" id="pstep-4">
            <div class="paint-step-line"></div>
            <span class="paint-step-label">4. Estimado & Envío</span>
          </div>
        </div>

        <!-- Wizard Step Body -->
        <div class="paint-wizard-content" id="paint-wizard-step-content">
          <!-- Rendered dynamically -->
        </div>

        <!-- Wizard Footer -->
        <div class="paint-wizard-footer">
          <button type="button" class="btn-wizard-prev" id="btn-wizard-prev" onclick="PaintServiceApp.prevStep()">
            Atrás
          </button>
          <button type="button" class="btn-wizard-next" id="btn-wizard-next" onclick="PaintServiceApp.nextStep()">
            <span>Continuar</span> <span>→</span>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(div);
  },

  renderQuoterStep() {
    const container = document.getElementById('paint-wizard-step-content');
    const prevBtn = document.getElementById('btn-wizard-prev');
    const nextBtn = document.getElementById('btn-wizard-next');
    const step = this.wizardState.currentStep;

    // Update progress bar
    for (let i = 1; i <= 4; i++) {
      const el = document.getElementById(`pstep-${i}`);
      if (!el) continue;
      el.classList.remove('active', 'done');
      if (i < step) el.classList.add('done');
      if (i === step) el.classList.add('active');
    }

    if (prevBtn) prevBtn.style.display = step === 1 ? 'none' : 'block';
    if (nextBtn) {
      nextBtn.innerHTML = step === 4 ? '<span>🚀 Enviar Cotización</span>' : '<span>Continuar →</span>';
    }

    if (step === 1) {
      container.innerHTML = `
        <h4 style="margin: 0 0 6px 0; font-size: 15px; color: #FFF; font-weight: 800;">Paso 1: Selecciona el Tipo de Vehículo</h4>
        <p style="margin: 0 0 14px 0; font-size: 12px; color: #94A3B8;">El tamaño influye en la cantidad de material, pintura y tiempo de horneado.</p>

        <div class="paint-vehicle-grid">
          <div class="paint-vehicle-card ${this.wizardState.vehicleType === 'sedan' ? 'selected' : ''}" onclick="PaintServiceApp.selectVehicle('sedan')">
            <span class="paint-vehicle-icon">🚗</span>
            <span class="paint-vehicle-name">Sedán / Hatchback</span>
            <span class="paint-vehicle-sub">Aveo, Spark, Corsa, Corolla</span>
          </div>
          <div class="paint-vehicle-card ${this.wizardState.vehicleType === 'suv' ? 'selected' : ''}" onclick="PaintServiceApp.selectVehicle('suv')">
            <span class="paint-vehicle-icon">🚙</span>
            <span class="paint-vehicle-name">Camioneta / SUV</span>
            <span class="paint-vehicle-sub">Tucson, Explorer, Grand Vitara</span>
          </div>
          <div class="paint-vehicle-card ${this.wizardState.vehicleType === 'pickup' ? 'selected' : ''}" onclick="PaintServiceApp.selectVehicle('pickup')">
            <span class="paint-vehicle-icon">🛻</span>
            <span class="paint-vehicle-name">Pick-up / Grande</span>
            <span class="paint-vehicle-sub">Hilux, Silverado, F-150</span>
          </div>
          <div class="paint-vehicle-card ${this.wizardState.vehicleType === 'moto' ? 'selected' : ''}" onclick="PaintServiceApp.selectVehicle('moto')">
            <span class="paint-vehicle-icon">🏍️</span>
            <span class="paint-vehicle-name">Moto / Scooter</span>
            <span class="paint-vehicle-sub">Tanque, Guardabarros, Carenado</span>
          </div>
        </div>
      `;
    } else if (step === 2) {
      const isAllSelected = this.wizardState.selectedPieces.length === Object.keys(this.pieceLabels).length;
      container.innerHTML = `
        <h4 style="margin: 0 0 6px 0; font-size: 15px; color: #FFF; font-weight: 800;">Paso 2: Piezas a Pintar & Latonería</h4>
        <p style="margin: 0 0 14px 0; font-size: 12px; color: #94A3B8;">Toca las piezas que deseas pintar o selecciona pintura completa.</p>

        <div style="display: flex; justify-content: flex-end; margin-bottom: 10px;">
          <button type="button" onclick="PaintServiceApp.toggleAllPieces()" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); color: #F8FAFC; padding: 4px 12px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer;">
            ${isAllSelected ? '✕ Deseleccionar Todas' : '🚗 Seleccionar Auto Completo'}
          </button>
        </div>

        <!-- Schematic Chips -->
        <div class="paint-pieces-chips" style="margin-bottom: 20px;">
          ${Object.entries(this.pieceLabels).map(([key, label]) => {
            const sel = this.wizardState.selectedPieces.includes(key);
            return `
              <button type="button" class="paint-piece-chip ${sel ? 'selected' : ''}" onclick="PaintServiceApp.togglePiece('${key}')">
                <span>${sel ? '✓' : '+'}</span> ${label}
              </button>
            `;
          }).join('')}
        </div>

        <!-- Latonería Toggle Box -->
        <div class="paint-latoneria-box">
          <div class="paint-latoneria-toggle" onclick="PaintServiceApp.toggleLatoneria()">
            <div>
              <strong style="color: #FFF; font-size: 13px;">¿Requiere Latonería / Sacar Golpes?</strong>
              <p style="margin: 2px 0 0 0; font-size: 11px; color: #94A3B8;">Alineación de chapa o reparación de abolladuras antes de pintar.</p>
            </div>
            <input type="checkbox" ${this.wizardState.hasLatoneria ? 'checked' : ''} style="width: 20px; height: 20px; accent-color: #EF4444; pointer-events: none;">
          </div>

          ${this.wizardState.hasLatoneria ? `
            <div style="margin-top: 12px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px;">
              <span style="font-size: 11px; font-weight: 800; color: #FCD34D;">Gravedad del golpe / daño:</span>
              <div class="paint-severity-radios">
                <div class="paint-severity-card ${this.wizardState.latoneriaSeverity === 'leve' ? 'selected' : ''}" onclick="PaintServiceApp.selectSeverity('leve')">
                  <span class="paint-severity-name">Leve</span>
                  <span class="paint-severity-desc">Hundimiento menor sin quiebre</span>
                </div>
                <div class="paint-severity-card ${this.wizardState.latoneriaSeverity === 'moderada' ? 'selected' : ''}" onclick="PaintServiceApp.selectSeverity('moderada')">
                  <span class="paint-severity-name">Moderado</span>
                  <span class="paint-severity-desc">Golpe medio con deformación</span>
                </div>
                <div class="paint-severity-card ${this.wizardState.latoneriaSeverity === 'fuerte' ? 'selected' : ''}" onclick="PaintServiceApp.selectSeverity('fuerte')">
                  <span class="paint-severity-name">Fuerte</span>
                  <span class="paint-severity-desc">Pieza descuadrada / choque</span>
                </div>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Finish Type -->
        <div>
          <strong style="color: #FFF; font-size: 13px;">Tipo de Acabado / Barniz:</strong>
          <div class="paint-finish-grid">
            <div class="paint-finish-card ${this.wizardState.finishType === 'monocapa' ? 'selected' : ''}" onclick="PaintServiceApp.selectFinish('monocapa')">
              <div class="paint-finish-swatch" style="background: #3B82F6;"></div>
              <strong style="color: #FFF; font-size: 11px; display: block;">Monocapa</strong>
              <span style="color: #94A3B8; font-size: 9.5px;">Económico directo</span>
            </div>
            <div class="paint-finish-card ${this.wizardState.finishType === 'bicapa' ? 'selected' : ''}" onclick="PaintServiceApp.selectFinish('bicapa')">
              <div class="paint-finish-swatch" style="background: linear-gradient(135deg, #EF4444, #F87171); box-shadow: 0 0 8px rgba(239,68,68,0.6);"></div>
              <strong style="color: #FFF; font-size: 11px; display: block;">Bicapa Poliuretano</strong>
              <span style="color: #94A3B8; font-size: 9.5px;">Brillo y garantía (Estándar)</span>
            </div>
            <div class="paint-finish-card ${this.wizardState.finishType === 'tricapa' ? 'selected' : ''}" onclick="PaintServiceApp.selectFinish('tricapa')">
              <div class="paint-finish-swatch" style="background: radial-gradient(circle, #FDE047 10%, #EAB308 90%);"></div>
              <strong style="color: #FFF; font-size: 11px; display: block;">Tricapa Perlado</strong>
              <span style="color: #94A3B8; font-size: 9.5px;">Perla y profundidad</span>
            </div>
            <div class="paint-finish-card ${this.wizardState.finishType === 'mate' ? 'selected' : ''}" onclick="PaintServiceApp.selectFinish('mate')">
              <div class="paint-finish-swatch" style="background: #1E293B; border-color: #64748B;"></div>
              <strong style="color: #FFF; font-size: 11px; display: block;">Acabado Mate</strong>
              <span style="color: #94A3B8; font-size: 9.5px;">Barniz sedoso mate</span>
            </div>
          </div>
        </div>
      `;
    } else if (step === 3) {
      container.innerHTML = `
        <h4 style="margin: 0 0 6px 0; font-size: 15px; color: #FFF; font-weight: 800;">Paso 3: Fotos Reales del Vehículo</h4>
        <p style="margin: 0 0 14px 0; font-size: 12px; color: #94A3B8;">Sube fotos claras del estado actual de la lámina, pintura o zonas afectadas para una cotización certera.</p>

        <div class="paint-upload-zone" onclick="document.getElementById('paint-file-input').click()">
          <span style="font-size: 32px; display: block; margin-bottom: 6px;">📸</span>
          <strong style="color: #FFF; font-size: 13px; display: block;">Toca para Tomar Foto o Subir desde Galería</strong>
          <span style="color: #94A3B8; font-size: 11px;">Formatos JPG, PNG (Hasta 5 fotos)</span>
          <input type="file" id="paint-file-input" accept="image/*" multiple style="display: none;" onchange="PaintServiceApp.handlePhotoUpload(event)">
        </div>

        <div class="paint-thumbs-grid" id="paint-thumbs-grid">
          ${this.wizardState.photos.map((p, idx) => `
            <div class="paint-thumb-item" style="background-image: url('${p}');">
              <button type="button" class="paint-thumb-remove" onclick="PaintServiceApp.removePhoto(${idx})">✕</button>
            </div>
          `).join('')}
        </div>
      `;
    } else if (step === 4) {
      const estimate = this.calculateEstimate();
      const copRate = (window.systemSettings && window.systemSettings.cop_rate) ? window.systemSettings.cop_rate : 4100;
      const vesRate = (window.systemSettings && window.systemSettings.ves_rate) ? window.systemSettings.ves_rate : 135;

      const minUsd = estimate.min;
      const maxUsd = estimate.max;
      const minCop = Math.round(minUsd * copRate);
      const maxCop = Math.round(maxUsd * copRate);
      const minVes = Math.round(minUsd * vesRate);
      const maxVes = Math.round(maxUsd * vesRate);

      container.innerHTML = `
        <h4 style="margin: 0 0 6px 0; font-size: 15px; color: #FFF; font-weight: 800;">Paso 4: Urgencia, Contacto y Estimación</h4>
        <p style="margin: 0 0 14px 0; font-size: 12px; color: #94A3B8;">Revisa el rango aproximado e ingresa tus datos para conectar con el taller.</p>

        <!-- Urgency -->
        <span style="font-size: 11px; font-weight: 800; color: #CBD5E1; display: block; margin-bottom: 6px;">Nivel de Urgencia / Tiempo de Entrega:</span>
        <div class="paint-urgency-radios">
          <div class="paint-urgency-card ${this.wizardState.urgency === 'estandar' ? 'selected' : ''}" onclick="PaintServiceApp.selectUrgency('estandar')">
            <span style="font-size: 12px; font-weight: 800; color: #FFF; display: block;">Estándar</span>
            <span style="font-size: 10px; color: #94A3B8;">3 - 6 días hábiles</span>
          </div>
          <div class="paint-urgency-card ${this.wizardState.urgency === 'urgente' ? 'selected' : ''}" onclick="PaintServiceApp.selectUrgency('urgente')">
            <span style="font-size: 12px; font-weight: 800; color: #EF4444; display: block;">⚡ Urgente</span>
            <span style="font-size: 10px; color: #FCA5A5;">24 - 48 horas express</span>
          </div>
          <div class="paint-urgency-card ${this.wizardState.urgency === 'programada' ? 'selected' : ''}" onclick="PaintServiceApp.selectUrgency('programada')">
            <span style="font-size: 12px; font-weight: 800; color: #38BDF8; display: block;">📅 Con Cita</span>
            <span style="font-size: 10px; color: #BAE6FD;">Agendar día fijo</span>
          </div>
        </div>

        <!-- Contact Form -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px;">
          <div>
            <label style="font-size: 11px; font-weight: 800; color: #CBD5E1; display: block; margin-bottom: 3px;">Tu Nombre *</label>
            <input type="text" id="paint-client-name" value="${this.wizardState.customerName || ''}" placeholder="Ej. Carlos Mendoza" style="width: 100%; padding: 8px 10px; border-radius: 10px; background: #1E293B; border: 1px solid rgba(255,255,255,0.15); color: #FFF; font-size: 12px; box-sizing: border-box;">
          </div>
          <div>
            <label style="font-size: 11px; font-weight: 800; color: #CBD5E1; display: block; margin-bottom: 3px;">WhatsApp / Teléfono *</label>
            <input type="tel" id="paint-client-phone" value="${this.wizardState.customerPhone || ''}" placeholder="Ej. 0414... / 320..." style="width: 100%; padding: 8px 10px; border-radius: 10px; background: #1E293B; border: 1px solid rgba(255,255,255,0.15); color: #FFF; font-size: 12px; box-sizing: border-box;">
          </div>
        </div>

        <!-- Dynamic Estimate Card -->
        <div class="paint-estimate-card">
          <div class="paint-estimate-row">
            <span>Vehículo & Acabado:</span>
            <strong style="color: #FFF;">${this.wizardState.vehicleType.toUpperCase()} • ${this.wizardState.finishType.toUpperCase()}</strong>
          </div>
          <div class="paint-estimate-row">
            <span>Piezas Seleccionadas:</span>
            <strong style="color: #FFF;">${this.wizardState.selectedPieces.length} pieza(s)</strong>
          </div>
          <div class="paint-estimate-row">
            <span>Latonería / Daño:</span>
            <strong style="color: #FCD34D;">${this.wizardState.hasLatoneria ? this.wizardState.latoneriaSeverity.toUpperCase() : 'NO REQUIERE'}</strong>
          </div>
          <div style="border-top: 1px solid rgba(255,255,255,0.1); margin: 8px 0; padding-top: 8px; display: flex; justify-content: space-between; align-items: flex-end;">
            <div>
              <span style="font-size: 11px; color: #94A3B8; font-weight: 700;">RANGO ESTIMADO:</span>
            </div>
            <div class="paint-total-prices">
              <span class="paint-total-usd">$${minUsd} - $${maxUsd} USD</span>
              <span class="paint-total-cop">$${minCop.toLocaleString('es-CO')} - $${maxCop.toLocaleString('es-CO')} COP</span>
              <span class="paint-total-ves">${minVes.toLocaleString('es-VE')} - ${maxVes.toLocaleString('es-VE')} Bs</span>
            </div>
          </div>
          <div class="paint-disclaimer">
            ⚠️ <em>Nota importante: El precio mostrado es un estimado referencial calculado según tarifas estándar. El taller aliado verificará el estado físico real de la chapa y te confirmará el presupuesto final exacto por el chat integrado.</em>
          </div>
        </div>
      `;
    }
  },

  selectVehicle(type) {
    this.wizardState.vehicleType = type;
    this.renderQuoterStep();
  },

  togglePiece(key) {
    const idx = this.wizardState.selectedPieces.indexOf(key);
    if (idx > -1) {
      this.wizardState.selectedPieces.splice(idx, 1);
    } else {
      this.wizardState.selectedPieces.push(key);
    }
    this.renderQuoterStep();
  },

  toggleAllPieces() {
    const allKeys = Object.keys(this.pieceLabels);
    if (this.wizardState.selectedPieces.length === allKeys.length) {
      this.wizardState.selectedPieces = [];
    } else {
      this.wizardState.selectedPieces = [...allKeys];
    }
    this.renderQuoterStep();
  },

  toggleLatoneria() {
    this.wizardState.hasLatoneria = !this.wizardState.hasLatoneria;
    this.renderQuoterStep();
  },

  selectSeverity(sev) {
    this.wizardState.latoneriaSeverity = sev;
    this.renderQuoterStep();
  },

  selectFinish(fin) {
    this.wizardState.finishType = fin;
    this.renderQuoterStep();
  },

  selectUrgency(urg) {
    this.wizardState.urgency = urg;
    this.renderQuoterStep();
  },

  handlePhotoUpload(event) {
    const files = event.target.files;
    if (!files || !files.length) return;

    for (let i = 0; i < files.length && this.wizardState.photos.length < 5; i++) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.wizardState.photos.push(e.target.result);
        this.renderQuoterStep();
      };
      reader.readAsDataURL(files[i]);
    }
  },

  removePhoto(index) {
    this.wizardState.photos.splice(index, 1);
    this.renderQuoterStep();
  },

  calculateEstimate() {
    const piecesCount = Math.max(1, this.wizardState.selectedPieces.length);
    const isFullCar = piecesCount >= Object.keys(this.pieceLabels).length;

    let basePiecePrice = 45; // USD per piece
    let totalBase = isFullCar ? 350 : (piecesCount * basePiecePrice);

    // Multipliers
    const vMult = this.vehicleMultipliers[this.wizardState.vehicleType] || 1.0;
    const fMult = this.finishMultipliers[this.wizardState.finishType] || 1.0;
    const latCost = this.wizardState.hasLatoneria ? (this.latoneriaCosts[this.wizardState.latoneriaSeverity] || 0) : 0;

    let calculated = Math.round((totalBase * vMult * fMult) + latCost);
    let min = Math.max(30, Math.round(calculated * 0.9));
    let max = Math.round(calculated * 1.15);

    return { min, max };
  },

  prevStep() {
    if (this.wizardState.currentStep > 1) {
      this.wizardState.currentStep--;
      this.renderQuoterStep();
    }
  },

  async nextStep() {
    if (this.wizardState.currentStep === 1) {
      this.wizardState.currentStep = 2;
      this.renderQuoterStep();
    } else if (this.wizardState.currentStep === 2) {
      if (this.wizardState.selectedPieces.length === 0) {
        alert('⚠️ Por favor selecciona al menos una pieza a pintar o selecciona auto completo.');
        return;
      }
      this.wizardState.currentStep = 3;
      this.renderQuoterStep();
    } else if (this.wizardState.currentStep === 3) {
      this.wizardState.currentStep = 4;
      this.renderQuoterStep();
    } else if (this.wizardState.currentStep === 4) {
      // Submit quote
      const nameInput = document.getElementById('paint-client-name');
      const phoneInput = document.getElementById('paint-client-phone');
      const name = nameInput ? nameInput.value.trim() : '';
      const phone = phoneInput ? phoneInput.value.trim() : '';

      if (!name || !phone) {
        alert('⚠️ Por favor ingresa tu Nombre y Teléfono / WhatsApp para recibir la respuesta del taller.');
        return;
      }

      this.wizardState.customerName = name;
      this.wizardState.customerPhone = phone;

      await this.submitQuote();
    }
  },

  async submitQuote() {
    const estimate = this.calculateEstimate();
    const payload = {
      customerName: this.wizardState.customerName,
      customerPhone: this.wizardState.customerPhone,
      vehicleType: this.wizardState.vehicleType,
      selectedPieces: this.wizardState.selectedPieces,
      hasLatoneria: this.wizardState.hasLatoneria,
      latoneriaSeverity: this.wizardState.latoneriaSeverity,
      finishType: this.wizardState.finishType,
      photosCount: this.wizardState.photos.length,
      urgency: this.wizardState.urgency,
      estimatedRangeUsd: `${estimate.min} - ${estimate.max}`,
      notes: this.wizardState.notes
    };

    try {
      const res = await fetch('/api/paint-services/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.quote) {
        this.activeQuote = data.quote;
        this.closeQuoter();
        this.openChat(data.quote);
      }
    } catch (e) {
      console.error('Error submitting paint quote:', e);
      alert('Error enviando la solicitud. Por favor intenta de nuevo.');
    }
  },

  // 2-Way In-App Chat Modal
  openChat(quote) {
    this.activeQuote = quote;
    let modal = document.getElementById('paint-chat-modal');
    if (!modal) {
      this.renderChatModalMarkup();
      modal = document.getElementById('paint-chat-modal');
    }

    this.updateFichaTecnica(quote);
    this.loadChatMessages(quote.id);
    modal.classList.remove('hidden');
  },

  closeChat() {
    const modal = document.getElementById('paint-chat-modal');
    if (modal) modal.classList.add('hidden');
  },

  renderChatModalMarkup() {
    const div = document.createElement('div');
    div.id = 'paint-chat-modal';
    div.className = 'paint-chat-modal';
    div.innerHTML = `
      <header class="paint-chat-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <button type="button" class="paint-back-btn" onclick="PaintServiceApp.closeChat()">←</button>
          <div>
            <h3 style="margin: 0; font-size: 15px; font-weight: 800; color: #FFF; display: flex; align-items: center; gap: 6px;">
              <span>💬</span> Chat Directo con Taller Aliado
            </h3>
            <span style="font-size: 11px; color: #10B981; font-weight: 700;">🟢 En Línea • San Antonio del Táchira</span>
          </div>
        </div>
        <button type="button" onclick="PaintServiceApp.closeChat()" style="background: none; border: none; color: #94A3B8; font-size: 18px; cursor: pointer;">✕</button>
      </header>

      <main class="paint-chat-body">
        <!-- Sticky Ficha de Cotización Interactiva -->
        <div class="paint-quote-sheet" id="paint-ficha-tecnica">
          <!-- Populated dynamically -->
        </div>

        <!-- Chat Messages -->
        <div class="paint-messages-area" id="paint-chat-messages">
          <!-- Bubbles -->
        </div>

        <!-- Input Bar -->
        <form class="paint-chat-input-bar" onsubmit="event.preventDefault(); PaintServiceApp.sendMessage();">
          <input type="text" id="paint-chat-input" placeholder="Escribe tu mensaje o consulta al taller...">
          <button type="submit" class="btn-send-paint-msg" title="Enviar">➤</button>
        </form>
      </main>
    `;
    document.body.appendChild(div);
  },

  updateFichaTecnica(quote) {
    const el = document.getElementById('paint-ficha-tecnica');
    if (!el) return;

    const statusClasses = {
      'Solicitado': 'paint-status-solicitado',
      'En Conversación': 'paint-status-conversacion',
      'Presupuestado': 'paint-status-presupuestado',
      'En Producción': 'paint-status-produccion',
      'Finalizado': 'paint-status-finalizado'
    };

    const statusClass = statusClasses[quote.status] || 'paint-status-solicitado';

    el.innerHTML = `
      <div class="paint-sheet-top">
        <div>
          <strong style="color: #FFF; font-size: 14px;">Ficha Técnica de Cotización #${quote.id.slice(-6)}</strong>
          <span style="font-size: 11px; color: #94A3B8; display: block;">Cliente: ${quote.customerName} (${quote.customerPhone})</span>
        </div>
        <span class="paint-status-pill ${statusClass}">${quote.status}</span>
      </div>

      <div class="paint-sheet-details">
        <div>
          <span style="color: #94A3B8; font-size: 10px; display: block;">VEHÍCULO</span>
          <strong style="color: #FFF;">${(quote.vehicleType || '').toUpperCase()}</strong>
        </div>
        <div>
          <span style="color: #94A3B8; font-size: 10px; display: block;">PIEZAS (${quote.selectedPieces?.length || 0})</span>
          <strong style="color: #FFF;">${(quote.selectedPieces || []).map(p => this.pieceLabels[p] || p).join(', ') || 'General'}</strong>
        </div>
        <div>
          <span style="color: #94A3B8; font-size: 10px; display: block;">LATONERÍA</span>
          <strong style="color: #FCD34D;">${quote.hasLatoneria ? (quote.latoneriaSeverity || 'Leve').toUpperCase() : 'Ninguna'}</strong>
        </div>
        <div>
          <span style="color: #94A3B8; font-size: 10px; display: block;">PRECIO ESTIMADO / FINAL</span>
          <strong style="color: #10B981; font-size: 13px;">${quote.finalPrice ? `$${quote.finalPrice} USD (Acordado)` : `$${quote.estimatedRangeUsd} USD`}</strong>
        </div>
      </div>

      <div class="paint-sheet-actions">
        <button type="button" class="btn-sheet-action" onclick="PaintServiceApp.promptAdjustPrice('${quote.id}')">
          ✏️ Ajustar Precio Final
        </button>
        <button type="button" class="btn-sheet-action accent" onclick="PaintServiceApp.scheduleAppointment('${quote.id}')">
          📅 Agendar Cita en Taller
        </button>
      </div>
    `;
  },

  async loadChatMessages(quoteId) {
    const area = document.getElementById('paint-chat-messages');
    if (!area) return;

    try {
      const res = await fetch(`/api/paint-services/quotes/${quoteId}`);
      const quote = await res.json();
      area.innerHTML = '';
      (quote.messages || []).forEach(msg => {
        this.appendChatMessage(msg);
      });
      area.scrollTop = area.scrollHeight;
    } catch (e) {
      console.warn('Could not load chat messages:', e);
    }
  },

  appendChatMessage(msg) {
    const area = document.getElementById('paint-chat-messages');
    if (!area) return;

    const isIncoming = msg.sender === 'workshop' || msg.sender === 'admin';
    const div = document.createElement('div');
    div.className = `paint-msg-bubble ${isIncoming ? 'paint-msg-incoming' : 'paint-msg-outgoing'}`;
    div.innerHTML = `
      <div>${msg.text}</div>
      <div class="paint-msg-meta">
        <span>${isIncoming ? '👨‍🔧 Taller' : '👤 Tú'}</span> •
        <span>${new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    `;
    area.appendChild(div);
    area.scrollTop = area.scrollHeight;
  },

  async sendMessage() {
    const input = document.getElementById('paint-chat-input');
    if (!input || !this.activeQuote) return;
    const text = input.value.trim();
    if (!text) return;

    const payload = {
      sender: 'customer',
      senderName: this.activeQuote.customerName || 'Cliente',
      text
    };

    input.value = '';

    try {
      const res = await fetch(`/api/paint-services/quotes/${this.activeQuote.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.message) {
        this.appendChatMessage(data.message);
      }
    } catch (e) {
      console.error('Error sending message:', e);
    }
  },

  async promptAdjustPrice(quoteId) {
    const price = prompt('Ingresa el monto presupuestado final en USD (ej. 180):');
    if (!price || isNaN(price)) return;

    try {
      const res = await fetch(`/api/paint-services/quotes/${quoteId}/action`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setPrice',
          price: parseFloat(price),
          status: 'Presupuestado'
        })
      });
      const data = await res.json();
      if (data.quote) {
        this.activeQuote = data.quote;
        this.updateFichaTecnica(data.quote);
      }
    } catch (e) {
      alert('Error ajustando precio.');
    }
  },

  async scheduleAppointment(quoteId) {
    const date = prompt('Indica el día y hora para la cita en el taller (ej. Mañana a las 9:00 AM):');
    if (!date) return;

    try {
      const res = await fetch(`/api/paint-services/quotes/${quoteId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: 'system',
          senderName: 'Sistema',
          text: `📅 Cita agendada para inspección / entrega del vehículo: ${date}. Te esperamos en el taller con la cotización lista.`
        })
      });
      const data = await res.json();
      if (data.message) {
        this.appendChatMessage(data.message);
      }
    } catch (e) {
      alert('Error agendando cita.');
    }
  }
};

window.PaintServiceApp = PaintServiceApp;
document.addEventListener('DOMContentLoaded', () => {
  PaintServiceApp.init();
});
