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
      slug: 'soporte-celular-volante',
      title: 'Soporte Celular Ergonómico para Auto / Moto',
      category: 'repuestos',
      material: 'petg',
      baseDimensions: { x: 8.5, y: 7.2, z: 9.0 }, // cm
      basePriceUsd: 12.0,
      estPrintHours: 4.5,
      weightGrams: 65,
      image: '/images/servicios.jpg',
      modelGlb: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb', // Reliable 3D asset test
      desc: 'Soporte de alta durabilidad para sujetar smartphone en salpicadero o manillar. Resistente a vibraciones y exposición solar prolongada.',
      tags: ['Resistente UV', 'Antivibración', 'Grip Firme']
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
      tags: ['100% Articulado', 'Coleccionable', 'Sin Ensamblaje']
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
      tags: ['Tolerancia 0.1mm', 'Alta Torsión', 'A Medida']
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
      tags: ['Doble Color', 'Empresarial', 'Bajo Costo']
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
      tags: ['Estilo Gamer', 'Base Firme', 'Geométrico']
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
      tags: ['Diseño Poligonal', 'Decoración', 'Con Drenaje']
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
            ✨ Todos los Diseños
          </button>
          <button type="button" class="print3d-filter-btn" onclick="Print3DServiceApp.filterCategory('coleccionables', this)">
            🐉 Coleccionables & Figuras
          </button>
          <button type="button" class="print3d-filter-btn" onclick="Print3DServiceApp.filterCategory('llaveros', this)">
            🔑 Llaveros & Merch
          </button>
          <button type="button" class="print3d-filter-btn" onclick="Print3DServiceApp.filterCategory('repuestos', this)">
            ⚙️ Piezas Funcionales & Repuestos
          </button>
          <button type="button" class="print3d-filter-btn" onclick="Print3DServiceApp.filterCategory('decoracion', this)">
            🏺 Decoración & Hogar
          </button>
          <button type="button" class="print3d-filter-btn" onclick="Print3DServiceApp.filterCategory('soportes', this)">
            📱 Soportes & Gadgets
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
                <span class="print3d-price-label">Precio base</span>
                <span class="print3d-price-val">$${p.basePriceUsd.toFixed(2)} USD</span>
              </div>
              <button type="button" class="btn-open-3d-detail" onclick="event.stopPropagation(); Print3DServiceApp.openDetail('${p.id}')">
                Personalizar ➔
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
        <div style="display: flex; align-items: center; gap: 10px;">
          <button type="button" class="print3d-back-btn" onclick="Print3DServiceApp.closeDetail()">←</button>
          <h3 id="print3d-detail-nav-title" style="margin: 0; font-size: 15px; font-weight: 800; color: #FFF;">
            Visor 3D Interactivo
          </h3>
        </div>
        <button type="button" class="print3d-back-btn" onclick="Print3DServiceApp.closeDetail()">✕</button>
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

    // Dynamic price calculation
    const pricing = this.calculatePricing();
    const copRate = (window.systemSettings && window.systemSettings.cop_rate) ? window.systemSettings.cop_rate : 4100;
    const vesRate = (window.systemSettings && window.systemSettings.ves_rate) ? window.systemSettings.ves_rate : 135;

    const totalCop = Math.round(pricing.totalUsd * copRate);
    const totalVes = Math.round(pricing.totalUsd * vesRate);

    // WhatsApp prefilled message
    const waText = encodeURIComponent(
      `Hola PediGochos 3D Lab! 👋 Me interesa fabricar el diseño: *${p.title}*\n` +
      `• Escala: ${this.configState.scale}%\n` +
      `• Dimensiones: ${curDimX} x ${curDimY} x ${curDimZ} cm\n` +
      `• Material: ${this.materials[this.configState.materialKey].name}\n` +
      `• Color filamento: ${this.configState.colorName}\n` +
      `• Cantidad: ${this.configState.quantity} unid.\n` +
      `• Total estimado: $${pricing.totalUsd.toFixed(2)} USD (~$${totalCop.toLocaleString('es-CO')} COP / ${totalVes.toLocaleString('es-VE')} Bs)\n` +
      `¿Podemos confirmar disponibilidad y tiempo de entrega?`
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
              shadow-intensity="1.5"
              exposure="1.1"
              environment-image="neutral"
              style="width: 100%; height: 100%;"
            >
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
                <strong class="print3d-mat-name">${mat.name}</strong>
                <span class="print3d-mat-sub">${mat.desc}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Quantity & Volume Discount -->
        <div class="print3d-qty-box">
          <div class="print3d-qty-row">
            <div>
              <strong style="color: #FFF; font-size: 13px; display: block;">Cantidad a Fabricar:</strong>
              <span style="font-size: 11px; color: #94A3B8;">5+ (10% OFF) • 10+ (20% OFF)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              ${pricing.discountPercent > 0 ? `
                <span class="print3d-discount-tag">-${pricing.discountPercent}% OFF</span>
              ` : ''}
              <div class="print3d-qty-stepper">
                <button type="button" class="print3d-stepper-btn" onclick="Print3DServiceApp.changeQty(-1)">-</button>
                <span class="print3d-qty-value">${this.configState.quantity}</span>
                <button type="button" class="print3d-stepper-btn" onclick="Print3DServiceApp.changeQty(1)">+</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Pricing Breakdown Card -->
        <div class="print3d-pricing-card">
          <div class="print3d-pricing-row">
            <span>Precio Unitario:</span>
            <strong style="color: #FFF;">$${pricing.unitPriceUsd.toFixed(2)} USD</strong>
          </div>
          ${pricing.discountAmountUsd > 0 ? `
            <div class="print3d-pricing-row" style="color: #34D399;">
              <span>Descuento Volumen (${pricing.discountPercent}%):</span>
              <strong>-$${pricing.discountAmountUsd.toFixed(2)} USD</strong>
            </div>
          ` : ''}
          <div style="border-top: 1px solid rgba(255,255,255,0.1); margin: 8px 0; padding-top: 8px; display: flex; justify-content: space-between; align-items: flex-end;">
            <div>
              <span style="font-size: 11px; color: #94A3B8; font-weight: 700;">TOTAL ESTIMADO:</span>
              <div style="font-size: 11.5px; color: #CBD5E1;">
                ~$${totalCop.toLocaleString('es-CO')} COP • ${totalVes.toLocaleString('es-VE')} Bs
              </div>
            </div>
            <span class="print3d-total-usd">$${pricing.totalUsd.toFixed(2)} USD</span>
          </div>
        </div>

        <!-- Double Contact CTAs -->
        <div class="print3d-cta-row">
          <button type="button" class="btn-print3d-chat" onclick="Print3DServiceApp.openInAppChat()">
            <span>💬</span> Chatear con Fabricante
          </button>
          <a href="https://wa.me/584245516340?text=${waText}" target="_blank" rel="noopener noreferrer" class="btn-print3d-wa">
            <span>🟢</span> Pedir por WhatsApp
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
                  <span style="color: #38BDF8; font-size: 11px; font-weight: 800;">$${item.basePriceUsd.toFixed(2)} USD</span>
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
    if (viewer && viewer.model) {
      try {
        const materials = viewer.model.materials;
        if (materials && materials.length > 0) {
          // Convert hex to rgb normalized [0, 1]
          const c = parseInt(hex.replace('#', ''), 16);
          const r = ((c >> 16) & 255) / 255;
          const g = ((c >> 8) & 255) / 255;
          const b = (c & 255) / 255;
          materials[0].pbrMetallicRoughness.setBaseColorFactor([r, g, b, 1.0]);
        }
      } catch (e) {
        console.warn('Could not set model color factor:', e);
      }
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
      productId: p.id,
      productTitle: p.title,
      scale: this.configState.scale,
      dimensions: curDim,
      material: this.configState.materialKey,
      filamentColor: this.configState.colorName,
      quantity: this.configState.quantity,
      estimatedPriceUsd: pricing.totalUsd.toFixed(2)
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
          <span style="color: #94A3B8; font-size: 10px; display: block;">PRECIO ESTIMADO / TOTAL</span>
          <strong style="color: #38BDF8; font-size: 13px;">${quote.finalPrice ? `$${quote.finalPrice} USD` : `$${quote.estimatedPriceUsd} USD`}</strong>
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

  openCustomUploadModal() {
    const filename = prompt('Ingresa el nombre o enlace de tu archivo 3D (.STL, .OBJ, .STEP):');
    if (!filename) return;
    const name = prompt('Tu Nombre:') || 'Cliente';
    const phone = prompt('Tu WhatsApp:') || '';

    const payload = {
      customerName: name,
      customerPhone: phone,
      productTitle: `Diseño Propio: ${filename}`,
      scale: 100,
      material: 'pla',
      filamentColor: 'A convenir',
      quantity: 1,
      estimatedPriceUsd: 'A calcular (por gramo)',
      notes: `Archivo 3D provisto por el usuario: ${filename}`
    };

    fetch('/api/print3d-services/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(res => res.json()).then(data => {
      if (data.quote) {
        this.activeQuote = data.quote;
        this.openChatModal(data.quote);
      }
    }).catch(e => {
      alert('Error enviando solicitud de archivo propio.');
    });
  }
};

window.Print3DServiceApp = Print3DServiceApp;
document.addEventListener('DOMContentLoaded', () => {
  Print3DServiceApp.init();
});
