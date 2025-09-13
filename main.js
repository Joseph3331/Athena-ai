// DOM Elements
// === CONFIG: Backend URL ===
// Use VITE_API_URL if defined (in .env or Vercel env vars), otherwise fallback to localhost
const BACKEND_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

// DOM elements
const chatContainer = document.querySelector(".chat-container");
const prompt = document.querySelector("#prompt");
const submitBtn = document.querySelector("#submit");
const clearBtn = document.querySelector("#clear");

// Add a new message to the chat
function addMessage(content, isUser = false) {
  const message = document.createElement("div");
  message.className = `message ${isUser ? "user" : "assistant"}`;

  message.innerHTML = `
    <img class="avatar" 
      src="${isUser 
        ? "https://ui-avatars.com/api/?name=U&background=0D8ABC" 
        : "https://ui-avatars.com/api/?name=A&background=10a37f"}" 
      alt="${isUser ? "User" : "Athena"}">
    <div class="content">${content}</div>
  `;

  chatContainer.appendChild(message);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Clear chat
clearBtn.addEventListener("click", () => {
  chatContainer.innerHTML = "";
});

// Auto-resize textarea
prompt.addEventListener("input", () => {
  prompt.style.height = "auto";
  prompt.style.height = prompt.scrollHeight + "px";
});

// Submit on Enter (Shift+Enter for newline)
prompt.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    submitBtn.click();
  }
});

// Handle submit button
submitBtn.addEventListener("click", async () => {
  const promptText = prompt.value.trim();
  if (!promptText) return;

  addMessage(promptText, true);
  prompt.value = "";
  prompt.style.height = "auto";

  // Show "thinking" message
  const loadingMessage = document.createElement("div");
  loadingMessage.className = "message assistant";
  loadingMessage.innerHTML = `
    <img class="avatar" src="https://ui-avatars.com/api/?name=A&background=10a37f" alt="Athena">
    <div class="content">Thinking...</div>
  `;
  chatContainer.appendChild(loadingMessage);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  try {
    const res = await fetch(`${BACKEND_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: promptText }),
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
    let errorMessage = "I apologize, but I encountered an error. ";
    if (error.message.includes("Failed to fetch")) {
      errorMessage +=
        "Cannot connect to the AI service. Please check if the backend is running.";
    } else {
      errorMessage += error.message;
    }
    addMessage(errorMessage);
  }
});
