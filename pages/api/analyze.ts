import type { NextApiRequest, NextApiResponse } from 'next';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- Initialize Clients ---
function getGoogleCredentials() {
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    try {
      return { credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON) };
    } catch (e) { console.error("Failed to parse GOOGLE_CREDENTIALS_JSON:", e); return {}; }
  }
  return {};
}
const visionClient = new ImageAnnotatorClient(getGoogleCredentials());
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// --- Rate Limiter ---
async function checkRateLimit(ip: string, db: SupabaseClient): Promise<boolean> {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { error, count } = await db.from('api_logs').select('*', { count: 'exact', head: true }).eq('ip_address', ip).gte('created_at', oneMinuteAgo);
    if (error) { console.error("Rate limit check error:", error); return false; }
    if (count !== null && count >= 5) return false;
    await db.from('api_logs').insert({ ip_address: ip });
    return true;
}

export const config = { api: { bodyParser: { sizeLimit: '4mb' } } };

// --- The Main Handler ---
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const isAllowed = await checkRateLimit(ip, supabase);
  if (!isAllowed) {
    return res.status(429).json({ success: false, message: "You are trying too fast! Please wait a moment." });
  }

  try {
    const { image, gender, age } = req.body;
    if (!image || !gender || !age) {
      return res.status(400).json({ success: false, message: 'Image, gender, and age are required.' });
    }

    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    // ★  DEBUG MODE SWITCH (RESTORED!)      ★
    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    if (age === '999') {
      const debugNameId = 'seojun_서준'; 
      console.log(`🚀 DEBUG MODE ACTIVATED: Forcing '${debugNameId}' result.`);
      
      const { data: nameData, error: nameError } = await supabase.from('korean_names').select('*').eq('name_id', debugNameId).single();
      if(nameError || !nameData) {
        console.error("Debug name data error:", nameError);
        return res.status(404).json({ success: false, message: `Debug name data for '${debugNameId}' not found.` });
      }

      const { data: celebData, error: celebError } = await supabase.from('celebrities').select('*').eq('name_id', debugNameId).single();
      if(celebError) {
          console.warn(`Could not find celebrity debug data for '${debugNameId}', but that's okay.`, celebError.message);
      }

      return res.status(200).json({ success: true, name: nameData, celebrity: celebData || null });
    }
    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    
    // --- Normal Logic ---
    const base64Image = image.replace(/^data:image\/\w+;base64,/, '');
    const [result] = await visionClient.annotateImage({
      image: { content: base64Image }, features: [{ type: 'FACE_DETECTION' }],
    });
    const faces = result.faceAnnotations;
    if (!faces || faces.length !== 1) {
      return res.status(400).json({ success: false, message: `Expected 1 face, but found ${faces?.length || 0}.` });
    }
    const face = faces[0];
    let vibeTag = 'friendly';
    if (face.joyLikelihood === 'VERY_LIKELY' || face.joyLikelihood === 'LIKELY') vibeTag = 'friendly';
    else if (face.sorrowLikelihood === 'VERY_LIKELY' || face.sorrowLikelihood === 'LIKELY') vibeTag = 'calm';
    else if (face.angerLikelihood === 'VERY_LIKELY' || face.angerLikelihood === 'LIKELY') vibeTag = 'cool';

    const { data: names, error: nameError } = await supabase.from('korean_names').select('*').eq('gender_primary', gender).like('vibe_tags', `%${vibeTag}%`);
    if (nameError) throw nameError;
    if (!names || names.length === 0) {
      return res.status(404).json({ success: false, message: "Sorry, we couldn't find a matching name for your vibe." });
    }
    
    const recommendedName = names[Math.floor(Math.random() * names.length)];

    const fullNameId = recommendedName.name_id;
    const baseNameId = fullNameId.replace(/_\d+$/, '');

    const { data: celebrityData } = await supabase
      .from('celebrities')
      .select('*')
      .eq('name_id', baseNameId)
      .limit(1);
    
    const celebrity = celebrityData && celebrityData.length > 0 ? celebrityData[0] : null;

    res.status(200).json({ 
        success: true, 
        name: recommendedName,
        celebrity: celebrity
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error('Error in recommendation API:', errorMessage);
    res.status(500).json({ success: false, message: 'An error occurred during the recommendation process.' });
  }
}

