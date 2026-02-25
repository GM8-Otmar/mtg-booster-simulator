/**
 * Singleton socket.io instance + broadcast helpers.
 * Extracted here so routes can import broadcast fns without creating
 * a circular dependency with server/index.ts.
 */
import { Server as SocketIOServer } from 'socket.io';

let _io: SocketIOServer | null = null;

export function initSocket(io: SocketIOServer): void {
  _io = io;
}

export function broadcastEventUpdate(eventId: string, event: any): void {
  _io?.to(eventId).emit('event-updated', event);
}

export function broadcastPlayerJoined(eventId: string, player: any): void {
  _io?.to(eventId).emit('player-joined', player);
}
