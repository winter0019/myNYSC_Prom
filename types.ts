export enum AppState {
  AWAITING_UPLOAD,
  PROCESSING_FILE,
  GENERATING_QUESTIONS,
  AWAITING_QUESTION_SELECTION,
  AWAITING_ANSWER,
  EVALUATING,
  SHOWING_FEEDBACK,
}

export interface Feedback {
  confidence: number;
  assessment: string;
  comparison: string;
  suggestion1: string;
  suggestion2: string;
}

export interface Question {
  text: string;
  feedback?: Feedback;
}

export interface HistoryEntry {
  question: string;
  answer: string;
  feedback: Feedback;
}