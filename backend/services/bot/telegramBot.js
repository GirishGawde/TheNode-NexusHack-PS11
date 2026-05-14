import TelegramBot from 'node-telegram-bot-api';
import { supabase } from '../../config/supabase.js';
import dotenv from 'dotenv';
dotenv.config();

// Create bot only if token is available
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const bot = botToken ? new TelegramBot(botToken, { polling: true }) : null;

if (bot) {
  bot.on('polling_error', (err) => console.error('[Bot] polling error:', err));
}

// HELPER — get user + active event by chat ID
async function getUserAndEvent(chatId) {
  try {
    const { data: user } = await supabase
      .from('users')
      .select(`
        *,
        event_registrations(
          team_id, is_solo,
          events(
            id, name, status,
            submission_deadline,
            start_date, end_date,
            primary_color, logo_url,
            organiser_id
          )
        )
      `)
      .eq('telegram_chat_id', chatId.toString())
      .single();
    
    const activeReg = user?.event_registrations?.find(
      r => r.events?.status === 'LIVE'
    );
    
    return { user, activeReg, event: activeReg?.events };
  } catch (err) {
    console.error('[Bot] getUserAndEvent error:', err);
    return { user: null, activeReg: null, event: null };
  }
}

// COMMANDS
if (bot) {
  bot.onText(/\/start/, async (msg) => {
    try {
      const chatId = msg.chat.id;
      bot.sendMessage(chatId, 'Welcome to NexusHack! Please reply with your User ID (UUID) to link your account.');
    } catch (err) {
      console.error('[Bot] /start error:', err);
      bot.sendMessage(msg.chat.id, 'Something went wrong. Please try again.');
    }
  });

  // Message handler for UUID
  bot.on('message', async (msg) => {
    try {
      const chatId = msg.chat.id;
      const text = msg.text;
      if (!text) return;

      // Ignore explicit commands
      if (text.startsWith('/')) return;

      // UUID Regex
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      
      if (uuidRegex.test(text.trim())) {
        const userId = text.trim();
        const { error } = await supabase
          .from('users')
          .update({ telegram_chat_id: chatId.toString(), opted_into_bot: true })
          .eq('id', userId);

        if (error) {
          bot.sendMessage(chatId, 'Failed to link account. Please make sure the ID is correct.');
        } else {
          bot.sendMessage(chatId, 'Account linked successfully! You can now use commands like /status, /schedule, /announce, /leaderboard, /certificate, /help.');
        }
      }
    } catch (err) {
      console.error('[Bot] message error:', err);
      bot.sendMessage(msg.chat.id, 'Something went wrong. Please try again.');
    }
  });

  bot.onText(/\/status/, async (msg) => {
    try {
      const chatId = msg.chat.id;
      const { user, activeReg, event } = await getUserAndEvent(chatId);
      if (!user) return bot.sendMessage(chatId, 'Account not linked or found.');
      if (!event) return bot.sendMessage(chatId, 'No active live event found.');

      bot.sendMessage(chatId, `Your submission deadline for ${event.name} is ${new Date(event.submission_deadline).toLocaleString()}`);
    } catch (err) {
      console.error('[Bot] /status error:', err);
      bot.sendMessage(msg.chat.id, 'Something went wrong. Please try again.');
    }
  });

  bot.onText(/\/schedule/, async (msg) => {
    try {
      const chatId = msg.chat.id;
      const { user, event } = await getUserAndEvent(chatId);
      if (!user) return bot.sendMessage(chatId, 'Account not linked or found.');
      if (!event) return bot.sendMessage(chatId, 'No active live event found.');

      bot.sendMessage(chatId, `Schedule for ${event.name}:\nStart: ${new Date(event.start_date).toLocaleString()}\nEnd: ${new Date(event.end_date).toLocaleString()}`);
    } catch (err) {
      console.error('[Bot] /schedule error:', err);
      bot.sendMessage(msg.chat.id, 'Something went wrong. Please try again.');
    }
  });

  bot.onText(/\/announce/, async (msg) => {
    try {
      const chatId = msg.chat.id;
      const { user, event } = await getUserAndEvent(chatId);
      if (!user) return bot.sendMessage(chatId, 'Account not linked or found.');
      if (!event) return bot.sendMessage(chatId, 'No active live event found.');

      const { data: announcements } = await supabase
        .from('announcements')
        .select('*')
        .eq('event_id', event.id)
        .order('sent_at', { ascending: false })
        .limit(3);

      if (!announcements || announcements.length === 0) {
        return bot.sendMessage(chatId, 'No recent announcements.');
      }

      let response = 'Last 3 Announcements:\n\n';
      announcements.forEach(a => {
        response += `[${a.urgency}] ${a.title}\n${a.body}\n\n`;
      });
      bot.sendMessage(chatId, response);
    } catch (err) {
      console.error('[Bot] /announce error:', err);
      bot.sendMessage(msg.chat.id, 'Something went wrong. Please try again.');
    }
  });

  bot.onText(/\/leaderboard/, async (msg) => {
    try {
      const chatId = msg.chat.id;
      const { user, event } = await getUserAndEvent(chatId);
      if (!user) return bot.sendMessage(chatId, 'Account not linked or found.');
      if (!event) return bot.sendMessage(chatId, 'No active live event found.');

      const { data: leaderboard } = await supabase
        .from('leaderboard')
        .select('*, teams(name)')
        .eq('event_id', event.id)
        .eq('is_published', true)
        .order('rank', { ascending: true })
        .limit(10);

      if (!leaderboard || leaderboard.length === 0) {
        return bot.sendMessage(chatId, 'Leaderboard is not published yet or is empty.');
      }

      let response = 'Top 10 Leaderboard:\n\n';
      leaderboard.forEach(l => {
        response += `#${l.rank} - ${l.teams?.name || 'Unknown Team'}\n`;
      });
      bot.sendMessage(chatId, response);
    } catch (err) {
      console.error('[Bot] /leaderboard error:', err);
      bot.sendMessage(msg.chat.id, 'Something went wrong. Please try again.');
    }
  });

  bot.onText(/\/certificate/, async (msg) => {
    try {
      const chatId = msg.chat.id;
      bot.sendMessage(chatId, 'Generating your certificate, please wait...');
      
      const { user, event, activeReg } = await getUserAndEvent(chatId);
      if (!user) return bot.sendMessage(chatId, 'Account not linked or found.');
      // Wait, certificate might be generated after event ends.
      // We should check the certificates table directly for this user.
      const { data: cert } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', user.id)
        .order('generated_at', { ascending: false })
        .limit(1)
        .single();

      if (cert && cert.certificate_url) {
        bot.sendMessage(chatId, `Here is your certificate: ${cert.certificate_url}`);
      } else {
        bot.sendMessage(chatId, 'Certificate not found. It might not be generated yet.');
      }
    } catch (err) {
      console.error('[Bot] /certificate error:', err);
      bot.sendMessage(msg.chat.id, 'Something went wrong. Please try again.');
    }
  });

  bot.onText(/\/help/, async (msg) => {
    try {
      const chatId = msg.chat.id;
      bot.sendMessage(chatId, 'Available Commands:\n/start - Link account\n/status - Submission status\n/schedule - Event schedule\n/announce - Last 3 announcements\n/leaderboard - Top rankings\n/certificate - Get your certificate\n/help - Show this message');
    } catch (err) {
      console.error('[Bot] /help error:', err);
      bot.sendMessage(msg.chat.id, 'Something went wrong. Please try again.');
    }
  });
}

// EXPORTED FUNCTIONS (Member 2 calls these)
export async function sendAnnouncement(chatIds, announcement) {
  try {
    if (!bot) return false;
    for (const chatId of chatIds) {
      if (chatId) {
        await bot.sendMessage(chatId, `[ANNOUNCEMENT] ${announcement.title}\n\n${announcement.body}`);
      }
    }
    return true;
  } catch (err) {
    console.error('[Bot] sendAnnouncement error:', err);
    return false;
  }
}

export async function sendDeadlineWarning(chatId, minutesLeft) {
  try {
    if (!bot || !chatId) return false;
    await bot.sendMessage(chatId, `WARNING: Only ${minutesLeft} minutes left until submission deadline!`);
    return true;
  } catch (err) {
    console.error('[Bot] sendDeadlineWarning error:', err);
    return false;
  }
}

export async function sendEventStart(chatId, eventName) {
  try {
    if (!bot || !chatId) return false;
    await bot.sendMessage(chatId, `The event ${eventName} has officially started! Good luck!`);
    return true;
  } catch (err) {
    console.error('[Bot] sendEventStart error:', err);
    return false;
  }
}

export async function sendResultsReady(chatId, rank, total) {
  try {
    if (!bot || !chatId) return false;
    await bot.sendMessage(chatId, `Results are out! Your team ranked #${rank} out of ${total} teams.`);
    return true;
  } catch (err) {
    console.error('[Bot] sendResultsReady error:', err);
    return false;
  }
}
