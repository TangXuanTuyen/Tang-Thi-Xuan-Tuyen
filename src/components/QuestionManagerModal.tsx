import React, { useState, useRef } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Edit3, 
  HelpCircle, 
  Check, 
  RotateCcw, 
  Download, 
  Upload, 
  Filter,
  FileSpreadsheet,
  FileText,
  FileJson,
  Play,
  Save,
  Copy,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FolderHeart,
  Layers,
  ArrowRight,
  BookOpen,
  RefreshCw,
  Clock
} from 'lucide-react';
import { Question, QuestionType, QuestionSet } from '../types';
import { DEFAULT_QUESTIONS, DEFAULT_QUESTION_SETS } from '../utils/seedData';
import { 
  parseQuickText, 
  parseExcelOrCSV, 
  downloadSampleExcel, 
  exportQuestionsToExcel, 
  exportQuestionSetJSON 
} from '../utils/questionParser';

interface QuestionManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
  onUpdateQuestions: (newQuestions: Question[]) => void;
  questionSets: QuestionSet[];
  activeQuestionSetId: string;
  onSelectQuestionSet: (setId: string) => void;
  onSaveCurrentAsSet: (name: string, description?: string, subject?: string) => void;
  onUpdateQuestionSet: (updatedSet: QuestionSet) => void;
  onDeleteQuestionSet: (setId: string) => void;
  onCreateQuestionSet: (newSet: QuestionSet) => void;
}

const SUBJECT_LIST = [
  'Tất cả',
  'Toán Học',
  'Tiếng Việt',
  'Ngữ Văn',
  'Tiếng Anh',
  'Khoa Học',
  'Lịch Sử - Địa Lý',
  'Tin Học',
  'Đố Vui',
];

type ActiveTab = 'CURRENT_QUESTIONS' | 'QUESTION_SETS' | 'PUSH_IMPORT';

export const QuestionManagerModal: React.FC<QuestionManagerModalProps> = ({
  isOpen,
  onClose,
  questions,
  onUpdateQuestions,
  questionSets,
  activeQuestionSetId,
  onSelectQuestionSet,
  onSaveCurrentAsSet,
  onUpdateQuestionSet,
  onDeleteQuestionSet,
  onCreateQuestionSet,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('CURRENT_QUESTIONS');
  const [selectedSubject, setSelectedSubject] = useState<string>('Tất cả');
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  // Single Question Form State
  const [formSubject, setFormSubject] = useState<string>('Toán Học');
  const [formType, setFormType] = useState<QuestionType>('MULTIPLE_CHOICE');
  const [formText, setFormText] = useState<string>('');
  const [formOptions, setFormOptions] = useState<string[]>(['', '', '', '']);
  const [formCorrectIndex, setFormCorrectIndex] = useState<number>(0);
  const [formShortAnswer, setFormShortAnswer] = useState<string>('');
  const [formExplanation, setFormExplanation] = useState<string>('');
  const [formPoints, setFormPoints] = useState<number>(20);

  // Save As New Set Dialog State
  const [isSaveSetModalOpen, setIsSaveSetModalOpen] = useState<boolean>(false);
  const [newSetName, setNewSetName] = useState<string>('');
  const [newSetDescription, setNewSetDescription] = useState<string>('');
  const [newSetSubject, setNewSetSubject] = useState<string>('Tổng Hợp');

  // Edit Set Info Modal
  const [editingSet, setEditingSet] = useState<QuestionSet | null>(null);

  // PUSH / IMPORT STATE
  const [importMethod, setImportMethod] = useState<'EXCEL' | 'TEXT' | 'JSON'>('EXCEL');
  const [rawTextContent, setRawTextContent] = useState<string>('');
  const [parsedPreviewQuestions, setParsedPreviewQuestions] = useState<Question[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);
  const [pushDestination, setPushDestination] = useState<'NEW_SET' | 'APPEND' | 'REPLACE'>('NEW_SET');
  const [pushSetName, setPushSetName] = useState<string>('Bộ Câu Hỏi Mới');
  const [pushSetSubject, setPushSetSubject] = useState<string>('Tổng Hợp');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const currentSet = questionSets.find((s) => s.id === activeQuestionSetId);

  const filteredQuestions = questions.filter((q) => {
    if (selectedSubject === 'Tất cả') return true;
    return q.subject.toLowerCase().includes(selectedSubject.toLowerCase());
  });

  const resetSingleQuestionForm = () => {
    setFormSubject('Toán Học');
    setFormType('MULTIPLE_CHOICE');
    setFormText('');
    setFormOptions(['', '', '', '']);
    setFormCorrectIndex(0);
    setFormShortAnswer('');
    setFormExplanation('');
    setFormPoints(20);
    setIsAddingNew(false);
    setEditingQuestionId(null);
  };

  const handleStartEdit = (q: Question) => {
    setEditingQuestionId(q.id);
    setFormSubject(q.subject);
    setFormType(q.type);
    setFormText(q.question);
    setFormOptions(q.options && q.options.length === 4 ? [...q.options] : ['', '', '', '']);
    if (q.type === 'MULTIPLE_CHOICE') {
      setFormCorrectIndex(Number(q.correctAnswer) || 0);
    } else {
      setFormShortAnswer(String(q.correctAnswer));
    }
    setFormExplanation(q.explanation || '');
    setFormPoints(q.points);
    setIsAddingNew(true);
    setActiveTab('CURRENT_QUESTIONS');
  };

  const handleSaveSingleQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formText.trim()) {
      alert('Vui lòng nhập nội dung câu hỏi.');
      return;
    }

    if (formType === 'MULTIPLE_CHOICE') {
      if (formOptions.some((opt) => !opt.trim())) {
        alert('Vui lòng điền đầy đủ 4 phương án trắc nghiệm A, B, C, D.');
        return;
      }
    } else {
      if (!formShortAnswer.trim()) {
        alert('Vui lòng nhập đáp án đúng cho câu hỏi trả lời ngắn.');
        return;
      }
    }

    const newQuestionObj: Question = {
      id: editingQuestionId || `q-${Date.now()}`,
      subject: formSubject,
      type: formType,
      question: formText.trim(),
      options: formType === 'MULTIPLE_CHOICE' ? formOptions.map((o) => o.trim()) : undefined,
      correctAnswer: formType === 'MULTIPLE_CHOICE' ? formCorrectIndex : formShortAnswer.trim(),
      explanation: formExplanation.trim(),
      points: Number(formPoints) || 20,
    };

    if (editingQuestionId) {
      onUpdateQuestions(
        questions.map((q) => (q.id === editingQuestionId ? newQuestionObj : q))
      );
    } else {
      onUpdateQuestions([newQuestionObj, ...questions]);
    }

    resetSingleQuestionForm();
  };

  const handleDeleteQuestion = (id: string) => {
    if (window.confirm('Bạn có chắc muốn xóa câu hỏi này khỏi danh sách?')) {
      onUpdateQuestions(questions.filter((q) => q.id !== id));
    }
  };

  // Handle Save Set Dialog
  const handleOpenSaveCurrentSet = () => {
    setNewSetName(currentSet ? `${currentSet.name} (Bản lưu mới)` : `Bộ Câu Hỏi Lớp Học ${new Date().toLocaleDateString('vi-VN')}`);
    setNewSetSubject(currentSet?.subject || 'Tổng Hợp');
    setNewSetDescription(`Bộ câu hỏi gồm ${questions.length} câu đã được tùy chỉnh.`);
    setIsSaveSetModalOpen(true);
  };

  const handleConfirmSaveSet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetName.trim()) {
      alert('Vui lòng nhập tên cho bộ câu hỏi.');
      return;
    }

    onSaveCurrentAsSet(newSetName.trim(), newSetDescription.trim(), newSetSubject.trim());
    setIsSaveSetModalOpen(false);
    setImportSuccessMsg(`Đã lưu thành công bộ câu hỏi "${newSetName.trim()}"!`);
    setTimeout(() => setImportSuccessMsg(null), 4000);
  };

  // Handle Excel / CSV File Select
  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportErrors([]);
    setImportSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const buffer = evt.target?.result;
      if (buffer) {
        const result = parseExcelOrCSV(buffer as ArrayBuffer);
        if (result.success && result.questions.length > 0) {
          setParsedPreviewQuestions(result.questions);
          setPushSetName(file.name.replace(/\.[^/.]+$/, ''));
          setImportSuccessMsg(`Đã nhận diện thành công ${result.questions.length} câu hỏi từ file "${file.name}".`);
        } else {
          setImportErrors(result.errors.length > 0 ? result.errors : ['Không thể đọc câu hỏi từ file này.']);
          setParsedPreviewQuestions([]);
        }
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset file input
    e.target.value = '';
  };

  // Handle JSON File Select
  const handleJSONFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportErrors([]);
    setImportSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = evt.target?.result as string;
        const parsed = JSON.parse(content);
        
        let loadedQuestions: Question[] = [];
        if (Array.isArray(parsed)) {
          loadedQuestions = parsed;
        } else if (parsed && Array.isArray(parsed.questions)) {
          loadedQuestions = parsed.questions;
          if (parsed.name) setPushSetName(parsed.name);
          if (parsed.subject) setPushSetSubject(parsed.subject);
        }

        if (loadedQuestions.length > 0) {
          setParsedPreviewQuestions(loadedQuestions);
          setImportSuccessMsg(`Đã phân tích thành công ${loadedQuestions.length} câu hỏi từ file JSON.`);
        } else {
          setImportErrors(['File JSON không chứa danh sách câu hỏi hợp lệ.']);
          setParsedPreviewQuestions([]);
        }
      } catch (err: unknown) {
        setImportErrors([`Lỗi cú pháp file JSON: ${err instanceof Error ? err.message : String(err)}`]);
        setParsedPreviewQuestions([]);
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  // Handle Quick Text Parse
  const handleParseQuickText = () => {
    setImportErrors([]);
    setImportSuccessMsg(null);

    if (!rawTextContent.trim()) {
      setImportErrors(['Vui lòng dán văn bản câu hỏi vào khung nhập liệu.']);
      return;
    }

    const result = parseQuickText(rawTextContent, pushSetSubject);
    if (result.success && result.questions.length > 0) {
      setParsedPreviewQuestions(result.questions);
      setImportSuccessMsg(`Đã phân tích thành công ${result.questions.length} câu hỏi từ văn bản!`);
    } else {
      setImportErrors(result.errors.length > 0 ? result.errors : ['Không nhận diện được câu hỏi nào từ văn bản.']);
      setParsedPreviewQuestions([]);
    }
  };

  // Insert Sample Text
  const handleLoadSampleText = () => {
    const sample = `Môn: Toán Học
Câu 1: Số nào sau đây là số nguyên tố chẵn duy nhất?
A. 0
B. 1
C. 2
D. 4
Đáp án: C
Giải thích: Số 2 là số nguyên tố chẵn duy nhất trong toán học.

Câu 2: Một hình chữ nhật có chiều dài 8cm, chiều rộng 5cm. Chu vi là bao nhiêu?
A. 13 cm
B. 26 cm
C. 40 cm
D. 30 cm
Đáp án: B
Giải thích: Chu vi = (8 + 5) x 2 = 26 cm.

Môn: Tiếng Anh
Câu 3: Từ nào sau đây có nghĩa là "Mặt Trăng" trong tiếng Anh?
A. Sun
B. Star
C. Moon
D. Sky
Đáp án: C
Giải thích: Moon nghĩa là Mặt Trăng.

Câu 4: What is the opposite of "HOT"?
A. Cold
B. Warm
C. Cool
D. Ice
Đáp án: A
Giải thích: Đối lập với HOT (nóng) là COLD (lạnh).`;

    setRawTextContent(sample);
  };

  // Final Action: Push and Save Questions
  const handleExecutePushAndSave = () => {
    if (parsedPreviewQuestions.length === 0) {
      alert('Chưa có câu hỏi nào được nhận diện để đẩy vào hệ thống.');
      return;
    }

    if (pushDestination === 'NEW_SET') {
      const newSet: QuestionSet = {
        id: `set-custom-${Date.now()}`,
        name: pushSetName.trim() || `Bộ Câu Hỏi ${new Date().toLocaleDateString('vi-VN')}`,
        description: `Tạo từ tính năng đẩy câu hỏi với ${parsedPreviewQuestions.length} câu.`,
        subject: pushSetSubject || 'Tổng Hợp',
        createdAt: new Date().toISOString().slice(0, 10),
        questions: parsedPreviewQuestions,
      };

      onCreateQuestionSet(newSet);
      onSelectQuestionSet(newSet.id);
      setActiveTab('CURRENT_QUESTIONS');
      setImportSuccessMsg(`Đã đẩy và tạo mới thành công Bộ Câu Hỏi: "${newSet.name}" (${parsedPreviewQuestions.length} câu)!`);
    } else if (pushDestination === 'APPEND') {
      onUpdateQuestions([...questions, ...parsedPreviewQuestions]);
      setActiveTab('CURRENT_QUESTIONS');
      setImportSuccessMsg(`Đã đẩy thêm ${parsedPreviewQuestions.length} câu hỏi vào danh sách hiện tại!`);
    } else if (pushDestination === 'REPLACE') {
      if (window.confirm(`Bạn có chắc muốn thay thế toàn bộ ${questions.length} câu hỏi hiện tại bằng ${parsedPreviewQuestions.length} câu hỏi mới?`)) {
        onUpdateQuestions(parsedPreviewQuestions);
        setActiveTab('CURRENT_QUESTIONS');
        setImportSuccessMsg(`Đã thay thế toàn bộ câu hỏi hiện tại bằng ${parsedPreviewQuestions.length} câu hỏi mới!`);
      }
    }

    // Reset preview
    setParsedPreviewQuestions([]);
    setRawTextContent('');
    setTimeout(() => setImportSuccessMsg(null), 5000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
              <FolderHeart size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white">Quản Lý & Đẩy Bộ Câu Hỏi</h2>
                <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px] px-2.5 py-0.5 rounded-full font-bold">
                  {questions.length} câu đang dùng
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {currentSet ? (
                  <span>
                    Đang kích hoạt: <strong className="text-amber-300 font-bold">{currentSet.name}</strong> • Chủ đề: {currentSet.subject || 'Tổng hợp'}
                  </span>
                ) : (
                  'Tùy chỉnh, lưu và đẩy các bộ câu hỏi đa dạng cho lớp học'
                )}
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

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-5 pt-3 pb-2 bg-slate-900/90 border-b border-slate-800 gap-2 overflow-x-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('CURRENT_QUESTIONS')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                activeTab === 'CURRENT_QUESTIONS'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <BookOpen size={16} />
              <span>Ngân Hàng Hiện Tại ({questions.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('QUESTION_SETS')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                activeTab === 'QUESTION_SETS'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Layers size={16} />
              <span>Bộ Câu Hỏi Đã Lưu ({questionSets.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('PUSH_IMPORT')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                activeTab === 'PUSH_IMPORT'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Upload size={16} />
              <span>Đẩy Bộ Câu Hỏi Mới</span>
              <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                Excel / Text
              </span>
            </button>
          </div>

          {/* Quick Action in Header */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <button
              onClick={handleOpenSaveCurrentSet}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700/60 hover:bg-emerald-600 text-emerald-100 rounded-xl text-xs font-bold border border-emerald-500/40 transition shadow-sm"
              title="Lưu danh sách câu hỏi hiện tại thành một Bộ câu hỏi mới trong thư viện"
            >
              <Save size={14} />
              <span>Lưu Thành Bộ Mới</span>
            </button>
          </div>
        </div>

        {/* Global Notification Banner */}
        {importSuccessMsg && (
          <div className="bg-emerald-950/90 border-b border-emerald-500/50 px-5 py-2 flex items-center justify-between text-emerald-200 text-xs font-bold animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span>{importSuccessMsg}</span>
            </div>
            <button onClick={() => setImportSuccessMsg(null)} className="text-emerald-400 hover:text-white">
              <X size={14} />
            </button>
          </div>
        )}

        {/* TAB 1: CURRENT ACTIVE QUESTIONS */}
        {activeTab === 'CURRENT_QUESTIONS' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Action Controls & Filters Bar */}
            <div className="p-3 sm:p-4 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
              {/* Subject Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                <Filter size={14} className="text-slate-500 shrink-0 mr-1" />
                {SUBJECT_LIST.map((subj) => (
                  <button
                    key={subj}
                    type="button"
                    onClick={() => setSelectedSubject(subj)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition border ${
                      selectedSubject === subj
                        ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {subj}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => exportQuestionsToExcel(questions, currentSet?.name || 'bo_cau_hoi')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition"
                  title="Xuất file Excel (.xlsx) bảng câu hỏi hiện tại"
                >
                  <FileSpreadsheet size={13} className="text-emerald-400" />
                  <span>Xuất Excel</span>
                </button>

                <button
                  onClick={() => exportQuestionSetJSON(questions, currentSet?.name || 'bo_cau_hoi')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition"
                  title="Xuất file JSON"
                >
                  <FileJson size={13} className="text-amber-400" />
                  <span>Xuất JSON</span>
                </button>

                <button
                  onClick={() => {
                    resetSingleQuestionForm();
                    setIsAddingNew(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 transition"
                >
                  <Plus size={14} />
                  <span>Thêm Câu Hỏi</span>
                </button>
              </div>
            </div>

            {/* Questions Scrollable Area */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              {/* Add / Edit Form */}
              {isAddingNew && (
                <form
                  onSubmit={handleSaveSingleQuestion}
                  className="bg-slate-850 border-2 border-blue-500/50 rounded-2xl p-4 sm:p-5 shadow-2xl mb-4 animate-fadeIn"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-700 mb-4">
                    <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                      <span>{editingQuestionId ? '✏️ Chỉnh Sửa Câu Hỏi' : '➕ Thêm Câu Hỏi Mới'}</span>
                    </h3>
                    <button
                      type="button"
                      onClick={resetSingleQuestionForm}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Hủy
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">Môn học / Chủ đề:</label>
                      <input
                        type="text"
                        value={formSubject}
                        onChange={(e) => setFormSubject(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                        placeholder="VD: Toán Học, Tiếng Anh..."
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">Loại câu hỏi:</label>
                      <select
                        value={formType}
                        onChange={(e) => setFormType(e.target.value as QuestionType)}
                        className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                      >
                        <option value="MULTIPLE_CHOICE">Trắc nghiệm (4 phương án)</option>
                        <option value="SHORT_ANSWER">Trả lời ngắn / Tự luận</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">Điểm thưởng:</label>
                      <input
                        type="number"
                        value={formPoints}
                        onChange={(e) => setFormPoints(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                        min={5}
                        max={100}
                        step={5}
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-xs font-bold text-slate-400 block mb-1">Nội dung câu hỏi:</label>
                    <textarea
                      value={formText}
                      onChange={(e) => setFormText(e.target.value)}
                      rows={2}
                      className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                      placeholder="Nhập nội dung đề bài câu hỏi..."
                      required
                    />
                  </div>

                  {formType === 'MULTIPLE_CHOICE' ? (
                    <div className="mb-4">
                      <label className="text-xs font-bold text-slate-400 block mb-2">
                        4 Phương án và Chọn đáp án đúng (tích chọn):
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {['A', 'B', 'C', 'D'].map((label, idx) => (
                          <div
                            key={label}
                            onClick={() => setFormCorrectIndex(idx)}
                            className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition ${
                              formCorrectIndex === idx
                                ? 'bg-emerald-950/80 border-emerald-500 text-white'
                                : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
                            }`}
                          >
                            <span className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center font-black text-xs shrink-0">
                              {label}
                            </span>
                            <input
                              type="text"
                              value={formOptions[idx] || ''}
                              onChange={(e) => {
                                const newOpts = [...formOptions];
                                newOpts[idx] = e.target.value;
                                setFormOptions(newOpts);
                              }}
                              className="flex-1 bg-transparent text-sm focus:outline-none"
                              placeholder={`Phương án ${label}`}
                              onClick={(e) => e.stopPropagation()}
                            />
                            {formCorrectIndex === idx && (
                              <Check size={16} className="text-emerald-400 shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <label className="text-xs font-bold text-slate-400 block mb-1">Đáp án đúng chuẩn:</label>
                      <input
                        type="text"
                        value={formShortAnswer}
                        onChange={(e) => setFormShortAnswer(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                        placeholder="Nhập từ khóa hoặc số đáp án chính xác..."
                      />
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="text-xs font-bold text-slate-400 block mb-1">Giải thích chi tiết (tùy chọn):</label>
                    <input
                      type="text"
                      value={formExplanation}
                      onChange={(e) => setFormExplanation(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                      placeholder="Giải thích ngắn gọn để học sinh hiểu bài sau khi trả lời..."
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={resetSingleQuestionForm}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30"
                    >
                      Lưu Câu Hỏi
                    </button>
                  </div>
                </form>
              )}

              {/* Questions List */}
              {filteredQuestions.length === 0 ? (
                <div className="text-center py-12 bg-slate-950/40 rounded-2xl border border-slate-800">
                  <HelpCircle size={36} className="mx-auto text-slate-600 mb-2" />
                  <p className="text-slate-400 font-bold text-sm">Không tìm thấy câu hỏi nào trong chủ đề này.</p>
                  <button
                    type="button"
                    onClick={() => {
                      resetSingleQuestionForm();
                      setIsAddingNew(true);
                    }}
                    className="mt-3 text-xs text-blue-400 hover:underline font-bold"
                  >
                    + Thêm câu hỏi đầu tiên
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredQuestions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 flex flex-col md:flex-row items-start justify-between gap-3 hover:border-slate-600 transition shadow-sm"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-xs font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                            #{idx + 1}
                          </span>
                          <span className="text-xs font-bold text-blue-300 bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 rounded">
                            {q.subject}
                          </span>
                          <span className="text-xs font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                            {q.type === 'MULTIPLE_CHOICE' ? 'Trắc nghiệm' : 'Trả lời ngắn'}
                          </span>
                          <span className="text-xs font-black text-amber-300">
                            +{q.points}đ
                          </span>
                        </div>

                        <h4 className="text-sm sm:text-base font-bold text-white leading-relaxed">
                          {q.question}
                        </h4>

                        {/* Options summary */}
                        {q.type === 'MULTIPLE_CHOICE' && q.options && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2">
                            {q.options.map((opt, oIdx) => (
                              <div
                                key={oIdx}
                                className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                                  Number(q.correctAnswer) === oIdx
                                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60 font-bold'
                                    : 'bg-slate-900/60 text-slate-400 border-slate-800'
                                }`}
                              >
                                <span>{['A', 'B', 'C', 'D'][oIdx]}.</span>
                                <span className="truncate">{opt}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {q.type === 'SHORT_ANSWER' && (
                          <div className="mt-1.5 text-xs text-emerald-300 font-medium">
                            Đáp án đúng: <strong>{String(q.correctAnswer)}</strong>
                          </div>
                        )}

                        {q.explanation && (
                          <div className="mt-1 text-[11px] text-slate-400 italic">
                            💡 {q.explanation}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(q)}
                          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                          title="Sửa câu hỏi"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-2 rounded-xl bg-slate-900 hover:bg-red-950/80 text-slate-400 hover:text-red-300 border border-slate-700 hover:border-red-900 transition"
                          title="Xóa câu hỏi"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SAVED QUESTION SETS LIBRARY */}
        {activeTab === 'QUESTION_SETS' && (
          <div className="flex flex-col flex-1 overflow-hidden p-5 space-y-4">
            {/* Top Toolbar in Sets Library */}
            <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>📚 Thư Viện Bộ Câu Hỏi Lớp Học</span>
                  <span className="text-xs text-slate-400 font-normal">({questionSets.length} bộ đã lưu)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Chọn bất kỳ bộ câu hỏi nào để kích hoạt ngay vào trận đấu hoặc lưu bộ hiện tại.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenSaveCurrentSet}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 transition"
                >
                  <Save size={15} />
                  <span>Lưu Bộ Hiện Tại Thành Bộ Mới</span>
                </button>

                <button
                  onClick={() => {
                    const newId = `set-custom-${Date.now()}`;
                    const emptySet: QuestionSet = {
                      id: newId,
                      name: `Bộ Câu Hỏi Mới #${questionSets.length + 1}`,
                      description: 'Bộ câu hỏi tự tạo trống, hãy thêm câu hỏi.',
                      subject: 'Chung',
                      createdAt: new Date().toISOString().slice(0, 10),
                      questions: [],
                    };
                    onCreateQuestionSet(emptySet);
                    onSelectQuestionSet(newId);
                    setActiveTab('CURRENT_QUESTIONS');
                    setIsAddingNew(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition"
                >
                  <Plus size={15} />
                  <span>Tạo Bộ Trống Mới</span>
                </button>
              </div>
            </div>

            {/* Question Sets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto flex-1 pr-1">
              {questionSets.map((set) => {
                const isActive = set.id === activeQuestionSetId;
                return (
                  <div
                    key={set.id}
                    className={`rounded-2xl p-4.5 border-2 transition flex flex-col justify-between shadow-lg relative ${
                      isActive
                        ? 'bg-blue-950/40 border-blue-500 shadow-blue-950/50'
                        : 'bg-slate-850/90 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {/* Active badge */}
                    {isActive && (
                      <div className="absolute top-3 right-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1">
                        <Check size={12} />
                        <span>Đang Kích Hoạt</span>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                          {set.subject || 'Tổng Hợp'}
                        </span>
                        <span className="text-xs font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                          {set.questions.length} câu hỏi
                        </span>
                        {set.isDefault && (
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-900 px-1.5 py-0.2 rounded">
                            Mẫu sẵn
                          </span>
                        )}
                      </div>

                      <h4 className="text-base font-extrabold text-white mb-1">{set.name}</h4>
                      <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                        {set.description || 'Không có mô tả chi tiết.'}
                      </p>
                    </div>

                    {/* Footer Actions of Set */}
                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => exportQuestionsToExcel(set.questions, set.name)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition"
                          title="Tải về file Excel"
                        >
                          <FileSpreadsheet size={14} className="text-emerald-400" />
                        </button>
                        <button
                          onClick={() => exportQuestionSetJSON(set, set.name)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition"
                          title="Tải về file JSON"
                        >
                          <Download size={14} className="text-blue-400" />
                        </button>
                        <button
                          onClick={() => setEditingSet(set)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition"
                          title="Sửa tên / mô tả bộ câu hỏi"
                        >
                          <Edit3 size={14} />
                        </button>
                        {!set.isDefault && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Bạn có chắc muốn xóa bộ câu hỏi "${set.name}"?`)) {
                                onDeleteQuestionSet(set.id);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 text-xs border border-slate-700 transition"
                            title="Xóa bộ câu hỏi này"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                      {isActive ? (
                        <button
                          onClick={() => setActiveTab('CURRENT_QUESTIONS')}
                          className="px-3.5 py-1.5 bg-blue-600/80 hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                        >
                          <span>Xem Câu Hỏi</span>
                          <ArrowRight size={13} />
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            onSelectQuestionSet(set.id);
                            setActiveTab('CURRENT_QUESTIONS');
                            setImportSuccessMsg(`Đã kích hoạt bộ câu hỏi: "${set.name}" (${set.questions.length} câu)!`);
                          }}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                        >
                          <Play size={13} />
                          <span>Kích Hoạt Chơi</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: PUSH & IMPORT QUESTIONS */}
        {activeTab === 'PUSH_IMPORT' && (
          <div className="flex flex-col flex-1 overflow-hidden p-5 space-y-4">
            {/* Sub-Header & Sample Download */}
            <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🚀 Đẩy Bộ Câu Hỏi Lên Hệ Thống</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Tải lên file Excel (.xlsx), CSV, JSON hoặc dán văn bản câu hỏi nhanh từ Word / Zalo.
                </p>
              </div>

              {/* Sample Download Shortcuts */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadSampleExcel(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 rounded-xl text-xs font-bold transition"
                  title="Tải file mẫu Excel chuẩn để điền câu hỏi"
                >
                  <FileSpreadsheet size={14} />
                  <span>Tải Mẫu Excel (.xlsx)</span>
                </button>
                <button
                  onClick={() => downloadSampleExcel(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
                  title="Tải file mẫu CSV"
                >
                  <FileText size={14} />
                  <span>Tải Mẫu CSV</span>
                </button>
              </div>
            </div>

            {/* Error notifications */}
            {importErrors.length > 0 && (
              <div className="bg-rose-950/80 border border-rose-500/50 rounded-xl p-3 text-xs text-rose-200 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-rose-300">
                  <AlertTriangle size={15} />
                  <span>Có lỗi khi phân tích nội dung câu hỏi:</span>
                </div>
                {importErrors.map((err, i) => (
                  <div key={i} className="pl-5">• {err}</div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 overflow-hidden">
              {/* Left Column: Input Form (5 cols) */}
              <div className="lg:col-span-6 flex flex-col space-y-4 overflow-y-auto pr-1">
                {/* Mode Selector */}
                <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setImportMethod('EXCEL')}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition ${
                      importMethod === 'EXCEL'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileSpreadsheet size={15} />
                    <span>File Excel/CSV</span>
                  </button>
                  <button
                    onClick={() => setImportMethod('TEXT')}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition ${
                      importMethod === 'TEXT'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileText size={15} />
                    <span>Dán Văn Bản</span>
                  </button>
                  <button
                    onClick={() => setImportMethod('JSON')}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition ${
                      importMethod === 'JSON'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileJson size={15} />
                    <span>File JSON</span>
                  </button>
                </div>

                {/* Method 1: EXCEL / CSV UPLOAD */}
                {importMethod === 'EXCEL' && (
                  <div className="bg-slate-850 border-2 border-dashed border-emerald-500/40 hover:border-emerald-500/70 rounded-2xl p-6 text-center transition flex flex-col items-center justify-center space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <FileSpreadsheet size={30} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Chọn hoặc Kéo Thả File Excel/CSV</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm">
                        Hỗ trợ định dạng <code>.xlsx</code>, <code>.xls</code>, <code>.csv</code>. Tự động nhận diện cột Câu hỏi, Phương án A-B-C-D, Đáp án đúng.
                      </p>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleExcelFileChange}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 transition flex items-center gap-2"
                    >
                      <Upload size={15} />
                      <span>Chọn File Từ Máy Tính</span>
                    </button>
                  </div>
                )}

                {/* Method 2: QUICK TEXT PASTE */}
                {importMethod === 'TEXT' && (
                  <div className="bg-slate-850 border border-slate-700 rounded-2xl p-4 space-y-3 flex-1 flex flex-col">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <span>Dán danh sách câu hỏi vào đây:</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleLoadSampleText}
                        className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                      >
                        <Sparkles size={13} />
                        <span>Xem Mẫu Văn Bản</span>
                      </button>
                    </div>

                    <textarea
                      value={rawTextContent}
                      onChange={(e) => setRawTextContent(e.target.value)}
                      rows={9}
                      className="w-full bg-slate-900 border border-slate-700 text-white p-3 rounded-xl text-xs font-mono focus:outline-none focus:border-amber-500 leading-relaxed flex-1"
                      placeholder={`Ví dụ:\nCâu 1: Thủ đô của Việt Nam là gì?\nA. Hà Nội\nB. Đà Nẵng\nC. TP. Hồ Chí Minh\nD. Hải Phòng\nĐáp án: A\nGiải thích: Hà Nội là thủ đô của Việt Nam.\n\nCâu 2: Số nguyên tố chẵn duy nhất là gì?\nĐáp án: 2`}
                    />

                    <button
                      type="button"
                      onClick={handleParseQuickText}
                      className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/30 transition flex items-center justify-center gap-2"
                    >
                      <Sparkles size={14} />
                      <span>Phân Tích Cú Pháp Câu Hỏi</span>
                    </button>
                  </div>
                )}

                {/* Method 3: JSON FILE */}
                {importMethod === 'JSON' && (
                  <div className="bg-slate-850 border-2 border-dashed border-blue-500/40 hover:border-blue-500/70 rounded-2xl p-6 text-center transition flex flex-col items-center justify-center space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                      <FileJson size={30} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Chọn File JSON Câu Hỏi</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm">
                        File định dạng JSON chứa mảng câu hỏi hoặc đối tượng QuestionSet.
                      </p>
                    </div>

                    <input
                      ref={jsonInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleJSONFileChange}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => jsonInputRef.current?.click()}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition flex items-center gap-2"
                    >
                      <Upload size={15} />
                      <span>Chọn File JSON</span>
                    </button>
                  </div>
                )}

                {/* Target Configuration Box */}
                {parsedPreviewQuestions.length > 0 && (
                  <div className="bg-slate-850 border border-slate-700 rounded-2xl p-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Cấu hình lưu bộ câu hỏi
                    </h4>

                    {/* Destination radio */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                        <input
                          type="radio"
                          name="pushDest"
                          checked={pushDestination === 'NEW_SET'}
                          onChange={() => setPushDestination('NEW_SET')}
                          className="text-amber-500"
                        />
                        <span className="font-bold">Lưu thành một Bộ Câu Hỏi mới riêng biệt (Khuyên dùng)</span>
                      </label>

                      <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                        <input
                          type="radio"
                          name="pushDest"
                          checked={pushDestination === 'APPEND'}
                          onChange={() => setPushDestination('APPEND')}
                          className="text-amber-500"
                        />
                        <span>Đẩy thêm vào Bộ câu hỏi đang mở ({questions.length} câu)</span>
                      </label>

                      <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                        <input
                          type="radio"
                          name="pushDest"
                          checked={pushDestination === 'REPLACE'}
                          onChange={() => setPushDestination('REPLACE')}
                          className="text-amber-500"
                        />
                        <span>Thay thế toàn bộ câu hỏi hiện tại</span>
                      </label>
                    </div>

                    {pushDestination === 'NEW_SET' && (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700">
                        <div>
                          <label className="text-[11px] font-bold text-slate-400 block mb-1">Tên bộ câu hỏi:</label>
                          <input
                            type="text"
                            value={pushSetName}
                            onChange={(e) => setPushSetName(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 text-white px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:border-amber-500"
                            placeholder="VD: Toán 5 - Khởi động"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-400 block mb-1">Môn học / Chủ đề:</label>
                          <input
                            type="text"
                            value={pushSetSubject}
                            onChange={(e) => setPushSetSubject(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 text-white px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:border-amber-500"
                            placeholder="VD: Toán Học, Tiếng Anh..."
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleExecutePushAndSave}
                      className="w-full py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-extrabold text-sm rounded-xl shadow-xl shadow-emerald-950/40 transition flex items-center justify-center gap-2 mt-2"
                    >
                      <CheckCircle2 size={18} />
                      <span>Xác Nhận Đẩy & Lưu {parsedPreviewQuestions.length} Câu Hỏi</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Parsed Preview (7 cols) */}
              <div className="lg:col-span-6 bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase text-slate-300">
                      Xem Trước Dữ Liệu Đã Phân Tích
                    </span>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs px-2 py-0.5 rounded-full font-bold">
                      {parsedPreviewQuestions.length} câu hợp lệ
                    </span>
                  </div>

                  {parsedPreviewQuestions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setParsedPreviewQuestions([])}
                      className="text-xs text-slate-400 hover:text-rose-400"
                    >
                      Xóa bảng xem trước
                    </button>
                  )}
                </div>

                {parsedPreviewQuestions.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                    <Sparkles size={40} className="mb-3 text-slate-600" />
                    <h5 className="font-bold text-sm text-slate-400">Chưa có dữ liệu xem trước</h5>
                    <p className="text-xs max-w-xs mt-1">
                      Hãy chọn file Excel/CSV hoặc dán văn bản câu hỏi ở cột bên trái và bấm &quot;Phân Tích Cú Pháp&quot;.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                    {parsedPreviewQuestions.map((q, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-850/80 border border-slate-700/80 rounded-xl p-3 text-xs space-y-1.5"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-black text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            #{idx + 1}
                          </span>
                          <span className="text-blue-300 font-bold">{q.subject}</span>
                          <span className="text-slate-400 text-[10px]">
                            {q.type === 'MULTIPLE_CHOICE' ? 'Trắc nghiệm' : 'Trả lời ngắn'}
                          </span>
                          <span className="text-amber-300 font-bold ml-auto">+{q.points}đ</span>
                        </div>

                        <p className="text-white font-bold text-sm">{q.question}</p>

                        {q.type === 'MULTIPLE_CHOICE' && q.options && (
                          <div className="grid grid-cols-2 gap-1 pt-1">
                            {q.options.map((opt, oIdx) => (
                              <div
                                key={oIdx}
                                className={`px-2 py-0.5 rounded border text-[11px] flex items-center gap-1 ${
                                  Number(q.correctAnswer) === oIdx
                                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500 font-bold'
                                    : 'bg-slate-900 text-slate-400 border-slate-800'
                                }`}
                              >
                                <span>{['A', 'B', 'C', 'D'][oIdx]}.</span>
                                <span className="truncate">{opt}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {q.type === 'SHORT_ANSWER' && (
                          <div className="text-emerald-300 text-[11px]">
                            Đáp án: <strong>{String(q.correctAnswer)}</strong>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/90 shrink-0">
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Khôi phục lại danh sách câu hỏi mẫu ban đầu? Các câu hỏi tự thêm sẽ bị ghi đè.')) {
                  onUpdateQuestions(DEFAULT_QUESTIONS);
                  setImportSuccessMsg('Đã khôi phục câu hỏi mẫu thành công!');
                }
              }}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
            >
              <RotateCcw size={13} />
              <span>Khôi phục mẫu gốc</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* SAVE SET DIALOG POPUP */}
      {isSaveSetModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmSaveSet}
            className="bg-slate-900 border-2 border-emerald-500/70 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-scaleUp"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Save size={18} className="text-emerald-400" />
                <span>Lưu Thành Bộ Câu Hỏi Mới</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsSaveSetModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-300 block mb-1">Tên bộ câu hỏi:</label>
                <input
                  type="text"
                  value={newSetName}
                  onChange={(e) => setNewSetName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-emerald-500 font-bold"
                  placeholder="VD: Bộ Ôn Tập Giữa Kỳ 1..."
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Chủ đề / Môn học:</label>
                <input
                  type="text"
                  value={newSetSubject}
                  onChange={(e) => setNewSetSubject(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="VD: Toán Học, Tiếng Anh, Đố Vui..."
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Mô tả tóm tắt (tùy chọn):</label>
                <textarea
                  value={newSetDescription}
                  onChange={(e) => setNewSetDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                  placeholder="Mô tả về đối tượng, độ khó, hoặc phạm vi bài học..."
                />
              </div>

              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 text-slate-400">
                Bộ này sẽ lưu trữ trọn vẹn <strong>{questions.length} câu hỏi</strong> hiện tại và xuất hiện trong Thư viện bộ câu hỏi để thầy/cô kích hoạt bất cứ lúc nào!
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsSaveSetModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30"
              >
                Lưu Vào Thư Viện
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT SET INFO MODAL */}
      {editingSet && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onUpdateQuestionSet(editingSet);
              setEditingSet(null);
            }}
            className="bg-slate-900 border-2 border-blue-500/70 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-scaleUp"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Edit3 size={18} className="text-blue-400" />
                <span>Chỉnh Sửa Thông Tin Bộ Câu Hỏi</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingSet(null)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-300 block mb-1">Tên bộ câu hỏi:</label>
                <input
                  type="text"
                  value={editingSet.name}
                  onChange={(e) => setEditingSet({ ...editingSet, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-blue-500 font-bold"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Môn học / Chủ đề:</label>
                <input
                  type="text"
                  value={editingSet.subject || ''}
                  onChange={(e) => setEditingSet({ ...editingSet, subject: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Mô tả:</label>
                <textarea
                  value={editingSet.description || ''}
                  onChange={(e) => setEditingSet({ ...editingSet, description: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingSet(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30"
              >
                Cập Nhật
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
