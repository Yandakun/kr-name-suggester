import type { NextPage } from 'next';
import { useState, ChangeEvent } from 'react';

// --- Type Definitions ---
interface KoreanName {
  id: number; name_hangul: string; romaja_rr: string; meaning_en_desc: string;
}
interface Celebrity {
  id: number; name_id: string; celebrity_name_romaja: string; celebrity_group_or_profession: string; image_url: string;
}
interface RecommendationResult {
  name: KoreanName; celebrity: Celebrity | null;
}
// Vercel build error fix: Explicitly define the API response structure to avoid 'any'
interface AnalyzeResponse {
    name: KoreanName;
    celebrity: Celebrity | null;
    message?: string;
}

// --- Props Type for InputForm ---
interface InputFormProps {
    gender: string | null;
    setGender: (gender: string | null) => void;
    age: string;
    setAge: (age: string) => void;
    photo: File | null;
    handlePhotoChange: (e: ChangeEvent<HTMLInputElement>) => void;
    isLoading: boolean;
    message: string;
    handleSubmit: () => void;
}


const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = (error) => reject(error);
});

// --- Main Component ---
const Home: NextPage = () => {
  const [gender, setGender] = useState<string | null>(null);
  const [age, setAge] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [recommendation, setRecommendation] = useState<RecommendationResult | null>(null);

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPhoto(e.target.files[0]);
      setMessage('');
      setRecommendation(null);
    }
  };

  const handleSubmit = async () => {
    if (!gender || !age || !photo) {
      setMessage('Please select gender, enter age, and upload a photo.');
      return;
    }
    setIsLoading(true);
    setMessage('');
    setRecommendation(null);
    try {
      const base64Image = await toBase64(photo);
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image, gender, age }),
      });
      
      // FIX: Explicitly cast the JSON result to the defined interface (AnalyzeResponse)
      const result: AnalyzeResponse = await response.json();

      if (!response.ok) {
        setMessage(result.message || 'An unknown error occurred.');
      } else {
        // Since 'result' is now correctly typed, we use its properties.
        setRecommendation({ name: result.name, celebrity: result.celebrity });
        setMessage('');
      }
    } catch (e: unknown) { // Use unknown for catch block for better typing
        if (e instanceof Error) {
            console.error(e);
        }
        setMessage('Failed to connect to the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setRecommendation(null);
    setPhoto(null);
    setMessage('');
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 font-sans">
      <header className="text-center mb-10">
        <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-kpop-pink via-kpop-purple to-kpop-blue animate-pulse">
          If I Were a Korean?
        </h1>
        <p className="mt-4 text-lg text-kpop-silver">Find your perfect Korean name based on your face!</p>
      </header>
      <main className="w-full max-w-sm">
        {recommendation ? (
          <ResultCard recommendation={recommendation} onReset={handleReset} />
        ) : (
          <InputForm {...{ gender, setGender, age, setAge, photo, handlePhotoChange, isLoading, message, handleSubmit }} />
        )}
      </main>
    </div>
  );
};

// --- Input Form Sub-Component ---
const InputForm = ({ gender, setGender, age, setAge, photo, handlePhotoChange, isLoading, message, handleSubmit }: InputFormProps) => {
    if (isLoading) {
        return (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 flex justify-center items-center h-[380px]">
                <Loader />
            </div>
        );
    }
    return (
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="flex-1"><label className="block text-kpop-silver mb-2 text-sm font-bold text-left">Gender</label><div className="grid grid-cols-2 gap-2"><button onClick={() => setGender('M')} className={`py-2 rounded-lg transition-all font-semibold ${gender === 'M' ? 'bg-kpop-blue text-white shadow-lg' : 'bg-white/10 hover:bg-white/20'}`}>M</button><button onClick={() => setGender('F')} className={`py-2 rounded-lg transition-all font-semibold ${gender === 'F' ? 'bg-kpop-pink text-white shadow-lg' : 'bg-white/10 hover:bg-white/20'}`}>F</button></div></div>
          <div className="flex-1"><label className="block text-kpop-silver mb-2 text-sm font-bold text-left">Age</label><input type="text" placeholder="Age" maxLength={3} value={age} onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, ''))} className="w-full p-2 bg-white/10 rounded-lg text-center font-semibold text-lg focus:ring-2 focus:ring-kpop-pink outline-none" /></div>
        </div>
        <div><label className="block text-kpop-silver mb-2 text-sm font-bold">Photo</label><label htmlFor="photo-upload" className="cursor-pointer w-full p-3 flex items-center justify-center gap-3 bg-white/10 rounded-lg border-2 border-dashed border-white/20 hover:bg-white/20 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-kpop-silver" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg><span className="text-kpop-silver font-semibold truncate">{photo ? photo.name : 'Upload your photo'}</span></label><input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} /></div>
        {message && <div className="text-center text-kpop-pink font-semibold p-3 bg-pink-500/10 rounded-lg">{message}</div>}
        <button onClick={handleSubmit} disabled={isLoading} className="w-full p-4 rounded-lg font-bold text-white bg-gradient-to-r from-kpop-purple to-kpop-pink hover:scale-105 transition-transform disabled:opacity-50">{isLoading ? 'Finding name...' : 'Get My Korean Name!'}</button>
      </div>
    );
};

// --- Result Card Sub-Component ---
const ResultCard = ({ recommendation, onReset }: { recommendation: RecommendationResult, onReset: () => void }) => (
  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center animate-fade-in-up">
    <h2 className="text-kpop-silver text-lg font-semibold">Your Korean name is...</h2>
    <p className="text-5xl font-black my-2 text-transparent bg-clip-text bg-gradient-to-r from-kpop-pink via-kpop-purple to-kpop-blue drop-shadow-lg">{recommendation.name.romaja_rr}</p>
    <p className="text-2xl text-kpop-silver font-semibold mb-8">({recommendation.name.name_hangul})</p>
    <div className="text-left space-y-5 mb-10 bg-black/20 p-6 rounded-lg">
      <div><h3 className="font-bold text-kpop-silver tracking-wider">Meaning</h3><p className="text-white/80">{recommendation.name.meaning_en_desc}</p></div>
      {recommendation.celebrity && (
        <div>
          <h3 className="font-bold text-kpop-silver tracking-wider">Famous namesake</h3>
          <div className="flex items-center gap-4 mt-2">
            {/* Reverted to a standard <img> tag to fix the build issue */}
            <img 
              src={recommendation.celebrity.image_url} 
              alt={recommendation.celebrity.celebrity_name_romaja}
              width={80} height={80}
              className="w-20 h-20 rounded-full object-cover border-2 border-kpop-pink"
            />
            <div>
              <p className="font-bold text-lg">{recommendation.celebrity.celebrity_name_romaja}</p>
              <p className="text-white/80">{recommendation.celebrity.celebrity_group_or_profession}</p>
            </div>
          </div>
        </div>
      )}
    </div>
    <button onClick={onReset} className="w-full p-3 rounded-lg font-bold text-white bg-white/20 hover:bg-white/30 transition-colors">Try Another Photo</button>
  </div>
);

// --- Loader Component ---
const Loader = () => (
    <div className="flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-kpop-pink border-t-transparent rounded-full animate-spin"></div>
        <p className="text-kpop-silver font-semibold">Finding the perfect name...</p>
    </div>
);

export default Home;
