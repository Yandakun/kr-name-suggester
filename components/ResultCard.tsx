import { useRef, useState, useEffect } from 'react';

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
  celebrities: Celebrity[]; // Expect an array
}
interface ResultCardProps {
    recommendation: RecommendationResult;
    onReset: () => void;
    isSharePage?: boolean; 
}

// --- Result Card Component with Final Simplified Share System ---
const ResultCard = ({ recommendation, onReset, isSharePage = false }: ResultCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(/android/i.test(navigator.userAgent) || /iPad|iPhone|iPod/.test(navigator.userAgent));
  }, []);

  const generateImageBlob = async (): Promise<Blob | null> => {
    if (!cardRef.current || !window.htmlToImage) { return null; }
    const dataUrl = await window.htmlToImage.toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
    return await (await fetch(dataUrl)).blob();
  };

  const showFeedback = (msg: string) => {
    setShareMessage(msg);
    setTimeout(() => setShareMessage(''), 2500);
  };

  const handleDownload = async () => {
    setIsSharing(true);
    try {
      const blob = await generateImageBlob();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'my-korean-name.png';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showFeedback('Failed to create image.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const shareUrl = `${window.location.origin}/result/${recommendation.name.id}`;
      if (navigator.share) {
        await navigator.share({
          title: 'My Korean Name!',
          text: `I got '${recommendation.name.romaja_rr}' as my Korean name! Check it out:`,
          url: shareUrl,
        });
      } else {
        navigator.clipboard.writeText(shareUrl);
        showFeedback('Link Copied to Clipboard!');
      }
    } catch (err) {
      showFeedback('Sharing failed.');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="animate-fade-in-up">
      <div ref={cardRef} className="bg-gradient-to-br from-gray-900 via-purple-900 to-black rounded-2xl p-8 text-center">
        <h2 className="text-kpop-silver text-lg font-semibold">
            {isSharePage ? "A friend shared their Korean name!" : "Your Korean name is..."}
        </h2>
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
          {recommendation.celebrities && recommendation.celebrities.length > 0 && (
            <div>
              <h3 className="font-bold text-kpop-silver tracking-wider">
                Famous namesakes
              </h3>
              <div className="space-y-4 mt-2">
                {recommendation.celebrities.map((celeb) => (
                  <div key={celeb.id} className="flex items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={celeb.image_url} alt={celeb.celebrity_name_romaja} width={80} height={80} className="w-16 h-16 rounded-full object-cover border-2 border-kpop-pink"/>
                    <div>
                      <p className="font-bold text-lg">
                        {celeb.celebrity_name_romaja}
                      </p>
                      <p className="text-white/80 text-sm">
                        {celeb.celebrity_group_or_profession}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-3 relative">
        {shareMessage && (<div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-kpop-blue text-white text-xs font-bold px-3 py-1 rounded-full animate-fade-in-out">
            {shareMessage}
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-3">
            <button onClick={handleShare} disabled={isSharing} className="w-full p-4 flex items-center justify-center gap-2 rounded-lg font-bold text-white bg-kpop-purple hover:scale-105 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                <span>{isSharing ? '...' : 'Share'}</span>
            </button>
            <button onClick={handleDownload} disabled={isSharing} className="w-full p-3 rounded-lg font-bold text-white bg-white/20 hover:bg-white/30">
                Download Image
            </button>
        </div>

        <button onClick={onReset} className="w-full p-2 rounded-lg font-bold text-white/50 bg-transparent hover:bg-white/10 transition-colors text-xs mt-2">
            {isSharePage ? "Create Your Own Name!" : "Try Another Photo"}
        </button>
      </div>
    </div>
  );
};

export default ResultCard;

