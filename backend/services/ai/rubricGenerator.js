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

export async function suggestRubric(eventDetails) {
  const fallback = {
    criteria: [
      { name: 'Innovation', suggestedWeight: 20, description: 'Originality and creativity of the solution.' },
      { name: 'Technical Execution', suggestedWeight: 30, description: 'Code quality, architecture, and completeness.' },
      { name: 'UI/UX Design', suggestedWeight: 20, description: 'User interface design and overall user experience.' },
      { name: 'Impact & Usefulness', suggestedWeight: 20, description: 'Real-world applicability and value proposition.' },
      { name: 'Presentation', suggestedWeight: 10, description: 'Quality of the pitch and demo.' }
    ]
  };

  try {
    const prompt = `
You are an expert hackathon organizer. 
Based on the following event details, suggest a comprehensive judging rubric.

Event Name: ${eventDetails?.eventName || 'Generic Hackathon'}
Tracks: ${eventDetails?.tracks?.join(', ') || 'General'}
Description: ${eventDetails?.description || 'A technical hackathon event.'}

Return ONLY a valid JSON object matching this schema, with NO markdown formatting or extra text:
{
  "criteria": [
    {
      "name": "string",
      "suggestedWeight": number (percentage, total should be 100),
      "description": "string"
    }
  ]
}
    `;

    const rawOutput = await callGemini(prompt);
    const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to extract JSON');
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Ensure weights add up
    let totalWeight = 0;
    parsed.criteria.forEach(c => totalWeight += c.suggestedWeight);
    if (totalWeight !== 100 && parsed.criteria.length > 0) {
      // Normalize to 100
      parsed.criteria.forEach(c => {
        c.suggestedWeight = parseFloat(((c.suggestedWeight / totalWeight) * 100).toFixed(2));
      });
    }

    // Normalize: rename suggestedWeight → weight for frontend compatibility
    parsed.criteria = parsed.criteria.map(c => ({
      name: c.name,
      weight: Math.round(c.suggestedWeight ?? c.weight ?? 20),
      description: c.description,
    }));

    return parsed;
  } catch (err) {
    console.error('[AI] suggestRubric error:', err);
    return fallback;
  }
}
