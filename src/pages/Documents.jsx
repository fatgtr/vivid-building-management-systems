import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import StatusBadge from '@/components/common/StatusBadge';
import { FileText, Search, Building2, MoreVertical, Pencil, Trash2, Download, Upload, Eye, File, FileImage, FileArchive } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from 'date-fns';

const documentCategories = [
  { value: 'policy', label: 'Policy' },
  { value: 'manual', label: 'Manual' },
  { value: 'form', label: 'Form' },
  { value: 'report', label: 'Report' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'contract', label: 'Contract' },
  { value: 'meeting_minutes', label: 'Meeting Minutes' },
  { value: 'financial', label: 'Financial' },
  { value: 'other', label: 'Other' },
];

const initialFormState = {
  building_id: '',
  title: '',
  description: '',
  category: 'other',
  file_url: '',
  visibility: 'residents_only',
  expiry_date: '',
  status: 'active',
};

export default function Documents() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [deleteDocument, setDeleteDocument] = useState(null);
  const [uploading, setUploading] = useState(false);

  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list('-created_date'),
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Document.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      handleCloseDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Document.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      handleCloseDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Document.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setDeleteDocument(null);
    },
  });

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingDocument(null);
    setFormData(initialFormState);
  };

  const handleEdit = (document) => {
    setEditingDocument(document);
    setFormData({
      building_id: document.building_id || '',
      title: document.title || '',
      description: document.description || '',
      category: document.category || 'other',
      file_url: document.file_url || '',
      visibility: document.visibility || 'residents_only',
      expiry_date: document.expiry_date || '',
      status: document.status || 'active',
    });
    setShowDialog(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData({ ...formData, file_url, title: formData.title || file.name.replace(/\.[^/.]+$/, '') });
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingDocument) {
      updateMutation.mutate({ id: editingDocument.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getBuildingName = (buildingId) => buildings.find(b => b.id === buildingId)?.name || 'All Buildings';

  const getFileIcon = (url) => {
    if (!url) return File;
    if (url.includes('.pdf')) return FileText;
    if (url.includes('.jpg') || url.includes('.png') || url.includes('.jpeg')) return FileImage;
    if (url.includes('.zip') || url.includes('.rar')) return FileArchive;
    return File;
  };

  const filteredDocuments = documents.filter(d => {
    const matchesSearch = d.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBuilding = filterBuilding === 'all' || d.building_id === filterBuilding;
    const matchesCategory = filterCategory === 'all' || d.category === filterCategory;
    return matchesSearch && matchesBuilding && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Documents" subtitle="Manage building documents" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Documents" 
        subtitle={`${documents.length} documents`}
        action={() => setShowDialog(true)}
        actionLabel="Upload Document"
        actionIcon={Upload}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterBuilding} onValueChange={setFilterBuilding}>
          <SelectTrigger className="w-[200px]">
            <Building2 className="h-4 w-4 mr-2 text-slate-400" />
            <SelectValue placeholder="All Buildings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Buildings</SelectItem>
            {buildings.map(b => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {documentCategories.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredDocuments.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents"
          description="Upload documents to share with residents and staff"
          action={() => setShowDialog(true)}
          actionLabel="Upload Document"
        />
      ) : (
        <Card className="border-0 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Document</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Building</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.map((doc) => {
                const FileIcon = getFileIcon(doc.file_url);
                return (
                  <TableRow key={doc.id} className="hover:bg-slate-50/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <FileIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{doc.title}</p>
                          {doc.description && (
                            <p className="text-xs text-slate-500 line-clamp-1">{doc.description}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="capitalize text-slate-600">{doc.category?.replace(/_/g, ' ')}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-600">{getBuildingName(doc.building_id)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="capitalize text-slate-600 text-sm">{doc.visibility?.replace(/_/g, ' ')}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-500">
                        {doc.created_date && format(new Date(doc.created_date), 'MMM d, yyyy')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={doc.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {doc.file_url && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                              <Eye className="h-4 w-4 text-slate-500" />
                            </a>
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {doc.file_url && (
                              <DropdownMenuItem asChild>
                                <a href={doc.file_url} download>
                                  <Download className="mr-2 h-4 w-4" /> Download
                                </a>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleEdit(doc)}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteDocument(doc)} className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingDocument ? 'Edit Document' : 'Upload Document'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingDocument && (
              <div>
                <Label>File</Label>
                <div className="mt-1">
                  <Input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="cursor-pointer"
                  />
                  {uploading && <p className="text-sm text-slate-500 mt-1">Uploading...</p>}
                  {formData.file_url && !uploading && (
                    <p className="text-sm text-emerald-600 mt-1">✓ File uploaded</p>
                  )}
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="building_id">Building</Label>
              <Select value={formData.building_id} onValueChange={(v) => setFormData({ ...formData, building_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Buildings" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All Buildings</SelectItem>
                  {buildings.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {documentCategories.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="visibility">Visibility</Label>
              <Select value={formData.visibility} onValueChange={(v) => setFormData({ ...formData, visibility: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="residents_only">Residents Only</SelectItem>
                  <SelectItem value="owners_only">Owners Only</SelectItem>
                  <SelectItem value="staff_only">Staff Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="expiry_date">Expiry Date</Label>
              <Input
                id="expiry_date"
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={createMutation.isPending || updateMutation.isPending || uploading}>
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingDocument ? 'Update' : 'Upload')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDocument} onOpenChange={() => setDeleteDocument(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDocument?.title}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteDocument.id)} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}