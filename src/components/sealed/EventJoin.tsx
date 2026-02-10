import { useState } from 'react';
import { useSealedEvent } from '../../contexts/SealedEventContext';

export default function EventJoin() {
  const { joinEvent, loading, error } = useSealedEvent();
  const [eventCode, setEventCode] = useState('');
  const [playerName, setPlayerName] = useState('');

  const handleJoinEvent = async () => {
    if (!eventCode.trim() || !playerName.trim()) {
      alert('Please enter both event code and your name');
      return;
    }

    try {
      await joinEvent(eventCode.trim().toUpperCase(), playerName.trim());
    } catch (err) {
      console.error('Failed to join event:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
          Join Sealed Event
        </h1>

        <div className="bg-gray-800 rounded-xl p-8 space-y-6">
          {/* Event Code */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Event Code
            </label>
            <input
              type="text"
              value={eventCode}
              onChange={(e) => setEventCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-character code"
              maxLength={6}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white font-mono text-center text-2xl tracking-widest uppercase"
            />
          </div>

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

          {/* Join Button */}
          <button
            onClick={handleJoinEvent}
            disabled={loading || !eventCode.trim() || !playerName.trim()}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Joining...' : 'Join Event'}
          </button>

          {error && (
            <div className="bg-red-500/10 border border-red-500 rounded-lg p-4">
              <p className="text-red-400 text-center">{error}</p>
            </div>
          )}

          <div className="text-center text-gray-400 text-sm">
            <p>Ask the host for the event code</p>
          </div>
        </div>
      </div>
    </div>
  );
}
