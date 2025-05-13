import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import FileUploader from "@/components/FileUploader";
import PriceInput from "@/components/PriceInput";
import DocumentList from "@/components/DocumentList";
import Summary from "@/components/Summary";
import CostSplitter from "@/components/CostSplitter";
import { DocumentFile, DocumentSummary, countPages, generateId } from "@/utils/fileUtils";
import { Trash } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";

const getNewBatchId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15));

const Index = () => {
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [pricePerPage, setPricePerPage] = useState<number>(2.00);
  const [summary, setSummary] = useState<DocumentSummary>({
    totalDocuments: 0,
    totalPages: 0,
    totalCost: 0
  });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [batchId, setBatchId] = useState<string>(getNewBatchId());
  const { user } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const batchParam = searchParams.get('batch');

  useEffect(() => {
    if (batchParam && user) {
      loadSavedCalculation(batchParam);
    }
  }, [batchParam, user]);

  const loadSavedCalculation = async (batchId: string) => {
    try {
      const { data, error } = await supabase
        .from('document_batches')
        .select('*')
        .eq('id', batchId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setBatchId(data.id);
        setPricePerPage(data.price_per_page);
        
        // Load the documents for this batch
        const { data: docs, error: docsError } = await supabase
          .from('documents')
          .select('*')
          .eq('batch_id', batchId);
        
        if (docsError) throw docsError;
        
        if (docs) {
          setDocuments(docs.map(doc => ({
            id: doc.id,
            file: undefined,
            name: doc.name,
            pageCount: doc.page_count,
            cost: doc.cost,
            uploadDate: new Date(doc.upload_date)
          })));
        }
      }
    } catch (error) {
      console.error("Error loading saved calculation:", error);
      toast({
        title: "Error C001",
        description: "Failed to load saved calculation. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Update summary when documents or price changes
  useEffect(() => {
    const total = documents.reduce(
      (acc, doc) => {
        return {
          totalDocuments: acc.totalDocuments + 1,
          totalPages: acc.totalPages + doc.pageCount,
          totalCost: acc.totalCost + doc.cost
        };
      },
      { totalDocuments: 0, totalPages: 0, totalCost: 0 }
    );

    setSummary(total);
  }, [documents, pricePerPage]);

  // Handle file selection
  const handleFilesSelected = async (files: FileList) => {
    setIsProcessing(true);
    
    try {
      const newDocs: DocumentFile[] = [];
      
      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const extension = file.name.split('.').pop()?.toLowerCase();
        
        // Only process PDF and DOCX files
        if (extension === 'pdf' || extension === 'docx' || extension === 'doc') {
          try {
            // Count pages in the document
            const pageCount = await countPages(file);
            
            // Calculate cost
            const cost = pageCount * pricePerPage;
            
            // Create document entry
            const doc: DocumentFile = {
              id: generateId(),
              file,
              name: file.name,
              pageCount,
              cost,
              uploadDate: new Date()
            };
            
            newDocs.push(doc);
          } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
            toast({
              title: "Error C002",
              description: `Could not process ${file.name}. Please try again.`,
              variant: "destructive",
            });
          }
        }
      }
      
      if (newDocs.length > 0) {
        setDocuments(prev => [...prev, ...newDocs]);
        toast({
          title: "Files processed successfully",
          description: `Processed ${newDocs.length} document(s)`,
        });
      }
    } catch (error) {
      console.error("Error processing files:", error);
      toast({
        title: "Error C003",
        description: "An unexpected error occurred while processing your files.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle price change
  const handlePriceChange = (price: number) => {
    setPricePerPage(price);
    
    // Update costs for all documents
    setDocuments(prev => 
      prev.map(doc => ({
        ...doc,
        cost: doc.pageCount * price
      }))
    );
  };

  // Clear all documents
  const handleClearAll = () => {
    setDocuments([]);
    // Generate a new batch ID when clearing
    setBatchId(getNewBatchId());
    toast({
      title: "Documents cleared",
      description: "All uploaded documents have been removed.",
    });
  };
  
  // Save calculation to database
  const saveCalculation = async () => {
    if (!user) return;
    // Always generate a new batchId before saving to avoid duplicate key errors
    const newBatchId = getNewBatchId();
    setBatchId(newBatchId);

    try {
      // Save the batch summary
      const { error: batchError } = await supabase
        .from('document_batches')
        .insert([
          {
            id: newBatchId,
            user_id: user.id,
            total_documents: summary.totalDocuments,
            total_pages: summary.totalPages,
            total_cost: summary.totalCost,
            price_per_page: pricePerPage,
            payment_status: 'PENDING'
          }
        ]);
      if (batchError) throw batchError;

      // Save each document
      const docsToInsert = documents.map(doc => ({
        id: doc.id,
        batch_id: newBatchId,
        name: doc.name,
        page_count: doc.pageCount,
        cost: doc.cost,
        upload_date: doc.uploadDate.toISOString()
      }));
      if (docsToInsert.length > 0) {
        const { error: docsError } = await supabase
          .from('documents')
          .upsert(docsToInsert, { onConflict: ['id'] });
        if (docsError) throw docsError;
      }

      // Copy payment_shares from old batchId to newBatchId
      const { data: oldShares, error: sharesError } = await supabase
        .from('payment_shares')
        .select('*')
        .eq('document_batch_id', batchId);
      if (sharesError) throw sharesError;
      if (oldShares && oldShares.length > 0) {
        const newShares = oldShares.map(share => ({
          document_batch_id: newBatchId,
          person_name: share.person_name,
          amount_to_pay: share.amount_to_pay,
          is_paid: share.is_paid
        }));
        const { error: insertSharesError } = await supabase
          .from('payment_shares')
          .insert(newShares);
        if (insertSharesError) throw insertSharesError;
      }

      toast({
        title: "Calculation saved",
        description: "Your calculation has been saved to your history."
      });
      // Generate a new batch ID for future calculations
      setBatchId(getNewBatchId());
    } catch (error) {
      console.error("Error saving calculation:", error);
      toast({
        title: "Error C004",
        description: `Failed to save calculation. ${(error && error.message) ? error.message : error}`,
        variant: "destructive",
      });
    }
  };

  // Function to update page count manually
  const updatePageCount = (documentId: string, newPageCount: number) => {
    setDocuments(prev => 
      prev.map(doc => {
        if (doc.id === documentId) {
          return {
            ...doc,
            pageCount: newPageCount,
            cost: newPageCount * pricePerPage
          };
        }
        return doc;
      })
    );
    
    toast({
      title: "Page count updated",
      description: "Document page count has been manually updated."
    });
  };

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-brand-700 mb-2">Page Cost Calculator Pro</h1>
        <p className="text-gray-600">Calculate printing costs for your documents with ease</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Upload Documents</CardTitle>
            <CardDescription>
              Upload PDF or DOCX files to calculate printing costs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploader onFilesSelected={handleFilesSelected} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>
              Set your pricing and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <PriceInput defaultPrice={pricePerPage} onChange={handlePriceChange} />
            
            {documents.length > 0 && (
              <Button 
                variant="outline" 
                className="w-full text-destructive hover:text-destructive"
                onClick={handleClearAll}
              >
                <Trash className="h-4 w-4 mr-2" />
                Clear All Documents
              </Button>
            )}
            
            {documents.length > 0 && user && (
              <Button 
                variant="default" 
                className="w-full"
                onClick={saveCalculation}
              >
                Save Calculation
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {isProcessing && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-600 mr-3"></div>
              <p>Processing documents, please wait...</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <DocumentList 
            documents={documents} 
            pricePerPage={pricePerPage}
            onUpdatePageCount={updatePageCount} 
          />
        </div>
        <div>
          <Summary summary={summary} pricePerPage={pricePerPage} />
        </div>
      </div>

      {summary.totalDocuments > 0 && (
        <div className="mt-8">
          <CostSplitter summary={summary} batchId={batchId} />
        </div>
      )}

      <footer className="mt-12 text-center text-sm text-gray-500">
        <p>
          Page Cost Calculator Pro - A document cost calculation tool
        </p>
        <p>
          Note: This is a frontend demonstration. In a production environment, 
          document processing would be handled server-side for better accuracy and security.
        </p>
      </footer>
    </div>
  );
};

export default Index;
