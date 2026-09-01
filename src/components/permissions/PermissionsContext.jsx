import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const PermissionsContext = createContext();

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within PermissionsProvider');
  }
  return context;
};

// Default role permissions
const DEFAULT_PERMISSIONS = {
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
  owner: {
    documents: { view: true, create: false, edit: false, delete: false },
    buildings: { view: true, create: false, edit: false, delete: false },
    residents: { view: true, create: false, edit: false, delete: false },
    work_orders: { view: true, create: true, edit: false, delete: false, assign: false },
    announcements: { view: true, create: false, edit: false, delete: false },
    amenities: { view: true, book: true, manage: false },
    contractors: { view: false, create: false, edit: false, delete: false },
    reports: { view: false, generate: false }
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
  },
  staff: {
    documents: { view: true, create: true, edit: true, delete: false },
    buildings: { view: true, create: false, edit: true, delete: false },
    residents: { view: true, create: true, edit: true, delete: false },
    work_orders: { view: true, create: true, edit: true, delete: false, assign: true },
    announcements: { view: true, create: true, edit: true, delete: false },
    amenities: { view: true, book: true, manage: true },
    contractors: { view: true, create: true, edit: true, delete: false },
    reports: { view: true, generate: true }
  },
  external_management: {
    documents: { view: true, create: true, edit: true, delete: false },
    buildings: { view: true, create: false, edit: true, delete: false },
    residents: { view: true, create: false, edit: false, delete: false },
    work_orders: { view: true, create: false, edit: false, delete: false, assign: false },
    announcements: { view: true, create: false, edit: false, delete: false },
    amenities: { view: true, book: false, manage: false },
    contractors: { view: true, create: false, edit: false, delete: false },
    reports: { view: true, generate: false }
  },
  contractor: {
    documents: { view: true, create: false, edit: false, delete: false },
    buildings: { view: false, create: false, edit: false, delete: false },
    residents: { view: false, create: false, edit: false, delete: false },
    work_orders: { view: true, create: false, edit: true, delete: false, assign: false },
    announcements: { view: true, create: false, edit: false, delete: false },
    amenities: { view: false, book: false, manage: false },
    contractors: { view: false, create: false, edit: false, delete: false },
    reports: { view: false, generate: false }
  }
};

export const PermissionsProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [overrideActive, setOverrideActive] = useState(false);

  useEffect(() => {
    loadUserPermissions();
  }, []);

  const loadUserPermissions = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Check whether the admin-enabled test-access override is active.
      let overrideOn = false;
      try {
        const records = await base44.entities.SystemSetting.filter({ setting_key: 'test_access_override' });
        overrideOn = records.length > 0 && records[0].setting_value === 'true';
      } catch (e) {
        overrideOn = false;
      }
      setOverrideActive(overrideOn);

      // When the override is enabled (admin turned it on for Testing Agent runs),
      // elevate this non-admin session to full admin permissions in-memory only.
      if (overrideOn) {
        setPermissions(DEFAULT_PERMISSIONS.admin);
        return;
      }

      // Get user's role (fallback to 'user' for backwards compatibility)
      const userRole = currentUser.user_role || (currentUser.role === 'admin' ? 'admin' : 'resident');
      
      // Use custom permissions if set, otherwise use role defaults
      let userPermissions = currentUser.permissions || DEFAULT_PERMISSIONS[userRole] || DEFAULT_PERMISSIONS.resident;
      
      // Merge with defaults to ensure all permissions exist
      const roleDefaults = DEFAULT_PERMISSIONS[userRole] || DEFAULT_PERMISSIONS.resident;
      userPermissions = {
        documents: { ...roleDefaults.documents, ...userPermissions.documents },
        buildings: { ...roleDefaults.buildings, ...userPermissions.buildings },
        residents: { ...roleDefaults.residents, ...userPermissions.residents },
        work_orders: { ...roleDefaults.work_orders, ...userPermissions.work_orders },
        announcements: { ...roleDefaults.announcements, ...userPermissions.announcements },
        amenities: { ...roleDefaults.amenities, ...userPermissions.amenities },
        contractors: { ...roleDefaults.contractors, ...userPermissions.contractors },
        reports: { ...roleDefaults.reports, ...userPermissions.reports }
      };

      setPermissions(userPermissions);
    } catch (error) {
      console.error('Error loading permissions:', error);
      setPermissions(DEFAULT_PERMISSIONS.resident);
    } finally {
      setLoading(false);
    }
  };

  const can = (resource, action) => {
    if (!permissions) return false;
    return permissions[resource]?.[action] === true;
  };

  const isAdmin = () => {
    return overrideActive || user?.role === 'admin' || user?.user_role === 'admin';
  };

  const hasRole = (role) => {
    if (overrideActive && role === 'admin') return true;
    return user?.user_role === role || (role === 'admin' && user?.role === 'admin');
  };

  return (
    <PermissionsContext.Provider value={{ 
      user, 
      permissions, 
      can, 
      isAdmin,
      hasRole,
      loading,
      overrideActive,
      refresh: loadUserPermissions
    }}>
      {children}
    </PermissionsContext.Provider>
  );
};