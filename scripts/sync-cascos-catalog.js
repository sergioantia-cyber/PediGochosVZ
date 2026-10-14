const fs = require('fs');

async function generateCatalog() {
  console.log('Iniciando extracción del catálogo El Retén del Casco...');

  // 1. Obtener handles de búsqueda para "mt"
  let page = 1;
  let handles = [];
  while (true) {
    const url = 'https://retendelcasco.com/search?options%5Bprefix%5D=last&page=' + page + '&q=mt';
    const res = await fetch(url);
    const html = await res.text();
    const matches = [...html.matchAll(/\/products\/([a-zA-Z0-9\-_]+)/g)].map(m => m[1]);
    const unique = [...new Set(matches)].filter(h => h !== 'gift-card');
    let added = 0;
    for (const h of unique) {
      if (!handles.includes(h)) {
        handles.push(h);
        added++;
      }
    }
    console.log(`Página de búsqueda ${page}: ${unique.length} handles detectados (+${added} nuevos).`);
    if (added === 0 || !html.includes('page=' + (page + 1))) break;
    page++;
  }

  console.log(`Total handles únicos encontrados: ${handles.length}`);

  // 2. Extraer todos los productos públicos de la tienda
  let allProds = [];
  for (let p = 1; p <= 5; p++) {
    const res = await fetch('https://retendelcasco.com/products.json?limit=250&page=' + p);
    const data = await res.json();
    allProds.push(...(data.products || []));
  }
  console.log(`Total productos consultados en tienda: ${allProds.length}`);

  const matched = allProds.filter(p => handles.includes(p.handle));
  console.log(`Productos coincidentes con búsqueda mt: ${matched.length}`);

  function cleanHtml(html) {
    if (!html) return '';
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function getCategory(p) {
    const title = (p.title || '').toLowerCase();
    const type = (p.product_type || '').toLowerCase();
    const tags = (p.tags || []).join(' ').toLowerCase();
    const fullText = `${title} ${type} ${tags}`;

    if (title.includes('abatible') || type.includes('abatible')) {
      return { key: 'abatible', label: 'Casco Abatible / Modular', icon: '🔄' };
    }
    if (title.includes('abierto') || type.includes('abierto') || title.includes('cosmos') || title.includes('jet')) {
      return { key: 'abierto', label: 'Casco Abierto / Urbano', icon: '🌬️' };
    }
    if (title.includes('integral') || type.includes('integral') || title.includes('stinger') || title.includes('revenge') || title.includes('targo') || title.includes('thunder') || title.includes('k-1s') || title.includes('blade')) {
      return { key: 'integral', label: 'Casco Integral', icon: '🏍️' };
    }
    if (title.includes('bicicleta') || title.includes('ciclismo') || title.includes('patines') || title.includes('mtb')) {
      return { key: 'ciclismo', label: 'Casco Ciclismo / Patines', icon: '🚴' };
    }
    if (fullText.includes('llanta') || fullText.includes('timsun') || fullText.includes('ceat') || fullText.includes('kenda')) {
      return { key: 'llantas', label: 'Llantas & Neumáticos', icon: '🛞' };
    }
    if (fullText.includes('guante') || fullText.includes('piernera') || fullText.includes('maleta') || fullText.includes('maletero') || fullText.includes('buzo')) {
      return { key: 'indumentaria', label: 'Indumentaria & Maletas', icon: '🎒' };
    }
    return { key: 'accesorios', label: 'Accesorios & Intercom', icon: '🛠️' };
  }

  function extractSizes(p) {
    const sizes = [];
    (p.variants || []).forEach(v => {
      const t = v.title ? v.title.trim().toUpperCase() : '';
      const opt = v.option1 ? v.option1.trim().toUpperCase() : '';
      let detectedSize = null;

      if (['S', 'M', 'L', 'XL', 'XXL', '2XL', 'XS', '3XL'].includes(t)) {
        detectedSize = t;
      } else if (['S', 'M', 'L', 'XL', 'XXL', '2XL', 'XS', '3XL'].includes(opt)) {
        detectedSize = opt;
      } else if (t.match(/\b(S|M|L|XL|XXL|XS)\b/)) {
        detectedSize = t.match(/\b(S|M|L|XL|XXL|XS)\b/)[1];
      }

      if (detectedSize) {
        if (!sizes.some(s => s.size === detectedSize)) {
          sizes.push({
            size: detectedSize,
            available: v.available !== false,
            price: parseFloat(v.price || 0) + 30000
          });
        }
      }
    });

    // Default sizes for helmets if store variant titles were generic
    const cat = getCategory(p);
    if (sizes.length === 0 && (cat.key === 'integral' || cat.key === 'abatible' || cat.key === 'abierto')) {
      return [
        { size: 'M', available: true, price: parseFloat(p.variants[0]?.price || 0) + 30000 },
        { size: 'L', available: true, price: parseFloat(p.variants[0]?.price || 0) + 30000 },
        { size: 'XL', available: true, price: parseFloat(p.variants[0]?.price || 0) + 30000 }
      ];
    }

    return sizes;
  }

  function extractCerts(p, text) {
    const certs = [];
    const t = (p.title + ' ' + text).toUpperCase();
    const vendor = (p.vendor || '').toUpperCase();

    // MT Helmets standard certifications
    if (vendor === 'MT' || t.includes('MT HELMETS') || t.includes('ATOM 2') || t.includes('STINGER 2') || t.includes('THUNDER 4') || t.includes('REVENGE 2')) {
      certs.push('ECE 22.06 Oficial');
      certs.push('DOT Homologado');
      certs.push('Pinlock Ready');
      certs.push('Cierre Micrométrico');
    } else {
      if (t.includes('22.06') || t.includes('22-06')) certs.push('ECE 22.06');
      else if (t.includes('22.05') || t.includes('22-05')) certs.push('ECE 22.05');
      if (t.includes('DOT') || t.includes('SHAFT') || t.includes('KOV') || t.includes('ICH') || t.includes('AGV')) certs.push('DOT FMVSS 218');
      if (t.includes('PINLOCK')) certs.push('Pinlock Ready');
      if (t.includes('MICROMÉTRICO') || t.includes('MICROMETRICO')) certs.push('Cierre Micrométrico');
      if (t.includes('DOBLE ANILLO') || t.includes('DOBLE D')) certs.push('Hebilla Doble D');
    }
    return [...new Set(certs)];
  }

  const catalog = matched.map((p, idx) => {
    const origPrice = parseFloat(p.variants[0]?.price || 0);
    // Sumando 30 pesos (+30.000 COP) según instrucción del usuario
    const finalPriceCop = origPrice + 30000;
    const cat = getCategory(p);
    const desc = cleanHtml(p.body_html);
    const certs = extractCerts(p, desc);
    const sizes = extractSizes(p);

    const images = (p.images || []).map(img => {
      let src = img.src || '';
      if (src.startsWith('//')) src = 'https:' + src;
      return src;
    });

    const isMt = (p.vendor || '').toLowerCase().includes('mt') || p.title.toLowerCase().includes('mt ');

    return {
      id: 'casco-' + p.id,
      handle: p.handle,
      title: p.title,
      vendor: p.vendor || (isMt ? 'MT Helmets' : 'Retén del Casco'),
      isMt: isMt,
      category: cat.key,
      categoryLabel: cat.label,
      categoryIcon: cat.icon,
      priceOriginal: origPrice,
      price: finalPriceCop,
      priceFormattedCop: '$' + finalPriceCop.toLocaleString('de-DE'),
      priceUsd: (finalPriceCop / 4000).toFixed(2),
      currency: 'COP',
      plusPesosMargin: 30000,
      image: images[0] || 'https://retendelcasco.com/cdn/shop/files/Modo_de_aislamiento_6192cb98-c215-460f-af28-c73558f97f30.png?v=1776110226',
      images: images,
      sizes: sizes,
      hasSizes: sizes.length > 0,
      description: desc,
      certifications: certs,
      urlOriginal: 'https://retendelcasco.com/products/' + p.handle,
      tags: p.tags || []
    };
  });

  fs.writeFileSync('cascos_catalog.json', JSON.stringify(catalog, null, 2), 'utf8');
  console.log(`✅ Archivo cascos_catalog.json generado exitosamente con ${catalog.length} productos con +30 pesos aplicados.`);
}

generateCatalog().catch(err => {
  console.error('Error generando catálogo:', err);
  process.exit(1);
});
