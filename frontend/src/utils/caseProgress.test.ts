/**
 * Unit Tests for Case Progress Utility
 */

import { getCaseProgress, getCaseStep, getStatusLabel, isTerminalStatus } from './caseProgress';

describe('getCaseProgress', () => {
  it('should return 33% for pending status', () => {
    expect(getCaseProgress('pending')).toBe(33);
    expect(getCaseProgress('submitted')).toBe(33);
  });

  it('should return 66% for investigating status', () => {
    expect(getCaseProgress('inProgress')).toBe(66);
    expect(getCaseProgress('in_progress')).toBe(66);
    expect(getCaseProgress('investigating')).toBe(66);
    expect(getCaseProgress('ongoing')).toBe(66);
  });

  it('should return 100% for decision made status', () => {
    expect(getCaseProgress('resolved')).toBe(100);
    expect(getCaseProgress('dismissed')).toBe(100);
  });

  it('should return 100% for closed status', () => {
    expect(getCaseProgress('closed')).toBe(100);
  });

  it('should return 33% for unknown status (default)', () => {
    expect(getCaseProgress('unknown' as any)).toBe(33);
  });

  it('should handle case insensitive input', () => {
    expect(getCaseProgress('PENDING' as any)).toBe(33);
    expect(getCaseProgress('RESOLVED' as any)).toBe(100);
  });
});

describe('getCaseStep', () => {
  it('should return step 1 for pending status', () => {
    expect(getCaseStep('pending')).toBe(1);
    expect(getCaseStep('submitted')).toBe(1);
  });

  it('should return step 2 for investigating status', () => {
    expect(getCaseStep('inProgress')).toBe(2);
    expect(getCaseStep('investigating')).toBe(2);
  });

  it('should return step 3 for decision made status', () => {
    expect(getCaseStep('resolved')).toBe(3);
    expect(getCaseStep('dismissed')).toBe(3);
  });

  it('should return step 3 for closed status', () => {
    expect(getCaseStep('closed')).toBe(3);
  });
});

describe('getStatusLabel', () => {
  it('should return correct labels for all statuses', () => {
    expect(getStatusLabel('pending')).toBe('Pending');
    expect(getStatusLabel('submitted')).toBe('Pending');
    expect(getStatusLabel('inProgress')).toBe('Investigating');
    expect(getStatusLabel('investigating')).toBe('Investigating');
    expect(getStatusLabel('resolved')).toBe('Decision Already Made');
    expect(getStatusLabel('dismissed')).toBe('Decision Already Made');
    expect(getStatusLabel('closed')).toBe('Closed');
  });
});

describe('isTerminalStatus', () => {
  it('should return true for terminal statuses', () => {
    expect(isTerminalStatus('resolved')).toBe(true);
    expect(isTerminalStatus('dismissed')).toBe(true);
    expect(isTerminalStatus('closed')).toBe(true);
  });

  it('should return false for non-terminal statuses', () => {
    expect(isTerminalStatus('pending')).toBe(false);
    expect(isTerminalStatus('submitted')).toBe(false);
    expect(isTerminalStatus('inProgress')).toBe(false);
    expect(isTerminalStatus('investigating')).toBe(false);
  });
});
