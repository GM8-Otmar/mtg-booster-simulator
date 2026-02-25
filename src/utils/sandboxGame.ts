/**
 * Builds a fake GameRoom populated with a sample deck so you can test
 * the Game Table UI without needing the backend server.
 */

import type { GameRoom, BattlefieldCard, GamePlayerState } from '../types/game';

const SANDBOX_CARDS: { name: string; image: string }[] = [
  { name: 'Sol Ring',           image: 'https://cards.scryfall.io/normal/front/f/5/f5fca2ef-7263-4873-bdca-8fba7ed6de35.jpg' },
  { name: 'Lightning Bolt',     image: 'https://cards.scryfall.io/normal/front/e/3/e3285e6b-3e79-4d7c-bf96-d920f973b122.jpg' },
  { name: 'Llanowar Elves',     image: 'https://cards.scryfall.io/normal/front/b/6/b63a7b2c-6e72-4f06-b98d-2f18cc34b3f6.jpg' },
  { name: 'Counterspell',       image: 'https://cards.scryfall.io/normal/front/8/e/8e2e3aed-a8cd-4fcc-a673-82d5df8f887c.jpg' },
  { name: 'Dark Ritual',        image: 'https://cards.scryfall.io/normal/front/7/b/7bad3bda-c45f-4cf7-aba5-4fd0bde71cc2.jpg' },
  { name: 'Birds of Paradise',  image: 'https://cards.scryfall.io/normal/front/5/0/50f55c78-bb96-4b94-bf30-9a444d31a96f.jpg' },
  { name: 'Path to Exile',      image: 'https://cards.scryfall.io/normal/front/5/e/5ebb0d32-8a50-4516-a643-e81bc3714a03.jpg' },
  { name: 'Thoughtseize',       image: 'https://cards.scryfall.io/normal/front/b/8/b80dd263-b8d3-4b1c-9893-f9e9ec43cf82.jpg' },
  { name: 'Rampant Growth',     image: 'https://cards.scryfall.io/normal/front/9/2/92a91b7f-0e9d-4b10-9a51-32cfeaaecc5b.jpg' },
  { name: 'Giant Growth',       image: 'https://cards.scryfall.io/normal/front/0/d/0d8ec4e1-a9e3-4e42-b6af-c9ed3ef04f39.jpg' },
  { name: 'Swords to Plowshares', image: 'https://cards.scryfall.io/normal/front/3/e/3ecd2a41-a353-4fc1-b197-c2e9cdbf91c2.jpg' },
  { name: 'Murder',             image: 'https://cards.scryfall.io/normal/front/d/d/dd2cd576-99e0-40fb-9a66-c4d5b3acbc1c.jpg' },
  { name: 'Swamp',              image: 'https://cards.scryfall.io/normal/front/a/d/ad0a6b52-44ad-45d9-958e-c24f33dca4bc.jpg' },
  { name: 'Island',             image: 'https://cards.scryfall.io/normal/front/4/d/4d9a3bbe-d31a-43b9-a18a-75a8c2d28e3c.jpg' },
  { name: 'Forest',             image: 'https://cards.scryfall.io/normal/front/e/9/e9bdf6f8-8991-4cf9-bcf0-ea3f9ffd5038.jpg' },
  { name: 'Mountain',           image: 'https://cards.scryfall.io/normal/front/e/2/e24e0428-a997-4041-b665-3c62c2b10e04.jpg' },
  { name: 'Plains',             image: 'https://cards.scryfall.io/normal/front/3/c/3c6a9a37-c61e-43bc-b3c4-2ba4f25c5bbc.jpg' },
  { name: 'Arcane Signet',      image: 'https://cards.scryfall.io/normal/front/e/5/e5a1c0f0-78ea-4ffe-afba-ef0c4e28f2b9.jpg' },
  { name: 'Command Tower',      image: 'https://cards.scryfall.io/normal/front/a/1/a11a0e45-8bd4-4ca6-9db2-f9413ae7a2e8.jpg' },
  { name: 'Cultivate',          image: 'https://cards.scryfall.io/normal/front/0/f/0f089e08-c6c4-4b97-bd94-e24900b1cbf9.jpg' },
];

const COMMANDER_CARD = {
  name: "Atraxa, Praetors' Voice",
  image: 'https://cards.scryfall.io/normal/front/d/0/d0d33d52-3d28-4635-b985-ef3b579c6b35.jpg',
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
  for (const { name, image } of deckCards) {
    const instanceId = uid();
    roomCards[instanceId] = {
      instanceId,
      scryfallId: instanceId,
      name,
      imageUri: image,
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
      scryfallId: cmdId,
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
