import React from 'react';
import { Button } from "@/components/ui/button";
import { Plus } from 'lucide-react';

export default function PageHeader({ 
  title, 
  subtitle, 
  action, 
  actionLabel = "Add New", 
  actionIcon: ActionIcon = Plus,
  children 
}) {
  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-slate-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {children}
          {action && (
            <Button 
              onClick={action}
              className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20"
            >
              <ActionIcon className="h-4 w-4 mr-2" />
              {actionLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}