# Signature Maker API Documentation

Bu belge Signature Maker API'sinin detaylı kullanım kılavuzudur.

## Base URL
```
http://localhost:3001/api
```

## Genel Bilgiler

### Response Format
Tüm API yanıtları aşağıdaki formatı takip eder:

**Başarılı Yanıt:**
```json
{
  "success": true,
  "data": {...},
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Hata Yanıtı:**
```json
{
  "success": false,
  "error": {
    "message": "Hata açıklaması",
    "type": "error_type"
  }
}
```

---

## Endpoints

### 1. Health Check
Sunucu durumunu kontrol eder.

**Endpoint:** `GET /miniHealth`

**Örnek İstek:**
```bash
curl http://localhost:3001/api/minihealth
```

**Yanıt:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### 2. Tüm İmza Stillerini Getir
Mevcut tüm imza stillerini listeler.

**Endpoint:** `GET /miniStyles`

**Örnek İstek:**
```bash
curl http://localhost:3001/api/ministyles
```

**Yanıt:**
```json
{
  "success": true,
  "data": [
    {
      "id": "customize",
      "name": "Stilinizi özelleştirin",
      "imageUrl": "http://localhost:3001/api/miniAssets/styles/customize.png",
      "isPro": false,
      "isCustomize": true,
      "fontStyle": "elegant"
    },
    {
      "id": "elegant",
      "name": "Elegant",
      "imageUrl": "http://localhost:3001/api/miniAssets/styles/elegant.png",
      "isPro": false,
      "fontStyle": "elegant"
    },
    {
      "id": "artistic",
      "name": "Artistic",
      "imageUrl": "http://localhost:3001/api/miniAssets/styles/artistic.png",
      "isPro": true,
      "fontStyle": "artistic"
    }
  ],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### 3. ID'ye Göre Stil Getir
Belirli bir stilin detaylarını getirir.

**Endpoint:** `GET /miniStyles/:id`

**Parametreler:**
- `id` (string): Stil ID'si (elegant, bold, artistic, vb.)

**Örnek İstek:**
```bash
curl http://localhost:3001/api/ministyles/elegant
```

**Yanıt:**
```json
{
  "success": true,
  "data": {
    "id": "elegant",
    "name": "Elegant",
    "imageUrl": "http://localhost:3001/api/miniAssets/styles/elegant.png",
    "isPro": false,
    "fontStyle": "elegant"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Hata Yanıtı (Stil bulunamadı):**
```json
{
  "success": false,
  "error": {
    "message": "Stil bulunamadı",
    "type": "style_not_found"
  }
}
```

---

### 4. Kategoriye Göre Stilleri Getir
Ücretsiz veya premium stilleri getirir.

**Endpoint:** `GET /miniStyles/category/:type`

**Parametreler:**
- `type` (string): "free" veya "pro"

**Örnek İstek:**
```bash
curl http://localhost:3001/api/ministyles/category/free
```

**Yanıt:**
```json
{
  "success": true,
  "data": [
    {
      "id": "elegant",
      "name": "Elegant",
      "imageUrl": "http://localhost:3001/api/miniAssets/styles/elegant.png",
      "isPro": false,
      "fontStyle": "elegant"
    },
    {
      "id": "bold",
      "name": "Bold",
      "imageUrl": "http://localhost:3001/api/miniAssets/styles/bold.png",
      "isPro": false,
      "fontStyle": "bold"
    }
  ],
  "category": "free",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### 5. İmza Oluştur (Ana Endpoint)
Verilen isim ve stil ile hem PNG hem de SVG formatında imza oluşturur ve dosyalara kaydeder.

**Endpoint:** `POST /miniGenerate-signature`

**İstek Body:**
```json
{
  "name": "John Doe",
  "fontStyle": "elegant"
}
```

**Parametreler:**
- `name` (string, gerekli): İmza için kullanılacak isim
- `fontStyle` (string, opsiyonel): Stil ID'si (varsayılan: "elegant")

**Örnek İstek:**
```bash
curl -X POST http://localhost:3001/api/miniGenerate-signature \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "fontStyle": "elegant"
  }'
```

**Yanıt:**
```json
{
  "success": true,
  "data": [
    {
      "b64_json": "iVBORw0KGgoAAAANSUhEUgAAA..."
    }
  ],
  "fontStyle": "elegant",
  "mode": "font",
  "processing_time_ms": 245,
  "svgUrl": "/generated-signatures/john_doe_2025-08-21_11-45-42_elegant.svg",
  "svgFile": "john_doe_2025-08-21_11-45-42_elegant.svg",
  "pngFile": "john_doe_2025-08-21_11-45-42_elegant.png",
  "newApiAvailable": true
}
```

**Yeni Response Alanları:**
- `processing_time_ms`: İşlem süresi (milisaniye)
- `svgUrl`: SVG dosyasının direkt erişim URL'si
- `svgFile`: Kaydedilen SVG dosya adı (null olabilir)
- `pngFile`: Kaydedilen PNG dosya adı (null olabilir)
- `newApiAvailable`: Yeni API özelliklerinin kullanılabilir olduğunu belirtir

**Dosya Kaydetme:**
- PNG dosyası: `generated-signatures/isim_tarih_fontstil.png`
- SVG dosyası: `generated-signatures/isim_tarih_fontstil.svg`
- SVG dosyalarına direkt erişim: `http://localhost:3001/generated-signatures/dosya_adi.svg`

**Hata Yanıtı (İsim eksik):**
```json
{
  "error": "İsim parametresi gerekli ve metin olmalıdır"
}
```

---

### 6. Font Tabanlı İmza Oluştur (Legacy)
Geriye uyumluluk için korunan endpoint. Ana endpoint ile aynı özelliklere sahip.

**Endpoint:** `POST /miniGenerate-font-signature`

**İstek Body:**
```json
{
  "name": "John Doe",
  "fontStyle": "classic"
}
```

**Örnek İstek:**
```bash
curl -X POST http://localhost:3001/api/miniGenerate-font-signature \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "fontStyle": "classic"
  }'
```

**Yanıt:**
```json
{
  "success": true,
  "data": [
    {
      "b64_json": "iVBORw0KGgoAAAANSUhEUgAAA..."
    }
  ],
  "fontStyle": "classic",
  "mode": "font",
  "processing_time_ms": 182,
  "svgUrl": "/generated-signatures/john_doe_2025-08-21_11-45-42_classic.svg",
  "svgFile": "john_doe_2025-08-21_11-45-42_classic.svg",
  "pngFile": "john_doe_2025-08-21_11-45-42_classic.png"
}
```

**Not:** Bu endpoint de PNG ve SVG dosyalarını kaydeder ve aynı response alanlarını döndürür.

---

### 7. Font Listesi
Mevcut fontları listeler.

**Endpoint:** `GET /miniFonts/list`

**Örnek İstek:**
```bash
curl http://localhost:3001/api/minifonts/list
```

**Yanıt:**
```json
{
  "success": true,
  "data": [
    {
      "id": "fallen_city",
      "name": "Fallen City",
      "displayName": "Fallen City",
      "fileName": "Fallen City.ttf",
      "fileType": "ttf",
      "category": "elegant",
      "isPro": false,
      "available": true
    }
  ],
  "count": 1,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### 8. Dinamik Stilleri Getir
Font dosyalarından otomatik oluşturulan stilleri getirir.

**Endpoint:** `GET /miniStyles/generate-from-fonts`

**Örnek İstek:**
```bash
curl http://localhost:3001/api/ministyles/generate-from-fonts
```

**Yanıt:**
```json
{
  "success": true,
  "data": [
    {
      "id": "customize",
      "name": "Stilinizi özelleştirin",
      "imageUrl": "http://localhost:3001/api/miniAssets/styles/customize.png",
      "isPro": false,
      "isCustomize": true,
      "fontStyle": "elegant",
      "category": "custom"
    }
  ],
  "count": 1,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### 9. Asset Serving
Stil önizleme görsellerini sunar.

**Endpoint:** `GET /miniAssets/styles/:filename`

**Örnek İstek:**
```bash
curl http://localhost:3001/api/miniassets/styles/elegant.png
```

**Yanıt:** PNG görsel dosyası

---

### 10. Generated Signatures Serving
Oluşturulan imza dosyalarına direkt erişim.

**Endpoint:** `GET /generated-signatures/:filename`

**Örnek İstek:**
```bash
curl http://localhost:3001/generated-signatures/john_doe_2025-08-21_11-45-42_elegant.svg
```

**Yanıt:** SVG veya PNG imza dosyası

---

### 11. İmza Fotoğrafı Arka Plan Temizleme ⭐ YENİ
Kullanıcının çektiği/yüklediği imza fotoğrafının arka planını otomatik olarak temizler.

**Endpoint:** `POST /miniClean-signature-photo`

**İstek Body:**
```json
{
  "imageData": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQA...",
  "options": {
    "cleaningMode": "auto",
    "outputFormat": "both",
    "enhancementLevel": 3,
    "preserveThinLines": true,
    "saveToFile": true
  }
}
```

**Parametreler:**
- `imageData` (string, gerekli): Base64 encoded görüntü verisi (JPEG, PNG, WebP, HEIC desteklenir)
- `options` (object, opsiyonel): Temizleme seçenekleri
  - `cleaningMode` (string): Temizleme modu ("auto", "aggressive", "gentle", "precise")
  - `outputFormat` (string): Çıktı formatı ("png", "jpeg", "both")
  - `enhancementLevel` (number): İyileştirme seviyesi (1-5 arası)
  - `preserveThinLines` (boolean): İnce çizgileri koruma
  - `saveToFile` (boolean): Temizlenmiş imzayı dosyaya kaydet

**Örnek İstek:**
```bash
curl -X POST http://localhost:3001/api/miniClean-signature-photo \
  -H "Content-Type: application/json" \
  -d '{
    "imageData": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQA...",
    "options": {
      "cleaningMode": "auto",
      "outputFormat": "both",
      "enhancementLevel": 3
    }
  }'
```

**Yanıt:**
```json
{
  "success": true,
  "original": {
    "width": 800,
    "height": 600,
    "format": "jpeg",
    "size": 245760
  },
  "cleaned": {
    "png_base64": "iVBORw0KGgoAAAANSUhEUgAAA...",
    "jpeg_base64": "data:image/jpeg;base64,/9j/4AA...",
    "width": 750,
    "height": 580
  },
  "processing": {
    "backgroundDetected": "#f8f8f8",
    "cleaningMethod": "white_threshold",
    "qualityScore": 0.92,
    "processingTime": 1250,
    "backgroundInfo": {
      "dominantColor": { "r": 248, "g": 248, "b": 248 },
      "backgroundType": "white",
      "noiseLevel": 25.4
    }
  },
  "savedFile": "cleaned_signature_2025-09-17_14-30-45.png",
  "clientInfo": {
    "ip": "192.168.1.100",
    "processingTime": 1250,
    "timestamp": "2025-09-17T14:30:45.123Z"
  }
}
```

**Desteklenen Temizleme Modları:**
- `auto`: Otomatik algoritma seçimi (önerilen)
- `aggressive`: Agresif temizleme (daha çok arka plan kaldırır)
- `gentle`: Hassas temizleme (daha az arka plan kaldırır)
- `precise`: Çok aşamalı kesin temizleme

**Hata Yanıtı:**
```json
{
  "success": false,
  "error": {
    "message": "Görüntü çok büyük. Maksimum 25MB olabilir.",
    "type": "file_too_large"
  },
  "processingTime": 15
}
```

---

### 12. İmza Fotoğrafı Önizleme
Yüklenen görüntünün hızlı önizlemesini oluşturur.

**Endpoint:** `POST /miniSignature-photo-preview`

**İstek Body:**
```json
{
  "imageData": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQA...",
  "maxSize": 400
}
```

**Parametreler:**
- `imageData` (string, gerekli): Base64 encoded görüntü verisi
- `maxSize` (number, opsiyonel): Maksimum önizleme boyutu (varsayılan: 400px)

**Örnek İstek:**
```bash
curl -X POST http://localhost:3001/api/miniSignature-photo-preview \
  -H "Content-Type: application/json" \
  -d '{
    "imageData": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQA...",
    "maxSize": 300
  }'
```

**Yanıt:**
```json
{
  "success": true,
  "preview_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgA...",
  "processingTime": 150,
  "timestamp": "2025-09-17T14:30:45.123Z"
}
```

---

### 13. Arka Plan Temizleme Servis Durumu
Background cleaner modülünün durumunu kontrol eder.

**Endpoint:** `GET /miniBackground-cleaner-status`

**Örnek İstek:**
```bash
curl http://localhost:3001/api/miniBackground-cleaner-status
```

**Yanıt:**
```json
{
  "success": true,
  "service": "BackgroundCleaner",
  "version": "1.0.0",
  "supportedFormats": ["jpeg", "jpg", "png", "webp", "heic", "tiff", "bmp"],
  "defaultOptions": {
    "cleaningMode": "auto",
    "outputFormat": "both",
    "enhancementLevel": 3,
    "preserveThinLines": true,
    "backgroundColor": null,
    "qualityThreshold": 0.7
  },
  "timestamp": "2025-09-17T14:30:45.123Z"
}
```

---

## Mevcut Stiller

### Ücretsiz Stiller
- **elegant**: Zarif ve şık imza stili
- **abstract**: Soyut ve modern görünüm
- **bold**: Kalın ve güçlü imza
- **classic**: Klasik ve geleneksel stil

### Premium Stiller
- **artistic**: Sanatsal ve yaratıcı
- **calligraphic**: Kaligrafiik stil
- **modern**: Modern ve çağdaş
- **minimalist**: Minimal ve sade
- **professional**: Profesyonel iş imzası

---

## Hata Kodları

| HTTP Status | Error Type | Açıklama |
|-------------|------------|----------|
| 400 | `validation_error` | Geçersiz parametreler |
| 404 | `style_not_found` | İstenen stil bulunamadı |
| 500 | `font_signature_error` | İmza oluşturma hatası |
| 500 | `fetch_styles_error` | Stil listesi alma hatası |
| 500 | `general_error` | Genel sistem hatası |

---

## JavaScript Kullanım Örnekleri

### React/JavaScript ile İmza Oluşturma
```javascript
const generateSignature = async (name, style = 'elegant') => {
  try {
    const response = await fetch('http://localhost:3001/api/miniGenerate-signature', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: name,
        fontStyle: style
      })
    });

    const result = await response.json();
    
    if (result.success) {
      return {
        pngDataUrl: `data:image/png;base64,${result.data[0].b64_json}`,
        svgUrl: result.svgUrl,
        svgFile: result.svgFile,
        pngFile: result.pngFile,
        processingTime: result.processing_time_ms
      };
    } else {
      throw new Error(result.error.message);
    }
  } catch (error) {
    console.error('İmza oluşturma hatası:', error);
    throw error;
  }
};

// Kullanım
generateSignature('Ahmet Yılmaz', 'elegant')
  .then(result => {
    // PNG image tag'ine atayabilirsiniz
    document.getElementById('signature-png').src = result.pngDataUrl;
    
    // SVG için direkt URL kullanabilirsiniz
    document.getElementById('signature-svg').src = result.svgUrl;
    
    console.log(`İşlem süresi: ${result.processingTime}ms`);
    console.log(`SVG dosyası: ${result.svgFile}`);
  })
  .catch(error => {
    console.error('Hata:', error);
  });
```


### Stilleri Listeleme
```javascript
const getStyles = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/ministyles');
    const result = await response.json();
    
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.error.message);
    }
  } catch (error) {
    console.error('Stil listesi alma hatası:', error);
    throw error;
  }
};

// Kullanım
getStyles()
  .then(styles => {
    styles.forEach(style => {
      console.log(`${style.name} - ${style.isPro ? 'Premium' : 'Ücretsiz'}`);
    });
  });
```

### React Native Kullanımı
```javascript
import React, { useState, useEffect } from 'react';
import { View, Image, Text } from 'react-native';
import { SvgUri } from 'react-native-svg';

const SignatureComponent = ({ name, style }) => {
  const [signatureData, setSignatureData] = useState(null);
  const [useFormat, setUseFormat] = useState('png'); // 'png' veya 'svg'

  useEffect(() => {
    const generateSignature = async () => {
      try {
        const response = await fetch('http://192.168.1.9:3001/api/miniGenerate-signature', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: name,
            fontStyle: style
          })
        });

        const result = await response.json();

        if (result.success) {
          setSignatureData({
            pngDataUrl: `data:image/png;base64,${result.data[0].b64_json}`,
            svgUrl: `http://192.168.1.9:3001${result.svgUrl}`,
            processingTime: result.processing_time_ms
          });
        }
      } catch (error) {
        console.error('İmza oluşturma hatası:', error);
      }
    };

    if (name) {
      generateSignature();
    }
  }, [name, style]);

  if (!signatureData) return null;

  return (
    <View>
      {useFormat === 'png' ? (
        <Image
          source={{ uri: signatureData.pngDataUrl }}
          style={{ width: 300, height: 150 }}
        />
      ) : (
        <SvgUri
          uri={signatureData.svgUrl}
          width={300}
          height={150}
        />
      )}
      <Text>İşlem süresi: {signatureData.processingTime}ms</Text>
    </View>
  );
};
```

### İmza Fotoğrafı Temizleme Kullanımı
```javascript
const cleanSignaturePhoto = async (imageBase64) => {
  try {
    const response = await fetch('http://localhost:3001/api/miniClean-signature-photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageData: imageBase64,
        options: {
          cleaningMode: 'auto',
          outputFormat: 'both',
          enhancementLevel: 3,
          preserveThinLines: true,
          saveToFile: true
        }
      })
    });

    const result = await response.json();

    if (result.success) {
      return {
        cleanedPNG: `data:image/png;base64,${result.cleaned.png_base64}`,
        cleanedJPEG: result.cleaned.jpeg_base64,
        qualityScore: result.processing.qualityScore,
        backgroundType: result.processing.backgroundInfo.backgroundType,
        processingTime: result.processing.processingTime
      };
    } else {
      throw new Error(result.error.message);
    }
  } catch (error) {
    console.error('İmza temizleme hatası:', error);
    throw error;
  }
};

// Kullanım
const handleImageUpload = async (imageFile) => {
  // Dosyayı base64'e çevir
  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64Image = e.target.result;

    try {
      const result = await cleanSignaturePhoto(base64Image);

      // Temizlenmiş imzayı göster
      document.getElementById('cleaned-signature').src = result.cleanedPNG;

      console.log(`Kalite skoru: ${result.qualityScore}`);
      console.log(`Arka plan tipi: ${result.backgroundType}`);
      console.log(`İşlem süresi: ${result.processingTime}ms`);

    } catch (error) {
      console.error('Hata:', error);
    }
  };
  reader.readAsDataURL(imageFile);
};
```

---

## Rate Limiting ve Güvenlik

### Öneriler
- Production ortamında rate limiting ekleyin
- HTTPS kullanın
- API key authentication ekleyin
- Input validation'ı güçlendirin
- CORS ayarlarını production'a uygun yapın

### Örnek Rate Limiting (express-rate-limit)
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 100, // maksimum 100 istek
  message: 'Çok fazla istek gönderildi, lütfen daha sonra tekrar deneyin.'
});

app.use('/api/mini*', limiter);
```

---

## Test Scenarios

### Postman Collection Örneği
```json
{
  "info": {
    "name": "Signature Maker API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/miniHealth"
      }
    },
    {
      "name": "Generate Signature",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/miniGenerate-signature",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"name\": \"Test User\",\n  \"fontStyle\": \"elegant\"\n}"
        }
      }
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3001/api"
    }
  ]
}
```