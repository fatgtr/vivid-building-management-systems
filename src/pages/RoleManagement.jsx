import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import PageHeader from '@/components/common/PageHeader';
import { Shield, Users, Settings, Edit, Save, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";

export default function RoleManagement() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: roleTemplates = [] } = useQuery({
    queryKey: ['roleTemplates'],
    queryFn: () => base44.entities.RoleTemplate.list(),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }) => base44.asServiceRole.entities.User.update(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User permissions updated successfully');
      setEditingUser(null);
      setSelectedUser(null);
    },
  });

  const createRoleTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.RoleTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roleTemplates'] });
      toast.success('Role template created');
    },
  });

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEditUser = (user) => {
    setEditingUser({
      ...user,
      permissions: user.permissions || getDefaultPermissions(user.user_role || 'resident')
    });
  };

  const getDefaultPermissions = (role) => {
    const template = roleTemplates.find(t => t.role_name === role);
    if (template) return template.permissions;

    // Fallback defaults
    const defaults = {
      admin: {
        documents: { view: true, create: true, edit: true, delete: true },
        buildings: { view: true, create: true, edit: true, delete: true },
        residents: { view: true, create: true, edit: true, delete: true },
        work_orders: { view: true, create: true, edit: true, delete: true, assign: true },
        announcements: { view: true, create: true, edit: true, delete: true },
        amenities: { view: true, book: true, manage: true },
        contractors: { view: true, create: true, edit: true, delete: true },
        reports: { view: true, generate: true }
      },
      resident: {
        documents: { view: true, create: false, edit: false, delete: false },
        buildings: { view: false, create: false, edit: false, delete: false },
        residents: { view: false, create: false, edit: false, delete: false },
        work_orders: { view: true, create: true, edit: false, delete: false, assign: false },
        announcements: { view: true, create: false, edit: false, delete: false },
        amenities: { view: true, book: true, manage: false },
        contractors: { view: false, create: false, edit: false, delete: false },
        reports: { view: false, generate: false }
      }
    };
    return defaults[role] || defaults.resident;
  };

  const handleSavePermissions = () => {
    if (!editingUser) return;

    updateUserMutation.mutate({
      userId: editingUser.id,
      data: {
        user_role: editingUser.user_role,
        permissions: editingUser.permissions
      }
    });
  };

  const updatePermission = (resource, action, value) => {
    setEditingUser(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [resource]: {
          ...prev.permissions[resource],
          [action]: value
        }
      }
    }));
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-700 border-purple-200',
      owner: 'bg-blue-100 text-blue-700 border-blue-200',
      resident: 'bg-green-100 text-green-700 border-green-200',
      staff: 'bg-orange-100 text-orange-700 border-orange-200',
      external_management: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      contractor: 'bg-slate-100 text-slate-700 border-slate-200'
    };
    return colors[role] || colors.resident;
  };

  const resources = [
    { key: 'documents', label: 'Documents', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'buildings', label: 'Buildings', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'residents', label: 'Residents', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'work_orders', label: 'Work Orders', actions: ['view', 'create', 'edit', 'delete', 'assign'] },
    { key: 'announcements', label: 'Announcements', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'amenities', label: 'Amenities', actions: ['view', 'book', 'manage'] },
    { key: 'contractors', label: 'Contractors', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'reports', label: 'Reports', actions: ['view', 'generate'] }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Role Management"
        subtitle="Manage user roles and permissions across the system"
      />

      <Tabs defaultValue="users" className="w-full">
        <TabsList>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            User Permissions
          </TabsTrigger>
          <TabsTrigger value="roles">
            <Shield className="h-4 w-4 mr-2" />
            Role Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>User List</CardTitle>
              <CardDescription>View and manage individual user permissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              <div className="space-y-2">
                {filteredUsers.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{user.full_name}</p>
                        <Badge variant="outline" className={getRoleBadgeColor(user.user_role || 'resident')}>
                          {user.user_role || 'resident'}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500">{user.email}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditUser(user)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Permissions
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Role Templates</CardTitle>
              <CardDescription>Default permission sets for each role type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {['admin', 'owner', 'resident', 'staff', 'external_management', 'contractor'].map(role => {
                  const template = roleTemplates.find(t => t.role_name === role);
                  const perms = template?.permissions || getDefaultPermissions(role);
                  const activePerms = Object.values(perms).reduce((count, resource) => 
                    count + Object.values(resource).filter(Boolean).length, 0
                  );

                  return (
                    <Card key={role} className="border-2">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <Badge className={getRoleBadgeColor(role)}>
                            {role.replace('_', ' ')}
                          </Badge>
                          {template?.is_default && (
                            <Badge variant="outline">System</Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg capitalize">{role.replace('_', ' ')}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-slate-600 mb-2">
                          {activePerms} active permissions
                        </p>
                        <p className="text-xs text-slate-500">
                          {template?.description || `Default permissions for ${role} users`}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Permissions Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User Permissions</DialogTitle>
            <DialogDescription>
              Customize permissions for {editingUser?.full_name}
            </DialogDescription>
          </DialogHeader>

          {editingUser && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>User Role</Label>
                <Select
                  value={editingUser.user_role || 'resident'}
                  onValueChange={(value) => setEditingUser(prev => ({ 
                    ...prev, 
                    user_role: value,
                    permissions: getDefaultPermissions(value)
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="resident">Resident</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="external_management">External Management</SelectItem>
                    <SelectItem value="contractor">Contractor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-semibold">Custom Permissions</h3>
                {resources.map(resource => (
                  <Card key={resource.key} className="border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{resource.label}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {resource.actions.map(action => (
                          <div key={action} className="flex items-center justify-between">
                            <Label htmlFor={`${resource.key}-${action}`} className="text-sm capitalize">
                              {action}
                            </Label>
                            <Switch
                              id={`${resource.key}-${action}`}
                              checked={editingUser.permissions?.[resource.key]?.[action] || false}
                              onCheckedChange={(checked) => updatePermission(resource.key, action, checked)}
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingUser(null)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSavePermissions}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Permissions
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}