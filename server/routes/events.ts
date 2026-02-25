import { Router, Request, Response } from 'express';
import * as eventService from '../services/eventService';
import { broadcastEventUpdate, broadcastPlayerJoined } from '../index';
import { CreateEventRequest, JoinEventRequest, SelectLegendRequest } from '../types/server';
import axios from 'axios';

const router = Router();

/**
 * POST /api/events - Create new sealed event
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const request: CreateEventRequest = req.body;

    if (!request.hostName || !request.setCode || !request.boosterType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await eventService.createEvent(request);
    res.json(result);
  } catch (error) {
    console.error('Error creating event:', error);
    const message = error instanceof Error ? error.message : 'Failed to create event';
    const stack = error instanceof Error ? error.stack : undefined;
    if (stack) console.error(stack);
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/events/:code - Get event by code
 */
router.get('/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const event = await eventService.getEventByCode(code);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ event });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

/**
 * POST /api/events/:eventId/join - Join an event
 */
router.post('/:eventId/join', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const request: JoinEventRequest = req.body;

    if (!request.playerName) {
      return res.status(400).json({ error: 'Player name is required' });
    }

    // First try to get event by ID
    let event = await eventService.getEvent(eventId);

    // If not found, try by code (eventId might be the code)
    if (!event) {
      event = await eventService.getEventByCode(eventId);
    }

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const result = await eventService.joinEvent(event.code, request.playerName);
    // Notify everyone in the lobby that a new player joined
    const newPlayer = result.event.players.find(p => p.id === result.playerId);
    if (newPlayer) broadcastPlayerJoined(result.event.id, newPlayer);
    broadcastEventUpdate(result.event.id, result.event);
    res.json(result);
  } catch (error) {
    console.error('Error joining event:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to join event' });
  }
});

/**
 * POST /api/events/:eventId/start - Start an event (host only)
 */
router.post('/:eventId/start', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { playerId } = req.body;

    if (!playerId) {
      return res.status(400).json({ error: 'Player ID is required' });
    }

    const event = await eventService.startEvent(eventId, playerId);
    // Notify all lobby members the event has started
    broadcastEventUpdate(event.id, event);
    res.json({ event });
  } catch (error) {
    console.error('Error starting event:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to start event' });
  }
});

/**
 * POST /api/events/:eventId/next-pack - Open next pack
 */
router.post('/:eventId/next-pack', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { playerId } = req.body;

    if (!playerId) {
      return res.status(400).json({ error: 'Player ID is required' });
    }

    const result = await eventService.openNextPack(eventId, playerId);
    res.json(result);
  } catch (error) {
    console.error('Error opening pack:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to open pack' });
  }
});

/**
 * POST /api/events/:eventId/select-legend - Select commander legend
 */
router.post('/:eventId/select-legend', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { playerId, legendCard }: { playerId: string; legendCard: any } = req.body;

    if (!playerId || !legendCard) {
      return res.status(400).json({ error: 'Player ID and legend card are required' });
    }

    const player = await eventService.selectLegend(eventId, playerId, legendCard);
    res.json({ player });
  } catch (error) {
    console.error('Error selecting legend:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to select legend' });
  }
});

/**
 * GET /api/events/:eventId/pool - Get player's card pool
 */
router.get('/:eventId/pool', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { playerId } = req.query;

    if (!playerId || typeof playerId !== 'string') {
      return res.status(400).json({ error: 'Player ID is required' });
    }

    const result = await eventService.getPlayerPool(eventId, playerId);
    res.json(result);
  } catch (error) {
    console.error('Error fetching pool:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch pool' });
  }
});

/**
 * GET /api/sets/:setCode/legends - Get all legendary creatures from set
 */
router.get('/sets/:setCode/legends', async (req: Request, res: Response) => {
  try {
    const { setCode } = req.params;
    const query = `set:${setCode} t:legendary t:creature`;

    const response = await axios.get('https://api.scryfall.com/cards/search', {
      params: { q: query }
    });

    res.json({ legends: response.data.data || [] });
  } catch (error) {
    console.error('Error fetching legends:', error);

    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return res.json({ legends: [] });
    }

    res.status(500).json({ error: 'Failed to fetch legends' });
  }
});

export default router;
