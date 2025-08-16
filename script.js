  // --- DOM Elements ---
        const chatMessages = document.getElementById('chat-messages');
        const chatForm = document.getElementById('chat-form');
        const userInput = document.getElementById('user-input');
        const sendBtn = document.getElementById('send-btn');
        const newChatBtn = document.getElementById('new-chat-btn');
        
        // --- State ---
        let history = [];
        const initialGreeting = "Hello! How can I help you today? You can ask me to write code.";

        // --- Assets ---
        const botAvatar = `<div class="avatar" style="background-color: #581c87;"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="#e9d5ff"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m1.5-4.5v-1.5m1.5.75-1.5-1.5m15 3.75h1.5m-4.5-3.75v-1.5m1.5.75-1.5-1.5M12 6.75v-1.5m1.5.75-1.5-1.5m-1.5 1.5 1.5-1.5m0 13.5v-1.5m-1.5.75 1.5-1.5m1.5-1.5-1.5 1.5M12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 19.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm15 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm-7.5 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" /></svg></div>`;
        const userAvatar = `<div class="avatar" style="background-color: #2563eb;"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="#eff6ff"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg></div>`;

        function scrollToBottom() {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        
        function copyToClipboard(text, buttonElement) {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                buttonElement.textContent = 'Copied!';
            } catch (err) {
                buttonElement.textContent = 'Error';
                console.error('Failed to copy text: ', err);
            }
            document.body.removeChild(textArea);
            setTimeout(() => { buttonElement.textContent = 'Copy'; }, 2000);
        }

        function displayMessage(role, text) {
            const messageWrapper = document.createElement('div');
            messageWrapper.className = `message ${role}`;

            const textBubble = document.createElement('div');
            textBubble.className = 'text-bubble';

            const codeBlockRegex = /```(\w+)?\n([\s\S]+?)```/g;
            let lastIndex = 0;

            // This logic only applies to the model's response to format code blocks
            if (role === 'model') {
                text.replace(codeBlockRegex, (match, language, code, offset) => {
                    if (offset > lastIndex) {
                        const p = document.createElement('p');
                        p.textContent = text.substring(lastIndex, offset);
                        textBubble.appendChild(p);
                    }
                    const codeWrapper = document.createElement('div');
                    codeWrapper.className = 'code-block-wrapper';
                    const header = document.createElement('div');
                    header.className = 'code-block-header';
                    const langSpan = document.createElement('span');
                    langSpan.textContent = language || 'code';
                    const copyBtn = document.createElement('button');
                    copyBtn.className = 'copy-btn';
                    copyBtn.textContent = 'Copy';
                    copyBtn.onclick = () => copyToClipboard(code.trim(), copyBtn);
                    header.appendChild(langSpan);
                    header.appendChild(copyBtn);
                    const pre = document.createElement('pre');
                    const codeElement = document.createElement('code');
                    codeElement.className = `language-${language || 'plaintext'}`;
                    codeElement.textContent = code.trim();
                    pre.appendChild(codeElement);
                    codeWrapper.appendChild(header);
                    codeWrapper.appendChild(pre);
                    textBubble.appendChild(codeWrapper);
                    hljs.highlightElement(codeElement);
                    lastIndex = offset + match.length;
                });
            }

            // Add any remaining text or the full text for user/non-code model responses
            if (lastIndex < text.length) {
                const p = document.createElement('p');
                p.textContent = text.substring(lastIndex);
                textBubble.appendChild(p);
            }

            const avatar = role === 'user' ? userAvatar : botAvatar;
            
            // ** CHANGE IS HERE **
            if (role === 'user') {
                // For user: [Text Bubble] [Avatar]
                messageWrapper.appendChild(textBubble);
                messageWrapper.innerHTML += avatar;
            } else {
                // For model: [Avatar] [Text Bubble]
                messageWrapper.innerHTML += avatar;
                messageWrapper.appendChild(textBubble);
            }
            
            chatMessages.appendChild(messageWrapper);
            scrollToBottom();
        }
        
        function toggleTypingIndicator(show) {
            let typingIndicator = document.getElementById('typing-indicator');
            if (show) {
                if (!typingIndicator) {
                    typingIndicator = document.createElement('div');
                    typingIndicator.className = 'message model typing';
                    typingIndicator.id = 'typing-indicator';
                    typingIndicator.innerHTML = `${botAvatar}<div class="text-bubble"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
                    chatMessages.appendChild(typingIndicator);
                    scrollToBottom();
                }
            } else {
                if (typingIndicator) typingIndicator.remove();
            }
        }

        async function callGeminiAPI() {
            toggleTypingIndicator(true);
            sendBtn.disabled = true;
            userInput.disabled = true;
            
            try {
                const apiKey = "AIzaSyBbIphxlfyB2RZhJOhrFVPvXzCy4W2yz0A"; // API key is provided by the environment
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
                const payload = { contents: history };

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) throw new Error(`API call failed: ${response.status}`);
                const result = await response.json();
                
                let botResponseText = "Sorry, I couldn't get a response. Please try again.";
                if (result.candidates && result.candidates.length > 0 && result.candidates[0].content.parts.length > 0) {
                    botResponseText = result.candidates[0].content.parts[0].text;
                }
                
                history.push({ role: 'model', parts: [{ text: botResponseText }] });
                toggleTypingIndicator(false);
                displayMessage('model', botResponseText);

            } catch (error) {
                console.error("Gemini API call error:", error);
                toggleTypingIndicator(false);
                displayMessage('model', `An error occurred: ${error.message}`);
            } finally {
                sendBtn.disabled = false;
                userInput.disabled = false;
                userInput.focus();
            }
        }

        function startNewChat() {
            history = [];
            chatMessages.innerHTML = '';
            history.push({ role: 'model', parts: [{ text: initialGreeting }] });
            displayMessage('model', initialGreeting);
        }

        // --- Event Listeners ---
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const userText = userInput.value.trim();
            if (userText) {
                history.push({ role: 'user', parts: [{ text: userText }] });
                displayMessage('user', userText);
                userInput.value = '';
                callGeminiAPI();
            }
        });

        newChatBtn.addEventListener('click', startNewChat);
        
        window.addEventListener('load', startNewChat);