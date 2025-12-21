import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  Plus, 
  Mail, 
  Pencil, 
  Trash2,
  Shield,
  UserCircle
} from 'lucide-react';
import { toast } from 'sonner';

const VIVID_STAFF_ROLES = [
  { value: 'admin', label: 'Vivid Admin', description: 'Full platform access' },
  { value: 'vivid_sales', label: 'Sales', description: 'Partner onboarding and support' },
  { value: 'vivid_support', label: 'Support', description: 'Customer support and troubleshooting' },
  { value: 'vivid_operations', label: 'Operations', description: 'Platform operations and monitoring' },
];

export default function VividStaffManagement() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'vivid_support',
    job_title: '',
  });

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
  });

  // Filter to show only Vivid BMS staff (no partner_id or admin role)
  const vividStaff = allUsers.filter(u => !u.partner_id || u.role === 'admin');

  const inviteMutation = useMutation({
    mutationFn: async (data) => {
      // In a real implementation, you'd call a backend function to send invitation
      // For now, we'll create a user record directly
      return await base44.entities.User.create({
        ...data,
        partner_id: null, // Ensure this is Vivid staff
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      setShowInviteDialog(false);
      setFormData({ full_name: '', email: '', role: 'vivid_support', job_title: '' });
      toast.success('Staff member invited successfully');
    },
    onError: (error) => {
      toast.error('Failed to invite staff member: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.User.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      setShowEditDialog(false);
      setSelectedStaff(null);
      toast.success('Staff member updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update staff member: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.User.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      setShowDeleteDialog(false);
      setSelectedStaff(null);
      toast.success('Staff member removed successfully');
    },
    onError: (error) => {
      toast.error('Failed to remove staff member: ' + error.message);
    },
  });

  const handleInvite = () => {
    if (!formData.full_name || !formData.email) {
      toast.error('Please fill in all required fields');
      return;
    }
    inviteMutation.mutate(formData);
  };

  const handleEdit = (staff) => {
    setSelectedStaff(staff);
    setFormData({
      full_name: staff.full_name || '',
      email: staff.email || '',
      role: staff.role || 'vivid_support',
      job_title: staff.job_title || '',
    });
    setShowEditDialog(true);
  };

  const handleUpdate = () => {
    if (!formData.full_name) {
      toast.error('Name is required');
      return;
    }
    updateMutation.mutate({
      id: selectedStaff.id,
      data: {
        full_name: formData.full_name,
        role: formData.role,
        job_title: formData.job_title,
      },
    });
  };

  const handleDelete = (staff) => {
    setSelectedStaff(staff);
    setShowDeleteDialog(true);
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'vivid_sales':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'vivid_support':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'vivid_operations':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Only show for admins
  if (currentUser && currentUser.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Shield className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Restricted</h2>
          <p className="text-slate-500">This page is only accessible to Vivid BMS administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Vivid BMS Staff Management"
        subtitle="Manage your organization's team members"
        action={() => setShowInviteDialog(true)}
        actionLabel="Invite Staff Member"
        actionIcon={Plus}
      />

      {/* Staff Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Staff</p>
                <p className="text-2xl font-bold text-slate-900">{vividStaff.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        {VIVID_STAFF_ROLES.slice(0, 3).map(role => {
          const count = vividStaff.filter(s => s.role === role.value).length;
          return (
            <Card key={role.value}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">{role.label}</p>
                    <p className="text-2xl font-bold text-slate-900">{count}</p>
                  </div>
                  <Shield className="h-8 w-8 text-slate-400" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Staff List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-4 p-4 border border-slate-200 rounded-lg">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-40 mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-9 w-20" />
                </div>
              ))}
            </div>
          ) : vividStaff.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Staff Members Yet</h3>
              <p className="text-slate-500 mb-4">Get started by inviting your first team member</p>
              <Button onClick={() => setShowInviteDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Invite Staff Member
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {vividStaff.map(staff => {
                const roleInfo = VIVID_STAFF_ROLES.find(r => r.value === staff.role);
                return (
                  <div key={staff.id} className="flex items-center gap-4 p-4 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-semibold text-lg">
                      {staff.full_name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-slate-900">{staff.full_name}</p>
                        {staff.id === currentUser?.id && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm text-slate-500">{staff.email}</p>
                        {staff.job_title && (
                          <>
                            <span className="text-slate-300">•</span>
                            <p className="text-sm text-slate-500">{staff.job_title}</p>
                          </>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className={getRoleBadgeColor(staff.role)}>
                      {roleInfo?.label || staff.role}
                    </Badge>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(staff)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {staff.id !== currentUser?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(staff)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Staff Member</DialogTitle>
            <DialogDescription>
              Add a new member to your Vivid BMS team
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="John Smith"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@vividbms.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VIVID_STAFF_ROLES.map(role => (
                    <SelectItem key={role.value} value={role.value}>
                      <div>
                        <p className="font-medium">{role.label}</p>
                        <p className="text-xs text-slate-500">{role.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="job_title">Job Title (Optional)</Label>
              <Input
                id="job_title"
                value={formData.job_title}
                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                placeholder="Account Manager"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? 'Inviting...' : 'Send Invitation'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
            <DialogDescription>
              Update team member information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name *</Label>
              <Input
                id="edit-name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                value={formData.email}
                disabled
                className="bg-slate-50"
              />
              <p className="text-xs text-slate-500">Email cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role *</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VIVID_STAFF_ROLES.map(role => (
                    <SelectItem key={role.value} value={role.value}>
                      <div>
                        <p className="font-medium">{role.label}</p>
                        <p className="text-xs text-slate-500">{role.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-job_title">Job Title</Label>
              <Input
                id="edit-job_title"
                value={formData.job_title}
                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Updating...' : 'Update'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Staff Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{selectedStaff?.full_name}</strong> from your Vivid BMS team?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(selectedStaff.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}