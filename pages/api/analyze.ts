import type { NextApiRequest, NextApiResponse } from 'next';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { createClient } from '@supabase/supabase-js';

// --- Function to get Google Credentials ---
function getGoogleCredentials() {
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    try {
      const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
      return { credentials };
    } catch (e) {
      console.error("Failed to parse GOOGLE_CREDENTIALS_JSON:", e);
      return {};
    }
  }
  return {};
}

// --- Initialize Clients ---
const visionClient = new ImageAnnotatorClient(getGoogleCredentials());
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// --- API Configuration ---
export const config = {
  api: { bodyParser: { sizeLimit: '4mb' } },
};

// --- The Main Handler ---
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { image, gender, age } = req.body;
    if (!image || !gender || !age) {
      return res.status(400).json({ message: 'Image, gender, and age are required.' });
    }

    // ★★★ DEBUG MODE SWITCH ★★★
    if (age === '999') {
      const debugNameId = 'seojun_서준'; 
      console.log(`🚀 DEBUG MODE: Forcing '${debugNameId}' result.`);
      const { data: nameData } = await supabase.from('korean_names').select('*').eq('name_id', debugNameId).single();
      
      // FIX 1: 'celebData' changed to const
      const { data: celebData } = await supabase.from('celebrities').select('*').eq('name_id', debugNameId).single();
      
      return res.status(200).json({ success: true, name: nameData, celebrity: celebData || null });
    }
    
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
    
    // vibeTag changed to const
    const vibeTag = (face.joyLikelihood === 'VERY_LIKELY' || face.joyLikelihood === 'LIKELY') 
        ? 'friendly'
        : (face.sorrowLikelihood === 'VERY_LIKELY' || face.sorrowLikelihood === 'LIKELY')
            ? 'calm'
            : (face.angerLikelihood === 'VERY_LIKELY' || face.angerLikelihood === 'LIKELY')
                ? 'cool'
                : 'friendly'; 

    const { data: names, error: nameError } = await supabase.from('korean_names').select('*').eq('gender_primary', gender).like('vibe_tags', `%${vibeTag}%`);
    if (nameError) throw nameError;
    if (!names || names.length === 0) {
      return res.status(404).json({ success: false, message: "Sorry, we couldn't find a matching name for your vibe." });
    }
    
    const recommendedName = names[Math.floor(Math.random() * names.length)];
    
    // FIX 2: 'celebrityData' changed to const
    const { data: celebrityData } = await supabase.from('celebrities').select('*').eq('name_id', recommendedName.name_id).limit(1);
    
    // FIX 3: 'celebrity' changed to const
    const celebrity = celebrityData && celebrityData.length > 0 ? celebrityData[0] : null;

    res.status(200).json({ success: true, name: recommendedName, celebrity: celebrity });

  } catch (error) { 
    if (error instanceof Error) {
        console.error('Error in recommendation API:', error.message);
        res.status(500).json({ success: false, message: `Server error: ${error.message}` });
    } else {
        console.error('An unknown error occurred:', error);
        res.status(500).json({ success: false, message: 'An unknown error occurred during the recommendation process.' });
    }
  }
}
