import React, { useState, useEffect } from 'react';
import { 
  X, 
  Gamepad2, 
  Search, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Play, 
  BookOpen, 
  UserCheck 
} from 'lucide-react';
import { Question, QuestionSet } from '../types';
import { getQuestionSetByShareCode } from '../services/firebase';

interface StudentPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCode?: string;
  onStartPlay: (set: QuestionSet, questions: Question[]) => void;
}

export const StudentPlayModal: React.FC<StudentPlayModalProps> = ({
  isOpen,
  onClose,
  initialCode = '',
  onStartPlay,
}) => {
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [foundSet, setFoundSet] = useState<{ set: QuestionSet; questions: Question[] } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialCode && isOpen) {
      setCode(initialCode.toUpperCase().trim());
      handleLookup(initialCode.toUpperCase().trim());
    }
  }, [initialCode, isOpen]);

  if (!isOpen) return null;

  const handleLookup = async (lookupCode: string) => {
    const clean = lookupCode.toUpperCase().trim();
    if (!clean) {
      setErrorMsg('Vui lòng nhập mã chia sẻ trò chơi.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      setFoundSet(null);

      const result = await getQuestionSetByShareCode(clean);
      if (!result) {
        setErrorMsg('Không tìm thấy bộ câu hỏi với mã này hoặc bộ câu hỏi đang ở chế độ Riêng tư.');
      } else if (result.questions.length === 0) {
        setErrorMsg('Bộ câu hỏi này hiện chưa có câu hỏi nào.');
      } else {
        setFoundSet(result);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Lỗi khi tìm bộ câu hỏi. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPlay = () => {
    if (foundSet) {
      onStartPlay(foundSet.set, foundSet.questions);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-5 animate-in fade-in zoom-in duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
              <Gamepad2 size={22} />
            </div>
            <div>
              <h3 className="text-base font-black text-white">VÀO CHƠI THEO MÃ</h3>
              <p className="text-xs text-slate-400">Dành cho học sinh tham gia trò chơi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Code Input */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Nhập mã chia sẻ (Gồm 6 ký tự do Thầy/Cô cung cấp):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={8}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="VD: 7T9K2X"
                className="flex-1 bg-slate-950 border border-slate-700 text-center font-mono font-black text-xl tracking-widest text-orange-400 px-4 py-2.5 rounded-xl uppercase focus:outline-none focus:border-orange-500"
              />
              <button
                type="button"
                onClick={() => handleLookup(code)}
                disabled={loading || !code.trim()}
                className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-orange-600/30 transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                <span>Tìm</span>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl flex items-start gap-2 text-xs text-red-300">
              <AlertCircle size={16} className="shrink-0 text-red-400 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Found Set Preview Card */}
          {foundSet && (
            <div className="p-4 bg-slate-950/80 rounded-2xl border border-emerald-500/50 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between text-[11px]">
                <span className="bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {foundSet.set.subject || 'Tổng Hợp'}
                </span>
                <span className="text-slate-400">
                  Giáo viên: <strong>{foundSet.set.ownerName || 'Thầy/Cô'}</strong>
                </span>
              </div>

              <div>
                <h4 className="text-sm font-black text-white">
                  {foundSet.set.title || foundSet.set.name}
                </h4>
                {foundSet.set.description && (
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {foundSet.set.description}
                  </p>
                )}
              </div>

              <div className="text-xs font-bold text-slate-300 pt-1 border-t border-slate-800">
                Đã sẵn sàng {foundSet.questions.length} câu hỏi để bắt đầu!
              </div>

              <button
                type="button"
                onClick={handleConfirmPlay}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Play size={18} className="fill-current" />
                <span>VÀO CHƠI NGAY</span>
              </button>
            </div>
          )}
        </div>

        <div className="text-center text-[11px] text-slate-500">
          Học sinh có thể tham gia chơi trực tiếp mà không cần đăng nhập.
        </div>
      </div>
    </div>
  );
};
