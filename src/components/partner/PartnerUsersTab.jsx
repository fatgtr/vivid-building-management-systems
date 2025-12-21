import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from 'sonner';
import { UserPlus, Mail, Pencil, Trash2, Building2 } from 'lucide-react';

export default function PartnerUsersTab({ partnerId }) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    full_name: '',
    email: '',
    partner_role: 'building_manager',
    assigned_buildings: [],
  });

  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['partnerUsers', partnerId],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => u.partner_id === partnerId);
    },
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['partnerBuildings', partnerId],
    queryFn: async () => {
      const allBuildings = await base44.entities.Building.list();
      return allBuildings.filter(b => b.partner_id === partnerId);
    },
  });

  const inviteUserMutation = useMutation({
    mutationFn: async (userData) => {
      // Create the user invite (this would need a backend function)
      const response = await base44.functions.invoke('invitePartnerUser', {
        email: userData.email,
        full_name: userData.full_name,
        partner_id: partnerId,
        partner_role: userData.partner_role,
        assigned_buildings: userData.assigned_buildings,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerUsers', partnerId] });
      setShowDialog(false);
      resetForm();
      toast.success('User invitation sent');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to invite user');
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }) => base44.entities.User.update(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerUsers', partnerId] });
      setShowDialog(false);
      resetForm();
      toast.success('User updated');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId) => base44.entities.User.delete(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerUsers', partnerId] });
      toast.success('User removed');
    },
  });

  const resetForm = () => {
    setUserForm({
      full_name: '',
      email: '',
      partner_role: 'building_manager',
      assigned_buildings: [],
    });
    setEditingUser(null);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setUserForm({
      full_name: user.full_name || '',
      email: user.email || '',
      partner_role: user.partner_role || 'building_manager',
      assigned_buildings: user.assigned_buildings || [],
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (editingUser) {
      updateUserMutation.mutate({
        userId: editingUser.id,
        data: {
          partner_role: userForm.partner_role,
          assigned_buildings: userForm.assigned_buildings,
        },
      });
    } else {
      inviteUserMutation.mutate(userForm);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'partner_admin': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'operations_manager': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'building_manager': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'partner_admin': return 'Partner Admin';
      case 'operations_manager': return 'Operations Manager';
      case 'building_manager': return 'Building Manager';
      default: return role;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Team Members</h3>
          <p className="text-sm text-slate-500">Manage user access and permissions</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite User
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user) => (
          <Card key={user.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                      {user.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">{user.full_name}</CardTitle>
                    <Badge variant="outline" className={`mt-1 text-xs ${getRoleBadgeColor(user.partner_role)}`}>
                      {getRoleLabel(user.partner_role)}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Mail className="h-4 w-4" />
                <span className="truncate">{user.email}</span>
              </div>
              
              {user.assigned_buildings?.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Building2 className="h-4 w-4" />
                  <span>{user.assigned_buildings.length} building(s)</span>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t">
                <Button size="sm" variant="outline" onClick={() => handleEdit(user)} className="flex-1">
                  <Pencil className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => deleteUserMutation.mutate(user.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {users.length === 0 && (
        <Card className="p-12 text-center">
          <UserPlus className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">No team members yet</p>
          <p className="text-sm text-slate-500 mt-1">Invite your first user to get started</p>
        </Card>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Invite New User'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editingUser && (
              <>
                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={userForm.full_name}
                    onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    placeholder="john@example.com"
                  />
                </div>
              </>
            )}
            <div>
              <Label htmlFor="partner_role">Role</Label>
              <Select value={userForm.partner_role} onValueChange={(v) => setUserForm({ ...userForm, partner_role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="partner_admin">Partner Admin (Full Access)</SelectItem>
                  <SelectItem value="operations_manager">Operations Manager</SelectItem>
                  <SelectItem value="building_manager">Building Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {userForm.partner_role === 'building_manager' && (
              <div>
                <Label>Assigned Buildings</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3 mt-1">
                  {buildings.map((building) => (
                    <label key={building.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={userForm.assigned_buildings.includes(building.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setUserForm({ ...userForm, assigned_buildings: [...userForm.assigned_buildings, building.id] });
                          } else {
                            setUserForm({ ...userForm, assigned_buildings: userForm.assigned_buildings.filter(id => id !== building.id) });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{building.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!userForm.email || !userForm.full_name || inviteUserMutation.isPending || updateUserMutation.isPending}
            >
              {editingUser ? 'Update User' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}