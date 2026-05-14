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

export async function generateProjectSummary(submission) {
  const fallback = `${submission?.project_name || 'Project'} - ${submission?.tagline || 'No tagline'}`;
  
  if (!submission) return fallback;

  try {
    const prompt = `
Summarize the following hackathon project submission in exactly two engaging sentences.
Project Name: ${submission.project_name}
Tagline: ${submission.tagline}
Problem Statement: ${submission.problem_statement}
Tech Stack: ${submission.tech_stack?.join(', ')}
What Makes It Unique: ${submission.what_makes_unique}

Return ONLY the two sentences, without any markdown or extra text.
    `;

    const summary = await callGemini(prompt);
    if (!summary || summary.trim().length === 0) return fallback;
    return summary.trim();
  } catch (err) {
    console.error('[AI] generateProjectSummary error:', err);
    return fallback;
  }
}
