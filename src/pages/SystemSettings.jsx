import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { usePermissions } from '@/components/permissions/PermissionsContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Settings,
  Image,
  Wrench,
  Package,
  Users,
  FileText,
  HardHat,
  Mail,
  MessageSquare,
  Bell,
  Calendar,
  Car,
  Vote,
  ShoppingBag,
  Globe,
  Database,
  Tag,
  Languages,
  Building2,
  FileStack,
  Key,
  Heart,
  Truck,
  Briefcase,
  Shield,
  Palette,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SystemSettings() {
  const { isAdmin } = usePermissions();

  // Only admins should access system settings
  if (!isAdmin()) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access system settings.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const generalSettings = [
    { title: 'Logo & Branding', description: 'Customize your application logo and branding', icon: Image, page: 'BrandingSettings' },
    { title: 'Buildings', description: 'Manage building configurations and settings', icon: Building2, page: 'Buildings' },
    { title: 'Work Orders', description: 'Configure work order categories and workflows', icon: Wrench, page: 'WorkOrderSettings' },
    { title: 'Assets', description: 'Manage asset categories and compliance settings', icon: Package, page: 'AssetSettings' },
    { title: 'Residents', description: 'Configure resident management settings', icon: Users, page: 'ResidentSettings' },
    { title: 'Contractors', description: 'Manage contractor settings and requirements', icon: HardHat, page: 'ContractorSettings' },
    { title: 'Documents', description: 'Configure document categories and templates', icon: FileText, page: 'DocumentSettings' },
  ];

  const communicationSettings = [
    { title: 'Email Templates', description: 'Manage email templates for various notifications', icon: Mail, page: 'EmailTemplateSettings' },
    { title: 'Announcements', description: 'Configure announcement settings and templates', icon: Bell, page: 'AnnouncementSettings' },
    { title: 'Broadcasts', description: 'Manage broadcast messaging settings', icon: MessageSquare, page: 'BroadcastSettings' },
    { title: 'Amenity Bookings', description: 'Configure amenity booking notifications', icon: Calendar, page: 'AmenitySettings' },
    { title: 'Maintenance Requests', description: 'Set up maintenance request notifications', icon: Wrench, page: 'MaintenanceNotificationSettings' },
    { title: 'Visitor Parking', description: 'Configure visitor parking notifications', icon: Car, page: 'VisitorParkingSettings' },
  ];

  const moduleSettings = [
    { title: 'Voting & Polls', description: 'Configure voting and polling settings', icon: Vote, page: 'VotingSettings' },
    { title: 'Marketplace', description: 'Manage marketplace settings and categories', icon: ShoppingBag, page: 'MarketplaceSettings' },
    { title: 'Key Management', description: 'Configure key register settings', icon: Key, page: 'KeySettings' },
    { title: 'Pet Registry', description: 'Manage pet registry settings', icon: Heart, page: 'PetSettings' },
    { title: 'Move Coordinator', description: 'Configure move booking settings', icon: Truck, page: 'MoveSettings' },
    { title: 'Service Directory', description: 'Manage service provider settings', icon: Briefcase, page: 'ServiceSettings' },
    { title: 'Financial', description: 'Configure levy and financial settings', icon: DollarSign, page: 'FinancialSettings' },
    { title: 'Capital Works', description: 'Manage capital works planning settings', icon: TrendingUp, page: 'CapitalWorksSettings' },
  ];

  const advancedSettings = [
    { title: 'Terminology', description: 'Customize system terminology and labels', icon: Languages, page: 'TerminologySettings' },
    { title: 'Categories & Descriptions', description: 'Manage categories and descriptions', icon: Tag, page: 'CategorySettings' },
    { title: 'Localization', description: 'Configure language and regional settings', icon: Globe, page: 'LocalizationSettings' },
    { title: 'Database Management', description: 'Import/export data and manage database', icon: Database, page: 'DatabaseSettings' },
    { title: 'Role Management', description: 'Configure user roles and permissions', icon: Shield, page: 'RoleManagement' },
    { title: 'Theme & Appearance', description: 'Customize application theme and colors', icon: Palette, page: 'ThemeSettings' },
  ];

  const SettingCard = ({ setting }) => (
    <Link to={createPageUrl(setting.page)}>
      <Card className="h-full hover:shadow-md transition-all duration-200 hover:border-blue-300 cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center flex-shrink-0">
              <setting.icon className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 mb-1">{setting.title}</h3>
              <p className="text-sm text-slate-500 line-clamp-2">{setting.description}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">System Settings</h1>
          <p className="text-slate-500 mt-1">Configure and customize your building management system</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600" />
                <CardTitle>General Settings</CardTitle>
              </div>
              <CardDescription>
                Core system configurations for buildings, work orders, assets, and more
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {generalSettings.map((setting) => (
                  <SettingCard key={setting.page} setting={setting} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Communication Settings */}
        <TabsContent value="communication" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                <CardTitle>Email & Communication Settings</CardTitle>
              </div>
              <CardDescription>
                Configure email templates, notifications, and messaging options
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {communicationSettings.map((setting) => (
                  <SettingCard key={setting.page} setting={setting} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Module Settings */}
        <TabsContent value="modules" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileStack className="h-5 w-5 text-blue-600" />
                <CardTitle>Module Settings</CardTitle>
              </div>
              <CardDescription>
                Configure settings for specific features and modules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {moduleSettings.map((setting) => (
                  <SettingCard key={setting.page} setting={setting} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Settings */}
        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                <CardTitle>Advanced Settings</CardTitle>
              </div>
              <CardDescription>
                System-level configurations, database management, and customization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {advancedSettings.map((setting) => (
                  <SettingCard key={setting.page} setting={setting} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}