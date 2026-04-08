window.useChatDetailLogic = function(state, chatMethods) {
    const { computed, nextTick } = Vue;
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
    if (chatState.quoteMsgId === undefined) chatState.quoteMsgId = null;
    if (chatState.editingMsgId === undefined) chatState.editingMsgId = null;

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
                nickname: '未命名',
                realName: '',
                signature: '这个人很神秘',
                gender: '',
                birthday: '',
                allowProfileView: true,
                bg: '',
                publicCard: { mbti: '', city: '', job: '', school: '', hobby: '', intro: '' },
                moments: []
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
        if (conv.settings.allowRoleAutoEdit === undefined) conv.settings.allowRoleAutoEdit = true;
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

    const activeRawConv = computed(() => {
        if (!chatState.activeConvId || !currentAccountData.value) return null;
        return safeArr(currentAccountData.value.conversations).find(c => c.id === chatState.activeConvId) || null;
    });

    const activeConvSettings = computed(() => ensureConvSettings(activeRawConv.value));

    const activeTargetPersona = computed(() => {
        const conv = activeRawConv.value;
        if (!conv) return {};
        const p = getPersonaById(conv.targetId) || {};
        ensurePersonaFields(p);
        return p;
    });

    const activeConv = computed(() => {
    const conv = activeRawConv.value;
    const target = activeTargetPersona.value;
    if (!conv) return null;
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

    const closeMessageMenu = () => {
        chatState.messageMenuOpen = false;
        chatState.messageMenuMsgId = null;
    };

    const openMessageMenu = (msg) => {
        if (!msg?.id) return;
        chatState.messageMenuMsgId = msg.id;
        chatState.messageMenuOpen = true;
    };

    const onMessagePressStart = (msg) => {
        clearTimeout(longPressTimer);
        longPressTimer = setTimeout(() => {
            openMessageMenu(msg);
        }, 420);
    };

    const onMessagePressEnd = () => {
        clearTimeout(longPressTimer);
    };

    const cancelQuoteMessage = () => {
        chatState.quoteMsgId = null;
    };

    const quoteSourceMessage = computed(() => getMessageById(chatState.quoteMsgId));

    const quoteMessage = () => {
        const msg = getMessageById(chatState.messageMenuMsgId);
        if (!msg) return;
        chatState.quoteMsgId = msg.id;
        chatState.editingMsgId = null;
        closeMessageMenu();
    };

    const favoriteMessage = () => {
        const msg = getMessageById(chatState.messageMenuMsgId);
        if (!msg || !currentAccountData.value) return;

        if (!Array.isArray(currentAccountData.value.favorites)) {
            currentAccountData.value.favorites = [];
        }

        const existedIndex = currentAccountData.value.favorites.findIndex(item =>
            item?.type === 'message' &&
            item?.convId === activeRawConv.value?.id &&
            item?.msgId === msg.id
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

    const editMessage = () => {
        const msg = getMessageById(chatState.messageMenuMsgId);
        if (!msg) return;
        chatState.editingMsgId = msg.id;
        chatState.quoteMsgId = null;
        chatState.detailInput = msg.text || '';
        closeMessageMenu();
    };

    const cancelEditMessage = () => {
        chatState.editingMsgId = null;
    };

    const deleteMessage = () => {
        const msg = getMessageById(chatState.messageMenuMsgId);
        const conv = activeRawConv.value;
        if (!msg || !conv) return;
        if (!confirm('确定删除这条消息吗？')) return;

        conv.messages = (conv.messages || []).filter(item => item.id !== msg.id);

        if (chatState.quoteMsgId === msg.id) chatState.quoteMsgId = null;
        if (chatState.editingMsgId === msg.id) {
            chatState.editingMsgId = null;
            chatState.detailInput = '';
        }

        const normalMsgs = conv.messages.filter(m => m.type !== 'sys');
        if (normalMsgs.length) {
            const last = normalMsgs[normalMsgs.length - 1];
            conv.lastMsg = last.text || conv.lastMsg;
            conv.time = last.time || conv.time;
        } else {
            conv.lastMsg = '';
            conv.time = '';
        }

        closeMessageMenu();
    };

    const appendAssistantBlocksSequentially = async (conv, senderId, blocks, foreignMode, insertedAssistantIds = []) => {
        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            const parsed = parseMsgBlock(block, foreignMode);
            if (!parsed) continue;

            await sleep(180 + Math.floor(Math.random() * 260));

            const msg = {
                id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
                senderId,
                text: parsed.text,
                translation: parsed.translation,
                showTrans: false,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            conv.messages.push(msg);
            insertedAssistantIds.push(msg.id);
            conv.lastMsg = parsed.text;
            conv.time = msg.time;
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
        const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (chatState.editingMsgId) {
            const editingMsg = getMessageById(chatState.editingMsgId);
            if (!editingMsg) return;

            editingMsg.text = text;
            editingMsg.time = nowTime;

            conv.lastMsg = text;
            conv.time = nowTime;

            chatState.editingMsgId = null;
            chatState.detailInput = '';
            scrollToBottom();
            return;
        }

        const quote = buildQuoteData(quoteSourceMessage.value);

        conv.messages.push({
            id: 'm_' + Date.now(),
            senderId: chatState.currentUser.id,
            text,
            translation: '',
            showTrans: false,
            time: nowTime,
            quote
        });

        conv.lastMsg = text;
        conv.time = nowTime;
        chatState.detailInput = '';
        chatState.quoteMsgId = null;
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

    const createAssistantBubble = (conv, senderId, generatedIds) => {
        const msg = {
            id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
            senderId,
            text: '',
            translation: '',
            showTrans: false,
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
            type: 'sys',
            senderId: '__system__',
            text,
            translation: '',
            showTrans: false,
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
    const meNames = [
        String(me.name || '').trim(),
        String(me.chatName || '').trim(),
        String(currentAccountData.value?.profile?.nickname || '').trim(),
        '我',
        '你',
        '当前用户'
    ].filter(Boolean);

    if (meNames.includes(targetName)) parts.push('对方对你的看法变了');
    else parts.push(`对方对${targetName}的看法变了`);
});


        const uniqParts = [...new Set(parts)];
        if (!uniqParts.length) return `对方已更新：${list.join('、')}`;
        if (uniqParts.length === 1) return uniqParts[0];
        return uniqParts.join(' · ');
    };

    const extractProfileUpdate = (rawText) => {
        const marker = '[[PROFILE_UPDATE]]';
        const raw = String(rawText || '');
        const idx = raw.indexOf(marker);
        if (idx < 0) return { visibleText: raw, updates: null };
        const visibleText = raw.slice(0, idx).trim();
        let jsonPart = raw.slice(idx + marker.length).trim();
        jsonPart = jsonPart.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
        try {
            const updates = JSON.parse(jsonPart);
            return { visibleText, updates };
        } catch (e) {
            return { visibleText, updates: null };
        }
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
        let rel = state.contactsData.relationships.find(r =>
            (r.sourceId === idA && r.targetId === idB) ||
            (r.sourceId === idB && r.targetId === idA)
        );
        if (!rel) {
            rel = {
                id: 'rel_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                sourceId: idA,
                targetId: idB,
                sourceView: '认识',
                targetView: '认识'
            };
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

            if (!other || !nextView) return;
            if (other.id === targetPersona.id) return;

            const rel = ensureRelationshipBetween(targetPersona.id, other.id);

            // 只能修改“角色自己对别人”的看法，不能改别人对角色的看法
            if (rel.sourceId === targetPersona.id) {
                if (rel.sourceView !== nextView) {
                    rel.sourceView = nextView;
                    changed.push(`对${other.name || other.chatName || '对方'}的看法`);
                }
            } else if (rel.targetId === targetPersona.id) {
                if (rel.targetView !== nextView) {
                    rel.targetView = nextView;
                    changed.push(`对${other.name || other.chatName || '对方'}的看法`);
                }
            }
        });
    };

    const applyRoleAutoUpdates = (targetPersona, updates, conv, insertAfterIds = []) => {
        if (!updates || !targetPersona?.id) return;
        ensurePersonaFields(targetPersona);
        const targetAcc = ensureTargetAccountData(targetPersona.id);

        const changed = [];

        const personaProfile = updates.personaProfile || {};
        const chatProfile = updates.chatProfile || {};
        const relationshipUpdates = updates.relationshipUpdates || [];

        const applyText = (obj, key, val, label) => {
            if (val === undefined || val === null) return;
            const next = String(val).trim();
            if (obj[key] !== next) {
                obj[key] = next;
                changed.push(label);
            }
        };

        const applyStatus = (acc, val, color) => {
            if (val !== undefined && val !== null) {
                const next = String(val).trim();
                if (next && acc.status !== next) {
                    acc.status = next;
                    changed.push('状态');
                }
            }
            if (color !== undefined && color !== null) {
                const next = String(color).trim();
                if (next && acc.statusColor !== next) acc.statusColor = next;
            }
        };

        applyText(targetPersona, 'name', personaProfile.name, '真名');

        const unifiedChatNameRaw = personaProfile.chatName !== undefined
            ? personaProfile.chatName
            : chatProfile.nickname;

        if (unifiedChatNameRaw !== undefined && unifiedChatNameRaw !== null) {
            const unifiedChatName = String(unifiedChatNameRaw).trim();
            if (unifiedChatName) {
                if (targetPersona.chatName !== unifiedChatName) {
                    targetPersona.chatName = unifiedChatName;
                    changed.push('Chat昵称');
                }
                if (targetAcc.profile.nickname !== unifiedChatName) {
                    targetAcc.profile.nickname = unifiedChatName;
                }
            }
        }

        applyText(targetPersona, 'persona', personaProfile.persona, '人设');
        applyText(targetPersona, 'phone', personaProfile.phone, '手机号');
        applyText(targetPersona, 'email', personaProfile.email, '邮箱');
        applyText(targetPersona, 'chatAcc', personaProfile.chatAcc, 'Chat账号');
        applyText(targetPersona, 'chatPwd', personaProfile.chatPwd, 'Chat密码');

        if (personaProfile.phoneLockType && ['num', 'pattern', 'qa'].includes(personaProfile.phoneLockType)) {
            if (targetPersona.phoneLockType !== personaProfile.phoneLockType) {
                targetPersona.phoneLockType = personaProfile.phoneLockType;
                changed.push('手机锁屏样式');
            }
        }

        if (targetPersona.phoneLockType === 'num') {
            applyText(targetPersona, 'lockPwdNum', personaProfile.lockPwdNum, '手机锁屏密码');
            targetPersona.lockPwdPat = '';
            targetPersona.lockPwdQA_Q = '';
            targetPersona.lockPwdQA_A = '';
        } else if (targetPersona.phoneLockType === 'pattern') {
            applyText(targetPersona, 'lockPwdPat', personaProfile.lockPwdPat, '手机锁屏图案');
            targetPersona.lockPwdNum = '';
            targetPersona.lockPwdQA_Q = '';
            targetPersona.lockPwdQA_A = '';
        } else if (targetPersona.phoneLockType === 'qa') {
            applyText(targetPersona, 'lockPwdQA_Q', personaProfile.lockPwdQA_Q, '手机锁屏问题');
            applyText(targetPersona, 'lockPwdQA_A', personaProfile.lockPwdQA_A, '手机锁屏答案');
            targetPersona.lockPwdNum = '';
            targetPersona.lockPwdPat = '';
        }

        applyText(targetAcc.profile, 'realName', chatProfile.realName, 'Chat资料真名');
        applyText(targetAcc.profile, 'signature', chatProfile.signature, '个性签名');
        applyText(targetAcc.profile, 'gender', chatProfile.gender, '性别');
        applyText(targetAcc.profile, 'birthday', chatProfile.birthday, '生日');
        applyStatus(targetAcc, chatProfile.status, chatProfile.statusColor);

        if (chatProfile.publicCard && typeof chatProfile.publicCard === 'object') {
            const fields = [
                ['mbti', '公开资料'],
                ['city', '公开资料'],
                ['job', '公开资料'],
                ['school', '公开资料'],
                ['hobby', '公开资料'],
                ['intro', '公开资料']
            ];
            fields.forEach(([key, label]) => {
                if (chatProfile.publicCard[key] !== undefined) {
                    const next = String(chatProfile.publicCard[key] || '').trim();
                    if (targetAcc.profile.publicCard[key] !== next) {
                        targetAcc.profile.publicCard[key] = next;
                        changed.push(label);
                    }
                }
            });
        }

        applyRelationshipUpdates(targetPersona, relationshipUpdates, changed);

        if (changed.length) {
            const uniq = [...new Set(changed)];
            const noticeText = buildNaturalUpdateNotice(uniq);
            addSystemNotice(conv, noticeText || `对方已更新：${uniq.join('、')}`, insertAfterIds);
        }
    };

    const cleanupGeneratedAssistantMeta = (conv, generatedIds, targetPersona) => {
        if (!conv || !Array.isArray(generatedIds) || !generatedIds.length) return;
        let updates = null;
        const validAssistantIds = [];

        generatedIds.forEach(id => {
            const msg = conv.messages.find(m => m.id === id);
            if (!msg) return;
            const extracted = extractProfileUpdate(msg.text);
            if (extracted.updates && !updates) updates = extracted.updates;
            msg.text = extracted.visibleText;
            if (String(msg.text || '').trim()) validAssistantIds.push(msg.id);
        });

        conv.messages = conv.messages.filter(m => {
            if (m.type === 'sys') return true;
            return String(m.text || '').trim() !== '';
        });

        if (updates) applyRoleAutoUpdates(targetPersona, updates, conv, validAssistantIds);

        const normalMsgs = conv.messages.filter(m => m.type !== 'sys');
        if (normalMsgs.length) {
            const last = normalMsgs[normalMsgs.length - 1];
            conv.lastMsg = last.text || conv.lastMsg;
            conv.time = last.time || conv.time;
        }
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

        const worldbookText = safeArr(state.contactsData?.worldbooks)
            .filter(w => safeArr(settings.worldbooks).includes(w.id))
            .map(w => `- ${w.keywords || '设定'}: ${w.content}`)
            .join('\n');

        const targetAcc = ensureTargetAccountData(target.id);
        const targetProfile = targetAcc.profile || {};
        const realTimeText = settings.timeMode === 'real'
            ? `当前真实时间（时区 ${settings.realTimeZone || 'Asia/Shanghai'}）：${getRealTimeStringByZone(settings.realTimeZone || 'Asia/Shanghai')}`
            : '';
        const virtualTimeText = settings.timeMode === 'virtual'
            ? `当前虚拟时间：${settings.virtualTime || '未设置'}`
            : '';

        const targetRels = safeArr(state.contactsData?.relationships).filter(r => r.sourceId === target.id || r.targetId === target.id);
        const relsText = targetRels.map(r => {
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

        const systemPrompt = [
            `你正在一款名为 Chat 的线上聊天APP里和我私聊。`,
            `你必须始终牢记：你是在聊天软件里发消息，不是在写小说、旁白、动作描写、场景描写。`,
            `你的回复必须像真正的聊天消息。`,
            `你可以自己决定这次回复发 1 条、2 条、3 条甚至更多条消息，每一条消息内容长短都由你自己根据人设、情绪、关系、上下文决定。`,
            `重点：不要把所有内容杂糅成一大条消息。你应该像真实聊天那样，自然地拆成多条。`,
            `多条消息之间必须使用唯一分隔符 [[MSG]] 。`,
            `不要输出序号，不要输出 markdown，不要解释。只输出聊天消息内容本体。`,
            settings.foreignMode
                ? `你必须使用 ${settings.foreignLang} 回复。每一条消息都必须使用 "原文||中文翻译" 的格式；多条消息之间仍然用 [[MSG]] 分隔。`
                : `默认使用符合人设的自然聊天语言回复。`,
            settings.allowRoleAutoEdit === false
                ? `你不允许自动修改自己的资料与状态。`
                : `如果你觉得有必要，你可以在正常聊天消息全部输出完之后，额外追加唯一控制块 [[PROFILE_UPDATE]] 后跟 JSON，用来悄悄修改你自己的资料与状态。这个控制块不会显示在聊天里。`,
            settings.allowRoleAutoEdit === false ? '' : `控制块 JSON 可用结构：
{
  "personaProfile": {
    "name": "可选",
    "chatName": "可选",
    "persona": "可选",
    "phone": "可选",
    "email": "可选",
    "chatAcc": "可选",
    "chatPwd": "可选",
    "phoneLockType": "num 或 pattern 或 qa",
    "lockPwdNum": "当 num 时可选",
    "lockPwdPat": "当 pattern 时可选",
    "lockPwdQA_Q": "当 qa 时可选",
    "lockPwdQA_A": "当 qa 时可选"
  },
  "chatProfile": {
    "nickname": "可选",
    "realName": "可选",
    "signature": "可选",
    "gender": "可选",
    "birthday": "可选",
    "status": "可选",
    "statusColor": "可选",
    "publicCard": {
      "mbti": "可选",
      "city": "可选",
      "job": "可选",
      "school": "可选",
      "hobby": "可选",
      "intro": "可选"
    }
  },
  "relationshipUpdates": [
    {
      "targetId": "可选，推荐填写",
      "targetName": "可选，对方角色名",
      "view": "你对这个人的当前看法"
    }
  ]
}
你只能修改“你自己对别人”的看法：
- 你可以修改你对我的看法
- 你也可以修改你对其他角色的看法
- 你不能修改我对你的看法
- 你不能修改别人对你的看法
- 你不能修改别人彼此之间的看法`,
            `【你的当前私密资料（只有你自己知道）：】`,
            `- 真名：${target.name || ''}`,
            `- Chat昵称：${target.chatName || targetProfile.nickname || ''}`,
            `- Chat账号：${target.chatAcc || ''}`,
            `- Chat密码：${target.chatPwd || ''}`,
            `- 手机号：${target.phone || ''}`,
            `- 邮箱：${target.email || ''}`,
            `- 当前手机锁屏样式：${target.phoneLockType || 'num'}`,
            `- 锁屏数字密码：${target.lockPwdNum || ''}`,
            `- 锁屏图案轨迹：${target.lockPwdPat || ''}`,
            `- 锁屏密保问题：${target.lockPwdQA_Q || ''}`,
            `- 锁屏密保答案：${target.lockPwdQA_A || ''}`,
            `- 当前Chat状态：${targetAcc.status || '在线'}`,
            `- 当前个性签名：${targetProfile.signature || ''}`,
            `- 当前公开资料：${JSON.stringify(targetProfile.publicCard || {})}`,
            `- 核心设定与记忆：${target.persona || ''}`,
            settings.coupleAvatar ? `- 你知道我们用了情侣头像：${settings.coupleAvatarDesc || '是情侣头像'}` : '',
            relsText ? `【你的人脉与羁绊关系网（你的社交认知）：】\n${relsText}` : '',
            buildKnownMeInfo() ? `\n【你目前已知我的公开资料（仅限我公开展示的部分）：】\n${buildKnownMeInfo()}` : '',
            worldbookText ? `【你需要知道的世界书背景：】\n${worldbookText}` : '',
            realTimeText,
            virtualTimeText
        ].filter(Boolean).join('\n');

const history = safeArr(conv.messages)
    .filter(m => m.type !== 'sys')
    .slice(-20)
    .map(m => {
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
            temperature,
            stream: useStream
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

            clearInterval(typingInterval);
            chatState.isTyping = false;
            chatState.typingText = '';

            const extracted = extractProfileUpdate(content);
            const blocks = String(extracted.visibleText).split('[[MSG]]').map(s => s.trim()).filter(Boolean);

            const insertedAssistantIds = [];

            await appendAssistantBlocksSequentially(
                conv,
                target.id,
                blocks,
                settings.foreignMode,
                insertedAssistantIds
            );

            if (settings.allowRoleAutoEdit !== false && extracted.updates) {
                applyRoleAutoUpdates(target, extracted.updates, conv, insertedAssistantIds);
            }

            scrollToBottom();
        };

        try {
            if (!useStream) {
                await handleNonStreamFallback();
                return;
            }

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

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let sseBuffer = '';
            let textBuffer = '';
            let currentBubble = null;
            let hasStartedReply = false;
            const generatedAssistantIds = [];

            const ensureCurrentBubble = () => {
                if (!currentBubble) currentBubble = createAssistantBubble(conv, target.id, generatedAssistantIds);
                return currentBubble;
            };

            const applyChunkText = (delta) => {
                if (!delta) return;

                if (!hasStartedReply && String(delta).trim()) {
                    hasStartedReply = true;
                    clearInterval(typingInterval);
                    chatState.isTyping = false;
                    chatState.typingText = '';
                }

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

            cleanupGeneratedAssistantMeta(conv, generatedAssistantIds, target);

            conv.messages = conv.messages.filter(m => {
            if (m.type === 'sys') return true;
            return String(m.text || '').trim() !== '';
        });

        const normalMsgs = conv.messages.filter(m => m.type !== 'sys');
        if (normalMsgs.length) {
            const last = normalMsgs[normalMsgs.length - 1];
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
        quoteSourceMessage,
        openConversation,
        closeConversation,
        sendMessage,
        triggerApiReply,
        toggleBottomMenu,
        handleBgUpload,
        triggerBgUpload,
        onMessagePressStart,
        onMessagePressEnd,
        closeMessageMenu,
        quoteMessage,
        favoriteMessage,
        editMessage,
        cancelEditMessage,
        deleteMessage,
        cancelQuoteMessage
    };
};
