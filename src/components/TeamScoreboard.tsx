import React from 'react';
import { Crown, Plus, Minus, Users } from 'lucide-react';
import { Team, PlayerSlot } from '../types';

interface TeamScoreboardProps {
  teams: Team[];
  playerSlots: PlayerSlot[];
  onAdjustScore: (teamId: string, delta: number) => void;
  onOpenTeamManager: () => void;
}

export const TeamScoreboard: React.FC<TeamScoreboardProps> = ({
  teams,
  playerSlots,
  onAdjustScore,
  onOpenTeamManager,
}) => {
  // Sort by score descending to find leader
  const highestScore = Math.max(...teams.map((t) => t.score), 0);

  return (
    <div className="w-full bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-3 sm:p-4 shadow-xl">
      {/* Header with Title and Team Settings */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Bảng Điểm Các Đội
          </span>
          <span className="text-xs text-slate-500 font-semibold">
            ({teams.length} đội tham gia)
          </span>
        </div>

        <button
          onClick={onOpenTeamManager}
          className="text-xs text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1 hover:underline transition"
        >
          <Users size={13} />
          <span>Đổi đội & Gán vị trí</span>
        </button>
      </div>

      {/* Grid of Teams */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {teams.map((team) => {
          const isLeader = team.score > 0 && team.score === highestScore;
          const assignedSlot = playerSlots.find((s) => s.teamId === team.id && s.active);

          return (
            <div
              key={team.id}
              className={`relative rounded-xl p-2.5 border transition-all flex flex-col justify-between ${
                assignedSlot
                  ? 'bg-slate-850/90 border-slate-700 shadow-md ring-1 ring-slate-700'
                  : 'bg-slate-900/60 border-slate-800/80 opacity-80'
              }`}
              style={{
                borderLeftWidth: '4px',
                borderLeftColor: team.color,
              }}
            >
              {/* Leader Crown Badge */}
              {isLeader && (
                <div className="absolute -top-2.5 -right-2 bg-amber-400 text-slate-950 p-1 rounded-full shadow-lg border border-amber-300">
                  <Crown size={12} className="fill-slate-950" />
                </div>
              )}

              {/* Slot Badge if assigned */}
              {assignedSlot && (
                <div className="absolute top-1 right-1.5">
                  <span
                    className="text-[9px] font-black px-1.5 py-0.2 rounded border"
                    style={{
                      backgroundColor: `${team.color}25`,
                      color: team.color,
                      borderColor: `${team.color}40`,
                    }}
                  >
                    {assignedSlot.label}
                  </span>
                </div>
              )}

              {/* Team Identity */}
              <div className="flex items-center gap-1.5 pr-4">
                <span className="text-xl shrink-0 drop-shadow-sm">{team.icon}</span>
                <span className="text-xs font-black text-slate-100 truncate" title={team.name}>
                  {team.name}
                </span>
              </div>

              {/* Score & Quick Tweak */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800">
                <span className="text-lg font-black text-white font-mono">
                  {team.score}
                  <span className="text-[10px] text-slate-400 font-sans font-normal ml-0.5">đ</span>
                </span>

                {/* +/- Adjust buttons */}
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => onAdjustScore(team.id, -5)}
                    className="p-1 rounded bg-slate-800 hover:bg-red-900/60 text-slate-400 hover:text-red-300 border border-slate-700 transition text-[10px]"
                    title="Trừ 5 điểm"
                  >
                    <Minus size={10} />
                  </button>
                  <button
                    onClick={() => onAdjustScore(team.id, 5)}
                    className="p-1 rounded bg-slate-800 hover:bg-emerald-900/60 text-slate-400 hover:text-emerald-300 border border-slate-700 transition text-[10px]"
                    title="Cộng 5 điểm"
                  >
                    <Plus size={10} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
