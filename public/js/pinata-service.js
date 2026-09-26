/* ==========================================================================
   Piñatas Personalizadas ("Tus Piñatas a Medida") - Logic & Wizard
   PediGochos Specialized Services Module
   ========================================================================== */

const PinataServiceApp = {
  activeQuote: null,
  ws: null,
  catalog: [],
  currentFilter: 'all',
  currentWizardStep: 1,

  // WhatsApp fallback dispatch number
  whatsAppNumber: '573227949751',
  whatsAppDisplay: '+57 322 794 9751',

  // Customization Wizard State
  wizardState: {
    theme: '',
    customName: '',
    photos: [], // Array of base64 compressed data URLs (max 3)
    styleId: '3d', // '2d' | '3d' | 'numero' | 'mini'
    sizeId: 'mediana', // 'pequena' | 'mediana' | 'grande'
    openingSystem: 'tradicional', // 'tradicional' | 'cintas'
    filling: 'empty', // 'empty' | 'candies'
    extras: [], // 'palo', 'antifaz', 'confeti'
    eventDate: ''
  },

  init() {
    this.setupWebSocket();
    this.checkHashRoute();
    window.addEventListener('hashchange', () => this.checkHashRoute());
    window.addEventListener('popstate', () => this.checkHashRoute());
  },

  checkHashRoute() {
    const hash = window.location.hash || '';
    const path = window.location.pathname || '';
    if (hash === '#servicios/pinatas-personalizadas' || hash.startsWith('#servicios/pinatas') || path === '/servicios/pinatas-personalizadas') {
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
          if (data.type === 'PINATA_QUOTE_MESSAGE' && this.activeQuote && (data.quoteId === this.activeQuote.id || data.chatId === this.activeQuote.chatId)) {
            this.appendChatMessage(data.message);
            if (data.quoteStatus) {
              this.activeQuote.status = data.quoteStatus;
              this.renderFichaTecnica(this.activeQuote);
            }
          } else if (data.type === 'PINATA_QUOTE_UPDATE' && this.activeQuote && data.quote.id === this.activeQuote.id) {
            this.activeQuote = data.quote;
            this.renderFichaTecnica(data.quote);
          } else if (data.type === 'PINATA_CATALOG_UPDATE') {
            this.catalog = data.items || [];
            this.renderGallery();
          }
        } catch(e) {
          console.warn('WS pinata message parse error:', e);
        }
      };

      this.ws.onclose = () => {
        setTimeout(() => this.setupWebSocket(), 5000);
      };
    } catch(e) {
      console.warn('WS pinata connect error:', e);
    }
  },

  open() {
    let modal = document.getElementById('pinata-service-modal');
    if (!modal) {
      this.renderMainModalMarkup();
      modal = document.getElementById('pinata-service-modal');
    }
    if (modal) {
      modal.classList.remove('hidden');
      if (window.location.hash !== '#servicios/pinatas-personalizadas') {
        window.history.pushState({ modal: 'pinata-service' }, '', '#servicios/pinatas-personalizadas');
      }
      this.loadCatalog();
    }
  },

  close() {
    const modal = document.getElementById('pinata-service-modal');
    if (modal) modal.classList.add('hidden');
    if (window.location.hash.startsWith('#servicios/pinatas')) {
      window.history.pushState(null, '', window.location.pathname);
    }
  },

  renderMainModalMarkup() {
    const modal = document.createElement('div');
    modal.id = 'pinata-service-modal';
    modal.className = 'pinata-service-modal hidden';
    modal.innerHTML = `
      <!-- Header -->
      <header class="pinata-header">
        <div class="pinata-header-brand">
          <div class="pinata-brand-icon">🪅</div>
          <div>
            <h2>Piñatas <span>Personalizadas</span></h2>
            <p>100% Hechas a Mano • Cualquier Motivo o Personaje</p>
          </div>
        </div>
        <button type="button" class="pinata-close-btn" onclick="PinataServiceApp.close()" title="Cerrar">✕</button>
      </header>

      <!-- Scrollable Body -->
      <main class="pinata-body-scroll">
        <!-- Hero Card -->
        <div class="pinata-hero-card">
          <div class="pinata-hero-badge">✨ Tus Piñatas a Medida</div>
          <h1 class="pinata-hero-title">¡Haz realidad la piñata soñada para tu fiesta!</h1>
          <p class="pinata-hero-desc">
            Creamos piñatas artesanales reforzadas para romper a palo o con sistema de cintas seguro. Personajes 3D, números temáticos, siluetas y mini-piñatas de colección.
          </p>

          <!-- Badges de Garantía -->
          <div class="pinata-guarantee-row">
            <div class="pinata-guarantee-pill">
              <span class="icon">✂️</span>
              <span class="text">100% Hechas a Mano</span>
            </div>
            <div class="pinata-guarantee-pill">
              <span class="icon">🎨</span>
              <span class="text">Cualquier Motivo</span>
            </div>
            <div class="pinata-guarantee-pill">
              <span class="icon">📅</span>
              <span class="text">Entrega Programada</span>
            </div>
          </div>

          <button type="button" class="btn-pinata-hero-cta" onclick="PinataServiceApp.openWizard()">
            <span>🪄</span>
            <span>Personalizar mi propia piñata ahora</span>
            <span>➔</span>
          </button>
        </div>

        <!-- Muestrario / Galería de Trabajos Anteriores -->
        <div class="pinata-sec-header">
          <h3>
            <span>📸</span> Muestrario de Trabajos Anteriores
          </h3>
          <span class="counter" id="pinata-catalog-counter">Cargando...</span>
        </div>

        <!-- Categorías de Galería -->
        <div class="pinata-filter-bar">
          <button type="button" class="pinata-filter-chip active" data-filter="all" onclick="PinataServiceApp.filterGallery('all', this)">Todas</button>
          <button type="button" class="pinata-filter-chip" data-filter="personajes" onclick="PinataServiceApp.filterGallery('personajes', this)">Personajes</button>
          <button type="button" class="pinata-filter-chip" data-filter="numeros" onclick="PinataServiceApp.filterGallery('numeros', this)">Números & Letras</button>
          <button type="button" class="pinata-filter-chip" data-filter="figuras3d" onclick="PinataServiceApp.filterGallery('figuras3d', this)">Figuras 3D</button>
          <button type="button" class="pinata-filter-chip" data-filter="mini" onclick="PinataServiceApp.filterGallery('mini', this)">Mini-Piñatas</button>
          <button type="button" class="pinata-filter-chip" data-filter="eventos" onclick="PinataServiceApp.filterGallery('eventos', this)">Eventos Especiales</button>
        </div>

        <!-- Dynamic Grid with Skeletons -->
        <div class="pinata-gallery-grid" id="pinata-gallery-container">
          <div class="pinata-skeleton-card"><div class="pinata-skeleton-shimmer"></div></div>
          <div class="pinata-skeleton-card"><div class="pinata-skeleton-shimmer"></div></div>
          <div class="pinata-skeleton-card"><div class="pinata-skeleton-shimmer"></div></div>
          <div class="pinata-skeleton-card"><div class="pinata-skeleton-shimmer"></div></div>
        </div>
      </main>
    `;
    document.body.appendChild(modal);
  },

  async loadCatalog() {
    try {
      const res = await fetch('/api/pinata-services/catalog');
      this.catalog = await res.json();
      this.renderGallery();
    } catch(e) {
      console.warn('Error loading pinatas catalog:', e);
      this.renderGallery();
    }
  },

  filterGallery(filter, btn) {
    this.currentFilter = filter;
    document.querySelectorAll('.pinata-filter-chip').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    this.renderGallery();
  },

  renderGallery() {
    const container = document.getElementById('pinata-gallery-container');
    const counter = document.getElementById('pinata-catalog-counter');
    if (!container) return;

    const filtered = this.currentFilter === 'all' 
      ? this.catalog 
      : this.catalog.filter(it => it.category === this.currentFilter || (this.currentFilter === 'mini' && it.sizeId === 'mini'));

    if (counter) {
      counter.textContent = `${filtered.length} modelos`;
    }

    if (!filtered.length) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; color: #94a3b8; padding: 40px 20px;">
          <span style="font-size: 36px; display: block; margin-bottom: 8px;">🎨</span>
          <p style="margin: 0; font-size: 14px; font-weight: 700; color: #e2e8f0;">No hay fotos en esta categoría aún</p>
          <p style="margin: 4px 0 16px 0; font-size: 12px;">¡Pero podemos elaborar cualquier diseño que imagines!</p>
          <button type="button" class="btn-sample-quote-sim" onclick="PinataServiceApp.openWizard()" style="padding: 8px 16px; font-size: 12px;">Personalizar desde Cero ➔</button>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(item => `
      <div class="pinata-sample-card">
        <div class="pinata-sample-img-wrap">
          <img src="${item.image}" alt="${item.name}" class="pinata-sample-img" loading="lazy" onerror="this.src='/images/pinatas/pinata_celebracion.jpg'">
          <span class="pinata-sample-size-tag">${item.size || 'Mediana'}</span>
        </div>
        <div class="pinata-sample-info">
          <div>
            <h4 class="pinata-sample-title">${item.name}</h4>
            <p class="pinata-sample-desc">${item.desc || 'Acabado artesanal de alta durabilidad.'}</p>
          </div>
          <div class="pinata-sample-bottom">
            <span class="pinata-sample-price">${item.priceRange || `$${item.basePriceUsd} USD`}</span>
            <button type="button" class="btn-sample-quote-sim" onclick="PinataServiceApp.openWizardForSample('${item.id}')">
              Cotizar Similar ➔
            </button>
          </div>
        </div>
      </div>
    `).join('');
  },

  openWizardForSample(sampleId) {
    const item = this.catalog.find(it => it.id === sampleId);
    if (item) {
      this.wizardState.theme = `Modelo similar a: ${item.name}`;
      this.wizardState.styleId = item.styleId || '3d';
      this.wizardState.sizeId = item.sizeId || 'mediana';
    }
    this.openWizard();
  },

  openWizard() {
    this.currentWizardStep = 1;
    let wizard = document.getElementById('pinata-wizard-modal');
    if (!wizard) {
      this.renderWizardMarkup();
      wizard = document.getElementById('pinata-wizard-modal');
    }
    this.updateWizardStepView();
    if (wizard) wizard.style.display = 'flex';
  },

  closeWizard() {
    const wizard = document.getElementById('pinata-wizard-modal');
    if (wizard) wizard.style.display = 'none';
  },

  renderWizardMarkup() {
    const modal = document.createElement('div');
    modal.id = 'pinata-wizard-modal';
    modal.className = 'pinata-wizard-overlay';
    modal.style.display = 'none';
    modal.innerHTML = `
      <div class="pinata-wizard-container">
        <!-- Wizard Header -->
        <div class="pinata-wizard-header">
          <div class="pinata-wizard-header-top">
            <h3 class="pinata-wizard-title">
              <span>🪅</span> Personaliza tu Piñata a Medida
            </h3>
            <span class="pinata-wizard-step-badge" id="wizard-step-badge">Paso 1 de 6</span>
          </div>
          <div class="pinata-wizard-progress-bar">
            <div class="pinata-wizard-progress-fill" id="wizard-progress-fill" style="width: 16.66%;"></div>
          </div>
        </div>

        <!-- Scrollable Steps Area -->
        <div class="pinata-wizard-scroll" id="wizard-steps-scroll">
          <!-- Step views populated dynamically -->
        </div>

        <!-- Wizard Footer -->
        <div class="pinata-wizard-footer">
          <button type="button" class="btn-pinata-back" id="btn-wizard-back" onclick="PinataServiceApp.prevStep()">Volver</button>
          <button type="button" class="btn-pinata-next" id="btn-wizard-next" onclick="PinataServiceApp.nextStep()">Continuar ➔</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  updateWizardStepView() {
    const container = document.getElementById('wizard-steps-scroll');
    const badge = document.getElementById('wizard-step-badge');
    const fill = document.getElementById('wizard-progress-fill');
    const backBtn = document.getElementById('btn-wizard-back');
    const nextBtn = document.getElementById('btn-wizard-next');

    if (!container) return;

    if (badge) badge.textContent = `Paso ${this.currentWizardStep} de 6`;
    if (fill) fill.style.width = `${(this.currentWizardStep / 6) * 100}%`;
    if (backBtn) {
      backBtn.textContent = this.currentWizardStep === 1 ? 'Cancelar' : 'Volver';
    }
    if (nextBtn) {
      nextBtn.innerHTML = this.currentWizardStep === 6 
        ? `<span>💬</span> Pedir Cotización por Chat` 
        : `Continuar ➔`;
    }

    switch (this.currentWizardStep) {
      case 1:
        this.renderStep1(container);
        break;
      case 2:
        this.renderStep2(container);
        break;
      case 3:
        this.renderStep3(container);
        break;
      case 4:
        this.renderStep4(container);
        break;
      case 5:
        this.renderStep5(container);
        break;
      case 6:
        this.renderStep6(container);
        break;
    }
  },

  /* Paso 1: Temática y Fotos de Referencia */
  renderStep1(el) {
    el.innerHTML = `
      <h3 class="pinata-step-title">Paso 1: Temática y Foto de Referencia</h3>
      <p class="pinata-step-subtitle">Describe qué motivo deseas y adjunta fotos de referencia si las tienes.</p>

      <label class="pinata-input-label">¿De qué temática o motivo deseas tu piñata? *</label>
      <textarea class="pinata-textarea" id="pinata-input-theme" placeholder="Describe aquí tu personaje, figura, temática libre, frase o idea..." oninput="PinataServiceApp.wizardState.theme = this.value">${this.wizardState.theme}</textarea>

      <label class="pinata-input-label" style="margin-top: 14px;">Fotos de referencia (1 a 3 fotos opcionales)</label>
      <div class="pinata-uploader-zone" onclick="document.getElementById('pinata-file-input').click()">
        <span class="pinata-uploader-icon">📷</span>
        <p class="pinata-uploader-text">Toca para adjuntar fotos de galería o cámara</p>
        <span class="pinata-uploader-sub">Compresión automática de alta velocidad (máx 3 imágenes)</span>
      </div>
      <input type="file" id="pinata-file-input" accept="image/*" multiple style="display: none;" onchange="PinataServiceApp.handlePhotoUpload(event)">

      <div class="pinata-thumbs-strip" id="pinata-thumbs-strip">
        ${this.renderPhotoThumbnails()}
      </div>

      <label class="pinata-input-label" style="margin-top: 16px;">Nombre o número a incluir en la piñata (Opcional)</label>
      <input type="text" class="pinata-text-input" id="pinata-input-customname" placeholder="Ej: Andrés 5, Sofía, Graduación 2026..." value="${this.wizardState.customName}" oninput="PinataServiceApp.wizardState.customName = this.value">
    `;
  },

  renderPhotoThumbnails() {
    if (!this.wizardState.photos || !this.wizardState.photos.length) return '';
    return this.wizardState.photos.map((src, idx) => `
      <div class="pinata-thumb-box">
        <img src="${src}" alt="Foto ${idx + 1}">
        <button type="button" class="pinata-thumb-del" onclick="PinataServiceApp.removePhoto(${idx})" title="Eliminar">✕</button>
      </div>
    `).join('');
  },

  handlePhotoUpload(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const remainingSlots = 3 - this.wizardState.photos.length;
    if (remainingSlots <= 0) {
      alert('Solo puedes adjuntar hasta 3 fotos de referencia.');
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);

    filesToProcess.forEach(file => {
      // Client-side HTML5 Canvas compression to optimize data size & prevent phone freezing
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1024;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Compress to JPEG 0.75
          const compressedData = canvas.toDataURL('image/jpeg', 0.75);
          this.wizardState.photos.push(compressedData);

          const strip = document.getElementById('pinata-thumbs-strip');
          if (strip) strip.innerHTML = this.renderPhotoThumbnails();
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  },

  removePhoto(index) {
    this.wizardState.photos.splice(index, 1);
    const strip = document.getElementById('pinata-thumbs-strip');
    if (strip) strip.innerHTML = this.renderPhotoThumbnails();
  },

  /* Paso 2: Formato y Estilo de Elaboración */
  renderStep2(el) {
    const s = this.wizardState.styleId;
    el.innerHTML = `
      <h3 class="pinata-step-title">Paso 2: Formato y Estilo de Elaboración</h3>
      <p class="pinata-step-subtitle">Elige el tipo de silueta o estructura artesanal para tu diseño.</p>

      <div class="pinata-choice-grid">
        <div class="pinata-choice-card ${s === '2d' ? 'selected' : ''}" onclick="PinataServiceApp.selectStyle('2d')">
          <div class="pinata-choice-icon">🖼️</div>
          <div class="pinata-choice-info">
            <strong>Silueta / Relieve (2D)</strong>
            <span>Figura tradicional plana con contorno recortado y dibujo en relieve. Económica y vistosa.</span>
          </div>
        </div>

        <div class="pinata-choice-card ${s === '3d' ? 'selected' : ''}" onclick="PinataServiceApp.selectStyle('3d')">
          <span class="pinata-choice-badge">MÁS PEDIDA</span>
          <div class="pinata-choice-icon">🧸</div>
          <div class="pinata-choice-info">
            <strong>Escultural / Volumen (3D)</strong>
            <span>Figura con volumen completo en 360 grados, modelada artesanalmente con alto realismo.</span>
          </div>
        </div>

        <div class="pinata-choice-card ${s === 'numero' ? 'selected' : ''}" onclick="PinataServiceApp.selectStyle('numero')">
          <div class="pinata-choice-icon">🔢</div>
          <div class="pinata-choice-info">
            <strong>Número o Letra Personalizada</strong>
            <span>Número de edad o inicial del agasajado decorada y personalizada con la temática.</span>
          </div>
        </div>

        <div class="pinata-choice-card ${s === 'mini' ? 'selected' : ''}" onclick="PinataServiceApp.selectStyle('mini')">
          <div class="pinata-choice-icon">🎁</div>
          <div class="pinata-choice-info">
            <strong>Mini-Piñata</strong>
            <span>Formato miniatura decorativo (ideal para recuerdos, centros de mesa o regalos sorpresa).</span>
          </div>
        </div>
      </div>
    `;
  },

  selectStyle(id) {
    this.wizardState.styleId = id;
    this.updateWizardStepView();
  },

  /* Paso 3: Tamaño y Capacidad */
  renderStep3(el) {
    const sz = this.wizardState.sizeId;
    el.innerHTML = `
      <h3 class="pinata-step-title">Paso 3: Tamaño y Capacidad</h3>
      <p class="pinata-step-subtitle">Selecciona las dimensiones ideales según la cantidad de invitados.</p>

      <div class="pinata-size-list">
        <div class="pinata-size-pill ${sz === 'pequena' ? 'selected' : ''}" onclick="PinataServiceApp.selectSize('pequena')">
          <div class="pinata-size-left">
            <span style="font-size: 22px;">📏</span>
            <div>
              <span class="dimension">Pequeña (~50 cm)</span>
              <span class="capacity">Capacidad aprox: 1 a 2 kg de dulces • Fiestas íntimas</span>
            </div>
          </div>
          <span style="font-weight: 800; color: #FDA4AF; font-size: 13px;">Desde $12</span>
        </div>

        <div class="pinata-size-pill ${sz === 'mediana' ? 'selected' : ''}" onclick="PinataServiceApp.selectSize('mediana')">
          <div class="pinata-size-left">
            <span style="font-size: 22px;">🌟</span>
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="dimension">Mediana (~80 cm)</span>
                <span class="pinata-size-badge-rec">RECOMENDADA</span>
              </div>
              <span class="capacity">Capacidad aprox: 3 a 5 kg de dulces • Estándar para cumpleaños</span>
            </div>
          </div>
          <span style="font-weight: 800; color: #FDA4AF; font-size: 13px;">Desde $18</span>
        </div>

        <div class="pinata-size-pill ${sz === 'grande' ? 'selected' : ''}" onclick="PinataServiceApp.selectSize('grande')">
          <div class="pinata-size-left">
            <span style="font-size: 22px;">🏰</span>
            <div>
              <span class="dimension">Grande / Extra (~1 metro o más)</span>
              <span class="capacity">Capacidad aprox: 6 a 10 kg de dulces • Alto impacto visual</span>
            </div>
          </div>
          <span style="font-weight: 800; color: #FDA4AF; font-size: 13px;">Desde $26</span>
        </div>
      </div>
    `;
  },

  selectSize(id) {
    this.wizardState.sizeId = id;
    this.updateWizardStepView();
  },

  /* Paso 4: Sistema de Apertura y Durabilidad */
  renderStep4(el) {
    const o = this.wizardState.openingSystem;
    el.innerHTML = `
      <h3 class="pinata-step-title">Paso 4: Sistema de Apertura y Durabilidad</h3>
      <p class="pinata-step-subtitle">¿Cómo prefieres que se abra la piñata durante la celebración?</p>

      <div class="pinata-choice-grid">
        <div class="pinata-choice-card ${o === 'tradicional' ? 'selected' : ''}" onclick="PinataServiceApp.selectOpening('tradicional')">
          <div class="pinata-choice-icon">🏏</div>
          <div class="pinata-choice-info">
            <strong>Tradicional (Romper a Palo)</strong>
            <span>Estructura reforzada en cartón y papel maché de alta resistencia para el juego clásico.</span>
          </div>
        </div>

        <div class="pinata-choice-card ${o === 'cintas' ? 'selected' : ''}" onclick="PinataServiceApp.selectOpening('cintas')">
          <span class="pinata-choice-badge" style="background: #10B981;">SEGURA & LIMPIA</span>
          <div class="pinata-choice-icon">🎀</div>
          <div class="pinata-choice-info">
            <strong>Sistema de Cintas / Tiras</strong>
            <span>Apertura inferior jalando listones. Ideal para espacios interiores, salones o niños pequeños.</span>
          </div>
        </div>
      </div>
    `;
  },

  selectOpening(id) {
    this.wizardState.openingSystem = id;
    this.updateWizardStepView();
  },

  /* Paso 5: Relleno y Extras */
  renderStep5(el) {
    const f = this.wizardState.filling;
    const ex = this.wizardState.extras;
    el.innerHTML = `
      <h3 class="pinata-step-title">Paso 5: Opciones de Relleno y Extras</h3>
      <p class="pinata-step-subtitle">Agrega caramelos y complementos festivos listos para usar.</p>

      <label class="pinata-input-label">Relleno de Confitería:</label>
      <div class="pinata-extras-group">
        <div class="pinata-extra-checkbox-item ${f === 'empty' ? 'selected' : ''}" onclick="PinataServiceApp.selectFilling('empty')">
          <div class="pinata-extra-left">
            <input type="radio" name="filling-opt" ${f === 'empty' ? 'checked' : ''}>
            <div>
              <strong style="font-size: 13px; color: #fff;">Solo la piñata vacía</strong>
              <span style="font-size: 11px; color: #94a3b8; display: block;">Tú colocas los dulces y sorpresas en casa.</span>
            </div>
          </div>
          <span class="pinata-extra-price">$0 USD</span>
        </div>

        <div class="pinata-extra-checkbox-item ${f === 'candies' ? 'selected' : ''}" onclick="PinataServiceApp.selectFilling('candies')">
          <div class="pinata-extra-left">
            <input type="radio" name="filling-opt" ${f === 'candies' ? 'checked' : ''}>
            <div>
              <strong style="font-size: 13px; color: #fff;">🍬 Incluir paquete de caramelos surtidos</strong>
              <span style="font-size: 11px; color: #94a3b8; display: block;">Mix de chupetas, gomitas, chocolates y caramelos seleccionados.</span>
            </div>
          </div>
          <span class="pinata-extra-price">+ $6.00 USD</span>
        </div>
      </div>

      <label class="pinata-input-label" style="margin-top: 18px;">Complementos Adicionales:</label>
      <div class="pinata-extras-group">
        <div class="pinata-extra-checkbox-item ${ex.includes('palo') ? 'selected' : ''}" onclick="PinataServiceApp.toggleExtra('palo')">
          <div class="pinata-extra-left">
            <input type="checkbox" ${ex.includes('palo') ? 'checked' : ''}>
            <div>
              <strong style="font-size: 13px; color: #fff;">🏏 Palo temático decorado a juego</strong>
              <span style="font-size: 11px; color: #94a3b8; display: block;">Forrado con los mismos colores y flecos de la piñata.</span>
            </div>
          </div>
          <span class="pinata-extra-price">+ $2.50 USD</span>
        </div>

        <div class="pinata-extra-checkbox-item ${ex.includes('antifaz') ? 'selected' : ''}" onclick="PinataServiceApp.toggleExtra('antifaz')">
          <div class="pinata-extra-left">
            <input type="checkbox" ${ex.includes('antifaz') ? 'checked' : ''}>
            <div>
              <strong style="font-size: 13px; color: #fff;">🎭 Antifaz / venda decorada</strong>
              <span style="font-size: 11px; color: #94a3b8; display: block;">Venda cómoda decorada al estilo de la fiesta.</span>
            </div>
          </div>
          <span class="pinata-extra-price">+ $1.50 USD</span>
        </div>

        <div class="pinata-extra-checkbox-item ${ex.includes('confeti') ? 'selected' : ''}" onclick="PinataServiceApp.toggleExtra('confeti')">
          <div class="pinata-extra-left">
            <input type="checkbox" ${ex.includes('confeti') ? 'checked' : ''}>
            <div>
              <strong style="font-size: 13px; color: #fff;">🎉 Paquete de confeti festivo</strong>
              <span style="font-size: 11px; color: #94a3b8; display: block;">Lluvia de papel multicolor para el interior.</span>
            </div>
          </div>
          <span class="pinata-extra-price">+ $1.00 USD</span>
        </div>
      </div>
    `;
  },

  selectFilling(id) {
    this.wizardState.filling = id;
    this.updateWizardStepView();
  },

  toggleExtra(id) {
    const idx = this.wizardState.extras.indexOf(id);
    if (idx > -1) {
      this.wizardState.extras.splice(idx, 1);
    } else {
      this.wizardState.extras.push(id);
    }
    this.updateWizardStepView();
  },

  /* Paso 6: Fecha del Evento y Estimación Referencial */
  renderStep6(el) {
    const pricing = this.calculatePricing();
    const styleObj = this.getStyleObject(this.wizardState.styleId);
    const sizeObj = this.getSizeObject(this.wizardState.sizeId);

    // Default min date 2 days from now
    const minDate = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];

    el.innerHTML = `
      <h3 class="pinata-step-title">Paso 6: Fecha del Evento y Presupuesto</h3>
      <p class="pinata-step-subtitle">Revisa el resumen y pide tu cotización formal para apartar la fecha en taller.</p>

      <label class="pinata-input-label">¿Para qué fecha necesitas tener tu piñata lista? *</label>
      <div class="pinata-date-picker-wrap">
        <input type="date" id="pinata-input-date" min="${minDate}" value="${this.wizardState.eventDate || minDate}" onchange="PinataServiceApp.wizardState.eventDate = this.value">
      </div>

      <div class="pinata-warning-badge">
        <span style="font-size: 16px;">⏳</span>
        <span>Recomendamos solicitar tu pedido con al menos <strong>3 a 5 días de anticipación</strong> para garantizar el correcto secado y acabado artesanal del papel maché.</span>
      </div>

      <!-- Live Summary Card -->
      <div class="pinata-summary-card">
        <div class="pinata-summary-row">
          <span>Temática:</span>
          <strong>${this.wizardState.theme || 'Personalizada libre'}</strong>
        </div>
        ${this.wizardState.customName ? `
          <div class="pinata-summary-row">
            <span>Nombre / Número:</span>
            <strong>"${this.wizardState.customName}"</strong>
          </div>
        ` : ''}
        <div class="pinata-summary-row">
          <span>Estilo:</span>
          <strong>${styleObj.name}</strong>
        </div>
        <div class="pinata-summary-row">
          <span>Tamaño:</span>
          <strong>${sizeObj.name}</strong>
        </div>
        <div class="pinata-summary-row">
          <span>Apertura:</span>
          <strong>${this.wizardState.openingSystem === 'cintas' ? 'Cintas de Seguridad' : 'Tradicional (Palo)'}</strong>
        </div>
        <div class="pinata-summary-row">
          <span>Relleno / Extras:</span>
          <strong>${this.getExtrasSummary()}</strong>
        </div>
        <div class="pinata-summary-row">
          <span>Fotos adjuntas:</span>
          <strong>${this.wizardState.photos.length} foto(s) de referencia</strong>
        </div>

        <!-- Estimated Price Box -->
        <div class="pinata-price-estimate-box">
          <span class="title">Rango de Precio Estimado</span>
          <div class="range">${pricing.rangeUsd}</div>
          <span class="equiv">~${pricing.rangeCop} • ${pricing.rangeBs}</span>
        </div>

        <p class="pinata-legal-disclaimer">
          * Tarifa estimada referencial. El monto final se confirma con la creadora dentro del chat tras evaluar los detalles y la complejidad del diseño solicitado.
        </p>
      </div>

      <!-- Action Button Options -->
      <div style="margin-top: 14px; display: flex; flex-direction: column; gap: 8px;">
        <button type="button" class="btn-pinata-hero-cta" onclick="PinataServiceApp.submitInAppQuote()" style="margin: 0; background: linear-gradient(135deg, #10B981 0%, #059669 100%); box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);">
          <span>💬</span>
          <span>Pedir cotización por Chat en la App</span>
        </button>
        <button type="button" onclick="PinataServiceApp.sendViaWhatsApp()" style="background: rgba(37, 211, 102, 0.15); border: 1.5px solid #25D366; color: #25D366; padding: 10px; border-radius: 12px; font-weight: 800; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <span>📲</span>
          <span>Enviar también por WhatsApp (+57 322 794 9751)</span>
        </button>
      </div>
    `;
  },

  calculatePricing() {
    let base = 18.0;
    if (this.wizardState.styleId === '2d') base = 14.0;
    if (this.wizardState.styleId === '3d') base = 20.0;
    if (this.wizardState.styleId === 'numero') base = 16.0;
    if (this.wizardState.styleId === 'mini') base = 8.0;

    // Size adjustment
    if (this.wizardState.sizeId === 'pequena') base -= 4.0;
    if (this.wizardState.sizeId === 'grande') base += 8.0;

    // Filling
    if (this.wizardState.filling === 'candies') base += 6.0;

    // Extras
    if (this.wizardState.extras.includes('palo')) base += 2.5;
    if (this.wizardState.extras.includes('antifaz')) base += 1.5;
    if (this.wizardState.extras.includes('confeti')) base += 1.0;

    const minUsd = Math.max(8, base - 2);
    const maxUsd = base + 4;

    const rangeUsd = `$${minUsd.toFixed(2)} - $${maxUsd.toFixed(2)} USD`;
    const rangeCop = `$${Math.round(minUsd * 4000).toLocaleString('es-CO')} - $${Math.round(maxUsd * 4000).toLocaleString('es-CO')} COP`;
    const rangeBs = `${Math.round(minUsd * 45).toLocaleString('es-VE')} - ${Math.round(maxUsd * 45).toLocaleString('es-VE')} Bs`;

    return { base, minUsd, maxUsd, rangeUsd, rangeCop, rangeBs };
  },

  getStyleObject(id) {
    const map = {
      '2d': { name: 'Silueta / Relieve (2D)' },
      '3d': { name: 'Escultural / Volumen (3D)' },
      'numero': { name: 'Número o Letra Personalizada' },
      'mini': { name: 'Mini-Piñata' }
    };
    return map[id] || { name: 'Personalizado' };
  },

  getSizeObject(id) {
    const map = {
      'pequena': { name: 'Pequeña (~50 cm)' },
      'mediana': { name: 'Mediana (~80 cm)' },
      'grande': { name: 'Grande (~1 metro o más)' }
    };
    return map[id] || { name: 'Estándar' };
  },

  getExtrasSummary() {
    const parts = [];
    if (this.wizardState.filling === 'candies') parts.push('Dulces incluidos');
    if (this.wizardState.extras.includes('palo')) parts.push('Palo decorado');
    if (this.wizardState.extras.includes('antifaz')) parts.push('Antifaz');
    if (this.wizardState.extras.includes('confeti')) parts.push('Confeti');
    return parts.length ? parts.join(', ') : 'Solo piñata vacía';
  },

  prevStep() {
    if (this.currentWizardStep > 1) {
      this.currentWizardStep--;
      this.updateWizardStepView();
    } else {
      this.closeWizard();
    }
  },

  nextStep() {
    if (this.currentWizardStep === 1) {
      if (!this.wizardState.theme.trim()) {
        alert('Por favor describe la temática o motivo de tu piñata para continuar.');
        return;
      }
    }

    if (this.currentWizardStep < 6) {
      this.currentWizardStep++;
      this.updateWizardStepView();
    } else {
      this.submitInAppQuote();
    }
  },

  async submitInAppQuote() {
    const pricing = this.calculatePricing();
    const styleObj = this.getStyleObject(this.wizardState.styleId);
    const sizeObj = this.getSizeObject(this.wizardState.sizeId);

    const clientName = localStorage.getItem('customer_name') || prompt('Por favor ingresa tu Nombre:') || 'Cliente PediGochos';
    const clientPhone = localStorage.getItem('customer_phone') || prompt('Ingresa tu Teléfono / WhatsApp:') || '3227949751';

    if (!clientName.trim()) return;

    localStorage.setItem('customer_name', clientName);
    if (clientPhone) localStorage.setItem('customer_phone', clientPhone);

    const payload = {
      clientName,
      clientPhone,
      theme: this.wizardState.theme,
      customName: this.wizardState.customName,
      styleId: this.wizardState.styleId,
      styleName: styleObj.name,
      sizeId: this.wizardState.sizeId,
      sizeName: sizeObj.name,
      capacity: this.wizardState.sizeId === 'grande' ? '6 a 10 kg' : (this.wizardState.sizeId === 'pequena' ? '1 a 2 kg' : '3 a 5 kg'),
      openingSystem: this.wizardState.openingSystem,
      openingName: this.wizardState.openingSystem === 'cintas' ? 'Sistema de Cintas / Tiras' : 'Tradicional (Palo)',
      filling: this.wizardState.filling,
      fillingName: this.wizardState.filling === 'candies' ? 'Incluir paquete de caramelos surtidos' : 'Solo piñata vacía',
      extras: this.wizardState.extras,
      extrasSummary: this.getExtrasSummary(),
      eventDate: this.wizardState.eventDate || document.getElementById('pinata-input-date')?.value || '',
      referencePhotos: this.wizardState.photos,
      estimatedPriceUsd: pricing.base,
      estimatedPriceRange: pricing.rangeUsd
    };

    try {
      const res = await fetch('/api/pinata-services/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.quote) {
        this.activeQuote = data.quote;
        this.closeWizard();
        this.openChatModal(data.quote);
      }
    } catch(e) {
      console.error('Error submitting pinata order:', e);
      alert('Error enviando cotización. Por favor verifica tu conexión o envía por WhatsApp.');
    }
  },

  sendViaWhatsApp() {
    const pricing = this.calculatePricing();
    const styleObj = this.getStyleObject(this.wizardState.styleId);
    const sizeObj = this.getSizeObject(this.wizardState.sizeId);
    const clientName = localStorage.getItem('customer_name') || '';

    const text =
`🪅 *¡NUEVA COTIZACIÓN DE PIÑATA PERSONALIZADA!* 🪅
━━━━━━━━━━━━━━━━━━━━
🎨 *Temática / Motivo:* ${this.wizardState.theme}
${this.wizardState.customName ? `✍️ *Nombre/Número:* "${this.wizardState.customName}"\n` : ''}📐 *Formato / Estilo:* ${styleObj.name}
📏 *Tamaño:* ${sizeObj.name}
🎀 *Sistema de Apertura:* ${this.wizardState.openingSystem === 'cintas' ? 'Sistema de Cintas (Tiras)' : 'Tradicional (Romper a Palo)'}
🍬 *Relleno & Extras:* ${this.getExtrasSummary()}
📅 *Fecha del Evento:* ${this.wizardState.eventDate || 'A coordinar'}
━━━━━━━━━━━━━━━━━━━━
💰 *Presupuesto Estimado:* ${pricing.rangeUsd}
💵 *Equivalente:* ~${pricing.rangeCop} • ${pricing.rangeBs}
${clientName ? `👤 *Cliente:* ${clientName}\n` : ''}━━━━━━━━━━━━━━━━━━━━
📍 *Enviado desde PediGochos App* (San Antonio / Cúcuta / Frontera)
💬 *Taller Artesanal WhatsApp: +57 322 794 9751*

Hola, ¿podrían confirmarme la disponibilidad y precio final para esta piñata? ¡Muchas gracias!`;

    const waUrl = `https://wa.me/${this.whatsAppNumber}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  },

  /* ==========================================================================
     INTEGRATED CHAT MODAL
     ========================================================================== */
  openChatModal(quote) {
    this.activeQuote = quote;
    let modal = document.getElementById('pinata-chat-modal');
    if (!modal) {
      this.renderChatModalMarkup();
      modal = document.getElementById('pinata-chat-modal');
    }
    this.renderFichaTecnica(quote);
    this.loadChatMessages(quote.id);
    modal.classList.remove('hidden');
    window.history.pushState({ chat: quote.id }, '', `/mensajes/${quote.chatId || quote.id}`);
  },

  closeChatModal() {
    const modal = document.getElementById('pinata-chat-modal');
    if (modal) modal.classList.add('hidden');
    if (window.location.pathname.startsWith('/mensajes/')) {
      window.history.pushState(null, '', window.location.pathname);
    }
  },

  renderChatModalMarkup() {
    const div = document.createElement('div');
    div.id = 'pinata-chat-modal';
    div.className = 'pinata-chat-modal';
    div.innerHTML = `
      <header class="pinata-chat-header">
        <div class="pinata-chat-header-left">
          <button type="button" class="pinata-close-btn" onclick="PinataServiceApp.closeChatModal()" style="font-size: 14px;">←</button>
          <div>
            <h3 style="margin: 0; font-size: 15px; font-weight: 800; color: #FFF; display: flex; align-items: center; gap: 6px;">
              <span>🪅</span> Chat con Taller de Piñatas
            </h3>
            <span style="font-size: 11px; color: #34D399; font-weight: 700;">🟢 En Taller • Creadora Artesanal</span>
          </div>
        </div>
        <button type="button" onclick="PinataServiceApp.closeChatModal()" style="background: none; border: none; color: #94A3B8; font-size: 18px; cursor: pointer;">✕</button>
      </header>

      <main class="pinata-chat-body">
        <div class="pinata-ficha-card" id="pinata-ficha-container"></div>
        <div class="pinata-messages-feed" id="pinata-chat-feed"></div>

        <form class="pinata-chat-bar" onsubmit="event.preventDefault(); PinataServiceApp.sendMessage();">
          <input type="text" id="pinata-chat-input" class="pinata-chat-input" placeholder="Escribe un mensaje o pregunta sobre acabados y entrega...">
          <button type="submit" class="btn-send-pinata-msg" title="Enviar">➤</button>
        </form>
      </main>
    `;
    document.body.appendChild(div);
  },

  renderFichaTecnica(quote) {
    const el = document.getElementById('pinata-ficha-container');
    if (!el) return;

    const statusClass = quote.status === 'En Elaboración' ? 'status-elaboracion' : 
      (quote.status === 'Precio Acordado' ? 'status-acordado' : 
      (quote.status === 'Listo / Entregado' ? 'status-entregado' : 
      (quote.status === 'En Conversación' ? 'status-conversacion' : 'status-enviada')));

    const photosHtml = (quote.referencePhotos && quote.referencePhotos.length) 
      ? `<div class="pinata-ficha-photos">
          ${quote.referencePhotos.map(p => `<img src="${p}" onclick="window.open('${p}', '_blank')">`).join('')}
        </div>`
      : '';

    el.innerHTML = `
      <div class="pinata-ficha-header">
        <div>
          <strong style="color: #FFF; font-size: 14px;">Orden #${quote.id} • ${quote.styleName || 'Piñata a Medida'}</strong>
          <div style="font-size: 11px; color: #FDA4AF; margin-top: 2px;">Motivo: "${quote.theme}"</div>
        </div>
        <span class="pinata-ficha-status ${statusClass}">${quote.status}</span>
      </div>

      <div class="pinata-ficha-grid">
        <div>Tamaño: <strong style="color: #FFF;">${quote.sizeName}</strong></div>
        <div>Apertura: <strong style="color: #FFF;">${quote.openingName}</strong></div>
        <div>Fecha Requerida: <strong style="color: #FCD34D;">${quote.eventDate || 'Por coordinar'}</strong></div>
        <div>Monto Acordado: <strong style="color: #10B981;">${quote.agreedPriceUsd ? `$${quote.agreedPriceUsd.toFixed(2)} USD` : (quote.estimatedPriceRange || 'Referencial')}</strong></div>
      </div>

      ${quote.customName ? `<div style="font-size: 11px; color: #E2E8F0; margin-top: 4px;">Nombre / Número a incluir: <strong>"${quote.customName}"</strong></div>` : ''}
      ${photosHtml}

      <!-- Craftswoman Action Bar inside Chat -->
      <div class="pinata-craft-actions-toolbar">
        <button type="button" class="btn-craft-action btn-craft-adjust" onclick="PinataServiceApp.promptAdjustPrice('${quote.id}')">
          💰 Ajustar / Confirmar Precio Final
        </button>
        <button type="button" class="btn-craft-action btn-craft-accept" onclick="PinataServiceApp.promptStartProduction('${quote.id}')">
          ✂️ Aceptar Pedido / En Elaboración
        </button>
        <button type="button" class="btn-craft-action btn-craft-deliver" onclick="PinataServiceApp.markDelivered('${quote.id}')">
          🎉 Listo / Entregado
        </button>
      </div>
    `;
  },

  async loadChatMessages(quoteId) {
    const area = document.getElementById('pinata-chat-feed');
    if (!area) return;

    try {
      const res = await fetch(`/api/pinata-services/quotes/${quoteId}`);
      const quote = await res.json();
      area.innerHTML = '';
      (quote.messages || []).forEach(msg => {
        this.appendChatMessage(msg);
      });
      area.scrollTop = area.scrollHeight;
    } catch(e) {
      console.warn('Could not load chat messages:', e);
    }
  },

  appendChatMessage(msg) {
    const area = document.getElementById('pinata-chat-feed');
    if (!area) return;

    const isIncoming = msg.senderRole === 'workshop' || msg.senderRole === 'admin' || msg.senderRole === 'system';
    const div = document.createElement('div');
    div.className = `pinata-bubble ${isIncoming ? 'pinata-bubble-in' : 'pinata-bubble-out'}`;
    
    div.innerHTML = `
      <div>${msg.text}</div>
      <div class="pinata-bubble-meta">
        <span>${msg.senderName || (isIncoming ? '🪅 Taller' : '👤 Tú')}</span> •
        <span>${new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    `;
    area.appendChild(div);
    area.scrollTop = area.scrollHeight;
  },

  async sendMessage() {
    const input = document.getElementById('pinata-chat-input');
    if (!input || !this.activeQuote) return;
    const text = input.value.trim();
    if (!text) return;

    const payload = {
      text,
      senderRole: 'client',
      senderName: localStorage.getItem('customer_name') || 'Cliente'
    };

    try {
      input.value = '';
      const res = await fetch(`/api/pinata-services/quotes/${this.activeQuote.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.message) {
        this.appendChatMessage(data.message);
      }
    } catch(e) {
      console.error('Error sending pinata message:', e);
    }
  },

  async promptAdjustPrice(quoteId) {
    const priceStr = prompt('Ingresa el monto final acordado en USD (ej. 22.50):');
    if (!priceStr) return;
    const price = parseFloat(priceStr);
    if (isNaN(price) || price <= 0) {
      alert('Monto inválido.');
      return;
    }

    try {
      const res = await fetch(`/api/pinata-services/quotes/${quoteId}/action`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'adjust_price', agreedPriceUsd: price })
      });
      const data = await res.json();
      if (data.quote) {
        this.activeQuote = data.quote;
        this.renderFichaTecnica(data.quote);
        this.loadChatMessages(quoteId);
      }
    } catch(e) {
      console.error('Error adjusting price:', e);
    }
  },

  async promptStartProduction(quoteId) {
    const delivery = prompt('Confirma la fecha de entrega acordada (YYYY-MM-DD):', this.activeQuote?.eventDate || '');
    try {
      const res = await fetch(`/api/pinata-services/quotes/${quoteId}/action`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_production', deliveryDate: delivery })
      });
      const data = await res.json();
      if (data.quote) {
        this.activeQuote = data.quote;
        this.renderFichaTecnica(data.quote);
        this.loadChatMessages(quoteId);
      }
    } catch(e) {
      console.error('Error starting production:', e);
    }
  },

  async markDelivered(quoteId) {
    if (!confirm('¿Deseas marcar esta orden como Entregada satisfactoriamente?')) return;
    try {
      const res = await fetch(`/api/pinata-services/quotes/${quoteId}/action`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_delivered' })
      });
      const data = await res.json();
      if (data.quote) {
        this.activeQuote = data.quote;
        this.renderFichaTecnica(data.quote);
        this.loadChatMessages(quoteId);
      }
    } catch(e) {
      console.error('Error marking delivered:', e);
    }
  }
};

// Auto initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => PinataServiceApp.init());
} else {
  PinataServiceApp.init();
}
