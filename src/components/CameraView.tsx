import React, { useEffect, useRef, useState } from 'react';
import { 
  Camera, 
  CameraOff, 
  RefreshCw, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Activity, 
  UserCheck
} from 'lucide-react';
import { GameState, PlayerSlot, Team } from '../types';
import { CameraMotionDetector, ZoneDetectionResult } from '../utils/motionDetector';

interface CameraViewProps {
  gameState: GameState;
  playerSlots: PlayerSlot[];
  teams: Team[];
  isDemoMode: boolean;
  highlightedSlot: number | null;
  winnerSlot: number | null;
  onSlotClick?: (slotId: 1 | 2 | 3) => void;
  onToggleSlotActive?: (slotId: 1 | 2 | 3) => void;
  onUpdateSlotDetection?: (results: ZoneDetectionResult) => void;
  sensitivity: number;
}

export const CameraView: React.FC<CameraViewProps> = ({
  gameState,
  playerSlots,
  teams,
  isDemoMode,
  highlightedSlot,
  winnerSlot,
  onSlotClick,
  onToggleSlotActive,
  onUpdateSlotDetection,
  sensitivity,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const motionDetectorRef = useRef<CameraMotionDetector | null>(null);
  const onUpdateSlotDetectionRef = useRef(onUpdateSlotDetection);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState<boolean>(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isFlipped, setIsFlipped] = useState<boolean>(true);

  // Keep onUpdateSlotDetectionRef in sync without triggering effects
  useEffect(() => {
    onUpdateSlotDetectionRef.current = onUpdateSlotDetection;
  }, [onUpdateSlotDetection]);

  // Initialize motion detector once on mount and maintain across entire lifecycle
  useEffect(() => {
    const detector = new CameraMotionDetector();
    detector.setSensitivity(sensitivity);
    detector.setIsFlipped(isFlipped);
    detector.onDetection((results) => {
      onUpdateSlotDetectionRef.current?.(results);
    });
    motionDetectorRef.current = detector;

    if (videoRef.current && stream) {
      detector.setVideoElement(videoRef.current);
      detector.start();
    }

    return () => {
      detector.stop();
      motionDetectorRef.current = null;
    };
  }, []);

  // Update sensitivity without re-instantiating detector
  useEffect(() => {
    motionDetectorRef.current?.setSensitivity(sensitivity);
  }, [sensitivity]);

  // Update flip mapping without re-instantiating detector
  useEffect(() => {
    motionDetectorRef.current?.setIsFlipped(isFlipped);
  }, [isFlipped]);

  // Start / Stop Camera based on isDemoMode
  const startCamera = async () => {
    if (isDemoMode) return;
    setIsCameraLoading(true);
    setCameraError(null);

    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });

      setStream(mediaStream);
      setHasCameraPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
        if (motionDetectorRef.current) {
          motionDetectorRef.current.setVideoElement(videoRef.current);
          motionDetectorRef.current.setIsFlipped(isFlipped);
          motionDetectorRef.current.setSensitivity(sensitivity);
          motionDetectorRef.current.start();
        }
      }
    } catch (err: unknown) {
      console.warn('Camera access issue:', err);
      const errorMsg = err instanceof Error ? err.message : 'Không thể truy cập camera.';
      setCameraError(errorMsg);
      setHasCameraPermission(false);
    } finally {
      setIsCameraLoading(false);
    }
  };

  const stopCamera = () => {
    motionDetectorRef.current?.stop();
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    if (!isDemoMode) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isDemoMode]);

  // Handle active slot helper
  const getTeamForSlot = (teamId: string) => {
    return teams.find((t) => t.id === teamId) || teams[0];
  };

  return (
    <div className="relative w-full aspect-video bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-800 shadow-2xl flex items-center justify-center select-none group">
      {/* 1. Real Camera Feed */}
      {!isDemoMode && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onPlay={() => {
            if (videoRef.current && motionDetectorRef.current) {
              motionDetectorRef.current.setVideoElement(videoRef.current);
              motionDetectorRef.current.setIsFlipped(isFlipped);
              motionDetectorRef.current.setSensitivity(sensitivity);
              motionDetectorRef.current.start();
            }
          }}
          className={`w-full h-full object-cover transition-transform duration-300 ${
            isFlipped ? '-scale-x-100' : ''
          }`}
        />
      )}

      {/* 2. Demo Mode Animated Studio Background */}
      {isDemoMode && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950/70 to-slate-950 flex items-center justify-center overflow-hidden">
          {/* Animated Studio Lights */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />
        </div>
      )}

      {/* Camera Permission / Error Overlay */}
      {!isDemoMode && hasCameraPermission === false && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-4 shadow-lg">
            <CameraOff size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-100 mb-2">
            Không thể kích hoạt Camera
          </h3>
          <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
            {cameraError || 'Trình duyệt chưa được cấp quyền camera hoặc thiết bị không có webcam.'}
            <br />
            Bạn có thể thử cấp quyền lại hoặc chuyển sang <strong>DEMO MODE</strong> để tiếp tục chơi ngay mà không cần camera!
          </p>
          <div className="flex gap-3 flex-wrap justify-center">
            <button
              onClick={startCamera}
              disabled={isCameraLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-semibold shadow-lg shadow-orange-600/30 transition text-sm"
            >
              <RefreshCw size={16} className={isCameraLoading ? 'animate-spin' : ''} />
              Thử lại Camera
            </button>
          </div>
        </div>
      )}

      {/* 3. Global Game State Visual Overlays on Stage */}
      {/* FREEZE Ice Frost Overlay */}
      {gameState === 'FREEZE' && (
        <div className="absolute inset-0 border-8 border-cyan-400/80 bg-cyan-950/30 backdrop-contrast-125 z-10 pointer-events-none animate-pulse flex items-center justify-center">
          <div className="absolute top-4 left-4 text-cyan-300 text-sm font-black flex items-center gap-2 tracking-wider bg-cyan-900/60 px-3 py-1 rounded-lg border border-cyan-400/40 shadow-lg">
            <span>❄️ FREEZE ACTIVE</span>
          </div>
        </div>
      )}

      {/* MOVE Vibrant Glow Overlay */}
      {gameState === 'MOVE' && (
        <div className="absolute inset-0 border-4 border-amber-400/60 shadow-[inset_0_0_80px_rgba(245,158,11,0.25)] pointer-events-none z-10 animate-pulse" />
      )}

      {/* SCANNING High-Tech Laser Scanline */}
      {gameState === 'SCANNING' && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
          <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_#22d3ee] animate-scanline" />
          <div className="absolute top-3 right-4 bg-slate-900/80 border border-cyan-500/50 text-cyan-300 text-xs px-3 py-1 rounded-full font-mono flex items-center gap-2 animate-pulse">
            <Activity size={14} className="animate-spin text-cyan-400" />
            AI SCANNING ZONES
          </div>
        </div>
      )}

      {/* 4. 3 PLAYER ZONES INTERACTIVE GRID */}
      <div className="absolute inset-0 grid grid-cols-3 divide-x-2 divide-slate-700/60 z-10">
        {playerSlots.map((slot) => {
          const team = getTeamForSlot(slot.teamId);
          const isHighlighted = highlightedSlot === slot.slotId;
          const isWinner = winnerSlot === slot.slotId;
          const isScanning = gameState === 'SCANNING';
          const isPicking = gameState === 'RANDOM_PICK';

          return (
            <div
              key={slot.slotId}
              onClick={() => onSlotClick && onSlotClick(slot.slotId)}
              className={`relative h-full flex flex-col justify-between p-3 sm:p-4 transition-all duration-300 cursor-pointer ${
                !slot.active ? 'opacity-40 grayscale bg-slate-950/60' : ''
              } ${
                isHighlighted
                  ? 'bg-amber-500/25 ring-4 ring-amber-400 ring-inset shadow-[0_0_50px_rgba(245,158,11,0.4)]'
                  : ''
              } ${
                isWinner
                  ? 'bg-amber-500/30 ring-8 ring-amber-400 ring-inset shadow-[0_0_80px_rgba(245,158,11,0.7)]'
                  : 'hover:bg-slate-800/20'
              }`}
            >
              {/* Winner Spotlight Beam */}
              {isWinner && (
                <div className="absolute inset-0 bg-gradient-to-b from-amber-400/40 via-transparent to-amber-500/30 pointer-events-none animate-pulse">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-amber-400/30 rounded-full blur-3xl" />
                </div>
              )}

              {/* Top HUD: Slot Number & Active Check */}
              <div className="flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs sm:text-sm font-black px-2.5 py-1 rounded-lg shadow-md border"
                    style={{
                      backgroundColor: `${team.color}25`,
                      color: team.color,
                      borderColor: `${team.color}50`,
                    }}
                  >
                    {slot.label}
                  </span>

                  {/* Presence indicator */}
                  {slot.active && (
                    <span
                      className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border ${
                        slot.present
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-900/80 text-slate-400 border-slate-700'
                      }`}
                    >
                      <UserCheck size={12} className={slot.present ? 'text-emerald-400' : 'text-slate-500'} />
                      <span className="hidden xl:inline">{slot.present ? 'Hiện diện' : 'Chờ'}</span>
                    </span>
                  )}
                </div>

                {/* Slot Toggle Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onToggleSlotActive) onToggleSlotActive(slot.slotId);
                  }}
                  className={`text-[10px] font-bold px-2 py-1 rounded-md border transition ${
                    slot.active
                      ? 'bg-slate-900/80 text-slate-200 border-slate-700 hover:bg-slate-800'
                      : 'bg-red-950/80 text-red-300 border-red-800 hover:bg-red-900'
                  }`}
                  title={slot.active ? 'Tắt slot này' : 'Bật lại slot này'}
                >
                  {slot.active ? 'BẬT' : 'TẮT'}
                </button>
              </div>

              {/* Center Character Avatar in Demo Mode OR Target Crosshair in Camera Mode */}
              <div className="flex-1 flex flex-col items-center justify-center my-1 relative z-10 pointer-events-none">
                {isDemoMode ? (
                  <div
                    className={`w-16 h-16 sm:w-24 sm:h-24 rounded-2xl flex flex-col items-center justify-center shadow-2xl transition-all duration-300 border-2 ${
                      isWinner
                        ? 'scale-110 rotate-1 border-amber-300 bg-amber-400/20'
                        : isHighlighted
                        ? 'scale-105 border-amber-400 bg-slate-900/90'
                        : 'border-slate-700/80 bg-slate-900/70'
                    }`}
                  >
                    <span className="text-3xl sm:text-4xl drop-shadow-md transform hover:scale-110 transition">
                      {team.icon}
                    </span>
                    <span className="text-[10px] sm:text-xs font-extrabold text-slate-300 mt-0.5">
                      {slot.label}
                    </span>
                  </div>
                ) : (
                  /* Camera Mode Zone Target Crosshair */
                  <div
                    className={`w-20 h-20 sm:w-32 sm:h-32 rounded-2xl border-2 border-dashed flex items-center justify-center transition-all ${
                      isWinner
                        ? 'border-amber-400 bg-amber-400/20 scale-105'
                        : isHighlighted
                        ? 'border-amber-400/80 bg-amber-400/10'
                        : isScanning
                        ? 'border-cyan-400/60 animate-pulse'
                        : 'border-slate-600/40'
                    }`}
                  >
                    <div className="text-center">
                      <span className="text-2xl sm:text-3xl opacity-80">{team.icon}</span>
                      <p className="text-[10px] sm:text-xs font-bold text-slate-400 mt-0.5">
                        VÙNG {slot.slotId}
                      </p>
                    </div>
                  </div>
                )}

                {/* Real-Time Freeze Stillness & Reaction Badges */}
                {(gameState === 'FREEZE' || gameState === 'SCANNING') && slot.active && (
                  <div className="mt-1 flex flex-col items-center gap-0.5">
                    {slot.motionLevel <= 10 ? (
                      <span className="bg-emerald-950/95 border border-emerald-400/80 text-emerald-300 font-black text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full shadow-lg flex items-center gap-1 animate-pulse">
                        <span>❄️ BẤT ĐỘNG ({slot.motionLevel}% ĐỘNG)</span>
                      </span>
                    ) : (
                      <span className="bg-rose-950/95 border border-rose-500/80 text-rose-300 font-black text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full shadow-lg flex items-center gap-1 animate-bounce">
                        <span>⚠️ ĐANG CỬ ĐỘNG ({slot.motionLevel}%)</span>
                      </span>
                    )}
                  </div>
                )}

                {/* Freeze Result Rank & Speed Badge during PICK and WINNER */}
                {(gameState === 'RANDOM_PICK' || gameState === 'WINNER') && slot.active && slot.freezeScore !== undefined && (
                  <div className="mt-1 flex flex-col items-center gap-0.5">
                    {slot.freezeRank === 1 ? (
                      <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-400 text-slate-950 font-black text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full shadow-lg flex items-center gap-1">
                        <span>🥇 ÍT CỬ ĐỘNG NHẤT (Tĩnh: {slot.freezeScore}% • {slot.freezeReactionTimeSec}s)</span>
                      </span>
                    ) : (
                      <span className="bg-slate-900/90 border border-slate-700 text-slate-300 font-bold text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full">
                        Hạng {slot.freezeRank}: Tĩnh {slot.freezeScore}% ({slot.freezeReactionTimeSec}s)
                      </span>
                    )}
                  </div>
                )}

                {/* Winner Badge on Zone */}
                {isWinner && (
                  <div className="mt-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs sm:text-sm px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 animate-bounce">
                    <Sparkles size={14} />
                    <span>ĐỨNG YÊN NHANH NHẤT!</span>
                  </div>
                )}
              </div>

              {/* Bottom HUD: Team Name & Motion Meter */}
              <div className="bg-slate-900/90 backdrop-blur-md rounded-xl p-2 sm:p-2.5 border border-slate-700/80 shadow-lg z-10">
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm sm:text-base">{team.icon}</span>
                    <span className="font-extrabold text-xs sm:text-sm text-slate-100 truncate">
                      {team.name}
                    </span>
                  </div>
                  <span
                    className="text-xs sm:text-sm font-black px-2 py-0.5 rounded shadow-inner"
                    style={{
                      backgroundColor: `${team.color}30`,
                      color: team.color,
                    }}
                  >
                    {team.score}đ
                  </span>
                </div>

                {/* Motion level meter bar */}
                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden flex items-center border border-slate-800">
                  <div
                    className="h-full transition-all duration-150 rounded-full"
                    style={{
                      width: `${Math.max(10, Math.min(100, slot.motionLevel || (slot.present ? 65 : 20)))}%`,
                      backgroundColor: team.color,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Top Camera Controls on Hover */}
      {!isDemoMode && (
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2 opacity-80 hover:opacity-100 transition">
          <button
            onClick={() => setIsFlipped(!isFlipped)}
            className="p-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold border border-slate-700 transition"
            title="Lật gương camera (Flip)"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
