# AI Signature Builder API

Bu API, AI Signature Builder uygulaması için uzak sunucu tabanlı imza stilleri ve imza oluşturma hizmetleri sağlar.

## Özellikler

- 🎨 **Uzak Stil Yönetimi**: İmza stilleri sunucudan dinamik olarak yüklenir
- 🖼️ **Asset Serving**: Stil görselleri API üzerinden sunulur
- ⚡ **Font Tabanlı İmza**: Hızlı font tabanlı imza oluşturma
- 🤖 **OpenAI Entegrasyonu**: AI tabanlı imza oluşturma (opsiyonel)
- 🎯 **Hibrit Mod**: Font ve AI tabanlı imza arasında geçiş
- 📱 **React Native Desteği**: Cross-platform mobil uygulama desteği

## Kurulum

```bash
cd api
npm install
```

### Gerekli Bağımlılıklar

- Node.js >= 16
- Express.js
- Canvas (Font rendering için)
- Sharp (Görüntü optimizasyonu için)

## Kullanım

### Sunucuyu Başlatma

```bash
node server.js
```

Server varsayılan olarak port 3000'de çalışır.

### Environment Variables

```bash
# Uygulama modu
APP_MODE=font_only  # font_only | openai_only | hybrid

# OpenAI API (opsiyonel)
OPENAI_API_KEY=your_api_key_here
OPENAI_ORGANIZATION=your_org_id_here

# Port
PORT=3000
```

## API Endpoints

### Sağlık Kontrolü
```
GET /api/minihealth
```

### Uygulama Konfigürasyonu
```
GET /api/miniconfig
```
Uygulama ayarlarını, limitleri, premium özellikleri ve diğer konfigürasyon verilerini döndürür.

### İmza Stilleri

#### Tüm Stilleri Getir
```
GET /api/ministyles
```

#### Stil ID'sine Göre Getir
```
GET /api/ministyles/:id
```

#### Kategoriye Göre Stilleri Getir
```
GET /api/ministyles/category/:type
# type: "free" veya "pro"
```

### İmza Oluşturma

#### Ana İmza Oluşturma Endpoint'i
```
POST /api/minigenerate-signature

Body:
{
  "name": "Kullanıcı Adı",
  "fontStyle": "elegant",
  "styleId": "elegant",
  "fontOnlyMode": true,
  "useOpenAI": false
}
```

#### Font Tabanlı İmza (Legacy)
```
POST /api/minigenerate-font-signature

Body:
{
  "name": "Kullanıcı Adı",
  "fontStyle": "elegant"
}
```

### Asset Serving
```
GET /api/miniassets/styles/:filename
# Örnek: /api/assets/styles/elegant.png
```

## İmza Stilleri

Mevcut stil kategorileri:

### Ücretsiz Stiller
- Elegant
- Abstract
- Bold
- Classic

### Premium Stiller
- Artistic
- Calligraphic
- Modern
- Minimalist
- Professional

### Özel Stiller
- Customize (Kullanıcı özelleştirmesi)

## Font Desteği

Desteklenen font tipleri:
- Fallen City (Elegant, Artistic)
- Marlies (Classic, Calligraphic, Professional)
- Gillfloys (Modern, Bold)
- GillfloyAlt (Minimalist, Abstract)

## Cache ve Performans

- Stil verileri server tarafında cache'lenir
- Asset'ler static middleware ile optimize edilir
- Font'lar server başlangıcında yüklenir
- Canvas rendering optimize edilmiştir

## Hata Yönetimi

API kapsamlı hata yönetimi sağlar:
- Network hata handling
- Font yükleme hataları
- OpenAI API hataları
- Fallback mekanizmaları

## Güvenlik

- CORS desteği
- Input validation
- Font config güvenliği (client'a gönderilmez)
- Rate limiting önerilir (production'da)

## Production Deployment

1. Environment variables'ları ayarlayın
2. Process manager kullanın (PM2 önerilir)
3. Reverse proxy (Nginx) ekleyin
4. SSL sertifikası yapılandırın
5. Log monitoring ekleyin

```bash
# PM2 ile deployment
pm2 start server.js --name "signature-api"
pm2 save
pm2 startup
```

## Geliştirme

### Test

```bash
# Health check
curl http://localhost:3000/apihealth

# App konfigürasyonunu test et
curl http://localhost:3000/apiconfig

# Stilleri test et
curl http://localhost:3000/apistyles

# İmza oluşturmayı test et
curl -X POST http://localhost:3000/apigenerate-signature \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "fontStyle": "elegant", "fontOnlyMode": true}'
```

### Yeni Stil Ekleme

1. `config/signatureStyles.js`'e yeni stil ekleyin
2. Stil görselini `assets/styles/` klasörüne ekleyin
3. Font'u `fonts/` klasörüne ekleyin (eğer yeni font ise)

## Lisans

Bu proje özel lisans altındadır.