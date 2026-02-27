import { Router, Request, Response } from 'express';
import * as gameService from '../services/gameService';
import * as storage from '../services/gameStorageService';
import { io } from '../index';
import type { ParsedDeck } from '../types/game';

const router = Router();
const GAME_ROOM = (id: string) => `game:${id}`;

/** POST /api/games — create a room */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { hostName, format = 'commander' } = req.body;
    if (!hostName) return res.status(400).json({ error: 'hostName is required' });
    const result = await gameService.createGame(hostName, format);
    res.json(result);
  } catch (err) {
    console.error('createGame error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to create game' });
  }
});

/** GET /api/games/:code — find by code */
router.get('/:code', async (req: Request, res: Response) => {
  try {
    const room = await storage.loadGameByCode(req.params.code!);
    if (!room) return res.status(404).json({ error: 'Game not found' });
    res.json({ room });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch game' });
  }
});

/** POST /api/games/:gameId/join */
router.post('/:gameId/join', async (req: Request, res: Response) => {
  try {
    const { playerName } = req.body;
    if (!playerName) return res.status(400).json({ error: 'playerName is required' });

    // accept either gameId or 6-char code in the param
    let room = await storage.loadGame(req.params.gameId!);
    if (!room) room = await storage.loadGameByCode(req.params.gameId!);
    if (!room) return res.status(404).json({ error: 'Game not found' });

    const result = await gameService.joinGame(room.code, playerName);
    res.json(result);
  } catch (err) {
    console.error('joinGame error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to join game' });
  }
});

/** POST /api/games/:gameId/import-deck */
router.post('/:gameId/import-deck', async (req: Request, res: Response) => {
  try {
    const { playerId, deck }: { playerId: string; deck: ParsedDeck } = req.body;
    if (!playerId || !deck) return res.status(400).json({ error: 'playerId and deck required' });
    const room = await gameService.importDeck(req.params.gameId!, playerId, deck);
    const joiningPlayer = room.players[playerId]!;
    const joiningCards: Record<string, (typeof room.cards)[string]> = {};
    for (const [cid, card] of Object.entries(room.cards)) {
      if (card.controller === playerId) joiningCards[cid] = card;
    }
    const socketsInRoom = await io.in(GAME_ROOM(room.id)).fetchSockets();
    console.log(`[MTG-SERVER] import-deck — player=${joiningPlayer.playerName} (${playerId.slice(0, 8)}), cards=${Object.keys(joiningCards).length}, room=${GAME_ROOM(room.id)}, sockets in room=${socketsInRoom.length}, turnOrder=`, room.turnOrder);
    io.to(GAME_ROOM(room.id)).emit('game:delta', {
      type: 'player_joined',
      player: joiningPlayer,
      cards: joiningCards,
      turnOrder: room.turnOrder,
      activePlayerIndex: room.activePlayerIndex,
    });
    res.json({ room });
  } catch (err) {
    console.error('importDeck error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to import deck' });
  }
});

export default router;
