import { useState, useEffect } from 'react';
import { generateCertificatePreview, generateBatchCertificates } from './utils/certificateGenerator';
import styles from './Step4CertificatePreview.module.css';

export const Step4CertificatePreview = ({
  members,
  config,
  fontFamily,
  onCertificatesGenerated,
  isLoading = false
}) => {
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [previewImage, setPreviewImage] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    generatePreview();
  }, [currentPreviewIndex, config, fontFamily, members]);

  const generatePreview = async () => {
    try {
      if (members.length === 0) return;

      const member = members[currentPreviewIndex];
      const preview = await generateCertificatePreview(
        config.templateImage,
        member.fullName,
        config,
        fontFamily
      );
      setPreviewImage(preview);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate preview');
    }
  };

  const handleGenerateAll = async () => {
    setGenerating(true);
    setError('');
    setGenerationProgress(0);

    try {
      const certificatesList = await generateBatchCertificates(
        config.templateImage,
        members,
        config,
        fontFamily,
        (progress) => {
          setGenerationProgress(Math.round((progress.current / progress.total) * 100));
        }
      );

      onCertificatesGenerated(certificatesList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate certificates');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/[0.05] rounded-3xl p-8 shadow-2xl animate-fade-in">
        <h2 className="text-2xl font-extrabold text-white mb-2 tracking-tight">Step 4: Certificate Preview & Generation</h2>
        <p className="text-slate-500 mb-8 text-sm leading-relaxed">
          Review certificate previews and confirm before bulk generation for all {members.length} members.
        </p>

        {/* Preview Section */}
        <div className="mt-10 space-y-6 animate-fade-in text-center">
          <h3 className="text-xl font-bold text-white mb-6">Preview for: {members[currentPreviewIndex]?.fullName}</h3>
          <div className="relative border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/50 shadow-2xl">
            {previewImage && (
              <img src={previewImage} alt="Certificate Preview" style={{ maxWidth: '100%', height: 'auto' }} className="max-w-full rounded-2xl shadow-2xl max-h-[500px] mx-auto object-contain bg-slate-900/30" />
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center gap-6 mt-10 p-4 bg-slate-950/50 rounded-2xl border border-slate-800 backdrop-blur-sm">
            <button
              onClick={() => setCurrentPreviewIndex(Math.max(0, currentPreviewIndex - 1))}
              disabled={currentPreviewIndex === 0 || generating}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-6 py-2.5 rounded-xl transition-all duration-200 text-xs uppercase tracking-widest border border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <span className="text-slate-400 font-bold text-sm tracking-widest">
              {currentPreviewIndex + 1} / {members.length}
            </span>
            <button
              onClick={() => setCurrentPreviewIndex(Math.min(members.length - 1, currentPreviewIndex + 1))}
              disabled={currentPreviewIndex === members.length - 1 || generating}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-6 py-2.5 rounded-xl transition-all duration-200 text-xs uppercase tracking-widest border border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>

        {/* Generation Status */}
        {generating && (
          <div className="bg-indigo-500/10 border border-indigo-500/20 p-8 rounded-3xl mt-10 text-center animate-pulse shadow-2xl shadow-indigo-900/10">
            <h4 className="text-white font-bold mb-4 uppercase tracking-widest text-xs">Generating Certificates...</h4>
            <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden mb-4 border border-slate-900">
              <div
                className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-300"
                style={{ width: `${generationProgress}%` }}
              />
            </div>
            <p className="text-indigo-400 font-extrabold text-xs uppercase tracking-widest">{generationProgress}% Complete</p>
          </div>
        )}

        {error && <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-400 text-sm font-bold mt-6 animate-fade-in">{error}</div>}

        <button
          onClick={handleGenerateAll}
          disabled={generating || isLoading || members.length === 0}
          className="btn-primary w-full mt-10 !bg-emerald-600 hover:!bg-emerald-500 !shadow-emerald-900/20"
        >
          {generating ? '⏳ Generating...' : '✓ Generate All Certificates'}
        </button>
      </div>
    </div>
  );
};
