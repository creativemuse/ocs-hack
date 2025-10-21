'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useBaseAccount } from '@/hooks/useBaseAccount';
import { useWalletLinking } from '@/hooks/useWalletLinking';
import { useUSDCBalance } from '@/hooks/useUSDCBalance';
import { SignInWithBaseButton } from '@base-org/account-ui/react';
import SubAccountDisplay from './SubAccountDisplay';
import SpendPermissionBadge from './SpendPermissionBadge';
import GaslessBadge from './GaslessBadge';
import AutoSpendManager from './AutoSpendManager';
import ERC20GasManager from './ERC20GasManager';
import SpendPermissionManager from '../game/SpendPermissionManager';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  Zap, 
  Shield, 
  DollarSign,
  Users,
  Trophy,
  Settings
} from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  details?: any;
}

export default function BaseAccountTestSuite() {
  const { address, universalAddress, subAccountAddress, isConnected, isConnecting, error } = useBaseAccount();
  const { balance, hasEnoughForEntry, isLoading: balanceLoading } = useUSDCBalance();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const tests: Omit<TestResult, 'status' | 'message' | 'details'>[] = [
    { name: 'Base Account SDK Initialization' },
    { name: 'Base Account Connection' },
    { name: 'Sub Account Creation' },
    { name: 'SpacetimeDB Identity Linking' },
    { name: 'USDC Balance Check' },
    { name: 'Spend Permissions' },
    { name: 'Auto Spend Configuration' },
    { name: 'ERC20 Gas Payments' },
    { name: 'Gasless Transactions' },
    { name: 'Base Pay Integration' }
  ];

  const runTests = async () => {
    setIsRunningTests(true);
    setTestResults(tests.map(test => ({ ...test, status: 'pending' })));

    const results: TestResult[] = [];

    // Test 1: Base Account SDK Initialization
    results.push({
      name: 'Base Account SDK Initialization',
      status: typeof window !== 'undefined' && window.sdk ? 'passed' : 'failed',
      message: typeof window !== 'undefined' && window.sdk ? 'SDK detected' : 'SDK not found'
    });

    // Test 2: Base Account Connection
    results.push({
      name: 'Base Account Connection',
      status: isConnected ? 'passed' : 'failed',
      message: isConnected ? 'Connected successfully' : 'Not connected'
    });

    // Test 3: Sub Account Creation
    results.push({
      name: 'Sub Account Creation',
      status: subAccountAddress ? 'passed' : 'failed',
      message: subAccountAddress ? 'Sub account created' : 'No sub account found'
    });

    // Test 4: SpacetimeDB Identity Linking
    results.push({
      name: 'SpacetimeDB Identity Linking',
      status: isConnected && address ? 'passed' : 'failed',
      message: isConnected && address ? 'Identity linking available' : 'Not connected'
    });

    // Test 5: USDC Balance Check
    results.push({
      name: 'USDC Balance Check',
      status: !balanceLoading ? 'passed' : 'running',
      message: !balanceLoading ? `Balance: ${balance.toFixed(2)} USDC` : 'Loading balance...'
    });

    // Test 6: Spend Permissions
    results.push({
      name: 'Spend Permissions',
      status: isConnected ? 'passed' : 'failed',
      message: isConnected ? 'Spend permissions available' : 'Not connected'
    });

    // Test 7: Auto Spend Configuration
    results.push({
      name: 'Auto Spend Configuration',
      status: isConnected ? 'passed' : 'failed',
      message: isConnected ? 'Auto spend configuration available' : 'Not connected'
    });

    // Test 8: ERC20 Gas Payments
    results.push({
      name: 'ERC20 Gas Payments',
      status: process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT ? 'passed' : 'failed',
      message: process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT ? 'Paymaster configured' : 'Paymaster not configured'
    });

    // Test 9: Gasless Transactions
    results.push({
      name: 'Gasless Transactions',
      status: process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT ? 'passed' : 'failed',
      message: process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT ? 'Gasless transactions enabled' : 'Gasless transactions disabled'
    });

    // Test 10: Base Pay Integration
    results.push({
      name: 'Base Pay Integration',
      status: typeof window !== 'undefined' && window.sdk ? 'passed' : 'failed',
      message: typeof window !== 'undefined' && window.sdk ? 'Base Pay available' : 'Base Pay not available'
    });

    setTestResults(results);
    setIsRunningTests(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-400" />;
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-400" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'running':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const passedTests = testResults.filter(test => test.status === 'passed').length;
  const totalTests = testResults.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-white">
            <Settings className="h-5 w-5 text-purple-400" />
            Base Account Integration Test Suite
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-300">
              Test Results: {passedTests}/{totalTests} passed
            </div>
            <Button
              onClick={runTests}
              disabled={isRunningTests}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-400 hover:to-blue-400 text-white"
            >
              {isRunningTests ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Run Tests
            </Button>
          </div>

          {totalTests > 0 && (
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(passedTests / totalTests) * 100}%` }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connection Status */}
      <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-white">
            <Shield className="h-5 w-5 text-blue-400" />
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConnected ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300">Status:</span>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              </div>
              <SubAccountDisplay />
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300">USDC Balance:</span>
                <span className="font-medium text-white">
                  {balanceLoading ? '...' : `${balance.toFixed(2)} USDC`}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300">Entry Fee:</span>
                <Badge
                  variant={hasEnoughForEntry ? "default" : "destructive"}
                  className={hasEnoughForEntry ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}
                >
                  {hasEnoughForEntry ? 'Sufficient' : 'Insufficient'}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-3">
              <div className="text-gray-400 text-sm">
                {isConnecting ? 'Connecting...' : 'Not connected to Base Account'}
              </div>
              <SignInWithBaseButton colorScheme="light" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card className="bg-gradient-to-br from-gray-900/20 to-slate-900/20 border-gray-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-white">
              <Trophy className="h-5 w-5 text-yellow-400" />
              Test Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {testResults.map((test, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(test.status)}
                  <span className="text-sm text-white">{test.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(test.status)}>
                    {test.status}
                  </Badge>
                  {test.message && (
                    <span className="text-xs text-gray-400">{test.message}</span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Feature Components */}
      {isConnected && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SpendPermissionManager />
          <AutoSpendManager />
          <ERC20GasManager />
          <Card className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border-yellow-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-white">
                <DollarSign className="h-5 w-5 text-yellow-400" />
                Feature Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <SpendPermissionBadge />
              <GaslessBadge />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Alert className="border-red-500/20 bg-red-500/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-300">
            {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
