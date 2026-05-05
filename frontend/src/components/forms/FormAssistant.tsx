/**
 * AI Form Tip Component
 * Displays contextual suggestions while user fills out the complaint form
 */

import React from 'react';
import { AlertCircle, Lightbulb, CheckCircle2, AlertTriangle, Zap } from 'lucide-react';
import { Card, CardContent } from '../ui/card';

interface FormTipProps {
  message: string;
  type: 'info' | 'warning' | 'tip' | 'success';
  show?: boolean;
  onDismiss?: () => void;
}

export const FormTip: React.FC<FormTipProps> = ({ 
  message, 
  type = 'info',
  show = true,
  onDismiss
}) => {
  if (!show) return null;

  const getIcon = () => {
    switch (type) {
      case 'info':
        return <Lightbulb className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'tip':
        return <Zap className="h-4 w-4" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'info':
        return 'bg-emerald-50 border-emerald-200 text-emerald-900';
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-900';
      case 'tip':
        return 'bg-green-50 border-green-200 text-green-900';
      case 'success':
        return 'bg-emerald-50 border-emerald-200 text-emerald-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'info':
        return 'text-emerald-600';
      case 'warning':
        return 'text-amber-600';
      case 'tip':
        return 'text-green-600';
      case 'success':
        return 'text-emerald-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className={`border rounded-lg p-3 flex gap-3 items-start ${getColors()} animate-fadeIn`}>
      <div className={`flex-shrink-0 mt-0.5 ${getIconColor()}`}>
        {getIcon()}
      </div>
      <div className="flex-1 text-sm leading-relaxed">
        {message}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        >
          ✕
        </button>
      )}
    </div>
  );
};

/**
 * Step Header with AI Encouragement
 */
interface FormStepHeaderProps {
  step: number;
  title: string;
  description: string;
  encouragement: string;
}

export const FormStepHeader: React.FC<FormStepHeaderProps> = ({
  step,
  title,
  description,
  encouragement
}) => {
  return (
    <div className="space-y-2 mb-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          Step {step} of 5: {title}
        </h2>
        <span className="text-sm font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
          {Math.round((step / 5) * 100)}%
        </span>
      </div>
      <p className="text-gray-600 text-sm">{description}</p>
      <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-200">
        <span>✨</span>
        <span>{encouragement}</span>
      </div>
    </div>
  );
};

/**
 * Multiple Tips Component
 */
interface FormTipsListProps {
  tips: Array<{
    message: string;
    type: 'info' | 'warning' | 'tip' | 'success';
  }>;
}

export const FormTipsList: React.FC<FormTipsListProps> = ({ tips }) => {
  if (tips.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {tips.map((tip, index) => (
        <FormTip
          key={index}
          message={tip.message}
          type={tip.type}
          show={true}
        />
      ))}
    </div>
  );
};

/**
 * AI Assistant Sidebar for Form Help
 */
interface FormAssistantSidebarProps {
  currentStep: number;
  formData: any;
  isAnonymous?: boolean;
  onAskQuestion?: () => void;
  onNextStep?: () => void;
  onPreviousStep?: () => void;
  onSubmit?: () => void;
}

export const FormAssistantSidebar: React.FC<FormAssistantSidebarProps> = ({
  currentStep,
  formData,
  isAnonymous = false,
  onAskQuestion,
  onNextStep,
  onPreviousStep,
  onSubmit
}) => {
  const stepDescriptions: Record<number, { icon: string; title: string; tips: string[] }> = {
    1: {
      icon: '👤',
      title: 'Your Information',
      tips: isAnonymous ? [
        'Your identity will be protected',
        'All information will be confidential',
        'Investigators will only use case ID'
      ] : [
        'Use your legal name',
        'Include your current address',
        'Provide a valid contact number'
      ]
    },
    2: {
      icon: '🎯',
      title: 'About the Respondent',
      tips: [
        'Full name if known',
        'Position/title in organization',
        'Their department'
      ]
    },
    3: {
      icon: '📝',
      title: 'Incident Details',
      tips: [
        'Clear and descriptive title',
        'Detailed account of events',
        'Specific date and location',
        'Type and severity level'
      ]
    },
    4: {
      icon: '📎',
      title: 'Evidence',
      tips: [
        'Photos or screenshots',
        'Video recordings',
        'Document or text evidence',
        'At least 1 file required'
      ]
    },
    5: {
      icon: '✓',
      title: 'Review & Submit',
      tips: [
        'Check all information',
        'Verify incident details',
        'Confirm evidence attached',
        'Ready to submit!'
      ]
    }
  };

  const current = stepDescriptions[currentStep];

  return (
    <div className="space-y-3">
      {/* Main AI Card */}
      <Card className="bg-white border-border shadow-sm overflow-hidden">
        <CardContent className="p-4 space-y-3">
          {/* Current Step Info */}
          <div className="bg-muted/40 rounded-lg p-3 border border-border">
            <div className="flex items-start gap-2">
              <span className="text-2xl">{current?.icon}</span>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground text-sm">{current?.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {['Introduce yourself and provide contact info', 'Tell us about the respondent', 'Describe what happened', 'Add supporting evidence', 'Final check before sending'][currentStep - 1]}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Quick Tips</p>
            <div className="space-y-1.5">
              {current?.tips.map((tip, index) => (
                <div key={index} className="flex items-start gap-2 text-xs bg-muted/30 p-2 rounded border-l-2 border-foreground/20">
                  <span className="text-muted-foreground font-bold flex-shrink-0 text-sm">✓</span>
                  <span className="text-foreground leading-snug font-medium">{tip}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-foreground">Progress</span>
              <span className="text-xs font-bold text-muted-foreground ml-auto">{Math.round((currentStep / 5) * 100)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div 
                className="bg-primary h-full rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / 5) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Help Button */}
          <button
            onClick={onAskQuestion}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold py-2.5 px-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-[0.98]"
          >
            <span>💬</span>
            <span>Ask AI for Help</span>
          </button>
        </CardContent>
      </Card>

      {/* Navigation Buttons - Show on steps 1-4 */}
      {currentStep < 5 && (
        <div className="flex gap-2">
          {currentStep > 1 && (
            <button
              onClick={onPreviousStep}
              className="flex-1 bg-muted hover:bg-muted/80 text-foreground text-sm font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              <span>←</span>
              <span>Previous</span>
            </button>
          )}
          <button
            onClick={onNextStep}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-[0.98]"
          >
            <span>Next Step</span>
            <span>→</span>
          </button>
        </div>
      )}

      {/* Submit Button - Show on last step */}
      {currentStep === 5 && (
        <div className="flex gap-2">
          <button
            onClick={onPreviousStep}
            className="flex-1 bg-muted hover:bg-muted/80 text-foreground text-sm font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-[0.98]"
          >
            <span>←</span>
            <span>Previous</span>
          </button>
          <button
            onClick={onSubmit}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-[0.98]"
          >
            <span>📤</span>
            <span>Submit</span>
          </button>
        </div>
      )}
    </div>
  );
};
