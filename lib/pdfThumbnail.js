// Only import PDF.js on the client side
let pdfjsLib = null;

if (typeof window !== 'undefined') {
  // Dynamic import only in browser
  pdfjsLib = require('pdfjs-dist');
  // Use local worker file from public directory
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

/**
 * Generate a thumbnail image from the first page of a PDF file
 *
 * @param {File} pdfFile - The PDF file to generate thumbnail from
 * @param {number} scale - Scale factor for the thumbnail (default: 1.5 for good quality)
 * @returns {Promise<Blob>} - PNG image blob of the first page
 */
export async function generatePDFThumbnail(pdfFile, scale = 1.5) {
  if (typeof window === 'undefined' || !pdfjsLib) {
    throw new Error('PDF thumbnail generation only works in browser environment');
  }

  try {
    // Read the PDF file as ArrayBuffer
    const arrayBuffer = await pdfFile.arrayBuffer();

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    // Get the first page
    const page = await pdf.getPage(1);

    // Get viewport with scale
    const viewport = page.getViewport({ scale });

    // Create canvas element
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Render PDF page into canvas context
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    await page.render(renderContext).promise;

    // Convert canvas to blob (PNG format)
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create thumbnail blob'));
        }
      }, 'image/png', 0.92); // High quality PNG
    });

  } catch (error) {
    console.error('Error generating PDF thumbnail:', error);
    throw error;
  }
}

/**
 * Generate thumbnail and convert to File object for upload
 *
 * @param {File} pdfFile - The PDF file
 * @returns {Promise<File>} - Thumbnail as File object
 */
export async function generateThumbnailFile(pdfFile) {
  const thumbnailBlob = await generatePDFThumbnail(pdfFile);

  // Create a File object from the blob
  const thumbnailFile = new File(
    [thumbnailBlob],
    `${pdfFile.name}_thumbnail.png`,
    { type: 'image/png' }
  );

  return thumbnailFile;
}
