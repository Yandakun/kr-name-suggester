import type { NextPage } from 'next';
import { useState, ChangeEvent, useRef, useEffect } from 'react';

// --- Type Definitions ---
interface KoreanName {
  id: number;
  name_hangul: string;
  romaja_rr: string;
  meaning_en_desc: string;
  name_id: string; 
}
interface Celebrity {
  id: number;
  name_id: string;
  celebrity_name_romaja: string;
  celebrity_group_or_profession: string;
  image_url: string;
}
interface RecommendationResult {
  name: KoreanName;
  celebrity: Celebrity | null;
}
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

declare global {
  interface Window {
    htmlToImage: {
      toPng: (element: HTMLElement, options?: object) => Promise<string>;
    };
  }
}

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
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

  useEffect(() => {
    document.title = 'If I Were a Korean?';
    const scriptId = 'html-to-image-script';
    if (document.getElementById(scriptId)) return;
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.min.js';
    script.async = true;
    document.head.appendChild(script);
    return () => {
      const existingScript = document.getElementById(scriptId);
      if (existingScript) document.head.removeChild(existingScript);
    };
  }, []);

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
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.message || 'An unknown error occurred.');
      } else {
        setRecommendation({ name: result.name, celebrity: result.celebrity });
        setMessage('');
      }
    } catch (err) {
      console.error('handleSubmit error:', err);
      setMessage('Failed to connect to the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setRecommendation(null);
    setPhoto(null);
    setMessage('');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 font-sans">
      <header className="text-center mb-10">
        <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-kpop-pink via-kpop-purple to-kpop-blue animate-pulse">
          If I Were a Korean?
        </h1>
        <p className="mt-4 text-lg text-kpop-silver">
          Find your perfect Korean name based on your face!
        </p>
      </header>
      <main className="w-full max-w-sm">
        {recommendation ? (
          <ResultCard recommendation={recommendation} onReset={handleReset} />
        ) : (
          <InputForm
            gender={gender}
            setGender={setGender}
            age={age}
            setAge={setAge}
            photo={photo}
            handlePhotoChange={handlePhotoChange}
            isLoading={isLoading}
            message={message}
            handleSubmit={handleSubmit}
          />
        )}
      </main>
    </div>
  );
};

// --- Input Form Sub-Component ---
const InputForm = ({ gender, setGender, age, setAge, photo, handlePhotoChange, isLoading, message, handleSubmit,}: InputFormProps) => {
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
        <div className="flex-[1.5]">
          <label className="block text-kpop-silver mb-2 text-sm font-bold text-left">
            Gender
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => setGender('M')} className={`py-2 rounded-lg transition-all font-semibold ${ gender === 'M' ? 'bg-kpop-blue text-white shadow-lg' : 'bg-white/10 hover:bg-white/20'}`}>M</button>
            <button onClick={() => setGender('F')} className={`py-2 rounded-lg transition-all font-semibold ${ gender === 'F' ? 'bg-kpop-pink text-white shadow-lg' : 'bg-white/10 hover:bg-white/20'}`}>F</button>
            <button onClick={() => setGender('U')} className={`py-2 rounded-lg transition-all font-semibold ${ gender === 'U' ? 'bg-kpop-purple text-white shadow-lg' : 'bg-white/10 hover:bg-white/20'}`}>U</button>
          </div>
        </div>
        <div className="flex-1">
          <label className="block text-kpop-silver mb-2 text-sm font-bold text-left">
            Age
          </label>
          <input type="text" placeholder="Age" maxLength={3} value={age} onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, ''))} className="w-full p-2 bg-white/10 rounded-lg text-center font-semibold text-lg focus:ring-2 focus:ring-kpop-pink outline-none"/>
        </div>
      </div>
      <div>
        <label className="block text-kpop-silver mb-2 text-sm font-bold">
          Photo
        </label>
        <label htmlFor="photo-upload" className="cursor-pointer w-full p-3 flex items-center justify-center gap-3 bg-white/10 rounded-lg border-2 border-dashed border-white/20 hover:bg-white/20 transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-kpop-silver" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
          </svg>
          <span className="text-kpop-silver font-semibold truncate">
            {photo ? photo.name : 'Upload your photo'}
          </span>
        </label>
        <input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handlePhotoChange}/>
      </div>
      {message && (
        <div className="text-center text-kpop-pink font-semibold p-3 bg-pink-500/10 rounded-lg">
          {message}
        </div>
      )}
      <button onClick={handleSubmit} disabled={isLoading} className="w-full p-4 rounded-lg font-bold text-white bg-gradient-to-r from-kpop-purple to-kpop-pink hover:scale-105 transition-transform disabled:opacity-50">
        {isLoading ? 'Finding name...' : 'Get My Korean Name!'}
      </button>
    </div>
  );
};

// --- Result Card Sub-Component with Final Polished Share System ---
const ResultCard = ({ recommendation, onReset }: { recommendation: RecommendationResult; onReset: () => void; }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [shareMessage, setShareMessage] = useState('');

  useEffect(() => {
    setIsMobile(/android/i.test(navigator.userAgent) || /iPad|iPhone|iPod/.test(navigator.userAgent));
  }, []);

  const generateImageBlob = async (): Promise<Blob | null> => {
    if (!cardRef.current || !window.htmlToImage) {
      console.error('Share function called before library is ready.');
      return null;
    }
    const dataUrl = await window.htmlToImage.toPng(cardRef.current, {
      cacheBust: true,
      pixelRatio: 2,
    });
    const blob = await (await fetch(dataUrl)).blob();
    return blob;
  };

  const showFeedback = (msg: string) => {
    setShareMessage(msg);
    setTimeout(() => setShareMessage(''), 3000);
  };

  const handleDownload = async () => {
    setIsSharing(true);
    try {
      const blob = await generateImageBlob();
      if (!blob) {
        showFeedback('Image creation failed.');
        setIsSharing(false);
        return;
      }
      const url = URL.createObjectURL(blob);
      if (isMobile) {
        const newWindow = window.open(url);
        if (newWindow) {
          showFeedback("Long-press the image to save!");
        } else {
          showFeedback("Please allow pop-ups to save.");
        }
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = 'my-korean-name.png';
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Download failed:', err);
      showFeedback('Failed to create image.');
    } finally {
      if (!isMobile) setIsSharing(false);
    }
  };
  
  const handleShare = async () => {
    setIsSharing(true);
    try {
      const shareUrl = `${window.location.origin}/result/${recommendation.name.id}`;

      // This is the key logic change.
      // On mobile, use the universal share API. On desktop, copy the link.
      if (isMobile && navigator.share) {
        await navigator.share({
          title: 'My Korean Name!',
          text: `I got '${recommendation.name.romaja_rr}' as my Korean name! Check it out:`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        showFeedback('URL successfully copied. Share it with your friends!');
      }
    } catch (err) {
      console.error('Sharing failed:', err);
      showFeedback('Sharing failed. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="animate-fade-in-up">
      <div ref={cardRef} className="bg-gradient-to-br from-gray-900 via-purple-900 to-black rounded-2xl p-8 text-center">
        <h2 className="text-kpop-silver text-lg font-semibold">Your Korean name is...</h2>
        <p className="text-5xl font-black my-2 text-transparent bg-clip-text bg-gradient-to-r from-kpop-pink via-kpop-purple to-kpop-blue drop-shadow-lg">
          {recommendation.name.romaja_rr}
        </p>
        <p className="text-2xl text-kpop-silver font-semibold mb-8">
          ({recommendation.name.name_hangul})
        </p>
        <div className="text-left space-y-5 mb-10 bg-black/20 p-6 rounded-lg">
          <div>
            <h3 className="font-bold text-kpop-silver tracking-wider">Meaning</h3>
            <p className="text-white/80">{recommendation.name.meaning_en_desc}</p>
          </div>
          {recommendation.celebrity && (
            <div>
              <h3 className="font-bold text-kpop-silver tracking-wider">
                Famous namesake
              </h3>
              <div className="flex items-center gap-4 mt-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={recommendation.celebrity.image_url} alt={recommendation.celebrity.celebrity_name_romaja} width={80} height={80} className="w-20 h-20 rounded-full object-cover border-2 border-kpop-pink"/>
                <div>
                  <p className="font-bold text-lg">
                    {recommendation.celebrity.celebrity_name_romaja}
                  </p>
                  <p className="text-white/80">
                    {recommendation.celebrity.celebrity_group_or_profession}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-3 relative">
        {shareMessage && (<div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-kpop-blue text-white text-xs font-bold px-4 py-2 rounded-full animate-fade-in-out whitespace-nowrap">
            {shareMessage}
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-3">
            <button onClick={handleShare} disabled={isSharing} className="w-full p-4 flex items-center justify-center gap-2 rounded-lg font-bold text-white bg-kpop-purple hover:scale-105 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                <span>{isSharing ? '...' : 'Share'}</span>
            </button>
            <button onClick={handleDownload} disabled={isSharing} className="w-full p-3 rounded-lg font-bold text-white bg-white/20 hover:bg-white/30">
                {isMobile ? 'Save to Photos' : 'Download Image'}
            </button>
        </div>

        <button onClick={onReset} className="w-full p-2 rounded-lg font-bold text-white/50 bg-transparent hover:bg-white/10 transition-colors text-xs mt-2">
          Try Another Photo
        </button>
      </div>
    </div>
  );
};

// --- Loader Component ---
const Loader = () => (
    <div className="flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-kpop-pink border-t-transparent rounded-full animate-spin"></div>
        <p className="text-kpop-silver font-semibold">Finding the perfect name...</p>
    </div>
);

export default Home;

