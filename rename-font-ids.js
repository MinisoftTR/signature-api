#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Eski ID'den yeni karışık ID'ye mapping
const ID_MAPPING = {
  // Premium fonts
  'birmingham_script': 'zephyr',
  'adustine_signature': 'quixel', 
  'delicate_flow': 'nexus',
  'hereditary': 'vortex',
  'jorima_signature_brush': 'prism',
  'migratory': 'flux',
  'almatian': 'crisp',
  'blondeyrich': 'ember',
  'cassavania': 'storm',
  'aesthero': 'lunar',
  'harisna': 'spark',
  'miyake_regular': 'pixel',
  'helmwick_regular': 'frost',
  
  // Free fonts  
  'cartines_signatures': 'drift',
  'restflaws': 'blaze',
  'wamelo': 'ocean',
  'thoderan_notes': 'ghost',
  'kagem_sinten': 'vapor',
  'baselliost': 'chrome',
  'pakody_signature': 'twist',
  'boiled_peanuts_signature': 'cloud',
  'brian_wiliam_signature': 'ridge',
  'blastiks': 'flame',
  'breakloft': 'wave',
  'bresley': 'stone',
  'callifornia': 'magic',
  'castenivey': 'pulse',
  'enternity': 'swift',
  'etiquette': 'coral',
  'fallen_city': 'tidal',
  'flavellya': 'spark',
  'handestonie': 'bloom',
  'handitype': 'creek',
  'haramosh': 'amber',
  'herlando': 'blade',
  'jackyband': 'cyber',
  'jennifer': 'pearl',
  'kosakatta': 'prism',
  'kristal': 'frost',
  'madeleine': 'bloom',
  'maritgode': 'storm',
  'rackithan': 'spark',
  'saio': 'lunar',
  'slender': 'pixel',
  'tottenham': 'blaze',
  'singletone': 'crisp'
};

// Ters mapping (yeni ID'den eski ID'ye)
const REVERSE_MAPPING = {};
Object.entries(ID_MAPPING).forEach(([oldId, newId]) => {
  REVERSE_MAPPING[newId] = oldId;
});

console.log('🔄 Font ID Renaming Started...\n');

// 1. signatureStyles.js dosyasını güncelle
function updateSignatureStyles() {
  const stylesPath = path.join(__dirname, 'config/signatureStyles.js');
  let content = fs.readFileSync(stylesPath, 'utf8');
  
  let updateCount = 0;
  
  Object.entries(ID_MAPPING).forEach(([oldId, newId]) => {
    // ID field'ını güncelle
    content = content.replace(
      new RegExp(`id: '${oldId}'`, 'g'),
      `id: '${newId}'`
    );
    
    // fontStyle field'ını güncelle  
    content = content.replace(
      new RegExp(`fontStyle: '${oldId}'`, 'g'),
      `fontStyle: '${newId}'`
    );
    
    // imageUrl path'ini güncelle
    content = content.replace(
      new RegExp(`/api/miniAssets/styles/${oldId}\\.png`, 'g'),
      `/api/miniAssets/styles/${newId}.png`
    );
    
    updateCount++;
  });
  
  fs.writeFileSync(stylesPath, content);
  console.log(`✅ Updated signatureStyles.js (${updateCount} fonts)`);
}

// 2. PNG dosyalarını yeniden adlandır
function renamePNGFiles() {
  const stylesDir = path.join(__dirname, 'assets/styles');
  let renameCount = 0;
  
  Object.entries(ID_MAPPING).forEach(([oldId, newId]) => {
    const oldPath = path.join(stylesDir, `${oldId}.png`);
    const newPath = path.join(stylesDir, `${newId}.png`);
    
    if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, newPath);
      console.log(`📁 Renamed: ${oldId}.png → ${newId}.png`);
      renameCount++;
    } else {
      console.warn(`⚠️  File not found: ${oldId}.png`);
    }
  });
  
  console.log(`✅ Renamed ${renameCount} PNG files`);
}

// 3. Mapping dosyası oluştur
function createMappingFile() {
  const mappingContent = `// Font ID Mapping - Generated ${new Date().toISOString()}
// Bu dosya eski font ID'lerinden yeni karışık ID'lere mapping sağlar

module.exports = {
  // Eski ID'den yeni ID'ye
  OLD_TO_NEW: ${JSON.stringify(ID_MAPPING, null, 2)},
  
  // Yeni ID'den eski ID'ye  
  NEW_TO_OLD: ${JSON.stringify(REVERSE_MAPPING, null, 2)},
  
  // Yeni ID'den eski ID'ye çevir
  getOriginalId: (newId) => {
    return module.exports.NEW_TO_OLD[newId] || newId;
  },
  
  // Eski ID'den yeni ID'ye çevir
  getNewId: (oldId) => {
    return module.exports.OLD_TO_NEW[oldId] || oldId;
  },
  
  // Tüm yeni ID'leri listele
  getAllNewIds: () => {
    return Object.values(module.exports.OLD_TO_NEW);
  },
  
  // Tüm eski ID'leri listele
  getAllOldIds: () => {
    return Object.keys(module.exports.OLD_TO_NEW);
  }
};`;

  fs.writeFileSync(path.join(__dirname, 'config/fontIdMapping.js'), mappingContent);
  console.log('✅ Created fontIdMapping.js');
}

// 4. URL test listesi oluştur
function createTestUrls() {
  const baseUrl = 'http://localhost:3001';
  const urls = Object.values(ID_MAPPING).map(newId => 
    `${baseUrl}/api/miniAssets/styles/${newId}.png`
  );
  
  const testContent = `# Test URLs for New Font IDs
# Generated: ${new Date().toISOString()}

## PNG Preview URLs:
${urls.join('\n')}

## React Native Usage:
\`\`\`javascript
const API_BASE = '${baseUrl}';
const FONT_IDS = [
${Object.values(ID_MAPPING).map(id => `  '${id}'`).join(',\n')}
];

// Usage example:
const PreviewImage = ({ fontId }) => (
  <Image 
    source={{ uri: \`\${API_BASE}/api/miniAssets/styles/\${fontId}.png\` }}
    style={{ width: 200, height: 80 }}
    resizeMode="contain"
  />
);
\`\`\`

## Mapping Reference:
${Object.entries(ID_MAPPING).map(([old, new_]) => `${old} → ${new_}`).join('\n')}
`;

  fs.writeFileSync(path.join(__dirname, 'NEW_FONT_IDS.md'), testContent);
  console.log('✅ Created NEW_FONT_IDS.md');
}

// Ana fonksiyon
async function main() {
  try {
    console.log(`📋 Total mappings: ${Object.keys(ID_MAPPING).length}\n`);
    
    // 1. Config dosyasını güncelle
    updateSignatureStyles();
    
    // 2. PNG dosyalarını yeniden adlandır
    renamePNGFiles();
    
    // 3. Mapping dosyası oluştur
    createMappingFile();
    
    // 4. Test URL'leri oluştur
    createTestUrls();
    
    console.log('\n🎉 Font ID renaming completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Check NEW_FONT_IDS.md for new URLs');
    console.log('2. Update React Native code with new font IDs');
    console.log('3. Test the new URLs');
    
    // Örnek URL'ler göster
    console.log('\n🔗 Example new URLs:');
    Object.values(ID_MAPPING).slice(0, 5).forEach(newId => {
      console.log(`   http://localhost:3001/api/miniAssets/styles/${newId}.png`);
    });
    
  } catch (error) {
    console.error('\n💥 Error during renaming:', error.message);
    process.exit(1);
  }
}

// Script çalıştır
if (require.main === module) {
  main();
}

module.exports = { ID_MAPPING, REVERSE_MAPPING };