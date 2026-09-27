/* ==========================================================================
   Pintura y Latonería Automotriz ("Pinta tu Vehículo") - Logic
   PediGochos Specialized Services Module
   ========================================================================== */

const PaintServiceApp = {
  currentCategoryFilter: 'all',
  activeQuote: null,
  ws: null,
  paintWhatsAppNumber: '573227949751',
  paintWhatsAppDisplay: '322 794 9751',

  buildWhatsAppMessage(quote) {
    const isMoto = (quote.vehicleType || this.wizardState.vehicleType) === 'moto';
    let partsList = '';
    if (Array.isArray(quote.parts) && quote.parts.length > 0) {
      partsList = quote.parts.join(', ');
    } else if (Array.isArray(quote.selectedPieces) && quote.selectedPieces.length > 0) {
      partsList = quote.selectedPieces.map(p => this.getPieceLabel(p)).join(', ');
    } else {
      partsList = isMoto ? 'Moto Completa' : 'Vehículo Completo';
    }

    const priceText = quote.finalPrice || quote.agreedPrice?.usd
      ? `$${quote.finalPrice || quote.agreedPrice.usd} USD (Precio Acordado)`
      : `$${quote.estimatedRangeUsd || (quote.estimatedPriceRange ? `${quote.estimatedPriceRange.minUsd} - ${quote.estimatedPriceRange.maxUsd}` : '45 - 80')} USD`;

    const urgText = quote.urgency === 'urgente'
      ? '⚡ Urgente (24 - 48 horas)'
      : (quote.urgency === 'programada' ? '📅 Con Cita Previa' : 'Estándar (3 - 6 días)');

    const msg =
`🚗 *¡NUEVO PEDIDO DE LATONERÍA Y PINTURA!*
━━━━━━━━━━━━━━━━━━━━
🆔 *Cotización:* #${quote.id ? quote.id.slice(-6) : 'NUEVA'}
👤 *Cliente:* ${quote.customerName || quote.clientName || 'Cliente'}
📞 *Teléfono:* ${quote.customerPhone || quote.clientPhone || 'No indicado'}
🚘 *Vehículo / Modelo:* ${quote.vehicleModel || (quote.vehicleType || '').toUpperCase()}
🧩 *Piezas a Pintar:* ${partsList}

🎨 *Calidad de Pintura:* ${quote.paintQualityName || 'Gama Alta (Full Recomendado)'}
✨ *Barniz Transparente:* ${quote.varnishName || 'DuPont • Gama Alta A (Full Recomendado)'}
💎 *Pulitura Especializada:* ${quote.polishingTier || 'Solo Gama Alta (3M, Symplex & Cerámica)'}
🔨 *Latonería / Desabollado:* ${quote.hasLatoneria || quote.hasBodywork ? (quote.latoneriaSeverity || 'Leve').toUpperCase() : 'NO REQUIERE'}
⏱️ *Urgencia:* ${urgText}
💰 *Presupuesto Estimado:* ${priceText}
${quote.notes ? `📝 *Observaciones:* ${quote.notes}\n` : ''}━━━━━━━━━━━━━━━━━━━━
📍 *Enviado desde PediGochos App*
💬 *Taller Aliado WhatsApp: +57 322 794 9751*`;

    return encodeURIComponent(msg);
  },

  openWhatsAppForQuote(quote) {
    const text = this.buildWhatsAppMessage(quote);
    const waUrl = `https://wa.me/${this.paintWhatsAppNumber}?text=${text}`;
    try {
      const opened = window.open(waUrl, '_blank');
      if (!opened) {
        window.location.href = waUrl;
      }
    } catch (e) {
      window.location.href = waUrl;
    }
  },

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
    vehicleType: 'moto',
    selectedBrand: 'suzuki_gn_hj',
    selectedModel: 'suzuki_gn_125',
    customModelName: '',
    selectedPieces: ['gn_tanque'],
    modelSearchQuery: '',
    hasLatoneria: false,
    latoneriaSeverity: 'leve',
    finishType: 'bicapa',
    paintQuality: 'alta', // 'alta' (Poliéster y Tintas), 'media' (Acrílico), 'baja' (Laca)
    varnishQuality: 'alta_a', // 'alta_a' (Gama Alta A), 'media_b' (Gama Media B), 'baja_c' (Gama Baja C)
    varnishBrand: 'dupont', // 'dupont', 'glazury', 'pintuco', 'roberlo', 'gricoa'
    photos: [],
    urgency: 'estandar',
    date: '',
    customerName: '',
    customerPhone: '',
    notes: ''
  },

  // Vehicle Brands Catalog for Filter Chips
  vehicleBrands: {
    moto: [
      { id: 'suzuki_gn_hj', name: '⭐ Suzuki GN & HJ Cool' },
      { id: 'all', name: 'Todas' },
      { id: 'suzuki', name: 'Suzuki' },
      { id: 'bera', name: 'Bera' },
      { id: 'keeway', name: 'Empire Keeway' },
      { id: 'yamaha', name: 'Yamaha' },
      { id: 'honda', name: 'Honda' },
      { id: 'bajaj_tvs', name: 'Bajaj / TVS' },
      { id: 'otras', name: 'Otras' }
    ],
    sedan: [
      { id: 'all', name: 'Todas' },
      { id: 'chevrolet', name: 'Chevrolet' },
      { id: 'toyota', name: 'Toyota' },
      { id: 'ford', name: 'Ford' },
      { id: 'renault', name: 'Renault' },
      { id: 'nissan', name: 'Nissan' },
      { id: 'mazda', name: 'Mazda' },
      { id: 'hyundai_kia', name: 'Hyundai / Kia' },
      { id: 'volkswagen', name: 'Volkswagen' },
      { id: 'fiat_daewoo', name: 'Fiat / Daewoo' },
      { id: 'otras', name: 'Otras' }
    ],
    suv: [
      { id: 'all', name: 'Todas' },
      { id: 'toyota', name: 'Toyota' },
      { id: 'chevrolet', name: 'Chevrolet' },
      { id: 'ford', name: 'Ford' },
      { id: 'jeep', name: 'Jeep' },
      { id: 'mitsubishi', name: 'Mitsubishi' },
      { id: 'renault', name: 'Renault' },
      { id: 'daihatsu', name: 'Daihatsu' },
      { id: 'otras', name: 'Otras' }
    ],
    pickup: [
      { id: 'all', name: 'Todas' },
      { id: 'toyota', name: 'Toyota' },
      { id: 'chevrolet', name: 'Chevrolet' },
      { id: 'ford', name: 'Ford' },
      { id: 'dodge_ram', name: 'RAM' },
      { id: 'mitsubishi_mazda', name: 'Mitsubishi / Mazda' },
      { id: 'nissan', name: 'Nissan' },
      { id: 'otras', name: 'Otras' }
    ]
  },

  // Complete Models Database with specific piece categorization
  vehicleModels: {
    moto: [
      // Suzuki GN Series (Prominente y completa)
      { id: 'suzuki_gn_125', brand: 'suzuki', brandGroup: 'suzuki_gn_hj', name: 'Suzuki GN 125', pieceType: 'gn', badge: 'Popular', icon: '🏍️', image: 'images/vehicles/suzuki_gn.jpg' },
      { id: 'suzuki_gn_125f', brand: 'suzuki', brandGroup: 'suzuki_gn_hj', name: 'Suzuki GN 125F (Aspas/Disco)', pieceType: 'gn', badge: 'Destacada', icon: '🏍️', image: 'images/vehicles/suzuki_gn.jpg' },
      { id: 'suzuki_gn_250', brand: 'suzuki', brandGroup: 'suzuki_gn_hj', name: 'Suzuki GN 250', pieceType: 'gn', badge: 'Clásica', icon: '🏍️', image: 'images/vehicles/suzuki_gn_250.jpg' },
      { id: 'suzuki_gn_custom', brand: 'suzuki', brandGroup: 'suzuki_gn_hj', name: 'Suzuki GN Cafe Racer / Custom', pieceType: 'gn', badge: 'Custom', icon: '🏍️', image: 'images/vehicles/suzuki_gn_custom.jpg' },
      // Suzuki HJ Series (Prominente y completa)
      { id: 'suzuki_hj_125_cool', brand: 'suzuki', brandGroup: 'suzuki_gn_hj', name: 'Suzuki HJ 125 Cool (Haojue)', pieceType: 'hj_cool', badge: 'Top Ventas', icon: '🏍️', image: 'images/vehicles/suzuki_hj_cool.jpg' },
      { id: 'suzuki_hj_150_cool', brand: 'suzuki', brandGroup: 'suzuki_gn_hj', name: 'Suzuki HJ 150 Cool', pieceType: 'hj_cool', badge: 'Deportiva', icon: '🏍️', image: 'images/vehicles/suzuki_hj_150.jpg' },
      // Otras Suzuki
      { id: 'suzuki_gixxer_150_250', brand: 'suzuki', name: 'Suzuki Gixxer 150 / 250 (SF/NKD)', pieceType: 'sport_bike', badge: 'Sport', icon: '🏍️', image: 'images/vehicles/yamaha_fz.jpg' },
      { id: 'suzuki_en_125', brand: 'suzuki', name: 'Suzuki EN 125 / GSX 150', pieceType: 'naked', badge: '', icon: '🏍️', image: 'images/vehicles/suzuki_en.jpg' },
      { id: 'suzuki_ax_100', brand: 'suzuki', name: 'Suzuki AX 100 / AX 4', pieceType: 'naked', badge: '2 Tiempos', icon: '🏍️', image: 'images/vehicles/suzuki_ax100.jpg' },
      { id: 'suzuki_vivax_best', brand: 'suzuki', name: 'Suzuki Vivax 115 / Best 125', pieceType: 'scooter', badge: 'Semiauto', icon: '🛵', image: 'images/vehicles/moto_scooter.jpg' },
      { id: 'suzuki_dr_200_650', brand: 'suzuki', name: 'Suzuki DR 200 / DR 650', pieceType: 'enduro', badge: 'Enduro', icon: '🏍️', image: 'images/vehicles/suzuki_dr.jpg' },
      { id: 'suzuki_vstrom', brand: 'suzuki', name: 'Suzuki V-Strom 650 / 1000', pieceType: 'naked', badge: 'Touring', icon: '🏍️', image: 'images/vehicles/suzuki_vstrom.jpg' },
      // Bera
      { id: 'bera_sbr_150', brand: 'bera', name: 'Bera SBR 150 (New Bera)', pieceType: 'naked', badge: 'Muy Común', icon: '🏍️', image: 'images/vehicles/bera_sbr.jpg' },
      { id: 'bera_kavak_150', brand: 'bera', name: 'Bera Kavak 150', pieceType: 'naked', badge: 'Popular', icon: '🏍️', image: 'images/vehicles/bera_sbr.jpg' },
      { id: 'bera_socialista', brand: 'bera', name: 'Bera Socialista / Titán 150', pieceType: 'naked', badge: '', icon: '🏍️', image: 'images/vehicles/bera_socialista.jpg' },
      { id: 'bera_leon', brand: 'bera', name: 'Bera León 150 / 200', pieceType: 'naked', badge: '', icon: '🏍️', image: 'images/vehicles/bera_leon.jpg' },
      { id: 'bera_milan_150', brand: 'bera', name: 'Bera Milán 150 (Scooter)', pieceType: 'scooter', badge: 'Scooter', icon: '🛵', image: 'images/vehicles/moto_scooter.jpg' },
      { id: 'bera_meru_koko', brand: 'bera', name: 'Bera Merú / Koko (Scooter)', pieceType: 'scooter', badge: 'Scooter', icon: '🛵', image: 'images/vehicles/moto_scooter.jpg' },
      { id: 'bera_br_200', brand: 'bera', name: 'Bera BR 200 / DT', pieceType: 'enduro', badge: 'Cross', icon: '🏍️', image: 'images/vehicles/moto_enduro.jpg' },
      { id: 'bera_corralero_cross', brand: 'bera', name: 'Bera Corralero / DT 200 Cross', pieceType: 'enduro', badge: 'Trabajo', icon: '🏍️', image: 'images/vehicles/moto_enduro.jpg' },
      // Empire Keeway
      { id: 'keeway_horse', brand: 'keeway', name: 'Empire Keeway Horse 150 (I/II)', pieceType: 'naked', badge: 'Clásica', icon: '🏍️', image: 'images/vehicles/keeway_horse.jpg' },
      { id: 'keeway_speed_200', brand: 'keeway', name: 'Empire Keeway Speed 150 / 200', pieceType: 'naked', badge: 'Clásica', icon: '🏍️', image: 'images/vehicles/keeway_horse.jpg' },
      { id: 'keeway_arsen_2', brand: 'keeway', name: 'Empire Keeway Arsen II 150', pieceType: 'naked', badge: 'Deportiva', icon: '🏍️', image: 'images/vehicles/keeway_arsen.jpg' },
      { id: 'keeway_owen', brand: 'keeway', name: 'Empire Keeway Owen 150', pieceType: 'naked', badge: '', icon: '🏍️', image: 'images/vehicles/keeway_owen.jpg' },
      { id: 'keeway_express', brand: 'keeway', name: 'Empire Keeway Express 150', pieceType: 'naked', badge: 'Trabajo', icon: '🏍️', image: 'images/vehicles/keeway_horse.jpg' },
      { id: 'keeway_tx_200', brand: 'keeway', name: 'Empire Keeway TX 200', pieceType: 'enduro', badge: 'Enduro', icon: '🏍️', image: 'images/vehicles/keeway_tx.jpg' },
      { id: 'keeway_rkv_200', brand: 'keeway', name: 'Empire Keeway RKV 200', pieceType: 'naked', badge: '', icon: '🏍️', image: 'images/vehicles/keeway_arsen.jpg' },
      { id: 'keeway_rk6_tnt', brand: 'keeway', name: 'Empire Keeway RK6 / TNT 300/600', pieceType: 'sport_bike', badge: 'Alta Gama', icon: '🏍️', image: 'images/vehicles/keeway_arsen.jpg' },
      { id: 'keeway_outlook', brand: 'keeway', name: 'Empire Keeway Outlook 150', pieceType: 'scooter', badge: 'Scooter', icon: '🛵', image: 'images/vehicles/moto_scooter.jpg' },
      // Yamaha
      { id: 'yamaha_dt_125', brand: 'yamaha', name: 'Yamaha DT 125 / 175', pieceType: 'enduro', badge: 'Leyenda', icon: '🏍️', image: 'images/vehicles/yamaha_dt.jpg' },
      { id: 'yamaha_ybr_125', brand: 'yamaha', name: 'Yamaha YBR 125', pieceType: 'naked', badge: '', icon: '🏍️', image: 'images/vehicles/yamaha_ybr.jpg' },
      { id: 'yamaha_bws_125', brand: 'yamaha', name: 'Yamaha BWS 125', pieceType: 'scooter', badge: 'Scooter', icon: '🛵', image: 'images/vehicles/yamaha_bws.jpg' },
      { id: 'yamaha_fz_16', brand: 'yamaha', name: 'Yamaha FZ 16 / FZ 2.0', pieceType: 'naked', badge: '', icon: '🏍️', image: 'images/vehicles/yamaha_fz.jpg' },
      { id: 'yamaha_xt_660', brand: 'yamaha', name: 'Yamaha XT 660 / Ténéré', pieceType: 'enduro', badge: 'Alta Gama', icon: '🏍️', image: 'images/vehicles/suzuki_dr.jpg' },
      { id: 'yamaha_crypton_115', brand: 'yamaha', name: 'Yamaha Crypton 115', pieceType: 'scooter', badge: 'Semiauto', icon: '🛵', image: 'images/vehicles/moto_scooter.jpg' },
      // Honda
      { id: 'honda_cg_125', brand: 'honda', name: 'Honda CG 125 / Titán', pieceType: 'naked', badge: '', icon: '🏍️', image: 'images/vehicles/honda_cg.jpg' },
      { id: 'honda_xr_150', brand: 'honda', name: 'Honda XR 150L / 190L', pieceType: 'enduro', badge: 'Enduro', icon: '🏍️', image: 'images/vehicles/honda_xr.jpg' },
      { id: 'honda_tornado', brand: 'honda', name: 'Honda Tornado 250', pieceType: 'enduro', badge: 'Enduro', icon: '🏍️', image: 'images/vehicles/honda_tornado.jpg' },
      { id: 'honda_cbf_cb190', brand: 'honda', name: 'Honda CB 190R / CBF 150 / Invicta', pieceType: 'sport_bike', badge: 'Sport', icon: '🏍️', image: 'images/vehicles/honda_cg.jpg' },
      { id: 'honda_wave_110', brand: 'honda', name: 'Honda Wave 110 / Biz 125', pieceType: 'scooter', badge: 'Semiauto', icon: '🛵', image: 'images/vehicles/moto_scooter.jpg' },
      // Bajaj & TVS
      { id: 'bajaj_pulsar_ns200', brand: 'bajaj_tvs', name: 'Bajaj Pulsar NS 200 / RS 200 / 180', pieceType: 'sport_bike', badge: 'Top Sport', icon: '🏍️', image: 'images/vehicles/bajaj_pulsar.jpg' },
      { id: 'tvs_apache_160_200', brand: 'bajaj_tvs', name: 'TVS Apache RTR 160 / 180 / 200 4V', pieceType: 'sport_bike', badge: 'Sport', icon: '🏍️', image: 'images/vehicles/bajaj_pulsar.jpg' },
      // Otras Motos
      { id: 'moto_clasica_paseo', brand: 'otras', name: 'Moto Paseo / Clásica General', pieceType: 'naked', badge: '', icon: '🏍️', image: 'images/vehicles/moto_clasica.jpg' },
      { id: 'moto_scooter_gen', brand: 'otras', name: 'Scooter Automática General', pieceType: 'scooter', badge: 'Scooter', icon: '🛵', image: 'images/vehicles/moto_scooter.jpg' },
      { id: 'moto_enduro_gen', brand: 'otras', name: 'Moto Enduro / Cross General', pieceType: 'enduro', badge: 'Cross', icon: '🏍️', image: 'images/vehicles/moto_enduro.jpg' }
    ],
    sedan: [
      // Chevrolet
      { id: 'chevrolet_aveo', brand: 'chevrolet', name: 'Chevrolet Aveo (3/4/5 ptas)', pieceType: 'sedan', badge: 'Popular', icon: '🚗', image: 'images/vehicles/chevrolet_aveo.jpg' },
      { id: 'chevrolet_spark', brand: 'chevrolet', name: 'Chevrolet Spark / Matiz', pieceType: 'hatchback_compact', badge: '', icon: '🚗', image: 'images/vehicles/chevrolet_spark.jpg' },
      { id: 'chevrolet_corsa', brand: 'chevrolet', name: 'Chevrolet Corsa / Chevy', pieceType: 'hatchback_compact', badge: '', icon: '🚗', image: 'images/vehicles/chevrolet_corsa.jpg' },
      { id: 'chevrolet_optra', brand: 'chevrolet', name: 'Chevrolet Optra (Design / Advance)', pieceType: 'sedan', badge: '', icon: '🚗', image: 'images/vehicles/chevrolet_optra.jpg' },
      { id: 'chevrolet_cruze', brand: 'chevrolet', name: 'Chevrolet Cruze / Sonic', pieceType: 'sedan', badge: 'Moderno', icon: '🚗', image: 'images/vehicles/chevrolet_cruze.jpg' },
      { id: 'chevrolet_sail', brand: 'chevrolet', name: 'Chevrolet Sail / Cobalt', pieceType: 'sedan', badge: 'Económico', icon: '🚗', image: 'images/vehicles/sedan_general.jpg' },
      // Toyota
      { id: 'toyota_corolla', brand: 'toyota', name: 'Toyota Corolla (Baby / New / GLI / XEI)', pieceType: 'sedan', badge: 'Top', icon: '🚗', image: 'images/vehicles/toyota_corolla.jpg' },
      { id: 'toyota_yaris', brand: 'toyota', name: 'Toyota Yaris / Starlet', pieceType: 'hatchback_compact', badge: '', icon: '🚗', image: 'images/vehicles/toyota_yaris.jpg' },
      { id: 'toyota_yaris_belta', brand: 'toyota', name: 'Toyota Yaris Belta / Soluna / Etios', pieceType: 'sedan', badge: 'Económico', icon: '🚗', image: 'images/vehicles/toyota_yaris.jpg' },
      { id: 'toyota_camry', brand: 'toyota', name: 'Toyota Camry / Corona', pieceType: 'sedan', badge: 'Ejecutivo', icon: '🚗', image: 'images/vehicles/toyota_corolla.jpg' },
      // Ford
      { id: 'ford_fiesta', brand: 'ford', name: 'Ford Fiesta (Power / Max / Move)', pieceType: 'hatchback_compact', badge: 'Popular', icon: '🚗', image: 'images/vehicles/ford_fiesta.jpg' },
      { id: 'ford_focus', brand: 'ford', name: 'Ford Focus / Laser', pieceType: 'sedan', badge: '', icon: '🚗', image: 'images/vehicles/ford_focus.jpg' },
      // Renault
      { id: 'renault_logan', brand: 'renault', name: 'Renault Logan (Fase I / II)', pieceType: 'sedan', badge: 'Popular', icon: '🚗', image: 'images/vehicles/renault_logan.jpg' },
      { id: 'renault_symbol', brand: 'renault', name: 'Renault Symbol / Megane', pieceType: 'sedan', badge: 'Clásico', icon: '🚗', image: 'images/vehicles/renault_symbol.jpg' },
      { id: 'renault_sandero_clio', brand: 'renault', name: 'Renault Sandero / Clio / Stepway', pieceType: 'hatchback_compact', badge: 'Hatchback', icon: '🚗', image: 'images/vehicles/renault_clio.jpg' },
      { id: 'renault_twingo', brand: 'renault', name: 'Renault Twingo (16V / 8V)', pieceType: 'hatchback_compact', badge: 'Monovolumen', icon: '🚗', image: 'images/vehicles/renault_twingo.jpg' },
      // Nissan
      { id: 'nissan_sentra', brand: 'nissan', name: 'Nissan Sentra (B13 / B14 / B15 / B16)', pieceType: 'sedan', badge: 'Clásico', icon: '🚗', image: 'images/vehicles/nissan_sentra.jpg' },
      { id: 'nissan_tiida_versa', brand: 'nissan', name: 'Nissan Tiida / Versa / Almera', pieceType: 'sedan', badge: 'Familiar', icon: '🚗', image: 'images/vehicles/nissan_tiida.jpg' },
      // Mazda
      { id: 'mazda_3', brand: 'mazda', name: 'Mazda 3 (Sedán / Sport Hatch)', pieceType: 'sedan', badge: 'Destacado', icon: '🚗', image: 'images/vehicles/mazda_3.jpg' },
      { id: 'mazda_allegro_323', brand: 'mazda', name: 'Mazda Allegro / 323 / Mazda 6', pieceType: 'sedan', badge: 'Clásico', icon: '🚗', image: 'images/vehicles/mazda_allegro.jpg' },
      // Hyundai / Kia
      { id: 'hyundai_accent', brand: 'hyundai_kia', name: 'Hyundai Accent / Elantra', pieceType: 'sedan', badge: '', icon: '🚗', image: 'images/vehicles/hyundai_accent.jpg' },
      { id: 'hyundai_getz_i10', brand: 'hyundai_kia', name: 'Hyundai Getz / Atos / Grand i10', pieceType: 'hatchback_compact', badge: 'Compacto', icon: '🚗', image: 'images/vehicles/hyundai_accent.jpg' },
      { id: 'kia_rio', brand: 'hyundai_kia', name: 'Kia Rio / Cerato', pieceType: 'sedan', badge: '', icon: '🚗', image: 'images/vehicles/kia_rio.jpg' },
      { id: 'kia_picanto', brand: 'hyundai_kia', name: 'Kia Picanto', pieceType: 'hatchback_compact', badge: 'Económico', icon: '🚗', image: 'images/vehicles/kia_rio.jpg' },
      // Volkswagen
      { id: 'volkswagen_gol', brand: 'volkswagen', name: 'Volkswagen Gol / Parati / Fox', pieceType: 'hatchback_compact', badge: 'Popular', icon: '🚗', image: 'images/vehicles/vw_gol.jpg' },
      { id: 'volkswagen_jetta_bora', brand: 'volkswagen', name: 'Volkswagen Bora / Jetta / Vento', pieceType: 'sedan', badge: 'Sedán', icon: '🚗', image: 'images/vehicles/vw_jetta.jpg' },
      // Fiat / Daewoo
      { id: 'fiat_palio_siena', brand: 'fiat_daewoo', name: 'Fiat Palio / Siena / Uno / Punto', pieceType: 'hatchback_compact', badge: 'Económico', icon: '🚗', image: 'images/vehicles/fiat_palio.jpg' },
      { id: 'daewoo_cielo_lanos', brand: 'fiat_daewoo', name: 'Daewoo Cielo / Racer / Lanos', pieceType: 'sedan', badge: 'Clásico', icon: '🚗', image: 'images/vehicles/daewoo_cielo.jpg' },
      // Otras Marcas
      { id: 'honda_civic', brand: 'otras', name: 'Honda Civic (EX / LX / SI)', pieceType: 'sedan', badge: 'Top', icon: '🚗', image: 'images/vehicles/honda_civic.jpg' },
      { id: 'sedan_general', brand: 'otras', name: 'Otro Sedán / Hatchback', pieceType: 'sedan', badge: '', icon: '🚗', image: 'images/vehicles/sedan_general.jpg' }
    ],
    suv: [
      // Toyota
      { id: 'toyota_4runner', brand: 'toyota', name: 'Toyota 4Runner (SR5 / Limited / TRD)', pieceType: 'suv', badge: 'Destacada', icon: '🚙', image: 'images/vehicles/toyota_4runner.jpg' },
      { id: 'toyota_fortuner', brand: 'toyota', name: 'Toyota Fortuner (Hilux SW4)', pieceType: 'suv', badge: 'Top Ventas', icon: '🚙', image: 'images/vehicles/toyota_fortuner.jpg' },
      { id: 'toyota_landcruiser_autana', brand: 'toyota', name: 'Toyota Land Cruiser Autana / Burbuja (Serie 80)', pieceType: 'rustico_4x4', badge: 'Leyenda 4x4', icon: '🚙', image: 'images/vehicles/toyota_autana.jpg' },
      { id: 'toyota_prado_sumo', brand: 'toyota', name: 'Toyota Prado / Prado Sumo (3 ptas / 5 ptas)', pieceType: 'rustico_4x4', badge: 'Rústico', icon: '🚙', image: 'images/vehicles/toyota_prado.jpg' },
      { id: 'toyota_meru', brand: 'toyota', name: 'Toyota Land Cruiser Merú (FJ90)', pieceType: 'rustico_4x4', badge: '4x4', icon: '🚙', image: 'images/vehicles/toyota_prado.jpg' },
      { id: 'toyota_rav4', brand: 'toyota', name: 'Toyota RAV4', pieceType: 'suv', badge: '', icon: '🚙', image: 'images/vehicles/toyota_rav4.jpg' },
      // Chevrolet
      { id: 'chevrolet_grand_vitara', brand: 'chevrolet', name: 'Chevrolet Grand Vitara / XL7', pieceType: 'suv', badge: 'Popular', icon: '🚙', image: 'images/vehicles/chevrolet_vitara.jpg' },
      { id: 'chevrolet_trailblazer', brand: 'chevrolet', name: 'Chevrolet Trailblazer', pieceType: 'suv', badge: '', icon: '🚙', image: 'images/vehicles/chevrolet_trailblazer.jpg' },
      { id: 'chevrolet_tahoe_suburban', brand: 'chevrolet', name: 'Chevrolet Tahoe / Suburban', pieceType: 'suv', badge: 'Full Size', icon: '🚙', image: 'images/vehicles/chevrolet_tahoe.jpg' },
      // Ford
      { id: 'ford_explorer', brand: 'ford', name: 'Ford Explorer / Eddie Bauer', pieceType: 'suv', badge: '', icon: '🚙', image: 'images/vehicles/ford_explorer.jpg' },
      { id: 'ford_ecosport', brand: 'ford', name: 'Ford EcoSport / Escape', pieceType: 'suv', badge: '', icon: '🚙', image: 'images/vehicles/ford_ecosport.jpg' },
      { id: 'ford_expedition', brand: 'ford', name: 'Ford Expedition', pieceType: 'suv', badge: 'Full Size', icon: '🚙', image: 'images/vehicles/ford_explorer.jpg' },
      // Jeep
      { id: 'jeep_cherokee', brand: 'jeep', name: 'Jeep Cherokee (XJ / KK / Classic)', pieceType: 'rustico_4x4', badge: '4x4', icon: '🚙', image: 'images/vehicles/jeep_cherokee.jpg' },
      { id: 'jeep_grand_cherokee', brand: 'jeep', name: 'Jeep Grand Cherokee (WJ / WK / Laredo)', pieceType: 'suv', badge: 'Lujo', icon: '🚙', image: 'images/vehicles/jeep_grand_cherokee.jpg' },
      { id: 'jeep_wrangler', brand: 'jeep', name: 'Jeep Wrangler (YJ / TJ / JK / Rubicon)', pieceType: 'rustico_4x4', badge: 'Rústico Puro', icon: '🚙', image: 'images/vehicles/jeep_wrangler.jpg' },
      // Mitsubishi
      { id: 'mitsubishi_montero', brand: 'mitsubishi', name: 'Mitsubishi Montero / Montero Dakar (Pajero)', pieceType: 'rustico_4x4', badge: '4x4 Clásico', icon: '🚙', image: 'images/vehicles/mitsubishi_montero.jpg' },
      { id: 'mitsubishi_montero_sport', brand: 'mitsubishi', name: 'Mitsubishi Montero Sport / Nativa', pieceType: 'suv', badge: 'Familiar', icon: '🚙', image: 'images/vehicles/mitsubishi_montero.jpg' },
      // Renault
      { id: 'renault_duster', brand: 'renault', name: 'Renault Duster (4x2 / 4x4)', pieceType: 'suv', badge: 'Popular', icon: '🚙', image: 'images/vehicles/renault_duster.jpg' },
      // Daihatsu
      { id: 'daihatsu_terios', brand: 'daihatsu', name: 'Daihatsu Terios / Terios BeGo', pieceType: 'suv', badge: 'Popular', icon: '🚙', image: 'images/vehicles/daihatsu_terios.jpg' },
      // Otras Marcas
      { id: 'hyundai_tucson', brand: 'otras', name: 'Hyundai Tucson / Kia Sportage', pieceType: 'suv', badge: '', icon: '🚙', image: 'images/vehicles/hyundai_tucson.jpg' },
      { id: 'nissan_patrol', brand: 'otras', name: 'Nissan Patrol (Super Safari / Y60 / Y61)', pieceType: 'rustico_4x4', badge: '4x4 Pesado', icon: '🚙', image: 'images/vehicles/nissan_patrol.jpg' },
      { id: 'suv_general', brand: 'otras', name: 'Otra Camioneta / SUV', pieceType: 'suv', badge: '', icon: '🚙', image: 'images/vehicles/suv_general.jpg' }
    ],
    pickup: [
      // Toyota
      { id: 'toyota_hilux', brand: 'toyota', name: 'Toyota Hilux (Sencilla / Doble)', pieceType: 'pickup', badge: 'Destacada', icon: '🛻', image: 'images/vehicles/toyota_hilux.jpg' },
      { id: 'toyota_hilux_kavak', brand: 'toyota', name: 'Toyota Hilux Kavak / Vigo / Revo 4x4', pieceType: 'pickup', badge: 'Top', icon: '🛻', image: 'images/vehicles/toyota_hilux.jpg' },
      { id: 'toyota_machito', brand: 'toyota', name: 'Toyota Land Cruiser Machito (Serie 70)', pieceType: 'rustico_4x4', badge: 'Rústico', icon: '🛻', image: 'images/vehicles/toyota_machito.jpg' },
      { id: 'toyota_machito_hembrita', brand: 'toyota', name: 'Toyota Land Cruiser Hembrita (Chasis Largo Serie 79)', pieceType: 'rustico_4x4', badge: 'Chasis Largo', icon: '🛻', image: 'images/vehicles/toyota_machito.jpg' },
      // Chevrolet
      { id: 'chevrolet_silverado', brand: 'chevrolet', name: 'Chevrolet Silverado / Cheyenne / C10', pieceType: 'pickup_heavy', badge: 'Pesada', icon: '🛻', image: 'images/vehicles/chevrolet_silverado.jpg' },
      { id: 'chevrolet_silverado_z71', brand: 'chevrolet', name: 'Chevrolet Silverado Z71 / Cheyenne LTZ', pieceType: 'pickup_heavy', badge: 'V8 Pesada', icon: '🛻', image: 'images/vehicles/chevrolet_silverado.jpg' },
      { id: 'chevrolet_dmax', brand: 'chevrolet', name: 'Chevrolet D-Max / LUV', pieceType: 'pickup', badge: '', icon: '🛻', image: 'images/vehicles/chevrolet_dmax.jpg' },
      // Ford
      { id: 'ford_f150', brand: 'ford', name: 'Ford F-150 / Fortaleza / FX4', pieceType: 'pickup_heavy', badge: '', icon: '🛻', image: 'images/vehicles/ford_f150.jpg' },
      { id: 'ford_f350_superduty', brand: 'ford', name: 'Ford F-250 / F-350 Super Duty / Tritón', pieceType: 'pickup_heavy', badge: 'Super Duty', icon: '🛻', image: 'images/vehicles/ford_f150.jpg' },
      { id: 'ford_ranger', brand: 'ford', name: 'Ford Ranger (Cabina Simple / Doble)', pieceType: 'pickup', badge: '', icon: '🛻', image: 'images/vehicles/ford_ranger.jpg' },
      // RAM / Dodge
      { id: 'dodge_ram_1500_2500', brand: 'dodge_ram', name: 'RAM 1500 / 2500 Hemi 4x4', pieceType: 'pickup_heavy', badge: 'Pesada', icon: '🛻', image: 'images/vehicles/dodge_ram.jpg' },
      // Mitsubishi / Mazda
      { id: 'mitsubishi_l200', brand: 'mitsubishi_mazda', name: 'Mitsubishi L200 / Sportero 4x4', pieceType: 'pickup', badge: 'Diesel 4x4', icon: '🛻', image: 'images/vehicles/mitsubishi_l200.jpg' },
      { id: 'mazda_bt50', brand: 'mitsubishi_mazda', name: 'Mazda BT-50 / B2600', pieceType: 'pickup', badge: 'Trabajo', icon: '🛻', image: 'images/vehicles/ford_ranger.jpg' },
      // Nissan
      { id: 'nissan_frontier_d22', brand: 'nissan', name: 'Nissan Frontier / D22 / Navara', pieceType: 'pickup', badge: '4x4', icon: '🛻', image: 'images/vehicles/nissan_frontier.jpg' },
      // Otras Marcas
      { id: 'great_wall_wingle', brand: 'otras', name: 'Great Wall Wingle / Poer', pieceType: 'pickup', badge: 'Trabajo', icon: '🛻', image: 'images/vehicles/pickup_general.jpg' },
      { id: 'pickup_general', brand: 'otras', name: 'Otra Pick-up / Rústico', pieceType: 'pickup', badge: '', icon: '🛻', image: 'images/vehicles/pickup_general.jpg' }
    ]
  },

  // Specific Paintable Parts per Vehicle Category / Model Group
  modelPieceSets: {
    // Suzuki GN Series (GN 125, GN 125F, GN 250, Custom)
    'gn': {
      'gn_tanque': { name: 'Tanque de Gasolina (Fileteado / Emblemas GN)', baseUsd: 26, icon: '⛽', tag: 'Depósito Central' },
      'gn_tapa_izq': { name: 'Tapa Lateral Izquierda (Batería)', baseUsd: 12, icon: '🛡️', tag: 'Cacha Izq' },
      'gn_tapa_der': { name: 'Tapa Lateral Derecha (Filtro)', baseUsd: 12, icon: '🛡️', tag: 'Cacha Der' },
      'gn_guarda_del': { name: 'Guardabarro Delantero Metálico GN', baseUsd: 16, icon: '🛞', tag: 'Delantero' },
      'gn_guarda_tra': { name: 'Guardabarro Trasero Metálico con Stop', baseUsd: 16, icon: '🛞', tag: 'Trasero' },
      'gn_rines': { name: 'Par de Rines (Aspas o Radios GN)', baseUsd: 28, icon: '⚪', tag: '2 Rines' },
      'gn_chasis': { name: 'Chasis / Cuadro Principal (Horneado)', baseUsd: 38, icon: '📐', tag: 'Estructura' },
      'gn_tijera': { name: 'Tijera / Horquilla Trasera GN', baseUsd: 18, icon: '🔧', tag: 'Suspensión' },
      'gn_faro_taco': { name: 'Carcasa Faro Delantero y Copas Tacómetro', baseUsd: 14, icon: '💡', tag: 'Frente' },
      'gn_parrilla': { name: 'Parrilla Trasera / Porta Bultos Metálica', baseUsd: 14, icon: '🏁', tag: 'Soporte' },
      'gn_tapas_motor': { name: 'Tapas de Motor GN (Pintura Alta Temp.)', baseUsd: 22, icon: '⚙️', tag: 'Térmica' }
    },

    // Suzuki HJ Cool Series (HJ 125 Cool, HJ 150 Cool)
    'hj_cool': {
      'hj_tanque': { name: 'Tanque Deportivo con Emblemas 3D HJ Cool', baseUsd: 28, icon: '⛽', tag: 'Tanque Sport' },
      'hj_aletas_tanque': { name: 'Aletas / Deflectores Laterales de Tanque (Par)', baseUsd: 16, icon: '⚡', tag: 'Aletas' },
      'hj_tapas_lat': { name: 'Tapas Laterales Deportivas HJ (Par)', baseUsd: 15, icon: '🛡️', tag: 'Cachas Par' },
      'hj_colin': { name: 'Colín Trasero / Carenaje de Cola HJ Cool', baseUsd: 18, icon: '🚀', tag: 'Cola Sport' },
      'hj_careta': { name: 'Careta Delantera con Visera Deportiva', baseUsd: 16, icon: '🎭', tag: 'Frente' },
      'hj_guarda_del': { name: 'Guardabarro Delantero Deportivo HJ', baseUsd: 14, icon: '🛞', tag: 'Delantero' },
      'hj_pechera': { name: 'Quilla / Pechera Inferior de Motor', baseUsd: 18, icon: '🛡️', tag: 'Quilla Sport' },
      'hj_rines': { name: 'Par de Rines de Aspas Deportivos HJ', baseUsd: 28, icon: '⚪', tag: '2 Rines' },
      'hj_chasis_tijera': { name: 'Chasis Principal y Tijera Trasera', baseUsd: 38, icon: '📐', tag: 'Estructura' },
      'hj_asideros': { name: 'Asideros Traseros / Agarraderas Pasajero', baseUsd: 12, icon: '🤝', tag: 'Manijas' },
      'hj_tapas_motor': { name: 'Tapas de Motor HJ Cool (Pintura Alta Temp.)', baseUsd: 20, icon: '⚙️', tag: 'Térmica' }
    },

    // Motos Deportivas y Sport (Gixxer, Pulsar NS/RS, Apache, RK6, TNT, CB190, R3)
    'sport_bike': {
      'sp_tanque': { name: 'Tanque Deportivo con Protectores y Tomas de Aire', baseUsd: 28, icon: '⛽', tag: 'Tanque Sport' },
      'sp_carenaje_frontal': { name: 'Carenaje Frontal / Cúpula Aerodinámica', baseUsd: 22, icon: '🎭', tag: 'Frontal' },
      'sp_carenajes_lat': { name: 'Carenajes Laterales Sport (Izquierdo y Derecho)', baseUsd: 26, icon: '🛡️', tag: 'Laterales' },
      'sp_quilla': { name: 'Quilla / Pechera Inferior de Motor', baseUsd: 18, icon: '🛡️', tag: 'Quilla' },
      'sp_colin': { name: 'Colín Trasero Deportivo / Carenado de Asiento', baseUsd: 20, icon: '🚀', tag: 'Cola Sport' },
      'sp_guarda_del': { name: 'Guardabarro Delantero Aerodinámico', baseUsd: 15, icon: '🛞', tag: 'Rueda Del' },
      'sp_rines': { name: 'Par de Rines Deportivos de Aleación Bicolor', baseUsd: 30, icon: '⚪', tag: '2 Rines' },
      'sp_chasis': { name: 'Chasis Perimetral y Basculante Trasero', baseUsd: 40, icon: '📐', tag: 'Estructura' },
      'sp_retrovisores': { name: 'Espejos Retrovisores Deportivos (Par)', baseUsd: 12, icon: '🪞', tag: 'Espejos' },
      'sp_tapas_motor': { name: 'Tapas de Motor (Pintura Cerámica / Alta Temp.)', baseUsd: 22, icon: '⚙️', tag: 'Térmica' }
    },

    // Motos Naked y Paseo (Bera SBR, Horse, Arsen, Owen, YBR, CG, Kavak, etc.)
    'naked': {
      'moto_tanque': { name: 'Tanque de Gasolina', baseUsd: 26, icon: '⛽', tag: 'Depósito' },
      'moto_tapas_lat': { name: 'Tapas Laterales / Cachas (Par)', baseUsd: 14, icon: '🛡️', tag: 'Laterales' },
      'moto_guarda_del': { name: 'Guardabarro Delantero', baseUsd: 14, icon: '🛞', tag: 'Frontal' },
      'moto_guarda_tra': { name: 'Guardabarro Trasero / Colín', baseUsd: 14, icon: '🛞', tag: 'Trasero' },
      'moto_careta_faro': { name: 'Careta Frontal / Carcasa de Faro', baseUsd: 12, icon: '💡', tag: 'Faro' },
      'moto_rines': { name: 'Par de Rines (Aspas o Radios)', baseUsd: 26, icon: '⚪', tag: '2 Rines' },
      'moto_chasis': { name: 'Chasis Principal y Tijera', baseUsd: 38, icon: '📐', tag: 'Cuadro' },
      'moto_parrilla': { name: 'Parrilla o Agarradera Trasera', baseUsd: 12, icon: '🏁', tag: 'Cola' },
      'moto_tapas_motor': { name: 'Tapas de Motor (Pintura Alta Temp.)', baseUsd: 20, icon: '⚙️', tag: 'Térmica' }
    },

    // Motos Scooter y Semiautomáticas (Bera Merú/Koko, Milán, BWS, Outlook, Vivax, Crypton, Wave)
    'scooter': {
      'scoot_careta': { name: 'Careta Delantera y Cubre Manubrio', baseUsd: 18, icon: '🎭', tag: 'Manillar' },
      'scoot_pechera': { name: 'Pechera / Escudo Frontal Principal', baseUsd: 24, icon: '🛡️', tag: 'Frontal' },
      'scoot_costados': { name: 'Laterales / Costados Traseros (Par)', baseUsd: 25, icon: '🛡️', tag: 'Costados' },
      'scoot_guarda_del': { name: 'Guardabarro Delantero', baseUsd: 14, icon: '🛞', tag: 'Rueda' },
      'scoot_quilla': { name: 'Piso y Quilla Inferior', baseUsd: 18, icon: '🛴', tag: 'Piso' },
      'scoot_rines': { name: 'Par de Rines de Scooter / Semiauto', baseUsd: 22, icon: '⚪', tag: '2 Rines' },
      'scoot_aleron': { name: 'Alerón / Agarradera Trasera Pasajero', baseUsd: 12, icon: '🚀', tag: 'Alerón' },
      'scoot_tapa_guantera': { name: 'Tapa Guantera / Cubierta Interior', baseUsd: 12, icon: '📦', tag: 'Interior' }
    },

    // Motos Enduro / Cross (DR 200/650, XR, Tornado, DT 125, TX, XT 660, Corralero)
    'enduro': {
      'end_tanque': { name: 'Tanque de Combustible Enduro', baseUsd: 25, icon: '⛽', tag: 'Tanque' },
      'end_aletas': { name: 'Aletas Laterales de Tanque / Radiador (Par)', baseUsd: 16, icon: '🛡️', tag: 'Aletas' },
      'end_guarda_del': { name: 'Guardabarro Delantero Alto Cross (Pico de Loro)', baseUsd: 15, icon: '🛞', tag: 'Cross' },
      'end_guarda_tra': { name: 'Guardabarro Trasero Enduro / Cola de Pato', baseUsd: 14, icon: '🛞', tag: 'Cola' },
      'end_tapas_lat': { name: 'Tapas Laterales Porta-Número (Par)', baseUsd: 14, icon: '🛡️', tag: 'Placas' },
      'end_careta': { name: 'Careta Delantera de Faro / Portanúmero', baseUsd: 12, icon: '🎭', tag: 'Faro' },
      'end_chasis': { name: 'Chasis Principal y Tijera Enduro', baseUsd: 38, icon: '📐', tag: 'Estructura' },
      'end_rines': { name: 'Par de Rines de Radios Reforzados Enduro', baseUsd: 28, icon: '⚪', tag: '2 Rines' },
      'end_cortavientos': { name: 'Cortavientos / Protectores de Puños (Par)', baseUsd: 10, icon: '🧤', tag: 'Manos' },
      'end_cubrecarter': { name: 'Protector de Motor / Cubrecárter Metálico', baseUsd: 14, icon: '🛡️', tag: 'Motor' }
    },

    // Sedán de 4 puertas (Corolla, Aveo 4 ptas, Optra, Cruze, Logan, Sentra, Civic, Jetta, Tiida)
    'sedan': {
      'car_parachoque_del': { name: 'Parachoques Delantero', baseUsd: 48, icon: '🚗', tag: 'Frente' },
      'car_parachoque_tra': { name: 'Parachoques Trasero', baseUsd: 48, icon: '🚗', tag: 'Atrás' },
      'car_capo': { name: 'Capó / Bonete', baseUsd: 55, icon: '🚘', tag: 'Motor' },
      'car_techo': { name: 'Techo', baseUsd: 60, icon: '🏠', tag: 'Superior' },
      'car_puerta_del_izq': { name: 'Puerta Delantera Izquierda (Piloto)', baseUsd: 45, icon: '🚪', tag: 'Piloto' },
      'car_puerta_del_der': { name: 'Puerta Delantera Derecha (Copiloto)', baseUsd: 45, icon: '🚪', tag: 'Copiloto' },
      'car_puerta_tra_izq': { name: 'Puerta Trasera Izquierda', baseUsd: 45, icon: '🚪', tag: 'Pasajero' },
      'car_puerta_tra_der': { name: 'Puerta Trasera Derecha', baseUsd: 45, icon: '🚪', tag: 'Pasajero' },
      'car_guardafangos': { name: 'Guardafangos Delanteros (Par)', baseUsd: 50, icon: '🛡️', tag: 'Aletas' },
      'car_costados_tra': { name: 'Costados Traseros (Par)', baseUsd: 55, icon: '🛡️', tag: 'Costados' },
      'car_maleta': { name: 'Maleta / Tapa de Baúl Trasera', baseUsd: 48, icon: '📦', tag: 'Maletero' },
      'car_espejos': { name: 'Espejos Retrovisores (Par)', baseUsd: 20, icon: '🪞', tag: 'Retrovisores' },
      'car_estribos': { name: 'Estribos / Zócalos Inferiores (Par)', baseUsd: 25, icon: '🪜', tag: 'Zócalos' },
      'car_spoiler': { name: 'Spoiler / Alerón de Maleta', baseUsd: 22, icon: '🚀', tag: 'Alerón' }
    },

    // Hatchbacks y Compactos Urbanos (Spark, Corsa, Gol, Palio, Clio, Sandero, Twingo, Fiesta Hatch, Getz, Picanto)
    'hatchback_compact': {
      'hb_parachoque_del': { name: 'Parachoques Delantero Compacto', baseUsd: 45, icon: '🚗', tag: 'Frente' },
      'hb_parachoque_tra': { name: 'Parachoques Trasero Compacto', baseUsd: 45, icon: '🚗', tag: 'Atrás' },
      'hb_capo': { name: 'Capó / Bonete', baseUsd: 50, icon: '🚘', tag: 'Motor' },
      'hb_techo': { name: 'Techo Completo', baseUsd: 55, icon: '🏠', tag: 'Superior' },
      'hb_compuerta_hb': { name: 'Compuerta Trasera Hatchback (con marco de luneta)', baseUsd: 50, icon: '📦', tag: 'Compuerta' },
      'hb_puertas_del': { name: 'Puertas Delanteras (Par)', baseUsd: 85, icon: '🚪', tag: 'Delanteras' },
      'hb_puertas_tra': { name: 'Puertas Traseras (Par o Costados 3ptas)', baseUsd: 85, icon: '🚪', tag: 'Traseras' },
      'hb_guardafangos': { name: 'Guardafangos Delanteros (Par)', baseUsd: 48, icon: '🛡️', tag: 'Guardafangos' },
      'hb_costados_tra': { name: 'Costados Traseros (Par)', baseUsd: 52, icon: '🛡️', tag: 'Costados' },
      'hb_espejos': { name: 'Espejos Retrovisores (Par)', baseUsd: 18, icon: '🪞', tag: 'Espejos' },
      'hb_aleron_techo': { name: 'Spoiler / Alerón de Techo Deportivo', baseUsd: 20, icon: '🚀', tag: 'Alerón' },
      'hb_estribos': { name: 'Faldones / Zócalos Laterales (Par)', baseUsd: 24, icon: '🪜', tag: 'Zócalos' }
    },

    // Camioneta / SUV Familiar y Moderna (4Runner, Fortuner, Grand Vitara, Explorer, EcoSport, Tucson, RAV4, Duster, Tahoe, Terios)
    'suv': {
      'suv_parachoque_del': { name: 'Parachoques Delantero SUV', baseUsd: 55, icon: '🚙', tag: 'Frente' },
      'suv_parachoque_tra': { name: 'Parachoques Trasero SUV', baseUsd: 55, icon: '🚙', tag: 'Atrás' },
      'suv_capo': { name: 'Capó / Bonete SUV', baseUsd: 60, icon: '🚘', tag: 'Capó' },
      'suv_techo': { name: 'Techo Completo SUV', baseUsd: 75, icon: '🏠', tag: 'Techo' },
      'suv_puertas_del': { name: 'Puertas Delanteras (Par)', baseUsd: 90, icon: '🚪', tag: 'Delanteras' },
      'suv_puertas_tra': { name: 'Puertas Traseras (Par)', baseUsd: 90, icon: '🚪', tag: 'Traseras' },
      'suv_guardafangos': { name: 'Guardafangos Delanteros (Par)', baseUsd: 55, icon: '🛡️', tag: 'Guardafangos' },
      'suv_costados_tra': { name: 'Costados Traseros SUV (Par)', baseUsd: 60, icon: '🛡️', tag: 'Costados' },
      'suv_compuerta': { name: 'Compuerta de Maleta Trasera', baseUsd: 55, icon: '📦', tag: 'Compuerta' },
      'suv_espejos': { name: 'Espejos Retrovisores (Par)', baseUsd: 20, icon: '🪞', tag: 'Espejos' },
      'suv_estribos': { name: 'Estribos y Molduras Plásticas Laterales', baseUsd: 30, icon: '🪜', tag: 'Estribos' },
      'suv_spoiler': { name: 'Spoiler Superior de Compuerta', baseUsd: 22, icon: '🚀', tag: 'Alerón' },
      'suv_barras_techo': { name: 'Barras / Rieles de Techo Portaequipaje', baseUsd: 25, icon: '🏁', tag: 'Techo' }
    },

    // Rústicos Puros y Todoterrenos 4x4 (Toyota Machito, Autana, Burbuja, Hembrita, Merú, Prado Sumo, Jeep Wrangler, Cherokee, Montero, Patrol)
    'rustico_4x4': {
      'rus_capo': { name: 'Capó Metálico con Tomas de Aire / Refuerzo', baseUsd: 65, icon: '🚘', tag: 'Capó 4x4' },
      'rus_parachoque_del': { name: 'Defensa Delantera de Hierro / Parachoques Tipo ARB', baseUsd: 60, icon: '🛡️', tag: 'Defensa Del.' },
      'rus_parachoque_tra': { name: 'Parachoques Trasero Reforzado con Porta-Repuesto', baseUsd: 55, icon: '🛡️', tag: 'Defensa Tras.' },
      'rus_techo_hardtop': { name: 'Techo Completo / Hard Top Rústico', baseUsd: 80, icon: '🏠', tag: 'Techo 4x4' },
      'rus_puertas_del': { name: 'Puertas Delanteras (Par)', baseUsd: 90, icon: '🚪', tag: 'Delanteras' },
      'rus_puertas_tra': { name: 'Puertas Traseras / Portón Rústico Doble Hoja', baseUsd: 70, icon: '🚪', tag: 'Compuertas' },
      'rus_guardafangos': { name: 'Guardafangos Delanteros Metálicos (Par)', baseUsd: 58, icon: '🛡️', tag: 'Guardafangos' },
      'rus_cantoneras': { name: 'Cantoneras / Fenders Anchos 4x4 (Juego de 4)', baseUsd: 45, icon: '🛞', tag: 'Fenders 4x4' },
      'rus_estribos': { name: 'Estribos Tubulares 4x4 Rock-Sliders', baseUsd: 35, icon: '🪜', tag: 'Estribos' },
      'rus_mascara': { name: 'Máscara / Careta Frontal con Rejilla', baseUsd: 25, icon: '🎭', tag: 'Frente' },
      'rus_snorkel': { name: 'Snorkel / Toma de Aire Elevada', baseUsd: 20, icon: '💨', tag: 'Snorkel' },
      'rus_parrilla_techo': { name: 'Parrilla / Canasta de Techo Safari 4x4', baseUsd: 40, icon: '🏁', tag: 'Safari' },
      'rus_espejos': { name: 'Espejos Retrovisores Rústicos (Par)', baseUsd: 20, icon: '🪞', tag: 'Espejos' }
    },

    // Pick-up Mediana / Doble Cabina (Hilux, D-Max, Ranger, L200, BT-50, Frontier, Wingle)
    'pickup': {
      'pk_parachoque_del': { name: 'Parachoques Delantero Pick-up', baseUsd: 55, icon: '🛻', tag: 'Frente' },
      'pk_parachoque_tra': { name: 'Parachoques Trasero con Escalón Reforzado', baseUsd: 50, icon: '🛻', tag: 'Atrás' },
      'pk_capo': { name: 'Capó / Bonete', baseUsd: 60, icon: '🚘', tag: 'Capó' },
      'pk_techo': { name: 'Techo de Cabina', baseUsd: 65, icon: '🏠', tag: 'Cabina' },
      'pk_puertas_del': { name: 'Puertas Delanteras (Par)', baseUsd: 90, icon: '🚪', tag: 'Delanteras' },
      'pk_puertas_tra': { name: 'Puertas Traseras (Doble Cabina)', baseUsd: 90, icon: '🚪', tag: 'Traseras' },
      'pk_guardafangos': { name: 'Guardafangos Delanteros (Par)', baseUsd: 55, icon: '🛡️', tag: 'Guardafangos' },
      'pk_platon': { name: 'Costados Exteriores de Platón / Batea (Par)', baseUsd: 90, icon: '📦', tag: 'Platón' },
      'pk_compuerta': { name: 'Compuerta Trasera de Platón', baseUsd: 50, icon: '🛡️', tag: 'Compuerta' },
      'pk_rollbar': { name: 'Barra Antivuelco / Rollbar Tubular de Platón', baseUsd: 30, icon: '🔧', tag: 'Rollbar' },
      'pk_espejos': { name: 'Espejos Retrovisores (Par)', baseUsd: 20, icon: '🪞', tag: 'Espejos' },
      'pk_estribos': { name: 'Estribos Laterales de Cabina (Par)', baseUsd: 30, icon: '🪜', tag: 'Estribos' },
      'pk_parrilla': { name: 'Parrilla Frontal / Careta', baseUsd: 25, icon: '🛡️', tag: 'Parrilla' }
    },

    // Pick-up Grande / Heavy Duty (Silverado Z71, F-150 / F-250 / F-350 Tritón, RAM 1500/2500)
    'pickup_heavy': {
      'pkh_capo': { name: 'Capó Abultado / Powerdome Heavy Duty', baseUsd: 70, icon: '🚘', tag: 'Capó V8' },
      'pkh_parachoque_del': { name: 'Parachoques Delantero Heavy Duty / Cromado', baseUsd: 65, icon: '🛻', tag: 'Frente HD' },
      'pkh_parachoque_tra': { name: 'Parachoques Trasero con Escalón Reforzado', baseUsd: 55, icon: '🛻', tag: 'Atrás HD' },
      'pkh_techo': { name: 'Techo de Cabina Extendida / Crew Cab', baseUsd: 75, icon: '🏠', tag: 'Cabina' },
      'pkh_puertas_del': { name: 'Puertas Delanteras Heavy Duty (Par)', baseUsd: 95, icon: '🚪', tag: 'Delanteras' },
      'pkh_puertas_tra': { name: 'Puertas Traseras de Cabina (Par)', baseUsd: 95, icon: '🚪', tag: 'Traseras' },
      'pkh_guardafangos': { name: 'Guardafangos Delanteros Amplios (Par)', baseUsd: 60, icon: '🛡️', tag: 'Guardafangos' },
      'pkh_platon': { name: 'Platón / Batea Larga con Costados Exteriores (Par)', baseUsd: 110, icon: '📦', tag: 'Batea Larga' },
      'pkh_compuerta': { name: 'Compuerta de Platón con Aplique / Emblemas', baseUsd: 55, icon: '🛡️', tag: 'Compuerta' },
      'pkh_fenders': { name: 'Cantoneras / Aletines de Platón (Par)', baseUsd: 35, icon: '🛞', tag: 'Aletines' },
      'pkh_rollbar': { name: 'Rollbar / Cargador Tubular Heavy Duty', baseUsd: 35, icon: '🔧', tag: 'Rollbar' },
      'pkh_estribos': { name: 'Estribos Laterales Tipo Plataforma (Par)', baseUsd: 35, icon: '🪜', tag: 'Estribos' },
      'pkh_parrilla': { name: 'Parrilla Frontal Gigante / Cromada', baseUsd: 35, icon: '🛡️', tag: 'Parrilla' },
      'pkh_espejos': { name: 'Retrovisores Extendibles de Remolque (Par)', baseUsd: 25, icon: '🪞', tag: 'Remolque' }
    }
  },

  // Legacy flat pieceLabels getter for backwards compatibility
  get pieceLabels() {
    const map = {};
    Object.values(this.modelPieceSets).forEach(set => {
      Object.entries(set).forEach(([k, v]) => {
        map[k] = v.name;
      });
    });
    return map;
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

  // Model & Piece Helper Methods
  getCurrentModelObj() {
    const list = this.vehicleModels[this.wizardState.vehicleType] || [];
    return list.find(m => m.id === this.wizardState.selectedModel) || list[0] || { id: 'custom', name: 'Vehículo Estándar', pieceType: 'naked' };
  },

  getCurrentPiecesMap() {
    const model = this.getCurrentModelObj();
    const type = this.wizardState.vehicleType;
    let pieceSetKey = 'naked';
    if (model && model.pieceType && this.modelPieceSets[model.pieceType]) {
      pieceSetKey = model.pieceType;
    } else if (this.modelPieceSets[type]) {
      pieceSetKey = type;
    }
    return this.modelPieceSets[pieceSetKey] || this.modelPieceSets['naked'];
  },

  getPieceLabel(key) {
    const pieces = this.getCurrentPiecesMap();
    if (pieces[key]) return pieces[key].name;
    for (const set of Object.values(this.modelPieceSets)) {
      if (set[key]) return set[key].name;
    }
    return key;
  },

  // Calidades de Pintura Base
  paintQualities: [
    {
      id: 'alta',
      name: 'Poliéster y Tintas',
      tier: 'Gama Alta (Full Recomendado)',
      tierShort: 'Gama Alta',
      recommendation: '(Full Recomendado)',
      badge: 'Brillo y Cobertura Suprema',
      desc: 'Bicapa/Tricapa poliéster de máxima resistencia, pigmentación pura, tintas concentradas y alta estabilidad UV.',
      multiplier: 1.15,
      icon: '✨'
    },
    {
      id: 'media',
      name: 'Acrílico Automotriz',
      tier: 'Gama Media (Básico)',
      tierShort: 'Gama Media',
      recommendation: '(Básico)',
      badge: 'Estándar Balanceado',
      desc: 'Pintura acrílica automotriz de secado al horno, duradera y de excelente rendimiento comercial.',
      multiplier: 1.0,
      icon: '🎨'
    },
    {
      id: 'baja',
      name: 'Laca Tradicional',
      tier: 'Gama Baja (Poco Recomendado)',
      tierShort: 'Gama Baja',
      recommendation: '(Poco Recomendado)',
      badge: 'Económica',
      desc: 'Laca nitrocelulosa tradicional para presupuestos accesibles o retoques puntuales.',
      multiplier: 0.88,
      icon: '🖌️'
    }
  ],

  // Calidades de Barniz Transparente (Clear Coat)
  varnishCategories: [
    {
      id: 'alta_a',
      tier: 'Gama Alta A (Full Recomendado)',
      tierShort: 'Gama Alta A',
      recommendation: '(Full Recomendado)',
      badge: '⭐ Acabado Show Car / Filtro UV Superior',
      desc: 'Transparente de poliuretano de alta densidad, efecto espejo profundo y máxima dureza contra arañazos.',
      multiplier: 1.25,
      brands: [
        { id: 'dupont', name: 'DuPont', sub: 'CromaClear / Standox Ultra' },
        { id: 'glazury', name: 'Glasurit (Glazury)', sub: 'Basf 923 Premium Clear' }
      ]
    },
    {
      id: 'media_b',
      tier: 'Gama Media B (Básico)',
      tierShort: 'Gama Media B',
      recommendation: '(Básico)',
      badge: 'Protección Comercial Garantizada',
      desc: 'Transparente 2K de gran nivelación, excelente brillo y curado uniforme para uso diario.',
      multiplier: 1.0,
      brands: [
        { id: 'pintuco', name: 'Pintuco', sub: 'Poliuretano 2K Automotriz' },
        { id: 'roberlo', name: 'Roberlo', sub: 'Kronox 610 / Unix 150' }
      ]
    },
    {
      id: 'baja_c',
      tier: 'Gama Baja C (Poco Recomendado)',
      tierShort: 'Gama Baja C',
      recommendation: '(Poco Recomendado)',
      badge: 'Opción Económica',
      desc: 'Barniz transparente directo tradicional para trabajos económicos.',
      multiplier: 0.85,
      brands: [
        { id: 'gricoa', name: 'Gricoa', sub: 'Transparente Estándar' }
      ]
    }
  ],

  // Materiales de Pulitura Exclusivos (Solo se maneja Gama Alta)
  polishingMaterials: [
    { name: 'Lijas 1500, 2000, 3000, 5000 3M', desc: 'Asentado micrométrico al agua (Trizact) para eliminar piel de naranja', icon: '📄' },
    { name: 'Robin 3M', desc: 'Pasta de corte rápido para desbaste fino y remoción de micro-rayas', icon: '🧴' },
    { name: 'Symplex Piraña', desc: 'Compuesto de pulido y abrillantado de corte medio y brillo espejo', icon: '🦈' },
    { name: 'Cerámica (Sellado)', desc: 'Sellador cerámico que sella el barniz, aporta repelencia hidrofóbica y acabado vitrificado', icon: '💎' }
  ],

  getCurrentPaintQualityObj() {
    return this.paintQualities.find(p => p.id === this.wizardState.paintQuality) || this.paintQualities[0];
  },

  getCurrentVarnishTierObj() {
    return this.varnishCategories.find(v => v.id === this.wizardState.varnishQuality) || this.varnishCategories[0];
  },

  getCurrentVarnishBrandObj() {
    const tier = this.getCurrentVarnishTierObj();
    return tier.brands.find(b => b.id === this.wizardState.varnishBrand) || tier.brands[0];
  },

  selectPaintQuality(qualityId) {
    this.wizardState.paintQuality = qualityId;
    this.renderQuoterStep();
  },

  selectVarnishTier(tierId) {
    this.wizardState.varnishQuality = tierId;
    const tier = this.varnishCategories.find(v => v.id === tierId);
    if (tier && tier.brands && tier.brands.length > 0) {
      this.wizardState.varnishBrand = tier.brands[0].id;
    }
    this.renderQuoterStep();
  },

  selectVarnishBrand(brandId) {
    this.wizardState.varnishBrand = brandId;
    this.renderQuoterStep();
  },

  getFinishName(finishKey) {
    const map = {
      'monocapa': 'Monocapa Directo (Económico)',
      'bicapa': 'Bicapa Poliuretano (Garantía & Brillo)',
      'tricapa': 'Tricapa Perlado (Efecto Show Car)',
      'mate': 'Barniz Mate Sedoso'
    };
    return map[finishKey] || 'Bicapa Estándar';
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
    if (typeof MarketplaceApp !== 'undefined' && MarketplaceApp.updateFloatingAndHeaderSos) {
      MarketplaceApp.updateFloatingAndHeaderSos(true);
    }
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
    if (typeof MarketplaceApp !== 'undefined' && MarketplaceApp.updateFloatingAndHeaderSos && !MarketplaceApp.selectedEstablishment) {
      MarketplaceApp.updateFloatingAndHeaderSos(false);
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
            <h2>🎨 Latonería y Pintura</h2>
            <p>Servicio profesional de latonería y pintura con secado al horno</p>
          </div>
        </div>
        <div class="paint-header-actions">
          <button type="button" class="btn-open-quoter" onclick="PaintServiceApp.openQuoter()">
            ⚡ Cotizar mi vehículo
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
    if (category === 'motos' || category === 'moto') {
      this.wizardState.vehicleType = 'moto';
      this.wizardState.selectedBrand = 'suzuki_gn_hj';
      this.wizardState.selectedModel = 'suzuki_gn_125';
    } else if (category === 'suv') {
      this.wizardState.vehicleType = 'suv';
      this.wizardState.selectedBrand = 'all';
      this.wizardState.selectedModel = 'toyota_4runner';
    } else if (category === 'pickup') {
      this.wizardState.vehicleType = 'pickup';
      this.wizardState.selectedBrand = 'all';
      this.wizardState.selectedModel = 'toyota_hilux';
    } else {
      this.wizardState.vehicleType = 'sedan';
      this.wizardState.selectedBrand = 'all';
      this.wizardState.selectedModel = 'chevrolet_aveo';
    }
    const pieces = this.getCurrentPiecesMap();
    this.wizardState.selectedPieces = [Object.keys(pieces)[0]];
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
      if (step === 4) {
        nextBtn.innerHTML = '<span>📲 Enviar Pedido a WhatsApp (322 794 9751)</span>';
        nextBtn.style.background = '#25D366';
        nextBtn.style.borderColor = '#25D366';
      } else {
        nextBtn.innerHTML = '<span>Continuar →</span>';
        nextBtn.style.background = '';
        nextBtn.style.borderColor = '';
      }
    }

    const currentModel = this.getCurrentModelObj();
    const currentPiecesMap = this.getCurrentPiecesMap();
    const isMoto = this.wizardState.vehicleType === 'moto';

    if (step === 1) {
      const rawSearch = (this.wizardState.modelSearchQuery || '').trim();
      const normalizeText = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const searchNorm = normalizeText(rawSearch);
      const isSearching = searchNorm.length > 0;

      let filteredModels = [];
      const currentBrand = this.wizardState.selectedBrand || (isMoto ? 'suzuki_gn_hj' : 'all');
      const brands = this.vehicleBrands[this.wizardState.vehicleType] || [];

      if (isSearching) {
        // Global search across all categories
        const allTypes = ['moto', 'sedan', 'suv', 'pickup'];
        allTypes.forEach(t => {
          const list = this.vehicleModels[t] || [];
          list.forEach(m => {
            const mName = normalizeText(m.name);
            const mBrand = normalizeText(m.brand);
            const mId = normalizeText(m.id);
            if (mName.includes(searchNorm) || mBrand.includes(searchNorm) || mId.includes(searchNorm)) {
              filteredModels.push({ ...m, _category: t });
            }
          });
        });
      } else {
        const allModels = this.vehicleModels[this.wizardState.vehicleType] || [];
        filteredModels = allModels.filter(m => {
          if (currentBrand === 'all') return true;
          if (currentBrand === 'suzuki_gn_hj') return m.brandGroup === 'suzuki_gn_hj';
          return m.brand === currentBrand;
        }).map(m => ({ ...m, _category: this.wizardState.vehicleType }));
      }

      container.innerHTML = `
        <h4 style="margin: 0 0 4px 0; font-size: 15px; color: #FFF; font-weight: 800;">Paso 1: Tipo de Vehículo y Modelo</h4>
        <p style="margin: 0 0 10px 0; font-size: 12px; color: #94A3B8;">El modelo exacto desglosará las piezas reales a pintar en el siguiente paso.</p>

        <!-- Live Vehicle Search Bar -->
        <div class="paint-search-container">
          <div class="paint-search-input-wrap">
            <span class="paint-search-icon">🔍</span>
            <input type="text"
                   id="paint-model-search-input"
                   class="paint-model-search-input"
                   placeholder="Buscar modelo o marca (ej. Aveo, Fortuner, GN 125, Pulsar, Hilux, Corsa)..."
                   value="${this.wizardState.modelSearchQuery || ''}"
                   oninput="PaintServiceApp.onSearchModel(event)"
                   autocomplete="off">
            ${this.wizardState.modelSearchQuery ? `
              <button type="button" class="paint-search-clear" onclick="PaintServiceApp.clearSearchModel()" title="Limpiar búsqueda">✕</button>
            ` : ''}
          </div>
        </div>

        <!-- Category Selector -->
        <div class="paint-vehicle-grid">
          <div class="paint-vehicle-card ${this.wizardState.vehicleType === 'moto' && !isSearching ? 'selected' : ''}" onclick="PaintServiceApp.selectVehicle('moto')">
            <span class="paint-vehicle-icon">🏍️</span>
            <span class="paint-vehicle-name">Moto / Motocicleta</span>
            <span class="paint-vehicle-sub">GN, HJ Cool, Bera, Keeway, Pulsar</span>
          </div>
          <div class="paint-vehicle-card ${this.wizardState.vehicleType === 'sedan' && !isSearching ? 'selected' : ''}" onclick="PaintServiceApp.selectVehicle('sedan')">
            <span class="paint-vehicle-icon">🚗</span>
            <span class="paint-vehicle-name">Sedán / Hatchback</span>
            <span class="paint-vehicle-sub">Aveo, Spark, Corsa, Corolla, Logan</span>
          </div>
          <div class="paint-vehicle-card ${this.wizardState.vehicleType === 'suv' && !isSearching ? 'selected' : ''}" onclick="PaintServiceApp.selectVehicle('suv')">
            <span class="paint-vehicle-icon">🚙</span>
            <span class="paint-vehicle-name">Camioneta / SUV</span>
            <span class="paint-vehicle-sub">4Runner, Fortuner, Autana, Vitara</span>
          </div>
          <div class="paint-vehicle-card ${this.wizardState.vehicleType === 'pickup' && !isSearching ? 'selected' : ''}" onclick="PaintServiceApp.selectVehicle('pickup')">
            <span class="paint-vehicle-icon" style="display:inline-flex; align-items:center; justify-content:center;">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M20 8h-3V4H4c-1.1 0-2 .9-2 2v10h2c0 1.66 1.34 3 3 3s3-1.34 3-3h4c0 1.66 1.34 3 3 3s3-1.34 3-3h1c.55 0 1-.45 1-1v-3.5L20 8zM7 17.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm10 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM15 8h3.25l1.5 2.5H15V8z"/></svg>
            </span>
            <span class="paint-vehicle-name">Pick-up / Rústico</span>
            <span class="paint-vehicle-sub">Hilux, Silverado, F-150, Machito, RAM</span>
          </div>
        </div>

        ${!isSearching ? `
          <!-- Brand Filter Pills -->
          <div style="margin-top: 14px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <strong style="color: #FFF; font-size: 12.5px;">Filtrar Marca o Serie:</strong>
              <span style="font-size: 11px; color: #38BDF8; font-weight: 700;">${filteredModels.length} modelo(s)</span>
            </div>
            <div class="paint-brand-chips">
              ${brands.map(b => `
                <button type="button" class="paint-brand-chip ${currentBrand === b.id ? 'active' : ''}" onclick="PaintServiceApp.selectBrand('${b.id}')">
                  ${b.name}
                </button>
              `).join('')}
            </div>
          </div>
        ` : `
          <!-- Search Results Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin: 12px 0 6px 0; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px;">
            <span style="font-size: 12px; color: #FFF; font-weight: 700;">
              Resultados para <strong style="color: #38BDF8;">"${this.wizardState.modelSearchQuery}"</strong>:
            </span>
            <span style="font-size: 11px; color: #EF4444; font-weight: 800;">${filteredModels.length} encontrado(s)</span>
          </div>
        `}

        <!-- Models Grid -->
        <div style="margin-top: 6px;">
          ${!isSearching ? `
            <span style="font-size: 11px; font-weight: 800; color: #CBD5E1; display: block; margin-bottom: 8px;">
              Selecciona tu Modelo de ${isMoto ? 'Moto' : 'Vehículo'}:
            </span>
          ` : ''}

          ${filteredModels.length === 0 ? `
            <div style="padding: 24px 12px; text-align: center; color: #94A3B8; background: #0F172A; border-radius: 12px; border: 1px dashed rgba(255,255,255,0.15); margin-bottom: 12px;">
              <div style="font-size: 28px; margin-bottom: 6px;">🔍🚗</div>
              <strong style="color: #FFF; font-size: 13px; display: block;">No encontramos modelos con "${this.wizardState.modelSearchQuery}"</strong>
              <span style="font-size: 11px; display: block; margin-top: 4px;">Prueba buscando por marca (ej. Toyota, Chevrolet, Bera, Yamaha, Renault) o borra la búsqueda para ver todas las categorías.</span>
              <button type="button" onclick="PaintServiceApp.clearSearchModel()" style="margin-top: 10px; background: rgba(239,68,68,0.2); border: 1px solid #EF4444; color: #FFF; padding: 5px 14px; border-radius: 8px; font-size: 11px; font-weight: 800; cursor: pointer;">
                Ver todos los vehículos
              </button>
            </div>
          ` : `
            <div class="paint-models-grid">
              ${filteredModels.map(m => {
                const isSel = this.wizardState.selectedModel === m.id;
                const fallbackIcon = m.icon || (m._category === 'moto' ? '🏍️' : '🚗');
                const catLabel = m._category === 'moto' ? 'Moto' : (m._category === 'sedan' ? 'Sedán' : (m._category === 'suv' ? 'SUV' : 'Pick-up'));
                return `
                  <div class="paint-model-card ${isSel ? 'selected' : ''}" onclick="PaintServiceApp.selectModel('${m.id}', '${m._category}')">
                    ${m.badge ? `<span class="paint-model-badge">${m.badge}</span>` : ''}
                    <div class="paint-model-img-wrapper">
                      <img src="${m.image || 'images/vehicles/moto_clasica.jpg'}" alt="${m.name}" loading="lazy" class="paint-model-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                      <div class="paint-model-fallback-icon" style="display:none;">${fallbackIcon}</div>
                    </div>
                    <div class="paint-model-info">
                      ${isSearching ? `<span class="paint-model-cat-tag ${m._category}">${catLabel}</span>` : ''}
                      <span class="paint-model-name">${m.name}</span>
                      <span class="paint-model-brand">${m.brand?.toUpperCase() || ''}</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <!-- Selected Vehicle Summary Bar -->
        <div class="paint-selected-summary-bar">
          <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
            <div class="paint-selected-thumb-wrap">
              <img src="${currentModel.image || 'images/vehicles/moto_clasica.jpg'}" alt="${currentModel.name}" class="paint-selected-thumb" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
              <span style="display:none; font-size: 22px;">${currentModel.icon || (isMoto ? '🏍️' : '🚗')}</span>
            </div>
            <div style="min-width: 0;">
              <span style="font-size: 10px; color: #FCA5A5; text-transform: uppercase; font-weight: 800; display: block; letter-spacing: 0.5px;">Modelo Seleccionado:</span>
              <strong style="color: #FFF; font-size: 13.5px; font-weight: 800; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${currentModel.name}</strong>
              <span style="font-size: 11px; color: #94A3B8; display: block;">${Object.keys(currentPiecesMap).length} piezas disponibles para cotizar</span>
            </div>
          </div>
          <span style="font-size: 11px; background: #EF4444; color: #FFF; padding: 4px 10px; border-radius: 8px; font-weight: 800; white-space: nowrap; flex-shrink: 0;">✓ Listo</span>
        </div>
      `;
    } else if (step === 2) {
      const allKeys = Object.keys(currentPiecesMap);
      const isAllSelected = allKeys.length > 0 && this.wizardState.selectedPieces.length >= allKeys.length;

      container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <img src="${currentModel.image || 'images/vehicles/moto_clasica.jpg'}" alt="${currentModel.name}" style="width: 36px; height: 36px; border-radius: 8px; object-fit: cover; border: 1.5px solid rgba(239,68,68,0.5); flex-shrink: 0;" onerror="this.style.display='none';">
            <div>
              <h4 style="margin: 0 0 2px 0; font-size: 15px; color: #FFF; font-weight: 800;">Paso 2: Piezas de ${currentModel.name}</h4>
              <p style="margin: 0; font-size: 12px; color: #94A3B8;">Toca cada pieza que deseas pintar o selecciona pintura completa.</p>
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; background: #0F172A; padding: 8px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08);">
          <span style="font-size: 11.5px; color: #E2E8F0; font-weight: 700;">
            Seleccionadas: <strong style="color: #EF4444;">${this.wizardState.selectedPieces.length} de ${allKeys.length}</strong>
          </span>
          <button type="button" onclick="PaintServiceApp.toggleAllPieces()" style="background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.4); color: #FFF; padding: 5px 12px; border-radius: 8px; font-size: 11px; font-weight: 800; cursor: pointer; transition: all 0.2s;">
            ${isAllSelected ? '✕ Deseleccionar Todo' : (isMoto ? '🏍️ Pintar Moto Completa' : '🚗 Pintar Auto Completo')}
          </button>
        </div>

        <!-- Dynamic Pieces Breakdown Grid -->
        <div class="paint-pieces-chips">
          ${allKeys.map(key => {
            const piece = currentPiecesMap[key];
            const sel = this.wizardState.selectedPieces.includes(key);
            return `
              <div class="paint-piece-chip ${sel ? 'selected' : ''}" onclick="PaintServiceApp.togglePiece('${key}')">
                <span class="paint-piece-icon">${piece.icon || '🎨'}</span>
                <div class="paint-piece-info">
                  <span class="paint-piece-title">${piece.name}</span>
                  <span class="paint-piece-tag">${piece.tag || ''} • Ref ~$${piece.baseUsd}</span>
                </div>
                <span class="paint-piece-check">${sel ? '✓' : '+'}</span>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Latonería Toggle Box -->
        <div class="paint-latoneria-box">
          <div class="paint-latoneria-toggle" onclick="PaintServiceApp.toggleLatoneria()">
            <div>
              <strong style="color: #FFF; font-size: 13px;">${isMoto ? '¿Requiere Desabollado / Latonería en Tanque o Piezas?' : '¿Requiere Latonería / Sacar Golpes?'}</strong>
              <p style="margin: 2px 0 0 0; font-size: 11px; color: #94A3B8;">
                ${isMoto ? 'Enderezado de chapa, soldadura de fisuras o desabollado de lámina.' : 'Alineación de chapa o reparación de abolladuras antes de fondear y pintar.'}
              </p>
            </div>
            <input type="checkbox" ${this.wizardState.hasLatoneria ? 'checked' : ''} style="width: 20px; height: 20px; accent-color: #EF4444; pointer-events: none;">
          </div>

          ${this.wizardState.hasLatoneria ? `
            <div style="margin-top: 12px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px;">
              <span style="font-size: 11px; font-weight: 800; color: #FCD34D;">Gravedad del golpe / daño:</span>
              <div class="paint-severity-radios">
                <div class="paint-severity-card ${this.wizardState.latoneriaSeverity === 'leve' ? 'selected' : ''}" onclick="PaintServiceApp.selectSeverity('leve')">
                  <span class="paint-severity-name">Leve</span>
                  <span class="paint-severity-desc">Abolladura menor sin quiebre</span>
                </div>
                <div class="paint-severity-card ${this.wizardState.latoneriaSeverity === 'moderada' ? 'selected' : ''}" onclick="PaintServiceApp.selectSeverity('moderada')">
                  <span class="paint-severity-name">Moderado</span>
                  <span class="paint-severity-desc">Golpe medio con deformación</span>
                </div>
                <div class="paint-severity-card ${this.wizardState.latoneriaSeverity === 'fuerte' ? 'selected' : ''}" onclick="PaintServiceApp.selectSeverity('fuerte')">
                  <span class="paint-severity-name">Fuerte</span>
                  <span class="paint-severity-desc">Lámina partida / descuadrada</span>
                </div>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- SECCIÓN 1: Calidad de Pintura (Color Base) -->
        <div class="paint-material-block">
          <div class="paint-material-header">
            <span class="paint-material-title"><span>🎨</span> Calidad de Pintura (Color Base)</span>
            <span style="font-size: 10px; color: #38BDF8; font-weight: 800;">3 Calidades Disponibles</span>
          </div>
          <p class="paint-material-sub">Selecciona el tipo de pigmento base para la carrocería de tu vehículo.</p>

          <div class="paint-quality-grid">
            ${this.paintQualities.map(p => {
              const isSel = this.wizardState.paintQuality === p.id;
              const tierClass = p.id === 'alta' ? 'tier-high' : (p.id === 'media' ? 'tier-mid' : 'tier-low');
              const recClass = p.id === 'alta' ? 'rec-full' : (p.id === 'media' ? 'rec-basic' : 'rec-low');
              return `
                <div class="paint-quality-card ${isSel ? 'selected' : ''}" onclick="PaintServiceApp.selectPaintQuality('${p.id}')">
                  <div class="paint-card-top-pills">
                    <span class="paint-tier-pill ${tierClass}">${p.tierShort}</span>
                    <span class="paint-rec-pill ${recClass}">${p.recommendation}</span>
                  </div>
                  <span class="paint-quality-name">${p.icon} ${p.name}</span>
                  <span class="paint-quality-desc">${p.desc}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- SECCIÓN 2: Barniz Transparente (Clear Coat) -->
        <div class="paint-material-block">
          <div class="paint-material-header">
            <span class="paint-material-title"><span>✨</span> Barniz (Transparente / Clear Coat)</span>
            <span style="font-size: 10px; color: #FCD34D; font-weight: 800;">Protección UV & Brillo</span>
          </div>
          <p class="paint-material-sub">El barniz sella la pintura, define la dureza contra rayas y la intensidad del brillo.</p>

          <div class="paint-quality-grid">
            ${this.varnishCategories.map(v => {
              const isSel = this.wizardState.varnishQuality === v.id;
              const tierClass = v.id === 'alta_a' ? 'tier-high' : (v.id === 'media_b' ? 'tier-mid' : 'tier-low');
              const recClass = v.id === 'alta_a' ? 'rec-full' : (v.id === 'media_b' ? 'rec-basic' : 'rec-low');
              return `
                <div class="paint-quality-card ${isSel ? 'selected' : ''}" onclick="PaintServiceApp.selectVarnishTier('${v.id}')">
                  <div class="paint-card-top-pills">
                    <span class="paint-tier-pill ${tierClass}">${v.tierShort}</span>
                    <span class="paint-rec-pill ${recClass}">${v.recommendation}</span>
                  </div>
                  <span class="paint-quality-name">${v.brands.map(b => b.name).join(' / ')}</span>
                  <span class="paint-quality-desc">${v.desc}</span>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Brand Specific Pills for Selected Tier -->
          <div class="paint-varnish-brand-chips">
            <span style="font-size: 10px; font-weight: 800; color: #94A3B8; display: flex; align-items: center; margin-right: 4px;">Marca elegida:</span>
            ${this.getCurrentVarnishTierObj().brands.map(b => {
              const isBActive = this.wizardState.varnishBrand === b.id;
              return `
                <button type="button" class="paint-vbrand-btn ${isBActive ? 'active' : ''}" onclick="PaintServiceApp.selectVarnishBrand('${b.id}')">
                  <span>${isBActive ? '✓' : '•'}</span> ${b.name} (${b.sub})
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <!-- SECCIÓN 3: Materiales Utilizados para Pulir (Solo se maneja Gama Alta) -->
        <div class="paint-polish-box">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 18px;">💎</span>
              <strong style="color: #FFF; font-size: 13px;">Materiales para Pulir y Corrección</strong>
            </div>
            <span style="font-size: 9px; font-weight: 900; background: linear-gradient(135deg, #F59E0B, #10B981); color: #0F172A; padding: 3px 8px; border-radius: 6px; text-transform: uppercase;">
              Solo se maneja Gama Alta
            </span>
          </div>
          <p style="margin: 4px 0 10px 0; font-size: 11px; color: #CBD5E1;">
            Todos nuestros trabajos incluyen terminado profesional espejo con insumos certificados de alta gama:
          </p>

          <div class="paint-polish-grid">
            ${this.polishingMaterials.map(m => `
              <div class="paint-polish-item">
                <span class="paint-polish-icon">${m.icon}</span>
                <div class="paint-polish-info">
                  <span class="paint-polish-name">${m.name}</span>
                  <span class="paint-polish-desc">${m.desc}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else if (step === 3) {
      container.innerHTML = `
        <h4 style="margin: 0 0 6px 0; font-size: 15px; color: #FFF; font-weight: 800;">Paso 3: Fotos Reales del Vehículo</h4>
        <p style="margin: 0 0 14px 0; font-size: 12px; color: #94A3B8;">Sube fotos claras del estado actual de tu ${currentModel.name} para una cotización certera.</p>

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

      const pieceNames = this.wizardState.selectedPieces.map(k => this.getPieceLabel(k));
      const paintObj = this.getCurrentPaintQualityObj();
      const varnishTierObj = this.getCurrentVarnishTierObj();
      const varnishBrandObj = this.getCurrentVarnishBrandObj();

      container.innerHTML = `
        <h4 style="margin: 0 0 6px 0; font-size: 15px; color: #FFF; font-weight: 800;">Paso 4: Contacto y Rango Estimado</h4>
        <p style="margin: 0 0 14px 0; font-size: 12px; color: #94A3B8;">Revisa el presupuesto estimado e ingresa tus datos para conectar de inmediato con el taller.</p>

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
          <div class="paint-estimate-row" style="align-items: center;">
            <span>Vehículo & Modelo:</span>
            <div style="display: flex; align-items: center; gap: 8px; justify-content: flex-end;">
              <img src="${currentModel.image || 'images/vehicles/moto_clasica.jpg'}" alt="${currentModel.name}" style="width: 32px; height: 24px; border-radius: 4px; object-fit: cover; border: 1px solid rgba(255,255,255,0.2);" onerror="this.style.display='none';">
              <strong style="color: #FFF;">${currentModel.name} (${this.wizardState.vehicleType.toUpperCase()})</strong>
            </div>
          </div>
          <div class="paint-estimate-row">
            <span>Pintura Base:</span>
            <strong style="color: #38BDF8;">${paintObj.name} • ${paintObj.tier}</strong>
          </div>
          <div class="paint-estimate-row">
            <span>Barniz Transparente:</span>
            <strong style="color: #FBBF24;">${varnishBrandObj.name} • ${varnishTierObj.tier}</strong>
          </div>
          <div class="paint-estimate-row">
            <span>Pulido Especializado:</span>
            <strong style="color: #34D399; font-size: 10.5px;">Gama Alta 3M, Robin, Symplex & Cerámica</strong>
          </div>
          <div class="paint-estimate-row">
            <span>Piezas Desglosadas (${this.wizardState.selectedPieces.length}):</span>
            <strong style="color: #FFF; font-size: 11px; text-align: right; max-width: 65%;">${pieceNames.join(', ')}</strong>
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
            ⚠️ <em>Nota importante: El precio mostrado es un estimado referencial calculado según tarifas estándar. El taller aliado verificará el estado físico real de la lámina y te confirmará el presupuesto final exacto por el chat integrado.</em>
          </div>

          <!-- Direct WhatsApp Dispatch Notice -->
          <div style="margin-top: 14px; background: rgba(37, 211, 102, 0.12); border: 1.5px solid #25D366; border-radius: 12px; padding: 12px; text-align: center;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 4px;">
              <span style="font-size: 18px;">💬</span>
              <strong style="color: #25D366; font-size: 13px;">Envío Directo a WhatsApp del Taller</strong>
            </div>
            <p style="margin: 0 0 10px 0; font-size: 11px; color: #E2E8F0; line-height: 1.4;">
              Tu pedido de pintura y especificaciones se enviarán al número oficial del taller <strong>+57 322 794 9751</strong> para atención inmediata.
            </p>
            <button type="button" onclick="PaintServiceApp.nextStep()" style="background: #25D366; color: #FFF; border: none; font-weight: 800; font-size: 12.5px; padding: 10px 14px; border-radius: 10px; cursor: pointer; width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 4px 12px rgba(37,211,102,0.35);">
              <span>📲</span> Enviar al 322 794 9751 por WhatsApp
            </button>
          </div>
        </div>
      `;
    }
  },

  onSearchModel(event) {
    this.wizardState.modelSearchQuery = event.target.value;
    this.renderQuoterStep();
    const input = document.getElementById('paint-model-search-input');
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  },

  clearSearchModel() {
    this.wizardState.modelSearchQuery = '';
    this.renderQuoterStep();
    const input = document.getElementById('paint-model-search-input');
    if (input) input.focus();
  },

  selectVehicle(type) {
    this.wizardState.vehicleType = type;
    this.wizardState.selectedBrand = type === 'moto' ? 'suzuki_gn_hj' : 'all';
    this.wizardState.modelSearchQuery = '';
    const models = this.vehicleModels[type] || [];
    this.wizardState.selectedModel = models[0]?.id || '';
    const pieces = this.getCurrentPiecesMap();
    this.wizardState.selectedPieces = [Object.keys(pieces)[0]];
    this.renderQuoterStep();
  },

  selectBrand(brandId) {
    this.wizardState.selectedBrand = brandId;
    this.wizardState.modelSearchQuery = '';
    const allModels = this.vehicleModels[this.wizardState.vehicleType] || [];
    const filtered = allModels.filter(m => {
      if (brandId === 'all') return true;
      if (brandId === 'suzuki_gn_hj') return m.brandGroup === 'suzuki_gn_hj';
      return m.brand === brandId;
    });
    if (filtered.length > 0 && !filtered.some(m => m.id === this.wizardState.selectedModel)) {
      this.wizardState.selectedModel = filtered[0].id;
      const pieces = this.getCurrentPiecesMap();
      this.wizardState.selectedPieces = [Object.keys(pieces)[0]];
    }
    this.renderQuoterStep();
  },

  selectModel(modelId, targetCategory) {
    if (targetCategory && targetCategory !== this.wizardState.vehicleType) {
      this.wizardState.vehicleType = targetCategory;
    }
    this.wizardState.selectedModel = modelId;
    this.wizardState.modelSearchQuery = '';
    const pieces = this.getCurrentPiecesMap();
    this.wizardState.selectedPieces = [Object.keys(pieces)[0]];
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
    const allKeys = Object.keys(this.getCurrentPiecesMap());
    if (this.wizardState.selectedPieces.length >= allKeys.length) {
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
    const piecesMap = this.getCurrentPiecesMap();
    const allKeys = Object.keys(piecesMap);
    const selected = this.wizardState.selectedPieces;
    const isMoto = this.wizardState.vehicleType === 'moto';

    const isFullVehicle = allKeys.length > 0 && selected.length >= allKeys.length;

    let totalBase = 0;
    if (isFullVehicle) {
      if (isMoto) {
        totalBase = 110; // USD base paquete moto completa
      } else if (this.wizardState.vehicleType === 'sedan') {
        totalBase = 360;
      } else if (this.wizardState.vehicleType === 'suv') {
        totalBase = 460;
      } else {
        totalBase = 520; // pickup
      }
    } else {
      selected.forEach(k => {
        const p = piecesMap[k];
        totalBase += p ? p.baseUsd : (isMoto ? 18 : 48);
      });
      if (totalBase === 0) totalBase = isMoto ? 25 : 48;
    }

    const paintObj = this.getCurrentPaintQualityObj();
    const varnishTierObj = this.getCurrentVarnishTierObj();
    const pMult = paintObj.multiplier || 1.0;
    const vMult = varnishTierObj.multiplier || 1.0;
    
    let latCost = 0;
    if (this.wizardState.hasLatoneria) {
      if (isMoto) {
        const motoLat = { 'leve': 10, 'moderada': 22, 'fuerte': 45 };
        latCost = motoLat[this.wizardState.latoneriaSeverity] || 10;
      } else {
        latCost = this.latoneriaCosts[this.wizardState.latoneriaSeverity] || 25;
      }
    }

    let calculated = Math.round((totalBase * pMult * vMult) + latCost);
    let min = Math.max(isMoto ? 15 : 30, Math.round(calculated * 0.9));
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
        alert('⚠️ Por favor selecciona al menos una pieza a pintar o selecciona vehículo completo.');
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
    const modelObj = this.getCurrentModelObj();
    const piecesMap = this.getCurrentPiecesMap();
    const pieceNames = this.wizardState.selectedPieces.map(k => piecesMap[k]?.name || this.getPieceLabel(k));
    const paintObj = this.getCurrentPaintQualityObj();
    const varnishTierObj = this.getCurrentVarnishTierObj();
    const varnishBrandObj = this.getCurrentVarnishBrandObj();

    const payload = {
      clientName: this.wizardState.customerName,
      customerName: this.wizardState.customerName,
      clientPhone: this.wizardState.customerPhone,
      customerPhone: this.wizardState.customerPhone,
      vehicleType: this.wizardState.vehicleType,
      vehicleModel: modelObj ? modelObj.name : 'Vehículo Particular',
      selectedModelId: this.wizardState.selectedModel,
      parts: pieceNames,
      selectedPieces: this.wizardState.selectedPieces,
      hasLatoneria: this.wizardState.hasLatoneria,
      hasBodywork: this.wizardState.hasLatoneria,
      latoneriaSeverity: this.wizardState.latoneriaSeverity,
      finishType: this.wizardState.finishType,
      finishName: `${paintObj.name} + ${varnishBrandObj.name}`,
      paintQuality: this.wizardState.paintQuality,
      paintQualityName: `${paintObj.name} • ${paintObj.tier}`,
      paintQualityTier: paintObj.tier,
      varnishQuality: this.wizardState.varnishQuality,
      varnishQualityTier: varnishTierObj.tier,
      varnishBrand: varnishBrandObj.name,
      varnishName: `${varnishBrandObj.name} • ${varnishTierObj.tier}`,
      polishingMaterials: this.polishingMaterials.map(m => m.name),
      polishingTier: 'Solo Gama Alta (3M, Symplex Piraña & Cerámica)',
      serviceName: 'Latonería y Pintura',
      photosCount: this.wizardState.photos.length,
      urgency: this.wizardState.urgency,
      estimatedRangeUsd: `${estimate.min} - ${estimate.max}`,
      estimatedPriceRange: { minUsd: estimate.min, maxUsd: estimate.max },
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
        // Automatically open WhatsApp with full quote breakdown for workshop 3227949751
        this.openWhatsAppForQuote(data.quote);
      }
    } catch (e) {
      console.error('Error submitting paint quote:', e);
      // Fallback dispatch to WhatsApp 3227949751 so order is never lost
      this.openWhatsAppForQuote(payload);
      alert('Tu solicitud se está abriendo en WhatsApp (322 794 9751) para ser atendida por el taller.');
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
          <span style="color: #94A3B8; font-size: 10px; display: block;">VEHÍCULO / MODELO</span>
          <strong style="color: #FFF;">${quote.vehicleModel || (quote.vehicleType || '').toUpperCase()}</strong>
        </div>
        <div>
          <span style="color: #94A3B8; font-size: 10px; display: block;">PIEZAS (${quote.parts?.length || quote.selectedPieces?.length || 0})</span>
          <strong style="color: #FFF; font-size: 11px;">${Array.isArray(quote.parts) ? quote.parts.join(', ') : ((quote.selectedPieces || []).map(p => this.getPieceLabel(p)).join(', ') || 'General')}</strong>
        </div>
        <div>
          <span style="color: #94A3B8; font-size: 10px; display: block;">PINTURA BASE</span>
          <strong style="color: #38BDF8; font-size: 11px;">🎨 ${quote.paintQualityName || (quote.paintQuality ? quote.paintQuality.toUpperCase() : 'Poliéster y Tintas')}</strong>
        </div>
        <div>
          <span style="color: #94A3B8; font-size: 10px; display: block;">BARNIZ TRANSPARENTE</span>
          <strong style="color: #A855F7; font-size: 11px;">✨ ${quote.varnishName || (quote.varnishBrand ? `${quote.varnishBrand} (${quote.varnishQualityTier || 'Gama Alta'})` : 'DuPont / Glasurit')}</strong>
        </div>
        <div>
          <span style="color: #94A3B8; font-size: 10px; display: block;">PULITURA SHOW CAR</span>
          <strong style="color: #F59E0B; font-size: 11px;">💎 ${quote.polishingTier || 'Solo Gama Alta (3M & Cerámica)'}</strong>
        </div>
        <div>
          <span style="color: #94A3B8; font-size: 10px; display: block;">LATONERÍA</span>
          <strong style="color: #FCD34D;">${quote.hasLatoneria || quote.hasBodywork ? (quote.latoneriaSeverity || 'Leve').toUpperCase() : 'Ninguna'}</strong>
        </div>
        <div>
          <span style="color: #94A3B8; font-size: 10px; display: block;">PRECIO ESTIMADO / FINAL</span>
          <strong style="color: #10B981; font-size: 13px;">${quote.finalPrice || quote.agreedPrice?.usd ? `$${quote.finalPrice || quote.agreedPrice.usd} USD (Acordado)` : `$${quote.estimatedRangeUsd || (quote.estimatedPriceRange ? quote.estimatedPriceRange.minUsd + ' - ' + quote.estimatedPriceRange.maxUsd : '45 - 80')} USD`}</strong>
        </div>
      </div>

      <div class="paint-sheet-actions">
        <button type="button" class="btn-sheet-action" onclick="PaintServiceApp.openWhatsAppForQuote(PaintServiceApp.activeQuote || quote)" style="background: #25D366; border-color: #25D366; color: #FFF; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 5px;">
          <span>🟢</span> WhatsApp Taller (322 794 9751)
        </button>
        <button type="button" class="btn-sheet-action" onclick="PaintServiceApp.promptAdjustPrice('${quote.id}')">
          ✏️ Ajustar Precio
        </button>
        <button type="button" class="btn-sheet-action accent" onclick="PaintServiceApp.scheduleAppointment('${quote.id}')">
          📅 Agendar Cita
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
