import * as XLSX from 'xlsx';
import { Question, QuestionSet, QuestionType } from '../types';

export interface ParseResult {
  success: boolean;
  questions: Question[];
  errors: string[];
  warnings: string[];
}

/**
 * Normalizes text to assist in finding matching column headers
 */
function normalizeHeader(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Parse raw text pasted by teachers (supports format like "Câu 1: ... A. ... B. ... Đáp án: A" or "|" delimited)
 */
export function parseQuickText(text: string, defaultSubject = 'Chung'): ParseResult {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const questions: Question[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  if (lines.length === 0) {
    return { success: false, questions: [], errors: ['Nội dung dán vào trống.'], warnings: [] };
  }

  // Check if text is pipe-separated (|) or tab-separated
  const isDelimited = lines.some((l) => l.includes('|') || l.includes('\t'));

  if (isDelimited) {
    lines.forEach((line, index) => {
      // Ignore header row if detected
      const lowerLine = normalizeHeader(line);
      if (index === 0 && (lowerLine.includes('cau hoi') || lowerLine.includes('question'))) {
        return;
      }

      const delimiter = line.includes('|') ? '|' : '\t';
      const parts = line.split(delimiter).map((p) => p.trim());

      if (parts.length >= 6) {
        // Form: [Subject?] | Question | Option A | Option B | Option C | Option D | Answer | [Explanation?] | [Points?]
        let subj = defaultSubject;
        let qText = '';
        let optA = '';
        let optB = '';
        let optC = '';
        let optD = '';
        let ansRaw = '';
        let expl = '';
        let pts = 20;

        if (parts.length >= 7 && (parts[0].length < 25 && !parts[0].includes('?'))) {
          // First part is Subject
          subj = parts[0] || defaultSubject;
          qText = parts[1];
          optA = parts[2];
          optB = parts[3];
          optC = parts[4];
          optD = parts[5];
          ansRaw = parts[6];
          expl = parts[7] || '';
          pts = parseInt(parts[8] || '20', 10) || 20;
        } else {
          qText = parts[0];
          optA = parts[1];
          optB = parts[2];
          optC = parts[3];
          optD = parts[4];
          ansRaw = parts[5];
          expl = parts[6] || '';
          pts = parseInt(parts[7] || '20', 10) || 20;
        }

        const normalizedAns = ansRaw.toUpperCase().trim();
        let correctIndex = 0;
        if (normalizedAns === 'A' || normalizedAns === '1' || normalizedAns === optA.toUpperCase()) correctIndex = 0;
        else if (normalizedAns === 'B' || normalizedAns === '2' || normalizedAns === optB.toUpperCase()) correctIndex = 1;
        else if (normalizedAns === 'C' || normalizedAns === '3' || normalizedAns === optC.toUpperCase()) correctIndex = 2;
        else if (normalizedAns === 'D' || normalizedAns === '4' || normalizedAns === optD.toUpperCase()) correctIndex = 3;
        else {
          const parsedNum = parseInt(normalizedAns, 10);
          if (!isNaN(parsedNum) && parsedNum >= 0 && parsedNum <= 3) {
            correctIndex = parsedNum;
          }
        }

        if (qText) {
          questions.push({
            id: `q-quick-${Date.now()}-${questions.length + 1}`,
            subject: subj,
            type: 'MULTIPLE_CHOICE',
            question: qText,
            options: [optA || 'Phương án A', optB || 'Phương án B', optC || 'Phương án C', optD || 'Phương án D'],
            correctAnswer: correctIndex,
            explanation: expl,
            points: pts,
          });
        }
      } else if (parts.length >= 2) {
        // Short answer question: Question | Answer | [Subject]
        questions.push({
          id: `q-quick-${Date.now()}-${questions.length + 1}`,
          subject: parts[2] || defaultSubject,
          type: 'SHORT_ANSWER',
          question: parts[0],
          correctAnswer: parts[1],
          explanation: parts[3] || '',
          points: 20,
        });
      }
    });

    if (questions.length > 0) {
      return { success: true, questions, errors, warnings };
    }
  }

  // Natural text format parser (Câu 1: ... A. ... B. ... Đáp án: ...)
  let curSubject = defaultSubject;
  let curQuestionText = '';
  let curOptions: string[] = [];
  let curAnswer: string | number = 0;
  let curExplanation = '';
  let curPoints = 20;
  let curType: QuestionType = 'MULTIPLE_CHOICE';

  const finalizeCurrentQuestion = () => {
    if (!curQuestionText.trim()) return;

    if (curType === 'MULTIPLE_CHOICE') {
      // Ensure 4 options
      while (curOptions.length < 4) {
        curOptions.push(`Phương án ${['A', 'B', 'C', 'D'][curOptions.length]}`);
      }

      questions.push({
        id: `q-paste-${Date.now()}-${questions.length + 1}`,
        subject: curSubject,
        type: 'MULTIPLE_CHOICE',
        question: curQuestionText.trim(),
        options: curOptions.slice(0, 4),
        correctAnswer: typeof curAnswer === 'number' ? curAnswer : 0,
        explanation: curExplanation.trim(),
        points: curPoints,
      });
    } else {
      questions.push({
        id: `q-paste-${Date.now()}-${questions.length + 1}`,
        subject: curSubject,
        type: 'SHORT_ANSWER',
        question: curQuestionText.trim(),
        correctAnswer: String(curAnswer || 'Chính xác').trim(),
        explanation: curExplanation.trim(),
        points: curPoints,
      });
    }

    // Reset for next
    curQuestionText = '';
    curOptions = [];
    curAnswer = 0;
    curExplanation = '';
    curPoints = 20;
    curType = 'MULTIPLE_CHOICE';
  };

  const questionHeaderRegex = /^(?:câu|bài|question|q)\s*\d+[\s:.-]+(.*)$/i;
  const optARegex = /^[aA][.)\-:]\s*(.*)$/;
  const optBRegex = /^[bB][.)\-:]\s*(.*)$/;
  const optCRegex = /^[cC][.)\-:]\s*(.*)$/;
  const optDRegex = /^[dD][.)\-:]\s*(.*)$/;
  const answerRegex = /^(?:đáp án|dap an|answer|key|chọn)[\s:.-]+(.*)$/i;
  const explanationRegex = /^(?:giải thích|giai thich|explanation|lý do)[\s:.-]+(.*)$/i;
  const subjectRegex = /^(?:môn|mon|chủ đề|chu de|subject)[\s:.-]+(.*)$/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for Subject header
    const subjMatch = line.match(subjectRegex);
    if (subjMatch) {
      curSubject = subjMatch[1].trim() || defaultSubject;
      continue;
    }

    // Check if line starts a new question
    const qMatch = line.match(questionHeaderRegex);
    if (qMatch) {
      finalizeCurrentQuestion();
      curQuestionText = qMatch[1].trim() || line;
      continue;
    }

    // Check Option A
    const matchA = line.match(optARegex);
    if (matchA) {
      curType = 'MULTIPLE_CHOICE';
      curOptions[0] = matchA[1].trim();
      continue;
    }

    // Check Option B
    const matchB = line.match(optBRegex);
    if (matchB) {
      curOptions[1] = matchB[1].trim();
      continue;
    }

    // Check Option C
    const matchC = line.match(optCRegex);
    if (matchC) {
      curOptions[2] = matchC[1].trim();
      continue;
    }

    // Check Option D
    const matchD = line.match(optDRegex);
    if (matchD) {
      curOptions[3] = matchD[1].trim();
      continue;
    }

    // Check Answer
    const ansMatch = line.match(answerRegex);
    if (ansMatch) {
      const rawAns = ansMatch[1].trim().toUpperCase();
      if (rawAns.startsWith('A') || rawAns === '1') curAnswer = 0;
      else if (rawAns.startsWith('B') || rawAns === '2') curAnswer = 1;
      else if (rawAns.startsWith('C') || rawAns === '3') curAnswer = 2;
      else if (rawAns.startsWith('D') || rawAns === '4') curAnswer = 3;
      else {
        // Could be short answer or text
        if (curOptions.length === 0) {
          curType = 'SHORT_ANSWER';
          curAnswer = ansMatch[1].trim();
        } else {
          curAnswer = 0;
        }
      }
      continue;
    }

    // Check Explanation
    const explMatch = line.match(explanationRegex);
    if (explMatch) {
      curExplanation = explMatch[1].trim();
      continue;
    }

    // If we have question text but no options yet, and line doesn't match options, append to question
    if (curQuestionText && curOptions.length === 0) {
      curQuestionText += ' ' + line;
    } else if (!curQuestionText) {
      // First question without "Câu X:" prefix
      curQuestionText = line;
    }
  }

  finalizeCurrentQuestion();

  if (questions.length === 0) {
    errors.push('Không nhận diện được câu hỏi nào từ văn bản. Vui lòng kiểm tra định dạng mẫu.');
  }

  return {
    success: questions.length > 0,
    questions,
    errors,
    warnings,
  };
}

/**
 * Parse Excel (.xlsx, .xls) or CSV file ArrayBuffer/String using sheetJS
 */
export function parseExcelOrCSV(data: ArrayBuffer | string, defaultSubject = 'Tổng Hợp'): ParseResult {
  try {
    const workbook = XLSX.read(data, { type: typeof data === 'string' ? 'string' : 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { success: false, questions: [], errors: ['File Excel/CSV không có trang tính nào.'], warnings: [] };
    }

    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });

    if (!rows || rows.length === 0) {
      return { success: false, questions: [], errors: ['Trang tính rỗng, không tìm thấy dữ liệu.'], warnings: [] };
    }

    const questions: Question[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Map column headers intelligently
    rows.forEach((row, rowIndex) => {
      let questionText = '';
      let optA = '';
      let optB = '';
      let optC = '';
      let optD = '';
      let answerRaw = '';
      let subject = defaultSubject;
      let explanation = '';
      let points = 20;
      let type: QuestionType = 'MULTIPLE_CHOICE';

      for (const key of Object.keys(row)) {
        const val = String(row[key] ?? '').trim();
        if (!val) continue;

        const normKey = normalizeHeader(key);

        if (
          normKey.includes('cau hoi') ||
          normKey.includes('question') ||
          normKey.includes('de bai') ||
          normKey.includes('noi dung') ||
          normKey === 'content'
        ) {
          questionText = val;
        } else if (
          normKey === 'a' ||
          normKey === 'dap an a' ||
          normKey === 'phuong an a' ||
          normKey === 'option a' ||
          normKey === 'pa a'
        ) {
          optA = val;
        } else if (
          normKey === 'b' ||
          normKey === 'dap an b' ||
          normKey === 'phuong an b' ||
          normKey === 'option b' ||
          normKey === 'pa b'
        ) {
          optB = val;
        } else if (
          normKey === 'c' ||
          normKey === 'dap an c' ||
          normKey === 'phuong an c' ||
          normKey === 'option c' ||
          normKey === 'pa c'
        ) {
          optC = val;
        } else if (
          normKey === 'd' ||
          normKey === 'dap an d' ||
          normKey === 'phuong an d' ||
          normKey === 'option d' ||
          normKey === 'pa d'
        ) {
          optD = val;
        } else if (
          normKey.includes('dap an dung') ||
          normKey.includes('correct') ||
          normKey.includes('key') ||
          normKey === 'dap an' ||
          normKey === 'answer'
        ) {
          answerRaw = val;
        } else if (normKey.includes('mon') || normKey.includes('subject') || normKey.includes('chu de')) {
          subject = val;
        } else if (normKey.includes('giai thich') || normKey.includes('explanation') || normKey.includes('ghi chu')) {
          explanation = val;
        } else if (normKey.includes('diem') || normKey.includes('point') || normKey.includes('score')) {
          points = parseInt(val, 10) || 20;
        } else if (normKey.includes('loai') || normKey.includes('type')) {
          if (val.toLowerCase().includes('ngan') || val.toLowerCase().includes('short') || val.toLowerCase().includes('tu luan')) {
            type = 'SHORT_ANSWER';
          }
        }
      }

      // If question text found
      if (questionText) {
        if (optA || optB || optC || optD) {
          type = 'MULTIPLE_CHOICE';
          const normAns = answerRaw.toUpperCase().trim();
          let correctIdx = 0;
          if (normAns === 'A' || normAns === '1' || normAns === optA.toUpperCase()) correctIdx = 0;
          else if (normAns === 'B' || normAns === '2' || normAns === optB.toUpperCase()) correctIdx = 1;
          else if (normAns === 'C' || normAns === '3' || normAns === optC.toUpperCase()) correctIdx = 2;
          else if (normAns === 'D' || normAns === '4' || normAns === optD.toUpperCase()) correctIdx = 3;
          else {
            const num = parseInt(normAns, 10);
            if (!isNaN(num) && num >= 0 && num <= 3) correctIdx = num;
          }

          questions.push({
            id: `q-excel-${Date.now()}-${rowIndex + 1}`,
            subject,
            type: 'MULTIPLE_CHOICE',
            question: questionText,
            options: [optA || 'Phương án A', optB || 'Phương án B', optC || 'Phương án C', optD || 'Phương án D'],
            correctAnswer: correctIdx,
            explanation,
            points,
          });
        } else {
          // Short answer
          questions.push({
            id: `q-excel-${Date.now()}-${rowIndex + 1}`,
            subject,
            type: 'SHORT_ANSWER',
            question: questionText,
            correctAnswer: answerRaw || 'Đúng',
            explanation,
            points,
          });
        }
      }
    });

    return {
      success: questions.length > 0,
      questions,
      errors: questions.length === 0 ? ['Không tìm thấy cột câu hỏi hợp lệ trong bảng tính.'] : [],
      warnings,
    };
  } catch (err: unknown) {
    return {
      success: false,
      questions: [],
      errors: [`Lỗi khi đọc file Excel/CSV: ${err instanceof Error ? err.message : String(err)}`],
      warnings: [],
    };
  }
}

/**
 * Download sample CSV / Excel template
 */
export function downloadSampleExcel(asExcel = true) {
  const sampleData = [
    {
      'Môn Học': 'Toán Học',
      'Câu Hỏi': 'Số chẵn lớn nhất có 2 chữ số khác nhau là số nào?',
      'Phương Án A': '99',
      'Phương Án B': '98',
      'Phương Án C': '96',
      'Phương Án D': '90',
      'Đáp Án Đúng': 'B',
      'Giải Thích': 'Số 98 là số chẵn có 2 chữ số khác nhau lớn nhất.',
      'Điểm': 20,
    },
    {
      'Môn Học': 'Tiếng Anh',
      'Câu Hỏi': 'Từ nào sau đây có nghĩa là "Mặt Trời" trong tiếng Anh?',
      'Phương Án A': 'Moon',
      'Phương Án B': 'Sun',
      'Phương Án C': 'Star',
      'Phương Án D': 'Sky',
      'Đáp Án Đúng': 'B',
      'Giải Thích': 'Sun nghĩa là Mặt trời.',
      'Điểm': 20,
    },
    {
      'Môn Học': 'Lịch Sử - Địa Lý',
      'Câu Hỏi': 'Đỉnh núi cao nhất Việt Nam có tên là gì?',
      'Phương Án A': 'Phan Xi Păng',
      'Phương Án B': 'Bà Đen',
      'Phương Án C': 'Bạch Mộc Lương Tử',
      'Phương Án D': 'Pu Si Lung',
      'Đáp Án Đúng': 'A',
      'Giải Thích': 'Phan Xi Păng cao 3.143m thuộc dãy Hoàng Liên Sơn.',
      'Điểm': 20,
    },
    {
      'Môn Học': 'Đố Vui',
      'Câu Hỏi': 'Cái gì chặt không đứt, bứt không rời, phơi không khô, đốt không cháy?',
      'Phương Án A': '',
      'Phương Án B': '',
      'Phương Án C': '',
      'Phương Án D': '',
      'Đáp Án Đúng': 'Dòng nước',
      'Giải Thích': 'Đáp án là dòng nước!',
      'Điểm': 30,
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'MauCauHoi');

  if (asExcel) {
    XLSX.writeFile(workbook, 'mau_bo_cau_hoi_freeze_and_win.xlsx');
  } else {
    XLSX.writeFile(workbook, 'mau_bo_cau_hoi_freeze_and_win.csv');
  }
}

/**
 * Export current questions to Excel or CSV
 */
export function exportQuestionsToExcel(questions: Question[], fileName = 'bo_cau_hoi') {
  const exportRows = questions.map((q, idx) => {
    let answerText = '';
    if (q.type === 'MULTIPLE_CHOICE') {
      const idxAns = Number(q.correctAnswer) || 0;
      answerText = ['A', 'B', 'C', 'D'][idxAns] || 'A';
    } else {
      answerText = String(q.correctAnswer);
    }

    return {
      'STT': idx + 1,
      'Môn Học': q.subject,
      'Loại': q.type === 'MULTIPLE_CHOICE' ? 'Trắc nghiệm' : 'Trả lời ngắn',
      'Câu Hỏi': q.question,
      'Phương Án A': q.options?.[0] || '',
      'Phương Án B': q.options?.[1] || '',
      'Phương Án C': q.options?.[2] || '',
      'Phương Án D': q.options?.[3] || '',
      'Đáp Án Đúng': answerText,
      'Giải Thích': q.explanation || '',
      'Điểm': q.points,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'CauHoi');
  XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Export full Question Set as JSON
 */
export function exportQuestionSetJSON(set: QuestionSet | Question[], name = 'bo_cau_hoi') {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(set, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `${name}_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
