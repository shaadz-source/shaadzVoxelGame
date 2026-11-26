        /* Where the chat server lives. Empty = same server as the index page.
           Set this to the backend URL (e.g. 'https://your-server.example') if it is on a different host. */
        const API_BASE = '';


        document.querySelector('.account a').href = API_BASE + '/logout';

        const chat = document.getElementById('chat');
        const chatInner = document.getElementById('chat-inner');
        const input = document.getElementById('msg');
        const sendBtn = document.getElementById('send-btn');
        const form = document.getElementById('form');

        const scrollTrack = document.getElementById('scroll-track');
        const scrollThumb = document.getElementById('scroll-thumb');
        const scrollUpBtn = document.getElementById('scroll-up');
        const scrollDownBtn = document.getElementById('scroll-down');

        const LOADING_GIF = 'https://shaadz-source.github.io/shaadzVoxelGame/loding.gif';
        const USER_ICON = 'https://shaadz-source.github.io/shaadzVoxelGame/user.png';
        const AI_ICON = 'https://shaadz-source.github.io/shaadzVoxelGame/slm.png';

        function scrollToBottom() {
            chat.scrollTop = chat.scrollHeight;
            updateScrollbar();
        }

        function updateScrollbar() {
            const scrollHeight = chat.scrollHeight;
            const clientHeight = chat.clientHeight;
            const scrollTop = chat.scrollTop;

            if (scrollHeight <= clientHeight) {
                scrollThumb.style.display = 'none';
                return;
            }
            scrollThumb.style.display = 'flex';

            const trackHeight = scrollTrack.clientHeight;
            const thumbHeight = Math.max(60, Math.floor((clientHeight / scrollHeight) * trackHeight));
            scrollThumb.style.height = thumbHeight + 'px';

            const maxThumbTop = trackHeight - thumbHeight;
            const scrollRatio = scrollTop / (scrollHeight - clientHeight);
            scrollThumb.style.top = (scrollRatio * maxThumbTop) + 'px';
        }

        chat.addEventListener('scroll', updateScrollbar);
        window.addEventListener('resize', updateScrollbar);

        if (window.ResizeObserver) {
            new ResizeObserver(updateScrollbar).observe(chatInner);
        }

        /* Drag Thumb Functionality */
        let isDragging = false;
        let startY = 0;
        let startScrollTop = 0;

        scrollThumb.addEventListener('pointerdown', (e) => {
            isDragging = true;
            scrollThumb.classList.add('active');
            startY = e.clientY;
            startScrollTop = chat.scrollTop;
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            const deltaY = e.clientY - startY;
            const trackHeight = scrollTrack.clientHeight;
            const thumbHeight = scrollThumb.clientHeight;
            const scrollableHeight = chat.scrollHeight - chat.clientHeight;

            if (trackHeight <= thumbHeight) return;
            const scrollRatio = deltaY / (trackHeight - thumbHeight);
            chat.scrollTop = startScrollTop + (scrollRatio * scrollableHeight);
        });

        const endDrag = () => {
            if (isDragging) {
                isDragging = false;
                scrollThumb.classList.remove('active');
                document.body.style.userSelect = '';
            }
        };
        document.addEventListener('pointerup', endDrag);
        document.addEventListener('pointercancel', endDrag);

        scrollTrack.addEventListener('click', (e) => {
            if (e.target === scrollThumb || e.target.closest('.scroll-thumb')) return;
            const rect = scrollTrack.getBoundingClientRect();
            const clickY = e.clientY - rect.top;
            const trackHeight = scrollTrack.clientHeight;
            const scrollableHeight = chat.scrollHeight - chat.clientHeight;

            const targetRatio = clickY / trackHeight;
            chat.scrollTop = targetRatio * scrollableHeight;
        });

        scrollUpBtn.addEventListener('click', () => {
            chat.scrollTop -= 60;
        });
        scrollDownBtn.addEventListener('click', () => {
            chat.scrollTop += 60;
        });

        input.addEventListener('focus', () => {
            setTimeout(scrollToBottom, 300);
        });

        if (window.visualViewport) {
            const fitToVisibleArea = () => {
                const viewport = window.visualViewport;
                document.body.style.top = viewport.offsetTop + 'px';
                document.body.style.height = viewport.height + 'px';
                document.documentElement.style.height = viewport.height + 'px';
                updateScrollbar();
            };
            window.visualViewport.addEventListener('resize', fitToVisibleArea);
            window.visualViewport.addEventListener('scroll', fitToVisibleArea);
            fitToVisibleArea();
        }

        /* ---------- Reply parsing ---------- */
        function parseBlocks(source) {
            const lines = String(source ?? '').replace(/\r\n?/g, '\n').split('\n');
            const blocks = [];
            let textLines = [];
            let code = null;

            const flushText = () => {
                const value = textLines.join('\n').replace(/^\n+|\n+$/g, '');
                if (value.trim()) blocks.push({ type: 'text', value });
                textLines = [];
            };

            for (const line of lines) {
                if (code === null) {
                    const open = line.match(/^\s*```\s*([\w+#.\-]*)\s*$/);
                    if (open) {
                        flushText();
                        code = { lang: open[1].toLowerCase(), lines: [] };
                    } else {
                        textLines.push(line);
                    }
                } else if (/^\s*```\s*$/.test(line)) {
                    blocks.push({ type: 'code', lang: code.lang, value: code.lines.join('\n') });
                    code = null;
                } else {
                    code.lines.push(line);
                }
            }

            if (code !== null) {
                blocks.push({ type: 'code', lang: code.lang, value: code.lines.join('\n') });
            }
            flushText();
            return blocks;
        }

        function renderInline(parent, str) {
            str.split(/`([^`\n]+)`/).forEach((part, i) => {
                if (i % 2 === 1) {
                    const code = document.createElement('span');
                    code.className = 'ic';
                    code.textContent = part;
                    parent.appendChild(code);
                    return;
                }
                part.split(/\*\*([^*\n]+)\*\*/).forEach((piece, j) => {
                    if (!piece) return;
                    if (j % 2 === 1) {
                        const strong = document.createElement('strong');
                        strong.textContent = piece;
                        parent.appendChild(strong);
                    } else {
                        parent.appendChild(document.createTextNode(piece));
                    }
                });
            });
        }

        /* ---------- Syntax highlighting ---------- */
        const KW_JAVA = 'abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while var record yield true false null';
        const KW_JS = 'async await break case catch class const continue debugger default delete do else export extends false finally for from function if import in instanceof let new null of return super switch this throw true try typeof undefined var void while with yield';
        const KW_PY = 'and as assert async await break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield';
        const KW_C = 'auto break case char const continue default do double else enum extern float for goto if inline int long register restrict return short signed sizeof static struct switch typedef union unsigned void volatile while bool class namespace template typename public private protected virtual new delete this using nullptr true false';

        const LANG_KEYWORDS = {
            java: KW_JAVA,
            js: KW_JS, javascript: KW_JS, ts: KW_JS, typescript: KW_JS, jsx: KW_JS, tsx: KW_JS,
            py: KW_PY, python: KW_PY,
            c: KW_C, cpp: KW_C, 'c++': KW_C, h: KW_C, hpp: KW_C, cs: KW_C, csharp: KW_C
        };
        const HASH_COMMENT_LANGS = new Set(['py', 'python', 'sh', 'bash', 'shell', 'rb', 'ruby', 'yaml', 'yml', 'ps1', 'powershell']);

        const KEYWORD_CACHE = {};
        function keywordSetFor(lang) {
            if (!KEYWORD_CACHE[lang]) {
                const words = LANG_KEYWORDS[lang] || [KW_JAVA, KW_JS, KW_PY, KW_C].join(' ');
                KEYWORD_CACHE[lang] = new Set(words.split(' '));
            }
            return KEYWORD_CACHE[lang];
        }

        const RE_SLASH_TOKENS = /(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|(\b\d[\w.]*\b)|([A-Za-z_$][\w$]*)/g;
        const RE_HASH_TOKENS = /(#[^\n]*)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|(\b\d[\w.]*\b)|([A-Za-z_][\w]*)/g;

        function appendHighlighted(container, code, lang) {
            const useHash = HASH_COMMENT_LANGS.has(lang);
            const re = useHash ? RE_HASH_TOKENS : RE_SLASH_TOKENS;
            const keywords = keywordSetFor(lang);
            re.lastIndex = 0;

            const span = (cls, text) => {
                const el = document.createElement('span');
                el.className = cls;
                el.textContent = text;
                container.appendChild(el);
            };

            let last = 0;
            let m;
            while ((m = re.exec(code)) !== null) {
                if (m.index > last) {
                    container.appendChild(document.createTextNode(code.slice(last, m.index)));
                }
                const [token, comment, str, num, word] = m;
                if (comment !== undefined) span('tok-com', token);
                else if (str !== undefined) span('tok-str', token);
                else if (num !== undefined) span('tok-num', token);
                else if (word !== undefined && keywords.has(word)) span('tok-kw', token);
                else container.appendChild(document.createTextNode(token));
                last = re.lastIndex;
            }
            if (last < code.length) {
                container.appendChild(document.createTextNode(code.slice(last)));
            }
        }

        /* ---------- Clipboard ---------- */
        async function copyText(text) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (_) {
                const area = document.createElement('textarea');
                area.value = text;
                area.setAttribute('readonly', '');
                area.style.position = 'fixed';
                area.style.opacity = '0';
                document.body.appendChild(area);
                area.select();
                let ok = false;
                try { ok = document.execCommand('copy'); } catch (_) {}
                area.remove();
                return ok;
            }
        }

        /* ---------- Code box ---------- */
        function buildCodeBlock(lang, code) {
            const block = document.createElement('div');
            block.className = 'code-block';

            const head = document.createElement('div');
            head.className = 'code-head';

            const label = document.createElement('span');
            label.className = 'code-lang';
            label.textContent = lang || 'code';

            const copy = document.createElement('button');
            copy.type = 'button';
            copy.className = 'code-copy';
            copy.textContent = 'Copy';
            copy.addEventListener('click', async () => {
                const ok = await copyText(code);
                copy.textContent = ok ? 'Copied!' : 'Failed';
                copy.classList.toggle('done', ok);
                clearTimeout(copy._resetTimer);
                copy._resetTimer = setTimeout(() => {
                    copy.textContent = 'Copy';
                    copy.classList.remove('done');
                }, 1500);
            });

            head.append(label, copy);

            const pre = document.createElement('pre');
            const codeEl = document.createElement('code');
            appendHighlighted(codeEl, code, lang);
            pre.appendChild(codeEl);

            block.append(head, pre);
            return block;
        }

        function setBody(target, text, follow = true) {
            target.replaceChildren();
            for (const block of parseBlocks(text)) {
                if (block.type === 'code') {
                    target.appendChild(buildCodeBlock(block.lang, block.value));
                } else {
                    const prose = document.createElement('div');
                    prose.className = 'prose';
                    renderInline(prose, block.value);
                    target.appendChild(prose);
                }
            }
            if (follow) scrollToBottom();
        }

        /* ---------- Loading bubble ---------- */
        const LOADING_PHRASES = [
            'thinking',
            'digging through it',
            'putting the words together',
            'checking the details',
            'almost there'
        ];

        function showLoader(target) {
            const startedAt = Date.now();

            const wrap = document.createElement('div');
            wrap.className = 'loader';

            const gif = document.createElement('img');
            gif.className = 'loader-gif';
            gif.src = LOADING_GIF;
            gif.alt = '';
            gif.onerror = () => { gif.style.display = 'none'; };

            const text = document.createElement('span');
            text.className = 'loader-text';
            text.textContent = LOADING_PHRASES[0];

            const dots = document.createElement('span');
            dots.className = 'loader-dots';
            for (let i = 0; i < 3; i++) {
                const dot = document.createElement('span');
                dot.textContent = '.';
                dots.appendChild(dot);
            }

            const time = document.createElement('span');
            time.className = 'loader-time';
            time.textContent = '0s';

            wrap.append(gif, text, dots, time);
            target.replaceChildren(wrap);
            scrollToBottom();

            let phrase = 0;
            const phraseTimer = setInterval(() => {
                const elapsed = (Date.now() - startedAt) / 1000;
                if (elapsed > 12) {
                    text.textContent = 'still going, big answers take longer';
                    return;
                }
                phrase = (phrase + 1) % LOADING_PHRASES.length;
                text.textContent = LOADING_PHRASES[phrase];
            }, 1800);

            const timeTimer = setInterval(() => {
                time.textContent = Math.floor((Date.now() - startedAt) / 1000) + 's';
            }, 1000);

            let stopped = false;
            return function stop() {
                if (stopped) return;
                stopped = true;
                clearInterval(phraseTimer);
                clearInterval(timeTimer);
            };
        }

        /* ---------- Messages ---------- */
        function addMessage(sender, text) {
            const message = document.createElement('div');
            message.className = 'msg';

            const isUser = sender.toLowerCase() === 'you' || sender.toLowerCase() === 'user';
            if (isUser) {
                message.classList.add('user-msg');
            }

            const icon = document.createElement('img');
            icon.className = 'msg-icon';
            icon.src = isUser ? USER_ICON : AI_ICON;
            icon.alt = isUser ? 'User Icon' : 'AI Icon';

            const textNode = document.createElement('div');
            textNode.className = 'msg-text';

            message.appendChild(icon);
            message.appendChild(textNode);
            chatInner.appendChild(message);

            if (text) {
                setBody(textNode, text);
            }
            scrollToBottom();

            return message;
        }

        /* ---------- Chat history popup ---------- */
        /* ---------- Greeting bubble (time of day + name) ---------- */
        let userName = '';

        function greetingFor(now = new Date()) {
            const h = now.getHours();
            const name = userName ? ', ' + userName : '';
            if (h >= 5 && h < 12) return { title: 'Good morning' + name + '!', sub: 'what can I help you with today?' };
            if (h >= 12 && h < 17) return { title: 'Good afternoon' + name + '!', sub: 'what can I help you with today?' };
            if (h >= 17 && h < 22) return { title: 'Good evening' + name + '!', sub: 'what can I help you with tonight?' };
            return { title: 'Hey' + name + ', night owl!', sub: 'still up? ask me anything.' };
        }

        function fillGreeting(target) {
            const g = greetingFor();
            const title = document.createElement('div');
            title.className = 'prose';
            const strong = document.createElement('strong');
            strong.textContent = g.title;
            title.appendChild(strong);
            const sub = document.createElement('div');
            sub.className = 'prose';
            sub.textContent = g.sub;
            target.replaceChildren(title, sub);
        }

        function addGreeting() {
            const message = addMessage('AI', '');
            message.classList.add('greet');
            fillGreeting(message.querySelector('.msg-text'));
        }
        const HISTORY_ICON = 'https://shaadz-source.github.io/shaadzVoxelGame/history.png';

        const header = document.getElementById('app-header');
        const historyBtn = document.getElementById('history-btn');
        const historyIcon = document.getElementById('history-icon');
        const historyFallback = document.getElementById('history-fallback');
        const historyPanel = document.getElementById('history-panel');
        const historyBackdrop = document.getElementById('history-backdrop');
        const historyList = document.getElementById('history-list');
        const newChatBtn = document.getElementById('new-chat-btn');
        const historyCloseBtn = document.getElementById('history-close-btn');

        let currentChat = null;
        let isSending = false;
        let requestController = null;   // the reply in progress, so Stop can cancel it
        let userStopped = false;

        /* While a reply is coming in, the Send button becomes Stop */
        function setSending(on) {
            isSending = on;
            sendBtn.type = on ? 'button' : 'submit';
            sendBtn.textContent = on ? 'Stop' : 'Send';
            sendBtn.classList.toggle('stop-btn', on);
            if (!on) requestController = null;
        }

        /* Cancels the reply in progress (used when switching chats) */
        function abortCurrent() {
            if (requestController) {
                const controller = requestController;
                requestController = null;
                controller.abort();
            }
        }

        sendBtn.addEventListener('click', (event) => {
            if (!isSending) return; // not sending: let the click send the form as normal
            event.preventDefault();
            userStopped = true;
            if (requestController) requestController.abort();
        });
        let activeRequestId = 0;

        historyIcon.src = HISTORY_ICON;
        historyIcon.addEventListener('error', () => {
            historyIcon.hidden = true;
            historyFallback.hidden = false;
        });

        /* Quick fade + slight grow on open, fade out then hide on close */
        const PREFERS_REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        function showPop(el) {
            clearTimeout(el._hideTimer);
            el.hidden = false;
            void el.offsetWidth; // let the hidden->visible change paint before animating
            el.classList.add('open');
        }

        function hidePop(el) {
            if (el.hidden) return;
            el.classList.remove('open');
            clearTimeout(el._hideTimer);
            el._hideTimer = setTimeout(() => { el.hidden = true; }, PREFERS_REDUCED ? 0 : 150);
        }

        /* Custom scrollbar for any scrollable element; mirrors the chat scrollbar */
        function bindScrollbar(scroller, track, thumb, upBtn, downBtn) {
            const MIN_THUMB = 28;

            const update = () => {
                const max = scroller.scrollHeight - scroller.clientHeight;
                if (max <= 1) {
                    thumb.style.display = 'none';
                    return;
                }
                thumb.style.display = 'flex';
                const trackH = track.clientHeight;
                const thumbH = Math.max(MIN_THUMB, Math.floor((scroller.clientHeight / scroller.scrollHeight) * trackH));
                thumb.style.height = thumbH + 'px';
                thumb.style.top = (scroller.scrollTop / max) * (trackH - thumbH) + 'px';
            };

            scroller.addEventListener('scroll', update);
            if (window.ResizeObserver) new ResizeObserver(update).observe(scroller);

            let dragging = false;
            let startY = 0;
            let startTop = 0;

            thumb.addEventListener('pointerdown', (e) => {
                dragging = true;
                startY = e.clientY;
                startTop = scroller.scrollTop;
                thumb.setPointerCapture(e.pointerId);
                thumb.classList.add('active');
                e.preventDefault();
            });
            thumb.addEventListener('pointermove', (e) => {
                if (!dragging) return;
                const max = scroller.scrollHeight - scroller.clientHeight;
                const travel = track.clientHeight - thumb.offsetHeight;
                if (travel <= 0) return;
                scroller.scrollTop = startTop + ((e.clientY - startY) / travel) * max;
            });
            const endDrag = () => {
                dragging = false;
                thumb.classList.remove('active');
            };
            thumb.addEventListener('pointerup', endDrag);
            thumb.addEventListener('pointercancel', endDrag);

            track.addEventListener('click', (e) => {
                if (e.target === thumb) return;
                const rect = track.getBoundingClientRect();
                const ratio = (e.clientY - rect.top) / track.clientHeight;
                scroller.scrollTop = ratio * (scroller.scrollHeight - scroller.clientHeight);
            });
            upBtn.addEventListener('click', () => { scroller.scrollTop -= 40; });
            downBtn.addEventListener('click', () => { scroller.scrollTop += 40; });

            return update;
        }

        const historyScrollUp = document.getElementById('history-scroll-up');
        const historyScrollDown = document.getElementById('history-scroll-down');
        const historyTrack = document.getElementById('history-track');
        const historyThumb = document.getElementById('history-thumb');
        const updateHistoryScroll = bindScrollbar(historyList, historyTrack, historyThumb, historyScrollUp, historyScrollDown);

        /* Sits under the header and fits the visible screen (handles phone browser bars and keyboards) */
        function placeHistoryPanel() {
            const top = header.getBoundingClientRect().bottom + 6;
            const visibleH = window.visualViewport ? window.visualViewport.height : window.innerHeight;
            historyPanel.style.top = top + 'px';
            historyPanel.style.maxHeight = Math.max(160, visibleH - top - 12) + 'px';
            updateHistoryScroll();
        }

        function openHistory() {
            placeHistoryPanel();
            showPop(historyBackdrop);
            showPop(historyPanel);
            historyBtn.setAttribute('aria-expanded', 'true');
            loadHistoryList();
        }

        function closeHistory() {
            hidePop(historyPanel);
            hidePop(historyBackdrop);
            historyBtn.setAttribute('aria-expanded', 'false');
        }

        const onViewportChange = () => {
            if (!historyPanel.hidden) placeHistoryPanel();
        };
        window.addEventListener('resize', onViewportChange);
        if (window.visualViewport) window.visualViewport.addEventListener('resize', onViewportChange);

        /* ---------- Custom confirm dialog ---------- */
        const dialogBackdrop = document.getElementById('dialog-backdrop');
        const dialogBox = document.getElementById('dialog-box');
        const dialogMsg = document.getElementById('dialog-msg');
        const dialogOk = document.getElementById('dialog-ok');
        const dialogCancel = document.getElementById('dialog-cancel');
        let dialogResolve = null;

        function askConfirm(message, okLabel, cancelLabel) {
            if (dialogResolve) dialogResolve(false);
            dialogMsg.textContent = message;
            dialogOk.textContent = okLabel;
            dialogCancel.textContent = cancelLabel;
            showPop(dialogBackdrop);
            showPop(dialogBox);
            dialogCancel.focus(); // safe default: Enter cancels
            return new Promise((resolve) => { dialogResolve = resolve; });
        }

        function settleDialog(value) {
            if (!dialogResolve) return;
            const resolve = dialogResolve;
            dialogResolve = null;
            hidePop(dialogBox);
            hidePop(dialogBackdrop);
            resolve(value);
        }

        dialogOk.addEventListener('click', () => settleDialog(true));
        dialogCancel.addEventListener('click', () => settleDialog(false));
        dialogBackdrop.addEventListener('click', () => settleDialog(false));

        historyBtn.addEventListener('click', () => {
            if (historyPanel.hidden) openHistory();
            else closeHistory();
        });
        historyCloseBtn.addEventListener('click', closeHistory);
        historyBackdrop.addEventListener('click', closeHistory);
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            if (dialogResolve) settleDialog(false);
            else closeHistory();
        });

        function formatWhen(ms) {
            const d = new Date(ms);
            const now = new Date();
            if (d.toDateString() === now.toDateString()) {
                return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            }
            return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }

        function historyNote(text) {
            const li = document.createElement('li');
            li.className = 'history-empty';
            li.textContent = text;
            historyList.replaceChildren(li);
            updateHistoryScroll();
        }

        async function loadHistoryList() {
            historyNote('Loading...');
            try {
                const response = await fetch(API_BASE + '/history');
                if (response.status === 401) {
                    window.location.href = API_BASE + '/login';
                    return;
                }
                if (!response.ok) throw new Error('HTTP ' + response.status);
                renderHistory(await response.json());
            } catch (error) {
                historyNote('Could not load your chats.');
            }
        }

        function renderHistory(items) {
            historyList.replaceChildren();
            if (!items.length) {
                historyNote('No saved chats yet. Send a message to start one.');
                return;
            }
            for (const item of items) {
                const row = document.createElement('li');
                row.className = 'history-item' + (item.id === currentChat ? ' active' : '');

                const open = document.createElement('button');
                open.type = 'button';
                open.className = 'history-open';

                const title = document.createElement('span');
                title.className = 'history-title';
                title.textContent = item.title;

                const when = document.createElement('span');
                when.className = 'history-when';
                when.textContent = formatWhen(item.updated);

                open.append(title, when);
                open.addEventListener('click', () => openChat(item.id));

                const del = document.createElement('button');
                del.type = 'button';
                del.className = 'history-delete';
                del.setAttribute('aria-label', 'Delete chat: ' + item.title);
                del.textContent = '\u00d7';
                del.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteChat(item.id, item.title);
                });

                row.append(open, del);
                historyList.appendChild(row);
            }
            updateHistoryScroll();
        }

        async function deleteChat(id, title) {
            const ok = await askConfirm('Delete "' + title + '" from your history?', 'OK', 'Cancel');
            if (!ok) return;
            try {
                await fetch(API_BASE + '/history/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ id: id })
                });
            } catch (error) {
                /* reload will reflect current server state */
            }
            if (id === currentChat) {
                await newChat();
            }
            loadHistoryList();
        }

        async function newChat() {
            activeRequestId++;
            abortCurrent();
            setSending(false);
            try {
                const response = await fetch(API_BASE + '/history/new');
                if (response.status === 401) {
                    window.location.href = API_BASE + '/login';
                    return;
                }
                currentChat = (await response.text()).trim();
            } catch (error) {
                currentChat = null;
            }
            chatInner.replaceChildren();
            addGreeting();
        }

        async function openChat(id) {
            closeHistory();
            activeRequestId++;
            abortCurrent();
            setSending(false);
            currentChat = id;
            chatInner.replaceChildren();
            addGreeting();
            try {
                const response = await fetch(API_BASE + '/history/open?id=' + encodeURIComponent(id));
                if (response.status === 401) {
                    window.location.href = API_BASE + '/login';
                    return;
                }
                if (!response.ok) throw new Error('HTTP ' + response.status);
                for (const turn of await response.json()) {
                    addMessage(turn.role === 'you' ? 'You' : 'AI', turn.text);
                }
            } catch (error) {
                addMessage('AI', 'could not load this chat');
            }
            scrollToBottom();
        }

        newChatBtn.addEventListener('click', async () => {
            closeHistory();
            await newChat();
        });

        async function startChat() {
            try {
                const response = await fetch(API_BASE + '/history');
                if (response.status === 401) {
                    window.location.href = API_BASE + '/login';
                    return;
                }
                const items = response.ok ? await response.json() : [];
                if (items.length) {
                    await openChat(items[0].id);
                    return;
                }
            } catch (error) {
                /* fall through to a new chat */
            }
            await newChat();
        }

        startChat();

        /* Blinking caret shown after the text while the answer is still arriving */
        function appendCaret(target) {
            let last = target.lastElementChild;
            if (!last || !last.classList.contains('prose')) {
                last = document.createElement('div');
                last.className = 'prose';
                target.appendChild(last);
            }
            const caret = document.createElement('span');
            caret.className = 'stream-caret';
            caret.textContent = '\u258b';
            last.appendChild(caret);
        }

        form.addEventListener('submit', async function (event) {
            event.preventDefault();
            if (isSending) return;

            const text = input.value.trim();
            if (!text) return;

            setSending(true);
            const controller = new AbortController();
            requestController = controller;
            userStopped = false;
            const requestId = ++activeRequestId;
            const stale = () => requestId !== activeRequestId;

            addMessage('You', text);
            input.value = '';
            input.focus();
            scrollToBottom();

            const reply = addMessage('AI', '');
            const replyTextNode = reply.querySelector('.msg-text');
            const stopLoader = showLoader(replyTextNode);

            /* Text arrives in small pieces; repaint at most once per frame */
            let streamed = '';
            let streamDone = false;
            let painting = false;
            const paint = () => {
                painting = false;
                if (stale() || streamDone) return;
                const follow = chat.scrollHeight - chat.scrollTop - chat.clientHeight < 80;
                setBody(replyTextNode, streamed, follow);
                appendCaret(replyTextNode);
                if (follow) scrollToBottom();
            };
            const schedule = () => {
                if (!painting) {
                    painting = true;
                    requestAnimationFrame(paint);
                }
            };

            let finalText = null;
            let serverError = null;
            let connectionFailed = false;

            try {
                const response = await fetch(
                    API_BASE + '/chat/stream?q=' + encodeURIComponent(text) +
                    '&session=' + encodeURIComponent(currentChat || ''),
                    { signal: controller.signal }
                );

                if (stale()) {
                    stopLoader();
                    return;
                }
                if (response.status === 401) {
                    window.location.href = API_BASE + '/login';
                    return;
                }
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status);
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                let gotText = false;

                const handleLine = (line) => {
                    if (!line.trim()) return;
                    const event = JSON.parse(line);
                    if (typeof event.d === 'string') {
                        if (!gotText) {
                            stopLoader();
                            gotText = true;
                        }
                        streamed += event.d;
                        schedule();
                    } else if (typeof event.f === 'string') {
                        finalText = event.f;
                    } else if (typeof event.e === 'string') {
                        serverError = event.e;
                    }
                };

                for (;;) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    let newline;
                    while ((newline = buffer.indexOf('\n')) >= 0) {
                        handleLine(buffer.slice(0, newline));
                        buffer = buffer.slice(newline + 1);
                    }
                }
                buffer += decoder.decode();
                if (buffer.trim()) handleLine(buffer);
            } catch (error) {
                if (!userStopped) connectionFailed = true;
            } finally {
                streamDone = true;
                stopLoader();
                if (!stale()) {
                    let answer;
                    if (userStopped) {
                        answer = streamed ? streamed + '\n\n(stopped)' : '(stopped)';
                    } else if (serverError !== null) {
                        answer = serverError;
                    } else if (connectionFailed) {
                        answer = streamed
                            ? streamed + '\n\n(connection lost)'
                            : 'you haft to think the server is down';
                    } else {
                        answer = finalText !== null ? finalText : streamed;
                    }
                    setBody(replyTextNode, answer || 'no answer, try again');
                    scrollToBottom();
                }
                if (!stale()) {
                    setSending(false);
                }
            }
        });

        fetch(API_BASE + '/me').then((r) => (r.ok ? r.text() : '')).then((name) => {
            userName = (name || '').trim();
            document.getElementById('who').textContent = userName ? 'signed in as ' + userName : '';
            document.querySelectorAll('.msg.greet .msg-text').forEach(fillGreeting);
        });

        setTimeout(updateScrollbar, 100);
    
