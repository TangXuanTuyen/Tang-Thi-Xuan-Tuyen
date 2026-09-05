import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  writeBatch,
  getDocFromServer
} from 'firebase/firestore';

import firebaseConfig from '../../firebase-applet-config.json';
import { Question, QuestionSet, QuestionSetVisibility, TeacherUser } from '../types';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Error Handling Infrastructure per Firebase Skill Specs
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test initial connection
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client appears offline or connecting...');
    }
    return false;
  }
}

// Helper: Generate clean 6-character alphanumeric share code (e.g. ABC123)
export function generateShareCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ================= AUTHENTICATION SERVICES ================= //

export async function registerTeacher(email: string, password: string, name: string, school = ''): Promise<TeacherUser> {
  const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const user = userCredential.user;

  if (name.trim()) {
    await updateProfile(user, { displayName: name.trim() });
  }

  const teacherProfile: TeacherUser = {
    uid: user.uid,
    email: user.email || email.trim(),
    name: name.trim() || user.email?.split('@')[0] || 'Giáo viên',
    school: school.trim() || 'Trường học',
    createdAt: new Date().toISOString(),
  };

  const path = `users/${user.uid}`;
  try {
    await setDoc(doc(db, 'users', user.uid), {
      email: teacherProfile.email,
      name: teacherProfile.name,
      school: teacherProfile.school,
      createdAt: teacherProfile.createdAt,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }

  return teacherProfile;
}

export async function loginTeacher(email: string, password: string): Promise<TeacherUser> {
  const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
  const user = userCredential.user;
  return await getOrSyncTeacherProfile(user);
}

export async function loginWithGoogleTeacher(): Promise<TeacherUser> {
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  const user = userCredential.user;
  return await getOrSyncTeacherProfile(user);
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function logoutTeacher(): Promise<void> {
  await signOut(auth);
}

export async function getOrSyncTeacherProfile(user: FirebaseUser): Promise<TeacherUser> {
  const path = `users/${user.uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (snap.exists()) {
      const data = snap.data();
      return {
        uid: user.uid,
        email: data.email || user.email || '',
        name: data.name || user.displayName || user.email?.split('@')[0] || 'Giáo viên',
        school: data.school || '',
        createdAt: data.createdAt || new Date().toISOString(),
      };
    } else {
      const newProfile: TeacherUser = {
        uid: user.uid,
        email: user.email || '',
        name: user.displayName || user.email?.split('@')[0] || 'Giáo viên',
        school: '',
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', user.uid), {
        email: newProfile.email,
        name: newProfile.name,
        school: newProfile.school,
        createdAt: newProfile.createdAt,
      });
      return newProfile;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export function subscribeToAuth(callback: (user: TeacherUser | null) => void) {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        const profile = await getOrSyncTeacherProfile(firebaseUser);
        callback(profile);
      } catch (e) {
        console.error('Error fetching teacher profile on auth change:', e);
        callback({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || 'Giáo viên',
        });
      }
    } else {
      callback(null);
    }
  });
}

// ================= FIRESTORE QUESTION BANK SERVICES ================= //

/**
 * Fetch all question sets owned by the logged-in teacher
 */
export async function getMyQuestionSets(ownerId: string): Promise<QuestionSet[]> {
  const path = 'questionSets';
  try {
    const q = query(
      collection(db, 'questionSets'),
      where('ownerId', '==', ownerId)
    );
    const snap = await getDocs(q);
    const sets: QuestionSet[] = [];
    snap.forEach((d) => {
      const data = d.data();
      sets.push({
        id: d.id,
        name: data.title || data.name || 'Bộ câu hỏi',
        title: data.title || data.name || 'Bộ câu hỏi',
        description: data.description || '',
        subject: data.subject || 'Tổng Hợp',
        grade: data.grade || 'Tất cả khối',
        questionCount: data.questionCount || 0,
        visibility: data.visibility || 'private',
        shareCode: data.shareCode || '',
        ownerId: data.ownerId,
        ownerName: data.ownerName || 'Giáo viên',
        createdAt: data.createdAt || '',
        updatedAt: data.updatedAt || '',
        questions: [], // lazy loaded on selection
      });
    });
    // Sort descending by updatedAt / createdAt
    sets.sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''));
    return sets;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

/**
 * Fetch public question sets in the community library
 */
export async function getPublicQuestionSets(searchKeyword = '', subject = '', grade = ''): Promise<QuestionSet[]> {
  const path = 'questionSets';
  try {
    const q = query(
      collection(db, 'questionSets'),
      where('visibility', '==', 'public')
    );
    const snap = await getDocs(q);
    let sets: QuestionSet[] = [];
    snap.forEach((d) => {
      const data = d.data();
      sets.push({
        id: d.id,
        name: data.title || data.name || 'Bộ câu hỏi',
        title: data.title || data.name || 'Bộ câu hỏi',
        description: data.description || '',
        subject: data.subject || 'Tổng Hợp',
        grade: data.grade || 'Tất cả khối',
        questionCount: data.questionCount || 0,
        visibility: 'public',
        shareCode: data.shareCode || '',
        ownerId: data.ownerId,
        ownerName: data.ownerName || 'Giáo viên',
        createdAt: data.createdAt || '',
        updatedAt: data.updatedAt || '',
        questions: [],
      });
    });

    // Client-side filtering for keyword, subject, grade
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase().trim();
      sets = sets.filter((s) => 
        s.name.toLowerCase().includes(kw) || 
        (s.description && s.description.toLowerCase().includes(kw)) ||
        (s.ownerName && s.ownerName.toLowerCase().includes(kw))
      );
    }
    if (subject && subject !== 'Tất cả') {
      sets = sets.filter((s) => s.subject === subject);
    }
    if (grade && grade !== 'Tất cả') {
      sets = sets.filter((s) => s.grade === grade);
    }

    sets.sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''));
    return sets;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

/**
 * Fetch all questions belonging to a specific QuestionSet
 */
export async function getQuestionsForSet(setId: string): Promise<Question[]> {
  const path = 'questions';
  try {
    const q = query(
      collection(db, 'questions'),
      where('questionSetId', '==', setId)
    );
    const snap = await getDocs(q);
    const list: Question[] = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      list.push({
        id: docSnap.id,
        questionSetId: setId,
        ownerId: d.ownerId,
        order: d.order ?? 0,
        subject: d.subject || 'Tổng Hợp',
        type: d.type || 'MULTIPLE_CHOICE',
        question: d.question || '',
        options: Array.isArray(d.options) ? d.options : ['', '', '', ''],
        correctAnswer: d.correctAnswer ?? 0,
        explanation: d.explanation || '',
        imageUrl: d.imageUrl || '',
        points: d.points ?? 20,
      });
    });
    list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return list;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

/**
 * Fetch a question set by its 6-character shareCode (Used for student game links)
 */
export async function getQuestionSetByShareCode(shareCode: string): Promise<{ set: QuestionSet; questions: Question[] } | null> {
  const path = 'questionSets';
  try {
    const cleanedCode = shareCode.toUpperCase().trim();
    const q = query(
      collection(db, 'questionSets'),
      where('shareCode', '==', cleanedCode)
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      return null;
    }
    const docSnap = snap.docs[0];
    const data = docSnap.data();
    const set: QuestionSet = {
      id: docSnap.id,
      name: data.title || data.name || 'Bộ câu hỏi',
      title: data.title || data.name || 'Bộ câu hỏi',
      description: data.description || '',
      subject: data.subject || 'Tổng Hợp',
      grade: data.grade || '',
      questionCount: data.questionCount || 0,
      visibility: data.visibility || 'shared',
      shareCode: data.shareCode || cleanedCode,
      ownerId: data.ownerId,
      ownerName: data.ownerName || 'Giáo viên',
      createdAt: data.createdAt || '',
      updatedAt: data.updatedAt || '',
      questions: [],
    };

    const questions = await getQuestionsForSet(set.id);
    set.questions = questions;
    return { set, questions };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

/**
 * Fetch a question set and its questions by ID
 */
export async function getQuestionSetById(setId: string): Promise<{ set: QuestionSet; questions: Question[] } | null> {
  const path = `questionSets/${setId}`;
  try {
    const snap = await getDoc(doc(db, 'questionSets', setId));
    if (!snap.exists()) return null;
    const data = snap.data();
    const set: QuestionSet = {
      id: snap.id,
      name: data.title || data.name || 'Bộ câu hỏi',
      title: data.title || data.name || 'Bộ câu hỏi',
      description: data.description || '',
      subject: data.subject || 'Tổng Hợp',
      grade: data.grade || '',
      questionCount: data.questionCount || 0,
      visibility: data.visibility || 'private',
      shareCode: data.shareCode || '',
      ownerId: data.ownerId,
      ownerName: data.ownerName || 'Giáo viên',
      createdAt: data.createdAt || '',
      updatedAt: data.updatedAt || '',
      questions: [],
    };
    const questions = await getQuestionsForSet(setId);
    set.questions = questions;
    return { set, questions };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

/**
 * Save / Create a new QuestionSet and all its Questions in a batch transaction
 */
export async function createQuestionSetInDb(
  teacher: TeacherUser,
  meta: {
    title: string;
    description?: string;
    subject?: string;
    grade?: string;
    visibility?: QuestionSetVisibility;
  },
  questions: Question[]
): Promise<string> {
  const setId = `qs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const setRef = doc(db, 'questionSets', setId);
  const now = new Date().toISOString();
  const shareCode = generateShareCode();

  const batch = writeBatch(db);

  // 1. Set document
  batch.set(setRef, {
    ownerId: teacher.uid,
    ownerName: teacher.name,
    title: meta.title.trim() || 'Bộ câu hỏi mới',
    description: (meta.description || '').trim(),
    subject: (meta.subject || 'Tổng Hợp').trim(),
    grade: (meta.grade || 'Tất cả khối').trim(),
    questionCount: questions.length,
    visibility: meta.visibility || 'private',
    shareCode: shareCode,
    createdAt: now,
    updatedAt: now,
  });

  // 2. Individual Question documents
  questions.forEach((q, idx) => {
    const qId = `q_${setId}_${idx + 1}`;
    const qRef = doc(db, 'questions', qId);

    // Normalize options
    const rawOptions = q.options && q.options.length > 0
      ? q.options.slice(0, 4).map((o) => String(o || ''))
      : ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'];
    while (rawOptions.length < 4) {
      rawOptions.push(`Phương án ${['A', 'B', 'C', 'D'][rawOptions.length]}`);
    }

    batch.set(qRef, {
      questionSetId: setId,
      ownerId: teacher.uid,
      order: idx + 1,
      type: q.type || 'MULTIPLE_CHOICE',
      question: (q.question || `Câu hỏi ${idx + 1}`).trim(),
      options: rawOptions,
      correctAnswer: String(q.correctAnswer ?? 0),
      explanation: (q.explanation || '').trim(),
      imageUrl: (q.imageUrl || '').trim(),
      points: Number(q.points) || 20,
      subject: (q.subject || meta.subject || 'Tổng Hợp').trim(),
    });
  });

  try {
    await batch.commit();
    return setId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `questionSets/${setId}`);
  }
}

/**
 * Update an existing QuestionSet and re-sync its questions
 */
export async function updateQuestionSetInDb(
  teacherUid: string,
  setId: string,
  meta: {
    title: string;
    description?: string;
    subject?: string;
    grade?: string;
    visibility?: QuestionSetVisibility;
    shareCode?: string;
  },
  questions: Question[]
): Promise<void> {
  const setRef = doc(db, 'questionSets', setId);
  const now = new Date().toISOString();

  // First fetch existing questions to delete removed ones
  const existingQuestions = await getQuestionsForSet(setId);

  const batch = writeBatch(db);

  // Update question set meta
  batch.update(setRef, {
    title: meta.title.trim(),
    description: (meta.description || '').trim(),
    subject: (meta.subject || 'Tổng Hợp').trim(),
    grade: (meta.grade || 'Tất cả khối').trim(),
    questionCount: questions.length,
    visibility: meta.visibility || 'private',
    shareCode: meta.shareCode || generateShareCode(),
    updatedAt: now,
  });

  // Delete all previously stored questions for clean sync
  existingQuestions.forEach((eq) => {
    batch.delete(doc(db, 'questions', eq.id));
  });

  // Add updated questions
  questions.forEach((q, idx) => {
    const qId = `q_${setId}_${Date.now()}_${idx + 1}`;
    const qRef = doc(db, 'questions', qId);

    const rawOptions = q.options && q.options.length > 0
      ? q.options.slice(0, 4).map((o) => String(o || ''))
      : ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'];
    while (rawOptions.length < 4) {
      rawOptions.push(`Phương án ${['A', 'B', 'C', 'D'][rawOptions.length]}`);
    }

    batch.set(qRef, {
      questionSetId: setId,
      ownerId: teacherUid,
      order: idx + 1,
      type: q.type || 'MULTIPLE_CHOICE',
      question: (q.question || `Câu hỏi ${idx + 1}`).trim(),
      options: rawOptions,
      correctAnswer: String(q.correctAnswer ?? 0),
      explanation: (q.explanation || '').trim(),
      imageUrl: (q.imageUrl || '').trim(),
      points: Number(q.points) || 20,
      subject: (q.subject || meta.subject || 'Tổng Hợp').trim(),
    });
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `questionSets/${setId}`);
  }
}

/**
 * Delete a QuestionSet and all its associated Questions
 */
export async function deleteQuestionSetFromDb(setId: string): Promise<void> {
  const existingQuestions = await getQuestionsForSet(setId);
  const batch = writeBatch(db);

  batch.delete(doc(db, 'questionSets', setId));
  existingQuestions.forEach((eq) => {
    batch.delete(doc(db, 'questions', eq.id));
  });

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `questionSets/${setId}`);
  }
}

/**
 * Copy a question set (e.g. from public library or another teacher) to current teacher's account
 */
export async function copyQuestionSetToMyAccount(
  sourceSetId: string,
  currentTeacher: TeacherUser
): Promise<string> {
  const source = await getQuestionSetById(sourceSetId);
  if (!source) {
    throw new Error('Không tìm thấy bộ câu hỏi nguồn để sao chép.');
  }

  const newTitle = `${source.set.name} (Bản sao)`;
  const newSetId = await createQuestionSetInDb(
    currentTeacher,
    {
      title: newTitle,
      description: source.set.description || '',
      subject: source.set.subject || 'Tổng Hợp',
      grade: source.set.grade || 'Tất cả khối',
      visibility: 'private', // Default copy to private for teacher
    },
    source.questions
  );

  return newSetId;
}
