'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap } from 'lucide-react';

/**
 * @deprecated Manual auto-spend configuration is no longer required.
 * Sub-account funding is handled by the Base Account SDK on the first transaction.
 */
export default function AutoSpendManager() {
  return (
    <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-white">
          <Zap className="h-5 w-5 text-blue-400" />
          Sub-Account Auto Spend
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-300">
          Sub-account funding is managed automatically by the Base Account SDK. On your first
          game transaction, you will be prompted to transfer tokens from your universal account
          and optionally grant ongoing spend permissions.
        </p>
        <p className="text-xs text-gray-400">
          No manual configuration is needed. To disable auto-funding, set{' '}
          <code className="text-xs">subAccounts.funding: &apos;manual&apos;</code> in the SDK
          config (not recommended for this app).
        </p>
      </CardContent>
    </Card>
  );
}
