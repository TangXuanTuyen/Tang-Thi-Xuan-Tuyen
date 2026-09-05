import React, { useState } from 'react';
import { X, Printer, Award, Sparkles, Download, Check } from 'lucide-react';
import { Team, GameSettings } from '../types';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  settings: GameSettings;
  defaultWinningTeam?: Team;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  isOpen,
  onClose,
  teams,
  settings,
  defaultWinningTeam,
}) => {
  const [recipientName, setRecipientName] = useState<string>(
    defaultWinningTeam?.name || teams[0]?.name || 'Đội Quán Quân'
  );
  const [achievementTitle, setAchievementTitle] = useState<string>('ĐỘI QUÁN QUÂN XUẤT SẮC');
  const [reason, setReason] = useState<string>(
    'Đã xuất sắc thể hiện bản lĩnh, phản xạ nhanh nhạy và tinh thần đồng đội trong Game Show FREEZE & WIN'
  );
  const [schoolName, setSchoolName] = useState<string>(settings.schoolName || 'TRƯỜNG TIỂU HỌC & THCS');
  const [classroomName, setClassroomName] = useState<string>(settings.classroomName || 'LỚP HỌC THÔNG THÁI');
  const [teacherName, setTeacherName] = useState<string>(settings.teacherName || 'Ban Tổ Chức Game Show');
  const [certDate, setCertDate] = useState<string>(
    new Date().toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  );

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const presetTitles = [
    'ĐỘI QUÁN QUÂN XUẤT SẮC',
    'ĐỘI Á QUÂN TÀI NĂNG',
    'NGÔI SAO PHẢN XẠ NHANH NHẤT',
    'ĐỘI BỨT PHÁ ẤN TƯỢNG',
    'ĐỘI ĐOÀN KẾT VÔ ĐỊCH',
    'HỌC SINH THÔNG THÁI NHẤT',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header - Screen only */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Award size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Giấy Khen Điện Tử Lớp Học</h2>
              <p className="text-xs text-slate-400">
                Chứng nhận thành tích cho học sinh và đội chiến thắng, tối ưu để in trực tiếp hoặc lưu PDF.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition"
            >
              <Printer size={15} />
              <span>In Giấy Khen (Print / PDF)</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content: Form controls on top (no-print) + Certificate Canvas Preview */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* Quick Customization Form (Screen only) */}
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 no-print">
            <span className="text-xs uppercase font-extrabold text-amber-400 block mb-3">
              Tùy chỉnh thông tin giấy khen:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Người nhận (Học sinh / Đội):
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Danh hiệu / Thành tích:</label>
                <select
                  value={achievementTitle}
                  onChange={(e) => setAchievementTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold focus:border-amber-400"
                >
                  {presetTitles.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Ngày trao thưởng:</label>
                <input
                  type="text"
                  value={certDate}
                  onChange={(e) => setCertDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold focus:border-amber-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Trường:</label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-1.5 rounded-xl text-xs focus:border-amber-400"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Lớp:</label>
                <input
                  type="text"
                  value={classroomName}
                  onChange={(e) => setClassroomName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-1.5 rounded-xl text-xs focus:border-amber-400"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Giáo viên / Ban tổ chức:</label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-1.5 rounded-xl text-xs focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          {/* PRINTABLE CERTIFICATE PAPER CANVAS */}
          <div className="flex justify-center">
            <div
              id="printable-certificate"
              className="certificate-paper w-full max-w-[850px] aspect-[1.414/1] bg-gradient-to-br from-amber-50/95 via-white to-orange-50/90 text-slate-900 p-8 sm:p-12 rounded-2xl shadow-2xl border-[10px] border-amber-500/80 relative flex flex-col justify-between overflow-hidden"
              style={{
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), inset 0 0 40px rgba(245, 158, 11, 0.1)',
              }}
            >
              {/* Luxury Certificate Geometric Border Pattern */}
              <div className="absolute inset-2 border-2 border-amber-600/40 rounded-xl pointer-events-none" />
              <div className="absolute inset-3 border border-dashed border-orange-500/30 rounded-lg pointer-events-none" />

              {/* Corner Ornaments */}
              <div className="absolute top-4 left-4 text-amber-500 text-xl font-serif">✦</div>
              <div className="absolute top-4 right-4 text-amber-500 text-xl font-serif">✦</div>
              <div className="absolute bottom-4 left-4 text-amber-500 text-xl font-serif">✦</div>
              <div className="absolute bottom-4 right-4 text-amber-500 text-xl font-serif">✦</div>

              {/* Top: School & National Header */}
              <div className="text-center relative z-10">
                <div className="uppercase text-[11px] sm:text-xs tracking-widest font-black text-amber-700">
                  {schoolName} • {classroomName}
                </div>
                <div className="w-16 h-0.5 bg-amber-400 mx-auto my-1.5" />
                <h1 className="text-2xl sm:text-4xl font-black tracking-wider text-orange-600 font-serif uppercase drop-shadow-sm mt-2">
                  GIẤY KHEN DANH DỰ
                </h1>
                <p className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                  GAME SHOW GIÁO DỤC: FREEZE & WIN – AI CHỌN NGƯỜI
                </p>
              </div>

              {/* Center: Recipient & Achievement */}
              <div className="text-center my-4 relative z-10">
                <p className="text-xs sm:text-sm italic text-slate-600 font-serif">
                  Trân trọng trao tặng danh hiệu:
                </p>
                <div className="inline-block my-2 px-6 py-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-slate-950 font-black text-sm sm:text-xl rounded-full uppercase tracking-wider shadow-md">
                  {achievementTitle}
                </div>
                <p className="text-xs sm:text-sm text-slate-600 font-serif mt-1">Dành cho:</p>
                <h2 className="text-2xl sm:text-4xl font-black text-slate-900 font-serif underline decoration-amber-400 decoration-wavy underline-offset-8 mt-1 mb-3">
                  {recipientName}
                </h2>
                <p className="text-xs sm:text-sm text-slate-700 max-w-lg mx-auto font-medium leading-relaxed italic">
                  &ldquo;{reason}&rdquo;
                </p>
              </div>

              {/* Bottom: Date & Signatures */}
              <div className="flex items-end justify-between pt-4 relative z-10">
                {/* Left: Gold Seal */}
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-500 border-4 border-white shadow-xl flex flex-col items-center justify-center text-slate-950 font-black text-[9px] text-center leading-tight">
                    <span>★ ★ ★</span>
                    <span className="font-extrabold uppercase text-[8px]">CHỨNG NHẬN</span>
                    <span className="text-[7px]">XUẤT SẮC</span>
                  </div>
                </div>

                {/* Right: Teacher Signature */}
                <div className="text-center">
                  <p className="text-[10px] sm:text-xs text-slate-500 italic">
                    Ngày {certDate}
                  </p>
                  <p className="text-xs sm:text-sm font-extrabold text-slate-800 uppercase mt-0.5">
                    GIÁO VIÊN PHỤ TRÁCH
                  </p>
                  <div className="h-10 sm:h-12 flex items-center justify-center">
                    <span className="font-serif italic text-base sm:text-lg text-blue-800 font-bold drop-shadow-sm">
                      {teacherName}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium">(Ký và ghi rõ họ tên)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-between items-center bg-slate-950/80 no-print">
          <span className="text-xs text-slate-400">
            Mẹo: Chọn <strong>&ldquo;Save as PDF&rdquo;</strong> trong hộp thoại in để lưu file giấy khen.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
