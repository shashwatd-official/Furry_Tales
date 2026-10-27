import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function Home() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-card p-10 rounded-card shadow-soft border border-border max-w-md w-full flex flex-col items-center">
        <div className="w-16 h-16 mb-4 rounded-full bg-accent-blush/40 flex items-center justify-center text-primary text-3xl font-bold">
          🐾
        </div>
        <h1 className="text-4xl font-extrabold text-main font-heading mb-3 tracking-tight">
          Furry Tales
        </h1>
        <p className="text-muted text-sm leading-relaxed mb-6 font-sans">
          Where every animal has a story, and every adoption begins a new one.
        </p>
        <div className="inline-flex items-center px-4 py-2 rounded-full bg-accent-sage/20 text-main text-xs font-medium">
          Phase 0: Environment Ready
        </div>
      </div>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
