import React from 'react';
import { 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Users, 
  HelpCircle, 
  Settings as SettingsIcon, 
  Award, 
  Trophy, 
  Camera, 
  Tv,
  Music,
  GraduationCap,
  FolderHeart,
  Gamepad2
} from 'lucide-react';
import { GameSettings, TeacherUser } from '../types';

interface NavbarProps {
  round: number;
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onOpenTeams: () => void;
  onOpenQuestions: () => void;
  onOpenSettings: () => void;
  onOpenLeaderboard: () => void;
  onOpenCertificate: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  totalQuestions: number;
  activeQuestionsCount: number;
  activeQuestionSetName?: string;
  currentTeacher: TeacherUser | null;
  onOpenAuth: () => void;
  onOpenTeacherBank: () => void;
  onOpenStudentPlay: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  round,
  settings,
  onUpdateSettings,
  onOpenTeams,
  onOpenQuestions,
  onOpenSettings,
  onOpenLeaderboard,
  onOpenCertificate,
  isFullscreen,
  onToggleFullscreen,
  totalQuestions,
  activeQuestionsCount,
  activeQuestionSetName,
  currentTeacher,
  onOpenAuth,
  onOpenTeacherBank,
  onOpenStudentPlay,
}) => {
  return (
    <header className="w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-2.5 flex items-center justify-between z-30 shadow-lg">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 via-amber-500 to-yellow-400 flex items-center justify-center shadow-lg shadow-orange-500/20 text-white font-black text-xl tracking-wider">
          FW
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-lg md:text-xl tracking-tight bg-gradient-to-r from-orange-400 via-amber-300 to-white bg-clip-text text-transparent">
              FREEZE & WIN
            </h1>
            <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs px-2 py-0.5 rounded-full font-semibold hidden sm:inline-block">
              AI CHỌN NGƯỜI
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium hidden md:block">
            {settings.schoolName || 'Lớp Học'} • {settings.classroomName || 'Game Show Giáo Dục'}
          </p>
        </div>
      </div>

      {/* Round & Mode Status */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-lg shadow-inner">
          <span className="text-xs text-slate-400 uppercase font-semibold">Lượt chơi</span>
          <span className="text-base font-black text-amber-400 px-1.5 py-0.2 bg-amber-500/20 rounded border border-amber-500/30">
            #{round}
          </span>
        </div>

        {/* Demo Mode Switch Badge */}
        <button
          onClick={() => onUpdateSettings({ isDemoMode: !settings.isDemoMode })}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
            settings.isDemoMode
              ? 'bg-purple-950/80 text-purple-300 border-purple-500/40 hover:bg-purple-900/80 shadow-md shadow-purple-900/20'
              : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/80 shadow-md shadow-emerald-900/20'
          }`}
          title="Bấm để chuyển đổi giữa chế độ Camera AI và Demo Mode"
        >
          {settings.isDemoMode ? <Tv size={15} /> : <Camera size={15} />}
          <span className="hidden sm:inline">
            {settings.isDemoMode ? 'DEMO MODE' : 'CAMERA AI'}
          </span>
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 md:gap-2">
        {/* Teacher / Student Quick Actions */}
        {currentTeacher ? (
          <button
            onClick={onOpenTeacherBank}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-black border border-orange-500/40 shadow-md shadow-orange-600/25 transition cursor-pointer"
            title={`Đã đăng nhập: Thầy/Cô ${currentTeacher.name} - Bấm để mở Ngân hàng câu hỏi`}
          >
            <FolderHeart size={15} />
            <span className="hidden sm:inline">Ngân hàng: {currentTeacher.name.split(' ').pop()}</span>
            <span className="sm:hidden">Ngân hàng</span>
          </button>
        ) : (
          <>
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-600/80 hover:bg-orange-500 text-white rounded-lg text-xs font-bold border border-orange-500/40 transition cursor-pointer"
              title="Đăng nhập tài khoản Giáo viên để quản lý câu hỏi"
            >
              <GraduationCap size={15} />
              <span className="hidden sm:inline">Giáo viên</span>
            </button>

            <button
              onClick={onOpenStudentPlay}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-bold border border-amber-500/30 transition cursor-pointer"
              title="Học sinh nhập mã chia sẻ để vào chơi"
            >
              <Gamepad2 size={15} />
              <span className="hidden md:inline">Nhập mã chơi</span>
            </button>
          </>
        )}

        {/* Teams Management */}
        <button
          onClick={onOpenTeams}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition shadow-sm"
          title="Quản lý đội chơi"
        >
          <Users size={15} className="text-orange-400" />
          <span className="hidden lg:inline">Đội chơi</span>
        </button>

        {/* Questions Management */}
        <button
          onClick={onOpenQuestions}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition shadow-sm"
          title={`Bộ câu hỏi: ${activeQuestionSetName || 'Mặc định'} (${totalQuestions} câu)`}
        >
          <HelpCircle size={15} className="text-blue-400" />
          <span className="hidden lg:inline">Bộ câu hỏi</span>
          <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold px-1.5 py-0.2 rounded-full border border-blue-500/30">
            {totalQuestions}
          </span>
        </button>

        {/* Leaderboard / End Game */}
        <button
          onClick={onOpenLeaderboard}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 rounded-lg text-xs font-semibold border border-amber-500/30 transition shadow-sm"
          title="Bảng xếp hạng & Kết thúc Game"
        >
          <Trophy size={15} className="text-amber-400" />
          <span className="hidden lg:inline">Bảng vàng</span>
        </button>

        {/* Certificate */}
        <button
          onClick={onOpenCertificate}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition shadow-sm"
          title="Tạo giấy khen điện tử"
        >
          <Award size={15} className="text-emerald-400" />
          <span className="hidden xl:inline">Giấy khen</span>
        </button>

        {/* Move Music Toggle */}
        <button
          onClick={() => onUpdateSettings({ musicEnabled: !settings.musicEnabled })}
          className={`p-2 rounded-lg border transition flex items-center gap-1 ${
            settings.musicEnabled
              ? 'bg-orange-500/15 text-orange-400 border-orange-500/40 hover:bg-orange-500/25 shadow-sm'
              : 'bg-slate-800/60 text-slate-500 border-slate-800 hover:bg-slate-700'
          }`}
          title={
            settings.musicEnabled
              ? `Nhạc chuyển động: BẬT (Âm lượng ${settings.musicVolume}%) - Bấm để tắt`
              : 'Nhạc chuyển động: TẮT - Bấm để bật nhạc khi nhảy'
          }
        >
          <Music size={16} className={settings.musicEnabled ? 'animate-pulse' : ''} />
        </button>

        {/* Sound Toggle */}
        <button
          onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
          className={`p-2 rounded-lg border transition ${
            settings.soundEnabled
              ? 'bg-slate-800 text-emerald-400 border-slate-700 hover:bg-slate-700'
              : 'bg-slate-800/60 text-slate-500 border-slate-800 hover:bg-slate-700'
          }`}
          title={settings.soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
        >
          {settings.soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition"
          title="Cài đặt game"
        >
          <SettingsIcon size={16} />
        </button>

        {/* Fullscreen */}
        <button
          onClick={onToggleFullscreen}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition hidden sm:flex"
          title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình (Chiếu TV/Máy chiếu)'}
        >
          {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
        </button>
      </div>
    </header>
  );
};
