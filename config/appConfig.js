const appConfig = {
  general: {
    appName: "Signature Maker",
    appVersion: "1.0.0",
    language: "auto",              // "auto" | "tr" | "en"
    theme: "system",              // "light" | "dark" | "system"
    debugMode: false,
  },

  limits: {
    maxSignatureTextLength: 20,   // text input limit
    maxFreeSignatures: 1,         // imza kaydı - sadece 1 deneme
    maxFreePDFsPerDay: 2,         // günlük PDF imzalama
    maxGalleryItemsFree: 10,      // galeri görünürlüğü
  },

  premium: {
    enabled: true,
    watermarkVisible: true,       // ücretsizte watermark aktif
    features: {
      unlimitedSignatures: true,
      removeWatermark: true,
      multiPDFSupport: false,     // V2'de açılacak
      accessAllFonts: true,
    },
  },

  rateModal: {
    enabled: true,                // rate modalini aktif/pasif et
    showAfterOpenCount: 5,        // 5. uygulama açılışında göster
    remindAfterDays: 7,           // sonra tekrar sor
    storeURL: {
      ios: "https://apps.apple.com/app/idXXXXXXXXX",
      android: "https://play.google.com/store/apps/details?id=com.example.signaturemaker"
    },
  },

  backgroundCleaner: {
    enabled: true,                // arka plan temizleme özelliği aktif
    maxImageSizeMB: 25,          // maksimum görüntü boyutu
    supportedFormats: ["jpeg", "jpg", "png", "webp", "heic", "tiff", "bmp"],
    defaultCleaningMode: "auto", // varsayılan temizleme modu
    defaultEnhancementLevel: 3,  // varsayılan iyileştirme seviyesi
    maxProcessingTime: 30000,    // maksimum işlem süresi (ms)
    qualityThreshold: 0.7,       // minimum kalite eşiği
    saveCleanedImages: true,     // temizlenmiş imzaları kaydet
    premium: {
      advancedAlgorithms: true,  // gelişmiş temizleme algoritmaları
      batchProcessing: false,    // toplu işlem (v2'de)
      customPresets: true,       // özel temizleme presetleri
      highQualityOutput: true,   // yüksek kalite çıktı
    },
  },
};

module.exports = appConfig;