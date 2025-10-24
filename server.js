const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { createCanvas, registerFont } = require('canvas');
const sharp = require('sharp');

// Import routes
const stylesRouter = require('./routes/styles');
const { getFontConfigForStyle } = require('./config/signatureStyles');
const appConfig = require('./config/appConfig');

// Import signature organizer
const SignatureOrganizer = require('./utils/signatureOrganizer');
const MobileOptimizationAPI = require('./mobile-optimization-api');

// Uygulama modu - Yalnızca font tabanlı imza oluşturma
const APP_MODE = 'font_only';

// Çevre değişkenlerini yükle
dotenv.config();

// Vercel ortamı kontrolü
const isVercel = process.env.VERCEL || process.env.VERCEL_ENV;

// Vercel için dizin yolunu ayarla
const getSignaturesDir = () => {
  if (isVercel) {
    const tmpDir = path.join('/tmp', 'generated-signatures');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    return tmpDir;
  }
  return path.join(__dirname, 'generated-signatures');
};

const getPdfUploadsDir = () => {
  if (isVercel) {
    const tmpDir = path.join('/tmp', 'pdf-uploads');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    return tmpDir;
  }
  return path.join(__dirname, 'pdf-uploads');
};

const app = express();
const port = process.env.PORT || 3001;

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const ip = req.ip || req.connection.remoteAddress;
  
  console.log(`[${timestamp}] ${method} ${url} - IP: ${ip}`);
  
  // Log request body for POST requests (excluding large data)
  if (method === 'POST' && req.body) {
    const logBody = { ...req.body };
    // Don't log potentially large base64 data
    if (logBody.image && logBody.image.length > 100) {
      logBody.image = '[BASE64_DATA]';
    }
    console.log(`[${timestamp}] Request Body:`, JSON.stringify(logBody, null, 2));
  }
  
  next();
});

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Serve static assets
app.use('/api/miniAssets', express.static(path.join(__dirname, 'assets')));

// Serve generated signatures (Vercel-safe)
app.use('/generated-signatures', express.static(getSignaturesDir()));

// Serve documentation
app.use('/docs', express.static(path.join(__dirname, 'docs')));

// Redirect root to docs
app.get('/', (req, res) => {
  res.redirect('/docs');
});

// Routes
app.use('/api/miniStyles', stylesRouter);

// Mobile optimization API
const mobileOptimizationAPI = new MobileOptimizationAPI();
app.use('/api/mobile', mobileOptimizationAPI.getRouter());

// New SVG Render Routes
const renderRouter = require('./routes/render');
app.use('/api/render', renderRouter);

// Font listesi endpoint'i
app.get('/api/miniFonts/list', (req, res) => {
  try {
    const fontsList = [];
    const fontsDir = path.join(__dirname, 'fonts');
    
    if (fs.existsSync(fontsDir)) {
      const fontFiles = fs.readdirSync(fontsDir);
      
      // Font dosyalarını analiz et
      const fontMap = new Map();
      
      fontFiles.forEach(file => {
        const ext = path.extname(file).toLowerCase();
        if (ext === '.ttf' || ext === '.otf') {
          const baseName = path.basename(file, ext);
          const cleanName = baseName.replace(/_/g, ' ').trim();
          
          if (!fontMap.has(cleanName)) {
            fontMap.set(cleanName, {
              id: cleanName.toLowerCase().replace(/\s+/g, '_'),
              name: cleanName,
              displayName: cleanName,
              fileName: file,
              filePath: path.join(fontsDir, file),
              fileType: ext.substring(1),
              category: categorizeFont(cleanName),
              isPro: determinePremiumStatus(cleanName),
              available: true
            });
          }
        }
      });
      
      fontsList.push(...Array.from(fontMap.values()));
    }
    
    res.json({
      success: true,
      data: fontsList,
      count: fontsList.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Font listesi alma hatası:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Font listesi alınamadı',
        type: 'font_list_error'
      }
    });
  }
});

// Font kategorilendirme fonksiyonu
function categorizeFont(fontName) {
  const name = fontName.toLowerCase();
  
  if (name.includes('signature') || name.includes('script')) {
    return 'signature';
  } else if (name.includes('elegant') || name.includes('classy')) {
    return 'elegant';
  } else if (name.includes('bold') || name.includes('strong')) {
    return 'bold';
  } else if (name.includes('modern') || name.includes('contemporary')) {
    return 'modern';
  } else if (name.includes('classic') || name.includes('traditional')) {
    return 'classic';
  } else if (name.includes('artistic') || name.includes('creative')) {
    return 'artistic';
  } else if (name.includes('professional') || name.includes('business')) {
    return 'professional';
  } else if (name.includes('minimal') || name.includes('simple')) {
    return 'minimalist';
  } else {
    return 'general';
  }
}

// Premium status belirleme fonksiyonu
function determinePremiumStatus(fontName) {
  // Tüm fontlar premium olarak ayarlandı (test için)
  return true;
}

// Dynamically generate signature styles from fonts
app.get('/api/miniStyles/generate-from-fonts', (req, res) => {
  try {
    const stylesList = [];
    const fontsDir = path.join(__dirname, 'fonts');
    
    if (fs.existsSync(fontsDir)) {
      const fontFiles = fs.readdirSync(fontsDir);
      const fontMap = new Map();
      
      // TTF fontları öncelikle al
      fontFiles.forEach(file => {
        const ext = path.extname(file).toLowerCase();
        if (ext === '.ttf') {
          const baseName = path.basename(file, ext);
          const cleanName = baseName.replace(/_/g, ' ').trim();
          
          if (!fontMap.has(cleanName)) {
            const styleId = cleanName.toLowerCase().replace(/\s+/g, '_');
            const category = categorizeFont(cleanName);
            const isPro = determinePremiumStatus(cleanName);
            
            fontMap.set(cleanName, {
              id: styleId,
              name: cleanName,
              imageUrl: `/api/miniAssets/styles/${styleId}.png`,
              isPro: isPro,
              fontStyle: styleId,
              category: category,
              fontConfig: {
                path: path.join(fontsDir, file),
                family: cleanName.replace(/\s+/g, ''),
                color: getDefaultColorForCategory(category),
                size: getDefaultSizeForCategory(category),
                italic: cleanName.toLowerCase().includes('italic'),
                weight: cleanName.toLowerCase().includes('bold') ? 'bold' : 'normal',
              }
            });
          }
        }
      });
      
      stylesList.push(...Array.from(fontMap.values()));
    }
    
    // Customize seçeneğini ekle
    stylesList.unshift({
      id: 'customize',
      name: 'Stilinizi özelleştirin',
      imageUrl: '/api/miniAssets/styles/customize.png',
      isPro: false,
      isCustomize: true,
      fontStyle: 'elegant',
      category: 'custom',
      fontConfig: null
    });
    
    res.json({
      success: true,
      data: stylesList,
      count: stylesList.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Style oluşturma hatası:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Style listesi oluşturulamadı',
        type: 'style_generation_error'
      }
    });
  }
});

// Kategori için varsayılan renk - hepsi siyah
function getDefaultColorForCategory(category) {
  // All signatures will be black
  return '#000000';
}

// Kategori için varsayılan boyut
function getDefaultSizeForCategory(category) {
  const sizeMap = {
    'signature': 520,
    'elegant': 480,
    'bold': 560,
    'modern': 440,
    'classic': 400,
    'artistic': 560,
    'professional': 440,
    'minimalist': 360,
    'general': 480
  };
  return sizeMap[category] || 480;
}

// Fonts dizinini oluştur (eğer yoksa)
const fontsDir = path.join(__dirname, 'fonts');
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

// Font yükleme artık signatureStyles.js üzerinden yapılıyor

// Font tabanlı imza oluşturma modu
console.log('Uygulama modu: Font tabanlı imza oluşturma');

// Font tabanlı imza oluşturma fonksiyonu

// Import BackgroundCleaner
const BackgroundCleaner = require('./lib/background-cleaner');
const backgroundCleaner = new BackgroundCleaner();

// Initialize signature organizer
const signatureOrganizer = new SignatureOrganizer('./signature-requests');

// Enhanced signature request logging function
function logSignatureRequest(name, fontStyle, success, error = null, ip = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    type: 'signature_generation',
    name_requested: name,
    font_style: fontStyle,
    success,
    error: error || null,
    client_ip: ip
  };

  // Log to console with detailed info
  console.log(`[SIGNATURE] ${timestamp} - ${success ? '✅ SUCCESS' : '❌ FAILED'}: "${name}" using style "${fontStyle}"${error ? ` (Error: ${error})` : ''}`);

  // Write to log file (traditional)
  const logPath = path.join(__dirname, '@data', 'signatures', 'signature_requests.log');
  const logLine = JSON.stringify(logEntry) + '\n';

  try {
    if (!fs.existsSync(path.dirname(logPath))) {
      fs.mkdirSync(path.dirname(logPath), { recursive: true });
    }
    fs.appendFileSync(logPath, logLine);

    // Also organize using new system
    signatureOrganizer.organizeSignatureRequest(logEntry);
  } catch (err) {
    console.error('Failed to write to signature request log:', err.message);
  }
}

// Türkçe karakterleri İngilizceye dönüştürme fonksiyonu
function convertTurkishToEnglish(text) {
  if (!text || typeof text !== 'string') {
    return text;
  }
  
  return text
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'G')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'C')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'I')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'O')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 'S')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'U');
}

// Ana imza oluşturma endpoint'i - Font tabanlı
app.post('/api/miniGenerate-signature', async (req, res) => {
  const startTime = Date.now();
  const clientIP = req.ip || req.connection.remoteAddress;
  let requestedName = 'unknown';
  let requestedStyle = 'unknown';
  
  try {
    const { name, fontStyle } = req.body;
    requestedName = name || 'unknown';
    requestedStyle = fontStyle || 'elegant';

    // İsim kontrolü 
    if (!name || typeof name !== 'string') {
      logSignatureRequest(requestedName, requestedStyle, false, 'İsim parametresi gerekli ve metin olmalıdır', clientIP);
      return res.status(400).json({ 
        error: 'İsim parametresi gerekli ve metin olmalıdır' 
      });
    }

    // Türkçe karakterleri İngilizceye dönüştür
    const convertedName = convertTurkishToEnglish(name);
    
    console.log(`Font tabanlı imza oluşturuluyor: "${name}" -> "${convertedName}" - Style: "${requestedStyle}"`);

    // Font stilini belirle
    const styleName = fontStyle || 'elegant';
    const fontConfig = getFontConfigForStyle(styleName) || getFontConfigForStyle('elegant');

    // İmzayı oluştur (dönüştürülmüş isim ile)
    const signatureImage = await generateFontSignature(convertedName, fontConfig, styleName);
    
    // PNG imzayı dosyaya kaydet (orijinal isim ile)
    const savedFilename = await saveSignatureToFile(name, styleName, signatureImage);
    
    // SVG imza oluştur ve kaydet
    let svgFilename = null;
    let svgUrl = `/api/render/signature.svg?text=${encodeURIComponent(convertedName)}&fontId=${styleName}`;
    
    try {
      // SignatureService kullanarak SVG oluştur
      const SignatureService = require('./lib/signature-service');
      const signatureService = new SignatureService();
      const fontPath = fontConfig.path;
      
      if (fs.existsSync(fontPath)) {
        // Problematic fontlar için SVG boyutunu küçült
        let svgFontSize = fontConfig.size || 480;
        if (styleName === 'ember' || styleName === 'storm' || styleName === 'wave') {
          svgFontSize = Math.min(svgFontSize, 340); // SVG için max 340px
        }
        if (styleName === 'tidal') {
          svgFontSize = Math.min(svgFontSize, 240); // Tidal için daha küçük SVG font boyutu
        }
        if (['pearl', 'crystal', 'blade', 'blossom', 'inferno', 'wave', 'ember', 'storm'].includes(styleName)) {
          svgFontSize = Math.min(svgFontSize, 260); // Spacing problem fontları için küçük SVG boyutu
        }

        const svgOptions = {
          size: svgFontSize,
          color: fontConfig.color || '#000000'
        };

        // Spacing problem fontları için özel kerning ayarları
        if (['tidal', 'pearl', 'crystal', 'blade', 'blossom', 'inferno', 'wave', 'ember', 'storm'].includes(styleName)) {
          svgOptions.kerning = true;
          svgOptions.ligatures = false;
          svgOptions.padding = svgFontSize * 0.15; // Ekstra padding
        }

        const svgResult = await signatureService.generateSVGSignature(convertedName, fontPath, svgOptions);
        
        // SVG'yi dosyaya kaydet
        svgFilename = await saveSVGSignatureToFile(name, styleName, svgResult.svg);
        
        if (svgFilename) {
          // SVG dosyasının statik URL'ini oluştur
          svgUrl = `/generated-signatures/${svgFilename}`;
          console.log(`SVG İmza dosya olarak kaydedildi: ${svgFilename}`);
        }
      }
    } catch (svgError) {
      console.warn(`SVG kaydetme hatası: ${svgError.message}`);
      // SVG hatası olursa varsayılan dinamik URL kullan
    }
    
    const processingTime = Date.now() - startTime;
    console.log(`İmza başarıyla oluşturuldu (${processingTime}ms): "${name}" -> "${convertedName}" - Style: "${styleName}"`);
    if (savedFilename) {
      console.log(`PNG İmza dosya olarak kaydedildi: ${savedFilename}`);
    }
    
    // Log successful generation
    logSignatureRequest(name, styleName, true, null, clientIP);

    return res.json({
      success: true,
      data: [{
        b64_json: signatureImage,
      }],
      fontStyle: styleName,
      mode: 'font',
      processing_time_ms: processingTime,
      svgUrl: svgUrl,
      svgFile: svgFilename,
      pngFile: savedFilename,
      newApiAvailable: true
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`Genel hata (${processingTime}ms):`, error);
    
    // Log failed generation
    logSignatureRequest(requestedName, requestedStyle, false, error.message, clientIP);
    
    return res.status(500).json({
      error: {
        message: error.message || 'Bilinmeyen bir hata oluştu',
        type: 'general_error',
      },
    });
  }
});

// Eski font tabanlı imza oluşturma endpoint'i (geriye uyumluluk için korundu)
app.post('/api/miniGenerate-font-signature', async (req, res) => {
  const startTime = Date.now();
  const clientIP = req.ip || req.connection.remoteAddress;
  let requestedName = 'unknown';
  let requestedStyle = 'unknown';
  
  try {
    const { name, fontStyle } = req.body;
    requestedName = name || 'unknown';
    requestedStyle = fontStyle || 'elegant';

    if (!name) {
      logSignatureRequest(requestedName, requestedStyle, false, 'İsim gerekli', clientIP);
      return res.status(400).json({ error: 'İsim gerekli' });
    }

    // Türkçe karakterleri İngilizceye dönüştür
    const convertedName = convertTurkishToEnglish(name);
    
    console.log(`Font imzası oluşturuluyor: "${name}" -> "${convertedName}"`);

    // Font stilini kontrol et, yoksa varsayılan olarak 'elegant' kullan
    const style = fontStyle || 'elegant';
    const fontConfig = getFontConfigForStyle(style) || getFontConfigForStyle('elegant');

    // İmza oluştur (dönüştürülmüş isim ile)
    const signatureImage = await generateFontSignature(convertedName, fontConfig, style);
    
    // PNG imzayı dosyaya kaydet
    const savedFilename = await saveSignatureToFile(name, style, signatureImage);
    
    // SVG imza oluştur ve kaydet
    let svgFilename = null;
    let svgUrl = `/api/render/signature.svg?text=${encodeURIComponent(convertedName)}&fontId=${style}`;
    
    try {
      // SignatureService kullanarak SVG oluştur
      const SignatureService = require('./lib/signature-service');
      const signatureService = new SignatureService();
      const fontPath = fontConfig.path;
      
      if (fs.existsSync(fontPath)) {
        // Problematic fontlar için SVG boyutunu küçült
        let svgFontSize = fontConfig.size || 480;
        if (styleName === 'ember' || styleName === 'storm' || styleName === 'wave') {
          svgFontSize = Math.min(svgFontSize, 340); // SVG için max 340px
        }
        if (styleName === 'tidal') {
          svgFontSize = Math.min(svgFontSize, 240); // Tidal için daha küçük SVG font boyutu
        }
        if (['pearl', 'crystal', 'blade', 'blossom', 'inferno', 'wave', 'ember', 'storm'].includes(styleName)) {
          svgFontSize = Math.min(svgFontSize, 260); // Spacing problem fontları için küçük SVG boyutu
        }

        const svgOptions = {
          size: svgFontSize,
          color: fontConfig.color || '#000000'
        };

        // Spacing problem fontları için özel kerning ayarları
        if (['tidal', 'pearl', 'crystal', 'blade', 'blossom', 'inferno', 'wave', 'ember', 'storm'].includes(styleName)) {
          svgOptions.kerning = true;
          svgOptions.ligatures = false;
          svgOptions.padding = svgFontSize * 0.15; // Ekstra padding
        }

        const svgResult = await signatureService.generateSVGSignature(convertedName, fontPath, svgOptions);
        
        // SVG'yi dosyaya kaydet
        svgFilename = await saveSVGSignatureToFile(name, style, svgResult.svg);
        
        if (svgFilename) {
          // SVG dosyasının statik URL'ini oluştur
          svgUrl = `/generated-signatures/${svgFilename}`;
          console.log(`SVG İmza dosya olarak kaydedildi: ${svgFilename}`);
        }
      }
    } catch (svgError) {
      console.warn(`SVG kaydetme hatası: ${svgError.message}`);
      // SVG hatası olursa varsayılan dinamik URL kullan
    }
    
    const processingTime = Date.now() - startTime;
    if (savedFilename) {
      console.log(`PNG İmza dosya olarak kaydedildi: ${savedFilename}`);
    }
    
    // Log successful generation
    logSignatureRequest(name, style, true, null, clientIP);

    res.json({
      success: true,
      data: [{
        b64_json: signatureImage,
      }],
      fontStyle: style,
      mode: 'font',
      processing_time_ms: processingTime,
      svgUrl: svgUrl,
      svgFile: svgFilename,
      pngFile: savedFilename
    });
  } catch (error) {
    console.error('Font imza oluşturma hatası:', error);
    
    // Log failed generation
    logSignatureRequest(requestedName, requestedStyle, false, error.message, clientIP);
    
    res.status(500).json({
      error: {
        message: error.message || 'İmza oluşturulurken bir hata oluştu',
        type: 'font_signature_error',
      },
    });
  }
});

// Font tabanlı imza oluşturma fonksiyonu (whitespace trimmed)
async function generateFontSignature(name, fontConfig, styleName) {
  try {
    // Problem fontları tanımla
    const extremeProblemFonts = ['drift']; // Sage
    const regularProblemFonts = ['magic']; // Gold
    const clippingProblems = ['ember', 'storm', 'wave']; // Echo, Void, Dawn - taşma problemi
    const spacingProblems = ['tidal', 'pearl', 'crystal', 'blade', 'blossom', 'inferno', 'wave', 'ember', 'storm']; // Star, Sand, Kosakatta, Fire, Madeleine, Tottenham, Dawn, Echo, Void - karakter aralığı problemi
    const isExtremeProblemFont = extremeProblemFonts.includes(styleName);
    const isRegularProblemFont = regularProblemFonts.includes(styleName);
    const hasClippingProblem = clippingProblems.includes(styleName);
    const hasSpacingProblem = spacingProblems.includes(styleName);
    
    // Temporary canvas to measure text dimensions
    const tempCanvas = createCanvas(1280, 800);
    const tempCtx = tempCanvas.getContext('2d');

    // Font ayarlarını yap
    let baseFontSize = fontConfig.size || 120;

    // Problematic fontlar için özel boyut küçültme
    if (hasClippingProblem) {
      baseFontSize = Math.min(baseFontSize, 360); // Max 360px for problematic fonts
    }

    const scaleFactor = Math.min(tempCanvas.width / 1024, tempCanvas.height / 1024);
    let fontSize = Math.floor(baseFontSize * scaleFactor * 1.2);

    // Problematic fontlar için ekstra scaling
    if (hasClippingProblem) {
      fontSize = Math.floor(fontSize * 0.82); // %18 daha küçük
    }

    // Spacing problem fontları için özel ayar
    if (hasSpacingProblem) {
      fontSize = Math.floor(fontSize * 0.75); // %25 daha küçük spacing problemi için
    }
    
    // Font dosyası mevcut değilse, varsayılan sistem fontunu kullan
    let fontFamily = '"' + fontConfig.family + '"';
    if (!fs.existsSync(fontConfig.path)) {
      fontFamily = 'Arial, sans-serif';
      console.warn(`Font bulunamadı: ${fontConfig.path}, varsayılan font kullanılıyor`);
    } else {
      try {
        registerFont(fontConfig.path, { family: fontConfig.family });
      } catch (err) {
        console.error(`✗ Font kaydetme hatası: ${err.message}`);
        fontFamily = 'Arial, sans-serif';
      }
    }
    
    tempCtx.font = `${fontConfig.italic ? 'italic ' : ''}${fontConfig.weight || 'normal'} ${fontSize}px ${fontFamily}`;
    
    // Metin ölçülerini al
    const textMetrics = tempCtx.measureText(name);
    const textWidth = textMetrics.width;
    const textHeight = fontSize;
    
    // Metin sınırlarını hesapla
    const actualBoundingBoxAscent = textMetrics.actualBoundingBoxAscent || textHeight * 0.75;
    const actualBoundingBoxDescent = textMetrics.actualBoundingBoxDescent || textHeight * 0.25;
    const actualTextHeight = actualBoundingBoxAscent + actualBoundingBoxDescent;
    
    // EXTREME padding for problematic fonts
    const basePadding = Math.max(20, fontSize * 0.1);
    let padding;
    
    if (isExtremeProblemFont) {
      // Sage için ÇOKK fazla padding - neredeyse hiç trim edilmeyecek
      padding = basePadding * 4; // 4x padding!
      console.log(`🔧 EXTREME padding applied for ${styleName}: ${padding}px`);
    } else if (isRegularProblemFont) {
      // Gold için normal problem padding
      padding = basePadding * 2;
    } else if (hasClippingProblem) {
      // Problematic fontlar için clipping önleme padding
      padding = basePadding * 2;
      console.log(`📏 Clipping prevention padding for ${styleName}: ${padding}px`);
    } else {
      padding = basePadding;
    }
    
    // Optimal canvas boyutlarını hesapla - extreme problem fontlar için çok daha büyük
    const optimalWidth = Math.ceil(textWidth + (padding * 2));
    const optimalHeight = Math.ceil(actualTextHeight + (padding * 2));
    
    // Final canvas oluştur - sadece gerekli boyutta
    const canvas = createCanvas(optimalWidth, optimalHeight);
    const ctx = canvas.getContext('2d');
    
    // Şeffaf arka plan
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Font ayarlarını tekrar ayarla
    ctx.font = `${fontConfig.italic ? 'italic ' : ''}${fontConfig.weight || 'normal'} ${fontSize}px ${fontFamily}`;
    ctx.fillStyle = '#000000'; // Force black color for all signatures

    // Spacing problem fontları için letter-spacing ayarı
    if (hasSpacingProblem) {
      const letterSpacing = fontSize * -0.05; // Negatif letter-spacing
      ctx.letterSpacing = `${letterSpacing}px`;
      console.log(`🔤 Letter-spacing (${letterSpacing}px) applied for ${styleName}`);
    }
    
    // İmza efekti ekle - problem fontlarda hiç döndürme yok
    ctx.save();
    const angle = (isExtremeProblemFont || isRegularProblemFont) ? 0 : (Math.random() * 0.03) - 0.015;
    if (angle !== 0) {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(angle);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
    }
    
    // İmzayı optimal konuma yerleştir
    const x = padding;
    let y = padding + actualBoundingBoxAscent;

    // Problematic fontlar için 20px aşağı itme
    if (hasClippingProblem) {
      y += 20;
      console.log(`📍 Position adjustment (+20px) applied for ${styleName}`);
    }
    // Spacing problem fontları için ekstra padding
    if (hasSpacingProblem) {
      y += 10;
      console.log(`📍 Spacing adjustment (+10px) applied for ${styleName}`);
    }
    
    // İmzayı çiz
    ctx.fillText(name, x, y);
    ctx.restore();

    // Canvas'ı PNG olarak dönüştür
    const pngBuffer = canvas.toBuffer('image/png');
    
    // Sharp ile PNG'yi trim et - EXTREME problem fontlar için neredeyse hiç trim etme
    let trimThreshold;
    
    if (isExtremeProblemFont) {
      // Sage için neredeyse hiç trim etme
      trimThreshold = 100; // ÇOK yüksek threshold - neredeyse hiçbir şey trim edilmez
      console.log(`🔧 EXTREME trim threshold applied for ${styleName}: ${trimThreshold}`);
    } else if (isRegularProblemFont) {
      trimThreshold = 50; // Gold için orta seviye
    } else {
      trimThreshold = 5; // Normal fontlar için
    }
    
    const optimizedBuffer = await sharp(pngBuffer)
      .trim({
        threshold: trimThreshold,
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png({ quality: 95, compressionLevel: 9 })
      .toBuffer();

    // Base64 formatına dönüştür
    return optimizedBuffer.toString('base64');
  } catch (error) {
    console.error('İmza oluşturma hatası:', error);
    throw new Error('İmza oluşturulamadı: ' + error.message);
  }
}

// PNG İmzayı dosyaya kaydetme fonksiyonu (organizasyonlu sistem)
async function saveSignatureToFile(name, fontStyle, base64Data) {
  try {
    // İsmi dosya adı için uygun hale getir (Türkçe karakterleri değiştir ve boşlukları _ yap)
    const cleanName = signatureOrganizer.sanitizeName(name);

    // Tarih formatını oluştur (YYYY-MM-DD_HH-mm-ss)
    const now = new Date();
    const date = signatureOrganizer.getDateFromTimestamp(now.toISOString());
    const timestamp = now.toISOString()
      .replace('T', '_')
      .replace(/:/g, '-')
      .split('.')[0];

    // Dosya adını oluştur: isim_tarih_fontstil.png
    const filename = `${cleanName}_${timestamp}_${fontStyle}.png`;

    // Organizasyonlu klasör yapısını al
    const userFolder = signatureOrganizer.getUserFolder(name, date);
    const signaturesDir = path.join(userFolder, 'signatures');
    const filepath = path.join(signaturesDir, filename);

    // Base64'ü buffer'a çevir
    const buffer = Buffer.from(base64Data, 'base64');

    // Dosyayı kaydet
    if (!isVercel) {
      // Organizasyonlu sistem sadece Vercel dışında
      fs.writeFileSync(filepath, buffer);
    }

    // Eski sistemle uyumluluk için generated-signatures klasörüne de kopyala (Vercel'de /tmp)
    const legacyDir = getSignaturesDir();
    if (!fs.existsSync(legacyDir)) {
      fs.mkdirSync(legacyDir, { recursive: true });
    }
    const legacyPath = path.join(legacyDir, filename);
    fs.writeFileSync(legacyPath, buffer);

    console.log(`✓ PNG İmza kaydedildi: ${filepath}`);
    console.log(`✓ Legacy copy: ${legacyPath}`);
    return filename;
  } catch (error) {
    console.error('PNG İmza kaydetme hatası:', error);
    return null;
  }
}

// SVG İmzayı dosyaya kaydetme fonksiyonu
async function saveSVGSignatureToFile(name, fontStyle, svgContent) {
  try {
    // İsmi dosya adı için uygun hale getir (Türkçe karakterleri değiştir ve boşlukları _ yap)
    const cleanName = name
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ç/g, 'c')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ş/g, 's')
      .replace(/ü/g, 'u')
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
    
    // Tarih formatını oluştur (YYYY-MM-DD_HH-mm-ss)
    const now = new Date();
    const timestamp = now.toISOString()
      .replace('T', '_')
      .replace(/:/g, '-')
      .split('.')[0];
    
    // SVG dosya adını oluştur: isim_tarih_fontstil.svg
    const svgFilename = `${cleanName}_${timestamp}_${fontStyle}.svg`;

    // Vercel-safe dizin
    const signatureDir = getSignaturesDir();
    const svgFilepath = path.join(signatureDir, svgFilename);
    if (!fs.existsSync(signatureDir)) {
      fs.mkdirSync(signatureDir, { recursive: true });
    }
    
    // Organizasyonlu klasör yapısını al
    const cleanNameOrg = signatureOrganizer.sanitizeName(name);
    const date = signatureOrganizer.getDateFromTimestamp(new Date().toISOString());
    const userFolder = signatureOrganizer.getUserFolder(name, date);
    const signaturesDir = path.join(userFolder, 'signatures');
    const organizedSvgPath = path.join(signaturesDir, svgFilename);

    // SVG dosyayı organize edilmiş klasöre kaydet
    fs.writeFileSync(organizedSvgPath, svgContent, 'utf8');

    // SVG dosyayı legacy klasöre de kaydet
    fs.writeFileSync(svgFilepath, svgContent, 'utf8');

    console.log(`✓ SVG İmza kaydedildi: ${organizedSvgPath}`);
    console.log(`✓ Legacy copy: ${svgFilepath}`);
    return svgFilename;
  } catch (error) {
    console.error('SVG İmza kaydetme hatası:', error);
    return null;
  }
}

// "Sign AI" branded preview image generation function with white space trimming
async function generateSignAIPreview(fontConfig, styleId) {
  try {
    const previewText = "Sign AI";
    
    // Temporary canvas to measure text dimensions
    const tempCanvas = createCanvas(800, 400);
    const tempCtx = tempCanvas.getContext('2d');
    
    // Set up font
    let fontFamily = '"' + fontConfig.family + '"';
    if (!fs.existsSync(fontConfig.path)) {
      fontFamily = 'Arial, sans-serif';
      console.warn(`Font not found: ${fontConfig.path}, using default font`);
    } else {
      try {
        registerFont(fontConfig.path, { family: fontConfig.family });
      } catch (err) {
        console.error(`Font registration error: ${err.message}`);
        fontFamily = 'Arial, sans-serif';
      }
    }
    
    // Calculate optimal font size for preview
    const baseFontSize = Math.min(fontConfig.size * 0.4, 120);
    tempCtx.font = `${fontConfig.italic ? 'italic ' : ''}${fontConfig.weight || 'normal'} ${baseFontSize}px ${fontFamily}`;
    
    // Measure text dimensions
    const textMetrics = tempCtx.measureText(previewText);
    const textWidth = textMetrics.width;
    
    // Calculate text bounds
    const actualBoundingBoxAscent = textMetrics.actualBoundingBoxAscent || baseFontSize * 0.75;
    const actualBoundingBoxDescent = textMetrics.actualBoundingBoxDescent || baseFontSize * 0.25;
    const actualTextHeight = actualBoundingBoxAscent + actualBoundingBoxDescent;
    
    // Minimal padding
    const padding = Math.max(15, baseFontSize * 0.08);
    
    // Create optimal size canvas
    const optimalWidth = Math.ceil(textWidth + (padding * 2));
    const optimalHeight = Math.ceil(actualTextHeight + (padding * 2));
    
    const canvas = createCanvas(optimalWidth, optimalHeight);
    const ctx = canvas.getContext('2d');
    
    // Clear canvas with transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set up font again for final canvas
    ctx.font = `${fontConfig.italic ? 'italic ' : ''}${fontConfig.weight || 'normal'} ${baseFontSize}px ${fontFamily}`;
    ctx.fillStyle = '#000000';
    
    // Position text optimally
    const x = padding;
    let y = padding + actualBoundingBoxAscent;

    // Problematic fontlar için 20px aşağı itme (preview için de)
    const isClippingProblemFont = ['ember', 'storm', 'wave'].includes(styleName);
    if (isClippingProblemFont) {
      y += 20;
      console.log(`📍 Preview position adjustment (+20px) applied for ${styleName}`);
    }
    
    // Draw the preview text
    ctx.fillText(previewText, x, y);
    
    // Convert to PNG buffer
    const pngBuffer = canvas.toBuffer('image/png');
    
    // Trim white space and optimize with Sharp - enhanced
    const optimizedBuffer = await sharp(pngBuffer)
      .trim({
        threshold: 5,  // Daha agresif trimming threshold  
        background: { r: 255, g: 255, b: 255, alpha: 0 }  // Beyaz ve şeffaf alanları trim et
      })
      .png({ quality: 95, compressionLevel: 9 })
      .toBuffer();
    
    return optimizedBuffer;
  } catch (error) {
    console.error('Preview generation error:', error);
    throw new Error('Preview generation failed: ' + error.message);
  }
}

// Regenerate all preview images endpoint
app.post('/api/miniRegenerate-previews', async (req, res) => {
  try {
    const { getAllStyles } = require('./config/signatureStyles');
    const styles = getAllStyles();
    
    const results = [];
    const assetsDir = path.join(__dirname, 'assets', 'styles');
    
    // Ensure assets directory exists
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }
    
    for (const style of styles) {
      try {
        console.log(`Generating preview for style: ${style.id}`);
        
        // Generate Sign AI preview
        const previewBuffer = await generateSignAIPreview(style.fontConfig, style.id);
        
        // Save preview image
        const previewPath = path.join(assetsDir, `${style.id}.png`);
        fs.writeFileSync(previewPath, previewBuffer);
        
        results.push({
          styleId: style.id,
          styleName: style.name,
          success: true,
          filePath: previewPath
        });
        
        console.log(`✓ Preview generated for ${style.id}`);
      } catch (error) {
        console.error(`✗ Failed to generate preview for ${style.id}:`, error.message);
        results.push({
          styleId: style.id,
          styleName: style.name,
          success: false,
          error: error.message
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    res.json({
      success: true,
      message: `Generated ${successCount}/${totalCount} preview images with "Sign AI" branding`,
      results: results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Preview regeneration error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Sağlık kontrolü endpoint'i
app.get('/api/miniHealth', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// App konfigürasyon endpoint'i
app.get('/api/miniConfig', (req, res) => {
  res.json({
    success: true,
    data: appConfig,
    timestamp: new Date().toISOString()
  });
});

// PDF dosya yükleme ve saklama endpoint'i
app.post('/api/miniUpload-pdf', async (req, res) => {
  const startTime = Date.now();
  const clientIP = req.ip || req.connection.remoteAddress;
  
  try {
    const { pdfData, fileName, metadata } = req.body;

    // Gerekli parametreleri kontrol et
    if (!pdfData) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'pdfData parametresi gerekli',
          type: 'missing_parameter'
        }
      });
    }

    // PDF dosya boyutu kontrolü (50MB limit)
    const maxSizeMB = 50;
    const pdfSizeBytes = Buffer.byteLength(pdfData, 'base64');
    const pdfSizeMB = pdfSizeBytes / (1024 * 1024);
    
    if (pdfSizeMB > maxSizeMB) {
      return res.status(400).json({
        success: false,
        error: {
          message: `PDF dosyası çok büyük. Maksimum ${maxSizeMB}MB olabilir. (Gönderilen: ${pdfSizeMB.toFixed(2)}MB)`,
          type: 'file_too_large'
        }
      });
    }

    // Gün bazında klasör oluştur
    const now = new Date();
    const dateFolder = now.toISOString().split('T')[0]; // YYYY-MM-DD formatında
    const timeStamp = now.toISOString().replace(/[:.]/g, '-').split('.')[0]; // YYYY-MM-DDTHH-mm-ss

    // PDF upload dizinini oluştur (Vercel-safe)
    const uploadDir = path.join(getPdfUploadsDir(), dateFolder);
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
        console.log(`PDF upload dizini oluşturuldu: ${uploadDir}`);
      }
    } catch (error) {
      console.error('PDF upload dizini oluşturma hatası:', error);
      return res.status(500).json({
        success: false,
        message: 'Sunucu dosya sistemi hatası',
        error: 'Directory creation failed'
      });
    }

    // Dosya adını oluştur
    const originalFileName = fileName || 'document';
    const cleanFileName = originalFileName
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/\.pdf$/, ''); // .pdf uzantısını kaldır
    
    const pdfFileName = `${timeStamp}_${cleanFileName}.pdf`;
    const metadataFileName = `${timeStamp}_${cleanFileName}.json`;
    
    const pdfFilePath = path.join(uploadDir, pdfFileName);
    const metadataFilePath = path.join(uploadDir, metadataFileName);

    // PDF dosya doğrulaması (PDF magic bytes kontrolü)
    let pdfBuffer;
    try {
      // Base64'den buffer'a çevir
      const base64Data = pdfData.includes(',') ? pdfData.split(',')[1] : pdfData;
      pdfBuffer = Buffer.from(base64Data, 'base64');
      
      // PDF magic bytes kontrolü (%PDF)
      const pdfMagic = pdfBuffer.slice(0, 4).toString();
      if (!pdfMagic.startsWith('%PDF')) {
        throw new Error('Geçersiz PDF dosyası');
      }
    } catch (bufferError) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Geçersiz PDF verisi',
          type: 'invalid_pdf_data'
        }
      });
    }

    // Metadata oluştur
    const metadataData = {
      uploadTimestamp: now.toISOString(),
      clientIP: clientIP,
      originalFileName: fileName,
      savedFileName: pdfFileName,
      fileSize: pdfBuffer.length,
      fileSizeMB: pdfSizeMB,
      metadata: metadata || {},
      fileInfo: {
        type: 'PDF',
        encoding: 'base64',
        uploadSource: metadata?.source || 'API',
        processingTime: null // Will be updated below
      }
    };

    // PDF dosyasını kaydet
    fs.writeFileSync(pdfFilePath, pdfBuffer);
    
    const processingTime = Date.now() - startTime;
    metadataData.fileInfo.processingTime = processingTime;

    // Metadata dosyasını kaydet
    fs.writeFileSync(metadataFilePath, JSON.stringify(metadataData, null, 2));
    
    console.log(`✓ PDF dosyası kaydedildi (${processingTime}ms): ${pdfFileName}`);
    console.log(`📁 Boyut: ${pdfSizeMB.toFixed(2)}MB - Dizin: ${dateFolder}`);
    
    // Günlük istatistik güncelle
    await updateDailyPDFStats(dateFolder);

    res.json({
      success: true,
      data: {
        fileName: pdfFileName,
        metadataFile: metadataFileName,
        uploadDate: dateFolder,
        timestamp: now.toISOString(),
        fileSize: pdfBuffer.length,
        fileSizeMB: parseFloat(pdfSizeMB.toFixed(2)),
        processingTime: processingTime
      },
      message: 'PDF dosyası başarıyla yüklendi'
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`PDF upload hatası (${processingTime}ms):`, error);
    
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'PDF yükleme sırasında bir hata oluştu',
        type: 'pdf_upload_error',
      },
      processingTime: processingTime
    });
  }
});

// Günlük PDF upload istatistiklerini güncelle
async function updateDailyPDFStats(dateFolder) {
  try {
    const uploadDir = path.join(getPdfUploadsDir(), dateFolder);

    // Dizin yoksa oluştur
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
    }

    const statsFile = path.join(uploadDir, '_daily_stats.json');
    
    // Dizindeki dosyaları say ve analiz et
    const files = fs.readdirSync(uploadDir);
    const pdfFiles = files.filter(f => f.endsWith('.pdf'));
    const jsonFiles = files.filter(f => f.endsWith('.json') && !f.startsWith('_'));
    
    // PDF dosyalarının toplam boyutunu hesapla
    let totalSize = 0;
    let totalSizeMB = 0;
    
    pdfFiles.forEach(pdfFile => {
      try {
        const filePath = path.join(uploadDir, pdfFile);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
        totalSizeMB += stats.size / (1024 * 1024);
      } catch (err) {
        console.warn(`Dosya boyutu okunamadı: ${pdfFile}`);
      }
    });
    
    const stats = {
      date: dateFolder,
      lastUpdated: new Date().toISOString(),
      totalPDFs: pdfFiles.length,
      totalMetadataFiles: jsonFiles.length,
      totalFiles: files.length - 1, // _daily_stats.json dosyasını çıkar
      totalSizeBytes: totalSize,
      totalSizeMB: parseFloat(totalSizeMB.toFixed(2)),
      averageFileSizeMB: pdfFiles.length > 0 ? parseFloat((totalSizeMB / pdfFiles.length).toFixed(2)) : 0,
      files: {
        pdf: pdfFiles,
        metadata: jsonFiles
      }
    };
    
    fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));
    console.log(`📊 PDF istatistikleri güncellendi: ${pdfFiles.length} dosya, ${totalSizeMB.toFixed(2)}MB`);
    
  } catch (error) {
    console.error('PDF istatistik güncelleme hatası:', error);
  }
}

// PDF upload listesi endpoint'i
app.get('/api/miniPDF-list', (req, res) => {
  try {
    const { date, limit } = req.query;
    const uploadsDir = getPdfUploadsDir();

    if (!fs.existsSync(uploadsDir)) {
      // Ana dizini oluştur
      try {
        fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o755 });
        console.log(`PDF uploads ana dizini oluşturuldu: ${uploadsDir}`);
      } catch (error) {
        console.error('PDF uploads dizini oluşturma hatası:', error);
      }

      return res.json({
        success: true,
        data: [],
        message: 'Henüz PDF yüklemesi bulunmamaktadır'
      });
    }

    let uploadData = [];

    if (date) {
      // Belirli bir günün PDF'lerini getir
      const dayDir = path.join(uploadsDir, date);
      if (fs.existsSync(dayDir)) {
        const statsFile = path.join(dayDir, '_daily_stats.json');
        if (fs.existsSync(statsFile)) {
          const stats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
          uploadData.push(stats);
        }
      }
    } else {
      // Tüm günlerin istatistiklerini getir
      const dateFolders = fs.readdirSync(uploadsDir)
        .filter(folder => {
          return fs.statSync(path.join(uploadsDir, folder)).isDirectory() && 
                 /^\d{4}-\d{2}-\d{2}$/.test(folder);
        })
        .sort((a, b) => b.localeCompare(a)); // En yeni tarihler önce

      for (const dateFolder of dateFolders) {
        const statsFile = path.join(uploadsDir, dateFolder, '_daily_stats.json');
        if (fs.existsSync(statsFile)) {
          const stats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
          uploadData.push(stats);
        }
      }
    }

    // Limit uygula
    if (limit && !isNaN(limit)) {
      uploadData = uploadData.slice(0, parseInt(limit));
    }

    res.json({
      success: true,
      data: uploadData,
      count: uploadData.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('PDF listesi hatası:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'PDF listesi alınamadı',
        type: 'pdf_list_error'
      }
    });
  }
});

// İmza fotoğrafı arka plan temizleme endpoint'i
app.post('/api/miniClean-signature-photo', async (req, res) => {
  const startTime = Date.now();
  const clientIP = req.ip || req.connection.remoteAddress;

  try {
    const { imageData, options } = req.body;

    // Gerekli parametreleri kontrol et
    if (!imageData) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'imageData parametresi gerekli',
          type: 'missing_parameter'
        }
      });
    }

    console.log(`🧹 İmza fotoğrafı temizleme başlatıldı - IP: ${clientIP}`);

    // Görüntü boyutu kontrolü (Base64'den tahmin)
    const estimatedSizeMB = (imageData.length * 0.75) / (1024 * 1024); // Base64 overhead
    const maxSizeMB = 25; // 25MB limit

    if (estimatedSizeMB > maxSizeMB) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Görüntü çok büyük. Maksimum ${maxSizeMB}MB olabilir. (Gönderilen: ${estimatedSizeMB.toFixed(2)}MB)`,
          type: 'file_too_large'
        }
      });
    }

    // BackgroundCleaner ile temizleme işlemini yap
    const result = await backgroundCleaner.cleanSignaturePhoto(imageData, options);

    const processingTime = Date.now() - startTime;

    console.log(`✅ İmza temizleme tamamlandı (${processingTime}ms) - Kalite: ${result.processing.qualityScore.toFixed(2)} - Metod: ${result.processing.cleaningMethod}`);

    // Temizlenmiş imzayı dosyaya kaydet (opsiyonel)
    if (options?.saveToFile && result.cleaned.png_base64) {
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
        const filename = `cleaned_signature_${timestamp}.png`;
        const filepath = path.join(getSignaturesDir(), filename);

        const buffer = Buffer.from(result.cleaned.png_base64, 'base64');
        fs.writeFileSync(filepath, buffer);

        console.log(`💾 Temizlenmiş imza kaydedildi: ${filename}`);
        result.savedFile = filename;
      } catch (saveError) {
        console.warn('Dosya kaydetme hatası:', saveError.message);
      }
    }

    res.json({
      success: true,
      ...result,
      clientInfo: {
        ip: clientIP,
        processingTime: processingTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ İmza temizleme hatası (${processingTime}ms):`, error.message);

    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'İmza temizleme sırasında bir hata oluştu',
        type: 'background_cleaning_error',
      },
      processingTime: processingTime
    });
  }
});

// İmza fotoğrafı preview oluşturma endpoint'i
app.post('/api/miniSignature-photo-preview', async (req, res) => {
  const startTime = Date.now();

  try {
    const { imageData, maxSize } = req.body;

    if (!imageData) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'imageData parametresi gerekli',
          type: 'missing_parameter'
        }
      });
    }

    const previewBase64 = await backgroundCleaner.generatePreview(imageData, maxSize || 400);
    const processingTime = Date.now() - startTime;

    res.json({
      success: true,
      preview_base64: previewBase64,
      processingTime: processingTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`Preview oluşturma hatası (${processingTime}ms):`, error.message);

    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Preview oluşturma sırasında bir hata oluştu',
        type: 'preview_generation_error',
      },
      processingTime: processingTime
    });
  }
});

// Background cleaner servis durumu endpoint'i
app.get('/api/miniBackground-cleaner-status', (req, res) => {
  try {
    const status = backgroundCleaner.getStatus();

    res.json({
      success: true,
      ...status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Belirli bir PDF metadata dosyasını getir
app.get('/api/miniPDF-get/:date/:filename', (req, res) => {
  try {
    const { date, filename } = req.params;
    const pdfFile = path.join(getPdfUploadsDir(), date, filename);
    
    if (!fs.existsSync(pdfFile)) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'PDF dosyası bulunamadı',
          type: 'pdf_not_found'
        }
      });
    }

    // JSON metadata dosyasını oku
    if (filename.endsWith('.json')) {
      const metadataData = JSON.parse(fs.readFileSync(pdfFile, 'utf8'));
      
      res.json({
        success: true,
        data: metadataData,
        timestamp: new Date().toISOString()
      });
    } else {
      // PDF dosyasını doğrudan serve et
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.sendFile(pdfFile);
    }

  } catch (error) {
    console.error('PDF getirme hatası:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'PDF dosyası okunamadı',
        type: 'pdf_read_error'
      }
    });
  }
});

// Sunucuyu başlat
// Tüm network interface'lerde dinle (0.0.0.0)
app.listen(port, '0.0.0.0', () => {
  console.log(`API servisi ${port} portunda çalışıyor`);
  console.log(`Local IP: http://192.168.1.9:${port}`);
  console.log(`Localhost: http://localhost:${port}`);
});
