import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  FolderHeart, 
  Plus, 
  Upload, 
  Globe, 
  LogOut, 
  Play, 
  Edit3, 
  Copy, 
  Trash2, 
  Share2, 
  Search, 
  Filter, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  ArrowLeft, 
  Save, 
  Check, 
  Loader2, 
  RefreshCw, 
  ExternalLink,
  Layers,
  ArrowUpDown,
  BookOpen,
  Eye,
  Sparkles,
  Link,
  ShieldAlert,
  UserCheck
} from 'lucide-react';
import { 
  Question, 
  QuestionSet, 
  QuestionSetVisibility, 
  TeacherUser 
} from '../types';
import { 
  getMyQuestionSets, 
  getPublicQuestionSets, 
  getQuestionsForSet, 
  createQuestionSetInDb, 
  updateQuestionSetInDb, 
  deleteQuestionSetFromDb, 
  copyQuestionSetToMyAccount 
} from '../services/firebase';
import { parseExcelOrCSV, downloadSampleExcel, ParseResult } from '../utils/questionParser';

interface TeacherBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: TeacherUser;
  onLogout: () => void;
  onPlaySet: (set: QuestionSet, questions: Question[]) => void;
}

type BankTab = 'MY_SETS' | 'CREATE_SET' | 'IMPORT_EXCEL' | 'COMMUNITY_LIBRARY';

const SUBJECT_LIST = [
  'Tất cả',
  'Khoa Học Tự Nhiên',
  'Toán Học',
  'Tiếng Việt / Ngữ Văn',
  'Tiếng Anh',
  'Lịch Sử - Địa Lý',
  'Tin Học',
  'Giáo Dục Công Dân',
  'Đố Vui Tổng Hợp',
];

const GRADE_LIST = [
  'Tất cả',
  'Tiểu học (Lớp 1-5)',
  'Lớp 6',
  'Lớp 7',
  'Lớp 8',
  'Lớp 9',
  'THPT (Lớp 10-12)',
  'Khác',
];

export const TeacherBankModal: React.FC<TeacherBankModalProps> = ({
  isOpen,
  onClose,
  teacher,
  onLogout,
  onPlaySet,
}) => {
  const [activeTab, setActiveTab] = useState<BankTab>('MY_SETS');
  
  // My Sets State
  const [mySets, setMySets] = useState<QuestionSet[]>([]);
  const [loadingMySets, setLoadingMySets] = useState(false);
  const [searchMySet, setSearchMySet] = useState('');
  const [filterSubjectMySet, setFilterSubjectMySet] = useState('Tất cả');

  // Public Library State
  const [publicSets, setPublicSets] = useState<QuestionSet[]>([]);
  const [loadingPublicSets, setLoadingPublicSets] = useState(false);
  const [searchPublic, setSearchPublic] = useState('');
  const [filterSubjectPublic, setFilterSubjectPublic] = useState('Tất cả');
  const [filterGradePublic, setFilterGradePublic] = useState('Tất cả');

  // Editor State
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSubject, setEditSubject] = useState('Khoa Học Tự Nhiên');
  const [editGrade, setEditGrade] = useState('Lớp 6');
  const [editVisibility, setEditVisibility] = useState<QuestionSetVisibility>('private');
  const [editShareCode, setEditShareCode] = useState('');
  const [editQuestions, setEditQuestions] = useState<Question[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Excel / CSV Import State
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importTitle, setImportTitle] = useState('');
  const [importSubject, setImportSubject] = useState('Khoa Học Tự Nhiên');
  const [importGrade, setImportGrade] = useState('Lớp 6');
  const [importVisibility, setImportVisibility] = useState<QuestionSetVisibility>('shared');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Share Dialog State
  const [sharingSet, setSharingSet] = useState<QuestionSet | null>(null);
  const [shareCopied, setShareCopied] = useState<'CODE' | 'LINK' | null>(null);

  // Status & Notification
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Load My Sets
  const refreshMySets = async () => {
    try {
      setLoadingMySets(true);
      const sets = await getMyQuestionSets(teacher.uid);
      setMySets(sets);
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: 'Không thể tải danh sách bộ câu hỏi. Vui lòng kiểm tra kết nối.' });
    } finally {
      setLoadingMySets(false);
    }
  };

  // Load Public Sets
  const refreshPublicSets = async () => {
    try {
      setLoadingPublicSets(true);
      const sets = await getPublicQuestionSets(searchPublic, filterSubjectPublic, filterGradePublic);
      setPublicSets(sets);
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: 'Không thể tải thư viện cộng đồng. Vui lòng thử lại.' });
    } finally {
      setLoadingPublicSets(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshMySets();
      if (activeTab === 'COMMUNITY_LIBRARY') {
        refreshPublicSets();
      }
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  // Notification Banner Timeout
  const showNotice = (type: 'success' | 'error' | 'info', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  // Switch to Create Set
  const handleStartCreateSet = () => {
    setEditingSetId(null);
    setEditTitle('');
    setEditDescription('');
    setEditSubject('Khoa Học Tự Nhiên');
    setEditGrade('Lớp 6');
    setEditVisibility('shared');
    setEditShareCode('');
    setEditQuestions([
      {
        id: `q-${Date.now()}-1`,
        subject: 'Khoa Học Tự Nhiên',
        type: 'MULTIPLE_CHOICE',
        question: 'Mùn được hình thành từ nguồn gốc chủ yếu nào?',
        options: ['Đá mẹ', 'Xác động thực vật', 'Nước ngầm', 'Không khí'],
        correctAnswer: 1,
        explanation: 'Mùn được hình thành chủ yếu do xác sinh vật phân giải.',
        points: 20,
      }
    ]);
    setActiveTab('CREATE_SET');
  };

  // Switch to Edit Set
  const handleStartEditSet = async (set: QuestionSet) => {
    try {
      showNotice('info', 'Đang tải toàn bộ câu hỏi của bộ...');
      const fullQuestions = await getQuestionsForSet(set.id);
      setEditingSetId(set.id);
      setEditTitle(set.title || set.name);
      setEditDescription(set.description || '');
      setEditSubject(set.subject || 'Khoa Học Tự Nhiên');
      setEditGrade(set.grade || 'Lớp 6');
      setEditVisibility(set.visibility || 'private');
      setEditShareCode(set.shareCode || '');
      setEditQuestions(fullQuestions);
      setActiveTab('CREATE_SET');
    } catch (err) {
      console.error(err);
      showNotice('error', 'Không thể tải chi tiết bộ câu hỏi.');
    }
  };

  // Save Set (Create or Update)
  const handleSaveSet = async () => {
    if (!editTitle.trim()) {
      showNotice('error', 'Vui lòng nhập tên bộ câu hỏi.');
      return;
    }
    if (editQuestions.length === 0) {
      showNotice('error', 'Bộ câu hỏi phải có ít nhất 1 câu hỏi.');
      return;
    }

    try {
      setIsSaving(true);
      if (editingSetId) {
        await updateQuestionSetInDb(
          teacher.uid,
          editingSetId,
          {
            title: editTitle,
            description: editDescription,
            subject: editSubject,
            grade: editGrade,
            visibility: editVisibility,
            shareCode: editShareCode,
          },
          editQuestions
        );
        showNotice('success', `Đã cập nhật bộ câu hỏi "${editTitle}" thành công!`);
      } else {
        await createQuestionSetInDb(
          teacher,
          {
            title: editTitle,
            description: editDescription,
            subject: editSubject,
            grade: editGrade,
            visibility: editVisibility,
          },
          editQuestions
        );
        showNotice('success', `Đã tạo mới bộ câu hỏi "${editTitle}" với ${editQuestions.length} câu!`);
      }
      await refreshMySets();
      setActiveTab('MY_SETS');
    } catch (err) {
      console.error(err);
      showNotice('error', 'Lưu bộ câu hỏi thất bại. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Set
  const handleDeleteSet = async (set: QuestionSet) => {
    const confirm = window.confirm(`Thầy/Cô có chắc chắn muốn xóa bộ câu hỏi "${set.title || set.name}"? Thao tác này không thể hoàn tác.`);
    if (!confirm) return;

    try {
      await deleteQuestionSetFromDb(set.id);
      showNotice('success', `Đã xóa bộ câu hỏi "${set.title || set.name}".`);
      await refreshMySets();
    } catch (err) {
      console.error(err);
      showNotice('error', 'Xóa bộ câu hỏi thất bại.');
    }
  };

  // Duplicate Set (In My Sets)
  const handleDuplicateSet = async (set: QuestionSet) => {
    try {
      showNotice('info', 'Đang tạo bản sao...');
      const questions = await getQuestionsForSet(set.id);
      await createQuestionSetInDb(
        teacher,
        {
          title: `${set.title || set.name} (Bản sao)`,
          description: set.description || '',
          subject: set.subject || 'Tổng Hợp',
          grade: set.grade || 'Tất cả khối',
          visibility: 'private',
        },
        questions
      );
      showNotice('success', 'Đã nhân bản bộ câu hỏi thành công.');
      await refreshMySets();
    } catch (err) {
      console.error(err);
      showNotice('error', 'Nhân bản thất bại.');
    }
  };

  // Copy From Public Library to My Account
  const handleCopyFromCommunity = async (publicSet: QuestionSet) => {
    try {
      showNotice('info', `Đang sao chép "${publicSet.title || publicSet.name}" về tài khoản...`);
      await copyQuestionSetToMyAccount(publicSet.id, teacher);
      showNotice('success', `Đã sao chép thành công bộ câu hỏi về tài khoản của Thầy/Cô!`);
      await refreshMySets();
      setActiveTab('MY_SETS');
    } catch (err) {
      console.error(err);
      showNotice('error', 'Không thể sao chép bộ câu hỏi.');
    }
  };

  // Play Set In Game
  const handlePlay = async (set: QuestionSet) => {
    try {
      showNotice('info', `Đang chuẩn bị bộ câu hỏi "${set.title || set.name}"...`);
      const questions = await getQuestionsForSet(set.id);
      if (questions.length === 0) {
        showNotice('error', 'Bộ câu hỏi này không có câu hỏi nào để chơi.');
        return;
      }
      onPlaySet({ ...set, questions }, questions);
      onClose();
    } catch (err) {
      console.error(err);
      showNotice('error', 'Lỗi khi tải câu hỏi vào trò chơi.');
    }
  };

  // Excel / CSV File Handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFile(file);
    const inferredTitle = file.name.replace(/\.[^/.]+$/, '');
    setImportTitle(inferredTitle);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const buffer = evt.target?.result as ArrayBuffer;
      const res = parseExcelOrCSV(buffer, importSubject);
      setParseResult(res);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSaveImportedSet = async () => {
    if (!parseResult || !parseResult.success || parseResult.questions.length === 0) {
      showNotice('error', 'Không có câu hỏi hợp lệ để lưu.');
      return;
    }
    if (!importTitle.trim()) {
      showNotice('error', 'Vui lòng nhập tên bộ câu hỏi.');
      return;
    }

    try {
      setIsImporting(true);
      await createQuestionSetInDb(
        teacher,
        {
          title: importTitle,
          subject: importSubject,
          grade: importGrade,
          visibility: importVisibility,
        },
        parseResult.questions
      );
      showNotice('success', `Đã nhập và lưu thành công ${parseResult.questions.length} câu hỏi vào Firestore!`);
      setExcelFile(null);
      setParseResult(null);
      await refreshMySets();
      setActiveTab('MY_SETS');
    } catch (err) {
      console.error(err);
      showNotice('error', 'Lỗi khi lưu bộ câu hỏi từ Excel.');
    } finally {
      setIsImporting(false);
    }
  };

  // Add a blank question to current edit list
  const handleAddQuestionToEditor = () => {
    const newQ: Question = {
      id: `q-${Date.now()}-${editQuestions.length + 1}`,
      subject: editSubject,
      type: 'MULTIPLE_CHOICE',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: '',
      points: 20,
    };
    setEditQuestions([...editQuestions, newQ]);
  };

  // Share Set Actions
  const handleOpenShareModal = (set: QuestionSet) => {
    setSharingSet(set);
    setShareCopied(null);
  };

  const handleCopyShareCode = () => {
    if (!sharingSet?.shareCode) return;
    navigator.clipboard.writeText(sharingSet.shareCode);
    setShareCopied('CODE');
    setTimeout(() => setShareCopied(null), 2500);
  };

  const handleCopyShareLink = () => {
    if (!sharingSet?.shareCode) return;
    const url = `${window.location.origin}${window.location.pathname}?play=${sharingSet.shareCode}`;
    navigator.clipboard.writeText(url);
    setShareCopied('LINK');
    setTimeout(() => setShareCopied(null), 2500);
  };

  const handleUpdateSharingVisibility = async (newVis: QuestionSetVisibility) => {
    if (!sharingSet) return;
    try {
      await updateQuestionSetInDb(
        teacher.uid,
        sharingSet.id,
        {
          title: sharingSet.title || sharingSet.name,
          visibility: newVis,
          shareCode: sharingSet.shareCode,
          subject: sharingSet.subject,
          grade: sharingSet.grade,
        },
        await getQuestionsForSet(sharingSet.id)
      );
      setSharingSet({ ...sharingSet, visibility: newVis });
      await refreshMySets();
      showNotice('success', `Đã cập nhật chế độ chia sẻ thành "${newVis === 'private' ? 'Riêng tư' : newVis === 'shared' ? 'Chia sẻ qua mã/link' : 'Công khai'}"!`);
    } catch (e) {
      console.error(e);
      showNotice('error', 'Không thể cập nhật quyền chia sẻ.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-orange-950/20 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
              <FolderHeart size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">NGÂN HÀNG CÂU HỎI</h2>
                <span className="text-[10px] bg-orange-500/20 text-orange-300 font-bold px-2 py-0.5 rounded-full border border-orange-500/30">
                  Firebase Cloud
                </span>
              </div>
              <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-0.5">
                <span>Xin chào, <strong>Thầy/Cô {teacher.name}</strong></span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">{teacher.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
              title="Đăng xuất tài khoản"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              title="Đóng cửa sổ"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div className={`px-4 py-2.5 text-xs font-bold flex items-center justify-between border-b ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : statusMessage.type === 'error'
              ? 'bg-red-950/60 border-red-500/40 text-red-300'
              : 'bg-blue-950/60 border-blue-500/40 text-blue-300'
          }`}>
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' && <CheckCircle2 size={16} />}
              {statusMessage.type === 'error' && <AlertTriangle size={16} />}
              {statusMessage.type === 'info' && <RefreshCw size={16} className="animate-spin" />}
              <span>{statusMessage.text}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="opacity-70 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="px-5 pt-3 border-b border-slate-800 flex items-center gap-2 overflow-x-auto bg-slate-950/50">
          <button
            onClick={() => setActiveTab('MY_SETS')}
            className={`px-4 py-2.5 border-b-2 text-xs font-black transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'MY_SETS'
                ? 'border-orange-500 text-orange-400 bg-orange-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderHeart size={15} />
            <span>Bộ câu hỏi của tôi ({mySets.length})</span>
          </button>

          <button
            onClick={handleStartCreateSet}
            className={`px-4 py-2.5 border-b-2 text-xs font-black transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'CREATE_SET'
                ? 'border-orange-500 text-orange-400 bg-orange-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus size={15} />
            <span>{editingSetId ? 'Sửa bộ câu hỏi' : 'Tạo bộ câu hỏi mới'}</span>
          </button>

          <button
            onClick={() => setActiveTab('IMPORT_EXCEL')}
            className={`px-4 py-2.5 border-b-2 text-xs font-black transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'IMPORT_EXCEL'
                ? 'border-orange-500 text-orange-400 bg-orange-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload size={15} />
            <span>Nhập từ Excel / CSV</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('COMMUNITY_LIBRARY');
              refreshPublicSets();
            }}
            className={`px-4 py-2.5 border-b-2 text-xs font-black transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'COMMUNITY_LIBRARY'
                ? 'border-orange-500 text-orange-400 bg-orange-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe size={15} />
            <span>Thư viện cộng đồng</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto text-slate-200">
          
          {/* TAB 1: BỘ CÂU HỎI CỦA TÔI */}
          {activeTab === 'MY_SETS' && (
            <div className="space-y-4">
              {/* Search & Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                  <div className="relative flex-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={searchMySet}
                      onChange={(e) => setSearchMySet(e.target.value)}
                      placeholder="Tìm kiếm bộ câu hỏi theo tên..."
                      className="w-full bg-slate-900 border border-slate-700 text-white pl-9 pr-3 py-2 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <select
                    value={filterSubjectMySet}
                    onChange={(e) => setFilterSubjectMySet(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-xl text-xs font-bold focus:outline-none"
                  >
                    {SUBJECT_LIST.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={refreshMySets}
                    disabled={loadingMySets}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                    title="Làm mới danh sách"
                  >
                    <RefreshCw size={15} className={loadingMySets ? 'animate-spin' : ''} />
                  </button>

                  <button
                    onClick={handleStartCreateSet}
                    className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs shadow-md shadow-orange-600/30 flex items-center gap-1.5 transition"
                  >
                    <Plus size={15} />
                    <span>Tạo Bộ Câu Hỏi</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('IMPORT_EXCEL')}
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs shadow-md shadow-emerald-700/30 flex items-center gap-1.5 transition"
                  >
                    <FileSpreadsheet size={15} />
                    <span>Nhập Excel/CSV</span>
                  </button>
                </div>
              </div>

              {/* Set Cards Grid */}
              {loadingMySets ? (
                <div className="p-12 text-center text-slate-400 space-y-3">
                  <Loader2 size={32} className="animate-spin text-orange-400 mx-auto" />
                  <p className="text-sm font-bold">Đang tải bộ câu hỏi từ Firestore...</p>
                </div>
              ) : mySets.length === 0 ? (
                <div className="p-12 text-center bg-slate-950/40 rounded-3xl border border-slate-800/80 space-y-4 max-w-lg mx-auto">
                  <div className="w-16 h-16 rounded-3xl bg-orange-500/10 text-orange-400 flex items-center justify-center mx-auto border border-orange-500/20">
                    <BookOpen size={30} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Thầy/Cô chưa có bộ câu hỏi nào</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Hãy tạo bộ câu hỏi đầu tiên hoặc tải lên tệp Excel/CSV để bắt đầu tổ chức trò chơi Freeze & Win cho học sinh.
                    </p>
                  </div>
                  <div className="flex justify-center gap-2 pt-2">
                    <button
                      onClick={handleStartCreateSet}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl transition"
                    >
                      + Tạo bộ câu hỏi ngay
                    </button>
                    <button
                      onClick={() => setActiveTab('IMPORT_EXCEL')}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition"
                    >
                      Nhập file Excel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {mySets
                    .filter((s) => {
                      const matchKw = !searchMySet.trim() || s.name.toLowerCase().includes(searchMySet.toLowerCase());
                      const matchSub = filterSubjectMySet === 'Tất cả' || s.subject === filterSubjectMySet;
                      return matchKw && matchSub;
                    })
                    .map((set) => (
                      <div
                        key={set.id}
                        className="bg-slate-950/80 border border-slate-800 hover:border-orange-500/50 rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between group shadow-sm hover:shadow-lg"
                      >
                        <div className="space-y-2.5">
                          {/* Badges row */}
                          <div className="flex items-center justify-between gap-1 text-[10px]">
                            <span className="bg-orange-500/15 text-orange-300 font-bold px-2 py-0.5 rounded-full border border-orange-500/20">
                              {set.subject || 'Tổng Hợp'}
                            </span>
                            
                            <span className={`px-2 py-0.5 rounded-full font-bold border ${
                              set.visibility === 'public'
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : set.visibility === 'shared'
                                ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}>
                              {set.visibility === 'public' ? 'Công khai' : set.visibility === 'shared' ? 'Đã chia sẻ' : 'Riêng tư'}
                            </span>
                          </div>

                          {/* Set Title */}
                          <div>
                            <h4 className="text-sm font-black text-white group-hover:text-orange-400 transition leading-snug line-clamp-2">
                              {set.title || set.name}
                            </h4>
                            {set.description && (
                              <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                                {set.description}
                              </p>
                            )}
                          </div>

                          {/* Metadata */}
                          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
                            <span className="font-bold text-slate-300">
                              {set.questionCount || 0} câu hỏi
                            </span>
                            {set.shareCode && (
                              <span className="font-mono text-orange-400 font-bold">
                                Mã: {set.shareCode}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="pt-3.5 mt-3 border-t border-slate-800/80 flex items-center justify-between gap-1.5 flex-wrap">
                          {/* Big Play button */}
                          <button
                            onClick={() => handlePlay(set)}
                            className="flex-1 py-1.5 px-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-orange-600/20 transition"
                            title="Tải bộ câu hỏi này vào game để học sinh chơi"
                          >
                            <Play size={13} className="fill-current" />
                            <span>CHƠI</span>
                          </button>

                          {/* Secondary utility actions */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleStartEditSet(set)}
                              className="p-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs transition"
                              title="Chỉnh sửa câu hỏi"
                            >
                              <Edit3 size={13} />
                            </button>

                            <button
                              onClick={() => handleDuplicateSet(set)}
                              className="p-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs transition"
                              title="Tạo bản sao vào tài khoản"
                            >
                              <Copy size={13} />
                            </button>

                            <button
                              onClick={() => handleOpenShareModal(set)}
                              className="p-2 rounded-lg bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 border border-blue-500/30 text-xs transition"
                              title="Chia sẻ mã chơi hoặc đường link"
                            >
                              <Share2 size={13} />
                            </button>

                            <button
                              onClick={() => handleDeleteSet(set)}
                              className="p-2 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/30 text-xs transition"
                              title="Xóa bộ câu hỏi"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TẠO HOẶC CHỈNH SỬA BỘ CÂU HỎI */}
          {activeTab === 'CREATE_SET' && (
            <div className="space-y-5 max-w-4xl mx-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span>{editingSetId ? 'CHỈNH SỬA BỘ CÂU HỎI' : 'TẠO BỘ CÂU HỎI MỚI'}</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Thêm, xóa, chỉnh sửa các câu hỏi trắc nghiệm và thiết lập quyền truy cập.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('MY_SETS')}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleSaveSet}
                    disabled={isSaving}
                    className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-black shadow-lg shadow-orange-600/30 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    <span>Lưu Bộ Câu Hỏi</span>
                  </button>
                </div>
              </div>

              {/* Set Metadata Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Tên bộ câu hỏi: <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Ví dụ: KHTN 6 - Đa dạng thế giới sống"
                    className="w-full bg-slate-900 border border-slate-700 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Môn học:</label>
                  <select
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500"
                  >
                    {SUBJECT_LIST.filter(s => s !== 'Tất cả').map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Khối lớp:</label>
                  <select
                    value={editGrade}
                    onChange={(e) => setEditGrade(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500"
                  >
                    {GRADE_LIST.filter(g => g !== 'Tất cả').map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-300 block mb-1">Mô tả tóm tắt:</label>
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Tóm tắt nội dung bài học, lưu ý ôn tập..."
                    className="w-full bg-slate-900 border border-slate-700 text-white px-3.5 py-2 rounded-xl text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-300 block mb-1">Chế độ hiển thị & Chia sẻ:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <label className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 text-xs font-bold ${
                      editVisibility === 'private' ? 'bg-orange-500/15 border-orange-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}>
                      <input
                        type="radio"
                        name="visibility"
                        value="private"
                        checked={editVisibility === 'private'}
                        onChange={() => setEditVisibility('private')}
                        className="accent-orange-500"
                      />
                      <span>Riêng tư (Chỉ tôi thấy)</span>
                    </label>

                    <label className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 text-xs font-bold ${
                      editVisibility === 'shared' ? 'bg-orange-500/15 border-orange-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}>
                      <input
                        type="radio"
                        name="visibility"
                        value="shared"
                        checked={editVisibility === 'shared'}
                        onChange={() => setEditVisibility('shared')}
                        className="accent-orange-500"
                      />
                      <span>Chia sẻ (Qua Mã / Link)</span>
                    </label>

                    <label className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 text-xs font-bold ${
                      editVisibility === 'public' ? 'bg-orange-500/15 border-orange-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}>
                      <input
                        type="radio"
                        name="visibility"
                        value="public"
                        checked={editVisibility === 'public'}
                        onChange={() => setEditVisibility('public')}
                        className="accent-orange-500"
                      />
                      <span>Công khai (Thư viện)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Questions List Header */}
              <div className="flex items-center justify-between pt-2">
                <h4 className="text-xs font-black uppercase text-orange-400 tracking-wider flex items-center gap-2">
                  <Layers size={15} />
                  <span>Danh sách câu hỏi ({editQuestions.length})</span>
                </h4>
                <button
                  type="button"
                  onClick={handleAddQuestionToEditor}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-orange-400 hover:text-orange-300 border border-slate-700 text-xs font-bold flex items-center gap-1 transition"
                >
                  <Plus size={14} />
                  <span>+ Thêm câu hỏi</span>
                </button>
              </div>

              {/* Questions Accordion / List */}
              <div className="space-y-3">
                {editQuestions.map((q, qIndex) => (
                  <div
                    key={q.id || qIndex}
                    className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-orange-500/20 text-orange-400 font-mono font-black text-xs flex items-center justify-center">
                          {qIndex + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-300">
                          Câu hỏi {qIndex + 1}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (qIndex > 0) {
                              const copy = [...editQuestions];
                              const temp = copy[qIndex - 1];
                              copy[qIndex - 1] = copy[qIndex];
                              copy[qIndex] = temp;
                              setEditQuestions(copy);
                            }
                          }}
                          disabled={qIndex === 0}
                          className="p-1 text-slate-500 hover:text-white disabled:opacity-30"
                          title="Di chuyển lên"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (qIndex < editQuestions.length - 1) {
                              const copy = [...editQuestions];
                              const temp = copy[qIndex + 1];
                              copy[qIndex + 1] = copy[qIndex];
                              copy[qIndex] = temp;
                              setEditQuestions(copy);
                            }
                          }}
                          disabled={qIndex === editQuestions.length - 1}
                          className="p-1 text-slate-500 hover:text-white disabled:opacity-30"
                          title="Di chuyển xuống"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (editQuestions.length <= 1) {
                              showNotice('error', 'Bộ câu hỏi cần có ít nhất 1 câu.');
                              return;
                            }
                            setEditQuestions(editQuestions.filter((_, idx) => idx !== qIndex));
                          }}
                          className="p-1 text-red-400 hover:text-red-300 ml-1"
                          title="Xóa câu hỏi này"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Question Input */}
                    <div>
                      <textarea
                        rows={2}
                        value={q.question}
                        onChange={(e) => {
                          const copy = [...editQuestions];
                          copy[qIndex].question = e.target.value;
                          setEditQuestions(copy);
                        }}
                        placeholder="Nhập nội dung câu hỏi..."
                        className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    {/* 4 Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {['A', 'B', 'C', 'D'].map((letter, optIdx) => {
                        const isCorrect = Number(q.correctAnswer) === optIdx;
                        return (
                          <div
                            key={letter}
                            className={`flex items-center gap-2 p-2 rounded-xl border transition ${
                              isCorrect
                                ? 'bg-emerald-950/40 border-emerald-500/80 text-white'
                                : 'bg-slate-900/60 border-slate-800'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                const copy = [...editQuestions];
                                copy[qIndex].correctAnswer = optIdx;
                                setEditQuestions(copy);
                              }}
                              className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 transition ${
                                isCorrect
                                  ? 'bg-emerald-500 text-slate-950'
                                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                              }`}
                              title={isCorrect ? 'Đáp án đúng' : 'Bấm để chọn làm đáp án đúng'}
                            >
                              {letter}
                            </button>
                            <input
                              type="text"
                              value={q.options?.[optIdx] || ''}
                              onChange={(e) => {
                                const copy = [...editQuestions];
                                const currentOpts = [...(copy[qIndex].options || ['', '', '', ''])];
                                currentOpts[optIdx] = e.target.value;
                                copy[qIndex].options = currentOpts;
                                setEditQuestions(copy);
                              }}
                              placeholder={`Phương án ${letter}`}
                              className="bg-transparent text-xs w-full text-white focus:outline-none font-medium"
                            />
                            {isCorrect && (
                              <Check size={14} className="text-emerald-400 shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    <div>
                      <input
                        type="text"
                        value={q.explanation || ''}
                        onChange={(e) => {
                          const copy = [...editQuestions];
                          copy[qIndex].explanation = e.target.value;
                          setEditQuestions(copy);
                        }}
                        placeholder="Giải thích ngắn gọn cho đáp án đúng (tùy chọn)..."
                        className="w-full bg-slate-900/60 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-[11px] focus:outline-none focus:border-slate-700"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleAddQuestionToEditor}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-orange-400 font-bold text-xs flex items-center gap-1.5 transition"
                >
                  <Plus size={15} />
                  <span>Thêm câu hỏi nữa</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('MY_SETS')}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleSaveSet}
                    disabled={isSaving}
                    className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-black shadow-lg shadow-orange-600/30 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                    <span>Lưu Bộ Câu Hỏi Vào Firestore</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: NHẬP TỪ EXCEL / CSV (3-STEP PIPELINE) */}
          {activeTab === 'IMPORT_EXCEL' && (
            <div className="space-y-5 max-w-3xl mx-auto">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <FileSpreadsheet size={20} className="text-emerald-400" />
                  <span>NHẬP BỘ CÂU HỎI TỪ FILE EXCEL (.XLSX) HOẶC CSV</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tải lên bảng tính có sẵn của Thầy/Cô để tự động tạo bộ câu hỏi trong 3 bước nhanh chóng.
                </p>
              </div>

              {/* 3 Step Indicator */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-black">
                <div className={`p-2.5 rounded-xl border ${
                  !excelFile ? 'bg-orange-500/20 border-orange-500 text-orange-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}>
                  1. Chọn Tệp Excel / CSV
                </div>
                <div className={`p-2.5 rounded-xl border ${
                  excelFile && (!parseResult || parseResult.errors.length > 0)
                    ? 'bg-orange-500/20 border-orange-500 text-orange-300'
                    : parseResult?.success
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}>
                  2. Kiểm Tra & Báo Lỗi
                </div>
                <div className={`p-2.5 rounded-xl border ${
                  parseResult?.success ? 'bg-orange-500/20 border-orange-500 text-orange-300' : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}>
                  3. Xem Trước & Lưu
                </div>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-orange-500 bg-slate-950/60 hover:bg-slate-950 rounded-3xl p-8 text-center cursor-pointer transition space-y-3 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30 group-hover:scale-105 transition">
                  <Upload size={26} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {excelFile ? excelFile.name : 'Bấm để chọn hoặc kéo thả file Excel (.xlsx) / CSV vào đây'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Hỗ trợ đầy đủ định dạng cột: Câu hỏi | Đáp án A | Đáp án B | Đáp án C | Đáp án D | Đáp án đúng | Giải thích
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadSampleExcel();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition"
                  >
                    <span>📥 Tải file mẫu Excel chuẩn (.xlsx)</span>
                  </button>
                </div>
              </div>

              {/* Parse Validation Results */}
              {parseResult && (
                <div className="space-y-4">
                  {/* Errors */}
                  {parseResult.errors.length > 0 && (
                    <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-2xl text-xs space-y-1 text-red-300">
                      <div className="font-bold flex items-center gap-1.5 text-red-400 mb-1">
                        <AlertTriangle size={16} />
                        <span>Phát hiện lỗi trong file tải lên:</span>
                      </div>
                      {parseResult.errors.map((err, idx) => (
                        <p key={idx}>• {err}</p>
                      ))}
                    </div>
                  )}

                  {/* Success Preview */}
                  {parseResult.success && parseResult.questions.length > 0 && (
                    <div className="space-y-4 bg-slate-950/70 p-5 rounded-3xl border border-slate-800">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={18} className="text-emerald-400" />
                          <span className="text-sm font-black text-white">
                            Đã đọc thành công {parseResult.questions.length} câu hỏi!
                          </span>
                        </div>
                      </div>

                      {/* Set Info Before Saving */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="text-xs font-bold text-slate-400 block mb-1">Tên bộ câu hỏi:</label>
                          <input
                            type="text"
                            value={importTitle}
                            onChange={(e) => setImportTitle(e.target.value)}
                            placeholder="Nhập tên bộ câu hỏi..."
                            className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1">Môn học:</label>
                          <select
                            value={importSubject}
                            onChange={(e) => setImportSubject(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-xl text-xs font-bold focus:outline-none"
                          >
                            {SUBJECT_LIST.filter(s => s !== 'Tất cả').map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Preview Sample Questions */}
                      <div className="space-y-2 pt-2">
                        <label className="text-xs font-black text-slate-300 block uppercase tracking-wider">
                          Xem trước câu hỏi (Hiển thị mẫu 3 câu đầu):
                        </label>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {parseResult.questions.slice(0, 3).map((q, idx) => (
                            <div key={idx} className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-xs space-y-1.5">
                              <p className="font-bold text-white">
                                Câu {idx + 1}: {q.question}
                              </p>
                              <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-400">
                                <span>A. {q.options?.[0]}</span>
                                <span>B. {q.options?.[1]}</span>
                                <span>C. {q.options?.[2]}</span>
                                <span>D. {q.options?.[3]}</span>
                              </div>
                              <p className="text-[11px] font-bold text-emerald-400">
                                Đáp án đúng: {['A', 'B', 'C', 'D'][Number(q.correctAnswer)] || q.correctAnswer}
                                {q.explanation ? ` (Giải thích: ${q.explanation})` : ''}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Save to Firestore Button */}
                      <div className="pt-3 border-t border-slate-800 flex justify-end">
                        <button
                          onClick={handleSaveImportedSet}
                          disabled={isImporting}
                          className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs shadow-lg shadow-orange-600/30 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                        >
                          {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                          <span>LƯU BỘ CÂU HỎI VÀO FIRESTORE</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: THƯ VIỆN CỘNG ĐỒNG (PUBLIC) */}
          {activeTab === 'COMMUNITY_LIBRARY' && (
            <div className="space-y-4">
              {/* Search & Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                  <div className="relative flex-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={searchPublic}
                      onChange={(e) => setSearchPublic(e.target.value)}
                      placeholder="Tìm kiếm bộ câu hỏi công khai của các giáo viên khác..."
                      className="w-full bg-slate-900 border border-slate-700 text-white pl-9 pr-3 py-2 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <select
                    value={filterSubjectPublic}
                    onChange={(e) => setFilterSubjectPublic(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-xl text-xs font-bold focus:outline-none"
                  >
                    {SUBJECT_LIST.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={refreshPublicSets}
                  disabled={loadingPublicSets}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <RefreshCw size={14} className={loadingPublicSets ? 'animate-spin' : ''} />
                  <span>Tìm kiếm</span>
                </button>
              </div>

              {/* Public Sets Grid */}
              {loadingPublicSets ? (
                <div className="p-12 text-center text-slate-400 space-y-3">
                  <Loader2 size={32} className="animate-spin text-orange-400 mx-auto" />
                  <p className="text-sm font-bold">Đang tải thư viện câu hỏi cộng đồng...</p>
                </div>
              ) : publicSets.length === 0 ? (
                <div className="p-12 text-center bg-slate-950/40 rounded-3xl border border-slate-800/80 space-y-3 max-w-lg mx-auto">
                  <Globe size={32} className="text-slate-500 mx-auto" />
                  <h4 className="text-sm font-bold text-white">Chưa tìm thấy bộ câu hỏi công khai nào</h4>
                  <p className="text-xs text-slate-400">
                    Khi các Thầy/Cô thiết lập bộ câu hỏi ở chế độ <strong>Công khai</strong>, câu hỏi sẽ xuất hiện tại đây để đồng nghiệp tham khảo và sao chép.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {publicSets.map((set) => (
                    <div
                      key={set.id}
                      className="bg-slate-950/80 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between shadow-sm"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="bg-emerald-500/15 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                            {set.subject || 'Tổng Hợp'}
                          </span>
                          <span className="text-slate-400 font-medium">
                            Tác giả: <strong>{set.ownerName || 'Giáo viên'}</strong>
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-black text-white leading-snug line-clamp-2">
                            {set.title || set.name}
                          </h4>
                          {set.description && (
                            <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                              {set.description}
                            </p>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                          <span className="font-bold text-slate-300">
                            {set.questionCount || 0} câu hỏi
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-3.5 mt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <button
                          onClick={() => handlePlay(set)}
                          className="flex-1 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
                        >
                          <Play size={13} />
                          <span>Chơi thử</span>
                        </button>

                        <button
                          onClick={() => handleCopyFromCommunity(set)}
                          className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-700/20 transition"
                          title="Tạo bản sao mới thuộc tài khoản của Thầy/Cô để tự do chỉnh sửa"
                        >
                          <Copy size={13} />
                          <span>Sao chép về</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Share Dialog Modal */}
        {sharingSet && (
          <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl w-full max-w-md shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-white font-black text-sm">
                  <Share2 size={16} className="text-orange-400" />
                  <span>Chia sẻ: {sharingSet.title || sharingSet.name}</span>
                </div>
                <button
                  onClick={() => setSharingSet(null)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Share Code Display */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center space-y-2">
                <span className="text-xs text-slate-400 font-bold block">MÃ CHIA SẺ GAME:</span>
                <div className="text-3xl font-black text-orange-400 font-mono tracking-widest select-all">
                  {sharingSet.shareCode || '------'}
                </div>
                <button
                  onClick={handleCopyShareCode}
                  className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition"
                >
                  {shareCopied === 'CODE' ? '✓ Đã sao chép mã!' : 'Sao chép mã'}
                </button>
              </div>

              {/* Direct Play Link */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">Đường link chơi trực tiếp (Cho học sinh):</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}${window.location.pathname}?play=${sharingSet.shareCode}`}
                    className="w-full bg-slate-950 border border-slate-700 text-xs text-slate-300 px-3 py-2 rounded-xl focus:outline-none select-all"
                  />
                  <button
                    onClick={handleCopyShareLink}
                    className="px-3 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shrink-0 transition"
                  >
                    {shareCopied === 'LINK' ? '✓ Đã sao chép' : 'Sao chép link'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Học sinh mở link này sẽ vào chơi ngay lập tức mà <strong>không cần tạo tài khoản</strong>.
                </p>
              </div>

              {/* Visibility Setting */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <label className="text-xs font-bold text-slate-300 block">Quyền truy cập bộ câu hỏi:</label>
                <div className="space-y-1.5">
                  {[
                    { id: 'private', label: 'Riêng tư (Chỉ mình tôi)', desc: 'Chỉ giáo viên sở hữu mới thấy và dùng được' },
                    { id: 'shared', label: 'Chia sẻ qua mã / link', desc: 'Học sinh hoặc người có mã/link có thể chơi trực tiếp' },
                    { id: 'public', label: 'Công khai trong Thư viện', desc: 'Mọi giáo viên khác có thể tìm và sao chép về tài khoản' },
                  ].map((item) => (
                    <label
                      key={item.id}
                      className={`p-2 rounded-xl border flex items-start gap-2 text-xs cursor-pointer ${
                        sharingSet.visibility === item.id
                          ? 'bg-orange-500/15 border-orange-500/80 text-white'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="modal-visibility"
                        value={item.id}
                        checked={sharingSet.visibility === item.id}
                        onChange={() => handleUpdateSharingVisibility(item.id as QuestionSetVisibility)}
                        className="mt-0.5 accent-orange-500"
                      />
                      <div>
                        <span className="font-bold block text-slate-200">{item.label}</span>
                        <span className="text-[10px] text-slate-400">{item.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSharingSet(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                >
                  Xong
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
