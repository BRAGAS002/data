/**
 * This is a frontend-only implementation for demonstration purposes.
 * In a real application with proper backend, these functions would be on the server.
 */

import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Constants for page estimation
const WORDS_PER_PAGE = 250;
const CHARS_PER_PAGE = 1800;
const LINES_PER_PAGE = 50;
const PARAGRAPHS_PER_PAGE = 8;
const MIN_CONTENT_LENGTH = 100; // Minimum characters to consider a page as having content
const IMAGE_DENSITY_FACTOR = 1.5; // Factor to account for pages with images

export interface DocumentFile {
  id: string;
  file?: File; // Make file optional
  name: string;
  pageCount: number;
  cost: number;
  uploadDate: Date;
  isManual?: boolean; // Flag to indicate if page count was manually entered
}

export interface DocumentSummary {
  totalDocuments: number;
  totalPages: number;
  totalCost: number;
}

/**
 * Counts pages in a PDF file using PDF.js with enhanced accuracy
 */
export const countPdfPages = async (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        // Get detailed information about each page
        let totalPages = 0;
        let totalContentLength = 0;
        let pagesWithImages = 0;
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const content = textContent.items.map((item: any) => item.str).join(' ');
          totalContentLength += content.length;
          
          // Check for images on the page
          const ops = await page.getOperatorList();
          const hasImages = ops.fnArray.some((fn: number) => fn === pdfjsLib.OPS.paintImageXObject);
          if (hasImages) {
            pagesWithImages++;
          }
          
          // Check if page has significant content
          if (content.trim().length > MIN_CONTENT_LENGTH || hasImages) {
            totalPages++;
          }
        }
        
        // Adjust for pages with images
        if (pagesWithImages > 0) {
          const imagePageFactor = 1 + (pagesWithImages / totalPages) * (IMAGE_DENSITY_FACTOR - 1);
          totalPages = Math.ceil(totalPages * imagePageFactor);
        }
        
        // If no pages were counted but we have content, ensure at least one page
        if (totalPages === 0 && totalContentLength > 0) {
          totalPages = 1;
        }
        
        resolve(totalPages || pdf.numPages);
      } catch (error) {
        console.error("Error counting PDF pages:", error);
        // Enhanced fallback estimation with image consideration
        const fileSizeInMB = file.size / (1024 * 1024);
        let estimatedPages;
        if (fileSizeInMB < 0.1) {
          estimatedPages = 1; // Very small files are likely 1 page
        } else if (fileSizeInMB < 1) {
          estimatedPages = Math.ceil(fileSizeInMB * 3.5); // Small files: ~286KB per page
        } else if (fileSizeInMB < 5) {
          estimatedPages = Math.ceil(fileSizeInMB * 3); // Medium files: ~333KB per page
        } else if (fileSizeInMB < 10) {
          estimatedPages = Math.ceil(fileSizeInMB * 2.5); // Large files: ~400KB per page
        } else {
          estimatedPages = Math.ceil(fileSizeInMB * 2); // Very large files: ~500KB per page
        }
        resolve(Math.max(1, estimatedPages));
      }
    };
    
    reader.onerror = () => {
      console.error("Error reading file");
      reject(new Error("Failed to read file"));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Counts pages in a DOCX file using mammoth with enhanced accuracy
 */
export const countDocxPages = async (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const result = await mammoth.extractRawText({ arrayBuffer });
        
        const content = result.value;
        
        // Multiple methods of estimation
        const words = content.split(/\s+/).length;
        const chars = content.length;
        const lines = content.split('\n').length;
        const paragraphs = content.split(/\n\s*\n/).length;
        
        // Calculate content density
        const avgWordsPerParagraph = words / Math.max(1, paragraphs);
        const avgCharsPerLine = chars / Math.max(1, lines);
        
        // Adjust page metrics based on content density
        const adjustedWordsPerPage = WORDS_PER_PAGE * (avgWordsPerParagraph > 50 ? 0.9 : 1.1);
        const adjustedCharsPerPage = CHARS_PER_PAGE * (avgCharsPerLine > 80 ? 0.9 : 1.1);
        
        // Calculate pages using different metrics
        const pagesByWords = Math.ceil(words / adjustedWordsPerPage);
        const pagesByChars = Math.ceil(chars / adjustedCharsPerPage);
        const pagesByLines = Math.ceil(lines / LINES_PER_PAGE);
        const pagesByParagraphs = Math.ceil(paragraphs / PARAGRAPHS_PER_PAGE);
        
        // Weighted average giving more weight to more reliable methods
        const weightedPages = (
          pagesByWords * 0.4 +      // Words are most reliable
          pagesByChars * 0.3 +      // Characters are second most reliable
          pagesByLines * 0.2 +      // Lines are less reliable
          pagesByParagraphs * 0.1   // Paragraphs are least reliable
        );
        
        // Round up to nearest whole page
        const estimatedPages = Math.ceil(weightedPages);
        
        // Sanity check: if the file is very small, ensure at least 1 page
        resolve(Math.max(1, estimatedPages));
      } catch (error) {
        console.error("Error counting DOCX pages:", error);
        // Enhanced fallback estimation
        const fileSizeInMB = file.size / (1024 * 1024);
        let estimatedPages;
        if (fileSizeInMB < 0.1) {
          estimatedPages = 1; // Very small files are likely 1 page
        } else if (fileSizeInMB < 1) {
          estimatedPages = Math.ceil(fileSizeInMB * 4.5); // Small files: ~222KB per page
        } else if (fileSizeInMB < 5) {
          estimatedPages = Math.ceil(fileSizeInMB * 3.5); // Medium files: ~286KB per page
        } else if (fileSizeInMB < 10) {
          estimatedPages = Math.ceil(fileSizeInMB * 3); // Large files: ~333KB per page
        } else {
          estimatedPages = Math.ceil(fileSizeInMB * 2.5); // Very large files: ~400KB per page
        }
        resolve(Math.max(1, estimatedPages));
      }
    };
    
    reader.onerror = () => {
      console.error("Error reading file");
      reject(new Error("Failed to read file"));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Counts pages for a given file
 */
export const countPages = async (file: File): Promise<number> => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (extension === 'pdf') {
    return countPdfPages(file);
  } else if (extension === 'docx' || extension === 'doc') {
    return countDocxPages(file);
  }
  
  return 1; // Default to 1 page for unrecognized formats
};

/**
 * Formats currency for display
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2
  }).format(amount);
};

/**
 * Generates a unique ID
 */
export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return (
    Date.now().toString(36) + Math.random().toString(36).substring(2, 11)
  );
};

