import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import PageHeader from '@/components/common/PageHeader';
import { User, Bell, Shield, Save } from 'lucide-react';

export default function Settings() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: '',
    phone: '',
    job_title: '',
  });

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setProfileData({
        full_name: u.full_name || '',
        phone: u.phone || '',
        job_title: u.job_title || '',
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    await base44.auth.updateMe({
      phone: profileData.phone,
      job_title: profileData.job_title,
    });
    toast.success('Profile updated successfully');
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader 
        title="Settings" 
        subtitle="Manage your account and preferences"
      />

      {/* Profile Settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={profileData.full_name}
                disabled
                className="bg-slate-50"
              />
              <p className="text-xs text-slate-500 mt-1">Contact admin to change your name</p>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-slate-50"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                placeholder="Your phone number"
              />
            </div>
            <div>
              <Label htmlFor="job_title">Job Title</Label>
              <Input
                id="job_title"
                value={profileData.job_title}
                onChange={(e) => setProfileData({ ...profileData, job_title: e.target.value })}
                placeholder="e.g., Building Manager"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button 
              onClick={handleSaveProfile} 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Shield className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle>Account</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div>
                <p className="font-medium text-slate-900">Role</p>
                <p className="text-sm text-slate-500">Your access level in the system</p>
              </div>
              <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium capitalize">
                {user?.role || 'User'}
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-slate-900">Account Created</p>
                <p className="text-sm text-slate-500">When you joined the platform</p>
              </div>
              <span className="text-slate-600">
                {user?.created_date ? new Date(user.created_date).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Bell className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Manage your session</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => base44.auth.logout()}
          >
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}