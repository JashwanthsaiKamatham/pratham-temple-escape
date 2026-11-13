export const OUTFITS = [
  {
    id: 'classic',
    name: 'Explorer Classic',
    tagline: 'Modern khaki expedition vest, crimson sprint shoes & leather trekker pack',
    coins: 0,
    diamonds: 0,
    colors: {
      jacket: 0x9a7b4f,
      shirt: 0xf8fafc,
      scarf: 0xd9480f,
      pants: 0x2b3a4a,
      shoes: 0xdc2626,
      shoeTrim: 0xffffff,
      backpack: 0x6b4423,
      accent: 0xf59e0b,
      headband: 0xd9480f
    },
    badgeBg: 'from-amber-500 to-orange-600'
  },
  {
    id: 'royal',
    name: 'Royal Maharaja',
    tagline: 'Saffron & imperial crimson tunic-jacket with Hampi gold embroidery',
    coins: 150,
    diamonds: 0,
    colors: {
      jacket: 0xb91c1c,
      shirt: 0xfef3c7,
      scarf: 0xf59e0b,
      pants: 0x1e1b4b,
      shoes: 0xd97706,
      shoeTrim: 0xfef08a,
      backpack: 0x7c2d12,
      accent: 0xfbbf24,
      headband: 0xf59e0b
    },
    badgeBg: 'from-red-600 to-amber-500'
  },
  {
    id: 'shadow',
    name: 'Shadow Trekker',
    tagline: 'Stealth obsidian carbon gear with electric cyan cave-runner accents',
    coins: 350,
    diamonds: 0,
    colors: {
      jacket: 0x1e293b,
      shirt: 0x0f172a,
      scarf: 0x06b6d4,
      pants: 0x090d16,
      shoes: 0x0891b2,
      shoeTrim: 0x67e8f9,
      backpack: 0x111827,
      accent: 0x22d3ee,
      headband: 0x06b6d4
    },
    badgeBg: 'from-slate-800 to-cyan-600'
  },
  {
    id: 'jungle',
    name: 'Emerald Ranger',
    tagline: 'Western Ghats canopy camo vest, trailblazer boots & waterproof pack',
    coins: 600,
    diamonds: 0,
    colors: {
      jacket: 0x15803d,
      shirt: 0xdcfce7,
      scarf: 0xeab308,
      pants: 0x365314,
      shoes: 0x65a30d,
      shoeTrim: 0xfef9c3,
      backpack: 0x3f6212,
      accent: 0x84cc16,
      headband: 0xca8a04
    },
    badgeBg: 'from-emerald-600 to-lime-600'
  },
  {
    id: 'solar',
    name: 'Solar Mythic Avatar',
    tagline: 'Radiant ivory & molten Konark sun-gold armor with glowing Garuda pack',
    coins: 1000,
    diamonds: 5,
    colors: {
      jacket: 0xf59e0b,
      shirt: 0xffffff,
      scarf: 0x38bdf8,
      pants: 0xf1f5f9,
      shoes: 0xeab308,
      shoeTrim: 0xffffff,
      backpack: 0xd97706,
      accent: 0x38bdf8,
      headband: 0x0284c7
    },
    badgeBg: 'from-amber-400 via-yellow-500 to-sky-500'
  }
];

export const POWERUPS = {
  magnet: {
    id: 'magnet',
    name: 'Coin Magnet',
    duration: 9.0,
    color: '#ef4444',
    hex: 0xef4444,
    desc: 'Pulls all nearby gold coins & diamonds straight to Pratham'
  },
  boost: {
    id: 'boost',
    name: 'Speed Boost',
    duration: 5.5,
    color: '#f59e0b',
    hex: 0xf59e0b,
    desc: 'Blazing supersonic dash that smashes safely through obstacles'
  },
  shield: {
    id: 'shield',
    name: 'Sacred Shield',
    duration: 12.0,
    color: '#10b981',
    hex: 0x10b981,
    desc: 'Protective chakra barrier that absorbs a fatal collision'
  },
  doubleCoins: {
    id: 'doubleCoins',
    name: '2X Gold Coins',
    duration: 10.0,
    color: '#eab308',
    hex: 0xeab308,
    desc: 'Every coin collected grants double value & double score'
  },
  fly: {
    id: 'fly',
    name: 'Garuda Flight',
    duration: 6.5,
    color: '#06b6d4',
    hex: 0x06b6d4,
    desc: 'Soar high above temple traps with golden energy wings'
  }
};

export const BIOMES = [
  {
    id: 'temple',
    name: 'Ancient Gopuram Temple',
    skyTop: 0x2fa8e0,
    skyHorizon: 0xffd88a,
    fogColor: 0xf5c47b,
    fogDensity: 0.0075,
    sunColor: 0xfff0c2,
    sunIntensity: 2.35,
    ambientColor: 0xffe6bd,
    ambientIntensity: 0.42,
    groundTint: 0xffffff
  },
  {
    id: 'jungle',
    name: 'Dense Sacred Jungle',
    skyTop: 0x1a94c9,
    skyHorizon: 0xc7f2c9,
    fogColor: 0x9fddb5,
    fogDensity: 0.0095,
    sunColor: 0xf2ffd0,
    sunIntensity: 2.2,
    ambientColor: 0xc8f5d0,
    ambientIntensity: 0.5,
    groundTint: 0x9fa86a
  },
  {
    id: 'bridge',
    name: 'Perilous Chasm Bridges',
    skyTop: 0x4f58c9,
    skyHorizon: 0xffb877,
    fogColor: 0xf0b483,
    fogDensity: 0.0078,
    sunColor: 0xffe0bd,
    sunIntensity: 2.4,
    ambientColor: 0xffd9b8,
    ambientIntensity: 0.48,
    groundTint: 0xffffff
  },
  {
    id: 'waterfall',
    name: 'Sacred Waterfalls & River',
    skyTop: 0x1e9bd6,
    skyHorizon: 0xd6fbff,
    fogColor: 0xb3ecf7,
    fogDensity: 0.0085,
    sunColor: 0xe6f6ff,
    sunIntensity: 2.3,
    ambientColor: 0xd8f2ff,
    ambientIntensity: 0.55,
    groundTint: 0xa9c6d4
  },
  {
    id: 'cave',
    name: 'Dark Crystal Caverns',
    skyTop: 0x0b1020,
    skyHorizon: 0x2a2350,
    fogColor: 0x221d47,
    fogDensity: 0.015,
    sunColor: 0x9aa8ff,
    sunIntensity: 1.35,
    ambientColor: 0x6d4bd6,
    ambientIntensity: 0.55,
    groundTint: 0xffffff
  },
  {
    id: 'ruins',
    name: 'Mysterious Ancient Tunnels',
    skyTop: 0x6b2f0c,
    skyHorizon: 0xf0a75c,
    fogColor: 0xa9662b,
    fogDensity: 0.0115,
    sunColor: 0xffc36b,
    sunIntensity: 1.95,
    ambientColor: 0xffd9a0,
    ambientIntensity: 0.5,
    groundTint: 0xd8b189
  }
];
