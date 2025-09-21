interface AgentState {
  conversationId: string | null;
  eventSource: EventSource | null;
  streaming: boolean;
  aggregated: string;
}

interface MessageElement {
  container: HTMLDivElement;
  role: 'user' | 'assistant';
}

const state: AgentState = {
  conversationId: null,
  eventSource: null,
  streaming: false,
  aggregated: '',
};

function setStatus(statusEl: HTMLElement, message: string) {
  statusEl.textContent = message;
}

function createMessageElement(
  historyEl: HTMLElement,
  role: 'user' | 'assistant',
  content: string,
  { streaming }: { streaming?: boolean } = {},
): MessageElement {
  const messageEl = document.createElement('div');
  messageEl.classList.add('chat-message', role);
  if (streaming) {
    messageEl.classList.add('streaming');
  }
  messageEl.textContent = content;
  historyEl.appendChild(messageEl);
  historyEl.scrollTop = historyEl.scrollHeight;
  return { container: messageEl, role };
}

async function requestNewConversation(statusEl: HTMLElement) {
  setStatus(statusEl, 'Starting new task...');
  const response = await fetch('/api/agent/new-task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error('Failed to start new task');
  }
  const data = await response.json();
  state.conversationId = data.conversationId;
  setStatus(statusEl, 'New task ready.');
  return state.conversationId;
}

function closeEventSource() {
  if (state.eventSource) {
    state.eventSource.close();
    state.eventSource = null;
  }
}

function setStreaming(isStreaming: boolean, controls: HTMLButtonElement[]) {
  state.streaming = isStreaming;
  controls.forEach((button) => {
    button.disabled = isStreaming;
  });
}

export function initAgentChat() {
  const historyEl = document.getElementById('chat-history');
  const newTaskBtn = document.getElementById('agent-new-task') as HTMLButtonElement | null;
  const statusEl = document.getElementById('chat-status');
  const form = document.getElementById('chat-form') as HTMLFormElement | null;
  const input = document.getElementById('chat-input') as HTMLTextAreaElement | null;
  const sendBtn = document.getElementById('chat-send') as HTMLButtonElement | null;

  if (!historyEl || !newTaskBtn || !statusEl || !form || !input || !sendBtn) {
    // eslint-disable-next-line no-console
    console.warn('[agent] Missing agent UI elements; skipping initialization.');
    return;
  }

  const controlButtons = [sendBtn, newTaskBtn];

  const resetConversationUI = () => {
    historyEl.innerHTML = '';
    state.conversationId = null;
    state.aggregated = '';
  };

  newTaskBtn.addEventListener('click', async () => {
    if (state.streaming) return;
    try {
      setStreaming(true, [newTaskBtn]);
      closeEventSource();
      resetConversationUI();
      await requestNewConversation(statusEl);
    } catch (error) {
      const err = error as Error;
      setStatus(statusEl, err.message || 'Failed to start new task');
    } finally {
      setStreaming(false, [newTaskBtn]);
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message || state.streaming) return;

    try {
      setStreaming(true, controlButtons);
      if (!state.conversationId) {
        await requestNewConversation(statusEl);
        historyEl.innerHTML = '';
      } else {
        setStatus(statusEl, '');
      }

      createMessageElement(historyEl, 'user', message);
      input.value = '';
      input.focus();
      await streamAgentResponse(message, {
        historyEl,
        statusEl,
        sendBtn,
        newTaskBtn,
      });
    } catch (error) {
      const err = error as Error;
      setStatus(statusEl, err.message || 'Failed to send message');
      setStreaming(false, controlButtons);
    }
  });
}

async function streamAgentResponse(
  message: string,
  ui: {
    historyEl: HTMLElement;
    statusEl: HTMLElement;
    sendBtn: HTMLButtonElement;
    newTaskBtn: HTMLButtonElement;
  },
) {
  const { historyEl, statusEl, sendBtn, newTaskBtn } = ui;

  if (!state.conversationId) {
    throw new Error('Conversation not initialized');
  }

  closeEventSource();
  state.aggregated = '';

  const assistantMessage = createMessageElement(historyEl, 'assistant', '', {
    streaming: true,
  });

  const url = new URL('/api/agent/stream', window.location.origin);
  url.searchParams.set('conversationId', state.conversationId);
  url.searchParams.set('message', message);

  const eventSource = new EventSource(url.toString());
  state.eventSource = eventSource;

  eventSource.addEventListener('start', () => {
    setStatus(statusEl, 'Ada is thinking...');
  });

  eventSource.addEventListener('chunk', (event) => {
    try {
      const data = JSON.parse((event as MessageEvent).data);
      if (typeof data.text === 'string') {
        state.aggregated += data.text;
        assistantMessage.container.textContent = state.aggregated;
        assistantMessage.container.classList.add('streaming');
        historyEl.scrollTop = historyEl.scrollHeight;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('[agent] Failed to parse chunk', error);
    }
  });

  eventSource.addEventListener('done', (event) => {
    closeEventSource();
    const payload = JSON.parse((event as MessageEvent).data);
    const content = typeof payload.content === 'string' ? payload.content : state.aggregated;
    assistantMessage.container.textContent = content;
    assistantMessage.container.classList.remove('streaming');
    state.aggregated = '';
    setStatus(statusEl, '');
    setStreaming(false, [sendBtn, newTaskBtn]);
  });

  eventSource.addEventListener('agent-error', (event) => {
    const payload = JSON.parse((event as MessageEvent).data);
    const messageText =
      typeof payload.message === 'string'
        ? payload.message
        : 'Agent failed to respond.';
    assistantMessage.container.textContent = `Error: ${messageText}`;
    assistantMessage.container.classList.remove('streaming');
    closeEventSource();
    setStreaming(false, [sendBtn, newTaskBtn]);
    setStatus(statusEl, messageText);
  });

  eventSource.onerror = () => {
    closeEventSource();
    if (state.streaming) {
      setStatus(statusEl, 'Connection closed.');
      setStreaming(false, [sendBtn, newTaskBtn]);
      assistantMessage.container.classList.remove('streaming');
    }
  };
}
