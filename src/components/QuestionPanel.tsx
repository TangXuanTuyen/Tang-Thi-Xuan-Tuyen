import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Eye, 
  EyeOff, 
  Award, 
  Plus, 
  Minus,
  RefreshCw,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Check,
  Send
} from 'lucide-react';
import { Question, Team, PlayerSlot } from '../types';
import { soundFx } from '../utils/soundEffects';

interface QuestionPanelProps {
  question: Question;
  winnerSlot: number | null;
  playerSlots: PlayerSlot[];
  teams: Team[];
  onAnswerResult: (isCorrect: boolean, customPoints?: number) => void;
  onSkipQuestion: () => void;
}

/**
 * Normalizes and determines the 0-indexed position (0, 1, 2, 3) of the correct answer
 * from various teacher input formats (numbers, letters A-D, option text).
 */
export function getCorrectOptionIndex(question: Question): number {
  const raw = question.correctAnswer;
  if (typeof raw === 'number') {
    if (raw >= 0 && raw < 4) return raw;
    if (raw >= 1 && raw <= 4) return raw - 1; // 1-indexed handling
  }

  const str = String(raw ?? '').trim();

  // Exact 0-3 index
  if (/^[0-3]$/.test(str)) {
    return parseInt(str, 10);
  }

  // Exact 1-4 index
  if (str === '4') return 3;

  const upper = str.toUpperCase();
  if (upper === 'A' || upper.startsWith('A.') || upper.startsWith('A:') || upper.startsWith('A -')) return 0;
  if (upper === 'B' || upper.startsWith('B.') || upper.startsWith('B:') || upper.startsWith('B -')) return 1;
  if (upper === 'C' || upper.startsWith('C.') || upper.startsWith('C:') || upper.startsWith('C -')) return 2;
  if (upper === 'D' || upper.startsWith('D.') || upper.startsWith('D:') || upper.startsWith('D -')) return 3;

  // Match against options text
  if (question.options && question.options.length > 0) {
    const foundExact = question.options.findIndex(
      (opt) => opt.trim().toLowerCase() === str.toLowerCase()
    );
    if (foundExact !== -1) return foundExact;

    const foundPartial = question.options.findIndex((opt) => {
      const optClean = opt.trim().toLowerCase();
      const strClean = str.toLowerCase();
      return optClean.includes(strClean) || strClean.includes(optClean);
    });
    if (foundPartial !== -1) return foundPartial;
  }

  return 0; // default fallback
}

/**
 * Checks whether user short answer matches teacher's configured correct answer.
 */
export function checkShortAnswerMatch(correctRaw: string | number | undefined, userInput: string): boolean {
  if (!userInput || !userInput.trim()) return false;
  const correctStr = String(correctRaw ?? '').trim().toLowerCase();
  const userStr = userInput.trim().toLowerCase();
  if (correctStr === userStr) return true;

  // Accent & punctuation normalization for flexible Vietnamese matching
  const normalize = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  if (normalize(correctStr) === normalize(userStr)) return true;

  // Numeric comparison (e.g. 10 vs 10.0)
  const numC = parseFloat(correctStr);
  const numU = parseFloat(userStr);
  if (!isNaN(numC) && !isNaN(numU) && numC === numU) return true;

  return false;
}

export const QuestionPanel: React.FC<QuestionPanelProps> = ({
  question,
  winnerSlot,
  playerSlots,
  teams,
  onAnswerResult,
  onSkipQuestion,
}) => {
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [shortAnswerInput, setShortAnswerInput] = useState<string>('');
  const [timerSeconds, setTimerSeconds] = useState<number>(30);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);
  const [customPoints, setCustomPoints] = useState<number>(question.points || 20);

  // Automatic Evaluation State
  const [evaluation, setEvaluation] = useState<{
    isConfirmed: boolean;
    isCorrect: boolean;
    points: number;
    userChoiceLabel: string;
  } | null>(null);

  // Auto-proceed countdown
  const [countdown, setCountdown] = useState<number>(3);
  const [isAutoProceeding, setIsAutoProceeding] = useState<boolean>(false);

  const winnerSlotData = playerSlots.find((s) => s.slotId === winnerSlot);
  const winnerTeam = teams.find((t) => t.id === winnerSlotData?.teamId) || teams[0];

  const optionLetters = ['A', 'B', 'C', 'D'];
  const correctOptionIndex = question.type === 'MULTIPLE_CHOICE' ? getCorrectOptionIndex(question) : -1;

  // 30-second question answer timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerSeconds]);

  // Auto-proceed countdown when an answer has been automatically evaluated
  useEffect(() => {
    if (!isAutoProceeding || !evaluation) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onAnswerResult(evaluation.isCorrect, evaluation.points);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAutoProceeding, evaluation, onAnswerResult]);

  // Handle Multiple Choice Option Selection with Automatic Verification
  const handleSelectOption = (idx: number) => {
    if (evaluation?.isConfirmed) return; // Prevent double-clicking

    const isCorrect = (idx === correctOptionIndex);
    const pointsAwarded = isCorrect ? customPoints : 0;

    setSelectedOption(idx);
    setShowAnswer(true);
    setIsTimerRunning(false);

    setEvaluation({
      isConfirmed: true,
      isCorrect,
      points: pointsAwarded,
      userChoiceLabel: `Phương án ${optionLetters[idx]}`,
    });

    if (isCorrect) {
      soundFx.playCorrect();
      confetti({
        particleCount: 65,
        spread: 70,
        origin: { y: 0.65 },
      });
    } else {
      soundFx.playWrong();
    }

    // Start auto-proceed countdown
    setIsAutoProceeding(true);
    setCountdown(3);
  };

  // Handle Short Answer Submission with Automatic Verification
  const handleShortAnswerSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!shortAnswerInput.trim() || evaluation?.isConfirmed) return;

    const isCorrect = checkShortAnswerMatch(question.correctAnswer, shortAnswerInput);
    const pointsAwarded = isCorrect ? customPoints : 0;

    setShowAnswer(true);
    setIsTimerRunning(false);

    setEvaluation({
      isConfirmed: true,
      isCorrect,
      points: pointsAwarded,
      userChoiceLabel: `"${shortAnswerInput.trim()}"`,
    });

    if (isCorrect) {
      soundFx.playCorrect();
      confetti({
        particleCount: 65,
        spread: 70,
        origin: { y: 0.65 },
      });
    } else {
      soundFx.playWrong();
    }

    setIsAutoProceeding(true);
    setCountdown(3);
  };

  // Manual Teacher Override / Reset
  const handleResetAnswer = () => {
    setSelectedOption(null);
    setEvaluation(null);
    setIsAutoProceeding(false);
    setCountdown(3);
    setShowAnswer(false);
    setIsTimerRunning(true);
  };

  const handleInstantProceed = () => {
    if (evaluation) {
      onAnswerResult(evaluation.isCorrect, evaluation.points);
    }
  };

  return (
    <div className="w-full bg-slate-900 border-2 border-slate-700/80 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden animate-in fade-in duration-200">
      {/* Background Decorative Accent */}
      <div 
        className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{ backgroundColor: winnerTeam.color }}
      />

      {/* Top Header: Winning Team Banner + Question Points & Subject */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className="px-3.5 py-1.5 rounded-xl border flex items-center gap-2 shadow-md"
            style={{
              backgroundColor: `${winnerTeam.color}20`,
              borderColor: `${winnerTeam.color}50`,
            }}
          >
            <span className="text-xl">{winnerTeam.icon}</span>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block leading-none">
                Đang trả lời ({winnerSlotData?.label || 'Người chiến thắng'})
              </span>
              <span className="text-sm font-extrabold text-white">
                {winnerTeam.name}
              </span>
            </div>
          </div>

          <span className="bg-slate-800 text-slate-300 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700">
            {question.subject || 'Tổng Hợp'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Answer Countdown Timer */}
          <button
            onClick={() => setIsTimerRunning(!isTimerRunning)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition ${
              timerSeconds <= 5
                ? 'bg-red-950/80 text-red-400 border-red-500 animate-pulse'
                : 'bg-slate-800 text-amber-300 border-slate-700'
            }`}
            title="Bấm để tạm dừng / tiếp tục đếm ngược"
          >
            <Clock size={15} />
            <span>{timerSeconds}s</span>
          </button>

          {/* Points Badge */}
          <div className="flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3.5 py-1.5 rounded-xl font-black text-sm shadow-sm">
            <Award size={16} className="text-amber-400" />
            <span>+{customPoints} ĐIỂM</span>
          </div>
        </div>
      </div>

      {/* Main Question Display */}
      <div className="my-6">
        <h2 className="text-xl sm:text-3xl font-black text-slate-100 leading-snug tracking-tight">
          {question.question}
        </h2>
      </div>

      {/* Answer Options: Multiple Choice */}
      {question.type === 'MULTIPLE_CHOICE' && question.options && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
          {question.options.map((opt, idx) => {
            const isCorrectAnswer = (correctOptionIndex === idx);
            const isUserPicked = (selectedOption === idx);

            let cardStyle = 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700/80 hover:border-slate-500 cursor-pointer';
            let badgeContent = null;

            if (evaluation?.isConfirmed) {
              if (isUserPicked && isCorrectAnswer) {
                // Picked Correctly!
                cardStyle = 'bg-emerald-950/90 border-emerald-400 text-emerald-100 ring-4 ring-emerald-400/50 shadow-xl shadow-emerald-950';
                badgeContent = (
                  <span className="text-[11px] font-black bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                    <Check size={12} strokeWidth={3} /> CHÍNH XÁC (+{customPoints}đ)
                  </span>
                );
              } else if (isUserPicked && !isCorrectAnswer) {
                // Picked Incorrectly!
                cardStyle = 'bg-red-950/90 border-red-500 text-red-100 ring-4 ring-red-500/50 shadow-xl shadow-red-950';
                badgeContent = (
                  <span className="text-[11px] font-black bg-red-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                    <XCircle size={12} /> CHƯA ĐÚNG (0đ)
                  </span>
                );
              } else if (isCorrectAnswer) {
                // Show the real correct answer so students learn
                cardStyle = 'bg-emerald-950/50 border-emerald-400/80 text-emerald-200 ring-2 ring-emerald-400/40';
                badgeContent = (
                  <span className="text-[11px] font-bold bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                    ĐÁP ÁN ĐÚNG CỦA CÂU HỎI
                  </span>
                );
              } else {
                cardStyle = 'bg-slate-900/60 border-slate-800 text-slate-500 opacity-40';
              }
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={evaluation?.isConfirmed}
                onClick={() => handleSelectOption(idx)}
                className={`flex flex-col gap-2 p-4 rounded-2xl border-2 text-left transition-all ${cardStyle}`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-base shrink-0 ${
                    evaluation?.isConfirmed && isCorrectAnswer
                      ? 'bg-emerald-500 text-slate-950'
                      : evaluation?.isConfirmed && isUserPicked
                      ? 'bg-red-500 text-white'
                      : 'bg-slate-900/90 border border-slate-700 text-amber-400'
                  }`}>
                    {optionLetters[idx]}
                  </span>
                  {badgeContent}
                </div>
                <span className="text-base sm:text-lg font-bold leading-relaxed pt-1">
                  {opt}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Short Answer Box */}
      {question.type === 'SHORT_ANSWER' && (
        <div className="p-5 bg-slate-800/60 border border-slate-700 rounded-2xl mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-slate-400">
              Câu hỏi Trả lời ngắn / Tự luận
            </span>
            <span className="text-xs text-slate-400">
              Nhập câu trả lời để hệ thống tự động đối chiếu
            </span>
          </div>

          <form onSubmit={handleShortAnswerSubmit} className="flex gap-2">
            <input
              type="text"
              disabled={evaluation?.isConfirmed}
              value={shortAnswerInput}
              onChange={(e) => setShortAnswerInput(e.target.value)}
              placeholder="Nhập câu trả lời của học sinh..."
              className="flex-1 bg-slate-950 border border-slate-700 text-white px-4 py-3 rounded-xl font-bold text-sm sm:text-base focus:outline-none focus:border-amber-400 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!shortAnswerInput.trim() || evaluation?.isConfirmed}
              className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-xl flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition disabled:opacity-40 cursor-pointer"
            >
              <Send size={16} />
              <span>Xác nhận</span>
            </button>
          </form>
        </div>
      )}

      {/* Automatic Confirmation Banner (Appears right after an answer is chosen) */}
      {evaluation?.isConfirmed && (
        <div className={`mb-6 p-4 rounded-2xl border-2 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in zoom-in duration-200 ${
          evaluation.isCorrect
            ? 'bg-emerald-950/80 border-emerald-500 text-emerald-100 shadow-xl shadow-emerald-950/50'
            : 'bg-red-950/80 border-red-500 text-red-100 shadow-xl shadow-red-950/50'
        }`}>
          <div className="flex items-center gap-3 text-left">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
              evaluation.isCorrect ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-400' : 'bg-red-500/20 border border-red-400 text-red-400'
            }`}>
              {evaluation.isCorrect ? '🎉' : '❌'}
            </div>
            <div>
              <h4 className="text-base sm:text-lg font-black tracking-tight">
                {evaluation.isCorrect
                  ? `CHÍNH XÁC! TỰ ĐỘNG CỘNG +${evaluation.points} ĐIỂM`
                  : 'CHƯA CHÍNH XÁC! KHÔNG CỘNG ĐIỂM (0 ĐIỂM)'}
              </h4>
              <p className="text-xs sm:text-sm opacity-90">
                {evaluation.isCorrect
                  ? `Đội ${winnerTeam.name} đã chọn đúng đáp án của Thầy/Cô và nhận trọn điểm!`
                  : `Rất tiếc! Đội ${winnerTeam.name} chưa đưa ra đáp án chính xác theo ngân hàng câu hỏi.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleInstantProceed}
              className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg transition cursor-pointer ${
                evaluation.isCorrect
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-600/30'
                  : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
              }`}
            >
              <span>Tiếp tục</span>
              {isAutoProceeding && <span className="opacity-75">({countdown}s)</span>}
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={handleResetAnswer}
              className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition"
              title="Chấm lại hoặc chọn lại câu trả lời"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Answer Explanation Box (Revealed automatically or manually) */}
      {showAnswer && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-bold text-sm text-emerald-400 mb-1">
            <CheckCircle2 size={16} />
            <span>
              Đáp án đúng của Thầy/Cô:{' '}
              {question.type === 'MULTIPLE_CHOICE' && question.options
                ? `${optionLetters[correctOptionIndex]}. ${question.options[correctOptionIndex] || ''}`
                : String(question.correctAnswer)}
            </span>
          </div>
          {question.explanation && (
            <p className="text-xs sm:text-sm text-emerald-300/90 leading-relaxed mt-1">
              <strong>Giải thích:</strong> {question.explanation}
            </p>
          )}
        </div>
      )}

      {/* Teacher Control Bar & Manual Override */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
        {/* Left: Reveal Answer & Score Adjustment */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowAnswer(!showAnswer)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition"
          >
            {showAnswer ? <EyeOff size={15} /> : <Eye size={15} />}
            <span>{showAnswer ? 'Ẩn đáp án' : 'Hiện đáp án'}</span>
          </button>

          {/* Points tweak */}
          <div className="flex items-center bg-slate-800/80 rounded-xl border border-slate-700 px-1 py-0.5">
            <button
              onClick={() => setCustomPoints(Math.max(5, customPoints - 5))}
              className="p-1 text-slate-400 hover:text-white"
              title="Giảm 5 điểm"
            >
              <Minus size={14} />
            </button>
            <span className="text-xs font-bold px-2 text-amber-300">{customPoints}đ</span>
            <button
              onClick={() => setCustomPoints(customPoints + 5)}
              className="p-1 text-slate-400 hover:text-white"
              title="Tăng 5 điểm"
            >
              <Plus size={14} />
            </button>
          </div>

          <button
            type="button"
            onClick={onSkipQuestion}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition"
            title="Bỏ qua câu này và lấy câu khác"
          >
            <RefreshCw size={14} />
            <span className="hidden sm:inline">Đổi câu khác</span>
          </button>
        </div>

        {/* Right: Manual Override Buttons (Fallback for Teacher) */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-[11px] font-semibold text-slate-500 hidden md:inline">
            Chấm thủ công:
          </span>
          <button
            type="button"
            onClick={() => onAnswerResult(false, 0)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-red-950/60 hover:bg-red-900 text-red-300 hover:text-white rounded-xl text-xs font-bold border border-red-700/50 transition cursor-pointer"
            title="Giáo viên chủ động đánh dấu Sai và không cộng điểm"
          >
            <XCircle size={15} />
            <span>Sai (0đ)</span>
          </button>

          <button
            type="button"
            onClick={() => onAnswerResult(true, customPoints)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 hover:text-white rounded-xl text-xs font-bold border border-emerald-700/50 transition cursor-pointer"
            title="Giáo viên chủ động đánh dấu Đúng và cộng điểm"
          >
            <CheckCircle2 size={15} />
            <span>Đúng (+{customPoints}đ)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
