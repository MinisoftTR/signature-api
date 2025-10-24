const sharp = require('sharp');

class BackgroundCleaner {
  constructor() {
    this.supportedFormats = ['jpeg', 'jpg', 'png', 'webp', 'heic', 'tiff', 'bmp'];
    this.defaultOptions = {
      cleaningMode: 'auto',
      outputFormat: 'both',
      enhancementLevel: 3,
      preserveThinLines: true,
      backgroundColor: null,
      qualityThreshold: 0.7
    };
  }

  /**
   * Ana temizleme fonksiyonu
   */
  async cleanSignaturePhoto(imageInput, options = {}) {
    const startTime = Date.now();
    const config = { ...this.defaultOptions, ...options };

    try {
      // Format detection ve preprocessing
      const preprocessed = await this.preprocessImage(imageInput);

      // Background analysis
      const backgroundInfo = await this.analyzeBackground(preprocessed.buffer);

      // Uygun temizleme algoritmasını seç
      const cleaningMethod = this.selectCleaningMethod(backgroundInfo, config);

      // Arka plan temizleme
      const cleaned = await this.performCleaning(
        preprocessed.buffer,
        backgroundInfo,
        cleaningMethod,
        config
      );

      // İmza enhancement
      const enhanced = await this.enhanceSignature(cleaned, config);

      // Output formatları oluştur
      const outputs = await this.generateOutputs(enhanced, config);

      // Kalite değerlendirmesi
      const qualityScore = await this.assessQuality(enhanced, preprocessed);

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        original: {
          width: preprocessed.metadata.width,
          height: preprocessed.metadata.height,
          format: preprocessed.metadata.format,
          size: preprocessed.metadata.size
        },
        cleaned: outputs,
        processing: {
          backgroundDetected: backgroundInfo.dominantColor,
          cleaningMethod: cleaningMethod,
          qualityScore: qualityScore,
          processingTime: processingTime,
          backgroundInfo: backgroundInfo
        }
      };

    } catch (error) {
      console.error('Background cleaning failed:', error);
      throw new Error(`Background cleaning failed: ${error.message}`);
    }
  }

  /**
   * Görüntü preprocessing
   */
  async preprocessImage(imageInput) {
    try {
      let buffer;

      // Base64 string ise decode et
      if (typeof imageInput === 'string') {
        // Base64 header'ı kontrol et ve temizle
        const base64Data = imageInput.includes(',') ?
          imageInput.split(',')[1] : imageInput;
        buffer = Buffer.from(base64Data, 'base64');
      } else if (Buffer.isBuffer(imageInput)) {
        buffer = imageInput;
      } else {
        throw new Error('Invalid image input format');
      }

      // Sharp ile metadata al
      const sharpImage = sharp(buffer);
      const metadata = await sharpImage.metadata();

      // Format kontrolü
      if (!this.supportedFormats.includes(metadata.format)) {
        throw new Error(`Unsupported format: ${metadata.format}`);
      }

      // Boyut optimizasyonu (çok büyükse küçült)
      let processedBuffer = buffer;
      if (metadata.width > 2000 || metadata.height > 2000) {
        processedBuffer = await sharpImage
          .resize(2000, 2000, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .png()
          .toBuffer();
      }

      return {
        buffer: processedBuffer,
        metadata: metadata,
        originalBuffer: buffer
      };

    } catch (error) {
      throw new Error(`Preprocessing failed: ${error.message}`);
    }
  }

  /**
   * Arka plan analizi
   */
  async analyzeBackground(buffer) {
    try {
      const image = sharp(buffer);
      const { width, height } = await image.metadata();

      // Görüntünün kenar bölgelerini sample'la (arka plan tespiti için)
      const edgeRegions = [
        // Top edge
        { left: 0, top: 0, width: width, height: Math.min(50, height * 0.1) },
        // Bottom edge
        { left: 0, top: height - Math.min(50, height * 0.1), width: width, height: Math.min(50, height * 0.1) },
        // Left edge
        { left: 0, top: 0, width: Math.min(50, width * 0.1), height: height },
        // Right edge
        { left: width - Math.min(50, width * 0.1), top: 0, width: Math.min(50, width * 0.1), height: height }
      ];

      // Her kenar bölgesinden dominant rengi al
      const regionColors = [];

      for (const region of edgeRegions) {
        try {
          const regionBuffer = await image
            .extract(region)
            .raw()
            .toBuffer();

          const dominantColor = this.calculateDominantColor(regionBuffer);
          regionColors.push(dominantColor);
        } catch (err) {
          console.warn('Region color extraction failed:', err.message);
        }
      }

      // Genel dominant rengi hesapla
      const overallDominant = this.findConsistentBackgroundColor(regionColors);

      // Arka plan tipini belirle
      const backgroundType = this.classifyBackgroundType(overallDominant);

      // Noise level analizi
      const noiseLevel = await this.analyzeNoiseLevel(buffer);

      return {
        dominantColor: overallDominant,
        backgroundType: backgroundType,
        noiseLevel: noiseLevel,
        regionColors: regionColors,
        analysis: {
          isWhiteish: this.isWhiteish(overallDominant),
          isGrayish: this.isGrayish(overallDominant),
          brightness: this.calculateBrightness(overallDominant),
          contrast: noiseLevel
        }
      };

    } catch (error) {
      throw new Error(`Background analysis failed: ${error.message}`);
    }
  }

  /**
   * Dominant renk hesaplama
   */
  calculateDominantColor(rawBuffer) {
    const pixels = [];

    // Her 3 byte bir pixel (RGB)
    for (let i = 0; i < rawBuffer.length; i += 3) {
      if (i + 2 < rawBuffer.length) {
        pixels.push({
          r: rawBuffer[i],
          g: rawBuffer[i + 1],
          b: rawBuffer[i + 2]
        });
      }
    }

    // Basit renk clustering - en yaygın rengi bul
    const colorCounts = new Map();

    pixels.forEach(pixel => {
      // Renkleri 10'ar seviyeye yuvarla (noise reduction için)
      const key = `${Math.floor(pixel.r / 10) * 10},${Math.floor(pixel.g / 10) * 10},${Math.floor(pixel.b / 10) * 10}`;
      colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
    });

    // En yaygın rengi bul
    let maxCount = 0;
    let dominantColor = { r: 255, g: 255, b: 255 };

    for (const [colorKey, count] of colorCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        const [r, g, b] = colorKey.split(',').map(Number);
        dominantColor = { r, g, b };
      }
    }

    return dominantColor;
  }

  /**
   * Tutarlı arka plan rengi bulma
   */
  findConsistentBackgroundColor(regionColors) {
    if (regionColors.length === 0) {
      return { r: 255, g: 255, b: 255 }; // Default white
    }

    // Ortalama rengi hesapla
    const avgColor = {
      r: Math.round(regionColors.reduce((sum, color) => sum + color.r, 0) / regionColors.length),
      g: Math.round(regionColors.reduce((sum, color) => sum + color.g, 0) / regionColors.length),
      b: Math.round(regionColors.reduce((sum, color) => sum + color.b, 0) / regionColors.length)
    };

    return avgColor;
  }

  /**
   * Arka plan tipi sınıflandırma
   */
  classifyBackgroundType(color) {
    const { r, g, b } = color;
    const brightness = this.calculateBrightness(color);

    if (this.isWhiteish(color)) {
      return 'white';
    } else if (this.isGrayish(color)) {
      return 'gray';
    } else if (brightness > 200) {
      return 'light_colored';
    } else if (brightness < 80) {
      return 'dark';
    } else {
      return 'colored';
    }
  }

  /**
   * Beyazımsı kontrol
   */
  isWhiteish(color) {
    const { r, g, b } = color;
    return r > 240 && g > 240 && b > 240;
  }

  /**
   * Griyimsi kontrol
   */
  isGrayish(color) {
    const { r, g, b } = color;
    const maxDiff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
    return maxDiff < 30; // RGB değerleri birbirine yakın
  }

  /**
   * Parlaklık hesaplama
   */
  calculateBrightness(color) {
    const { r, g, b } = color;
    return (r * 0.299 + g * 0.587 + b * 0.114);
  }

  /**
   * Noise level analizi
   */
  async analyzeNoiseLevel(buffer) {
    try {
      // Laplacian filtresi ile edge detection
      const stats = await sharp(buffer)
        .greyscale()
        .convolve({
          width: 3,
          height: 3,
          kernel: [0, -1, 0, -1, 4, -1, 0, -1, 0]
        })
        .stats();

      // Standart sapma noise level'ı gösterir
      return stats.channels[0].stdev || 0;

    } catch (error) {
      console.warn('Noise analysis failed:', error.message);
      return 50; // Default noise level
    }
  }

  /**
   * Temizleme metodu seçimi
   */
  selectCleaningMethod(backgroundInfo, config) {
    if (config.cleaningMode !== 'auto') {
      return config.cleaningMode;
    }

    const { backgroundType, noiseLevel, analysis } = backgroundInfo;

    // Otomatik metod seçimi
    if (backgroundType === 'white' && noiseLevel < 30) {
      return 'white_threshold';
    } else if (backgroundType === 'gray' && noiseLevel < 50) {
      return 'gray_threshold';
    } else if (analysis.brightness > 200 && noiseLevel < 60) {
      return 'light_background';
    } else if (noiseLevel > 80) {
      return 'complex_background';
    } else {
      return 'color_clustering';
    }
  }

  /**
   * Arka plan temizleme işlemleri
   */
  async performCleaning(buffer, backgroundInfo, method, config) {
    const { dominantColor } = backgroundInfo;

    switch (method) {
      case 'white_threshold':
        return this.whiteThresholdCleaning(buffer, dominantColor, config);

      case 'gray_threshold':
        return this.grayThresholdCleaning(buffer, dominantColor, config);

      case 'light_background':
        return this.lightBackgroundCleaning(buffer, dominantColor, config);

      case 'color_clustering':
        return this.colorClusteringCleaning(buffer, dominantColor, config);

      case 'complex_background':
        return this.complexBackgroundCleaning(buffer, backgroundInfo, config);

      case 'aggressive':
        return this.aggressiveCleaning(buffer, dominantColor, config);

      case 'gentle':
        return this.gentleCleaning(buffer, dominantColor, config);

      case 'precise':
        return this.preciseCleaning(buffer, backgroundInfo, config);

      default:
        return this.whiteThresholdCleaning(buffer, dominantColor, config);
    }
  }

  /**
   * Beyaz threshold temizleme
   */
  async whiteThresholdCleaning(buffer, backgroundColor, config) {
    const threshold = 30; // RGB farkı threshold'u

    return sharp(buffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
      .then(({ data, info }) => {
        // RGBA pixel'ları işle
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Arka plan rengine yakın pikselleri şeffaf yap
          const diffR = Math.abs(r - backgroundColor.r);
          const diffG = Math.abs(g - backgroundColor.g);
          const diffB = Math.abs(b - backgroundColor.b);

          if (diffR < threshold && diffG < threshold && diffB < threshold) {
            data[i + 3] = 0; // Alpha = 0 (şeffaf)
          }
        }

        return sharp(data, {
          raw: {
            width: info.width,
            height: info.height,
            channels: 4
          }
        }).png();
      });
  }

  /**
   * Gri threshold temizleme
   */
  async grayThresholdCleaning(buffer, backgroundColor, config) {
    const threshold = 40;

    return sharp(buffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
      .then(({ data, info }) => {
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Gri seviye hesapla
          const gray = (r + g + b) / 3;
          const bgGray = (backgroundColor.r + backgroundColor.g + backgroundColor.b) / 3;

          if (Math.abs(gray - bgGray) < threshold) {
            data[i + 3] = 0; // Şeffaf yap
          }
        }

        return sharp(data, {
          raw: {
            width: info.width,
            height: info.height,
            channels: 4
          }
        }).png();
      });
  }

  /**
   * Açık arka plan temizleme
   */
  async lightBackgroundCleaning(buffer, backgroundColor, config) {
    const threshold = 50;

    return sharp(buffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
      .then(({ data, info }) => {
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Parlaklık hesapla
          const brightness = r * 0.299 + g * 0.587 + b * 0.114;
          const bgBrightness = backgroundColor.r * 0.299 + backgroundColor.g * 0.587 + backgroundColor.b * 0.114;

          if (Math.abs(brightness - bgBrightness) < threshold && brightness > 180) {
            data[i + 3] = 0;
          }
        }

        return sharp(data, {
          raw: {
            width: info.width,
            height: info.height,
            channels: 4
          }
        }).png();
      });
  }

  /**
   * Renk clustering temizleme
   */
  async colorClusteringCleaning(buffer, backgroundColor, config) {
    // Daha gelişmiş renk clustering algoritması
    const threshold = 60;

    return sharp(buffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
      .then(({ data, info }) => {
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Euclidean distance in RGB space
          const distance = Math.sqrt(
            Math.pow(r - backgroundColor.r, 2) +
            Math.pow(g - backgroundColor.g, 2) +
            Math.pow(b - backgroundColor.b, 2)
          );

          if (distance < threshold) {
            data[i + 3] = 0;
          }
        }

        return sharp(data, {
          raw: {
            width: info.width,
            height: info.height,
            channels: 4
          }
        }).png();
      });
  }

  /**
   * Karmaşık arka plan temizleme
   */
  async complexBackgroundCleaning(buffer, backgroundInfo, config) {
    // Morphological operations ve advanced filtering
    try {
      // Önce gürültü azaltma
      const denoised = await sharp(buffer)
        .median(3) // Median filter
        .toBuffer();

      // Daha agresif threshold ile temizleme
      return this.colorClusteringCleaning(denoised, backgroundInfo.dominantColor, {
        ...config,
        threshold: 80
      });

    } catch (error) {
      console.warn('Complex cleaning failed, falling back to simple:', error.message);
      return this.whiteThresholdCleaning(buffer, backgroundInfo.dominantColor, config);
    }
  }

  /**
   * Agresif temizleme
   */
  async aggressiveCleaning(buffer, backgroundColor, config) {
    const threshold = 20; // Çok düşük threshold

    return sharp(buffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
      .then(({ data, info }) => {
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          const diffR = Math.abs(r - backgroundColor.r);
          const diffG = Math.abs(g - backgroundColor.g);
          const diffB = Math.abs(b - backgroundColor.b);

          if (diffR < threshold && diffG < threshold && diffB < threshold) {
            data[i + 3] = 0;
          }
        }

        return sharp(data, {
          raw: {
            width: info.width,
            height: info.height,
            channels: 4
          }
        }).png();
      });
  }

  /**
   * Hassas temizleme
   */
  async gentleCleaning(buffer, backgroundColor, config) {
    const threshold = 60; // Yüksek threshold

    return this.whiteThresholdCleaning(buffer, backgroundColor, { ...config, threshold });
  }

  /**
   * Kesin temizleme
   */
  async preciseCleaning(buffer, backgroundInfo, config) {
    // Multi-step precise cleaning
    try {
      // 1. Önce hafif temizleme
      const gentle = await this.gentleCleaning(buffer, backgroundInfo.dominantColor, config);
      const gentleBuffer = await gentle.toBuffer();

      // 2. Kenar korumalı daha agresif temizleme
      return this.aggressiveCleaning(gentleBuffer, backgroundInfo.dominantColor, config);

    } catch (error) {
      return this.whiteThresholdCleaning(buffer, backgroundInfo.dominantColor, config);
    }
  }

  /**
   * İmza enhancement
   */
  async enhanceSignature(cleanedSharp, config) {
    const level = config.enhancementLevel || 3;

    let enhanced = cleanedSharp;

    if (level >= 1) {
      // Kontrast artırma
      enhanced = enhanced.modulate({
        brightness: 1.0,
        saturation: 0.8, // Renkleri biraz azalt
      });
    }

    if (level >= 2) {
      // Keskinleştirme
      enhanced = enhanced.sharpen(1, 1, 2);
    }

    if (level >= 3) {
      // İnce çizgi koruması
      if (config.preserveThinLines) {
        enhanced = enhanced.convolve({
          width: 3,
          height: 3,
          kernel: [0, -1, 0, -1, 5, -1, 0, -1, 0], // Sharpening kernel
          scale: 1,
          offset: 0
        });
      }
    }

    if (level >= 4) {
      // Noise reduction
      enhanced = enhanced.median(1);
    }

    if (level >= 5) {
      // En agresif enhancement
      enhanced = enhanced
        .modulate({ brightness: 1.1, saturation: 0.5 })
        .sharpen(2, 1, 3);
    }

    return enhanced;
  }

  /**
   * Output formatları oluşturma
   */
  async generateOutputs(enhancedSharp, config) {
    const outputs = {};

    if (config.outputFormat === 'png' || config.outputFormat === 'both') {
      // PNG - şeffaf arka plan
      const pngBuffer = await enhancedSharp
        .png({ quality: 95, compressionLevel: 6 })
        .toBuffer();

      const { width, height } = await sharp(pngBuffer).metadata();

      outputs.png_base64 = pngBuffer.toString('base64');
      outputs.width = width;
      outputs.height = height;
    }

    if (config.outputFormat === 'jpeg' || config.outputFormat === 'both') {
      // JPEG - beyaz arka plan
      const jpegBuffer = await enhancedSharp
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .jpeg({ quality: 95 })
        .toBuffer();

      outputs.jpeg_base64 = jpegBuffer.toString('base64');
    }

    return outputs;
  }

  /**
   * Kalite değerlendirmesi
   */
  async assessQuality(enhancedSharp, originalData) {
    try {
      // Basit kalite metrikleri
      const stats = await enhancedSharp.stats();
      const metadata = await enhancedSharp.metadata();

      // Contrast ratio hesaplama
      const channelStats = stats.channels[0];
      const contrast = channelStats.stdev || 0;

      // Şeffaf pixel oranı
      const hasAlpha = metadata.channels === 4;
      let transparentRatio = 0;

      if (hasAlpha) {
        const rawData = await enhancedSharp.raw().toBuffer();
        let transparentPixels = 0;
        let totalPixels = 0;

        for (let i = 3; i < rawData.length; i += 4) {
          totalPixels++;
          if (rawData[i] < 128) transparentPixels++;
        }

        transparentRatio = transparentPixels / totalPixels;
      }

      // Basit kalite skoru hesaplama
      let qualityScore = 0.5; // Base score

      if (contrast > 30) qualityScore += 0.2; // İyi kontrast
      if (transparentRatio > 0.1) qualityScore += 0.2; // Arka plan temizlenmiş
      if (transparentRatio < 0.8) qualityScore += 0.1; // Çok fazla temizlenmemiş

      return Math.min(1.0, qualityScore);

    } catch (error) {
      console.warn('Quality assessment failed:', error.message);
      return 0.7; // Default score
    }
  }

  /**
   * Hızlı preview oluşturma
   */
  async generatePreview(imageInput, maxSize = 400) {
    try {
      const preprocessed = await this.preprocessImage(imageInput);

      return sharp(preprocessed.buffer)
        .resize(maxSize, maxSize, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toBuffer()
        .then(buffer => buffer.toString('base64'));

    } catch (error) {
      throw new Error(`Preview generation failed: ${error.message}`);
    }
  }

  /**
   * Servis durumu
   */
  getStatus() {
    return {
      service: 'BackgroundCleaner',
      version: '1.0.0',
      supportedFormats: this.supportedFormats,
      defaultOptions: this.defaultOptions
    };
  }
}

module.exports = BackgroundCleaner;