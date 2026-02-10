import React, { createContext, useContext, useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import type { SealedEvent, Player, BoosterPack, EventPhase } from '../types/sealed';
import type { ScryfallCard } from '../types/card';
import * as sealedApi from '../api/sealedApi';

interface SealedEventContextType {
  event: SealedEvent | null;
  currentPlayer: Player | null;
  playerId: string | null;
  phase: EventPhase;
  loading: boolean;
  error: string | null;
  createEvent: (hostName: string, setCode: string, boosterType: 'play' | 'collector') => Promise<void>;
  joinEvent: (code: string, playerName: string) => Promise<void>;
  startEvent: () => Promise<void>;
  openNextPack: () => Promise<BoosterPack>;
  selectLegend: (legend: ScryfallCard) => Promise<void>;
  leaveEvent: () => void;
}

const SealedEventContext = createContext<SealedEventContextType | undefined>(undefined);

// Use relative path for socket connection (goes through Vite proxy in dev)
const SOCKET_URL = import.meta.env.VITE_API_URL || window.location.origin;

export function SealedEventProvider({ children }: { children: React.ReactNode }) {
  const [event, setEvent] = useState<SealedEvent | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [phase, setPhase] = useState<EventPhase>('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Get current player from event
  const currentPlayer = event && playerId
    ? event.players.find(p => p.id === playerId) || null
    : null;

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(SOCKET_URL);

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket');
    });

    newSocket.on('event-updated', (updatedEvent: SealedEvent) => {
      console.log('Event updated:', updatedEvent);
      setEvent(updatedEvent);
    });

    newSocket.on('player-joined', (player: Player) => {
      console.log('Player joined:', player.name);
      // Event will be updated via event-updated event
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Update phase based on event status and player state
  useEffect(() => {
    if (!event || !currentPlayer) {
      return;
    }

    if (event.status === 'waiting') {
      setPhase('lobby');
    } else if (event.status === 'in_progress') {
      if (currentPlayer.packsOpened < 6) {
        setPhase('opening');
      } else if (!currentPlayer.selectedLegend) {
        setPhase('selecting_legend');
      } else {
        setPhase('complete');
      }
    } else if (event.status === 'completed') {
      setPhase('complete');
    }
  }, [event, currentPlayer]);

  // Join socket room when event changes
  useEffect(() => {
    if (socket && event) {
      socket.emit('join-event', event.id);
      return () => {
        socket.emit('leave-event', event.id);
      };
    }
  }, [socket, event]);

  const createEvent = async (hostName: string, setCode: string, boosterType: 'play' | 'collector') => {
    setLoading(true);
    setError(null);

    try {
      const response = await sealedApi.createEvent({ hostName, setCode, boosterType });
      setEvent(response.event);
      setPlayerId(response.playerId);
      setPhase('lobby');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const joinEvent = async (code: string, playerName: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await sealedApi.joinEvent(code, playerName);
      setEvent(response.event);
      setPlayerId(response.playerId);
      setPhase('lobby');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join event');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const startEvent = async () => {
    if (!event || !playerId) {
      throw new Error('No event or player ID');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await sealedApi.startEvent(event.id, playerId);
      setEvent(response.event);
      setPhase('opening');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start event');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const openNextPack = async (): Promise<BoosterPack> => {
    if (!event || !playerId) {
      throw new Error('No event or player ID');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await sealedApi.openNextPack(event.id, playerId);

      // Update the event with the new player state
      setEvent(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          players: prev.players.map(p =>
            p.id === playerId ? response.player : p
          ),
        };
      });

      return response.pack;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open pack');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const selectLegend = async (legend: ScryfallCard) => {
    if (!event || !playerId) {
      throw new Error('No event or player ID');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await sealedApi.selectLegend(event.id, playerId, legend);

      // Update the event with the new player state
      setEvent(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          players: prev.players.map(p =>
            p.id === playerId ? response.player : p
          ),
        };
      });

      setPhase('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select legend');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const leaveEvent = () => {
    if (socket && event) {
      socket.emit('leave-event', event.id);
    }
    setEvent(null);
    setPlayerId(null);
    setPhase('idle');
    setError(null);
  };

  return (
    <SealedEventContext.Provider
      value={{
        event,
        currentPlayer,
        playerId,
        phase,
        loading,
        error,
        createEvent,
        joinEvent,
        startEvent,
        openNextPack,
        selectLegend,
        leaveEvent,
      }}
    >
      {children}
    </SealedEventContext.Provider>
  );
}

export function useSealedEvent() {
  const context = useContext(SealedEventContext);
  if (!context) {
    throw new Error('useSealedEvent must be used within SealedEventProvider');
  }
  return context;
}
