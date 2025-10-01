import type { NextApiRequest, NextApiResponse } from 'next';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios'; // Import the new tool

// --- Initialize Clients ---
const visionClient = new ImageAnnotatorClient();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("CRITICAL: Supabase URL or Anon Key is not defined in .env.local");
}
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const config = {
  api: { bodyParser: { sizeLimit: '4mb' } },
};

// --- Helper function to convert an image URL to a temporary, safe Data URL ---
async function imageToDataURL(url: string) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data, 'binary').toString('base64');
    const mimeType = response.headers['content-type'];
    return `data:${mimeType};base64,${buffer}`;
  } catch (error) {
    console.error("Failed to fetch and convert image:", url);
    return null; // Return null if fetching fails
  }
}

// --- The Main Handler ---
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // ... (The top part of the handler is the same)
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });
  try {
    const { image, gender, age } = req.body;
    if (!image || !gender || !age) return res.status(400).json({ message: 'Image, gender, and age are required.' });

    // ★★★ DEBUG MODE ★★★
    if (age === '999') {
      const debugNameId = 'seojun_서준';
      const { data: nameData } = await supabase.from('korean_names').select('*').eq('name_id', debugNameId).single();
      let { data: celebData } = await supabase.from('celebrities').select('*').eq('name_id', debugNameId).single();
      
      if (celebData?.image_url) {
        celebData.image_url = await imageToDataURL(celebData.image_url) || celebData.image_url;
      }
      return res.status(200).json({ success: true, name: nameData, celebrity: celebData || null });
    }
    // ★★★ END DEBUG MODE ★★★

    // --- Normal Logic ---
    const base64Image = image.replace(/^data:image\/\w+;base64,/, '');
    const [result] = await visionClient.annotateImage({ image: { content: base64Image }, features: [{ type: 'FACE_DETECTION' }] });
    const faces = result.faceAnnotations;
    if (!faces || faces.length !== 1) return res.status(400).json({ success: false, message: `Expected 1 face, but found ${faces?.length || 0}.` });

    const face = faces[0];
    let vibeTag = 'friendly';
    if (face.joyLikelihood === 'VERY_LIKELY' || face.joyLikelihood === 'LIKELY') vibeTag = 'friendly';
    else if (face.sorrowLikelihood === 'VERY_LIKELY' || face.sorrowLikelihood === 'LIKELY') vibeTag = 'calm';
    else if (face.angerLikelihood === 'VERY_LIKELY' || face.angerLikelihood === 'LIKELY') vibeTag = 'cool';

    const { data: names, error: nameError } = await supabase.from('korean_names').select('*').eq('gender_primary', gender).like('vibe_tags', `%${vibeTag}%`);
    if (nameError) throw nameError;
    if (!names || names.length === 0) return res.status(404).json({ success: false, message: "Sorry, we couldn't find a matching name for your vibe." });
    
    const recommendedName = names[Math.floor(Math.random() * names.length)];
    let { data: celebrityData } = await supabase.from('celebrities').select('*').eq('name_id', recommendedName.name_id).limit(1);
    
    let celebrity = celebrityData && celebrityData.length > 0 ? celebrityData[0] : null;
    if (celebrity?.image_url) {
      celebrity.image_url = await imageToDataURL(celebrity.image_url) || celebrity.image_url;
    }

    res.status(200).json({ success: true, name: recommendedName, celebrity: celebrity });

  } catch (error: any) {
    console.error('Error in recommendation API:', error.message);
    res.status(500).json({ success: false, message: 'An error occurred during the recommendation process.' });
  }
}

