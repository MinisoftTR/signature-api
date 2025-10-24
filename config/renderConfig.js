/**
 * Render Configuration for Signature Generation v2.0
 * 
 * Bu dosya SVG ve PNG render işlemleri için varsayılan ayarları içerir.
 */

const renderDefaults = {
  // Font ve metin ayarları
  size: 128,                    // Varsayılan font boyutu (px)
  color: '#000000',             // Varsayılan metin rengi
  stroke: 0,                    // Stroke kalınlığı (0 = stroke yok)
  strokeColor: '#000000',       // Stroke rengi
  
  // Layout ayarları
  padding: 12,                  // Kenarlardan boşluk (px)
  baselineRatio: 0.62,          // Baseline pozisyonu (canvas height'ın %'si)
  backgroundColor: 'transparent', // Arka plan rengi
  
  // Typography özellikleri
  kerning: true,                // Kerning etkin mi?
  ligatures: true,              // Ligatürler etkin mi?
  direction: 'auto',            // Metin yönü (auto|ltr|rtl)
  
  // Önizleme ayarları
  previewCell: {
    width: 256,                 // Önizleme hücre genişliği
    height: 160,                // Önizleme hücre yüksekliği
    baselineRatio: 0.62         // Önizleme için baseline oranı
  }
};

const limits = {
  // Güvenlik limitleri
  maxTextLength: 100,           // Maksimum metin uzunluğu
  minFontSize: 10,              // Minimum font boyutu
  maxFontSize: 1000,            // Maksimum font boyutu
  maxPadding: 100,              // Maksimum padding
  
  // Performance limitleri
  maxRenderWidth: 2048,         // Maksimum render genişliği
  maxRenderHeight: 1024,        // Maksimum render yüksekliği
  
  // Rate limiting
  rateLimitPerMinute: 100,      // Dakikada maksimum istek sayısı
  bulkRequestLimit: 10          // Toplu işlemde maksimum istek sayısı
};

const fontFeatures = {
  // Desteklenen OpenType features
  supported: [
    'kern',  // Kerning
    'liga',  // Standard ligatures
    'clig',  // Contextual ligatures
    'calt',  // Contextual alternates
    'dlig',  // Discretionary ligatures
    'hlig',  // Historical ligatures
    'swsh',  // Swashes
    'salt',  // Stylistic alternates
    'ss01',  // Stylistic set 1
    'ss02',  // Stylistic set 2
    'ss03'   // Stylistic set 3
  ],
  
  // Varsayılan aktif features
  default: {
    kern: true,
    liga: true,
    clig: true,
    calt: true
  }
};

const colorFormats = {
  // Desteklenen renk formatları
  hex: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  rgb: /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/,
  rgba: /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/,
  
  // Önceden tanımlı renkler
  predefined: {
    black: '#000000',
    white: '#FFFFFF',
    red: '#FF0000',
    green: '#00FF00',
    blue: '#0000FF',
    transparent: 'transparent'
  }
};

const outputFormats = {
  // Desteklenen çıktı formatları
  svg: {
    mimeType: 'image/svg+xml',
    extension: 'svg',
    supportsTransparency: true,
    isVector: true
  },
  
  png: {
    mimeType: 'image/png',
    extension: 'png',
    supportsTransparency: true,
    isVector: false,
    defaultQuality: 90
  },
  
  webp: {
    mimeType: 'image/webp',
    extension: 'webp',
    supportsTransparency: true,
    isVector: false,
    defaultQuality: 90
  }
};

const cacheConfig = {
  // Cache ayarları (kullanılmıyor ama gelecek için hazır)
  enabled: false,
  ttl: 31536000,                // 1 yıl (saniye)
  maxSize: 1000,                // Maksimum cache entry sayısı
  keyPrefix: 'sig_v2_'          // Cache key öneki
};

const errorMessages = {
  // Standart hata mesajları
  validation: {
    textRequired: 'Text parameter is required and must be a string',
    textTooLong: 'Text length cannot exceed maximum limit',
    fontIdRequired: 'FontId parameter is required',
    fontNotFound: 'Font ID not found in whitelist',
    invalidColor: 'Color must be a valid hex color (e.g., #000000)',
    invalidSize: 'Size must be between minimum and maximum values',
    invalidFormat: 'Unsupported output format'
  },
  
  rendering: {
    fontLoadFailed: 'Failed to load font file',
    pathGenerationFailed: 'Failed to generate text path',
    svgRenderFailed: 'SVG generation failed',
    pngConversionFailed: 'PNG conversion failed',
    webpConversionFailed: 'WebP conversion failed'
  },
  
  system: {
    rateLimitExceeded: 'Rate limit exceeded',
    serverError: 'Internal server error',
    invalidRequest: 'Invalid request format'
  }
};

const performance = {
  // Performance ayarları
  timeouts: {
    fontLoad: 5000,             // Font yükleme timeout (ms)
    svgRender: 10000,           // SVG render timeout (ms)
    pngConvert: 15000,          // PNG dönüşüm timeout (ms)
    webpConvert: 15000          // WebP dönüşüm timeout (ms)
  },
  
  memory: {
    fontCacheLimit: 50,         // Maksimum cache'de tutulacak font sayısı
    gcInterval: 300000,         // Garbage collection interval (5 dk)
    memoryThreshold: 0.8        // Memory kullanım threshold (80%)
  },
  
  processing: {
    maxConcurrent: 10,          // Eşzamanlı işlem sayısı
    queueTimeout: 30000,        // Kuyruk timeout (ms)
    retryCount: 2               // Hata durumunda retry sayısı
  }
};

const logging = {
  // Loglama ayarları
  enabled: true,
  levels: {
    error: true,
    warn: true,
    info: process.env.NODE_ENV !== 'production',
    debug: process.env.NODE_ENV === 'development'
  },
  
  performance: {
    logSlowRequests: true,
    slowRequestThreshold: 1000, // 1 saniye üzeri slow
    logMemoryUsage: false
  }
};

// Environment variable overrides
const getEnvNumber = (key, defaultValue) => {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
};

const getEnvBoolean = (key, defaultValue) => {
  const value = process.env[key];
  return value ? value.toLowerCase() === 'true' : defaultValue;
};

// Apply environment overrides
if (process.env.NODE_ENV) {
  limits.maxTextLength = getEnvNumber('MAX_TEXT_LENGTH', limits.maxTextLength);
  limits.rateLimitPerMinute = getEnvNumber('RATE_LIMIT_PER_MIN', limits.rateLimitPerMinute);
  renderDefaults.kerning = getEnvBoolean('DEFAULT_KERNING', renderDefaults.kerning);
  renderDefaults.ligatures = getEnvBoolean('DEFAULT_LIGATURES', renderDefaults.ligatures);
  logging.enabled = getEnvBoolean('ENABLE_LOGGING', logging.enabled);
}

module.exports = {
  renderDefaults,
  limits,
  fontFeatures,
  colorFormats,
  outputFormats,
  cacheConfig,
  errorMessages,
  performance,
  logging
};