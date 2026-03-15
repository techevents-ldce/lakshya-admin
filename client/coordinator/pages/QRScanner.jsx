import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../services/api';
import toast from 'react-hot-toast';
import { HiOutlineArrowLeft, HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineExclamationCircle } from 'react-icons/hi';

export default function QRScanner() {
  const { id: eventId } = useParams();
  const [eventTitle, setEventTitle] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null); // { status, message, user, event }
  const scannerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    api.get(`/events/${eventId}`).then(({ data }) => setEventTitle(data.data.title)).catch(() => {});
    return () => stopScanner();
  }, [eventId]);

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
          // Pause scanner while verifying
          await html5QrCode.pause();
          try {
            const { data } = await api.get(`/tickets/verify/${decodedText}`);
            setResult(data);
            toast.success(data.message || 'Ticket verified');
          } catch (err) {
            const errData = err.response?.data || { status: 'invalid', message: 'Verification failed' };
            setResult(errData);
            toast.error(errData.message || 'Invalid ticket');
          }
          // Resume after 3 seconds
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
    valid: { icon: HiOutlineCheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-200', label: 'VALID ✓' },
    already_used: { icon: HiOutlineExclamationCircle, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200', label: 'ALREADY USED' },
    invalid: { icon: HiOutlineXCircle, color: 'text-red-500', bg: 'bg-red-50 border-red-200', label: 'INVALID ✗' },
  };

  return (
    <div>
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-accent-600 mb-4">
        <HiOutlineArrowLeft className="w-4 h-4" /> Back to Events
      </Link>
      <h1 className="text-lg sm:text-2xl font-bold mb-1">QR Ticket Scanner</h1>
      <p className="text-sm text-gray-500 mb-6">{eventTitle}</p>

      <div className="max-w-lg mx-auto">
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
                      {result.scannedAt && <p className="text-xs text-gray-400 mt-1">Previously scanned: {new Date(result.scannedAt).toLocaleString()}</p>}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Usage instructions */}
        {!scanning && !result && (
          <div className="card text-center text-gray-400">
            <p className="text-lg mb-2">📱</p>
            <p className="text-sm">Click "Start Camera Scanner" to begin scanning participant QR codes.</p>
            <p className="text-xs mt-2">Results: <span className="text-emerald-600 font-semibold">VALID</span> · <span className="text-amber-600 font-semibold">ALREADY USED</span> · <span className="text-red-600 font-semibold">INVALID</span></p>
          </div>
        )}
      </div>
    </div>
  );
}
