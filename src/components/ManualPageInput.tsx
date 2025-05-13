import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { DocumentFile, formatCurrency, generateId } from '@/utils/fileUtils';

interface ManualPageInputProps {
  onDocumentsChange: (documents: DocumentFile[]) => void;
  documents: DocumentFile[];
  pricePerPage: number;
}

export function ManualPageInput({ onDocumentsChange, documents, pricePerPage }: ManualPageInputProps) {
  const [newDocumentName, setNewDocumentName] = useState('');
  const [newPageCount, setNewPageCount] = useState('');

  const handleAddDocument = () => {
    if (!newDocumentName || !newPageCount) return;

    const pageCount = parseInt(newPageCount);
    if (isNaN(pageCount) || pageCount <= 0) return;

    const newDocument: DocumentFile = {
      id: generateId(),
      name: newDocumentName,
      pageCount: pageCount,
      cost: pageCount * pricePerPage,
      uploadDate: new Date(),
      isManual: true
    };

    onDocumentsChange([...documents, newDocument]);
    setNewDocumentName('');
    setNewPageCount('');
  };

  const handleRemoveDocument = (id: string) => {
    onDocumentsChange(documents.filter(doc => doc.id !== id));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual Page Input</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="documentName">Document Name</Label>
              <Input
                id="documentName"
                value={newDocumentName}
                onChange={(e) => setNewDocumentName(e.target.value)}
                placeholder="Enter document name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pageCount">Number of Pages</Label>
              <Input
                id="pageCount"
                type="number"
                min="1"
                value={newPageCount}
                onChange={(e) => setNewPageCount(e.target.value)}
                placeholder="Enter page count"
              />
            </div>
          </div>
          <Button onClick={handleAddDocument} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Document
          </Button>

          {documents.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Added Documents</h3>
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-2 bg-secondary rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {doc.pageCount} pages • {formatCurrency(doc.cost)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveDocument(doc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 