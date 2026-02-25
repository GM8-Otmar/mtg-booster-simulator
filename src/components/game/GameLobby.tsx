import { useState } from 'react';
import { useGameTable } from '../../contexts/GameTableContext';
import { createSandboxGame } from '../../utils/sandboxGame';

interface GameLobbyProps {
  onEnterTable: (isSandbox?: boolean) => void;
}

type LobbyTab = 'create' | 'join';

export default function GameLobby({ onEnterTable }: GameLobbyProps) {
  const { createGame, joinGame, loadSandbox, loading, error } = useGameTable();
  const [tab, setTab] = useState<LobbyTab>('create');

  // Create fields
  const [createName, setCreateName] = useState('');
  const [format, setFormat] = useState<'commander' | 'limited' | 'free'>('commander');
  const [roomCode, setRoomCode] = useState('');

  // Join fields
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');

  // Sandbox fields
  const [sandboxName, setSandboxName] = useState('You');
  const [sandboxPlayers, setSandboxPlayers] = useState<1 | 2>(1);

  const handleCreate = async () => {
    if (!createName.trim()) return;
    try {
      const code = await createGame(createName.trim(), format);
      setRoomCode(code);
      onEnterTable();
    } catch {
      // error set in context
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim() || !joinName.trim()) return;
    try {
      await joinGame(joinCode.trim().toUpperCase(), joinName.trim());
      onEnterTable();
    } catch {
      // error set in context
    }
  };

  const handleSandbox = () => {
    const { room, playerId } = createSandboxGame({
      playerCount: sandboxPlayers,
      playerName: sandboxName.trim() || 'You',
    });
    loadSandbox(room, playerId, sandboxName.trim() || 'You');
    onEnterTable(true); // isSandbox = true
  };

  return (
    <div className="min-h-screen bg-navy text-cream flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <h1 className="text-4xl font-bold text-center mb-2 text-cream">Game Table</h1>
        <p className="text-center text-cream-muted mb-8 text-sm">
          Play with friends — import any deck, any format
        </p>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-navy-light rounded-xl p-1">
          {(['create', 'join'] as LobbyTab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all capitalize ${
                tab === t
                  ? 'bg-cyan text-navy'
                  : 'text-cream-muted hover:text-cream'
              }`}
            >
              {t === 'create' ? 'Host a Game' : 'Join a Game'}
            </button>
          ))}
        </div>

        {/* Create */}
        {tab === 'create' && (
          <div className="bg-navy-light rounded-xl p-6 border border-cyan-dim space-y-4">
            <div>
              <label className="block text-sm text-cream-muted mb-1">Your Name</label>
              <input
                type="text"
                value={createName}
                onChange={e => setCreateName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="e.g. Alex"
                className="w-full bg-navy border border-cyan-dim rounded-lg px-3 py-2 text-cream placeholder-cream-muted/50 focus:outline-none focus:border-cyan"
              />
            </div>

            <div>
              <label className="block text-sm text-cream-muted mb-1">Format</label>
              <select
                value={format}
                onChange={e => setFormat(e.target.value as any)}
                className="w-full bg-navy border border-cyan-dim rounded-lg px-3 py-2 text-cream focus:outline-none focus:border-cyan"
              >
                <option value="commander">Commander (40 life)</option>
                <option value="limited">Limited / Sealed (20 life)</option>
                <option value="free">Free Play</option>
              </select>
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              onClick={handleCreate}
              disabled={loading || !createName.trim()}
              className="w-full py-3 bg-cyan hover:bg-cyan/90 rounded-xl font-bold text-navy disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Creating…' : 'Create Game'}
            </button>

            {roomCode && (
              <div className="text-center">
                <p className="text-cream-muted text-xs mb-1">Room code — share with friends:</p>
                <p className="text-3xl font-mono font-bold tracking-widest text-cyan">{roomCode}</p>
              </div>
            )}
          </div>
        )}

        {/* Join */}
        {tab === 'join' && (
          <div className="bg-navy-light rounded-xl p-6 border border-magenta/40 space-y-4">
            <div>
              <label className="block text-sm text-cream-muted mb-1">Room Code</label>
              <input
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. AB12CD"
                maxLength={8}
                className="w-full bg-navy border border-cyan-dim rounded-lg px-3 py-2 text-cream placeholder-cream-muted/50 font-mono tracking-widest uppercase focus:outline-none focus:border-magenta"
              />
            </div>

            <div>
              <label className="block text-sm text-cream-muted mb-1">Your Name</label>
              <input
                type="text"
                value={joinName}
                onChange={e => setJoinName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                placeholder="e.g. Jordan"
                className="w-full bg-navy border border-cyan-dim rounded-lg px-3 py-2 text-cream placeholder-cream-muted/50 focus:outline-none focus:border-magenta"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              onClick={handleJoin}
              disabled={loading || !joinCode.trim() || !joinName.trim()}
              className="w-full py-3 bg-magenta hover:bg-magenta/90 rounded-xl font-bold text-cream disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Joining…' : 'Join Game'}
            </button>
          </div>
        )}

        {/* ── Sandbox / Debug section ─────────────────────────────────── */}
        <div className="mt-6 bg-navy-light/50 rounded-xl border border-dashed border-yellow-600/40 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-yellow-400 text-sm">🧪</span>
            <span className="text-yellow-400 font-semibold text-sm">Sandbox Mode</span>
            <span className="text-cream-muted text-xs ml-auto">No server needed</span>
          </div>

          <p className="text-cream-muted text-xs mb-3">
            Test the table UI instantly with a pre-built deck — all actions run locally.
          </p>

          <div className="flex gap-2 mb-3">
            <div className="flex-1">
              <label className="block text-xs text-cream-muted mb-1">Your name</label>
              <input
                type="text"
                value={sandboxName}
                onChange={e => setSandboxName(e.target.value)}
                className="w-full bg-navy border border-yellow-600/30 rounded-lg px-2 py-1.5 text-cream text-sm placeholder-cream-muted/40 focus:outline-none focus:border-yellow-500"
              />
            </div>
            <div>
              <label className="block text-xs text-cream-muted mb-1">Players</label>
              <select
                value={sandboxPlayers}
                onChange={e => setSandboxPlayers(Number(e.target.value) as 1 | 2)}
                className="h-[34px] bg-navy border border-yellow-600/30 rounded-lg px-2 text-cream text-sm focus:outline-none focus:border-yellow-500"
              >
                <option value={1}>1 (solo)</option>
                <option value={2}>2 (vs AI)</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleSandbox}
            className="w-full py-2.5 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-600/50 rounded-xl font-bold text-yellow-400 text-sm transition-all"
          >
            🧪 Launch Sandbox
          </button>
        </div>

      </div>
    </div>
  );
}
