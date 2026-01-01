import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, Sparkles, CheckCircle, X } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function AIDocumentUploadCard({ 
  title, 
  description, 
  icon: Icon, 
  color = 'cyan',
  onFileSelect, 
  uploading = false,
  resultData = null,
  acceptedFormats = '.pdf,.jpg,.jpeg,.png'
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file && onFileSelect) {
      onFileSelect(file);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onFileSelect) {
      onFileSelect(file);
    }
  };

  const colorMap = {
    cyan: {
      border: 'border-cyan-300 hover:border-cyan-500',
      bg: 'from-cyan-50 to-blue-50',
      text: 'text-cyan-800',
      accent: 'text-cyan-600',
      iconBg: 'bg-cyan-100',
      activeBorder: 'border-cyan-600',
      resultBg: 'bg-cyan-50 border-cyan-200',
      badge: 'bg-cyan-100 text-cyan-700'
    },
    indigo: {
      border: 'border-indigo-300 hover:border-indigo-500',
      bg: 'from-indigo-50 to-purple-50',
      text: 'text-indigo-800',
      accent: 'text-indigo-600',
      iconBg: 'bg-indigo-100',
      activeBorder: 'border-indigo-600',
      resultBg: 'bg-indigo-50 border-indigo-200',
      badge: 'bg-indigo-100 text-indigo-700'
    },
    blue: {
      border: 'border-blue-300 hover:border-blue-500',
      bg: 'from-blue-50 to-sky-50',
      text: 'text-blue-800',
      accent: 'text-blue-600',
      iconBg: 'bg-blue-100',
      activeBorder: 'border-blue-600',
      resultBg: 'bg-blue-50 border-blue-200',
      badge: 'bg-blue-100 text-blue-700'
    },
    emerald: {
      border: 'border-emerald-300 hover:border-emerald-500',
      bg: 'from-emerald-50 to-teal-50',
      text: 'text-emerald-800',
      accent: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
      activeBorder: 'border-emerald-600',
      resultBg: 'bg-emerald-50 border-emerald-200',
      badge: 'bg-emerald-100 text-emerald-700'
    },
    violet: {
      border: 'border-violet-300 hover:border-violet-500',
      bg: 'from-violet-50 to-purple-50',
      text: 'text-violet-800',
      accent: 'text-violet-600',
      iconBg: 'bg-violet-100',
      activeBorder: 'border-violet-600',
      resultBg: 'bg-violet-50 border-violet-200',
      badge: 'bg-violet-100 text-violet-700'
    },
    orange: {
      border: 'border-orange-300 hover:border-orange-500',
      bg: 'from-orange-50 to-amber-50',
      text: 'text-orange-800',
      accent: 'text-orange-600',
      iconBg: 'bg-orange-100',
      activeBorder: 'border-orange-600',
      resultBg: 'bg-orange-50 border-orange-200',
      badge: 'bg-orange-100 text-orange-700'
    },
    purple: {
      border: 'border-purple-300 hover:border-purple-500',
      bg: 'from-purple-50 to-fuchsia-50',
      text: 'text-purple-800',
      accent: 'text-purple-600',
      iconBg: 'bg-purple-100',
      activeBorder: 'border-purple-600',
      resultBg: 'bg-purple-50 border-purple-200',
      badge: 'bg-purple-100 text-purple-700'
    },
    teal: {
      border: 'border-teal-300 hover:border-teal-500',
      bg: 'from-teal-50 to-cyan-50',
      text: 'text-teal-800',
      accent: 'text-teal-600',
      iconBg: 'bg-teal-100',
      activeBorder: 'border-teal-600',
      resultBg: 'bg-teal-50 border-teal-200',
      badge: 'bg-teal-100 text-teal-700'
    },
    yellow: {
      border: 'border-yellow-300 hover:border-yellow-500',
      bg: 'from-yellow-50 to-amber-50',
      text: 'text-yellow-800',
      accent: 'text-yellow-600',
      iconBg: 'bg-yellow-100',
      activeBorder: 'border-yellow-600',
      resultBg: 'bg-yellow-50 border-yellow-200',
      badge: 'bg-yellow-100 text-yellow-700'
    },
    red: {
      border: 'border-red-300 hover:border-red-500',
      bg: 'from-red-50 to-rose-50',
      text: 'text-red-800',
      accent: 'text-red-600',
      iconBg: 'bg-red-100',
      activeBorder: 'border-red-600',
      resultBg: 'bg-red-50 border-red-200',
      badge: 'bg-red-100 text-red-700'
    },
  };

  const colors = colorMap[color] || colorMap.cyan;

  return (
    <Card className={cn(
      "border-2 border-dashed bg-gradient-to-br transition-all duration-300 group",
      colors.border,
      colors.bg,
      isDragging && cn('border-solid', colors.activeBorder, 'shadow-xl scale-105')
    )}>
      <CardHeader className="pb-4">
        <CardTitle className={cn("text-lg font-semibold flex items-center gap-2", colors.text)}>
          <Sparkles className={cn("h-5 w-5", colors.accent)} />
          {title}
        </CardTitle>
        {description && (
          <CardDescription className="text-sm">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "w-full h-32 bg-white border-2 border-dashed rounded-lg transition-all duration-300 flex items-center justify-center",
            colors.border,
            isDragging && cn('border-solid', colors.activeBorder, 'bg-opacity-50')
          )}
        >
          <label className="cursor-pointer flex flex-col items-center justify-center gap-2 w-full h-full">
            {uploading ? (
              <>
                <Loader2 className={cn("h-8 w-8 animate-spin", colors.accent)} />
                <span className={cn("text-sm font-medium", colors.accent)}>Processing...</span>
              </>
            ) : (
              <>
                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", colors.iconBg)}>
                  {Icon ? <Icon className={cn("h-6 w-6", colors.accent)} /> : <Upload className={cn("h-6 w-6", colors.accent)} />}
                </div>
                <span className={cn("text-sm font-medium", colors.text)}>
                  {isDragging ? 'Drop file here' : 'Drag & drop or click to upload'}
                </span>
                <span className={cn("text-xs", colors.accent)}>
                  {acceptedFormats.includes('.pdf') && 'PDF'}
                  {acceptedFormats.includes('.jpg') && ', JPG, PNG'}
                  {' supported'}
                </span>
              </>
            )}
            <input
              type="file"
              className="hidden"
              onChange={handleFileInputChange}
              accept={acceptedFormats}
              disabled={uploading}
            />
          </label>
        </div>

        {resultData?.success && resultData.message && (
          <div className={cn("w-full p-4 border-2 rounded-lg", colors.resultBg)}>
            <p className={cn("text-sm font-semibold flex items-center gap-2", colors.text)}>
              <CheckCircle className={cn("h-5 w-5", colors.accent)} />
              {resultData.message}
            </p>
            {resultData.details && (
              <p className={cn("text-xs mt-2", colors.accent)}>{resultData.details}</p>
            )}
          </div>
        )}

        {resultData?.success === false && resultData.error && (
          <div className="w-full p-3 bg-red-50 border-2 border-red-200 rounded-lg">
            <p className="text-sm font-medium text-red-800 flex items-center gap-2">
              <X className="h-4 w-4 text-red-600" />
              {resultData.error}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}