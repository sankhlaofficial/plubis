import { PDFDocument, rgb, StandardFonts, PDFFont, PDFImage } from 'pdf-lib';
import type { BookManifest } from './types';
import { BRAND_NAME, DOMAIN } from './brand';

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 612;
const MARGIN = 48;
const SAFE_WIDTH = PAGE_WIDTH - MARGIN * 2;
const SAFE_HEIGHT = PAGE_HEIGHT - MARGIN * 2;
const TEXT_AREA_HEIGHT = 130;
const KDP_MIN_PAGES = 24;

export interface AssemblePdfInput {
  manifest: BookManifest;
  coverBytes: Uint8Array | null;
  pageBytes: (Uint8Array | null)[];
  author?: string;
  /**
   * Hidden dedication page inputs. When `childName` is provided we render a
   * personalized dedication page in the front matter; otherwise we fall back
   * to the generic "For every little reader" placeholder so legacy jobs still
   * render.
   */
  childName?: string | null;
  parentFirstName?: string | null;
  dedicationDate?: Date | null;
}

function formatDedicationDate(d: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

export async function assemblePdf(input: AssemblePdfInput): Promise<Uint8Array> {
  const {
    manifest,
    pageBytes,
    author = 'Aditya Sankhla',
    childName,
    parentFirstName,
    dedicationDate,
  } = input;

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const centerText = (
    page: any,
    text: string,
    f: PDFFont,
    size: number,
    y: number,
    color = rgb(0.15, 0.15, 0.15),
  ) => {
    const w = f.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (PAGE_WIDTH - w) / 2, y, size, font: f, color });
  };

  const addBlankPage = () => pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  // --- Front matter (6 pages) ---

  const halfTitle = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  centerText(halfTitle, manifest.title, boldFont, 24, PAGE_HEIGHT / 2);

  addBlankPage();

  const titlePage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  centerText(titlePage, manifest.title, boldFont, 28, PAGE_HEIGHT / 2 + 40);
  if (manifest.subtitle) {
    centerText(titlePage, manifest.subtitle, italicFont, 14, PAGE_HEIGHT / 2);
  }
  centerText(titlePage, 'Written and illustrated with AI', font, 11, PAGE_HEIGHT / 2 - 35, rgb(0.5, 0.5, 0.5));
  centerText(titlePage, `By ${author}`, font, 13, PAGE_HEIGHT / 2 - 60);

  const copyrightPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const cpLines = [
    manifest.title,
    '',
    'Text and illustrations generated with artificial intelligence.',
    '',
    `Copyright ${new Date().getFullYear()} ${author}`,
    'All rights reserved.',
    '',
    'First edition.',
  ];
  let cy = PAGE_HEIGHT / 2 + 60;
  for (const line of cpLines) {
    if (line) centerText(copyrightPage, line, font, 10, cy, rgb(0.4, 0.4, 0.4));
    cy -= 18;
  }

  // --- Hidden dedication page ---
  // The user never sees this until they open the PDF — that's the magic moment.
  // When childName is missing we fall back to the generic dedication so legacy
  // jobs still render without crashing.
  const dedPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  if (childName && childName.trim().length > 0) {
    const dateStr = formatDedicationDate(dedicationDate ?? new Date());
    const parent = parentFirstName && parentFirstName.trim().length > 0
      ? parentFirstName.trim()
      : 'someone';
    // Small star decoration above the dedication.
    centerText(dedPage, '*', italicFont, 18, PAGE_HEIGHT / 2 + 120, rgb(0.7, 0.7, 0.7));
    // The dedication proper — italic, generous line spacing for a handwritten feel.
    const lines = [
      'This book was made for',
      childName.trim() + ',',
      `on ${dateStr},`,
      `by ${parent},`,
      'who loves them more',
      'than words can say.',
    ];
    let dy = PAGE_HEIGHT / 2 + 70;
    for (const line of lines) {
      centerText(dedPage, line, italicFont, 18, dy, rgb(0.25, 0.25, 0.3));
      dy -= 34;
    }
  } else {
    centerText(dedPage, 'For every little reader', italicFont, 18, PAGE_HEIGHT / 2 + 15);
    centerText(dedPage, 'who dreams at bedtime.', italicFont, 18, PAGE_HEIGHT / 2 - 15);
  }

  addBlankPage();

  // --- Story pages ---

  for (let i = 0; i < manifest.pages.length; i++) {
    const page = manifest.pages[i];
    const bytes = pageBytes[i];
    const pdfPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    const imgX = MARGIN;
    const imgY = MARGIN + TEXT_AREA_HEIGHT;
    const imgW = SAFE_WIDTH;
    const imgH = PAGE_HEIGHT - MARGIN - imgY;

    const img = await tryEmbedImage(pdfDoc, bytes);
    if (img) {
      pdfPage.drawImage(img, { x: imgX, y: imgY, width: imgW, height: imgH });
    } else {
      pdfPage.drawRectangle({
        x: imgX,
        y: imgY,
        width: imgW,
        height: imgH,
        color: rgb(0.93, 0.93, 0.97),
      });
    }

    pdfPage.drawRectangle({
      x: MARGIN,
      y: MARGIN,
      width: SAFE_WIDTH,
      height: TEXT_AREA_HEIGHT,
      color: rgb(0.99, 0.99, 1),
      opacity: 0.95,
    });

    const textLines = wrapText(page.text, font, 16, SAFE_WIDTH - 30);
    let ty = MARGIN + TEXT_AREA_HEIGHT - 28;
    for (const line of textLines) {
      pdfPage.drawText(line, {
        x: MARGIN + 15,
        y: ty,
        size: 16,
        font,
        color: rgb(0.15, 0.15, 0.15),
      });
      ty -= 24;
    }

    const pn = `${page.pageNumber}`;
    const pnW = font.widthOfTextAtSize(pn, 9);
    pdfPage.drawText(pn, {
      x: (PAGE_WIDTH - pnW) / 2,
      y: MARGIN + 5,
      size: 9,
      font,
      color: rgb(0.6, 0.6, 0.6),
    });
  }

  // --- Back matter ---

  const endPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  endPage.drawRectangle({
    x: MARGIN,
    y: MARGIN,
    width: SAFE_WIDTH,
    height: SAFE_HEIGHT,
    color: rgb(0.97, 0.97, 1),
  });
  centerText(endPage, 'The End', boldFont, 36, PAGE_HEIGHT / 2);

  // --- Colophon (minimal back matter, tiny brand line only) ---
  const colophonPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  centerText(
    colophonPage,
    'Thank you for reading.',
    italicFont,
    14,
    PAGE_HEIGHT / 2 + 10,
    rgb(0.35, 0.35, 0.35),
  );
  centerText(
    colophonPage,
    `Made with ${BRAND_NAME}  ·  ${DOMAIN}`,
    font,
    8,
    MARGIN + 12,
    rgb(0.65, 0.65, 0.65),
  );

  // --- Pad to KDP minimum ---
  while (pdfDoc.getPageCount() < KDP_MIN_PAGES) {
    addBlankPage();
  }

  return await pdfDoc.save();
}

async function tryEmbedImage(pdfDoc: PDFDocument, bytes: Uint8Array | null): Promise<PDFImage | null> {
  if (!bytes || bytes.length < 2) return null;
  // Magic bytes: JPEG=FFD8, PNG=8950
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    return await pdfDoc.embedJpg(bytes);
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50) {
    return await pdfDoc.embedPng(bytes);
  }
  try {
    return await pdfDoc.embedPng(bytes);
  } catch {}
  try {
    return await pdfDoc.embedJpg(bytes);
  } catch {}
  return null;
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}
