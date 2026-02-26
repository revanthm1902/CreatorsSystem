import { useEffect } from 'react';
import { useUserStore } from '../stores/userStore';
import { Trophy, Zap, Medal, Award } from 'lucide-react';

export function LeaderboardPage() {
  const { leaderboard, fetchLeaderboard } = useUserStore();

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-6 h-6 text-yellow-400" />;
    if (index === 1) return <Medal className="w-6 h-6 text-gray-300" />;
    if (index === 2) return <Award className="w-6 h-6 text-orange-400" />;
    return null;
  };

  const getRankStyle = (index: number) => {
    if (index === 0) return 'bg-yellow-500/10 border-yellow-500/30';
    if (index === 1) return 'bg-gray-400/10 border-gray-400/30';
    if (index === 2) return 'bg-orange-500/10 border-orange-500/30';
    return 'bg-surface-800 border-surface-600';
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Trophy className="w-8 h-8 text-accent" />
          Leaderboard
        </h1>
        <p className="text-gray-400 mt-1">Top performers ranked by tokens earned</p>
      </div>

      {/* Top 3 Podium */}
      {leaderboard.length >= 3 && (
        <div className="flex items-end justify-center gap-4 mb-8">
          {/* 2nd Place */}
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-gray-400/20 rounded-full flex items-center justify-center mb-2 border-2 border-gray-400/50">
              <span className="text-2xl font-bold text-gray-300">2</span>
            </div>
            <div className="bg-surface-800 rounded-lg p-4 text-center w-32 h-28">
              <p className="text-white font-medium truncate">{leaderboard[1]?.full_name}</p>
              <div className="flex items-center justify-center gap-1 text-accent mt-2">
                <Zap className="w-4 h-4" />
                <span className="font-bold">{leaderboard[1]?.total_tokens}</span>
              </div>
            </div>
          </div>

          {/* 1st Place */}
          <div className="flex flex-col items-center -mt-8">
            <div className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center mb-2 border-2 border-yellow-500/50">
              <Trophy className="w-10 h-10 text-yellow-400" />
            </div>
            <div className="bg-surface-800 rounded-lg p-4 text-center w-36 h-32 border border-yellow-500/30">
              <p className="text-white font-semibold truncate">{leaderboard[0]?.full_name}</p>
              <div className="flex items-center justify-center gap-1 text-yellow-400 mt-2">
                <Zap className="w-5 h-5" />
                <span className="text-xl font-bold">{leaderboard[0]?.total_tokens}</span>
              </div>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mb-2 border-2 border-orange-500/50">
              <span className="text-2xl font-bold text-orange-400">3</span>
            </div>
            <div className="bg-surface-800 rounded-lg p-4 text-center w-32 h-28">
              <p className="text-white font-medium truncate">{leaderboard[2]?.full_name}</p>
              <div className="flex items-center justify-center gap-1 text-accent mt-2">
                <Zap className="w-4 h-4" />
                <span className="font-bold">{leaderboard[2]?.total_tokens}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Leaderboard */}
      <div className="bg-surface-800 border border-surface-600 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 p-4 bg-surface-700 text-sm font-medium text-gray-400">
          <span>Rank</span>
          <span>Name</span>
          <span>Employee ID</span>
          <span className="text-right">Tokens</span>
        </div>
        <div className="divide-y divide-surface-600">
          {leaderboard.map((user, index) => (
            <div
              key={user.id}
              className={`grid grid-cols-[auto_1fr_auto_auto] gap-4 p-4 items-center transition-all hover:bg-surface-700 border-l-4 ${getRankStyle(index)}`}
            >
              <div className="flex items-center justify-center w-10">
                {getRankIcon(index) || (
                  <span className="text-gray-500 font-medium">{index + 1}</span>
                )}
              </div>
              <div>
                <p className="text-white font-medium">{user.full_name}</p>
              </div>
              <div>
                <span className="text-gray-500 text-sm">{user.employee_id}</span>
              </div>
              <div className="flex items-center gap-1 text-accent justify-end">
                <Zap className="w-4 h-4" />
                <span className="font-bold">{user.total_tokens}</span>
              </div>
            </div>
          ))}
          {leaderboard.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No rankings yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
