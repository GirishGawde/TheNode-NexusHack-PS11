import puppeteer from 'puppeteer';
import { supabase } from '../../config/supabase.js';

export async function generateCertificate(data) {
  try {
    const { 
      participantName, eventName, eventDate,
      teamName, rank, totalTeams, logoUrl,
      primaryColor, organiserName, userId, 
      eventId 
    } = data;
    
    const isTopThree = rank && rank <= 3;
    const certType = isTopThree 
      ? 'Certificate of Achievement'
      : 'Certificate of Participation';
    
    const accent = primaryColor || '#7C3AED';
    const fallbackLogo = 'https://via.placeholder.com/150?text=Event+Logo';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
          body {
            margin: 0;
            padding: 0;
            background-color: #0A0A0F;
            color: #FFFFFF;
            font-family: 'Inter', sans-serif;
            width: 1123px;
            height: 794px;
            display: flex;
            justify-content: center;
            align-items: center;
            position: relative;
            overflow: hidden;
          }
          .border {
            position: absolute;
            top: 20px; bottom: 20px; left: 20px; right: 20px;
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            pointer-events: none;
          }
          .accent-glow {
            position: absolute;
            top: -50%; left: -50%; width: 200%; height: 200%;
            background: radial-gradient(circle at center, ${accent}22 0%, transparent 50%);
            z-index: 0;
          }
          .content {
            z-index: 1;
            text-align: center;
            max-width: 800px;
            padding: 40px;
          }
          .logo {
            max-height: 80px;
            margin-bottom: 30px;
          }
          .cert-type {
            color: ${accent};
            font-size: 24px;
            font-weight: 600;
            letter-spacing: 4px;
            text-transform: uppercase;
            margin-bottom: 40px;
          }
          .presented-to {
            color: #94A3B8;
            font-size: 18px;
            margin-bottom: 20px;
          }
          .name {
            font-size: 64px;
            font-weight: 800;
            background: linear-gradient(135deg, #FFFFFF 0%, #A5B4FC 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin: 0 0 30px 0;
            line-height: 1.2;
          }
          .description {
            color: #E2E8F0;
            font-size: 20px;
            line-height: 1.6;
            margin-bottom: 40px;
          }
          .rank-badge {
            display: inline-block;
            background: ${accent}33;
            border: 1px solid ${accent};
            color: ${accent};
            padding: 8px 24px;
            border-radius: 50px;
            font-weight: 600;
            font-size: 18px;
            margin-bottom: 40px;
          }
          .footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 60px;
            padding: 0 40px;
          }
          .signature-block {
            text-align: center;
          }
          .line {
            width: 200px;
            height: 1px;
            background-color: rgba(255, 255, 255, 0.2);
            margin-bottom: 10px;
          }
          .sig-name {
            font-weight: 600;
            font-size: 16px;
            color: #E2E8F0;
          }
          .sig-title {
            font-size: 14px;
            color: #94A3B8;
          }
          .powered-by {
            position: absolute;
            bottom: 40px;
            left: 0; right: 0;
            text-align: center;
            font-size: 12px;
            color: rgba(255, 255, 255, 0.3);
            letter-spacing: 2px;
          }
        </style>
      </head>
      <body>
        <div class="border"></div>
        <div class="accent-glow"></div>
        <div class="content">
          <img src="${logoUrl || fallbackLogo}" alt="Event Logo" class="logo" onerror="this.src='${fallbackLogo}'" />
          
          <div class="cert-type">${certType}</div>
          
          <div class="presented-to">This is proudly presented to</div>
          
          <h1 class="name">${participantName || 'Participant Name'}</h1>
          
          <div class="description">
            For their outstanding participation and contribution in <strong>${eventName || 'NexusHack Event'}</strong>
            as part of team <strong>${teamName || 'Unknown'}</strong>.
            <br>
            Held on ${eventDate || new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}.
          </div>
          
          ${isTopThree ? `<div class="rank-badge">Ranked #${rank} of ${totalTeams} Teams</div>` : ''}
          
          <div class="footer">
            <div class="signature-block">
              <div class="line"></div>
              <div class="sig-name">${organiserName || 'Event Organiser'}</div>
              <div class="sig-title">Lead Organiser</div>
            </div>
            
            <div class="signature-block">
              <div class="line"></div>
              <div class="sig-name">NexusHack Platform</div>
              <div class="sig-title">System Verified</div>
            </div>
          </div>
        </div>
        
        <div class="powered-by">POWERED BY NEXUSHACK</div>
      </body>
      </html>
    `;

    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(html, { 
      waitUntil: 'networkidle0' 
    });
    await page.setViewport({ width: 1123, height: 794 });
    const pdfBuffer = await page.pdf({
      width: '297mm', height: '210mm',
      printBackground: true
    });
    await browser.close();

    await supabase.storage
      .from('certificates')
      .upload(`${eventId}/${userId}.pdf`, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    const { data: { publicUrl } } = supabase.storage
      .from('certificates')
      .getPublicUrl(`${eventId}/${userId}.pdf`);

    await supabase.from('certificates').upsert({
      user_id: userId, 
      event_id: eventId,
      certificate_url: publicUrl,
      rank: rank || null
    });

    return publicUrl;
  } catch (err) {
    console.error('[Certificates] generateCertificate error:', err);
    return null;
  }
}
