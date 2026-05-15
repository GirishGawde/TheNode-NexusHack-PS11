import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function callGemini(prompt) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (err) {
    console.error('[Gemini] callGemini error:', err);
    throw err;
  }
}

export async function analyzeJudgeFeedback(feedbackText, criteria) {
  const fallback = {
    scores: [],
    overallSentiment: 'Neutral',
    confidence: 0
  };
  
  if (criteria && Array.isArray(criteria)) {
    criteria.forEach(c => {
      fallback.scores.push({ criteriaId: c.id, score: 5, reasoning: 'Fallback applied due to error.' });
    });
  }

  try {
    const prompt = `
You are an expert hackathon judge sentiment analyzer.
Analyze the following feedback text given by a judge and score the submission based on the provided criteria.
Scores must be between 1 and 10. You should deduce scores from the feedback provided. If the feedback doesn't explicitly mention a criteria, provide a neutral score (e.g. 5) or your best deduction.

Judge Feedback:
"${feedbackText}"

Criteria:
${JSON.stringify(criteria, null, 2)}

Return ONLY a valid JSON object matching this exact schema, with no markdown formatting or extra text:
{
  "scores": [
    {
      "criteriaId": "string (the id from the provided Criteria)",
      "score": number,
      "reasoning": "string"
    }
  ],
  "overallSentiment": "Positive" | "Neutral" | "Negative",
  "confidence": number (0 to 100)
}
    `;

    const rawOutput = await callGemini(prompt);
    const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from Gemini output');
    }
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed;
  } catch (err) {
    console.error('[AI] analyzeJudgeFeedback error:', err);
    return fallback;
  }
}
