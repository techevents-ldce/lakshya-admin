import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../services/api';
import toast from 'react-hot-toast';
import { HiOutlineArrowLeft, HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineExclamationCircle, HiOutlineExclamation } from 'react-icons/hi';

export default function QRScanner() {
  const { id: eventId } = useParams();
  const [eventTitle, setEventTitle] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [scanHistory, setScanHistory] = useState([]); // session scan log
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
          await html5QrCode.pause();
          try {
            const { data } = await api.get(`/tickets/verify/${eventId}/${decodedText}`);
            setResult(data);
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
            if (data.status === 'valid') toast.success(data.message || 'Entry verified!');
            else if (data.status === 'wrong_event') toast.error(data.message || 'Wrong event!');
            else toast(data.message || 'Ticket checked', { icon: '⚠️' });
          } catch (err) {
            const errData = err.response?.data || { status: 'invalid', message: 'Verification failed' };
            setResult(errData);
            setScanHistory((prev) => [{
              id: Date.now(),
              ticketId: decodedText,
              status: errData.status || 'invalid',
              message: errData.message,
              user: errData.user,
              ticketEvent: errData.ticketEvent,
              time: new Date(),
            }, ...prev]);
            toast.error(errData.message || 'Invalid ticket');
          }
          setTimeout(() => {
            try { html5QrCode.resume(); } catch {}
            setResult(null);
          }, 4000);
        }
      );
    } catch (err) {
      toast.error('Camera access denied or not available');
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
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
        {/* Session counter badges */}
        {scanHistory.length > 0 && (
          <div className="flex items-center justify-center gap-3 mb-6 flex-wrap bg-[#1A1D27] p-4 rounded-2xl border border-[#2E3348] shadow-lg">
            <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mr-2">Session stats:</span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded border bg-[#22C55E]/10 border-[#22C55E]/30 text-[10px] font-bold uppercase tracking-wider text-[#22C55E]">
              ✅ {counts.valid} verified
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded border bg-[#F97316]/10 border-[#F97316]/30 text-[10px] font-bold uppercase tracking-wider text-[#F97316]">
              🔶 {counts.wrong_event} wrong event
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded border bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[10px] font-bold uppercase tracking-wider text-[#F59E0B]">
              ⚠️ {counts.already_used} duplicate
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded border bg-[#EF4444]/10 border-[#EF4444]/30 text-[10px] font-bold uppercase tracking-wider text-[#EF4444]">
              ❌ {counts.invalid} invalid
            </span>
          </div>
        )}

        {/* Scanner viewport */}
        <div className="bg-[#1A1D27] border border-[#2E3348] p-6 rounded-3xl shadow-2xl mb-8 backdrop-blur-xl">
          <div id="qr-reader" ref={containerRef} className="rounded-xl overflow-hidden shadow-inner border border-[#2E3348]" style={{ minHeight: scanning ? '300px' : '0px' }} />

          {!scanning ? (
            <button onClick={startScanner} className="w-full bg-[#6366F1] text-[#F1F5F9] text-base py-4 mt-2 font-bold tracking-wider rounded-xl shadow-lg hover:shadow-[#6366F1]/25 hover:bg-indigo-600 focus:ring-4 focus:ring-[#6366F1]/50 outline-none transition-all duration-150">
              🎥 Start Camera Scanner
            </button>
          ) : (
            <button onClick={stopScanner} className="w-full bg-[#EF4444]/10 border border-[#EF4444]/30 hover:bg-[#EF4444] text-[#EF4444] hover:text-[#F1F5F9] font-bold uppercase tracking-widest px-5 py-4 rounded-xl mt-6 transition-all shadow-lg hover:shadow-[#EF4444]/25 focus:ring-4 focus:ring-[#EF4444]/50 outline-none duration-150">
              ■ Stop Scanner
            </button>
          )}
        </div>

        {/* Result overlay */}
        {result && (
          <div className={`p-6 rounded-2xl border-2 shadow-2xl backdrop-blur-xl ${statusConfig[result.status]?.bg || 'bg-[#1A1D27] border-[#2E3348]'} animate-pulse`}>
            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-6">
              {(() => {
                const cfg = statusConfig[result.status] || statusConfig.invalid;
                const Icon = cfg.icon;
                return (
                  <>
                    <div className={`p-4 rounded-full bg-[#1E2130] shadow-inner border border-[#2E3348] ${cfg.color}`}>
                       <Icon className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0" />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <p className={`text-2xl sm:text-3xl font-black uppercase tracking-tight mb-2 ${cfg.color}`}>{cfg.label}</p>
                      <p className="text-sm font-medium text-[#F1F5F9] mb-4 bg-[#1E2130] px-4 py-2 rounded-lg border border-[#2E3348]">{result.message}</p>
                      
                      <div className="space-y-1.5 bg-[#1E2130] p-4 rounded-xl border border-[#2E3348]">
                        {result.user && <p className="text-sm text-[#F1F5F9] font-bold mb-1">{result.user.name} <span className="text-[#94A3B8] font-medium ml-1 lowercase">({result.user.email})</span></p>}
                        {result.event && <p className="text-[10px] uppercase tracking-wider text-[#94A3B8] font-bold border-b border-[#2E3348] pb-2 mb-2">{result.event.title}</p>}
                        {result.ticketEvent && <p className="text-[10px] text-[#F97316] font-bold uppercase tracking-wider">QR belongs to: <span className="text-[#F1F5F9]">{result.ticketEvent}</span></p>}
                        {result.scannedAt && <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider">Previously scanned: <span className="text-[#F1F5F9]">{new Date(result.scannedAt).toLocaleString()}</span></p>}
                        {result.checkedInAt && <p className="text-[10px] text-[#22C55E] font-bold uppercase tracking-wider">Checked in at: <span className="text-[#F1F5F9]">{new Date(result.checkedInAt).toLocaleString()}</span></p>}
                      </div>
                    </div>
                  </>
                );
              })()}
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
