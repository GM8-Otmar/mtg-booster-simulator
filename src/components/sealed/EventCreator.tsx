import { useState } from 'react';
import { SetSelector } from '../SetSelector';
import { BoosterTypeSelector } from '../BoosterTypeSelector';
import { useSealedEvent } from '../../contexts/SealedEventContext';

export default function EventCreator() {
  const { createEvent, event, loading, error, startEvent, currentPlayer } = useSealedEvent();
  const [playerName, setPlayerName] = useState('');
  const [selectedSet, setSelectedSet] = useState('');
  const [boosterType, setBoosterType] = useState<'play' | 'collector'>('play');

  const handleCreateEvent = async () => {
    if (!playerName.trim() || !selectedSet) {
      alert('Please enter your name and select a set');
      return;
    }

    try {
      await createEvent(playerName.trim(), selectedSet, boosterType);
    } catch (err) {
      console.error('Failed to create event:', err);
    }
  };

  const handleStartEvent = async () => {
    try {
      await startEvent();
    } catch (err) {
      console.error('Failed to start event:', err);
    }
  };

  const getShareableUrl = () => {
    if (!event) return '';
    return `${window.location.origin}?join=${event.code}`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getShareableUrl());
    alert('Event code copied to clipboard!');
  };

  if (event) {
    // Show lobby with event code and players
    const isHost = currentPlayer?.id === event.hostId;

    return (
      <div className="min-h-screen bg-navy text-cream p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-8 text-cream">
            Event Lobby
          </h1>

          {/* Event Code */}
          <div className="bg-navy-light rounded-xl p-6 mb-6 border-2 border-magenta">
            <div className="text-center">
              <p className="text-cream-muted mb-2">Event Code</p>
              <div className="flex items-center justify-center gap-4">
                <p className="text-4xl font-mono font-bold text-magenta">
                  {event.code}
                </p>
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-magenta hover:bg-magenta/90 rounded-lg transition-colors text-cream"
                >
                  Copy Link
                </button>
              </div>
              <p className="text-cream-muted text-sm mt-2">
                Share this code with your friends
              </p>
            </div>
          </div>

          {/* Event Details */}
          <div className="bg-navy-light rounded-xl p-6 mb-6 border border-cyan-dim">
            <h2 className="text-xl font-bold mb-4 text-cyan">Event Details</h2>
            <div className="grid grid-cols-2 gap-4 text-cream-muted">
              <div>
                <span className="text-cream-muted">Set:</span> {event.setCode.toUpperCase()}
              </div>
              <div>
                <span className="text-cream-muted">Type:</span> {event.boosterType === 'play' ? 'Play Booster' : 'Collector Booster'}
              </div>
            </div>
          </div>

          {/* Players List */}
          <div className="bg-navy-light rounded-xl p-6 mb-6 border border-cyan-dim">
            <h2 className="text-xl font-bold mb-4 text-cyan">
              Players ({event.players.length})
            </h2>
            <div className="space-y-2">
              {event.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between bg-navy rounded-lg p-3 border border-cyan-dim"
                >
                  <span className="font-medium text-cream">{player.name}</span>
                  {player.id === event.hostId && (
                    <span className="text-xs bg-magenta text-cream px-2 py-1 rounded-full font-bold">
                      HOST
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Start Button (Host Only) */}
          {isHost && (
            <button
              onClick={handleStartEvent}
              disabled={loading || event.players.length < 1}
              className="w-full py-4 bg-magenta hover:bg-magenta/90 rounded-xl font-bold text-lg text-cream disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Starting...' : 'Start Event'}
            </button>
          )}

          {!isHost && (
            <p className="text-center text-cream-muted">
              Waiting for host to start the event...
            </p>
          )}

          {error && (
            <p className="text-center text-red-400 mt-4">{error}</p>
          )}
        </div>
      </div>
    );
  }

  // Show event creation form
  return (
    <div className="min-h-screen bg-navy text-cream p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-cream">
          Create Sealed Event
        </h1>

        <div className="bg-navy-light rounded-xl p-8 space-y-6 border border-cyan-dim">
          {/* Player Name */}
          <div>
            <label className="block text-sm font-medium text-cream-muted mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 bg-navy border border-cyan-dim rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan text-cream"
            />
          </div>

          {/* Set Selector */}
          <div>
            <label className="block text-sm font-medium text-cream-muted mb-2">
              Magic Set
            </label>
            <SetSelector
              selectedSet={selectedSet}
              onSetChange={setSelectedSet}
            />
          </div>

          {/* Booster Type */}
          <div>
            <label className="block text-sm font-medium text-cream-muted mb-2">
              Booster Type
            </label>
            <BoosterTypeSelector
              selected={boosterType}
              onChange={setBoosterType}
              disabled={false}
            />
          </div>

          {/* Create Button */}
          <button
            onClick={handleCreateEvent}
            disabled={loading || !playerName.trim() || !selectedSet}
            className="w-full py-4 bg-magenta hover:bg-magenta/90 rounded-xl font-bold text-lg text-cream disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Creating Event...' : 'Create Event'}
          </button>

          {error && (
            <p className="text-center text-red-400">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
