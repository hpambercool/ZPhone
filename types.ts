export enum AppId {
  CHAT = 'chat',
  SETTINGS = 'settings',
  WORLDBOOK = 'worldbook',
}

export interface WorldEntry {
  id: string;
  title: string;
  content: string;
  active: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface Contact {
  id: string;
  name: string;
  avatar: string; // Tailwind color class or image URL
  bio: string;
  systemPrompt: string;
}

export interface Conversation {
  id: string;
  contactId: string;
  messages: ChatMessage[];
  lastMessage: string;
  timestamp: number;
  unreadCount: number;
}

export interface AppConfig {
  model: string;
  userName: string;
  systemPrompt: string; // Default system prompt
  customApiUrl?: string;
  customApiKey?: string;
}

export type ThemeMode = 'light' | 'dark';