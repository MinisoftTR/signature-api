#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Font ID'den tek kelime karışık isme mapping
const NAME_MAPPING = {
  // Premium fonts
  'zephyr': 'Phoenix',
  'quixel': 'Raven', 
  'nexus': 'Azure',
  'vortex': 'Crimson',
  'prism': 'Mystic',
  'flux': 'Titan',
  'crisp': 'Nova',
  'ember': 'Echo',
  'storm': 'Void',
  'lunar': 'Frost',
  'spark': 'Zenith',
  'pixel': 'Onyx',
  'frost': 'Ivory',
  
  // Free fonts  
  'drift': 'Sage',
  'blaze': 'Mint',
  'ocean': 'Rust',
  'ghost': 'Coral',
  'vapor': 'Jade',
  'chrome': 'Rose',
  'twist': 'Pine',
  'cloud': 'Silk',
  'ridge': 'Dusk',
  'flame': 'Lime',
  'wave': 'Dawn',
  'stone': 'Night',
  'magic': 'Gold',
  'pulse': 'Silver',
  'swift': 'Ruby',
  'coral': 'Moon',
  'tidal': 'Star',
  'bloom': 'Wind',
  'creek': 'Rain',
  'amber': 'Snow',
  'blade': 'Fire',
  'cyber': 'Ice',
  'pearl': 'Sand',
  // Not adding duplicate IDs (prism, frost, bloom, storm, spark, lunar, pixel, blaze, crisp)
};

console.log('🔄 Font Name Updating Started...\n');

// signatureStyles.js dosyasını güncelle
function updateFontNames() {
  const stylesPath = path.join(__dirname, 'config/signatureStyles.js');
  let content = fs.readFileSync(stylesPath, 'utf8');
  
  let updateCount = 0;
  
  Object.entries(NAME_MAPPING).forEach(([fontId, newName]) => {
    // name field'ını güncelle - her font ID için sadece ilk occurrence'ı değiştir
    const nameRegex = new RegExp(`(id: '${fontId}'[\\s\\S]*?)name: '[^']*'`, 'g');
    
    let match;
    while ((match = nameRegex.exec(content)) !== null) {
      const replacement = `${match[1]}name: '${newName}'`;
      content = content.substring(0, match.index) + replacement + content.substring(match.index + match[0].length);
      updateCount++;
      break; // Sadece ilk eşleşmeyi değiştir
    }
  });
  
  fs.writeFileSync(stylesPath, content);
  console.log(`✅ Updated font names in signatureStyles.js (${updateCount} fonts)`);
}

// Mapping dosyasını güncelle
function updateMappingFile() {
  const mappingPath = path.join(__dirname, 'config/fontIdMapping.js');
  let content = fs.readFileSync(mappingPath, 'utf8');
  
  // Yeni name mapping ekle
  const nameMappingContent = `
  // Font Name Mapping (ID'den tek kelime isme)
  NAME_MAPPING: ${JSON.stringify(NAME_MAPPING, null, 2)},
  
  // ID'den display name al
  getDisplayName: (fontId) => {
    return module.exports.NAME_MAPPING[fontId] || fontId;
  },`;
  
  // module.exports'tan önce ekle
  content = content.replace(
    'module.exports = {',
    `module.exports = {${nameMappingContent}`
  );
  
  fs.writeFileSync(mappingPath, content);
  console.log('✅ Updated fontIdMapping.js with name mappings');
}

// Test dosyası oluştur
function createUpdatedTestFile() {
  const baseUrl = 'http://localhost:3001';
  
  const testContent = `# Updated Font Names - Single Word
# Generated: ${new Date().toISOString()}

## Font ID → Display Name Mapping:
${Object.entries(NAME_MAPPING).map(([id, name]) => `${id} → ${name}`).join('\n')}

## React Native Usage with New Names:
\`\`\`javascript
const API_BASE = '${baseUrl}';

// Font ID'ler aynı, sadece görünen isimler tek kelime
const FONT_CONFIGS = [
${Object.entries(NAME_MAPPING).map(([id, name]) => `  { id: '${id}', name: '${name}' }`).join(',\n')}
];

// Usage example:
const FontSelector = () => {
  return FONT_CONFIGS.map(font => (
    <TouchableOpacity key={font.id}>
      <Image 
        source={{ uri: \`\${API_BASE}/api/miniAssets/styles/\${font.id}.png\` }}
        style={{ width: 200, height: 80 }}
      />
      <Text>{font.name}</Text>
    </TouchableOpacity>
  ));
};
\`\`\`

## API Response Example:
\`\`\`json
{
  "id": "stone",
  "name": "Night",
  "imageUrl": "/api/miniAssets/styles/stone.png",
  "isPro": false,
  "category": "elegant"
}
\`\`\`

## Sample URLs (unchanged):
${Object.keys(NAME_MAPPING).slice(0, 10).map(id => `${baseUrl}/api/miniAssets/styles/${id}.png`).join('\n')}
`;

  fs.writeFileSync(path.join(__dirname, 'UPDATED_FONT_NAMES.md'), testContent);
  console.log('✅ Created UPDATED_FONT_NAMES.md');
}

// Ana fonksiyon
async function main() {
  try {
    console.log(`📋 Total name mappings: ${Object.keys(NAME_MAPPING).length}\n`);
    
    // 1. Font names güncelle
    updateFontNames();
    
    // 2. Mapping dosyasını güncelle
    updateMappingFile();
    
    // 3. Test dosyası oluştur
    createUpdatedTestFile();
    
    console.log('\n🎉 Font name updating completed successfully!');
    console.log('\n📝 Changes:');
    console.log('✅ Font display names are now single words');
    console.log('✅ Font IDs remain the same (stone, magic, etc.)');
    console.log('✅ PNG URLs unchanged');
    console.log('✅ Only display names simplified');
    
    // Örnek değişiklikleri göster
    console.log('\n🔗 Example changes:');
    console.log('   "Birmingham Script" → "Phoenix"');
    console.log('   "Adustine Signature" → "Raven"');
    console.log('   "Delicate Flow" → "Azure"');
    console.log('   "Boiled Peanuts Signature" → "Silk"');
    
  } catch (error) {
    console.error('\n💥 Error during name updating:', error.message);
    process.exit(1);
  }
}

// Script çalıştır
if (require.main === module) {
  main();
}

module.exports = { NAME_MAPPING };