/**
 * Case Note Types
 * For internal notes/comments between Admin and Case Handlers
 */

export interface CaseNote {
  id: string;
  caseId: string;
  userId: string;
  userName: string;
  userRole: 'admin' | 'handler';
  userEmail: string;
  message: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCaseNoteData {
  caseId: string;
  userId: string;
  userName: string;
  userRole: 'admin' | 'handler';
  userEmail: string;
  message: string;
}
