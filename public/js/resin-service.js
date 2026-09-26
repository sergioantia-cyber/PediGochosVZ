/* ==========================================================================
   Llaveros y Arte en Resina ("ShelliArt Resina") - Logic & Customizer
   PediGochos Specialized Services Module
   ========================================================================== */

const ResinServiceApp = {
  activeQuote: null,
  ws: null,

  alphabet: ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'],

  colors: [
    { name: 'Rosa Pastel', hex: '#F472B6', textColor: '#FFF' },
    { name: 'Azul Rey', hex: '#2563EB', textColor: '#FFF' },
    { name: 'Negro Ónix', hex: '#18181B', textColor: '#FFF' },
    { name: 'Blanco Perla', hex: '#F8FAFC', textColor: '#000' },
    { name: 'Lila Mágico', hex: '#C084FC', textColor: '#FFF' },
    { name: 'Verde Menta', hex: '#34D399', textColor: '#000' },
    { name: 'Amarillo Sol', hex: '#FACC15', textColor: '#000' },
    { name: 'Rojo Pasión', hex: '#EF4444', textColor: '#FFF' },
    { name: 'Dorado Silk', hex: '#EAB308', textColor: '#000' },
    { name: 'Esmeralda', hex: '#059669', textColor: '#FFF' }
  ],

  styles: [
    {
      id: 'bicolor',
      name: 'Bicolor con Glitter & Hoja de Oro',
      desc: 'Mitad color sólido y mitad cristal transparente con destellos'
    },
    {
      id: 'gold_flakes',
      name: 'Hoja de Oro 24K Encapsulada',
      desc: 'Elegante baño de láminas doradas flotando en resina'
    },
    {
      id: 'glitter_full',
      name: 'Glitter Holográfico Completo',
      desc: 'Brillo ultra reflectante en toda la pieza'
    },
    {
      id: 'silver_flakes',
      name: 'Hoja de Plata Glacial',
      desc: 'Copos de plata con acabado moderno y frío'
    },
    {
      id: 'flowers',
      name: 'Mini Flores Silvestres',
      desc: 'Flores secas naturales prensadas (Girasol, Margaritas)'
    },
    {
      id: 'crystal',
      name: 'Resina Cristalina Pulida',
      desc: 'Transparencia óptica con sutil toque perlado'
    }
  ],

  tassels: [
    { name: 'Rosa Pastel', hex: '#F472B6' },
    { name: 'Celeste Suave', hex: '#38BDF8' },
    { name: 'Menta Fresco', hex: '#34D399' },
    { name: 'Lila Claro', hex: '#C084FC' },
    { name: 'Negro Elegante', hex: '#18181B' },
    { name: 'Dorado Ocre', hex: '#EAB308' },
    { name: 'Durazno Cálido', hex: '#FB923C' },
    { name: 'Mostaza Chic', hex: '#CA8A04' }
  ],

  charms: [
    { id: 'none', name: 'Ninguno', icon: '❌', extraUsd: 0.0 },
    { id: 'corazon', name: 'Mini Corazón con Glitter', icon: '💖', extraUsd: 0.8 },
    { id: 'huesito', name: 'Mini Huesito de Mascota', icon: '🦴', extraUsd: 0.8 },
    { id: 'estrella', name: 'Mini Estrella Holográfica', icon: '⭐', extraUsd: 0.8 }
  ],

  // Current customization state
  state: {
    letter: 'S',
    styleId: 'bicolor',
    baseColorHex: '#F472B6',
    baseColorName: 'Rosa Pastel',
    inclusions: 'Hojas de Oro 24K + Glitter',
    tasselName: 'Rosa Pastel',
    tasselHex: '#F472B6',
    hardware: 'gold', // 'gold' | 'silver'
    customName: '',
    extraCharmId: 'none',
    quantity: 1
  },

  init() {
    this.setupWebSocket();
    this.checkHashRoute();
    window.addEventListener('hashchange', () => this.checkHashRoute());
  },

  checkHashRoute() {
    const hash = window.location.hash || '';
    if (hash === '#servicios/resina' || hash.startsWith('#servicios/resina')) {
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
          if (data.type === 'RESIN_QUOTE_MESSAGE' && this.activeQuote && data.quoteId === this.activeQuote.id) {
            this.appendChatMessage(data.message);
          } else if (data.type === 'RESIN_QUOTE_UPDATE' && this.activeQuote && data.quote.id === this.activeQuote.id) {
            this.activeQuote = data.quote;
            this.updateFichaTecnica(data.quote);
          }
        } catch(e) {
          console.warn('WS resin message parse error:', e);
        }
      };

      this.ws.onclose = () => {
        setTimeout(() => this.setupWebSocket(), 5000);
      };
    } catch(e) {
      console.warn('WS resin connect error:', e);
    }
  },

  open() {
    let modal = document.getElementById('resin-service-modal');
    if (!modal) {
      this.renderMainModalMarkup();
      modal = document.getElementById('resin-service-modal');
    }
    if (modal) {
      modal.classList.remove('hidden');
      window.history.pushState({ modal: 'resin-service' }, '', '#servicios/resina');
      this.updateVisualPreview();
    }
  },

  close() {
    const modal = document.getElementById('resin-service-modal');
    if (modal) modal.classList.add('hidden');
    if (window.location.hash.startsWith('#servicios/resina')) {
      window.history.pushState(null, '', window.location.pathname);
    }
  },

  renderMainModalMarkup() {
    const modal = document.createElement('div');
    modal.id = 'resin-service-modal';
    modal.className = 'resin-service-modal hidden';
    modal.innerHTML = `
      <!-- Header -->
      <header class="resin-header">
        <div class="resin-header-brand">
          <span class="resin-brand-icon">✨</span>
          <div>
            <h2>ShelliArt <span>Resina</span></h2>
            <p>Hecho a Mano con Amor • Cúcuta / San Antonio / Ureña</p>
          </div>
        </div>
        <button type="button" class="resin-close-btn" onclick="ResinServiceApp.close()">✕</button>
      </header>

      <!-- Main Container -->
      <div class="resin-container">

        <!-- Hero Card -->
        <div class="resin-hero-card">
          <div class="resin-hero-badge">💎 Pedidos 100% Personalizados</div>
          <h3>Diseña tu Llavero de Letra en Resina</h3>
          <p>
            Elige cualquier letra del abecedario, tus colores favoritos, baño en pan de oro 24K, escarchas holográficas, tu nombre y borla de gamuza.
          </p>
        </div>

        <!-- Interactive Keychain Visual Stage -->
        <div class="resin-preview-stage">
          <span class="resin-live-tag">🟢 Vista Previa en Vivo</span>

          <div class="keychain-visual-wrapper">
            <!-- Metallic Ring -->
            <div class="keychain-ring-top" id="mockup-ring"></div>
            <!-- Metallic Link -->
            <div class="keychain-chain-link" id="mockup-chain"></div>

            <!-- Big Resin Letter -->
            <div class="resin-letter-glyph-box" id="mockup-letter-box">
              <div class="flakes-layer" id="mockup-flakes"></div>
              <span class="resin-big-char" id="mockup-big-char">S</span>
              <div class="resin-custom-name-tag hidden" id="mockup-custom-name">SOFÍA</div>
            </div>

            <!-- Accessories: Tassel & Extra Charm -->
            <div class="keychain-accessories-row">
              <div class="keychain-tassel" id="mockup-tassel" title="Borla de gamuza"></div>
              <div class="keychain-charm-badge hidden" id="mockup-charm">💖 Corazón</div>
            </div>
          </div>

          <div style="font-size: 11.5px; color: #FDA4AF; font-weight: 700; margin-top: 6px;">
            ✨ Brillo espejo cristalino con protección anti-amarilleo UV
          </div>
        </div>

        <!-- 1. Alphabet Letter Picker -->
        <div class="resin-section-card">
          <div class="resin-section-title">
            <span>1. Elige tu Letra / Inicial</span>
            <span class="badge-opt">Letra Activa: <strong id="lbl-active-letter" style="color: #FFF; font-size: 14px;">S</strong></span>
          </div>
          <div class="alphabet-grid" id="resin-alphabet-grid">
            ${this.alphabet.map(char => `
              <button type="button" class="btn-letter-pick ${char === 'S' ? 'active' : ''}" onclick="ResinServiceApp.setLetter('${char}')">
                ${char}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- 2. Resin Style Selection -->
        <div class="resin-section-card">
          <div class="resin-section-title">
            <span>2. Estilo de Vaciado & Textura</span>
          </div>
          <div class="resin-styles-grid">
            ${this.styles.map(st => `
              <div class="resin-style-card ${st.id === 'bicolor' ? 'active' : ''}" id="style-card-${st.id}" onclick="ResinServiceApp.setStyle('${st.id}')">
                <strong>${st.name}</strong>
                <span>${st.desc}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- 3. Base Color Pigment -->
        <div class="resin-section-card">
          <div class="resin-section-title">
            <span>3. Color / Pigmento Base</span>
            <span class="badge-opt" id="lbl-active-color">Rosa Pastel</span>
          </div>
          <div class="swatches-scroll-row">
            ${this.colors.map(c => `
              <div class="color-swatch-pill ${c.name === 'Rosa Pastel' ? 'active' : ''}" id="color-pill-${c.hex.replace('#','')}" onclick="ResinServiceApp.setColor('${c.hex}', '${c.name}')">
                <span class="swatch-circle" style="background: ${c.hex};"></span>
                <span>${c.name}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- 4. Tassel (Borla de Gamuza) Color -->
        <div class="resin-section-card">
          <div class="resin-section-title">
            <span>4. Color de la Borla Decorativa (Tassel)</span>
            <span class="badge-opt" id="lbl-active-tassel">Rosa Pastel</span>
          </div>
          <div class="swatches-scroll-row">
            ${this.tassels.map(t => `
              <div class="color-swatch-pill ${t.name === 'Rosa Pastel' ? 'active' : ''}" id="tassel-pill-${t.hex.replace('#','')}" onclick="ResinServiceApp.setTassel('${t.hex}', '${t.name}')">
                <span class="swatch-circle" style="background: ${t.hex};"></span>
                <span>${t.name}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- 5. Hardware & Extras -->
        <div class="resin-section-card">
          <div class="resin-section-title">
            <span>5. Herraje Metálico & Dije Extra</span>
          </div>

          <div style="margin-bottom: 12px;">
            <label style="font-size: 11px; color: #94A3B8; font-weight: 700; display: block; margin-bottom: 6px;">COLOR DEL HERRAJE (ARGOLLA Y CADENA)</label>
            <div style="display: flex; gap: 10px;">
              <button type="button" class="color-swatch-pill active" id="btn-metal-gold" onclick="ResinServiceApp.setHardware('gold')" style="flex: 1; justify-content: center;">
                ✨ Dorado Clásico
              </button>
              <button type="button" class="color-swatch-pill" id="btn-metal-silver" onclick="ResinServiceApp.setHardware('silver')" style="flex: 1; justify-content: center;">
                🔘 Plateado Cromado
              </button>
            </div>
          </div>

          <div style="margin-bottom: 12px;">
            <label style="font-size: 11px; color: #94A3B8; font-weight: 700; display: block; margin-bottom: 6px;">DIJE ADICIONAL DECORATIVO (OPCIONAL)</label>
            <div class="swatches-scroll-row">
              ${this.charms.map(ch => `
                <div class="color-swatch-pill ${ch.id === 'none' ? 'active' : ''}" id="charm-pill-${ch.id}" onclick="ResinServiceApp.setCharm('${ch.id}')">
                  <span>${ch.icon}</span>
                  <span>${ch.name} ${ch.extraUsd > 0 ? `(+$${ch.extraUsd} USD)` : ''}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div>
            <label style="font-size: 11px; color: #94A3B8; font-weight: 700; display: block; margin-bottom: 6px;">NOMBRE PERSONALIZADO SOBRE LA LETRA (OPCIONAL)</label>
            <input type="text" class="resin-input-text" id="input-custom-name" placeholder="Ej. Camila, Sofía, Andrés (en vinil sellado)" maxlength="14" oninput="ResinServiceApp.handleCustomNameInput(this.value)">
          </div>
        </div>

      </div>

      <!-- Sticky Bottom Price & Dual CTAs Bar -->
      <footer class="resin-bottom-bar">
        <div class="resin-bottom-pricing">
          <span class="resin-price-total" id="resin-total-usd">$4.50 USD</span>
          <span class="resin-price-cop" id="resin-total-cop">~$18.000 COP • 202 Bs</span>
        </div>

        <div class="resin-bottom-actions">
          <button type="button" class="btn-resin-order-app" onclick="ResinServiceApp.submitInAppOrder()">
            <span>🛍️</span> Pedir en App
          </button>
          <a id="btn-resin-wa-link" href="#" target="_blank" rel="noopener noreferrer" class="btn-resin-order-wa">
            <span>🟢</span> WhatsApp
          </a>
        </div>
      </footer>
    `;

    document.body.appendChild(modal);
  },

  setLetter(letter) {
    this.state.letter = letter.toUpperCase();
    document.querySelectorAll('.btn-letter-pick').forEach(b => {
      b.classList.toggle('active', b.textContent.trim() === this.state.letter);
    });
    const lbl = document.getElementById('lbl-active-letter');
    if (lbl) lbl.textContent = this.state.letter;
    this.updateVisualPreview();
  },

  setStyle(styleId) {
    this.state.styleId = styleId;
    document.querySelectorAll('.resin-style-card').forEach(c => c.classList.remove('active'));
    const target = document.getElementById(`style-card-${styleId}`);
    if (target) target.classList.add('active');

    const styleObj = this.styles.find(s => s.id === styleId);
    if (styleObj) this.state.inclusions = styleObj.name;
    this.updateVisualPreview();
  },

  setColor(hex, name) {
    this.state.baseColorHex = hex;
    this.state.baseColorName = name;
    document.querySelectorAll('[id^="color-pill-"]').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(`color-pill-${hex.replace('#','')}`);
    if (target) target.classList.add('active');
    const lbl = document.getElementById('lbl-active-color');
    if (lbl) lbl.textContent = name;
    this.updateVisualPreview();
  },

  setTassel(hex, name) {
    this.state.tasselHex = hex;
    this.state.tasselName = name;
    document.querySelectorAll('[id^="tassel-pill-"]').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(`tassel-pill-${hex.replace('#','')}`);
    if (target) target.classList.add('active');
    const lbl = document.getElementById('lbl-active-tassel');
    if (lbl) lbl.textContent = name;
    this.updateVisualPreview();
  },

  setHardware(metal) {
    this.state.hardware = metal;
    const goldBtn = document.getElementById('btn-metal-gold');
    const silverBtn = document.getElementById('btn-metal-silver');
    if (goldBtn) goldBtn.classList.toggle('active', metal === 'gold');
    if (silverBtn) silverBtn.classList.toggle('active', metal === 'silver');
    this.updateVisualPreview();
  },

  setCharm(charmId) {
    this.state.extraCharmId = charmId;
    document.querySelectorAll('[id^="charm-pill-"]').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(`charm-pill-${charmId}`);
    if (target) target.classList.add('active');
    this.updateVisualPreview();
  },

  handleCustomNameInput(val) {
    this.state.customName = val.trim();
    this.updateVisualPreview();
  },

  calculatePricing() {
    const basePrice = 4.5;
    const charmObj = this.charms.find(c => c.id === this.state.extraCharmId);
    const extraCharmPrice = charmObj ? charmObj.extraUsd : 0.0;
    const totalUsd = (basePrice + extraCharmPrice) * this.state.quantity;

    // Currency conversions: 1 USD ~ 4.000 COP, 45 Bs
    const totalCop = Math.round(totalUsd * 4000);
    const totalBs = Math.round(totalUsd * 45);

    return { basePrice, extraCharmPrice, totalUsd, totalCop, totalBs };
  },

  updateVisualPreview() {
    // 1. Big Char
    const bigCharEl = document.getElementById('mockup-big-char');
    if (bigCharEl) bigCharEl.textContent = this.state.letter;

    // 2. Letter Box background styling according to style & color
    const box = document.getElementById('mockup-letter-box');
    const flakes = document.getElementById('mockup-flakes');
    if (box) {
      const c = this.state.baseColorHex;
      switch (this.state.styleId) {
        case 'bicolor':
          box.style.background = `linear-gradient(135deg, ${c} 0%, ${c} 48%, rgba(255,255,255,0.2) 52%, rgba(255,255,255,0.08) 100%)`;
          if (flakes) flakes.style.opacity = '1';
          break;
        case 'gold_flakes':
          box.style.background = `linear-gradient(135deg, ${c} 0%, rgba(234, 179, 8, 0.4) 100%)`;
          if (flakes) flakes.style.opacity = '1';
          break;
        case 'silver_flakes':
          box.style.background = `linear-gradient(135deg, ${c} 0%, rgba(203, 213, 225, 0.5) 100%)`;
          if (flakes) flakes.style.opacity = '0.9';
          break;
        case 'glitter_full':
          box.style.background = `linear-gradient(135deg, ${c} 0%, #EC4899 100%)`;
          if (flakes) flakes.style.opacity = '1';
          break;
        case 'flowers':
          box.style.background = `linear-gradient(135deg, rgba(255,255,255,0.2) 0%, ${c} 100%)`;
          if (flakes) flakes.style.opacity = '0.6';
          break;
        case 'crystal':
        default:
          box.style.background = `linear-gradient(135deg, rgba(255,255,255,0.15) 0%, ${c} 100%)`;
          if (flakes) flakes.style.opacity = '0.2';
          break;
      }
    }

    // 3. Hardware Ring and Chain
    const ring = document.getElementById('mockup-ring');
    const chain = document.getElementById('mockup-chain');
    const isSilver = this.state.hardware === 'silver';
    if (ring) ring.classList.toggle('silver-metal', isSilver);
    if (chain) chain.classList.toggle('silver-metal', isSilver);

    // 4. Tassel color
    const tassel = document.getElementById('mockup-tassel');
    if (tassel) {
      tassel.style.backgroundColor = this.state.tasselHex;
    }

    // 5. Custom name overlay
    const nameEl = document.getElementById('mockup-custom-name');
    if (nameEl) {
      if (this.state.customName) {
        nameEl.textContent = this.state.customName.toUpperCase();
        nameEl.classList.remove('hidden');
      } else {
        nameEl.classList.add('hidden');
      }
    }

    // 6. Charm badge
    const charmEl = document.getElementById('mockup-charm');
    const charmObj = this.charms.find(ch => ch.id === this.state.extraCharmId);
    if (charmEl) {
      if (charmObj && charmObj.id !== 'none') {
        charmEl.textContent = `${charmObj.icon} ${charmObj.name}`;
        charmEl.classList.remove('hidden');
      } else {
        charmEl.classList.add('hidden');
      }
    }

    // 7. Pricing
    const pricing = this.calculatePricing();
    const usdEl = document.getElementById('resin-total-usd');
    const copEl = document.getElementById('resin-total-cop');
    if (usdEl) usdEl.textContent = `$${pricing.totalUsd.toFixed(2)} USD`;
    if (copEl) copEl.textContent = `~$${pricing.totalCop.toLocaleString('es-CO')} COP • ${pricing.totalBs.toLocaleString('es-VE')} Bs`;

    // 8. WhatsApp Link Pre-generation
    const waLink = document.getElementById('btn-resin-wa-link');
    if (waLink) {
      const waText = encodeURIComponent(
        `✨ ¡Hola ShelliArt Resina! Me gustaría encargar un Llavero Personalizado:\n\n` +
        `• Letra / Inicial: "${this.state.letter}"\n` +
        `• Estilo: ${this.styles.find(s => s.id === this.state.styleId)?.name || 'Bicolor'}\n` +
        `• Color Base: ${this.state.baseColorName}\n` +
        `• Borla (Tassel): ${this.state.tasselName}\n` +
        `• Herraje: ${this.state.hardware === 'gold' ? 'Dorado ✨' : 'Plateado 🔘'}\n` +
        `${this.state.customName ? `• Nombre en vinil: "${this.state.customName}"\n` : ''}` +
        `${charmObj && charmObj.id !== 'none' ? `• Dije extra: ${charmObj.name}\n` : ''}` +
        `• Total Estimado: $${pricing.totalUsd.toFixed(2)} USD (~$${pricing.totalCop.toLocaleString('es-CO')} COP)\n\n` +
        `¿Cuándo lo tendrían listo para entrega?`
      );
      waLink.href = `https://wa.me/573144883492?text=${waText}`;
    }
  },

  async submitInAppOrder() {
    const pricing = this.calculatePricing();
    const charmObj = this.charms.find(ch => ch.id === this.state.extraCharmId);
    const styleObj = this.styles.find(s => s.id === this.state.styleId);

    const clientName = localStorage.getItem('customer_name') || prompt('Por favor ingresa tu Nombre:') || 'Cliente PediGochos';
    const clientPhone = localStorage.getItem('customer_phone') || prompt('Ingresa tu Teléfono / WhatsApp:') || '';

    if (!clientName.trim()) return;

    localStorage.setItem('customer_name', clientName);
    if (clientPhone) localStorage.setItem('customer_phone', clientPhone);

    const payload = {
      clientName,
      clientPhone,
      productType: 'keychain_letter',
      productTitle: `Llavero de Inicial "${this.state.letter}" en Resina`,
      letter: this.state.letter,
      resinStyle: this.state.styleId,
      styleName: styleObj?.name || 'Personalizado',
      baseColor: this.state.baseColorHex,
      baseColorName: this.state.baseColorName,
      inclusions: styleObj?.name || 'Hojas de Oro + Glitter',
      tasselColor: this.state.tasselName,
      tasselHex: this.state.tasselHex,
      hardwareColor: this.state.hardware === 'gold' ? 'Dorado Clásico ✨' : 'Plateado Cromado 🔘',
      customName: this.state.customName,
      extraCharm: charmObj ? charmObj.name : 'Ninguno',
      quantity: this.state.quantity,
      basePriceUsd: pricing.basePrice,
      extrasPriceUsd: pricing.extraCharmPrice,
      estimatedPriceUsd: pricing.totalUsd
    };

    try {
      const res = await fetch('/api/resin-services/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.quote) {
        this.activeQuote = data.quote;
        this.openChatModal(data.quote);
      }
    } catch(e) {
      console.error('Error submitting resin order:', e);
      alert('Error enviando pedido. Por favor verifica tu conexión o pide por WhatsApp.');
    }
  },

  openChatModal(quote) {
    this.activeQuote = quote;
    let modal = document.getElementById('resin-chat-modal');
    if (!modal) {
      this.renderChatModalMarkup();
      modal = document.getElementById('resin-chat-modal');
    }
    this.updateFichaTecnica(quote);
    this.loadChatMessages(quote.id);
    modal.classList.remove('hidden');
  },

  closeChatModal() {
    const modal = document.getElementById('resin-chat-modal');
    if (modal) modal.classList.add('hidden');
  },

  renderChatModalMarkup() {
    const div = document.createElement('div');
    div.id = 'resin-chat-modal';
    div.className = 'resin-chat-modal';
    div.innerHTML = `
      <header class="resin-chat-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <button type="button" class="resin-close-btn" onclick="ResinServiceApp.closeChatModal()" style="font-size: 14px;">←</button>
          <div>
            <h3 style="margin: 0; font-size: 15px; font-weight: 800; color: #FFF; display: flex; align-items: center; gap: 6px;">
              <span>💬</span> Chat con ShelliArt Resina
            </h3>
            <span style="font-size: 11px; color: #34D399; font-weight: 700;">🟢 En Taller • Cúcuta / Ureña</span>
          </div>
        </div>
        <button type="button" onclick="ResinServiceApp.closeChatModal()" style="background: none; border: none; color: #94A3B8; font-size: 18px; cursor: pointer;">✕</button>
      </header>

      <main class="resin-chat-body">
        <div class="resin-quote-sheet" id="resin-ficha-tecnica"></div>
        <div class="resin-messages-area" id="resin-chat-messages"></div>

        <form class="resin-chat-input-bar" onsubmit="event.preventDefault(); ResinServiceApp.sendMessage();">
          <input type="text" id="resin-chat-input" placeholder="Pregunta sobre combinación de colores, tiempo de secado o entrega...">
          <button type="submit" class="btn-send-resin-msg" title="Enviar">➤</button>
        </form>
      </main>
    `;
    document.body.appendChild(div);
  },

  updateFichaTecnica(quote) {
    const el = document.getElementById('resin-ficha-tecnica');
    if (!el) return;

    el.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <strong style="color: #FFF; font-size: 13.5px;">Orden #${quote.id}: Llavero Letra "${quote.letter}"</strong>
        <span style="background: rgba(244, 114, 182, 0.2); color: #F472B6; padding: 2px 8px; border-radius: 8px; font-weight: 800; font-size: 10.5px;">${quote.status}</span>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px; color: #CBD5E1;">
        <div>Color: <strong style="color: #FFF;">${quote.baseColorName}</strong></div>
        <div>Borla: <strong style="color: #FFF;">${quote.tasselColor}</strong></div>
        <div>Herraje: <strong style="color: #FFF;">${quote.hardwareColor}</strong></div>
        <div>Total: <strong style="color: #F472B6;">$${quote.agreedPriceUsd || quote.estimatedPriceUsd} USD</strong></div>
      </div>
      ${quote.customName ? `<div style="font-size: 11px; color: #FBCFE8; margin-top: 4px;">Nombre sellado: <strong>"${quote.customName}"</strong></div>` : ''}
    `;
  },

  async loadChatMessages(quoteId) {
    const area = document.getElementById('resin-chat-messages');
    if (!area) return;

    try {
      const res = await fetch(`/api/resin-services/quotes/${quoteId}`);
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
    const area = document.getElementById('resin-chat-messages');
    if (!area) return;

    const isIncoming = msg.senderRole === 'workshop' || msg.senderRole === 'admin';
    const div = document.createElement('div');
    div.className = `resin-msg-bubble ${isIncoming ? 'resin-msg-incoming' : 'resin-msg-outgoing'}`;
    div.innerHTML = `
      <div>${msg.text}</div>
      <div style="font-size: 9.5px; opacity: 0.6; margin-top: 4px; text-align: right;">
        <span>${isIncoming ? '✨ ShelliArt' : '👤 Tú'}</span> •
        <span>${new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    `;
    area.appendChild(div);
    area.scrollTop = area.scrollHeight;
  },

  async sendMessage() {
    const input = document.getElementById('resin-chat-input');
    if (!input || !this.activeQuote) return;
    const text = input.value.trim();
    if (!text) return;

    const payload = {
      text,
      senderRole: 'client',
      senderName: this.activeQuote.clientName || 'Cliente'
    };

    input.value = '';

    try {
      const res = await fetch(`/api/resin-services/quotes/${this.activeQuote.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.message) {
        this.appendChatMessage(data.message);
      }
    } catch(e) {
      console.error('Error sending message:', e);
      alert('Error enviando mensaje.');
    }
  }
};

window.ResinServiceApp = ResinServiceApp;
document.addEventListener('DOMContentLoaded', () => ResinServiceApp.init());
