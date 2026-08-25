/**
 * Form Assistant Service
 * Provides contextual guidance for the complaint form
 */

export interface FormSuggestion {
  fieldName: string;
  message: string;
  type: 'info' | 'warning' | 'tip' | 'success';
  icon?: string;
}

/**
 * Get suggestions based on current form state
 */
export const getFormSuggestions = (
  fieldName: string,
  fieldValue: string,
  currentStep: number,
  formData: any
): FormSuggestion | null => {
  // Step 1: Complainant Information
  if (currentStep === 1) {
    if (fieldName === 'complainantName' && fieldValue.length > 0) {
      if (fieldValue.length < 3) {
        return {
          fieldName,
          message: 'Please enter your full legal name (at least 3 characters).',
          type: 'info'
        };
      }
      if (/[0-9]/.test(fieldValue)) {
        return {
          fieldName,
          message: 'Names typically do not contain numbers. Please double-check your entry.',
          type: 'warning'
        };
      }
      return {
        fieldName,
        message: 'Name recorded.',
        type: 'success'
      };
    }

    if (fieldName === 'complainantAddress' && fieldValue.length > 0) {
      if (fieldValue.length < 10) {
        return {
          fieldName,
          message: 'Include street, barangay, city, and postal code for a complete address.',
          type: 'info'
        };
      }
      return {
        fieldName,
        message: 'Address recorded.',
        type: 'success'
      };
    }

    if (fieldName === 'complainantContact' && fieldValue.length > 0) {
      if (formData?.isAnonymous || fieldValue === 'Not Disclosed') {
        return null;
      }
      if (!fieldValue.startsWith('09')) {
        return {
          fieldName,
          message: 'Philippine mobile numbers must start with 09 (e.g. 09171234567).',
          type: 'warning'
        };
      }
      if (!/^\d{11}$/.test(fieldValue)) {
        return {
          fieldName,
          message: 'Enter a full 11-digit number starting with 09.',
          type: 'warning'
        };
      }
      return {
        fieldName,
        message: 'Contact number recorded.',
        type: 'success'
      };
    }
  }

  // Step 2: Respondent Information
  if (currentStep === 2) {
    if (fieldName === 'respondentName' && fieldValue.length > 0) {
      if (fieldValue.toLowerCase() === 'unknown' || fieldValue.length < 3) {
        return {
          fieldName,
          message: 'Enter a name if known. If the respondent is unknown, select the option above.',
          type: 'info'
        };
      }
      return {
        fieldName,
        message: 'Respondent name recorded.',
        type: 'success'
      };
    }

    if (fieldName === 'respondentPosition' && fieldValue.length > 0) {
      return {
        fieldName,
        message: 'Position recorded.',
        type: 'success'
      };
    }

    if (fieldName === 'respondentDepartment' && fieldValue.length > 0) {
      return {
        fieldName,
        message: 'Department recorded.',
        type: 'success'
      };
    }
  }

  // Step 3: Incident Details
  if (currentStep === 3) {
    if (fieldName === 'title' && fieldValue.length > 0) {
      if (fieldValue.length < 5) {
        return {
          fieldName,
          message: 'Use a more specific title (e.g., "Misconduct incident on April 10").',
          type: 'info'
        };
      }
      return {
        fieldName,
        message: 'Title recorded.',
        type: 'success'
      };
    }

    if (fieldName === 'description' && fieldValue.length > 0) {
      if (fieldValue.length < 20) {
        return {
          fieldName,
          message: 'Please describe what happened in more detail. Include dates, times, and who was present.',
          type: 'info'
        };
      }
      if (fieldValue.length < 100) {
        return {
          fieldName,
          message: 'More detail helps the investigation. Include any relevant context.',
          type: 'info'
        };
      }
      return {
        fieldName,
        message: 'Description recorded.',
        type: 'success'
      };
    }

    if (fieldName === 'incidentDate' && fieldValue.length > 0) {
      return { fieldName, message: 'Incident date recorded.', type: 'success' };
    }

    if (fieldName === 'incidentLocation' && fieldValue.length > 0) {
      return { fieldName, message: 'Location recorded.', type: 'success' };
    }
  }

  // Step 4: Evidence
  if (currentStep === 4) {
    return {
      fieldName: 'evidence',
      message: 'Upload photos, videos, or screenshots as supporting evidence. At least one file is required.',
      type: 'info'
    };
  }

  return null;
};

/**
 * Get step-specific tips
 */
export const getStepTip = (step: number): string => {
  const tips: Record<number, string> = {
    1: 'Step 1 of 5 — your personal details. Your contact information is kept confidential.',
    2: 'Step 2 of 5 — information about the person being reported.',
    3: 'Step 3 of 5 — describe what happened. Be as specific as possible.',
    4: 'Step 4 of 5 — upload supporting files (photos, videos, or documents).',
    5: 'Step 5 of 5 — review your complaint before submitting.'
  };
  return tips[step] || '';
};

/**
 * Validate form completeness and suggest missing fields
 */
export const validateFormCompletion = (formData: any, currentStep: number): FormSuggestion[] => {
  const suggestions: FormSuggestion[] = [];

  if (currentStep === 1) {
    if (!formData.complainantName || formData.complainantName.length < 3) {
      suggestions.push({ fieldName: 'complainantName', message: 'Full name is required.', type: 'warning' });
    }
    if (!formData.complainantAddress || formData.complainantAddress.length < 10) {
      suggestions.push({ fieldName: 'complainantAddress', message: 'Please provide a complete address.', type: 'warning' });
    }
    if (!formData.isAnonymous && (!formData.complainantContact || formData.complainantContact.length < 10)) {
      suggestions.push({ fieldName: 'complainantContact', message: 'Please enter a valid contact number.', type: 'warning' });
    }
  }

  if (currentStep === 2) {
    if (!formData.respondentName || formData.respondentName === 'Unknown/Not Disclosed') {
      suggestions.push({ fieldName: 'respondentName', message: 'Respondent name helps the investigation. If unknown, that is acceptable.', type: 'info' });
    }
  }

  if (currentStep === 3) {
    if (!formData.title || formData.title.length < 5) {
      suggestions.push({ fieldName: 'title', message: 'Please provide a clear title for your complaint.', type: 'warning' });
    }
    if (!formData.description || formData.description.length < 20) {
      suggestions.push({ fieldName: 'description', message: 'A detailed description is required.', type: 'warning' });
    }
    if (!formData.incidentDate) {
      suggestions.push({ fieldName: 'incidentDate', message: 'Please enter the date when the incident occurred.', type: 'warning' });
    }
  }

  if (currentStep === 4) {
    if (!formData.evidence || formData.evidence.length === 0) {
      suggestions.push({ fieldName: 'evidence', message: 'At least one supporting file is required.', type: 'warning' });
    }
  }

  return suggestions;
};

/**
 * Get step context message
 */
export const getEncouragingMessage = (step: number): string => {
  const messages: Record<number, string> = {
    1: 'Step 1 of 5 — provide your personal details.',
    2: 'Step 2 of 5 — identify the person you are reporting.',
    3: 'Step 3 of 5 — describe what happened and when.',
    4: 'Step 4 of 5 — supporting evidence is optional. You can add files later through your case thread.',
    5: 'Step 5 of 5 — review all information before submission.'
  };
  return messages[step] || '';
};
