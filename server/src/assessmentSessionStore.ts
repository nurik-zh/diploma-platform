import { randomUUID } from 'crypto';

export type AssessmentQuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
};

export type AssessmentWrittenQuestion = {
  id: string;
  text: string;
  placeholder?: string;
  hint?: string;
  keywords?: string[];
};

export type AssessmentSessionPayload = {
  userId: number;
  roadmapId: string;
  quizQuestions: AssessmentQuizQuestion[];
  writtenQuestions: AssessmentWrittenQuestion[];
  createdAt: number;
};

const TTL_MS = 60 * 60 * 1000;
const store = new Map<string, AssessmentSessionPayload>();

function purgeExpired() {
  const now = Date.now();
  for (const [id, row] of store) {
    if (now - row.createdAt > TTL_MS) store.delete(id);
  }
}

export function createAssessmentSession(row: Omit<AssessmentSessionPayload, 'createdAt'>): string {
  purgeExpired();
  const id = randomUUID();
  store.set(id, { ...row, createdAt: Date.now() });
  return id;
}

/** Возвращает сессию и удаляет её (одноразовая отправка ответов). */
export function takeAssessmentSession(
  sessionId: string,
  userId: number,
  roadmapId: string
): AssessmentSessionPayload | null {
  purgeExpired();
  const row = store.get(sessionId);
  if (!row) return null;
  if (row.userId !== userId || row.roadmapId !== roadmapId) return null;
  if (Date.now() - row.createdAt > TTL_MS) {
    store.delete(sessionId);
    return null;
  }
  store.delete(sessionId);
  return row;
}
