import { useState } from 'react';
import { SealedEventProvider, useSealedEvent } from '../contexts/SealedEventContext';
import EventCreator from '../components/sealed/EventCreator';
import EventJoin from '../components/sealed/EventJoin';
import PackProgression from '../components/sealed/PackProgression';
import PoolView from '../components/sealed/PoolView';
import { Target, Link2 } from 'lucide-react';

function SealedEventContent() {
  const { phase, leaveEvent } = useSealedEvent();
  const [showCreateOrJoin, setShowCreateOrJoin] = useState<'create' | 'join' | null>(null);

  // Initial choice screen
  if (phase === 'idle' && !showCreateOrJoin) {
    return (
      <div className="min-h-screen bg-navy text-cream p-8 flex items-center justify-center">
        <div className="max-w-2xl w-full">
          <h1 className="text-4xl font-bold text-center mb-8 text-cream">
            Sealed Event
          </h1>

          <div className="grid md:grid-cols-2 gap-6">
            <button
              onClick={() => setShowCreateOrJoin('create')}
              className="bg-navy-light hover:border-magenta rounded-xl p-8 border-2 border-cyan-dim transition-all hover:scale-105 flex flex-col items-center text-center"
            >
              <Target className="w-12 h-12 mb-4 text-magenta shrink-0" />
              <h2 className="text-2xl font-bold text-magenta mb-2">Host Event</h2>
              <p className="text-cream-muted">Create a new sealed event and get a code to share</p>
            </button>

            <button
              onClick={() => setShowCreateOrJoin('join')}
              className="bg-navy-light hover:border-cyan rounded-xl p-8 border-2 border-cyan-dim transition-all hover:scale-105 flex flex-col items-center text-center"
            >
              <Link2 className="w-12 h-12 mb-4 text-cyan shrink-0" />
              <h2 className="text-2xl font-bold text-cyan mb-2">Join Event</h2>
              <p className="text-cream-muted">Enter a code to join an existing event</p>
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

  if (phase === 'complete') {
    return (
      <div className="min-h-screen bg-navy text-cream p-8">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <div className="mb-4">
            <button
              onClick={leaveEvent}
              className="px-4 py-2 bg-navy-light hover:bg-navy-light/80 rounded-lg transition-colors text-cream"
            >
              ← Leave Event
            </button>
          </div>

          <PoolView />
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
