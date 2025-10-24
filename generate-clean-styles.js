const fs = require('fs');
const path = require('path');

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

// Generate new styles configuration
function generateCleanStyles() {
  const fontsDir = path.join(__dirname, 'fonts');
  const stylesList = [];
  
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
    category: 'custom'
  });
  
  return stylesList;
}

// Generate new signatureStyles.js file
function generateStylesFile() {
  const styles = generateCleanStyles();
  
  const fileContent = `const path = require('path');

// Signature style configurations - AUTO GENERATED - CLEANED
const signatureStyles = [
${styles.map(style => {
  if (style.isCustomize) {
    return `  {
    id: '${style.id}',
    name: '${style.name}',
    imageUrl: '${style.imageUrl}',
    isPro: ${style.isPro},
    isCustomize: true,
    fontStyle: '${style.fontStyle}',
    category: '${style.category}'
  }`;
  } else {
    return `  {
    id: '${style.id}',
    name: '${style.name}',
    imageUrl: '${style.imageUrl}',
    isPro: ${style.isPro},
    fontStyle: '${style.fontStyle}',
    category: '${style.category}',
    fontConfig: {
      path: path.join(__dirname, '../fonts/${style.fontConfig.path.split('/').pop()}'),
      family: '${style.fontConfig.family}',
      color: '${style.fontConfig.color}',
      size: ${style.fontConfig.size},
      italic: ${style.fontConfig.italic},
      weight: '${style.fontConfig.weight}',
    }
  }`;
  }
}).join(',\n')}
];

// Get all signature styles
const getAllStyles = () => {
  return signatureStyles;
};

// Get style by ID
const getStyleById = (id) => {
  return signatureStyles.find(style => style.id === id);
};

// Get styles by category (free vs pro)
const getStylesByCategory = (isPro = false) => {
  return signatureStyles.filter(style => style.isPro === isPro && !style.isCustomize);
};

// Get font configuration for style - dinamik versiyon
const getFontConfigForStyle = (styleId) => {
  const fs = require('fs');
  
  // Önce statik yapılandırmayı kontrol et
  const staticStyle = getStyleById(styleId);
  if (staticStyle && staticStyle.fontConfig) {
    return staticStyle.fontConfig;
  }
  
  // Dinamik font yapılandırması oluştur
  const fontsDir = path.join(__dirname, '../fonts');
  if (!fs.existsSync(fontsDir)) {
    return null;
  }
  
  const fontFiles = fs.readdirSync(fontsDir);
  
  // StyleId'yi font dosyasına dönüştür
  const searchName = styleId.replace(/_/g, ' ');
  
  for (const file of fontFiles) {
    const ext = path.extname(file).toLowerCase();
    if (ext === '.ttf' || ext === '.otf') {
      const baseName = path.basename(file, ext);
      const cleanName = baseName.replace(/_/g, ' ').trim();
      
      if (cleanName.toLowerCase() === searchName.toLowerCase()) {
        const category = categorizeFont(cleanName);
        return {
          path: path.join(fontsDir, file),
          family: cleanName.replace(/\\s+/g, ''),
          color: getDefaultColorForCategory(category),
          size: getDefaultSizeForCategory(category),
          italic: cleanName.toLowerCase().includes('italic'),
          weight: cleanName.toLowerCase().includes('bold') ? 'bold' : 'normal',
        };
      }
    }
  }
  
  // Bulunamadığında varsayılan elegant kullan
  return getStyleById('elegant')?.fontConfig || null;
};

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

module.exports = {
  signatureStyles,
  getAllStyles,
  getStyleById,
  getStylesByCategory,
  getFontConfigForStyle
};
`;

  return fileContent;
}

// Main execution
console.log('🧹 Generating clean signature styles configuration...');

try {
  const styles = generateCleanStyles();
  console.log(`✅ Generated ${styles.length} styles (including customize option)`);
  
  // Generate the file content
  const fileContent = generateStylesFile();
  
  // Write to new file
  const outputPath = path.join(__dirname, 'config', 'signatureStyles.js');
  fs.writeFileSync(outputPath, fileContent);
  
  console.log(`✅ New configuration written to: ${outputPath}`);
  console.log(`📊 Summary:`);
  console.log(`   - Total styles: ${styles.length}`);
  console.log(`   - Font-based styles: ${styles.length - 1}`);
  console.log(`   - Customize option: 1`);
  
  // List the remaining fonts
  console.log(`\n📝 Remaining fonts:`);
  styles.filter(s => !s.isCustomize).forEach((style, index) => {
    console.log(`   ${index + 1}. ${style.name} (${style.category})`);
  });
  
} catch (error) {
  console.error('❌ Error generating styles:', error.message);
  process.exit(1);
}

console.log('\n🎉 Clean signature styles generation completed!');