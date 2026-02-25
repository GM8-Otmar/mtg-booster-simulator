/**
 * Builds a fake GameRoom populated with a sample deck so you can test
 * the Game Table UI without needing the backend server.
 */

import type { GameRoom, BattlefieldCard, GamePlayerState } from '../types/game';

const SANDBOX_CARDS: { name: string; image: string; scryfallId: string }[] = [
  { name: 'Sol Ring',           scryfallId: 'f5fca2ef-7263-4873-bdca-8fba7ed6de35', image: '/api/cardimg/f5fca2ef-7263-4873-bdca-8fba7ed6de35' },
  { name: 'Lightning Bolt',     scryfallId: 'e3285e6b-3e79-4d7c-bf96-d920f973b122', image: '/api/cardimg/e3285e6b-3e79-4d7c-bf96-d920f973b122' },
  { name: 'Llanowar Elves',     scryfallId: 'b63a7b2c-6e72-4f06-b98d-2f18cc34b3f6', image: '/api/cardimg/b63a7b2c-6e72-4f06-b98d-2f18cc34b3f6' },
  { name: 'Counterspell',       scryfallId: '8e2e3aed-a8cd-4fcc-a673-82d5df8f887c', image: '/api/cardimg/8e2e3aed-a8cd-4fcc-a673-82d5df8f887c' },
  { name: 'Dark Ritual',        scryfallId: '7bad3bda-c45f-4cf7-aba5-4fd0bde71cc2', image: '/api/cardimg/7bad3bda-c45f-4cf7-aba5-4fd0bde71cc2' },
  { name: 'Birds of Paradise',  scryfallId: '50f55c78-bb96-4b94-bf30-9a444d31a96f', image: '/api/cardimg/50f55c78-bb96-4b94-bf30-9a444d31a96f' },
  { name: 'Path to Exile',      scryfallId: '5ebb0d32-8a50-4516-a643-e81bc3714a03', image: '/api/cardimg/5ebb0d32-8a50-4516-a643-e81bc3714a03' },
  { name: 'Thoughtseize',       scryfallId: 'b80dd263-b8d3-4b1c-9893-f9e9ec43cf82', image: '/api/cardimg/b80dd263-b8d3-4b1c-9893-f9e9ec43cf82' },
  { name: 'Rampant Growth',     scryfallId: '92a91b7f-0e9d-4b10-9a51-32cfeaaecc5b', image: '/api/cardimg/92a91b7f-0e9d-4b10-9a51-32cfeaaecc5b' },
  { name: 'Giant Growth',       scryfallId: '0d8ec4e1-a9e3-4e42-b6af-c9ed3ef04f39', image: '/api/cardimg/0d8ec4e1-a9e3-4e42-b6af-c9ed3ef04f39' },
  { name: 'Swords to Plowshares', scryfallId: '3ecd2a41-a353-4fc1-b197-c2e9cdbf91c2', image: '/api/cardimg/3ecd2a41-a353-4fc1-b197-c2e9cdbf91c2' },
  { name: 'Murder',             scryfallId: 'dd2cd576-99e0-40fb-9a66-c4d5b3acbc1c', image: '/api/cardimg/dd2cd576-99e0-40fb-9a66-c4d5b3acbc1c' },
  { name: 'Swamp',              scryfallId: 'ad0a6b52-44ad-45d9-958e-c24f33dca4bc', image: '/api/cardimg/ad0a6b52-44ad-45d9-958e-c24f33dca4bc' },
  { name: 'Island',             scryfallId: '4d9a3bbe-d31a-43b9-a18a-75a8c2d28e3c', image: '/api/cardimg/4d9a3bbe-d31a-43b9-a18a-75a8c2d28e3c' },
  { name: 'Forest',             scryfallId: 'e9bdf6f8-8991-4cf9-bcf0-ea3f9ffd5038', image: '/api/cardimg/e9bdf6f8-8991-4cf9-bcf0-ea3f9ffd5038' },
  { name: 'Mountain',           scryfallId: 'e24e0428-a997-4041-b665-3c62c2b10e04', image: '/api/cardimg/e24e0428-a997-4041-b665-3c62c2b10e04' },
  { name: 'Plains',             scryfallId: '3c6a9a37-c61e-43bc-b3c4-2ba4f25c5bbc', image: '/api/cardimg/3c6a9a37-c61e-43bc-b3c4-2ba4f25c5bbc' },
  { name: 'Arcane Signet',      scryfallId: 'e5a1c0f0-78ea-4ffe-afba-ef0c4e28f2b9', image: '/api/cardimg/e5a1c0f0-78ea-4ffe-afba-ef0c4e28f2b9' },
  { name: 'Command Tower',      scryfallId: 'a11a0e45-8bd4-4ca6-9db2-f9413ae7a2e8', image: '/api/cardimg/a11a0e45-8bd4-4ca6-9db2-f9413ae7a2e8' },
  { name: 'Cultivate',          scryfallId: '0f089e08-c6c4-4b97-bd94-e24900b1cbf9', image: '/api/cardimg/0f089e08-c6c4-4b97-bd94-e24900b1cbf9' },
];

const COMMANDER_CARD = {
  name: "Atraxa, Praetors' Voice",
  scryfallId: 'd0d33d52-3d28-4635-b985-ef3b579c6b35',
  image: '/api/cardimg/d0d33d52-3d28-4635-b985-ef3b579c6b35',
};

let idCounter = 1;
function uid() { return `sandbox-${idCounter++}`; }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function makeSandboxPlayer(
  playerId: string,
  playerName: string,
  roomCards: Record<string, BattlefieldCard>,
  includeCommander: boolean,
): GamePlayerState {
  const libraryIds: string[] = [];

  // Build library from sample cards (x2 each for ~40 cards)
  const deckCards = shuffle([...SANDBOX_CARDS, ...SANDBOX_CARDS]);
  for (const item of deckCards) {
    const instanceId = uid();
    roomCards[instanceId] = {
      instanceId,
      scryfallId: item.scryfallId,
      name: item.name,
      imageUri: item.image,
      zone: 'library',
      controller: playerId,
      x: 10 + Math.random() * 80,
      y: 10 + Math.random() * 80,
      tapped: false,
      faceDown: false,
      flipped: false,
      counters: [],
      isCommander: false,
    };
    libraryIds.push(instanceId);
  }

  const commandZoneCardIds: string[] = [];
  if (includeCommander) {
    const cmdId = uid();
    roomCards[cmdId] = {
      instanceId: cmdId,
      scryfallId: COMMANDER_CARD.scryfallId,
      name: COMMANDER_CARD.name,
      imageUri: COMMANDER_CARD.image,
      zone: 'command_zone',
      controller: playerId,
      x: 50,
      y: 50,
      tapped: false,
      faceDown: false,
      flipped: false,
      counters: [],
      isCommander: true,
    };
    commandZoneCardIds.push(cmdId);
  }

  return {
    playerId,
    playerName,
    life: 40,
    poisonCounters: 0,
    commanderTax: 0,
    commanderDamageReceived: {},
    handCardIds: [],
    libraryCardIds: libraryIds,
    graveyardCardIds: [],
    exileCardIds: [],
    commandZoneCardIds,
    sideboardCardIds: [],
  };
}

export interface SandboxOptions {
  /** Number of virtual players to pre-populate (1 or 2). Default: 1 */
  playerCount?: 1 | 2;
  /** Your player name. Default: 'You' */
  playerName?: string;
}

export function createSandboxGame(options: SandboxOptions = {}): {
  room: GameRoom;
  playerId: string;
} {
  const { playerCount = 1, playerName = 'You' } = options;
  idCounter = 1;

  const roomId = 'sandbox-room';
  const myPlayerId = 'sandbox-player-me';
  const cards: Record<string, BattlefieldCard> = {};
  const players: Record<string, GamePlayerState> = {};

  players[myPlayerId] = makeSandboxPlayer(myPlayerId, playerName, cards, true);

  if (playerCount === 2) {
    const oppId = 'sandbox-player-opp';
    players[oppId] = makeSandboxPlayer(oppId, 'Opponent', cards, true);
  }

  const room: GameRoom = {
    id: roomId,
    code: 'SANDBOX',
    hostId: myPlayerId,
    format: 'commander',
    status: 'active',
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    cards,
    players,
    actionLog: [],
  };

  return { room, playerId: myPlayerId };
}
