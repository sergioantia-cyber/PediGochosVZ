/* ==========================================================================
   Llaveros y Arte en Resina ("ShelliArt Resina") - Logic & Customizer
   PediGochos Specialized Services Module
   ========================================================================== */

const ResinServiceApp = {
  activeQuote: null,
  ws: null,
  resinWhatsAppNumber: '573227949751',
  resinWhatsAppDisplay: '322 794 9751',

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
    letter: 'M',
    styleId: 'bicolor',
    baseColorHex: '#F472B6',
    baseColorName: 'Rosa Pastel',
    inclusions: 'Bicolor con Glitter & Hoja de Oro',
    tasselName: 'Rosa Pastel',
    tasselHex: '#F472B6',
    hardware: 'gold', // 'gold' | 'silver'
    customName: '',
    extraCharmId: 'none',
    quantity: 1,
    customerName: localStorage.getItem('customer_name') || '',
    customerPhone: localStorage.getItem('customer_phone') || '',
    deliveryCity: 'San Antonio del Táchira',
    deliveryAddress: localStorage.getItem('customer_address') || '',
    deliveryReference: '',
    paymentMethod: 'Efectivo en Pesos COP (Contra Entrega / Acordar)',
    gps: null
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
            <svg id="resin-keychain-svg" viewBox="0 0 340 430" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <!-- Hardware Gradients -->
                <linearGradient id="goldHardwareGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#FFF5BA" />
                  <stop offset="25%" stop-color="#FACC15" />
                  <stop offset="55%" stop-color="#CA8A04" />
                  <stop offset="85%" stop-color="#EAB308" />
                  <stop offset="100%" stop-color="#854D0E" />
                </linearGradient>

                <linearGradient id="silverHardwareGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#FFFFFF" />
                  <stop offset="30%" stop-color="#E2E8F0" />
                  <stop offset="60%" stop-color="#94A3B8" />
                  <stop offset="90%" stop-color="#CBD5E1" />
                  <stop offset="100%" stop-color="#475569" />
                </linearGradient>

                <!-- Specular Liquid Gloss Highlight -->
                <linearGradient id="liquidGlossGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="rgba(255, 255, 255, 0.75)" />
                  <stop offset="45%" stop-color="rgba(255, 255, 255, 0.25)" />
                  <stop offset="100%" stop-color="rgba(255, 255, 255, 0.0)" />
                </linearGradient>

                <!-- Gold Glitter & Flakes Pattern (matches real photo) -->
                <pattern id="goldGlitterPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                  <rect width="40" height="40" fill="#CA8A04" />
                  <circle cx="6" cy="8" r="1.8" fill="#FEF08A" />
                  <circle cx="18" cy="4" r="1.2" fill="#FFF" />
                  <circle cx="28" cy="12" r="2.2" fill="#FACC15" />
                  <circle cx="34" cy="24" r="1.5" fill="#FEF08A" />
                  <circle cx="12" cy="26" r="2.5" fill="#FDE047" />
                  <circle cx="22" cy="34" r="1.8" fill="#FFF" />
                  <circle cx="4" cy="36" r="1.2" fill="#EAB308" />
                  <polygon points="14,14 19,16 17,21 12,18" fill="#FEF08A" opacity="0.95" />
                  <polygon points="26,2 30,6 28,10 24,6" fill="#FDE047" opacity="0.9" />
                  <polygon points="2,18 7,20 5,24 1,22" fill="#FEF08A" opacity="0.85" />
                  <polygon points="22,18 29,22 26,28 20,24" fill="#F59E0B" opacity="0.95" />
                  <polygon points="8,32 14,35 12,39 6,37" fill="#FEF08A" opacity="0.9" />
                  <polygon points="30,30 36,33 34,38 28,35" fill="#FDE047" opacity="0.95" />
                  <path d="M 20,10 L 21,12 L 23,13 L 21,14 L 20,16 L 19,14 L 17,13 L 19,12 Z" fill="#FFF" opacity="0.9" />
                  <path d="M 10,22 L 10.5,23.5 L 12,24 L 10.5,24.5 L 10,26 L 9.5,24.5 L 8,24 L 9.5,23.5 Z" fill="#FFF" opacity="0.9" />
                </pattern>

                <!-- Chunky Iridescent Glitter Pattern -->
                <pattern id="chunkyGlitterPattern" width="45" height="45" patternUnits="userSpaceOnUse">
                  <circle cx="10" cy="12" r="2.5" fill="rgba(255,255,255,0.85)" />
                  <circle cx="32" cy="8" r="3.2" fill="rgba(253,224,71,0.9)" />
                  <circle cx="22" cy="24" r="2" fill="rgba(255,255,255,0.95)" />
                  <circle cx="8" cy="34" r="3" fill="rgba(251,113,133,0.85)" />
                  <circle cx="36" cy="36" r="2.8" fill="rgba(253,224,71,0.9)" />
                  <polygon points="16,6 19,8 19,12 16,14 13,12 13,8" fill="rgba(254,240,138,0.85)" />
                  <polygon points="36,20 39,22 39,26 36,28 33,26 33,22" fill="rgba(255,255,255,0.9)" />
                  <polygon points="26,36 29,38 29,42 26,44 23,42 23,38" fill="rgba(253,224,71,0.85)" />
                  <polygon points="4,22 7,24 7,28 4,30 1,28 1,24" fill="rgba(244,114,182,0.8)" />
                </pattern>

                <!-- Silver Glacial Flakes Pattern -->
                <pattern id="silverGlitterPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                  <rect width="40" height="40" fill="#64748B" />
                  <circle cx="8" cy="10" r="1.8" fill="#FFF" />
                  <circle cx="26" cy="14" r="2.5" fill="#E2E8F0" />
                  <circle cx="16" cy="30" r="2.2" fill="#FFF" />
                  <polygon points="12,4 18,7 15,12 9,9" fill="#FFF" opacity="0.95" />
                  <polygon points="24,22 31,25 28,31 21,28" fill="#CBD5E1" opacity="0.95" />
                  <polygon points="4,20 10,23 7,28 1,25" fill="#FFF" opacity="0.9" />
                  <path d="M 22,8 L 23,10 L 25,11 L 23,12 L 22,14 L 21,12 L 19,11 L 21,10 Z" fill="#FFF" />
                </pattern>

                <!-- Master Letter ClipPath (The letter itself is the resin mold!) -->
                <clipPath id="resin-letter-clip">
                  <text id="svg-clip-char" x="170" y="340" text-anchor="middle" font-family="'Arial Black', 'Montserrat', Impact, sans-serif" font-weight="900" font-size="205">${this.state.letter}</text>
                </clipPath>

                <!-- Soft Ambient Surface Contact Shadow -->
                <filter id="softContactShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="8" result="blur" />
                  <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.5 0" />
                </filter>
              </defs>

              <!-- 1. Ambient Drop Shadow on Table/Surface -->
              <text id="svg-shadow-char" x="172" y="352" text-anchor="middle" font-family="'Arial Black', 'Montserrat', Impact, sans-serif" font-weight="900" font-size="205" fill="#000000" filter="url(#softContactShadow)">${this.state.letter}</text>

              <!-- 2. Physical 3D Cast Depth / Molded Sidewalls -->
              <g id="svg-resin-depth-layers">
                <text id="svg-depth-4" x="170" y="348" text-anchor="middle" font-family="'Arial Black', Impact, sans-serif" font-weight="900" font-size="205" fill="#831843">${this.state.letter}</text>
                <text id="svg-depth-3" x="170" y="346" text-anchor="middle" font-family="'Arial Black', Impact, sans-serif" font-weight="900" font-size="205" fill="#9D174D">${this.state.letter}</text>
                <text id="svg-depth-2" x="170" y="344" text-anchor="middle" font-family="'Arial Black', Impact, sans-serif" font-weight="900" font-size="205" fill="#BE185D">${this.state.letter}</text>
                <text id="svg-depth-1" x="170" y="342" text-anchor="middle" font-family="'Arial Black', Impact, sans-serif" font-weight="900" font-size="205" fill="#DB2777">${this.state.letter}</text>
              </g>

              <!-- 3. Front Face: PURE RESIN CAST AS THE LETTER -->
              <g clip-path="url(#resin-letter-clip)" id="svg-front-face-group">
                <!-- Base Color Resin Layer -->
                <rect id="svg-resin-base-fill" x="10" y="120" width="320" height="250" fill="${this.state.baseColorHex}" />
                
                <!-- Base Resin Glitter Sprinkles -->
                <rect id="svg-resin-base-glitter" x="10" y="120" width="320" height="250" fill="url(#chunkyGlitterPattern)" opacity="0.8" />

                <!-- Inclusions & Internal Styling (e.g. Diagonal Gold Wave for Bicolor) -->
                <g id="svg-style-inclusions"></g>

                <!-- Liquid Meniscus Beveled Border (Simulates rounded mold edge) -->
                <text id="svg-meniscus-char" x="170" y="340" text-anchor="middle" font-family="'Arial Black', 'Montserrat', Impact, sans-serif" font-weight="900" font-size="205" fill="none" stroke="rgba(255, 255, 255, 0.65)" stroke-width="3" stroke-linejoin="round">${this.state.letter}</text>

                <!-- Signature Mirror-Gloss Specular Highlight (Wet Resin Reflection) -->
                <path d="M 50,150 Q 170,210 290,165 L 290,205 Q 170,250 50,195 Z" fill="url(#liquidGlossGrad)" opacity="0.65" pointer-events="none" />
                <ellipse cx="120" cy="315" rx="35" ry="12" fill="rgba(255,255,255,0.22)" transform="rotate(-18 120 315)" pointer-events="none" />
                <ellipse cx="225" cy="315" rx="35" ry="12" fill="rgba(255,255,255,0.22)" transform="rotate(-18 225 315)" pointer-events="none" />
              </g>

              <!-- Optional Custom Name in Sealed Vinyl Lettering -->
              <text id="svg-custom-name" x="170" y="278" text-anchor="middle" font-family="'Caveat', 'Brush Script MT', 'Dancing Script', cursive, sans-serif" font-weight="700" font-size="30" fill="#FFFFFF" stroke="#0F172A" stroke-width="0.75" filter="drop-shadow(0 2px 5px rgba(0,0,0,0.8))" class="hidden"></text>

              <!-- 4. Real Hardware Assembly -->
              <g id="svg-hardware-group">
                <!-- Top Split Key Ring (Argolla plana de llavero) -->
                <circle cx="170" cy="45" r="26" fill="none" stroke="url(#goldHardwareGrad)" stroke-width="7" class="svg-metal-element" />
                <circle cx="170" cy="45" r="23" fill="none" stroke="rgba(0,0,0,0.2)" stroke-width="1" />
                <line x1="168" y1="19" x2="172" y2="71" stroke="rgba(0,0,0,0.25)" stroke-width="1.5" />

                <!-- Continuous Interlocking Chain Links Container & Screw Eye Pin -->
                <g id="svg-chain-container"></g>

                <!-- Suede Tassel (Borla de Gamuza colgada de la argolla) -->
                <g id="svg-tassel-group" transform="translate(60, 82)">
                  <ellipse cx="25" cy="5" rx="4" ry="5.5" fill="none" stroke="url(#goldHardwareGrad)" stroke-width="2.5" transform="rotate(15 25 5)" class="svg-metal-element" />
                  <path d="M 16,10 Q 25,6 34,10 L 37,24 Q 25,28 13,24 Z" fill="url(#goldHardwareGrad)" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))" class="svg-metal-element" />
                  <ellipse cx="25" cy="11" rx="9" ry="2.5" fill="#FFF5BA" opacity="0.6" />
                  <path id="svg-tassel-body" d="M 14,24 Q 25,28 36,24 L 42,78 Q 25,84 8,78 Z" fill="${this.state.tasselHex}" filter="drop-shadow(0 4px 8px rgba(0,0,0,0.35))" />
                  <line x1="16" y1="28" x2="14" y2="76" stroke="rgba(0,0,0,0.18)" stroke-width="1.2" />
                  <line x1="22" y1="28" x2="21" y2="78" stroke="rgba(0,0,0,0.18)" stroke-width="1.2" />
                  <line x1="28" y1="28" x2="29" y2="78" stroke="rgba(0,0,0,0.18)" stroke-width="1.2" />
                  <line x1="34" y1="28" x2="36" y2="76" stroke="rgba(0,0,0,0.18)" stroke-width="1.2" />
                  <line x1="18" y1="28" x2="16" y2="76" stroke="rgba(255,255,255,0.25)" stroke-width="1" />
                  <line x1="24" y1="28" x2="23" y2="78" stroke="rgba(255,255,255,0.25)" stroke-width="1" />
                </g>

                <!-- Extra Charm (Dije Opcional) -->
                <g id="svg-charm-group" transform="translate(205, 95)" class="hidden">
                  <ellipse cx="15" cy="5" rx="3.5" ry="5" fill="none" stroke="url(#goldHardwareGrad)" stroke-width="2.5" class="svg-metal-element" />
                  <g id="svg-charm-graphic"></g>
                </g>
              </g>
            </svg>
          </div>

          <div style="font-size: 11.5px; color: #FDA4AF; font-weight: 700; margin-top: 6px;">
            ✨ Llavero artesanal vaciado en molde 3D de resina epóxica pura
          </div>
        </div>

        <!-- 1. Alphabet Letter Picker -->
        <div class="resin-section-card">
          <div class="resin-section-title">
            <span>1. Elige tu Letra / Inicial</span>
            <span class="badge-opt">Letra Activa: <strong id="lbl-active-letter" style="color: #FFF; font-size: 14px;">${this.state.letter}</strong></span>
          </div>
          <div class="alphabet-grid" id="resin-alphabet-grid">
            ${this.alphabet.map(char => `
              <button type="button" class="btn-letter-pick ${char === this.state.letter ? 'active' : ''}" onclick="ResinServiceApp.setLetter('${char}')">
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

        <!-- 6. Delivery & Live GPS Detection Section -->
        <div class="resin-section-card" id="resin-delivery-section" style="border-left: 3px solid #38BDF8;">
          <div class="resin-section-title" style="display: flex; align-items: center; justify-content: space-between;">
            <span>6. Datos de Entrega & Ubicación GPS</span>
            <span style="font-size: 10px; background: rgba(56, 189, 248, 0.15); color: #38BDF8; padding: 2px 8px; border-radius: 10px; font-weight: 700;">Requerido</span>
          </div>
          <p style="font-size: 11.5px; color: #94A3B8; margin-top: 2px; margin-bottom: 12px; line-height: 1.4;">
            Ingresa tus datos para que el taller de ShelliArt y el repartidor de PediGochos puedan llevarte tu pedido exacto hasta tu puerta.
          </p>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
            <div>
              <label style="font-size: 11px; color: #94A3B8; font-weight: 700; display: block; margin-bottom: 4px;">TU NOMBRE Y APELLIDO *</label>
              <input type="text" class="resin-input-text" id="input-resin-customer-name" placeholder="Ej. Camila Pérez" value="${localStorage.getItem('customer_name') || ''}" oninput="ResinServiceApp.handleDeliveryFieldChange('customerName', this.value)">
            </div>
            <div>
              <label style="font-size: 11px; color: #94A3B8; font-weight: 700; display: block; margin-bottom: 4px;">TELÉFONO / WHATSAPP *</label>
              <input type="tel" class="resin-input-text" id="input-resin-customer-phone" placeholder="Ej. 0414 1234567" value="${localStorage.getItem('customer_phone') || ''}" oninput="ResinServiceApp.handleDeliveryFieldChange('customerPhone', this.value)">
            </div>
          </div>

          <div style="margin-bottom: 12px;">
            <label style="font-size: 11px; color: #94A3B8; font-weight: 700; display: block; margin-bottom: 4px;">CIUDAD O MUNICIPIO DE ENTREGA *</label>
            <select class="resin-input-select" id="select-resin-city" onchange="ResinServiceApp.handleDeliveryFieldChange('deliveryCity', this.value)">
              <option value="San Antonio del Táchira" selected>🇻🇪 San Antonio del Táchira (Frontera)</option>
              <option value="Ureña">🇻🇪 Pedro María Ureña</option>
              <option value="Cúcuta (Norte de Santander)">🇨🇴 Cúcuta / Villa del Rosario / Los Patios</option>
              <option value="San Cristóbal (Táchira)">🇻🇪 San Cristóbal y resto de Táchira</option>
              <option value="Envío Nacional (Venezuela)">📦 Envío Nacional Venezuela (MRW / Zoom / Tealca)</option>
              <option value="Envío Nacional (Colombia)">📦 Envío Nacional Colombia (Interrapidísimo / Servientrega)</option>
            </select>
          </div>

          <!-- GPS Detection Box -->
          <div style="margin-bottom: 14px; background: rgba(56, 189, 248, 0.05); border: 1px dashed rgba(56, 189, 248, 0.3); border-radius: 12px; padding: 12px;">
            <label style="font-size: 11px; color: #38BDF8; font-weight: 800; display: block; margin-bottom: 6px;">📍 DETECTOR GPS EN VIVO (OPCIONAL PERO RECOMENDADO)</label>
            <button type="button" class="btn-resin-gps" id="btn-resin-gps-detect" onclick="ResinServiceApp.detectLiveGps()">
              <span id="resin-gps-icon">📡</span>
              <span id="resin-gps-btn-text">Detectar mi Ubicación GPS en Vivo</span>
            </button>
            <div id="resin-gps-status-box" class="resin-gps-status-box" style="display: none;"></div>
          </div>

          <div style="margin-bottom: 12px;">
            <label style="font-size: 11px; color: #94A3B8; font-weight: 700; display: block; margin-bottom: 4px;">DIRECCIÓN EXACTA DE ENTREGA *</label>
            <textarea class="resin-textarea" id="input-resin-address" rows="2" placeholder="Calle, carrera, número de casa/apto, urbanización o sector..." oninput="ResinServiceApp.handleDeliveryFieldChange('deliveryAddress', this.value)">${localStorage.getItem('customer_address') || ''}</textarea>
          </div>

          <div style="margin-bottom: 12px;">
            <label style="font-size: 11px; color: #94A3B8; font-weight: 700; display: block; margin-bottom: 4px;">PUNTO DE REFERENCIA (CASA / LOCAL / FACHADA)</label>
            <input type="text" class="resin-input-text" id="input-resin-reference" placeholder="Ej. Casa de rejas blancas, frente a la bodega, al lado de la farmacia" oninput="ResinServiceApp.handleDeliveryFieldChange('deliveryReference', this.value)">
          </div>

          <div>
            <label style="font-size: 11px; color: #94A3B8; font-weight: 700; display: block; margin-bottom: 4px;">MÉTODO DE PAGO PREFERIDO</label>
            <select class="resin-input-select" id="select-resin-payment" onchange="ResinServiceApp.handleDeliveryFieldChange('paymentMethod', this.value)">
              <option value="Efectivo en Pesos COP (Contra Entrega / Acordar)" selected>💵 Efectivo en Pesos COP</option>
              <option value="Transferencia Bancolombia / Nequi">📱 Transferencia Bancolombia / Nequi</option>
              <option value="Pago Móvil en Bolívares (Tasa del día)">🇻🇪 Pago Móvil en Bolívares (VES)</option>
              <option value="Efectivo en Divisas USD ($)">💵 Efectivo Divisas USD ($)</option>
              <option value="Binance USDT / Zelle">🌐 Binance Pay USDT / Zelle</option>
            </select>
          </div>
        </div>

      </div>

      <!-- Fixed Bottom Price & WhatsApp CTA Bar -->
      <footer class="resin-bottom-bar">
        <div class="resin-bottom-pricing">
          <span class="resin-price-total" id="resin-total-usd">$4.50 USD</span>
          <span class="resin-price-cop" id="resin-total-cop">~$18.000 COP • 202 Bs</span>
        </div>

        <div class="resin-bottom-actions">
          <a id="btn-resin-wa-link" href="#" target="_blank" rel="noopener noreferrer" class="btn-resin-order-wa-full" onclick="ResinServiceApp.handleWhatsAppClick(event)">
            <span>🟢</span> Pedir en WhatsApp
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

  adjustColor(hex, lum) {
    hex = String(hex).replace(/[^0-9a-f]/gi, '');
    if (hex.length < 6) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    lum = lum || 0;
    let rgb = '#', c, i;
    for (i = 0; i < 3; i++) {
      c = parseInt(hex.substr(i * 2, 2), 16);
      c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
      rgb += ('00' + c).substr(c.length);
    }
    return rgb;
  },

  getLetterAnchor(letter) {
    const l = (letter || 'M').toUpperCase();
    switch (l) {
      case 'A': return { x: 170, y: 185 };
      case 'B': return { x: 130, y: 185 };
      case 'C': return { x: 160, y: 185 };
      case 'D': return { x: 130, y: 185 };
      case 'E': return { x: 130, y: 185 };
      case 'F': return { x: 130, y: 185 };
      case 'G': return { x: 160, y: 185 };
      case 'H': return { x: 120, y: 185 };
      case 'I': return { x: 170, y: 185 };
      case 'J': return { x: 185, y: 185 };
      case 'K': return { x: 120, y: 185 };
      case 'L': return { x: 125, y: 185 };
      case 'M': return { x: 105, y: 185 };
      case 'N': return { x: 115, y: 185 };
      case 'O': return { x: 170, y: 185 };
      case 'P': return { x: 130, y: 185 };
      case 'Q': return { x: 170, y: 185 };
      case 'R': return { x: 130, y: 185 };
      case 'S': return { x: 165, y: 185 };
      case 'T': return { x: 170, y: 185 };
      case 'U': return { x: 110, y: 185 };
      case 'V': return { x: 100, y: 185 };
      case 'W': return { x: 95, y: 185 };
      case 'X': return { x: 110, y: 185 };
      case 'Y': return { x: 105, y: 185 };
      case 'Z': return { x: 125, y: 185 };
      default:  return { x: 160, y: 185 };
    }
  },

  renderChain(anchorX, isSilver) {
    const metalGrad = isSilver ? 'url(#silverHardwareGrad)' : 'url(#goldHardwareGrad)';
    const highlightColor = isSilver ? '#FFFFFF' : '#FFF9D2';
    const shadowColor = isSilver ? 'rgba(0,0,0,0.45)' : 'rgba(120,53,15,0.45)';

    // Key ring bottom contact: (170, 72)
    // Letter top anchor: (anchorX, 185)
    const p0 = { x: 170, y: 72 };
    const p2 = { x: anchorX, y: 185 };
    const dx = p2.x - p0.x;
    const dy = p2.y - p0.y;
    // Control point for a natural hanging curve
    const p1 = { x: p0.x + dx * 0.25, y: p0.y + dy * 0.65 };

    const numLinks = 7;
    let linksHtml = '';

    for (let i = 0; i < numLinks; i++) {
      const t = i / (numLinks - 1);
      const invT = 1 - t;
      const cx = invT * invT * p0.x + 2 * invT * t * p1.x + t * t * p2.x;
      const cy = invT * invT * p0.y + 2 * invT * t * p1.y + t * t * p2.y;

      const tx = 2 * invT * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
      const ty = 2 * invT * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
      const angle = (Math.atan2(tx, ty) * 180) / Math.PI;

      if (i % 2 === 0) {
        // Facing link (wider oval)
        linksHtml += `
          <g transform="rotate(${angle.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})">
            <ellipse cx="${cx.toFixed(1)}" cy="${(cy + 1).toFixed(1)}" rx="5.8" ry="9.8" fill="none" stroke="${shadowColor}" stroke-width="3.5" opacity="0.6" />
            <ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="5.5" ry="9.5" fill="none" stroke="${metalGrad}" stroke-width="3.2" class="svg-metal-element" />
            <ellipse cx="${(cx - 1).toFixed(1)}" cy="${cy.toFixed(1)}" rx="3.5" ry="7.2" fill="none" stroke="${highlightColor}" stroke-width="0.75" opacity="0.7" />
          </g>
        `;
      } else {
        // Side/turned link (interlocking angle)
        const sideAngle = angle + (i % 4 === 1 ? 16 : -16);
        linksHtml += `
          <g transform="rotate(${sideAngle.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})">
            <ellipse cx="${cx.toFixed(1)}" cy="${(cy + 1).toFixed(1)}" rx="3.5" ry="9.2" fill="none" stroke="${shadowColor}" stroke-width="3.2" opacity="0.6" />
            <ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="3.2" ry="8.8" fill="none" stroke="${metalGrad}" stroke-width="2.8" class="svg-metal-element" />
            <ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="1.8" ry="6.5" fill="none" stroke="${highlightColor}" stroke-width="0.65" opacity="0.6" />
          </g>
        `;
      }
    }

    // Screw Eye Pin Assembly (Cáncamo atornillado firmemente en la resina de la letra)
    const eyeletHtml = `
      <g id="svg-screw-eye-assembly">
        <!-- Screw eye shadow -->
        <circle cx="${anchorX}" cy="186.5" r="6.8" fill="none" stroke="${shadowColor}" stroke-width="3.8" opacity="0.6" />
        <!-- Screw eyelet outer loop -->
        <circle cx="${anchorX}" cy="185.5" r="6.5" fill="none" stroke="${metalGrad}" stroke-width="3.4" class="svg-metal-element" />
        <!-- Eyelet inner opening highlight -->
        <circle cx="${anchorX}" cy="185.5" r="4.2" fill="none" stroke="${highlightColor}" stroke-width="0.75" opacity="0.65" />

        <!-- Threaded screw shaft embedded into resin (y: 191 to 208) -->
        <line x1="${anchorX}" y1="191" x2="${anchorX}" y2="208" stroke="${shadowColor}" stroke-width="3.8" stroke-linecap="round" opacity="0.5" />
        <line x1="${anchorX}" y1="190.5" x2="${anchorX}" y2="207.5" stroke="${metalGrad}" stroke-width="3.2" stroke-linecap="round" class="svg-metal-element" />
        <!-- Screw threads visible through translucent resin -->
        <line x1="${anchorX - 3}" y1="195" x2="${anchorX + 3}" y2="195" stroke="${highlightColor}" stroke-width="1.2" opacity="0.75" />
        <line x1="${anchorX - 3}" y1="199" x2="${anchorX + 3}" y2="199" stroke="${highlightColor}" stroke-width="1.2" opacity="0.75" />
        <line x1="${anchorX - 3}" y1="203" x2="${anchorX + 3}" y2="203" stroke="${highlightColor}" stroke-width="1.2" opacity="0.75" />
      </g>
    `;

    return linksHtml + eyeletHtml;
  },

  handleDeliveryFieldChange(field, val) {
    this.state[field] = val;
    if (field === 'customerName') localStorage.setItem('customer_name', val);
    if (field === 'customerPhone') localStorage.setItem('customer_phone', val);
    if (field === 'deliveryAddress') localStorage.setItem('customer_address', val);
    this.updateVisualPreview();
  },

  detectLiveGps() {
    const btn = document.getElementById('btn-resin-gps-detect');
    const icon = document.getElementById('resin-gps-icon');
    const btnText = document.getElementById('resin-gps-btn-text');
    const statusBox = document.getElementById('resin-gps-status-box');

    if (!navigator.geolocation) {
      if (statusBox) {
        statusBox.style.display = 'block';
        statusBox.innerHTML = '<span style="color: #F87171;">⚠️ Tu navegador no soporta geolocalización GPS. Por favor escribe tu dirección detallada.</span>';
      }
      return;
    }

    if (btn) btn.disabled = true;
    if (icon) icon.textContent = '⏳';
    if (btnText) btnText.textContent = 'Obteniendo satélites GPS...';
    if (statusBox) {
      statusBox.style.display = 'block';
      statusBox.innerHTML = '<span style="color: #38BDF8;">🛰️ Conectando con sensor GPS y satélites... por favor acepta el permiso de ubicación si el navegador lo solicita.</span>';
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        const acc = Math.round(pos.coords.accuracy || 15);
        const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;

        this.state.gps = {
          lat,
          lng,
          accuracy: acc,
          mapUrl
        };

        if (btn) {
          btn.disabled = false;
          btn.style.borderColor = '#10B981';
          btn.style.color = '#10B981';
          btn.style.background = 'rgba(16, 185, 129, 0.15)';
        }
        if (icon) icon.textContent = '✅';
        if (btnText) btnText.textContent = 'Ubicación GPS Fijada con Éxito';

        if (statusBox) {
          statusBox.style.display = 'block';
          statusBox.innerHTML = `
            <div style="color: #10B981; font-weight: 700; margin-bottom: 2px;">
              📍 Ubicación GPS Confirmada (Precisión: ±${acc}m)
            </div>
            <div style="font-size: 11px; color: #CBD5E1;">
              Coords: <code>${lat}, ${lng}</code> &nbsp;•&nbsp;
              <a href="${mapUrl}" target="_blank" rel="noopener noreferrer" style="color: #38BDF8; text-decoration: underline; font-weight: 700;">
                Abrir en Google Maps ↗
              </a>
            </div>
          `;
        }

        this.updateVisualPreview();
      },
      (err) => {
        console.warn('Geolocation error:', err);
        if (btn) btn.disabled = false;
        if (icon) icon.textContent = '📡';
        if (btnText) btnText.textContent = 'Reintentar Detección GPS';
        if (statusBox) {
          statusBox.style.display = 'block';
          let msg = 'No pudimos acceder a tu GPS. Por favor revisa los permisos o escribe tu dirección y punto de referencia.';
          if (err.code === 1) msg = 'Permiso de ubicación denegado. Escribe tu dirección en el campo de texto abajo.';
          statusBox.innerHTML = `<span style="color: #F87171;">⚠️ ${msg}</span>`;
        }
      },
      options
    );
  },

  updateVisualPreview() {
    const letter = this.state.letter || 'M';
    const c = this.state.baseColorHex || '#F472B6';
    const isSilver = this.state.hardware === 'silver';
    const metalGrad = isSilver ? 'url(#silverHardwareGrad)' : 'url(#goldHardwareGrad)';

    // 1. Update text for all layers of the 3D letter
    const clipChar = document.getElementById('svg-clip-char');
    const shadowChar = document.getElementById('svg-shadow-char');
    const meniscusChar = document.getElementById('svg-meniscus-char');
    if (clipChar) clipChar.textContent = letter;
    if (shadowChar) shadowChar.textContent = letter;
    if (meniscusChar) meniscusChar.textContent = letter;

    // 2. Update 3D depth layers
    const cDark = this.adjustColor(c, -0.55);
    const cMid = this.adjustColor(c, -0.38);
    const cLight = this.adjustColor(c, -0.22);
    const cShine = this.adjustColor(c, -0.08);

    const d4 = document.getElementById('svg-depth-4');
    const d3 = document.getElementById('svg-depth-3');
    const d2 = document.getElementById('svg-depth-2');
    const d1 = document.getElementById('svg-depth-1');

    if (d4) { d4.textContent = letter; d4.setAttribute('fill', cDark); }
    if (d3) { d3.textContent = letter; d3.setAttribute('fill', cMid); }
    if (d2) { d2.textContent = letter; d2.setAttribute('fill', cLight); }
    if (d1) { d1.textContent = letter; d1.setAttribute('fill', cShine); }

    // 3. Base resin color & glitter
    const baseRect = document.getElementById('svg-resin-base-fill');
    const baseGlitter = document.getElementById('svg-resin-base-glitter');
    if (baseRect) baseRect.setAttribute('fill', c);

    // 4. Inclusions according to style
    const styleInclusions = document.getElementById('svg-style-inclusions');
    if (styleInclusions) {
      let inclHtml = '';
      if (this.state.styleId === 'bicolor') {
        // Diagonal gold glitter wave like user's photo
        if (baseGlitter) baseGlitter.setAttribute('opacity', '0.85');
        inclHtml = `
          <path d="M 0,210 Q 170,270 340,220 L 340,295 Q 170,345 0,285 Z" fill="url(#goldGlitterPattern)" />
          <path d="M 0,206 Q 170,266 340,216 L 340,222 Q 170,272 0,212 Z" fill="#FDE047" opacity="0.6" />
          <path d="M 0,283 Q 170,343 340,293 L 340,299 Q 170,349 0,289 Z" fill="#FDE047" opacity="0.6" />
        `;
      } else if (this.state.styleId === 'gold_flakes') {
        if (baseGlitter) baseGlitter.setAttribute('opacity', '0.35');
        inclHtml = `
          <rect x="0" y="120" width="340" height="250" fill="url(#goldGlitterPattern)" opacity="0.85" />
          <polygon points="90,210 115,225 105,245 80,230" fill="#FEF08A" opacity="0.95" />
          <polygon points="190,195 210,205 200,225 180,215" fill="#FDE047" opacity="0.9" />
          <polygon points="230,280 255,295 240,320 215,300" fill="#FEF08A" opacity="0.95" />
          <polygon points="120,300 145,310 135,330 110,320" fill="#F59E0B" opacity="0.9" />
          <polygon points="150,230 170,240 160,260 140,250" fill="#FEF08A" opacity="0.9" />
        `;
      } else if (this.state.styleId === 'silver_flakes') {
        if (baseGlitter) baseGlitter.setAttribute('opacity', '0.2');
        inclHtml = `
          <rect x="0" y="120" width="340" height="250" fill="url(#silverGlitterPattern)" opacity="0.85" />
          <polygon points="85,210 110,225 100,245 75,230" fill="#FFFFFF" opacity="0.95" />
          <polygon points="190,200 210,210 200,230 180,220" fill="#E2E8F0" opacity="0.9" />
          <polygon points="225,275 250,290 235,315 210,295" fill="#FFFFFF" opacity="0.95" />
          <polygon points="125,295 150,305 140,325 115,315" fill="#CBD5E1" opacity="0.9" />
        `;
      } else if (this.state.styleId === 'glitter_full') {
        if (baseGlitter) baseGlitter.setAttribute('opacity', '1');
        inclHtml = `
          <rect x="0" y="120" width="340" height="250" fill="url(#chunkyGlitterPattern)" opacity="0.9" />
        `;
      } else if (this.state.styleId === 'flowers') {
        if (baseGlitter) baseGlitter.setAttribute('opacity', '0.2');
        inclHtml = `
          <g transform="translate(100, 240)">
            <circle cx="0" cy="0" r="14" fill="#FEF08A" opacity="0.95" />
            <circle cx="0" cy="0" r="6" fill="#F59E0B" />
            <ellipse cx="0" cy="-18" rx="6" ry="10" fill="#FFF" opacity="0.95" />
            <ellipse cx="14" cy="-12" rx="6" ry="10" fill="#FFF" opacity="0.95" transform="rotate(45 14 -12)" />
            <ellipse cx="18" cy="0" rx="6" ry="10" fill="#FFF" opacity="0.95" transform="rotate(90 18 0)" />
            <ellipse cx="14" cy="12" rx="6" ry="10" fill="#FFF" opacity="0.95" transform="rotate(135 14 12)" />
            <ellipse cx="0" cy="18" rx="6" ry="10" fill="#FFF" opacity="0.95" />
            <ellipse cx="-14" cy="12" rx="6" ry="10" fill="#FFF" opacity="0.95" transform="rotate(-135 -14 12)" />
            <ellipse cx="-18" cy="0" rx="6" ry="10" fill="#FFF" opacity="0.95" transform="rotate(-90 -18 0)" />
            <ellipse cx="-14" cy="-12" rx="6" ry="10" fill="#FFF" opacity="0.95" transform="rotate(-45 -14 -12)" />
          </g>
          <g transform="translate(210, 260) scale(0.75)">
            <circle cx="0" cy="0" r="14" fill="#FDA4AF" opacity="0.95" />
            <circle cx="0" cy="0" r="6" fill="#FB7185" />
            <ellipse cx="0" cy="-18" rx="6" ry="10" fill="#FFF" opacity="0.9" />
            <ellipse cx="18" cy="0" rx="6" ry="10" fill="#FFF" opacity="0.9" transform="rotate(90 18 0)" />
            <ellipse cx="0" cy="18" rx="6" ry="10" fill="#FFF" opacity="0.9" />
            <ellipse cx="-18" cy="0" rx="6" ry="10" fill="#FFF" opacity="0.9" transform="rotate(-90 -18 0)" />
          </g>
          <path d="M 140,290 Q 155,270 170,275 Q 160,295 140,290 Z" fill="#34D399" opacity="0.85" />
          <path d="M 180,210 Q 195,195 210,200 Q 200,215 180,210 Z" fill="#34D399" opacity="0.85" />
        `;
      } else { // crystal
        if (baseGlitter) baseGlitter.setAttribute('opacity', '0.15');
        inclHtml = `
          <ellipse cx="140" cy="240" rx="40" ry="15" fill="rgba(255,255,255,0.25)" transform="rotate(-25 140 240)" />
          <ellipse cx="200" cy="270" rx="50" ry="20" fill="rgba(255,255,255,0.2)" transform="rotate(15 200 270)" />
        `;
      }
      styleInclusions.innerHTML = inclHtml;
    }

    // 5. Hardware Position Anchors & Colors (Continuous Real Interlocking Chain)
    const anchor = this.getLetterAnchor(letter);
    const chainContainer = document.getElementById('svg-chain-container');
    if (chainContainer) {
      chainContainer.innerHTML = this.renderChain(anchor.x, isSilver);
    }

    // All hardware strokes
    document.querySelectorAll('.svg-metal-element').forEach(el => {
      if (el.tagName === 'circle' || el.tagName === 'ellipse' || el.tagName === 'line') {
        el.setAttribute('stroke', metalGrad);
      } else {
        el.setAttribute('fill', metalGrad);
      }
    });

    // 6. Tassel position & color
    const tasselGroup = document.getElementById('svg-tassel-group');
    if (tasselGroup) {
      const tx = Math.max(20, Math.min(anchor.x - 45, 125));
      tasselGroup.setAttribute('transform', `translate(${tx}, 82)`);
    }
    const tasselBody = document.getElementById('svg-tassel-body');
    if (tasselBody) {
      tasselBody.setAttribute('fill', this.state.tasselHex || '#F472B6');
    }

    // 7. Extra Charm
    const charmGroup = document.getElementById('svg-charm-group');
    const charmGraphic = document.getElementById('svg-charm-graphic');
    const charmObj = this.charms.find(ch => ch.id === this.state.extraCharmId);
    if (charmGroup) {
      if (charmObj && charmObj.id !== 'none') {
        charmGroup.classList.remove('hidden');
        if (charmGraphic) {
          if (charmObj.id === 'corazon') {
            charmGraphic.innerHTML = `
              <path d="M 15,10 C 15,10 10,2 3,6 C -4,10 0,22 15,32 C 30,22 34,10 27,6 C 20,2 15,10 15,10 Z" fill="${metalGrad}" />
              <path d="M 15,12 C 15,12 11,5 5,8 C -1,11 2,21 15,29 C 28,21 31,11 25,8 C 19,5 15,12 15,12 Z" fill="#F43F5E" />
            `;
          } else if (charmObj.id === 'huesito') {
            charmGraphic.innerHTML = `
              <path d="M 5,12 C 2,9 2,5 5,2 C 8,-1 12,-1 15,2 C 18,-1 22,-1 25,2 C 28,5 28,9 25,12 L 25,18 C 28,21 28,25 25,28 C 22,31 18,31 15,28 C 12,31 8,31 5,28 C 2,25 2,21 5,18 Z" fill="${metalGrad}" />
            `;
          } else { // estrella
            charmGraphic.innerHTML = `
              <polygon points="15,2 19,11 29,12 21,19 24,29 15,23 6,29 9,19 1,12 11,11" fill="${metalGrad}" />
              <circle cx="15" cy="16" r="3" fill="#FFF" opacity="0.8" />
            `;
          }
        }
      } else {
        charmGroup.classList.add('hidden');
      }
    }

    // 8. Custom Name overlay
    const nameEl = document.getElementById('svg-custom-name');
    if (nameEl) {
      if (this.state.customName) {
        nameEl.textContent = this.state.customName.toUpperCase();
        nameEl.classList.remove('hidden');
      } else {
        nameEl.classList.add('hidden');
      }
    }

    // 9. Pricing
    const pricing = this.calculatePricing();
    const usdEl = document.getElementById('resin-total-usd');
    const copEl = document.getElementById('resin-total-cop');
    if (usdEl) usdEl.textContent = `$${pricing.totalUsd.toFixed(2)} USD`;
    if (copEl) copEl.textContent = `~$${pricing.totalCop.toLocaleString('es-CO')} COP • ${pricing.totalBs.toLocaleString('es-VE')} Bs`;

    // 10. WhatsApp Link Pre-generation
    const waLink = document.getElementById('btn-resin-wa-link');
    if (waLink) {
      const waText = this.buildWhatsAppMessage();
      waLink.href = `https://wa.me/${this.resinWhatsAppNumber}?text=${waText}`;
    }
  },

  buildWhatsAppMessage() {
    const pricing = this.calculatePricing();
    const charmObj = this.charms.find(ch => ch.id === this.state.extraCharmId);
    const styleObj = this.styles.find(s => s.id === this.state.styleId) || { name: 'Personalizado' };

    const nameText = this.state.customName ? `"${this.state.customName.toUpperCase()}" (sellado permanente en vinil)` : 'Sin nombre adicional';
    const charmText = (charmObj && charmObj.id !== 'none') ? `${charmObj.icon} ${charmObj.name} (+$${charmObj.extraUsd.toFixed(2)} USD)` : 'Ninguno';
    const hardwareText = this.state.hardware === 'gold' ? 'Dorado de Lujo ✨' : 'Plateado Cromado 🔘';

    const clientName = this.state.customerName || localStorage.getItem('customer_name') || '';
    const clientPhone = this.state.customerPhone || localStorage.getItem('customer_phone') || '';
    const city = this.state.deliveryCity || 'San Antonio del Táchira';
    const address = this.state.deliveryAddress || localStorage.getItem('customer_address') || '';
    const reference = this.state.deliveryReference || '';
    const payment = this.state.paymentMethod || 'Efectivo en Pesos COP (Contra Entrega / Acordar)';
    const gps = this.state.gps;

    let deliveryBlock = `📦 *DATOS DE ENTREGA & CONTACTO:*
👤 *Cliente:* ${clientName || 'Cliente PediGochos'}${clientPhone ? `\n📱 *Teléfono / WhatsApp:* ${clientPhone}` : ''}
🏙️ *Ciudad / Municipio:* ${city}
🏠 *Dirección de Entrega:* ${address || 'Por coordinar con el taller'}
${reference ? `📌 *Punto de Referencia:* ${reference}\n` : ''}💳 *Forma de Pago:* ${payment}`;

    if (gps && gps.mapUrl) {
      deliveryBlock += `\n📍 *Ubicación GPS Satelital:*
${gps.mapUrl} (Precisión: ±${gps.accuracy}m)`;
    }

    const text =
`✨ *¡NUEVO PEDIDO DE LLAVERO EN RESINA - SHELLIART!* ✨
━━━━━━━━━━━━━━━━━━━━
🔤 *Letra / Inicial:* "${this.state.letter}"
🎨 *Estilo de Resina:* ${styleObj.name}
🌸 *Color Base:* ${this.state.baseColorName}
✨ *Inclusiones / Relleno:* ${this.state.inclusions || styleObj.desc || 'Hojas de Oro / Destellos'}
🪢 *Borla de Gamuza (Tassel):* ${this.state.tasselName}
🔘 *Herraje & Cadena:* ${hardwareText}
✍️ *Nombre en Vinil:* ${nameText}
🧸 *Dije Extra (Charm):* ${charmText}
🔢 *Cantidad:* ${this.state.quantity} unidad(es)
━━━━━━━━━━━━━━━━━━━━
💰 *TOTAL ESTIMADO:* $${pricing.totalUsd.toFixed(2)} USD
💵 *Equivalente:* ~$${pricing.totalCop.toLocaleString('es-CO')} COP • ${pricing.totalBs.toLocaleString('es-VE')} Bs
━━━━━━━━━━━━━━━━━━━━
${deliveryBlock}
━━━━━━━━━━━━━━━━━━━━
📍 *Enviado desde PediGochos App*
💬 *Taller ShelliArt WhatsApp: +57 322 794 9751*

¿Para cuándo tendrían disponible este pedido para entrega? ¡Muchas gracias!`;

    return encodeURIComponent(text);
  },

  handleWhatsAppClick(e) {
    if (e) e.preventDefault();

    // 1. Sync fields from DOM
    const nameInput = document.getElementById('input-resin-customer-name');
    const phoneInput = document.getElementById('input-resin-customer-phone');
    const citySelect = document.getElementById('select-resin-city');
    const addressInput = document.getElementById('input-resin-address');
    const refInput = document.getElementById('input-resin-reference');
    const paymentSelect = document.getElementById('select-resin-payment');

    const customerName = (nameInput?.value || this.state.customerName || localStorage.getItem('customer_name') || '').trim();
    const customerPhone = (phoneInput?.value || this.state.customerPhone || localStorage.getItem('customer_phone') || '').trim();
    const deliveryCity = (citySelect?.value || this.state.deliveryCity || 'San Antonio del Táchira').trim();
    const deliveryAddress = (addressInput?.value || this.state.deliveryAddress || localStorage.getItem('customer_address') || '').trim();
    const deliveryReference = (refInput?.value || this.state.deliveryReference || '').trim();
    const paymentMethod = (paymentSelect?.value || this.state.paymentMethod || 'Efectivo en Pesos COP').trim();

    this.state.customerName = customerName;
    this.state.customerPhone = customerPhone;
    this.state.deliveryCity = deliveryCity;
    this.state.deliveryAddress = deliveryAddress;
    this.state.deliveryReference = deliveryReference;
    this.state.paymentMethod = paymentMethod;

    // 2. Validate required delivery fields
    let firstErrorEl = null;

    if (!customerName) {
      if (nameInput) {
        nameInput.classList.add('field-error-highlight');
        if (!firstErrorEl) firstErrorEl = nameInput;
      }
    } else if (nameInput) {
      nameInput.classList.remove('field-error-highlight');
    }

    if (!deliveryAddress) {
      if (addressInput) {
        addressInput.classList.add('field-error-highlight');
        if (!firstErrorEl) firstErrorEl = addressInput;
      }
    } else if (addressInput) {
      addressInput.classList.remove('field-error-highlight');
    }

    if (firstErrorEl) {
      firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstErrorEl.focus();
      alert('⚠️ Por favor completa tu Nombre y Dirección de Entrega para que el taller ShelliArt y PediGochos puedan coordinar la entrega de tu pedido.');
      return;
    }

    // Save to localStorage
    if (customerName) localStorage.setItem('customer_name', customerName);
    if (customerPhone) localStorage.setItem('customer_phone', customerPhone);
    if (deliveryAddress) localStorage.setItem('customer_address', deliveryAddress);

    // 3. Register quote and order silently to backend
    this.registerQuoteSilently();

    // 4. Open WhatsApp
    const waText = this.buildWhatsAppMessage();
    const waUrl = `https://wa.me/${this.resinWhatsAppNumber}?text=${waText}`;

    try {
      const win = window.open(waUrl, '_blank');
      if (!win) {
        window.location.href = waUrl;
      }
    } catch (err) {
      window.location.href = waUrl;
    }
  },

  async registerQuoteSilently() {
    try {
      const pricing = this.calculatePricing();
      const charmObj = this.charms.find(ch => ch.id === this.state.extraCharmId);
      const styleObj = this.styles.find(s => s.id === this.state.styleId);
      const clientName = this.state.customerName || localStorage.getItem('customer_name') || 'Cliente WhatsApp';
      const clientPhone = this.state.customerPhone || localStorage.getItem('customer_phone') || '3227949751';

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
        estimatedPriceUsd: pricing.totalUsd,
        deliveryCity: this.state.deliveryCity,
        deliveryAddress: this.state.deliveryAddress,
        deliveryReference: this.state.deliveryReference,
        paymentMethod: this.state.paymentMethod,
        gps: this.state.gps,
        gpsMapUrl: this.state.gps?.mapUrl || ''
      };

      await fetch('/api/resin-services/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn('Silent resin quote save err:', e);
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
