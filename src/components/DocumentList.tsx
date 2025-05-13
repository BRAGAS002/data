
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DocumentFile, formatCurrency } from "@/utils/fileUtils";
import { FileText, File, Edit, Check } from "lucide-react";

interface DocumentListProps {
  documents: DocumentFile[];
  pricePerPage: number;
  onUpdatePageCount: (documentId: string, newPageCount: number) => void;
}

const DocumentList = ({ documents, pricePerPage, onUpdatePageCount }: DocumentListProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);

  if (documents.length === 0) {
    return null;
  }

  // Format the date for display
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Get the appropriate icon based on file type
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (extension === 'pdf') {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    
    return <File className="h-5 w-5 text-blue-500" />;
  };

  const handleEditClick = (doc: DocumentFile) => {
    setEditingId(doc.id);
    setEditValue(doc.pageCount);
  };

  const handleSaveClick = (docId: string) => {
    if (editValue > 0) {
      onUpdatePageCount(docId, editValue);
    }
    setEditingId(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Document List</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File Name</TableHead>
                <TableHead className="text-right">Pages</TableHead>
                <TableHead className="text-right">Cost ({formatCurrency(pricePerPage)}/page)</TableHead>
                <TableHead className="text-right">Uploaded</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    {getFileIcon(doc.name)}
                    <span className="truncate max-w-[200px] inline-block">
                      {doc.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === doc.id ? (
                      <Input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(parseInt(e.target.value, 10) || 0)}
                        className="w-20 text-right"
                        min={1}
                      />
                    ) : (
                      doc.pageCount
                    )}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(doc.cost)}</TableCell>
                  <TableCell className="text-right">{formatDate(doc.uploadDate)}</TableCell>
                  <TableCell className="text-right">
                    {editingId === doc.id ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSaveClick(doc.id)}
                      >
                        <Check size={16} className="text-green-600" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(doc)}
                      >
                        <Edit size={16} />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentList;
