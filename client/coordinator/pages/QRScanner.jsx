import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../services/api';
import toast from 'react-hot-toast';
import { HiOutlineArrowLeft, HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineExclamationCircle, HiOutlineExclamation, HiOutlineRefresh, HiOutlineCamera } from 'react-icons/hi';

export default function QRScanner() {
  const { id: eventId } = useParams();
  const [eventTitle, setEventTitle] = useState('');
  const [scanning, setScanning] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [scanHistory, setScanHistory] = useState([]); 
  const scannerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    api.get(`/events/${eventId}`).then(({ data }) => setEventTitle(data.data.title)).catch(() => {});
    return () => stopScanner();
  }, [eventId]);

  const counts = { valid: 0, already_used: 0, wrong_event: 0, invalid: 0 };
  scanHistory.forEach((s) => { counts[s.status] = (counts[s.status] || 0) + 1; });

  const startScanner = async () => {
    try {
      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;
      setScanning(true);
      setResult(null);

      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          // STEP 1: Detect & Analyze
          await html5QrCode.pause();
          setAnalyzing(true);
          
          try {
            // Mock delay for "Analyzing" feel
            await new Promise(r => setTimeout(r, 800));
            
            const { data } = await api.get(`/tickets/verify/${eventId}/${decodedText}`);
            setResult(data);
            setAnalyzing(false);
            setShowModal(true);
            
            setScanHistory((prev) => [{
              id: Date.now(),
              ticketId: decodedText,
              status: data.status,
              message: data.message,
              user: data.user,
              event: data.event,
              ticketEvent: data.ticketEvent,
              time: new Date(),
            }, ...prev]);

            if (data.status === 'valid') {
              toast.success('Ticket Verified!', { id: 'scan-toast' });
              // SUCCESS: Stop the scanner
              setTimeout(async () => {
                await stopScanner();
              }, 1000);
            } else {
              if (data.status === 'wrong_event') toast.error('Wrong Event!', { id: 'scan-toast' });
              else toast(data.message || 'Check Status', { icon: '⚠️', id: 'scan-toast' });
            }
          } catch (err) {
            setAnalyzing(false);
            const errData = err.response?.data || { status: 'invalid', message: 'Verification failed' };
            setResult(errData);
            setShowModal(true);
            toast.error('Invalid Ticket', { id: 'scan-toast' });
            
            setScanHistory((prev) => [{
              id: Date.now(),
              ticketId: decodedText,
              status: errData.status || 'invalid',
              message: errData.message,
              user: errData.user,
              ticketEvent: errData.ticketEvent,
              time: new Date(),
            }, ...prev]);
          }
        }
      );
    } catch (err) {
      console.error('Scanner Error:', err);
      let errorMsg = 'Camera access denied or not available';
      
      if (err.name === 'NotAllowedError' || err === 'NotAllowedError') {
        errorMsg = 'Camera permission denied. Please allow camera access in your browser settings and refresh the page.';
      } else if (err.name === 'NotFoundError' || err === 'NotFoundError') {
        errorMsg = 'No camera hardware detected on this device.';
      } else if (err.includes?.('ConstraintNotSatisfiedError')) {
        errorMsg = 'Camera constraints not satisfied. Try using a different browser.';
      }
      
      toast.error(errorMsg, { duration: 6000 });
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
    setAnalyzing(false);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setResult(null);
    if (scanning && result?.status !== 'valid') {
      try { scannerRef.current?.resume(); } catch {}
    }
  };

  const statusConfig = {
    valid:        { icon: HiOutlineCheckCircle,          color: 'text-[#22C55E]', bg: 'bg-[#22C55E]/10 border-[#22C55E]/30', label: '✓ ENTRY VERIFIED' },
    wrong_event:  { icon: HiOutlineExclamation,          color: 'text-[#F97316]',  bg: 'bg-[#F97316]/10 border-[#F97316]/30',   label: '✗ WRONG EVENT' },
    already_used: { icon: HiOutlineExclamationCircle,    color: 'text-[#F59E0B]',   bg: 'bg-[#F59E0B]/10 border-[#F59E0B]/30',     label: '⚠ ALREADY CHECKED IN' },
    invalid:      { icon: HiOutlineXCircle,              color: 'text-[#EF4444]',     bg: 'bg-[#EF4444]/10 border-[#EF4444]/30',         label: '✗ INVALID QR' },
  };

  return (
    <div className="animate-fade-in space-y-8 bg-[#0F1117] min-h-[700px]">
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-[#94A3B8] hover:text-[#F1F5F9] transition-colors mb-2 rounded p-1 focus:outline-none focus:ring-2 focus:ring-[#6366F1]">
        <HiOutlineArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#F1F5F9] tracking-tight uppercase leading-none mb-2">QR Ticket Scanner</h1>
          <p className="text-sm font-medium text-[#94A3B8]">{eventTitle}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <style>{`
          @keyframes scanLine {
            0% { transform: translateY(0); opacity: 0; }
            5% { opacity: 1; }
            95% { opacity: 1; }
            100% { transform: translateY(250px); opacity: 0; }
          }
          .scan-line {
            height: 2px;
            width: 100%;
            background: linear-gradient(90deg, transparent, #6366F1, transparent);
            position: absolute;
            top: 0;
            left: 0;
            z-index: 10;
            box-shadow: 0 0 15px #6366F1;
            animation: scanLine 2s linear infinite;
          }
          .modal-enter { transform: scale(0.9); opacity: 0; }
          .modal-enter-active { transform: scale(1); opacity: 1; transition: all 300ms cubic-bezier(0.34, 1.56, 0.64, 1); }
        `}</style>

        {/* Session counter badges */}
        {scanHistory.length > 0 && (
          <div className="flex items-center justify-center gap-3 mb-6 flex-wrap bg-[#1A1D27] p-4 rounded-2xl border border-[#2E3348] shadow-lg">
            <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mr-2">Session:</span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border bg-[#22C55E]/10 border-[#22C55E]/30 text-[10px] font-bold uppercase tracking-wider text-[#22C55E]">
              {counts.valid} ✅
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border bg-[#EF4444]/10 border-[#EF4444]/30 text-[10px] font-bold uppercase tracking-wider text-[#EF4444]">
              {counts.invalid + counts.wrong_event + counts.already_used} ❌
            </span>
          </div>
        )}

        {/* Scanner viewport */}
        <div className="bg-[#1A1D27] border border-[#2E3348] p-6 rounded-3xl shadow-2xl mb-8 relative overflow-hidden group">
          <div className="relative rounded-xl overflow-hidden border border-[#2E3348]">
            <div id="qr-reader" ref={containerRef} style={{ minHeight: scanning ? '300px' : '0px' }} />
            
            {scanning && !analyzing && (
              <div className="scan-line pointer-events-none" />
            )}

            {analyzing && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0F1117]/80 backdrop-blur-sm animate-fade-in">
                <div className="relative">
                   <div className="w-16 h-16 border-4 border-[#6366F1]/20 border-t-[#6366F1] rounded-full animate-spin"></div>
                   <HiOutlineCamera className="w-6 h-6 text-[#6366F1] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <p className="mt-4 text-[11px] font-bold text-[#6366F1] uppercase tracking-[0.3em] animate-pulse">Verifying ID...</p>
              </div>
            )}
          </div>

          {!scanning ? (
            <button onClick={startScanner} className="w-full bg-gradient-to-r from-[#6366F1] to-[#4F46E5] text-[#F1F5F9] text-base py-5 mt-2 font-bold tracking-widest uppercase rounded-xl shadow-[0_10px_40px_-10px_rgba(99,102,241,0.5)] hover:shadow-[0_15px_50px_-10px_rgba(99,102,241,0.6)] hover:-translate-y-0.5 transition-all duration-200 group flex items-center justify-center gap-3">
              <HiOutlineCamera className="w-6 h-6 group-hover:scale-110 transition-transform" /> Start Verify Mode
            </button>
          ) : (
            <button onClick={stopScanner} className="w-full bg-[#EF4444]/10 border border-[#EF4444]/20 hover:bg-[#EF4444] text-[#EF4444] hover:text-[#F1F5F9] font-bold uppercase tracking-widest px-5 py-4 rounded-xl mt-6 transition-all duration-200 flex items-center justify-center gap-2">
              <HiOutlineRefresh className="w-5 h-5 animate-spin-slow" /> Stop System
            </button>
          )}
        </div>

        {/* Result Modal Overlay */}
        {showModal && result && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0F1117]/90 backdrop-blur-md animate-fade-in" onClick={handleModalClose}>
            <div 
              className={`max-w-md w-full rounded-3xl p-8 border-t-4 shadow-3xl transform transition-all animate-scale-up ${statusConfig[result.status]?.bg || 'bg-[#1A1D27] border-[#2E3348]'}`}
              onClick={(e) => e.stopPropagation()}
            >
               <div className="flex flex-col items-center text-center">
                  {(() => {
                    const cfg = statusConfig[result.status] || statusConfig.invalid;
                    const Icon = cfg.icon;
                    return (
                      <>
                        <div className={`p-5 rounded-2xl bg-[#0F1117]/50 shadow-inner border border-white/5 mb-6 ${cfg.color}`}>
                           <Icon className="w-16 h-16 sm:w-20 sm:h-20" />
                        </div>
                        
                        <h2 className={`text-2xl sm:text-3xl font-black uppercase tracking-tighter mb-2 ${cfg.color}`}>
                          {cfg.label}
                        </h2>
                        
                        <div className="bg-[#0F1117]/40 rounded-2xl p-6 w-full mb-8 border border-white/5">
                           {result.user && (
                             <div className="mb-4">
                               <p className="text-xl font-bold text-[#F1F5F9] mb-1">{result.user.name}</p>
                               <p className="text-sm text-[#94A3B8] font-medium">{result.user.email}</p>
                             </div>
                           )}
                           
                           <div className="space-y-2 pt-4 border-t border-white/5">
                             <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest">{result.message}</p>
                             {result.event && <p className="text-[10px] text-[#3B82F6] font-bold uppercase">{result.event.title}</p>}
                             {result.scannedAt && <p className="text-[9px] text-yellow-500 font-bold">ALREADY USED: {new Date(result.scannedAt).toLocaleTimeString()}</p>}
                           </div>
                        </div>

                        <button 
                          onClick={handleModalClose}
                          className="w-full py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-widest text-xs border border-white/10 transition-all"
                        >
                          Tap to continue
                        </button>
                      </>
                    );
                  })()}
               </div>
            </div>
          </div>
        )}

        {/* Usage instructions */}
        {!scanning && !result && scanHistory.length === 0 && (
          <div className="text-center py-12 px-6 bg-[#1A1D27] border border-[#2E3348] rounded-2xl shadow-sm">
            <span className="text-4xl block mb-6">📱</span>
            <p className="text-sm font-bold text-[#F1F5F9] mb-3">Click "Start Camera Scanner" to begin admitting participants.</p>
            <p className="text-[11px] font-medium text-[#94A3B8] leading-relaxed max-w-md mx-auto">
              The ticket QR code is validated against the active database. Duplicate or fake tickets are <span className="text-[#EF4444] font-bold">automatically rejected</span>. Valid entries are instantaneously <span className="text-[#22C55E] font-bold">recorded as checked-in</span>.
            </p>
          </div>
        )}

        {/* Session Scan History */}
        {scanHistory.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-4 px-2">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">Scan History</h2>
              <span className="px-2 py-0.5 rounded-full bg-[#2E3348] text-[10px] font-bold text-[#F1F5F9]">{scanHistory.length} Scans</span>
            </div>
            
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {scanHistory.map((s) => {
                const cfg = statusConfig[s.status] || statusConfig.invalid;
                const Icon = cfg.icon;
                return (
                  <div key={s.id} className={`flex items-start gap-4 px-5 py-4 rounded-xl border bg-[#22263A] shadow-md ${cfg.bg}`}>
                    <div className="mt-0.5 bg-[#1E2130] p-1.5 rounded-lg border border-[#2E3348]">
                      <Icon className={`w-5 h-5 flex-shrink-0 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-bold text-sm text-[#F1F5F9] truncate">{s.user?.name || s.ticketId}</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border border-[#2E3348] bg-[#1E2130] ${cfg.color}`}>{cfg.label}</span>
                      </div>
                      <div className="space-y-0.5 flex flex-col justify-start items-start">
                        {s.user?.email && <p className="text-[10px] font-medium text-[#94A3B8] truncate">{s.user.email}</p>}
                        {s.ticketEvent && <p className="text-[9px] font-bold uppercase text-[#F97316]">QR belongs to: {s.ticketEvent}</p>}
                        {s.message && <p className="text-[9px] font-medium text-[#94A3B8] italic border-l-2 border-[#2E3348] pl-2 mt-1 py-0.5">{s.message}</p>}
                       </div>
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#94A3B8] flex-shrink-0 bg-[#1E2130] px-2 py-1 rounded-md border border-[#2E3348]">
                      {s.time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
