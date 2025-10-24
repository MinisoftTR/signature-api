const opentype = require('opentype.js');
const path = require('path');
const fs = require('fs');

class SVGRenderer {
  constructor() {
    this.fontCache = new Map();
  }

  /**
   * Font dosyasını yükle ve cache'le
   */
  async loadFont(fontPath) {
    if (this.fontCache.has(fontPath)) {
      return this.fontCache.get(fontPath);
    }

    try {
      if (!fs.existsSync(fontPath)) {
        throw new Error(`Font file not found: ${fontPath}`);
      }

      const buffer = fs.readFileSync(fontPath);
      
      if (!buffer || buffer.length === 0) {
        throw new Error(`Font file is empty or corrupted: ${fontPath}`);
      }

      // ArrayBuffer'a dönüştür
      const arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset, 
        buffer.byteOffset + buffer.byteLength
      );

      const font = opentype.parse(arrayBuffer);
      
      if (!font) {
        throw new Error(`Failed to parse font: ${fontPath}`);
      }

      this.fontCache.set(fontPath, font);
      return font;
    } catch (error) {
      console.error(`Font loading error for ${fontPath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Metni SVG path'e dönüştür
   */
  textToPath(font, text, fontSize, options = {}) {
    const {
      kerning = true,
      ligatures = true,
      direction = 'ltr'
    } = options;

    try {
      // OpenType.js ile text path oluştur
      const path = font.getPath(text, 0, 0, fontSize, {
        kerning,
        features: {
          liga: ligatures,
          kern: kerning
        }
      });

      return path;
    } catch (error) {
      console.error(`Text to path error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Path'in bounding box'ını hesapla
   */
  getPathBounds(path) {
    const bbox = path.getBoundingBox();
    
    // Güvenli değerler kullan
    const x1 = bbox.x1 || 0;
    const y1 = bbox.y1 || 0;
    const x2 = bbox.x2 || 0;
    const y2 = bbox.y2 || 0;
    
    return {
      x1,
      y1,
      x2,
      y2,
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1)
    };
  }

  /**
   * Font metrics bilgilerini al
   */
  getFontMetrics(font, fontSize) {
    const scale = fontSize / font.unitsPerEm;
    
    return {
      ascender: font.ascender * scale,
      descender: font.descender * scale,
      lineHeight: (font.ascender - font.descender) * scale,
      capHeight: (font.tables?.os2?.sCapHeight || font.ascender * 0.7) * scale,
      xHeight: (font.tables?.os2?.sxHeight || font.ascender * 0.5) * scale,
      baseline: 0,
      unitsPerEm: font.unitsPerEm
    };
  }

  /**
   * SVG imzası oluştur
   */
  async generateSVGSignature(text, fontPath, options = {}) {
    const {
      size = 128,
      color = '#000000',
      stroke = 0,
      strokeColor = '#000000',
      padding = 12,
      baselineRatio = 0.62,
      backgroundColor = 'transparent',
      kerning = true,
      ligatures = true
    } = options;

    try {
      // Font yükle
      const font = await this.loadFont(fontPath);
      
      // Metni path'e dönüştür
      const textPath = this.textToPath(font, text, size, {
        kerning,
        ligatures
      });

      // Path bounds hesapla
      const bounds = this.getPathBounds(textPath);
      
      // Font metrics al
      const metrics = this.getFontMetrics(font, size);

      // Tight bounding box ile canvas boyutlarını hesapla
      const contentWidth = Math.max(Math.abs(bounds.width), 10);
      const contentHeight = Math.max(Math.abs(bounds.height), metrics.lineHeight);
      
      // Canvas boyutlarını hesapla (negatif değerleri de dahil et)
      const canvasWidth = Math.ceil(contentWidth + (padding * 2));
      const canvasHeight = Math.ceil(contentHeight + (padding * 2));

      // Baseline pozisyonunu hesapla (canvas yüksekliğinin %65'i)
      const baselineY = canvasHeight * 0.65;
      
      // Text pozisyonunu hesapla (tam ortalanmış)
      const textX = padding - bounds.x1;
      const textY = baselineY;

      // Path'i SVG formatına dönüştür
      const pathData = textPath.toPathData(2); // 2 decimal precision

      // SVG oluştur
      let svg = `<svg width="${canvasWidth}" height="${canvasHeight}" viewBox="0 0 ${canvasWidth} ${canvasHeight}" xmlns="http://www.w3.org/2000/svg">`;
      
      // Arka plan (eğer transparent değilse)
      if (backgroundColor && backgroundColor !== 'transparent') {
        svg += `\n  <rect width="100%" height="100%" fill="${backgroundColor}"/>`;
      }

      // Ana path grubu
      svg += `\n  <g transform="translate(${textX}, ${textY})">`;
      
      // Path elementi
      svg += `\n    <path d="${pathData}" fill="${color}"`;
      
      // Stroke varsa ekle
      if (stroke > 0) {
        svg += ` stroke="${strokeColor}" stroke-width="${stroke}"`;
      }
      
      svg += '/>'; 
      svg += '\n  </g>';
      svg += '\n</svg>';

      return {
        svg,
        width: canvasWidth,
        height: canvasHeight,
        bounds,
        metrics: {
          ...metrics,
          baseline: baselineY,
          textPosition: { x: textX, y: textY }
        }
      };

    } catch (error) {
      console.error(`SVG generation error: ${error.message}`);
      throw new Error(`Failed to generate SVG signature: ${error.message}`);
    }
  }

  /**
   * Font'un desteklediği özellikleri kontrol et
   */
  getFontFeatures(font) {
    const gsub = font.tables?.gsub;
    const gpos = font.tables?.gpos;
    
    return {
      hasLigatures: !!(gsub && gsub.lookups),
      hasKerning: !!(gpos && gpos.lookups),
      supportedScripts: gsub?.scripts ? Object.keys(gsub.scripts) : [],
      featureList: gsub?.features ? Object.keys(gsub.features) : []
    };
  }

  /**
   * Cache'i temizle
   */
  clearCache() {
    this.fontCache.clear();
  }

  /**
   * Cache durumu
   */
  getCacheStats() {
    return {
      size: this.fontCache.size,
      fonts: Array.from(this.fontCache.keys())
    };
  }
}

module.exports = SVGRenderer;