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

export async function checkDescriptionSimilarity(submission, allSubmissions) {
  const fallback = { overallRisk: 'GREEN', suspiciousMatches: [] };
  
  if (!submission || !allSubmissions || allSubmissions.length === 0) return fallback;

  // Filter out the current submission from allSubmissions
  const otherSubmissions = allSubmissions.filter(s => s.id !== submission.id);
  if (otherSubmissions.length === 0) return fallback;

  try {
    const prompt = `
You are an expert plagiarism detection system.
Compare the "Target Submission" against the "Other Submissions".
Look for high similarity in problem statements, taglines, and descriptions that might indicate plagiarism.

Target Submission:
ID: ${submission.id}
Project Name: ${submission.project_name}
Tagline: ${submission.tagline}
Problem Statement: ${submission.problem_statement}

Other Submissions:
${JSON.stringify(otherSubmissions.map(s => ({
  id: s.id,
  project_name: s.project_name,
  tagline: s.tagline,
  problem_statement: s.problem_statement
})), null, 2)}

Return ONLY a valid JSON object matching this schema, with NO markdown formatting:
{
  "suspiciousMatches": [
    {
      "matchedSubmissionId": "string",
      "similarityScore": number (0-100),
      "reasoning": "string"
    }
  ],
  "overallRisk": "GREEN" | "YELLOW" | "RED"
}
    `;

    const rawOutput = await callGemini(prompt);
    const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to extract JSON');
    
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed;
  } catch (err) {
    console.error('[AI] checkDescriptionSimilarity error:', err);
    return fallback;
  }
}
