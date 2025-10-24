# 🚀 İmza Sistemi v2.0 Yükseltme Kılavuzu

## 📋 Genel Bakış

İmza sistemi v2.0, SVG-first modern bir mimariye yükseltildi. Bu sürüm aşağıdaki önemli geliştirmeleri içerir:

### ✨ Yeni Özellikler

- **SVG Birincil Render**: Vektör tabanlı kayıpsız imza üretimi
- **Native Unicode Desteği**: Türkçe karakterler artık doğal olarak destekleniyor
- **Gelişmiş Typography**: Ligatür ve kerning desteği
- **Performanslı API**: Yeni RESTful endpoint'ler
- **Rate Limiting**: İstemci başına dakikada 100 istek sınırı
- **Font Metadata**: Tüm fontlar için detaylı metric bilgileri

### 🔧 Teknik İyileştirmeler

- OpenType.js ile SVG path üretimi
- FontKit ile gelişmiş font shaping
- resvg-js ile SVG→PNG dönüşümü
- Modüler mimari (lib/ klasör yapısı)
- Geriye uyumlu API

## 📦 Yeni Bağımlılıklar

```json
{
  "@resvg/resvg-js": "^2.6.0",
  "fontkit": "^2.0.2", 
  "opentype.js": "^1.3.4"
}
```

## 🌐 API Değişiklikleri

### Yeni Endpoint'ler

```bash
# SVG imza oluştur
GET /api/render/signature.svg?text=Orkun&fontId=bresley&size=128&color=%23000000

# PNG imza oluştur  
GET /api/render/signature.png?text=Orkun&fontId=bresley&w=512&h=256

# WebP imza oluştur
GET /api/render/signature.webp?text=Orkun&fontId=bresley&w=512

# Servis durumu
GET /api/render/status

# Font özellikleri analizi
GET /api/render/font-features/bresley
```

### Parametre Açıklamaları

| Parametre | Tip | Varsayılan | Açıklama |
|-----------|-----|------------|----------|
| `text` | string | - | İmza metni (maks. 100 karakter) |
| `fontId` | string | - | Font ID (whitelist kontrolü) |
| `size` | number | 128 | Font boyutu (10-1000 px) |
| `color` | string | #000000 | Hex renk kodu |
| `stroke` | number | 0 | Çerçeve kalınlığı |
| `padding` | number | 12 | Kenar boşluğu |
| `kerning` | boolean | true | Kerning etkin mi? |
| `ligatures` | boolean | true | Ligatürler etkin mi? |
| `w` | number | auto | PNG/WebP genişliği |
| `h` | number | auto | PNG/WebP yüksekliği |

### Mevcut API Değişiklikleri

**POST /api/miniGenerate-signature** (Geriye Uyumlu)

```json
{
  "success": true,
  "data": [{"b64_json": "..."}],
  "fontStyle": "bresley",
  "processing_time_ms": 156,
  "svgUrl": "/api/render/signature.svg?text=Orkun&fontId=bresley",
  "newApiAvailable": true
}
```

## 🎯 Kullanım Örnekleri

### JavaScript/React Native

```javascript
// SVG imza al
const svgUrl = `${API_BASE}/api/render/signature.svg?text=${encodeURIComponent(name)}&fontId=${fontId}`;

// PNG imza al (512x256)
const pngUrl = `${API_BASE}/api/render/signature.png?text=${encodeURIComponent(name)}&fontId=${fontId}&w=512&h=256`;

// WebP optimize
const webpUrl = `${API_BASE}/api/render/signature.webp?text=${encodeURIComponent(name)}&fontId=${fontId}&w=400`;
```

### cURL Örnekleri

```bash
# Türkçe karakterli SVG
curl "http://localhost:3001/api/render/signature.svg?text=Çağlar&fontId=bresley&size=150"

# High-DPI PNG 
curl "http://localhost:3001/api/render/signature.png?text=Orkun&fontId=castenivey&w=1024&h=512" \
  -o signature.png

# Ligatür ve kerning kapalı
curl "http://localhost:3001/api/render/signature.svg?text=office&fontId=bresley&ligatures=0&kerning=0"
```

## 🔄 Migrasyon Rehberi

### 1. Mevcut Uygulama (Değişiklik Gerektirmez)

POST /api/miniGenerate-signature çalışmaya devam eder. Response'da `svgUrl` field'ı eklendi.

### 2. Yeni SVG API Kullanımı

```javascript
// Eski
const response = await fetch('/api/miniGenerate-signature', {
  method: 'POST',
  body: JSON.stringify({ name: 'Orkun', fontStyle: 'bresley' })
});

// Yeni (Önerilen)
const svgUrl = `/api/render/signature.svg?text=Orkun&fontId=bresley&size=128`;
```

### 3. React Native SVG Entegrasyonu

```jsx
import { SvgUri } from 'react-native-svg';

<SvgUri 
  uri={`${API_BASE}/api/render/signature.svg?text=${name}&fontId=${fontId}`}
  width={256} 
  height={160}
/>
```

### 4. Performance Optimizasyonu

```javascript
// Düşük cihazlar için PNG
const format = isLowEndDevice ? 'png' : 'svg';
const signatureUrl = `/api/render/signature.${format}?text=${name}&fontId=${fontId}`;
```

## 📊 Performance Karakteristikleri

| Özellik | v1.0 (Canvas) | v2.0 (SVG) |
|---------|---------------|------------|
| Türkçe Karakter | Dönüştürme | Native |
| Çıktı Kalitesi | Raster | Vektör |
| Dosya Boyutu | ~15KB PNG | ~2KB SVG |
| Render Süresi | ~200ms | ~150ms |
| Ligatür/Kerning | ❌ | ✅ |
| Ölçeklenebilirlik | ❌ | ✅ |

## 🐛 Hata Kodları

| Kod | Açıklama |
|-----|----------|
| 400 | Geçersiz parametre |
| 422 | Render hatası |
| 429 | Rate limit aşıldı |

## 🔧 Geliştirici Araçları

### Debug Modu

```bash
NODE_ENV=development npm run dev
```

### Font Analizi

```bash
curl http://localhost:3001/api/render/font-features/bresley
```

### Cache Temizleme

```bash
curl -X POST http://localhost:3001/api/render/clear-cache
```

## 📝 Notlar

- **Performans**: SVG render ~150ms, PNG dönüşümü +50ms
- **Güvenlik**: Font ID whitelist, text sanitization
- **Rate Limiting**: IP başına 100 req/min
- **Max Text**: 100 karakter limit
- **Desteklenen Formatlar**: SVG, PNG, WebP

## 🎉 Sonuç

v2.0 modern, performanslı ve uluslararası karakter destekli bir imza sistemi sunar. Mevcut entegrasyonlar etkilenmez, yeni özellikler isteğe bağlı kullanılabilir.

SVG-first yaklaşımla her cihazda kusursuz görünüm ve native Türkçe karakter desteği artık mevcut!