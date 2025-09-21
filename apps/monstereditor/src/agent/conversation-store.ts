import { randomUUID } from 'crypto';

export type AgentRole = 'user' | 'assistant';

export interface AgentMessage {
    id: string;
    role: AgentRole;
    content: string;
    createdAt: number;
}

export interface Conversation {
    id: string;
    messages: AgentMessage[];
    createdAt: number;
    updatedAt: number;
}

const conversations = new Map<string, Conversation>();

export function createConversation(): Conversation {
    const id = randomUUID();
    const now = Date.now();
    const conversation: Conversation = {
        id,
        messages: [],
        createdAt: now,
        updatedAt: now,
    };
    conversations.set(id, conversation);
    return conversation;
}

export function resetConversation(id: string): Conversation {
    const existing = conversations.get(id);
    if (existing) {
        existing.messages = [];
        existing.updatedAt = Date.now();
        return existing;
    }
    const fresh = createConversation();
    conversations.set(id, fresh);
    return fresh;
}

export function getConversation(id: string): Conversation | undefined {
    return conversations.get(id);
}

export function ensureConversation(id: string): Conversation {
    const existing = conversations.get(id);
    if (existing) return existing;
    const now = Date.now();
    const conversation: Conversation = {
        id,
        messages: [],
        createdAt: now,
        updatedAt: now,
    };
    conversations.set(id, conversation);
    return conversation;
}

export function appendMessage(
    conversationId: string,
    role: AgentRole,
    content: string
): AgentMessage {
    const conversation = ensureConversation(conversationId);
    const message: AgentMessage = {
        id: randomUUID(),
        role,
        content,
        createdAt: Date.now(),
    };
    conversation.messages.push(message);
    conversation.updatedAt = Date.now();
    return message;
}

export function getMessages(conversationId: string): AgentMessage[] {
    const conversation = ensureConversation(conversationId);
    return conversation.messages;
}
