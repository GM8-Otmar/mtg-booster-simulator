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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            Event Lobby
          </h1>

          {/* Event Code */}
          <div className="bg-gray-800 rounded-xl p-6 mb-6 border-2 border-purple-500">
            <div className="text-center">
              <p className="text-gray-400 mb-2">Event Code</p>
              <div className="flex items-center justify-center gap-4">
                <p className="text-4xl font-mono font-bold text-purple-400">
                  {event.code}
                </p>
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                >
                  Copy Link
                </button>
              </div>
              <p className="text-gray-500 text-sm mt-2">
                Share this code with your friends
              </p>
            </div>
          </div>

          {/* Event Details */}
          <div className="bg-gray-800 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 text-purple-400">Event Details</h2>
            <div className="grid grid-cols-2 gap-4 text-gray-300">
              <div>
                <span className="text-gray-500">Set:</span> {event.setCode.toUpperCase()}
              </div>
              <div>
                <span className="text-gray-500">Type:</span> {event.boosterType === 'play' ? 'Play Booster' : 'Collector Booster'}
              </div>
            </div>
          </div>

          {/* Players List */}
          <div className="bg-gray-800 rounded-xl p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 text-purple-400">
              Players ({event.players.length})
            </h2>
            <div className="space-y-2">
              {event.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between bg-gray-700 rounded-lg p-3"
                >
                  <span className="font-medium">{player.name}</span>
                  {player.id === event.hostId && (
                    <span className="text-xs bg-amber-500 text-gray-900 px-2 py-1 rounded-full font-bold">
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
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Starting...' : 'Start Event'}
            </button>
          )}

          {!isHost && (
            <p className="text-center text-gray-400">
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
          Create Sealed Event
        </h1>

        <div className="bg-gray-800 rounded-xl p-8 space-y-6">
          {/* Player Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
            />
          </div>

          {/* Set Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Magic Set
            </label>
            <SetSelector
              selectedSet={selectedSet}
              onSetChange={setSelectedSet}
            />
          </div>

          {/* Booster Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
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
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
