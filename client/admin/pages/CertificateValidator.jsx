import { useState, useRef } from 'react';
import { extractHashFromPDF } from '../components/CertificateSystem/utils/pdfExtractor';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

function isPDF(file) {
  return file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf');
}

// ─────────────────────────────────────────────────────────────────────────────
export default function CertificateValidator() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle|extracting|verifying|done|error
  const [result, setResult] = useState(null);
  const [extractedHash, setExtractedHash] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef(null);

  const reset = () => {
    setFile(null);
    setStatus('idle');
    setResult(null);
    setExtractedHash(null);
    setErrorMsg('');
  };

  const handleFile = (f) => {
    if (!f) return;
    if (!isPDF(f)) {
      setErrorMsg('Please upload a PDF certificate file.');
      return;
    }
    setFile(f);
    setStatus('idle');
    setResult(null);
    setExtractedHash(null);
    setErrorMsg('');
  };

  const handleInputChange = (e) => handleFile(e.target.files?.[0]);
  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files?.[0]);
  };

  const handleVerify = async () => {
    if (!file) return;
    setStatus('extracting');
    setErrorMsg('');

    try {
      // Step 1: Read hash from PDF metadata (Keywords field set by jsPDF)
      const hash = await extractHashFromPDF(file);

      if (!hash) {
        setStatus('error');
        setErrorMsg(
          'No Lakshya verification signature found in this PDF. ' +
          'Make sure you are uploading the original certificate PDF received via email from Lakshya — ' +
          'not a re-printed, scanned, or re-exported copy.'
        );
        return;
      }

      setExtractedHash(hash);

      // Step 2: Verify hash against DB
      setStatus('verifying');
      const resp = await axios.get(`${API_BASE}/certificates/verify/${hash}`);
      setResult(resp.data);
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err?.response?.data?.message || err.message || 'Verification failed');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-start py-16 px-4">

      {/* ── Header ── */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-4">
          <span className="text-3xl">🔐</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
          Certificate <span className="text-indigo-400">Authenticator</span>
        </h1>
        <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
          Upload your Lakshya certificate <strong className="text-white">PDF</strong> to
          verify its authenticity. Each certificate carries an invisible digital signature
          in its metadata — we read it and check it against our records.
        </p>
      </div>

      <div className="w-full max-w-xl">

        {/* ── Drop zone ── */}
        <div
          className={`relative border-2 border-dashed rounded-3xl p-10 text-center transition-all duration-300 cursor-pointer group ${
            file
              ? 'border-indigo-500/40 bg-indigo-500/5'
              : 'border-slate-700 hover:border-indigo-500/50 bg-slate-900/40'
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !file && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            onChange={handleInputChange}
            className="hidden"
          />

          {!file ? (
            /* Empty state */
            <div className="flex flex-col items-center gap-4 pointer-events-none">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-200">
                📄
              </div>
              <div>
                <p className="text-white font-bold mb-1">Drop your certificate PDF here</p>
                <p className="text-slate-500 text-xs">or click to browse</p>
              </div>
              <span className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-widest">
                PDF only
              </span>
            </div>
          ) : (
            /* File selected */
            <div onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-4 py-3 px-5 bg-slate-800/60 border border-slate-700 rounded-2xl mb-4">
                <span className="text-3xl flex-shrink-0">📋</span>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-white font-bold text-sm truncate">{file.name}</p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {(file.size / 1024).toFixed(0)} KB · PDF document
                  </p>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
              </div>
              <button
                onClick={reset}
                className="text-slate-500 hover:text-red-400 text-xs font-bold transition-colors"
              >
                ✕ Remove
              </button>
            </div>
          )}
        </div>

        {/* ── Verify button ── */}
        {file && status === 'idle' && (
          <button
            onClick={handleVerify}
            className="mt-4 w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm tracking-wide transition-all duration-200 shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
          >
            🔍 Verify Certificate
          </button>
        )}

        {/* ── Loading ── */}
        {(status === 'extracting' || status === 'verifying') && (
          <div className="mt-8 flex flex-col items-center gap-4">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 border-2 border-indigo-500/20 rounded-full" />
              <div className="absolute inset-0 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-sm">
                {status === 'extracting' ? 'Reading certificate signature…' : 'Checking our records…'}
              </p>
              <p className="text-slate-500 text-xs mt-1">
                {status === 'extracting'
                  ? '📋 Parsing PDF metadata for digital signature'
                  : '🔗 Looking up hash in certificate database'}
              </p>
            </div>
            {/* Progress steps */}
            <div className="flex items-center gap-2 mt-1">
              <StepDot done={status === 'verifying'} active={status === 'extracting'} label="Read PDF" />
              <div className="h-px w-8 bg-slate-800" />
              <StepDot done={false} active={status === 'verifying'} label="Verify DB" />
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {status === 'error' && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">❌</span>
              <div>
                <p className="text-red-300 font-bold text-sm mb-1">Verification Failed</p>
                <p className="text-red-200/70 text-xs leading-relaxed">{errorMsg}</p>
              </div>
            </div>
            <button onClick={reset} className="mt-4 w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors">
              Try another file
            </button>
          </div>
        )}

        {/* ── Result ── */}
        {status === 'done' && result && (
          <div className={`mt-6 rounded-2xl border p-5 ${
            result.verified
              ? 'border-emerald-500/30 bg-emerald-500/10'
              : 'border-red-500/30 bg-red-500/10'
          }`}>
            <div className="flex items-start gap-3 mb-4">
              <span className="text-3xl flex-shrink-0">{result.verified ? '✅' : '❌'}</span>
              <div>
                <p className={`font-extrabold text-lg ${result.verified ? 'text-emerald-300' : 'text-red-300'}`}>
                  {result.verified ? 'Certificate Verified ✓' : 'Not Authentic'}
                </p>
                <p className="text-xs text-slate-400 leading-relaxed mt-0.5">
                  {result.verified
                    ? 'This certificate is authentic and was officially issued by Lakshya TechFest.'
                    : 'This certificate was NOT found in our records.'}
                </p>
              </div>
            </div>

            {result.verified && result.data && (
              <div className="space-y-2 mt-4">
                <InfoRow label="Recipient" value={result.data.recipientName} />
                {result.data.eventName && <InfoRow label="Event" value={result.data.eventName} />}
                <InfoRow
                  label="Issued on"
                  value={new Date(result.data.issuedAt).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}
                />
                <div className="mt-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mb-1">Digital fingerprint</p>
                  <p className="font-mono text-[10px] text-slate-500 break-all">{extractedHash}</p>
                </div>
              </div>
            )}

            <button onClick={reset} className="mt-4 w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors">
              Verify another certificate
            </button>
          </div>
        )}

        {/* ── Error text if wrong file type ── */}
        {errorMsg && status === 'idle' && (
          <p className="mt-3 text-center text-red-400 text-xs font-bold">{errorMsg}</p>
        )}
      </div>

      {/* ── How it works ── */}
      <div className="mt-16 max-w-xl w-full">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-4 text-center">How it works</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: '🔑', title: 'Hash generated', desc: 'A unique SHA-256 hash is created for each certificate at generation time.' },
            { icon: '📋', title: 'Stored in PDF', desc: 'The hash is embedded in the PDF\'s metadata — invisible but tamper-evident.' },
            { icon: '🗃️', title: 'Verified in DB', desc: 'We cross-check the hash against our database where every issued certificate is recorded.' },
          ].map((item) => (
            <div key={item.title} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 text-center">
              <div className="text-2xl mb-2">{item.icon}</div>
              <p className="text-white text-xs font-bold mb-1">{item.title}</p>
              <p className="text-slate-500 text-[10px] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
          <p className="text-amber-400/70 text-[10px] leading-relaxed text-center">
            ⚠️ Only the <strong className="text-amber-300">original PDF</strong> received via email can be verified.
            Printed, scanned, or re-exported copies will not work as they lose the PDF metadata signature.
          </p>
        </div>
      </div>
    </div>
  );
}

function StepDot({ active, done, label }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[8px] font-bold transition-all duration-300 ${
        done ? 'bg-emerald-500 border-emerald-500 text-white'
          : active ? 'border-indigo-500 bg-indigo-500/20 text-indigo-400 animate-pulse'
          : 'border-slate-700 bg-slate-900 text-slate-600'
      }`}>
        {done ? '✓' : ''}
      </div>
      <span className={`text-[8px] font-bold uppercase tracking-wide ${active || done ? 'text-slate-300' : 'text-slate-600'}`}>
        {label}
      </span>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/5">
      <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">{label}</span>
      <span className="text-xs text-white font-semibold">{value}</span>
    </div>
  );
}
