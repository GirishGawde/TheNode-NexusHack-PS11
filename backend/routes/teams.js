import express from 'express';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { supabase } from '../config/supabase.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Helper to mock Member 3's AI service until it's ready
async function mockSuggestTeams(participants, eventDetails) {
  // Return random grouping for now
  return {
    teams: [
      {
        memberIds: participants.slice(0, Math.min(3, participants.length)).map(p => p.user_id),
        leaderId: participants[0]?.user_id,
        suggestedName: "AI Suggested Team Alpha",
        compatibilityScore: 85,
        reasoning: "Mock matching reasoning based on complementary skills."
      }
    ],
    unmatchedIds: participants.slice(3).map(p => p.user_id)
  };
}

router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { eventId, teamName, track } = req.body;
    const userId = req.user.id;

    if (!eventId || !teamName) {
      return res.status(400).json({ success: false, error: 'eventId and teamName are required' });
    }

    const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    // 1. Insert into teams table
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: teamName,
        event_id: eventId,
        leader_id: userId,
        invite_code: inviteCode,
        track: track || null
      })
      .select()
      .single();

    if (teamError) throw teamError;

    // 2. Insert creator as team_member
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: userId
      });

    if (memberError) throw memberError;

    // 3. Insert event_registration
    const { error: regError } = await supabase
      .from('event_registrations')
      .insert({
        event_id: eventId,
        user_id: userId,
        team_id: team.id,
        is_solo: false
      });

    if (regError && regError.code !== '23505') { // Ignore unique violation if already registered
      throw regError;
    }

    res.json({ success: true, team });
  } catch (err) {
    console.error('[/api/teams/create] error:', err);
    res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
});

router.post('/join', authMiddleware, async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const userId = req.user.id;

    if (!inviteCode) {
      return res.status(400).json({ success: false, error: 'inviteCode is required' });
    }

    // 1. Find team by invite_code
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*, events(max_team_size)')
      .eq('invite_code', inviteCode)
      .single();

    if (teamError || !team) {
      return res.status(404).json({ success: false, error: 'Invalid invite code', code: 'INVALID_INVITE' });
    }

    // 2. Check team not full
    const { count: memberCount, error: countError } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', team.id);

    if (countError) throw countError;

    const maxTeamSize = team.events?.max_team_size || 4;
    if (memberCount >= maxTeamSize) {
      return res.status(400).json({ success: false, error: 'Team is full', code: 'TEAM_FULL' });
    }

    // 3. Check user not already in a team for this event
    const { data: existingReg, error: regCheckError } = await supabase
      .from('event_registrations')
      .select('team_id')
      .eq('event_id', team.event_id)
      .eq('user_id', userId)
      .single();

    if (existingReg && existingReg.team_id) {
      return res.status(400).json({ success: false, error: 'You are already in a team for this event', code: 'ALREADY_IN_TEAM' });
    }

    // 4. Insert into team_members
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: userId
      });

    if (memberError && memberError.code !== '23505') throw memberError;

    // 5. Insert or update event_registration
    const { error: upsertRegError } = await supabase
      .from('event_registrations')
      .upsert({
        event_id: team.event_id,
        user_id: userId,
        team_id: team.id,
        is_solo: false
      }, { onConflict: 'event_id, user_id' });

    if (upsertRegError) throw upsertRegError;

    res.json({ success: true, team: { ...team, memberCount: memberCount + 1 } });
  } catch (err) {
    console.error('[/api/teams/join] error:', err);
    res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
});

router.post('/find-ai-team', authMiddleware, async (req, res) => {
  try {
    const { eventId } = req.body;
    
    if (!eventId) {
      return res.status(400).json({ success: false, error: 'eventId is required' });
    }

    // Fetch all solo participants for event
    const { data: participants, error } = await supabase
      .from('event_registrations')
      .select('*, users(*)')
      .eq('event_id', eventId)
      .eq('is_solo', true);

    if (error) throw error;

    // Call AI service
    const suggestions = await mockSuggestTeams(participants, { id: eventId });

    res.json({ success: true, suggestions: suggestions.teams });
  } catch (err) {
    console.error('[/api/teams/find-ai-team] error:', err);
    res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
});

router.post('/generate-qr/:teamId', authMiddleware, async (req, res) => {
  try {
    const { teamId } = req.params;

    // Fetch team details
    const { data: team, error } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();

    if (error || !team) {
      return res.status(404).json({ success: false, error: 'Team not found' });
    }
    
    // Only leader can generate QR (optional based on requirements, but Master Doc implies leader only for some actions, let's just allow members for now or check if leader)
    if (team.leader_id !== req.user.id) {
       return res.status(403).json({ success: false, error: 'Only team leader can generate QR' });
    }

    const verificationHash = crypto.createHash('sha256').update(`${team.id}-${process.env.SUPABASE_SERVICE_ROLE_KEY}`).digest('hex').substring(0, 16);
    
    const qrPayload = {
      teamId: team.id,
      teamName: team.name,
      eventId: team.event_id,
      verificationCode: verificationHash
    };

    const qrBase64 = await QRCode.toDataURL(JSON.stringify(qrPayload));

    res.json({ success: true, qrBase64 });
  } catch (err) {
    console.error('[/api/teams/generate-qr] error:', err);
    res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
});

export default router;
