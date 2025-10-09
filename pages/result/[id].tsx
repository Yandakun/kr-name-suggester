import type { GetServerSideProps, NextPage } from 'next';
import { createClient } from '@supabase/supabase-js';
import ResultCard from '../../components/ResultCard';
import Link from 'next/link';
import Head from 'next/head';

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
  celebrities: Celebrity[]; // Expect an array now
}

interface ResultPageProps {
    recommendation: RecommendationResult | null;
}

// --- The Page Component ---
const ResultPage: NextPage<ResultPageProps> = ({ recommendation }) => {
    
    const handleReset = () => {
        window.location.href = '/';
    };

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
                <ResultCard recommendation={recommendation} onReset={handleReset} isSharePage={true} />
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
    
    // --- THIS IS THE CRITICAL FIX ---
    // Fetch ALL celebrities that match the base name_id
    const baseNameId = nameData.name_id.replace(/_\d+$/, '');
    const { data: celebData } = await supabase
      .from('celebrities')
      .select('*')
      .like('name_id', `${baseNameId}%`);
    
    // Construct the final object with the correct structure
    const recommendation = {
        name: nameData,
        celebrities: celebData || [] // Ensure it's always an array
    };

    return {
        props: {
            recommendation,
        },
    };
};

export default ResultPage;

