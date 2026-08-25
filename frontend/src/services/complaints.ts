import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import type { Complaint } from '../types/complaint';
import { computeResponseDueAt } from '../utils/caseDeadlines';

export async function submitComplaint(data: Omit<Complaint, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { attachmentsFiles?: File[] }) {
  // upload attachments (if any) and collect URLs
  const attachmentUrls: string[] = [];

  if (data.attachmentsFiles && data.attachmentsFiles.length > 0) {
    for (const file of data.attachmentsFiles) {
      const storageRef = ref(storage, `complaintAttachments/${Date.now()}_${file.name}`);
      const snap = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snap.ref);
      attachmentUrls.push(url);
    }
  }

  const doc = await addDoc(collection(db, 'complaints'), {
    reporterId: data.reporterId || null,
    anonymous: data.anonymous || false,
    title: data.title,
    description: data.description,
    reportedUserId: data.reportedUserId || null,
    location: data.location || null,
    status: 'open',
    assignedTo: data.assignedTo || null,
    attachments: attachmentUrls,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    responseDueAt: Timestamp.fromDate(computeResponseDueAt(new Date())),
  });

  return doc.id;
}
