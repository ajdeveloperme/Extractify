import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, Download, Eye, Trash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import Footer from "@/components/Footer";


interface Document {
  id: string;
  document_name: string;
  document_type: string;
  created_at: string;
  status: string;
  file_path: string;
  extracted_text?: string | null;  // new field for extracted text
}


const History = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<Document | null>(null);
  const [textPreviewOpen, setTextPreviewOpen] = useState(false);
  const [textPreviewDoc, setTextPreviewDoc] = useState<Document | null>(null);


  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate("/signin");
        return;
      }

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to load documents",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Document downloaded successfully",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to download document",
      });
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.document_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };


  const handleOpenPreview = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(doc.file_path, 60 * 5);

      if (error) throw error;

      setPreviewUrl(data.signedUrl);
      setPreviewDoc(doc);
      setIsPreviewOpen(true);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to open document preview",
      });
    }
  };

  const getFileType = (filePath: string) => {
    const extension = filePath.split('.').pop()?.toLowerCase();
    if (!extension) return 'other';

    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extension)) return 'image';
    if (['pdf'].includes(extension)) return 'pdf';
    return 'other';
  };

  const handleDeleteDocument = async () => {
    if (!docToDelete) return;

    try {
      setLoading(true);

      // Remove file from storage
      const { error: storageError } = await supabase.storage
        .from("documents")
        .remove([docToDelete.file_path]);
      if (storageError) throw storageError;

      // Remove record from database
      const { error: dbError } = await supabase
        .from("documents")
        .delete()
        .eq("id", docToDelete.id);
      if (dbError) throw dbError;

      // Update state
      setDocuments((prev) => prev.filter((d) => d.id !== docToDelete.id));

      toast({
        title: "Document Deleted",
        description: `"${docToDelete.document_name}" has been removed.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete document.",
      });
    } finally {
      setDeleteDialogOpen(false);
      setDocToDelete(null);
      setLoading(false);
    }
  };

  const handleOpenTextPreview = (doc: Document) => {
    if (!doc.extracted_text) {
      toast({
        variant: "destructive",
        title: "No extracted text",
        description: "This document does not have extracted text available.",
      });
      return;
    }
    setTextPreviewDoc(doc);
    setTextPreviewOpen(true);
  };


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navigation />

      <main className="flex-1 py-8">
        <div className="max-w-7xl mx-auto w-full">
          <Card>
            <CardHeader>
              <CardTitle>Extraction History</CardTitle>
              <CardDescription>
                Browse, search, and download your previously extracted documents.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Search and Filter */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by document name..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button variant="outline" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  Filter by date
                </Button>
              </div>

              {/* Table */}
              <div className="rounded-lg border">
                <Table>
                  <TableHeader className="bg-primary/10">
                    <TableRow>
                      <TableHead>Document Name</TableHead>
                      <TableHead>Document Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Loading documents...
                        </TableCell>
                      </TableRow>
                    ) : filteredDocuments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {searchQuery ? "No documents found matching your search" : "No documents uploaded yet"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDocuments.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">{doc.document_name}</TableCell>
                          <TableCell className="text-muted-foreground capitalize">{doc.document_type}</TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(doc.created_at)}</TableCell>
                          <TableCell>
                            <Badge variant={doc.status === 'success' ? 'default' : 'destructive'}>
                              {doc.status}
                            </Badge>
                          </TableCell>
                          <div className="flex justify-end gap-2 p-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-primary hover:text-primary-dark bg-transparent px-0 border-transparent me-1 hidden"
                              onClick={() => handleOpenTextPreview(doc)}
                              aria-label="View Extracted Text"
                              title="View Extracted Text"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            <Button className="text-dark-600 hover:text-red-800 bg-transparent px-0 border-transparent me-1"
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenPreview(doc)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            <Button className="text-primary hover:text-red-800 bg-transparent px-0 border-transparent me-1"
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDocument(doc.file_path, doc.document_name)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-800 bg-transparent px-0 border-transparent me-1"
                              onClick={() => {
                                setDocToDelete(doc);
                                setDeleteDialogOpen(true);
                              }}
                              aria-label="Delete Document"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>


                          </div>


                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''}.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />

      <Dialog open={textPreviewOpen} onOpenChange={setTextPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[70vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Extracted Text - {textPreviewDoc?.document_name}</DialogTitle>
            <DialogDescription>
              View the extracted content from the scanned document.
            </DialogDescription>
          </DialogHeader>
          <pre className="whitespace-pre-wrap p-4 bg-gray-100 rounded text-sm overflow-auto max-h-[50vh]">
            {textPreviewDoc?.extracted_text}
          </pre>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTextPreviewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">{docToDelete?.document_name}</span>? <br />
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDocToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteDocument}
              disabled={loading}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>{previewDoc?.document_name}</DialogTitle>
            <DialogDescription>
              {previewDoc?.document_type} — Preview
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 h-full overflow-auto flex justify-center items-center bg-muted/30 p-2 rounded">
            {previewUrl ? (
              getFileType(previewDoc?.file_path || '') === 'image' ? (
                <img
                  src={previewUrl}
                  alt={previewDoc?.document_name}
                  className="max-h-[60vh] max-w-full object-contain rounded shadow"
                />
              ) : getFileType(previewDoc?.file_path || '') === 'pdf' ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-[60vh] rounded border"
                  title="Document Preview"
                />
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Preview not supported. Please download the file.
                </div>
              )
            ) : (
              <p className="text-center text-muted-foreground py-8">Loading preview...</p>
            )}

          </div>


          <DialogFooter>
            <Button
              onClick={() =>
                handleViewDocument(
                  previewDoc!.file_path,
                  previewDoc!.document_name
                )
              }
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>

  );
};

export default History;
