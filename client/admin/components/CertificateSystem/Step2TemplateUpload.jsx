import { useState, useRef, useEffect } from 'react';
import styles from './Step2TemplateUpload.module.css';

export const Step2TemplateUpload = ({
  onTemplateLoaded,
  isLoading = false
}) => {
  const [templateImage, setTemplateImage] = useState('');
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [error, setError] = useState('');
  const canvasRef = useRef(null);

  useEffect(() => {
    if (templateImage && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.src = templateImage;
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        // If we already have a position, draw the marker
        if (selectedPosition) {
          drawMarker(ctx, selectedPosition);
        }
      };
    }
  }, [templateImage, selectedPosition]);

  const drawMarker = (ctx, position) => {
    const markerSize = 30;
    ctx.strokeStyle = '#FF6B6B';
    ctx.fillStyle = '#FF6B6B';
    ctx.lineWidth = 2;

    // Crosshair
    ctx.beginPath();
    ctx.moveTo(position.x - markerSize, position.y);
    ctx.lineTo(position.x + markerSize, position.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(position.x, position.y - markerSize);
    ctx.lineTo(position.x, position.y + markerSize);
    ctx.stroke();

    // Center dot
    ctx.beginPath();
    ctx.arc(position.x, position.y, 5, 0, Math.PI * 2);
    ctx.fill();
  };

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imageData = e.target.result;
        setTemplateImage(imageData);
        setSelectedPosition(null);
      } catch (err) {
        setError('Failed to load image');
      }
    };
    reader.onerror = () => setError('Failed to read file');
    reader.readAsDataURL(file);
  };

  const handleCanvasClick = (event) => {
    if (!canvasRef.current || !templateImage) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Scale coordinates to canvas resolution
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const position = {
      x: x * scaleX,
      y: y * scaleY
    };

    setSelectedPosition(position);
    onTemplateLoaded(templateImage, position);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/60 backdrop-blur-xl border border-white/[0.05] rounded-3xl p-8 shadow-2xl animate-fade-in">
        <h2 className="text-2xl font-extrabold text-white mb-2 tracking-tight">Step 2: Upload Certificate Template</h2>
        <p className="text-slate-500 mb-8 text-sm leading-relaxed">
          Upload a PNG or JPG image that serves as your certificate template. This image should contain
          the design, borders, logos, and any fixed content. Then click on the template to mark where
          the member's name should be placed.
        </p>

        {!templateImage ? (
          <div className="border-2 border-dashed border-slate-800 rounded-3xl p-12 text-center bg-slate-950/50 cursor-pointer transition-all duration-300 hover:border-indigo-500/50 hover:bg-slate-900/60 group">
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleImageUpload}
              disabled={isLoading}
              id="template-upload"
              style={{ display: 'none' }}
            />
            <label htmlFor="template-upload" className="cursor-pointer text-lg font-bold text-slate-400 group-hover:text-indigo-400 transition-colors flex flex-col items-center gap-4">
              <span className="text-4xl opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300">🖼️</span>
              Click to upload certificate template (PNG or JPG)
            </label>
          </div>
        ) : (
          <div className="mt-10 space-y-6 animate-fade-in text-center">
            <h3 className="text-xl font-bold text-white">Certificate Template Preview</h3>
            <p className="text-slate-400 text-sm font-medium mb-4">
              Click on the template to mark where the member's name should be displayed
            </p>
            <div className="relative border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/50 shadow-2xl">
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                className="max-w-full rounded-2xl cursor-crosshair mx-auto object-contain bg-slate-900/30"
                style={{ height: 'auto' }}
              />
            </div>
            {selectedPosition && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl text-emerald-400 text-sm font-bold my-6 flex items-center justify-center gap-2">
                <span>✓ Position selected at: X={Math.round(selectedPosition.x)}, Y={Math.round(selectedPosition.y)}</span>
              </div>
            )}
            <button
              onClick={() => {
                setTemplateImage('');
                setSelectedPosition(null);
              }}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-6 py-2.5 rounded-xl transition-all duration-200 text-xs uppercase tracking-widest border border-slate-700 mt-4"
              disabled={isLoading}
            >
              Change Template
            </button>
          </div>
        )}

        {error && <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-400 text-sm font-bold mt-6 animate-fade-in">{error}</div>}
      </div>
    </div>
  );
};
