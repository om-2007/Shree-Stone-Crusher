'use client';

import dynamic from 'next/dynamic';

const App = dynamic(() => import('../src/App'), {
  ssr: false,
  loading: () => (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-bg-surface">
      <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">
        Initializing Encrypted Database...
      </p>
    </div>
  ),
});

export default function Page() {
  return <App />;
}
