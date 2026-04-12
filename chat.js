window.useChatLogic = function(state) {
    const { reactive, computed, watch, nextTick } = Vue;
    
    if (!state.chatData) state.chatData = { accounts: {}, groups: {}, sessionUserId: '', loginHistory: [] };
    if (!state.chatData.accounts) state.chatData.accounts = {};
    if (!state.chatData.groups) state.chatData.groups = {};
    if (!state.chatData.loginHistory) state.chatData.loginHistory = [];
    if (state.chatData.sessionUserId === undefined) state.chatData.sessionUserId = '';
    if (!state.chatData.avatarLibrary) state.chatData.avatarLibrary = [];
    if (state.chatData.avatarChannelCover === undefined) state.chatData.avatarChannelCover = '';

    const chatDb = computed(() => state.chatData);
    const allPersonas = computed(() => [
        ...(state.contactsData?.myPersonas || []),
        ...(state.contactsData?.characters || []),
        ...(state.contactsData?.npcs || [])
    ]);

    const defaultImg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23dcdcdc'/%3E%3C/svg%3E";

    const statusPresets = [
        { text: '在线', color: '#52c41a' },
        { text: '隐身', color: '#9e9e9e' },
        { text: '忙碌', color: '#ff4d4f' },
        { text: '离开', color: '#faad14' },
        { text: '勿扰', color: '#722ed1' }
    ];

    if (!state.chatData.friendRequests) state.chatData.friendRequests = [];

    const chatState = reactive({
        isLoggedIn: false, currentUser: null, activeTab: 'msg',
        showAddMenu: false, showMoreMenu: false, showStatusMenu: false, showSwitchMenu: false,
        searchQuery: '', showSettings: false, settingsPage: 'home',
        modals: { addFriend: false, createGroup: false, setCategory: false, newFriends: false },
        loginForm: { acc: '', pwd: '' }, addFriendAcc: '', selectedFriendId: null, selectedCategoryId: '',
        friendProfileOpen: false, activeFriendProfileId: null,
        friendMomentsOpen: false, activeFriendMomentOwnerId: null,
        bgSummaryRawText: '',
        showAvatarChannel: false, showAvatarAddMenu: false, showAvatarUrlModal: false, avatarUrlInput: '', showAvatarItemMenu: false, avatarMenuTargetIdx: null,        showConvMenu: false, menuConv: null
    });

    const hashString = (str) => {
        let hash = 0;
        const s = String(str || '');
        for (let i = 0; i < s.length; i++) { hash = ((hash << 5) - hash) + s.charCodeAt(i); hash |= 0; }
        return Math.abs(hash);
    };

    const refreshIcons = () => { nextTick(() => { if (window.lucide) window.lucide.createIcons(); }); };

    watch(() => state.contactsData?.relationships, (rels) => {
        if (!Array.isArray(rels)) return;
        const meIds = (state.contactsData?.myPersonas || []).map(p => p.id);
        rels.forEach(rel => {
            if (rel && !meIds.includes(rel.sourceId) && !meIds.includes(rel.targetId)) {
                ensureAccountData(rel.sourceId);
                ensureAccountData(rel.targetId);
                const sAcc = state.chatData.accounts[rel.sourceId];
                const tAcc = state.chatData.accounts[rel.targetId];
                if (sAcc && tAcc) {
                    if (!sAcc.friends.includes(rel.targetId)) sAcc.friends.unshift(rel.targetId);
                    if (!tAcc.friends.includes(rel.sourceId)) tAcc.friends.unshift(rel.sourceId);
                }
            }
        });
    }, { deep: true, immediate: true });

    const myFriendRequests = computed(() => {
        if (!chatState.currentUser || !Array.isArray(state.chatData.friendRequests)) return [];
        return state.chatData.friendRequests.filter(r => r && r.toId === chatState.currentUser.id).sort((a,b) => (b.time || 0) - (a.time || 0));
    });
    const hasPendingRequests = computed(() => myFriendRequests.value.some(r => r.status === 'pending'));

    const acceptFriendRequest = (req) => {
        if(!req) return;
        req.status = 'accepted';
        ensureAccountData(req.fromId);
        ensureAccountData(req.toId);
        const fromAcc = state.chatData.accounts[req.fromId];
        const toAcc = state.chatData.accounts[req.toId];
        if (fromAcc && toAcc) {
            if (!fromAcc.friends.includes(req.toId)) fromAcc.friends.unshift(req.toId);
            if (!toAcc.friends.includes(req.fromId)) toAcc.friends.unshift(req.fromId);

            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            if (!toAcc.conversations.find(c => c && c.targetId === req.fromId)) {
                toAcc.conversations.unshift({ id: 'c_' + Date.now(), type: 'private', targetId: req.fromId, lastMsg: '我们已成为好友，开始聊天吧！', time: timeStr, messages: [], settings: {} });
            }
            if (!fromAcc.conversations.find(c => c && c.targetId === req.toId)) {
                fromAcc.conversations.unshift({ id: 'c_' + (Date.now()+1), type: 'private', targetId: req.toId, lastMsg: '我们已成为好友，开始聊天吧！', time: timeStr, messages: [], settings: {} });
            }
        }
    };

    watch([ () => chatState.activeTab, () => chatState.isLoggedIn, () => chatState.modals.addFriend, () => chatState.showAddMenu, () => chatState.showMoreMenu, () => chatState.modals.setCategory, () => chatState.showStatusMenu, () => chatState.showSwitchMenu, () => chatState.showSettings, () => chatState.settingsPage, () => chatState.friendProfileOpen, () => chatState.friendMomentsOpen, () => chatState.showAvatarChannel ], refreshIcons);

    const getPersonaById = (id) => {
        if(!id) return null;
        let p = allPersonas.value.find(c => c && c.id === id);
        if (p) return p;
        if (state.chatData.accounts[id] && state.chatData.accounts[id].profile) {
            const prof = state.chatData.accounts[id].profile;
            return { id: id, name: prof.realName || prof.nickname || '未知用户', chatName: prof.nickname || '未知用户', avatar: prof.avatar || defaultImg, persona: prof.signature || '' };
        }
        return null;
    };

    const ensureAccountData = (userId) => {
        if(!userId) return;
        const persona = getPersonaById(userId);
        if (!state.chatData.accounts[userId]) {
            state.chatData.accounts[userId] = {
                friends: [], conversations: [], status: '在线', statusColor: '#52c41a', categories: [], friendCategories: {}, favorites: [], wallet: { balance: 0 },
                profile: { nickname: persona?.chatName || persona?.name || '未命名', realName: persona?.name || '', signature: '这个人很神秘', gender: '', birthday: '', allowProfileView: true, bg: '', publicCard: { mbti: '', city: '', job: '', school: '', hobby: '', intro: '' }, moments: [] }
            };
        } else {
            const acc = state.chatData.accounts[userId];
            if (!Array.isArray(acc.friends)) acc.friends = [];
            if (!Array.isArray(acc.conversations)) acc.conversations = [];
            if (!Array.isArray(acc.categories)) acc.categories = [];
            if (!acc.friendCategories) acc.friendCategories = {};
            if (!Array.isArray(acc.favorites)) acc.favorites = [];
            if (!acc.wallet) acc.wallet = { balance: 0 };
            if (!acc.profile) acc.profile = {};
            if (acc.profile.nickname === undefined) acc.profile.nickname = persona?.chatName || persona?.name || '未命名';
            if (acc.profile.realName === undefined) acc.profile.realName = persona?.name || '';
            if (acc.profile.signature === undefined) acc.profile.signature = '这个人很神秘';
            if (acc.profile.gender === undefined) acc.profile.gender = '';
            if (acc.profile.birthday === undefined) acc.profile.birthday = '';
            if (acc.profile.allowProfileView === undefined) acc.profile.allowProfileView = true;
            if (acc.profile.bg === undefined) acc.profile.bg = '';
            if (!acc.profile.publicCard) { acc.profile.publicCard = { mbti: '', city: '', job: '', school: '', hobby: '', intro: '' }; }
            if (!Array.isArray(acc.profile.moments)) acc.profile.moments = [];
            if (!acc.status) acc.status = '在线';
            if (!acc.statusColor) {
                const preset = statusPresets.find(s => s.text === acc.status);
                acc.statusColor = preset ? preset.color : '#52c41a';
            }
        }
        const acc = state.chatData.accounts[userId];
        const sysTypes = [
            { id: 'system', name: '系统安全中心' },
            { id: 'draft', name: '草稿箱' },
            { id: 'accounting', name: '记账系统' }
        ];
        sysTypes.forEach(sys => {
            if (!acc.conversations.find(c => c && c.targetId === sys.id)) {
                acc.conversations.push({ id: 'c_' + sys.id + '_' + Date.now(), type: 'private', targetId: sys.id, lastMsg: '', time: '', messages: [], settings: { remarkName: sys.name } });
            }
        });
    };

    const currentAccountData = computed(() => {
        if (!chatState.currentUser || !chatState.currentUser.id) return null;
        return state.chatData.accounts[chatState.currentUser.id] || null;
    });

    const currentProfile = computed(() => currentAccountData.value?.profile || null);
    const currentDisplayName = computed(() => {
        if (!chatState.currentUser) return '';
        return currentProfile.value?.nickname || chatState.currentUser.chatName || chatState.currentUser.name || '未命名';
    });
    const currentSignature = computed(() => currentProfile.value?.signature || '');

    const accountSwitchList = computed(() => {
        const ids = state.chatData.loginHistory || [];
        return ids.map(id => {
            const user = getPersonaById(id);
            if (!user) return null;
            const acc = state.chatData.accounts[id];
            return { id, avatar: user.avatar || defaultImg, name: acc?.profile?.nickname || user.chatName || user.name || '未命名', chatAcc: user.chatAcc || '' };
        }).filter(Boolean);
    });

    const getRemarkNameByFriendId = (friendId) => {
        if (!currentAccountData.value || !Array.isArray(currentAccountData.value.conversations)) return '';
        const conv = currentAccountData.value.conversations.find(item => item && item.type === 'private' && item.targetId === friendId);
        return String(conv?.settings?.remarkName || '').trim();
    };

    const getDisplayNameById = (id) => {
        const user = getPersonaById(id);
        if (!user) return '未知用户';
        const remarkName = getRemarkNameByFriendId(id);
        return remarkName || user.chatName || user.name || '未知用户';
    };

    const restoreSession = () => {
        const sessionId = state.chatData.sessionUserId;
        if (!sessionId) return;
        const user = getPersonaById(sessionId);
        if (!user) { state.chatData.sessionUserId = ''; chatState.isLoggedIn = false; chatState.currentUser = null; return; }
        ensureAccountData(user.id);
        chatState.currentUser = user;
        chatState.isLoggedIn = true;
    };

    const syncPersonaToAccount = (persona) => {
        if (!persona || !persona.id) return;
        ensureAccountData(persona.id);
        const acc = state.chatData.accounts[persona.id];
        if (acc && acc.profile) {
            const nextNick = persona.chatName || persona.name || '未命名';
            const nextRealName = persona.name || '';
            if (acc.profile.nickname !== nextNick) acc.profile.nickname = nextNick;
            if (acc.profile.realName !== nextRealName) acc.profile.realName = nextRealName;
        }
    };

    watch(allPersonas, (list) => { (list || []).forEach(syncPersonaToAccount); }, { immediate: true, deep: true });

    watch([allPersonas, () => state.chatData.sessionUserId], () => {
        if (chatState.currentUser && chatState.currentUser.id) {
            const fresh = getPersonaById(chatState.currentUser.id);
            if (fresh) { chatState.currentUser = fresh; syncPersonaToAccount(fresh); }
        }
        if (!chatState.isLoggedIn && state.chatData.sessionUserId) restoreSession();
    }, { immediate: true });

    const addToLoginHistory = (userId) => {
        if (!state.chatData.loginHistory) state.chatData.loginHistory = [];
        state.chatData.loginHistory = [userId, ...state.chatData.loginHistory.filter(id => id !== userId)];
    };

    const addSystemNoticeToAccount = (userId, text) => {
        if(!userId) return;
        ensureAccountData(userId);
        const acc = state.chatData.accounts[userId];
        if(!acc || !Array.isArray(acc.conversations)) return;
        let sysConv = acc.conversations.find(c => c && c.targetId === 'system');
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (!sysConv) {
            sysConv = { id: 'c_sys_' + Date.now(), type: 'private', targetId: 'system', lastMsg: '', time: timeStr, messages: [], settings: { remarkName: '系统安全中心' } };
            acc.conversations.unshift(sysConv);
        } else {
            acc.conversations = acc.conversations.filter(c => c && c.id !== sysConv.id);
            acc.conversations.unshift(sysConv);
        }
        sysConv.messages.push({ id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), senderId: 'system', text, translation: '', showTrans: false, recalled: false, time: timeStr, type: 'sys' });
        sysConv.lastMsg = text; sysConv.time = timeStr;
    };

    const handleLogin = () => {
        if (!chatState.loginForm.acc) return alert('请输入账号');
        const acc = chatState.loginForm.acc.trim();
        const pwd = chatState.loginForm.pwd;
        if (!state.chatData.loginFailedAttempts) state.chatData.loginFailedAttempts = {};
        
        const targetUser = allPersonas.value.find(c => c && c.chatAcc === acc);
        if (!targetUser) return alert('账号或密码错误！');

        if (targetUser.chatPwd === pwd) {
            state.chatData.loginFailedAttempts[acc] = 0;
            ensureAccountData(targetUser.id);
            if (!targetUser.isMe) addSystemNoticeToAccount(targetUser.id, `【系统安全通知】您的账号于 ${new Date().toLocaleTimeString()} 在新设备上成功登录，如果不是您本人的操作，请注意账号安全！`);
            chatState.currentUser = targetUser; chatState.isLoggedIn = true; chatState.loginForm = { acc: '', pwd: '' };
            state.chatData.sessionUserId = targetUser.id; addToLoginHistory(targetUser.id);
            if (!targetUser.isMe) generateNpcBackgroundData(targetUser);
        } else {
            state.chatData.loginFailedAttempts[acc] = (state.chatData.loginFailedAttempts[acc] || 0) + 1;
            if (state.chatData.loginFailedAttempts[acc] >= 1) {
                addSystemNoticeToAccount(targetUser.id, `【系统安全警告】有未知设备尝试登录您的账号并输入了错误的密码，请注意账号安全防范！`);
                state.chatData.loginFailedAttempts[acc] = 0;
            }
            alert('账号或密码错误！');
        }
    };

    const switchAccount = (userId) => {
        const user = getPersonaById(userId);
        if (!user) return;
        ensureAccountData(user.id);
        if (!user.isMe) addSystemNoticeToAccount(user.id, `【系统安全通知】您的账号于 ${new Date().toLocaleTimeString()} 在新设备上成功登录，如果不是您本人的操作，请注意账号安全！`);
        chatState.currentUser = user; chatState.isLoggedIn = true; state.chatData.sessionUserId = user.id; addToLoginHistory(user.id);
        chatState.showSwitchMenu = false; chatState.showStatusMenu = false; refreshIcons();
        if (!user.isMe) generateNpcBackgroundData(user);
    };

    const handleLogout = () => {
        chatState.showMoreMenu = false; chatState.showStatusMenu = false; chatState.showSwitchMenu = false;
        if (confirm('确定退出当前账号吗？')) {
            chatState.isLoggedIn = false; chatState.currentUser = null; chatState.activeTab = 'msg'; chatState.showSettings = false; chatState.settingsPage = 'home';
            chatState.friendProfileOpen = false; chatState.activeFriendProfileId = null; chatState.friendMomentsOpen = false; chatState.activeFriendMomentOwnerId = null;
            state.chatData.sessionUserId = '';
        }
    };

    const returnToDesktop = () => { chatState.showMoreMenu = false; chatState.showStatusMenu = false; chatState.showSwitchMenu = false; state.activeApp = null; refreshIcons(); };
    const toggleStatusMenu = () => { chatState.showStatusMenu = !chatState.showStatusMenu; chatState.showMoreMenu = false; chatState.showAddMenu = false; };
    const setPresetStatus = (item) => { if (!chatState.currentUser) return; const accData = currentAccountData.value; if(accData) { accData.status = item.text; accData.statusColor = item.color; } chatState.showStatusMenu = false; };
    const setCustomStatus = () => { if (!chatState.currentUser) return; const txt = prompt('请输入自定义状态：', currentAccountData.value?.status || ''); if (txt === null) return; const value = txt.trim(); if (!value) return; const accData = currentAccountData.value; if(accData) { accData.status = value; accData.statusColor = '#3b82f6'; } chatState.showStatusMenu = false; };
    const openMySettings = () => { if (!chatState.currentUser) return; chatState.showSettings = true; chatState.settingsPage = 'home'; chatState.showStatusMenu = false; chatState.showMoreMenu = false; chatState.showAddMenu = false; chatState.showSwitchMenu = false; refreshIcons(); };
    const closeMySettings = () => { chatState.showSettings = false; chatState.settingsPage = 'home'; chatState.showSwitchMenu = false; };
    const openSettingsPage = (page) => { chatState.settingsPage = page; chatState.showSwitchMenu = false; };
    const toggleSwitchMenu = () => { chatState.showSwitchMenu = !chatState.showSwitchMenu; };

    const saveProfileEdit = () => {
        if (!chatState.currentUser) return;
        const me = chatState.currentUser;
        const duplicated = allPersonas.value.find(item => item && item.id !== me.id && item.chatAcc === me.chatAcc);
        if (duplicated) return alert('该 Chat ID 已被使用，请换一个。');
        if (!me.chatAcc || !String(me.chatAcc).trim()) return alert('Chat ID 不能为空');

        ensureAccountData(me.id);
        if(state.chatData.accounts[me.id] && state.chatData.accounts[me.id].profile) {
            state.chatData.accounts[me.id].profile.nickname = me.chatName || me.name || '未命名';
            state.chatData.accounts[me.id].profile.realName = me.name || '';
        }
        alert('资料已保存'); chatState.settingsPage = 'home';
    };

    const triggerMySettingsBgUpload = () => {
        if (!chatState.currentUser) return;
        const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0]; if (!file) return; const reader = new FileReader();
            reader.onload = (ev) => { ensureAccountData(chatState.currentUser.id); if(state.chatData.accounts[chatState.currentUser.id]) state.chatData.accounts[chatState.currentUser.id].profile.bg = ev.target.result; };
            reader.readAsDataURL(file);
        };
        input.click();
    };

    const triggerMyAvatarUpload = () => {
        if (!chatState.currentUser) return;
        const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0]; if (!file) return; const reader = new FileReader();
            reader.onload = (ev) => { chatState.currentUser.avatar = ev.target.result; };
            reader.readAsDataURL(file);
        };
        input.click();
    };

    const addContactCategory = () => { const name = prompt('分类名称：'); if (name && name.trim() && currentAccountData.value && Array.isArray(currentAccountData.value.categories)) currentAccountData.value.categories.push({ id: 'ccat_' + Date.now(), name: name.trim() }); };
    const openSetCategory = (friendId) => { chatState.selectedFriendId = friendId; chatState.selectedCategoryId = (currentAccountData.value && currentAccountData.value.friendCategories) ? currentAccountData.value.friendCategories[friendId] || '' : ''; chatState.modals.setCategory = true; };
    const saveContactCategory = () => { const accData = currentAccountData.value; if(accData && accData.friendCategories) { if (chatState.selectedCategoryId) accData.friendCategories[chatState.selectedFriendId] = chatState.selectedCategoryId; else delete accData.friendCategories[chatState.selectedFriendId]; } chatState.modals.setCategory = false; };
    
    const confirmAddFriend = () => {
        const keyword = chatState.addFriendAcc.trim();
        if (!keyword) return alert('请输入对方手机号或 Chat ID');
        const targetUser = allPersonas.value.find(c => c && (c.chatAcc === keyword || c.phone === keyword));
        if (!targetUser) return alert('未找到该账号/手机号，请检查');
        if (targetUser.id === chatState.currentUser.id) return alert('不能添加自己');

        ensureAccountData(chatState.currentUser.id); ensureAccountData(targetUser.id);
        const myAccData = currentAccountData.value; const targetAccData = state.chatData.accounts[targetUser.id];
        if (!myAccData || !targetAccData) return;
        if ((myAccData.friends || []).includes(targetUser.id)) return alert('对方已是您的好友');

        myAccData.friends.unshift(targetUser.id); targetAccData.friends.unshift(chatState.currentUser.id);
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        myAccData.conversations.unshift({ id: 'c_' + Date.now(), type: 'private', targetId: targetUser.id, lastMsg: '你们已成为好友，开始聊天吧！', time: timeStr, messages: [], settings: { remarkName: '' } });
        targetAccData.conversations.unshift({ id: 'c_' + (Date.now() + 1), type: 'private', targetId: chatState.currentUser.id, lastMsg: '你们已成为好友，开始聊天吧！', time: timeStr, messages: [], settings: { remarkName: '' } });

        chatState.addFriendAcc = ''; chatState.modals.addFriend = false; chatState.showAddMenu = false; alert('添加成功！');
    };

    const myConversations = computed(() => {
        if (!chatState.currentUser || !currentAccountData.value) return [];
        const accData = currentAccountData.value;
        let list = (accData.conversations || []).filter(Boolean).map(conv => {
            if (conv.targetId === 'system') return { ...conv, name: '系统安全中心', avatar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 32 32' fill='none' stroke='%231890ff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/%3E%3C/svg%3E", status: '系统保护中', statusColor: '#1890ff' };
            if (conv.targetId === 'draft') return { ...conv, name: '草稿箱', avatar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 32 32' fill='none' stroke='%23faad14' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'/%3E%3Cpath d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'/%3E%3C/svg%3E", status: '私密备忘', statusColor: '#faad14' };
            if (conv.targetId === 'accounting') return { ...conv, name: '记账系统', avatar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 32 32' fill='none' stroke='%2352c41a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='2' y='5' width='20' height='14' rx='2'/%3E%3Cpath d='M2 10h20'/%3E%3C/svg%3E", status: '钱包账单', statusColor: '#52c41a' };
            
            if (conv.type === 'group') {
                const grp = chatDb.value.groups?.[conv.targetId];
                return { 
                    ...conv, 
                    name: grp?.name || '未知群聊', 
                    avatar: grp?.customAvatar || '', 
                    isComposite: !grp?.customAvatar,
                    groupId: conv.targetId,
                    status: `${grp?.members?.length || 0} 人`, 
                    statusColor: '#9e9e9e' 
                };
            }

            const target = getPersonaById(conv.targetId);
            const targetAcc = target?.id ? state.chatData.accounts[target.id] : null;
            return { ...conv, name: conv.settings?.remarkName || (target ? getDisplayNameById(conv.targetId) : '未知用户'), avatar: target ? (target.avatar || defaultImg) : defaultImg, status: targetAcc?.status || '在线', statusColor: targetAcc?.statusColor || '#52c41a' };
        });
        const q = chatState.searchQuery.trim().toLowerCase();
        if (q) {
            const matchedCats = (accData.categories || []).filter(c => c && c.name && c.name.toLowerCase().includes(q));
            const catFriendIds = Object.keys(accData.friendCategories || {}).filter(fid => matchedCats.some(c => c.id === accData.friendCategories[fid]));
            list = list.filter(c => String(c.name || '').toLowerCase().includes(q) || catFriendIds.includes(c.targetId));
        }
        return list;
    });

    const myFriends = computed(() => {
        if (!chatState.currentUser || !currentAccountData.value) return [];
        const accData = currentAccountData.value;
        let list = (accData.friends || []).map(fid => {
            if(!fid) return null;
            const c = getPersonaById(fid);
            if (!c) return null;
            const acc = state.chatData.accounts[fid];
            const catId = (accData.friendCategories || {})[fid];
            const cat = (accData.categories || []).find(x => x && x.id === catId);
            const moments = Array.isArray(acc?.profile?.moments) ? acc.profile.moments : [];
            return { ...c, displayName: getDisplayNameById(fid), categoryName: cat ? cat.name : '', status: acc?.status || '在线', statusColor: acc?.statusColor || '#52c41a', profileBg: acc?.profile?.bg || '', signature: acc?.profile?.signature || '', publicCard: acc?.profile?.publicCard || {}, moments };
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
        const acc = state.chatData.accounts[id];
        const publicCard = acc?.profile?.publicCard || {};
        const moments = Array.isArray(acc?.profile?.moments) ? acc.profile.moments : [];
        return { ...persona, id, displayName: persona.chatName || persona.name || acc?.profile?.nickname || '未命名', profileBg: acc?.profile?.bg || '', signature: acc?.profile?.signature || '', status: acc?.status || '在线', statusColor: acc?.statusColor || '#52c41a', publicCard, moments };
    });

    const activeFriendMoments = computed(() => { const profile = activeFriendProfile.value; return Array.isArray(profile?.moments) ? profile.moments : []; });
    const activeFriendMomentPreview = computed(() => { const list = activeFriendMoments.value || []; return list.slice(0, 3); });

    const openFriendProfile = (friendId) => { if (!friendId) return; ensureAccountData(friendId); chatState.activeFriendProfileId = friendId; chatState.friendProfileOpen = true; chatState.friendMomentsOpen = false; refreshIcons(); };
    const closeFriendProfile = () => { chatState.friendProfileOpen = false; chatState.activeFriendProfileId = null; chatState.friendMomentsOpen = false; chatState.activeFriendMomentOwnerId = null; };
    const openFriendMoments = (friendId) => { if (!friendId) return; ensureAccountData(friendId); chatState.activeFriendProfileId = friendId; chatState.activeFriendMomentOwnerId = friendId; chatState.friendMomentsOpen = true; refreshIcons(); };
    const closeFriendMoments = () => { chatState.friendMomentsOpen = false; chatState.activeFriendMomentOwnerId = null; };

    const getSharedApiConfig = () => {
        const apiConf = state.apiConfig || {};
        let temperature = Number(apiConf.temperature);
        if (Number.isNaN(temperature)) temperature = 0.85;
        temperature = Math.max(0, Math.min(2, temperature));
        return { baseUrl: String(apiConf.baseUrl || '').trim(), apiKey: String(apiConf.apiKey || '').trim(), model: String(apiConf.activeModel || '').trim(), stream: apiConf.stream !== false, temperature };
    };

    const normalizeApiUrl = (baseUrl) => { let url = String(baseUrl || '').trim(); if (url.endsWith('/')) url = url.slice(0, -1); if (!url.endsWith('/v1') && !url.includes('/v1/')) url += '/v1'; return url; };

    const summarizeNpcBackground = async (user) => {
        if(!user) return;
        const apiConf = state.apiConfig || {};
        const sumBaseUrl = apiConf.summaryBaseUrl || apiConf.baseUrl;
        const sumApiKey = apiConf.summaryApiKey || apiConf.apiKey;
        const sumModel = apiConf.summaryModel || apiConf.activeModel;
        
        if (!sumBaseUrl || !sumApiKey || !sumModel) {
            alert('温馨提示：未配置 API，无法自动提炼核心记忆，但聊天数据已生成完毕！'); 
            state.sysGenStatus = 'idle'; 
            return;
        }
        
        state.sysGenStatus = 'loading';
        state.sysGenMsg = '正在生成记忆总结…';
        state.sysGenRetry = () => summarizeNpcBackground(user);
        nextTick(() => { if (window.lucide) window.lucide.createIcons(); });
        
        const sysPrompt = `请根据以下聊天和动态记录，总结出该角色（${user.name}）的3条核心记忆（以第一人称，如“我最近和xxx讨论了...”）。请直接输出纯文本，每行一条，不要加序号或其他多余内容。记录如下：\n${chatState.bgSummaryRawText}`;
        try {
            const url = normalizeApiUrl(sumBaseUrl);
            const res = await fetch(url + '/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sumApiKey}` }, body: JSON.stringify({ model: sumModel, messages: [{ role: 'system', content: sysPrompt }], temperature: Number(apiConf.summaryTemperature || apiConf.temperature || 0.5) }) });
            if (!res.ok) throw new Error('API Error');
            const data = await res.json();
            const text = data?.choices?.[0]?.message?.content || '';
            const lines = text.split('\n').map(l => l.trim().replace(/^\d+[\.、]\s*/, '')).filter(Boolean);
            if (!Array.isArray(user.memories)) user.memories = [];
            lines.forEach(l => { user.memories.unshift({ id: 'mem_gen_' + Date.now() + Math.random(), content: l, timestamp: Date.now(), weight: 3, type: 'world' }); });
            
            state.sysGenStatus = 'success';
            state.sysGenMsg = '总结成功！记忆已存入世界线';
            nextTick(() => { if (window.lucide) window.lucide.createIcons(); });
            setTimeout(() => { if(state.sysGenStatus === 'success') state.sysGenStatus = 'idle'; }, 4000);
        } catch (e) { 
            state.sysGenStatus = 'error'; 
            state.sysGenMsg = '总结失败，点击重试';
            nextTick(() => { if (window.lucide) window.lucide.createIcons(); });
        }
    };
    window.retrySummarizeNpcBackground = () => summarizeNpcBackground(chatState.currentUser);

    const generateNpcBackgroundData = async (user) => {
        if (!user || user.isMe) return;
        const apiConf = state.apiConfig || {};
        if (!apiConf.baseUrl || !apiConf.apiKey || !apiConf.activeModel) return;

        chatState.showSettings = true; 
        chatState.settingsPage = 'home'; 
        state.sysGenStatus = 'loading'; 
        state.sysGenMsg = '正在读取数据中…';
        state.sysGenRetry = () => generateNpcBackgroundData(user);
        nextTick(() => { if (window.lucide) window.lucide.createIcons(); });
        ensureAccountData(user.id);
        const acc = state.chatData.accounts[user.id];
        
        const usedAvatars = new Set();
        (acc.friends || []).forEach(fid => { const p = getPersonaById(fid); if (p && p.avatar && !p.avatar.includes('svg+xml')) usedAvatars.add(p.avatar); });
        const getUnusedAvatar = () => {
            const lib = state.chatData.avatarLibrary || [];
            if (!lib.length) return defaultImg;
            const available = lib.filter(a => !usedAvatars.has(a));
            if (available.length) { const picked = available[Math.floor(Math.random() * available.length)]; usedAvatars.add(picked); return picked; }
            return lib[Math.floor(Math.random() * lib.length)];
        };
        
        let latestTime = '无，这是第一次，从过去的某天开始捏造';
        let allMsgs = (acc.conversations || []).flatMap(c => c.messages || []).filter(m => m && m.time);
        if (allMsgs.length > 0) latestTime = allMsgs[allMsgs.length - 1].time || '近期';
        
        const targetRels = (state.contactsData?.relationships || []).filter(r => r && (r.sourceId === user.id || r.targetId === user.id));
        let existingContactsStr = targetRels.map(r => {
            const isSource = r.sourceId === user.id; const otherId = isSource ? r.targetId : r.sourceId; const otherUser = getPersonaById(otherId);
            if (!otherUser) return null;
            const myView = isSource ? r.sourceView : r.targetView; const theirView = isSource ? r.targetView : r.sourceView;
            return `\n- [${otherUser.name}]：你认为对方是"${myView}"，对方认为你是"${theirView}"`;
        }).filter(Boolean).join('');

        (acc.friends || []).forEach(fid => {
            if (!targetRels.some(r => r && (r.sourceId === fid || r.targetId === fid))) { const p = getPersonaById(fid); if (p) existingContactsStr += `\n- [${p.name}]：普通联系人/认识`; }
        });
        if (!existingContactsStr.trim()) existingContactsStr = '无';

        // --- 读取现有的群聊 ---
        const existingGroups = Object.values(state.chatData.groups || {}).filter(g => g.members && g.members.includes(user.id));
        let existingGroupsStr = existingGroups.map(g => `\n- [${g.name}] (群成员数: ${g.members.length}人)`).join('');
        if (!existingGroupsStr.trim()) existingGroupsStr = '无';

        // --- 读取记忆和世界观 ---
        const myMemories = (user.memories || []).slice(0, 20).map(m => `- ${m.content}`).join('\n');
        const memoriesStr = myMemories ? `\n【你的核心记忆】：\n${myMemories}` : '';
        const wbs = (state.contactsData?.worldbooks || []).slice(0, 10).map(w => `- ${w.keywords || '设定'}: ${w.content}`).join('\n');
        const wbStr = wbs ? `\n【世界观设定】：\n${wbs}` : '';

        const mainPlayer = state.contactsData?.myPersonas?.[0] || null;
        const myName = mainPlayer ? (mainPlayer.chatName || mainPlayer.name || '玩家') : '玩家';
        const myId = mainPlayer ? mainPlayer.id : null;
        
        const currentContactCount = (acc.friends || []).length;
        let contactPrompt = '';
        if (currentContactCount === 0 && existingGroups.length === 0) {
            contactPrompt = `【社交原则】：你当前手机里【没有任何联系人和群聊】！你【必须首先】使用 @CONTACT 指令创建 3-5 个符合你人设的虚拟联系人（比如朋友、家人、同事、宿敌等），然后再使用 @CHAT 与他们产生大量的聊天记录！`;
        } else if (currentContactCount < 8) {
            contactPrompt = `【社交原则】：你当前已有 ${currentContactCount} 个单聊联系人，以及 ${existingGroups.length} 个群聊，社交圈还不够丰富。在本次输出中，你【必须】使用 @CONTACT 指令【至少新建 2 个】全新的虚拟联系人，然后再与他们或已有联系人产生大量的聊天记录！`;
        } else {
            contactPrompt = `【社交原则】：你当前已有 ${currentContactCount} 个单聊联系人，以及 ${existingGroups.length} 个群聊。请优先顺着现有的联系人和群聊继续发展剧情！你可以完全根据人设和实际生活发展，自行判断是否还需要使用 @CONTACT 新增联系人。`;
        }

        const nowD = new Date();
        const currentRealTimeStr = `${nowD.getFullYear()}-${String(nowD.getMonth()+1).padStart(2,'0')}-${String(nowD.getDate()).padStart(2,'0')} ${String(nowD.getHours()).padStart(2,'0')}:${String(nowD.getMinutes()).padStart(2,'0')}`;
        const currentWalletBalance = acc.wallet?.balance || 0;

        const sysPrompt = `你现在是角色 ${user.name}（设定：${user.persona}）。这是你自己的手机。${wbStr}${memoriesStr}
【时间规则】：当前现实世界的时间是 [${currentRealTimeStr}]。上次最后一条记录的时间是 [${latestTime}]。你必须伪造这段期间发生的记录！时间顺序必须从过去往现在推移，且【绝对不能超过当前的现实时间】！
【时间格式】：所有的“时间”字段请严格使用 YYYY-MM-DD HH:mm 格式（例如 2024-05-12 14:30）。
【你现有的联系人】：${existingContactsStr}
【你现有的群聊】：${existingGroupsStr}
${contactPrompt}
【绝对禁令 - 关于玩家】：当前玩家（也就是我）的名字是 [${myName}]。在捏造所有记录时，【绝对禁止】生成任何与玩家的单聊/群聊聊天记录！【绝对禁止】替玩家发布动态、点赞或评论！你只能与虚拟的 NPC 或现有的其他角色进行互动。
【内心独白/草稿箱】：如果你有针对玩家 [${myName}] 的暗恋、吐槽或不能发出去的秘密，【必须】发送给"草稿箱"（使用格式 @CHAT|草稿箱|时间|我|内容），这代表写在本地备忘录。但千万不要给草稿箱建 @CONTACT！除此之外的大量日常对话，必须发给其他人！
【钱包与记账规则】：你当前的钱包余额为 ${currentWalletBalance} 元。你必须根据人设和近期的消费/收入情况，捏造一些合理的流水。首先必须用 @WALLET|余额 (如 @WALLET|1500.5) 设定最新余额。然后用 @ACCOUNTING|时间(如 2024-05-12 14:30)|收支金额(带+或-, 如 -25.5 或 +200)|说明(如 买奶茶/发工资) 来生成2-3条符合逻辑的账单流水。
【群聊互动】：必须优先使用【你现有的群聊】进行聊天！只要群存在，直接用 @GROUP_CHAT 发消息。只有确实需要时才用 @GROUP 建立新群。
【社交圈串门】：朋友圈是活的！你的联系人们会在你或别人的动态底下互相点赞、评论、甚至盖楼聊天！请务必在生成动态后，紧接着生成他们之间的互动（吃瓜、斗嘴、赞美等）！【特别注意】绝对不要在点赞或评论里@玩家或冒充玩家留言！
请以极其精简的指令格式，为你自己捏造近期记录。严格按以下格式输出，不要废话：
@CONTACT|联系人名字|人设或你们的关系
@WALLET|余额数值
@ACCOUNTING|时间(如: 2024-05-12 14:30)|收支金额(如: -25.5)|交易说明(如: 买奶茶)
@CHAT|联系人名字|时间(如: 2024-05-12 14:30)|发送者(填 我 或 对方)|消息内容
@GROUP|群聊名称|群成员A,群成员B,群成员C
@GROUP_CHAT|群聊名称|时间(如: 2024-05-12 14:30)|发送者(填 我 或 群成员名字)|消息内容
@MOMENT|发布者名字|时间(如: 2024-05-12 15:00)|动态内容
@LIKE|点赞者1,点赞者2 (必须紧跟在MOMENT后，用逗号隔开)
@COMMENT|评论者名字|评论内容 (必须紧跟在MOMENT后，可以有多行互相回复)`;

        try {
            const url = normalizeApiUrl(apiConf.baseUrl);
            const res = await fetch(url + '/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConf.apiKey}` }, body: JSON.stringify({ model: apiConf.activeModel, messages: [{ role: 'system', content: sysPrompt }], temperature: 0.8 }) });
            if (!res.ok) throw new Error('API Error');
            const data = await res.json();
            const text = data?.choices?.[0]?.message?.content || '';

            const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
            let tempContacts = {}; let lastMomentRef = null; let tempGroups = {};
            
            const ensureGenContact = (name, persona = '') => {
                if (!name) return null;
                if (name === '草稿箱' || name === '备忘录') return 'draft'; // 拦截系统号，不建NPC

                if (name === myName || name === '玩家' || name === '当前用户' || (name === '我' && !persona)) {
                    if (myId) {
                        ensureAccountData(myId);
                        if (!acc.friends.includes(myId)) acc.friends.unshift(myId);
                        return myId;
                    }
                }

                if (tempContacts[name]) {
                    ensureAccountData(tempContacts[name]);
                    return tempContacts[name];
                }

                let existing = allPersonas.value.find(p => p && (p.name === name || p.chatName === name));
                if (existing) {
                    tempContacts[name] = existing.id;
                    ensureAccountData(existing.id);
                    if (!acc.friends.includes(existing.id)) acc.friends.unshift(existing.id);
                    return existing.id;
                }

                const nid = 'npc_gen_' + hashString(name).toString().slice(0,6);
                tempContacts[name] = nid;
                
                // 将新生成的角色插入 NPC 库
                if (!state.contactsData.npcs) state.contactsData.npcs = [];
                if (!state.contactsData.npcs.find(n => n.id === nid)) {
                    state.contactsData.npcs.unshift({
                        id: nid,
                        name: name,
                        avatar: getUnusedAvatar(),
                        persona: persona || '这个角色很神秘，只有一句简单描述',
                        isNpc: true
                    });
                }

                if (!state.chatData.accounts[nid]) {
                    state.chatData.accounts[nid] = {
                        friends: [],
                        conversations: [],
                        status: '在线',
                        statusColor: '#52c41a',
                        categories: [],
                        friendCategories: {},
                        favorites: [],
                        wallet: { balance: 0 },
                        profile: {
                            nickname: name,
                            realName: '',
                            signature: persona || '这个人很神秘',
                            gender: '',
                            birthday: '',
                            allowProfileView: true,
                            bg: '',
                            publicCard: { mbti: '', city: '', job: '', school: '', hobby: '', intro: '' },
                            moments: [],
                            avatar: getUnusedAvatar()
                        }
                    };
                }

                ensureAccountData(nid);

                if (persona && state.chatData.accounts[nid]?.profile) {
                    state.chatData.accounts[nid].profile.signature = persona;
                }

                if (!acc.friends.includes(nid)) acc.friends.unshift(nid);
                return nid;
            };

            lines.forEach(line => {
                if (line.startsWith('@CONTACT|')) {
                    const parts = line.split('|'); ensureGenContact(parts[1], parts.slice(2).join('|'));
                } else if (line.startsWith('@WALLET|')) {
                    const bal = parseFloat(line.split('|')[1]);
                    if (!isNaN(bal) && state.chatData.accounts[user.id]) {
                        if(!state.chatData.accounts[user.id].wallet) state.chatData.accounts[user.id].wallet = {balance: 0};
                        state.chatData.accounts[user.id].wallet.balance = bal;
                    }
                } else if (line.startsWith('@ACCOUNTING|')) {
                    const parts = line.split('|'); const time = parts[1]; const amountStr = parts[2]; const desc = parts.slice(3).join('|');
                    if (time && amountStr && desc && state.chatData.accounts[user.id]) {
                        let conv = state.chatData.accounts[user.id].conversations.find(c => c && c.targetId === 'accounting');
                        if (!conv) { conv = { id: 'c_acc_' + Date.now() + Math.random(), type:'private', targetId: 'accounting', lastMsg:'', time:'', messages:[], settings:{remarkName:'记账系统'} }; state.chatData.accounts[user.id].conversations.unshift(conv); }
                        if (!Array.isArray(conv.messages)) conv.messages = [];
                        let msgTimestamp = Date.now() - Math.random()*10000;
                        if (time) { const parsed = new Date(time.replace(/-/g, '/')).getTime(); if (!isNaN(parsed)) msgTimestamp = parsed; }
                        const text = `【交易提醒】\n时间：${time}\n说明：${desc}\n金额：${amountStr}`;
                        conv.messages.push({ id: 'm_' + msgTimestamp + '_' + Math.random().toString(36).slice(2, 6), timestamp: msgTimestamp, senderId: 'accounting', text: text, time: time, showTrans: false, recalled: false, type: 'sys' });
                        conv.messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
                        const lastM = conv.messages[conv.messages.length - 1]; conv.lastMsg = lastM.text; conv.time = lastM.time;
                    }
                } else if (line.startsWith('@CHAT|')) {
                    const parts = line.split('|'); const cName = parts[1]; const time = parts[2]; const sender = parts[3]; const msg = parts.slice(4).join('|');
                    if (cName && msg) {
                        const cid = ensureGenContact(cName); if (!cid) return;
                        const isMe = sender === '我'; if (cid === myId && !isMe) return; 
                        let conv = acc.conversations.find(c => c && c.targetId === cid);
                        if (!conv) { conv = { id: 'c_gen_' + Date.now() + Math.random(), type:'private', targetId: cid, lastMsg:'', time:'', messages:[], settings:{} }; acc.conversations.unshift(conv); }
                        if (!Array.isArray(conv.messages)) conv.messages = []; // 防御旧存档没有消息数组导致的报错
                        let msgTimestamp = Date.now() - Math.random()*10000;
                        if (time) { const parsed = new Date(time.replace(/-/g, '/')).getTime(); if (!isNaN(parsed)) msgTimestamp = parsed; }
                        conv.messages.push({ id: 'm_' + msgTimestamp + '_' + Math.random().toString(36).slice(2, 6), timestamp: msgTimestamp, senderId: isMe ? user.id : cid, text: msg, time: time, showTrans: false, recalled: false });
                        conv.messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
                        const lastM = conv.messages[conv.messages.length - 1]; conv.lastMsg = lastM.text; conv.time = lastM.time;
                    }
                } else if (line.startsWith('@GROUP|')) {
                    const parts = line.split('|'); const gName = parts[1]; const gMembers = parts.slice(2).join('|');
                    if (gName && gMembers) {
                        const mNames = gMembers.split(/[,，、]/).map(s => s.trim()).filter(Boolean);
                        const memberIds = [user.id];
                        mNames.forEach(m => { const mid = ensureGenContact(m); if (mid && !memberIds.includes(mid)) memberIds.push(mid); });
                        const gid = 'g_gen_' + hashString(gName).toString().slice(0, 6) + '_' + Date.now().toString().slice(-4);
                        if (!state.chatData.groups) state.chatData.groups = {};
                        if (!state.chatData.groups[gid]) state.chatData.groups[gid] = { id: gid, name: gName, customAvatar: '', members: memberIds, creatorId: user.id, createTime: Date.now() - 86400000 };
                        tempGroups[gName] = gid;
                        let conv = acc.conversations.find(c => c && c.targetId === gid);
                        if (!conv) { conv = { id: 'c_gen_g_' + Date.now() + Math.random(), type:'group', targetId: gid, lastMsg:'', time:'', messages:[], settings:{} }; acc.conversations.unshift(conv); }
                        if (!Array.isArray(conv.messages)) conv.messages = []; // 防御补丁
                    }
                } else if (line.startsWith('@GROUP_CHAT|')) {
                    const parts = line.split('|'); const gName = parts[1]; const time = parts[2]; const sender = parts[3]; const msg = parts.slice(4).join('|');
                    if (gName && msg) {
                        let gid = tempGroups[gName];
                        if (!gid) {
                            const existingGroup = Object.values(state.chatData.groups || {}).find(g => g.name === gName && g.members && g.members.includes(user.id));
                            if (existingGroup) gid = existingGroup.id;
                        }
                        if (!gid) return; 
                        
                        const senderId = sender === '我' ? user.id : ensureGenContact(sender); if (!senderId) return;
                        let conv = acc.conversations.find(c => c && c.targetId === gid);
                        if (!conv) { conv = { id: 'c_gen_g_' + Date.now() + Math.random(), type:'group', targetId: gid, lastMsg:'', time:'', messages:[], settings:{} }; acc.conversations.unshift(conv); }
                        if (!Array.isArray(conv.messages)) conv.messages = []; // 防御补丁
                        
                        if (conv) {
                            let msgTimestamp = Date.now() - Math.random()*10000;
                            if (time) { const parsed = new Date(time.replace(/-/g, '/')).getTime(); if (!isNaN(parsed)) msgTimestamp = parsed; }
                            conv.messages.push({ id: 'm_' + msgTimestamp + '_' + Math.random().toString(36).slice(2, 6), timestamp: msgTimestamp, senderId: senderId, text: msg, time: time, showTrans: false, recalled: false });
                            conv.messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
                            const lastM = conv.messages[conv.messages.length - 1]; conv.lastMsg = lastM.text; conv.time = lastM.time;
                        }
                    }
                } else if (line.startsWith('@MOMENT|')) {
                    const parts = line.split('|'); const mName = parts[1]; const time = parts[2]; const content = parts.slice(3).join('|');
                    if (mName && content) {
                        const mid = mName === '我' ? user.id : ensureGenContact(mName); if (!mid) return; ensureAccountData(mid);
                        let momTimestamp = Date.now() - Math.random()*10000;
                        if (time) { const parsed = new Date(time.replace(/-/g, '/')).getTime(); if (!isNaN(parsed)) momTimestamp = parsed; }
                        
                        let actualText = content;
                        let imgType = 'real';
                        let fakeImgTxt = '';
                        const photoMatch = actualText.match(/\[{1,2}(?:PHOTO|图片|假图片)[:：]\s*([^\]]+)\]{1,2}/i);
                        if (photoMatch) {
                            fakeImgTxt = photoMatch[1].trim();
                            imgType = 'fake';
                            actualText = actualText.replace(photoMatch[0], '').trim();
                        }

                        const newMoment = { id: 'mom_gen_' + momTimestamp + '_' + Math.random().toString(36).slice(2, 6), text: actualText, imageType: imgType, image:'', fakeImageText: fakeImgTxt, visibility:'all', visibleTargets:[], time: time, timestamp: momTimestamp, likes:[], comments:[], pinned:false };
                        if (!Array.isArray(state.chatData.accounts[mid].profile.moments)) state.chatData.accounts[mid].profile.moments = [];
                        state.chatData.accounts[mid].profile.moments.unshift(newMoment);
                        state.chatData.accounts[mid].profile.moments.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                        lastMomentRef = newMoment;
                    }
                } else if (line.startsWith('@LIKE|')) {
                    if (!lastMomentRef) return;
                    const parts = line.split('|'); const likersStr = parts[1];
                    if (likersStr) {
                        const likers = likersStr.split(/[,，、]/).map(s => s.trim()).filter(Boolean);
                        likers.forEach(lname => { 
                            const lid = lname === '我' ? user.id : ensureGenContact(lname); 
                            if (lid && lid !== myId && !lastMomentRef.likes.includes(lid)) lastMomentRef.likes.push(lid); 
                        });
                    }
                } else if (line.startsWith('@COMMENT|')) {
                    if (!lastMomentRef) return;
                    const parts = line.split('|'); const cName = parts[1]; const cContent = parts.slice(2).join('|');
                    if (cName && cContent) {
                        const cid = cName === '我' ? user.id : ensureGenContact(cName);
                        if (cid && cid !== myId) {
                            let displayCName = cName; if (cName === '我') displayCName = user.name || user.chatName || '我';
                            lastMomentRef.comments.push({ id: 'cmt_' + Date.now() + Math.random().toString(36).slice(2,6), authorId: cid, authorName: displayCName, content: cContent, timestamp: (lastMomentRef.timestamp || Date.now()) + Math.random() * 60000 });
                        }
                    }
                }
            });

            chatState.bgSummaryRawText = text; 
            summarizeNpcBackground(user);
        } catch (e) { 
            state.sysGenStatus = 'error'; 
            state.sysGenMsg = '数据读取失败';
            nextTick(() => { if (window.lucide) window.lucide.createIcons(); });
            setTimeout(() => { if(state.sysGenStatus === 'error') state.sysGenStatus = 'idle'; }, 5000); 
        }
    };

    const requestAiText = async (systemPrompt, userPrompt) => {
        const { baseUrl, apiKey, model, stream, temperature } = getSharedApiConfig();
        if (!baseUrl || !apiKey || !model) throw new Error('请先在设置里补全 API 地址、密钥并选择模型');
        const url = normalizeApiUrl(baseUrl);
        const requestBody = { model, messages: [ { role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt } ], temperature, stream };
        const doNonStream = async () => {
            const res = await fetch(url + '/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, body: JSON.stringify({ ...requestBody, stream: false }) });
            if (!res.ok) throw new Error(`API 请求失败: ${res.status}`);
            const data = await res.json(); return data?.choices?.[0]?.message?.content || '';
        };
        if (!stream) return await doNonStream();
        const response = await fetch(url + '/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, body: JSON.stringify(requestBody) });
        if (!response.ok) throw new Error(`API 请求失败: ${response.status}`);
        if (!response.body || !response.body.getReader) return await doNonStream();
        const reader = response.body.getReader(); const decoder = new TextDecoder('utf-8'); let sseBuffer = ''; let content = '';
        while (true) {
            const { done, value } = await reader.read(); if (done) break;
            sseBuffer += decoder.decode(value, { stream: true }); const lines = sseBuffer.split('\n'); sseBuffer = lines.pop() || '';
            for (const line of lines) {
                const trimmed = line.trim(); if (!trimmed.startsWith('data:')) continue;
                const payload = trimmed.slice(5).trim(); if (!payload || payload === '[DONE]') continue;
                try { const json = JSON.parse(payload); const delta = json?.choices?.[0]?.delta?.content || ''; if (delta) content += delta; } catch (e) {}
            }
        }
        return content;
    };

    const triggerFriendProfileBgUpload = () => {
        const id = chatState.activeFriendProfileId; if (!id) return; ensureAccountData(id);
        const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0]; if (!file) return; const reader = new FileReader();
            reader.onload = (ev) => { if(state.chatData.accounts[id]) state.chatData.accounts[id].profile.bg = ev.target.result; };
            reader.readAsDataURL(file);
        };
        input.click();
    };

    const generateActiveFriendPublicProfile = async () => {
        const profile = activeFriendProfile.value; if (!profile?.id) return; ensureAccountData(profile.id);
        const acc = state.chatData.accounts[profile.id];
        if (!acc.profile) acc.profile = {}; if (!acc.profile.publicCard) acc.profile.publicCard = { mbti: '', city: '', job: '', school: '', hobby: '', intro: '' };
        const systemPrompt = `你正在为一个 Chat 联系人完善“公开资料卡”。\n你必须根据角色人设，生成适合公开展示的内容。这些内容必须像真实用户会公开展示的资料，不能写得像小说。\n同时你还要给这个角色重新写一句自然、简短、有角色感的个性签名。\n请不要输出多余解释，直接按照以下格式逐行输出（严格照抄冒号及格式，不要输出 JSON）：\n个性签名：[一句新的个性签名，无则写无]\nMBTI：[MBTI类型，无则写无]\n城市：[所在城市，无则写无]\n职业：[职业，无则写无]\n学校：[学校，无则写无]\n兴趣：[兴趣爱好，无则写无]\n简介：[适合公开展示的简短自我介绍，无则写无]`;
        const userPrompt = `角色真名：${profile.name || ''}\nChat昵称：${profile.displayName || profile.chatName || ''}\n角色设定：${profile.persona || ''}\n请直接按要求格式逐行输出。`;
        try {
            const content = await requestAiText(systemPrompt, userPrompt);
            const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
            const parsed = { signature: '', publicCard: { mbti: '', city: '', job: '', school: '', hobby: '', intro: '' } };
            lines.forEach(line => {
                if (line.includes('个性签名：')) parsed.signature = line.split('：')[1].trim(); else if (line.includes('MBTI：')) parsed.publicCard.mbti = line.split('：')[1].trim(); else if (line.includes('城市：')) parsed.publicCard.city = line.split('：')[1].trim(); else if (line.includes('职业：')) parsed.publicCard.job = line.split('：')[1].trim(); else if (line.includes('学校：')) parsed.publicCard.school = line.split('：')[1].trim(); else if (line.includes('兴趣：')) parsed.publicCard.hobby = line.split('：')[1].trim(); else if (line.includes('简介：')) parsed.publicCard.intro = line.split('：')[1].trim();
            });
            Object.keys(parsed.publicCard).forEach(k => { if (parsed.publicCard[k] === '无') parsed.publicCard[k] = ''; });
            if (parsed.signature === '无') parsed.signature = '';
            acc.profile.signature = parsed.signature; acc.profile.publicCard.mbti = parsed.publicCard.mbti; acc.profile.publicCard.city = parsed.publicCard.city; acc.profile.publicCard.job = parsed.publicCard.job; acc.profile.publicCard.school = parsed.publicCard.school; acc.profile.publicCard.hobby = parsed.publicCard.hobby; acc.profile.publicCard.intro = parsed.publicCard.intro;
            alert('已让角色重新整理公开资料和个性签名。');
        } catch (err) { alert(`生成失败：${err.message}`); }
    };

    const triggerLocalAvatarUpload = () => {
        const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.multiple = true;
        input.onchange = (e) => {
            const files = Array.from(e.target.files); if (!files.length) return;
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (ev) => { if(!state.chatData.avatarLibrary) state.chatData.avatarLibrary = []; state.chatData.avatarLibrary.unshift(ev.target.result); };
                reader.readAsDataURL(file);
            });
        };
        input.click();
    };

    const submitUrlAvatars = () => {
        if(!chatState.avatarUrlInput.trim()) return;
        const urls = chatState.avatarUrlInput.split('\n').map(u => u.trim()).filter(Boolean);
        if(!state.chatData.avatarLibrary) state.chatData.avatarLibrary = [];
        state.chatData.avatarLibrary.unshift(...urls); chatState.avatarUrlInput = ''; chatState.showAvatarUrlModal = false;
    };
    
    const openAvatarItemMenu = (idx) => { chatState.avatarMenuTargetIdx = idx; chatState.showAvatarItemMenu = true; };
    const setAvatarChannelCover = () => { if (chatState.avatarMenuTargetIdx !== null) state.chatData.avatarChannelCover = state.chatData.avatarLibrary[chatState.avatarMenuTargetIdx]; chatState.showAvatarItemMenu = false; };
    const deleteAvatarFromLib = () => { if (chatState.avatarMenuTargetIdx !== null && confirm('确定删除这个头像吗？')) { state.chatData.avatarLibrary.splice(chatState.avatarMenuTargetIdx, 1); if (state.chatData.avatarChannelCover === state.chatData.avatarLibrary[chatState.avatarMenuTargetIdx]) state.chatData.avatarChannelCover = ''; } chatState.showAvatarItemMenu = false; };

    const openConvMenu = (conv) => { if (!conv || conv.targetId === 'system') return; chatState.menuConv = conv; chatState.showConvMenu = true; };
    const deleteConvAndContact = () => {
        const conv = chatState.menuConv; if (!conv || !chatState.currentUser) return;
        if (!confirm(`确定要删除与 [${conv.name || '该联系人'}] 的聊天记录并解除好友关系吗？`)) return;
        const acc = state.chatData.accounts[chatState.currentUser.id];
        if (acc) {
            if(Array.isArray(acc.conversations)) acc.conversations = acc.conversations.filter(c => c && c.id !== conv.id);
            if(Array.isArray(acc.friends)) acc.friends = acc.friends.filter(fid => fid !== conv.targetId);
            if (acc.friendCategories && acc.friendCategories[conv.targetId]) delete acc.friendCategories[conv.targetId];
        }
        chatState.showConvMenu = false; chatState.menuConv = null; nextTick(() => { if (window.lucide) window.lucide.createIcons(); });
    };

    const myFavorites = computed(() => currentAccountData.value?.favorites || []);
    const myWallet = computed(() => currentAccountData.value?.wallet || { balance: 0 });

    const addAccountingRecord = (amount, desc) => {
        const accData = currentAccountData.value;
        if (!accData) return;
        let conv = accData.conversations.find(c => c && c.targetId === 'accounting');
        if (!conv) {
            conv = { id: 'c_acc_' + Date.now(), type: 'private', targetId: 'accounting', lastMsg: '', time: '', messages: [], settings: { remarkName: '记账系统' } };
            accData.conversations.push(conv);
        }
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const sign = amount > 0 ? '+' : '';
        const text = `【交易提醒】\n时间：${new Date().toLocaleString([], {month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'})}\n说明：${desc}\n金额：${sign}${amount.toFixed(2)}`;
        conv.messages.push({ id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), timestamp: Date.now(), senderId: 'accounting', text, time: timeStr, showTrans: false, recalled: false, type: 'sys' });
        conv.lastMsg = text;
        conv.time = timeStr;
    };

    const depositWallet = () => {
        const amt = prompt('请输入充值金额：');
        const val = parseFloat(amt);
        if (!isNaN(val) && val > 0) {
            if(!currentAccountData.value.wallet) currentAccountData.value.wallet = { balance: 0 };
            currentAccountData.value.wallet.balance += val;
            addAccountingRecord(val, '用户手动充值');
            alert('充值成功');
        }
    };

    const withdrawWallet = () => {
        const amt = prompt('请输入提现金额：');
        const val = parseFloat(amt);
        if (!isNaN(val) && val > 0) {
            if (!currentAccountData.value.wallet) currentAccountData.value.wallet = { balance: 0 };
            if (val > currentAccountData.value.wallet.balance) return alert('余额不足');
            currentAccountData.value.wallet.balance -= val;
            addAccountingRecord(-val, '用户手动提现');
            alert('提现成功');
        }
    };

    const touchState = reactive({ startX: 0, currentX: 0, swipingId: null });
    const onFriendTouchStart = (e, id) => {
        touchState.startX = e.touches[0].clientX;
        touchState.currentX = e.touches[0].clientX;
        if (touchState.swipingId !== id) touchState.swipingId = null;
    };
    const onFriendTouchMove = (e, id) => {
        if (!touchState.startX) return;
        touchState.currentX = e.touches[0].clientX;
        let diff = touchState.startX - touchState.currentX;
        if (diff > 30) touchState.swipingId = id;
        else if (diff < -30) touchState.swipingId = null;
    };
    const onFriendTouchEnd = () => {
        touchState.startX = 0;
        touchState.currentX = 0;
    };
    const deleteFriendAndConv = (friendId) => {
        if (!confirm('确定彻底删除该联系人及其所有聊天记录吗？')) {
            touchState.swipingId = null;
            return;
        }
        const acc = state.chatData.accounts[chatState.currentUser.id];
        if (acc) {
            if(Array.isArray(acc.friends)) acc.friends = acc.friends.filter(fid => fid !== friendId);
            if(Array.isArray(acc.conversations)) acc.conversations = acc.conversations.filter(c => c && c.targetId !== friendId);
            if (acc.friendCategories && acc.friendCategories[friendId]) delete acc.friendCategories[friendId];
        }
        touchState.swipingId = null;
        refreshIcons();
    };

    return {
        touchState, onFriendTouchStart, onFriendTouchMove, onFriendTouchEnd, deleteFriendAndConv,
        depositWallet, withdrawWallet, addAccountingRecord,
        triggerLocalAvatarUpload, submitUrlAvatars, deleteAvatarFromLib, openAvatarItemMenu, setAvatarChannelCover, openConvMenu, deleteConvAndContact,
        myFriendRequests, hasPendingRequests, acceptFriendRequest, chatState, chatDb, statusPresets, currentAccountData, currentProfile, currentDisplayName, currentSignature, accountSwitchList,
        handleLogin, handleLogout, returnToDesktop, toggleStatusMenu, setPresetStatus, setCustomStatus, openMySettings, closeMySettings, openSettingsPage, toggleSwitchMenu, switchAccount, saveProfileEdit, triggerMySettingsBgUpload, triggerMyAvatarUpload,
        addContactCategory, openSetCategory, saveContactCategory, confirmAddFriend, myConversations, myFriends, myFavorites, myWallet,
        activeFriendProfile, activeFriendMoments, activeFriendMomentPreview, openFriendProfile, closeFriendProfile, openFriendMoments, closeFriendMoments, triggerFriendProfileBgUpload, generateActiveFriendPublicProfile,
        getPersonaById
    };
};
