interface AgentState {
    conversationId: string | null;
    sessionId: string | null;
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
    sessionId: null,
    eventSource: null,
    streaming: false,
    aggregated: '',
};

function setStatus(statusEl: HTMLElement, message: string) {
    statusEl.textContent = message;
}

function renderMessageContent(container: HTMLElement, text: string) {
    container.innerHTML = ''; // Clear previous content

    const urlRegex = /(https?:\/\/[^\s]+)|(\/public\/[a-zA-Z0-9]+\.png)/g;
    let lastIndex = 0;
    let match;

    while ((match = urlRegex.exec(text)) !== null) {
        // Add text before the URL
        if (match.index > lastIndex) {
            container.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
        }

        const url = match[0];
        // Check if it's an image URL to render as a thumbnail
        if (url.match(/\.(jpeg|jpg|gif|png)$/)) {
            const img = document.createElement('img');
            img.src = url;
            img.classList.add('chat-message-image');
            img.onclick = () => {
                const modal = document.getElementById('image-modal') as HTMLDivElement;
                const modalImg = document.getElementById('image-modal-content') as HTMLImageElement;
                modal.style.display = 'block';
                modalImg.src = url;
            };
            container.appendChild(img);
        } else {
            // Otherwise, render as a plain link
            const a = document.createElement('a');
            a.href = url;
            a.textContent = url;
            a.target = '_blank';
            container.appendChild(a);
        }

        lastIndex = match.index + url.length;
    }

    // Add any remaining text after the last URL
    if (lastIndex < text.length) {
        container.appendChild(document.createTextNode(text.substring(lastIndex)));
    }
}


function createMessageElement(
    historyEl: HTMLElement,
    role: 'user' | 'assistant',
    content: string,
    { streaming }: { streaming?: boolean } = {}
): MessageElement {
    const messageEl = document.createElement('div');
    messageEl.classList.add('chat-message', role);
    if (streaming) {
        messageEl.classList.add('streaming');
    }

    if (role === 'user') {
        messageEl.textContent = content;
    } else {
        renderMessageContent(messageEl, content);
    }

    historyEl.appendChild(messageEl);
    historyEl.scrollTop = historyEl.scrollHeight;
    return { container: messageEl, role };
}

async function requestNewConversation(statusEl: HTMLElement) {
    setStatus(statusEl, 'Starting new task...');
    const response = await fetch('/api/agent/new-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Fastify rejects requests with Content-Type: application/json and an empty body.
        // Send an empty JSON object so the server accepts the request.
        body: JSON.stringify({}),
    });
    if (!response.ok) {
        throw new Error('Failed to start new task');
    }
    const data = await response.json();
    state.conversationId = data.conversationId;
    state.sessionId = data.sessionId || data.conversationId;
    setStatus(statusEl, 'New task ready.');
    return state.sessionId;
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
    const imageModal = document.getElementById('image-modal') as HTMLDivElement | null;
    const imageModalClose = document.getElementById('image-modal-close') as HTMLSpanElement | null;

    if (!historyEl || !newTaskBtn || !statusEl || !form || !input || !sendBtn || !imageModal || !imageModalClose) {
        // eslint-disable-next-line no-console
        console.warn('[agent] Missing agent UI elements; skipping initialization.');
        return;
    }

    imageModalClose.onclick = () => {
        imageModal.style.display = 'none';
    }
    imageModal.onclick = (event) => {
        if (event.target === imageModal) {
            imageModal.style.display = 'none';
        }
    }

    const controlButtons = [sendBtn, newTaskBtn];

    // Disable chatting until a session is created explicitly
    sendBtn.disabled = true;
    input.disabled = true;

    const resetConversationUI = () => {
        historyEl.innerHTML = '';
        state.conversationId = null;
        state.sessionId = null;
        state.aggregated = '';
    };

    newTaskBtn.addEventListener('click', async () => {
        if (state.streaming) return;
        try {
            setStreaming(true, [newTaskBtn]);
            closeEventSource();
            resetConversationUI();
            await requestNewConversation(statusEl);
            // Enable input/send once a session is ready
            sendBtn.disabled = false;
            input.disabled = false;
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
            if (!state.sessionId) {
                // Require explicit New Task before chatting
                setStatus(statusEl, 'Start a new task first (click "New Task").');
                setStreaming(false, controlButtons);
                return;
            }
            setStatus(statusEl, '');

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
    }
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
    // Prefer sessionId for clarity with the backend
    if (state.sessionId) {
        url.searchParams.set('sessionId', state.sessionId);
    } else {
        url.searchParams.set('conversationId', state.conversationId);
    }
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
                // During streaming, just update text content for performance.
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

        // Render the final content with images
        renderMessageContent(assistantMessage.container, content);

        assistantMessage.container.classList.remove('streaming');
        state.aggregated = '';
        setStatus(statusEl, '');
        setStreaming(false, [sendBtn, newTaskBtn]);
    });

    eventSource.addEventListener('agent-error', (event) => {
        const payload = JSON.parse((event as MessageEvent).data);
        const messageText =
            typeof payload.message === 'string' ? payload.message : 'Agent failed to respond.';
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
