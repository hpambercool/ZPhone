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
  category?: string;
  triggerKeywords?: string[];
  scope?: 'global' | 'character';
  characterId?: string;
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

export interface ApiPreset {
  id: string;
  name: string;
  apiUrl: string;
  apiKey: string;
  model: string;
}

export interface UserPersona {
  id: string;
  name: string;
  avatar: string; // Tailwind bg class
}

export interface AppConfig {
  model: string;
  userName: string;
  userPersonas?: UserPersona[]; // List of available personas
  currentPersonaId?: string;    // Currently active persona ID
  systemPrompt: string; // Default system prompt
  customApiUrl?: string;
  customApiKey?: string;
  presets: ApiPreset[];
  wallpaper?: string;
  showStatusBar?: boolean;
}

export type ThemeMode = 'light' | 'dark';