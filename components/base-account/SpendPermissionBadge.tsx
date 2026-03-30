'use client';

import { Badge } from '@/components/ui/badge';
import { useBaseAccount } from '@/hooks/useBaseAccount';
import { checkSpendPermission, getSpendPermissionDetails } from '@/lib/base-account/spendPermissions';
import { Shield, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SpendPermissionBadgeProps {
  className?: string;
  showDetails?: boolean;
}

export default function SpendPermissionBadge({ 
  className = '',
  showDetails = false 
}: SpendPermissionBadgeProps) {
  const { address, isConnected } = useBaseAccount();
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionDetails, setPermissionDetails] = useState<any>(null);

  useEffect(() => {
    if (address && isConnected) {
      const hasSpendPermission = checkSpendPermission(address);
      setHasPermission(hasSpendPermission);
      
      if (hasSpendPermission) {
        const details = getSpendPermissionDetails(address);
        setPermissionDetails(details);
      }
    } else {
      setHasPermission(false);
      setPermissionDetails(null);
    }
  }, [address, isConnected]);

  if (!isConnected || !address) {
    return null;
  }

  const getBadgeVariant = () => {
    if (!hasPermission) return 'destructive';
    if (permissionDetails?.isExpired) return 'destructive';
    if (permissionDetails?.daysRemaining < 7) return 'secondary';
    return 'default';
  };

  const getBadgeContent = () => {
    if (!hasPermission) {
      return (
        <>
          <AlertTriangle className="h-3 w-3 mr-1" />
          No Permission
        </>
      );
    }
    
    if (permissionDetails?.isExpired) {
      return (
        <>
          <AlertTriangle className="h-3 w-3 mr-1" />
          Expired
        </>
      );
    }
    
    if (permissionDetails?.daysRemaining < 7) {
      return (
        <>
          <Clock className="h-3 w-3 mr-1" />
          {Math.ceil(permissionDetails.daysRemaining)}d left
        </>
      );
    }
    
    return (
      <>
        <CheckCircle className="h-3 w-3 mr-1" />
        Active
      </>
    );
  };

  const getBadgeClassName = () => {
    if (!hasPermission || permissionDetails?.isExpired) {
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    }
    if (permissionDetails?.daysRemaining < 7) {
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    }
    return 'bg-green-500/20 text-green-400 border-green-500/30';
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge 
        variant={getBadgeVariant()}
        className={getBadgeClassName()}
      >
        {getBadgeContent()}
      </Badge>
      
      {showDetails && hasPermission && permissionDetails && (
        <div className="text-xs text-gray-400">
          {permissionDetails.daysRemaining > 0 && (
            <span>{Math.ceil(permissionDetails.daysRemaining)} days remaining</span>
          )}
        </div>
      )}
    </div>
  );
}
