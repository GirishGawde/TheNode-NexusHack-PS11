import { supabase } from '../config/supabase.js';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Calculate pool deadline based on event registration_deadline.
 * Pool deadline = 40% of remaining time, clamped between 1h and 24h.
 */
export function calculatePoolDeadline(registrationDeadline) {
  const now = Date.now();
  const regDeadline = new Date(registrationDeadline).getTime();
  const timeRemaining = regDeadline - now;

  if (timeRemaining <= 0) return null; // Registration already closed

  const poolWindow = timeRemaining * 0.4;
  const minWindow = 1 * 60 * 60 * 1000;  // 1 hour
  const maxWindow = 24 * 60 * 60 * 1000; // 24 hours

  const clampedWindow = Math.max(minWindow, Math.min(maxWindow, poolWindow));
  return new Date(now + clampedWindow).toISOString();
}

/**
 * Core AI matching function.
 * Called once every time the pool changes (join / cancel / leave).
 * Never called during polling.
 */
export async function runAiMatchForEvent(eventId) {
  try {
    // 1. Fetch all SEARCHING users in pool for this event
    const { data: poolEntries, error: poolError } = await supabase
      .from('ai_matchmaking_pool')
      .select('id, user_id, pool_deadline')
      .eq('event_id', eventId)
      .eq('status', 'SEARCHING');

    if (poolError) throw poolError;
    if (!poolEntries || poolEntries.length === 0) return;

    // 2. Fetch event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, min_team_size, max_team_size, registration_deadline')
      .eq('id', eventId)
      .single();

    if (eventError || !event) return;

    const minSize = event.min_team_size || 2;
    const maxSize = event.max_team_size || 4;

    // 3. Fetch user profiles
    const userIds = poolEntries.map(e => e.user_id);
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email, skills, college')
      .in('id', userIds);

    if (usersError || !users || users.length === 0) return;

    // 4. Check if deadline is near (within 20% of pool_deadline)
    const now = Date.now();
    const deadlineNear = poolEntries.some(entry => {
      const deadline = new Date(entry.pool_deadline).getTime();
      const timeLeft = deadline - now;
      const totalWindow = deadline - new Date(entry.pool_deadline).getTime();
      return timeLeft < 2 * 60 * 60 * 1000; // less than 2h remaining
    });

    // 5. Build Gemini prompt
    const participantsJson = JSON.stringify(users.map(u => ({
      id: u.id,
      name: u.name,
      skills: u.skills || [],
      college: u.college || 'Unknown'
    })), null, 2);

    const prompt = `You are an expert hackathon team coordinator for the event "${event.name}".

Your job is to analyze the following pool of participants and determine:
1. Whether the pool is "ready" — meaning you can form at least one team with genuinely complementary skills (not just enough headcount)
2. For each participant, generate a ranked list of the most compatible teammates

Matching criteria (in order of importance):
- SKILL COMPLEMENTARITY (most important): Teams should have diverse skills. Reward participants who bring skills others lack. Penalize heavy skill overlap. A great team might have one frontend dev (React/Vue), one backend dev (Node/Python), one ML person, one DevOps/Full-stack.
- COLLEGE PROXIMITY: Give a small boost to same-college pairs — they can coordinate easier. Not a hard requirement.

Pool has ${users.length} participants. Event requires min ${minSize}, max ${maxSize} per team.
${deadlineNear ? 'DEADLINE IS NEAR: Push recommendations even if pool quality is not ideal. Flag low confidence.' : ''}

Participants:
${participantsJson}

Respond ONLY with valid JSON in this exact format:
{
  "poolReady": true | false,
  "confidence": 0.0 to 1.0,
  "poolReadyReason": "Brief explanation of why pool is or is not ready",
  "recommendations": {
    "<userId>": [
      {
        "userId": "<string>",
        "compatibilityScore": <0-100 integer>,
        "reason": "<one sentence plain English reason>",
        "lowConfidence": <true | false>
      }
    ]
  }
}

Rules:
- "recommendations" must have one key per participant userId
- Each participant's list should rank ALL other participants, best first
- "poolReady" should be false if all participants share the same skills (no diversity)
- "poolReady" should be true if meaningful complementary skill groupings are possible
- "lowConfidence" is true when deadline is near and match quality is not ideal
- Do not include any text outside the JSON`;

    // 6. Call Gemini
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    let rawText = response.text?.trim() || '';
    // Strip markdown code fences if present
    rawText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

    let aiResult;
    try {
      aiResult = JSON.parse(rawText);
    } catch (parseErr) {
      console.error('[AI Match] Failed to parse Gemini response:', rawText.substring(0, 500));
      return;
    }

    // 7. If not ready and deadline not near, do nothing — wait for more pool members
    if (!aiResult.poolReady && !deadlineNear) {
      console.log(`[AI Match] Pool for event ${eventId} not ready yet. Reason: ${aiResult.poolReadyReason}`);
      return;
    }

    // 8. Update each pool entry with personalized recommendations
    const recommendations = aiResult.recommendations || {};
    const updates = poolEntries.map(entry => {
      const userRecs = recommendations[entry.user_id] || [];
      return supabase
        .from('ai_matchmaking_pool')
        .update({
          status: 'RECOMMENDATIONS_READY',
          recommendations: userRecs
        })
        .eq('id', entry.id);
    });

    await Promise.all(updates);
    console.log(`[AI Match] Pushed recommendations for ${poolEntries.length} users in event ${eventId}. Confidence: ${aiResult.confidence}`);

  } catch (err) {
    console.error('[AI Match] runAiMatchForEvent error:', err);
  }
}

/**
 * Expire pool entries past their deadline.
 * Called every 15 minutes by a cron in server.js — NO AI calls here.
 */
export async function expireDeadlinedPoolEntries() {
  try {
    const { data, error } = await supabase
      .from('ai_matchmaking_pool')
      .update({ status: 'EXPIRED' })
      .in('status', ['SEARCHING', 'RECOMMENDATIONS_READY'])
      .lt('pool_deadline', new Date().toISOString())
      .select('event_id, user_id');

    if (error) throw error;
    if (data && data.length > 0) {
      console.log(`[AI Match Cron] Expired ${data.length} pool entries.`);
    }
  } catch (err) {
    console.error('[AI Match Cron] expireDeadlinedPoolEntries error:', err);
  }
}
