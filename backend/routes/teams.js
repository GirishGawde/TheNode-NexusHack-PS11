import express from 'express';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { supabase } from '../config/supabase.js';
import { authMiddleware } from '../middleware/auth.js';
import { runAiMatchForEvent, calculatePoolDeadline } from '../lib/aiMatch.js';

const router = express.Router();

async function mockSuggestTeams(participants, eventDetails) {
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

// Create Team
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { eventId, teamName, track } = req.body;
    const userId = req.user.id;

    if (!eventId || !teamName) {
      return res.status(400).json({ success: false, error: 'eventId and teamName are required' });
    }

    const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({ name: teamName, event_id: eventId, leader_id: userId, invite_code: inviteCode, track: track || null })
      .select()
      .single();

    if (teamError) throw teamError;

    const { error: memberError } = await supabase
      .from('team_members')
      .insert({ team_id: team.id, user_id: userId });

    if (memberError) throw memberError;

    const { error: regError } = await supabase
      .from('event_registrations')
      .insert({ event_id: eventId, user_id: userId, team_id: team.id, is_solo: false });

    if (regError && regError.code !== '23505') throw regError;

    res.json({ success: true, team });
  } catch (err) {
    console.error('[/api/teams/create] error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Join Team via Invite Code
router.post('/join', authMiddleware, async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const userId = req.user.id;

    if (!inviteCode) {
      return res.status(400).json({ success: false, error: 'inviteCode is required' });
    }

    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*, events(max_team_size)')
      .eq('invite_code', inviteCode)
      .single();

    if (teamError || !team) {
      return res.status(404).json({ success: false, error: 'Invalid invite code', code: 'INVALID_INVITE' });
    }

    const { count: memberCount, error: countError } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', team.id);

    if (countError) throw countError;

    const maxTeamSize = team.events?.max_team_size || 4;
    if (memberCount >= maxTeamSize) {
      return res.status(400).json({ success: false, error: 'Team is full', code: 'TEAM_FULL' });
    }

    const { data: existingReg } = await supabase
      .from('event_registrations')
      .select('team_id')
      .eq('event_id', team.event_id)
      .eq('user_id', userId)
      .single();

    if (existingReg && existingReg.team_id) {
      return res.status(400).json({ success: false, error: 'You are already in a team for this event', code: 'ALREADY_IN_TEAM' });
    }

    const { error: memberError } = await supabase
      .from('team_members')
      .insert({ team_id: team.id, user_id: userId });

    if (memberError && memberError.code !== '23505') throw memberError;

    const { error: upsertRegError } = await supabase
      .from('event_registrations')
      .upsert({ event_id: team.event_id, user_id: userId, team_id: team.id, is_solo: false }, { onConflict: 'event_id, user_id' });

    if (upsertRegError) throw upsertRegError;

    res.json({ success: true, team: { ...team, memberCount: memberCount + 1 } });
  } catch (err) {
    console.error('[/api/teams/join] error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Find Team with AI — join the matchmaking pool
router.post('/find-ai-team', authMiddleware, async (req, res) => {
  try {
    const { eventId } = req.body;
    const userId = req.user.id;
    if (!eventId) return res.status(400).json({ success: false, error: 'eventId is required' });

    // Fetch event registration deadline
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('registration_deadline, min_team_size, max_team_size, name')
      .eq('id', eventId)
      .single();
    if (eventError || !event) return res.status(404).json({ success: false, error: 'Event not found' });

    // Check registration deadline hasn't passed
    if (event.registration_deadline && new Date(event.registration_deadline) < new Date()) {
      return res.status(400).json({ success: false, error: 'Registration is closed for this event' });
    }

    // Check user not already in a team for this event
    const { data: existingReg } = await supabase
      .from('event_registrations')
      .select('team_id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .single();
    if (existingReg) return res.status(400).json({ success: false, error: 'You are already registered for this event' });

    // Check not already in the pool
    const { data: existingPool } = await supabase
      .from('ai_matchmaking_pool')
      .select('id, status')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .single();
    if (existingPool) return res.status(400).json({ success: false, error: 'You are already in the matchmaking pool for this event', status: existingPool.status });

    // Calculate pool deadline
    const poolDeadline = calculatePoolDeadline(event.registration_deadline);
    if (!poolDeadline) return res.status(400).json({ success: false, error: 'Registration deadline has passed' });

    // Add to pool
    const { error: insertError } = await supabase
      .from('ai_matchmaking_pool')
      .insert({ event_id: eventId, user_id: userId, pool_deadline: poolDeadline, status: 'SEARCHING' });
    if (insertError) throw insertError;

    // Trigger AI match async (don't await — don't block response)
    runAiMatchForEvent(eventId).catch(err => console.error('[find-ai-team] AI trigger error:', err));

    res.json({ success: true, status: 'SEARCHING', poolDeadline });
  } catch (err) {
    console.error('[/api/teams/find-ai-team] error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// AI Match Status — cheap DB-only poll, no AI
router.get('/ai-match/status/:eventId', authMiddleware, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    const { data: entry, error } = await supabase
      .from('ai_matchmaking_pool')
      .select('status, pool_deadline, recommendations')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .single();

    if (error || !entry) return res.json({ status: 'NOT_IN_POOL' });

    res.json({
      status: entry.status,
      poolDeadline: entry.pool_deadline,
      recommendations: entry.status === 'RECOMMENDATIONS_READY' ? (entry.recommendations || []) : []
    });
  } catch (err) {
    console.error('[/api/teams/ai-match/status] error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Cancel AI matchmaking — leave pool
router.post('/ai-match/cancel/:eventId', authMiddleware, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    const { error } = await supabase
      .from('ai_matchmaking_pool')
      .update({ status: 'CANCELLED' })
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .in('status', ['SEARCHING', 'RECOMMENDATIONS_READY']);

    if (error) throw error;

    // Trigger fresh AI match for remaining pool members
    runAiMatchForEvent(eventId).catch(() => {});

    res.json({ success: true, message: 'Left matchmaking pool' });
  } catch (err) {
    console.error('[/api/teams/ai-match/cancel] error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Generate QR Code
router.post('/generate-qr/:teamId', authMiddleware, async (req, res) => {
  try {
    const { teamId } = req.params;

    const { data: team, error } = await supabase.from('teams').select('*').eq('id', teamId).single();
    if (error || !team) return res.status(404).json({ success: false, error: 'Team not found' });

    if (team.leader_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Only team leader can generate QR' });
    }

    const verificationHash = crypto.createHash('sha256').update(`${team.id}-${process.env.SUPABASE_SERVICE_ROLE_KEY}`).digest('hex').substring(0, 16);
    const qrPayload = { teamId: team.id, teamName: team.name, eventId: team.event_id, verificationCode: verificationHash };
    const qrBase64 = await QRCode.toDataURL(JSON.stringify(qrPayload));

    res.json({ success: true, qrBase64 });
  } catch (err) {
    console.error('[/api/teams/generate-qr] error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Send Invite
router.post('/invite/send', authMiddleware, async (req, res) => {
  try {
    const { teamId, email } = req.body;
    const senderId = req.user.id;

    if (!teamId || !email) return res.status(400).json({ success: false, error: 'teamId and email are required' });

    const { data: team, error: teamError } = await supabase.from('teams').select('event_id, leader_id').eq('id', teamId).single();
    if (teamError || !team) return res.status(404).json({ success: false, error: 'Team not found' });
    if (team.leader_id !== senderId) return res.status(403).json({ success: false, error: 'Only team leader can send invites' });

    const { data: user, error: userError } = await supabase.from('users').select('id').ilike('email', email).single();
    if (userError || !user) return res.status(404).json({ success: false, error: 'User with this email not found' });

    const { data: existingReg } = await supabase.from('event_registrations').select('*').eq('event_id', team.event_id).eq('user_id', user.id).single();
    if (existingReg && existingReg.team_id) return res.status(400).json({ success: false, error: 'User is already in a team for this event' });

    const { data: existingInvite } = await supabase.from('team_invites').select('id').eq('team_id', teamId).eq('receiver_id', user.id).single();
    if (existingInvite) return res.status(400).json({ success: false, error: 'Invite already sent to this user' });

    const { error: inviteError } = await supabase.from('team_invites').insert({ team_id: teamId, sender_id: senderId, receiver_id: user.id });
    if (inviteError) throw inviteError;

    res.json({ success: true, message: 'Invite sent successfully' });
  } catch (err) {
    console.error('[/api/teams/invite/send] error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Accept Invite — with first-come-first-served auto-rejection
router.post('/invite/accept', authMiddleware, async (req, res) => {
  try {
    const { inviteId } = req.body;
    const userId = req.user.id;

    if (!inviteId) return res.status(400).json({ success: false, error: 'inviteId is required' });

    const { data: invite, error: inviteError } = await supabase
      .from('team_invites')
      .select('*, teams(event_id, max_team_size)')
      .eq('id', inviteId)
      .eq('receiver_id', userId)
      .single();
    if (inviteError || !invite) return res.status(404).json({ success: false, error: 'Invite not found' });
    if (invite.status !== 'PENDING') return res.status(400).json({ success: false, error: `Invite is already ${invite.status}` });

    // Check current accepted member count
    const { count: memberCount } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', invite.team_id);

    const maxSize = invite.teams?.max_team_size || 4;
    if (memberCount >= maxSize) {
      // Team is already full — auto-reject this invite
      await supabase.from('team_invites').update({ status: 'REJECTED' }).eq('id', inviteId);
      return res.status(400).json({ success: false, error: 'Team is already full. Your invite has been declined automatically.' });
    }

    // Accept: add to team
    await supabase.from('team_invites').update({ status: 'ACCEPTED' }).eq('id', inviteId);
    await supabase.from('team_members').insert({ team_id: invite.team_id, user_id: userId });
    await supabase.from('event_registrations').upsert({
      event_id: invite.teams.event_id,
      user_id: userId,
      team_id: invite.team_id,
      is_solo: false
    }, { onConflict: 'event_id, user_id' });

    // Mark user as MATCHED in AI pool (if they were in it)
    await supabase
      .from('ai_matchmaking_pool')
      .update({ status: 'MATCHED' })
      .eq('event_id', invite.teams.event_id)
      .eq('user_id', userId)
      .in('status', ['SEARCHING', 'RECOMMENDATIONS_READY']);

    // Check if team is now full — if so, auto-reject all remaining pending invites
    const newCount = memberCount + 1;
    if (newCount >= maxSize) {
      await supabase
        .from('team_invites')
        .update({ status: 'REJECTED' })
        .eq('team_id', invite.team_id)
        .eq('status', 'PENDING');
      console.log(`[invite/accept] Team ${invite.team_id} full (${newCount}/${maxSize}). Auto-rejected remaining invites.`);
    }

    res.json({ success: true, message: 'Invite accepted' });
  } catch (err) {
    console.error('[/api/teams/invite/accept] error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Reject Invite
router.post('/invite/reject', authMiddleware, async (req, res) => {
  try {
    const { inviteId } = req.body;
    const userId = req.user.id;

    if (!inviteId) return res.status(400).json({ success: false, error: 'inviteId is required' });

    const { error } = await supabase.from('team_invites').update({ status: 'REJECTED' }).eq('id', inviteId).eq('receiver_id', userId);
    if (error) throw error;

    res.json({ success: true, message: 'Invite rejected' });
  } catch (err) {
    console.error('[/api/teams/invite/reject] error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Leave / Delete Team
router.post('/leave', authMiddleware, async (req, res) => {
  try {
    const { teamId } = req.body;
    const userId = req.user.id;

    if (!teamId) return res.status(400).json({ success: false, error: 'teamId is required' });

    const { data: team, error: teamError } = await supabase.from('teams').select('leader_id').eq('id', teamId).single();
    if (teamError || !team) return res.status(404).json({ success: false, error: 'Team not found' });

    if (team.leader_id === userId) {
      // Leader: delete entire team and all related data
      await supabase.from('event_registrations').delete().eq('team_id', teamId);
      await supabase.from('team_messages').delete().eq('team_id', teamId);
      await supabase.from('scores').delete().eq('team_id', teamId);
      await supabase.from('submissions').delete().eq('team_id', teamId);
      await supabase.from('leaderboard').delete().eq('team_id', teamId);
      await supabase.from('certificates').delete().eq('team_id', teamId);
      await supabase.from('team_invites').delete().eq('team_id', teamId);
      await supabase.from('ai_matchmaking_pool').delete().eq('event_id', teamId); // cleanup pool if any
      await supabase.from('team_members').delete().eq('team_id', teamId);
      const { error: deleteError } = await supabase.from('teams').delete().eq('id', teamId);
      if (deleteError) throw deleteError;
      return res.json({ success: true, message: 'Team deleted successfully' });
    } else {
      // Member: just leave
      await supabase.from('event_registrations').delete().eq('team_id', teamId).eq('user_id', userId);
      const { error: leaveError } = await supabase.from('team_members').delete().eq('team_id', teamId).eq('user_id', userId);
      if (leaveError) throw leaveError;
      return res.json({ success: true, message: 'Left team successfully' });
    }
  } catch (err) {
    console.error('[/api/teams/leave] error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete specific message (soft delete — overwrites content, no column needed)
router.delete('/:teamId/messages/:messageId', authMiddleware, async (req, res) => {
  try {
    const { teamId, messageId } = req.params;
    const userId = req.user.id;

    const { data: message, error: fetchError } = await supabase
      .from('team_messages')
      .select('user_id')
      .eq('id', messageId)
      .eq('team_id', teamId)
      .single();

    if (fetchError || !message) return res.status(404).json({ success: false, error: 'Message not found' });
    if (message.user_id !== userId) return res.status(403).json({ success: false, error: 'You can only delete your own messages' });

    const { error: updateError } = await supabase
      .from('team_messages')
      .update({ content: '<DELETED_MESSAGE>' })
      .eq('id', messageId);

    if (updateError) throw updateError;

    res.json({ success: true });
  } catch (err) {
    console.error('[/api/teams/messages/delete] error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Clear entire team chat (leader only)
router.delete('/:teamId/messages', authMiddleware, async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.id;

    const { data: team, error: teamError } = await supabase.from('teams').select('leader_id').eq('id', teamId).single();
    if (teamError || !team) return res.status(404).json({ success: false, error: 'Team not found' });
    if (team.leader_id !== userId) return res.status(403).json({ success: false, error: 'Only the team leader can clear the chat' });

    const { error: clearError } = await supabase.from('team_messages').delete().eq('team_id', teamId);
    if (clearError) throw clearError;

    res.json({ success: true, message: 'Chat cleared successfully' });
  } catch (err) {
    console.error('[/api/teams/messages/clear] error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
