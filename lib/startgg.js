/**
 * Start.gg GraphQL API Utilities
 * Queries y Mutations reutilizables
 */

const STARTGG_API_URL = 'https://api.start.gg/gql/alpha';

/**
 * Cliente GraphQL para Start.gg
 */
export class StartGGClient {
  constructor(authToken) {
    this.authToken = authToken;
  }

  async query(query, variables = {}) {
    const response = await fetch(STARTGG_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`,
      },
      body: JSON.stringify({ query, variables }),
    });

    const result = await response.json();
    
    if (result.errors) {
      console.error('Start.gg GraphQL Error:', result.errors);
      throw new Error(result.errors[0].message);
    }

    return result.data;
  }
}

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Query: Obtener información del usuario actual
 */
export const GET_CURRENT_USER = `
  query GetCurrentUser {
    currentUser {
      id
      slug
      name
      gamerTag
      prefix
      location {
        city
        state
        country
      }
      images {
        url
        type
      }
      authorizations {
        id
        type
        externalUsername
      }
      events(query: {perPage: 10}) {
        nodes {
          id
          name
        }
      }
    }
  }
`;

/**
 * Query: Obtener torneo completo con brackets
 */
export const GET_TOURNAMENT = `
  query GetTournament($slug: String!) {
    tournament(slug: $slug) {
      id
      name
      slug
      city
      countryCode
      startAt
      endAt
      timezone
      currency
      isRegistrationOpen
      numAttendees
      events {
        id
        name
        slug
        numEntrants
        state
        startAt
        isOnline
        videogame {
          id
          name
          displayName
        }
        phases {
          id
          name
          numSeeds
          bracketType
          state
          startAt
        }
      }
    }
  }
`;

/**
 * Query: Obtener sets de una phase
 */
export const GET_PHASE_SETS = `
  query GetPhaseSets($phaseId: ID!, $page: Int!, $perPage: Int!) {
    phase(id: $phaseId) {
      id
      name
      sets(page: $page, perPage: $perPage, sortType: STANDARD) {
        pageInfo {
          total
          totalPages
        }
        nodes {
          id
          fullRoundText
          round
          identifier
          state
          winnerId
          totalGames
          completedAt
          startedAt
          slots {
            id
            entrant {
              id
              name
              initialSeedNum
              participants {
                id
                gamerTag
                prefix
                user {
                  id
                  gamerTag
                  images {
                    url
                    type
                  }
                }
              }
            }
            standing {
              placement
              stats {
                score {
                  value
                }
              }
            }
          }
          games {
            id
            orderNum
            winnerId
            stage {
              id
              name
            }
            selections {
              id
              entrant {
                id
              }
              character {
                id
                name
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * Query: Obtener un set específico
 */
export const GET_SET = `
  query GetSet($setId: ID!) {
    set(id: $setId) {
      id
      fullRoundText
      round
      identifier
      state
      winnerId
      totalGames
      completedAt
      startedAt
      slots {
        id
        entrant {
          id
          name
          participants {
            id
            gamerTag
            prefix
            user {
              id
            }
          }
        }
        standing {
          placement
          stats {
            score {
              value
            }
          }
        }
      }
      games {
        id
        orderNum
        winnerId
        stage {
          id
          name
        }
        selections {
          id
          entrant {
            id
          }
          character {
            id
            name
          }
        }
      }
    }
  }
`;

/**
 * Query: Buscar usuario por gamer tag
 */
export const SEARCH_USER = `
  query SearchUser($gamerTag: String!, $perPage: Int!) {
    user(slug: $gamerTag) {
      id
      gamerTag
      prefix
      name
      location {
        city
        state
        country
      }
      images {
        url
        type
      }
    }
  }
`;

/**
 * Query: Obtener entrants de un evento
 */
export const GET_EVENT_ENTRANTS = `
  query GetEventEntrants($eventId: ID!, $page: Int!, $perPage: Int!) {
    event(id: $eventId) {
      id
      name
      entrants(query: {page: $page, perPage: $perPage}) {
        pageInfo {
          total
          totalPages
        }
        nodes {
          id
          name
          initialSeedNum
          participants {
            id
            gamerTag
            prefix
            user {
              id
              gamerTag
              images {
                url
                type
              }
            }
          }
        }
      }
    }
  }
`;

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Mutation: Reportar resultado de un set
 */
export const REPORT_BRACKET_SET = `
  mutation ReportBracketSet(
    $setId: ID!
    $winnerId: ID!
    $isDQ: Boolean
    $gameData: [BracketSetGameDataInput]
  ) {
    reportBracketSet(
      setId: $setId
      winnerId: $winnerId
      isDQ: $isDQ
      gameData: $gameData
    ) {
      id
      state
      completedAt
      slots {
        id
        standing {
          placement
          stats {
            score {
              value
            }
          }
        }
      }
    }
  }
`;

/**
 * Mutation: Marcar set como en progreso
 */
export const MARK_SET_IN_PROGRESS = `
  mutation MarkSetInProgress($setId: ID!) {
    markSetInProgress(setId: $setId) {
      id
      state
      startedAt
    }
  }
`;

/**
 * Mutation: Actualizar scores de un set
 */
export const UPDATE_BRACKET_SET_SCORES = `
  mutation UpdateBracketSetScores(
    $setId: ID!
    $player1Score: Int!
    $player2Score: Int!
  ) {
    updateBracketSet(
      setId: $setId
      slots: [
        { slotIndex: 0, score: $player1Score }
        { slotIndex: 1, score: $player2Score }
      ]
    ) {
      id
      slots {
        standing {
          stats {
            score {
              value
            }
          }
        }
      }
    }
  }
`;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Construir datos de games para reportBracketSet
 */
export function buildGameData(games) {
  return games.map((game, index) => ({
    gameNum: index + 1,
    winnerId: game.winnerId,
    stageId: game.stageId,
    selections: game.characters.map(char => ({
      entrantId: char.entrantId,
      characterId: char.characterId,
    })),
  }));
}

/**
 * Extraer jugadores de un set
 */
export function extractPlayers(set) {
  const slot1 = set.slots[0];
  const slot2 = set.slots[1];

  return {
    player1: {
      entrantId: slot1.entrant?.id,
      name: slot1.entrant?.name,
      gamerTag: slot1.entrant?.participants[0]?.gamerTag,
      userId: slot1.entrant?.participants[0]?.user?.id,
      score: slot1.standing?.stats?.score?.value || 0,
    },
    player2: {
      entrantId: slot2.entrant?.id,
      name: slot2.entrant?.name,
      gamerTag: slot2.entrant?.participants[0]?.gamerTag,
      userId: slot2.entrant?.participants[0]?.user?.id,
      score: slot2.standing?.stats?.score?.value || 0,
    },
  };
}

/**
 * Determinar estado de un set
 */
export function getSetState(state) {
  // Start.gg states: 1=Pending, 2=InProgress, 3=Completed, 4=Called
  const states = {
    1: 'pending',
    2: 'in_progress',
    3: 'completed',
    4: 'called',
  };
  return states[state] || 'pending';
}

/**
 * Formatear fecha de Start.gg (timestamp Unix)
 */
export function formatStartGGDate(timestamp) {
  if (!timestamp) return null;
  return new Date(timestamp * 1000).toISOString();
}

/**
 * Validar si un usuario tiene permisos de admin en un torneo
 */
export async function checkTournamentAdmin(authToken, tournamentId, userId) {
  const client = new StartGGClient(authToken);
  
  const query = `
    query CheckTournamentAdmin($tournamentId: ID!) {
      tournament(id: $tournamentId) {
        admins {
          id
        }
      }
    }
  `;
  
  const data = await client.query(query, { tournamentId });
  return data.tournament.admins.some(admin => admin.id === userId);
}

// =============================================================================
// STAGE & CHARACTER IDs MAPPING
// =============================================================================

/**
 * IDs de stages en Start.gg (Ultimate)
 */
export const STARTGG_STAGES = {
  battlefield: 1,
  finalDestination: 2,
  smallBattlefield: 3,
  pokemonStadium2: 4,
  smashville: 5,
  townAndCity: 6,
  kalosLeague: 7,
  yoshisStory: 8,
  hollowBastion: 9,
};

/**
 * IDs de personajes en Start.gg (Ultimate) - Parcial
 */
export const STARTGG_CHARACTERS = {
  mario: 1,
  donkeyKong: 2,
  link: 3,
  samus: 4,
  darkSamus: 5,
  yoshi: 6,
  kirby: 7,
  fox: 8,
  pikachu: 9,
  luigi: 10,
  ness: 11,
  captainFalcon: 12,
  jigglypuff: 13,
  peach: 14,
  daisy: 15,
  bowser: 16,
  iceClimbers: 17,
  sheik: 18,
  zelda: 19,
  drMario: 20,
  pichu: 21,
  falco: 22,
  marth: 23,
  lucina: 24,
  youngLink: 25,
  ganondorf: 26,
  mewtwo: 27,
  roy: 28,
  chrom: 29,
  mrGameAndWatch: 30,
  metaKnight: 31,
  pit: 32,
  darkPit: 33,
  zeroSuitSamus: 34,
  wario: 35,
  snake: 36,
  ike: 37,
  pokemonTrainer: 38,
  diddyKong: 39,
  lucas: 40,
  sonic: 41,
  kingDedede: 42,
  olimar: 43,
  lucario: 44,
  rob: 45,
  toonLink: 46,
  wolf: 47,
  villager: 48,
  megaMan: 49,
  wiiFitTrainer: 50,
  rosalinaAndLuma: 51,
  littleMac: 52,
  greninja: 53,
  palutena: 54,
  pacman: 55,
  robin: 56,
  shulk: 57,
  bowserJr: 58,
  duckHunt: 59,
  ryu: 60,
  ken: 61,
  cloud: 62,
  corrin: 63,
  bayonetta: 64,
  inkling: 65,
  ridley: 66,
  simon: 67,
  richter: 68,
  kingKRool: 69,
  isabelle: 70,
  incineroar: 71,
  piranhaplant: 72,
  joker: 73,
  hero: 74,
  banjoKazooie: 75,
  terry: 76,
  byleth: 77,
  minMin: 78,
  steve: 79,
  sephiroth: 80,
  pythraMythra: 81,
  kazuya: 82,
  sora: 83,
};

/**
 * Mapear nombre de stage local a ID de Start.gg
 */
export function mapStageToStartGG(stageName) {
  const mapping = {
    'battlefield': STARTGG_STAGES.battlefield,
    'finalDest': STARTGG_STAGES.finalDestination,
    'smallBattlefield': STARTGG_STAGES.smallBattlefield,
    'pokemonStadium2': STARTGG_STAGES.pokemonStadium2,
    'smashville': STARTGG_STAGES.smashville,
    'townAndCity': STARTGG_STAGES.townAndCity,
    'kalosLeague': STARTGG_STAGES.kalosLeague,
  };
  return mapping[stageName] || null;
}

/**
 * Mapear nombre de personaje local a ID de Start.gg
 */
export function mapCharacterToStartGG(characterName) {
  return STARTGG_CHARACTERS[characterName] || null;
}

export default StartGGClient;
