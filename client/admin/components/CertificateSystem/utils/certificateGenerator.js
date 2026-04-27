import { jsPDF } from 'jspdf';

// ─── Generate a unique SHA-256 hash for a certificate ────────────────────────
export async function generateCertificateHash(member) {
  const raw = `${member.fullName}|${member.email}|${Date.now()}|${Math.random()}`;
  const encoded = new TextEncoder().encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert an image Blob to a PDF Blob.
 * Embeds the certificate `hash` in the PDF metadata (Keywords field)
 * so it survives JPEG compression and can be read back during verification.
 */
export async function convertBlobToPDF(imageBlob, hash = '') {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const imgData = reader.result;
      const img = new Image();
      img.onload = () => {
        const width = img.width;
        const height = img.height;

        const doc = new jsPDF({
          orientation: width > height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [width, height]
        });

        // ── Embed hash in PDF metadata (invisible, compression-proof) ──────
        if (hash) {
          doc.setProperties({
            title: 'Lakshya TechFest Certificate',
            subject: 'Certificate of Participation',
            author: 'Lakshya TechFest',
            keywords: `lakshya-cert:${hash}`,
            creator: 'Lakshya Admin System',
          });
        }

        doc.addImage(imgData, 'JPEG', 0, 0, width, height, undefined, 'FAST');
        resolve(doc.output('blob'));
      };
      img.onerror = reject;
      img.src = imgData;
    };
    reader.onerror = reject;
    reader.readAsDataURL(imageBlob);
  });
}

/**
 * Load a custom font from file
 */
export async function loadCustomFont(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const fontData = e.target.result;
        resolve(fontData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to load font'));
    reader.readAsDataURL(file);
  });
}

/**
 * Create a font face CSS rule for custom font
 */
export function createFontFace(fontFamily, fontDataURL) {
  return `
    @font-face {
      font-family: '${fontFamily}';
      src: url('${fontDataURL}') format('truetype');
    }
  `;
}

/**
 * Generate a single certificate image with member name
 */
export async function generateCertificate(
  templateImage,
  member,
  config,
  fontFamily
) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = templateImage;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');

        // Draw template image
        ctx.drawImage(img, 0, 0);

        // Configure text styling
        const fontStyle = `${config.italic ? 'italic' : ''} ${config.bold ? 'bold' : ''} ${config.fontSize}px "${fontFamily}", sans-serif`.trim();
        
        // Ensure font is loaded before drawing
        document.fonts.load(fontStyle).then(() => {
          ctx.font = fontStyle;
          ctx.fillStyle = config.textColor;
          ctx.textBaseline = 'middle';

          // Set text alignment
          if (config.alignment === 'left') {
            ctx.textAlign = 'left';
          } else if (config.alignment === 'right') {
            ctx.textAlign = 'right';
          } else {
            ctx.textAlign = 'center';
          }

          // Draw member name
          ctx.fillText(member.fullName, config.namePosition.x, config.namePosition.y);

          // Generate hash, then export canvas as blob
          generateCertificateHash(member).then((hash) => {
            canvas.toBlob((blob) => {
              if (blob) {
                resolve({ blob, hash });
              } else {
                reject(new Error('Failed to generate certificate'));
              }
            }, 'image/jpeg', 0.92);
          }).catch(() => {
            // Fallback: no hash if crypto fails
            canvas.toBlob((blob) => resolve({ blob, hash: null }), 'image/jpeg', 0.92);
          });
        }).catch((err) => {
          console.error('Font load error:', err);
          // Fallback draw
          ctx.font = `${config.fontSize}px sans-serif`;
          ctx.fillText(member.fullName, config.namePosition.x, config.namePosition.y);
          generateCertificateHash(member).then((hash) => {
            canvas.toBlob((blob) => resolve({ blob, hash }), 'image/jpeg', 0.92);
          }).catch(() => {
            canvas.toBlob((blob) => resolve({ blob, hash: null }), 'image/jpeg', 0.92);
          });
        });
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load template image'));
  });
}

/**
 * Generate preview of certificate with a sample name
 */
export async function generateCertificatePreview(
  templateImage,
  sampleName,
  config,
  fontFamily
) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = templateImage;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');

        ctx.drawImage(img, 0, 0);

        const fontStyle = `${config.italic ? 'italic' : ''} ${config.bold ? 'bold' : ''} ${config.fontSize}px "${fontFamily}", sans-serif`.trim();
        
        document.fonts.load(fontStyle).then(() => {
          ctx.font = fontStyle;
          ctx.fillStyle = config.textColor;
          ctx.textBaseline = 'middle';

          if (config.alignment === 'left') {
            ctx.textAlign = 'left';
          } else if (config.alignment === 'right') {
            ctx.textAlign = 'right';
          } else {
            ctx.textAlign = 'center';
          }

          ctx.fillText(sampleName, config.namePosition.x, config.namePosition.y);
          resolve(canvas.toDataURL('image/png'));
        }).catch((err) => {
          console.error('Font load error:', err);
          ctx.font = `${config.fontSize}px sans-serif`;
          ctx.fillText(sampleName, config.namePosition.x, config.namePosition.y);
          resolve(canvas.toDataURL('image/png'));
        });
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load template image'));
  });
}

/**
 * Batch generate certificates for all members
 */
export async function generateBatchCertificates(
  templateImage,
  members,
  config,
  fontFamily,
  onProgress
) {
  const results = [];

  for (let i = 0; i < members.length; i++) {
    const member = members[i];
    try {
      const { blob: certificateImage, hash } = await generateCertificate(
        templateImage,
        member,
        config,
        fontFamily
      );
      
      // Convert image to PDF — hash is embedded in PDF metadata
      const certificate = await convertBlobToPDF(certificateImage, hash);
      
      results.push({ member, certificate, hash });
    } catch (error) {
      console.error(`Failed to generate certificate for ${member.fullName}:`, error);
    }

    if (onProgress) {
      onProgress({ current: i + 1, total: members.length });
    }
  }

  return results;
}

/**
 * Create ZIP file from certificates
 */
export async function createZipFromCertificates(certificates) {
  // This will be implemented if JSZip is available
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  
  certificates.forEach(({ member, certificate }) => {
    const fileName = `${member.fullName.replace(/\s+/g, '_')}_Certificate.pdf`;
    zip.file(fileName, certificate);
  });
  
  return await zip.generateAsync({ type: 'blob' });
}
