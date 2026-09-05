import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User as UserIcon, 
  School, 
  LogIn, 
  UserPlus, 
  KeyRound, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { 
  loginTeacher, 
  registerTeacher, 
  resetPassword, 
  loginWithGoogleTeacher 
} from '../services/firebase';
import { TeacherUser } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (teacher: TeacherUser) => void;
  initialMode?: 'LOGIN' | 'REGISTER';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'LOGIN',
}) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'FORGOT'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [school, setSchool] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleModeChange = (newMode: 'LOGIN' | 'REGISTER' | 'FORGOT') => {
    resetForm();
    setMode(newMode);
  };

  const mapFirebaseError = (error: unknown): string => {
    const code = (error as { code?: string })?.code || '';
    if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
      return 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'Email này đã được đăng ký. Vui lòng chọn "Đăng nhập" hoặc bấm "Quên mật khẩu".';
    }
    if (code === 'auth/weak-password') {
      return 'Mật khẩu cần có tối thiểu 6 ký tự để đảm bảo an toàn.';
    }
    if (code === 'auth/invalid-email') {
      return 'Định dạng email không hợp lệ (Ví dụ: giaovien@truong.edu.vn).';
    }
    if (code === 'auth/network-request-failed') {
      return 'Mất kết nối mạng. Vui lòng kiểm tra đường truyền internet.';
    }
    if (code === 'auth/popup-closed-by-user') {
      return 'Cửa sổ đăng nhập Google đã bị đóng.';
    }
    return (error as Error)?.message || 'Đã xảy ra lỗi trong quá trình xử lý. Vui lòng thử lại.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (mode === 'LOGIN') {
      if (!email.trim() || !password) {
        setErrorMsg('Vui lòng nhập đầy đủ email và mật khẩu.');
        return;
      }
      try {
        setLoading(true);
        const teacher = await loginTeacher(email, password);
        setSuccessMsg(`Đăng nhập thành công! Chào mừng Thầy/Cô ${teacher.name}.`);
        setTimeout(() => {
          onSuccess(teacher);
          onClose();
        }, 600);
      } catch (err) {
        setErrorMsg(mapFirebaseError(err));
      } finally {
        setLoading(false);
      }
    } else if (mode === 'REGISTER') {
      if (!email.trim() || !password) {
        setErrorMsg('Vui lòng điền địa chỉ email và mật khẩu.');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('Mật khẩu cần tối thiểu 6 ký tự.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Mật khẩu xác nhận không khớp.');
        return;
      }
      try {
        setLoading(true);
        const teacher = await registerTeacher(email, password, name, school);
        setSuccessMsg(`Đăng ký tài khoản thành công! Chào mừng Thầy/Cô ${teacher.name}.`);
        setTimeout(() => {
          onSuccess(teacher);
          onClose();
        }, 600);
      } catch (err) {
        setErrorMsg(mapFirebaseError(err));
      } finally {
        setLoading(false);
      }
    } else if (mode === 'FORGOT') {
      if (!email.trim()) {
        setErrorMsg('Vui lòng nhập địa chỉ email của Thầy/Cô.');
        return;
      }
      try {
        setLoading(true);
        await resetPassword(email);
        setSuccessMsg(`Hệ thống đã gửi link đặt lại mật khẩu đến email ${email}. Thầy/Cô vui lòng kiểm tra hộp thư đến (hoặc hòm thư rác / Spam).`);
      } catch (err) {
        setErrorMsg(mapFirebaseError(err));
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      setLoading(true);
      const teacher = await loginWithGoogleTeacher();
      setSuccessMsg(`Đăng nhập Google thành công! Chào mừng Thầy/Cô ${teacher.name}.`);
      setTimeout(() => {
        onSuccess(teacher);
        onClose();
      }, 600);
    } catch (err) {
      setErrorMsg(mapFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-orange-950/30 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
              <School size={22} />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span>CỔNG DÀNH CHO GIÁO VIÊN</span>
              </h2>
              <p className="text-xs text-slate-400">
                {mode === 'LOGIN' && 'Đăng nhập để quản lý ngân hàng câu hỏi'}
                {mode === 'REGISTER' && 'Tạo tài khoản giáo viên mới miễn phí'}
                {mode === 'FORGOT' && 'Khôi phục mật khẩu tài khoản'}
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

        {/* Form Container */}
        <div className="p-6 space-y-4">
          {/* Notifications */}
          {errorMsg && (
            <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl flex items-start gap-2.5 text-xs text-red-300">
              <AlertCircle size={17} className="shrink-0 text-red-400 mt-0.5" />
              <p className="leading-relaxed font-medium">{errorMsg}</p>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-start gap-2.5 text-xs text-emerald-300">
              <CheckCircle2 size={17} className="shrink-0 text-emerald-400 mt-0.5" />
              <p className="leading-relaxed font-medium">{successMsg}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'REGISTER' && (
              <>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Họ và tên Thầy/Cô:
                  </label>
                  <div className="relative">
                    <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Cô Nguyễn Thị Mai"
                      className="w-full bg-slate-950 border border-slate-700 text-white pl-9 pr-3 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Trường học / Cơ sở đào tạo:
                  </label>
                  <div className="relative">
                    <School size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      placeholder="THCS Chu Văn An"
                      className="w-full bg-slate-950 border border-slate-700 text-white pl-9 pr-3 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500 transition"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Địa chỉ Email:
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="giaovien@school.edu.vn"
                  className="w-full bg-slate-950 border border-slate-700 text-white pl-9 pr-3 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500 transition"
                />
              </div>
            </div>

            {mode !== 'FORGOT' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-300">
                    Mật khẩu:
                  </label>
                  {mode === 'LOGIN' && (
                    <button
                      type="button"
                      onClick={() => handleModeChange('FORGOT')}
                      className="text-[11px] text-orange-400 hover:underline"
                    >
                      Quên mật khẩu?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-700 text-white pl-9 pr-3 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500 transition"
                  />
                </div>
              </div>
            )}

            {mode === 'REGISTER' && (
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Xác nhận lại mật khẩu:
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-700 text-white pl-9 pr-3 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500 transition"
                  />
                </div>
              </div>
            )}

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-orange-600 hover:bg-orange-500 active:scale-[0.98] text-white font-black text-xs rounded-xl shadow-lg shadow-orange-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : mode === 'LOGIN' ? (
                <>
                  <LogIn size={16} />
                  <span>Đăng Nhập Ngay</span>
                </>
              ) : mode === 'REGISTER' ? (
                <>
                  <UserPlus size={16} />
                  <span>Tạo Tài Khoản Giáo Viên</span>
                </>
              ) : (
                <>
                  <KeyRound size={16} />
                  <span>Gửi Email Khôi Phục</span>
                </>
              )}
            </button>
          </form>

          {/* Google Sign-in Alternative */}
          {mode === 'LOGIN' && (
            <>
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Hoặc
                </span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.27 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.97 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.27 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Đăng nhập với Google</span>
              </button>
            </>
          )}

          {/* Toggle Modes Footer */}
          <div className="pt-2 text-center text-xs text-slate-400">
            {mode === 'LOGIN' && (
              <p>
                Chưa có tài khoản?{' '}
                <button
                  type="button"
                  onClick={() => handleModeChange('REGISTER')}
                  className="text-orange-400 font-bold hover:underline"
                >
                  Đăng ký miễn phí
                </button>
              </p>
            )}

            {mode === 'REGISTER' && (
              <p>
                Đã có tài khoản giáo viên?{' '}
                <button
                  type="button"
                  onClick={() => handleModeChange('LOGIN')}
                  className="text-orange-400 font-bold hover:underline"
                >
                  Đăng nhập tại đây
                </button>
              </p>
            )}

            {mode === 'FORGOT' && (
              <p>
                <button
                  type="button"
                  onClick={() => handleModeChange('LOGIN')}
                  className="text-orange-400 font-bold hover:underline"
                >
                  ← Quay lại Đăng nhập
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
