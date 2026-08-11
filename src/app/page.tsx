'use client';

import { useState, useEffect } from 'react';
import { parseRawText, ParsedTask } from '@/utils/parser';
import { 
  Sparkles, 
  Play, 
  Trash2, 
  FileText,
  Info,
  ExternalLink,
  Edit3,
  RefreshCw,
  Heart,
  MessageSquare,
  CheckCheck,
  AlertCircle,
  Copy,
  Smartphone,
  Check
} from 'lucide-react';

interface LiveStatus {
  isLiked: boolean;
  isCommented: boolean;
  updatedAt: number;
}

export default function Home() {
  const [rawText, setRawText] = useState('');
  const [tasks, setTasks] = useState<ParsedTask[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExtensionConnected, setIsExtensionConnected] = useState(false);
  const [liveStatuses, setLiveStatuses] = useState<Record<string, LiveStatus>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  // Detect mobile / tablet device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase()) || window.innerWidth < 768;
      setIsMobileDevice(isMobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Poll live Like/Comment status from backend API
  const fetchStatuses = async () => {
    try {
      const res = await fetch('/api/status-sync');
      if (res.ok) {
        const data = await res.json();
        if (data.statuses) {
          setLiveStatuses(data.statuses);
        }
      }
    } catch (err) {
      console.error('[DASHBOARD] Error polling statuses:', err);
    }
  };

  useEffect(() => {
    fetchStatuses();
    const interval = setInterval(fetchStatuses, 1200);

    const handleExtensionMsg = (event: MessageEvent) => {
      if (event.data && event.data.type === 'LIKOM_EXTENSION_READY') {
        if (!isExtensionConnected) {
          setIsExtensionConnected(true);
        }
      }
    };

    window.addEventListener('message', handleExtensionMsg);

    return () => {
      clearInterval(interval);
      window.removeEventListener('message', handleExtensionMsg);
    };
  }, [isExtensionConnected]);

  // Toast notification helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Sample data provided by user
  const loadSampleData = () => {
    const sample = `0 M + @melz.oei
(komen emot aja)
https://www.instagram.com/reel/DbrClWOTCaE/
0 Rz + @adhikarozi
https://www.instagram.com/p/BW3xMl_gzEp/
5 2345 + @lourensiaaa lb @titiplouren
(tanya rasa di suntik, harga, fasilitas dll)
https://www.instagram.com/reel/DbxBUOISw66/`;
    setRawText(sample);
  };

  // Process the input text and parse into tasks
  const handleProcess = () => {
    if (!rawText.trim()) return;
    setIsProcessing(true);

    setTimeout(() => {
      const parsedTasks = parseRawText(rawText);
      setTasks(parsedTasks);
      setIsProcessing(false);
      fetchStatuses();
    }, 300);
  };

  // Update instruction
  const handleInstructionChange = (id: string, newInstruction: string) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === id ? { ...task, instruction: newInstruction } : task
      )
    );
  };

  // Execute task (Direct & Synchronous to avoid pop-up blocking)
  const handleExecute = async (id: string, url: string, instruction: string) => {
    const cleanInstruction = instruction.trim();
    const match = url.match(/\/(?:p|reel)\/([a-zA-Z0-9_\-]+)/);
    const postId = match ? match[1] : null;

    if (isExtensionConnected && postId) {
      // Desktop + Extension Mode: Auto-like & Auto-comment via extension
      window.postMessage({
        type: 'LIKOM_OPEN_TAB',
        url: url,
        postId: postId,
        instruction: cleanInstruction
      }, '*');
      showToast('🚀 Tab Instagram dibuka via Ekstensi!');
    } else {
      // Mobile / Non-extension mode: Open tab IMMEDIATELY to bypass popup blocker
      window.open(url, '_blank', 'noreferrer,noopener');

      // Simultaneously generate and copy AI comment to clipboard
      try {
        const res = await fetch('/api/generate-smart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instruction: cleanInstruction, caption: '' })
        });
        const data = await res.json();
        if (data.comment) {
          await navigator.clipboard.writeText(data.comment);
          setCopiedId(id);
          setTimeout(() => setCopiedId(null), 3000);
          showToast(`📋 Komentar tersalin: "${data.comment}". Silakan Paste di Instagram!`);
        }
      } catch (err) {
        console.error('Error generating AI comment:', err);
      }
    }

    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === id ? { ...task, status: 'executing' as const } : task
      )
    );
  };

  // Auto-execute the next uncompleted task
  const handleExecuteNext = () => {
    const uncompletedTask = tasks.find(t => {
      const st = liveStatuses[t.postId];
      return !(st?.isLiked && st?.isCommented);
    });

    if (uncompletedTask) {
      handleExecute(uncompletedTask.id, uncompletedTask.url, uncompletedTask.instruction);
    } else if (tasks.length > 0) {
      alert('Semua tugas LIKOM pada daftar ini sudah selesai!');
    }
  };

  // Manually toggle/mark status for mobile users
  const handleManualToggleStatus = async (postId: string, currentLiked: boolean, currentCommented: boolean) => {
    const nextState = !(currentLiked && currentCommented);
    try {
      await fetch('/api/status-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          isLiked: nextState,
          isCommented: nextState
        })
      });
      fetchStatuses();
    } catch (err) {
      console.error('Manual status toggle error:', err);
    }
  };

  // Reset dashboard state
  const handleReset = () => {
    setRawText('');
    setTasks([]);
  };

  // Apply instruction to all tasks at once
  const handleApplyAllInstructions = (preset: string) => {
    setTasks(prevTasks =>
      prevTasks.map(task => ({ ...task, instruction: preset }))
    );
  };

  // Calculate statistics
  const totalTasks = tasks.length;
  let likedCount = 0;
  let commentedCount = 0;
  let likomDoneCount = 0;

  tasks.forEach(task => {
    const st = liveStatuses[task.postId];
    if (st) {
      if (st.isLiked) likedCount++;
      if (st.isCommented) commentedCount++;
      if (st.isLiked && st.isCommented) likomDoneCount++;
    }
  });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-20">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 left-5 md:left-auto z-50 bg-gradient-to-r from-purple-700 to-indigo-700 text-white px-4 py-3 rounded-xl shadow-2xl border border-purple-400/30 text-xs sm:text-sm font-medium flex items-center justify-between animate-fade-in">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-3 font-bold opacity-80 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-pink-500 to-purple-600 p-2 rounded-xl text-white shadow-lg shadow-pink-500/20">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="font-bold text-base sm:text-lg leading-tight text-white flex items-center gap-2">
                LIKOM Assistant <span className="text-[10px] sm:text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">v1.3 Pro</span>
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-400">Otomatisasi Like & Komen Sesuai Caption</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isExtensionConnected ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-full text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="font-medium hidden sm:inline">Ekstensi Active: Auto-Like & Auto-Komen</span>
                <span className="font-medium sm:hidden">Extension Active</span>
              </div>
            ) : isMobileDevice ? (
              <div className="bg-blue-500/10 border border-blue-500/30 text-blue-400 px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" />
                <span className="font-medium">Mode HP / Tablet Active</span>
              </div>
            ) : (
              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 px-3 py-1.5 rounded-full text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="hidden sm:inline">Harap buka <code className="bg-amber-950 px-1 py-0.5 rounded text-amber-200">chrome://extensions/</code> lalu klik <b>Segarkan (↺)</b></span>
                <span className="sm:hidden">Muat Ekstensi</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Input Form */}
        <section className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs sm:text-sm font-semibold text-slate-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" />
                Input Text LIKOM
              </label>
              <button 
                onClick={loadSampleData}
                className="text-xs text-purple-400 hover:text-purple-300 transition-colors underline"
              >
                Muat Contoh Text
              </button>
            </div>
            
            <textarea
              className="w-full h-56 sm:h-72 bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs font-mono text-slate-300 focus:outline-none focus:border-purple-500 transition-colors resize-y"
              placeholder="Paste format tugas LIKOM di sini..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            />

            <div className="mt-4 flex gap-3">
              <button
                onClick={handleProcess}
                disabled={!rawText.trim() || isProcessing}
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-4 py-3 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.99]"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    Proses Daftar LIKOM
                  </>
                )}
              </button>

              <button
                onClick={handleReset}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium text-xs sm:text-sm transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Guide Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 space-y-2">
            <h4 className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-purple-400" /> Petunjuk Penggunaan:
            </h4>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li><b>Di Laptop/PC:</b> Gunakan Ekstensi Chrome untuk Auto-Like & Auto-Komen otomatis saat klik Eksekusi.</li>
              <li><b>Di HP / Tablet:</b> Klik <b className="text-purple-300">Eksekusi (Buka IG)</b> $\rightarrow$ Komentar AI akan <b>otomatis tersalin ke Clipboard HP</b> & Aplikasi Instagram terbuka $\rightarrow$ Tinggal <b>Paste & Kirim!</b></li>
              <li><b>Jika Pop-up Terblokir di HP:</b> Izinkan pop-up di browser HP ("Selalu Tampilkan / Always Allow").</li>
            </ul>
          </div>
        </section>

        {/* Right Column: Parsed Results */}
        <section className="lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-sm sm:text-base text-slate-200">
                Daftar Tautan ({tasks.length})
              </h2>
              {tasks.length > 0 && (
                <span className="text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full font-medium">
                  {likomDoneCount} / {totalTasks} Selesai
                </span>
              )}
            </div>

            {tasks.length > 0 && (
              <button
                onClick={handleExecuteNext}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-emerald-900/30 w-full sm:w-auto"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Eksekusi Tautan Berikutnya
              </button>
            )}
          </div>

          {/* Quick Presets for Instructions */}
          {tasks.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-400 font-medium mr-1">Set Panjang Komen:</span>
              <button 
                onClick={() => handleApplyAllInstructions('Komen 3-4 kata sesuai isi caption')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded border border-purple-500/20 transition-colors"
              >
                3-4 Kata
              </button>
              <button 
                onClick={() => handleApplyAllInstructions('Komen 5-6 kata sesuai isi caption')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded border border-purple-500/20 transition-colors"
              >
                5-6 Kata
              </button>
              <button 
                onClick={() => handleApplyAllInstructions('Komen pendek 1-3 kata yang relevan')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded border border-purple-500/20 transition-colors"
              >
                Pendek (1-3 Kata)
              </button>
            </div>
          )}

          {tasks.length === 0 ? (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-10 sm:p-14 text-center text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-600 opacity-50" />
              <p className="text-sm font-medium">Belum ada tugas yang diproses</p>
              <p className="text-xs text-slate-600 mt-1">
                Masukkan format teks di sebelah kiri lalu klik "Proses Daftar LIKOM"
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {tasks.map((task, index) => {
                const live = liveStatuses[task.postId] || { isLiked: false, isCommented: false };
                const isFullyDone = live.isLiked && live.isCommented;

                return (
                  <div
                    key={task.id}
                    className={`border rounded-xl p-4 transition-all duration-200 ${
                      isFullyDone
                        ? 'bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-950/20'
                        : task.status === 'executing'
                        ? 'bg-purple-950/20 border-purple-500/40'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-xs font-mono">
                            #{index + 1}
                          </span>
                          <span className="font-semibold text-slate-200 text-sm">
                            Post: {task.postId}
                          </span>

                          {/* Status Badge */}
                          {isFullyDone ? (
                            <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                              LIKOM SELESAI
                            </span>
                          ) : (
                            <span className="bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs px-2 py-0.5 rounded-full">
                              Belum Selesai
                            </span>
                          )}
                        </div>

                        {/* Realtime Like & Comment status indicators */}
                        <div className="flex items-center gap-3 pt-1 text-xs">
                          <button
                            onClick={() => handleManualToggleStatus(task.postId, live.isLiked, live.isCommented)}
                            className={`flex items-center gap-1.5 font-medium hover:opacity-80 transition-opacity ${live.isLiked ? 'text-rose-400' : 'text-slate-500'}`}
                          >
                            <Heart className={`w-3.5 h-3.5 ${live.isLiked ? 'fill-rose-500 text-rose-500' : 'text-slate-500'}`} />
                            {live.isLiked ? 'Sudah Di-Like' : 'Belum Like'}
                          </button>
                          <button
                            onClick={() => handleManualToggleStatus(task.postId, live.isLiked, live.isCommented)}
                            className={`flex items-center gap-1.5 font-medium hover:opacity-80 transition-opacity ${live.isCommented ? 'text-emerald-400' : 'text-slate-500'}`}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            {live.isCommented ? 'Sudah Di-Komen' : 'Belum Komen'}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleExecute(task.id, task.url, task.instruction)}
                          className={`w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md ${
                            isFullyDone 
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700' 
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                          }`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          {isFullyDone ? 'Buka Ulang' : 'Eksekusi (Buka IG)'}
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-slate-400 truncate mb-3 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                      <a href={task.url} target="_blank" rel="noreferrer" className="hover:underline text-indigo-400">
                        {task.url}
                      </a>
                    </div>

                    <div className="space-y-1.5 bg-slate-950/30 p-2.5 rounded-lg border border-slate-800/50">
                      <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                        <Edit3 className="w-3 h-3 text-purple-400" /> Instruksi AI (Bisa Diedit):
                      </label>
                      <input
                        type="text"
                        value={task.instruction}
                        onChange={(e) => handleInstructionChange(task.id, e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
