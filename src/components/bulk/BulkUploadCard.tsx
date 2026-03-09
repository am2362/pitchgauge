import { useState } from 'react';
import { Upload, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createBulkAnalysisTemplate, parseExcelFile, ExcelParseResult } from '@/lib/excel-parser';
import { toast } from '@/hooks/use-toast';

interface BulkUploadCardProps {
  onUploadComplete: (data: { name: string; pitch: string }[]) => void;
}

export function BulkUploadCard({ onUploadComplete }: BulkUploadCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDownloadTemplate = async () => {
    try {
      await createBulkAnalysisTemplate();
      toast({
        title: "Template Downloaded",
        description: "Open the Excel file and add your startup pitches."
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Could not generate the template",
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    try {
      const result: ExcelParseResult = await parseExcelFile(file);

      if (result.errors.length > 0) {
        toast({
          title: "Upload Error",
          description: result.errors[0],
          variant: "destructive"
        });
        return;
      }

      if (result.warnings.length > 0) {
        result.warnings.forEach(warning => {
          toast({
            title: "Warning",
            description: warning
          });
        });
      }

      if (result.data.length === 0) {
        toast({
          title: "No Data Found",
          description: "Please ensure your Excel file has startup names and pitches.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "File Uploaded Successfully",
        description: `${result.data.length} startups ready for analysis.`
      });

      onUploadComplete(result.data);
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Startup Pitches</CardTitle>
        <CardDescription>
          Upload an Excel file with up to 100 startup pitches for bulk analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-border'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">
            {isProcessing ? 'Processing file...' : 'Drag and drop Excel file here'}
          </p>
          <p className="text-sm text-muted-foreground mb-4">or</p>
          <label htmlFor="file-upload">
            <Button variant="outline" disabled={isProcessing} asChild>
              <span>Browse Files</span>
            </Button>
            <input
              id="file-upload"
              type="file"
                accept=".xlsx"
              className="hidden"
              onChange={handleFileSelect}
              disabled={isProcessing}
            />
          </label>
        </div>

        <div className="flex items-center justify-center">
          <Button
            variant="ghost"
            onClick={handleDownloadTemplate}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Download Template
          </Button>
        </div>

        <div className="text-sm text-muted-foreground space-y-1">
          <p>• Maximum file size: 5MB</p>
          <p>• Maximum startups: 100</p>
          <p>• Required columns: Startup Name, Written Pitch</p>
          <p>• Accepted format: .xlsx only</p>
        </div>
      </CardContent>
    </Card>
  );
}
