'use client';

import { Badge } from '@/components/ui/badge';
import { useBaseAccount } from '@/hooks/useBaseAccount';
import {
  checkSpendPermission,
  getSpendPermissionDetails,
  isGameSpendPermissionsEnabled,
  type SpendPermissionDetails,
} from '@/lib/base-account/spendPermissions';
import { Shield, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SpendPermissionBadgeProps {
  className?: string;
  showDetails?: boolean;
}

export default function SpendPermissionBadge({
  className = '',
  showDetails = false,
}: SpendPermissionBadgeProps) {
  const { address, isConnected } = useBaseAccount();
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionDetails, setPermissionDetails] = useState<SpendPermissionDetails | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!address || !isConnected || !isGameSpendPermissionsEnabled()) {
        if (!cancelled) {
          setHasPermission(false);
          setPermissionDetails(null);
        }
        return;
      }

      const active = await checkSpendPermission(address);
      if (cancelled) {
        return;
      }

      setHasPermission(active);

      if (active) {
        const details = await getSpendPermissionDetails(address);
        if (!cancelled) {
          setPermissionDetails(details);
        }
      } else {
        setPermissionDetails(null);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [address, isConnected]);

  if (!isConnected || !address || !isGameSpendPermissionsEnabled()) {
    return null;
  }

  const getBadgeVariant = () => {
    if (!hasPermission) {
      return 'destructive';
    }
    if (permissionDetails?.isExpired) {
      return 'destructive';
    }
    if (permissionDetails && permissionDetails.daysRemaining < 7) {
      return 'secondary';
    }
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

    if (permissionDetails && permissionDetails.daysRemaining < 7) {
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
    if (permissionDetails && permissionDetails.daysRemaining < 7) {
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    }
    return 'bg-green-500/20 text-green-400 border-green-500/30';
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge variant={getBadgeVariant()} className={getBadgeClassName()}>
        <Shield className="h-3 w-3 mr-1" />
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
