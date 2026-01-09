import { GoogleGenAI, Type } from "@google/genai";
import type { Feedback, GroundingSource } from '../types';
import { DocumentType } from '../types';

// Fix: Adhere to API key guidelines by using process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Helper function for exponential backoff retries.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorMsg = error?.message?.toLowerCase() || "";
    const isRetryable = errorMsg.includes("429") || errorMsg.includes("resource_exhausted") || errorMsg.includes("too many requests");
    
    if (retries > 0 && isRetryable) {
      console.warn(`Rate limit hit, retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

/**
 * Converts a File object to a GoogleGenAI.Part object for multi-modal prompting.
 */
function fileToGenerativePart(file: File): Promise<{ inlineData: { data: string, mimeType: string } }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64Data = dataUrl.split(',')[1];
      if (!base64Data) {
        reject(new Error("Could not extract base64 data from file."));
        return;
      }
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = (err) => reject(err);
  });
}

/**
 * Converts a text-based File object to a string.
 */
function fileToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
  });
}

/**
 * Extracts text content from a given File object.
 */
export async function getTextFromFile(file: File): Promise<string> {
  const { type, name } = file;

  if (type.startsWith('text/') || name.endsWith('.md')) {
    return fileToText(file);
  }

  if (type.startsWith('image/') || type === 'application/pdf') {
    return withRetry(async () => {
      try {
        const filePart = await fileToGenerativePart(file);
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: {
            parts: [
              { text: "Analyze the provided document. Identify and extract only the main body of the text. Return only the core content. If there's no main body, return an empty string." },
              filePart
            ]
          },
        });
        const extractedText = response.text?.trim();
        if (!extractedText) {
          throw new Error("Could not extract any text from the document.");
        }
        return extractedText;
      } catch (error: any) {
        console.error("Error processing file with Gemini:", error);
        if (error.message?.includes("API_KEY_INVALID") || error.message?.includes("PERMISSION_DENIED")) {
            throw new Error(`API_KEY_INVALID: ${error.message}`);
        }
        throw error;
      }
    });
  }

  throw new Error(`Unsupported file type: ${type}. Please upload a text, image, or PDF file.`);
}

export async function classifyDocument(documentText: string): Promise<DocumentType> {
  return withRetry(async () => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze the following text and determine if it is primarily study material containing information, or if it is a question paper containing only questions. Respond with only "STUDY_MATERIAL" or "QUESTION_PAPER".\n\nTEXT:\n---\n${documentText.substring(0, 4000)}\n---`,
      });

      const result = response.text?.trim().toUpperCase();
      return result === 'QUESTION_PAPER' ? DocumentType.QUESTION_PAPER : DocumentType.STUDY_MATERIAL;
    } catch (error) {
      console.error("Error classifying document:", error);
      return DocumentType.STUDY_MATERIAL;
    }
  });
}

export async function extractQuestionsFromPaper(documentText: string): Promise<string[]> {
  if (!documentText || documentText.trim().length === 0) {
    throw new Error("The document appears to be empty.");
  }
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Extract up to seven distinct exam questions from the text below.\n\nTEXT:\n---\n${documentText.substring(0, 8000)}\n---`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["questions"]
        }
      }
    });

    const parsed = JSON.parse(response.text || '{"questions":[]}');
    return parsed.questions || [];
  });
}

export async function generateEssayQuestions(documentText: string, gradeLevel: string): Promise<string[]> {
  if (!documentText || documentText.trim().length === 0) {
    throw new Error("The document appears to be empty.");
  }
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Based on the document provided, generate seven distinct exam-style essay questions for grade level ${gradeLevel}. Questions should be direct and formal.\n\nCONTEXT:\n---\n${documentText.substring(0, 8000)}\n---`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["questions"]
        }
      }
    });

    const parsed = JSON.parse(response.text || '{"questions":[]}');
    return parsed.questions || [];
  });
}

async function evaluateWithSource(documentText: string, question: string, userAnswer: string): Promise<Feedback> {
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are an expert evaluator. Compare the user's answer to the source text and the question.
        
        **Source Text:** ${documentText.substring(0, 8000)}
        **Question:** ${question}
        **User's Answer:** ${userAnswer}
        
        Provide:
        1. "confidence": Score 0-100 based on accuracy against the source.
        2. "assessment": One-sentence summary.
        3. "comparison": Detailed comparison between the user's answer and the facts in the source.
        4. "suggestion1": Best concise answer.
        5. "suggestion2": Alternative way to express the correct answer.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            confidence: { type: Type.NUMBER },
            assessment: { type: Type.STRING },
            comparison: { type: Type.STRING },
            suggestion1: { type: Type.STRING },
            suggestion2: { type: Type.STRING }
          },
          required: ["confidence", "assessment", "comparison", "suggestion1", "suggestion2"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  });
}

async function evaluateWithGrounding(question: string, userAnswer: string): Promise<Feedback> {
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Evaluate this answer against general academic standards and verified facts using web search.\n\n**Question:** ${question}\n**Answer:** ${userAnswer}`,
      config: {
        tools: [{googleSearch: {}}],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            confidence: { type: Type.NUMBER },
            assessment: { type: Type.STRING },
            comparison: { type: Type.STRING },
            suggestion1: { type: Type.STRING },
            suggestion2: { type: Type.STRING }
          },
          required: ["confidence", "assessment", "comparison", "suggestion1", "suggestion2"]
        }
      }
    });

    const parsedFeedback = JSON.parse(response.text || '{}');
    const sources: GroundingSource[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map((chunk: any) => ({
        uri: chunk.web?.uri || '',
        title: chunk.web?.title || 'Untitled Source',
      }))
      .filter((source: GroundingSource) => source.uri) || [];
      
    const uniqueSources = Array.from(new Map(sources.map(item => [item.uri, item])).values());
    return { ...parsedFeedback, sources: uniqueSources };
  });
}

export async function evaluateAnswer(
    documentText: string,
    question: string,
    userAnswer: string,
    docType: DocumentType
): Promise<Feedback> {
    if (docType === DocumentType.STUDY_MATERIAL) {
        return evaluateWithSource(documentText, question, userAnswer);
    } else {
        return evaluateWithGrounding(question, userAnswer);
    }
}