import { useState, useRef, useEffect } from 'react';
import { loadCustomFont, createFontFace, generateCertificatePreview } from './utils/certificateGenerator';
import styles from './Step3FontUpload.module.css';

const DEFAULT_FONTS = ['Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana'];

export const Step3FontUpload = ({
  templateImage,
  namePosition,
  onFontConfigured,
  isLoading = false
}) => {
  const [fontFile, setFontFile] = useState(null);
  const [fontFamily, setFontFamily] = useState('Arial');
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
    <div className={styles.container}>
      <div className={styles.card}>
        <h2>Step 3: Font & Text Styling</h2>
        <p className={styles.description}>
          Choose a custom font or use a system font, then configure text styling options.
        </p>

        <div className={styles.content}>
          {/* Font Upload Section */}
          <div className={styles.section}>
            <h3>📝 Font</h3>
            <div className={styles.fontSelect}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="font-choice"
                  checked={!fontFile}
                  onChange={() => {
                    setFontFile(null);
                    setFontFamily('Arial');
                  }}
                  disabled={isLoading}
                />
                Use System Font:
              </label>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                disabled={fontFile !== null || isLoading}
                className={styles.select}
              >
                {DEFAULT_FONTS.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.fontUpload}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="font-choice"
                  checked={fontFile !== null}
                  onChange={() => {
                    fileInput.current?.click();
                  }}
                  disabled={isLoading}
                />
                Upload Custom Font:
              </label>
              <input
                ref={fileInput}
                type="file"
                accept=".ttf,.otf,.woff"
                onChange={handleFontUpload}
                className={styles.fileInput}
                disabled={isLoading}
                style={{ display: 'none' }}
              />
              {fontFile && <span className={styles.fileName}>{fontFile.name} (Active)</span>}
            </div>
          </div>

          {/* Text Styling Section */}
          <div className={styles.section}>
            <h3>✨ Text Styling</h3>

            <div className={styles.controlGroup}>
              <label>
                Font Size (px):
                <input
                  type="number"
                  min="8"
                  max="200"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  disabled={isLoading}
                  className={styles.input}
                />
              </label>
            </div>

            <div className={styles.controlGroup}>
              <label>
                Text Color:
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  disabled={isLoading}
                  className={styles.colorInput}
                />
              </label>
            </div>

            <div className={styles.controlGroup}>
              <label>
                Alignment:
                <select
                  value={alignment}
                  onChange={(e) => setAlignment(e.target.value)}
                  disabled={isLoading}
                  className={styles.select}
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </label>
            </div>

            <div className={styles.toggleGroup}>
              <label className={styles.toggleLabel}>
                <input
                  type="checkbox"
                  checked={bold}
                  onChange={(e) => setBold(e.target.checked)}
                  disabled={isLoading}
                />
                <span>Bold</span>
              </label>
              <label className={styles.toggleLabel}>
                <input
                  type="checkbox"
                  checked={italic}
                  onChange={(e) => setItalic(e.target.checked)}
                  disabled={isLoading}
                />
                <span>Italic</span>
              </label>
            </div>
          </div>
        </div>

        {/* Preview Section */}
        {preview && (
          <div className={styles.previewSection}>
            <h3>👁️ Preview</h3>
            <div className="relative border border-slate-800 rounded-lg overflow-hidden bg-slate-900/50">
              <img src={preview} alt="Certificate Preview" className={styles.previewImage} style={{ maxWidth: '100%', height: 'auto' }} />
            </div>
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        <button
          onClick={handleConfirm}
          disabled={isLoading}
          className={styles.confirmBtn}
        >
          ✓ Confirm Font & Styling
        </button>
      </div>
    </div>
  );
};
