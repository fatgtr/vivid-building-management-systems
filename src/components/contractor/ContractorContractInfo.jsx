import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

export default function ContractorContractInfo({ contractor }) {
  if (!contractor.contract_start_date && !contractor.contract_end_date) {
    return null;
  }

  const today = new Date();
  const endDate = contractor.contract_end_date ? new Date(contractor.contract_end_date) : null;
  const daysUntilExpiry = endDate ? differenceInDays(endDate, today) : null;
  
  const isExpired = endDate && endDate < today;
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 60;
  const isActive = endDate && endDate > today;

  return (
    <Card className={`border-l-4 ${
      isExpired ? 'border-l-red-500 bg-red-50' : 
      isExpiringSoon ? 'border-l-orange-500 bg-orange-50' : 
      'border-l-green-500 bg-green-50'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <FileText className={`h-5 w-5 ${
              isExpired ? 'text-red-600' : 
              isExpiringSoon ? 'text-orange-600' : 
              'text-green-600'
            }`} />
            <div>
              <div className="font-semibold text-slate-900 mb-1">
                {contractor.contract_type || 'Contract'} Agreement
              </div>
              <div className="space-y-1 text-sm">
                {contractor.contract_start_date && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="h-3 w-3" />
                    <span>Start: {format(new Date(contractor.contract_start_date), 'MMM d, yyyy')}</span>
                  </div>
                )}
                {contractor.contract_end_date && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="h-3 w-3" />
                    <span>End: {format(new Date(contractor.contract_end_date), 'MMM d, yyyy')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div>
            {isExpired && (
              <Badge className="bg-red-600">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Expired
              </Badge>
            )}
            {isExpiringSoon && (
              <Badge className="bg-orange-600">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Expires in {daysUntilExpiry} days
              </Badge>
            )}
            {isActive && !isExpiringSoon && (
              <Badge className="bg-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Active
              </Badge>
            )}
          </div>
        </div>

        {contractor.contract_document_url && (
          <a 
            href={contractor.contract_document_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline mt-2 inline-block"
          >
            View Contract Document →
          </a>
        )}
      </CardContent>
    </Card>
  );
}