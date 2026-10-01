import { useState, useEffect } from 'react';
import { lobbyManager } from '../game/lobbyManager';
import type { Lobby } from '../game/lobby';

interface LobbyBrowserProps {
  onCreateLobby: () => void;
  onJoinLobby: (lobbyId: string) => void;
}

export default function LobbyBrowser({ onCreateLobby, onJoinLobby }: LobbyBrowserProps) {
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'public' | 'private'>('all');

  useEffect(() => {
    const unsubscribe = lobbyManager.subscribe(() => {
      setLobbies(lobbyManager.getPublicLobbies());
    });
    setLobbies(lobbyManager.getPublicLobbies());
    return unsubscribe;
  }, []);

  const filteredLobbies = lobbies.filter(lobby => {
    const matchesSearch = lobby.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         lobby.hostName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || 
                         (filter === 'public' && !lobby.isPrivate) ||
                         (filter === 'private' && lobby.isPrivate);
    return matchesSearch && matchesFilter;
  });

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getStatusColor = (status: Lobby['status']) => {
    switch (status) {
      case 'waiting': return 'text-green-400';
      case 'starting': return 'text-yellow-400';
      case 'in-progress': return 'text-blue-400';
    }
  };

  const getStatusText = (status: Lobby['status']) => {
    switch (status) {
      case 'waiting': return 'Waiting';
      case 'starting': return 'Starting...';
      case 'in-progress': return 'In Progress';
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Study Lobbies</h1>
            <p className="text-gray-400">Join a room or create your own</p>
          </div>
          <button
            onClick={onCreateLobby}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Lobby
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search lobbies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pl-10 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
            <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Lobbies</option>
            <option value="public">Public Only</option>
            <option value="private">Private Only</option>
          </select>
        </div>
      </div>

      {/* Lobby List */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredLobbies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <svg className="w-24 h-24 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No lobbies found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery ? 'Try a different search term' : 'Be the first to create a study room!'}
            </p>
            <button
              onClick={onCreateLobby}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              Create a Lobby
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredLobbies.map((lobby) => (
              <div
                key={lobby.id}
                className="bg-gray-800 border border-gray-700 rounded-lg p-5 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-semibold text-white">{lobby.name}</h3>
                      {lobby.isPrivate && (
                        <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    {lobby.description && (
                      <p className="text-gray-400 text-sm mb-2">{lobby.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Host: <span className="text-gray-300">{lobby.hostName}</span></span>
                      <span>•</span>
                      <span>{formatTime(lobby.createdAt)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-semibold ${getStatusColor(lobby.status)}`}>
                      {getStatusText(lobby.status)}
                    </div>
                    <div className="text-gray-400 text-sm mt-1">
                      {lobby.currentPlayers.length}/{lobby.maxPlayers} players
                    </div>
                  </div>
                </div>

                {/* Settings Preview */}
                <div className="flex items-center gap-3 mb-4 text-xs text-gray-500">
                  {lobby.settings.pomodoroEnabled && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      {lobby.settings.pomodoroWork}/{lobby.settings.pomodoroBreak}min
                    </span>
                  )}
                  {lobby.settings.ambientSound !== 'none' && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.829a1 1 0 011.414 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.414-1.414A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                      </svg>
                      {lobby.settings.ambientSound}
                    </span>
                  )}
                  {lobby.settings.allowEmotes && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7zm-1.5 4a1 1 0 011-1h7a1 1 0 110 2h-7a1 1 0 01-1-1z" clipRule="evenodd" />
                      </svg>
                      Emotes
                    </span>
                  )}
                </div>

                {/* Join Button */}
                <button
                  onClick={() => onJoinLobby(lobby.id)}
                  disabled={lobby.status !== 'waiting' || lobby.currentPlayers.length >= lobby.maxPlayers}
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                >
                  {lobby.currentPlayers.length >= lobby.maxPlayers
                    ? 'Lobby Full'
                    : lobby.status !== 'waiting'
                    ? 'Already Started'
                    : 'Join Lobby'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
