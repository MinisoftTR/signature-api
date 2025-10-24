const express = require('express');
const path = require('path');
const SignatureService = require('../lib/signature-service');
const { getFontConfigForStyle, getAllStyles } = require('../config/signatureStyles');
const router = express.Router();

// SignatureService instance
const signatureService = new SignatureService();

// Helper: Font whitelist kontrolü
function isValidFontId(fontId) {
  const styles = getAllStyles();
  return styles.some(style => style.id === fontId || style.fontStyle === fontId);
}

// Helper: Font path al
function getFontPath(fontId) {
  const fontConfig = getFontConfigForStyle(fontId);
  return fontConfig?.path;
}

// Helper: Render options parse et
function parseRenderOptions(query) {
  return {
    size: parseInt(query.size) || 128,
    color: query.color || '#000000',
    stroke: parseInt(query.stroke) || 0,
    strokeColor: query.strokeColor || '#000000',
    padding: parseInt(query.padding) || 12,
    baselineRatio: parseFloat(query.baselineRatio) || 0.62,
    backgroundColor: query.bg === 'transparent' ? 'transparent' : (query.bg || 'transparent'),
    kerning: query.kerning !== '0',
    ligatures: query.ligatures !== '0',
    width: query.w ? parseInt(query.w) : undefined,
    height: query.h ? parseInt(query.h) : undefined
  };
}

// Helper: Client IP al
function getClientIP(req) {
  return req.ip || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         'unknown';
}

/**
 * GET /api/render/signature.svg
 * SVG imza oluştur
 */
router.get('/signature.svg', async (req, res) => {
  const startTime = Date.now();
  const clientIP = getClientIP(req);
  
  try {
    const { text, fontId } = req.query;
    
    // Rate limiting
    if (!signatureService.checkRateLimit(clientIP)) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Maximum ${signatureService.maxRequestsPerMinute} requests per minute`
      });
    }

    // Input validation
    const validationErrors = signatureService.validateInput(text, fontId, req.query);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors
      });
    }

    // Font whitelist kontrolü
    if (!isValidFontId(fontId)) {
      return res.status(400).json({
        error: 'Invalid font ID',
        message: 'Font ID not found in whitelist'
      });
    }

    // Font path al
    const fontPath = getFontPath(fontId);
    if (!fontPath) {
      return res.status(400).json({
        error: 'Font configuration not found',
        fontId
      });
    }

    // Render options parse et
    const options = parseRenderOptions(req.query);

    // SVG imza oluştur
    const result = await signatureService.generateSVGSignature(text, fontPath, options);

    const processingTime = Date.now() - startTime;

    // Response headers
    res.set({
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Processing-Time': `${processingTime}ms`,
      'X-Font-Id': fontId,
      'X-Text-Length': text.length
    });

    res.send(result.svg);

  } catch (error) {
    console.error('SVG render error:', error.message);
    
    res.status(422).json({
      error: 'Render failed',
      message: error.message,
      processingTime: Date.now() - startTime
    });
  }
});

/**
 * GET /api/render/signature.png
 * PNG imza oluştur
 */
router.get('/signature.png', async (req, res) => {
  const startTime = Date.now();
  const clientIP = getClientIP(req);
  
  try {
    const { text, fontId } = req.query;
    
    // Rate limiting
    if (!signatureService.checkRateLimit(clientIP)) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Maximum ${signatureService.maxRequestsPerMinute} requests per minute`
      });
    }

    // Input validation
    const validationErrors = signatureService.validateInput(text, fontId, req.query);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors
      });
    }

    // Font whitelist kontrolü
    if (!isValidFontId(fontId)) {
      return res.status(400).json({
        error: 'Invalid font ID',
        message: 'Font ID not found in whitelist'
      });
    }

    // Font path al
    const fontPath = getFontPath(fontId);
    if (!fontPath) {
      return res.status(400).json({
        error: 'Font configuration not found',
        fontId
      });
    }

    // Render options parse et
    const options = parseRenderOptions(req.query);

    // PNG imza oluştur
    const result = await signatureService.generatePNGSignature(text, fontPath, options);

    const processingTime = Date.now() - startTime;

    // Response headers
    res.set({
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Processing-Time': `${processingTime}ms`,
      'X-Font-Id': fontId,
      'X-Text-Length': text.length,
      'X-Image-Width': result.width.toString(),
      'X-Image-Height': result.height.toString()
    });

    res.send(result.buffer);

  } catch (error) {
    console.error('PNG render error:', error.message);
    
    res.status(422).json({
      error: 'Render failed',
      message: error.message,
      processingTime: Date.now() - startTime
    });
  }
});

/**
 * GET /api/render/signature.webp
 * WebP imza oluştur
 */
router.get('/signature.webp', async (req, res) => {
  const startTime = Date.now();
  const clientIP = getClientIP(req);
  
  try {
    const { text, fontId } = req.query;
    
    // Rate limiting
    if (!signatureService.checkRateLimit(clientIP)) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Maximum ${signatureService.maxRequestsPerMinute} requests per minute`
      });
    }

    // Input validation
    const validationErrors = signatureService.validateInput(text, fontId, req.query);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors
      });
    }

    // Font whitelist kontrolü
    if (!isValidFontId(fontId)) {
      return res.status(400).json({
        error: 'Invalid font ID',
        message: 'Font ID not found in whitelist'
      });
    }

    // Font path al
    const fontPath = getFontPath(fontId);
    if (!fontPath) {
      return res.status(400).json({
        error: 'Font configuration not found',
        fontId
      });
    }

    // Render options parse et
    const options = parseRenderOptions(req.query);

    // WebP imza oluştur
    const result = await signatureService.generateWebPSignature(text, fontPath, options);

    const processingTime = Date.now() - startTime;

    // Response headers
    res.set({
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Processing-Time': `${processingTime}ms`,
      'X-Font-Id': fontId,
      'X-Text-Length': text.length,
      'X-Image-Width': result.width.toString(),
      'X-Image-Height': result.height.toString()
    });

    res.send(result.buffer);

  } catch (error) {
    console.error('WebP render error:', error.message);
    
    res.status(422).json({
      error: 'Render failed',
      message: error.message,
      processingTime: Date.now() - startTime
    });
  }
});

/**
 * POST /api/render/bulk
 * Toplu imza oluşturma
 */
router.post('/bulk', async (req, res) => {
  const startTime = Date.now();
  const clientIP = getClientIP(req);
  
  try {
    const { requests } = req.body;
    
    if (!Array.isArray(requests) || requests.length === 0) {
      return res.status(400).json({
        error: 'Invalid request format',
        message: 'requests array is required'
      });
    }

    if (requests.length > 10) {
      return res.status(400).json({
        error: 'Too many requests',
        message: 'Maximum 10 requests per bulk operation'
      });
    }

    // Rate limiting (bulk için daha sıkı)
    if (!signatureService.checkRateLimit(clientIP)) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Maximum ${signatureService.maxRequestsPerMinute} requests per minute`
      });
    }

    // Her request için font path ekle
    const processedRequests = requests.map(req => {
      const fontPath = getFontPath(req.fontId);
      if (!fontPath) {
        throw new Error(`Font not found: ${req.fontId}`);
      }
      
      return {
        ...req,
        fontPath,
        options: parseRenderOptions(req.options || {})
      };
    });

    // Bulk generate
    const results = await signatureService.generateBulkSignatures(processedRequests);
    
    const processingTime = Date.now() - startTime;

    res.json({
      success: true,
      results: results.results,
      errors: results.errors,
      processingTime,
      totalRequests: requests.length
    });

  } catch (error) {
    console.error('Bulk render error:', error.message);
    
    res.status(422).json({
      error: 'Bulk render failed',
      message: error.message,
      processingTime: Date.now() - startTime
    });
  }
});

/**
 * GET /api/render/status
 * Servis durumu
 */
router.get('/status', (req, res) => {
  try {
    const status = signatureService.getStatus();
    
    res.json({
      ...status,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Status check failed',
      message: error.message
    });
  }
});

/**
 * POST /api/render/clear-cache
 * Cache temizle
 */
router.post('/clear-cache', (req, res) => {
  try {
    signatureService.clearCaches();
    
    res.json({
      success: true,
      message: 'All caches cleared',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Cache clear failed',
      message: error.message
    });
  }
});

/**
 * GET /api/render/font-features/:fontId
 * Font özelliklerini analiz et
 */
router.get('/font-features/:fontId', async (req, res) => {
  try {
    const { fontId } = req.params;
    
    if (!isValidFontId(fontId)) {
      return res.status(400).json({
        error: 'Invalid font ID',
        fontId
      });
    }

    const fontPath = getFontPath(fontId);
    if (!fontPath) {
      return res.status(400).json({
        error: 'Font configuration not found',
        fontId
      });
    }

    const features = await signatureService.analyzeFontFeatures(fontPath);
    
    res.json({
      fontId,
      ...features,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Font analysis error:', error.message);
    
    res.status(422).json({
      error: 'Font analysis failed',
      message: error.message
    });
  }
});

// Rate limit cleanup (her 5 dakikada bir)
setInterval(() => {
  signatureService.cleanupRateLimit();
}, 5 * 60 * 1000);

module.exports = router;