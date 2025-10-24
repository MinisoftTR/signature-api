const path = require('path');
const fs = require('fs');
const { createCanvas, registerFont } = require('@napi-rs/canvas');
const sharp = require('sharp');

// Font dizini
const FONTS_DIR = path.join(__dirname, 'fonts');
const ASSETS_DIR = path.join(__dirname, 'assets/styles');

// Canvas boyutları (400x400 önizleme için optimize edilmiş)
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 400;

// Font önizleme oluşturma fonksiyonu
async function generateFontPreview(fontFile, fontName, outputPath) {
  try {
    const fontPath = path.join(FONTS_DIR, fontFile);
    
    // Font'u kaydet
    const fontFamily = fontName.replace(/\s+/g, '');
    registerFont(fontPath, { family: fontFamily });
    console.log(`Font yüklendi: ${fontFamily}`);
    
    // Canvas oluştur
    const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    const ctx = canvas.getContext('2d');
    
    // Şeffaf arka plan
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Font boyutunu ayarla (400x400 için optimize edilmiş)
    let fontSize = 90; // 400x400 için daha büyük başlangıç boyutu
    const displayText = fontName; // Font adını göster
    
    // Font ayarları - imza mavisi renk
    ctx.font = `normal ${fontSize}px "${fontFamily}"`;
    ctx.fillStyle = '#1a4a78'; // İmza mavisi
    
    // Metin ölçülerini al ve boyutu ayarla
    let textMetrics = ctx.measureText(displayText);
    let textWidth = textMetrics.width;
    const maxWidth = canvas.width * 0.85; // Canvas genişliğinin %85'i
    
    // Metin çok genişse font boyutunu küçült
    if (textWidth > maxWidth) {
      fontSize = Math.floor(fontSize * (maxWidth / textWidth));
      ctx.font = `normal ${fontSize}px "${fontFamily}"`;
      textMetrics = ctx.measureText(displayText);
      textWidth = textMetrics.width;
    }
    
    // Minimum font boyutu kontrolü
    if (fontSize < 30) {
      fontSize = 30;
      ctx.font = `normal ${fontSize}px "${fontFamily}"`;
      textMetrics = ctx.measureText(displayText);
      textWidth = textMetrics.width;
    }
    
    // Metni tam ortala (400x400 canvas için)
    const x = (canvas.width - textWidth) / 2;
    const y = (canvas.height + fontSize) / 2 - fontSize * 0.1; // Daha iyi dikey ortalama
    
    // Metni çiz
    ctx.fillText(displayText, x, y);
    
    // Buffer'a dönüştür
    const buffer = canvas.toBuffer('image/png');
    
    // Sharp ile optimize et ve kaydet
    await sharp(buffer)
      .png({ 
        quality: 90,
        compressionLevel: 9,
        adaptiveFiltering: true,
        force: true
      })
      .toFile(outputPath);
    
    console.log(`✓ Önizleme oluşturuldu: ${outputPath}`);
    return true;
  } catch (error) {
    console.error(`✗ Hata (${fontName}):`, error.message);
    return false;
  }
}

// Ana fonksiyon
async function generateAllPreviews() {
  console.log('Font önizlemeleri oluşturuluyor...\n');
  
  // Assets/styles dizinini kontrol et, yoksa oluştur
  if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
    console.log('Assets/styles dizini oluşturuldu');
  }
  
  // Fonts dizinini kontrol et
  if (!fs.existsSync(FONTS_DIR)) {
    console.error('Fonts dizini bulunamadı!');
    process.exit(1);
  }
  
  // Font dosyalarını oku
  const fontFiles = fs.readdirSync(FONTS_DIR);
  
  // TTF ve OTF dosyalarını filtrele ve grupla
  const fontMap = new Map();
  
  fontFiles.forEach(file => {
    const ext = path.extname(file).toLowerCase();
    if (ext === '.ttf' || ext === '.otf') {
      const baseName = path.basename(file, ext);
      const cleanName = baseName.replace(/_/g, ' ').trim();
      
      // TTF tercih et (OTF varsa üzerine yazma)
      if (!fontMap.has(cleanName) || ext === '.ttf') {
        fontMap.set(cleanName, {
          file: file,
          name: cleanName,
          id: cleanName.toLowerCase().replace(/\s+/g, '_')
        });
      }
    }
  });
  
  console.log(`${fontMap.size} adet font bulundu\n`);
  
  // İstatistikler
  let successCount = 0;
  let failCount = 0;
  
  // Her font için önizleme oluştur
  for (const [fontName, fontInfo] of fontMap) {
    const outputFile = `${fontInfo.id}.png`;
    const outputPath = path.join(ASSETS_DIR, outputFile);
    
    console.log(`İşleniyor: ${fontName} (${fontInfo.file})`);
    
    const success = await generateFontPreview(
      fontInfo.file,
      fontInfo.name,
      outputPath
    );
    
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    console.log(''); // Boş satır için
  }
  
  // Özel durumlar için sabit görsel kontrolleri
  const specialImages = ['customize.png', 'elegant.png'];
  
  console.log('\n=== ÖZET ===');
  console.log(`✓ Başarılı: ${successCount}`);
  console.log(`✗ Başarısız: ${failCount}`);
  console.log(`Toplam: ${fontMap.size}`);
  
  // Özel görseller hakkında bilgi
  console.log('\n=== NOT ===');
  specialImages.forEach(img => {
    const imgPath = path.join(ASSETS_DIR, img);
    if (fs.existsSync(imgPath)) {
      console.log(`! "${img}" mevcut - Bu özel bir görsel olabilir`);
    }
  });
  
  console.log('\nTüm font önizlemeleri başarıyla oluşturuldu!');
}

// Script'i çalıştır
generateAllPreviews().catch(error => {
  console.error('Kritik hata:', error);
  process.exit(1);
});