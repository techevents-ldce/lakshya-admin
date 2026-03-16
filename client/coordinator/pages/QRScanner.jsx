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

  // Counters
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
            // decodedText = ticketId from QR; eventId comes from route params
            const { data } = await api.get(`/tickets/verify/${eventId}/${decodedText}`);
            setResult(data);
            // Add to session history
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
    valid:        { icon: HiOutlineCheckCircle,          color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-200', label: '✓ ENTRY VERIFIED' },
    wrong_event:  { icon: HiOutlineExclamation,          color: 'text-orange-500',  bg: 'bg-orange-50 border-orange-200',   label: '✗ WRONG EVENT' },
    already_used: { icon: HiOutlineExclamationCircle,    color: 'text-amber-500',   bg: 'bg-amber-50 border-amber-200',     label: '⚠ ALREADY CHECKED IN' },
    invalid:      { icon: HiOutlineXCircle,              color: 'text-red-500',     bg: 'bg-red-50 border-red-200',         label: '✗ INVALID QR' },
  };

  return (
    <div>
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-accent-600 mb-4">
        <HiOutlineArrowLeft className="w-4 h-4" /> Back to Events
      </Link>
      <h1 className="text-lg sm:text-2xl font-bold mb-1">QR Ticket Scanner</h1>
      <p className="text-sm text-gray-500 mb-6">{eventTitle}</p>

      <div className="max-w-lg mx-auto">
        {/* Session counter badges */}
        {scanHistory.length > 0 && (
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className="text-xs text-gray-500 font-medium">Session:</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              ✅ {counts.valid} verified
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
              🔶 {counts.wrong_event} wrong event
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
              ⚠️ {counts.already_used} duplicate
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
              ❌ {counts.invalid} invalid
            </span>
          </div>
        )}

        {/* Scanner viewport */}
        <div className="card mb-6">
          <div id="qr-reader" ref={containerRef} className="rounded-lg overflow-hidden" style={{ minHeight: scanning ? '300px' : '0px' }} />

          {!scanning ? (
            <button onClick={startScanner} className="w-full btn-accent text-base py-3 mt-2">
              🎥 Start Camera Scanner
            </button>
          ) : (
            <button onClick={stopScanner} className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-3 rounded-lg mt-4 transition-all">
              ■ Stop Scanner
            </button>
          )}
        </div>

        {/* Result overlay */}
        {result && (
          <div className={`card border-2 ${statusConfig[result.status]?.bg || 'bg-gray-50 border-gray-200'} animate-pulse`}>
            <div className="flex items-center gap-4">
              {(() => {
                const cfg = statusConfig[result.status] || statusConfig.invalid;
                const Icon = cfg.icon;
                return (
                  <>
                    <Icon className={`w-10 h-10 sm:w-16 sm:h-16 flex-shrink-0 ${cfg.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-lg sm:text-2xl font-extrabold ${cfg.color}`}>{cfg.label}</p>
                      <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                      {result.user && <p className="text-sm text-gray-800 mt-2 font-medium">{result.user.name} ({result.user.email})</p>}
                      {result.event && <p className="text-xs text-gray-500">{result.event.title}</p>}
                      {result.ticketEvent && <p className="text-xs text-orange-600 font-medium mt-1">QR belongs to: {result.ticketEvent}</p>}
                      {result.scannedAt && <p className="text-xs text-gray-400 mt-1">Previously scanned: {new Date(result.scannedAt).toLocaleString()}</p>}
                      {result.checkedInAt && <p className="text-xs text-emerald-600 mt-1">Checked in at: {new Date(result.checkedInAt).toLocaleString()}</p>}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Usage instructions */}
        {!scanning && !result && scanHistory.length === 0 && (
          <div className="card text-center text-gray-400">
            <p className="text-lg mb-2">📱</p>
            <p className="text-sm">Click "Start Camera Scanner" to begin scanning participant QR codes.</p>
            <p className="text-xs mt-2">The ticket ID from the QR is validated against the database. Duplicate or fake tickets are <span className="text-red-600 font-semibold">rejected</span>. Valid entries are <span className="text-emerald-600 font-semibold">marked as entered</span>.</p>
          </div>
        )}

        {/* Session Scan History */}
        {scanHistory.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Scan History ({scanHistory.length})</h2>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {scanHistory.map((s) => {
                const cfg = statusConfig[s.status] || statusConfig.invalid;
                const Icon = cfg.icon;
                return (
                  <div key={s.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${cfg.bg}`}>
                    <Icon className={`w-6 h-6 flex-shrink-0 ${cfg.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900 truncate">{s.user?.name || s.ticketId}</span>
                        <span className={`text-[11px] font-bold ${cfg.color}`}>{cfg.label}</span>
                      </div>
                      {s.user?.email && <p className="text-xs text-gray-500 truncate">{s.user.email}</p>}
                      {s.ticketEvent && <p className="text-xs text-orange-600">QR belongs to: {s.ticketEvent}</p>}
                      {s.message && <p className="text-xs text-gray-400">{s.message}</p>}
                    </div>
                    <span className="text-[10px] text-gray-400 flex-shrink-0 whitespace-nowrap">
                      {s.time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
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
