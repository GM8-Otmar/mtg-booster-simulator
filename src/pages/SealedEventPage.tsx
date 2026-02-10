import { useState } from 'react';
import { SealedEventProvider, useSealedEvent } from '../contexts/SealedEventContext';
import EventCreator from '../components/sealed/EventCreator';
import EventJoin from '../components/sealed/EventJoin';
import PackProgression from '../components/sealed/PackProgression';
import LegendSelector from '../components/sealed/LegendSelector';
import PoolView from '../components/sealed/PoolView';
import DeckExporter from '../components/sealed/DeckExporter';

function SealedEventContent() {
  const { phase, leaveEvent } = useSealedEvent();
  const [showCreateOrJoin, setShowCreateOrJoin] = useState<'create' | 'join' | null>(null);

  // Initial choice screen
  if (phase === 'idle' && !showCreateOrJoin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8 flex items-center justify-center">
        <div className="max-w-2xl w-full">
          <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            Sealed Event
          </h1>

          <div className="grid md:grid-cols-2 gap-6">
            <button
              onClick={() => setShowCreateOrJoin('create')}
              className="bg-gray-800 hover:bg-gray-700 rounded-xl p-8 border-2 border-purple-500 transition-all hover:scale-105"
            >
              <div className="text-4xl mb-4">🎯</div>
              <h2 className="text-2xl font-bold text-purple-400 mb-2">Host Event</h2>
              <p className="text-gray-300">Create a new sealed event and get a code to share</p>
            </button>

            <button
              onClick={() => setShowCreateOrJoin('join')}
              className="bg-gray-800 hover:bg-gray-700 rounded-xl p-8 border-2 border-pink-500 transition-all hover:scale-105"
            >
              <div className="text-4xl mb-4">🔗</div>
              <h2 className="text-2xl font-bold text-pink-400 mb-2">Join Event</h2>
              <p className="text-gray-300">Enter a code to join an existing event</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show create or join form
  if (phase === 'idle') {
    if (showCreateOrJoin === 'create') {
      return <EventCreator />;
    }
    if (showCreateOrJoin === 'join') {
      return <EventJoin />;
    }
  }

  // Event phases
  if (phase === 'lobby') {
    return <EventCreator />; // EventCreator shows lobby when event exists
  }

  if (phase === 'opening') {
    return <PackProgression />;
  }

  if (phase === 'selecting_legend') {
    return <LegendSelector />;
  }

  if (phase === 'complete') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <div className="mb-4">
            <button
              onClick={leaveEvent}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              ← Leave Event
            </button>
          </div>

          <PoolView />

          <div className="mt-8">
            <DeckExporter />
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function SealedEventPage() {
  return (
    <SealedEventProvider>
      <SealedEventContent />
    </SealedEventProvider>
  );
}
