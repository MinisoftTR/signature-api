# Updated Font Names - Single Word
# Generated: 2025-08-20T19:02:09.071Z

## Font ID → Display Name Mapping:
zephyr → Phoenix
quixel → Raven
nexus → Azure
vortex → Crimson
prism → Mystic
flux → Titan
crisp → Nova
ember → Echo
storm → Void
lunar → Frost
spark → Zenith
pixel → Onyx
frost → Ivory
drift → Sage
blaze → Mint
ocean → Rust
ghost → Coral
vapor → Jade
chrome → Rose
twist → Pine
cloud → Silk
ridge → Dusk
flame → Lime
wave → Dawn
stone → Night
magic → Gold
pulse → Silver
swift → Ruby
coral → Moon
tidal → Star
bloom → Wind
creek → Rain
amber → Snow
blade → Fire
cyber → Ice
pearl → Sand

## React Native Usage with New Names:
```javascript
const API_BASE = 'http://localhost:3001';

// Font ID'ler aynı, sadece görünen isimler tek kelime
const FONT_CONFIGS = [
  { id: 'zephyr', name: 'Phoenix' },
  { id: 'quixel', name: 'Raven' },
  { id: 'nexus', name: 'Azure' },
  { id: 'vortex', name: 'Crimson' },
  { id: 'prism', name: 'Mystic' },
  { id: 'flux', name: 'Titan' },
  { id: 'crisp', name: 'Nova' },
  { id: 'ember', name: 'Echo' },
  { id: 'storm', name: 'Void' },
  { id: 'lunar', name: 'Frost' },
  { id: 'spark', name: 'Zenith' },
  { id: 'pixel', name: 'Onyx' },
  { id: 'frost', name: 'Ivory' },
  { id: 'drift', name: 'Sage' },
  { id: 'blaze', name: 'Mint' },
  { id: 'ocean', name: 'Rust' },
  { id: 'ghost', name: 'Coral' },
  { id: 'vapor', name: 'Jade' },
  { id: 'chrome', name: 'Rose' },
  { id: 'twist', name: 'Pine' },
  { id: 'cloud', name: 'Silk' },
  { id: 'ridge', name: 'Dusk' },
  { id: 'flame', name: 'Lime' },
  { id: 'wave', name: 'Dawn' },
  { id: 'stone', name: 'Night' },
  { id: 'magic', name: 'Gold' },
  { id: 'pulse', name: 'Silver' },
  { id: 'swift', name: 'Ruby' },
  { id: 'coral', name: 'Moon' },
  { id: 'tidal', name: 'Star' },
  { id: 'bloom', name: 'Wind' },
  { id: 'creek', name: 'Rain' },
  { id: 'amber', name: 'Snow' },
  { id: 'blade', name: 'Fire' },
  { id: 'cyber', name: 'Ice' },
  { id: 'pearl', name: 'Sand' }
];

// Usage example:
const FontSelector = () => {
  return FONT_CONFIGS.map(font => (
    <TouchableOpacity key={font.id}>
      <Image 
        source={{ uri: `${API_BASE}/api/miniAssets/styles/${font.id}.png` }}
        style={{ width: 200, height: 80 }}
      />
      <Text>{font.name}</Text>
    </TouchableOpacity>
  ));
};
```

## API Response Example:
```json
{
  "id": "stone",
  "name": "Night",
  "imageUrl": "/api/miniAssets/styles/stone.png",
  "isPro": false,
  "category": "elegant"
}
```

## Sample URLs (unchanged):
http://localhost:3001/api/miniAssets/styles/zephyr.png
http://localhost:3001/api/miniAssets/styles/quixel.png
http://localhost:3001/api/miniAssets/styles/nexus.png
http://localhost:3001/api/miniAssets/styles/vortex.png
http://localhost:3001/api/miniAssets/styles/prism.png
http://localhost:3001/api/miniAssets/styles/flux.png
http://localhost:3001/api/miniAssets/styles/crisp.png
http://localhost:3001/api/miniAssets/styles/ember.png
http://localhost:3001/api/miniAssets/styles/storm.png
http://localhost:3001/api/miniAssets/styles/lunar.png
