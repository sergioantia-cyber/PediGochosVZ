/* ==========================================================================
   Impresión 3D & Prototipado ("PediGochos 3D Lab") - Logic
   PediGochos Specialized Services Module
   ========================================================================== */

const Print3DServiceApp = {
  currentCategoryFilter: 'all',
  selectedProduct: null,
  activeQuote: null,
  ws: null,

  // Filament colors
  filamentColors: [
    { name: 'Negro Ónix', hex: '#1E222D', textColor: '#FFF' },
    { name: 'Blanco Seda', hex: '#F8FAFC', textColor: '#000' },
    { name: 'Gris Titanio', hex: '#64748B', textColor: '#FFF' },
    { name: 'Dorado Silk', hex: '#EAB308', textColor: '#000' },
    { name: 'Rojo Fuego', hex: '#EF4444', textColor: '#FFF' },
    { name: 'Azul Neón', hex: '#06B6D4', textColor: '#000' },
    { name: 'Verde Esmeralda', hex: '#10B981', textColor: '#FFF' }
  ],

  // Materials configuration
  materials: {
    'pla': {
      name: 'PLA Estándar',
      desc: 'Figuras, prototipos y decoración rápida',
      multiplier: 1.0,
      badge: 'PLA Ecológico'
    },
    'resina': {
      name: 'Resina 4K Ultra Detalle',
      desc: 'Miniaturas, joyería y acabados microscópicos',
      multiplier: 1.6,
      badge: 'Resina 4K'
    },
    'petg': {
      name: 'PETG Industrial',
      desc: 'Piezas mecánicas, repuestos y resistencia UV/calor',
      multiplier: 1.35,
      badge: 'PETG Robusto'
    }
  },

  // Sample 3D Models & Products Catalog
  products: [
    {
      id: 'print-1',
      slug: 'soporte-celular-auto-moto',
      title: 'Soporte Universal de Celular para Auto & Moto (PETG)',
      category: 'soportes',
      material: 'petg',
      baseDimensions: { x: 8.5, y: 7.0, z: 9.5 }, // cm
      basePriceUsd: 12.0,
      estPrintHours: 4.5,
      weightGrams: 68,
      image: '/images/services/soporte_celular_3d.jpg',
      modelGlb: '/models/soporte_celular.glb',
      desc: 'Soporte ergonómico reforzado para auto y moto en PETG técnico. Resiste altas temperaturas solares (hasta 85°C) y vibraciones continuas en carretera o manillar con fijación precisa y paso de cable de carga integrado.',
      tags: ['Resistente 85°C', 'Antivibración Moto', 'PETG Reforzado']
    },
    {
      id: 'print-2',
      slug: 'llavero-personalizado-pedigochos',
      title: 'Llavero Personalizado PediGochos / Emprendedores 3D',
      category: 'personalizados',
      material: 'pla',
      baseDimensions: { x: 6.2, y: 2.5, z: 0.8 },
      basePriceUsd: 3.5,
      estPrintHours: 0.8,
      weightGrams: 18,
      image: '/images/services/llavero_3d_pedigochos.jpg',
      modelGlb: '/models/llavero_pedigochos.glb',
      desc: 'Llavero tridimensional de alta resolución en relieve bicapa (doble color). Personalizable con tu logo corporativo, marca o nombre. Incluye aro metálico de acero inoxidable reforzado. Descuento especial por volumen para negocios.',
      tags: ['Doble Color', 'Relieve 3D', 'Aro Metálico']
    },
    {
      id: 'print-3',
      slug: 'soporte-escritorio-cable-3d',
      title: 'Soporte Ergonómico de Mesa con Ranura Pasacables (PLA+ Pro)',
      category: 'soportes',
      material: 'pla',
      baseDimensions: { x: 11.0, y: 8.5, z: 12.0 },
      basePriceUsd: 8.5,
      estPrintHours: 5.2,
      weightGrams: 85,
      image: '/images/services/soporte_escritorio_3d.jpg',
      modelGlb: '/models/soporte_escritorio.glb',
      desc: 'Base de escritorio a 60° con canal oculto para cable de carga Lightning/Type-C y topes antideslizantes. Ideal para videollamadas, tablets o smartphones en oficina sin forzar los cables.',
      tags: ['Canal Oculto', 'Inclinación 60°', 'Antideslizante']
    },
    {
      id: 'print-4',
      slug: 'embudo-automotriz-antiderrames',
      title: 'Embudo Automotriz Antiderrames con Rosca Universal (PETG)',
      category: 'repuestos',
      material: 'petg',
      baseDimensions: { x: 9.5, y: 9.5, z: 14.0 },
      basePriceUsd: 9.0,
      estPrintHours: 6.0,
      weightGrams: 110,
      image: '/images/services/embudo_automotriz_3d.jpg',
      modelGlb: '/models/embudo_automotriz.glb',
      desc: 'Embudo técnico resistente a aceites de motor, gasolina, refrigerante y líquido de frenos. Con boquilla acodada antirreflujo y rosca compatible con bidones estándar para cambio limpio de fluidos.',
      tags: ['Resistente Químicos', 'PETG Alto Impacto', 'Antirreflujo']
    },
    {
      id: 'print-5',
      slug: 'clip-dispensador-tapa-rosca',
      title: 'Clip Dispensador con Tapa a Rosca Hermética para Bolsas (PLA)',
      category: 'hogar',
      material: 'pla',
      baseDimensions: { x: 12.5, y: 4.8, z: 3.2 },
      basePriceUsd: 4.0,
      estPrintHours: 2.1,
      weightGrams: 35,
      image: '/images/services/clip_dispensador_3d.jpg',
      modelGlb: '/models/clip_dispensador.glb',
      desc: 'Boquilla dosificadora con clip hermético que sella empaques de café, cereales, granos o azúcar. Permite verter cómodamente el contenido y cerrarlo con su tapa roscada sin derrames.',
      tags: ['Cierre Hermético', 'Dosificador', 'Uso Diario']
    },
    {
      id: 'print-6',
      slug: 'caja-magnetica-oculta-neodimio',
      title: 'Caja Protectora Oculta con Imán de Neodimio (PETG Industrial)',
      category: 'seguridad',
      material: 'petg',
      baseDimensions: { x: 8.0, y: 5.5, z: 3.0 },
      basePriceUsd: 7.5,
      estPrintHours: 3.8,
      weightGrams: 55,
      image: '/images/services/caja_magnetica_3d.jpg',
      modelGlb: '/models/caja_magnetica.glb',
      desc: 'Cápsula resistente al agua con junta tórica y dos potentes imanes de neodimio N52. Diseñada para ocultar llaves de emergencia, dinero o localizadores GPS/AirTag bajo el chasis o vigas metálicas.',
      tags: ['Imán Neodimio N52', 'Impermeable', 'Chasis Auto/Moto']
    }
  ],

  // Current configurator state in detail view
  configState: {
    scale: 100, // percentage (50% - 200%)
    colorHex: '#1E222D',
    colorName: 'Negro Ónix',
    materialKey: 'pla',
    quantity: 1,
    isRealPhotoView: false,
    autoRotate: true
  },

  init() {
    this.setupWebSocket();
    this.loadCatalog();
    this.checkHashRoute();
    window.addEventListener('hashchange', () => this.checkHashRoute());
  },

  async loadCatalog() {
    try {
      const res = await fetch('/api/print3d-services/catalog');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          this.products = data;
          const grid = document.getElementById('print3d-catalog-grid');
          if (grid) this.renderCatalog();
        }
      }
    } catch(e) {
      console.warn('Could not load 3d catalog from backend:', e);
    }
  },

  checkHashRoute() {
    const hash = window.location.hash || '';
    if (hash === '#servicios/impresion-3d' || hash === '#/servicios/impresion-3d') {
      this.open();
    } else if (hash.startsWith('#servicios/impresion-3d/') || hash.startsWith('#/servicios/impresion-3d/')) {
      const parts = hash.split('/');
      const idOrSlug = parts[parts.length - 1];
      const prod = this.products.find(p => p.id === idOrSlug || p.slug === idOrSlug);
      if (prod) {
        this.open();
        this.openDetail(prod.id);
      } else {
        this.open();
      }
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
          if (data.type === 'PRINT3D_QUOTE_MESSAGE' && this.activeQuote && data.quoteId === this.activeQuote.id) {
            this.appendChatMessage(data.message);
          } else if (data.type === 'PRINT3D_QUOTE_UPDATE' && this.activeQuote && data.quote.id === this.activeQuote.id) {
            this.activeQuote = data.quote;
            this.updateFichaTecnica(data.quote);
          } else if (data.type === 'PRINT3D_CATALOG_UPDATE' && Array.isArray(data.items)) {
            this.products = data.items;
            const grid = document.getElementById('print3d-catalog-grid');
            if (grid) this.renderCatalog();
          }
        } catch (e) {
          console.warn('WS print3d message parse error:', e);
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
    if (typeof MarketplaceApp !== 'undefined' && MarketplaceApp.updateFloatingAndHeaderSos) {
      MarketplaceApp.updateFloatingAndHeaderSos(true);
    }
    let modal = document.getElementById('print3d-catalog-modal');
    if (!modal) {
      this.renderCatalogModalMarkup();
      modal = document.getElementById('print3d-catalog-modal');
    }
    modal.classList.remove('hidden');
    window.history.pushState({ modal: 'print3d-catalog' }, '', '#servicios/impresion-3d');
    this.renderCatalog();
  },

  close() {
    const modal = document.getElementById('print3d-catalog-modal');
    if (modal) modal.classList.add('hidden');
    if (window.location.hash.includes('impresion-3d')) {
      window.history.pushState({}, '', window.location.pathname);
    }
    if (typeof MarketplaceApp !== 'undefined' && MarketplaceApp.updateFloatingAndHeaderSos && !MarketplaceApp.selectedEstablishment) {
      MarketplaceApp.updateFloatingAndHeaderSos(false);
    }
  },

  renderCatalogModalMarkup() {
    const div = document.createElement('div');
    div.id = 'print3d-catalog-modal';
    div.className = 'print3d-modal';
    div.innerHTML = `
      <!-- Header -->
      <header class="print3d-header">
        <div class="print3d-header-left">
          <button type="button" class="print3d-back-btn" onclick="Print3DServiceApp.close()" title="Volver a Servicios">
            ←
          </button>
          <div class="print3d-title-wrap">
            <h2>🖨️ PediGochos 3D Lab</h2>
            <p>Impresión 3D, Prototipado Rápido y Piezas a Medida</p>
          </div>
        </div>
      </header>

      <!-- Main Body -->
      <main class="print3d-body">
        <!-- Hero Card -->
        <section class="print3d-hero-card">
          <div class="print3d-hero-badge">⚡ Laboratorio de Manufactura Digital</div>
          <h1 class="print3d-hero-title">Materializa tus Ideas en 3D con Alta Precisión</h1>
          <p class="print3d-hero-desc">
            Explora nuestro catálogo interactivo con visor 3D en 360°, selector en vivo de filamentos y materiales industriales (PLA, PETG, Resina 4K). ¿Tienes tu archivo .STL? Te lo fabricamos en tiempo récord en San Antonio del Táchira.
          </p>
          <div class="print3d-hero-stats">
            <div class="print3d-stat-item">
              <span>🎯</span>
              <span>Visor Interactivo 360°</span>
            </div>
            <div class="print3d-stat-item">
              <span>💎</span>
              <span>Resina 4K & PETG de Alta Carga</span>
            </div>
            <div class="print3d-stat-item">
              <span>📦</span>
              <span>Descuentos por Volumen (hasta 20% OFF)</span>
            </div>
            <div class="print3d-stat-item">
              <span>💬</span>
              <span>Chat y WhatsApp Inmediato</span>
            </div>
          </div>
        </section>

        <!-- Predictive Search Bar -->
        <div class="print3d-search-bar">
          <span style="font-size: 16px;">🔍</span>
          <input type="text" id="print3d-search-input" placeholder="Buscar diseños 3D, soportes, llaveros, repuestos..." oninput="Print3DServiceApp.handleSearch(event)">
        </div>

        <!-- Filter Chips -->
        <div class="print3d-filter-scroll">
          <button type="button" class="print3d-filter-btn active" onclick="Print3DServiceApp.filterCategory('all', this)">
            ✨ Todos los Diseños (${this.products.length})
          </button>
          <button type="button" class="print3d-filter-btn" onclick="Print3DServiceApp.filterCategory('soportes', this)">
            📱 Soportes & Dispositivos
          </button>
          <button type="button" class="print3d-filter-btn" onclick="Print3DServiceApp.filterCategory('personalizados', this)">
            🔑 Llaveros & Merch
          </button>
          <button type="button" class="print3d-filter-btn" onclick="Print3DServiceApp.filterCategory('repuestos', this)">
            🔧 Repuestos & Automotriz
          </button>
          <button type="button" class="print3d-filter-btn" onclick="Print3DServiceApp.filterCategory('hogar', this)">
            🏠 Hogar & Cocina
          </button>
          <button type="button" class="print3d-filter-btn" onclick="Print3DServiceApp.filterCategory('seguridad', this)">
            🛡️ Seguridad & Exterior
          </button>
        </div>

        <!-- Products Grid -->
        <div class="print3d-catalog-grid" id="print3d-catalog-grid">
          <!-- Populated dynamically -->
        </div>

        <!-- Custom 3D Upload Card -->
        <div class="print3d-custom-upload-card" onclick="Print3DServiceApp.openCustomUploadModal()">
          <span style="font-size: 38px; display: block; margin-bottom: 8px;">📂</span>
          <h3 style="margin: 0 0 6px 0; font-size: 17px; font-weight: 900; color: #FFF;">¿Tienes tu propio archivo 3D (.STL / .OBJ / .STEP)?</h3>
          <p style="margin: 0 0 14px 0; font-size: 12.5px; color: #CBD5E1; max-width: 500px; margin-inline: auto;">
            Sube tu modelo personalizado para cotización inmediata según gramos de filamento, horas de máquina y material sugerido.
          </p>
          <button type="button" class="btn-open-3d-detail" style="margin: 0 auto;">
            📤 Cotizar Archivo Propio ➔
          </button>
        </div>
      </main>
    `;
    document.body.appendChild(div);
  },

  filterCategory(cat, btnEl) {
    this.currentCategoryFilter = cat;
    document.querySelectorAll('.print3d-filter-btn').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    this.renderCatalog();
  },

  handleSearch(e) {
    const q = (e.target.value || '').toLowerCase().trim();
    this.renderCatalog(q);
  },

  renderCatalog(query = '') {
    const grid = document.getElementById('print3d-catalog-grid');
    if (!grid) return;

    let items = this.products;
    if (this.currentCategoryFilter !== 'all') {
      items = items.filter(p => p.category === this.currentCategoryFilter);
    }
    if (query) {
      items = items.filter(p => p.title.toLowerCase().includes(query) || p.desc.toLowerCase().includes(query));
    }

    grid.innerHTML = items.map(p => {
      const mat = this.materials[p.material] || { badge: 'PLA' };
      return `
        <div class="print3d-card" onclick="Print3DServiceApp.openDetail('${p.id}')">
          <div class="print3d-card-preview" style="background-image: url('${p.image}');">
            <span class="print3d-card-badge-mat">${mat.badge}</span>
            <span class="print3d-badge-3d">🔄 Ver en 3D</span>
          </div>
          <div class="print3d-card-content">
            <h4 class="print3d-card-title">${p.title}</h4>
            <p class="print3d-card-desc">${p.desc}</p>
            <div class="print3d-card-specs">
              <span class="print3d-pill-spec">⏱️ ~${p.estPrintHours}h prod.</span>
              <span class="print3d-pill-spec">⚖️ ~${p.weightGrams}g</span>
              <span class="print3d-pill-spec">📏 ${p.baseDimensions.x} x ${p.baseDimensions.y} cm</span>
            </div>
            <div class="print3d-card-footer">
              <div class="print3d-card-price">
                <span class="print3d-price-label">Modalidad</span>
                <span class="print3d-price-val" style="color: #F59E0B; font-size: 12.5px; font-weight: 800;">Bajo Cotización</span>
              </div>
              <button type="button" class="btn-open-3d-detail" onclick="event.stopPropagation(); Print3DServiceApp.openDetail('${p.id}')">
                Cotizar en 3D ➔
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  // =========================================================================
  // Product Detail View with 360° Interactive 3D Viewer (/servicios/impresion-3d/[id])
  // =========================================================================
  openDetail(productId) {
    const prod = this.products.find(p => p.id === productId);
    if (!prod) return;
    this.selectedProduct = prod;

    // Reset configurator
    this.configState.scale = 100;
    this.configState.colorHex = this.filamentColors[0].hex;
    this.configState.colorName = this.filamentColors[0].name;
    this.configState.materialKey = prod.material || 'pla';
    this.configState.quantity = 1;
    this.configState.isRealPhotoView = false;
    this.configState.autoRotate = true;

    let modal = document.getElementById('print3d-detail-modal');
    if (!modal) {
      this.renderDetailModalMarkup();
      modal = document.getElementById('print3d-detail-modal');
    }

    modal.classList.remove('hidden');
    window.history.pushState({ modal: 'print3d-detail', id: prod.id }, '', `#servicios/impresion-3d/${prod.id}`);
    this.renderDetailView();
  },

  closeDetail() {
    const modal = document.getElementById('print3d-detail-modal');
    if (modal) modal.classList.add('hidden');
    window.history.pushState({ modal: 'print3d-catalog' }, '', '#servicios/impresion-3d');
  },

  renderDetailModalMarkup() {
    const div = document.createElement('div');
    div.id = 'print3d-detail-modal';
    div.className = 'print3d-detail-modal';
    div.innerHTML = `
      <header class="print3d-detail-header">
        <div class="print3d-detail-header-left">
          <button type="button" class="print3d-back-btn" onclick="Print3DServiceApp.closeDetail()" title="Volver al Catálogo">←</button>
          <div class="print3d-detail-title-block">
            <h3 id="print3d-detail-nav-title" class="print3d-detail-header-title">
              Visor 3D Interactivo
            </h3>
            <span class="print3d-detail-header-sub">PediGochos 3D Lab • 360°</span>
          </div>
        </div>
        <button type="button" class="print3d-back-btn" onclick="Print3DServiceApp.closeDetail()" title="Cerrar">✕</button>
      </header>

      <main class="print3d-detail-grid" id="print3d-detail-content">
        <!-- Rendered dynamically -->
      </main>
    `;
    document.body.appendChild(div);
  },

  renderDetailView() {
    const container = document.getElementById('print3d-detail-content');
    const p = this.selectedProduct;
    if (!container || !p) return;

    const navTitle = document.getElementById('print3d-detail-nav-title');
    if (navTitle) navTitle.textContent = p.title;

    // Calculate dimensions based on scale
    const scaleRatio = this.configState.scale / 100;
    const curDimX = (p.baseDimensions.x * scaleRatio).toFixed(1);
    const curDimY = (p.baseDimensions.y * scaleRatio).toFixed(1);
    const curDimZ = (p.baseDimensions.z * scaleRatio).toFixed(1);

    // Dynamic price / quote WhatsApp prefilled message
    const waText = encodeURIComponent(
      `Hola PediGochos 3D Lab! 👋 Solicito cotización para fabricar el diseño: *${p.title}*\n` +
      `• Escala: ${this.configState.scale}%\n` +
      `• Dimensiones: ${curDimX} x ${curDimY} x ${curDimZ} cm\n` +
      `• Material: ${this.materials[this.configState.materialKey].name}\n` +
      `• Color filamento: ${this.configState.colorName}\n` +
      `• Cantidad: ${this.configState.quantity} unidad(es)\n` +
      `• Modalidad: Solicitud de Cotización (Servicio por encargo - no inmediato)\n\n` +
      `¿Podrían confirmarme el presupuesto estimado según gramos/tiempo de máquina y tiempo de entrega? ¡Gracias!`
    );

    container.innerHTML = `
      <!-- Left Column: 360° Interactive 3D Viewer -->
      <section class="print3d-viewer-column">
        <div class="print3d-viewer-box" id="print3d-viewer-container">
          <div class="print3d-360-badge">
            <span style="font-size: 14px;">🔄</span> <span>360° ORBIT</span>
          </div>

          <!-- Top Tools (Reset camera, auto-rotate toggle) -->
          <div class="print3d-viewer-top-actions">
            <button type="button" class="btn-viewer-tool" onclick="Print3DServiceApp.resetCamera()" title="Reiniciar Cámara">
              🔄
            </button>
            <button type="button" class="btn-viewer-tool ${this.configState.autoRotate ? 'active' : ''}" id="btn-toggle-autorotate" onclick="Print3DServiceApp.toggleAutoRotate()" title="Giro Automático">
              🔁
            </button>
          </div>

          <!-- 3D Viewer Canvas / model-viewer or Real Photo Toggle -->
          ${this.configState.isRealPhotoView ? `
            <div style="width: 100%; height: 100%; background: url('${p.image}') center/cover no-repeat;"></div>
          ` : `
            <model-viewer
              id="main-3d-model-viewer"
              src="${p.modelGlb}"
              poster="${p.image}"
              alt="${p.title}"
              auto-rotate
              camera-controls
              ar
              ar-modes="webxr scene-viewer quick-look"
              ar-scale="auto"
              shadow-intensity="1.5"
              exposure="1.1"
              environment-image="neutral"
              style="width: 100%; height: 100%;"
            >
              <button slot="ar-button" class="print3d-ar-btn" title="Ver en Realidad Aumentada">
                📱 Ver en mi Espacio (AR)
              </button>
              <!-- Interactive Fallback Canvas if WebGL or Model Viewer is loading -->
              <canvas id="print3d-fallback-canvas" class="print3d-canvas-fallback" slot="poster"></canvas>
            </model-viewer>
          `}

          <!-- Bottom Toggle: 3D Model vs Real Photo -->
          <div class="print3d-view-toggle-bar">
            <button type="button" class="print3d-toggle-btn ${!this.configState.isRealPhotoView ? 'active' : ''}" onclick="Print3DServiceApp.togglePhotoView(false)">
              🔄 Modelo 3D
            </button>
            <button type="button" class="print3d-toggle-btn ${this.configState.isRealPhotoView ? 'active' : ''}" onclick="Print3DServiceApp.togglePhotoView(true)">
              📷 Fotos Reales
            </button>
          </div>
        </div>

        <!-- Filament Color Selector Swatches -->
        <div class="print3d-filament-box">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="color: #FFF; font-size: 13px;">Color de Filamento en Vivo:</strong>
            <span style="font-size: 12px; font-weight: 800; color: #6366F1;" id="selected-color-label">
              ${this.configState.colorName}
            </span>
          </div>
          <div class="print3d-filament-swatches">
            ${this.filamentColors.map(c => `
              <div
                class="print3d-color-swatch ${this.configState.colorHex === c.hex ? 'selected' : ''}"
                style="background-color: ${c.hex};"
                title="${c.name}"
                onclick="Print3DServiceApp.selectColor('${c.hex}', '${c.name}')"
              ></div>
            `).join('')}
          </div>
        </div>
      </section>

      <!-- Right Column: Configurator & Technical Details -->
      <section class="print3d-config-column">
        <div>
          <h2 class="print3d-detail-title">${p.title}</h2>
          <p style="margin: 0 0 12px 0; font-size: 13px; color: #94A3B8; line-height: 1.45;">${p.desc}</p>
          <div class="print3d-dimensions-badge">
            <span>📐 Medidas:</span>
            <strong style="color: #FFF;">X: ${curDimX} cm • Y: ${curDimY} cm • Z: ${curDimZ} cm</strong>
          </div>
        </div>

        <!-- Scale Selector -->
        <div class="print3d-scale-box">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="color: #FFF; font-size: 13px;">Escala de Fabricación:</strong>
            <span style="font-size: 13px; font-weight: 900; color: #38BDF8;" id="scale-value-label">${this.configState.scale}%</span>
          </div>
          <div class="print3d-scale-buttons">
            <button type="button" class="print3d-btn-scale ${this.configState.scale === 75 ? 'active' : ''}" onclick="Print3DServiceApp.setScale(75)">75%</button>
            <button type="button" class="print3d-btn-scale ${this.configState.scale === 100 ? 'active' : ''}" onclick="Print3DServiceApp.setScale(100)">100%</button>
            <button type="button" class="print3d-btn-scale ${this.configState.scale === 120 ? 'active' : ''}" onclick="Print3DServiceApp.setScale(120)">120%</button>
            <button type="button" class="print3d-btn-scale ${this.configState.scale === 150 ? 'active' : ''}" onclick="Print3DServiceApp.setScale(150)">150%</button>
          </div>
          <div class="print3d-scale-slider-wrap">
            <span style="font-size: 11px; color: #64748B;">50%</span>
            <input type="range" min="50" max="200" value="${this.configState.scale}" class="print3d-scale-slider" oninput="Print3DServiceApp.handleScaleSlider(event)">
            <span style="font-size: 11px; color: #64748B;">200%</span>
          </div>
        </div>

        <!-- Material Selector -->
        <div>
          <strong style="color: #FFF; font-size: 13px;">Material de Impresión:</strong>
          <div class="print3d-materials-grid">
            ${Object.entries(this.materials).map(([key, mat]) => `
              <div class="print3d-mat-card ${this.configState.materialKey === key ? 'selected' : ''}" onclick="Print3DServiceApp.selectMaterial('${key}')">
                <div style="min-width: 0; flex: 1;">
                  <strong class="print3d-mat-name">${mat.name}</strong>
                  <span class="print3d-mat-sub">${mat.desc}</span>
                </div>
                <span class="print3d-card-badge-mat" style="position: static; margin-left: 6px; white-space: nowrap; align-self: center;">${mat.badge}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Quantity Selector -->
        <div class="print3d-qty-box">
          <div class="print3d-qty-row">
            <div>
              <strong style="color: #FFF; font-size: 13px; display: block;">Cantidad a Fabricar:</strong>
              <span style="font-size: 11px; color: #94A3B8;">Unidades deseadas para cotizar</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div class="print3d-qty-stepper">
                <button type="button" class="print3d-stepper-btn" onclick="Print3DServiceApp.changeQty(-1)">-</button>
                <span class="print3d-qty-value">${this.configState.quantity}</span>
                <button type="button" class="print3d-stepper-btn" onclick="Print3DServiceApp.changeQty(1)">+</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Cotización Notice Card -->
        <div class="print3d-pricing-card" style="background: rgba(245, 158, 11, 0.08); border: 1.5px solid rgba(245, 158, 11, 0.35); border-radius: 14px; padding: 12px 14px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <span style="font-size: 20px;">📋</span>
            <div>
              <strong style="color: #FCD34D; font-size: 13px; display: block;">Fabricación Bajo Cotización</strong>
              <span style="font-size: 10.5px; color: #94A3B8;">No es un producto inmediato de entrega en minutos</span>
            </div>
          </div>
          <p style="font-size: 11px; color: #CBD5E1; margin: 0 0 8px 0; line-height: 1.45;">
            El costo de impresión 3D depende del peso exacto en gramos de filamento, horas de máquina y resolución seleccionada. Te contactaremos con el presupuesto antes de iniciar la fabricación.
          </p>
          <div style="display: flex; flex-wrap: wrap; gap: 6px; font-size: 10.5px;">
            <span style="background: rgba(245, 158, 11, 0.2); color: #FDE68A; padding: 2px 7px; border-radius: 6px; font-weight: 700;">⚖️ Gramaje por cotizar</span>
            <span style="background: rgba(99, 102, 241, 0.2); color: #C7D2FE; padding: 2px 7px; border-radius: 6px; font-weight: 700;">⏱️ Horas de máquina a medida</span>
            <span style="background: rgba(16, 185, 129, 0.2); color: #6EE7B7; padding: 2px 7px; border-radius: 6px; font-weight: 700;">📞 Contacto previo</span>
          </div>
        </div>

        <!-- Double Contact CTAs -->
        <div class="print3d-cta-row">
          <button type="button" class="btn-print3d-chat" onclick="Print3DServiceApp.openInAppChat()">
            <span>💬</span> Cotizar en Chat Directo
          </button>
          <a href="https://wa.me/573227949751?text=${waText}" target="_blank" rel="noopener noreferrer" class="btn-print3d-wa">
            <span>🟢</span> Cotizar por WhatsApp
          </a>
        </div>

        <!-- Cross Selling Similar Designs -->
        <section class="print3d-similar-section">
          <h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 800; color: #FFF;">
            ✨ Diseños Similares & Proyectos Relacionados
          </h4>
          <div class="print3d-similar-scroll">
            ${this.products.filter(item => item.id !== p.id).slice(0, 4).map(item => `
              <div class="print3d-similar-card" onclick="Print3DServiceApp.openDetail('${item.id}')">
                <div class="print3d-similar-thumb" style="background-image: url('${item.image}');"></div>
                <div style="padding: 8px 10px;">
                  <strong style="color: #FFF; font-size: 11.5px; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.title}</strong>
                  <span style="color: #F59E0B; font-size: 11px; font-weight: 800;">🎨 Bajo Cotización</span>
                </div>
              </div>
            `).join('')}
          </div>
        </section>
      </section>
    `;

    // Apply color to 3D model viewer
    this.applyModelColor(this.configState.colorHex);
  },

  selectColor(hex, name) {
    this.configState.colorHex = hex;
    this.configState.colorName = name;
    document.querySelectorAll('.print3d-color-swatch').forEach(s => s.classList.remove('selected'));
    const label = document.getElementById('selected-color-label');
    if (label) label.textContent = name;
    this.applyModelColor(hex);
  },

  applyModelColor(hex) {
    const viewer = document.getElementById('main-3d-model-viewer');
    if (!viewer) return;

    const applyToMaterials = () => {
      if (!viewer.model || !viewer.model.materials) return;
      try {
        const c = parseInt(hex.replace('#', ''), 16);
        const r = ((c >> 16) & 255) / 255;
        const g = ((c >> 8) & 255) / 255;
        const b = (c & 255) / 255;
        const rgba = [r, g, b, 1.0];

        const isPetg = this.configState.materialKey === 'petg';
        const roughness = isPetg ? 0.25 : 0.55;
        const metallic = isPetg ? 0.35 : 0.08;

        viewer.model.materials.forEach(mat => {
          if (mat.pbrMetallicRoughness) {
            mat.pbrMetallicRoughness.setBaseColorFactor(rgba);
            mat.pbrMetallicRoughness.setRoughnessFactor(roughness);
            mat.pbrMetallicRoughness.setMetallicFactor(metallic);
          }
        });
      } catch (e) {
        console.warn('Could not set model color factor:', e);
      }
    };

    if (viewer.model) {
      applyToMaterials();
    } else {
      viewer.addEventListener('load', () => applyToMaterials(), { once: true });
    }
  },

  setScale(val) {
    this.configState.scale = parseInt(val, 10);
    this.renderDetailView();
  },

  handleScaleSlider(e) {
    this.configState.scale = parseInt(e.target.value, 10);
    this.renderDetailView();
  },

  selectMaterial(matKey) {
    this.configState.materialKey = matKey;
    this.renderDetailView();
  },

  changeQty(delta) {
    const next = this.configState.quantity + delta;
    if (next >= 1 && next <= 100) {
      this.configState.quantity = next;
      this.renderDetailView();
    }
  },

  togglePhotoView(isPhoto) {
    this.configState.isRealPhotoView = isPhoto;
    this.renderDetailView();
  },

  resetCamera() {
    const viewer = document.getElementById('main-3d-model-viewer');
    if (viewer) {
      viewer.cameraOrbit = '0deg 75deg 105%';
      viewer.fieldOfView = 'auto';
      viewer.jumpCameraToGoal();
    }
  },

  toggleAutoRotate() {
    this.configState.autoRotate = !this.configState.autoRotate;
    const viewer = document.getElementById('main-3d-model-viewer');
    const btn = document.getElementById('btn-toggle-autorotate');
    if (viewer) {
      viewer.autoRotate = this.configState.autoRotate;
    }
    if (btn) {
      btn.classList.toggle('active', this.configState.autoRotate);
    }
  },

  calculatePricing() {
    const p = this.selectedProduct;
    if (!p) return { unitPriceUsd: 0, totalUsd: 0, discountPercent: 0, discountAmountUsd: 0 };

    const scaleFactor = Math.pow(this.configState.scale / 100, 2.5); // volume scaling curve
    const matMultiplier = this.materials[this.configState.materialKey]?.multiplier || 1.0;

    let unitPrice = Math.max(2.5, p.basePriceUsd * scaleFactor * matMultiplier);

    // Quantity discounts
    const qty = this.configState.quantity;
    let discountPercent = 0;
    if (qty >= 10) {
      discountPercent = 20;
    } else if (qty >= 5) {
      discountPercent = 10;
    }

    const subtotal = unitPrice * qty;
    const discountAmount = subtotal * (discountPercent / 100);
    const total = subtotal - discountAmount;

    return {
      unitPriceUsd: unitPrice,
      totalUsd: total,
      discountPercent,
      discountAmountUsd: discountAmount
    };
  },

  // =========================================================================
  // In-App Chat Modal for 3D Lab
  // =========================================================================
  async openInAppChat() {
    const p = this.selectedProduct;
    if (!p) return;

    const pricing = this.calculatePricing();
    const scaleRatio = this.configState.scale / 100;
    const curDim = {
      x: (p.baseDimensions.x * scaleRatio).toFixed(1),
      y: (p.baseDimensions.y * scaleRatio).toFixed(1),
      z: (p.baseDimensions.z * scaleRatio).toFixed(1)
    };

    const customerName = localStorage.getItem('customer_name') || 'Cliente PediGochos';
    const customerPhone = localStorage.getItem('customer_phone') || '';

    const payload = {
      customerName,
      customerPhone,
      clientName: customerName,
      clientPhone: customerPhone,
      productId: p.id,
      modelId: p.id,
      productTitle: p.title,
      modelName: p.title,
      scale: `${this.configState.scale}%`,
      dimensions: curDim,
      material: this.configState.materialKey,
      materialName: this.materials[this.configState.materialKey]?.name || 'PLA',
      filamentColor: this.configState.colorName,
      colorName: this.configState.colorName,
      color: this.configState.colorHex,
      quantity: this.configState.quantity,
      estimatedPriceUsd: 'Bajo Cotización'
    };

    try {
      const res = await fetch('/api/print3d-services/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.quote) {
        this.activeQuote = data.quote;
        this.openChatModal(data.quote);
      }
    } catch (e) {
      console.error('Error starting 3D chat:', e);
      alert('Error iniciando chat con el laboratorio 3D.');
    }
  },

  openChatModal(quote) {
    this.activeQuote = quote;
    let modal = document.getElementById('print3d-chat-modal');
    if (!modal) {
      this.renderChatModalMarkup();
      modal = document.getElementById('print3d-chat-modal');
    }
    this.updateFichaTecnica(quote);
    this.loadChatMessages(quote.id);
    modal.classList.remove('hidden');
  },

  closeChatModal() {
    const modal = document.getElementById('print3d-chat-modal');
    if (modal) modal.classList.add('hidden');
  },

  renderChatModalMarkup() {
    const div = document.createElement('div');
    div.id = 'print3d-chat-modal';
    div.className = 'print3d-chat-modal';
    div.innerHTML = `
      <header class="print3d-chat-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <button type="button" class="print3d-back-btn" onclick="Print3DServiceApp.closeChatModal()">←</button>
          <div>
            <h3 style="margin: 0; font-size: 15px; font-weight: 800; color: #FFF; display: flex; align-items: center; gap: 6px;">
              <span>💬</span> Chat con Fabricante 3D Lab
            </h3>
            <span style="font-size: 11px; color: #10B981; font-weight: 700;">🟢 Impresoras Activas • San Antonio del Táchira</span>
          </div>
        </div>
        <button type="button" onclick="Print3DServiceApp.closeChatModal()" style="background: none; border: none; color: #94A3B8; font-size: 18px; cursor: pointer;">✕</button>
      </header>

      <main class="print3d-chat-body">
        <!-- Sticky Ficha Técnica 3D -->
        <div class="print3d-quote-sheet" id="print3d-ficha-tecnica">
          <!-- Rendered dynamically -->
        </div>

        <!-- Chat Messages -->
        <div class="print3d-messages-area" id="print3d-chat-messages">
          <!-- Messages -->
        </div>

        <!-- Input Bar -->
        <form class="print3d-chat-input-bar" onsubmit="event.preventDefault(); Print3DServiceApp.sendMessage();">
          <input type="text" id="print3d-chat-input" placeholder="Pregunta sobre relleno, resistencia, tolerancias o entrega...">
          <button type="submit" class="btn-send-print3d-msg" title="Enviar">➤</button>
        </form>
      </main>
    `;
    document.body.appendChild(div);
  },

  updateFichaTecnica(quote) {
    const el = document.getElementById('print3d-ficha-tecnica');
    if (!el) return;

    el.innerHTML = `
      <div class="print3d-sheet-top">
        <div>
          <strong style="color: #FFF; font-size: 14px;">Orden 3D Lab #${quote.id.slice(-6)}: ${quote.productTitle}</strong>
          <span style="font-size: 11px; color: #94A3B8; display: block;">Cliente: ${quote.customerName}</span>
        </div>
        <span class="paint-status-pill paint-status-solicitado">${quote.status}</span>
      </div>

      <div class="print3d-sheet-specs">
        <div>
          <span style="color: #94A3B8; font-size: 10px; display: block;">ESCALA & MEDIDAS</span>
          <strong style="color: #FFF;">${quote.scale}% (${quote.dimensions?.x || 0}x${quote.dimensions?.y || 0} cm)</strong>
        </div>
        <div>
          <span style="color: #94A3B8; font-size: 10px; display: block;">MATERIAL & COLOR</span>
          <strong style="color: #818CF8;">${(quote.material || 'PLA').toUpperCase()} • ${quote.filamentColor || 'Negro'}</strong>
        </div>
        <div>
          <span style="color: #94A3B8; font-size: 10px; display: block;">CANTIDAD</span>
          <strong style="color: #FFF;">${quote.quantity || 1} unidad(es)</strong>
        </div>
        <div>
          <span style="color: #94A3B8; font-size: 10px; display: block;">PRECIO / COTIZACIÓN</span>
          <strong style="color: #FCD34D; font-size: 13px;">${quote.finalPrice ? `$${quote.finalPrice} USD` : (quote.agreedPriceUsd ? `$${quote.agreedPriceUsd} USD` : 'Bajo Cotización')}</strong>
        </div>
      </div>
    `;
  },

  async loadChatMessages(quoteId) {
    const area = document.getElementById('print3d-chat-messages');
    if (!area) return;

    try {
      const res = await fetch(`/api/print3d-services/quotes/${quoteId}`);
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
    const area = document.getElementById('print3d-chat-messages');
    if (!area) return;

    const isIncoming = msg.sender === 'lab' || msg.sender === 'admin';
    const div = document.createElement('div');
    div.className = `print3d-msg-bubble ${isIncoming ? 'print3d-msg-incoming' : 'print3d-msg-outgoing'}`;
    div.innerHTML = `
      <div>${msg.text}</div>
      <div class="paint-msg-meta">
        <span>${isIncoming ? '🖨️ Fabricante' : '👤 Tú'}</span> •
        <span>${new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    `;
    area.appendChild(div);
    area.scrollTop = area.scrollHeight;
  },

  async sendMessage() {
    const input = document.getElementById('print3d-chat-input');
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
      const res = await fetch(`/api/print3d-services/quotes/${this.activeQuote.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.message) {
        this.appendChatMessage(data.message);
      }
    } catch (e) {
      console.error('Error sending 3D message:', e);
    }
  },

  // =========================================================================
  // Interactive Custom STL/OBJ Upload Modal with Real-Time 3D Rotating Preview
  // =========================================================================
  uploadedStlData: null,
  stlAnimationId: null,
  stlRotation: { x: 0.3, y: 0.5 },
  stlIsDragging: false,
  stlLastMouse: { x: 0, y: 0 },

  openCustomUploadModal() {
    let modal = document.getElementById('print3d-upload-modal');
    if (!modal) {
      this.renderCustomUploadModalMarkup();
      modal = document.getElementById('print3d-upload-modal');
    }
    modal.classList.remove('hidden');
    
    // Auto-fill client data if available
    const nameInput = document.getElementById('stl-client-name');
    const phoneInput = document.getElementById('stl-client-phone');
    if (nameInput && !nameInput.value) nameInput.value = localStorage.getItem('customer_name') || '';
    if (phoneInput && !phoneInput.value) phoneInput.value = localStorage.getItem('customer_phone') || '';
  },

  closeCustomUploadModal() {
    const modal = document.getElementById('print3d-upload-modal');
    if (modal) modal.classList.add('hidden');
    if (this.stlAnimationId) {
      cancelAnimationFrame(this.stlAnimationId);
      this.stlAnimationId = null;
    }
  },

  renderCustomUploadModalMarkup() {
    const div = document.createElement('div');
    div.id = 'print3d-upload-modal';
    div.className = 'print3d-upload-modal';
    div.innerHTML = `
      <div class="print3d-upload-card-content">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <div>
            <h3 style="margin: 0; font-size: 16px; font-weight: 900; color: #FFF; display: flex; align-items: center; gap: 8px;">
              <span>📂</span> Cotizar Archivo Propio 3D
            </h3>
            <span style="font-size: 11px; color: #94A3B8;">Visor en vivo de archivos .STL / .OBJ</span>
          </div>
          <button type="button" class="print3d-back-btn" onclick="Print3DServiceApp.closeCustomUploadModal()">✕</button>
        </div>

        <!-- Dropzone -->
        <div class="print3d-dropzone" id="stl-dropzone" onclick="document.getElementById('stl-file-input').click()">
          <span style="font-size: 32px; display: block; margin-bottom: 6px;">📥</span>
          <strong style="color: #FFF; font-size: 13px; display: block;">Arrastra tu archivo .STL aquí o haz clic</strong>
          <span style="font-size: 11px; color: #94A3B8;">Formatos compatibles: STL Binario, STL ASCII, OBJ (hasta 50MB)</span>
          <input type="file" id="stl-file-input" accept=".stl,.obj" style="display: none;" onchange="Print3DServiceApp.handleStlFileSelect(event)">
        </div>

        <!-- Real-Time 3D Rotating Canvas for Uploaded Mesh -->
        <div id="stl-preview-container" style="display: none;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 11.5px; font-weight: 800; color: #38BDF8;">🔄 Previsualización 3D Interactiva:</span>
            <span style="font-size: 10px; color: #64748B;">Arrastra con el dedo o ratón para rotar</span>
          </div>
          <canvas id="stl-canvas" class="stl-preview-canvas" width="480" height="240"></canvas>

          <!-- Technical Metrics Extracted from Mesh -->
          <div class="stl-metrics-bar">
            <div class="stl-metric-item">
              <span class="stl-metric-val" id="stl-metric-triangles">0</span>
              <span class="stl-metric-lbl">Polígonos / Triángulos</span>
            </div>
            <div class="stl-metric-item">
              <span class="stl-metric-val" id="stl-metric-dimensions">0 x 0 x 0 cm</span>
              <span class="stl-metric-lbl">Medidas Bounding Box</span>
            </div>
            <div class="stl-metric-item">
              <span class="stl-metric-val" id="stl-metric-weight">~0 g</span>
              <span class="stl-metric-lbl">Peso Estimado (PLA)</span>
            </div>
          </div>
        </div>

        <!-- Client Form Details -->
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div>
            <label style="font-size: 11px; font-weight: 800; color: #94A3B8; display: block; margin-bottom: 4px;">Tu Nombre o Emprendimiento:</label>
            <input type="text" id="stl-client-name" placeholder="Ej. Carlos Pérez" style="width: 100%; box-sizing: border-box; background: #0F172A; border: 1px solid rgba(255,255,255,0.15); color: #FFF; padding: 8px 12px; border-radius: 10px; font-size: 12.5px; outline: none;">
          </div>
          <div>
            <label style="font-size: 11px; font-weight: 800; color: #94A3B8; display: block; margin-bottom: 4px;">Tu WhatsApp (para enviar presupuesto):</label>
            <input type="tel" id="stl-client-phone" placeholder="Ej. +57 322 7949751" style="width: 100%; box-sizing: border-box; background: #0F172A; border: 1px solid rgba(255,255,255,0.15); color: #FFF; padding: 8px 12px; border-radius: 10px; font-size: 12.5px; outline: none;">
          </div>
          <div>
            <label style="font-size: 11px; font-weight: 800; color: #94A3B8; display: block; margin-bottom: 4px;">Material sugerido:</label>
            <select id="stl-material-select" style="width: 100%; box-sizing: border-box; background: #0F172A; border: 1px solid rgba(255,255,255,0.15); color: #FFF; padding: 8px 12px; border-radius: 10px; font-size: 12.5px; outline: none;">
              <option value="pla">PLA Pro (Figuras, Maquetas, Soportes de Hogar)</option>
              <option value="petg">PETG Técnico (Resistente a calor, rayos UV y golpes)</option>
              <option value="abs">ABS / ASA (Piezas de motor, alta temperatura)</option>
              <option value="tpu">TPU Flexible (Goma flexible, amortiguadores)</option>
            </select>
          </div>
          <div>
            <label style="font-size: 11px; font-weight: 800; color: #94A3B8; display: block; margin-bottom: 4px;">Instrucciones / Notas especiales:</label>
            <textarea id="stl-client-notes" placeholder="Ej. Porcentaje de relleno deseado, color preferido o fecha de entrega..." rows="2" style="width: 100%; box-sizing: border-box; background: #0F172A; border: 1px solid rgba(255,255,255,0.15); color: #FFF; padding: 8px 12px; border-radius: 10px; font-size: 12px; outline: none; resize: none;"></textarea>
          </div>
        </div>

        <!-- Actions -->
        <div style="display: flex; gap: 8px; margin-top: 16px;">
          <button type="button" class="btn-print3d-chat" style="flex: 1;" onclick="Print3DServiceApp.submitCustomStlQuote('chat')">
            <span>💬</span> Iniciar Cotización en Chat
          </button>
          <button type="button" class="btn-print3d-wa" style="flex: 1;" onclick="Print3DServiceApp.submitCustomStlQuote('whatsapp')">
            <span>🟢</span> Cotizar por WhatsApp
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(div);

    // Setup drag and drop
    const dropzone = document.getElementById('stl-dropzone');
    if (dropzone) {
      dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          Print3DServiceApp.processStlFile(e.dataTransfer.files[0]);
        }
      });
    }
  },

  handleStlFileSelect(e) {
    if (e.target.files && e.target.files[0]) {
      this.processStlFile(e.target.files[0]);
    }
  },

  processStlFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const buffer = ev.target.result;
      const meshData = this.parseStlBuffer(buffer, file.name);
      if (meshData && meshData.triangles.length > 0) {
        this.uploadedStlData = meshData;
        const previewWrap = document.getElementById('stl-preview-container');
        if (previewWrap) previewWrap.style.display = 'block';

        // Update technical labels
        const triEl = document.getElementById('stl-metric-triangles');
        const dimEl = document.getElementById('stl-metric-dimensions');
        const wtEl = document.getElementById('stl-metric-weight');

        if (triEl) triEl.textContent = meshData.triangles.length.toLocaleString('de-DE');
        if (dimEl) dimEl.textContent = `${meshData.sizeCm.x} x ${meshData.sizeCm.y} x ${meshData.sizeCm.z} cm`;
        if (wtEl) wtEl.textContent = `~${meshData.estimatedWeightGrams} g`;

        // Start rotating 3D canvas
        this.initStlCanvas(meshData);
      } else {
        alert('No se pudieron leer los polígonos del archivo STL.');
      }
    };
    reader.readAsArrayBuffer(file);
  },

  parseStlBuffer(buffer, fileName) {
    try {
      const isBinary = buffer.byteLength > 84;
      const reader = new DataView(buffer);
      const triangles = [];
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;

      if (isBinary) {
        const triangleCount = reader.getUint32(80, true);
        const maxTrianglesToRender = Math.min(triangleCount, 8000); // cap for smooth 60fps mobile preview
        const step = Math.max(1, Math.floor(triangleCount / maxTrianglesToRender));

        for (let i = 0; i < triangleCount; i += step) {
          const offset = 84 + (i * 50);
          if (offset + 48 > buffer.byteLength) break;
          // Normal
          const nx = reader.getFloat32(offset, true);
          const ny = reader.getFloat32(offset + 4, true);
          const nz = reader.getFloat32(offset + 8, true);
          // Vertices v1, v2, v3
          const v1 = { x: reader.getFloat32(offset + 12, true), y: reader.getFloat32(offset + 16, true), z: reader.getFloat32(offset + 20, true) };
          const v2 = { x: reader.getFloat32(offset + 24, true), y: reader.getFloat32(offset + 28, true), z: reader.getFloat32(offset + 32, true) };
          const v3 = { x: reader.getFloat32(offset + 36, true), y: reader.getFloat32(offset + 40, true), z: reader.getFloat32(offset + 44, true) };

          [v1, v2, v3].forEach(v => {
            if (v.x < minX) minX = v.x; if (v.x > maxX) maxX = v.x;
            if (v.y < minY) minY = v.y; if (v.y > maxY) maxY = v.y;
            if (v.z < minZ) minZ = v.z; if (v.z > maxZ) maxZ = v.z;
          });

          triangles.push({ normal: { x: nx, y: ny, z: nz }, v1, v2, v3 });
        }
      }

      const sizeMm = {
        x: Math.max(1, (maxX - minX)),
        y: Math.max(1, (maxY - minY)),
        z: Math.max(1, (maxZ - minZ))
      };
      const sizeCm = {
        x: (sizeMm.x / 10).toFixed(1),
        y: (sizeMm.y / 10).toFixed(1),
        z: (sizeMm.z / 10).toFixed(1)
      };

      // Center mesh around origin (0, 0, 0)
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const centerZ = (minZ + maxZ) / 2;
      const maxDim = Math.max(sizeMm.x, sizeMm.y, sizeMm.z) || 1;

      const normalizedTriangles = triangles.map(t => ({
        normal: t.normal,
        v1: { x: (t.v1.x - centerX) / maxDim, y: (t.v1.y - centerY) / maxDim, z: (t.v1.z - centerZ) / maxDim },
        v2: { x: (t.v2.x - centerX) / maxDim, y: (t.v2.y - centerY) / maxDim, z: (t.v2.z - centerZ) / maxDim },
        v3: { x: (t.v3.x - centerX) / maxDim, y: (t.v3.y - centerY) / maxDim, z: (t.v3.z - centerZ) / maxDim }
      }));

      // Estimated volume in cm3 and grams at 20% infill
      const volCm3 = (parseFloat(sizeCm.x) * parseFloat(sizeCm.y) * parseFloat(sizeCm.z)) * 0.28;
      const estimatedWeightGrams = Math.max(5, Math.round(volCm3 * 1.24));

      return {
        fileName: fileName || 'modelo.stl',
        triangles: normalizedTriangles,
        sizeCm,
        estimatedWeightGrams
      };
    } catch (e) {
      console.warn('Error parsing STL:', e);
      return null;
    }
  },

  initStlCanvas(meshData) {
    const canvas = document.getElementById('stl-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Drag / Touch rotation
    const onStart = (clientX, clientY) => {
      this.stlIsDragging = true;
      this.stlLastMouse = { x: clientX, y: clientY };
    };
    const onMove = (clientX, clientY) => {
      if (!this.stlIsDragging) return;
      const dx = clientX - this.stlLastMouse.x;
      const dy = clientY - this.stlLastMouse.y;
      this.stlRotation.y += dx * 0.012;
      this.stlRotation.x += dy * 0.012;
      this.stlLastMouse = { x: clientX, y: clientY };
    };
    const onEnd = () => { this.stlIsDragging = false; };

    canvas.onmousedown = (e) => onStart(e.clientX, e.clientY);
    window.onmousemove = (e) => onMove(e.clientX, e.clientY);
    window.onmouseup = () => onEnd();

    canvas.ontouchstart = (e) => { if (e.touches[0]) onStart(e.touches[0].clientX, e.touches[0].clientY); };
    window.ontouchmove = (e) => { if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY); };
    window.ontouchend = () => onEnd();

    if (this.stlAnimationId) cancelAnimationFrame(this.stlAnimationId);

    const render = () => {
      if (!this.stlIsDragging) {
        this.stlRotation.y += 0.015; // smooth auto-rotation
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const scale = Math.min(w, h) * 0.42;

      const cosY = Math.cos(this.stlRotation.y);
      const sinY = Math.sin(this.stlRotation.y);
      const cosX = Math.cos(this.stlRotation.x);
      const sinX = Math.sin(this.stlRotation.x);

      // Rotate and project triangles
      const projected = meshData.triangles.map(t => {
        const rot = (v) => {
          // Y-axis rotation
          let x1 = v.x * cosY + v.z * sinY;
          let y1 = v.y;
          let z1 = -v.x * sinY + v.z * cosY;
          // X-axis rotation
          let x2 = x1;
          let y2 = y1 * cosX - z1 * sinX;
          let z2 = y1 * sinX + z1 * cosX;
          return {
            x: cx + x2 * scale,
            y: cy - y2 * scale,
            z: z2
          };
        };
        const p1 = rot(t.v1);
        const p2 = rot(t.v2);
        const p3 = rot(t.v3);
        const depth = (p1.z + p2.z + p3.z) / 3;
        return { p1, p2, p3, depth };
      });

      // Painter algorithm: sort by depth
      projected.sort((a, b) => a.depth - b.depth);

      // Draw triangles with cyan metallic shader
      projected.forEach(item => {
        const { p1, p2, p3, depth } = item;
        const shade = Math.floor(Math.max(40, Math.min(240, 140 + depth * 100)));
        ctx.fillStyle = `rgb(${Math.floor(shade * 0.3)}, ${shade}, ${Math.floor(shade * 0.95)})`;
        ctx.strokeStyle = `rgba(15, 23, 42, 0.4)`;
        ctx.lineWidth = 0.5;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });

      this.stlAnimationId = requestAnimationFrame(render);
    };

    render();
  },

  submitCustomStlQuote(channel) {
    const mesh = this.uploadedStlData;
    const name = (document.getElementById('stl-client-name')?.value || '').trim() || 'Cliente';
    const phone = (document.getElementById('stl-client-phone')?.value || '').trim();
    const materialKey = document.getElementById('stl-material-select')?.value || 'pla';
    const notes = (document.getElementById('stl-client-notes')?.value || '').trim();

    if (!mesh) {
      alert('Por favor selecciona primero un archivo 3D (.STL o .OBJ).');
      return;
    }

    const matName = this.materials[materialKey]?.name || 'PLA';
    const quoteCode = `COT-3D-${Math.floor(1000 + Math.random() * 9000)}`;

    const payload = {
      customerName: name,
      customerPhone: phone,
      clientName: name,
      clientPhone: phone,
      productTitle: `Diseño Propio: ${mesh.fileName}`,
      modelName: `Diseño Propio: ${mesh.fileName}`,
      scale: '100%',
      dimensions: mesh.sizeCm,
      material: materialKey,
      materialName: matName,
      filamentColor: 'A convenir',
      quantity: 1,
      estimatedPriceUsd: 'Bajo Cotización',
      notes: `Dimensiones: ${mesh.sizeCm.x}x${mesh.sizeCm.y}x${mesh.sizeCm.z}cm (~${mesh.estimatedWeightGrams}g). Notas: ${notes}`
    };

    if (channel === 'whatsapp') {
      const waText = encodeURIComponent(
        `Hola PediGochos 3D Lab! 👋 Solicito cotización para fabricar mi archivo 3D:

` +
        `📋 *Código:* ${quoteCode}
` +
        `👤 *Cliente:* ${name} (${phone || 'No indicado'})
` +
        `📂 *Archivo:* ${mesh.fileName}
` +
        `📐 *Medidas:* ${mesh.sizeCm.x} x ${mesh.sizeCm.y} x ${mesh.sizeCm.z} cm
` +
        `⚖️ *Peso Aprox:* ~${mesh.estimatedWeightGrams} gramos
` +
        `🧪 *Material:* ${matName}
` +
        (notes ? `📝 *Notas:* ${notes}

` : `
`) +
        `¿Podrían confirmarme el presupuesto y tiempo de fabricación? ¡Muchas gracias!`
      );
      this.closeCustomUploadModal();
      window.open(`https://wa.me/573227949751?text=${waText}`, '_blank');
    } else {
      fetch('/api/print3d-services/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(res => res.json()).then(data => {
        if (data.quote) {
          this.closeCustomUploadModal();
          this.activeQuote = data.quote;
          this.openChatModal(data.quote);
        }
      }).catch(e => {
        alert('Error registrando cotización en chat.');
      });
    }
  }
};

window.Print3DServiceApp = Print3DServiceApp;
document.addEventListener('DOMContentLoaded', () => {
  Print3DServiceApp.init();
});
