// DOM Elements
const chatContainer = document.getElementById("chatContainer");
const prompt = document.getElementById("prompt");
const submitBtn = document.getElementById("submitBtn");
const newChatBtn = document.getElementById("newChatBtn");
const chatHistory = document.getElementById("chatHistory");

// Chat history
let conversations = [];
let currentConversationId = Date.now();

// Load conversations from localStorage
function loadConversations() {
  const saved = localStorage.getItem('athena_conversations');
  if (saved) {
    try {
      conversations = JSON.parse(saved);
      if (conversations.length > 0) {
        currentConversationId = conversations[conversations.length - 1].id;
      }
    } catch (e) {
      conversations = [];
    }
  }
}

// Save conversations to localStorage
function saveConversations() {
  localStorage.setItem('athena_conversations', JSON.stringify(conversations));
}

// Auto-resize textarea
prompt.addEventListener("input", function() {
  this.style.height = "auto";
  this.style.height = (this.scrollHeight) + "px";
});

// Handle Enter key (Send on Enter, new line on Shift+Enter)
prompt.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    submitBtn.click();
  }
});

// Create a new chat
function createNewChat() {
  currentConversationId = Date.now();
  conversations.push({
    id: currentConversationId,
    title: 'New Chat',
    messages: []
  });
  saveConversations();
  chatContainer.innerHTML = `
    <div class="welcome-message">
      <h1>Welcome to Athena AI</h1>
      <p>Your intelligent assistant powered by advanced AI. Ask questions, upload files, and get detailed responses.</p>
    </div>
  `;
  renderChatHistory();
}

// Add message to chat and persist
function addMessage(content, isUser = false) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${isUser ? "user" : "assistant"}`;

  const avatar = document.createElement("img");
  avatar.className = "avatar";
  avatar.src = isUser 
    ? "https://ui-avatars.com/api/?name=User&background=random" 
    : "https://ui-avatars.com/api/?name=A&background=10a37f";
  avatar.alt = isUser ? "User" : "Athena";

  const contentDiv = document.createElement("div");
  contentDiv.className = "content";

  if (!isUser) {
    // Split by code blocks (```)
    const codeBlockRegex = /```([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;
    let hasCode = false;
    let textParts = [];
    while ((match = codeBlockRegex.exec(content)) !== null) {
      hasCode = true;
      // Add text before code block
      if (match.index > lastIndex) {
        const text = content.slice(lastIndex, match.index);
        if (text.trim()) {
          textParts.push(text.trim());
        }
      }
      // Add code block
      const codeWindow = document.createElement("div");
      codeWindow.className = "code-window";
      const pre = document.createElement("pre");
      const code = document.createElement("code");
      code.textContent = match[1].replace(/^\n+|\n+$/g, "");
      pre.appendChild(code);
      codeWindow.appendChild(pre);
      contentDiv.appendChild(codeWindow);
      lastIndex = codeBlockRegex.lastIndex;
    }
    // Add any remaining text after the last code block
    if (hasCode && lastIndex < content.length) {
      const text = content.slice(lastIndex);
      if (text.trim()) {
        textParts.push(text.trim());
      }
    }
    // If no code blocks, just use the whole content as text
    if (!hasCode) {
      textParts.push(content);
    }
    // For each text part, check for summary and main text
    textParts.forEach(part => {
      // Try to detect summary, extended summary, or detailed summary
      const summaryMatch = part.match(/^(Summary:|TL;DR:|Extended Summary:|Detailed Summary:)([\s\S]*)/i);
      if (summaryMatch) {
        // Summary window
        const summaryWindow = document.createElement("div");
        summaryWindow.className = "summary-window";
        const summaryText = summaryMatch[2].trim();

        // For normal summaries and TL;DR, collapse all line breaks and extra spaces into a single paragraph
        if (/^(Summary:|TL;DR:)$/i.test(summaryMatch[1])) {
          const compactSummary = summaryText.replace(/\s*\n+\s*/g, " ").replace(/\s+/g, " ").trim();
          summaryWindow.textContent = compactSummary;
          summaryWindow.style.textAlign = "left";
          summaryWindow.style.lineHeight = "1.7";
          contentDiv.appendChild(summaryWindow);

          // If there's more after summary, show as text window
          const rest = part.slice(summaryMatch[0].length).trim();
          if (rest) {
            const textWindow = document.createElement("div");
            textWindow.className = "text-window";
            textWindow.textContent = rest;
            contentDiv.appendChild(textWindow);
          }
          return; // Skip the rest of the extended/detailed summary logic
        }

        // Merge all summary into one block, preserving subheading layout
        // Subheadings: **Heading**; Paragraphs: ### (to be merged)
        // We'll remove all "###" and just keep the text, but keep subheadings bold
        let mergedHtml = "";
        const sectionRegex = /\*\*(.+?)\*\*([\s\S]*?)(?=\*\*|$)/g;
        let match;
        let foundSection = false;
        while ((match = sectionRegex.exec(summaryText)) !== null) {
          foundSection = true;
          const heading = match[1].trim();
          // Clean up body: remove "###", extra whitespace, trailing dashes/hyphens, and stray asterisks
          let body = match[2]
            .replace(/###/g, " ")
            .replace(/[*]+/g, "")
            .replace(/[\s\-]+$/g, "") // Remove trailing spaces and hyphens
            .replace(/\s+/g, " ")
            .trim();
          // Add subheading and body as a paragraph block
          if (heading) {
            mergedHtml += (mergedHtml ? "<br><br>" : "") + `<strong>${heading}</strong>`;
          }
          if (body) {
            mergedHtml += "<br>" + body;
          }
        }
        if (!foundSection) {
          mergedHtml = summaryText
            .replace(/###/g, " ")
            .replace(/[*]+/g, "")
            .replace(/[\s\-]+$/g, "")
            .replace(/\s+/g, " ")
            .trim();
        }
        summaryWindow.innerHTML = mergedHtml.trim();
        summaryWindow.style.textAlign = "left";
        summaryWindow.style.lineHeight = "1.7";
        contentDiv.appendChild(summaryWindow);

        // If there's more after summary, show as text window
        const rest = part.slice(summaryMatch[0].length).trim();
        if (rest) {
          const textWindow = document.createElement("div");
          textWindow.className = "text-window";
          textWindow.textContent = rest;
          contentDiv.appendChild(textWindow);
        }
      } else {
        // If no explicit summary, treat first paragraph as summary if short
        // Also support subheadings for non-summary blocks
        const sectionRegex = /\*\*(.+?)\*\*([\s\S]*?)(?=\*\*|$)/g;
        let match;
        let foundSection = false;
        let mergedHtml = "";
        while ((match = sectionRegex.exec(part)) !== null) {
          foundSection = true;
          const heading = match[1].trim();
          let body = match[2].replace(/###/g, " ").replace(/\s+/g, " ").trim();
          if (heading) {
            mergedHtml += `<br><strong>${heading}</strong><br><br>`;
          }
          if (body) {
            mergedHtml += body + " ";
          }
        }
        if (foundSection) {
          const summaryWindow = document.createElement("div");
          summaryWindow.className = "summary-window";
          summaryWindow.innerHTML = mergedHtml.trim();
          summaryWindow.style.textAlign = "left";
          summaryWindow.style.lineHeight = "1.7";
          contentDiv.appendChild(summaryWindow);
        } else {
          // Fallback: Just text window
          const textWindow = document.createElement("div");
          textWindow.className = "text-window";
          textWindow.textContent = part.trim();
          contentDiv.appendChild(textWindow);
        }
      }
    });
  } else {
    // User message: just render as text
    const textDiv = document.createElement("div");
    textDiv.textContent = content;
    contentDiv.appendChild(textDiv);
  }

  messageDiv.appendChild(avatar);
  messageDiv.appendChild(contentDiv);

  // Remove welcome message if present
  const welcomeMessage = chatContainer.querySelector(".welcome-message");
  if (welcomeMessage) {
    chatContainer.removeChild(welcomeMessage);
  }

  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  // Save message to conversation
  let conversation = conversations.find(c => c.id === currentConversationId);
  if (!conversation) {
    // If not found (shouldn't happen), create new
    conversation = { id: currentConversationId, title: 'New Chat', messages: [] };
    conversations.push(conversation);
  }
  conversation.messages.push({ content, isUser });
  // If first user message, set as title
  if (conversation.messages.length === 1 && isUser) {
    conversation.title = content.slice(0, 30) + (content.length > 30 ? '...' : '');
  }
  saveConversations();
}

// Render chat history from all conversations
function renderChatHistory() {
  chatHistory.innerHTML = '';
  // Show most recent first
  [...conversations].reverse().forEach(conversation => {
    const historyItem = document.createElement("div");
    historyItem.className = "history-item";
    // Container for title and delete button
    const row = document.createElement("div");
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.alignItems = 'center';
    // Title (clickable)
    const titleSpan = document.createElement("span");
    titleSpan.textContent = conversation.title || "New Chat";
    titleSpan.style.flex = '1';
    titleSpan.style.cursor = 'pointer';
    titleSpan.onclick = () => loadConversation(conversation.id);
    // Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.className = 'delete-convo-btn';
    deleteBtn.title = 'Delete conversation';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      // Remove from conversations
      const idx = conversations.findIndex(c => c.id === conversation.id);
      if (idx !== -1) {
        conversations.splice(idx, 1);
        saveConversations();
        renderChatHistory();
        // If deleted conversation is open, show homepage
        if (currentConversationId === conversation.id) {
          chatContainer.innerHTML = `
            <div class="welcome-message">
              <h1>Welcome to Athena AI</h1>
              <p>Your intelligent assistant powered by advanced AI. Ask questions, upload files, and get detailed responses.</p>
            </div>
          `;
        }
      }
    };
    row.appendChild(titleSpan);
    row.appendChild(deleteBtn);
    historyItem.appendChild(row);
    chatHistory.appendChild(historyItem);
  });
}

// Update chat history (legacy, now calls renderChatHistory)
function updateChatHistory() {
  renderChatHistory();
}

// Load a conversation
function loadConversation(conversationId) {
  currentConversationId = conversationId;
  const conversation = conversations.find(c => c.id === conversationId);
  if (!conversation) return;
  chatContainer.innerHTML = "";
  conversation.messages.forEach(msg => {
    addMessage(msg.content, msg.isUser);
  });
}

// Modified submitBtn click for AskVisor Mode
submitBtn.addEventListener('click', async () => {
  const promptText = prompt.value.trim();
  if (!promptText) return;

  addMessage(promptText, true);
  prompt.value = '';
  prompt.style.height = 'auto';

  // Show loading message
  const loadingMessage = document.createElement("div");
  loadingMessage.className = "message assistant";
  loadingMessage.innerHTML = `
    <img class="avatar" src="https://ui-avatars.com/api/?name=A&background=10a37f" alt="Athena">
    <div class="content">Thinking...</div>
  `;
  chatContainer.appendChild(loadingMessage);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  try {
    const res = await fetch("http://127.0.0.1:5000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: promptText })
    });
    const data = await res.json();
    chatContainer.removeChild(loadingMessage);

    if (data.error) {
      addMessage("I apologize, but I encountered an error: " + data.error);
    } else {
      addMessage(data.response);
    }
  } catch (error) {
    chatContainer.removeChild(loadingMessage);
    let errorMessage = 'I apologize, but I encountered an error. ';
    if (error.message.includes('Failed to fetch')) {
      errorMessage += 'Cannot connect to the AI service. Please check if the backend is running.';
    } else {
      errorMessage += error.message;
    }
    addMessage(errorMessage);
  }
});

// Initialize new chat button
newChatBtn.addEventListener("click", createNewChat);

// On load: load conversations and render chat history, but always show homepage
loadConversations();
renderChatHistory();
chatContainer.innerHTML = `
  <div class="welcome-message">
    <h1>Welcome to Athena AI</h1>
    <p>Your intelligent assistant powered by advanced AI. Ask questions, upload files, and get detailed responses.</p>
  </div>
`;

// 🌗 Theme toggle logic
const themeToggle = document.getElementById('theme-toggle');
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

function getInitialTheme() {
  // Check localStorage first
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    return savedTheme;
  }
  // If no saved theme, use system preference
  return prefersDarkScheme.matches ? 'dark' : 'light';
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  
  // Update button appearance
  const icon = themeToggle.querySelector('i');
  const text = themeToggle.querySelector('span');
  
  if (theme === 'dark') {
    icon.className = 'fas fa-sun';
    text.textContent = 'Light mode';
  } else {
    icon.className = 'fas fa-moon';
    text.textContent = 'Dark mode';
  }
}

// Initialize theme
setTheme(getInitialTheme());

// Theme toggle click handler
themeToggle.addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
});

// Listen for system theme changes
prefersDarkScheme.addEventListener('change', (e) => {
  if (!localStorage.getItem('theme')) {
    setTheme(e.matches ? 'dark' : 'light');
  }
});

// Add CSS for message attachments
const style = document.createElement('style');
style.textContent = `
  .message-attachments {
    margin-top: 1rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .message-attachments img {
    max-width: 200px;
    max-height: 150px;
    border-radius: 0.375rem;
    border: 1px solid var(--border-color);
  }
  
  .file-attachment {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--input-bg);
    border: 1px solid var(--border-color);
    border-radius: 0.375rem;
    font-size: 0.875rem;
  }
  
  .file-attachment i {
    color: var(--primary-color);
  }
  
  @media (max-width: 768px) {
    .message-attachments img {
      max-width: 150px;
      max-height: 120px;
    }
  }
`;
document.head.appendChild(style);
