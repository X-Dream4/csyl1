window.useChatDetailLogic = function(state, chatMethods) {
    const { computed, nextTick } = Vue;
    const { chatState, chatDb, currentAccountData, myConversations } = chatMethods;

    if (chatState.isDetailOpen === undefined) chatState.isDetailOpen = false;
    if (chatState.activeConvId === undefined) chatState.activeConvId = null;
    if (chatState.detailInput === undefined) chatState.detailInput = '';
    if (chatState.isTyping === undefined) chatState.isTyping = false;
    if (chatState.typingText === undefined) chatState.typingText = '';
    if (chatState.showBottomMenu === undefined) chatState.showBottomMenu = false;
    if (chatState.isDetailSettingsOpen === undefined) chatState.isDetailSettingsOpen = false;
    if (chatState.detailSettingsTab === undefined) chatState.detailSettingsTab = 'chat';

    let typingInterval = null;
    let activeAbortController = null;

    const safeArr = (v) => Array.isArray(v) ? v : [];
    const allPersonas = computed(() => [
        ...(state.contactsData?.myPersonas || []),
        ...(state.contactsData?.characters || [])
    ]);

    const getPersonaById = (id) => allPersonas.value.find(c => c.id === id) || null;

    const ensureConvSettings = (conv) => {
        if (!conv) return {};
        if (!conv.settings) conv.settings = {};
        if (!conv.settings.remarkName) conv.settings.remarkName = '';
        if (!conv.settings.coupleAvatar) conv.settings.coupleAvatar = false;
        if (!conv.settings.coupleAvatarDesc) conv.settings.coupleAvatarDesc = '';
        if (!Array.isArray(conv.settings.worldbooks)) conv.settings.worldbooks = [];
        if (!conv.settings.timeMode) conv.settings.timeMode = 'auto';
        if (!conv.settings.virtualTime) conv.settings.virtualTime = '';
        if (!conv.settings.realTimeZone) conv.settings.realTimeZone = 'Asia/Shanghai';
        if (!conv.settings.foreignMode) conv.settings.foreignMode = false;
        if (!conv.settings.foreignLang) conv.settings.foreignLang = 'English';
        if (!conv.settings.beautify) conv.settings.beautify = {};
        const b = conv.settings.beautify;
        if (b.bg === undefined) b.bg = '';
        if (b.showAvatar === undefined) b.showAvatar = true;
        if (b.showName === undefined) b.showName = false;
        if (b.showTime === undefined) b.showTime = false;
        if (b.timePos === undefined) b.timePos = 'bottom';
        if (b.meBg === undefined) b.meBg = '#333333';
        if (b.meText === undefined) b.meText = '#ffffff';
        if (b.meRadius === undefined) b.meRadius = 18;
        if (b.meOpacity === undefined) b.meOpacity = 1;
        if (b.opBg === undefined) b.opBg = '#ffffff';
        if (b.opText === undefined) b.opText = '#333333';
        if (b.opRadius === undefined) b.opRadius = 18;
        if (b.opOpacity === undefined) b.opOpacity = 1;
        if (b.customCss === undefined) b.customCss = '';
        return conv.settings;
    };

    const activeRawConv = computed(() => {
        if (!chatState.activeConvId || !currentAccountData.value) return null;
        return safeArr(currentAccountData.value.conversations).find(c => c.id === chatState.activeConvId) || null;
    });

    const activeConvSettings = computed(() => ensureConvSettings(activeRawConv.value));

    const activeTargetPersona = computed(() => {
        const conv = activeRawConv.value;
        if (!conv) return {};
        return getPersonaById(conv.targetId) || {};
    });

    const activeConv = computed(() => {
        const conv = activeRawConv.value;
        const target = activeTargetPersona.value;
        if (!conv) return null;
        const targetAcc = target?.id ? chatDb.value.accounts?.[target.id] : null;
        const remarkName = conv.settings?.remarkName || '';
        return {
            ...conv,
            name: remarkName || targetAcc?.profile?.nickname || target?.name || '未知用户',
            avatar: target?.avatar || '',
            status: targetAcc?.status || '在线',
            statusColor: targetAcc?.statusColor || '#52c41a'
        };
    });

    const activeMessages = computed(() => {
        const conv = activeRawConv.value;
        return conv ? safeArr(conv.messages) : [];
    });

    const timeZoneOptions = [
        'Asia/Shanghai','Asia/Tokyo','Asia/Seoul','Asia/Singapore',
        'Europe/London','Europe/Paris','America/New_York','America/Los_Angeles'
    ];

    const refreshIcons = () => nextTick(() => window.lucide && window.lucide.createIcons());

    const openConversation = (conv) => {
        chatState.activeConvId = conv.id;
        chatState.isDetailOpen = true;
        chatState.isDetailSettingsOpen = false;
        chatState.detailInput = '';
        chatState.showBottomMenu = false;
        const rawConv = currentAccountData.value.conversations.find(c => c.id === conv.id);
        if (rawConv && !rawConv.messages) rawConv.messages = [];
        ensureConvSettings(rawConv);
        refreshIcons();
        scrollToBottom();
    };

    const closeConversation = () => {
        chatState.isDetailOpen = false;
        chatState.activeConvId = null;
        chatState.showBottomMenu = false;
        chatState.isTyping = false;
        chatState.typingText = '';
        if (activeAbortController) {
            try { activeAbortController.abort(); } catch(e) {}
            activeAbortController = null;
        }
        clearInterval(typingInterval);
    };

    const scrollToBottom = () => {
        nextTick(() => {
            const el = document.querySelector('.ca-detail-messages');
            if (el) setTimeout(() => { el.scrollTop = el.scrollHeight; }, 30);
        });
    };

    const toggleBottomMenu = () => {
        chatState.showBottomMenu = !chatState.showBottomMenu;
        if (chatState.showBottomMenu) scrollToBottom();
    };

    const sendMessage = () => {
        if (!chatState.detailInput.trim() || !activeRawConv.value) return;
        const text = chatState.detailInput.trim();
        const conv = activeRawConv.value;
        conv.messages.push({
            id: 'm_' + Date.now(),
            senderId: chatState.currentUser.id,
            text,
            translation: '',
            showTrans: false,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        conv.lastMsg = text;
        conv.time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        chatState.detailInput = '';
        scrollToBottom();
    };

    const buildKnownMeInfo = () => {
        if (!chatState.currentUser) return '';
        const me = chatState.currentUser;
        const meAcc = currentAccountData.value || {};
        const meProfile = meAcc.profile || {};
        const known = [];
        if (meProfile.nickname) known.push(`我的Chat昵称:${meProfile.nickname}`);
        if (meProfile.realName) known.push(`我的真名:${meProfile.realName}`);
        if (me.phone) known.push(`我的电话:${me.phone}`);
        if (me.email) known.push(`我的邮箱:${me.email}`);
        if (me.persona) known.push(`我的人物设定:${me.persona}`);
        if (meProfile.gender) known.push(`我的性别:${meProfile.gender}`);
        if (meProfile.birthday) known.push(`我的生日:${meProfile.birthday}`);
        if (meProfile.signature) known.push(`我的签名:${meProfile.signature}`);
        return known.join('\n');
    };

    const buildRelationInfo = (targetId) => {
        const rels = safeArr(state.contactsData?.relationships);
        const meId = chatState.currentUser?.id;
        if (!meId || !targetId) return '';
        const rel = rels.find(r =>
            (r.sourceId === meId && r.targetId === targetId) ||
            (r.sourceId === targetId && r.targetId === meId)
        );
        if (!rel) return '';
        const myView = rel.sourceId === meId ? rel.sourceView : rel.targetView;
        const theirView = rel.sourceId === meId ? rel.targetView : rel.sourceView;
        return `关系信息：我对你=${myView || '认识'}；你对我=${theirView || '认识'}`;
    };

    const getRealTimeStringByZone = (tz) => {
        try {
            return new Intl.DateTimeFormat('zh-CN', {
                timeZone: tz,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                weekday: 'long',
                hour12: false
            }).format(new Date());
        } catch(e) {
            return new Date().toLocaleString();
        }
    };

    const parseMsgBlock = (raw, foreignMode) => {
        const cleaned = String(raw || '').trim();
        if (!cleaned) return null;
        if (foreignMode && cleaned.includes('||')) {
            const parts = cleaned.split('||');
            return {
                text: parts[0].trim(),
                translation: parts.slice(1).join('||').trim()
            };
        }
        return { text: cleaned, translation: '' };
    };

    const finishCurrentAssistantBubble = (conv, current) => {
        if (!current || !current.id) return null;
        const msg = conv.messages.find(m => m.id === current.id);
        if (!msg) return null;
        msg.text = (current.text || '').trim();
        msg.translation = (current.translation || '').trim();
        if (!msg.text) {
            conv.messages = conv.messages.filter(m => m.id !== current.id);
            return null;
        }
        conv.lastMsg = msg.text;
        conv.time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return msg;
    };

    const createAssistantBubble = (conv, senderId) => {
        const msg = {
            id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
            senderId,
            text: '',
            translation: '',
            showTrans: false,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        conv.messages.push(msg);
        return msg;
    };

    const triggerApiReply = async () => {
        if (chatState.isTyping || !activeRawConv.value) return;
        const conv = activeRawConv.value;
        const target = activeTargetPersona.value;
        const settings = activeConvSettings.value;
        if (!target?.id) return alert('该角色不存在');

        const apiConf = state.apiConfig || {};
        const baseUrl = String(apiConf.baseUrl || '').trim();
        const apiKey = String(apiConf.apiKey || '').trim();
        const model = String(apiConf.activeModel || '').trim();

        if (!baseUrl || !apiKey || !model) {
            alert('请先在设置 APP 的 API 页面补全地址、密钥并选择模型。');
            return;
        }

        chatState.isTyping = true;
        let dot = 0;
        clearInterval(typingInterval);
        typingInterval = setInterval(() => {
            dot = (dot + 1) % 4;
            chatState.typingText = '对方正在输入中' + '.'.repeat(dot || 1);
        }, 450);

        const worldbookText = safeArr(state.contactsData?.worldbooks)
            .filter(w => safeArr(settings.worldbooks).includes(w.id))
            .map(w => `- ${w.keywords || '设定'}: ${w.content}`)
            .join('\n');

        const targetAcc = chatDb.value.accounts?.[target.id] || {};
        const targetProfile = targetAcc.profile || {};
        const realTimeText = settings.timeMode === 'real'
            ? `当前真实时间（时区 ${settings.realTimeZone || 'Asia/Shanghai'}）：${getRealTimeStringByZone(settings.realTimeZone || 'Asia/Shanghai')}`
            : '';
        const virtualTimeText = settings.timeMode === 'virtual'
            ? `当前虚拟时间：${settings.virtualTime || '未设置'}`
            : '';

        const systemPrompt = [
            `你正在一款名为 Chat 的线上聊天APP里和我私聊。`,
            `你必须始终牢记：你是在聊天软件里发消息，不是在写小说、旁白、动作描写、场景描写。`,
            `你的回复必须像真正的聊天消息。`,
            `你可以自己决定这次回复发 1 条、2 条、3 条甚至更多条消息，每一条消息内容长短都由你自己根据人设、情绪、关系、上下文决定。`,
            `重点：不要把所有内容杂糅成一大条消息。你应该像真实聊天那样，自然地拆成多条。`,
            `多条消息之间必须使用唯一分隔符 [[MSG]] 。`,
            `每条消息内部可以有多句，也可以很短，这由你自己决定。`,
            `不要输出序号，不要输出 markdown，不要解释。只输出聊天消息内容本体。`,
            settings.foreignMode
                ? `你必须使用 ${settings.foreignLang} 回复。每一条消息都必须使用 "原文||中文翻译" 的格式；多条消息之间仍然用 [[MSG]] 分隔。`
                : `默认使用符合人设的自然聊天语言回复。`,
            `你的可知资料：`,
            `- 你的Chat昵称：${targetProfile.nickname || ''}`,
            `- 你的真名：${targetProfile.realName || target.name || ''}`,
            `- 你的Chat账号：${target.chatAcc || ''}`,
            `- 你的人物设定：${target.persona || ''}`,
            settings.coupleAvatar ? `- 你知道我们用了情侣头像：${settings.coupleAvatarDesc || '是情侣头像'}` : '',
            buildKnownMeInfo() ? `- 你已知我的资料：\n${buildKnownMeInfo()}` : '',
            buildRelationInfo(target.id),
            worldbookText ? `- 你需要知道的世界书：\n${worldbookText}` : '',
            realTimeText,
            virtualTimeText
        ].filter(Boolean).join('\n');

        const history = safeArr(conv.messages).slice(-20).map(m => {
            const content = m.translation ? `${m.text}||${m.translation}` : m.text;
            return {
                role: m.senderId === target.id ? 'assistant' : 'user',
                content
            };
        });

        let url = baseUrl;
        if (url.endsWith('/')) url = url.slice(0, -1);
        if (!url.endsWith('/v1') && !url.includes('/v1/')) url += '/v1';

        const requestBody = {
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                ...history
            ],
            temperature: 0.85,
            stream: true
        };

        activeAbortController = new AbortController();

        const handleNonStreamFallback = async () => {
            const res = await fetch(url + '/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({ ...requestBody, stream: false }),
                signal: activeAbortController.signal
            });
            if (!res.ok) throw new Error(`API 请求失败: ${res.status}`);
            const data = await res.json();
            const content = data?.choices?.[0]?.message?.content || '';
            const blocks = String(content).split('[[MSG]]').map(s => s.trim()).filter(Boolean);
            blocks.forEach(block => {
                const parsed = parseMsgBlock(block, settings.foreignMode);
                if (!parsed) return;
                conv.messages.push({
                    id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
                    senderId: target.id,
                    text: parsed.text,
                    translation: parsed.translation,
                    showTrans: false,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });
                conv.lastMsg = parsed.text;
                conv.time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            });
            scrollToBottom();
        };

        try {
            const response = await fetch(url + '/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestBody),
                signal: activeAbortController.signal
            });

            if (!response.ok) throw new Error(`API 请求失败: ${response.status}`);
            if (!response.body || !response.body.getReader) {
                await handleNonStreamFallback();
                return;
            }

            clearInterval(typingInterval);
            chatState.isTyping = false;
            chatState.typingText = '';

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let sseBuffer = '';
            let textBuffer = '';
            let currentBubble = null;

            const ensureCurrentBubble = () => {
                if (!currentBubble) currentBubble = createAssistantBubble(conv, target.id);
                return currentBubble;
            };

            const renderCurrentChunk = () => {
                const raw = textBuffer;
                if (!raw) return;

                while (raw.includes('[[MSG]]')) break;
            };

            const applyChunkText = (delta) => {
                if (!delta) return;
                textBuffer += delta;

                while (textBuffer.includes('[[MSG]]')) {
                    const idx = textBuffer.indexOf('[[MSG]]');
                    const before = textBuffer.slice(0, idx);
                    textBuffer = textBuffer.slice(idx + 7);

                    const parsed = parseMsgBlock(before, settings.foreignMode);
                    if (parsed) {
                        const bubble = ensureCurrentBubble();
                        bubble.text = parsed.text;
                        bubble.translation = parsed.translation;
                        finishCurrentAssistantBubble(conv, bubble);
                        currentBubble = null;
                    }
                }

                const remainingParsed = parseMsgBlock(textBuffer, settings.foreignMode);
                if (remainingParsed) {
                    const bubble = ensureCurrentBubble();
                    bubble.text = remainingParsed.text;
                    bubble.translation = remainingParsed.translation;
                    conv.lastMsg = bubble.text || conv.lastMsg;
                    conv.time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }

                scrollToBottom();
            };

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                sseBuffer += decoder.decode(value, { stream: true });
                const lines = sseBuffer.split('\n');
                sseBuffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed.startsWith('data:')) continue;
                    const payload = trimmed.slice(5).trim();
                    if (!payload || payload === '[DONE]') continue;
                    try {
                        const json = JSON.parse(payload);
                        const delta = json?.choices?.[0]?.delta?.content || '';
                        if (delta) applyChunkText(delta);
                    } catch (e) {}
                }
            }

            if (currentBubble) {
                finishCurrentAssistantBubble(conv, currentBubble);
                currentBubble = null;
            } else if (textBuffer.trim()) {
                const parsed = parseMsgBlock(textBuffer, settings.foreignMode);
                if (parsed) {
                    conv.messages.push({
                        id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
                        senderId: target.id,
                        text: parsed.text,
                        translation: parsed.translation,
                        showTrans: false,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    });
                }
            }

            conv.messages = conv.messages.filter(m => String(m.text || '').trim() !== '');
            if (conv.messages.length) {
                const last = conv.messages[conv.messages.length - 1];
                conv.lastMsg = last.text || conv.lastMsg;
                conv.time = last.time || conv.time;
            }
            scrollToBottom();

        } catch (err) {
            console.error('chat detail api error:', err);
            try {
                clearInterval(typingInterval);
                chatState.isTyping = false;
                chatState.typingText = '';
                await handleNonStreamFallback();
            } catch (fallbackErr) {
                console.error('fallback error:', fallbackErr);
                conv.messages.push({
                    id: 'm_' + Date.now(),
                    senderId: target.id,
                    text: '无法连接到 API 或当前接口不支持流式传输。',
                    translation: '',
                    showTrans: false,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });
            }
        } finally {
            clearInterval(typingInterval);
            chatState.isTyping = false;
            chatState.typingText = '';
            activeAbortController = null;
            scrollToBottom();
        }
    };

    const handleBgUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => { activeConvSettings.value.beautify.bg = ev.target.result; };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const triggerBgUpload = () => {
        const el = document.getElementById('ca-bg-upload-input');
        if (el) el.click();
    };

    return {
        activeConv,
        activeMessages,
        activeTargetPersona,
        activeConvSettings,
        timeZoneOptions,
        openConversation,
        closeConversation,
        sendMessage,
        triggerApiReply,
        toggleBottomMenu,
        handleBgUpload,
        triggerBgUpload
    };
};
