window.useChatLogic = function(state) {
    const { reactive, computed, watch, nextTick } = Vue;
    
    if (!state.chatData) state.chatData = { accounts: {}, groups: {}, sessionUserId: '', loginHistory: [] };
    if (!state.chatData.accounts) state.chatData.accounts = {};
    if (!state.chatData.groups) state.chatData.groups = {};
    if (!state.chatData.loginHistory) state.chatData.loginHistory = [];
    if (state.chatData.sessionUserId === undefined) state.chatData.sessionUserId = '';

    const chatDb = computed(() => state.chatData);
    const allPersonas = computed(() => [
        ...(state.contactsData?.myPersonas || []),
        ...(state.contactsData?.characters || [])
    ]);

    const statusPresets = [
        { text: '在线', color: '#52c41a' },
        { text: '隐身', color: '#9e9e9e' },
        { text: '忙碌', color: '#ff4d4f' },
        { text: '离开', color: '#faad14' },
        { text: '勿扰', color: '#722ed1' }
    ];

    const chatState = reactive({
        isLoggedIn: false, currentUser: null, activeTab: 'msg',
        showAddMenu: false, showMoreMenu: false, showStatusMenu: false, showSwitchMenu: false,
        searchQuery: '', showSettings: false, settingsPage: 'home',
        modals: { addFriend: false, createGroup: false, setCategory: false },
        loginForm: { acc: '', pwd: '' }, addFriendAcc: '', selectedFriendId: null, selectedCategoryId: '',
        friendProfileOpen: false, activeFriendProfileId: null,
        friendMomentsOpen: false, activeFriendMomentOwnerId: null
    });

    const refreshIcons = () => { nextTick(() => { if (window.lucide) window.lucide.createIcons(); }); };

    watch([
        () => chatState.activeTab,
        () => chatState.isLoggedIn,
        () => chatState.modals.addFriend,
        () => chatState.showAddMenu,
        () => chatState.showMoreMenu,
        () => chatState.modals.setCategory,
        () => chatState.showStatusMenu,
        () => chatState.showSwitchMenu,
        () => chatState.showSettings,
        () => chatState.settingsPage,
        () => chatState.friendProfileOpen,
        () => chatState.friendMomentsOpen
    ], refreshIcons);

    const getPersonaById = (id) => allPersonas.value.find(c => c.id === id) || null;

    const ensureAccountData = (userId) => {
        const persona = getPersonaById(userId);
        if (!chatDb.value.accounts[userId]) {
            chatDb.value.accounts[userId] = {
                friends: [],
                conversations: [],
                status: '在线',
                statusColor: '#52c41a',
                categories: [],
                friendCategories: {},
                favorites: [],
                wallet: { balance: 0 },
                profile: {
                    nickname: persona?.chatName || persona?.name || '未命名',
                    realName: persona?.name || '',
                    signature: '这个人很神秘',
                    gender: '',
                    birthday: '',
                    allowProfileView: true,
                    bg: '',
                    publicCard: {
                        mbti: '',
                        city: '',
                        job: '',
                        school: '',
                        hobby: '',
                        intro: ''
                    },
                    moments: []
                }
            };
        } else {
            const acc = chatDb.value.accounts[userId];
            if (!acc.friends) acc.friends = [];
            if (!acc.conversations) acc.conversations = [];
            if (!acc.categories) acc.categories = [];
            if (!acc.friendCategories) acc.friendCategories = {};
            if (!acc.favorites) acc.favorites = [];
            if (!acc.wallet) acc.wallet = { balance: 0 };
            if (!acc.profile) acc.profile = {};
            if (acc.profile.nickname === undefined) acc.profile.nickname = persona?.chatName || persona?.name || '未命名';
            if (acc.profile.realName === undefined) acc.profile.realName = persona?.name || '';
            if (acc.profile.signature === undefined) acc.profile.signature = '这个人很神秘';
            if (acc.profile.gender === undefined) acc.profile.gender = '';
            if (acc.profile.birthday === undefined) acc.profile.birthday = '';
            if (acc.profile.allowProfileView === undefined) acc.profile.allowProfileView = true;
            if (acc.profile.bg === undefined) acc.profile.bg = '';
            if (!acc.profile.publicCard) {
                acc.profile.publicCard = { mbti: '', city: '', job: '', school: '', hobby: '', intro: '' };
            } else {
                if (acc.profile.publicCard.mbti === undefined) acc.profile.publicCard.mbti = '';
                if (acc.profile.publicCard.city === undefined) acc.profile.publicCard.city = '';
                if (acc.profile.publicCard.job === undefined) acc.profile.publicCard.job = '';
                if (acc.profile.publicCard.school === undefined) acc.profile.publicCard.school = '';
                if (acc.profile.publicCard.hobby === undefined) acc.profile.publicCard.hobby = '';
                if (acc.profile.publicCard.intro === undefined) acc.profile.publicCard.intro = '';
            }
            if (!Array.isArray(acc.profile.moments)) acc.profile.moments = [];
            if (!acc.status) acc.status = '在线';
            if (!acc.statusColor) {
                const preset = statusPresets.find(s => s.text === acc.status);
                acc.statusColor = preset ? preset.color : '#52c41a';
            }
        }
    };

    const currentAccountData = computed(() => {
        if (!chatState.currentUser) return null;
        ensureAccountData(chatState.currentUser.id);
        return chatDb.value.accounts[chatState.currentUser.id];
    });

    const currentProfile = computed(() => currentAccountData.value?.profile || null);

    const currentDisplayName = computed(() => {
        if (!chatState.currentUser) return '';
        return currentProfile.value?.nickname || chatState.currentUser.chatName || chatState.currentUser.name || '未命名';
    });

    const currentSignature = computed(() => currentProfile.value?.signature || '');

    const accountSwitchList = computed(() => {
        const ids = chatDb.value.loginHistory || [];
        return ids.map(id => {
            const user = getPersonaById(id);
            if (!user) return null;
            ensureAccountData(id);
            const acc = chatDb.value.accounts[id];
            return { id, avatar: user.avatar, name: acc.profile?.nickname || user.chatName || user.name || '未命名', chatAcc: user.chatAcc || '' };
        }).filter(Boolean);
    });
const getRemarkNameByFriendId = (friendId) => {
    if (!currentAccountData.value) return '';
    const conv = (currentAccountData.value.conversations || []).find(item =>
        item.type === 'private' && item.targetId === friendId
    );
    return String(conv?.settings?.remarkName || '').trim();
};

const getDisplayNameById = (id) => {
    const user = getPersonaById(id);
    if (!user) return '未知用户';
    ensureAccountData(id);
    const remarkName = getRemarkNameByFriendId(id);
    return remarkName || user.chatName || user.name || '未知用户';
};

    const restoreSession = () => {
        const sessionId = chatDb.value.sessionUserId;
        if (!sessionId) return;
        const user = getPersonaById(sessionId);
        if (!user) { chatDb.value.sessionUserId = ''; chatState.isLoggedIn = false; chatState.currentUser = null; return; }
        ensureAccountData(user.id);
        chatState.currentUser = user;
        chatState.isLoggedIn = true;
    };

    const syncPersonaToAccount = (persona) => {
        if (!persona?.id) return;
        ensureAccountData(persona.id);
        const acc = chatDb.value.accounts[persona.id];
        if (!acc.profile) acc.profile = {};
        const nextNick = persona.chatName || persona.name || '未命名';
        const nextRealName = persona.name || '';
        if (acc.profile.nickname !== nextNick) acc.profile.nickname = nextNick;
        if (acc.profile.realName !== nextRealName) acc.profile.realName = nextRealName;
    };

    watch(allPersonas, (list) => {
        (list || []).forEach(syncPersonaToAccount);
    }, { immediate: true, deep: true });

    watch([allPersonas, () => chatDb.value.sessionUserId], () => {
        if (chatState.currentUser) {
            const fresh = getPersonaById(chatState.currentUser.id);
            if (fresh) {
                chatState.currentUser = fresh;
                syncPersonaToAccount(fresh);
            }
        }
        if (!chatState.isLoggedIn && chatDb.value.sessionUserId) restoreSession();
    }, { immediate: true });

    const addToLoginHistory = (userId) => {
        if (!chatDb.value.loginHistory) chatDb.value.loginHistory = [];
        chatDb.value.loginHistory = [userId, ...chatDb.value.loginHistory.filter(id => id !== userId)];
    };

    const handleLogin = () => {
        if (!chatState.loginForm.acc) return alert('请输入账号');
        const acc = chatState.loginForm.acc.trim();
        const pwd = chatState.loginForm.pwd;
        const user = allPersonas.value.find(c => c.chatAcc === acc && c.chatPwd === pwd);
        if (user) {
            ensureAccountData(user.id);
            chatState.currentUser = user;
            chatState.isLoggedIn = true;
            chatState.loginForm = { acc: '', pwd: '' };
            chatDb.value.sessionUserId = user.id;
            addToLoginHistory(user.id);
        } else alert('账号或密码错误！');
    };

    const switchAccount = (userId) => {
        const user = getPersonaById(userId);
        if (!user) return;
        ensureAccountData(user.id);
        chatState.currentUser = user;
        chatState.isLoggedIn = true;
        chatDb.value.sessionUserId = user.id;
        addToLoginHistory(user.id);
        chatState.showSwitchMenu = false;
        chatState.showStatusMenu = false;
        refreshIcons();
    };

    const handleLogout = () => {
        chatState.showMoreMenu = false;
        chatState.showStatusMenu = false;
        chatState.showSwitchMenu = false;
        if (confirm('确定退出当前账号吗？')) {
            chatState.isLoggedIn = false;
            chatState.currentUser = null;
            chatState.activeTab = 'msg';
            chatState.showSettings = false;
            chatState.settingsPage = 'home';
            chatState.friendProfileOpen = false;
            chatState.activeFriendProfileId = null;
            chatState.friendMomentsOpen = false;
            chatState.activeFriendMomentOwnerId = null;
            chatDb.value.sessionUserId = '';
        }
    };

    const returnToDesktop = () => {
        chatState.showMoreMenu = false;
        chatState.showStatusMenu = false;
        chatState.showSwitchMenu = false;
        state.activeApp = null;
        refreshIcons();
    };

    const toggleStatusMenu = () => {
        chatState.showStatusMenu = !chatState.showStatusMenu;
        chatState.showMoreMenu = false;
        chatState.showAddMenu = false;
    };
    const setPresetStatus = (item) => {
        if (!chatState.currentUser) return;
        const accData = currentAccountData.value;
        accData.status = item.text;
        accData.statusColor = item.color;
        chatState.showStatusMenu = false;
    };
    const setCustomStatus = () => {
        if (!chatState.currentUser) return;
        const txt = prompt('请输入自定义状态：', currentAccountData.value?.status || '');
        if (txt === null) return;
        const value = txt.trim();
        if (!value) return;
        const accData = currentAccountData.value;
        accData.status = value;
        accData.statusColor = '#3b82f6';
        chatState.showStatusMenu = false;
    };
    const openMySettings = () => {
        if (!chatState.currentUser) return;
        chatState.showSettings = true;
        chatState.settingsPage = 'home';
        chatState.showStatusMenu = false;
        chatState.showMoreMenu = false;
        chatState.showAddMenu = false;
        chatState.showSwitchMenu = false;
        refreshIcons();
    };
    const closeMySettings = () => {
        chatState.showSettings = false;
        chatState.settingsPage = 'home';
        chatState.showSwitchMenu = false;
    };
    const openSettingsPage = (page) => {
        chatState.settingsPage = page;
        chatState.showSwitchMenu = false;
    };
    const toggleSwitchMenu = () => { chatState.showSwitchMenu = !chatState.showSwitchMenu; };

    const saveProfileEdit = () => {
        if (!chatState.currentUser) return;
        const me = chatState.currentUser;
        const duplicated = allPersonas.value.find(item => item.id !== me.id && item.chatAcc === me.chatAcc);
        if (duplicated) return alert('该 Chat ID 已被使用，请换一个。');
        if (!me.chatAcc || !String(me.chatAcc).trim()) return alert('Chat ID 不能为空');

        ensureAccountData(me.id);
        chatDb.value.accounts[me.id].profile.nickname = me.chatName || me.name || '未命名';
        chatDb.value.accounts[me.id].profile.realName = me.name || '';

        alert('资料已保存');
        chatState.settingsPage = 'home';
    };

    const triggerMySettingsBgUpload = () => {
        if (!chatState.currentUser) return;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                ensureAccountData(chatState.currentUser.id);
                chatDb.value.accounts[chatState.currentUser.id].profile.bg = ev.target.result;
            };
            reader.readAsDataURL(file);
        };
        input.click();
    };

    const triggerMyAvatarUpload = () => {
        if (!chatState.currentUser) return;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => { chatState.currentUser.avatar = ev.target.result; };
            reader.readAsDataURL(file);
        };
        input.click();
    };

    const addContactCategory = () => {
        const name = prompt('分类名称：');
        if (name && name.trim()) currentAccountData.value.categories.push({ id: 'ccat_' + Date.now(), name: name.trim() });
    };

    const openSetCategory = (friendId) => {
        chatState.selectedFriendId = friendId;
        chatState.selectedCategoryId = currentAccountData.value.friendCategories[friendId] || '';
        chatState.modals.setCategory = true;
    };

    const saveContactCategory = () => {
        const accData = currentAccountData.value;
        if (chatState.selectedCategoryId) accData.friendCategories[chatState.selectedFriendId] = chatState.selectedCategoryId;
        else delete accData.friendCategories[chatState.selectedFriendId];
        chatState.modals.setCategory = false;
    };
    
    const confirmAddFriend = () => {
        const keyword = chatState.addFriendAcc.trim();
        if (!keyword) return alert('请输入对方手机号或 Chat ID');
        const targetUser = allPersonas.value.find(c => c.chatAcc === keyword || c.phone === keyword);
        if (!targetUser) return alert('未找到该账号/手机号，请检查');
        if (targetUser.id === chatState.currentUser.id) return alert('不能添加自己');

        ensureAccountData(chatState.currentUser.id);
        ensureAccountData(targetUser.id);
        const myAccData = currentAccountData.value;
        const targetAccData = chatDb.value.accounts[targetUser.id];
        if ((myAccData.friends || []).includes(targetUser.id)) return alert('对方已是您的好友');

        myAccData.friends.unshift(targetUser.id);
        targetAccData.friends.unshift(chatState.currentUser.id);
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        myAccData.conversations.unshift({ id: 'c_' + Date.now(), type: 'private', targetId: targetUser.id, lastMsg: '你们已成为好友，开始聊天吧！', time: timeStr, messages: [], settings: { remarkName: '' } });
        targetAccData.conversations.unshift({ id: 'c_' + (Date.now() + 1), type: 'private', targetId: chatState.currentUser.id, lastMsg: '你们已成为好友，开始聊天吧！', time: timeStr, messages: [], settings: { remarkName: '' } });

        chatState.addFriendAcc = '';
        chatState.modals.addFriend = false;
        chatState.showAddMenu = false;
        alert('添加成功！');
    };

    const myConversations = computed(() => {
        if (!chatState.currentUser || !currentAccountData.value) return [];
        const accData = currentAccountData.value;
        let list = (accData.conversations || []).map(conv => {
            const target = getPersonaById(conv.targetId);
            if (target?.id) ensureAccountData(target.id);
            const targetAcc = target?.id ? chatDb.value.accounts[target.id] : null;
            return {
                ...conv,
                name: conv.settings?.remarkName || (target ? getDisplayNameById(conv.targetId) : '未知用户'),
                avatar: target ? target.avatar : '',
                status: targetAcc?.status || '在线',
                statusColor: targetAcc?.statusColor || '#52c41a'
            };
        });
        const q = chatState.searchQuery.trim().toLowerCase();
        if (q) {
            const matchedCats = (accData.categories || []).filter(c => c.name.toLowerCase().includes(q));
            const catFriendIds = Object.keys(accData.friendCategories || {}).filter(fid => matchedCats.some(c => c.id === accData.friendCategories[fid]));
            list = list.filter(c => String(c.name || '').toLowerCase().includes(q) || catFriendIds.includes(c.targetId));
        }
        return list;
    });

    const myFriends = computed(() => {
        if (!chatState.currentUser || !currentAccountData.value) return [];
        const accData = currentAccountData.value;
        let list = (accData.friends || []).map(fid => {
            const c = getPersonaById(fid);
            if (!c) return null;
            ensureAccountData(fid);
            const acc = chatDb.value.accounts[fid];
            const catId = (accData.friendCategories || {})[fid];
            const cat = (accData.categories || []).find(x => x.id === catId);
            const moments = Array.isArray(acc?.profile?.moments) ? acc.profile.moments : [];
return {
    ...c,
    displayName: getDisplayNameById(fid),
    categoryName: cat ? cat.name : '',
    status: acc?.status || '在线',
    statusColor: acc?.statusColor || '#52c41a',
    profileBg: acc?.profile?.bg || '',
    signature: acc?.profile?.signature || '',
    publicCard: acc?.profile?.publicCard || {},
    moments
};

        }).filter(Boolean);
        const q = chatState.searchQuery.trim().toLowerCase();
        if (q) list = list.filter(c => String(c.displayName || '').toLowerCase().includes(q) || (c.categoryName && c.categoryName.toLowerCase().includes(q)));
        return list;
    });

    const activeFriendProfile = computed(() => {
        const id = chatState.activeFriendProfileId;
        if (!id) return null;
        const persona = getPersonaById(id);
        if (!persona) return null;
        ensureAccountData(id);
        const acc = chatDb.value.accounts[id];
        const publicCard = acc?.profile?.publicCard || {};
        const moments = Array.isArray(acc?.profile?.moments) ? acc.profile.moments : [];
        return {
    ...persona,
    id,
    displayName: persona.chatName || persona.name || acc?.profile?.nickname || '未命名',
    profileBg: acc?.profile?.bg || '',
    signature: acc?.profile?.signature || '',
    status: acc?.status || '在线',
    statusColor: acc?.statusColor || '#52c41a',
    publicCard,
    moments
};
    });

    const activeFriendMoments = computed(() => {
        const profile = activeFriendProfile.value;
        return Array.isArray(profile?.moments) ? profile.moments : [];
    });

    const activeFriendMomentPreview = computed(() => {
        const list = activeFriendMoments.value || [];
        return list.slice(0, 3);
    });

    const openFriendProfile = (friendId) => {
        if (!friendId) return;
        ensureAccountData(friendId);
        chatState.activeFriendProfileId = friendId;
        chatState.friendProfileOpen = true;
        chatState.friendMomentsOpen = false;
        refreshIcons();
    };

    const closeFriendProfile = () => {
        chatState.friendProfileOpen = false;
        chatState.activeFriendProfileId = null;
        chatState.friendMomentsOpen = false;
        chatState.activeFriendMomentOwnerId = null;
    };

    const openFriendMoments = (friendId) => {
        if (!friendId) return;
        ensureAccountData(friendId);
        chatState.activeFriendProfileId = friendId;
        chatState.activeFriendMomentOwnerId = friendId;
        chatState.friendMomentsOpen = true;
        refreshIcons();
    };

    const closeFriendMoments = () => {
        chatState.friendMomentsOpen = false;
        chatState.activeFriendMomentOwnerId = null;
    };

    const getSharedApiConfig = () => {
        const apiConf = state.apiConfig || {};
        let temperature = Number(apiConf.temperature);
        if (Number.isNaN(temperature)) temperature = 0.85;
        temperature = Math.max(0, Math.min(2, temperature));
        return {
            baseUrl: String(apiConf.baseUrl || '').trim(),
            apiKey: String(apiConf.apiKey || '').trim(),
            model: String(apiConf.activeModel || '').trim(),
            stream: apiConf.stream !== false,
            temperature
        };
    };

    const normalizeApiUrl = (baseUrl) => {
        let url = String(baseUrl || '').trim();
        if (url.endsWith('/')) url = url.slice(0, -1);
        if (!url.endsWith('/v1') && !url.includes('/v1/')) url += '/v1';
        return url;
    };

    const requestAiText = async (systemPrompt, userPrompt) => {
        const { baseUrl, apiKey, model, stream, temperature } = getSharedApiConfig();
        if (!baseUrl || !apiKey || !model) {
            throw new Error('请先在设置里补全 API 地址、密钥并选择模型');
        }

        const url = normalizeApiUrl(baseUrl);
        const requestBody = {
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature,
            stream
        };

        const doNonStream = async () => {
            const res = await fetch(url + '/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({ ...requestBody, stream: false })
            });
            if (!res.ok) throw new Error(`API 请求失败: ${res.status}`);
            const data = await res.json();
            return data?.choices?.[0]?.message?.content || '';
        };

        if (!stream) return await doNonStream();

        const response = await fetch(url + '/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) throw new Error(`API 请求失败: ${response.status}`);
        if (!response.body || !response.body.getReader) return await doNonStream();

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let sseBuffer = '';
        let content = '';

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
                    if (delta) content += delta;
                } catch (e) {}
            }
        }

        return content;
    };

    const triggerFriendProfileBgUpload = () => {
        const id = chatState.activeFriendProfileId;
        if (!id) return;
        ensureAccountData(id);

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                chatDb.value.accounts[id].profile.bg = ev.target.result;
            };
            reader.readAsDataURL(file);
        };
        input.click();
    };

    const generateActiveFriendPublicProfile = async () => {
        const profile = activeFriendProfile.value;
        if (!profile?.id) return;
        ensureAccountData(profile.id);

        const acc = chatDb.value.accounts[profile.id];
        if (!acc.profile) acc.profile = {};
        if (!acc.profile.publicCard) acc.profile.publicCard = { mbti: '', city: '', job: '', school: '', hobby: '', intro: '' };

        const systemPrompt = [
            `你正在为一个 Chat 联系人完善“公开资料卡”。`,
            `你必须根据角色人设，生成适合公开展示的内容。`,
            `这些内容必须像真实用户会公开展示的资料，不能写得像小说。`,
            `同时你还要给这个角色重新写一句自然、简短、有角色感的个性签名。`,
            `请严格返回 JSON，不要输出 markdown，不要解释。`,
            `返回格式必须严格为：`,
            `{`,
            `  "signature": "一句新的个性签名",`,
            `  "publicCard": {`,
            `    "mbti": "MBTI，可为空字符串",`,
            `    "city": "城市，可为空字符串",`,
            `    "job": "职业，可为空字符串",`,
            `    "school": "学校，可为空字符串",`,
            `    "hobby": "兴趣爱好，可为空字符串",`,
            `    "intro": "适合公开展示的简介，可为空字符串"`,
            `  }`,
            `}`
        ].join('\n');

        const userPrompt = [
            `角色真名：${profile.name || ''}`,
            `Chat昵称：${profile.displayName || profile.chatName || ''}`,
            `角色设定：${profile.persona || ''}`,
            `当前个性签名：${acc.profile.signature || ''}`,
            `当前公开资料：${JSON.stringify(acc.profile.publicCard || {})}`
        ].join('\n');

        try {
            const raw = await requestAiText(systemPrompt, userPrompt);
            let content = String(raw || '').trim();
            content = content.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
            const parsed = JSON.parse(content);

            if (parsed.signature !== undefined) acc.profile.signature = String(parsed.signature || '').trim();

            const nextCard = parsed.publicCard || {};
            acc.profile.publicCard.mbti = String(nextCard.mbti || '').trim();
            acc.profile.publicCard.city = String(nextCard.city || '').trim();
            acc.profile.publicCard.job = String(nextCard.job || '').trim();
            acc.profile.publicCard.school = String(nextCard.school || '').trim();
            acc.profile.publicCard.hobby = String(nextCard.hobby || '').trim();
            acc.profile.publicCard.intro = String(nextCard.intro || '').trim();

            alert('已让角色重新整理公开资料和个性签名。');
        } catch (err) {
            console.error('generateActiveFriendPublicProfile error:', err);
            alert(`生成失败：${err.message}`);
        }
    };

    const myFavorites = computed(() => currentAccountData.value?.favorites || []);
    const myWallet = computed(() => currentAccountData.value?.wallet || { balance: 0 });

    return {
        chatState,
        chatDb,
        statusPresets,
        currentAccountData,
        currentProfile,
        currentDisplayName,
        currentSignature,
        accountSwitchList,
        handleLogin,
        handleLogout,
        returnToDesktop,
        toggleStatusMenu,
        setPresetStatus,
        setCustomStatus,
        openMySettings,
        closeMySettings,
        openSettingsPage,
        toggleSwitchMenu,
        switchAccount,
        saveProfileEdit,
        triggerMySettingsBgUpload,
        triggerMyAvatarUpload,
        addContactCategory,
        openSetCategory,
        saveContactCategory,
        confirmAddFriend,
        myConversations,
        myFriends,
        myFavorites,
        myWallet,
        activeFriendProfile,
        activeFriendMoments,
        activeFriendMomentPreview,
        openFriendProfile,
        closeFriendProfile,
        openFriendMoments,
        closeFriendMoments,
        triggerFriendProfileBgUpload,
        generateActiveFriendPublicProfile
    };
};
