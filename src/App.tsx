import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { 
  GameState, 
  Team, 
  PlayerSlot, 
  Question, 
  GameSettings, 
  RoundHistory,
  QuestionSet,
  TeacherUser
} from './types';
import { DEFAULT_TEAMS, DEFAULT_QUESTIONS, DEFAULT_SETTINGS, DEFAULT_QUESTION_SETS } from './utils/seedData';
import { soundFx, MUSIC_TRACKS } from './utils/soundEffects';
import { ZoneDetectionResult } from './utils/motionDetector';
import { subscribeToAuth, logoutTeacher } from './services/firebase';

import { Navbar } from './components/Navbar';
import { CameraView } from './components/CameraView';
import { GameStateDisplay } from './components/GameStateDisplay';
import { QuestionPanel } from './components/QuestionPanel';
import { ResultPanel } from './components/ResultPanel';
import { TeamScoreboard } from './components/TeamScoreboard';
import { TeamManagerModal } from './components/TeamManagerModal';
import { QuestionManagerModal } from './components/QuestionManagerModal';
import { SettingsModal } from './components/SettingsModal';
import { CertificateModal } from './components/CertificateModal';
import { EndGameModal } from './components/EndGameModal';
import { AuthModal } from './components/AuthModal';
import { TeacherBankModal } from './components/TeacherBankModal';
import { StudentPlayModal } from './components/StudentPlayModal';

const STORAGE_KEY_TEAMS = 'freeze_win_teams_v1';
const STORAGE_KEY_QUESTIONS = 'freeze_win_questions_v1';
const STORAGE_KEY_SETTINGS = 'freeze_win_settings_v1';
const STORAGE_KEY_QUESTION_SETS = 'freeze_win_question_sets_v1';
const STORAGE_KEY_ACTIVE_SET_ID = 'freeze_win_active_set_id_v1';

export default function App() {
  // 1. Persistent State
  const [teams, setTeams] = useState<Team[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TEAMS);
      return saved ? JSON.parse(saved) : DEFAULT_TEAMS;
    } catch {
      return DEFAULT_TEAMS;
    }
  });

  const [questionSets, setQuestionSets] = useState<QuestionSet[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_QUESTION_SETS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return DEFAULT_QUESTION_SETS;
    } catch {
      return DEFAULT_QUESTION_SETS;
    }
  });

  const [activeQuestionSetId, setActiveQuestionSetId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_SET_ID);
      return saved || DEFAULT_QUESTION_SETS[0]?.id || 'set-default-all';
    } catch {
      return DEFAULT_QUESTION_SETS[0]?.id || 'set-default-all';
    }
  });

  const [questions, setQuestions] = useState<Question[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_QUESTIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return DEFAULT_QUESTIONS;
    } catch {
      return DEFAULT_QUESTIONS;
    }
  });

  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Save changes to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TEAMS, JSON.stringify(teams));
  }, [teams]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_QUESTION_SETS, JSON.stringify(questionSets));
  }, [questionSets]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ACTIVE_SET_ID, activeQuestionSetId);
  }, [activeQuestionSetId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_QUESTIONS, JSON.stringify(questions));
  }, [questions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    soundFx.setEnabled(settings.soundEnabled);
  }, [settings]);

  // 2. Active Slots (Zone 1 Left, Zone 2 Center, Zone 3 Right)
  const [playerSlots, setPlayerSlots] = useState<PlayerSlot[]>([
    { slotId: 1, teamId: teams[0]?.id || 'team-orange', label: 'PLAYER 1', active: true, present: true, motionLevel: 45 },
    { slotId: 2, teamId: teams[1]?.id || 'team-blue', label: 'PLAYER 2', active: true, present: true, motionLevel: 60 },
    { slotId: 3, teamId: teams[2]?.id || 'team-red', label: 'PLAYER 3', active: true, present: true, motionLevel: 40 },
  ]);

  // Ensure slot team assignments are always valid
  useEffect(() => {
    setPlayerSlots((prev) =>
      prev.map((slot) => {
        const teamExists = teams.some((t) => t.id === slot.teamId);
        return teamExists ? slot : { ...slot, teamId: teams[0]?.id || 'team-orange' };
      })
    );
  }, [teams]);

  // 3. Game Flow State
  const [gameState, setGameState] = useState<GameState>('READY');
  const [round, setRound] = useState<number>(1);
  const [moveCountdown, setMoveCountdown] = useState<number>(settings.moveDurationSec);
  const [highlightedSlot, setHighlightedSlot] = useState<number | null>(null);
  const [winnerSlot, setWinnerSlot] = useState<number | null>(null);
  
  // Question & Result State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [currentQuestion, setCurrentQuestion] = useState<Question>(questions[0] || DEFAULT_QUESTIONS[0]);
  const [lastRoundResult, setLastRoundResult] = useState<{
    isCorrect: boolean;
    pointsAwarded: number;
  }>({ isCorrect: false, pointsAwarded: 0 });

  // 4. Modals State
  const [isTeamModalOpen, setIsTeamModalOpen] = useState<boolean>(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState<boolean>(false);
  const [isEndGameModalOpen, setIsEndGameModalOpen] = useState<boolean>(false);
  const [certificateTeamTarget, setCertificateTeamTarget] = useState<Team | undefined>(undefined);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // 5. Teacher Platform & Student Play State
  const [currentTeacher, setCurrentTeacher] = useState<TeacherUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isTeacherBankOpen, setIsTeacherBankOpen] = useState<boolean>(false);
  const [isStudentPlayOpen, setIsStudentPlayOpen] = useState<boolean>(false);
  const [studentPlayCode, setStudentPlayCode] = useState<string>('');
  const [cloudNotification, setCloudNotification] = useState<string | null>(null);

  // Listen for Firebase Teacher Auth session
  useEffect(() => {
    const unsubscribe = subscribeToAuth((teacher) => {
      setCurrentTeacher(teacher);
    });
    return () => unsubscribe();
  }, []);

  // Check URL query parameters for student play code (?play=ABC123 or ?set=ABC123)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const playCode = params.get('play') || params.get('set');
      if (playCode) {
        setStudentPlayCode(playCode.trim());
        setIsStudentPlayOpen(true);
      }
    } catch {
      // Ignore if URLSearchParams is unavailable
    }
  }, []);

  // Timers and Animation Refs
  const moveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pickIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const freezeStartTimeRef = useRef<number>(0);
  const freezeMotionSamplesRef = useRef<{ [key: number]: number[] }>({ 1: [], 2: [], 3: [] });
  const freezeScanSamplesRef = useRef<{ [key: number]: number[] }>({ 1: [], 2: [], 3: [] });
  const freezeReactionTimesRef = useRef<{ [key: number]: number | null }>({ 1: null, 2: null, 3: null });
  const demoSimulationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Keep gameStateRef strictly in sync for stable callbacks
  const gameStateRef = useRef<GameState>(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Sound sync
  useEffect(() => {
    soundFx.setEnabled(settings.soundEnabled);
  }, [settings.soundEnabled]);

  // Pick Next Question
  const pickNextQuestion = useCallback(() => {
    if (questions.length === 0) return;
    if (settings.randomQuestionOrder) {
      const unused = questions.filter((q) => !q.used);
      const pool = unused.length > 0 ? unused : questions;
      const randomIdx = Math.floor(Math.random() * pool.length);
      const chosen = pool[randomIdx];
      setCurrentQuestion(chosen);
      // Mark as used
      setQuestions((prev) =>
        prev.map((q) => (q.id === chosen.id ? { ...q, used: true } : q))
      );
    } else {
      const nextIdx = (currentQuestionIndex + 1) % questions.length;
      setCurrentQuestionIndex(nextIdx);
      setCurrentQuestion(questions[nextIdx]);
    }
  }, [questions, settings.randomQuestionOrder, currentQuestionIndex]);

  // 5. MOTION DETECTION CALLBACK (Stable reference to avoid detector re-instantiation)
  const handleUpdateSlotDetection = useCallback((results: ZoneDetectionResult) => {
    const now = Date.now();
    const curState = gameStateRef.current;
    const isFreezeOrScan = curState === 'FREEZE' || curState === 'SCANNING';
    const freezeElapsedSec = freezeStartTimeRef.current > 0 ? (now - freezeStartTimeRef.current) / 1000 : 0;

    setPlayerSlots((prev) =>
      prev.map((slot) => {
        const det = results[slot.slotId];
        if (!det) return slot;

        const currentMotion = det.motionLevel;

        // In Freeze/Scan mode, track real motion samples for active slots
        if (isFreezeOrScan && slot.active) {
          if (!freezeMotionSamplesRef.current[slot.slotId]) {
            freezeMotionSamplesRef.current[slot.slotId] = [];
          }
          freezeMotionSamplesRef.current[slot.slotId].push(currentMotion);

          if (curState === 'SCANNING') {
            if (!freezeScanSamplesRef.current[slot.slotId]) {
              freezeScanSamplesRef.current[slot.slotId] = [];
            }
            freezeScanSamplesRef.current[slot.slotId].push(currentMotion);
          }

          // If player has stilled (motion <= 10) and reaction time not recorded yet
          if (currentMotion <= 10 && freezeReactionTimesRef.current[slot.slotId] === null && freezeElapsedSec > 0.05) {
            freezeReactionTimesRef.current[slot.slotId] = Math.max(0.12, parseFloat(freezeElapsedSec.toFixed(2)));
          }
        }

        return {
          ...slot,
          present: det.present,
          motionLevel: currentMotion,
        };
      })
    );
  }, []);

  // 6. GAME FLOW ENGINE

  // START -> MOVE
  const handleStartGame = () => {
    if (gameState !== 'READY') return;
    setGameState('MOVE');
    setMoveCountdown(settings.moveDurationSec);
    setHighlightedSlot(null);
    setWinnerSlot(null);

    // Reset previous round's freeze metrics on slots
    setPlayerSlots((prev) =>
      prev.map((slot) => ({
        ...slot,
        freezeScore: undefined,
        freezeReactionTimeSec: undefined,
        freezeRank: undefined,
      }))
    );

    soundFx.playStart();

    // Ensure we have a fresh question ready for this round
    if (!currentQuestion) {
      pickNextQuestion();
    }
  };

  // MOVE Countdown Loop
  useEffect(() => {
    if (gameState === 'MOVE') {
      if (settings.soundEnabled && settings.musicEnabled) {
        soundFx.startMoveMusic(
          settings.musicTrack,
          settings.musicVolume,
          settings.customMusicUrl
        );
      } else if (settings.soundEnabled) {
        soundFx.playMoveBeat();
      }

      // In Demo Mode, simulate active dancing motion levels
      let demoMoveInterval: NodeJS.Timeout | null = null;
      if (settings.isDemoMode) {
        demoMoveInterval = setInterval(() => {
          setPlayerSlots((prev) =>
            prev.map((slot) => ({
              ...slot,
              motionLevel: slot.active ? Math.floor(55 + Math.random() * 40) : 0,
            }))
          );
        }, 150);
      }

      moveTimerRef.current = setInterval(() => {
        setMoveCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(moveTimerRef.current!);
            if (demoMoveInterval) clearInterval(demoMoveInterval);
            // Transition to FREEZE
            handleTriggerFreeze();
            return 0;
          }
          if (prev <= 4) {
            if (settings.soundEnabled) {
              soundFx.playCountdownTick(prev === 2);
            }
          } else if (settings.soundEnabled && !settings.musicEnabled) {
            soundFx.playMoveBeat();
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (demoMoveInterval) clearInterval(demoMoveInterval);
        soundFx.stopMoveMusic();
      };
    }

    return () => {
      soundFx.stopMoveMusic();
      if (moveTimerRef.current) clearInterval(moveTimerRef.current);
    };
  }, [
    gameState,
    settings.moveDurationSec,
    settings.isDemoMode,
    settings.soundEnabled,
    settings.musicEnabled,
    settings.musicTrack,
    settings.musicVolume,
    settings.customMusicUrl,
  ]);

  // MOVE -> FREEZE
  const handleTriggerFreeze = () => {
    soundFx.stopMoveMusic();
    setGameState('FREEZE');
    soundFx.playFreeze();

    const now = Date.now();
    freezeStartTimeRef.current = now;
    freezeMotionSamplesRef.current = { 1: [], 2: [], 3: [] };
    freezeScanSamplesRef.current = { 1: [], 2: [], 3: [] };
    freezeReactionTimesRef.current = { 1: null, 2: null, 3: null };

    // In Demo Mode, simulate realistic diverse freeze reactions with fair random slot assignment
    if (settings.isDemoMode) {
      if (demoSimulationIntervalRef.current) {
        clearInterval(demoSimulationIntervalRef.current);
      }

      // Pick randomly which slot is fastest, second, third
      const activeSlotIds = playerSlots.filter((s) => s.active).map((s) => s.slotId);
      const shuffled = [...activeSlotIds].sort(() => Math.random() - 0.5);

      // Performance profiles: [fastest/stillest, medium, active movement]
      const profiles: Record<number, { targetReaction: number; baseStillness: number; endMotion: number }> = {};
      if (shuffled[0]) {
        profiles[shuffled[0]] = {
          targetReaction: parseFloat((0.15 + Math.random() * 0.12).toFixed(2)),
          baseStillness: 98,
          endMotion: 1 + Math.floor(Math.random() * 3), // 1-3% motion (Super still!)
        };
      }
      if (shuffled[1]) {
        profiles[shuffled[1]] = {
          targetReaction: parseFloat((0.40 + Math.random() * 0.20).toFixed(2)),
          baseStillness: 82,
          endMotion: 12 + Math.floor(Math.random() * 8), // 12-20% motion
        };
      }
      if (shuffled[2]) {
        profiles[shuffled[2]] = {
          targetReaction: parseFloat((0.75 + Math.random() * 0.35).toFixed(2)),
          baseStillness: 55,
          endMotion: 32 + Math.floor(Math.random() * 20), // 32-52% motion (Still moving!)
        };
      }

      const intervalStart = Date.now();
      demoSimulationIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - intervalStart) / 1000;
        const curState = gameStateRef.current;

        setPlayerSlots((prev) =>
          prev.map((slot) => {
            const prof = profiles[slot.slotId];
            if (!prof || !slot.active) return slot;

            // Decay motion level based on targetReaction
            let curMotion: number;
            if (elapsed < prof.targetReaction) {
              const progress = elapsed / prof.targetReaction;
              curMotion = Math.round(75 - progress * (75 - prof.endMotion));
            } else {
              curMotion = prof.endMotion + Math.floor((Math.random() - 0.5) * 3);
              curMotion = Math.max(1, curMotion);

              if (freezeReactionTimesRef.current[slot.slotId] === null) {
                freezeReactionTimesRef.current[slot.slotId] = prof.targetReaction;
              }
            }

            if (!freezeMotionSamplesRef.current[slot.slotId]) {
              freezeMotionSamplesRef.current[slot.slotId] = [];
            }
            freezeMotionSamplesRef.current[slot.slotId].push(curMotion);

            if (curState === 'SCANNING') {
              if (!freezeScanSamplesRef.current[slot.slotId]) {
                freezeScanSamplesRef.current[slot.slotId] = [];
              }
              freezeScanSamplesRef.current[slot.slotId].push(curMotion);
            }

            return {
              ...slot,
              motionLevel: curMotion,
            };
          })
        );
      }, 100);
    }

    // After 1.6s of Freeze dramatic pause -> Start SCANNING
    setTimeout(() => {
      handleTriggerScanning();
    }, 1600);
  };

  // FREEZE -> SCANNING
  const handleTriggerScanning = () => {
    setGameState('SCANNING');
    soundFx.playScanPing();

    const scanPingInterval = setInterval(() => {
      soundFx.playScanPing();
    }, 700);

    // After scan duration -> Evaluate stillness and Start RANDOM PICK
    setTimeout(() => {
      clearInterval(scanPingInterval);
      if (demoSimulationIntervalRef.current) {
        clearInterval(demoSimulationIntervalRef.current);
        demoSimulationIntervalRef.current = null;
      }
      evaluateAndTriggerPick();
    }, settings.scanDurationSec * 1000);
  };

  // Evaluate Stillness: Player with the LEAST motion is selected as winner
  const evaluateAndTriggerPick = () => {
    const activeSlots = playerSlots.filter((s) => s.active);
    const candidateSlots = activeSlots.length > 0 ? activeSlots : playerSlots;

    // Calculate score for each candidate based on actual recorded motion
    const scoredSlots = candidateSlots.map((slot) => {
      const allSamples = freezeMotionSamplesRef.current[slot.slotId] || [];
      const scanSamples = freezeScanSamplesRef.current[slot.slotId] || [];

      // Average motion during scanning (priority) and full freeze period
      const avgAll = allSamples.length > 0
        ? allSamples.reduce((sum, val) => sum + val, 0) / allSamples.length
        : (slot.motionLevel ?? 15);

      const avgScan = scanSamples.length > 0
        ? scanSamples.reduce((sum, val) => sum + val, 0) / scanSamples.length
        : avgAll;

      // Effective motion: Scanning phase is when players must be absolutely frozen
      const effectiveMotion = parseFloat((avgScan * 0.7 + avgAll * 0.3).toFixed(1));

      // Peak motion during scan phase
      const peakMotion = scanSamples.length > 0
        ? Math.max(...scanSamples)
        : (allSamples.length > 0 ? Math.max(...allSamples) : (slot.motionLevel ?? 15));

      // Stillness score from 0 to 100 (100 = perfectly still, 0 = constant movement)
      const stillness = Math.max(0, Math.min(100, Math.round(100 - effectiveMotion)));

      // Reaction time (how fast they became still, in seconds)
      const recordedReaction = freezeReactionTimesRef.current[slot.slotId];
      const reactionTime = recordedReaction !== null
        ? recordedReaction
        : (effectiveMotion > 20 ? 3.0 : 0.85);

      return {
        slotId: slot.slotId,
        effectiveMotion,
        peakMotion,
        stillness,
        reactionTime: parseFloat(reactionTime.toFixed(2)),
      };
    });

    // STRICT SORTING: The player who moved the LEAST in reality WINS!
    // Lower effectiveMotion = better rank (Rank 1).
    scoredSlots.sort((a, b) => {
      // 1. Primary: Compare effectiveMotion (lowest motion wins)
      const motionDiff = a.effectiveMotion - b.effectiveMotion;
      if (Math.abs(motionDiff) >= 1.5) {
        return motionDiff; // smaller motion -> comes first
      }

      // 2. Secondary: Faster reaction time if motion is essentially identical
      const reactionDiff = a.reactionTime - b.reactionTime;
      if (Math.abs(reactionDiff) >= 0.1) {
        return reactionDiff;
      }

      // 3. Tertiary: Lower peak motion spike
      const peakDiff = a.peakMotion - b.peakMotion;
      if (Math.abs(peakDiff) >= 1.0) {
        return peakDiff;
      }

      // 4. Equal performance tie-breaker: fair random coin flip (NO DEFAULT TO SLOT 1)
      return Math.random() - 0.5;
    });

    const winnerCandidate = scoredSlots[0];
    const targetWinnerSlotId = winnerCandidate ? winnerCandidate.slotId : candidateSlots[0].slotId;

    // Update playerSlots with freeze metrics for transparent visual feedback
    setPlayerSlots((prev) =>
      prev.map((slot) => {
        const found = scoredSlots.find((s) => s.slotId === slot.slotId);
        if (!found) return slot;
        const rankIndex = scoredSlots.findIndex((s) => s.slotId === slot.slotId);
        return {
          ...slot,
          freezeScore: found.stillness,
          freezeAvgMotion: Math.round(found.effectiveMotion),
          freezeReactionTimeSec: found.reactionTime,
          freezeRank: rankIndex + 1,
        };
      })
    );

    // Launch the roulette animation that lands squarely and locks on the target winner
    handleTriggerRandomPick(targetWinnerSlotId);
  };

  // SCANNING -> RANDOM PICK with Roulette Landing precisely on targetWinnerSlotId
  const handleTriggerRandomPick = (targetWinnerSlotId: number) => {
    setGameState('RANDOM_PICK');

    // Get active slots
    const activeSlots = playerSlots.filter((s) => s.active);
    const candidateSlots = activeSlots.length > 0 ? activeSlots : playerSlots;
    const candidateSlotIds = candidateSlots.map((s) => s.slotId);

    // Target index in candidate array
    const targetIdx = candidateSlotIds.indexOf(targetWinnerSlotId as 1 | 2 | 3);
    const validTargetIdx = targetIdx >= 0 ? targetIdx : 0;

    // Calculate total ticks so it always ends cleanly at validTargetIdx
    const minTicks = Math.max(15, settings.pickDurationSec * 6);
    const remainder = minTicks % candidateSlotIds.length;
    const extraNeeded = (validTargetIdx - remainder + candidateSlotIds.length) % candidateSlotIds.length;
    const totalTicks = minTicks + extraNeeded;

    let currentIndex = 0;
    let ticks = 0;
    let speed = 70; // ms

    const runTicker = () => {
      ticks++;
      currentIndex = (currentIndex + 1) % candidateSlotIds.length;
      
      const currentSlotId = ticks >= totalTicks ? targetWinnerSlotId : candidateSlotIds[currentIndex];
      setHighlightedSlot(currentSlotId);

      soundFx.playPickTick(1 + (ticks / totalTicks) * 0.5);

      if (ticks < totalTicks) {
        // Gradually slow down near the end
        if (ticks > totalTicks - 7) {
          speed += 40;
        } else if (ticks > totalTicks - 3) {
          speed += 80;
        }
        pickIntervalRef.current = setTimeout(runTicker, speed);
      } else {
        // Guarantee final winner is strictly the targetWinnerSlotId
        setHighlightedSlot(targetWinnerSlotId);
        handleSelectWinner(targetWinnerSlotId);
      }
    };

    runTicker();
  };

  // RANDOM PICK -> WINNER
  const handleSelectWinner = (slotId: number) => {
    setGameState('WINNER');
    setWinnerSlot(slotId);
    setHighlightedSlot(slotId);

    soundFx.playWinnerFanfare();

    // Fire Confetti!
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  // WINNER -> QUESTION
  const handleProceedToQuestion = () => {
    setGameState('QUESTION');
  };

  // QUESTION -> RESULT
  const handleAnswerResult = (isCorrect: boolean, customPoints?: number) => {
    const points = isCorrect ? (customPoints !== undefined ? customPoints : currentQuestion.points) : 0;

    setLastRoundResult({
      isCorrect,
      pointsAwarded: points,
    });

    if (isCorrect) {
      soundFx.playCorrect();
      // Award points to the winning team
      const winningSlotData = playerSlots.find((s) => s.slotId === winnerSlot);
      if (winningSlotData) {
        setTeams((prevTeams) =>
          prevTeams.map((t) =>
            t.id === winningSlotData.teamId ? { ...t, score: t.score + points } : t
          )
        );
      }
      // Confetti burst for correct answer
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    } else {
      soundFx.playWrong();
    }

    setGameState('RESULT');
  };

  // RESULT -> NEXT ROUND (READY)
  const handleNextRound = () => {
    soundFx.stopMoveMusic();
    setRound((r) => r + 1);
    setWinnerSlot(null);
    setHighlightedSlot(null);
    pickNextQuestion();
    setGameState('READY');
  };

  // Toggle active slot
  const handleToggleSlotActive = (slotId: 1 | 2 | 3) => {
    setPlayerSlots((prev) =>
      prev.map((s) => (s.slotId === slotId ? { ...s, active: !s.active } : s))
    );
  };

  // Teacher manual slot click to force pick in READY or RANDOM_PICK
  const handleSlotClick = (slotId: 1 | 2 | 3) => {
    if (gameState === 'READY' || gameState === 'WINNER') {
      setWinnerSlot(slotId);
      setHighlightedSlot(slotId);
    }
  };

  // Score Adjuster
  const handleAdjustTeamScore = (teamId: string, delta: number) => {
    setTeams((prev) =>
      prev.map((t) =>
        t.id === teamId ? { ...t, score: Math.max(0, t.score + delta) } : t
      )
    );
  };

  // Reset All Scores
  const handleResetAllScores = () => {
    soundFx.stopMoveMusic();
    setTeams((prev) => prev.map((t) => ({ ...t, score: 0 })));
    setRound(1);
    setGameState('READY');
    setWinnerSlot(null);
    setHighlightedSlot(null);
  };

  // Toggle Fullscreen
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Certificate opener for specific team
  const handleOpenCertificateForTeam = (team: Team) => {
    setCertificateTeamTarget(team);
    setIsCertificateModalOpen(true);
  };

  // Question Set Handlers
  const activeQuestionSet = questionSets.find((s) => s.id === activeQuestionSetId);

  const handleSelectQuestionSet = (setId: string) => {
    const targetSet = questionSets.find((s) => s.id === setId);
    if (targetSet) {
      setActiveQuestionSetId(setId);
      setQuestions(targetSet.questions);
      setCurrentQuestionIndex(0);
      setCurrentQuestion(targetSet.questions[0] || DEFAULT_QUESTIONS[0]);
    }
  };

  const handleSaveCurrentAsSet = (name: string, description?: string, subject?: string) => {
    const newId = `set-custom-${Date.now()}`;
    const newSet: QuestionSet = {
      id: newId,
      name,
      description,
      subject: subject || 'Tổng Hợp',
      createdAt: new Date().toISOString().slice(0, 10),
      questions: [...questions],
    };
    setQuestionSets((prev) => [newSet, ...prev]);
    setActiveQuestionSetId(newId);
  };

  const handleUpdateQuestionSet = (updatedSet: QuestionSet) => {
    setQuestionSets((prev) => prev.map((s) => (s.id === updatedSet.id ? updatedSet : s)));
    if (updatedSet.id === activeQuestionSetId) {
      setQuestions(updatedSet.questions);
    }
  };

  const handleDeleteQuestionSet = (setId: string) => {
    setQuestionSets((prev) => prev.filter((s) => s.id !== setId));
    if (activeQuestionSetId === setId) {
      const remaining = questionSets.filter((s) => s.id !== setId);
      if (remaining.length > 0) {
        handleSelectQuestionSet(remaining[0].id);
      }
    }
  };

  const handleCreateQuestionSet = (newSet: QuestionSet) => {
    setQuestionSets((prev) => [newSet, ...prev]);
  };

  const handlePlaySetFromBank = (set: QuestionSet, newQuestions: Question[]) => {
    if (!newQuestions || newQuestions.length === 0) return;
    setQuestions(newQuestions);
    setActiveQuestionSetId(set.id);
    setQuestionSets((prev) => {
      const exists = prev.some((s) => s.id === set.id);
      if (exists) {
        return prev.map((s) => (s.id === set.id ? { ...set, questions: newQuestions } : s));
      }
      return [{ ...set, questions: newQuestions }, ...prev];
    });
    setCurrentQuestionIndex(0);
    setCurrentQuestion(newQuestions[0]);
    setGameState('READY');
    setRound(1);
    setWinnerSlot(null);
    setHighlightedSlot(null);
    soundFx.stopMoveMusic();
    setCloudNotification(`Đã nạp bộ câu hỏi "${set.title || set.name}" (${newQuestions.length} câu) vào trò chơi!`);
    setTimeout(() => setCloudNotification(null), 5000);
  };

  const handleUpdateQuestions = (newQuestions: Question[]) => {
    setQuestions(newQuestions);
    setQuestionSets((prev) =>
      prev.map((s) =>
        s.id === activeQuestionSetId ? { ...s, questions: newQuestions } : s
      )
    );
    if (newQuestions.length > 0 && (!currentQuestion || !newQuestions.some((q) => q.id === currentQuestion.id))) {
      setCurrentQuestion(newQuestions[0]);
    }
  };

  const activeMusicMeta = MUSIC_TRACKS.find((t) => t.id === settings.musicTrack);
  const activeMusicTrackTitle = settings.musicTrack === 'custom'
    ? (settings.customMusicName || 'Nhạc riêng')
    : (activeMusicMeta?.name || 'Sôi Động Học Đường');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-orange-500 selection:text-slate-950 font-sans">
      {/* 1. TOP NAVBAR */}
      <Navbar
        round={round}
        settings={settings}
        onUpdateSettings={(newVals) => setSettings({ ...settings, ...newVals })}
        onOpenTeams={() => setIsTeamModalOpen(true)}
        onOpenQuestions={() => setIsQuestionModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenLeaderboard={() => {
          soundFx.playEndGame();
          setIsEndGameModalOpen(true);
        }}
        onOpenCertificate={() => {
          setCertificateTeamTarget(teams[0]);
          setIsCertificateModalOpen(true);
        }}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        totalQuestions={questions.length}
        activeQuestionsCount={questions.filter((q) => !q.used).length}
        activeQuestionSetName={activeQuestionSet?.name}
        currentTeacher={currentTeacher}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenTeacherBank={() => setIsTeacherBankOpen(true)}
        onOpenStudentPlay={() => {
          setStudentPlayCode('');
          setIsStudentPlayOpen(true);
        }}
      />

      {/* Cloud & Game Notification Toast */}
      {cloudNotification && (
        <div className="bg-emerald-600 text-white font-bold text-xs py-2 px-4 text-center shadow-md animate-in slide-in-from-top duration-200 flex items-center justify-center gap-2">
          <span>✓</span>
          <span>{cloudNotification}</span>
        </div>
      )}

      {/* 2. MAIN INTERACTIVE GAME ARENA */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 flex flex-col justify-center gap-4">
        {/* State Banner / Controls */}
        <GameStateDisplay
          gameState={gameState}
          moveCountdown={moveCountdown}
          winnerSlot={winnerSlot}
          playerSlots={playerSlots}
          teams={teams}
          onStartGame={handleStartGame}
          onProceedToQuestion={handleProceedToQuestion}
          onNextRound={handleNextRound}
          onResetGame={handleResetAllScores}
          isDemoMode={settings.isDemoMode}
          musicEnabled={settings.musicEnabled && settings.soundEnabled}
          musicTrackName={activeMusicTrackTitle}
        />

        {/* Dynamic Center Display: Camera View OR Question Panel OR Result Panel */}
        {gameState === 'QUESTION' ? (
          <QuestionPanel
            question={currentQuestion}
            winnerSlot={winnerSlot}
            playerSlots={playerSlots}
            teams={teams}
            onAnswerResult={handleAnswerResult}
            onSkipQuestion={pickNextQuestion}
          />
        ) : gameState === 'RESULT' ? (
          <ResultPanel
            isCorrect={lastRoundResult.isCorrect}
            pointsAwarded={lastRoundResult.pointsAwarded}
            winnerSlot={winnerSlot}
            playerSlots={playerSlots}
            teams={teams}
            onNextRound={handleNextRound}
            onEndGame={() => {
              soundFx.playEndGame();
              setIsEndGameModalOpen(true);
            }}
            onAdjustTeamScore={handleAdjustTeamScore}
          />
        ) : (
          /* Live Camera HUD / Stage Arena */
          <CameraView
            gameState={gameState}
            playerSlots={playerSlots}
            teams={teams}
            isDemoMode={settings.isDemoMode}
            highlightedSlot={highlightedSlot}
            winnerSlot={winnerSlot}
            onSlotClick={handleSlotClick}
            onToggleSlotActive={handleToggleSlotActive}
            onUpdateSlotDetection={handleUpdateSlotDetection}
            sensitivity={settings.motionSensitivity}
            onUpdateSensitivity={(val) => setSettings((s) => ({ ...s, motionSensitivity: val }))}
            onToggleDemoMode={() => setSettings((s) => ({ ...s, isDemoMode: !s.isDemoMode }))}
          />
        )}

        {/* 3. PERSISTENT LIVE SCOREBOARD */}
        <TeamScoreboard
          teams={teams}
          playerSlots={playerSlots}
          onAdjustScore={handleAdjustTeamScore}
          onOpenTeamManager={() => setIsTeamModalOpen(true)}
        />
      </main>

      {/* 4. MODALS & POPUPS */}
      <TeamManagerModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        teams={teams}
        playerSlots={playerSlots}
        onUpdateTeams={setTeams}
        onUpdatePlayerSlots={setPlayerSlots}
        onResetAllScores={handleResetAllScores}
      />

      <QuestionManagerModal
        isOpen={isQuestionModalOpen}
        onClose={() => setIsQuestionModalOpen(false)}
        questions={questions}
        onUpdateQuestions={handleUpdateQuestions}
        questionSets={questionSets}
        activeQuestionSetId={activeQuestionSetId}
        onSelectQuestionSet={handleSelectQuestionSet}
        onSaveCurrentAsSet={handleSaveCurrentAsSet}
        onUpdateQuestionSet={handleUpdateQuestionSet}
        onDeleteQuestionSet={handleDeleteQuestionSet}
        onCreateQuestionSet={handleCreateQuestionSet}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={(newVals) => setSettings({ ...settings, ...newVals })}
      />

      <CertificateModal
        isOpen={isCertificateModalOpen}
        onClose={() => setIsCertificateModalOpen(false)}
        teams={teams}
        settings={settings}
        defaultWinningTeam={certificateTeamTarget}
      />

      <EndGameModal
        isOpen={isEndGameModalOpen}
        onClose={() => setIsEndGameModalOpen(false)}
        teams={teams}
        settings={settings}
        onOpenCertificateForTeam={handleOpenCertificateForTeam}
        onRestartGame={handleResetAllScores}
      />

      {/* 5. TEACHER & STUDENT MODALS */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(teacher) => {
          setCurrentTeacher(teacher);
          setIsTeacherBankOpen(true);
        }}
      />

      {currentTeacher && (
        <TeacherBankModal
          isOpen={isTeacherBankOpen}
          onClose={() => setIsTeacherBankOpen(false)}
          teacher={currentTeacher}
          onLogout={async () => {
            await logoutTeacher();
            setCurrentTeacher(null);
            setIsTeacherBankOpen(false);
          }}
          onPlaySet={handlePlaySetFromBank}
        />
      )}

      <StudentPlayModal
        isOpen={isStudentPlayOpen}
        onClose={() => setIsStudentPlayOpen(false)}
        initialCode={studentPlayCode}
        onStartPlay={handlePlaySetFromBank}
      />
    </div>
  );
}
