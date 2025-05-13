import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash, Calculator } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/utils/fileUtils";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

interface BatchSummary {
  id: string;
  total_documents: number;
  total_pages: number;
  total_cost: number;
  created_at: string;
  payment_status: string;
}

const History = () => {
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchBatchHistory();
    }
  }, [user]);

  const fetchBatchHistory = async () => {
    try {
      setLoading(true);
      
      // Fetch the user's document batches from the database
      const { data, error } = await supabase
        .from('document_batches')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setBatches(data || []);
    } catch (error) {
      console.error("Error fetching history:", error);
      toast({
        title: "Error H001",
        description: "Failed to load history. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePaymentStatus = async (batchId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'PAID' ? 'PENDING' : 'PAID';
      
      const { error } = await supabase
        .from('document_batches')
        .update({ payment_status: newStatus })
        .eq('id', batchId);
      
      if (error) throw error;
      
      // Update local state
      setBatches(batches.map(batch => 
        batch.id === batchId 
          ? { ...batch, payment_status: newStatus }
          : batch
      ));
      
      toast({
        title: "Success",
        description: `Payment status updated to ${newStatus}`,
      });
    } catch (error) {
      console.error("Error updating payment status:", error);
      toast({
        title: "Error H002",
        description: "Failed to update payment status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const deleteBatch = async (batchId: string) => {
    try {
      // Delete the batch from the database
      const { error } = await supabase
        .from('document_batches')
        .delete()
        .eq('id', batchId);
      
      if (error) throw error;
      
      // Update local state
      setBatches(batches.filter(batch => batch.id !== batchId));
      
      toast({
        title: "Success",
        description: "Record deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting batch:", error);
      toast({
        title: "Error H003",
        description: "Failed to delete record. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const openCalculation = (batchId: string) => {
    navigate(`/?batch=${batchId}`);
  };

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle>Calculation History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-600"></div>
            </div>
          ) : batches.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No history found. Start by calculating document costs!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead>Pages</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((batch) => (
                    <TableRow 
                      key={batch.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openCalculation(batch.id)}
                    >
                      <TableCell>{formatDate(batch.created_at)}</TableCell>
                      <TableCell>{batch.total_documents}</TableCell>
                      <TableCell>{batch.total_pages}</TableCell>
                      <TableCell>{formatCurrency(batch.total_cost)}</TableCell>
                      <TableCell>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updatePaymentStatus(batch.id, batch.payment_status);
                          }}
                          className={`px-2 py-1 rounded-full text-xs cursor-pointer transition-colors ${
                            batch.payment_status === 'PAID' 
                              ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                              : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          }`}
                        >
                          {batch.payment_status}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation();
                              openCalculation(batch.id);
                            }}
                            className="text-primary hover:bg-primary/10"
                          >
                            <Calculator size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteBatch(batch.id);
                            }}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <Trash size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default History;
