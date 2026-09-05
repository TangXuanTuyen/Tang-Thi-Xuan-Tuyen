import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Settings as SettingsIcon, 
  Sliders, 
  Volume2, 
  VolumeX, 
  ShieldCheck, 
  Music, 
  Play, 
  Square, 
  Upload, 
  Trash2,
  Sparkles,
  Camera,
  CameraOff
} from 'lucide-react';
import { GameSettings, MusicTrackId } from '../types';
import { soundFx, MUSIC_TRACKS } from '../utils/soundEffects';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop music preview if modal closes or unmounts
  useEffect(() => {
    return () => {
      soundFx.stopMoveMusic();
      setPreviewTrackId(null);
    };
  }, [isOpen]);

  const handleClose = () => {
    soundFx.stopMoveMusic();
    setPreviewTrackId(null);
    onClose();
  };

  const handleTogglePreview = (trackId: MusicTrackId) => {
    if (previewTrackId === trackId) {
      soundFx.stopMoveMusic();
      setPreviewTrackId(null);
    } else {
      soundFx.stopMoveMusic();
      soundFx.startMoveMusic(trackId, settings.musicVolume, settings.customMusicUrl);
      setPreviewTrackId(trackId);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      onUpdateSettings({
        musicTrack: 'custom',
        customMusicName: file.name,
        customMusicUrl: dataUrl,
      });
      // Auto-preview new uploaded track
      soundFx.stopMoveMusic();
      soundFx.startMoveMusic('custom', settings.musicVolume, dataUrl);
      setPreviewTrackId('custom');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCustomMusic = () => {
    soundFx.stopMoveMusic();
    setPreviewTrackId(null);
    onUpdateSettings({
      musicTrack: 'funk',
      customMusicName: undefined,
      customMusicUrl: undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
              <SettingsIcon size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Cài Đặt Game Show</h2>
              <p className="text-xs text-slate-400">
                Tùy chỉnh thời gian các vòng, nhạc khi chuyển động và thông tin lớp học.
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 text-slate-200 text-sm">
          {/* 1. MOVE & DANCE MUSIC SECTION */}
          <div className="bg-slate-950/70 p-4 rounded-2xl border-2 border-orange-500/30 space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center">
                  <Music size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                    <span>Nhạc Khi Chuyển Động (MOVE!)</span>
                    <span className="text-[10px] bg-orange-500/20 text-orange-300 font-bold px-2 py-0.5 rounded-full border border-orange-500/30">
                      Mới
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Phát nhạc sôi động cho học sinh nhún nhảy; nhạc ngắt ngay lập tức khi FREEZE!
                  </p>
                </div>
              </div>

              {/* Master Music Toggle */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.musicEnabled}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    onUpdateSettings({ musicEnabled: enabled });
                    if (!enabled) {
                      soundFx.stopMoveMusic();
                      setPreviewTrackId(null);
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
              </label>
            </div>

            {settings.musicEnabled && (
              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                {/* Volume Slider */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Volume2 size={13} className="text-orange-400" />
                      <span>Âm lượng nhạc nền:</span>
                    </span>
                    <span className="font-mono font-bold text-orange-400">
                      {settings.musicVolume}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={settings.musicVolume}
                    onChange={(e) => {
                      const vol = Number(e.target.value);
                      onUpdateSettings({ musicVolume: vol });
                      if (previewTrackId) {
                        soundFx.startMoveMusic(
                          previewTrackId as MusicTrackId,
                          vol,
                          settings.customMusicUrl
                        );
                      }
                    }}
                    className="w-full accent-orange-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Track Selector Grid */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-300 block">
                    Chọn điệu nhạc chuyển động:
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {MUSIC_TRACKS.map((track) => {
                      const isSelected = settings.musicTrack === track.id;
                      const isPreviewing = previewTrackId === track.id;

                      if (track.id === 'custom') return null; // Rendered below

                      return (
                        <div
                          key={track.id}
                          onClick={() => onUpdateSettings({ musicTrack: track.id })}
                          className={`p-2.5 rounded-xl border text-left cursor-pointer transition flex items-center justify-between gap-2 ${
                            isSelected
                              ? 'bg-orange-500/15 border-orange-500/80 text-white shadow-sm'
                              : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-xl shrink-0">{track.emoji}</span>
                            <div className="min-w-0">
                              <div className="text-xs font-black truncate flex items-center gap-1.5">
                                <span>{track.name}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {track.bpm} BPM • {track.description}
                              </div>
                            </div>
                          </div>

                          {/* Preview / Stop Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePreview(track.id);
                            }}
                            className={`p-1.5 rounded-lg text-xs font-bold shrink-0 transition ${
                              isPreviewing
                                ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/30'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'
                            }`}
                            title={isPreviewing ? 'Dừng nghe thử' : 'Nghe thử giai điệu'}
                          >
                            {isPreviewing ? <Square size={13} className="fill-current" /> : <Play size={13} />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Audio Upload Option */}
                <div
                  className={`p-3 rounded-xl border transition ${
                    settings.musicTrack === 'custom'
                      ? 'bg-purple-950/30 border-purple-500/60'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📁</span>
                      <div>
                        <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                          <span>Sử dụng bài hát của riêng bạn (MP3, WAV)</span>
                          {settings.customMusicName && (
                            <span className="text-[10px] bg-purple-500/20 text-purple-300 font-bold px-2 py-0.5 rounded-full border border-purple-500/30">
                              Đã nạp
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {settings.customMusicName
                            ? `Tệp hiện tại: ${settings.customMusicName}`
                            : 'Tải lên bài hát thiếu nhi sôi động của lớp học'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="audio/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <Upload size={13} />
                        <span>{settings.customMusicName ? 'Đổi tệp' : 'Chọn tệp MP3'}</span>
                      </button>

                      {settings.customMusicUrl && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateSettings({ musicTrack: 'custom' });
                              handleTogglePreview('custom');
                            }}
                            className={`p-1.5 rounded-lg text-xs font-bold transition ${
                              previewTrackId === 'custom'
                                ? 'bg-orange-500 text-slate-950 shadow-md'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                            }`}
                            title={previewTrackId === 'custom' ? 'Dừng phát' : 'Nghe thử file tải lên'}
                          >
                            {previewTrackId === 'custom' ? (
                              <Square size={13} className="fill-current" />
                            ) : (
                              <Play size={13} />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={handleRemoveCustomMusic}
                            className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/30 text-xs transition"
                            title="Xóa tệp tải lên"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Timing Durations */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-xs uppercase font-extrabold text-amber-400 tracking-wider flex items-center gap-2">
              <Sliders size={14} />
              <span>Thời gian các giai đoạn</span>
            </h3>

            {/* MOVE duration slider */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-300">
                  Thời gian nhảy & tạo dáng (MOVE!):
                </span>
                <span className="text-sm font-black text-amber-400 font-mono">
                  {settings.moveDurationSec} giây
                </span>
              </div>
              <input
                type="range"
                min={3}
                max={15}
                value={settings.moveDurationSec}
                onChange={(e) => onUpdateSettings({ moveDurationSec: Number(e.target.value) })}
                className="w-full accent-orange-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>3s (Nhanh)</span>
                <span>6s (Chuẩn)</span>
                <span>15s (Thong thả)</span>
              </div>
            </div>

            {/* SCANNING duration */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-300">
                  Thời gian quét người chơi (SCANNING):
                </span>
                <span className="text-sm font-black text-cyan-400 font-mono">
                  {settings.scanDurationSec} giây
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={6}
                value={settings.scanDurationSec}
                onChange={(e) => onUpdateSettings({ scanDurationSec: Number(e.target.value) })}
                className="w-full accent-cyan-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* RANDOM PICK duration */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-300">
                  Thời gian quay chọn người (RANDOM PICK):
                </span>
                <span className="text-sm font-black text-purple-400 font-mono">
                  {settings.pickDurationSec} giây
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={6}
                value={settings.pickDurationSec}
                onChange={(e) => onUpdateSettings({ pickDurationSec: Number(e.target.value) })}
                className="w-full accent-purple-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* 3. Classroom & Certificate Information */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-xs uppercase font-extrabold text-blue-400 tracking-wider">
              Thông tin trường & Lớp (In trên Giấy khen)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Tên trường:</label>
                <input
                  type="text"
                  value={settings.schoolName}
                  onChange={(e) => onUpdateSettings({ schoolName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500"
                  placeholder="Trường Tiểu học / THCS..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Tên lớp / Nhóm:</label>
                <input
                  type="text"
                  value={settings.classroomName}
                  onChange={(e) => onUpdateSettings({ classroomName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500"
                  placeholder="Lớp 5A / 6A1..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-400 block mb-1">Tên Giáo viên phụ trách:</label>
                <input
                  type="text"
                  value={settings.teacherName}
                  onChange={(e) => onUpdateSettings({ teacherName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500"
                  placeholder="Thầy/Cô..."
                />
              </div>
            </div>
          </div>

          {/* 4. Game Options & Question Ordering */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-xs uppercase font-extrabold text-emerald-400 tracking-wider">
              Tùy chọn câu hỏi & Hiệu ứng
            </h3>

            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-300">
                Xáo trộn ngẫu nhiên thứ tự câu hỏi:
              </span>
              <input
                type="checkbox"
                checked={settings.randomQuestionOrder}
                onChange={(e) => onUpdateSettings({ randomQuestionOrder: e.target.checked })}
                className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-bold text-slate-300">
                Bật hiệu ứng âm thanh Synthesizer (Tiếng đóng băng, chúc mừng, gõ nhịp):
              </span>
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => onUpdateSettings({ soundEnabled: e.target.checked })}
                className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* 5. Camera & Cảm biến bắt chuyển động */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-xs uppercase font-extrabold text-cyan-400 tracking-wider flex items-center gap-2">
              <Camera size={14} />
              <span>Camera & Cảm Biến Bắt Chuyển Động</span>
            </h3>

            {/* Motion Sensitivity Slider */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-300">
                  Độ nhạy bắt chuyển động (AI Frame Differencing):
                </span>
                <span className="text-sm font-black text-cyan-400 font-mono">
                  {settings.motionSensitivity}/10
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={settings.motionSensitivity}
                onChange={(e) => onUpdateSettings({ motionSensitivity: Number(e.target.value) })}
                className="w-full accent-cyan-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>1 (Ít nhạy, cho phòng học chói sáng)</span>
                <span>5 (Chuẩn khuyên dùng)</span>
                <span>10 (Cực nhạy, phát hiện cựa quậy nhẹ)</span>
              </div>
            </div>

            {/* Demo Mode Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <div>
                <span className="text-xs font-bold text-slate-200 block">
                  Chế độ Demo (Không cần Webcam):
                </span>
                <span className="text-[11px] text-slate-400">
                  Dùng hoạt họa nhân vật nếu máy tính của trường không có camera hoặc camera bị hỏng.
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.isDemoMode}
                onChange={(e) => onUpdateSettings({ isDemoMode: e.target.checked })}
                className="w-4 h-4 accent-orange-500 rounded cursor-pointer shrink-0 ml-3"
              />
            </div>
          </div>

          {/* Privacy & Safety Statement */}
          <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex items-start gap-2.5 text-xs text-emerald-300">
            <ShieldCheck size={18} className="shrink-0 text-emerald-400 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Bảo mật & Quyền riêng tư:</strong> Ứng dụng xử lý chuyển động trực tiếp trong bộ nhớ trình duyệt, 
              <strong> hoàn toàn không lưu trữ hoặc gửi bất kỳ hình ảnh hay video camera nào</strong> ra bên ngoài.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-end bg-slate-950/80">
          <button
            onClick={handleClose}
            className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-lg shadow-orange-600/30 transition"
          >
            Đóng Cài Đặt
          </button>
        </div>
      </div>
    </div>
  );
};
