import React, { useState } from 'react';
import { X, Plus, Trash2, RotateCcw, Shuffle, Check, Shield } from 'lucide-react';
import { Team, PlayerSlot } from '../types';

interface TeamManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  playerSlots: PlayerSlot[];
  onUpdateTeams: (newTeams: Team[]) => void;
  onUpdatePlayerSlots: (newSlots: PlayerSlot[]) => void;
  onResetAllScores: () => void;
}

const AVAILABLE_COLORS = [
  { name: 'Cam FPT', hex: '#F26F21', gradient: 'from-orange-500 to-amber-600', text: 'text-orange-500', border: 'border-orange-500' },
  { name: 'Xanh Dương', hex: '#2563EB', gradient: 'from-blue-600 to-cyan-600', text: 'text-blue-500', border: 'border-blue-500' },
  { name: 'Đỏ Rực', hex: '#DC2626', gradient: 'from-red-600 to-rose-600', text: 'text-red-500', border: 'border-red-500' },
  { name: 'Xanh Lá', hex: '#16A34A', gradient: 'from-emerald-600 to-teal-600', text: 'text-emerald-500', border: 'border-emerald-500' },
  { name: 'Tím', hex: '#9333EA', gradient: 'from-purple-600 to-indigo-600', text: 'text-purple-500', border: 'border-purple-500' },
  { name: 'Vàng', hex: '#EAB308', gradient: 'from-yellow-500 to-amber-500', text: 'text-yellow-500', border: 'border-yellow-500' },
  { name: 'Hồng', hex: '#DB2777', gradient: 'from-pink-600 to-rose-500', text: 'text-pink-500', border: 'border-pink-500' },
  { name: 'Xanh Ngọc', hex: '#0D9488', gradient: 'from-teal-600 to-emerald-600', text: 'text-teal-500', border: 'border-teal-500' },
];

const AVAILABLE_ICONS = ['🦁', '🚀', '⚡', '🐉', '🌟', '🦅', '🐯', '🎯', '🏆', '🐬', '🐼', '🦊', '🔥', '👑', '🌈', '💎'];

export const TeamManagerModal: React.FC<TeamManagerModalProps> = ({
  isOpen,
  onClose,
  teams,
  playerSlots,
  onUpdateTeams,
  onUpdatePlayerSlots,
  onResetAllScores,
}) => {
  const [editingTeams, setEditingTeams] = useState<Team[]>(teams);
  const [selectedSlotAssignments, setSelectedSlotAssignments] = useState<{
    1: string;
    2: string;
    3: string;
  }>({
    1: playerSlots.find((s) => s.slotId === 1)?.teamId || teams[0]?.id || '',
    2: playerSlots.find((s) => s.slotId === 2)?.teamId || teams[1]?.id || '',
    3: playerSlots.find((s) => s.slotId === 3)?.teamId || teams[2]?.id || '',
  });

  if (!isOpen) return null;

  const handleNameChange = (id: string, name: string) => {
    setEditingTeams(
      editingTeams.map((t) => (t.id === id ? { ...t, name } : t))
    );
  };

  const handleColorChange = (id: string, colorObj: typeof AVAILABLE_COLORS[0]) => {
    setEditingTeams(
      editingTeams.map((t) =>
        t.id === id
          ? {
              ...t,
              color: colorObj.hex,
              bgGradient: colorObj.gradient,
              textColor: colorObj.text,
              borderColor: colorObj.border,
            }
          : t
      )
    );
  };

  const handleIconChange = (id: string, icon: string) => {
    setEditingTeams(
      editingTeams.map((t) => (t.id === id ? { ...t, icon } : t))
    );
  };

  const handleAddTeam = () => {
    if (editingTeams.length >= 6) return;
    const colorIndex = editingTeams.length % AVAILABLE_COLORS.length;
    const colorObj = AVAILABLE_COLORS[colorIndex];
    const newTeam: Team = {
      id: `team-${Date.now()}`,
      name: `Đội Mới ${editingTeams.length + 1}`,
      color: colorObj.hex,
      bgGradient: colorObj.gradient,
      textColor: colorObj.text,
      borderColor: colorObj.border,
      icon: AVAILABLE_ICONS[editingTeams.length % AVAILABLE_ICONS.length],
      score: 0,
    };
    setEditingTeams([...editingTeams, newTeam]);
  };

  const handleRemoveTeam = (id: string) => {
    if (editingTeams.length <= 2) {
      alert('Cần có tối thiểu 2 đội chơi.');
      return;
    }
    const filtered = editingTeams.filter((t) => t.id !== id);
    setEditingTeams(filtered);

    // Update slot assignments if removed team was assigned
    const fallbackTeamId = filtered[0].id;
    setSelectedSlotAssignments({
      1: selectedSlotAssignments[1] === id ? fallbackTeamId : selectedSlotAssignments[1],
      2: selectedSlotAssignments[2] === id ? fallbackTeamId : selectedSlotAssignments[2],
      3: selectedSlotAssignments[3] === id ? fallbackTeamId : selectedSlotAssignments[3],
    });
  };

  const handleAutoRotateSlots = () => {
    if (editingTeams.length < 3) return;
    // Shuffle teams for 3 slots
    const shuffled = [...editingTeams].sort(() => 0.5 - Math.random());
    setSelectedSlotAssignments({
      1: shuffled[0].id,
      2: shuffled[1].id,
      3: shuffled[2]?.id || shuffled[0].id,
    });
  };

  const handleSave = () => {
    onUpdateTeams(editingTeams);

    // Update player slots with new assigned teamIds
    const updatedSlots: PlayerSlot[] = playerSlots.map((slot) => ({
      ...slot,
      teamId: selectedSlotAssignments[slot.slotId] || slot.teamId,
    }));
    onUpdatePlayerSlots(updatedSlots);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
              <Shield size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Quản Lý Đội Chơi & Vị Trí</h2>
              <p className="text-xs text-slate-400">
                Tạo 2–6 đội, tùy chỉnh tên, màu sắc, biểu tượng và gán vào 3 vị trí trên camera.
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
        <div className="p-5 space-y-6 overflow-y-auto flex-1">
          {/* 1. Slot Assignment for Camera Zones (PLAYER 1, PLAYER 2, PLAYER 3) */}
          <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                <span>🎯 GÁN ĐỘI VÀO 3 VỊ TRÍ CAMERA (PLAYER 1 - 3)</span>
              </span>
              <button
                type="button"
                onClick={handleAutoRotateSlots}
                className="flex items-center gap-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 font-semibold transition"
              >
                <Shuffle size={13} />
                <span>Trộn ngẫu nhiên 3 đội</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {([1, 2, 3] as const).map((slotId) => (
                <div key={slotId} className="bg-slate-900 p-3 rounded-xl border border-slate-700">
                  <label className="text-xs font-bold text-slate-400 block mb-1.5">
                    PLAYER {slotId} ({slotId === 1 ? 'Vùng Trái' : slotId === 2 ? 'Vùng Giữa' : 'Vùng Phải'}):
                  </label>
                  <select
                    value={selectedSlotAssignments[slotId]}
                    onChange={(e) =>
                      setSelectedSlotAssignments({
                        ...selectedSlotAssignments,
                        [slotId]: e.target.value,
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:border-orange-500"
                  >
                    {editingTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.icon} {t.name} ({t.score}đ)
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Teams List Editor */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-slate-200">
                Danh sách đội ({editingTeams.length}/6 đội)
              </span>
              <button
                type="button"
                onClick={handleAddTeam}
                disabled={editingTeams.length >= 6}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition ${
                  editingTeams.length >= 6
                    ? 'opacity-40 cursor-not-allowed bg-slate-800 border-slate-800 text-slate-500'
                    : 'bg-orange-600 hover:bg-orange-500 text-white border-orange-500 shadow-md'
                }`}
              >
                <Plus size={14} />
                <span>Thêm đội ({editingTeams.length}/6)</span>
              </button>
            </div>

            <div className="space-y-3">
              {editingTeams.map((team, idx) => (
                <div
                  key={team.id}
                  className="bg-slate-800/80 border border-slate-700 rounded-2xl p-3.5 flex flex-col md:flex-row items-center gap-3 justify-between"
                >
                  {/* Left: Icon & Name */}
                  <div className="flex items-center gap-3 w-full md:w-auto flex-1">
                    {/* Icon selector dropdown */}
                    <div className="relative group">
                      <button
                        type="button"
                        className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-2xl hover:border-orange-500 transition shadow-inner"
                      >
                        {team.icon}
                      </button>
                      <div className="absolute top-12 left-0 z-20 hidden group-hover:grid grid-cols-4 gap-1 p-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl">
                        {AVAILABLE_ICONS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleIconChange(team.id, emoji)}
                            className="w-8 h-8 rounded hover:bg-slate-800 flex items-center justify-center text-lg"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Team Name Input */}
                    <input
                      type="text"
                      value={team.name}
                      onChange={(e) => handleNameChange(team.id, e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 text-white px-3.5 py-2 rounded-xl text-sm font-bold focus:outline-none focus:border-orange-500"
                      placeholder="Tên đội..."
                    />
                  </div>

                  {/* Right: Color palette selector & Delete */}
                  <div className="flex items-center gap-3 w-full md:w-auto justify-between">
                    {/* Color swatches */}
                    <div className="flex items-center gap-1.5">
                      {AVAILABLE_COLORS.map((col) => (
                        <button
                          key={col.hex}
                          type="button"
                          onClick={() => handleColorChange(team.id, col)}
                          className={`w-6 h-6 rounded-full transition-transform ${
                            team.color === col.hex
                              ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900 shadow-md'
                              : 'opacity-70 hover:opacity-100 hover:scale-110'
                          }`}
                          style={{ backgroundColor: col.hex }}
                          title={col.name}
                        />
                      ))}
                    </div>

                    {/* Score display */}
                    <div className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-mono font-bold text-amber-300">
                      {team.score}đ
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveTeam(team.id)}
                      disabled={editingTeams.length <= 2}
                      className={`p-2 rounded-lg border transition ${
                        editingTeams.length <= 2
                          ? 'opacity-30 cursor-not-allowed text-slate-600 border-slate-800'
                          : 'text-red-400 hover:text-white hover:bg-red-950/80 border-red-900/40'
                      }`}
                      title="Xóa đội"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/80">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Bạn có chắc muốn đặt lại điểm số của tất cả các đội về 0?')) {
                onResetAllScores();
                setEditingTeams(editingTeams.map((t) => ({ ...t, score: 0 })));
              }
            }}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 font-semibold px-3 py-2 rounded-xl bg-red-950/40 hover:bg-red-950/80 border border-red-900/50 transition"
          >
            <RotateCcw size={14} />
            <span>Đặt lại điểm tất cả về 0</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-semibold transition"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold shadow-lg shadow-orange-600/30 transition"
            >
              <Check size={16} />
              <span>Lưu Thiết Lập</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
