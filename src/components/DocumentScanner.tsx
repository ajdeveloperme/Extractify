import { useState, useRef, useEffect } from "react";
import { Upload, FileText, Receipt, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const DocumentScanner = () => {
  const [activeTab, setActiveTab] = useState("resume");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    checkUser();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFiles(Array.from(files));
      toast({
        title: "Files selected",
        description: `${files.length} file(s) selected`,
      });
    }
  };



  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // 👈 reset here before opening
    }
    fileInputRef.current?.click();
  };

  const totalAllowed = 7;

  const handleScan = async () => {
    if (selectedFiles.length === 0) {
      toast({
        variant: "destructive",
        title: "No files selected",
        description: "Please select at least one file to scan",
      });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast({
          variant: "destructive",
          title: "Authentication required",
          description: "Please sign in to upload documents",
        });
        setUploading(false);
        return;
      }

      // Fetch existing docs count
      const { data: existingDocs, error: fetchError } = await supabase
        .from('documents')
        .select('id')
        .eq('user_id', user.id);

      if (fetchError) throw fetchError;

      const existingCount = existingDocs?.length || 0;
      const newFilesCount = selectedFiles.length;

      if (existingCount + newFilesCount > totalAllowed) {
        toast({
          variant: "destructive",
          title: "Upload limit reached",
          description: `You can only upload ${totalAllowed} documents total. You currently have ${existingCount}.`,
        });
        setUploading(false);
        return;
      }

      // Upload all files sequentially (can be optimized)
      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase
          .from('documents')
          .insert({
            user_id: user.id,
            document_name: file.name,
            document_type: activeTab,
            file_path: fileName,
            file_size: file.size,
            status: 'success'
          });

        if (dbError) throw dbError;
      }

      toast({
        title: "Success",
        description: `${selectedFiles.length} file(s) scanned successfully!`,
      });

      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to scan documents",
      });
    } finally {
      setUploading(false);
    }
  };



  const documentTypes = [
    { value: "resume", label: "Resume", icon: FileText },
    { value: "invoice", label: "Invoice", icon: Receipt },
    { value: "challan", label: "Delivery Challan", icon: Truck },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Scanner</CardTitle>
        <CardDescription>Select document type and upload your file for processing</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            {documentTypes.map((type) => {
              const Icon = type.icon;
              return (
                <TabsTrigger key={type.value} value={type.value} className="gap-2">
                  <Icon className="h-4 w-4" />
                  {type.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {documentTypes.map((type) => (
            <TabsContent key={type.value} value={type.value} className="mt-6">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Analyze {type.label.toLowerCase()}s and extract professional information
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div
                  onClick={handleBrowseClick}
                  className="group relative rounded-lg border-2 border-dashed border-primary/30 p-12 text-center transition-all duration-300 hover:border-primary/60 hover:shadow-[0_0_20px_hsla(258,85%,57%,0.15)] cursor-pointer"
                  style={{ background: 'var(--gradient-upload)' }}
                >
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/20 transition-all duration-300 group-hover:scale-110" style={{ boxShadow: '0 0 0 8px hsla(258, 85%, 57%, 0.05)' }}>
                    <Upload className="h-10 w-10 text-primary group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <h3 className="mt-6 text-xl font-bold text-foreground">Upload {type.label}</h3>
                  <p className="mt-3 text-sm font-medium text-primary/80">
                    {selectedFiles.length > 0
                      ? selectedFiles.map((file) => file.name).join(", ")
                      : `Drag & drop your ${type.label.toLowerCase()} here, or click to browse`}
                  </p>

                  <p className="mt-2 text-xs text-muted-foreground">
                    Supported formats: PDF, DOC, DOCX, TXT, JPG, PNG
                  </p>
                  <Button type="button" onClick={handleBrowseClick} className="mt-8 shadow-md hover:shadow-lg transition-shadow" size="lg">
                    <Upload className="mr-2 h-5 w-5" />
                    Browse Files
                  </Button>
                </div>

                <Button onClick={handleScan} disabled={selectedFiles.length === 0 || uploading} className="w-full" size="lg">
                  <FileText className="mr-2 h-4 w-4" />
                  {uploading ? "Scanning..." : `Scan ${type.label}`}
                </Button>

              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DocumentScanner;
