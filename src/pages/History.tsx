import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash, Calculator, Check, DollarSign, RefreshCw } from "lucide-react";
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

interface PaymentSummary {
  totalPaid: number;
  totalUnpaid: number;
  totalAmount: number;
}

interface PaymentShare {
  id: string;
  document_batch_id: string;
  person_name: string;
  amount_to_pay: number;
  is_paid: boolean;
  created_at: string;
}

interface UnpaidPerson {
  name: string;
  totalUnpaid: number;
  batches: {
    id: string;
    amount: number;
    date: string;
    shareId: string;
  }[];
}

const History = () => {
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [paymentShares, setPaymentShares] = useState<PaymentShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary>({
    totalPaid: 0,
    totalUnpaid: 0,
    totalAmount: 0
  });
  const [unpaidPeople, setUnpaidPeople] = useState<UnpaidPerson[]>([]);
  const [editingPayment, setEditingPayment] = useState<{
    shareId: string;
    amount: number;
  } | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const { data: batchData, error: batchError } = await supabase
        .from('document_batches')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (batchError) throw batchError;
      setBatches(batchData || []);

      const batchIds = (batchData || []).map(batch => batch.id);
      const { data: shareData, error: shareError } = await supabase
        .from('payment_shares')
        .select('*')
        .in('document_batch_id', batchIds);
      if (shareError) throw shareError;
      setPaymentShares(shareData || []);

      calculatePaymentSummary(batchData || []);
      calculateUnpaidPeople(batchData || [], shareData || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load data. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculatePaymentSummary = (batchesArg: BatchSummary[]) => {
    const summary = batchesArg.reduce((acc, batch) => {
      const isPaid = batch.payment_status === 'PAID';
      return {
        totalPaid: acc.totalPaid + (isPaid ? batch.total_cost : 0),
        totalUnpaid: acc.totalUnpaid + (!isPaid ? batch.total_cost : 0),
        totalAmount: acc.totalAmount + batch.total_cost
      };
    }, { totalPaid: 0, totalUnpaid: 0, totalAmount: 0 });
    setPaymentSummary(summary);
  };

  const calculateUnpaidPeople = (batchesArg: BatchSummary[], sharesArg: PaymentShare[]) => {
    const unpaidMap = new Map<string, UnpaidPerson>();
    sharesArg.forEach(share => {
      if (!share.is_paid) {
        const batch = batchesArg.find(b => b.id === share.document_batch_id);
        if (!batch) return;
        const existing = unpaidMap.get(share.person_name);
        if (existing) {
          existing.totalUnpaid += share.amount_to_pay;
          existing.batches.push({
            id: batch.id,
            amount: share.amount_to_pay,
            date: batch.created_at,
            shareId: share.id
          });
        } else {
          unpaidMap.set(share.person_name, {
            name: share.person_name,
            totalUnpaid: share.amount_to_pay,
            batches: [{
              id: batch.id,
              amount: share.amount_to_pay,
              date: batch.created_at,
              shareId: share.id
            }]
          });
        }
      }
    });
    setUnpaidPeople(Array.from(unpaidMap.values()).sort((a, b) => b.totalUnpaid - a.totalUnpaid));
  };

  const handleAfterPaymentChange = async () => {
    try {
      setLoading(true);
      // Fetch latest data
      const { data: batchData, error: batchError } = await supabase
        .from('document_batches')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (batchError) throw batchError;

      const { data: shareData, error: shareError } = await supabase
        .from('payment_shares')
        .select('*')
        .in('document_batch_id', batchData.map(b => b.id));

      if (shareError) throw shareError;

      // Update states with fresh data
      setBatches(batchData || []);
      setPaymentShares(shareData || []);

      // Update payment summary
      calculatePaymentSummary(batchData || []);
      calculateUnpaidPeople(batchData || [], shareData || []);

      // Update batch payment statuses
      const batchIds = batchData.map(batch => batch.id);
      await Promise.all(batchIds.map(updateBatchPaymentStatus));

      // Fetch final updated data
      const { data: finalBatchData, error: finalBatchError } = await supabase
        .from('document_batches')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (finalBatchError) throw finalBatchError;
      setBatches(finalBatchData || []);
      calculatePaymentSummary(finalBatchData || []);
    } catch (error) {
      console.error("Error in handleAfterPaymentChange:", error);
      toast({
        title: "Error",
        description: "Failed to update payment status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateBatchPaymentStatus = async (batchId: string) => {
    try {
      // Get all shares for this batch
      const { data: shares, error: sharesError } = await supabase
        .from('payment_shares')
        .select('*')
        .eq('document_batch_id', batchId);

      if (sharesError) throw sharesError;

      // Check if all shares are paid
      const allPaid = shares && shares.length > 0 && shares.every(share => share.is_paid);

      // Update batch status if all shares are paid
      if (allPaid) {
        const { error: updateError } = await supabase
          .from('document_batches')
          .update({ payment_status: 'PAID' })
          .eq('id', batchId);

        if (updateError) throw updateError;
      }
    } catch (error) {
      console.error("Error updating batch payment status:", error);
    }
  };

  const updatePaymentShareStatus = async (shareId: string, isPaid: boolean) => {
    try {
      const { error } = await supabase
        .from('payment_shares')
        .update({ is_paid: isPaid })
        .eq('id', shareId);

      if (error) throw error;

      // Get the batch ID for this share
      const share = paymentShares.find(s => s.id === shareId);
      if (share) {
        await updateBatchPaymentStatus(share.document_batch_id);
      }

      toast({
        title: 'Success',
        description: `Payment status updated to ${isPaid ? 'Paid' : 'Unpaid'}`,
      });

      await handleAfterPaymentChange();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update payment status. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handlePartialPayment = async (shareId: string, amount: number) => {
    try {
      const share = paymentShares.find(s => s.id === shareId);
      if (!share) return;

      const newAmount = share.amount_to_pay - amount;
      const { error } = await supabase
        .from('payment_shares')
        .update({
          amount_to_pay: newAmount,
          is_paid: newAmount <= 0
        })
        .eq('id', shareId);

      if (error) throw error;

      setEditingPayment(null);
      
      // Update batch status after partial payment
      await updateBatchPaymentStatus(share.document_batch_id);

      toast({
        title: 'Success',
        description: `Payment of ${formatCurrency(amount)} recorded`,
      });

      await handleAfterPaymentChange();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to record payment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const markAllPaidForPerson = async (person: UnpaidPerson) => {
    try {
      await Promise.all(person.batches.map(batch =>
        supabase.from('payment_shares').update({ is_paid: true }).eq('id', batch.shareId)
      ));
      toast({
        title: 'Success',
        description: 'All marked as paid',
      });
      await handleAfterPaymentChange();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to mark all as paid.',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const openCalculation = (batchId: string) => {
    navigate(`/?batch=${batchId}`);
  };

  const deleteBatch = async (batchId: string) => {
    try {
      const { error } = await supabase
        .from('document_batches')
        .delete()
        .eq('id', batchId);
      if (error) throw error;
      toast({
        title: 'Success',
        description: 'Record deleted successfully',
      });
      await handleAfterPaymentChange();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete record. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-6xl space-y-6">
      {/* Payment Summary Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Payment Summary</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchAllData}
            className="h-8 w-8 p-0"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-600 mb-1">Total Paid</div>
              <div className="text-2xl font-semibold text-green-700">{formatCurrency(paymentSummary.totalPaid)}</div>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg">
              <div className="text-sm text-amber-600 mb-1">Total Unpaid</div>
              <div className="text-2xl font-semibold text-amber-700">{formatCurrency(paymentSummary.totalUnpaid)}</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600 mb-1">Total Amount</div>
              <div className="text-2xl font-semibold text-blue-700">{formatCurrency(paymentSummary.totalAmount)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unpaid People Card */}
      {unpaidPeople.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Unpaid People</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchAllData}
              className="h-8 w-8 p-0"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Total Unpaid</TableHead>
                    <TableHead>Unpaid Batches</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unpaidPeople.map((person) => (
                    <TableRow key={person.name}>
                      <TableCell className="font-medium">{person.name}</TableCell>
                      <TableCell className="text-amber-600 font-semibold">
                        {formatCurrency(person.totalUnpaid)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {person.batches.map((batch) => (
                            <div 
                              key={batch.shareId}
                              className="text-sm text-gray-600 flex justify-between items-center"
                            >
                              <span>{formatDate(batch.date)}</span>
                              <span className="ml-4">{formatCurrency(batch.amount)}</span>
                              <div className="ml-4 flex items-center gap-2">
                                {editingPayment?.shareId === batch.shareId ? (
                                  <>
                                    <Input
                                      type="number"
                                      value={editingPayment.amount}
                                      onChange={(e) => setEditingPayment({
                                        ...editingPayment,
                                        amount: parseFloat(e.target.value) || 0
                                      })}
                                      className="w-24 h-8"
                                      min={0}
                                      max={batch.amount}
                                      step={0.01}
                                    />
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handlePartialPayment(batch.shareId, editingPayment.amount)}
                                      className="h-8"
                                    >
                                      <DollarSign className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setEditingPayment(null)}
                                      className="h-8"
                                    >
                                      <Trash className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setEditingPayment({
                                        shareId: batch.shareId,
                                        amount: batch.amount
                                      })}
                                      className="h-8"
                                    >
                                      <DollarSign className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => updatePaymentShareStatus(batch.shareId, true)}
                                      className="h-8"
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAllPaidForPerson(person)}
                          className="text-green-600 hover:text-green-700"
                        >
                          Mark All Paid
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History Table Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Calculation History</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchAllData}
            className="h-8 w-8 p-0"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
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
                            updateBatchPaymentStatus(batch.id);
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

