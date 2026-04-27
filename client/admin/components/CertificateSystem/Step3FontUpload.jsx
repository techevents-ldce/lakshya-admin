import { useState, useRef, useEffect } from 'react';
import { loadCustomFont, createFontFace, generateCertificatePreview } from './utils/certificateGenerator';
import styles from './Step3FontUpload.module.css';

const DEFAULT_FONTS = ['Sephora & Hayden', 'Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana'];

export const Step3FontUpload = ({
  templateImage,
  namePosition,
  onFontConfigured,
  isLoading = false
}) => {
  const [fontFile, setFontFile] = useState(null);
  const [fontFamily, setFontFamily] = useState('Sephora & Hayden');
  const [fontSize, setFontSize] = useState(48);
  const [textColor, setTextColor] = useState('#000000');
  const [alignment, setAlignment] = useState('center');
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const fileInput = useRef(null);

  useEffect(() => {
    generatePreview();
  }, [templateImage, namePosition, fontSize, textColor, alignment, bold, italic, fontFamily]);

  const handleFontUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.ttf') && !fileName.endsWith('.otf') && !fileName.endsWith('.woff')) {
      setError('Please upload a font file (.ttf, .otf, or .woff)');
      return;
    }

    try {
      const fontData = await loadCustomFont(file);
      const customFontName = file.name.split('.')[0] || 'CustomFont';
      setFontFile(file);
      setFontFamily(customFontName);

      // Create font face and inject it
      const fontFaceCss = createFontFace(customFontName, fontData);
      const style = document.createElement('style');
      style.innerHTML = fontFaceCss;
      document.head.appendChild(style);

      await generatePreview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load font');
    }
  };

  const generatePreview = async () => {
    try {
      const config = {
        templateImage,
        namePosition,
        fontSize,
        textColor,
        alignment,
        bold,
        italic,
        fontFamily
      };

      const previewUrl = await generateCertificatePreview(
        templateImage,
        'Sample Name',
        config,
        fontFamily
      );
      setPreview(previewUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate preview');
    }
  };

  const handleConfirm = () => {
    const config = {
      templateImage,
      namePosition,
      fontSize,
      textColor,
      alignment,
      bold,
      italic,
      fontFamily
    };

    if (fontFile) {
      onFontConfigured(fontFamily, fontFile, config);
    } else {
      // Using system font
      onFontConfigured(fontFamily, new File([], 'default-font'), config);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/[0.05] rounded-3xl p-8 shadow-2xl animate-fade-in">
        <h2 className="text-2xl font-extrabold text-white mb-2 tracking-tight">Step 3: Font & Text Styling</h2>
        <p className="text-slate-500 mb-8 text-sm leading-relaxed">
          Choose a custom font or use a system font, then configure text styling options.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          {/* Font Upload Section */}
          <div className="border-b border-slate-800/50 pb-6 md:border-b-0 md:pb-0 md:border-r md:pr-8">
            <h3 className="text-indigo-400 font-bold mb-6 flex items-center gap-2 uppercase tracking-widest text-xs">📝 Font</h3>
            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-3 cursor-pointer text-slate-300 font-bold text-xs uppercase tracking-wider transition-colors hover:text-white">
                <input
                  type="radio"
                  name="font-choice"
                  checked={!fontFile}
                  onChange={() => {
                    setFontFile(null);
                    setFontFamily('Arial');
                  }}
                  disabled={isLoading}
                  className="w-4 h-4 accent-indigo-500"
                />
                Use System Font:
              </label>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                disabled={fontFile !== null || isLoading}
                className="bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500/50 transition-all flex-1"
              >
                {DEFAULT_FONTS.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-3 cursor-pointer text-slate-300 font-bold text-xs uppercase tracking-wider transition-colors hover:text-white">
                <input
                  type="radio"
                  name="font-choice"
                  checked={fontFile !== null}
                  onChange={() => {
                    fileInput.current?.click();
                  }}
                  disabled={isLoading}
                  className="w-4 h-4 accent-indigo-500"
                />
                Upload Custom Font:
              </label>
              <input
                ref={fileInput}
                type="file"
                accept=".ttf,.otf,.woff"
                onChange={handleFontUpload}
                disabled={isLoading}
                style={{ display: 'none' }}
              />
              {fontFile && (
                <span className="bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-indigo-500/20">
                  {fontFile.name} (Active)
                </span>
              )}
            </div>
          </div>

          {/* Text Styling Section */}
          <div className="space-y-6">
            <h3 className="text-indigo-400 font-bold mb-6 flex items-center gap-2 uppercase tracking-widest text-xs">✨ Text Styling</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3 text-slate-400 font-bold text-xs uppercase tracking-wider">
                <label>Font Size (px):</label>
                <input
                  type="number"
                  min="8"
                  max="200"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  disabled={isLoading}
                  className="bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500/50 transition-all"
                />
              </div>

              <div className="flex flex-col gap-3 text-slate-400 font-bold text-xs uppercase tracking-wider">
                <label>Text Color:</label>
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  disabled={isLoading}
                  className="w-full h-[46px] rounded-xl border border-slate-800 cursor-pointer overflow-hidden bg-slate-950 p-1 transition-all hover:border-white/20"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 text-slate-400 font-bold text-xs uppercase tracking-wider">
              <label>Alignment:</label>
              <select
                value={alignment}
                onChange={(e) => setAlignment(e.target.value)}
                disabled={isLoading}
                className="bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500/50 transition-all"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>

            <div className="flex gap-6 pt-2">
              <label className="flex items-center gap-3 cursor-pointer text-slate-300 font-bold text-xs uppercase tracking-wider hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={bold}
                  onChange={(e) => setBold(e.target.checked)}
                  disabled={isLoading}
                  className="w-4 h-4 rounded accent-indigo-500"
                />
                <span>Bold</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer text-slate-300 font-bold text-xs uppercase tracking-wider hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={italic}
                  onChange={(e) => setItalic(e.target.checked)}
                  disabled={isLoading}
                  className="w-4 h-4 rounded accent-indigo-500"
                />
                <span>Italic</span>
              </label>
            </div>
          </div>
        </div>

        {/* Preview Section */}
        {preview && (
          <div className="mt-10 space-y-6 animate-fade-in text-center">
            <h3 className="text-xl font-bold text-white">👁️ Preview</h3>
            <div className="relative border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/50 shadow-2xl">
              <img src={preview} alt="Certificate Preview" className="max-w-full rounded-2xl shadow-2xl max-h-[400px] mx-auto object-contain bg-slate-900/30" />
            </div>
          </div>
        )}

        {error && <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-400 text-sm font-bold mt-6 animate-fade-in">{error}</div>}

        <button
          onClick={handleConfirm}
          disabled={isLoading}
          className="btn-primary w-full mt-8"
        >
          ✓ Confirm Font & Styling
        </button>
      </div>
    </div>
  );
};
