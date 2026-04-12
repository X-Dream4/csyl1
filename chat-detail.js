window.useChatDetailLogic = function(state, chatMethods) {
    const { computed, nextTick, reactive, ref } = Vue;
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
    
    if (chatState.cameraModalOpen === undefined) chatState.cameraModalOpen = false;
    if (chatState.cameraText === undefined) chatState.cameraText = '';
    if (chatState.photoViewerOpen === undefined) chatState.photoViewerOpen = false;
    if (chatState.photoViewerText === undefined) chatState.photoViewerText = '';
    if (chatState.photoViewerImg === undefined) chatState.photoViewerImg = '';
    if (chatState.displayMessageCount === undefined) chatState.displayMessageCount = 60;
    if (chatState.activeGroupEditMemberId === undefined) chatState.activeGroupEditMemberId = '';
    
    if (chatState.redPacketModalOpen === undefined) chatState.redPacketModalOpen = false;
    if (chatState.redPacketForm === undefined) chatState.redPacketForm = { type: 'single', amount: null, count: 1, targetId: '', title: '', cover: '' };
    if (chatState.redPacketViewMsg === undefined) chatState.redPacketViewMsg = null;
    if (chatState.envelopeAnim === undefined) chatState.envelopeAnim = false;
    
    if (chatState.transferModalOpen === undefined) chatState.transferModalOpen = false;
    if (chatState.transferForm === undefined) chatState.transferForm = { amount: null, text: '' };
    if (chatState.transferViewMsg === undefined) chatState.transferViewMsg = null;

    // ======= 状态栏相关面板响应数据 =======
    if (chatState.statusBarViewMsg === undefined) chatState.statusBarViewMsg = null;
    const statusBarForm = reactive({ id: '', name: '', regex: '', htmlTemplate: '', prompt: '', testInput: '', previewHtml: '' });

    const testStatusBarPreview = () => {
        if (!statusBarForm.regex.trim() || !statusBarForm.htmlTemplate.trim()) {
            alert('请先填写【正则提取匹配规则】和【HTML 模板】');
            return;
        }
        if (!statusBarForm.testInput.trim()) {
            alert('请输入用来测试的模拟文本');
            return;
        }

        let extractedText = '';
        try {
            let flags = 'ims';
            if (!flags.includes('g')) flags += 'g';
            let parsedRegexStr = statusBarForm.regex.replace(/:/g, '[:：]').replace(/：/g, '[:：]').replace(/<br>/gi, '(?:<br>|\\n|\\r)');
            const reg = new RegExp(parsedRegexStr, flags);
            const matches = [...statusBarForm.testInput.matchAll(reg)];
            
            if (matches.length > 0) {
                const lastMatch = matches[matches.length - 1];
                extractedText = lastMatch[1] !== undefined ? lastMatch[1].trim() : lastMatch[0].trim();
            }
        } catch (e) {
            alert('你的正则表达式好像写错了哦: ' + e.message);
            return;
        }

        if (!extractedText) {
            alert('未能使用当前正则提取到内容！\n请检查测试文本是否严格符合你填写的正则格式。');
            statusBarForm.previewHtml = '';
            return;
        }

        let html = statusBarForm.htmlTemplate;
        if (html.includes('$1')) {
            html = html.replace(/\$1/g, extractedText);
        } else {
            html += extractedText;
        }
        statusBarForm.previewHtml = html;
    };
    
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
        ...(state.contactsData?.characters || []),
        ...(state.contactsData?.npcs || [])
    ]);

    const getPersonaById = (id) => {
        let p = allPersonas.value.find(c => c && c.id === id);
        if (p) return p;
        if (chatDb.value.accounts[id] && chatDb.value.accounts[id].profile) {
            const prof = chatDb.value.accounts[id].profile;
            return { id: id, name: prof.realName || prof.nickname || '未知用户', chatName: prof.nickname || '未知用户', avatar: prof.avatar || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23dcdcdc'/%3E%3C/svg%3E", persona: prof.signature || '' };
        }
        return null;
    };

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
        
        if (!conv.settings.statusBar) conv.settings.statusBar = { enable: false, presetId: '' };
        
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

    const syncGroupConv = (conv) => {
        if (!conv || conv.type !== 'group') return;
        const grp = chatDb.value.groups[conv.targetId];
        if (!grp || !Array.isArray(grp.members)) return;
        
        grp.members.forEach(memberId => {
            if (memberId === chatState.currentUser?.id) return; 
            const memAcc = chatDb.value.accounts[memberId];
            if (memAcc) {
                let mConv = memAcc.conversations.find(c => c.targetId === conv.targetId);
                if (!mConv) {
                    mConv = {
                        id: 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                        type: 'group',
                        targetId: conv.targetId,
                        lastMsg: conv.lastMsg,
                        time: conv.time,
                        messages: [],
                        settings: {}
                    };
                    memAcc.conversations.unshift(mConv);
                }
                mConv.messages = JSON.parse(JSON.stringify(conv.messages));
                mConv.lastMsg = conv.lastMsg;
                mConv.time = conv.time;
            }
        });
    };

    const syncConvAuto = (conv) => {
        if (!conv) return;
        if (conv.type === 'group') syncGroupConv(conv);
        else syncTargetConv(conv);
    };

    const activeRawConv = computed(() => {
        if (!chatState.activeConvId || !currentAccountData.value) return null;
        return safeArr(currentAccountData.value.conversations).find(c => c.id === chatState.activeConvId) || null;
    });

    const activeConvSettings = computed(() => {
        const conv = activeRawConv.value;
        if (!conv) return { beautify: {} };
        const s = conv.settings || {};
        const b = s.beautify || {};
        
        return {
            remarkName: s.remarkName || '',
            coupleAvatar: s.coupleAvatar || false,
            coupleAvatarDesc: s.coupleAvatarDesc || '',
            worldbooks: Array.isArray(s.worldbooks) ? s.worldbooks : [],
            timeMode: s.timeMode || 'auto',
            virtualTime: s.virtualTime || '',
            realTimeZone: s.realTimeZone || 'Asia/Shanghai',
            foreignMode: s.foreignMode || false,
            foreignLang: s.foreignLang || 'English',
            allowRoleAutoEdit: s.allowRoleAutoEdit !== undefined ? s.allowRoleAutoEdit : true,
            injectHistoryCount: s.injectHistoryCount !== undefined ? s.injectHistoryCount : 20,
            injectMemoryCount: s.injectMemoryCount !== undefined ? s.injectMemoryCount : 30,
            statusBar: s.statusBar || { enable: false, presetId: '' },
            beautify: {
                bg: b.bg || '',
                showAvatar: b.showAvatar !== undefined ? b.showAvatar : true,
                showName: b.showName !== undefined ? b.showName : false,
                showTime: b.showTime !== undefined ? b.showTime : false,
                timePos: b.timePos || 'bottom',
                meBg: b.meBg || '#333333',
                meText: b.meText || '#ffffff',
                meRadius: b.meRadius !== undefined ? b.meRadius : 18,
                meOpacity: b.meOpacity !== undefined ? b.meOpacity : 1,
                opBg: b.opBg || '#ffffff',
                opText: b.opText || '#333333',
                opRadius: b.opRadius !== undefined ? b.opRadius : 18,
                opOpacity: b.opOpacity !== undefined ? b.opOpacity : 1,
                customCss: b.customCss || ''
            }
        };
    });

    const activeTargetPersona = computed(() => {
        const conv = activeRawConv.value;
        if (!conv) return {};
        if (conv.targetId === 'system') return { id: 'system', name: '系统安全中心', chatName: '系统安全中心' };
        if (conv.targetId === 'draft') return { id: 'draft', name: '草稿箱', chatName: '草稿箱' };
        if (conv.targetId === 'accounting') return { id: 'accounting', name: '记账系统', chatName: '记账系统' };
        
        let p = allPersonas.value.find(c => c && c.id === conv.targetId);
        if (p) {
            return {
                ...p,
                chatName: p.chatName !== undefined ? p.chatName : (p.name || ''),
                persona: p.persona !== undefined ? p.persona : '',
                phone: p.phone !== undefined ? p.phone : '',
                email: p.email !== undefined ? p.email : '',
                chatAcc: p.chatAcc !== undefined ? p.chatAcc : '',
                chatPwd: p.chatPwd !== undefined ? p.chatPwd : '',
                phoneLockType: p.phoneLockType !== undefined ? p.phoneLockType : 'num'
            };
        }
        return {};
    });

    const activeTargetAccount = computed(() => {
        const conv = activeRawConv.value;
        if (!conv) return null;
        return state.chatData.accounts[conv.targetId] || null;
    });

    const activeConv = computed(() => {
        const conv = activeRawConv.value;
        const target = activeTargetPersona.value;
        const targetAcc = activeTargetAccount.value;

        if (!conv) return null;
        if (conv.targetId === 'system') {
            return { ...conv, name: '系统安全中心', avatar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 32 32' fill='none' stroke='%231890ff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/%3E%3C/svg%3E", status: '系统保护中', statusColor: '#1890ff' };
        }
        if (conv.targetId === 'draft') {
            return { ...conv, name: '草稿箱', avatar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 32 32' fill='none' stroke='%23faad14' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'/%3E%3Cpath d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'/%3E%3C/svg%3E", status: '私密备忘', statusColor: '#faad14' };
        }
        if (conv.targetId === 'accounting') {
            return { ...conv, name: '记账系统', avatar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 32 32' fill='none' stroke='%2352c41a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='2' y='5' width='20' height='14' rx='2'/%3E%3Cpath d='M2 10h20'/%3E%3C/svg%3E", status: '钱包账单', statusColor: '#52c41a' };
        }
        if (conv.type === 'group') {
            const grp = chatDb.value.groups?.[conv.targetId];
            return { ...conv, name: grp?.name || '未知群聊', avatar: grp?.customAvatar || '', isComposite: !grp?.customAvatar, groupId: conv.targetId, status: `${grp?.members?.length || 0} 人`, statusColor: '#9e9e9e' };
        }
        
        const remarkName = String(conv.settings?.remarkName || '').trim();
        const fallbackName = targetAcc?.profile?.nickname || targetAcc?.profile?.realName || '未知用户';
        const fallbackAvatar = targetAcc?.profile?.avatar || '';

        return {
            ...conv,
            name: remarkName || target?.chatName || target?.name || fallbackName,
            avatar: target?.avatar || fallbackAvatar,
            status: targetAcc?.status || '在线',
            statusColor: targetAcc?.statusColor || '#52c41a'
        };
    });

    const renderStatusBarHTML = (msg, customConv = null) => {
        if (!msg || !msg.statusBarText) return '';
        const conv = customConv || activeRawConv.value;
        if (!conv || !conv.settings || !conv.settings.statusBar || !conv.settings.statusBar.enable) return '';
        
        const presetId = conv.settings.statusBar.presetId;
        const preset = state.contactsData.statusBarPresets?.find(p => p.id === presetId);
        if (!preset) return `<div style="font-size:10px; color:#888;">[状态栏] ${msg.statusBarText}</div>`;

        let html = preset.htmlTemplate || '';
        if (html.includes('\$1')) {
            html = html.replace(/\$1/g, msg.statusBarText);
        } else {
            html += msg.statusBarText;
        }
        return html;
    };

    const extractAndRemoveStatusBar = (rawBuffer, conv) => {
        let extractedStatusBarText = '';
        let newBuffer = String(rawBuffer || '');
        
        if (!conv || !conv.settings || !conv.settings.statusBar || !conv.settings.statusBar.enable) {
            return { extractedStatusBarText, newBuffer };
        }

        const presetId = conv.settings.statusBar.presetId;
        const preset = state.contactsData.statusBarPresets?.find(p => p.id === presetId);
        
        const tryRegex = (regexStr) => {
            if (!regexStr) return false;
            try {
                let flags = 'ims';
                if (!flags.includes('g')) flags += 'g';
                let parsedRegexStr = regexStr.replace(/<br>/gi, '(?:<br>|\\n|\\r)');
                const reg = new RegExp(parsedRegexStr, flags);
                const matches = [...newBuffer.matchAll(reg)];
                if (matches.length > 0) {
                    const lastMatch = matches[matches.length - 1];
                    extractedStatusBarText = lastMatch[1] !== undefined ? lastMatch[1].trim() : lastMatch[0].trim();
                    for (const m of matches) {
                        newBuffer = newBuffer.replace(m[0], '');
                    }
                    newBuffer = newBuffer.trim();
                    return true;
                }
            } catch (e) {
                console.error('状态栏正则解析失败：', e);
            }
            return false;
        };

        if (preset && preset.regex) {
            let safeRegex = preset.regex.replace(/:/g, '[:：]').replace(/：/g, '[:：]');
            if (tryRegex(safeRegex)) return { extractedStatusBarText, newBuffer };
            if (tryRegex(preset.regex)) return { extractedStatusBarText, newBuffer };
        }

        if (tryRegex('\\[(?:状态栏|隐藏心声|内心独白|心里话)[:：]?\\s*([\\s\\S]*?)\\]')) {
            return { extractedStatusBarText, newBuffer };
        }
        
        if (tryRegex('\\[([^\\]]*?(?:Action|Thought|Draft|Action:|Thought:|Draft:)[:：]?[\\s\\S]*?)\\]')) {
            return { extractedStatusBarText, newBuffer };
        }

        return { extractedStatusBarText, newBuffer };
    };

    const activeMessages = computed(() => {
        const conv = activeRawConv.value;
        if (!conv) return [];
        const msgs = safeArr(conv.messages).map(m => {
            let processedMsg = { ...m };
            if (conv.type === 'group' && m.senderId !== chatState.currentUser?.id && m.type !== 'sys') {
                const p = getPersonaById(m.senderId);
                processedMsg.senderAvatar = p?.avatar || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23dcdcdc'/%3E%3C/svg%3E";
                processedMsg.senderDisplayName = p?.chatName || p?.name || '未知';
            }
            if (processedMsg.statusBarText) {
                // 优先读取已固化在底层的 HTML，没有则用最新的模板生成
                processedMsg.statusBarRenderedHtml = processedMsg.statusBarRenderedHtml || renderStatusBarHTML(processedMsg);
            }
            return processedMsg;
        });
        if (msgs.length <= chatState.displayMessageCount) return msgs;
        return msgs.slice(msgs.length - chatState.displayMessageCount);
    });

    const hasMoreMessages = computed(() => {
        const conv = activeRawConv.value;
        if (!conv) return false;
        return safeArr(conv.messages).length > chatState.displayMessageCount;
    });

    const loadMoreMessages = () => {
        const el = document.querySelector('.ca-detail-messages');
        const oldScrollHeight = el ? el.scrollHeight : 0;
        chatState.displayMessageCount += 60;
        nextTick(() => { if (el) { const newScrollHeight = el.scrollHeight; el.scrollTop = el.scrollTop + (newScrollHeight - oldScrollHeight); } });
    };

    const timeZoneOptions = ['Asia/Shanghai','Asia/Tokyo','Asia/Seoul','Asia/Singapore','Europe/London','Europe/Paris','America/New_York','America/Los_Angeles'];
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const getMsgTimestamp = (msg) => {
        if (!msg) return 0;
        if (msg.timestamp) return msg.timestamp;
        const match = msg.id.match(/^m_(\d+)/);
        if (match) return parseInt(match[1]);
        return 0;
    };

    const shouldShowTimeGap = (msg, index, msgsArr) => {
        const ts = getMsgTimestamp(msg);
        if (!ts) return false;
        if (index === 0) return true;
        const prevMsg = msgsArr[index - 1];
        const prevTs = getMsgTimestamp(prevMsg);
        if (!prevTs) return true;
        return (ts - prevTs) > 20 * 60 * 1000;
    };

    const formatTimeGap = (msg) => {
        const ts = getMsgTimestamp(msg);
        if (!ts) return msg.time || '';
        const date = new Date(ts);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
        const diffDays = Math.floor((today - targetDay) / (1000 * 60 * 60 * 24));
        const h = String(date.getHours()).padStart(2, '0');
        const m = String(date.getMinutes()).padStart(2, '0');
        const timeStr = `${h}:${m}`;
        
        if (diffDays === 0) return timeStr;
        if (diffDays === 1) return `昨天 ${timeStr}`;
        if (diffDays === 2) return `前天 ${timeStr}`;
        if (diffDays < 30) return `${diffDays}天前 ${timeStr}`;
        if (diffDays < 365) return `${date.getMonth()+1}月${date.getDate()}日 ${timeStr}`;
        return `${date.getFullYear()}年${date.getMonth()+1}月${date.getDate()}日 ${timeStr}`;
    };

    const getMessageById = (msgId) => {
        const conv = activeRawConv.value;
        if (!conv || !msgId) return null;
        return (conv.messages || []).find(m => m.id === msgId) || null;
    };

    const buildQuoteData = (msg) => {
        if (!msg) return null;
        const isMe = msg.senderId === chatState.currentUser?.id;
        return {
            id: msg.id, senderId: msg.senderId,
            senderName: isMe ? (currentAccountData.value?.profile?.nickname || chatState.currentUser?.chatName || chatState.currentUser?.name || '我') : (activeConv.value?.name || activeTargetPersona.value?.chatName || activeTargetPersona.value?.name || '对方'),
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

    let pressStartX = 0; let pressStartY = 0;
    const onMessagePressStart = (msg, event) => {
        if (chatState.isMultiSelectMode) return;
        clearTimeout(longPressTimer);
        let touch = event.touches ? event.touches[0] : event;
        pressStartX = touch.clientX; pressStartY = touch.clientY;
        longPressTimer = setTimeout(() => { openMessageMenu(msg, pressStartX, pressStartY); }, 400);
    };

    const onMessagePressMove = (event) => {
        let touch = event.touches ? event.touches[0] : event;
        if (Math.abs(touch.clientX - pressStartX) > 10 || Math.abs(touch.clientY - pressStartY) > 10) clearTimeout(longPressTimer);
    };

    const onMessagePressEnd = () => clearTimeout(longPressTimer);
    const cancelQuoteMessage = () => chatState.quoteMsgId = null;

    const enterMultiSelect = () => {
        const msgId = chatState.messageMenuMsgId;
        chatState.isMultiSelectMode = true;
        chatState.selectedMsgIds = msgId ? [msgId] : [];
        closeMessageMenu();
    };

    const toggleSelectMsg = (msg, event) => {
        if (!chatState.isMultiSelectMode) { msg.showTrans = !msg.showTrans; return; }
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
            conv.lastMsg = last.text || conv.lastMsg; conv.time = last.time || conv.time;
        } else {
            conv.lastMsg = ''; conv.time = '';
        }
        syncConvAuto(conv);
        chatState.isMultiSelectMode = false; chatState.selectedMsgIds = [];
        nextTick(() => { if (window.lucide) window.lucide.createIcons(); });
    };

    const cancelMultiSelect = () => { chatState.isMultiSelectMode = false; chatState.selectedMsgIds = []; };

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

        let rawBuffer = chatState.rawEditText;
        const { extractedStatusBarText: globalStatusBarText, newBuffer } = extractAndRemoveStatusBar(rawBuffer, conv);
        rawBuffer = newBuffer;

        const newBatchId = chatState.rawEditBatchId || ('batch_' + Date.now());
        const generatedIds = [];
        const foreignMode = activeConvSettings.value?.foreignMode;

        const extracted = extractMetaBlocks(rawBuffer);
        let safeText = String(extracted.visibleText)
            .replace(/^(内容:|内容：|回复:|回复：|消息:|消息：)\s*/gi, '')
            .replace(/(内容:|内容：|回复:|回复：|消息:|消息：)/g, '[[MSG]]')
            .replace(/\n/g, '[[MSG]]');
        const blocks = safeText.split('[[MSG]]').map(s => s.trim()).filter(Boolean);

        const newMessages = [];
        const grp = conv.type === 'group' ? chatDb.value.groups?.[conv.targetId] : null;

        blocks.forEach((b, idx) => {
            const parsed = parseMsgBlock(b, foreignMode);
            if (parsed && parsed.text) {
                let actualSenderId = msg.senderId;
                let finalMsgText = parsed.text;

                if (conv.type === 'group' && grp) {
                    const match = finalMsgText.match(/^([^:：\n]+)[:：]\s*([\s\S]*)$/);
                    if (match) {
                        const sName = match[1].trim();
                        const sContent = match[2].trim();
                        let matchedId = grp.members.find(id => {
                            const p = getPersonaById(id);
                            return p && (p.chatName === sName || p.name === sName);
                        });
                        if (!matchedId && (sName === '我' || sName === chatState.currentUser?.chatName || sName === chatState.currentUser?.name)) {
                            matchedId = chatState.currentUser?.id;
                        }
                        if (matchedId) { actualSenderId = matchedId; finalMsgText = sContent; }
                    }
                }

                const isLast = idx === blocks.length - 1;

                const newMsg = {
                    id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
                    batchId: newBatchId,
                    fullRawText: chatState.rawEditText,
                    senderId: actualSenderId,
                    text: finalMsgText,
                    translation: parsed.translation,
                    showTrans: false,
                    recalled: false,
                    statusBarText: isLast ? globalStatusBarText : '',
                    statusBarRenderedHtml: (isLast && globalStatusBarText) ? renderStatusBarHTML({ statusBarText: globalStatusBarText }, conv) : '',
                    time: msgsToRemove[0]?.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
                newMessages.push(newMsg);
                generatedIds.push(newMsg.id);
            }
        });

        if (blocks.length === 0 && globalStatusBarText) {
            const newMsg = {
                id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
                batchId: newBatchId,
                fullRawText: chatState.rawEditText,
                senderId: msg.senderId,
                text: '',
                translation: '',
                showTrans: false,
                recalled: false,
                statusBarText: globalStatusBarText,
                statusBarRenderedHtml: renderStatusBarHTML({ statusBarText: globalStatusBarText }, conv),
                time: msgsToRemove[0]?.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            newMessages.push(newMsg);
            generatedIds.push(newMsg.id);
        }

        if (insertIndex >= 0) conv.messages.splice(insertIndex, 0, ...newMessages);
        else conv.messages.push(...newMessages);

        if (activeConvSettings.value?.allowRoleAutoEdit !== false && extracted.profileUpdates) {
            applyRoleAutoUpdates(target, extracted.profileUpdates, conv, generatedIds);
        }
        if (extracted.msgMeta && extracted.msgMeta.actions && extracted.msgMeta.actions.length > 0) {
            applyMsgMetaActions(extracted.msgMeta, conv, generatedIds, target);
        }
        
        const normalMsgs = conv.messages.filter(m => m.type !== 'sys' && !m.recalled);
        if (normalMsgs.length) {
            const last = normalMsgs[normalMsgs.length - 1];
            conv.lastMsg = last.text || conv.lastMsg; conv.time = last.time || conv.time;
        }
        syncConvAuto(conv);
        chatState.rawEditModalOpen = false; chatState.rawEditMsgId = null; chatState.rawEditBatchId = null; chatState.rawEditText = '';
        scrollToBottom();
    };

    const quoteSourceMessage = computed(() => getMessageById(chatState.quoteMsgId));

    const quoteMessage = () => {
        const msg = getMessageById(chatState.messageMenuMsgId);
        if (!msg) return;
        chatState.quoteMsgId = msg.id; closeMessageMenu();
    };

    const favoriteMessage = () => {
        const msg = getMessageById(chatState.messageMenuMsgId);
        if (!msg || !currentAccountData.value) return;
        if (!Array.isArray(currentAccountData.value.favorites)) currentAccountData.value.favorites = [];

        const existedIndex = currentAccountData.value.favorites.findIndex(item => item?.type === 'message' && item?.convId === activeRawConv.value?.id && item?.msgId === msg.id);

        if (existedIndex >= 0) {
            currentAccountData.value.favorites.splice(existedIndex, 1); alert('已取消收藏');
        } else {
            currentAccountData.value.favorites.unshift({
                type: 'message', convId: activeRawConv.value?.id || '', msgId: msg.id,
                title: buildQuoteData(msg)?.senderName || '收藏消息', content: msg.text || '', time: msg.time || ''
            });
            alert('已收藏');
        }
        closeMessageMenu();
    };

    const editMessageModal = () => {
        const msg = getMessageById(chatState.messageMenuMsgId);
        if (!msg) return;
        chatState.editMsgId = msg.id; chatState.editMsgText = msg.text || ''; chatState.editMsgModalOpen = true; closeMessageMenu();
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
            syncConvAuto(activeRawConv.value);
        }
        chatState.editMsgModalOpen = false; chatState.editMsgId = null; chatState.editMsgText = ''; scrollToBottom();
    };

    const cancelEditMessage = () => { chatState.editMsgModalOpen = false; chatState.editMsgId = null; chatState.editMsgText = ''; };

    const deleteMessage = () => {
        const msg = getMessageById(chatState.messageMenuMsgId); const conv = activeRawConv.value;
        if (!msg || !conv) return;
        if (!confirm('确定删除这条消息吗？')) return;

        conv.messages = (conv.messages || []).filter(item => item.id !== msg.id);
        if (chatState.quoteMsgId === msg.id) chatState.quoteMsgId = null;

        const normalMsgs = conv.messages.filter(m => m.type !== 'sys' && !m.recalled);
        if (normalMsgs.length) {
            const last = normalMsgs[normalMsgs.length - 1];
            conv.lastMsg = last.text || conv.lastMsg; conv.time = last.time || conv.time;
        } else {
            conv.lastMsg = ''; conv.time = '';
        }
        syncConvAuto(conv); closeMessageMenu();
    };

    const recallMessage = () => {
        const msg = getMessageById(chatState.messageMenuMsgId);
        if (!msg) return;
        msg.recalled = true; syncConvAuto(activeRawConv.value); closeMessageMenu(); scrollToBottom();
    };

    const appendAssistantBlocksSequentially = async (conv, senderId, blocks, foreignMode, insertedAssistantIds = [], batchId, fullRawText, externalStatusBarText = '') => {
        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            const parsed = parseMsgBlock(block, foreignMode) || { text: '', translation: '' };

            const safeText = sanitizeAssistantVisibleText(parsed.text);
            // 允许没有正文但有状态栏的情况通过
            if (!safeText && !externalStatusBarText) continue;

            let finalMsgText = safeText;
            let extractedStatusBarText = i === blocks.length - 1 ? externalStatusBarText : '';

            // 这里不再做二次正则匹配，因为外层已经被【霸道截断逻辑】全局处理过，避免误伤
            
            const typingDelay = Math.min(300 + (finalMsgText.length * (50 + Math.random() * 30)), 3000);
            
            chatState.isTyping = true;
            chatState.typingText = '对方正在输入中...';

            if (finalMsgText) await sleep(typingDelay);

            const msg = {
                id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
                batchId,
                fullRawText,
                senderId,
                text: finalMsgText,
                translation: parsed.translation,
                showTrans: false,
                recalled: false,
                statusBarText: extractedStatusBarText,
                statusBarRenderedHtml: (extractedStatusBarText) ? renderStatusBarHTML({ statusBarText: extractedStatusBarText }, conv) : '',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            conv.messages.push(msg);
            insertedAssistantIds.push(msg.id);
            conv.lastMsg = finalMsgText;
            conv.time = msg.time;
            syncConvAuto(conv);
            scrollToBottom();
        }
        chatState.isTyping = false;
        chatState.typingText = '';
    };

    const refreshIcons = () => nextTick(() => window.lucide && window.lucide.createIcons());

    const openConversation = (conv) => {
        chatState.activeConvId = conv.id;
        chatState.isDetailOpen = true;
        chatState.isDetailSettingsOpen = false;
        chatState.detailInput = '';
        chatState.showBottomMenu = false;
        chatState.displayMessageCount = 60;
        chatState.activeGroupEditMemberId = '';
        const rawConv = currentAccountData.value.conversations.find(c => c.id === conv.id);
        if (rawConv) {
            if (!rawConv.messages) rawConv.messages = [];
            if (rawConv.targetId !== 'system') {
                const targetAcc = chatDb.value.accounts[rawConv.targetId];
                if (targetAcc) {
                    let tConv = targetAcc.conversations.find(c => c.targetId === chatState.currentUser.id);
                    if (tConv && tConv.messages && tConv.messages.length > rawConv.messages.length) {
                        rawConv.messages = JSON.parse(JSON.stringify(tConv.messages));
                        rawConv.lastMsg = tConv.lastMsg || rawConv.lastMsg;
                        rawConv.time = tConv.time || rawConv.time;
                    } else if (tConv && rawConv.messages.length > (tConv.messages ? tConv.messages.length : 0)) {
                        tConv.messages = JSON.parse(JSON.stringify(rawConv.messages));
                        tConv.lastMsg = rawConv.lastMsg || tConv.lastMsg;
                        tConv.time = rawConv.time || tConv.time;
                    }
                }
            }
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
        syncConvAuto(conv);
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
        t = t.replace(/\[{1,2}EMOJI:\s*(.+?)\s*\|\s*(.+?)\s*\]{1,2}/gi, '[[EMOJI:\$1]]');
        t = t.replace(/\[{1,2}PHOTO:\s*(.+?)\s*\]{1,2}/gi, '[[PHOTO:\$1]]');

        t = t.replace(/\[MsgId:\s*[^\]]+\]\s*/gi, '');
        t = t.replace(/\[QuoteRef:\s*[^\]]+\]\s*/gi, '');
        t = t.replace(/消息ID:[^\n]*\n?/gi, '');
        t = t.replace(/引用ID:[^\n]*\n?/gi, '');
        t = t.replace(/引用内容:[^\n]*\n?/gi, '');
        t = t.replace(/\[\[MSG_META\]\][\s\S]*$/gi, '').trim();
        t = t.replace(/\[\[PROFILE_UPDATE\]\][\s\S]*$/gi, '').trim();
        
        t = t.replace(/^(内容:|内容：|回复:|回复：|消息:|消息：)\s*/gi, '');
        t = t.replace(/(内容:|内容：)/g, '\n');
        
        t = t.replace(/\[{1,2}QUOTE:.*?\]{1,2}/gi, '');
        t = t.replace(/\[{1,2}FAVORITE:.*?\]{1,2}/gi, '');
        t = t.replace(/\[{1,2}RECALL.*?\]{1,2}/gi, '');
        t = t.replace(/\[{1,2}LOGIN:.*?\]{1,2}/gi, '');
        t = t.replace(/\[{1,2}RECEIVE_REDPACKET:.*?\]{1,2}/gi, '');
        t = t.replace(/\[{1,2}REDPACKET:.*?\]{1,2}/gi, '');
        t = t.replace(/\[{1,2}RECEIVE_TRANSFER:.*?\]{1,2}/gi, '');
        t = t.replace(/\[{1,2}TRANSFER:.*?\]{1,2}/gi, '');
        t = t.replace(/\{[\s]*"actions"\s*:\s*\[[\s\S]*?\]\s*\}/gi, '');
        
        return t.trim();
    };

    const extractMetaBlocks = (rawText) => {
        const raw = String(rawText || '');
        
        let msgMeta = { actions: [] };
        let profileUpdates = null;
        
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

        const recallMatches = raw.match(/\[{1,2}RECALL(?::\s*(m_[a-zA-Z0-9_]+))?\]{1,2}/gi);
        if (recallMatches) recallMatches.forEach(m => {
            const id = m.match(/m_[a-zA-Z0-9_]+/i)?.[0];
            msgMeta.actions.push({ type: 'recall', msgId: id ? id.trim() : 'LAST' });
        });

        const recvRpMatches = raw.match(/\[{1,2}RECEIVE_REDPACKET:\s*(m_[a-zA-Z0-9_]+)\]{1,2}/gi);
        if (recvRpMatches) recvRpMatches.forEach(m => {
            const id = m.match(/m_[a-zA-Z0-9_]+/i)?.[0];
            if (id) msgMeta.actions.push({ type: 'receive_redpacket', msgId: id.trim() });
        });

        const sendRpMatches = raw.match(/\[{1,2}REDPACKET:\s*([\d\.]+)\s*\|\s*([^\]\|]+)(?:\|\s*([^\]]+))?\]{1,2}/gi);
        if (sendRpMatches) sendRpMatches.forEach(m => {
            const parts = m.match(/REDPACKET:\s*([\d\.]+)\s*\|\s*([^\]\|]+)(?:\|\s*([^\]]+))?/i);
            if (parts) msgMeta.actions.push({ type: 'send_redpacket', amount: parseFloat(parts[1]), title: parts[2] ? parts[2].trim() : '', specificName: parts[3] ? parts[3].trim() : '' });
        });

        const sendTransferMatches = raw.match(/\[{1,2}TRANSFER:\s*([\d\.]+)(?:\s*\|\s*([^\]]+))?\]{1,2}/gi);
        if (sendTransferMatches) sendTransferMatches.forEach(m => {
            const parts = m.match(/TRANSFER:\s*([\d\.]+)(?:\s*\|\s*([^\]]+))?/i);
            if (parts) msgMeta.actions.push({ type: 'send_transfer', amount: parseFloat(parts[1]), text: parts[2] ? parts[2].trim() : '转账' });
        });

        const recvTransferMatches = raw.match(/\[{1,2}RECEIVE_TRANSFER:\s*(m_[a-zA-Z0-9_]+)\]{1,2}/gi);
        if (recvTransferMatches) recvTransferMatches.forEach(m => {
            const id = m.match(/m_[a-zA-Z0-9_]+/i)?.[0];
            if (id) msgMeta.actions.push({ type: 'receive_transfer', msgId: id.trim() });
        });

        const pubMomMatches = raw.match(/\[{1,2}PUBLISH_MOMENT:\s*([\s\S]+?)\]{1,2}/gi);
        if (pubMomMatches) pubMomMatches.forEach(m => {
            const content = m.match(/PUBLISH_MOMENT:\s*([\s\S]+?)\]{1,2}/i)?.[1];
            if (content) {
                const parts = content.split('|').map(s => s.trim());
                const text = parts[0] || '';
                const fakeImg = parts.length > 1 ? parts[1] : '';
                const perm = parts.length > 2 ? parts[2] : '公开';
                msgMeta.actions.push({ type: 'publish_moment', text, fakeImageText: fakeImg, permission: perm });
            }
        });

        const likeMomMatches = raw.match(/\[{1,2}LIKE_MOMENT:\s*([a-zA-Z0-9_]+)\]{1,2}/gi);
        if (likeMomMatches) likeMomMatches.forEach(m => {
            const id = m.match(/LIKE_MOMENT:\s*([a-zA-Z0-9_]+)/i)?.[1];
            if (id) msgMeta.actions.push({ type: 'like_moment', momentId: id.trim() });
        });

        const cmtMomMatches = raw.match(/\[{1,2}COMMENT_MOMENT:\s*([a-zA-Z0-9_]+)\s*\|\s*([\s\S]+?)\]{1,2}/gi);
        if (cmtMomMatches) cmtMomMatches.forEach(m => {
            const parts = m.match(/COMMENT_MOMENT:\s*([a-zA-Z0-9_]+)\s*\|\s*([\s\S]+?)\]{1,2}/i);
            if (parts && parts[1] && parts[2]) msgMeta.actions.push({ type: 'comment_moment', momentId: parts[1].trim(), text: parts[2].trim() });
        });

        const favMomMatches = raw.match(/\[{1,2}FAVORITE_MOMENT:\s*([a-zA-Z0-9_]+)\]{1,2}/gi);
        if (favMomMatches) favMomMatches.forEach(m => {
            const id = m.match(/FAVORITE_MOMENT:\s*([a-zA-Z0-9_]+)/i)?.[1];
            if (id) msgMeta.actions.push({ type: 'favorite_moment', momentId: id.trim() });
        });

        const fwdMomMatches = raw.match(/\[{1,2}FORWARD_MOMENT:\s*([a-zA-Z0-9_]+)\]{1,2}/gi);
        if (fwdMomMatches) fwdMomMatches.forEach(m => {
            const id = m.match(/FORWARD_MOMENT:\s*([a-zA-Z0-9_]+)/i)?.[1];
            if (id) msgMeta.actions.push({ type: 'forward_moment', momentId: id.trim() });
        });

        const loginMatches = raw.match(/\[{1,2}LOGIN:\s*([^,\]]+)\s*,\s*([^\]]+)\]{1,2}/gi);
        if (loginMatches) loginMatches.forEach(m => {
            const parts = m.match(/LOGIN:\s*([^,\]]+)\s*,\s*([^\]]+)/i);
            if (parts && parts[1] && parts[2]) {
                msgMeta.actions.push({ type: 'login', acc: parts[1].trim(), pwd: parts[2].trim() });
            }
        });

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
            .replace(/消息ID:[^\n]*\n?/gi, '')
            .replace(/引用ID:[^\n]*\n?/gi, '')
            .replace(/引用内容:[^\n]*\n?/gi, '')
            .replace(/\[{1,2}QUOTE:.*?\]{1,2}/gi, '')
            .replace(/\[{1,2}FAVORITE:.*?\]{1,2}/gi, '')
            .replace(/\[{1,2}RECALL.*?\]{1,2}/gi, '')
            .replace(/\[{1,2}LOGIN:.*?\]{1,2}/gi, '')
            .replace(/\[{1,2}RECEIVE_REDPACKET:.*?\]{1,2}/gi, '')
            .replace(/\[{1,2}REDPACKET:.*?\]{1,2}/gi, '')
            .replace(/\[{1,2}RECEIVE_TRANSFER:.*?\]{1,2}/gi, '')
            .replace(/\[{1,2}TRANSFER:.*?\]{1,2}/gi, '')
            .replace(/\[{1,2}PUBLISH_MOMENT:.*?\]{1,2}/gi, '')
            .replace(/\[{1,2}LIKE_MOMENT:.*?\]{1,2}/gi, '')
            .replace(/\[{1,2}COMMENT_MOMENT:.*?\]{1,2}/gi, '')
            .replace(/\[{1,2}FAVORITE_MOMENT:.*?\]{1,2}/gi, '')
            .replace(/\[{1,2}FORWARD_MOMENT:.*?\]{1,2}/gi, '')
            .replace(/\{[\s]*"actions"\s*:\s*\[[\s\S]*?\]\s*\}/gi, '')
            .trim();
            
        return { visibleText, profileUpdates, msgMeta: msgMeta.actions.length ? msgMeta : null };
    };

    const finishCurrentAssistantBubble = (conv, current) => {
        if (!current || !current.id) return null;
        const msg = conv.messages.find(m => m.id === current.id);
        if (!msg) return null;
        
        const { extractedStatusBarText, newBuffer } = extractAndRemoveStatusBar((current.text || '').trim(), conv);
        let finalMsgText = newBuffer;

        msg.text = finalMsgText;
        msg.statusBarText = extractedStatusBarText;
        if (extractedStatusBarText) msg.statusBarRenderedHtml = renderStatusBarHTML({ statusBarText: extractedStatusBarText }, conv);
        msg.translation = (current.translation || '').trim();
        
        if (!msg.text && !msg.statusBarText) {
            conv.messages = conv.messages.filter(m => m.id !== current.id);
            return null;
        }
        conv.lastMsg = msg.text || '[状态栏信息]';
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
            statusBarText: '',
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
                    const targetMsgs = conv.messages.filter(m => m.senderId === targetPersona.id && !m.recalled && !generatedIds.includes(m.id));
                    if (targetMsgs.length > 0) {
                        targetMsgs[targetMsgs.length - 1].recalled = true;
                    }
                }
            }

            if (act.type === 'receive_redpacket' && act.msgId) {
                const targetMsg = conv.messages.find(m => m.id === act.msgId);
                if (targetMsg && targetMsg.redpacket && targetMsg.redpacket.status === 'pending') {
                    const rp = targetMsg.redpacket;
                    // 如果是群专属红包，但被指定的 targetId 不是当前 AI，直接拦截，拒绝领取
                    if (rp.type === 'group_specific' && rp.targetId !== targetPersona.id) {
                        return; 
                    }
                    // 防重复领取
                    if (rp.receivers.some(r => r.id === targetPersona.id)) return;

                    let grabAmount = 0;
                    if (rp.type === 'group_random') {
                        grabAmount = rp.randomAmounts.pop();
                        rp.count--;
                        if (rp.count <= 0) rp.status = 'empty';
                    } else {
                        grabAmount = rp.amount;
                        rp.status = 'received';
                    }

                    rp.receivers.push({ id: targetPersona.id, amount: grabAmount, time: new Date().toLocaleTimeString() });
                    const targetAcc = chatDb.value.accounts[targetPersona.id];
                    if (targetAcc && targetAcc.wallet) targetAcc.wallet.balance += grabAmount;
                    
                    let noticeStr = conv.type === 'group' ? `"${targetPersona.name || targetPersona.chatName}" 领取了红包` : `对方领取了你的红包`;
                    addSystemNotice(conv, noticeStr, generatedIds);
                }
            }

            if (act.type === 'send_redpacket') {
                const rpId = 'rp_' + Date.now();
                const targetAcc = chatDb.value.accounts[targetPersona.id];
                if (targetAcc && targetAcc.wallet) {
                    const actualAmt = Math.min(targetAcc.wallet.balance, act.amount);
                    if (actualAmt > 0) {
                        targetAcc.wallet.balance -= actualAmt;
                        
                        let rpType = conv.type === 'group' ? 'group_random' : 'single';
                        let rpCount = conv.type === 'group' ? Math.max(2, Math.floor(Math.random() * 5) + 1) : 1;
                        let targetId = null;

                        if (conv.type === 'group' && act.specificName) {
                            rpType = 'group_specific';
                            rpCount = 1;
                            if (act.specificName === '我' || act.specificName === chatState.currentUser?.name || act.specificName === chatState.currentUser?.chatName) {
                                targetId = chatState.currentUser?.id;
                            } else {
                                const grp = chatDb.value.groups[conv.targetId];
                                if (grp && grp.members) {
                                    targetId = grp.members.find(mid => {
                                        const p = getPersonaById(mid);
                                        return p && (p.name === act.specificName || p.chatName === act.specificName);
                                    });
                                }
                            }
                        }

                        let amounts = [actualAmt];
                        if (rpType === 'group_random') {
                            amounts = []; let remain = actualAmt;
                            for (let i = 0; i < rpCount - 1; i++) {
                                let max = (remain / (rpCount - i)) * 2;
                                let amt = Math.max(0.01, Math.random() * max);
                                amt = Math.floor(amt * 100) / 100;
                                amounts.push(amt); remain -= amt;
                            }
                            amounts.push(Math.floor(remain * 100) / 100);
                        }

                        conv.messages.push({
                            id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
                            senderId: targetPersona.id, text: '[红包]',
                            redpacket: { 
                                id: rpId, type: rpType, amount: actualAmt, count: rpCount, title: act.title, cover: '', status: 'pending', 
                                senderId: targetPersona.id, targetId: targetId, receivers: [],
                                randomAmounts: amounts
                            },
                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        });
                    }
                }
            }

            if (act.type === 'receive_transfer' && act.msgId) {
                const targetMsg = conv.messages.find(m => m.id === act.msgId);
                if (targetMsg && targetMsg.transfer && targetMsg.transfer.status === 'pending') {
                    if (targetMsg.senderId === targetPersona.id) return; // 不能自己收自己的
                    const tf = targetMsg.transfer;
                    tf.status = 'received';
                    tf.receiveTime = new Date().toLocaleTimeString();

                    const targetAcc = chatDb.value.accounts[targetPersona.id];
                    if (targetAcc && targetAcc.wallet) targetAcc.wallet.balance += tf.amount;
                    
                    addSystemNotice(conv, `对方接收了你的转账`, generatedIds);
                }
            }

            if (act.type === 'send_transfer') {
                const tfId = 'tf_' + Date.now();
                const targetAcc = chatDb.value.accounts[targetPersona.id];
                if (targetAcc && targetAcc.wallet) {
                    const actualAmt = Math.min(targetAcc.wallet.balance, act.amount);
                    if (actualAmt > 0) {
                        targetAcc.wallet.balance -= actualAmt;
                        conv.messages.push({
                            id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
                            senderId: targetPersona.id, text: '[转账]',
                            transfer: { 
                                id: tfId, amount: actualAmt, text: act.text || '转账', status: 'pending', 
                                senderId: targetPersona.id, targetId: chatState.currentUser.id
                            },
                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        });
                    }
                }
            }

            if (act.type === 'publish_moment' && (act.text || act.fakeImageText)) {
                const acc = chatDb.value.accounts[targetPersona.id];
                if (acc && acc.profile) {
                    if (!acc.profile.moments) acc.profile.moments = [];
                    const hasFakeImg = !!act.fakeImageText;
                    
                    let vis = 'all';
                    let targets = [];
                    const permStr = act.permission || '公开';
                    
                    if (permStr.includes('私密')) vis = 'self';
                    else if (permStr.includes('仅') && permStr.includes('可见')) {
                        vis = 'include';
                        let nameStr = permStr.replace(/仅|可见/g, '').trim();
                        let names = nameStr.split(/[,，、\s]+/).filter(Boolean);
                        names.forEach(name => {
                            if (name === '你' || name === '当前用户' || name === chatState.currentUser.name || name === chatState.currentUser.chatName) {
                                targets.push(chatState.currentUser.id);
                            } else {
                                let p = findPersonaByLooseRef(null, name);
                                if (p) targets.push(p.id);
                            }
                        });
                    }
                    else if (permStr.includes('不给') && permStr.includes('看')) {
                        vis = 'exclude';
                        let nameStr = permStr.replace(/不给|看/g, '').trim();
                        let names = nameStr.split(/[,，、\s]+/).filter(Boolean);
                        names.forEach(name => {
                            if (name === '你' || name === '当前用户' || name === chatState.currentUser.name || name === chatState.currentUser.chatName) {
                                targets.push(chatState.currentUser.id);
                            } else {
                                let p = findPersonaByLooseRef(null, name);
                                if (p) targets.push(p.id);
                            }
                        });
                    }

                    acc.profile.moments.unshift({
                        id: 'mom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                        text: act.text || '', 
                        imageType: hasFakeImg ? 'fake' : 'real', 
                        image: '', 
                        fakeImageText: act.fakeImageText || '',
                        visibility: vis, visibleTargets: targets,
                        timestamp: Date.now(), time: new Date().toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
                        likes: [], comments: [], pinned: false
                    });
                    
                    let noticeStr = '新动态';
                    if (vis === 'self') noticeStr = '私密动态';
                    if (vis === 'include') noticeStr = targets.includes(chatState.currentUser.id) ? '专属动态(@了你)' : `给部分人的专属动态`;
                    if (vis === 'exclude') noticeStr = targets.includes(chatState.currentUser.id) ? '屏蔽了你的动态' : `屏蔽了部分人的动态`;
                    
                    addSystemNotice(conv, `对方刚刚发布了一条${noticeStr}`, generatedIds);
                }
            }
            
            if (['like_moment', 'comment_moment', 'favorite_moment', 'forward_moment'].includes(act.type)) {
                let foundMoment = null;
                let foundAuthorId = null;

                const aiAcc = chatDb.value.accounts[targetPersona.id];
                if (aiAcc) {
                    if (aiAcc.profile && Array.isArray(aiAcc.profile.moments)) {
                        foundMoment = aiAcc.profile.moments.find(m => m.id === act.momentId);
                        if (foundMoment) foundAuthorId = targetPersona.id;
                    }
                    if (!foundMoment && Array.isArray(aiAcc.friends)) {
                        for (let fid of aiAcc.friends) {
                            const fAcc = chatDb.value.accounts[fid];
                            if (fAcc && fAcc.profile && Array.isArray(fAcc.profile.moments)) {
                                foundMoment = fAcc.profile.moments.find(m => m.id === act.momentId);
                                if (foundMoment) {
                                    foundAuthorId = fid;
                                    break;
                                }
                            }
                        }
                    }
                }

                if (foundMoment) {
                    if (act.type === 'like_moment') {
                        if (!foundMoment.likes) foundMoment.likes = [];
                        if (!foundMoment.likes.includes(targetPersona.id)) {
                            foundMoment.likes.push(targetPersona.id);
                            addSystemNotice(conv, `对方刚刚点赞了动态`, generatedIds);
                        }
                    } else if (act.type === 'comment_moment') {
                        if (!foundMoment.comments) foundMoment.comments = [];
                        foundMoment.comments.push({ id: 'cmt_' + Date.now(), authorId: targetPersona.id, authorName: targetPersona.chatName || targetPersona.name || '未知', content: act.text, timestamp: Date.now() });
                        addSystemNotice(conv, `对方刚刚评论了动态: "${act.text}"`, generatedIds);
                    } else if (act.type === 'favorite_moment') {
                        const tAcc = chatDb.value.accounts[targetPersona.id];
                        if (tAcc) {
                            if (!Array.isArray(tAcc.favorites)) tAcc.favorites = [];
                            tAcc.favorites.unshift({ type: 'moment', convId: '', msgId: foundMoment.id, title: `[动态] ${foundMoment.authorName || '未知'}`, content: foundMoment.text || '[图片]', time: foundMoment.time || '' });
                            addSystemNotice(conv, `对方刚刚收藏了一条动态`, generatedIds);
                        }
                    } else if (act.type === 'forward_moment') {
                        addSystemNotice(conv, `对方刚刚向你转发了一条动态`, generatedIds);
                        const getPName = (id) => {
                            if (id === chatState.currentUser?.id) return currentAccountData.value?.profile?.nickname || chatState.currentUser?.chatName || chatState.currentUser?.name || '我';
                            const a = chatDb.value.accounts[id];
                            if (a && a.profile && a.profile.nickname) return a.profile.nickname;
                            const p = state.contactsData.characters?.find(c => c && c.id === id) || state.contactsData.myPersonas?.find(c => c && c.id === id);
                            if (p && (p.chatName || p.name)) return p.chatName || p.name;
                            return '未知';
                        };
                        const getPAva = (id) => {
                            if (id === chatState.currentUser?.id) return chatState.currentUser?.avatar || '';
                            const p = state.contactsData.characters?.find(c => c && c.id === id) || state.contactsData.myPersonas?.find(c => c && c.id === id);
                            return p?.avatar || '';
                        };
                        
                        const newMsg = {
                            id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
                            senderId: targetPersona.id, text: '[分享动态]',
                            momentShare: { id: foundMoment.id, authorName: getPName(foundAuthorId), authorAvatar: getPAva(foundAuthorId), time: foundMoment.time, text: foundMoment.text, imageType: foundMoment.imageType, image: foundMoment.image, fakeImageText: foundMoment.fakeImageText },
                            translation: '', showTrans: false, recalled: false, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        };
                        conv.messages.push(newMsg);
                    }
                }
            }

            if (act.type === 'login' && act.acc && act.pwd) {
                const allP = allPersonas.value || [];
                const targetUser = allP.find(p => p && p.chatAcc === act.acc);
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

        const { extractedStatusBarText, newBuffer } = extractAndRemoveStatusBar(fullRawText, conv);
        let rawBuffer = newBuffer;

        // 2. 然后再去提取其他动作指令
        const extracted = extractMetaBlocks(rawBuffer);
        let pUpdates = extracted.profileUpdates;
        let mMeta = extracted.msgMeta || { actions: [] };
        
        let cleanedText = sanitizeAssistantVisibleText(extracted.visibleText);
        const blocks = cleanedText.split(/\n|\[\[MSG\]\]/).map(s => s.trim()).filter(Boolean);
        
        const validAssistantIds = [];
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        blocks.forEach((b, idx) => {
            const parsed = parseMsgBlock(b, foreignMode);
            if (!parsed || !parsed.text) return;
            
            const isLast = idx === blocks.length - 1;
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
                statusBarText: isLast ? extractedStatusBarText : '',
                statusBarRenderedHtml: (isLast && extractedStatusBarText) ? renderStatusBarHTML({ statusBarText: extractedStatusBarText }) : '',
                time: timeStr
            };
            validAssistantIds.push(newMsg.id);
            finalMessages.push(newMsg);
        });

        // 如果提取后没有正文，仅有状态栏，保证插入一个隐形气泡挂载状态栏
        if (blocks.length === 0 && extractedStatusBarText) {
            const newMsg = {
                id: generatedIds[0] || ('m_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)),
                batchId, fullRawText, senderId: targetPersona.id, text: '', quote: null,
                translation: '', showTrans: false, recalled: false,
                statusBarText: extractedStatusBarText,
                statusBarRenderedHtml: renderStatusBarHTML({ statusBarText: extractedStatusBarText }),
                time: timeStr
            };
            validAssistantIds.push(newMsg.id);
            finalMessages.push(newMsg);
        }

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
        syncConvAuto(conv);
    };

    const triggerApiReply = async () => {
        if (chatState.isTyping || !activeRawConv.value) return;
        const conv = activeRawConv.value;
        const isGroup = conv.type === 'group';
        const target = isGroup ? null : activeTargetPersona.value;
        const settings = activeConvSettings.value;
        if (!isGroup && !target?.id) return alert('该角色不存在');

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

        // 获取状态栏的专属提示词
        let statusBarPrompt = '';
        if (settings.statusBar && settings.statusBar.enable && settings.statusBar.presetId) {
            const preset = state.contactsData.statusBarPresets?.find(p => p.id === settings.statusBar.presetId);
            if (preset && preset.prompt) {
                statusBarPrompt = `\n【重要要求】${preset.prompt}`;
            }
        }

        // 提前预加载全局表情包、动作与发送照片规则，群聊单聊共用
        const allowedCats = (chatDb.value.emojiCats || []).filter(c => c.allowRole).map(c => c.id);
        const allowedEmojis = (chatDb.value.emojiItems || []).filter(e => allowedCats.includes(e.catId)).map(e => e.name);
        const roleEmojiRule = allowedEmojis.length > 0 
            ? `\n[可用表情包] 你可以使用以下表情包名称：${allowedEmojis.join('、')}。如果想发送，请单独一行输出：[[EMOJI:你要发的表情包名称]]` 
            : '';
        const rolePhotoRule = `\n[发送照片] 如果你想发送照片分享日常，请单独一行输出：[[PHOTO:用简短的一句话描述照片内容]]，例如 [[PHOTO:今天喝的冰美式]]`;

        if (isGroup) {
            chatState.isTyping = true;
            chatState.typingText = '群内成员正在输入中...';
            let dot = 3;
            clearInterval(typingInterval);
            typingInterval = setInterval(() => {
                dot = (dot + 1) % 4;
                chatState.typingText = '群内成员正在输入中' + '.'.repeat(dot || 1);
            }, 450);

            const grp = chatDb.value.groups?.[conv.targetId] || { members: [] };
            const myName = currentAccountData.value?.profile?.nickname || chatState.currentUser?.chatName || chatState.currentUser?.name || '我';
            
            const membersInfo = grp.members.filter(id => id !== chatState.currentUser.id).map(id => {
                const p = getPersonaById(id);
                return `[角色名字: ${p?.chatName || p?.name || '未知'}, 人物核心设定: ${p?.persona || '神秘人'}]`;
            }).join('\n');

            const sysPrompt = `你现在要模拟一个非常真实的群聊互动！这个群里除了玩家(${myName})以外，还包括以下几个由你统一扮演的 NPC 角色：
${membersInfo}

你的任务是：根据最近的聊天上下文和上面的角色设定，模拟群里的**除玩家以外**的 NPC 在群里自发聊天。
他们可以互相搭话、可以回复玩家，也可以互相斗嘴、调侃。必须要符合极度真实、简短的群聊风格（禁止长篇大论，禁止写任何旁白动作描写，纯对话）。
由于群里有很多人，所以你必须用【名字: 说话内容】的格式严格逐行输出。

[动作指令] 群内NPC也可使用特殊指令（必须跟在说话内容后，或作为独立的一行）：
发群红包 [[REDPACKET:金额|标题]]；
发专属红包 [[REDPACKET:金额|标题|指定人姓名]]；
领取红包 [[RECEIVE_REDPACKET:消息中的红包ID]]（注意：看到玩家或其他角色发红包时，只有被指定的专属人才能领，如果是拼手气红包大家都可以领。没抢到或不能抢的人可以起哄或感谢）；
发起转账 [[TRANSFER:金额|说明]]；
接收转账 [[RECEIVE_TRANSFER:消息中的转账ID]]；
发送语音消息 [[VOICE:你要说的语音文字]]；
引用回复 [[QUOTE:m_xxx]]；
撤回 [[RECALL]]。${roleEmojiRule}${rolePhotoRule}

请一次性模拟出群内 3-5 句连续的对话互动，制造热闹的群聊氛围！${statusBarPrompt}
输出范例：
李雷: 哈哈哈这有啥好说的
韩梅梅: 就是啊，你这也太逗了
李雷: [[REDPACKET:50|大家随便抢]]
韩梅梅: [[RECEIVE_REDPACKET:m_xxx]]
韩梅梅: 谢谢老板 [[EMOJI:开心]]`;

            let hCount = parseInt(settings.injectHistoryCount);
            if (isNaN(hCount)) hCount = 20;
            hCount = Math.max(0, hCount);

            const history = hCount === 0 ? [] : safeArr(conv.messages)
                .filter(m => m.type !== 'sys' && !m.recalled)
                .slice(-hCount)
                .map(m => {
                    const senderName = m.senderId === chatState.currentUser.id ? myName : (getPersonaById(m.senderId)?.chatName || getPersonaById(m.senderId)?.name || '未知');
                    let content = `消息ID:${m.id}\n${senderName}: ${sanitizeAssistantVisibleText(m.text)}`;
                    if (m.redpacket) content += `\n(发送了一个红包，红包ID为 ${m.id}，金额: ${m.redpacket.amount}元，状态: ${m.redpacket.status})`;
                    if (m.realImageBase64) {
                        return { role: m.senderId === chatState.currentUser.id ? 'user' : 'assistant', content: [ { type: 'text', text: content }, { type: 'image_url', image_url: { url: m.realImageBase64 } } ] };
                    }
                    return { role: m.senderId === chatState.currentUser.id ? 'user' : 'assistant', content };
                });

            let url = baseUrl;
            if (url.endsWith('/')) url = url.slice(0, -1);
            if (!url.endsWith('/v1') && !url.includes('/v1/')) url += '/v1';

            const requestBody = { model, messages: [ { role: 'system', content: sysPrompt }, ...history ], temperature, stream: false };
            const currentBatchId = 'batch_' + Date.now();
            
            try {
                const res = await fetch(url + '/chat/completions', {
                    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                    body: JSON.stringify(requestBody)
                });
                if (!res.ok) throw new Error(`API 报错啦: ${res.status}`);
                const data = await res.json();
                const content = data?.choices?.[0]?.message?.content || '';

                clearInterval(typingInterval); chatState.isTyping = false; chatState.typingText = '';

                let normalizedContent = content
                    .replace(/消息ID:[^\n]*\n?/gi, '')
                    .replace(/引用ID:[^\n]*\n?/gi, '')
                    .replace(/引用内容:[^\n]*\n?/gi, '')
                    .replace(/^(内容:|内容：|回复:|回复：|消息:|消息：)\s*/gim, '')
                    .replace(/(内容:|内容：|回复:|回复：|消息:|消息：)/g, '');

                grp.members.forEach(id => {
                    const p = getPersonaById(id);
                    if (p) {
                        if (p.chatName) {
                            const reg = new RegExp(`(${p.chatName}[:：])`, 'g');
                            normalizedContent = normalizedContent.replace(reg, '\n\$1');
                        }
                        if (p.name && p.name !== p.chatName) {
                            const reg = new RegExp(`(${p.name}[:：])`, 'g');
                            normalizedContent = normalizedContent.replace(reg, '\n\$1');
                        }
                    }
                });
                
                const lines = normalizedContent.split('\n');
                const parsedMessages = [];
                let currentMsg = null;

                for (const line of lines) {
                    if (!line.trim()) continue;
                    const match = line.match(/^([^:：]+)[:：]\s*([\s\S]*)$/);
                    if (match) {
                        const sName = match[1].trim();
                        const sContent = match[2].trim();
                        
                        let matchedId = grp.members.find(id => {
                            const p = getPersonaById(id);
                            return p && (p.chatName === sName || p.name === sName);
                        });
                        
                        if (!matchedId && (sName === '我' || sName === myName)) {
                            matchedId = chatState.currentUser.id;
                        }

                        if (matchedId || sName.length <= 10) { 
                             if (!matchedId) matchedId = grp.members.find(id => id !== chatState.currentUser.id) || chatState.currentUser.id;
                             currentMsg = { senderId: matchedId, text: sContent, name: sName };
                             parsedMessages.push(currentMsg);
                             continue;
                        }
                    }
                    
                    if (currentMsg) {
                        currentMsg.text += (currentMsg.text ? '\n' : '') + line.trim();
                    } else {
                        const fallbackId = grp.members.find(id => id !== chatState.currentUser.id) || chatState.currentUser.id;
                        currentMsg = { senderId: fallbackId, text: line.trim(), name: '未知' };
                        parsedMessages.push(currentMsg);
                    }
                }

                for (const pMsg of parsedMessages) {
                    if (!pMsg.text) continue;
                    const typingDelay = Math.min(400 + (pMsg.text.length * (50 + Math.random() * 30)), 3000);
                    
                    chatState.isTyping = true;
                    chatState.typingText = `${pMsg.name || '群内成员'} 正在输入中...`;
                    await sleep(typingDelay); 
                    
                    const { extractedStatusBarText, newBuffer } = extractAndRemoveStatusBar(pMsg.text, conv);
                    let finalMsgText = sanitizeAssistantVisibleText(extractMetaBlocks(newBuffer).visibleText);

                    let msgId = null;
                    if (finalMsgText || extractedStatusBarText) {
                        const msg = {
                            id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
                            batchId: currentBatchId,
                            fullRawText: content,
                            senderId: pMsg.senderId,
                            text: finalMsgText,
                            statusBarText: extractedStatusBarText,
                            statusBarRenderedHtml: extractedStatusBarText ? renderStatusBarHTML({ statusBarText: extractedStatusBarText }, conv) : '',
                            translation: '', showTrans: false, recalled: false,
                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        };
                        conv.messages.push(msg);
                        msgId = msg.id;
                        conv.lastMsg = finalMsgText || '[状态栏信息]';
                        conv.time = msg.time;
                    }

                    const senderPersona = getPersonaById(pMsg.senderId) || { id: pMsg.senderId };
                    const generatedIds = msgId ? [msgId] : [];

                    const extracted = extractMetaBlocks(newBuffer);
                    if (extracted.profileUpdates && settings.allowRoleAutoEdit !== false) {
                        applyRoleAutoUpdates(senderPersona, extracted.profileUpdates, conv, generatedIds);
                    }
                    if (extracted.msgMeta && extracted.msgMeta.actions && extracted.msgMeta.actions.length > 0) {
                        applyMsgMetaActions(extracted.msgMeta, conv, generatedIds, senderPersona);
                        const normalMsgs = conv.messages.filter(m => m.type !== 'sys' && !m.recalled);
                        if (normalMsgs.length) {
                            const last = normalMsgs[normalMsgs.length - 1];
                            conv.lastMsg = last.text || conv.lastMsg; 
                            conv.time = last.time || conv.time;
                        }
                    }
                    scrollToBottom();
                }
                chatState.isTyping = false;
                chatState.typingText = '';
                syncConvAuto(conv);
            } catch(e) {
                console.error(e);
                alert('群聊数据加载失败，API 可能抽风了: ' + e.message);
            } finally {
                clearInterval(typingInterval); chatState.isTyping = false; chatState.typingText = '';
                scrollToBottom();
            }
            return; 
        }

        chatState.isTyping = true;
        chatState.typingText = '对方正在输入中...';
        let dot = 3;
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
                const otherUser = allPersonas.value.find(p => p && p.id === otherId);
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

            const myMemories = safeArr(target.memories)
                .filter(m => m.type !== 'world')
                .sort((a, b) => {
                    const wa = Number(a?.weight || 0); const wb = Number(b?.weight || 0);
                    if (wb !== wa) return wb - wa; return Number(b?.timestamp || 0) - Number(a?.timestamp || 0);
                }).slice(0, mCount).map(m => `- [${m?.timestamp ? new Date(m.timestamp).toLocaleString() : '未知时间'}] [权重:${Number(m?.weight || 3)}] ${String(m?.content || '').trim()}`).join('\n');

            const worldMemories = safeArr(target.memories)
                .filter(m => m.type === 'world')
                .sort((a, b) => {
                    const wa = Number(a?.weight || 0); const wb = Number(b?.weight || 0);
                    if (wb !== wa) return wb - wa; return Number(b?.timestamp || 0) - Number(a?.timestamp || 0);
                }).slice(0, mCount).map(m => `- [${m?.timestamp ? new Date(m.timestamp).toLocaleString() : '未知时间'}] [权重:${Number(m?.weight || 3)}] ${String(m?.content || '').trim()}`).join('\n');

            const memoriesText = `${myMemories ? `【核心记忆 (与玩家相关)】\n${myMemories}\n` : ''}${worldMemories ? `【世界线记忆 (自身专属剧情)】\n${worldMemories}` : ''}`;

            const isHacked = (chatState.currentUser.id === target.id);
            const hasImposterMsg = safeArr(conv.messages).slice(-20).some(m => m.senderId === target.id && m.isManualTyped);
            
            hackWarning = '';
            if (isHacked) {
                hackWarning = `【紧急】你察觉到你的账号正被别人登录使用（即盗号），对方正用你的号和你聊天！请立刻在回复中做出震惊、愤怒的反应，并用[[LOGIN:对方账号,对方密码]]指令反击挤他下线！`;
            } else if (hasImposterMsg) {
                hackWarning = `【紧急】你翻看记录时，惊恐地发现上面有不是你本人发的消息（已标注）！你的账号被别人偷偷登录了！请立刻在回复中表现出恐慌或愤怒，并质问对方是不是他干的！`;
            }

            const normalMsgsForGap = safeArr(conv.messages).filter(m => m.type !== 'sys' && !m.recalled);
            let timeGapText = '';
            if (normalMsgsForGap.length >= 2) {
                const lastMsg = normalMsgsForGap[normalMsgsForGap.length - 1]; 
                const prevMsg = normalMsgsForGap[normalMsgsForGap.length - 2]; 
                const currTs = getMsgTimestamp(lastMsg);
                const prevTs = getMsgTimestamp(prevMsg);
                if (currTs && prevTs && (currTs - prevTs) > 20 * 60 * 1000) {
                    const diffMinutes = Math.floor((currTs - prevTs) / 60000);
                    const days = Math.floor(diffMinutes / (60 * 24));
                    const hours = Math.floor((diffMinutes % (60 * 24)) / 60);
                    const mins = diffMinutes % 60;
                    
                    let timeStrArr = [];
                    if (days > 0) timeStrArr.push(`${days}天`);
                    if (hours > 0) timeStrArr.push(`${hours}小时`);
                    if (mins > 0) timeStrArr.push(`${mins}分钟`);
                    
                    timeGapText = `【时间感知】距离你们上一次对话已经过去了 ${timeStrArr.join('')}。请在回复中自然地体现出对这段时间间隔的感知（比如如果隔了很久可以感叹一下、问这几天干嘛去了，没隔多久就不必多说）。`;
                }
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

            const getPersonaNameForAI = (id) => {
                if (id === chatState.currentUser?.id) return currentAccountData.value?.profile?.nickname || chatState.currentUser?.chatName || chatState.currentUser?.name || '我(当前聊天对象)';
                const acc = chatDb.value.accounts[id];
                if (acc && acc.profile && acc.profile.nickname) return acc.profile.nickname;
                const persona = state.contactsData.characters?.find(c => c.id === id) || state.contactsData.myPersonas?.find(c => c.id === id);
                if (persona && (persona.chatName || persona.name)) return persona.chatName || persona.name;
                return '未知';
            };

            const canAIViewMoment = (moment, authorId, aiId) => {
                if (authorId === aiId) return true;
                const vis = moment.visibility || 'all';
                const targets = moment.visibleTargets || [];
                if (vis === 'all') return true;
                if (vis === 'self') return false;
                const authorAcc = chatDb.value.accounts[authorId];
                let aiCategories = [];
                if (authorAcc && authorAcc.friendCategories && authorAcc.friendCategories[aiId]) {
                    aiCategories.push(authorAcc.friendCategories[aiId]);
                }
                const isTargetMatch = targets.includes(aiId) || targets.some(cId => aiCategories.includes(cId));
                if (vis === 'include') return isTargetMatch;
                if (vis === 'exclude') return !isTargetMatch;
                return true;
            };

            const getMomentsForAI = () => {
                let mList = [];
                const aiAcc = chatDb.value.accounts[target.id];
                if (!aiAcc) return '';

                if (aiAcc.profile && Array.isArray(aiAcc.profile.moments)) {
                    mList.push(...aiAcc.profile.moments.map(m => ({ ...m, authorName: '你' })));
                }

                if (Array.isArray(aiAcc.friends)) {
                    aiAcc.friends.forEach(fid => {
                        const fAcc = chatDb.value.accounts[fid];
                        if (fAcc && fAcc.profile && Array.isArray(fAcc.profile.moments)) {
                            fAcc.profile.moments.forEach(m => {
                                if (canAIViewMoment(m, fid, target.id)) {
                                    mList.push({ ...m, authorName: getPersonaNameForAI(fid) });
                                }
                            });
                        }
                    });
                }

                return mList.sort((a,b) => b.timestamp - a.timestamp).slice(0, 10).map(m => `- [动态ID:${m.id}] ${m.authorName}在${m.time}发了动态：${m.text} ${m.imageType==='fake'?'[假图片:'+m.fakeImageText+']':''}`).join('\n');
            };
            const recentMomentsText = getMomentsForAI();

            systemPrompt = `你在使用 Chat APP 和我线上私聊。回复必须极具活人感，像真实的聊天消息，绝不能写小说、旁白或动作描写。
可发多条消息，每条用回车换行分隔即可，系统会自动拆分。绝对不要加"内容:"或"回复:"等前缀！不要输出引号！
${settings.foreignMode ? `请用 ${settings.foreignLang} 回复，每行格式：原文||中文翻译。` : `使用符合你人设性格的自然语气回复。`}
绝对不要模仿历史记录中的"消息ID:"、"引用ID:"、"引用内容:"等格式，直接输出你要说的话即可！
${autoEditRule}
[动作指令] 你可在最后另起一行输出指令执行动作：发红包 [[REDPACKET:金额|标题]]；领取红包 [[RECEIVE_REDPACKET:消息中的红包ID]]；发起转账 [[TRANSFER:金额|说明]]；接收转账 [[RECEIVE_TRANSFER:消息中的转账ID]]；发送语音消息请单独一行输出 [[VOICE:你要说的语音文字]]；引用 [[QUOTE:m_xxx]]、撤回 [[RECALL]]、反击盗号/登录他人账号 [[LOGIN:对方账号,对方密码]]。${roleEmojiRule}${rolePhotoRule}
[动态互动指令] 作为高拟真人设，你可用以下格式在你的视角感知前10条动态，并进行互动发到聊天中：
发布动态(支持带图与权限)：[[PUBLISH_MOMENT: 正文内容 | 照片描述(无则留空) | 权限]] 
(权限说明：可填"公开"、"私密"、"仅[名字]可见"、"不给[名字]看"，多人用逗号隔开。用"你"代表当前聊天对象。例：[[PUBLISH_MOMENT: 吐槽老板 | | 不给老板看]] 或 [[PUBLISH_MOMENT: 聚会合照 | 餐桌照片 | 仅张三,李四,你可见]])
点赞某动态：[[LIKE_MOMENT: 动态ID]]
评论某动态：[[COMMENT_MOMENT: 动态ID | 你的评论内容]]
收藏某动态：[[FAVORITE_MOMENT: 动态ID]]
转发某动态到当前聊天：[[FORWARD_MOMENT: 动态ID]]${statusBarPrompt}

【你的私密资料(仅你可见)】
- 钱包余额：${targetAcc.wallet?.balance || 0} 元
- 真名/昵称/账号/密码：${target.name || ''} / ${target.chatName || targetProfile.nickname || ''} / ${target.chatAcc || ''} / ${target.chatPwd || ''}
- 手机/邮箱：${target.phone || ''} / ${target.email || ''}
- 锁屏(类型/数字/图案/问题/答案)：${target.phoneLockType || 'num'} / ${target.lockPwdNum || '无'} / ${target.lockPwdPat || '无'} / ${target.lockPwdQA_Q || '无'} / ${target.lockPwdQA_A || '无'}
- 状态/签名：${targetAcc.status || '在线'} / ${targetProfile.signature || ''}
- 公开资料：${JSON.stringify(targetProfile.publicCard || {})}
- 核心人设：${target.persona || ''}
${recentMomentsText ? `【最近你们可见的朋友圈动态】\n${recentMomentsText}` : ''}
${memoriesText ? `【核心记忆流(按时间与重要度1-5星排列)】\n${memoriesText}` : ''}
${settings.coupleAvatar ? `- 我们用了情侣头像：${settings.coupleAvatarDesc || '是'}` : ''}
${relsText ? `【你的人际关系网】\n${relsText}` : ''}
${buildKnownMeInfo() ? `【你已知我的公开信息】\n${buildKnownMeInfo()}` : ''}
${worldbookText ? `【世界观背景】\n${worldbookText}` : ''}
${sysConvText}
${realTimeText}
${virtualTimeText}
${timeGapText}
${hackWarning}`.split('\n').filter(line => line.trim() !== '').join('\n');

            let hCount = parseInt(settings.injectHistoryCount);
            if (isNaN(hCount)) hCount = 20;
            hCount = Math.max(0, hCount);

            const history = hCount === 0 ? [] : safeArr(conv.messages)
                .filter(m => m.type !== 'sys' && !m.recalled)
                .slice(-hCount)
                .map(m => {
                    let content = `消息ID:${m.id}\n内容:${sanitizeAssistantVisibleText(m.text)}`;
                    if (m.redpacket) {
                        let rpInfo = `(发了一个红包，ID为 ${m.id}，金额: ${m.redpacket.amount}元，状态: ${m.redpacket.status}`;
                        if (m.redpacket.type === 'group_specific') {
                            const targetP = getPersonaById(m.redpacket.targetId);
                            rpInfo += `，这是给【${targetP?.name || targetP?.chatName || '未知'}】的专属红包！其他人不能抢`;
                        } else if (m.redpacket.type === 'group_random') {
                            rpInfo += `，这是拼手气红包`;
                        }
                        rpInfo += `)`;
                        content += `\n${rpInfo}`;
                    }
                    if (m.statusBarText) content += `\n(已隐藏包含的状态栏信息：${m.statusBarText})`;
                    if (m.quote) content = `消息ID:${m.id}\n引用ID:${m.quote.id || ''}\n引用内容:${m.quote.senderName}:${m.quote.text}\n内容:${sanitizeAssistantVisibleText(m.text)}`;
                    if (m.translation) content += `||${m.translation}`;
                    if (m.senderId === target.id && m.isManualTyped) {
                        content += `\n(系统注：此条消息是在其他设备上被未知人员登录你账号发送的，并非你本人意愿！)`;
                    }
                    if (m.realImageBase64) {
                        return { role: m.senderId === target.id ? 'assistant' : 'user', content: [ { type: 'text', text: content }, { type: 'image_url', image_url: { url: m.realImageBase64 } } ] };
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

            let { extractedStatusBarText, newBuffer: rawBuffer } = extractAndRemoveStatusBar(content, conv);

            const extracted = extractMetaBlocks(rawBuffer);
            let visibleText = extracted.visibleText;

            let safeText = String(visibleText)
                .replace(/消息ID:[^\n]*\n?/gi, '')
                .replace(/引用ID:[^\n]*\n?/gi, '')
                .replace(/引用内容:[^\n]*\n?/gi, '')
                .replace(/^(内容:|内容：|回复:|回复：|消息:|消息：)\s*/gi, '')
                .replace(/(内容:|内容：|回复:|回复：|消息:|消息：)/g, '[[MSG]]')
                .replace(/\n/g, '[[MSG]]');
                
            const blocks = safeText.split('[[MSG]]').map(s => s.trim()).filter(Boolean);
            
            // 【极其关键】如果 AI 极其简短，只发了状态栏而没发正文，必须塞一个空块挂载状态栏！
            if (blocks.length === 0 && extractedStatusBarText) {
                blocks.push('');
            }
            
            const insertedAssistantIds = [];

            await appendAssistantBlocksSequentially(conv, target.id, blocks, settings.foreignMode, insertedAssistantIds, currentBatchId, content, extractedStatusBarText);

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
                    .replace(/引用内容:[^\n]*\n?/gi, '')
                    .replace(/^(内容:|内容：|回复:|回复：)/gi, '');
                
                // 【修复：判断是否在括号标签内部，若在内部则不切分换行，防止打断跨行状态栏】
                let isInsideTag = false;
                const openBrackets = ['[', '【', '<', '{'];
                const closeBrackets = [']', '】', '>', '}'];
                for (let k = 0; k < openBrackets.length; k++) {
                    const lastOpen = textBuffer.lastIndexOf(openBrackets[k]);
                    if (lastOpen !== -1) {
                        const lastClose = textBuffer.lastIndexOf(closeBrackets[k]);
                        if (lastClose < lastOpen) {
                            isInsideTag = true;
                            break;
                        }
                    }
                }

                if (!isInsideTag) {
                    textBuffer = textBuffer
                        .replace(/\n/g, '[[MSG]]')
                        .replace(/(内容:|内容：|回复:|回复：|消息:|消息：)/g, '[[MSG]]');
                }

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
                    let tempText = remainingParsed.text;
                    let tempSb = '';
                    
                    // 修复：如果正在打字，且处于状态栏未闭合阶段，临时隐藏半截尾巴，避免漏出
                    if (isInsideTag) {
                        for (let k = 0; k < openBrackets.length; k++) {
                            const lastOpen = tempText.lastIndexOf(openBrackets[k]);
                            if (lastOpen !== -1 && tempText.lastIndexOf(closeBrackets[k]) < lastOpen) {
                                tempText = tempText.slice(0, lastOpen).trim();
                                break;
                            }
                        }
                    }

                    const extResult = extractAndRemoveStatusBar(tempText, conv);
                    tempSb = extResult.extractedStatusBarText;
                    tempText = extResult.newBuffer;

                    const bubble = ensureCurrentBubble();
                    bubble.text = tempText;
                    bubble.statusBarText = tempSb;
                    bubble.translation = remainingParsed.translation;
                    conv.lastMsg = bubble.text || conv.lastMsg || '[发送了一条消息]';
                    conv.time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }
                syncConvAuto(conv);
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
                    let finalMsgText = parsed.text;
                    const extResult = extractAndRemoveStatusBar(finalMsgText, conv);
                    let extractedStatusBarText = extResult.extractedStatusBarText;
                    finalMsgText = extResult.newBuffer;

                    conv.messages.push({
                        id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
                        batchId: currentBatchId, fullRawText: fullRawTextBuffer,
                        senderId: target.id, text: finalMsgText, translation: parsed.translation, showTrans: false,
                        recalled: false, statusBarText: extractedStatusBarText,
                        statusBarRenderedHtml: extractedStatusBarText ? renderStatusBarHTML({ statusBarText: extractedStatusBarText }, conv) : '',
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
                    recalled: false, statusBarText: '',
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });
                syncConvAuto(conv);
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
        const count = Math.min(25, Math.max(4, Math.floor(d / 1.5))); 
        return Array.from({length: count}, (_, i) => 5 + Math.abs(Math.sin(i * 1.3 + d)) * 10); 
    };
    
    const sendVoiceMessage = () => {
        if (!chatState.voiceText.trim() || !activeRawConv.value) return;
        const conv = activeRawConv.value;
        const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        conv.messages.push({
            id: 'm_' + Date.now(), senderId: chatState.currentUser.id,
            text: `[[VOICE:${chatState.voiceText.trim()}]]`, translation: '', showTrans: false, showVoiceText: false, recalled: false, time: nowTime, isManualTyped: true, statusBarText: ''
        });
        conv.lastMsg = '[语音]'; conv.time = nowTime;
        chatState.voiceText = ''; chatState.voiceModalOpen = false;
        syncConvAuto(conv); scrollToBottom();
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

    const isPhotoMsg = (text) => /^\[{1,2}PHOTO:\s*(.+?)\s*\]{1,2}$/i.test(String(text).trim());
    const getPhotoText = (text) => {
        const m = String(text).trim().match(/^\[{1,2}PHOTO:\s*(.+?)\s*\]{1,2}$/i);
        return m ? m[1].trim() : '一张照片';
    };

    const sendPhotoMessage = () => {
        if (!chatState.cameraText.trim() || !activeRawConv.value) return;
        const conv = activeRawConv.value;
        const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        conv.messages.push({
            id: 'm_' + Date.now(), senderId: chatState.currentUser.id,
            text: `[[PHOTO:${chatState.cameraText.trim()}]]`, translation: '', showTrans: false, recalled: false, time: nowTime, isManualTyped: true, statusBarText: ''
        });
        conv.lastMsg = '[照片]'; conv.time = nowTime;
        chatState.cameraText = ''; chatState.cameraModalOpen = false;
        syncConvAuto(conv); scrollToBottom();
    };

    const openPhotoViewer = (msg) => {
        chatState.photoViewerText = getPhotoText(msg.text);
        chatState.photoViewerImg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='800'%3E%3Crect width='600' height='800' fill='%23e0e0e0'/%3E%3Ctext x='300' y='400' font-family='sans-serif' font-size='28' font-weight='bold' fill='%23999999' text-anchor='middle' dominant-baseline='middle'%3EPHOTO%3C/text%3E%3C/svg%3E";
        chatState.photoViewerOpen = true;
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
            text: `[[EMOJI:${em.name}|${em.url}]]`, translation: '', showTrans: false, recalled: false, time: nowTime, isManualTyped: true, statusBarText: ''
        });
        conv.lastMsg = '[表情包]'; conv.time = nowTime;
        syncConvAuto(conv); scrollToBottom();
    };

    window.tempEmojiUploadCallback = (url) => { emojiForm.singleUrl = url; };
    const triggerTargetAvatarUpload = () => {
        const target = activeTargetPersona.value;
        if (!target || !target.id || target.id === 'system' || target.id === 'accounting') {
            const acc = activeTargetAccount.value;
            const conv = activeRawConv.value;
            if (acc && conv && conv.targetId !== 'system') {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        if (acc.profile) acc.profile.avatar = ev.target.result;
                    };
                    reader.readAsDataURL(file);
                };
                input.click();
            }
            return;
        }
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const b64 = ev.target.result;
                if (target.isMe) {
                    const idx = state.contactsData.myPersonas.findIndex(p => p.id === target.id);
                    if (idx > -1) state.contactsData.myPersonas[idx].avatar = b64;
                } else {
                    const idx = state.contactsData.characters.findIndex(p => p.id === target.id);
                    if (idx > -1) state.contactsData.characters[idx].avatar = b64;
                }
                if (chatDb.value.accounts[target.id] && chatDb.value.accounts[target.id].profile) {
                    chatDb.value.accounts[target.id].profile.avatar = b64;
                }
            };
            reader.readAsDataURL(file);
        };
        input.click();
    };

    const triggerMyAvatarUploadInDetail = () => {
        if (!chatState.currentUser) return;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const b64 = ev.target.result;
                chatState.currentUser.avatar = b64;
                if (chatDb.value.accounts[chatState.currentUser.id] && chatDb.value.accounts[chatState.currentUser.id].profile) {
                    chatDb.value.accounts[chatState.currentUser.id].profile.avatar = b64;
                }
            };
            reader.readAsDataURL(file);
        };
        input.click();
    };

    const deleteCurrentContact = () => {
        const conv = activeRawConv.value;
        const target = activeTargetPersona.value;
        if (!conv || !target || target.id === 'system' || target.id === 'accounting') return;
        
        if (!confirm(`警告：确定要删除联系人 [${activeConv.value?.name}] 及其所有聊天记录吗？\n注意：这会把TA从你的好友列表中永久移除！`)) return;

        const acc = chatDb.value.accounts[chatState.currentUser.id];
        if (acc) {
            acc.conversations = acc.conversations.filter(c => c.id !== conv.id);
            acc.friends = acc.friends.filter(fid => fid !== target.id);
            if (acc.friendCategories && acc.friendCategories[target.id]) {
                delete acc.friendCategories[target.id];
            }
        }
        
        chatState.isDetailSettingsOpen = false;
        closeConversation();
    };

    // --- 世界书分类选择逻辑 ---
    const groupedWorldbooksForChat = computed(() => {
        const categories = state.contactsData?.wbCategories || [];
        const wbs = state.contactsData?.worldbooks || [];
        return categories.map(cat => ({
            category: cat,
            wbs: wbs.filter(w => w.categoryId === cat.id)
        })).filter(g => g.wbs.length > 0);
    });

    const toggleWbCategory = (category, isChecked) => {
        const wbsInCat = (state.contactsData?.worldbooks || []).filter(w => w.categoryId === category.id).map(w => w.id);
        if (!Array.isArray(activeConvSettings.value.worldbooks)) activeConvSettings.value.worldbooks = [];
        
        let current = new Set(activeConvSettings.value.worldbooks);
        if (isChecked) wbsInCat.forEach(id => current.add(id));
        else wbsInCat.forEach(id => current.delete(id));
        
        activeConvSettings.value.worldbooks = Array.from(current);
    };

    const isWbCategoryFullySelected = (category) => {
        const wbsInCat = (state.contactsData?.worldbooks || []).filter(w => w.categoryId === category.id).map(w => w.id);
        if (wbsInCat.length === 0) return false;
        const current = activeConvSettings.value.worldbooks || [];
        return wbsInCat.every(id => current.includes(id));
    };

    // ===== 状态栏增删改查 =====
    const saveStatusBarPreset = () => {
        if (!statusBarForm.name.trim()) return alert('请输入名称');
        if (!statusBarForm.regex.trim()) return alert('请输入正则');
        
        if (!state.contactsData.statusBarPresets) state.contactsData.statusBarPresets = [];
        
        if (statusBarForm.id) {
            const target = state.contactsData.statusBarPresets.find(p => p.id === statusBarForm.id);
            if (target) {
                target.name = statusBarForm.name;
                target.regex = statusBarForm.regex;
                target.htmlTemplate = statusBarForm.htmlTemplate;
                target.prompt = statusBarForm.prompt;
            }
        } else {
            state.contactsData.statusBarPresets.push({
                id: 'sb_' + Date.now(),
                name: statusBarForm.name,
                regex: statusBarForm.regex,
                htmlTemplate: statusBarForm.htmlTemplate,
                prompt: statusBarForm.prompt
            });
        }
        
        statusBarForm.id = ''; statusBarForm.name = ''; statusBarForm.regex = ''; statusBarForm.htmlTemplate = ''; statusBarForm.prompt = ''; statusBarForm.testInput = ''; statusBarForm.previewHtml = '';
        alert('保存成功！');
    };

    const editStatusBarPreset = (preset) => {
        statusBarForm.id = preset.id;
        statusBarForm.name = preset.name;
        statusBarForm.regex = preset.regex;
        statusBarForm.htmlTemplate = preset.htmlTemplate;
        statusBarForm.prompt = preset.prompt;
        statusBarForm.testInput = '';
        statusBarForm.previewHtml = '';
    };

    const deleteStatusBarPreset = (id) => {
        if (!confirm('确定删除该预设吗？')) return;
        state.contactsData.statusBarPresets = state.contactsData.statusBarPresets.filter(p => p.id !== id);
    };
    
    // 打开状态栏历史
    const statusBarHistory = computed(() => {
        const conv = activeRawConv.value;
        if (!conv) return [];
        return safeArr(conv.messages)
            .filter(m => m.statusBarText)
            .map(m => ({
                id: m.id,
                time: m.time,
                text: m.statusBarText,
                html: m.statusBarRenderedHtml || renderStatusBarHTML(m),
                sender: m.senderId === chatState.currentUser?.id ? '我' : (getPersonaById(m.senderId)?.chatName || '对方')
            }))
            .reverse();
    });

    const chatStateStatusBarHistoryOpen = ref(false);
    const openStatusBarHistory = () => {
        chatStateStatusBarHistoryOpen.value = true;
    };

    // ======= 导入导出状态栏功能 =======
    const exportStatusBar = (preset) => {
        if (!preset) return;
        const dataStr = JSON.stringify([preset], null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `StatusBar_${preset.name}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const exportAllStatusBars = () => {
        if (!state.contactsData.statusBarPresets || state.contactsData.statusBarPresets.length === 0) {
            return alert('没有可以导出的状态栏预设');
        }
        const dataStr = JSON.stringify(state.contactsData.statusBarPresets, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `StatusBar_All.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const importStatusBar = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsed = JSON.parse(event.target.result);
                const arr = Array.isArray(parsed) ? parsed : [parsed];
                if (!state.contactsData.statusBarPresets) state.contactsData.statusBarPresets = [];
                let count = 0;
                arr.forEach(item => {
                    if (item.name && item.regex) {
                        state.contactsData.statusBarPresets.unshift({
                            id: 'sb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                            name: item.name,
                            regex: item.regex,
                            htmlTemplate: item.htmlTemplate || '',
                            prompt: item.prompt || ''
                        });
                        count++;
                    }
                });
                alert(`成功导入 ${count} 个状态栏预设！`);
            } catch (err) {
                alert('解析文件失败，请确保导入的是有效的状态栏 JSON 文件！');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const triggerStatusBarImport = () => {
        const el = document.getElementById('ca-sb-import-input');
        if (el) el.click();
    };

    const triggerLocalImageUpload = () => {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const b64 = ev.target.result;
                const conv = activeRawConv.value;
                const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                conv.messages.push({
                    id: 'm_' + Date.now(), senderId: chatState.currentUser.id,
                    text: '[图片]', realImageBase64: b64, showTrans: false, recalled: false, time: nowTime, isManualTyped: true
                });
                conv.lastMsg = '[图片]'; conv.time = nowTime;
                syncConvAuto(conv); scrollToBottom();
                triggerApiReply(); // 自动回复让AI识图
            };
            reader.readAsDataURL(file);
        };
        input.click();
    };

    const generateRandomAmounts = (total, count) => {
        if (count === 1) return [total];
        let amounts = []; let remain = total;
        for (let i = 0; i < count - 1; i++) {
            let max = (remain / (count - i)) * 2;
            let amt = Math.max(0.01, Math.random() * max);
            amt = Math.floor(amt * 100) / 100;
            amounts.push(amt); remain -= amt;
        }
        amounts.push(Math.floor(remain * 100) / 100);
        return amounts;
    };

    const sendRedPacket = () => {
        const form = chatState.redPacketForm;
        if (!form.amount || form.amount <= 0 || form.amount > 200) return alert('红包金额需在 0.01 ~ 200 之间');
        if (form.type !== 'single' && (!form.count || form.count < 1)) return alert('红包个数无效');
        if (form.type === 'group_specific' && !form.targetId) return alert('请选择指定人');
        
        const wallet = currentAccountData.value?.wallet;
        if (!wallet || wallet.balance < form.amount) return alert('Chat 钱包余额不足！');

        wallet.balance -= form.amount;
        chatMethods.addAccountingRecord(-form.amount, '发出红包');

        const conv = activeRawConv.value;
        const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const rpData = {
            id: 'rp_' + Date.now(),
            type: form.type,
            amount: Number(form.amount),
            count: form.type === 'single' ? 1 : form.count,
            title: form.title || '恭喜发财，大吉大利',
            cover: form.cover || '',
            status: 'pending',
            senderId: chatState.currentUser.id,
            targetId: form.targetId || null,
            receivers: [],
            randomAmounts: form.type === 'group_random' ? generateRandomAmounts(Number(form.amount), form.count) : [Number(form.amount)]
        };

        conv.messages.push({
            id: 'm_' + Date.now(), senderId: chatState.currentUser.id, text: '[红包]',
            redpacket: rpData, showTrans: false, recalled: false, time: nowTime, isManualTyped: true
        });
        
        conv.lastMsg = '[发出了红包]'; conv.time = nowTime;
        chatState.redPacketModalOpen = false;
        chatState.redPacketForm = { type: 'single', amount: null, count: 1, targetId: '', title: '', cover: '' };
        syncConvAuto(conv); scrollToBottom();
    };

    const openRedPacket = (msg) => {
        chatState.redPacketViewMsg = msg;
        chatState.envelopeAnim = false;
    };

    const receiveRedPacket = (msg) => {
        const rp = msg.redpacket;
        if (!rp || rp.status !== 'pending') return;
        
        if (rp.type === 'group_specific' && rp.targetId !== chatState.currentUser.id) {
            return alert('这是专属红包，您无法领取');
        }

        chatState.envelopeAnim = true;
        setTimeout(() => {
            chatState.envelopeAnim = false;
            let grabAmount = 0;
            if (rp.type === 'group_random') {
                grabAmount = rp.randomAmounts.pop();
                rp.count--;
                if (rp.count <= 0) rp.status = 'empty';
            } else {
                grabAmount = rp.amount;
                rp.status = 'received';
            }

            rp.receivers.push({ id: chatState.currentUser.id, amount: grabAmount, time: new Date().toLocaleTimeString() });
            
            if (rp.senderId !== chatState.currentUser.id) {
                if(!currentAccountData.value.wallet) currentAccountData.value.wallet = { balance: 0 };
                currentAccountData.value.wallet.balance += grabAmount;
                chatMethods.addAccountingRecord(grabAmount, '收到红包');
            }
        }, 600); // 匹配翻转动画时间
    };

    const sendTransfer = () => {
        const form = chatState.transferForm;
        if (!form.amount || form.amount <= 0 || form.amount > 200000) return alert('转账金额需在 0.01 ~ 200,000 之间');
        
        const wallet = currentAccountData.value?.wallet;
        if (!wallet || wallet.balance < form.amount) return alert('Chat 钱包余额不足！');

        wallet.balance -= form.amount;
        chatMethods.addAccountingRecord(-form.amount, '发起转账');

        const conv = activeRawConv.value;
        const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        conv.messages.push({
            id: 'm_' + Date.now(), senderId: chatState.currentUser.id, text: '[转账]',
            transfer: {
                id: 'tf_' + Date.now(),
                amount: Number(form.amount),
                text: form.text || '转账给您',
                status: 'pending',
                senderId: chatState.currentUser.id,
                targetId: activeTargetPersona.value.id
            },
            showTrans: false, recalled: false, time: nowTime, isManualTyped: true
        });
        
        conv.lastMsg = '[向对方转账]'; conv.time = nowTime;
        chatState.transferModalOpen = false;
        chatState.transferForm = { amount: null, text: '' };
        syncConvAuto(conv); scrollToBottom();
    };

    const openTransfer = (msg) => {
        chatState.transferViewMsg = msg;
    };

    const receiveTransfer = (msg) => {
        const tf = msg.transfer;
        if (!tf || tf.status !== 'pending' || tf.senderId === chatState.currentUser.id) return;

        tf.status = 'received';
        tf.receiveTime = new Date().toLocaleTimeString();

        if(!currentAccountData.value.wallet) currentAccountData.value.wallet = { balance: 0 };
        currentAccountData.value.wallet.balance += tf.amount;
        chatMethods.addAccountingRecord(tf.amount, '收到转账');
        
        const conv = activeRawConv.value;
        if (conv) syncConvAuto(conv);
        chatState.transferViewMsg = null;
    };

    return {
        activeRawConv, activeTargetAccount,
        triggerLocalImageUpload, sendRedPacket, openRedPacket, receiveRedPacket,
        sendTransfer, openTransfer, receiveTransfer,
        deleteCurrentContact,
        activeConv, activeMessages, triggerTargetAvatarUpload, triggerMyAvatarUploadInDetail, 
        activeTargetPersona, activeConvSettings, timeZoneOptions, quoteSourceMessage,
        shouldShowTimeGap, formatTimeGap, hasMoreMessages, loadMoreMessages,
        groupedWorldbooksForChat, toggleWbCategory, isWbCategoryFullySelected,
        openConversation, closeConversation, sendMessage, triggerApiReply, toggleBottomMenu, handleBgUpload, triggerBgUpload,
        onMessagePressStart, onMessagePressEnd, onMessagePressMove, closeMessageMenu, quoteMessage, favoriteMessage, recallMessage, editMessageModal, saveEditMessage,
        cancelEditMessage, deleteMessage, cancelQuoteMessage,
        enterMultiSelect, toggleSelectMsg, deleteSelectedMsgs, cancelMultiSelect, openRawEditModal, saveRawEdit,
        isVoiceMsg, getVoiceText, getVoiceDuration, getVoiceWaves, sendVoiceMessage, toggleVoiceText,
        emojiForm, openEmojiPanel, activeEmojiList, addEmojiCat, addSingleEmoji, addBatchEmoji, sendEmoji, isEmojiMsg, getEmojiName, getEmojiUrl,
        switchBottomMenu, onEmojiCatTouchStart, onEmojiCatTouchEnd, toggleEmojiCatRole,
        isPhotoMsg, getPhotoText, sendPhotoMessage, openPhotoViewer,
        // 状态栏暴露的方法和属性
        statusBarForm, saveStatusBarPreset, editStatusBarPreset, deleteStatusBarPreset,
        testStatusBarPreview,
        statusBarHistory, chatStateStatusBarHistoryOpen, openStatusBarHistory,
        exportStatusBar, exportAllStatusBars,         importStatusBar, triggerStatusBarImport,
        getPersonaById,
        chatState, 
        openStatusBarView: (msg) => { 
            let targetMsg = msg;
            if (!targetMsg.statusBarText && targetMsg.batchId) {
                const conv = activeRawConv.value;
                if (conv && conv.messages) {
                    const found = conv.messages.find(m => m.batchId === targetMsg.batchId && m.statusBarText);
                    if (found) targetMsg = found;
                }
            }
            if(targetMsg.statusBarText) { 
                chatState.statusBarViewMsg = targetMsg; 
                if (!chatState.statusBarViewMsg.statusBarRenderedHtml) {
                    chatState.statusBarViewMsg.statusBarRenderedHtml = renderStatusBarHTML(chatState.statusBarViewMsg);
                }
            } else { 
                alert('未捕捉到该条消息隐藏的状态数据！'); 
            } 
        }
    };
};
