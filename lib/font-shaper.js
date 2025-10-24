const fontkit = require('fontkit');
const path = require('path');
const fs = require('fs');

class FontShaper {
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

      // Buffer olarak oku ve kontrol et
      const fontBuffer = fs.readFileSync(fontPath);

      if (!fontBuffer || fontBuffer.length === 0) {
        throw new Error(`Font file is empty or corrupted: ${fontPath}`);
      }

      // ArrayBuffer'a dönüştür
      const arrayBuffer = fontBuffer.buffer.slice(
        fontBuffer.byteOffset,
        fontBuffer.byteOffset + fontBuffer.byteLength
      );

      const font = fontkit.create(arrayBuffer);

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
   * Unicode metnini normalize et (NFC)
   */
  normalizeText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    // Unicode normalization (NFC - Canonical Decomposition + Canonical Composition)
    let normalized = text.normalize('NFC');

    // Kontrol karakterlerini temizle
    normalized = normalized.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

    return normalized.trim();
  }

  /**
   * Metni shape et (ligatür, kerning, RTL/LTR)
   */
  async shapeText(fontPath, text, options = {}) {
    const {
      fontSize = 100,
      features = {},
      direction = 'ltr',
      language = 'en',
      script = 'latn'
    } = options;

    try {
      const font = await this.loadFont(fontPath);
      const normalizedText = this.normalizeText(text);

      if (!normalizedText) {
        throw new Error('Empty or invalid text after normalization');
      }

      // Varsayılan özellikler
      const defaultFeatures = {
        kern: true,  // Kerning
        liga: true,  // Standard ligatures
        clig: true,  // Contextual ligatures
        calt: true,  // Contextual alternates
        ...features
      };

      // Fontkit ile layout (shaping)
      const run = font.layout(normalizedText, defaultFeatures);

      // Glyph bilgilerini çıkar
      const glyphs = run.glyphs.map((glyph, index) => {
        const position = run.positions[index];

        return {
          id: glyph.id,
          name: glyph.name,
          unicode: glyph.unicode,
          advanceWidth: glyph.advanceWidth,
          leftSideBearing: glyph.leftSideBearing,
          bbox: glyph.bbox,
          position: {
            xAdvance: position.xAdvance,
            yAdvance: position.yAdvance,
            xOffset: position.xOffset,
            yOffset: position.yOffset
          },
          path: glyph.path
        };
      });

      // Toplam genişlik ve yükseklik hesapla
      let totalWidth = 0;
      let minY = 0;
      let maxY = 0;

      glyphs.forEach((glyph, index) => {
        totalWidth += glyph.position.xAdvance;

        if (glyph.bbox) {
          minY = Math.min(minY, glyph.bbox.minY);
          maxY = Math.max(maxY, glyph.bbox.maxY);
        }
      });

      const metrics = this.getFontMetrics(font);

      return {
        glyphs,
        metrics: {
          ...metrics,
          totalWidth,
          totalHeight: maxY - minY,
          ascent: maxY,
          descent: minY
        },
        features: defaultFeatures,
        direction,
        language,
        script
      };

    } catch (error) {
      console.error(`Text shaping error: ${error.message}`);
      throw new Error(`Failed to shape text: ${error.message}`);
    }
  }

  /**
   * Font metrics bilgilerini al
   */
  getFontMetrics(font) {
    return {
      unitsPerEm: font.unitsPerEm,
      ascent: font.ascent,
      descent: font.descent,
      lineGap: font.lineGap,
      underlinePosition: font.underlinePosition,
      underlineThickness: font.underlineThickness,
      capHeight: font.capHeight,
      xHeight: font.xHeight,
      bbox: font.bbox
    };
  }

  /**
   * Font'un desteklediği özellikler
   */
  getFontFeatures(font) {
    const features = {};

    // GSUB (Glyph Substitution) tablosu
    if (font.GSUB) {
      const gsub = font.GSUB;
      if (gsub.featureList) {
        gsub.featureList.forEach(feature => {
          if (feature.tag) {
            features[feature.tag] = true;
          }
        });
      }
    }

    // GPOS (Glyph Positioning) tablosu
    if (font.GPOS) {
      features.kern = true; // Kerning desteği
    }

    return features;
  }

  /**
   * Dil ve script tespiti
   */
  detectScript(text) {
    const normalizedText = this.normalizeText(text);

    // Basit script tespiti
    const arabicRange = /[\u0600-\u06FF\u0750-\u077F]/;
    const latinRange = /[A-Za-z]/;
    const cyrillicRange = /[\u0400-\u04FF]/;
    const greekRange = /[\u0370-\u03FF]/;

    if (arabicRange.test(normalizedText)) {
      return { script: 'arab', direction: 'rtl' };
    } else if (cyrillicRange.test(normalizedText)) {
      return { script: 'cyrl', direction: 'ltr' };
    } else if (greekRange.test(normalizedText)) {
      return { script: 'grek', direction: 'ltr' };
    } else if (latinRange.test(normalizedText)) {
      return { script: 'latn', direction: 'ltr' };
    }

    return { script: 'latn', direction: 'ltr' }; // default
  }

  /**
   * Kerning bilgilerini al
   */
  getKerningPairs(font) {
    if (!font.GPOS) {
      return new Map();
    }

    const kerningMap = new Map();

    // Basit kerning tespiti (daha detaylı implementasyon gerekebilir)
    try {
      // FontKit'in built-in kerning methodunu kullan
      // Bu kısım font'a göre değişebilir
    } catch (error) {
      console.warn('Kerning extraction failed:', error.message);
    }

    return kerningMap;
  }

  /**
   * Glyph'leri SVG path'e dönüştür
   */
  glyphsToSVGPath(glyphs, scale = 1) {
    let pathData = '';
    let currentX = 0;

    glyphs.forEach(glyph => {
      if (glyph.path) {
        // Glyph path'ini çevir
        const glyphPath = glyph.path.toSVG(scale);

        // Transform uygula
        const transform = `translate(${currentX * scale}, 0)`;
        pathData += `<g transform="${transform}">${glyphPath}</g>`;

        currentX += glyph.position.xAdvance;
      }
    });

    return pathData;
  }

  /**
   * Text direction kontrolü
   */
  isRTL(text) {
    const rtlChars = /[\u0590-\u083F]|[\u08A0-\u08FF]|[\uFB1D-\uFDFF]|[\uFE70-\uFEFF]/;
    return rtlChars.test(text);
  }

  /**
   * Cache temizle
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

module.exports = FontShaper;
