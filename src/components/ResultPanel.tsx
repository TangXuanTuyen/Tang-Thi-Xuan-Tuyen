import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  Trophy, 
  Sparkles, 
  Award, 
  Plus, 
  Minus,
  Edit2
} from 'lucide-react';
import { Team, PlayerSlot } from '../types';

interface ResultPanelProps {
  isCorrect: boolean;
  pointsAwarded: number;
  winnerSlot: number | null;
  playerSlots: PlayerSlot[];
  teams: Team[];
  onNextRound: () => void;
  onEndGame: () => void;
  onAdjustTeamScore: (teamId: string, delta: number) => void;
}

export const ResultPanel: React.FC<ResultPanelProps> = ({
  isCorrect,
  pointsAwarded,
  winnerSlot,
  playerSlots,
  teams,
  onNextRound,
  onEndGame,
  onAdjustTeamScore,
}) => {
  const winnerSlotData = playerSlots.find((s) => s.slotId === winnerSlot);
  const winningTeam = teams.find((t) => t.id === winnerSlotData?.teamId) || teams[0];
  const [showManualEdit, setShowManualEdit] = useState<boolean>(false);

  return (
    <div className="w-full bg-slate-900 border-2 border-slate-700/80 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
      {/* Result Status Glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-40 blur-3xl opacity-20 pointer-events-none"
        style={{
          backgroundColor: isCorrect ? '#10B981' : '#EF4444',
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Status Icon */}
        <div
          className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex items-center justify-center text-4xl sm:text-5xl shadow-2xl mb-4 border-2 ${
            isCorrect
              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400 animate-bounce shadow-emerald-500/30'
              : 'bg-red-500/20 border-red-500 text-red-400 shadow-red-500/30'
          }`}
        >
          {isCorrect ? '🎉' : '❌'}
        </div>

        {/* Headline */}
        <h2 className="text-2xl sm:text-4xl font-black text-white mb-1 tracking-tight">
          {isCorrect ? 'CÂU TRẢ LỜI CHÍNH XÁC!' : 'RẤT TIẾC, CHƯA CHÍNH XÁC!'}
        </h2>

        <p className="text-sm sm:text-base text-slate-300 max-w-lg mb-6">
          {isCorrect ? (
            <>
              Chúc mừng <strong className="text-amber-400">{winningTeam.name}</strong> ({winnerSlotData?.label}) đã xuất sắc ghi thêm điểm!
            </>
          ) : (
            <>
              Đội <strong className="text-slate-200">{winningTeam.name}</strong> chưa giành được điểm trong lượt này. Cố gắng ở lượt tiếp theo nhé!
            </>
          )}
        </p>

        {/* Score Banner */}
        <div
          className="px-6 py-3.5 rounded-2xl border flex items-center gap-4 mb-6 shadow-xl"
          style={{
            backgroundColor: `${winningTeam.color}20`,
            borderColor: `${winningTeam.color}60`,
          }}
        >
          <span className="text-3xl">{winningTeam.icon}</span>
          <div className="text-left">
            <span className="text-xs uppercase font-bold text-slate-400 block">
              {winningTeam.name}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-white">
                {winningTeam.score} điểm
              </span>
              {isCorrect && (
                <span className="text-xs font-black bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full animate-pulse">
                  +{pointsAwarded}đ
                </span>
              )}
            </div>
          </div>

          {/* Teacher manual tweak toggle */}
          <button
            onClick={() => setShowManualEdit(!showManualEdit)}
            className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800/80 border border-slate-700 transition ml-2"
            title="Chỉnh sửa điểm thủ công"
          >
            <Edit2 size={14} />
          </button>
        </div>

        {/* Manual Score Modifier Bar (Teacher Override) */}
        {showManualEdit && (
          <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 p-2 rounded-xl mb-6 animate-fadeIn">
            <span className="text-xs text-slate-300 font-bold px-2">Chỉnh điểm {winningTeam.name}:</span>
            <button
              onClick={() => onAdjustTeamScore(winningTeam.id, -10)}
              className="px-2.5 py-1 bg-red-950/80 hover:bg-red-900 text-red-300 rounded-lg text-xs font-bold border border-red-800"
            >
              -10
            </button>
            <button
              onClick={() => onAdjustTeamScore(winningTeam.id, -5)}
              className="px-2.5 py-1 bg-red-950/80 hover:bg-red-900 text-red-300 rounded-lg text-xs font-bold border border-red-800"
            >
              -5
            </button>
            <button
              onClick={() => onAdjustTeamScore(winningTeam.id, 5)}
              className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 rounded-lg text-xs font-bold border border-emerald-800"
            >
              +5
            </button>
            <button
              onClick={() => onAdjustTeamScore(winningTeam.id, 10)}
              className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 rounded-lg text-xs font-bold border border-emerald-800"
            >
              +10
            </button>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-md">
          <button
            onClick={onNextRound}
            className="flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-slate-950 font-black text-base rounded-xl shadow-xl shadow-orange-500/25 transform hover:-translate-y-0.5 transition"
          >
            <span>LƯỢT TIẾP THEO</span>
            <ArrowRight size={20} className="text-slate-950" />
          </button>

          <button
            onClick={onEndGame}
            className="flex items-center justify-center gap-2 px-5 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-sm rounded-xl border border-slate-700 transition"
          >
            <Trophy size={16} className="text-amber-400" />
            <span>KẾT THÚC GAME</span>
          </button>
        </div>
      </div>
    </div>
  );
};
