'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useBaseAccount } from '@/hooks/useBaseAccount';
import { 
  checkSpendPermission, 
  requestGameSpendPermission, 
  revokeSpendPermission, 
  getSpendPermissionDetails,
  ensureSpendPermission 
} from '@/lib/base-account/spendPermissions';
import { Shield, CheckCircle, AlertTriangle, Clock, DollarSign, Zap } from 'lucide-react';

interface SpendPermissionManagerProps {
  onPermissionGranted?: () => void;
  onPermissionRevoked?: () => void;
  className?: string;
}

export default function SpendPermissionManager({ 
  onPermissionGranted, 
  onPermissionRevoked, 
  className = '' 
}: SpendPermissionManagerProps) {
  const { address, isConnected } = useBaseAccount();
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionDetails, setPermissionDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Check permission status on mount and when address changes
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

  const handleRequestPermission = async () => {
    if (!address) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const granted = await requestGameSpendPermission(address);
      if (granted) {
        setHasPermission(true);
        const details = getSpendPermissionDetails(address);
        setPermissionDetails(details);
        onPermissionGranted?.();
      } else {
        setError('Failed to grant spend permission');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request permission');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokePermission = async () => {
    if (!address) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const revoked = await revokeSpendPermission(address);
      if (revoked) {
        setHasPermission(false);
        setPermissionDetails(null);
        onPermissionRevoked?.();
      } else {
        setError('Failed to revoke spend permission');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke permission');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnsurePermission = async () => {
    if (!address) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const hasPermission = await ensureSpendPermission(address);
      setHasPermission(hasPermission);
      
      if (hasPermission) {
        const details = getSpendPermissionDetails(address);
        setPermissionDetails(details);
        onPermissionGranted?.();
      } else {
        setError('Failed to ensure spend permission');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to ensure permission');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected || !address) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-white">
            <Shield className="h-5 w-5 text-purple-400" />
            Spend Permissions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Permission Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {hasPermission ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
              )}
              <span className="text-sm text-white">
                {hasPermission ? 'Active' : 'Not Set'}
              </span>
            </div>
            <Badge 
              variant={hasPermission ? "default" : "destructive"}
              className={hasPermission ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}
            >
              {hasPermission ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>

          {/* Permission Details */}
          {hasPermission && permissionDetails && (
            <div className="bg-white/5 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300">Allowance:</span>
                <span className="text-white font-mono">
                  {(Number(permissionDetails.allowance) / 1e6).toFixed(0)} USDC
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300">Days Remaining:</span>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span className="text-white">
                    {Math.ceil(permissionDetails.daysRemaining)} days
                  </span>
                </div>
              </div>
              {permissionDetails.isExpired && (
                <div className="text-xs text-red-400 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Permission expired
                </div>
              )}
            </div>
          )}

          {/* Benefits */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <div className="text-xs text-blue-300">
              <p className="font-medium mb-1">Spend Permission Benefits:</p>
              <ul className="space-y-1 text-blue-200/80">
                <li>• Gasless game entry transactions</li>
                <li>• Seamless gameplay without signing each transaction</li>
                <li>• Enhanced security with Sub Account isolation</li>
                <li>• Automatic funding from universal account</li>
              </ul>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert className="border-red-500/20 bg-red-500/10">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription className="text-red-300 text-sm">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            {!hasPermission ? (
              <Button
                onClick={handleRequestPermission}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-400 hover:to-blue-400 text-white"
              >
                {isLoading ? (
                  <>
                    <Zap className="h-4 w-4 mr-2 animate-pulse" />
                    Requesting Permission...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Enable Spend Permissions
                  </>
                )}
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={handleEnsurePermission}
                  disabled={isLoading}
                  variant="outline"
                  className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button
                  onClick={handleRevokePermission}
                  disabled={isLoading}
                  variant="outline"
                  className="flex-1 bg-red-500/10 border-red-500/20 text-red-300 hover:bg-red-500/20"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Revoke
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
