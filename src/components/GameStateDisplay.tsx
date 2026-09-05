import React from 'react';
import { 
  Play, 
  Sparkles, 
  Zap, 
  HelpCircle, 
  CheckCircle, 
  RotateCcw,
  Volume2,
  Music
} from 'lucide-react';
import { GameState, PlayerSlot, Team } from '../types';

interface GameStateDisplayProps {
  gameState: GameState;
  moveCountdown: number;
  winnerSlot: number | null;
  playerSlots: PlayerSlot[];
  teams: Team[];
  onStartGame: () => void;
  onProceedToQuestion: () => void;
  onNextRound: () => void;
  onResetGame: () => void;
  isDemoMode: boolean;
  musicEnabled?: boolean;
  musicTrackName?: string;
}

export const GameStateDisplay: React.FC<GameStateDisplayProps> = ({
  gameState,
  moveCountdown,
  winnerSlot,
  playerSlots,
  teams,
  onStartGame,
  onProceedToQuestion,
  onNextRound,
  onResetGame,
  musicEnabled,
  musicTrackName,
}) => {
  const winnerSlotData = playerSlots.find((s) => s.slotId === winnerSlot);
  const winnerTeam = teams.find((t) => t.id === winnerSlotData?.teamId);

  // Render State Card based on current gameState
  return (
    <div className="w-full">
      {/* 1. READY STATE */}
      {gameState === 'READY' && (
        <div className="bg-slate-900/90 border-2 border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>HỆ THỐNG SẴN SÀNG</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Chuẩn bị bước vào lượt chơi!
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              3 học sinh đứng vào 3 vùng tương ứng (Vùng 1 - Trái, Vùng 2 - Giữa, Vùng 3 - Phải).
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={onStartGame}
              className="flex-1 md:flex-none flex items-center justify-center gap-2.5 px-7 py-3.5 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-slate-950 font-black text-base sm:text-lg rounded-xl shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 transform hover:-translate-y-0.5 transition active:translate-y-0"
            >
              <Play size={22} className="fill-slate-950" />
              <span>BẮT ĐẦU MOVE!</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. MOVE STATE */}
      {gameState === 'MOVE' && (
        <div className="bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 rounded-2xl p-4 sm:p-6 shadow-2xl text-slate-950 flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-950/20 backdrop-blur-md flex items-center justify-center text-3xl sm:text-4xl shadow-inner border border-white/30">
              🕺
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black uppercase tracking-widest bg-slate-950 text-amber-300 px-3 py-0.5 rounded-full inline-block mb-1">
                GIAI ĐOẠN 1
              </div>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight drop-shadow-sm">
                MOVE! NHẢY & TẠO DÁNG!
              </h2>
              <p className="text-xs sm:text-sm font-bold text-slate-950/80">
                Các bạn tự do di chuyển, tạo dáng trước khi hiệu lệnh FREEZE vang lên!
              </p>

              {musicEnabled && (
                <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 bg-slate-950/30 rounded-full border border-slate-950/20 text-slate-950 text-xs font-black">
                  <Music size={13} className="animate-bounce" />
                  <div className="flex items-end gap-0.5 h-3">
                    <span className="w-1 bg-slate-950 rounded-full animate-[pulse_0.35s_ease-in-out_infinite] h-3" />
                    <span className="w-1 bg-slate-950 rounded-full animate-[pulse_0.55s_ease-in-out_infinite] h-1.5" />
                    <span className="w-1 bg-slate-950 rounded-full animate-[pulse_0.25s_ease-in-out_infinite] h-3" />
                    <span className="w-1 bg-slate-950 rounded-full animate-[pulse_0.45s_ease-in-out_infinite] h-2" />
                    <span className="w-1 bg-slate-950 rounded-full animate-[pulse_0.3s_ease-in-out_infinite] h-2.5" />
                  </div>
                  <span>Nhạc nền: {musicTrackName || 'Sôi động'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Large Countdown timer badge */}
          <div className="flex items-center gap-3 bg-slate-950 text-amber-400 px-6 py-3 rounded-2xl border-2 border-amber-300 shadow-2xl">
            <span className="text-xs uppercase font-bold text-slate-400">Đếm ngược</span>
            <span className="text-4xl sm:text-5xl font-black font-mono tracking-tighter">
              {moveCountdown}s
            </span>
          </div>
        </div>
      )}

      {/* 3. FREEZE STATE */}
      {gameState === 'FREEZE' && (
        <div className="bg-gradient-to-r from-cyan-600 via-sky-500 to-blue-600 rounded-2xl p-4 sm:p-6 shadow-2xl text-white flex flex-col sm:flex-row items-center justify-between gap-4 border-2 border-cyan-300">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-cyan-950/40 backdrop-blur-md flex items-center justify-center text-3xl sm:text-4xl shadow-inner border border-cyan-200/50">
              ❄️
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black uppercase tracking-widest bg-cyan-950 text-cyan-300 px-3 py-0.5 rounded-full inline-block mb-1">
                GIAI ĐOẠN 2
              </div>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight drop-shadow">
                FREEZE! ĐỨNG YÊN BẤT ĐỘNG!
              </h2>
              <p className="text-xs sm:text-sm font-medium text-cyan-100">
                Ai đóng băng nhanh nhất và ít cử động nhất sẽ giành quyền trả lời!
              </p>
            </div>
          </div>

          <div className="bg-cyan-950/80 px-5 py-3 rounded-2xl border border-cyan-300 text-cyan-300 font-black text-sm flex items-center gap-2 animate-bounce">
            <span>❄️ ĐO ĐỘ BẤT ĐỘNG!</span>
          </div>
        </div>
      )}

      {/* 4. SCANNING STATE */}
      {gameState === 'SCANNING' && (
        <div className="bg-slate-900/95 border-2 border-cyan-500/80 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center animate-spin">
              <Zap size={24} />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-cyan-300 flex items-center gap-2">
                <span>AI ĐANG PHÂN TÍCH TỐC ĐỘ ĐÓNG BĂNG...</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-400">
                Đang chấm điểm thời gian phản xạ & độ tĩnh chuyển động của từng người chơi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-xs font-mono text-cyan-400 font-bold">ANALYZING STILLNESS...</span>
          </div>
        </div>
      )}

      {/* 5. RANDOM PICK STATE */}
      {gameState === 'RANDOM_PICK' && (
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 border-2 border-purple-400 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500/30 text-purple-300 flex items-center justify-center text-2xl animate-spin">
              🎲
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-purple-200">
                VÒNG QUAY ĐANG KHÓA MỤC TIÊU...
              </h3>
              <p className="text-xs sm:text-sm text-slate-300">
                Xác định người chơi có tốc độ đứng yên nhanh & xuất sắc nhất!
              </p>
            </div>
          </div>

          <div className="bg-purple-500/20 border border-purple-400/40 text-purple-300 px-4 py-2 rounded-xl text-xs font-mono font-bold">
            LOCKING WINNER...
          </div>
        </div>
      )}

      {/* 6. WINNER STATE */}
      {gameState === 'WINNER' && winnerTeam && (
        <div className="bg-slate-900/95 border-2 border-amber-400 rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-3xl sm:text-4xl shadow-xl shadow-amber-500/30 text-slate-950 font-black">
              {winnerTeam.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-400 text-slate-950 font-black text-xs px-2.5 py-0.5 rounded-full uppercase">
                  🏆 ĐỨNG YÊN NHANH NHẤT
                </span>
                <span className="text-xs text-amber-300 font-bold">
                  {winnerSlotData?.label}
                </span>
                {winnerSlotData?.freezeReactionTimeSec && (
                  <span className="bg-slate-800 text-emerald-300 border border-emerald-500/40 text-xs px-2 py-0.5 rounded-md font-mono font-bold">
                    ⏱️ {winnerSlotData.freezeReactionTimeSec}s (Độ tĩnh: {winnerSlotData.freezeScore}%)
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                {winnerTeam.name} giành quyền trả lời!
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Hãy tiến lên trước màn hình để trả lời câu hỏi và ghi điểm!
              </p>
            </div>
          </div>

          <button
            onClick={onProceedToQuestion}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-base rounded-xl shadow-xl shadow-amber-500/30 transform hover:-translate-y-0.5 transition"
          >
            <HelpCircle size={20} className="text-slate-950" />
            <span>MỞ CÂU HỎI NGAY</span>
          </button>
        </div>
      )}
    </div>
  );
};
