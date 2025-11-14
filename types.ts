export enum AppState {
  AWAITING_UPLOAD,
  PROCESSING_FILE,
  CLASSIFYING_DOCUMENT,
  GENERATING_QUESTIONS,
  AWAITING_QUESTION_SELECTION,
  AWAITING_ANSWER,
  EVALUATING,
  SHOWING_FEEDBACK,
}

export enum DocumentType {
  STUDY_MATERIAL = 'STUDY_MATERIAL',
  QUESTION_PAPER = 'QUESTION_PAPER',
}

export interface GroundingSource {
    title: string;
    uri: string;
}

export interface Feedback {
  confidence: number;
  assessment: string;
  comparison: string;
  suggestion1: string;
  suggestion2: string;
  sources?: GroundingSource[];
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