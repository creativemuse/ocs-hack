'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useBaseAccount } from '@/hooks/useBaseAccount';
import { SignInWithBaseButton } from '@base-org/account-ui/react';
import { 
  ArrowRight, 
  CheckCircle, 
  AlertCircle, 
  Shield, 
  Zap, 
  DollarSign,
  Trophy,
  Users,
  Star,
  Gift
} from 'lucide-react';

interface MigrationStep {
  id: string;
  title: string;
  description: string;
  benefits: string[];
  completed: boolean;
}

export default function MigrationGuide() {
  const { isConnected, address } = useBaseAccount();
  const [currentStep, setCurrentStep] = useState(0);

  const migrationSteps: MigrationStep[] = [
    {
      id: 'connect-base-account',
      title: 'Connect Base Account',
      description: 'Sign in with your Base Account to access enhanced features',
      benefits: [
        'Gasless transactions via paymaster',
        'Cross-device stat persistence',
        'Enhanced security with sub-accounts',
        'Seamless USDC payments'
      ],
      completed: isConnected
    },
    {
      id: 'configure-spend-permissions',
      title: 'Configure Spend Permissions',
      description: 'Set up automatic spending permissions for seamless gameplay',
      benefits: [
        'No manual approvals for game fees',
        'Automatic USDC transfers',
        'Enhanced user experience',
        'Secure permission management'
      ],
      completed: false // This would be checked via spend permissions status
    },
    {
      id: 'enable-auto-spend',
      title: 'Enable Auto Spend',
      description: 'Configure automatic funding from your universal account',
      benefits: [
        'Automatic sub-account funding',
        'No manual transfers needed',
        'Seamless gameplay experience',
        'Enhanced security isolation'
      ],
      completed: false // This would be checked via auto spend status
    },
    {
      id: 'setup-erc20-gas',
      title: 'Setup ERC20 Gas Payments',
      description: 'Configure gas payments in USDC instead of ETH',
      benefits: [
        'Pay gas fees in USDC',
        'No need to maintain ETH balance',
        'Simplified user experience',
        'Automatic gas sponsorship'
      ],
      completed: false // This would be checked via ERC20 gas configuration
    }
  ];

  const benefits = [
    {
      icon: <Zap className="h-5 w-5 text-yellow-400" />,
      title: 'Gasless Transactions',
      description: 'Play without worrying about gas fees'
    },
    {
      icon: <Shield className="h-5 w-5 text-blue-400" />,
      title: 'Enhanced Security',
      description: 'Sub-accounts provide better security isolation'
    },
    {
      icon: <DollarSign className="h-5 w-5 text-green-400" />,
      title: 'USDC Payments',
      description: 'Pay for everything in USDC, no ETH needed'
    },
    {
      icon: <Trophy className="h-5 w-5 text-purple-400" />,
      title: 'Cross-Device Stats',
      description: 'Your progress follows you across all devices'
    },
    {
      icon: <Users className="h-5 w-5 text-pink-400" />,
      title: 'Social Features',
      description: 'Connect with friends and compete on leaderboards'
    },
    {
      icon: <Gift className="h-5 w-5 text-orange-400" />,
      title: 'Rewards & Prizes',
      description: 'Win USDC prizes and special rewards'
    }
  ];

  const handleNextStep = () => {
    if (currentStep < migrationSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = migrationSteps[currentStep];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-white">
            <Star className="h-5 w-5 text-blue-400" />
            Upgrade to Base Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-300">
            Enhance your gaming experience with Base Account's advanced features. 
            Get gasless transactions, cross-device persistence, and more!
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Step {currentStep + 1} of {migrationSteps.length}
            </div>
            <div className="w-32 bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / migrationSteps.length) * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Step */}
      <Card className="bg-gradient-to-br from-green-900/20 to-blue-900/20 border-green-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-white">
            {currentStepData.completed ? (
              <CheckCircle className="h-5 w-5 text-green-400" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-400" />
            )}
            {currentStepData.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-300">
            {currentStepData.description}
          </div>

          <div className="space-y-2">
            <div className="text-xs text-gray-400 font-medium">Benefits:</div>
            {currentStepData.benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2 text-xs text-gray-300">
                <CheckCircle className="h-3 w-3 text-green-400" />
                {benefit}
              </div>
            ))}
          </div>

          {currentStep === 0 && !isConnected && (
            <div className="flex justify-center">
              <SignInWithBaseButton colorScheme="light" />
            </div>
          )}

          {currentStepData.completed && (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle className="h-4 w-4" />
              Completed
            </div>
          )}
        </CardContent>
      </Card>

      {/* Benefits Overview */}
      <Card className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-purple-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-white">
            <Trophy className="h-5 w-5 text-purple-400" />
            Base Account Benefits
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-black/30 rounded-lg">
                <div className="flex-shrink-0 mt-0.5">
                  {benefit.icon}
                </div>
                <div>
                  <div className="text-sm font-medium text-white mb-1">
                    {benefit.title}
                  </div>
                  <div className="text-xs text-gray-400">
                    {benefit.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Migration Progress */}
      <Card className="bg-gradient-to-br from-gray-900/20 to-slate-900/20 border-gray-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-white">
            <Shield className="h-5 w-5 text-gray-400" />
            Migration Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {migrationSteps.map((step, index) => (
            <div key={step.id} className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
              <div className="flex items-center gap-3">
                {step.completed ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : index === currentStep ? (
                  <AlertCircle className="h-4 w-4 text-yellow-400" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-gray-500" />
                )}
                <div>
                  <div className="text-sm text-white">{step.title}</div>
                  <div className="text-xs text-gray-400">{step.description}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {step.completed && (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    Completed
                  </Badge>
                )}
                {index === currentStep && !step.completed && (
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                    Current
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          onClick={handlePrevStep}
          disabled={currentStep === 0}
          variant="outline"
          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
        >
          Previous
        </Button>
        <Button
          onClick={handleNextStep}
          disabled={currentStep === migrationSteps.length - 1}
          className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 text-white"
        >
          Next
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Help Text */}
      <Alert className="border-blue-500/20 bg-blue-500/10">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-blue-300">
          <div className="text-sm">
            <strong>Need help?</strong> Base Account provides a seamless upgrade path from traditional wallets. 
            Your existing game progress will be preserved and enhanced with new features.
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
