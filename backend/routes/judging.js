import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Initialize Supabase admin client to bypass RLS for server-side operations
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// POST /api/judging/register-judge
// Called when a judge fills in the onboarding form from their invite link
router.post('/register-judge', async (req, res) => {
  const { name, email, profession, expertise, eventId, inviteToken } = req.body;

  if (!name || !email || !eventId) {
    return res.status(400).json({ error: 'Name, email, and eventId are required.' });
  }

  try {
    // Check if judge already exists for this event (re-use their record)
    const { data: existing } = await supabase
      .from('judges')
      .select('id')
      .eq('event_id', eventId)
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      return res.status(200).json({ judgeId: existing.id, message: 'Welcome back!' });
    }

    // Insert new judge record
    const { data: judge, error } = await supabase
      .from('judges')
      .insert({
        name,
        email,
        event_id: eventId,
        invite_token: inviteToken || `manual-${Date.now()}`,
        status: 'ACTIVE',
        expertise: expertise ? [expertise] : [],
      })
      .select('id')
      .single();

    if (error) throw error;

    return res.status(201).json({ judgeId: judge.id, message: 'Judge registered successfully!' });
  } catch (error) {
    console.error('Error registering judge:', error);
    return res.status(500).json({ error: 'Failed to register judge.' });
  }
});

// PUT /api/judging/update-judge/:judgeId
router.put('/update-judge/:judgeId', async (req, res) => {
  const { judgeId } = req.params;
  const { name, profession, expertise } = req.body;
  if (!name || !profession) return res.status(400).json({ error: 'Name and profession are required.' });
  try {
    const { error } = await supabase
      .from('judges')
      .update({ name, expertise: expertise ? [expertise] : [] })
      .eq('id', judgeId);
    if (error) throw error;
    return res.status(200).json({ message: 'Profile updated.' });
  } catch (error) {
    console.error('Error updating judge:', error);
    return res.status(500).json({ error: error.message || 'Failed to update profile.' });
  }
});

// GET /api/judging/event/:eventId
// Fetch event details for display on the judging panel
router.get('/event/:eventId', async (req, res) => {
  const { eventId } = req.params;
  try {
    const { data: event, error } = await supabase
      .from('events')
      .select('id, name, tagline, description, start_date, end_date, primary_color, secondary_color, logo_url')
      .eq('id', eventId)
      .single();
    if (error) throw error;
    return res.status(200).json({ event });
  } catch (error) {
    console.error('Error fetching event:', error);
    return res.status(500).json({ error: 'Failed to fetch event.' });
  }
});

// GET /api/judging/teams/:eventId
// Fetch all teams for an event along with their FULL submission details
router.get('/teams/:eventId', async (req, res) => {
  const { eventId } = req.params;

  try {
    const { data: teams, error } = await supabase
      .from('teams')
      .select(`
        id, name, track,
        submissions(
          id, project_name, tagline, problem_statement,
          github_repo_url, github_usernames, demo_link, tech_stack,
          ppt_url, screenshot_urls, what_makes_unique, challenges_faced, status
        ),
        team_members(user_id, users(name, email))
      `)
      .eq('event_id', eventId);

    if (error) throw error;

    return res.status(200).json({ teams: teams || [] });
  } catch (error) {
    console.error('Error fetching teams:', error);
    return res.status(500).json({ error: 'Failed to fetch teams.' });
  }
});

// GET /api/judging/rubric/:eventId
// Fetch the rubric criteria defined by the organiser for this event
router.get('/rubric/:eventId', async (req, res) => {
  const { eventId } = req.params;

  try {
    const { data: criteria, error } = await supabase
      .from('rubric_criteria')
      .select('id, name, weight, description, order_index')
      .eq('event_id', eventId)
      .order('order_index', { ascending: true });

    if (error) throw error;

    return res.status(200).json({ criteria: criteria || [] });
  } catch (error) {
    console.error('Error fetching rubric:', error);
    return res.status(500).json({ error: 'Failed to fetch rubric.' });
  }
});

// POST /api/judging/submit-score
// Judge submits their scores for a specific team
router.post('/submit-score', async (req, res) => {
  const { judgeId, teamId, eventId, criteriaScores, feedback, privateNotes } = req.body;

  if (!judgeId || !teamId || !eventId || !criteriaScores) {
    return res.status(400).json({ error: 'judgeId, teamId, eventId, and criteriaScores are required.' });
  }

  try {
    // Fetch the rubric so we can calculate the weighted total
    const { data: criteria, error: rubricError } = await supabase
      .from('rubric_criteria')
      .select('id, name, weight')
      .eq('event_id', eventId);

    if (rubricError) throw rubricError;

    // Calculate the weighted total
    // criteriaScores is a map: { criteriaId: scoreOutOf10, ... }
    let weightedTotal = 0;
    criteria.forEach(c => {
      const rawScore = criteriaScores[c.id] || 0;
      // Each criteria score is out of 10, multiplied by its weight percentage
      weightedTotal += (rawScore / 10) * c.weight;
    });

    // Upsert the score record (update if judge already scored this team)
    const { error: scoreError } = await supabase
      .from('scores')
      .upsert({
        judge_id: judgeId,
        team_id: teamId,
        event_id: eventId,
        criteria_scores: criteriaScores,
        weighted_total: weightedTotal,
        normalized_score: weightedTotal,
        raw_feedback_text: feedback || null,
        private_notes: privateNotes || null,
        input_mode: 'NUMERICAL',
        submitted_at: new Date().toISOString(),
      }, { onConflict: 'judge_id,team_id' });

    if (scoreError) throw scoreError;

    return res.status(200).json({ message: 'Score submitted successfully!', weightedTotal });
  } catch (error) {
    console.error('Error submitting score:', error);
    return res.status(500).json({ error: error.message || 'Failed to submit score.' });
  }
});

// GET /api/judging/my-scores/:judgeId/:eventId
// Fetch all scores this judge has already submitted (to pre-fill the form)
router.get('/my-scores/:judgeId/:eventId', async (req, res) => {
  const { judgeId, eventId } = req.params;
  try {
    const { data: scores, error } = await supabase
      .from('scores')
      .select('team_id, criteria_scores, weighted_total, private_notes')
      .eq('judge_id', judgeId)
      .eq('event_id', eventId);

    if (error) throw error;

    // Convert to a map: { teamId: scoreData }
    const scoresMap = {};
    (scores || []).forEach(s => { scoresMap[s.team_id] = s; });

    return res.status(200).json({ scores: scoresMap });
  } catch (error) {
    console.error('Error fetching scores:', error);
    return res.status(500).json({ error: 'Failed to fetch scores.' });
  }
});

router.post('/calculate-leaderboard', async (req, res) => {
  const { eventId } = req.body;
  
  if (!eventId) {
    return res.status(400).json({ error: 'eventId is required' });
  }

  try {
    // 1. Fetch all scores for this event
    const { data: scores, error: scoresError } = await supabase
      .from('scores')
      .select('*')
      .eq('event_id', eventId);

    if (scoresError) throw scoresError;

    if (!scores || scores.length === 0) {
      return res.status(400).json({ error: 'No scores found for this event. Judging must be completed first.' });
    }

    // 2. Aggregate scores by team (using Average)
    const teamScoresMap = {};
    scores.forEach(score => {
      const teamId = score.team_id;
      if (!teamScoresMap[teamId]) {
        teamScoresMap[teamId] = { sum: 0, count: 0 };
      }
      teamScoresMap[teamId].sum += (score.weighted_total || 0);
      teamScoresMap[teamId].count += 1;
    });

    const aggregatedScores = [];
    for (const [teamId, stats] of Object.entries(teamScoresMap)) {
      const averageScore = stats.sum / stats.count;
      aggregatedScores.push({ team_id: teamId, averageScore });
    }

    // 3. Sort teams descending by average score
    aggregatedScores.sort((a, b) => b.averageScore - a.averageScore);

    // 4. Assign ranks and format for upsert
    const leaderboardEntries = aggregatedScores.map((entry, index) => ({
      event_id: eventId,
      team_id: entry.team_id,
      rank: index + 1,
      raw_score: entry.averageScore,
      normalized_score: entry.averageScore, // Using raw as normalized for now
      is_published: false // keep it draft by default
    }));

    // 5. Upsert into leaderboard table
    // (Ensure the table has a unique constraint on event_id + team_id for upsert to work properly,
    // which it does according to the schema: UNIQUE(event_id, team_id))
    const { error: upsertError } = await supabase
      .from('leaderboard')
      .upsert(leaderboardEntries, { onConflict: 'event_id,team_id' });

    if (upsertError) throw upsertError;

    return res.status(200).json({ message: 'Leaderboard calculated successfully' });
  } catch (error) {
    console.error('Error calculating leaderboard:', error);
    return res.status(500).json({ error: 'Failed to calculate leaderboard' });
  }
});

export default router;
