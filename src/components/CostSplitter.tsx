import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DocumentSummary, formatCurrency } from "@/utils/fileUtils";
import { Plus, Trash, Check } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type PaymentShare = Database['public']['Tables']['payment_shares']['Row'];
type PaymentShareInsert = Database['public']['Tables']['payment_shares']['Insert'];

interface Person {
  id: string;
  name: string;
  amountToPay: number;
  isPaid: boolean;
}

interface CostSplitterProps {
  summary: DocumentSummary;
  batchId: string;
}

const CostSplitter = ({ summary, batchId }: CostSplitterProps) => {
  const [people, setPeople] = useState<Person[]>([]);
  const [newPersonName, setNewPersonName] = useState("");
  const { user } = useAuth();

  // Load existing payment shares from Supabase when batch ID changes
  useEffect(() => {
    if (batchId && user) {
      loadPaymentShares();
    }
  }, [batchId, user]);

  const loadPaymentShares = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_shares')
        .select('*')
        .eq('document_batch_id', batchId);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const loadedPeople = data.map((share: PaymentShare) => ({
          id: share.id,
          name: share.person_name,
          amountToPay: share.amount_to_pay,
          isPaid: share.is_paid
        }));
        
        setPeople(loadedPeople);
      } else {
        setPeople([]);
      }
    } catch (error) {
      console.error("Error loading payment shares:", error);
      toast({
        title: "Error",
        description: "Failed to load payment information.",
        variant: "destructive",
      });
    }
  };

  const savePaymentShare = async (person: Person) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('payment_shares')
        .insert([
          {
            document_batch_id: batchId,
            person_name: person.name,
            amount_to_pay: person.amountToPay,
            is_paid: person.isPaid
          }
        ]);
      
      if (error) throw error;
    } catch (error) {
      console.error("Error saving payment share:", error);
      toast({
        title: "Error",
        description: `Failed to save payment information. ${error?.message || error}`,
        variant: "destructive",
      });
    }
  };

  const updatePaymentShare = async (person: Person) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('payment_shares')
        .update({
          person_name: person.name,
          amount_to_pay: person.amountToPay,
          is_paid: person.isPaid
        })
        .eq('id', person.id);
      
      if (error) throw error;
    } catch (error) {
      console.error("Error updating payment share:", error);
      toast({
        title: "Error",
        description: "Failed to update payment information.",
        variant: "destructive",
      });
    }
  };

  const deletePaymentShare = async (personId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('payment_shares')
        .delete()
        .eq('id', personId);
      
      if (error) throw error;
    } catch (error) {
      console.error("Error deleting payment share:", error);
      toast({
        title: "Error",
        description: "Failed to delete payment information.",
        variant: "destructive",
      });
    }
  };

  const addPerson = async () => {
    if (!newPersonName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name",
        variant: "destructive",
      });
      return;
    }

    const existingPerson = people.find(
      (p) => p.name.toLowerCase() === newPersonName.toLowerCase()
    );

    if (existingPerson) {
      toast({
        title: "Error",
        description: "This person is already in the list",
        variant: "destructive",
      });
      return;
    }

    if (user && batchId) {
      try {
        const newShare = {
          document_batch_id: batchId,
          person_name: newPersonName,
          amount_to_pay: calculateAmountPerPerson(people.length + 1),
          is_paid: false
        };
        const { data, error } = await supabase
          .from('payment_shares')
          .insert([newShare])
          .select()
          .single();
        if (error) throw error;
        if (!data) throw new Error('No data returned after insert');
        const newPerson: Person = {
          id: data.id,
          name: data.person_name,
          amountToPay: data.amount_to_pay,
          isPaid: data.is_paid
        };
        const updatedPeople = [...people, newPerson];
        const peopleWithUpdatedAmounts = redistributeCost(updatedPeople);
        // Update all people's amounts
        for (const person of peopleWithUpdatedAmounts) {
          await supabase
            .from('payment_shares')
            .update({ amount_to_pay: person.amountToPay })
            .eq('id', person.id);
        }
        setPeople(peopleWithUpdatedAmounts);
        setNewPersonName("");
      } catch (error) {
        console.error("Error saving new person:", error);
        toast({
          title: "Error",
          description: "Failed to save person information.",
          variant: "destructive",
        });
      }
    } else {
      const newPerson: Person = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
        name: newPersonName,
        amountToPay: calculateAmountPerPerson(people.length + 1),
        isPaid: false,
      };
      const updatedPeople = [...people, newPerson];
      const peopleWithUpdatedAmounts = redistributeCost(updatedPeople);
      setPeople(peopleWithUpdatedAmounts);
      setNewPersonName("");
    }
  };

  const removePerson = async (id: string) => {
    if (user && batchId) {
      try {
        await supabase
          .from('payment_shares')
          .delete()
          .eq('id', id);
        const updatedPeople = people.filter((person) => person.id !== id);
        const peopleWithUpdatedAmounts = redistributeCost(updatedPeople);
        // Update amounts for remaining people
        for (const person of peopleWithUpdatedAmounts) {
          await supabase
            .from('payment_shares')
            .update({ amount_to_pay: person.amountToPay })
            .eq('id', person.id);
        }
        setPeople(peopleWithUpdatedAmounts);
      } catch (error) {
        console.error("Error removing person:", error);
        toast({
          title: "Error",
          description: "Failed to remove person.",
          variant: "destructive",
        });
      }
    } else {
      const updatedPeople = people.filter((person) => person.id !== id);
      const peopleWithUpdatedAmounts = redistributeCost(updatedPeople);
      setPeople(peopleWithUpdatedAmounts);
    }
  };

  const togglePaid = async (id: string) => {
    if (user && batchId) {
      try {
        const person = people.find(p => p.id === id);
        if (!person) return;
        const updatedPaid = !person.isPaid;
        await supabase
          .from('payment_shares')
          .update({ is_paid: updatedPaid })
          .eq('id', id);
        const updatedPeople = people.map((p) =>
          p.id === id ? { ...p, isPaid: updatedPaid } : p
        );
        setPeople(updatedPeople);
      } catch (error) {
        console.error("Error updating payment status:", error);
        toast({
          title: "Error",
          description: "Failed to update payment status.",
          variant: "destructive",
        });
      }
    } else {
      const updatedPeople = people.map((person) =>
        person.id === id ? { ...person, isPaid: !person.isPaid } : person
      );
      setPeople(updatedPeople);
    }
  };

  const calculateAmountPerPerson = (count: number) => {
    if (count === 0) return 0;
    const amount = summary.totalCost / count;
    // Round to 2 decimal places
    return Math.round(amount * 100) / 100;
  };

  const redistributeCost = (peopleList: Person[]) => {
    const amountPerPerson = calculateAmountPerPerson(peopleList.length);
    
    return peopleList.map(person => ({
      ...person,
      amountToPay: amountPerPerson
    }));
  };

  const totalPaid = people.reduce(
    (sum, person) => sum + (person.isPaid ? person.amountToPay : 0),
    0
  );

  const totalRemaining = Math.max(0, summary.totalCost - totalPaid);

  const percentPaid = summary.totalCost > 0 
    ? (totalPaid / summary.totalCost) * 100 
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Split Cost</CardTitle>
        <CardDescription>
          Add people to evenly split the total cost
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          {/* Add person form */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="person-name" className="sr-only">
                Name
              </Label>
              <Input
                id="person-name"
                placeholder="Enter name"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addPerson();
                  }
                }}
              />
            </div>
            <Button onClick={addPerson} className="flex-none">
              <Plus className="h-4 w-4 mr-2" /> Add
            </Button>
          </div>

          {/* People list */}
          {people.length > 0 ? (
            <div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {people.map((person) => (
                      <TableRow key={person.id}>
                        <TableCell className="font-medium">{person.name}</TableCell>
                        <TableCell>{formatCurrency(person.amountToPay)}</TableCell>
                        <TableCell>
                          <button
                            onClick={() => togglePaid(person.id)}
                            className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${
                              person.isPaid
                                ? "bg-green-100 text-green-800 hover:bg-green-200"
                                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                            }`}
                          >
                            {person.isPaid && <Check className="h-3 w-3" />}
                            {person.isPaid ? "Paid" : "Unpaid"}
                          </button>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removePerson(person.id)}
                            className="h-8 w-8 p-0"
                          >
                            <span className="sr-only">Remove</span>
                            <Trash className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Payment summary */}
              <div className="mt-6 space-y-4">
                <div className="bg-muted rounded-lg p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Total Paid:</span>
                    <span className="font-medium">{formatCurrency(totalPaid)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-4">
                    <span>Remaining:</span>
                    <span className="font-medium">{formatCurrency(totalRemaining)}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${percentPaid}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs mt-1 text-gray-500">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <p>Add people to split the cost</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CostSplitter;
