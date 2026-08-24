import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';

export type LayaRole = 'user' | 'assistant';

export interface LayaMessage {
  role: LayaRole;
  text: string;
  createdAt: string;
}

export interface LayaConversation {
  id: string;
  userId: string;
  title: string;
  preview: string;
  messages: LayaMessage[];
  createdAt: string;
  updatedAt: string;
}

const COLLECTION = 'layaConversations';

function toIso(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'toDate' in value) {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      /* ignore */
    }
  }
  return new Date().toISOString();
}

function conversationTitle(messages: LayaMessage[]): string {
  const firstUser = messages.find((m) => m.role === 'user')?.text?.trim();
  if (!firstUser) return 'New chat with Laya';
  return firstUser.length > 48 ? `${firstUser.slice(0, 48)}…` : firstUser;
}

function conversationPreview(messages: LayaMessage[]): string {
  const last = [...messages].reverse().find((m) => m.role === 'assistant')?.text?.trim();
  if (!last) return '';
  return last.length > 90 ? `${last.slice(0, 90)}…` : last;
}

export async function listLayaConversations(userId: string): Promise<LayaConversation[]> {
  const q = query(collection(db, COLLECTION), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.userId,
        title: data.title || 'Chat with Laya',
        preview: data.preview || '',
        messages: Array.isArray(data.messages) ? data.messages : [],
        createdAt: toIso(data.createdAt),
        updatedAt: toIso(data.updatedAt),
      };
    })
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export async function getLayaConversation(id: string): Promise<LayaConversation | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    userId: data.userId,
    title: data.title || 'Chat with Laya',
    preview: data.preview || '',
    messages: Array.isArray(data.messages) ? data.messages : [],
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

export async function saveLayaConversation(input: {
  id?: string | null;
  userId: string;
  messages: LayaMessage[];
}): Promise<string> {
  const payload = {
    userId: input.userId,
    title: conversationTitle(input.messages),
    preview: conversationPreview(input.messages),
    messages: input.messages,
    updatedAt: new Date().toISOString(),
  };

  if (input.id) {
    await updateDoc(doc(db, COLLECTION, input.id), payload);
    return input.id;
  }

  const created = await addDoc(collection(db, COLLECTION), {
    ...payload,
    createdAt: serverTimestamp(),
  });
  return created.id;
}

export async function deleteLayaConversation(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
