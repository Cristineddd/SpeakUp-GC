import type jsPDF from 'jspdf';

/** SpeakUp GC brand green (#1D9E75) */
export const PDF_BRAND_GREEN: [number, number, number] = [29, 158, 117];

const PDF_LOGO_SRC = '/favicon-180x180.png';
const LOGO_EXPORT_SIZE = 180;

let cachedLogoDataUrl: string | null | undefined;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

function imageToDataUrl(img: HTMLImageElement): string {
  const size = LOGO_EXPORT_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  // White circular plate so the white "S" stays visible on the green PDF header.
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.clip();
  ctx.drawImage(img, 0, 0, size, size);
  return canvas.toDataURL('image/png');
}

/** Load a resized SpeakUp GC logo as a data URL for jsPDF. Cached after the first success. */
export async function getSpeakUpLogoDataUrl(): Promise<string | null> {
  if (cachedLogoDataUrl !== undefined) return cachedLogoDataUrl;

  try {
    const img = await loadImage(PDF_LOGO_SRC);
    cachedLogoDataUrl = imageToDataUrl(img);
    return cachedLogoDataUrl;
  } catch {
    cachedLogoDataUrl = null;
    return null;
  }
}

export function addBrandedPdfHeader(
  doc: jsPDF,
  title: string,
  subtitle?: string,
  logoDataUrl?: string | null
): number {
  const pageW = doc.internal.pageSize.getWidth();
  const headerH = subtitle ? 30 : 26;

  doc.setFillColor(...PDF_BRAND_GREEN);
  doc.rect(0, 0, pageW, headerH, 'F');

  let textX = 14;
  if (logoDataUrl) {
    try {
      const size = 18;
      const y = (headerH - size) / 2;
      const cx = 10 + size / 2;
      const cy = y + size / 2;
      doc.setFillColor(255, 255, 255);
      doc.circle(cx, cy, size / 2 + 0.6, 'F');
      doc.addImage(logoDataUrl, 'PNG', 10, y, size, size);
      textX = 32;
    } catch {
      textX = 14;
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('SpeakUp GC', textX, subtitle ? 11 : 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(title, textX, subtitle ? 18 : 20);

  if (subtitle) {
    doc.setFontSize(7.5);
    doc.text(subtitle, textX, 24);
  }

  doc.setTextColor(17, 24, 39);
  return headerH + 8;
}

export function addBrandedPdfFooter(
  doc: jsPDF,
  pageNum: number,
  totalPages: number,
  note = 'Confidential — SpeakUp GC'
): void {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  doc.setDrawColor(...PDF_BRAND_GREEN);
  doc.setLineWidth(0.4);
  doc.line(14, pageH - 12, pageW - 14, pageH - 12);

  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  doc.setFont('helvetica', 'normal');
  doc.text(note, 14, pageH - 7);
  doc.text(`Page ${pageNum} of ${totalPages}`, pageW - 14, pageH - 7, { align: 'right' });
}
