// Lista completa de personajes de Smash Ultimate
// id  → slug para Redis y URLs (sin espacios ni caracteres especiales)
// img → ruta relativa al archivo en /public/images/characters/
// alts → 8 apariencias desde smash_alts/ (o la imagen existente para Miis)

/** Genera las 8 rutas de alts desde una carpeta en smash_alts/ */
const _s = (f) => [1,2,3,4,5,6,7,8].map(n => `smash_alts/${f}/skin_${n}.png`);

export const CHARACTERS = [
  { id: 'banjo-kazooie',   name: 'Banjo & Kazooie',   img: 'Banjo Kazooie.png',    alts: _s('71_Banjo_Kazooie')    },
  { id: 'bayonetta',       name: 'Bayonetta',          img: 'Bayonetta.png',        alts: _s('61_Bayonetta')        },
  { id: 'bowser-jr',       name: 'Bowser Jr.',         img: 'Bowser Jr.png',        alts: _s('56_Bowser_Jr')        },
  { id: 'bowser',          name: 'Bowser',             img: 'Bowser.png',           alts: _s('14_Bowser')           },
  { id: 'byleth',          name: 'Byleth',             img: 'Byleth.png',           alts: _s('73_Byleth')           },
  { id: 'captain-falcon',  name: 'Captain Falcon',     img: 'Captain Falcon.png',   alts: _s('11_Captain_Falcon')   },
  { id: 'chrom',           name: 'Chrom',              img: 'Chrom.png',            alts: _s('25e_Chrom')           },
  { id: 'cloud',           name: 'Cloud',              img: 'Cloud.png',            alts: _s('59_Cloud')            },
  { id: 'corrin',          name: 'Corrin',             img: 'Corrin.png',           alts: _s('60_Corrin')           },
  { id: 'daisy',           name: 'Daisy',              img: 'Daisy.png',            alts: _s('13e_Daisy')           },
  { id: 'dark-pit',        name: 'Dark Pit',           img: 'Dark Pit.png',         alts: _s('28e_Dark_Pit')        },
  { id: 'dark-samus',      name: 'Dark Samus',         img: 'Dark Samus.png',       alts: _s('4e_Samus_Oscura')     },
  { id: 'diddy-kong',      name: 'Diddy Kong',         img: 'Diddy Kong.png',       alts: _s('34_Diddy_Kong')       },
  { id: 'donkey-kong',     name: 'Donkey Kong',        img: 'Donkey Kong.png',      alts: _s('02_Donkey_Kong')      },
  { id: 'dr-mario',        name: 'Dr. Mario',          img: 'Dr. Mario.png',        alts: _s('18_Dr_Mario')         },
  { id: 'duck-hunt',       name: 'Duck Hunt',          img: 'Duck Hunt.png',        alts: _s('57_Duck_Hunt')        },
  { id: 'falco',           name: 'Falco',              img: 'Falco.png',            alts: _s('20_Falco')            },
  { id: 'fox',             name: 'Fox',                img: 'Fox.png',              alts: _s('07_Fox')              },
  { id: 'ganondorf',       name: 'Ganondorf',          img: 'Ganondorf.png',        alts: _s('23_Ganondorf')        },
  { id: 'greninja',        name: 'Greninja',           img: 'Greninja.png',         alts: _s('48_Greninja')         },
  { id: 'hero',            name: 'Hero',               img: 'Hero.png',             alts: _s('70_Hero')             },
  { id: 'ice-climbers',    name: 'Ice Climbers',       img: 'Ice Climbers.png',     alts: _s('15_Ice_Climbers')     },
  { id: 'ike',             name: 'Ike',                img: 'Ike.png',              alts: _s('32_Ike')              },
  { id: 'incineroar',      name: 'Incineroar',         img: 'Incineroar.png',       alts: _s('67_Incineroar')       },
  { id: 'inkling',         name: 'Inkling',            img: 'Inkling.png',          alts: _s('62_Inkling')          },
  { id: 'isabelle',        name: 'Isabelle',           img: 'Isabelle.png',         alts: _s('66_Isabelle')         },
  { id: 'jigglypuff',      name: 'Jigglypuff',         img: 'Jigglypuff.png',       alts: _s('12_Jigglypuff')       },
  { id: 'joker',           name: 'Joker',              img: 'Joker.png',            alts: _s('69_Joker')            },
  { id: 'kazuya',          name: 'Kazuya',             img: 'Kazuya.png',           alts: _s('78_Kazuya')           },
  { id: 'ken',             name: 'Ken',                img: 'Ken.png',              alts: _s('58e_Ken')             },
  { id: 'king-dedede',     name: 'King Dedede',        img: 'King Dedede.png',      alts: _s('37_King_Dedede')      },
  { id: 'king-k-rool',     name: 'King K. Rool',       img: 'King K. Rool.png',     alts: _s('65_King_K_Rool')      },
  { id: 'kirby',           name: 'Kirby',              img: 'Kirby.png',            alts: _s('06_Kirby')            },
  { id: 'link',            name: 'Link',               img: 'Link.png',             alts: _s('03_Link')             },
  { id: 'little-mac',      name: 'Little Mac',         img: 'Little Mac.png',       alts: _s('47_Little_Mac')       },
  { id: 'lucario',         name: 'Lucario',            img: 'Lucario.png',          alts: _s('39_Lucario')          },
  { id: 'lucas',           name: 'Lucas',              img: 'Lucas.png',            alts: _s('35_Lucas')            },
  { id: 'lucina',          name: 'Lucina',             img: 'Lucina.png',           alts: _s('21e_Lucina')          },
  { id: 'luigi',           name: 'Luigi',              img: 'Luigi.png',            alts: _s('09_Luigi')            },
  { id: 'mario',           name: 'Mario',              img: 'Mario.png',            alts: _s('01_Mario')            },
  { id: 'marth',           name: 'Marth',              img: 'Marth.png',            alts: _s('21_Marth')            },
  { id: 'mega-man',        name: 'Mega Man',           img: 'Mega Man.png',         alts: _s('44_Mega_Man')         },
  { id: 'meta-knight',     name: 'Meta Knight',        img: 'Meta Knight.png',      alts: _s('27_Meta_Knight')      },
  { id: 'mewtwo',          name: 'Mewtwo',             img: 'Mewtwo.png',           alts: _s('24_Mewtwo')           },
  { id: 'mii-brawler',     name: 'Mii Brawler',        img: 'Mii Brawler.png',      alts: ['Mii Brawler.png']       },
  { id: 'mii-gunner',      name: 'Mii Gunner',         img: 'Mii Gunner.png',       alts: ['Mii Gunner.png']        },
  { id: 'mii-swordfighter',name: 'Mii Swordfighter',   img: 'Mii Swordfighter.png', alts: ['Mii Swordfighter.png']  },
  { id: 'min-min',         name: 'Min Min',            img: 'Min Min.png',          alts: _s('74_Min_Min')          },
  { id: 'mr-game-watch',   name: 'Mr. Game & Watch',   img: 'Mr. Game & Watch.png', alts: _s('26_Mr_Game_Watch')    },
  { id: 'ness',            name: 'Ness',               img: 'Ness.png',             alts: _s('10_Ness')             },
  { id: 'olimar',          name: 'Olimar',             img: 'Olimar.png',           alts: _s('38_Olimar')           },
  { id: 'pac-man',         name: 'Pac-Man',            img: 'Pac-Man.png',          alts: _s('53_Pac_Man')          },
  { id: 'palutena',        name: 'Palutena',           img: 'Palutena.png',         alts: _s('52_Palutena')         },
  { id: 'peach',           name: 'Peach',              img: 'Peach.png',            alts: _s('13_Peach')            },
  { id: 'pichu',           name: 'Pichu',              img: 'Pichu.png',            alts: _s('19_Pichu')            },
  { id: 'pikachu',         name: 'Pikachu',            img: 'Pikachu.png',          alts: _s('08_Pikachu')          },
  { id: 'piranha-plant',   name: 'Piranha Plant',      img: 'Piranha Plant.png',    alts: _s('68_Piranha_Plant')    },
  { id: 'pit',             name: 'Pit',                img: 'Pit.png',              alts: _s('28_Pit')              },
  { id: 'pokemon-trainer', name: 'Pokémon Trainer',    img: 'Pokemon Trainer.png',  alts: _s('33_Pokemon_Trainer')  },
  { id: 'pyra-mythra',     name: 'Pyra / Mythra',      img: 'Pyra Mythra.png',      alts: _s('77_Pyra_Mythra')      },
  { id: 'rob',             name: 'R.O.B.',             img: 'R.O.B.png',            alts: _s('40_ROB')              },
  { id: 'richter',         name: 'Richter',            img: 'Richter.png',          alts: _s('64e_Richter')         },
  { id: 'ridley',          name: 'Ridley',             img: 'Ridley.png',           alts: _s('63_Ridley')           },
  { id: 'robin',           name: 'Robin',              img: 'Robin.png',            alts: _s('54_Robin')            },
  { id: 'rosalina-luma',   name: 'Rosalina & Luma',    img: 'Rosalina & Luma.png',  alts: _s('46_Rosalina_Luma')    },
  { id: 'roy',             name: 'Roy',                img: 'Roy.png',              alts: _s('25_Roy')              },
  { id: 'ryu',             name: 'Ryu',                img: 'Ryu.png',              alts: _s('58_Ryu')              },
  { id: 'samus',           name: 'Samus',              img: 'Samus.png',            alts: _s('04_Samus')            },
  { id: 'sephiroth',       name: 'Sephiroth',          img: 'Sephiroth.png',        alts: _s('76_Sephiroth')        },
  { id: 'sheik',           name: 'Sheik',              img: 'Sheik.png',            alts: _s('16_Sheik')            },
  { id: 'shulk',           name: 'Shulk',              img: 'Shulk.png',            alts: _s('55_Shulk')            },
  { id: 'simon',           name: 'Simon',              img: 'Simon.png',            alts: _s('64_Simon')            },
  { id: 'snake',           name: 'Snake',              img: 'Snake.png',            alts: _s('31_Snake')            },
  { id: 'sonic',           name: 'Sonic',              img: 'Sonic.png',            alts: _s('36_Sonic')            },
  { id: 'sora',            name: 'Sora',               img: 'Sora.png',             alts: _s('79_Sora')             },
  { id: 'steve',           name: 'Steve',              img: 'Steve.png',            alts: _s('75_Steve')            },
  { id: 'terry',           name: 'Terry',              img: 'Terry.png',            alts: _s('72_Terry')            },
  { id: 'toon-link',       name: 'Toon Link',          img: 'Toon Link.png',        alts: _s('41_Toon_Link')        },
  { id: 'villager',        name: 'Villager',           img: 'Villager.png',         alts: _s('43_Villager')         },
  { id: 'wario',           name: 'Wario',              img: 'Wario.png',            alts: _s('30_Wario')            },
  { id: 'wii-fit-trainer', name: 'Wii Fit Trainer',    img: 'Wii Fit Trainer.png',  alts: _s('45_Wii_Fit_Trainer')  },
  { id: 'wolf',            name: 'Wolf',               img: 'Wolf.png',             alts: _s('42_Wolf')             },
  { id: 'yoshi',           name: 'Yoshi',              img: 'Yoshi.png',            alts: _s('05_Yoshi')            },
  { id: 'young-link',      name: 'Young Link',         img: 'Young Link.png',       alts: _s('22_Young_Link')       },
  { id: 'zelda',           name: 'Zelda',              img: 'Zelda.png',            alts: _s('17_Zelda')            },
  { id: 'zero-suit-samus', name: 'Zero Suit Samus',    img: 'Zero Suit Samus.png',  alts: _s('29_Zero_Suit_Samus')  },
];

/** Devuelve el objeto de personaje por su id */
export function getCharById(id) {
  return CHARACTERS.find(c => c.id === id) || null;
}

/** Ruta pública de la imagen de un personaje */
export function charImgPath(img) {
  return `/images/characters/${encodeURIComponent(img)}`;
}

/** Ruta al stock icon V2 (cabeza pequeña) de un personaje + skin */
const _stockOverrides = { 'rob': 'Rob', 'pac-man': 'Pac Man' };
export function stockIconPath(charObj, skin) {
  if (!charObj) return null;
  const folder = _stockOverrides[charObj.id]
    || charObj.name.replace(/\./g, '').replace(/ \/ /g, ' & ').replace(/-/g, ' ')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const idx = Math.max(1, Math.min(parseInt(skin) || 1, 8));
  return `/images/Stock%20Icons%20V2/${encodeURIComponent(folder)}/${idx}.png`;
}

/** Map de character ID → nombre de archivo de render (carpeta /images/Render SSBU/) */
export const CHARACTER_RENDERS = {
  'banjo-kazooie':    'Banjo Render SSBU.png',
  'bayonetta':        'Bayonetta.png',
  'bowser-jr':        'Bowser Jr..png',
  'bowser':           'Bowser.png',
  'byleth':           'Byleth.png',
  'captain-falcon':   'Captain Falcon.png',
  'chrom':            'Chrom.png',
  'cloud':            'Cloud.png',
  'corrin':           'Corrin.png',
  'daisy':            'Daisy.png',
  'dark-pit':         'Dark Pit.png',
  'dark-samus':       'Dark Samus.png',
  'diddy-kong':       'Diddy Kong.png',
  'donkey-kong':      'Donkey Kong.png',
  'dr-mario':         'Dr. Mario.png',
  'duck-hunt':        'Duck Hunt.png',
  'falco':            'Falco.png',
  'fox':              'Fox.png',
  'ganondorf':        'Ganondorf.png',
  'greninja':         'Greninja.png',
  'hero':             'Hero.png',
  'ice-climbers':     'Ice Climbers.png',
  'ike':              'Ike.png',
  'incineroar':       'Incineroar.png',
  'inkling':          'Inkling.png',
  'isabelle':         'Isabelle.png',
  'jigglypuff':       'Jiggly.png',
  'joker':            'Joker.png',
  'kazuya':           'Kazuya.png',
  'ken':              'Ken.png',
  'king-dedede':      'King Dedede.png',
  'king-k-rool':      'King K. Rool.png',
  'kirby':            'Kirby.png',
  'link':             'Link.png',
  'little-mac':       'Little Mac.png',
  'lucario':          'Lucario.png',
  'lucas':            'Lucas.png',
  'luigi':            'Luigi.png',
  'mario':            'Mario.png',
  'marth':            'Marth.png',
  'mega-man':         'Megaman.png',
  'meta-knight':      'Meta Knight.png',
  'mewtwo':           'Mewtoo.png',
  'mii-brawler':      'Mii Brawler.png',
  'mii-swordfighter': 'Mii Swordfighter.png',
  'min-min':          'Min Min.png',
  'mr-game-watch':    'Mr. Game & Watch.png',
  'ness':             'Ness.png',
  'olimar':           'Olimar.png',
  'pac-man':          'Pacman.png',
  'palutena':         'Palutena.png',
  'peach':            'Peach.png',
  'pikachu':          'Pikachu.png',
  'piranha-plant':    'Piranha Plant.png',
  'pit':              'Pit.png',
  'pokemon-trainer':  'Pokemon Trainer.png',
  'pyra-mythra':      'Pyra & Mythra.png',
  'rob':              'R.O.B..png',
  'ridley':           'Ridley.png',
  'robin':            'Robin.png',
  'rosalina-luma':    'Rosalina.png',
  'roy':              'Roy.png',
  'ryu':              'Ryu.png',
  'samus':            'Samus.png',
  'sephiroth':         'Sephiroth.png',
  'sheik':            'Sheik.png',
  'shulk':            'Shulk.png',
  'simon':            'Simon Belmont.png',
  'snake':            'Snake.png',
  'sonic':            'Sonic.png',
  'sora':             'Sora.png',
  'steve':            'Steve.png',
  'terry':            'Terry.png',
  'toon-link':        'Toon Link.png',
  'villager':         'Villager.png',
  'wario':            'Wario.png',
  'wii-fit-trainer':  'Wii fit trainer.png',
  'wolf':             'Wolf.png',
  'yoshi':            'Yoshi.png',
  'young-link':       'Link ni\u00f1o.png',
  'zelda':            'Zelda.png',
  'zero-suit-samus':  'Zero Suit Samus.png',
};

/** Ruta pública del render de un personaje (carpeta con espacio en el nombre) */
export function charRenderPath(renderFile) {
  return `/images/Render%20SSBU/${encodeURIComponent(renderFile)}`;
}

/** Map de character ID → nombre de carpeta en /images/Render SSBU/alts/ */
export const CHARACTER_ALT_FOLDERS = {
  'banjo-kazooie':'banjo_and_kazooie','bayonetta':'bayonetta','bowser-jr':'bowser_jr',
  'bowser':'bowser','byleth':'byleth','captain-falcon':'captain_falcon',
  'chrom':'chrom','cloud':'cloud','corrin':'corrin','daisy':'daisy',
  'dark-pit':'dark_pit','dark-samus':'dark_samus','diddy-kong':'diddy_kong',
  'donkey-kong':'donkey_kong','dr-mario':'dr_mario','duck-hunt':'duck_hunt',
  'falco':'falco','fox':'fox','ganondorf':'ganondorf','greninja':'greninja',
  'hero':'dq_hero','ice-climbers':'ice_climbers','ike':'ike',
  'incineroar':'incineroar','inkling':'inkling','isabelle':'isabelle',
  'jigglypuff':'jigglypuff','joker':'joker','kazuya':'kazuya','ken':'ken',
  'king-dedede':'king_dedede','king-k-rool':'king_k_rool','kirby':'kirby',
  'link':'link','little-mac':'little_mac','lucario':'lucario','lucas':'lucas',
  'lucina':'lucina','luigi':'luigi','mario':'mario','marth':'marth',
  'mega-man':'mega_man','meta-knight':'meta_knight','mewtwo':'mewtwo',
  'min-min':'minmin','mr-game-watch':'mr_game_and_watch','ness':'ness',
  'olimar':'olimar','pac-man':'pac_man','palutena':'palutena','peach':'peach',
  'pichu':'pichu','pikachu':'pikachu','piranha-plant':'piranha_plant','pit':'pit',
  'pokemon-trainer':'pokemon_trainer','pyra-mythra':'pyra','ridley':'ridley',
  'rob':'rob','robin':'robin','rosalina-luma':'rosalina_and_luma','roy':'roy',
  'ryu':'ryu','samus':'samus','sephiroth':'sephiroth','sheik':'sheik',
  'shulk':'shulk','simon':'simon','snake':'snake','sonic':'sonic',
  'sora':'sora','steve':'steve','terry':'terry','toon-link':'toon_link',
  'villager':'villager','wario':'wario','wii-fit-trainer':'wii_fit_trainer',
  'wolf':'wolf','yoshi':'yoshi','young-link':'young_link','zelda':'zelda',
  'zero-suit-samus':'zero_suit_samus',
};

/** Genera las rutas de alt skins para un personaje (skin_2 a skin_8) */
export function charAltPaths(charId) {
  const char = CHARACTERS.find(c => c.id === charId);
  if (!char || !char.alts || char.alts.length <= 1) return [];
  return char.alts.slice(1).map(alt => `/images/characters/${alt}`);
}

/** Ruta de la skin por defecto (skin_1) */
export function charDefaultAltPath(charId) {
  const char = CHARACTERS.find(c => c.id === charId);
  if (!char?.alts?.length) return null;
  return `/images/characters/${char.alts[0]}`;
}

/** Normaliza un nombre para comparación (quita acentos, puntuación, etc.) */
function normalizeName(name) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Pre-build lookup: normalized name → local character id
const _nameToSlug = {};
CHARACTERS.forEach(c => { _nameToSlug[normalizeName(c.name)] = c.id; });

/** Dado un nombre de personaje de Start.GG, devuelve el slug local para imágenes */
export function findLocalCharId(startggName) {
  if (!startggName) return null;
  return _nameToSlug[normalizeName(startggName)] || null;
}
