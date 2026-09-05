import React, { useEffect } from 'react';
import { 
  X, 
  Trophy, 
  Crown, 
  Award, 
  RotateCcw, 
  Sparkles, 
  ArrowRight, 
  Users 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Team, GameSettings } from '../types';

interface EndGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  settings: GameSettings;
  onOpenCertificateForTeam: (team: Team) => void;
  onRestartGame: () => void;
}

export const EndGameModal: React.FC<EndGameModalProps> = ({
  isOpen,
  onClose,
  teams,
  settings,
  onOpenCertificateForTeam,
  onRestartGame,
}) => {
  // Sort teams by score descending
  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
  const champion = sortedTeams[0];
  const second = sortedTeams[1];
  const third = sortedTeams[2];

  useEffect(() => {
    if (isOpen) {
      // Trigger festive multi-burst confetti
      const end = Date.now() + 2.5 * 1000;
      const colors = ['#F26F21', '#FBBF24', '#3B82F6', '#10B981', '#EC4899'];

      const frame = () => {
        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors,
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-950/50 via-slate-900 to-orange-950/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40 shadow-lg">
              <Trophy size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  BẢNG VÀNG VINH DANH
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                  KẾT THÚC GAME
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Chúc mừng tất cả các đội đã hoàn thành xuất sắc các lượt chơi!
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-7 space-y-7 overflow-y-auto flex-1">
          {/* 1. PODIUM TOP 3 CELEBRATION */}
          <div className="bg-slate-950/80 rounded-3xl p-5 border border-slate-800">
            <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end pt-4 pb-2">
              {/* 2nd Place (Silver) */}
              {second && (
                <div className="flex flex-col items-center">
                  <div className="text-2xl sm:text-3xl mb-1">{second.icon}</div>
                  <span className="text-xs sm:text-sm font-black text-slate-200 text-center truncate max-w-full">
                    {second.name}
                  </span>
                  <span className="text-xs text-slate-400 font-mono font-bold mb-2">
                    {second.score}đ
                  </span>
                  {/* Podium Column */}
                  <div className="w-full bg-gradient-to-t from-slate-800 to-slate-700 h-24 sm:h-32 rounded-t-2xl flex flex-col items-center justify-start pt-2 border-t-2 border-slate-400 shadow-lg">
                    <span className="text-lg sm:text-xl font-black text-slate-300">#2</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Á QUÂN</span>
                  </div>
                </div>
              )}

              {/* 1st Place (Gold Champion) */}
              {champion && (
                <div className="flex flex-col items-center -mt-6">
                  <div className="relative mb-1">
                    <Crown size={28} className="text-amber-400 fill-amber-400 mx-auto animate-bounce" />
                    <div className="text-4xl sm:text-5xl mt-0.5">{champion.icon}</div>
                  </div>
                  <span className="text-sm sm:text-base font-black text-amber-300 text-center truncate max-w-full">
                    {champion.name}
                  </span>
                  <span className="text-sm text-amber-400 font-mono font-black mb-2">
                    {champion.score}đ
                  </span>
                  {/* Podium Column */}
                  <div className="w-full bg-gradient-to-t from-amber-700 via-amber-600 to-yellow-500 h-36 sm:h-44 rounded-t-2xl flex flex-col items-center justify-start pt-2 border-t-2 border-yellow-300 shadow-2xl shadow-amber-500/20">
                    <span className="text-2xl sm:text-3xl font-black text-slate-950">#1</span>
                    <span className="text-xs font-black uppercase text-slate-950 tracking-wider">
                      QUÁN QUÂN
                    </span>
                  </div>
                </div>
              )}

              {/* 3rd Place (Bronze) */}
              {third && (
                <div className="flex flex-col items-center">
                  <div className="text-2xl sm:text-3xl mb-1">{third.icon}</div>
                  <span className="text-xs sm:text-sm font-black text-slate-200 text-center truncate max-w-full">
                    {third.name}
                  </span>
                  <span className="text-xs text-slate-400 font-mono font-bold mb-2">
                    {third.score}đ
                  </span>
                  {/* Podium Column */}
                  <div className="w-full bg-gradient-to-t from-amber-950 to-amber-900 h-16 sm:h-20 rounded-t-2xl flex flex-col items-center justify-start pt-2 border-t-2 border-amber-700 shadow-lg">
                    <span className="text-base sm:text-lg font-black text-amber-500">#3</span>
                    <span className="text-[10px] uppercase font-bold text-amber-600">HẠNG 3</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. FULL RANKINGS LIST */}
          <div>
            <h3 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider mb-3">
              Chi tiết xếp hạng toàn bộ các đội:
            </h3>

            <div className="space-y-2">
              {sortedTeams.map((team, idx) => (
                <div
                  key={team.id}
                  className="bg-slate-800/80 border border-slate-700 rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                        idx === 0
                          ? 'bg-amber-400 text-slate-950'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-950'
                          : idx === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-900 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {idx + 1}
                    </span>

                    <span className="text-2xl">{team.icon}</span>

                    <div>
                      <span className="text-sm font-extrabold text-white block">
                        {team.name}
                      </span>
                      <span className="text-xs text-slate-400">
                        Tổng điểm: <strong className="text-amber-400">{team.score}</strong>
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onOpenCertificateForTeam(team);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-bold border border-slate-700 hover:border-amber-500/50 transition"
                  >
                    <Award size={14} className="text-amber-400" />
                    <span>In Giấy Khen</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/80">
          <button
            onClick={() => {
              if (window.confirm('Bắt đầu ván chơi mới? Điểm số sẽ được đặt lại về 0.')) {
                onRestartGame();
                onClose();
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition"
          >
            <RotateCcw size={14} />
            <span>Chơi Ván Mới (Reset)</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (champion) onOpenCertificateForTeam(champion);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl text-xs sm:text-sm shadow-xl shadow-amber-500/20 transition"
            >
              <Award size={16} />
              <span>In Giấy Khen Quán Quân</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
