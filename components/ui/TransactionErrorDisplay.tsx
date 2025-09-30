'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, RefreshCw, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { TransactionError, getErrorRecoverySuggestions, isErrorRetryable } from '@/lib/utils/errorHandling';

interface TransactionErrorDisplayProps {
  error: TransactionError;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
  className?: string;
}

export default function TransactionErrorDisplay({
  error,
  onRetry,
  onDismiss,
  showDetails = false,
  className = ''
}: TransactionErrorDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (!onRetry || !isErrorRetryable(error)) return;
    
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  const recoverySuggestions = getErrorRecoverySuggestions(error);
  const canRetry = isErrorRetryable(error) && onRetry;

  return (
    <Card className={`bg-red-900/20 border-red-500/30 ${className}`}>
      <CardContent className="p-4">
        {/* Error Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <div>
              <div className="text-red-400 font-medium text-sm">
                Transaction Failed
              </div>
              {error.code && (
                <Badge variant="outline" className="text-xs text-red-300 border-red-400/50">
                  {error.code}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {showDetails && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-red-300 hover:text-red-200 hover:bg-red-800/20"
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            )}
            
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="text-red-300 hover:text-red-200 hover:bg-red-800/20"
              >
                ×
              </Button>
            )}
          </div>
        </div>

        {/* User-Friendly Message */}
        <div className="text-red-200 text-sm mb-3">
          {error.userMessage}
        </div>

        {/* Recovery Suggestions */}
        {recoverySuggestions.length > 0 && (
          <div className="mb-3">
            <div className="text-red-300 text-xs font-medium mb-2">
              What you can do:
            </div>
            <ul className="text-red-200/80 text-xs space-y-1">
              {recoverySuggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {canRetry && (
            <Button
              onClick={handleRetry}
              disabled={isRetrying}
              size="sm"
              className="bg-red-600 hover:bg-red-500 text-white border-0"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Try Again
                </>
              )}
            </Button>
          )}
          
          {!canRetry && error.code === 'INSUFFICIENT_FUNDS' && (
            <Button
              onClick={() => window.open('/funding', '_blank')}
              size="sm"
              variant="outline"
              className="border-red-400 text-red-300 hover:bg-red-800/20"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Add Funds
            </Button>
          )}
        </div>

        {/* Expanded Details */}
        {isExpanded && showDetails && (
          <div className="mt-4 pt-3 border-t border-red-500/20">
            <div className="text-red-300 text-xs font-medium mb-2">
              Technical Details:
            </div>
            <div className="bg-red-950/30 rounded p-2 text-xs text-red-200/80 font-mono">
              <div className="mb-1">
                <span className="text-red-400">Message:</span> {error.message}
              </div>
              {error.code && (
                <div className="mb-1">
                  <span className="text-red-400">Code:</span> {error.code}
                </div>
              )}
              <div className="mb-1">
                <span className="text-red-400">Recoverable:</span> {error.recoverable ? 'Yes' : 'No'}
              </div>
              <div>
                <span className="text-red-400">Retryable:</span> {isErrorRetryable(error) ? 'Yes' : 'No'}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
