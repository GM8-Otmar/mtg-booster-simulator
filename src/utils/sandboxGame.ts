/**
 * Builds fake GameRoom instances so the Game Table can run without the backend.
 */

import type { BattlefieldCard, GamePlayerState, GameRoom, ImportedDeckPayload } from '../types/game';

const SANDBOX_CARDS: { name: string; image: string; scryfallId: string }[] = [
  { name: 'Sol Ring', scryfallId: '14dbce79-1fcc-4cc9-bf38-7729e44a411e', image: '/api/cardimg/14dbce79-1fcc-4cc9-bf38-7729e44a411e' },
  { name: 'Lightning Bolt', scryfallId: '77c6fa74-5543-42ac-9ead-0e890b188e99', image: '/api/cardimg/77c6fa74-5543-42ac-9ead-0e890b188e99' },
  { name: 'Llanowar Elves', scryfallId: '6a0b230b-d391-4998-a3f7-7b158a0ec2cd', image: '/api/cardimg/6a0b230b-d391-4998-a3f7-7b158a0ec2cd' },
  { name: 'Counterspell', scryfallId: '4f616706-ec97-4923-bb1e-11a69fbaa1f8', image: '/api/cardimg/4f616706-ec97-4923-bb1e-11a69fbaa1f8' },
  { name: 'Dark Ritual', scryfallId: '95f27eeb-6f14-4db3-adb9-9be5ed76b34b', image: '/api/cardimg/95f27eeb-6f14-4db3-adb9-9be5ed76b34b' },
  { name: 'Birds of Paradise', scryfallId: '3d69a3e0-6a2e-475a-964e-0affed1c017d', image: '/api/cardimg/3d69a3e0-6a2e-475a-964e-0affed1c017d' },
  { name: 'Path to Exile', scryfallId: '35649ef0-b2fd-429f-be5f-766d5cea5994', image: '/api/cardimg/35649ef0-b2fd-429f-be5f-766d5cea5994' },
  { name: 'Thoughtseize', scryfallId: 'b281a308-ab6b-47b6-bec7-632c9aaecede', image: '/api/cardimg/b281a308-ab6b-47b6-bec7-632c9aaecede' },
  { name: 'Rampant Growth', scryfallId: 'b7c47024-5e08-4b17-b41a-7647f8b814b9', image: '/api/cardimg/b7c47024-5e08-4b17-b41a-7647f8b814b9' },
  { name: 'Giant Growth', scryfallId: 'bd0bf74e-14c1-4428-88d8-2181a080b5d0', image: '/api/cardimg/bd0bf74e-14c1-4428-88d8-2181a080b5d0' },
  { name: 'Swords to Plowshares', scryfallId: '0e7ff4dc-af63-4342-9a44-d059e62bd14c', image: '/api/cardimg/0e7ff4dc-af63-4342-9a44-d059e62bd14c' },
  { name: 'Murder', scryfallId: '2c249609-9cf7-46f1-b94c-9329add966bb', image: '/api/cardimg/2c249609-9cf7-46f1-b94c-9329add966bb' },
  { name: 'Swamp', scryfallId: '41c7688d-8155-45fd-83ba-ff9be4d414a3', image: '/api/cardimg/41c7688d-8155-45fd-83ba-ff9be4d414a3' },
  { name: 'Island', scryfallId: 'be2319a6-d089-4d13-8a7b-3552e654cdc5', image: '/api/cardimg/be2319a6-d089-4d13-8a7b-3552e654cdc5' },
  { name: 'Forest', scryfallId: '6194850b-d70a-4f3e-be3e-bfb23ce1170b', image: '/api/cardimg/6194850b-d70a-4f3e-be3e-bfb23ce1170b' },
  { name: 'Mountain', scryfallId: '6243f79f-b0e3-4fba-b899-7535e1a277e2', image: '/api/cardimg/6243f79f-b0e3-4fba-b899-7535e1a277e2' },
  { name: 'Plains', scryfallId: '1b405611-27d4-435a-8e8e-6d528626fd27', image: '/api/cardimg/1b405611-27d4-435a-8e8e-6d528626fd27' },
  { name: 'Arcane Signet', scryfallId: '049ca0ff-0ca4-44f7-b144-731cf453afa9', image: '/api/cardimg/049ca0ff-0ca4-44f7-b144-731cf453afa9' },
  { name: 'Command Tower', scryfallId: '4d51a621-be31-4b74-8e0b-3958180a8bc5', image: '/api/cardimg/4d51a621-be31-4b74-8e0b-3958180a8bc5' },
  { name: 'Cultivate', scryfallId: '4824ad7c-e533-4357-b486-9e908721db65', image: '/api/cardimg/4824ad7c-e533-4357-b486-9e908721db65' },
];

const COMMANDER_CARD = {
  name: "Atraxa, Praetors' Voice",
  scryfallId: 'd0d33d52-3d28-4635-b985-51e126289259',
  image: '/api/cardimg/d0d33d52-3d28-4635-b985-51e126289259',
};

let idCounter = 1;

function uid() {
  return `sandbox-${idCounter++}`;
}

function shuffle<T>(arr: T[]): T[] {
  const next = [...arr];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}

function makeEmptyPlayer(playerId: string, playerName: string): GamePlayerState {
  return {
    playerId,
    playerName,
    life: 40,
    poisonCounters: 0,
    commanderTax: 0,
    commanderDamageReceived: {},
    handCardIds: [],
    libraryCardIds: [],
    graveyardCardIds: [],
    exileCardIds: [],
    commandZoneCardIds: [],
    sideboardCardIds: [],
  };
}

function makeSandboxPlayer(
  playerId: string,
  playerName: string,
  roomCards: Record<string, BattlefieldCard>,
  includeCommander: boolean,
): GamePlayerState {
  const player = makeEmptyPlayer(playerId, playerName);
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
    player.libraryCardIds.push(instanceId);
  }

  if (includeCommander) {
    const commanderId = uid();
    roomCards[commanderId] = {
      instanceId: commanderId,
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
    player.commandZoneCardIds.push(commanderId);
  }

  return player;
}

export interface SandboxOptions {
  playerCount?: 1 | 2 | 3 | 4;
  playerName?: string;
}

const OPPONENT_NAMES = ['Opponent', 'Player 3', 'Player 4'];

export function createSandboxGame(options: SandboxOptions = {}): { room: GameRoom; playerId: string } {
  const { playerCount = 1, playerName = 'You' } = options;
  idCounter = 1;

  const myPlayerId = 'sandbox-player-me';
  const cards: Record<string, BattlefieldCard> = {};
  const players: Record<string, GamePlayerState> = {};

  players[myPlayerId] = makeSandboxPlayer(myPlayerId, playerName, cards, true);

  const extraCount = Math.max(0, playerCount - 1);
  for (let i = 0; i < extraCount; i++) {
    const opponentId = `sandbox-player-opp-${i + 1}`;
    players[opponentId] = makeSandboxPlayer(opponentId, OPPONENT_NAMES[i] ?? `Player ${i + 2}`, cards, true);
  }

  return {
    room: {
      id: 'sandbox-room',
      code: 'SANDBOX',
      hostId: myPlayerId,
      format: 'commander',
      status: 'active',
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      cards,
      players,
      actionLog: [],
      turnOrder: shuffle(Object.keys(players)),
      activePlayerIndex: 0,
    },
    playerId: myPlayerId,
  };
}

export function createSandboxGameFromDeck(
  deck: ImportedDeckPayload,
  options: SandboxOptions = {},
): { room: GameRoom; playerId: string } {
  const { playerName = 'You' } = options;
  idCounter = 1;

  const myPlayerId = 'sandbox-player-me';
  const cards: Record<string, BattlefieldCard> = {};
  const player = makeEmptyPlayer(myPlayerId, playerName);

  const makeCard = (
    entry: ImportedDeckPayload['mainboard'][number],
    zone: BattlefieldCard['zone'],
    isCommander = false,
  ) => {
    const instanceId = uid();
    cards[instanceId] = {
      instanceId,
      scryfallId: entry.preferredPrinting?.scryfallId ?? `sandbox-${entry.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name: entry.name,
      imageUri: entry.preferredPrinting?.imageUri ?? null,
      backImageUri: entry.preferredPrinting?.backImageUri ?? null,
      backName: entry.preferredPrinting?.backName ?? null,
      zone,
      controller: myPlayerId,
      x: 10 + Math.random() * 80,
      y: 10 + Math.random() * 80,
      tapped: false,
      faceDown: false,
      flipped: false,
      counters: [],
      isCommander,
    };
    return instanceId;
  };

  if (deck.commander) {
    player.commandZoneCardIds.push(makeCard(deck.commander, 'command_zone', true));
  }

  for (const entry of deck.mainboard) {
    for (let i = 0; i < entry.count; i++) {
      player.libraryCardIds.push(makeCard(entry, 'library'));
    }
  }

  for (const entry of deck.sideboard) {
    for (let i = 0; i < entry.count; i++) {
      player.sideboardCardIds.push(makeCard(entry, 'sideboard'));
    }
  }

  player.libraryCardIds = shuffle(player.libraryCardIds);

  return {
    room: {
      id: 'sandbox-room',
      code: 'SANDBOX',
      hostId: myPlayerId,
      format: 'commander',
      status: 'active',
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      cards,
      players: { [myPlayerId]: player },
      actionLog: [],
      turnOrder: [myPlayerId],
      activePlayerIndex: 0,
    },
    playerId: myPlayerId,
  };
}
