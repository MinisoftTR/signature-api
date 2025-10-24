// Font ID Mapping - Generated 2025-08-20T18:44:55.970Z
// Bu dosya eski font ID'lerinden yeni karışık ID'lere mapping sağlar

module.exports = {
  // Font Name Mapping (ID'den tek kelime isme)
  NAME_MAPPING: {
  "zephyr": "Phoenix",
  "quixel": "Raven",
  "nexus": "Azure",
  "vortex": "Crimson",
  "prism": "Mystic",
  "flux": "Titan",
  "crisp": "Nova",
  "ember": "Echo",
  "storm": "Void",
  "lunar": "Frost",
  "spark": "Zenith",
  "pixel": "Onyx",
  "frost": "Ivory",
  "drift": "Sage",
  "blaze": "Mint",
  "ocean": "Rust",
  "ghost": "Coral",
  "vapor": "Jade",
  "chrome": "Rose",
  "twist": "Pine",
  "cloud": "Silk",
  "ridge": "Dusk",
  "flame": "Lime",
  "wave": "Dawn",
  "stone": "Night",
  "magic": "Gold",
  "pulse": "Silver",
  "swift": "Ruby",
  "coral": "Moon",
  "tidal": "Star",
  "bloom": "Wind",
  "creek": "Rain",
  "amber": "Snow",
  "blade": "Fire",
  "cyber": "Ice",
  "pearl": "Sand"
},
  
  // ID'den display name al
  getDisplayName: (fontId) => {
    return module.exports.NAME_MAPPING[fontId] || fontId;
  },
  // Eski ID'den yeni ID'ye
  OLD_TO_NEW: {
  "birmingham_script": "zephyr",
  "adustine_signature": "quixel",
  "delicate_flow": "nexus",
  "hereditary": "vortex",
  "jorima_signature_brush": "prism",
  "migratory": "flux",
  "almatian": "crisp",
  "blondeyrich": "ember",
  "cassavania": "storm",
  "aesthero": "lunar",
  "harisna": "spark",
  "miyake_regular": "pixel",
  "helmwick_regular": "frost",
  "cartines_signatures": "drift",
  "restflaws": "blaze",
  "wamelo": "ocean",
  "thoderan_notes": "ghost",
  "kagem_sinten": "vapor",
  "baselliost": "chrome",
  "pakody_signature": "twist",
  "boiled_peanuts_signature": "cloud",
  "brian_wiliam_signature": "ridge",
  "blastiks": "flame",
  "breakloft": "wave",
  "bresley": "stone",
  "callifornia": "magic",
  "castenivey": "pulse",
  "enternity": "swift",
  "etiquette": "coral",
  "fallen_city": "tidal",
  "flavellya": "spark",
  "handestonie": "bloom",
  "handitype": "creek",
  "haramosh": "amber",
  "herlando": "blade",
  "jackyband": "cyber",
  "jennifer": "pearl",
  "kosakatta": "prism",
  "kristal": "frost",
  "madeleine": "bloom",
  "maritgode": "storm",
  "rackithan": "spark",
  "saio": "lunar",
  "slender": "pixel",
  "tottenham": "blaze",
  "singletone": "crisp"
},
  
  // Yeni ID'den eski ID'ye  
  NEW_TO_OLD: {
  "zephyr": "birmingham_script",
  "quixel": "adustine_signature",
  "nexus": "delicate_flow",
  "vortex": "hereditary",
  "prism": "kosakatta",
  "flux": "migratory",
  "crisp": "singletone",
  "ember": "blondeyrich",
  "storm": "maritgode",
  "lunar": "saio",
  "spark": "rackithan",
  "pixel": "slender",
  "frost": "kristal",
  "drift": "cartines_signatures",
  "blaze": "tottenham",
  "ocean": "wamelo",
  "ghost": "thoderan_notes",
  "vapor": "kagem_sinten",
  "chrome": "baselliost",
  "twist": "pakody_signature",
  "cloud": "boiled_peanuts_signature",
  "ridge": "brian_wiliam_signature",
  "flame": "blastiks",
  "wave": "breakloft",
  "stone": "bresley",
  "magic": "callifornia",
  "pulse": "castenivey",
  "swift": "enternity",
  "coral": "etiquette",
  "tidal": "fallen_city",
  "bloom": "madeleine",
  "creek": "handitype",
  "amber": "haramosh",
  "blade": "herlando",
  "cyber": "jackyband",
  "pearl": "jennifer"
},
  
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
};