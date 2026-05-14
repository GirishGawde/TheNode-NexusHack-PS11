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

export async function suggestTeams(soloParticipants, eventDetails) {
  const fallback = {
    teams: [],
    unmatchedIds: soloParticipants?.map(p => p.id) || []
  };

  if (!soloParticipants || soloParticipants.length === 0) return fallback;

  try {
    const prompt = `
You are an expert AI matching algorithm for hackathons.
Given a list of solo participants and event details, group them into optimal teams.
Consider complementary skills, year of study, past wins, and past participations.

Event Details:
${JSON.stringify(eventDetails, null, 2)}

Participants:
${JSON.stringify(soloParticipants, null, 2)}

Return ONLY a valid JSON object matching this schema, with NO markdown formatting:
{
  "teams": [
    {
      "memberIds": ["uuid1", "uuid2"],
      "leaderId": "uuid1",
      "suggestedName": "string",
      "compatibilityScore": number (0-100),
      "reasoning": "string"
    }
  ],
  "unmatchedIds": ["uuid3"]
}
    `;

    const rawOutput = await callGemini(prompt);
    const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to extract JSON');
    
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed;
  } catch (err) {
    console.error('[AI] suggestTeams error:', err);
    
    // Fallback: Random grouping (groups of up to 4)
    const teams = [];
    const unmatchedIds = [];
    const maxTeamSize = eventDetails?.max_team_size || 4;
    
    let currentTeam = [];
    for (const p of soloParticipants) {
      currentTeam.push(p.id);
      if (currentTeam.length === maxTeamSize) {
        teams.push({
          memberIds: [...currentTeam],
          leaderId: currentTeam[0],
          suggestedName: 'Team Random ' + Math.floor(Math.random() * 1000),
          compatibilityScore: 50,
          reasoning: 'Randomly grouped due to fallback.'
        });
        currentTeam = [];
      }
    }
    
    if (currentTeam.length > 0) {
      if (currentTeam.length >= (eventDetails?.min_team_size || 1)) {
        teams.push({
          memberIds: [...currentTeam],
          leaderId: currentTeam[0],
          suggestedName: 'Team Random ' + Math.floor(Math.random() * 1000),
          compatibilityScore: 50,
          reasoning: 'Randomly grouped due to fallback.'
        });
      } else {
        unmatchedIds.push(...currentTeam);
      }
    }

    return { teams, unmatchedIds };
  }
}
