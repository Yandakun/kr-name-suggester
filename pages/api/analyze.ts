import type { NextApiRequest, NextApiResponse } from 'next';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { createClient } from '@supabase/supabase-js';

// --- Function to get Google Credentials ---
// This function ensures credentials are handled correctly on Vercel and locally.
function getGoogleCredentials() {
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    try {
      return { credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON) };
    } catch (e) {
      console.error("Failed to parse GOOGLE_CREDENTIALS_JSON:", e);
      return {};
    }
  }
  // This will work locally if GOOGLE_APPLICATION_CREDENTIALS is set in .env.local
  return {};
}

// --- Initialize Clients ---
const visionClient = new ImageAnnotatorClient(getGoogleCredentials());
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export const config = {
  api: { bodyParser: { sizeLimit: '4mb' } },
};

// --- The Main Handler ---
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { image, gender, age } = req.body;
    if (!image || !gender || !age) {
      return res.status(400).json({ success: false, message: 'Image, gender, and age are required.' });
    }

    // --- AI Analysis Logic ---
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

    // --- Supabase Query Logic ---
    const query = supabase
      .from('korean_names')
      .select('*')
      .like('vibe_tags', `%${vibeTag}%`);
    
    if (gender === 'U') {
        query.eq('gender_primary', 'U');
    } else {
        query.in('gender_primary', [gender, 'U']);
    }

    const { data: names, error: nameError } = await query;
    if (nameError) throw nameError;
    if (!names || names.length === 0) {
      return res.status(404).json({ success: false, message: "Sorry, we couldn't find a matching name for your vibe." });
    }
    
    const recommendedName = names[Math.floor(Math.random() * names.length)];

    res.status(200).json({ 
        success: true, 
        name: recommendedName,
        celebrity: null // This can be enhanced later if needed
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error('Error in recommendation API:', errorMessage);
    res.status(500).json({ success: false, message: 'An error occurred during the recommendation process.' });
  }
}

