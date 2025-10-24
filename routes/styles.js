const express = require('express');
const path = require('path');
const fs = require('fs');
const { getAllStyles, getStyleById, getStylesByCategory } = require('../config/signatureStyles');

const router = express.Router();

// Get all signature styles
router.get('/', (req, res) => {
  try {
    const styles = getAllStyles();
    
    // Add server URL prefix to image URLs
    const stylesWithFullUrls = styles.map(style => ({
      ...style,
      imageUrl: req.protocol + '://' + req.get('host') + style.imageUrl,
      // Remove fontConfig from client response for security
      fontConfig: undefined
    }));
    
    res.json({
      success: true,
      data: stylesWithFullUrls,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching styles:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Stil listesi alınamadı',
        type: 'fetch_styles_error'
      }
    });
  }
});

// Generate dynamic styles from available fonts (must be before /:id route)
router.get('/generate-from-fonts', (req, res) => {
  try {
    const stylesList = [];
    const fontsDir = path.join(__dirname, '../fonts');
    
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
    
    // Add server URL prefix to image URLs and remove fontConfig for security
    const stylesWithFullUrls = stylesList.map(style => ({
      ...style,
      imageUrl: req.protocol + '://' + req.get('host') + style.imageUrl,
      fontConfig: undefined // Remove from client response
    }));
    
    res.json({
      success: true,
      data: stylesWithFullUrls,
      count: stylesWithFullUrls.length,
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

// Get style by ID
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const style = getStyleById(id);
    
    if (!style) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Stil bulunamadı',
          type: 'style_not_found'
        }
      });
    }
    
    // Add server URL prefix to image URL
    const styleWithFullUrl = {
      ...style,
      imageUrl: req.protocol + '://' + req.get('host') + style.imageUrl,
      // Remove fontConfig from client response for security
      fontConfig: undefined
    };
    
    res.json({
      success: true,
      data: styleWithFullUrl,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching style:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Stil bilgisi alınamadı',
        type: 'fetch_style_error'
      }
    });
  }
});

// Get styles by category (free/pro)
router.get('/category/:type', (req, res) => {
  try {
    const { type } = req.params;
    const isPro = type === 'pro';
    const styles = getStylesByCategory(isPro);
    
    // Add server URL prefix to image URLs
    const stylesWithFullUrls = styles.map(style => ({
      ...style,
      imageUrl: req.protocol + '://' + req.get('host') + style.imageUrl,
      // Remove fontConfig from client response for security
      fontConfig: undefined
    }));
    
    res.json({
      success: true,
      data: stylesWithFullUrls,
      category: type,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching styles by category:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Kategori stilleri alınamadı',
        type: 'fetch_category_styles_error'
      }
    });
  }
});

// Helper functions
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

function determinePremiumStatus(fontName) {
  const name = fontName.toLowerCase();
  
  // Temel fontlar ücretsiz
  if (name.includes('fallen city') || name.includes('marlies') || 
      name.includes('gillfloys') || name === 'elegant' || 
      name === 'classic' || name === 'bold') {
    return false;
  }
  
  // Diğer tüm fontlar premium
  return true;
}

function getDefaultColorForCategory(category) {
  const colorMap = {
    'signature': '#1a237e',
    'elegant': '#000000', 
    'bold': '#000000',
    'modern': '#1a237e',
    'classic': '#000000',
    'artistic': '#4a148c',
    'professional': '#000000',
    'minimalist': '#212121',
    'general': '#000000'
  };
  return colorMap[category] || '#000000';
}

function getDefaultSizeForCategory(category) {
  const sizeMap = {
    'signature': 390,
    'elegant': 360,
    'bold': 420,
    'modern': 330,
    'classic': 300,
    'artistic': 420,
    'professional': 330,
    'minimalist': 270,
    'general': 360
  };
  return sizeMap[category] || 360;
}

module.exports = router;