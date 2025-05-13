/**
 * This is a frontend-only implementation for demonstration purposes.
 * In a real application with proper backend, these functions would be on the server.
 */

export interface DocumentFile {
  id: string;
  file: File;
  name: string;
  pageCount: number;
  cost: number;
  uploadDate: Date;
}

export interface DocumentSummary {
  totalDocuments: number;
  totalPages: number;
  totalCost: number;
}

/**
 * Counts pages in a PDF file using the client-side techniques
 * Note: This is an improved implementation that works for many PDFs
 * but is not as reliable as server-side libraries.
 */
export const countPdfPages = async (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const content = event.target?.result as ArrayBuffer;
        const uint8Array = new Uint8Array(content);
        
        // Better page counter for PDFs - look for multiple patterns
        const pdfContent = new TextDecoder().decode(uint8Array);
        
        // Try different patterns for finding page count 
        let pageCount = 0;
        
        // Method 1: Look for "/Type /Page" pattern (most reliable)
        const regex1 = /\/Type\s*\/Page[^s]/g;
        const matches1 = pdfContent.match(regex1);
        if (matches1) {
          pageCount = matches1.length;
        }
        
        // Method 2: Alternative pattern "/N <number> 0 R"
        if (!pageCount) {
          const regex2 = /\/N\s+(\d+)/;
          const matches2 = pdfContent.match(regex2);
          if (matches2 && matches2[1]) {
            pageCount = parseInt(matches2[1], 10);
          }
        }
        
        // Method 3: Look for "/Count <number>"
        if (!pageCount) {
          const regex3 = /\/Count\s+(\d+)/;
          const matches3 = pdfContent.match(regex3);
          if (matches3 && matches3[1]) {
            pageCount = parseInt(matches3[1], 10);
          }
        }
        
        // Sanity check - if page count seems unreasonable (too high), limit it
        if (pageCount > 1000) {
          // PDF probably incorrectly parsed - set to a reasonable number based on file size
          const fileSizeInMB = file.size / (1024 * 1024);
          // Assume roughly 500KB per page for a typical PDF
          pageCount = Math.ceil(fileSizeInMB * 2);
        }
        
        resolve(Math.max(1, pageCount)); // Ensure at least 1 page
      } catch (error) {
        console.error("Error counting PDF pages:", error);
        resolve(1); // Default to 1 page on error
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
 * Estimates pages in a DOCX file based on file size
 * Note: This is a very rough estimate as properly counting pages
 * requires server-side libraries.
 */
export const estimateDocxPages = async (file: File): Promise<number> => {
  // Improved estimator based on file size
  // Rough estimation: ~3000 characters per page, ~1 byte per character in compressed format
  const avgBytesPerPage = 3500; // Slightly higher than before
  const compressionRatio = 0.3; // Estimated compression ratio
  // Adjust for larger files which typically have better compression
  const effectiveBytes = file.size * (file.size > 1000000 ? 0.4 : compressionRatio);
  const estimatedPages = Math.max(1, Math.ceil(effectiveBytes / avgBytesPerPage));
  // Remove the cap or set it much higher
  return estimatedPages;
};

/**
 * Counts pages for a given file
 */
export const countPages = async (file: File): Promise<number> => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (extension === 'pdf') {
    return countPdfPages(file);
  } else if (extension === 'docx' || extension === 'doc') {
    return estimateDocxPages(file);
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

