'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import AnalyticsChart from '../components/AnalyticsChart';

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get('/api/saas/dashboard');
        setStats(res.data);
      } catch { /* ignora */ }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <>
      <header className="sticky top-14 z-10 bg-page/80 backdrop-blur-xl border-b border-border-subtle">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <Link
            href="/saas"
            className="text-text-muted hover:text-text-primary p-1.5 rounded-lg hover:bg-hover-bg transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="p-2 rounded-xl bg-purple-500/15">
            <BarChart3 size={18} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary">Analytics de marketing</h1>
            <p className="text-[11px] text-text-muted">Visitas, signups e taxa de conversão</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 relative z-10">
        <AnalyticsChart analitico={stats?.analitico} loading={loading} forceOpen />
      </main>
    </>
  );
}
