/**
 * Font Metadata Update Script
 * 
 * Bu script signatureStyles.js dosyasındaki tüm fontlara metadata ekler
 */

const fs = require('fs');
const path = require('path');
const SignatureService = require('./lib/signature-service');

async function updateFontMetadata() {
  const configPath = path.join(__dirname, 'config/signatureStyles.js');
  
  console.log('🔄 Updating font metadata...\n');

  try {
    // Mevcut config dosyasını yedekle
    const backupPath = configPath + '.backup-metadata';
    fs.copyFileSync(configPath, backupPath);
    console.log('✅ Backup created:', backupPath);

    // signatureStyles.js'i require et
    delete require.cache[require.resolve('./config/signatureStyles')];
    const { getAllStyles } = require('./config/signatureStyles');
    const styles = getAllStyles();

    console.log(`📊 Found ${styles.length} styles to analyze\n`);

    // SignatureService instance
    const signatureService = new SignatureService();
    
    // Her font için metadata analizi
    const updatedStyles = [];
    let processedCount = 0;

    for (const style of styles) {
      if (style.isCustomize) {
        // Customize style'ı olduğu gibi koru
        updatedStyles.push(style);
        continue;
      }

      console.log(`🔍 Analyzing: ${style.name} (${style.id})`);

      try {
        // Font features ve metrics analiz et
        const fontPath = style.fontConfig?.path;
        
        if (!fontPath || !fs.existsSync(fontPath)) {
          console.warn(`⚠️  Font file not found: ${fontPath}`);
          
          // Varsayılan metadata ekle
          updatedStyles.push({
            ...style,
            fontMetrics: {
              capHeight: null,
              ascender: null,
              descender: null,
              hasLigatures: false,
              hasKerning: false,
              baselineRatio: 0.62
            }
          });
          continue;
        }

        // Font analiz et
        const analysis = await signatureService.analyzeFontFeatures(fontPath);
        
        // Metadata oluştur
        const fontMetrics = {
          capHeight: analysis.metrics.capHeight || null,
          ascender: analysis.metrics.ascent || null,
          descender: analysis.metrics.descent || null,
          unitsPerEm: analysis.metrics.unitsPerEm || null,
          hasLigatures: analysis.features.hasLigatures || false,
          hasKerning: analysis.features.hasKerning || false,
          baselineRatio: 0.62,
          bbox: analysis.metrics.bbox || null
        };

        // Style'a metadata ekle
        updatedStyles.push({
          ...style,
          fontMetrics
        });

        console.log(`  ✅ Features: Ligatures=${fontMetrics.hasLigatures}, Kerning=${fontMetrics.hasKerning}`);
        console.log(`  📏 Metrics: Cap=${Math.round(fontMetrics.capHeight || 0)}, Asc=${Math.round(fontMetrics.ascender || 0)}, Desc=${Math.round(fontMetrics.descender || 0)}`);
        
        processedCount++;

      } catch (error) {
        console.error(`❌ Analysis failed for ${style.name}: ${error.message}`);
        
        // Hata durumunda varsayılan metadata ekle
        updatedStyles.push({
          ...style,
          fontMetrics: {
            capHeight: null,
            ascender: null,
            descender: null,
            hasLigatures: false,
            hasKerning: false,
            baselineRatio: 0.62
          }
        });
      }

      console.log(''); // Boş satır
    }

    // Yeni config dosyası oluştur
    const newConfigContent = generateConfigFile(updatedStyles);
    
    // Dosyayı yaz
    fs.writeFileSync(configPath, newConfigContent, 'utf8');

    console.log(`🎉 Font metadata update completed!`);
    console.log(`📊 Processed: ${processedCount}/${styles.length} fonts`);
    console.log(`💾 Config updated: ${configPath}`);
    console.log(`🔙 Backup available: ${backupPath}`);

  } catch (error) {
    console.error('💥 Update failed:', error.message);
    throw error;
  }
}

function generateConfigFile(styles) {
  let content = `const path = require('path');

// Signature style configurations - AUTO GENERATED WITH METADATA
const signatureStyles = [
`;

  styles.forEach((style, index) => {
    content += `  {\n`;
    content += `    id: '${style.id}',\n`;
    content += `    name: '${style.name}',\n`;
    content += `    imageUrl: '${style.imageUrl}',\n`;
    content += `    isPro: ${style.isPro},\n`;
    content += `    fontStyle: '${style.fontStyle}',\n`;
    content += `    category: '${style.category}',\n`;

    if (style.isCustomize) {
      content += `    isCustomize: true\n`;
    } else {
      // fontConfig
      content += `    fontConfig: {\n`;
      content += `      path: path.join(__dirname, '../fonts/${path.basename(style.fontConfig.path)}'),\n`;
      content += `      family: '${style.fontConfig.family}',\n`;
      content += `      color: '${style.fontConfig.color}',\n`;
      content += `      size: ${style.fontConfig.size},\n`;
      content += `      italic: ${style.fontConfig.italic},\n`;
      content += `      weight: '${style.fontConfig.weight}',\n`;
      content += `    },\n`;

      // fontMetrics
      if (style.fontMetrics) {
        content += `    fontMetrics: {\n`;
        content += `      capHeight: ${style.fontMetrics.capHeight},\n`;
        content += `      ascender: ${style.fontMetrics.ascender},\n`;
        content += `      descender: ${style.fontMetrics.descender},\n`;
        if (style.fontMetrics.unitsPerEm) {
          content += `      unitsPerEm: ${style.fontMetrics.unitsPerEm},\n`;
        }
        if (style.fontMetrics.bbox) {
          content += `      bbox: ${JSON.stringify(style.fontMetrics.bbox)},\n`;
        }
        content += `      hasLigatures: ${style.fontMetrics.hasLigatures},\n`;
        content += `      hasKerning: ${style.fontMetrics.hasKerning},\n`;
        content += `      baselineRatio: ${style.fontMetrics.baselineRatio}\n`;
        content += `    }\n`;
      }
    }

    content += `  }`;
    
    if (index < styles.length - 1) {
      content += ',';
    }
    content += '\n';
  });

  content += `];

// Helper functions
function getAllStyles() {
  return signatureStyles;
}

function getFontConfigForStyle(styleName) {
  const style = signatureStyles.find(s => 
    s.fontStyle === styleName || 
    s.id === styleName ||
    s.name === styleName
  );
  return style ? style.fontConfig : null;
}

function getStyleById(id) {
  return signatureStyles.find(style => style.id === id);
}

function getStylesByCategory(category) {
  return signatureStyles.filter(style => style.category === category);
}

function getProStyles() {
  return signatureStyles.filter(style => style.isPro);
}

function getFreeStyles() {
  return signatureStyles.filter(style => !style.isPro);
}

function getFontMetrics(styleName) {
  const style = signatureStyles.find(s => 
    s.fontStyle === styleName || 
    s.id === styleName ||
    s.name === styleName
  );
  return style ? style.fontMetrics : null;
}

module.exports = {
  signatureStyles,
  getAllStyles,
  getFontConfigForStyle,
  getStyleById,
  getStylesByCategory,
  getProStyles,
  getFreeStyles,
  getFontMetrics
};
`;

  return content;
}

// Script'i çalıştır
if (require.main === module) {
  updateFontMetadata()
    .then(() => {
      console.log('\n✨ Metadata update completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Metadata update failed:', error.message);
      process.exit(1);
    });
}

module.exports = { updateFontMetadata };