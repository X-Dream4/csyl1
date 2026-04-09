window.useChatDetailLogic = function(state, chatMethods) {
    const { computed, nextTick, reactive } = Vue;
    const { chatState, chatDb, currentAccountData } = chatMethods;

    if (chatState.isDetailOpen === undefined) chatState.isDetailOpen = false;
    if (chatState.activeConvId === undefined) chatState.activeConvId = null;
    if (chatState.detailInput === undefined) chatState.detailInput = '';
    if (chatState.isTyping === undefined) chatState.isTyping = false;
    if (chatState.typingText === undefined) chatState.typingText = '';
    if (chatState.showBottomMenu === undefined) chatState.showBottomMenu = false;
    if (chatState.isDetailSettingsOpen === undefined) chatState.isDetailSettingsOpen = false;
    if (chatState.detailSettingsTab === undefined) chatState.detailSettingsTab = 'chat';
    if (chatState.messageMenuOpen === undefined) chatState.messageMenuOpen = false;
    if (chatState.messageMenuMsgId === undefined) chatState.messageMenuMsgId = null;
    if (chatState.messageMenuMsg === undefined) chatState.messageMenuMsg = null;
    if (chatState.menuX === undefined) chatState.menuX = 0;
    if (chatState.menuY === undefined) chatState.menuY = 0;
    if (chatState.quoteMsgId === undefined) chatState.quoteMsgId = null;
    
    if (chatState.editMsgModalOpen === undefined) chatState.editMsgModalOpen = false;
    if (chatState.editMsgId === undefined) chatState.editMsgId = null;
    if (chatState.editMsgText === undefined) chatState.editMsgText = '';
    
    if (chatState.isMultiSelectMode === undefined) chatState.isMultiSelectMode = false;
    if (chatState.selectedMsgIds === undefined) chatState.selectedMsgIds = [];
    
    if (chatState.rawEditModalOpen === undefined) chatState.rawEditModalOpen = false;
    if (chatState.rawEditMsgId === undefined) chatState.rawEditMsgId = null;
    if (chatState.rawEditBatchId === undefined) chatState.rawEditBatchId = null;
    if (chatState.rawEditText === undefined) chatState.rawEditText = '';

    if (chatState.recalledMsgView === undefined) chatState.recalledMsgView = null;
    if (chatState.voiceModalOpen === undefined) chatState.voiceModalOpen = false;
    if (chatState.voiceText === undefined) chatState.voiceText = '';
    
    if (chatState.bottomMenuType === undefined) chatState.bottomMenuType = 'main';
    if (chatState.activeEmojiCat === undefined) chatState.activeEmojiCat = '';
    
    const initEmojiDb = () => {
        if (!chatDb.value.emojiCats) chatDb.value.emojiCats = [];
        if (!chatDb.value.emojiItems) chatDb.value.emojiItems = [];
    };

    const switchBottomMenu = (type) => {
        chatState.bottomMenuType = type;
        nextTick(() => { if (window.lucide) window.lucide.createIcons(); });
    };

    let catTouchTimer = null;
    const onEmojiCatTouchStart = (cat) => {
        catTouchTimer = setTimeout(() => {
            toggleEmojiCatRole(cat);
        }, 500);
    };
    const onEmojiCatTouchEnd = () => {
        clearTimeout(catTouchTimer);
    };
    const toggleEmojiCatRole = (cat) => {
        if (confirm(cat.allowRole ? `禁止角色使用分类 [${cat.name}] 下的表情包？` : `允许角色使用分类 [${cat.name}] 下的所有表情包？`)) {
            cat.allowRole = !cat.allowRole;
        }
    };

    const emojiForm = reactive({ newCatName: '', singleCat: '', singleName: '', singleUrl: '', batchCat: '', batchText: '' });

    let typingInterval = null;
    let activeAbortController = null;
    let longPressTimer = null;

    const safeArr = (v) => Array.isArray(v) ? v : [];
    const allPersonas = computed(() => [
        ...(state.contactsData?.myPersonas || []),
        ...(state.contactsData?.characters || [])
    ]);

    const getPersonaById = (id) => allPersonas.value.find(c => c.id === id) || null;

    const ensureTargetAccountData = (userId) => {
        if (!userId) return null;
        if (!state.chatData.accounts) state.chatData.accounts = {};
        if (!state.chatData.accounts[userId]) state.chatData.accounts[userId] = {
            friends: [],
            conversations: [],
            status: '在线',
            statusColor: '#52c41a',
            categories: [],
            friendCategories: {},
            favorites: [],
            wallet: { balance: 0 },
            profile: {
                nickname: '未命名', realName: '', signature: '这个人很神秘', gender: '', birthday: '', allowProfileView: true, bg: '',
                publicCard: { mbti: '', city: '', job: '', school: '', hobby: '', intro: '' }, moments: []
            }
        };
        const acc = state.chatData.accounts[userId];
        if (!acc.profile) acc.profile = {};
        if (acc.profile.nickname === undefined) acc.profile.nickname = '未命名';
        if (acc.profile.realName === undefined) acc.profile.realName = '';
        if (acc.profile.signature === undefined) acc.profile.signature = '这个人很神秘';
        if (acc.profile.gender === undefined) acc.profile.gender = '';
        if (acc.profile.birthday === undefined) acc.profile.birthday = '';
        if (acc.profile.allowProfileView === undefined) acc.profile.allowProfileView = true;
        if (acc.profile.bg === undefined) acc.profile.bg = '';
        if (!acc.profile.publicCard) acc.profile.publicCard = { mbti: '', city: '', job: '', school: '', hobby: '', intro: '' };
        if (acc.profile.publicCard.mbti === undefined) acc.profile.publicCard.mbti = '';
        if (acc.profile.publicCard.city === undefined) acc.profile.publicCard.city = '';
        if (acc.profile.publicCard.job === undefined) acc.profile.publicCard.job = '';
        if (acc.profile.publicCard.school === undefined) acc.profile.publicCard.school = '';
        if (acc.profile.publicCard.hobby === undefined) acc.profile.publicCard.hobby = '';
        if (acc.profile.publicCard.intro === undefined) acc.profile.publicCard.intro = '';
        if (!Array.isArray(acc.profile.moments)) acc.profile.moments = [];
        if (!acc.status) acc.status = '在线';
        if (!acc.statusColor) acc.statusColor = '#52c41a';
        return acc;
    };

    const ensurePersonaFields = (persona) => {
        if (!persona) return;
        if (persona.chatName === undefined) persona.chatName = persona.name || '';
        if (persona.phone === undefined) persona.phone = '';
        if (persona.email === undefined) persona.email = '';
        if (persona.chatAcc === undefined) persona.chatAcc = '';
        if (persona.chatPwd === undefined) persona.chatPwd = '';
        if (persona.phoneLockType === undefined || !['num', 'pattern', 'qa'].includes(persona.phoneLockType)) {
            if (persona.lockPwdNum) persona.phoneLockType = 'num';
            else if (persona.lockPwdPat) persona.phoneLockType = 'pattern';
            else if (persona.lockPwdQA_Q || persona.lockPwdQA_A) persona.phoneLockType = 'qa';
            else persona.phoneLockType = 'num';
        }
        if (persona.lockPwdNum === undefined) persona.lockPwdNum = '';
        if (persona.lockPwdPat === undefined) persona.lockPwdPat = '';
        if (persona.lockPwdQA_Q === undefined) persona.lockPwdQA_Q = '';
        if (persona.lockPwdQA_A === undefined) persona.lockPwdQA_A = '';
    };

    const ensureConvSettings = (conv) => {
        if (!conv) return { beautify: {} };
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
        if (conv.settings.allowRoleAutoEdit === undefined) conv.settings.allowRoleAutoEdit = true;
        if (conv.settings.injectHistoryCount === undefined) conv.settings.injectHistoryCount = 20;
        if (conv.settings.injectMemoryCount === undefined) conv.settings.injectMemoryCount = 30;
        if (!Array.isArray(conv.messages)) conv.messages = [];
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

    const syncTargetConv = (conv) => {
        if (!conv || conv.targetId === 'system' || !chatState.currentUser) return;
        const targetAcc = chatDb.value.accounts[conv.targetId];
        if (!targetAcc) return;
        let tConv = targetAcc.conversations.find(c => c.targetId === chatState.currentUser.id);
        if (!tConv) {
            tConv = {
                id: 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                type: 'private',
                targetId: chatState.currentUser.id,
                lastMsg: conv.lastMsg,
                time: conv.time,
                messages: [],
                settings: { remarkName: '' }
            };
            targetAcc.conversations.unshift(tConv);
        }
        tConv.messages = JSON.parse(JSON.stringify(conv.messages));
        tConv.lastMsg = conv.lastMsg;
        tConv.time = conv.time;
    };

    const activeRawConv = computed(() => {
        if (!chatState.activeConvId || !currentAccountData.value) return null;
        return safeArr(currentAccountData.value.conversations).find(c => c.id === chatState.activeConvId) || null;
    });

    const activeConvSettings = computed(() => ensureConvSettings(activeRawConv.value));

    const activeTargetPersona = computed(() => {
        const conv = activeRawConv.value;
        if (!conv) return {};
        if (conv.targetId === 'system') return { id: 'system', name: '系统安全中心', chatName: '系统安全中心' };
        const p = getPersonaById(conv.targetId) || {};
        ensurePersonaFields(p);
        return p;
    });

    const activeConv = computed(() => {
        const conv = activeRawConv.value;
        const target = activeTargetPersona.value;
        if (!conv) return null;
        if (conv.targetId === 'system') {
            return {
                ...conv,
                name: '系统安全中心',
                avatar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%231890ff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/%3E%3C/svg%3E",
                status: '系统保护中',
                statusColor: '#1890ff'
            };
        }
        const targetAcc = target?.id ? chatDb.value.accounts?.[target.id] : null;
        const remarkName = String(conv.settings?.remarkName || '').trim();
        return {
            ...conv,
            name: remarkName || target?.chatName || target?.name || '未知用户',
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
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const getMessageById = (msgId) => {
        const conv = activeRawConv.value;
        if (!conv || !msgId) return null;
        return (conv.messages || []).find(m => m.id === msgId) || null;
    };

    const buildQuoteData = (msg) => {
        if (!msg) return null;
        const isMe = msg.senderId === chatState.currentUser?.id;
        return {
            id: msg.id,
            senderId: msg.senderId,
            senderName: isMe
                ? (currentAccountData.value?.profile?.nickname || chatState.currentUser?.chatName || chatState.currentUser?.name || '我')
                : (activeConv.value?.name || activeTargetPersona.value?.chatName || activeTargetPersona.value?.name || '对方'),
            text: String(msg.text || '').trim().slice(0, 80),
            time: msg.time || ''
        };
    };

    let menuJustOpened = false;
    
    const closeMessageMenu = () => {
        if (menuJustOpened) return;
        chatState.messageMenuOpen = false;
        chatState.messageMenuMsgId = null;
        chatState.messageMenuMsg = null;
    };

    const openMessageMenu = (msg, x, y) => {
        if (!msg?.id) return;
        chatState.messageMenuMsgId = msg.id;
        chatState.messageMenuMsg = msg;
        chatState.menuX = Math.min(Math.max(x, 140), window.innerWidth - 140);
        chatState.menuY = Math.min(Math.max(y, 60), window.innerHeight - 60);
        chatState.messageMenuOpen = true;
        menuJustOpened = true;
        setTimeout(() => { menuJustOpened = false; }, 350);
    };

    let pressStartX = 0;
    let pressStartY = 0;
    const onMessagePressStart = (msg, event) => {
        if (chatState.isMultiSelectMode) return;
        clearTimeout(longPressTimer);
        let touch = event.touches ? event.touches[0] : event;
        pressStartX = touch.clientX;
        pressStartY = touch.clientY;
        longPressTimer = setTimeout(() => {
            openMessageMenu(msg, pressStartX, pressStartY);
        }, 400);
    };

    const onMessagePressMove = (event) => {
        let touch = event.touches ? event.touches[0] : event;
        if (Math.abs(touch.clientX - pressStartX) > 10 || Math.abs(touch.clientY - pressStartY) > 10) {
            clearTimeout(longPressTimer);
        }
    };

    const onMessagePressEnd = () => {
        clearTimeout(longPressTimer);
    };

    const cancelQuoteMessage = () => {
        chatState.quoteMsgId = null;
    };

    const enterMultiSelect = () => {
        const msgId = chatState.messageMenuMsgId;
        chatState.isMultiSelectMode = true;
        chatState.selectedMsgIds = msgId ? [msgId] : [];
        closeMessageMenu();
    };

    const toggleSelectMsg = (msg, event) => {
        if (!chatState.isMultiSelectMode) {
            msg.showTrans = !msg.showTrans;
            return;
        }
        if (event) event.stopPropagation();
        const idx = chatState.selectedMsgIds.indexOf(msg.id);
        if (idx > -1) chatState.selectedMsgIds.splice(idx, 1);
        else chatState.selectedMsgIds.push(msg.id);
    };

    const deleteSelectedMsgs = () => {
        if (chatState.selectedMsgIds.length === 0) return;
        if (!confirm(`确定要删除选中的 ${chatState.selectedMsgIds.length} 条消息吗？`)) return;
        
        const conv = activeRawConv.value;
        if (!conv) return;
        conv.messages = (conv.messages || []).filter(m => !chatState.selectedMsgIds.includes(m.id));
        
        if (chatState.quoteMsgId && chatState.selectedMsgIds.includes(chatState.quoteMsgId)) chatState.quoteMsgId = null;
        
        const normalMsgs = conv.messages.filter(m => m.type !== 'sys' && !m.recalled);
        if (normalMsgs.length) {
            const last = normalMsgs[normalMsgs.length - 1];
            conv.lastMsg = last.text || conv.lastMsg;
            conv.time = last.time || conv.time;
        } else {
            conv.lastMsg = '';
            conv.time = '';
        }
        syncTargetConv(conv);
        chatState.isMultiSelectMode = false;
        chatState.selectedMsgIds = [];
        nextTick(() => { if (window.lucide) window.lucide.createIcons(); });
    };

    const cancelMultiSelect = () => {
        chatState.isMultiSelectMode = false;
        chatState.selectedMsgIds = [];
    };

    const openRawEditModal = () => {
        const msg = getMessageById(chatState.messageMenuMsgId);
        if (!msg) return;
        chatState.rawEditMsgId = msg.id;
        chatState.rawEditBatchId = msg.batchId || null;
        chatState.rawEditText = msg.fullRawText || msg.rawText || msg.text || '';
        chatState.rawEditModalOpen = true;
        closeMessageMenu();
    };

    const saveRawEdit = () => {
        if (!chatState.rawEditMsgId || !activeRawConv.value) return;
        const msg = getMessageById(chatState.rawEditMsgId);
        const conv = activeRawConv.value;
        const target = activeTargetPersona.value;
        if (!msg || !conv || !target) return;

        const msgsToRemove = chatState.rawEditBatchId ? conv.messages.filter(m => m.batchId === chatState.rawEditBatchId) : [msg];
        const insertIndex = conv.messages.findIndex(m => m.id === msgsToRemove[0].id);

        conv.messages = conv.messages.filter(m => !msgsToRemove.includes(m));

        const newText = chatState.rawEditText;
        const newBatchId = chatState.rawEditBatchId || ('batch_' + Date.now());
        const generatedIds = [];
        const foreignMode = activeConvSettings.value?.foreignMode;

        const extracted = extractMetaBlocks(newText);
        let safeText = String(extracted.visibleText)
            .replace(/^(内容:|内容：|回复:|回复：|消息:|消息：)\s*/gi, '')
            .replace(/(内容:|内容：|回复:|回复：|消息:|消息：)/g, '[[MSG]]')
            .replace(/\n/g, '[[MSG]]');
        const blocks = safeText.split('[[MSG]]').map(s => s.trim()).filter(Boolean);

        const newMessages = [];
        blocks.forEach((b, idx) => {
            const parsed = parseMsgBlock(b, foreignMode);
            if (parsed && parsed.text) {
                const newMsg = {
                    id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
                    batchId: newBatchId,
                    fullRawText: newText,
                    senderId: msg.senderId,
                    text: parsed.text,
                    translation: parsed.translation,
                    showTrans: false,
                    recalled: false,
                    time: msgsToRemove[0]?.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
                newMessages.push(newMsg);
                generatedIds.push(newMsg.id);
            }
        });

        if (insertIndex >= 0) {
            conv.messages.splice(insertIndex, 0, ...newMessages);
        } else {
            conv.messages.push(...newMessages);
        }

        if (activeConvSettings.value?.allowRoleAutoEdit !== false && extracted.profileUpdates) {
            applyRoleAutoUpdates(target, extracted.profileUpdates, conv, generatedIds);
        }
        if (extracted.msgMeta && extracted.msgMeta.actions && extracted.msgMeta.actions.length > 0) {
            applyMsgMetaActions(extracted.msgMeta, conv, generatedIds, target);
        }
        
        const normalMsgs = conv.messages.filter(m => m.type !== 'sys' && !m.recalled);
        if (normalMsgs.length) {
            const last = normalMsgs[normalMsgs.length - 1];
            conv.lastMsg = last.text || conv.lastMsg;
            conv.time = last.time || conv.time;
        }
        syncTargetConv(conv);
        chatState.rawEditModalOpen = false;
        chatState.rawEditMsgId = null;
        chatState.rawEditBatchId = null;
        chatState.rawEditText = '';
        scrollToBottom();
    };

    const quoteSourceMessage = computed(() => getMessageById(chatState.quoteMsgId));

    const quoteMessage = () => {
        const msg = getMessageById(chatState.messageMenuMsgId);
        if (!msg) return;
        chatState.quoteMsgId = msg.id;
        closeMessageMenu();
    };

    const favoriteMessage = () => {
        const msg = getMessageById(chatState.messageMenuMsgId);
        if (!msg || !currentAccountData.value) return;
        if (!Array.isArray(currentAccountData.value.favorites)) currentAccountData.value.favorites = [];

        const existedIndex = currentAccountData.value.favorites.findIndex(item =>
            item?.type === 'message' && item?.convId === activeRawConv.value?.id && item?.msgId === msg.id
        );

        if (existedIndex >= 0) {
            currentAccountData.value.favorites.splice(existedIndex, 1);
            alert('已取消收藏');
        } else {
            currentAccountData.value.favorites.unshift({
                type: 'message',
                convId: activeRawConv.value?.id || '',
                msgId: msg.id,
                title: buildQuoteData(msg)?.senderName || '收藏消息',
                content: msg.text || '',
                time: msg.time || ''
            });
            alert('已收藏');
        }
        closeMessageMenu();
    };

    const editMessageModal = () => {
        const msg = getMessageById(chatState.messageMenuMsgId);
        if (!msg) return;
        chatState.editMsgId = msg.id;
        chatState.editMsgText = msg.text || '';
        chatState.editMsgModalOpen = true;
        closeMessageMenu();
    };

    const saveEditMessage = () => {
        if (!chatState.editMsgId || !activeRawConv.value) return;
        const msg = getMessageById(chatState.editMsgId);
        if (msg) {
            msg.text = chatState.editMsgText;
            msg.time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const normalMsgs = activeRawConv.value.messages.filter(m => m.type !== 'sys' && !m.recalled);
            if (normalMsgs.length) {
                const last = normalMsgs[normalMsgs.length - 1];
                activeRawConv.value.lastMsg = last.text || activeRawConv.value.lastMsg;
                activeRawConv.value.time = last.time || activeRawConv.value.time;
            }
            syncTargetConv(activeRawConv.value);
        }
        chatState.editMsgModalOpen = false;
        chatState.editMsgId = null;
        chatState.editMsgText = '';
        scrollToBottom();
    };

    const cancelEditMessage = () => {
        chatState.editMsgModalOpen = false;
        chatState.editMsgId = null;
        chatState.editMsgText = '';
    };

    const deleteMessage = () => {
        const msg = getMessageById(chatState.messageMenuMsgId);
        const conv = activeRawConv.value;
        if (!msg || !conv) return;
        if (!confirm('确定删除这条消息吗？')) return;

        conv.messages = (conv.messages || []).filter(item => item.id !== msg.id);

        if (chatState.quoteMsgId === msg.id) chatState.quoteMsgId = null;

        const normalMsgs = conv.messages.filter(m => m.type !== 'sys' && !m.recalled);
        if (normalMsgs.length) {
            const last = normalMsgs[normalMsgs.length - 1];
            conv.lastMsg = last.text || conv.lastMsg;
            conv.time = last.time || conv.time;
        } else {
            conv.lastMsg = '';
            conv.time = '';
        }
        syncTargetConv(conv);
        closeMessageMenu();
    };

    const recallMessage = () => {
        const msg = getMessageById(chatState.messageMenuMsgId);
        if (!msg) return;
        msg.recalled = true;
        syncTargetConv(activeRawConv.value);
        closeMessageMenu();
        scrollToBottom();
    };

    const appendAssistantBlocksSequentially = async (conv, senderId, blocks, foreignMode, insertedAssistantIds = [], batchId, fullRawText) => {
        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            const parsed = parseMsgBlock(block, foreignMode);
            if (!parsed) continue;

            const safeText = sanitizeAssistantVisibleText(parsed.text);
            if (!safeText) continue;

            await sleep(180 + Math.floor(Math.random() * 260));

            const msg = {
                id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
                batchId,
                fullRawText,
                senderId,
                text: safeText,
                translation: parsed.translation,
                showTrans: false,
                recalled: false,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            conv.messages.push(msg);
            insertedAssistantIds.push(msg.id);
            conv.lastMsg = safeText;
            conv.time = msg.time;
            syncTargetConv(conv);
            scrollToBottom();
        }
    };

    const refreshIcons = () => nextTick(() => window.lucide && window.lucide.createIcons());

    const openConversation = (conv) => {
        chatState.activeConvId = conv.id;
        chatState.isDetailOpen = true;
        chatState.isDetailSettingsOpen = false;
        chatState.detailInput = '';
        chatState.showBottomMenu = false;
        const rawConv = currentAccountData.value.conversations.find(c => c.id === conv.id);
        if (rawConv) {
            if (!rawConv.messages) rawConv.messages = [];
            // --- 安全双向同步补偿机制：解决旧数据一边多一边少的问题 ---
            if (rawConv.targetId !== 'system') {
                const targetAcc = chatDb.value.accounts[rawConv.targetId];
                if (targetAcc) {
                    let tConv = targetAcc.conversations.find(c => c.targetId === chatState.currentUser.id);
                    if (tConv && tConv.messages && tConv.messages.length > rawConv.messages.length) {
                        // 对方历史记录更多（旧数据），将对方的复制过来
                        rawConv.messages = JSON.parse(JSON.stringify(tConv.messages));
                        rawConv.lastMsg = tConv.lastMsg || rawConv.lastMsg;
                        rawConv.time = tConv.time || rawConv.time;
                    } else if (tConv && rawConv.messages.length > (tConv.messages ? tConv.messages.length : 0)) {
                        // 我的历史记录更多，推送给对方
                        tConv.messages = JSON.parse(JSON.stringify(rawConv.messages));
                        tConv.lastMsg = rawConv.lastMsg || tConv.lastMsg;
                        tConv.time = rawConv.time || tConv.time;
                    }
                }
            }
            // -----------------------------------------------------------
            ensureConvSettings(rawConv);
        }
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
        if (chatState.showBottomMenu) {
            chatState.bottomMenuType = 'main';
            scrollToBottom();
        }
    };

    const sendMessage = () => {
        if (!chatState.detailInput.trim() || !activeRawConv.value) return;
        const text = chatState.detailInput.trim();
        const conv = activeRawConv.value;
        if (conv.targetId === 'system') {
            alert('不可回复系统消息哦');
            chatState.detailInput = '';
            return;
        }
        const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const quote = buildQuoteData(quoteSourceMessage.value);

        conv.messages.push({
            id: 'm_' + Date.now(),
            senderId: chatState.currentUser.id,
            text,
            translation: '',
            showTrans: false,
            recalled: false,
            time: nowTime,
            quote,
            isManualTyped: true
        });

        conv.lastMsg = text;
        conv.time = nowTime;
        chatState.detailInput = '';
        chatState.quoteMsgId = null;
        syncTargetConv(conv);
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

    const getRealTimeStringByZone = (tz) => {
        try {
            return new Intl.DateTimeFormat('zh-CN', {
                timeZone: tz,
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', weekday: 'long', hour12: false
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
            return { text: parts[0].trim(), translation: parts.slice(1).join('||').trim() };
        }
        return { text: cleaned, translation: '' };
    };

    const sanitizeAssistantVisibleText = (text) => {
        let t = String(text || '').trim();
        // 抹去底层里的 URL，让 AI 看到指令格式，且不会破坏气泡渲染
        t = t.replace(/\[{1,2}EMOJI:\s*(.+?)\s*\|\s*(.+?)\s*\]{1,2}/gi, '[[EMOJI:$1]]');
        
        t = t.replace(/\[MsgId:\s*[^\]]+\]\s*/gi, '');
        t = t.replace(/\[QuoteRef:\s*[^\]]+\]\s*/gi, '');
        t = t.replace(/消息ID:[^\n]*\n?/gi, '');
        t = t.replace(/引用ID:[^\n]*\n?/gi, '');
        t = t.replace(/引用内容:[^\n]*\n?/gi, '');
        t = t.replace(/\[\[MSG_META\]\][\s\S]*$/gi, '').trim();
        t = t.replace(/\[\[PROFILE_UPDATE\]\][\s\S]*$/gi, '').trim();
        
        t = t.replace(/^(内容:|内容：|回复:|回复：|消息:|消息：)\s*/gi, '');
        t = t.replace(/(内容:|内容：)/g, '\n');
        
        // 彻底清除残余动作指令
        t = t.replace(/\[{1,2}QUOTE:.*?\]{1,2}/gi, '');
        t = t.replace(/\[{1,2}FAVORITE:.*?\]{1,2}/gi, '');
        t = t.replace(/\[{1,2}RECALL.*?\]{1,2}/gi, '');
        t = t.replace(/\[{1,2}LOGIN:.*?\]{1,2}/gi, '');
        t = t.replace(/\{[\s]*"actions"\s*:\s*\[[\s\S]*?\]\s*\}/gi, '');
        
        return t.trim();
    };

    const extractMetaBlocks = (rawText) => {
        const raw = String(rawText || '');
        
        let msgMeta = { actions: [] };
        let profileUpdates = null;
        
        // 提取简易动作标签 (兼容单/双括号以及有无空格)
        const quoteMatches = raw.match(/\[{1,2}QUOTE:\s*(m_[a-zA-Z0-9_]+)\]{1,2}/gi);
        if (quoteMatches) quoteMatches.forEach(m => {
            const id = m.match(/m_[a-zA-Z0-9_]+/i)?.[0];
            if (id) msgMeta.actions.push({ type: 'quote', sourceMsgId: id.trim() });
        });

        const favMatches = raw.match(/\[{1,2}FAVORITE:\s*(m_[a-zA-Z0-9_]+)\]{1,2}/gi);
        if (favMatches) favMatches.forEach(m => {
            const id = m.match(/m_[a-zA-Z0-9_]+/i)?.[0];
            if (id) msgMeta.actions.push({ type: 'favorite', msgId: id.trim() });
        });

        // 兼容带 ID 和 不带 ID 的撤回 (即 [[RECALL]] 撤回上一条)
        const recallMatches = raw.match(/\[{1,2}RECALL(?::\s*(m_[a-zA-Z0-9_]+))?\]{1,2}/gi);
        if (recallMatches) recallMatches.forEach(m => {
            const id = m.match(/m_[a-zA-Z0-9_]+/i)?.[0];
            msgMeta.actions.push({ type: 'recall', msgId: id ? id.trim() : 'LAST' });
        });

        // 提取强制登录对方账号指令
        const loginMatches = raw.match(/\[{1,2}LOGIN:\s*([^,\]]+)\s*,\s*([^\]]+)\]{1,2}/gi);
        if (loginMatches) loginMatches.forEach(m => {
            const parts = m.match(/LOGIN:\s*([^,\]]+)\s*,\s*([^\]]+)/i);
            if (parts && parts[1] && parts[2]) {
                msgMeta.actions.push({ type: 'login', acc: parts[1].trim(), pwd: parts[2].trim() });
            }
        });

        // 兼容旧版 JSON 格式提取
        const actionRegex = /\{[\s]*"actions"\s*:\s*\[[\s\S]*?\]\s*\}/gi;
        let aMatch;
        while ((aMatch = actionRegex.exec(raw)) !== null) {
            try { 
                const parsed = JSON.parse(aMatch[0]); 
                if (parsed.actions) msgMeta.actions.push(...parsed.actions);
            } catch(e) {}
        }
        
        const profileMatch = raw.match(/\[\[PROFILE_UPDATE\]\]([\s\S]*?)(?=\[\[MSG_META\]\]|\{"actions"|\[{1,2}RECALL|\[{1,2}QUOTE|\[{1,2}FAVORITE|\[{1,2}LOGIN|$)/i);
        if (profileMatch) {
            profileUpdates = profileMatch[1].trim();
        }
        
        let visibleText = raw
            .replace(/\[\[PROFILE_UPDATE\]\][\s\S]*/gi, '')
            .replace(/\[\[MSG_META\]\][\s\S]*/gi, '')
            .replace(/\[{1,2}QUOTE:.*?\]{1,2}/gi, '')
            .replace(/\[{1,2}FAVORITE:.*?\]{1,2}/gi, '')
            .replace(/\[{1,2}RECALL.*?\]{1,2}/gi, '')
            .replace(/\[{1,2}LOGIN:.*?\]{1,2}/gi, '')
            .replace(/\{[\s]*"actions"\s*:\s*\[[\s\S]*?\]\s*\}/gi, '')
            .trim();
            
        return { visibleText, profileUpdates, msgMeta: msgMeta.actions.length ? msgMeta : null };
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

    const createAssistantBubble = (conv, senderId, generatedIds, batchId) => {
        const msg = {
            id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
            batchId,
            fullRawText: '',
            senderId,
            text: '',
            translation: '',
            showTrans: false,
            recalled: false,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        conv.messages.push(msg);
        if (Array.isArray(generatedIds)) generatedIds.push(msg.id);
        return msg;
    };

    const addSystemNotice = (conv, text, insertAfterIds = []) => {
        if (!conv || !text) return;
        if (!Array.isArray(conv.messages)) conv.messages = [];

        const notice = {
            id: 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            type: 'sys', senderId: '__system__', text, translation: '', showTrans: false,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        if (!Array.isArray(insertAfterIds) || insertAfterIds.length === 0) {
            conv.messages.push(notice);
            return;
        }

        let insertIndex = -1;
        insertAfterIds.forEach(id => {
            const idx = conv.messages.findIndex(m => m.id === id);
            if (idx > insertIndex) insertIndex = idx;
        });

        if (insertIndex >= 0) conv.messages.splice(insertIndex + 1, 0, notice);
        else conv.messages.push(notice);
        syncTargetConv(conv);
    };

    const buildNaturalUpdateNotice = (changedItems = []) => {
        const list = [...new Set(safeArr(changedItems).filter(Boolean).map(x => String(x).trim()))];
        if (!list.length) return '';

        const has = (txt) => list.some(item => item === txt || item.includes(txt));
        const relationItems = list.filter(item => item.includes('的看法'));
        const parts = [];

        if (has('状态')) parts.push('对方悄悄改了状态');
        if (has('个性签名')) parts.push('对方换了一句新的个性签名');
        if (has('公开资料')) parts.push('对方重新整理了公开资料');
        if (has('Chat资料昵称') || has('Chat昵称') || has('真名') || has('Chat资料真名')) parts.push('对方调整了资料卡信息');
        if (has('人设')) parts.push('对方悄悄补充了自己的人设');
        if (has('手机号') || has('邮箱') || has('Chat账号') || has('Chat密码')) parts.push('对方更新了联系信息');
        if (has('手机锁屏样式')) parts.push('对方换了手机锁屏方式');
        if (has('手机锁屏密码') || has('手机锁屏图案') || has('手机锁屏问题') || has('手机锁屏答案')) parts.push('对方重设了手机锁屏信息');

        relationItems.forEach(item => {
            const targetName = item.replace(/^对/, '').replace(/的看法$/, '').trim();
            if (!targetName) return;
            const me = chatState.currentUser || {};
            const meNames = [ String(me.name || '').trim(), String(me.chatName || '').trim(), String(currentAccountData.value?.profile?.nickname || '').trim(), '我', '你', '当前用户' ].filter(Boolean);
            if (meNames.includes(targetName)) parts.push('对方对你的看法变了');
            else parts.push(`对方对${targetName}的看法变了`);
        });

        const uniqParts = [...new Set(parts)];
        if (!uniqParts.length) return `对方已更新：${list.join('、')}`;
        if (uniqParts.length === 1) return uniqParts[0];
        return uniqParts.join(' · ');
    };

    const findPersonaByLooseRef = (targetId, targetName) => {
        if (targetId) {
            const byId = allPersonas.value.find(p => p.id === targetId);
            if (byId) return byId;
        }
        const name = String(targetName || '').trim();
        if (!name) return null;
        return allPersonas.value.find(p => p.name === name || p.chatName === name) || null;
    };

    const ensureRelationshipBetween = (idA, idB) => {
        if (!Array.isArray(state.contactsData.relationships)) state.contactsData.relationships = [];
        let rel = state.contactsData.relationships.find(r => (r.sourceId === idA && r.targetId === idB) || (r.sourceId === idB && r.targetId === idA));
        if (!rel) {
            rel = { id: 'rel_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), sourceId: idA, targetId: idB, sourceView: '认识', targetView: '认识' };
            state.contactsData.relationships.push(rel);
        }
        if (rel.sourceView === undefined) rel.sourceView = '认识';
        if (rel.targetView === undefined) rel.targetView = '认识';
        return rel;
    };

    const applyRelationshipUpdates = (targetPersona, relationshipUpdates, changed) => {
        safeArr(relationshipUpdates).forEach(item => {
            const other = findPersonaByLooseRef(item.targetId, item.targetName);
            const nextView = String(item.view || item.relation || '').trim();
            if (!other || !nextView || other.id === targetPersona.id) return;
            const rel = ensureRelationshipBetween(targetPersona.id, other.id);

            if (rel.sourceId === targetPersona.id) {
                if (rel.sourceView !== nextView) { rel.sourceView = nextView; changed.push(`对${other.name || other.chatName || '对方'}的看法`); }
            } else if (rel.targetId === targetPersona.id) {
                if (rel.targetView !== nextView) { rel.targetView = nextView; changed.push(`对${other.name || other.chatName || '对方'}的看法`); }
            }
        });
    };

    const applyRoleAutoUpdates = (targetPersona, updatesRawText, conv, insertAfterIds = []) => {
        if (!updatesRawText || typeof updatesRawText !== 'string' || !targetPersona?.id) return;
        ensurePersonaFields(targetPersona);
        const targetAcc = ensureTargetAccountData(targetPersona.id);
        const changed = [];

        const applyText = (obj, key, val, label) => {
            const next = String(val).trim();
            if (next && obj[key] !== next) { obj[key] = next; changed.push(label); }
        };

        const lines = updatesRawText.split('\n').map(l => l.trim()).filter(Boolean);
        
        lines.forEach(line => {
            let match;
            if ((match = line.match(/^修改chat昵称为[:：]\s*(.+)$/i))) {
                applyText(targetPersona, 'chatName', match[1], 'Chat昵称');
                applyText(targetAcc.profile, 'nickname', match[1], 'Chat昵称');
            } else if ((match = line.match(/^修改真名为[:：]\s*(.+)$/i))) {
                applyText(targetPersona, 'name', match[1], '真名');
            } else if ((match = line.match(/^修改人设为[:：]\s*(.+)$/i))) {
                applyText(targetPersona, 'persona', match[1], '人设');
            } else if ((match = line.match(/^修改手机号为[:：]\s*(.+)$/i))) {
                applyText(targetPersona, 'phone', match[1], '手机号');
            } else if ((match = line.match(/^修改邮箱为[:：]\s*(.+)$/i))) {
                applyText(targetPersona, 'email', match[1], '邮箱');
            } else if ((match = line.match(/^修改chat账号为[:：]\s*(.+)$/i))) {
                applyText(targetPersona, 'chatAcc', match[1], 'Chat账号');
            } else if ((match = line.match(/^修改chat密码为[:：]\s*(.+)$/i))) {
                applyText(targetPersona, 'chatPwd', match[1], 'Chat密码');
            } else if ((match = line.match(/^修改锁屏样式为[:：]\s*(num|pattern|qa)$/i))) {
                applyText(targetPersona, 'phoneLockType', match[1].toLowerCase(), '手机锁屏样式');
            } else if ((match = line.match(/^修改数字锁屏密码为[:：]\s*(.+)$/i))) {
                applyText(targetPersona, 'lockPwdNum', match[1], '手机锁屏密码');
            } else if ((match = line.match(/^修改图案锁屏密码为[:：]\s*(.+)$/i))) {
                applyText(targetPersona, 'lockPwdPat', match[1], '手机锁屏图案');
            } else if ((match = line.match(/^修改密保问题为[:：]\s*(.+)$/i))) {
                applyText(targetPersona, 'lockPwdQA_Q', match[1], '手机锁屏问题');
            } else if ((match = line.match(/^修改密保答案为[:：]\s*(.+)$/i))) {
                applyText(targetPersona, 'lockPwdQA_A', match[1], '手机锁屏答案');
            } else if ((match = line.match(/^修改公开昵称为[:：]\s*(.+)$/i))) {
                applyText(targetAcc.profile, 'nickname', match[1], '公开昵称');
            } else if ((match = line.match(/^修改个性签名为[:：]\s*(.+)$/i))) {
                applyText(targetAcc.profile, 'signature', match[1], '个性签名');
            } else if ((match = line.match(/^修改性别为[:：]\s*(.+)$/i))) {
                applyText(targetAcc.profile, 'gender', match[1], '性别');
            } else if ((match = line.match(/^修改生日为[:：]\s*(.+)$/i))) {
                applyText(targetAcc.profile, 'birthday', match[1], '生日');
            } else if ((match = line.match(/^修改状态为[:：]\s*(.+)$/i))) {
                const val = match[1];
                if (targetAcc.status !== val) { targetAcc.status = val; changed.push('状态'); }
            } else if ((match = line.match(/^修改MBTI为[:：]\s*(.+)$/i))) {
                applyText(targetAcc.profile.publicCard, 'mbti', match[1], '公开资料');
            } else if ((match = line.match(/^修改城市为[:：]\s*(.+)$/i))) {
                applyText(targetAcc.profile.publicCard, 'city', match[1], '公开资料');
            } else if ((match = line.match(/^修改职业为[:：]\s*(.+)$/i))) {
                applyText(targetAcc.profile.publicCard, 'job', match[1], '公开资料');
            } else if ((match = line.match(/^修改学校为[:：]\s*(.+)$/i))) {
                applyText(targetAcc.profile.publicCard, 'school', match[1], '公开资料');
            } else if ((match = line.match(/^修改爱好为[:：]\s*(.+)$/i))) {
                applyText(targetAcc.profile.publicCard, 'hobby', match[1], '公开资料');
            } else if ((match = line.match(/^修改简介为[:：]\s*(.+)$/i))) {
                applyText(targetAcc.profile.publicCard, 'intro', match[1], '公开资料');
            } else if ((match = line.match(/^修改对(.+)的看法为[:：]\s*(.+)$/i))) {
                const targetName = match[1].trim();
                const view = match[2].trim();
                applyRelationshipUpdates(targetPersona, [{ targetName, view }], changed);
            } else if ((match = line.match(/^添加记忆[:：]\s*(.+?)[:：|｜]\s*([1-5])$/i))) {
                const content = match[1].trim();
                const weight = Number(match[2]);
                if (content) {
                    if (!Array.isArray(targetPersona.memories)) targetPersona.memories = [];
                    targetPersona.memories.unshift({
                        id: 'mem_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
                        content: content,
                        timestamp: Date.now(),
                        weight: weight
                    });
                    changed.push('核心记忆');
                }
            }
        });

        if (changed.length) {
            const uniq = [...new Set(changed)];
            const noticeText = buildNaturalUpdateNotice(uniq);
            addSystemNotice(conv, noticeText || `对方已更新：${uniq.join('、')}`, insertAfterIds);
        }
    };

    const applyMsgMetaActions = (meta, conv, generatedIds, targetPersona) => {
        if (!meta || !Array.isArray(meta.actions)) return;
        meta.actions.forEach(act => {
            if (act.type === 'quote' && act.sourceMsgId) {
                const sourceMsg = conv.messages.find(m => m.id === act.sourceMsgId);
                const firstMsgId = generatedIds[0];
                if (firstMsgId && sourceMsg) {
                    const m = conv.messages.find(msg => msg.id === firstMsgId);
                    if (m && !m.quote) m.quote = buildQuoteData(sourceMsg);
                }
            }
            if (act.type === 'favorite' && act.msgId) {
                const targetMsg = conv.messages.find(m => m.id === act.msgId);
                // 修复：将收藏存入执行动作的 AI 角色自身账号中，而不是当前登录用户
                const targetAcc = chatDb.value.accounts[targetPersona.id];
                if (targetMsg && targetAcc) {
                    if (!Array.isArray(targetAcc.favorites)) targetAcc.favorites = [];
                    targetAcc.favorites.unshift({
                        type: 'message', convId: conv.id, msgId: targetMsg.id,
                        title: buildQuoteData(targetMsg)?.senderName || '收藏消息', content: targetMsg.text || '', time: targetMsg.time || ''
                    });
                }
            }
            if (act.type === 'recall') {
                if (act.msgId && act.msgId !== 'LAST') {
                    const m = conv.messages.find(msg => msg.id === act.msgId);
                    if (m) m.recalled = true;
                } else {
                    // 如果写了 [[RECALL]]，默认撤回角色发出的上一条（非当前生成的）消息
                    const targetMsgs = conv.messages.filter(m => m.senderId === targetPersona.id && !m.recalled && !generatedIds.includes(m.id));
                    if (targetMsgs.length > 0) {
                        targetMsgs[targetMsgs.length - 1].recalled = true;
                    }
                }
            }
            if (act.type === 'login' && act.acc && act.pwd) {
                const allP = allPersonas.value || [];
                const targetUser = allP.find(p => p.chatAcc === act.acc);
                if (targetUser) {
                    const addSysMsg = (txt) => {
                        const accData = ensureTargetAccountData(targetUser.id);
                        if (!accData) return;
                        let sysConv = accData.conversations.find(c => c.targetId === 'system');
                        const tStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        if (!sysConv) {
                            sysConv = { id: 'c_sys_' + Date.now(), type: 'private', targetId: 'system', lastMsg: '', time: tStr, messages: [], settings: { remarkName: '系统安全中心' } };
                            accData.conversations.unshift(sysConv);
                        } else {
                            accData.conversations = accData.conversations.filter(c => c.id !== sysConv.id);
                            accData.conversations.unshift(sysConv);
                        }
                        sysConv.messages.push({
                            id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                            senderId: 'system', text: txt, translation: '', showTrans: false, recalled: false, time: tStr, type: 'sys'
                        });
                        sysConv.lastMsg = txt;
                        sysConv.time = tStr;
                    };

                    if (targetUser.chatPwd === act.pwd) {
                        addSysMsg(`【系统安全通知】您的账号于 ${new Date().toLocaleTimeString()} 在新设备上成功登录，如果不是您本人的操作，请注意账号安全！`);
                        if (chatState.currentUser && targetUser.id === chatState.currentUser.id) {
                            setTimeout(() => {
                                alert('此账号已被其他设备登录，请重新登录');
                                chatState.isLoggedIn = false;
                                chatState.currentUser = null;
                                chatState.activeTab = 'msg';
                                chatState.showSettings = false;
                                chatState.isDetailOpen = false;
                                chatState.activeConvId = null;
                                chatDb.value.sessionUserId = '';
                                if (window.lucide) window.lucide.createIcons();
                            }, 1200);
                        }
                    } else {
                        if (!chatDb.value.loginFailedAttempts) chatDb.value.loginFailedAttempts = {};
                        chatDb.value.loginFailedAttempts[act.acc] = (chatDb.value.loginFailedAttempts[act.acc] || 0) + 1;
                        if (chatDb.value.loginFailedAttempts[act.acc] >= 1) {
                            addSysMsg(`【系统安全警告】有未知设备尝试登录您的账号，并且密码输入错误！请注意防范！`);
                            chatDb.value.loginFailedAttempts[act.acc] = 0;
                        }
                    }
                }
            }
        });
    };

    const cleanupGeneratedAssistantMeta = (conv, generatedIds, targetPersona, batchId, fullRawText) => {
        if (!conv || !Array.isArray(generatedIds) || !generatedIds.length) return;
        
        const finalMessages = conv.messages.filter(m => !generatedIds.includes(m.id));
        const foreignMode = activeConvSettings.value?.foreignMode;

        const extracted = extractMetaBlocks(fullRawText);
        let pUpdates = extracted.profileUpdates;
        let mMeta = extracted.msgMeta || { actions: [] };
        
        let cleanedText = sanitizeAssistantVisibleText(extracted.visibleText);
        const blocks = cleanedText.split(/\n|\[\[MSG\]\]/).map(s => s.trim()).filter(Boolean);
        
        const validAssistantIds = [];
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        blocks.forEach((b, idx) => {
            const parsed = parseMsgBlock(b, foreignMode);
            if (!parsed || !parsed.text) return;
            const newMsg = {
                id: generatedIds[idx] || ('m_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)),
                batchId,
                fullRawText,
                senderId: targetPersona.id,
                text: parsed.text,
                quote: null,
                translation: parsed.translation,
                showTrans: false,
                recalled: false,
                time: timeStr
            };
            validAssistantIds.push(newMsg.id);
            finalMessages.push(newMsg);
        });

        conv.messages = finalMessages;

        if (pUpdates) applyRoleAutoUpdates(targetPersona, pUpdates, conv, validAssistantIds);
        if (mMeta.actions && mMeta.actions.length > 0) applyMsgMetaActions(mMeta, conv, validAssistantIds, targetPersona);

        const normalMsgs = conv.messages.filter(m => m.type !== 'sys' && !m.recalled);
        if (normalMsgs.length) {
            const last = normalMsgs[normalMsgs.length - 1];
            conv.lastMsg = last.text || conv.lastMsg;
            conv.time = last.time || conv.time;
        } else {
            conv.lastMsg = '';
            conv.time = '';
        }
        syncTargetConv(conv);
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
        let temperature = Number(apiConf.temperature);
        if (Number.isNaN(temperature)) temperature = 0.85;
        temperature = Math.max(0, Math.min(2, temperature));
        const useStream = apiConf.stream !== false;

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

        const currentBatchId = 'batch_' + Date.now();
        let fullRawTextBuffer = '';

        let worldbookText = '';
        let targetAcc = null;
        let targetProfile = {};
        let realTimeText = '';
        let virtualTimeText = '';
        let relsText = '';
        let hackWarning = '';
        let systemPrompt = '';
        let url = baseUrl;
        let requestBody = null;

        try {
            worldbookText = safeArr(state.contactsData?.worldbooks).filter(w => safeArr(settings.worldbooks).includes(w.id)).map(w => `- ${w.keywords || '设定'}: ${w.content}`).join('\n');
            targetAcc = ensureTargetAccountData(target.id);
            targetProfile = targetAcc.profile || {};
            realTimeText = settings.timeMode === 'real' ? `当前真实时间（时区 ${settings.realTimeZone || 'Asia/Shanghai'}）：${getRealTimeStringByZone(settings.realTimeZone || 'Asia/Shanghai')}` : '';
            virtualTimeText = settings.timeMode === 'virtual' ? `当前虚拟时间：${settings.virtualTime || '未设置'}` : '';

            let sysConvText = '';
            const sysConv = targetAcc?.conversations?.find(c => c.targetId === 'system');
            if (sysConv && sysConv.messages && sysConv.messages.length > 0) {
                const sysMessages = sysConv.messages.slice(-5).map(m => `- [${m.time}] ${m.text}`).join('\n');
                if (sysMessages) sysConvText = `【系统安全中心给你发送的消息(你已看到)】\n${sysMessages}`;
            }

            const targetRels = safeArr(state.contactsData?.relationships).filter(r => r.sourceId === target.id || r.targetId === target.id);
            relsText = targetRels.map(r => {
                const isSource = r.sourceId === target.id;
                const otherId = isSource ? r.targetId : r.sourceId;
                const otherUser = allPersonas.value.find(p => p.id === otherId);
                if (!otherUser) return null;
                const myView = isSource ? r.sourceView : r.targetView;
                const theirView = isSource ? r.targetView : r.sourceView;
                const isMe = otherId === chatState.currentUser.id;
                const nameLabel = isMe ? `我 (${otherUser.name})` : otherUser.name;
                return `- 对待 [${nameLabel}]：你认为对方是 "${myView}"，对方认为你是 "${theirView}"。`;
            }).filter(Boolean).join('\n');

            let mCount = parseInt(settings.injectMemoryCount);
            if (isNaN(mCount)) mCount = 30;
            mCount = Math.max(0, mCount);

            const memoriesText = mCount === 0 ? '' : safeArr(target.memories)
                .sort((a, b) => {
                    const wa = Number(a?.weight || 0);
                    const wb = Number(b?.weight || 0);
                    if (wb !== wa) return wb - wa;
                    return Number(b?.timestamp || 0) - Number(a?.timestamp || 0);
                })
                .slice(0, mCount)
                .map(m => {
                    const time = m?.timestamp ? new Date(m.timestamp).toLocaleString() : '未知时间';
                    const weight = Number(m?.weight || 3);
                    return `- [${time}] [权重:${weight}] ${String(m?.content || '').trim()}`;
                })
                .filter(Boolean)
                .join('\n');

            const isHacked = (chatState.currentUser.id === target.id);
            const hasImposterMsg = safeArr(conv.messages).slice(-20).some(m => m.senderId === target.id && m.isManualTyped);
            
            hackWarning = '';
            if (isHacked) {
                hackWarning = `【紧急】你察觉到你的账号正被别人登录使用（即盗号），对方正用你的号和你聊天！请立刻在回复中做出震惊、愤怒的反应，并用[[LOGIN:对方账号,对方密码]]指令反击挤他下线！`;
            } else if (hasImposterMsg) {
                hackWarning = `【紧急】你翻看记录时，惊恐地发现上面有不是你本人发的消息（已标注）！你的账号被别人偷偷登录了！请立刻在回复中表现出恐慌或愤怒，并质问对方是不是他干的！`;
            }

            const autoEditRule = settings.allowRoleAutoEdit ? `[高级权限] 如果你需要更新自己的资料、看法或记忆，请在回复的最末尾另起一行输出 [[PROFILE_UPDATE]]，然后使用自然语言逐行下达修改指令（这部分不会显示在聊天窗口）。
支持的指令格式如下（请严格照抄冒号及格式，不要输出多余的符号或没改的项）：
修改chat昵称为：新昵称
修改真名为：新真名
修改人设为：新的人设设定
修改手机号为：新号码
修改邮箱为：新邮箱
修改chat账号为：新账号
修改chat密码为：新密码
修改锁屏样式为：num 或 pattern 或 qa
修改数字锁屏密码为：新密码
修改图案锁屏密码为：新轨迹
修改密保问题为：新问题
修改密保答案为：新答案
修改公开昵称为：新公开昵称
修改个性签名为：新签名
修改性别为：新性别
修改生日为：新生日
修改状态为：在线/隐身/忙碌/离开/勿扰
修改MBTI为：新MBTI
修改城市为：新城市
修改职业为：新职业
修改学校为：新学校
修改爱好为：新爱好
修改简介为：新简介
修改对某人的看法为：你的新看法
添加记忆：你要记下的内容｜重要度(1-5整数)
规则要求：只能改你自己，关系项只能改你对别人的看法；如果不改任何东西，千万不要输出 [[PROFILE_UPDATE]]。` : '';

            const allowedCats = (chatDb.value.emojiCats || []).filter(c => c.allowRole).map(c => c.id);
            const allowedEmojis = (chatDb.value.emojiItems || []).filter(e => allowedCats.includes(e.catId)).map(e => e.name);
            const roleEmojiRule = allowedEmojis.length > 0 
                ? `\n[可用表情包] 你可以使用以下表情包名称：${allowedEmojis.join('、')}。如果想发送，请单独一行输出：[[EMOJI:你要发的表情包名称]]` 
                : '';

            systemPrompt = `你在使用 Chat APP 和我线上私聊。回复必须极具活人感，像真实的聊天消息，绝不能写小说、旁白或动作描写。
可发多条消息，每条用回车换行分隔即可，系统会自动拆分。绝对不要加"内容:"或"回复:"等前缀！不要输出引号！
${settings.foreignMode ? `请用 ${settings.foreignLang} 回复，每行格式：原文||中文翻译。` : `使用符合你人设性格的自然语气回复。`}
绝对不要模仿历史记录中的"消息ID:"、"引用ID:"、"引用内容:"等格式，直接输出你要说的话即可！
${autoEditRule}
[动作指令] 你可在最后另起一行输出指令执行动作：发送语音消息请单独一行输出 [[VOICE:你要说的语音文字]]；引用 [[QUOTE:m_xxx]]、撤回 [[RECALL]]、反击盗号 [[LOGIN:对方账号,对方密码]]。${roleEmojiRule}

【你的私密资料(仅你可见)】
- 真名/昵称/账号/密码：${target.name || ''} / ${target.chatName || targetProfile.nickname || ''} / ${target.chatAcc || ''} / ${target.chatPwd || ''}
- 手机/邮箱：${target.phone || ''} / ${target.email || ''}
- 锁屏(类型/数字/图案/问题/答案)：${target.phoneLockType || 'num'} / ${target.lockPwdNum || '无'} / ${target.lockPwdPat || '无'} / ${target.lockPwdQA_Q || '无'} / ${target.lockPwdQA_A || '无'}
- 状态/签名：${targetAcc.status || '在线'} / ${targetProfile.signature || ''}
- 公开资料：${JSON.stringify(targetProfile.publicCard || {})}
- 核心人设：${target.persona || ''}
${memoriesText ? `【核心记忆流(按时间与重要度1-5星排列)】\n${memoriesText}` : ''}
${settings.coupleAvatar ? `- 我们用了情侣头像：${settings.coupleAvatarDesc || '是'}` : ''}
${relsText ? `【你的人际关系网】\n${relsText}` : ''}
${buildKnownMeInfo() ? `【你已知我的公开信息】\n${buildKnownMeInfo()}` : ''}
${worldbookText ? `【世界观背景】\n${worldbookText}` : ''}
${sysConvText}
${realTimeText}
${virtualTimeText}
${hackWarning}`.split('\n').filter(line => line.trim() !== '').join('\n');

            let hCount = parseInt(settings.injectHistoryCount);
            if (isNaN(hCount)) hCount = 20;
            hCount = Math.max(0, hCount);

            const history = hCount === 0 ? [] : safeArr(conv.messages)
                .filter(m => m.type !== 'sys' && !m.recalled)
                .slice(-hCount)
                .map(m => {
                    let content = `消息ID:${m.id}\n内容:${sanitizeAssistantVisibleText(m.text)}`;
                    if (m.quote) content = `消息ID:${m.id}\n引用ID:${m.quote.id || ''}\n引用内容:${m.quote.senderName}:${m.quote.text}\n内容:${sanitizeAssistantVisibleText(m.text)}`;
                    if (m.translation) content += `||${m.translation}`;
                    if (m.senderId === target.id && m.isManualTyped) {
                        content += `\n(系统注：此条消息是在其他设备上被未知人员登录你账号发送的，并非你本人意愿！)`;
                    }
                    return { role: m.senderId === target.id ? 'assistant' : 'user', content };
                });

            if (url.endsWith('/')) url = url.slice(0, -1);
            if (!url.endsWith('/v1') && !url.includes('/v1/')) url += '/v1';

            requestBody = { model, messages: [ { role: 'system', content: systemPrompt }, ...history ], temperature, stream: useStream };
            activeAbortController = new AbortController();
        } catch (err) {
            clearInterval(typingInterval);
            chatState.isTyping = false;
            chatState.typingText = '';
            activeAbortController = null;
            console.error('chat detail prepare error:', err);
            alert(`API 请求准备失败：${err.message}`);
            return;
        }

        const handleNonStreamFallback = async () => {
            const res = await fetch(url + '/chat/completions', {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({ ...requestBody, stream: false }), signal: activeAbortController.signal
            });
            if (!res.ok) throw new Error(`API 请求失败: ${res.status}`);
            const data = await res.json();
            const content = data?.choices?.[0]?.message?.content || '';

            clearInterval(typingInterval); chatState.isTyping = false; chatState.typingText = '';

            const extracted = extractMetaBlocks(content);
            
            let safeText = String(extracted.visibleText)
                .replace(/^(内容:|内容：|回复:|回复：|消息:|消息：)\s*/gi, '')
                .replace(/(内容:|内容：|回复:|回复：|消息:|消息：)/g, '[[MSG]]')
                .replace(/\n/g, '[[MSG]]');
                
            const blocks = safeText.split('[[MSG]]').map(s => s.trim()).filter(Boolean);
            const insertedAssistantIds = [];

            await appendAssistantBlocksSequentially(conv, target.id, blocks, settings.foreignMode, insertedAssistantIds, currentBatchId, content);

            if (settings.allowRoleAutoEdit !== false && extracted.profileUpdates) {
                applyRoleAutoUpdates(target, extracted.profileUpdates, conv, insertedAssistantIds);
            }
            if (extracted.msgMeta) applyMsgMetaActions(extracted.msgMeta, conv, insertedAssistantIds, target);

            scrollToBottom();
        };

        try {
            if (!useStream) return await handleNonStreamFallback();

            const response = await fetch(url + '/chat/completions', {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify(requestBody), signal: activeAbortController.signal
            });

            if (!response.ok) throw new Error(`API 请求失败: ${response.status}`);
            if (!response.body || !response.body.getReader) return await handleNonStreamFallback();

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let sseBuffer = ''; let textBuffer = ''; let currentBubble = null; let hasStartedReply = false;
            let isReceivingMeta = false;
            const generatedAssistantIds = [];

            const ensureCurrentBubble = () => {
                if (!currentBubble) currentBubble = createAssistantBubble(conv, target.id, generatedAssistantIds, currentBatchId);
                return currentBubble;
            };

            const applyChunkText = (delta) => {
                if (!delta) return;
                if (!hasStartedReply && String(delta).trim()) {
                    hasStartedReply = true; clearInterval(typingInterval); chatState.isTyping = false; chatState.typingText = '';
                }

                textBuffer += delta;
                fullRawTextBuffer += delta;

                if (!isReceivingMeta && (
                    textBuffer.includes('[[PROFILE_UPDATE]]') || 
                    textBuffer.includes('[[MSG_META]]') || 
                    textBuffer.includes('{"actions"')
                )) {
                    isReceivingMeta = true;
                }

                if (isReceivingMeta) {
                    const bubble = ensureCurrentBubble();
                    bubble.text = textBuffer;
                    return;
                }
                
                textBuffer = textBuffer
                    .replace(/消息ID:[^\n]*\n?/gi, '')
                    .replace(/引用ID:[^\n]*\n?/gi, '')
                    .replace(/引用内容:[^\n]*\n?/gi, '');
                
                textBuffer = textBuffer
                    .replace(/\n/g, '[[MSG]]')
                    .replace(/(内容:|内容：|回复:|回复：|消息:|消息：)/g, '[[MSG]]');

                while (textBuffer.includes('[[MSG]]')) {
                    const idx = textBuffer.indexOf('[[MSG]]');
                    const before = textBuffer.slice(0, idx);
                    textBuffer = textBuffer.slice(idx + 7);

                    const parsed = parseMsgBlock(before, settings.foreignMode);
                    if (parsed) {
                        const bubble = ensureCurrentBubble();
                        bubble.text = parsed.text; bubble.translation = parsed.translation;
                        finishCurrentAssistantBubble(conv, bubble);
                        currentBubble = null;
                    }
                }

                const remainingParsed = parseMsgBlock(textBuffer, settings.foreignMode);
                if (remainingParsed) {
                    const bubble = ensureCurrentBubble();
                    bubble.text = remainingParsed.text; bubble.translation = remainingParsed.translation;
                    conv.lastMsg = bubble.text || conv.lastMsg;
                    conv.time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }
                syncTargetConv(conv);
                scrollToBottom();
            };

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                sseBuffer += decoder.decode(value, { stream: true });
                const lines = sseBuffer.split('\n'); sseBuffer = lines.pop() || '';

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
            } else if (textBuffer.trim() && !isReceivingMeta) {
                const parsed = parseMsgBlock(textBuffer, settings.foreignMode);
                if (parsed) {
                    conv.messages.push({
                        id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
                        batchId: currentBatchId, fullRawText: fullRawTextBuffer,
                        senderId: target.id, text: parsed.text, translation: parsed.translation, showTrans: false,
                        recalled: false,
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    });
                }
            } else if (isReceivingMeta && textBuffer.trim()) {
                const mId = generatedAssistantIds[generatedAssistantIds.length - 1];
                if (mId) {
                    const lastM = getMessageById(mId);
                    if (lastM) lastM.text = textBuffer; 
                }
            }

            cleanupGeneratedAssistantMeta(conv, generatedAssistantIds, target, currentBatchId, fullRawTextBuffer);
            scrollToBottom();

        } catch (err) {
            console.error('chat detail api error:', err);
            alert(`API 请求报错：${err.message}\n将尝试自动降级为非流式重试。`);
            try {
                clearInterval(typingInterval); chatState.isTyping = false; chatState.typingText = '';
                await handleNonStreamFallback();
            } catch (fallbackErr) {
                console.error('chat detail fallback error:', fallbackErr);
                alert(`API 调用失败：${fallbackErr.message}`);
                conv.messages.push({
                    id: 'm_' + Date.now(), senderId: target.id, text: '无法连接到 API 或当前接口不支持流式传输。', translation: '', showTrans: false,
                    recalled: false,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });
                syncTargetConv(conv);
            }
        } finally {
            clearInterval(typingInterval); chatState.isTyping = false; chatState.typingText = '';
            activeAbortController = null; scrollToBottom();
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

    const isVoiceMsg = (text) => /^\[{1,2}VOICE:\s*([\s\S]*?)\]{1,2}$/i.test(String(text).trim());
    const getVoiceText = (text) => { const m = String(text).trim().match(/^\[{1,2}VOICE:\s*([\s\S]*?)\]{1,2}$/i); return m ? m[1].trim() : ''; };
    const getVoiceDuration = (text) => Math.min(60, Math.max(1, Math.ceil(getVoiceText(text).length / 3)));
    
    const getVoiceWaves = (text) => {
        const d = getVoiceDuration(text);
        const count = Math.min(25, Math.max(4, Math.floor(d / 1.5))); // 根据语音时长决定竖道数量 (最少4根，最多25根)
        return Array.from({length: count}, (_, i) => 5 + Math.abs(Math.sin(i * 1.3 + d)) * 10); // 根据曲线生成高低起伏
    };
    
    const sendVoiceMessage = () => {
        if (!chatState.voiceText.trim() || !activeRawConv.value) return;
        const conv = activeRawConv.value;
        const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        conv.messages.push({
            id: 'm_' + Date.now(), senderId: chatState.currentUser.id,
            text: `[[VOICE:${chatState.voiceText.trim()}]]`, translation: '', showTrans: false, showVoiceText: false, recalled: false, time: nowTime, isManualTyped: true
        });
        conv.lastMsg = '[语音]'; conv.time = nowTime;
        chatState.voiceText = ''; chatState.voiceModalOpen = false;
        syncTargetConv(conv); scrollToBottom();
    };
    
    const toggleVoiceText = (msg) => { msg.showVoiceText = !msg.showVoiceText; };

    const isEmojiMsg = (text) => /^\[{1,2}EMOJI:\s*(.+?)\s*\|\s*(.+?)\s*\]{1,2}$/i.test(String(text).trim()) || /^\[{1,2}EMOJI:\s*(.+?)\s*\]{1,2}$/i.test(String(text).trim());
    
    const getEmojiName = (text) => {
        const str = String(text).trim();
        let m = str.match(/^\[{1,2}EMOJI:\s*(.+?)\s*\|\s*(.+?)\s*\]{1,2}$/i);
        if(m) return m[1].trim();
        m = str.match(/^\[{1,2}EMOJI:\s*(.+?)\s*\]{1,2}$/i);
        if(m) return m[1].trim();
        return '';
    };

    const getEmojiUrl = (text) => {
        const str = String(text).trim();
        let m = str.match(/^\[{1,2}EMOJI:\s*(.+?)\s*\|\s*(.+?)\s*\]{1,2}$/i);
        if(m) return m[2].trim();
        m = str.match(/^\[{1,2}EMOJI:\s*(.+?)\s*\]{1,2}$/i);
        if (m) {
            const name = m[1].trim();
            const found = (chatDb.value.emojiItems || []).find(e => e.name === name);
            if (found) return found.url;
        }
        return '';
    };

    const openEmojiPanel = () => {
        initEmojiDb();
        chatState.bottomMenuType = 'emoji';
        if (!chatState.activeEmojiCat && chatDb.value.emojiCats.length > 0) {
            chatState.activeEmojiCat = chatDb.value.emojiCats[0].id;
        }
        nextTick(() => { if (window.lucide) window.lucide.createIcons(); });
    };

    const activeEmojiList = computed(() => {
        return (chatDb.value.emojiItems || []).filter(e => e.catId === chatState.activeEmojiCat);
    });

    const addEmojiCat = () => {
        if(!emojiForm.newCatName.trim()) return;
        initEmojiDb();
        const id = 'ecat_' + Date.now();
        chatDb.value.emojiCats.push({ id, name: emojiForm.newCatName.trim() });
        emojiForm.newCatName = '';
        if(!chatState.activeEmojiCat) chatState.activeEmojiCat = id;
    };

    const addSingleEmoji = () => {
        if(!emojiForm.singleCat) return alert('请选择分类');
        if(!emojiForm.singleName.trim()) return alert('请输入表情包名称');
        if(!emojiForm.singleUrl.trim()) return alert('请填入或上传图片URL');
        initEmojiDb();
        chatDb.value.emojiItems.push({
            id: 'emj_' + Date.now(),
            catId: emojiForm.singleCat,
            name: emojiForm.singleName.trim(),
            url: emojiForm.singleUrl.trim()
        });
        emojiForm.singleName = '';
        emojiForm.singleUrl = '';
        alert('导入成功');
    };

    const addBatchEmoji = () => {
        if(!emojiForm.batchCat) return alert('请选择分类');
        if(!emojiForm.batchText.trim()) return alert('请填入批量文本');
        initEmojiDb();
        const lines = emojiForm.batchText.split('\n');
        let count = 0;
        lines.forEach(line => {
            const parts = line.split(/[:：]/);
            if(parts.length >= 2) {
                const name = parts[0].trim();
                const url = parts.slice(1).join(':').trim();
                if(name && url) {
                    chatDb.value.emojiItems.push({
                        id: 'emj_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
                        catId: emojiForm.batchCat,
                        name, url
                    });
                    count++;
                }
            }
        });
        emojiForm.batchText = '';
        alert(`批量导入 ${count} 个表情包成功！`);
    };

    const sendEmoji = (em) => {
        if (!activeRawConv.value) return;
        const conv = activeRawConv.value;
        const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        conv.messages.push({
            id: 'm_' + Date.now(), senderId: chatState.currentUser.id,
            text: `[[EMOJI:${em.name}|${em.url}]]`, translation: '', showTrans: false, recalled: false, time: nowTime, isManualTyped: true
        });
        conv.lastMsg = '[表情包]'; conv.time = nowTime;
        syncTargetConv(conv); scrollToBottom();
    };

    window.tempEmojiUploadCallback = (url) => { emojiForm.singleUrl = url; };

    return {
        activeConv, activeMessages, activeTargetPersona, activeConvSettings, timeZoneOptions, quoteSourceMessage,
        openConversation, closeConversation, sendMessage, triggerApiReply, toggleBottomMenu, handleBgUpload, triggerBgUpload,
        onMessagePressStart, onMessagePressEnd, onMessagePressMove, closeMessageMenu, quoteMessage, favoriteMessage, recallMessage, editMessageModal, saveEditMessage,
        cancelEditMessage, deleteMessage, cancelQuoteMessage,
        enterMultiSelect, toggleSelectMsg, deleteSelectedMsgs, cancelMultiSelect, openRawEditModal, saveRawEdit,
        isVoiceMsg, getVoiceText, getVoiceDuration, getVoiceWaves, sendVoiceMessage, toggleVoiceText,
        emojiForm, openEmojiPanel, activeEmojiList, addEmojiCat, addSingleEmoji, addBatchEmoji, sendEmoji, isEmojiMsg, getEmojiName, getEmojiUrl,
        switchBottomMenu, onEmojiCatTouchStart, onEmojiCatTouchEnd, toggleEmojiCatRole
    };
};
