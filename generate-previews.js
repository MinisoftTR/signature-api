const { createCanvas, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { Resvg } = require('@resvg/resvg-js');
const { getAllStyles } = require('./config/signatureStyles');
const SignatureService = require('./lib/signature-service');

// Önizleme resimleri için sabit parametreler
const PREVIEW_CONFIG = {
  width: 200,
  height: 80,
  sampleNames: [
    'Sign AI'
  ],
  backgroundColor: '#ffffff',
  paddingHorizontal: 8, // Sol-sağdan 8px
  paddingVertical: 6    // Üst-alttan 6px
};

// Tüm fontları kaydet
function registerAllFonts() {
  const fontsDir = path.join(__dirname, 'fonts');
  if (!fs.existsSync(fontsDir)) {
    console.log('Fonts dizini bulunamadı:', fontsDir);
    return;
  }

  const fontFiles = fs.readdirSync(fontsDir);
  let registeredCount = 0;

  fontFiles.forEach(file => {
    const ext = path.extname(file).toLowerCase();
    if (ext === '.ttf' || ext === '.otf') {
      const baseName = path.basename(file, ext);
      const cleanName = baseName.replace(/_/g, ' ').trim();
      const fontPath = path.join(fontsDir, file);
      
      try {
        registerFont(fontPath, { family: cleanName.replace(/\s+/g, '') });
        console.log(`✓ Font registered: ${cleanName}`);
        registeredCount++;
      } catch (error) {
        console.warn(`✗ Font registration failed: ${cleanName} - ${error.message}`);
      }
    }
  });

  console.log(`\nTotal fonts registered: ${registeredCount}`);
}

// SVG önizleme resmi oluştur
async function generatePreviewImageSVG(style, styleIndex) {
  try {
    const signatureService = new SignatureService();
    
    // Font yapılandırmasını al
    const fontConfig = style.fontConfig;
    if (!fontConfig) {
      console.warn(`Font config bulunamadı: ${style.name}`);
      return null;
    }

    // Rastgele isim seç (stil index'ine göre)
    const sampleName = PREVIEW_CONFIG.sampleNames[styleIndex % PREVIEW_CONFIG.sampleNames.length];

    // SVG render options (küçük önizleme için)
    const svgOptions = {
      size: 64, // Küçük önizleme boyutu
      color: fontConfig.color || '#000000',
      padding: PREVIEW_CONFIG.paddingHorizontal,
      baselineRatio: 0.62,
      backgroundColor: PREVIEW_CONFIG.backgroundColor,
      kerning: true,
      ligatures: true
    };

    // SVG oluştur
    const svgResult = await signatureService.generateSVGSignature(
      sampleName, 
      fontConfig.path, 
      svgOptions
    );

    // SVG'yi PNG'ye dönüştür (200x80 boyutunda)
    const resvg = new Resvg(svgResult.svg, {
      background: PREVIEW_CONFIG.backgroundColor,
      fitTo: {
        mode: 'width',
        value: PREVIEW_CONFIG.width
      }
    });

    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    // Final boyutu ayarla ve optimize et - balanced trimming
    const optimizedBuffer = await sharp(pngBuffer)
      .trim({
        threshold: 8,  // Less aggressive trimming to prevent clipping
        background: { r: 255, g: 255, b: 255, alpha: 0 }  // Trim white and transparent
      })
      .resize(PREVIEW_CONFIG.width, PREVIEW_CONFIG.height, {
        fit: 'contain',
        background: PREVIEW_CONFIG.backgroundColor
      })
      .png({ quality: 90 })
      .toBuffer();

    return optimizedBuffer;

  } catch (error) {
    console.error(`SVG preview oluşturma hatası (${style.name}):`, error.message);
    
    // Fallback: Canvas tabanlı önizleme
    return generatePreviewImageCanvas(style, styleIndex);
  }
}

// Canvas tabanlı önizleme (fallback)
async function generatePreviewImageCanvas(style, styleIndex) {
  try {
    const canvas = createCanvas(PREVIEW_CONFIG.width, PREVIEW_CONFIG.height);
    const ctx = canvas.getContext('2d');

    // Beyaz arka plan
    ctx.fillStyle = PREVIEW_CONFIG.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Font yapılandırmasını al
    const fontConfig = style.fontConfig;
    if (!fontConfig) {
      console.warn(`Font config bulunamadı: ${style.name}`);
      return null;
    }

    // Rastgele isim seç (stil index'ine göre)
    const sampleName = PREVIEW_CONFIG.sampleNames[styleIndex % PREVIEW_CONFIG.sampleNames.length];

    // Font boyutunu 1024x500 canvas için ayarla
    const previewFontSize = Math.floor(fontConfig.size * 0.35); // Canvas boyutuna uygun font boyutu
    
    // Font family'yi belirle
    let fontFamily = `"${fontConfig.family}"`;
    
    // Font dosyası kontrolü
    if (fontConfig.path && fs.existsSync(fontConfig.path)) {
      try {
        registerFont(fontConfig.path, { family: fontConfig.family });
        console.log(`Font loaded for preview: ${fontConfig.family}`);
      } catch (err) {
        console.warn(`Font loading failed: ${fontConfig.family}`);
        fontFamily = 'Arial, sans-serif';
      }
    } else {
      fontFamily = 'Arial, sans-serif';
    }

    // Font ayarları
    ctx.font = `${fontConfig.italic ? 'italic ' : ''}${fontConfig.weight || 'normal'} ${previewFontSize}px ${fontFamily}`;
    ctx.fillStyle = fontConfig.color || '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Kullanılabilir alan hesapla (padding dahil)
    const availableWidth = canvas.width - (2 * PREVIEW_CONFIG.paddingHorizontal);
    const availableHeight = canvas.height - (2 * PREVIEW_CONFIG.paddingVertical);
    
    // Metnin boyutunu ölç
    const textMetrics = ctx.measureText(sampleName);
    const textWidth = textMetrics.width;
    
    // Eğer metin çok genişse, font boyutunu küçült
    let finalFontSize = previewFontSize;
    if (textWidth > availableWidth) {
      finalFontSize = Math.floor(previewFontSize * (availableWidth / textWidth));
      ctx.font = `${fontConfig.italic ? 'italic ' : ''}${fontConfig.weight || 'normal'} ${finalFontSize}px ${fontFamily}`;
    }

    // Metni tam ortaya yerleştir
    const x = canvas.width / 2;
    const y = canvas.height / 2;
    
    ctx.fillText(sampleName, x, y);

    // Canvas'ı PNG buffer'a çevir
    const buffer = canvas.toBuffer('image/png');
    
    // Sharp ile optimize et ve trim et - balanced
    const optimizedBuffer = await sharp(buffer)
      .trim({
        threshold: 8,  // Less aggressive trimming to prevent clipping
        background: { r: 255, g: 255, b: 255, alpha: 0 }  // Trim white and transparent
      })
      .png({ quality: 90 })
      .toBuffer();

    return optimizedBuffer;

  } catch (error) {
    console.error(`Canvas preview oluşturma hatası (${style.name}):`, error);
    return null;
  }
}

// Ana fonksiyon
async function generateAllPreviews() {
  console.log('Önizleme resimleri oluşturuluyor...\n');
  
  // Tüm fontları kaydet
  registerAllFonts();
  
  // Stil listesini al
  const styles = getAllStyles();
  console.log(`\nToplam ${styles.length} stil bulundu.\n`);
  
  // Assets/styles dizinini kontrol et
  const stylesDir = path.join(__dirname, 'assets', 'styles');
  if (!fs.existsSync(stylesDir)) {
    fs.mkdirSync(stylesDir, { recursive: true });
    console.log('Assets/styles dizini oluşturuldu.');
  }

  let successCount = 0;
  let errorCount = 0;
  let styleIndex = 0;

  // Her stil için önizleme oluştur
  for (const style of styles) {
    // Customize stilini atla
    if (style.isCustomize) {
      console.log(`⏩ Skipping customize style`);
      continue;
    }

    const sampleName = PREVIEW_CONFIG.sampleNames[styleIndex % PREVIEW_CONFIG.sampleNames.length];
    console.log(`🔄 Generating preview for: ${style.name} (${style.id}) - Sample: "${sampleName}"`);
    
    const previewBuffer = await generatePreviewImageSVG(style, styleIndex);
    
    if (previewBuffer) {
      // Dosya yolunu belirle
      const filename = `${style.id}.png`;
      const filepath = path.join(stylesDir, filename);
      
      try {
        // Dosyayı kaydet
        fs.writeFileSync(filepath, previewBuffer);
        console.log(`✅ Preview saved: ${filename}`);
        successCount++;
      } catch (saveError) {
        console.error(`❌ Save failed for ${style.name}:`, saveError);
        errorCount++;
      }
    } else {
      console.error(`❌ Preview generation failed for: ${style.name}`);
      errorCount++;
    }
    
    styleIndex++;
    console.log(''); // Boş satır
  }

  console.log(`\n📊 SONUÇ:`);
  console.log(`✅ Başarılı: ${successCount}`);
  console.log(`❌ Hatalı: ${errorCount}`);
  console.log(`📋 Toplam: ${successCount + errorCount}`);
}

// Script'i çalıştır
if (require.main === module) {
  generateAllPreviews()
    .then(() => {
      console.log('\n🎉 Önizleme oluşturma tamamlandı!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script hatası:', error);
      process.exit(1);
    });
}

module.exports = { generateAllPreviews, generatePreviewImageSVG, generatePreviewImageCanvas };