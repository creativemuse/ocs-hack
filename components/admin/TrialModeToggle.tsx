'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function TrialModeToggle() {
  const [bypassTrial, setBypassTrial] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check current mode from environment
    const currentMode = process.env.NEXT_PUBLIC_BYPASS_TRIAL === 'true';
    setBypassTrial(currentMode);
    setIsLoading(false);
  }, []);

  const handleToggle = () => {
    setBypassTrial(!bypassTrial);
    // Note: This is a client-side toggle for demonstration
    // In production, you'd need to update the environment variable
    // and restart the server for the change to take effect
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-6 bg-gray-300 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Trial Mode Configuration
          <Badge variant={bypassTrial ? "destructive" : "default"}>
            {bypassTrial ? "Paid Only" : "Trial Enabled"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="trial-mode"
            checked={bypassTrial}
            onCheckedChange={handleToggle}
          />
          <Label htmlFor="trial-mode">
            {bypassTrial ? "Disable Trial (Paid Only)" : "Enable Trial Mode"}
          </Label>
        </div>
        
        <div className="text-sm text-gray-600">
          {bypassTrial ? (
            <div>
              <p className="font-medium text-red-600">Paid Player Mode Active</p>
              <ul className="mt-2 space-y-1 text-xs">
                <li>• No free trial games</li>
                <li>• Wallet connection required</li>
                <li>• Payment required to play</li>
              </ul>
            </div>
          ) : (
            <div>
              <p className="font-medium text-green-600">Trial Mode Active</p>
              <ul className="mt-2 space-y-1 text-xs">
                <li>• 1 free trial game per user</li>
                <li>• Anonymous users can play</li>
                <li>• Wallet required after trial</li>
              </ul>
            </div>
          )}
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
          <p className="text-xs text-yellow-800">
            <strong>Note:</strong> This is a demo toggle. To change the actual mode, 
            update <code>NEXT_PUBLIC_BYPASS_TRIAL</code> in your environment variables 
            and restart the server.
          </p>
        </div>

        <Button 
          onClick={() => window.location.reload()} 
          variant="outline" 
          size="sm"
          className="w-full"
        >
          Refresh Page
        </Button>
      </CardContent>
    </Card>
  );
}
