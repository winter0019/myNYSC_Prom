import { GoogleGenAI, Type } from "@google/genai";
import type { Feedback, GroundingSource } from '../types';
import { DocumentType } from '../types';

// Fix: Adhere to API key guidelines by using process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Converts a File object to a GoogleGenAI.Part object for multi-modal prompting.
 * @param file The file to convert.
 * @returns A promise that resolves to a GenerativePart object.
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
 * @param file The file to read.
 * @returns A promise that resolves to the text content of the file.
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
 * Handles text files directly and uses Gemini for images, and PDFs.
 * @param file The file uploaded by the user.
 * @returns A promise that resolves to the extracted text content.
 */
export async function getTextFromFile(file: File): Promise<string> {
  const { type, name } = file;

  // Handle standard text files directly in the browser
  if (type.startsWith('text/') || name.endsWith('.md')) {
    return fileToText(file);
  }

  if (
    type.startsWith('image/') ||
    type === 'application/pdf'
  ) {
    try {
      const filePart = await fileToGenerativePart(file);
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        // Fix: Correctly structure multi-part content as a single Content object.
        contents: {
          parts: [
            { text: "Analyze the provided document. Identify and extract only the main body of the text. Exclude any prefatory content such as title pages, tables of contents, introductions, prefaces, or forewords. Return only the core content of the document. If there's no main body, return an empty string." },
            filePart
          ]
        },
      });
      const extractedText = response.text.trim();
      if (!extractedText) {
        throw new Error("Could not extract any text from the document. It might be an image-only file or a document with no selectable text.");
      }
      return extractedText;
    } catch (error) {
        console.error("Error processing file with Gemini:", error);
        if (error instanceof Error) {
            const lowerCaseMessage = error.message.toLowerCase();
            if (lowerCaseMessage.includes("api key") || lowerCaseMessage.includes("permission_denied") || lowerCaseMessage.includes("permission denied")) {
                throw new Error(`API_KEY_INVALID: ${error.message}`);
            }
            if (error.message.includes("Could not extract any text")) {
              throw error; // Re-throw our specific error
            }
        }
        throw new Error(`Failed to extract text from ${name}. The AI model may be busy or the file format is too complex. Please try again later.`);
    }
  }

  // Reject any other unsupported file types
  throw new Error(`Unsupported file type: ${type}. Please upload a text, image, or PDF file.`);
}

export async function classifyDocument(documentText: string): Promise<DocumentType> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze the following text and determine if it is primarily study material containing information and answers, or if it is a question paper/exam sheet containing only questions.

      Respond with only one of the following two words: "STUDY_MATERIAL" or "QUESTION_PAPER".

      TEXT:
      ---
      ${documentText.substring(0, 4000)}
      ---
      `,
    });

    const result = response.text.trim().toUpperCase();
    if (result === 'QUESTION_PAPER') {
      return DocumentType.QUESTION_PAPER;
    }
    return DocumentType.STUDY_MATERIAL;

  } catch (error) {
    console.error("Error classifying document:", error);
    // Default to STUDY_MATERIAL to maintain original behavior on failure
    return DocumentType.STUDY_MATERIAL;
  }
}

export async function extractQuestionsFromPaper(documentText: string): Promise<string[]> {
  if (!documentText || documentText.trim().length === 0) {
    throw new Error("The document appears to be empty. No questions could be extracted.");
  }
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Based on the provided exam paper, extract up to seven distinct questions.
      
        Return only the questions, without any numbering or introductory text. If a question has sub-parts (e.g., a, b, c), combine them into a single coherent question.

        DOCUMENT CONTEXT:
        ---
        ${documentText.substring(0, 8000)}
        ---
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              description: "An array of up to seven distinct exam questions extracted from the document.",
              items: { type: Type.STRING }
            }
          },
          required: ["questions"]
        }
      }
    });

    let jsonText = response.text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.substring(7, jsonText.length - 3).trim();
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.substring(3, jsonText.length - 3).trim();
    }

    const parsed = JSON.parse(jsonText) as { questions: string[] };
    if (!parsed.questions || parsed.questions.length === 0) {
        throw new Error("The AI failed to extract any questions from the document.");
    }
    return parsed.questions;
  } catch (error) {
    console.error("Error extracting questions:", error);
    if (error instanceof Error) {
        const lowerCaseMessage = error.message.toLowerCase();
        if (lowerCaseMessage.includes("api key") || lowerCaseMessage.includes("permission_denied") || lowerCaseMessage.includes("permission denied")) {
            throw new Error(`API_KEY_INVALID: ${error.message}`);
        }
    }
    throw new Error("Failed to extract questions from the exam paper.");
  }
}


export async function generateEssayQuestions(documentText: string, gradeLevel: string): Promise<string[]> {
  if (!documentText || documentText.trim().length === 0) {
    throw new Error("The document appears to be empty. No questions could be generated.");
  }
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Based on the provided document, generate seven distinct exam-style questions suitable for a public service promotion exam for an officer at the '${gradeLevel}' level in the style of the National Youth Service Corps (NYSC).

        The questions must be direct, require recalling specific information from the document, and adhere to the specific formats shown in the examples below. Do not mention "the document" in the questions. Use specific numbers in parentheses, like "five (5)" or "ten (10)".

        Here are examples of the required question format:
        - "As a Zonal Inspector, you observed some cases of rejection of corps members within your zone, enumerate five (5) measures you will put in place to control such situations."
        - "Mention ten (10) Collaborating agencies during orientation course."
        - "Mention five (5) rights and privileges of a corps member during the service year."
        - "Differentiate between Secondment and Transfer of Service."
        - "Outline five (5) measures put in place by Management to ensure that only eligible foreign trained graduates participate in the scheme."
        - "The Community Development Service (CDS) is one of the cardinal programmes of the NYSC. Enumerate five (5) steps to be taken by a corps member in embarking on a CDS project."

        DOCUMENT CONTEXT:
        ---
        ${documentText.substring(0, 8000)}
        ---
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              description: "An array of seven distinct, short, NYSC-style exam questions based on the document.",
              items: { type: Type.STRING }
            }
          },
          required: ["questions"]
        }
      }
    });

    let jsonText = response.text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.substring(7, jsonText.length - 3).trim();
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.substring(3, jsonText.length - 3).trim();
    }

    const parsed = JSON.parse(jsonText) as { questions: string[] };
    if (!parsed.questions || parsed.questions.length === 0) {
        throw new Error("The AI failed to generate questions from the document.");
    }
    return parsed.questions;
  } catch (error) {
    console.error("Error generating essay questions:", error);
    if (error instanceof Error) {
        const lowerCaseMessage = error.message.toLowerCase();
        if (lowerCaseMessage.includes("api key") || lowerCaseMessage.includes("permission_denied") || lowerCaseMessage.includes("permission denied")) {
            throw new Error(`API_KEY_INVALID: ${error.message}`);
        }
    }
    throw new Error("Failed to generate essay questions. The AI model may be temporarily unavailable.");
  }
}

async function evaluateWithSource(documentText: string, question: string, userAnswer: string): Promise<Feedback> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are an expert academic evaluator. Your task is to analyze a user's answer based on a provided source text and a specific question. Never reference "the source document" or "the text" in your response.
        
        **Source Text:**
        ---
        ${documentText.substring(0, 8000)}
        ---
        
        **Question:**
        ${question}
        
        **User's Answer:**
        ---
        ${userAnswer}
        ---
        
        **Your Task:**
        Provide a structured evaluation in JSON format. The JSON object must have exactly five keys:
        1. "confidence": A number between 0 and 100 representing how well the user's answer aligns with the key points in the source text.
        2. "assessment": A very brief, one-sentence summary explaining the confidence score.
        3. "comparison": A concise paragraph comparing the user's answer to the key points from the source. Highlight what they got right and what they might have missed.
        4. "suggestion1": A short and brief, exemplary answer to the question.
        5. "suggestion2": A second, distinct, short and brief exemplary answer, approaching it from a slightly different angle if possible.
        
        Ensure your output is a single, valid JSON object and nothing else.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            confidence: {
              type: Type.NUMBER,
              description: "Confidence score (0-100) of the user's answer."
            },
            assessment: {
              type: Type.STRING,
              description: "A brief textual summary of the confidence score."
            },
            comparison: {
              type: Type.STRING,
              description: "Comparison of user's answer with the source document."
            },
            suggestion1: {
              type: Type.STRING,
              description: "First short and brief suggested exemplary answer."
            },
            suggestion2: {
              type: Type.STRING,
              description: "Second short and brief suggested exemplary answer."
            }
          },
          required: ["confidence", "assessment", "comparison", "suggestion1", "suggestion2"]
        }
      }
    });

    let jsonText = response.text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.substring(7, jsonText.length - 3).trim();
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.substring(3, jsonText.length - 3).trim();
    }

    const parsedFeedback = JSON.parse(jsonText) as Feedback;
    return parsedFeedback;

  } catch (error) {
    console.error("Error evaluating answer:", error);
    if (error instanceof Error) {
        const lowerCaseMessage = error.message.toLowerCase();
        if (lowerCaseMessage.includes("api key") || lowerCaseMessage.includes("permission_denied") || lowerCaseMessage.includes("permission denied")) {
            throw new Error(`API_KEY_INVALID: ${error.message}`);
        }
    }
    throw new Error("Failed to evaluate the answer. Please try submitting again.");
  }
}

async function evaluateWithGrounding(question: string, userAnswer: string): Promise<Feedback> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `You are an expert academic evaluator. Your task is to analyze a user's answer to a specific question based on your general knowledge and information from the web.
        
        **Question:**
        ${question}
        
        **User's Answer:**
        ---
        ${userAnswer}
        ---
        
        **Your Task:**
        Provide a structured evaluation in JSON format. The JSON object must have exactly five keys:
        1. "confidence": A number between 0 and 100 representing how factually correct and complete the user's answer is.
        2. "assessment": A very brief, one-sentence summary explaining the confidence score.
        3. "comparison": A concise paragraph analyzing the factual accuracy of the user's answer. Highlight what they got right and what they might have missed or stated incorrectly.
        4. "suggestion1": A short and brief, exemplary answer to the question.
        5. "suggestion2": A second, distinct, short and brief exemplary answer, approaching it from a slightly different angle if possible.
        
        Ensure your output is a single, valid JSON object and nothing else.
      `,
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

    let jsonText = response.text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.substring(7, jsonText.length - 3).trim();
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.substring(3, jsonText.length - 3).trim();
    }

    const parsedFeedback = JSON.parse(jsonText) as Omit<Feedback, 'sources'>;

    const sources: GroundingSource[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map((chunk: any) => ({
        uri: chunk.web?.uri || '',
        title: chunk.web?.title || 'Untitled Source',
      }))
      .filter((source: GroundingSource) => source.uri) || [];
      
    const uniqueSources = Array.from(new Map(sources.map(item => [item.uri, item])).values());

    return { ...parsedFeedback, sources: uniqueSources };

  } catch (error) {
    console.error("Error evaluating answer with grounding:", error);
    if (error instanceof Error) {
        const lowerCaseMessage = error.message.toLowerCase();
        if (lowerCaseMessage.includes("api key") || lowerCaseMessage.includes("permission_denied") || lowerCaseMessage.includes("permission denied")) {
            throw new Error(`API_KEY_INVALID: ${error.message}`);
        }
    }
    throw new Error("Failed to evaluate the answer using web search. Please try submitting again.");
  }
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