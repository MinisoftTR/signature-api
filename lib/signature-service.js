const SVGRenderer = require('./svg-renderer');
const FontShaper = require('./font-shaper');
const { Resvg } = require('@resvg/resvg-js');
const path = require('path');
const fs = require('fs');

class SignatureService {
  constructor() {
    this.svgRenderer = new SVGRenderer();
    this.fontShaper = new FontShaper();
    
    // Rate limiting için basit cache
    this.rateLimitCache = new Map();
    this.maxRequestsPerMinute = process.env.RATE_LIMIT_PER_MIN || 100;
    this.maxTextLength = process.env.MAX_TEXT_LENGTH || 100;
  }

  /**
   * Rate limiting kontrolü
   */
  checkRateLimit(clientIP) {
    if (!clientIP) return true;

    const now = Date.now();
    const windowStart = now - 60000; // 1 dakika
    
    if (!this.rateLimitCache.has(clientIP)) {
      this.rateLimitCache.set(clientIP, []);
    }

    const requests = this.rateLimitCache.get(clientIP);
    
    // Eski istekleri temizle
    const validRequests = requests.filter(time => time > windowStart);
    this.rateLimitCache.set(clientIP, validRequests);

    // Rate limit kontrolü
    if (validRequests.length >= this.maxRequestsPerMinute) {
      return false;
    }

    // Yeni isteği kaydet
    validRequests.push(now);
    return true;
  }

  /**
   * Girdi doğrulama
   */
  validateInput(text, fontId, options = {}) {
    const errors = [];

    // Text kontrolü
    if (!text || typeof text !== 'string') {
      errors.push('Text parameter is required and must be a string');
    } else if (text.length > this.maxTextLength) {
      errors.push(`Text length cannot exceed ${this.maxTextLength} characters`);
    }

    // FontId kontrolü
    if (!fontId || typeof fontId !== 'string') {
      errors.push('FontId parameter is required');
    }

    // Size kontrolü
    const { size } = options;
    if (size && (size < 10 || size > 1000)) {
      errors.push('Size must be between 10 and 1000 pixels');
    }

    // Color kontrolü
    const { color } = options;
    if (color && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
      errors.push('Color must be a valid hex color (e.g., #000000)');
    }

    return errors;
  }

  /**
   * Text sanitization
   */
  sanitizeText(text) {
    if (!text) return '';
    
    return text
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F]/g, '') // Kontrol karakterleri
      .replace(/\s+/g, ' ') // Çoklu boşlukları tek boşluk yap
      .trim();
  }

  /**
   * SVG imza oluştur
   */
  async generateSVGSignature(text, fontPath, options = {}) {
    try {
      // Text sanitize et
      const sanitizedText = this.sanitizeText(text);
      
      if (!sanitizedText) {
        throw new Error('Text is empty after sanitization');
      }

      // SVG oluştur
      const result = await this.svgRenderer.generateSVGSignature(
        sanitizedText, 
        fontPath, 
        options
      );

      return {
        success: true,
        svg: result.svg,
        width: result.width,
        height: result.height,
        metrics: result.metrics,
        format: 'svg'
      };

    } catch (error) {
      console.error('SVG generation failed, trying canvas fallback:', error.message);
      
      // Canvas fallback
      try {
        return await this.generateCanvasFallback(text, fontPath, options);
      } catch (fallbackError) {
        console.error('Canvas fallback also failed:', fallbackError.message);
        throw new Error(`SVG generation failed: ${error.message}`);
      }
    }
  }

  /**
   * Canvas fallback için SVG üret
   */
  async generateCanvasFallback(text, fontPath, options = {}) {
    const { createCanvas, registerFont } = require('canvas');
    
    try {
      // Font kaydet
      if (fs.existsSync(fontPath)) {
        const fontFamily = path.basename(fontPath, path.extname(fontPath)).replace(/_/g, ' ');
        registerFont(fontPath, { family: fontFamily });
        
        // Canvas oluştur
        const canvas = createCanvas(800, 400);
        const ctx = canvas.getContext('2d');
        
        // Font ayarları
        const fontSize = options.size || 128;
        ctx.font = `${fontSize}px "${fontFamily}"`;
        ctx.fillStyle = options.color || '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Text çiz
        const x = canvas.width / 2;
        const y = canvas.height / 2;
        ctx.fillText(text, x, y);
        
        // Canvas'i SVG'ye dönüştür
        const canvasDataUrl = canvas.toDataURL();
        const base64Data = canvasDataUrl.split(',')[1];
        
        const svg = `<svg width="${canvas.width}" height="${canvas.height}" xmlns="http://www.w3.org/2000/svg">
          <image href="${canvasDataUrl}" width="${canvas.width}" height="${canvas.height}"/>
        </svg>`;
        
        return {
          success: true,
          svg: svg,
          width: canvas.width,
          height: canvas.height,
          metrics: { fallback: true },
          format: 'svg'
        };
      } else {
        throw new Error('Font file not found for canvas fallback');
      }
    } catch (error) {
      throw new Error(`Canvas fallback failed: ${error.message}`);
    }
  }

  /**
   * PNG imza oluştur (SVG'den dönüştür)
   */
  async generatePNGSignature(text, fontPath, options = {}) {
    try {
      // Önce SVG oluştur
      const svgResult = await this.generateSVGSignature(text, fontPath, options);
      
      // Çıktı boyutları
      const outputWidth = options.width || svgResult.width;
      const outputHeight = options.height || svgResult.height;

      // SVG'yi PNG'ye dönüştür
      const resvg = new Resvg(svgResult.svg, {
        background: options.backgroundColor || 'rgba(0,0,0,0)', // Transparent
        fitTo: {
          mode: 'width',
          value: outputWidth
        }
      });

      const pngData = resvg.render();
      const pngBuffer = pngData.asPng();

      return {
        success: true,
        buffer: pngBuffer,
        base64: pngBuffer.toString('base64'),
        width: outputWidth,
        height: outputHeight,
        originalSVG: svgResult,
        format: 'png'
      };

    } catch (error) {
      console.error('PNG generation failed:', error.message);
      throw new Error(`PNG generation failed: ${error.message}`);
    }
  }

  /**
   * WebP imza oluştur
   */
  async generateWebPSignature(text, fontPath, options = {}) {
    try {
      // PNG oluştur
      const pngResult = await this.generatePNGSignature(text, fontPath, options);
      
      // Sharp kullanarak WebP'ye dönüştür (eğer sharp mevcutsa)
      const sharp = require('sharp');
      const webpBuffer = await sharp(pngResult.buffer)
        .webp({ quality: 90 })
        .toBuffer();

      return {
        success: true,
        buffer: webpBuffer,
        base64: webpBuffer.toString('base64'),
        width: pngResult.width,
        height: pngResult.height,
        originalSVG: pngResult.originalSVG,
        format: 'webp'
      };

    } catch (error) {
      console.error('WebP generation failed:', error.message);
      throw new Error(`WebP generation failed: ${error.message}`);
    }
  }

  /**
   * Format'a göre imza oluştur
   */
  async generateSignature(text, fontPath, format = 'svg', options = {}) {
    switch (format.toLowerCase()) {
      case 'svg':
        return this.generateSVGSignature(text, fontPath, options);
      case 'png':
        return this.generatePNGSignature(text, fontPath, options);
      case 'webp':
        return this.generateWebPSignature(text, fontPath, options);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Font özelliklerini analiz et
   */
  async analyzeFontFeatures(fontPath) {
    try {
      // SVG renderer ile font features
      const svgFont = await this.svgRenderer.loadFont(fontPath);
      const svgFeatures = this.svgRenderer.getFontFeatures(svgFont);

      // Font shaper ile font features
      const shaperFont = await this.fontShaper.loadFont(fontPath);
      const shaperFeatures = this.fontShaper.getFontFeatures(shaperFont);
      const shaperMetrics = this.fontShaper.getFontMetrics(shaperFont);

      return {
        features: {
          ...svgFeatures,
          ...shaperFeatures
        },
        metrics: shaperMetrics,
        path: fontPath
      };

    } catch (error) {
      console.error('Font analysis failed:', error.message);
      throw new Error(`Font analysis failed: ${error.message}`);
    }
  }

  /**
   * Toplu imza oluştur
   */
  async generateBulkSignatures(requests) {
    const results = [];
    const errors = [];

    for (let i = 0; i < requests.length; i++) {
      const req = requests[i];
      
      try {
        const result = await this.generateSignature(
          req.text,
          req.fontPath,
          req.format || 'svg',
          req.options || {}
        );
        
        results.push({
          index: i,
          success: true,
          ...result
        });
      } catch (error) {
        errors.push({
          index: i,
          error: error.message,
          request: req
        });
      }
    }

    return { results, errors };
  }

  /**
   * Servis durumu
   */
  getStatus() {
    return {
      service: 'SignatureService',
      version: '2.0.0',
      renderers: {
        svg: this.svgRenderer.getCacheStats(),
        fontShaper: this.fontShaper.getCacheStats()
      },
      rateLimit: {
        maxRequestsPerMinute: this.maxRequestsPerMinute,
        currentClients: this.rateLimitCache.size
      },
      limits: {
        maxTextLength: this.maxTextLength
      }
    };
  }

  /**
   * Cache'leri temizle
   */
  clearCaches() {
    this.svgRenderer.clearCache();
    this.fontShaper.clearCache();
    this.rateLimitCache.clear();
  }

  /**
   * Rate limit cache temizleme (eski girdileri temizle)
   */
  cleanupRateLimit() {
    const now = Date.now();
    const windowStart = now - 60000;

    for (const [clientIP, requests] of this.rateLimitCache.entries()) {
      const validRequests = requests.filter(time => time > windowStart);
      
      if (validRequests.length === 0) {
        this.rateLimitCache.delete(clientIP);
      } else {
        this.rateLimitCache.set(clientIP, validRequests);
      }
    }
  }
}

module.exports = SignatureService;