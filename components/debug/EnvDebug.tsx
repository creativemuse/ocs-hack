'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function EnvDebug() {
  const envVars = {
    NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS,
    NEXT_PUBLIC_BASE_RPC_URL: process.env.NEXT_PUBLIC_BASE_RPC_URL,
    NEXT_PUBLIC_NETWORK: process.env.NEXT_PUBLIC_NETWORK,
    NODE_ENV: process.env.NODE_ENV,
  };

  const hasRequiredVars = envVars.NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS && envVars.NEXT_PUBLIC_BASE_RPC_URL;

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔧 Environment Variables Debug
          <Badge variant={hasRequiredVars ? "default" : "destructive"}>
            {hasRequiredVars ? "Configured" : "Missing Variables"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-medium">NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS:</span>
            <span className="font-mono text-sm">
              {envVars.NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS || 'Not set'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-medium">NEXT_PUBLIC_BASE_RPC_URL:</span>
            <span className="font-mono text-sm">
              {envVars.NEXT_PUBLIC_BASE_RPC_URL || 'Not set'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-medium">NEXT_PUBLIC_NETWORK:</span>
            <span className="font-mono text-sm">
              {envVars.NEXT_PUBLIC_NETWORK || 'Not set'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-medium">NODE_ENV:</span>
            <span className="font-mono text-sm">
              {envVars.NODE_ENV || 'Not set'}
            </span>
          </div>
        </div>

        {!hasRequiredVars && (
          <div className="p-4 bg-red-50 rounded-lg">
            <h3 className="font-semibold text-red-800 mb-2">⚠️ Missing Required Variables</h3>
            <p className="text-sm text-red-700">
              The following environment variables are required for the contract balance to display:
            </p>
            <ul className="text-sm text-red-700 mt-2 space-y-1">
              <li>• NEXT_PUBLIC_TRIVIA_CONTRACT_ADDRESS</li>
              <li>• NEXT_PUBLIC_BASE_RPC_URL</li>
            </ul>
            <p className="text-sm text-red-700 mt-2">
              Please check your .env.local file and restart the development server.
            </p>
          </div>
        )}

        {hasRequiredVars && (
          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">✅ Environment Variables Loaded</h3>
            <p className="text-sm text-green-700">
              All required environment variables are present. If the contract balance is still not displaying,
              the issue might be with the wagmi configuration or network connectivity.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
