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
    return 'border-transparent';
  };

  return (
    <div className="space-y-5 sm:space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 sm:gap-3" style={{ color: 'var(--text-primary)' }}>
          <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />
          Leaderboard
        </h1>
        <p className="text-sm mt-0.5 sm:mt-1" style={{ color: 'var(--text-muted)' }}>Top performers ranked by tokens earned</p>
      </div>

      {/* Top 3 Podium */}
      {leaderboard.length >= 3 && (
        <div className="flex items-end justify-center gap-2 sm:gap-4 mb-6 sm:mb-8 px-2">
          {/* 2nd Place */}
          <div className="flex flex-col items-center flex-1 max-w-30 sm:max-w-33">
            <div className="w-14 h-14 sm:w-20 sm:h-20 bg-gray-400/20 rounded-full flex items-center justify-center mb-2 border-2 border-gray-400/50">
              <span className="text-lg sm:text-2xl font-bold text-gray-300">2</span>
            </div>
            <div className="rounded-lg p-2.5 sm:p-4 text-center w-full h-22 sm:h-28" style={{ backgroundColor: 'var(--bg-card)' }}>
              <p className="font-medium truncate text-xs sm:text-base" style={{ color: 'var(--text-primary)' }}>{leaderboard[1]?.full_name}</p>
              <div className="flex items-center justify-center gap-1 text-accent mt-1.5 sm:mt-2">
                <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="font-bold text-sm sm:text-base">{leaderboard[1]?.total_tokens}</span>
              </div>
            </div>
          </div>

          {/* 1st Place */}
          <div className="flex flex-col items-center -mt-8 flex-1 max-w-35 sm:max-w-36">
            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-yellow-500/20 rounded-full flex items-center justify-center mb-2 border-2 border-yellow-500/50">
              <Trophy className="w-7 h-7 sm:w-10 sm:h-10 text-yellow-400" />
            </div>
            <div className="rounded-lg p-2.5 sm:p-4 text-center w-full h-24 sm:h-32 border border-yellow-500/30" style={{ backgroundColor: 'var(--bg-card)' }}>
              <p className="font-semibold truncate text-xs sm:text-base" style={{ color: 'var(--text-primary)' }}>{leaderboard[0]?.full_name}</p>
              <div className="flex items-center justify-center gap-1 text-yellow-400 mt-1.5 sm:mt-2">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-base sm:text-xl font-bold">{leaderboard[0]?.total_tokens}</span>
              </div>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center flex-1 max-w-30 sm:max-w-33">
            <div className="w-14 h-14 sm:w-20 sm:h-20 bg-orange-500/20 rounded-full flex items-center justify-center mb-2 border-2 border-orange-500/50">
              <span className="text-lg sm:text-2xl font-bold text-orange-400">3</span>
            </div>
            <div className="rounded-lg p-2.5 sm:p-4 text-center w-full h-22 sm:h-28" style={{ backgroundColor: 'var(--bg-card)' }}>
              <p className="font-medium truncate text-xs sm:text-base" style={{ color: 'var(--text-primary)' }}>{leaderboard[2]?.full_name}</p>
              <div className="flex items-center justify-center gap-1 text-accent mt-1.5 sm:mt-2">
                <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="font-bold text-sm sm:text-base">{leaderboard[2]?.total_tokens}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Leaderboard */}
      <div className="rounded-xl overflow-hidden border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_auto_auto] gap-3 sm:gap-4 p-3 sm:p-4 text-sm font-medium" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
          <span>Rank</span>
          <span>Name</span>
          <span className="hidden sm:block">Employee ID</span>
          <span className="text-right">Tokens</span>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
          {leaderboard.map((user, index) => (
            <div
              key={user.id}
              className={`grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_auto_auto] gap-3 sm:gap-4 p-3 sm:p-4 items-center transition-all border-l-4 ${getRankStyle(index)}`}
              style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div className="flex items-center justify-center w-8 sm:w-10">
                {getRankIcon(index) || (
                  <span className="font-medium" style={{ color: 'var(--text-muted)' }}>{index + 1}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate text-sm sm:text-base" style={{ color: 'var(--text-primary)' }}>{user.full_name}</p>
                <p className="text-xs sm:hidden" style={{ color: 'var(--text-muted)' }}>{user.employee_id}</p>
              </div>
              <div className="hidden sm:block">
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{user.employee_id}</span>
              </div>
              <div className="flex items-center gap-1 text-accent justify-end">
                <Zap className="w-4 h-4" />
                <span className="font-bold">{user.total_tokens}</span>
              </div>
            </div>
          ))}
          {leaderboard.length === 0 && (
            <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No rankings yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
