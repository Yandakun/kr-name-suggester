import type { GetServerSideProps, NextPage } from 'next';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import Head from 'next/head';
import { useRef } from 'react'; // We only need useRef for this component

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

interface ResultPageProps {
    recommendation: RecommendationResult | null;
}

// This is a simplified version of the ResultCard for the shared page.
// It does not need any interactive state (useState) or side effects (useEffect).
const StaticResultCard = ({ recommendation }: { recommendation: RecommendationResult }) => {
    const cardRef = useRef<HTMLDivElement>(null);

    return (
        <div className="animate-fade-in-up">
            <div ref={cardRef} className="bg-gradient-to-br from-gray-900 via-purple-900 to-black rounded-2xl p-8 text-center">
                <h2 className="text-kpop-silver text-lg font-semibold">A Korean name was generated for a friend!</h2>
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

             <div className="mt-6">
                <Link href="/" className="w-full block p-4 rounded-lg font-bold text-white bg-kpop-purple hover:scale-105 transition-transform text-center">
                    Create Your Own Name!
                </Link>
            </div>
        </div>
    );
};


// --- The Page Component ---
const ResultPage: NextPage<ResultPageProps> = ({ recommendation }) => {

    if (!recommendation) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
                 <Head>
                    <title>Name Not Found | If I Were a Korean?</title>
                </Head>
                <h2 className="text-2xl font-bold text-kpop-pink">Sorry, name not found.</h2>
                <p className="text-kpop-silver mt-2">The result you are looking for might have been moved or does not exist.</p>
                <Link href="/" className="mt-8 px-6 py-3 rounded-lg font-bold text-white bg-kpop-purple">
                    Try it yourself!
                </Link>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 font-sans">
             <Head>
                <title>{recommendation.name.romaja_rr} | My Korean Name Result</title>
                <meta name="description" content={recommendation.name.meaning_en_desc} />
            </Head>
            <header className="text-center mb-10">
                <Link href="/">
                    <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-kpop-pink via-kpop-purple to-kpop-blue animate-pulse">
                        If I Were a Korean?
                    </h1>
                </Link>
            </header>
            <main className="w-full max-w-sm">
                <StaticResultCard recommendation={recommendation} />
            </main>
        </div>
    );
};


// --- Server-Side Data Fetching ---
export const getServerSideProps: GetServerSideProps = async (context) => {
    const { id } = context.params || {};

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!id || !supabaseUrl || !supabaseAnonKey) {
        return { props: { recommendation: null } };
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: nameData } = await supabase
        .from('korean_names')
        .select('*')
        .eq('id', id)
        .single();

    if (!nameData) {
        return { props: { recommendation: null } };
    }

    const { data: celebData } = await supabase
        .from('celebrities')
        .select('*')
        .eq('name_id', nameData.name_id)
        .single();
    
    const recommendation = {
        name: nameData,
        celebrity: celebData || null
    };

    return {
        props: {
            recommendation,
        },
    };
};

export default ResultPage;

