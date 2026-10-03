/**
 * PediGochos Phone Validation Utility
 * Soporta números móviles y fijos de Venezuela (VE) y Colombia (CO).
 */
const PhoneUtils = {
  clean(raw) {
    if (!raw) return '';
    return String(raw).replace(/[^\d+]/g, '');
  },

  validateVECO(raw) {
    if (!raw) {
      return { isValid: false, country: null, formatted: '', raw: '', error: 'El número de teléfono o WhatsApp es requerido.' };
    }
    const cleanStr = String(raw).replace(/\s+|-|\(|\)/g, '').trim();
    const digitsOnly = cleanStr.replace(/\D/g, '');

    // 1. Venezuela móvil:
    // Prefijos válidos: 0412, 0414, 0424, 0416, 0426 + 7 dígitos (total 11 con 0, o 10 sin 0)
    // Con código internacional: 58 o +58
    const veRegex = /^(?:58)?0?(4(?:12|14|16|24|26)\d{7})$/;
    const veMatch = cleanStr.replace(/^\+/, '').match(veRegex);
    if (veMatch) {
      const core = veMatch[1];
      return {
        isValid: true,
        country: 'VE',
        countryName: 'Venezuela',
        raw: cleanStr,
        formatted: `+58 0${core.slice(0, 3)} ${core.slice(3, 6)}-${core.slice(6)}`,
        e164: `+58${core}`,
        national: `0${core}`
      };
    }

    // 2. Colombia móvil:
    // Prefijos válidos: 300-350 (empiezan por 3) + 9 dígitos (total 10 dígitos)
    // Con código internacional: 57 o +57
    const coRegex = /^(?:57)?(3\d{9})$/;
    const coMatch = cleanStr.replace(/^\+/, '').match(coRegex);
    if (coMatch) {
      const core = coMatch[1];
      return {
        isValid: true,
        country: 'CO',
        countryName: 'Colombia',
        raw: cleanStr,
        formatted: `+57 ${core.slice(0, 3)} ${core.slice(3, 6)} ${core.slice(6)}`,
        e164: `+57${core}`,
        national: core
      };
    }

    // 3. Fallback Internacional si inicia con + y longitud estándar E.164 (8 a 15 dígitos)
    if (cleanStr.startsWith('+') && digitsOnly.length >= 8 && digitsOnly.length <= 15) {
      return {
        isValid: true,
        country: 'INTL',
        countryName: 'Internacional',
        raw: cleanStr,
        formatted: cleanStr,
        e164: `+${digitsOnly}`,
        national: digitsOnly
      };
    }

    // Mensaje explicativo
    let error = 'Número inválido. ';
    if (digitsOnly.length < 10) {
      error += 'Debe tener al menos 10 dígitos (Ej: 0414 123-4567 para VE o 320 123 4567 para CO).';
    } else {
      error += 'Prefijo no reconocido. Debe iniciar con VE (0412, 0414, 0424, 0416, 0426) o CO (3XX).';
    }

    return {
      isValid: false,
      country: null,
      formatted: cleanStr,
      raw: cleanStr,
      error
    };
  }
};

if (typeof window !== 'undefined') {
  window.PhoneUtils = PhoneUtils;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PhoneUtils;
}
