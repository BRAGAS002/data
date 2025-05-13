
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentSummary, formatCurrency } from "@/utils/fileUtils";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface SummaryProps {
  summary: DocumentSummary;
  pricePerPage: number;
}

const Summary = ({ summary, pricePerPage }: SummaryProps) => {
  if (summary.totalDocuments === 0) {
    return null;
  }

  // Function to simulate downloading a report
  const handleDownloadReport = () => {
    // In a real application, this would generate and download a PDF/CSV report
    alert("In a complete application, this would download a report of all documents and costs.");
  };

  return (
    <Card className="bg-brand-50 border-brand-100">
      <CardHeader>
        <CardTitle>Cost Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <p className="text-sm text-gray-500">Documents</p>
            <p className="text-2xl font-bold">{summary.totalDocuments}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-500">Total Pages</p>
            <p className="text-2xl font-bold">{summary.totalPages}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-500">Price Per Page</p>
            <p className="text-2xl font-bold">{formatCurrency(pricePerPage)}</p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-brand-100">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Total Cost:</h3>
            <span className="text-2xl font-bold text-brand-700">
              {formatCurrency(summary.totalCost)}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full bg-success-600 hover:bg-success-700" 
          onClick={handleDownloadReport}
        >
          <Download className="mr-2 h-4 w-4" /> Download Report
        </Button>
      </CardFooter>
    </Card>
  );
};

export default Summary;
