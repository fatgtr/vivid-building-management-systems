import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { BuildingProvider, useBuildingContext } from '@/components/BuildingContext';
import { PermissionsProvider, usePermissions } from '@/components/permissions/PermissionsContext';
import AIAssistant from '@/components/ai/AIAssistant';
import GlobalNotificationBell from '@/components/notifications/GlobalNotificationBell';
import { 
  Building2, 
  Home, 
  Users, 
  Wrench, 
  Calendar, 
  Bell, 
  FileText, 
  ClipboardCheck,
  UserCircle,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Settings,
  HardHat,
  DoorOpen,
  LayoutDashboard,
  Shield,
  Mail,
  Sparkles,
  MessageSquare,
  TrendingUp
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const navItems = [
  { name: 'Home', icon: Home, page: 'Home', adminOnly: false },
  { name: 'Dashboard', icon: LayoutDashboard, page: 'Dashboard', adminOnly: false },
  { name: 'Platform Dashboard', icon: Sparkles, page: 'PlatformDashboard', adminOnly: true },
  { name: 'Buildings', icon: Building2, page: 'Buildings', requirePermission: { resource: 'buildings', action: 'view' } },
  { name: 'Residents Center', icon: Users, page: 'ResidentsCenter', requirePermission: { resource: 'residents', action: 'view' } },
  { name: 'Operations Center', icon: Wrench, page: 'OperationsCenter', requirePermission: { resource: 'work_orders', action: 'view' } },
  { name: 'Capital Works', icon: TrendingUp, page: 'CapitalWorksPlanning', requirePermission: { resource: 'buildings', action: 'view' } },
  { name: 'Communications', icon: MessageSquare, page: 'Communications', requirePermission: { resource: 'announcements', action: 'view' } },
  { name: 'Contractor Portal', icon: HardHat, page: 'ContractorPortal', contractorOnly: true },
  { name: 'Smart Devices', icon: Settings, page: 'SmartDevices', requirePermission: { resource: 'buildings', action: 'view' } },
  { name: 'Strata Knowledge Base', icon: FileText, page: 'StrataKnowledgeBase', requirePermission: { resource: 'documents', action: 'view' } },
  { name: 'Role Management', icon: Shield, page: 'RoleManagement', adminOnly: true },
  { name: 'Partner Management', icon: Building2, page: 'PartnerManagement', adminOnly: true },
  { name: 'Vivid Staff', icon: Users, page: 'VividStaffManagement', adminOnly: true },
];

function LayoutInner({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const { selectedBuildingId, setSelectedBuildingId, managedBuildings, isAdmin } = useBuildingContext();
  const { can, isAdmin: isPermissionAdmin, hasRole } = usePermissions();

  useEffect(() => {
    // Don't require auth for landing page
    if (currentPageName === 'LandingPage' || currentPageName === 'Home') {
      return;
    }
    base44.auth.me().then(setUser).catch(() => {});
  }, [currentPageName]);

  // Check if user is a contractor
  const isContractor = user?.contractor_id || hasRole('contractor');

  const handleLogout = () => {
    base44.auth.logout();
  };

  // Render landing page without layout wrapper
  if (currentPageName === 'LandingPage' || currentPageName === 'Home') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <style>{`
        :root {
          --primary: 222 47% 11%;
          --primary-foreground: 210 40% 98%;
          --accent: 217 91% 60%;
          --keyvision-blue-start: #3B82F6;
          --keyvision-blue-end: #6366F1;
          --keyvision-text-dark: #1A202C;
          --keyvision-text-light: #4A5568;
          --keyvision-bg-light: #F8FAFC;
          --keyvision-border: #E2E8F0;
        }
        .sidebar-link {
          transition: all 0.2s ease;
        }
        .sidebar-link:hover {
          background: linear-gradient(90deg, rgba(59, 130, 246, 0.1) 0%, transparent 100%);
        }
        .sidebar-link.active {
          background: linear-gradient(90deg, rgba(59, 130, 246, 0.15) 0%, transparent 100%);
          border-left: 3px solid #3b82f6;
        }
        .keyvision-gradient-text {
          background: linear-gradient(to right, var(--keyvision-blue-start), var(--keyvision-blue-end));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .keyvision-gradient-bg {
          background: linear-gradient(to right bottom, var(--keyvision-blue-start), var(--keyvision-blue-end));
        }
        .keyvision-card {
          background: white;
          border: 1px solid var(--keyvision-border);
          border-radius: 0.75rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          transition: all 0.3s ease;
        }
        .keyvision-card:hover {
          border-color: rgba(59, 130, 246, 0.4);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          transform: translateY(-2px);
        }
      `}</style>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-slate-900">Vivid BMS</span>
          </div>
        </div>
        {user && (
          <>
            <GlobalNotificationBell userEmail={user.email} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <UserCircle className="h-6 w-6 text-slate-600" />
                </Button>
              </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{user.full_name}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
            </>
            )}
      </header>

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full bg-white border-r border-slate-200 z-40 transition-all duration-300",
        collapsed ? "w-20" : "w-64",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className={cn(
          "h-16 border-b border-slate-200 flex items-center",
          collapsed ? "justify-center px-2" : "px-6"
        )}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            {!collapsed && (
              <div>
                <h1 className="font-bold text-slate-900 tracking-tight">Vivid BMS</h1>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Building Management Systems</p>
              </div>
            )}
          </div>
        </div>

        {/* Building Selector */}
        {managedBuildings.length > 0 && (
          <div className={cn("p-3 border-b border-slate-200", collapsed && "px-2")}>
            {!collapsed ? (
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 block">
                  {isAdmin ? 'All Buildings' : 'Your Building'}
                </label>
                <Select value={selectedBuildingId || ''} onValueChange={setSelectedBuildingId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select building" />
                  </SelectTrigger>
                  <SelectContent>
                    {managedBuildings.map((building) => (
                      <SelectItem key={building.id} value={building.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{building.name}</span>
                          {building.strata_plan_number && (
                            <span className="text-xs text-slate-500">SP: {building.strata_plan_number}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="flex justify-center">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-8rem)]">
          {navItems.map((item) => {
            const isActive = currentPageName === item.page;

            // Hide Home page for logged-in users
            if (item.page === 'Home' && user) return null;

            // Check admin-only pages
            if (item.adminOnly && !isAdmin && !isPermissionAdmin()) return null;

            // Check contractor-only pages
            if (item.contractorOnly && !isContractor) return null;
            if (!item.contractorOnly && isContractor && item.page !== 'Dashboard') return null;

            // Check permission-based pages
            if (item.requirePermission && !isPermissionAdmin()) {
              const { resource, action } = item.requirePermission;
              if (!can(resource, action)) return null;
            }

            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive 
                    ? "text-blue-600 bg-blue-50" 
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-blue-600")} />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        {user && (
          <div className={cn(
            "absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-slate-50/50",
            collapsed ? "p-2" : "p-4"
          )}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn(
                  "w-full flex items-center gap-3 rounded-lg hover:bg-slate-100 transition-colors",
                  collapsed ? "justify-center p-2" : "p-2"
                )}>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                    {user.full_name?.charAt(0) || 'U'}
                  </div>
                  {!collapsed && (
                    <>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{user.full_name}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                      <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    </>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl('Settings')} className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className={cn(
        "transition-all duration-300 min-h-screen",
        collapsed ? "lg:ml-20" : "lg:ml-64",
        "pt-16 lg:pt-0"
      )}>
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>

      {/* AI Assistant Floating Button */}
      {user && (
        <>
          {!showAIAssistant && (
            <button
              onClick={() => setShowAIAssistant(true)}
              className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-full shadow-2xl hover:shadow-blue-500/50 hover:scale-110 transition-all duration-200 flex items-center justify-center z-40"
              aria-label="Open AI Assistant"
            >
              <Sparkles className="h-6 w-6" />
            </button>
          )}

          {showAIAssistant && (
            <AIAssistant 
              buildingId={selectedBuildingId}
              onClose={() => setShowAIAssistant(false)}
            />
          )}
        </>
      )}
      </div>
      );
      }

      export default function Layout({ children, currentPageName }) {
      return (
      <PermissionsProvider>
      <BuildingProvider>
        <LayoutInner children={children} currentPageName={currentPageName} />
      </BuildingProvider>
      </PermissionsProvider>
      );
      }