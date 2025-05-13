
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";

interface FileUploaderProps {
  onFilesSelected: (files: FileList) => void;
}

const FileUploader = ({ onFilesSelected }: FileUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    validateAndProcessFiles(files);
  };
  
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcessFiles(e.target.files);
    }
  };
  
  const validateAndProcessFiles = (files: FileList) => {
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      if (extension === 'pdf' || extension === 'docx' || extension === 'doc') {
        validFiles.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    }
    
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid file format",
        description: `Only PDF and DOCX files are accepted. Invalid files: ${invalidFiles.join(", ")}`,
        variant: "destructive",
      });
    }
    
    if (validFiles.length > 0) {
      onFilesSelected(files);
    }
  };
  
  return (
    <Card className={`transition-colors ${isDragging ? "border-brand-400 bg-brand-50" : ""}`}>
      <CardContent className="p-6">
        <div
          className="flex flex-col items-center justify-center gap-4 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById("file-upload")?.click()}
        >
          <Upload className="h-10 w-10 text-brand-400" />
          <div className="text-center space-y-2">
            <h3 className="font-semibold text-lg">Upload Documents</h3>
            <p className="text-sm text-gray-500">
              Drag and drop PDF or DOCX files here, or click to browse
            </p>
            <p className="text-xs text-gray-400">
              Supported file types: PDF, DOCX
            </p>
          </div>
          <input
            id="file-upload"
            type="file"
            multiple
            accept=".pdf,.docx,.doc"
            className="hidden"
            onChange={handleFileInputChange}
          />
          <Button variant="outline" onClick={(e) => {
            e.stopPropagation();
            document.getElementById("file-upload")?.click();
          }}>
            Browse Files
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FileUploader;
