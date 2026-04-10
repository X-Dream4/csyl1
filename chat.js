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
        ...(state.contactsData?.characters || [])
    ]);

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
        bgGenStatus: 'idle', bgSummaryStatus: 'idle', bgSummaryRawText: '',
        showAvatarChannel: false, showAvatarAddMenu: false, showAvatarUrlModal: false, avatarUrlInput: '', showAvatarItemMenu: false, avatarMenuTargetIdx: null,
        showConvMenu: false, menuConv: null
    });

    const hashString = (str) => {
        let hash = 0;
        const s = String(str || '');
        for (let i = 0; i < s.length; i++) { hash = ((hash << 5) - hash) + s.charCodeAt(i); hash |= 0; }
        return Math.abs(hash);
    };

    const refreshIcons = () => { nextTick(() => { if (window.lucide) window.lucide.createIcons(); }); };

    // NPC 之间的羁绊自动互加好友 (全局监听)
    watch(() => state.contactsData.relationships, (rels) => {
        if (!rels) return;
        const meIds = (state.contactsData.myPersonas || []).map(p => p.id);
        rels.forEach(rel => {
            if (!meIds.includes(rel.sourceId) && !meIds.includes(rel.targetId)) {
                ensureAccountData(rel.sourceId);
                ensureAccountData(rel.targetId);
                const sAcc = chatDb.value.accounts[rel.sourceId];
                const tAcc = chatDb.value.accounts[rel.targetId];
                if (sAcc && tAcc) {
                    if (!sAcc.friends.includes(rel.targetId)) sAcc.friends.unshift(rel.targetId);
                    if (!tAcc.friends.includes(rel.sourceId)) tAcc.friends.unshift(rel.sourceId);
                }
            }
        });
    }, { deep: true, immediate: true });

    // 好友请求逻辑
    const myFriendRequests = computed(() => {
        if (!chatState.currentUser || !state.chatData.friendRequests) return [];
        return state.chatData.friendRequests.filter(r => r.toId === chatState.currentUser.id).sort((a,b) => b.time - a.time);
    });
    const hasPendingRequests = computed(() => myFriendRequests.value.some(r => r.status === 'pending'));

    const acceptFriendRequest = (req) => {
        req.status = 'accepted';
        ensureAccountData(req.fromId);
        ensureAccountData(req.toId);
        const fromAcc = chatDb.value.accounts[req.fromId];
        const toAcc = chatDb.value.accounts[req.toId];
        if (!fromAcc.friends.includes(req.toId)) fromAcc.friends.unshift(req.toId);
        if (!toAcc.friends.includes(req.fromId)) toAcc.friends.unshift(req.fromId);

        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (!toAcc.conversations.find(c => c.targetId === req.fromId)) {
            toAcc.conversations.unshift({ id: 'c_' + Date.now(), type: 'private', targetId: req.fromId, lastMsg: '我们已成为好友，开始聊天吧！', time: timeStr, messages: [], settings: {} });
        }
        if (!fromAcc.conversations.find(c => c.targetId === req.toId)) {
            fromAcc.conversations.unshift({ id: 'c_' + (Date.now()+1), type: 'private', targetId: req.toId, lastMsg: '我们已成为好友，开始聊天吧！', time: timeStr, messages: [], settings: {} });
        }
    };

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
        () => chatState.friendMomentsOpen,
        () => chatState.showAvatarChannel
    ], refreshIcons);

    const getPersonaById = (id) => {
        let p = allPersonas.value.find(c => c.id === id);
        if (p) return p;
        if (chatDb.value.accounts[id] && chatDb.value.accounts[id].profile) {
            const prof = chatDb.value.accounts[id].profile;
            return { id: id, name: prof.realName || prof.nickname || '未知用户', chatName: prof.nickname || '未知用户', avatar: prof.avatar || defaultImg, persona: prof.signature || '' };
        }
        return null;
    };

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
            const acc = chatDb.value.accounts[id];
            return { id, avatar: user.avatar, name: acc?.profile?.nickname || user.chatName || user.name || '未命名', chatAcc: user.chatAcc || '' };
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

    const addSystemNoticeToAccount = (userId, text) => {
        ensureAccountData(userId);
        const acc = chatDb.value.accounts[userId];
        let sysConv = acc.conversations.find(c => c.targetId === 'system');
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (!sysConv) {
            sysConv = { id: 'c_sys_' + Date.now(), type: 'private', targetId: 'system', lastMsg: '', time: timeStr, messages: [], settings: { remarkName: '系统安全中心' } };
            acc.conversations.unshift(sysConv);
        } else {
            acc.conversations = acc.conversations.filter(c => c.id !== sysConv.id);
            acc.conversations.unshift(sysConv);
        }
        sysConv.messages.push({
            id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            senderId: 'system', text, translation: '', showTrans: false, recalled: false, time: timeStr, type: 'sys'
        });
        sysConv.lastMsg = text;
        sysConv.time = timeStr;
    };

    const handleLogin = () => {
        if (!chatState.loginForm.acc) return alert('请输入账号');
        const acc = chatState.loginForm.acc.trim();
        const pwd = chatState.loginForm.pwd;
        
        if (!chatDb.value.loginFailedAttempts) chatDb.value.loginFailedAttempts = {};
        
        const targetUser = allPersonas.value.find(c => c.chatAcc === acc);
        if (!targetUser) return alert('账号或密码错误！');

        if (targetUser.chatPwd === pwd) {
            chatDb.value.loginFailedAttempts[acc] = 0;
            ensureAccountData(targetUser.id);
            if (!targetUser.isMe) {
                addSystemNoticeToAccount(targetUser.id, `【系统安全通知】您的账号于 ${new Date().toLocaleTimeString()} 在新设备上成功登录，如果不是您本人的操作，请注意账号安全！`);
            }
            chatState.currentUser = targetUser;
            chatState.isLoggedIn = true;
            chatState.loginForm = { acc: '', pwd: '' };
            chatDb.value.sessionUserId = targetUser.id;
            addToLoginHistory(targetUser.id);
            if (!targetUser.isMe) {
                generateNpcBackgroundData(targetUser);
            }
        } else {
            chatDb.value.loginFailedAttempts[acc] = (chatDb.value.loginFailedAttempts[acc] || 0) + 1;
            if (chatDb.value.loginFailedAttempts[acc] >= 1) {
                addSystemNoticeToAccount(targetUser.id, `【系统安全警告】有未知设备尝试登录您的账号并输入了错误的密码，请注意账号安全防范！`);
                chatDb.value.loginFailedAttempts[acc] = 0;
            }
            alert('账号或密码错误！');
        }
    };

    const switchAccount = (userId) => {
        const user = getPersonaById(userId);
        if (!user) return;
        ensureAccountData(user.id);
        if (!user.isMe) {
            addSystemNoticeToAccount(user.id, `【系统安全通知】您的账号于 ${new Date().toLocaleTimeString()} 在新设备上成功登录，如果不是您本人的操作，请注意账号安全！`);
        }
        chatState.currentUser = user;
        chatState.isLoggedIn = true;
        chatDb.value.sessionUserId = user.id;
        addToLoginHistory(user.id);
        chatState.showSwitchMenu = false;
        chatState.showStatusMenu = false;
        refreshIcons();
        if (!user.isMe) {
            generateNpcBackgroundData(user);
        }
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
            if (conv.targetId === 'system') {
                return {
                    ...conv,
                    name: '系统安全中心',
                    avatar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%231890ff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/%3E%3C/svg%3E",
                    status: '系统保护中',
                    statusColor: '#1890ff'
                };
            }
            const target = getPersonaById(conv.targetId);
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

    const summarizeNpcBackground = async (user) => {
        const apiConf = state.apiConfig || {};
        if (!apiConf.summaryBaseUrl || !apiConf.summaryApiKey || !apiConf.summaryModel) {
            // 友好的阻断提示，防止用户以为系统挂了
            alert('温馨提示：由于你未在设置中配置【总结专用API】，所以无法自动提炼出核心记忆，但此前的聊天动态数据已经成功生成好了！');
            chatState.bgSummaryStatus = 'idle';
            return;
        }

        chatState.bgSummaryStatus = 'loading';

        const sysPrompt = `请根据以下聊天和动态记录，总结出该角色（${user.name}）的3条核心记忆（以第一人称，如“我最近和xxx讨论了...”）。
请直接输出纯文本，每行一条，不要加序号或其他多余内容。
记录如下：\n${chatState.bgSummaryRawText}`;

        try {
            const url = normalizeApiUrl(apiConf.summaryBaseUrl);
            const res = await fetch(url + '/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConf.summaryApiKey}` },
                body: JSON.stringify({
                    model: apiConf.summaryModel,
                    messages: [{ role: 'system', content: sysPrompt }],
                    temperature: Number(apiConf.summaryTemperature || 0.5)
                })
            });
            if (!res.ok) throw new Error('API Error');
            const data = await res.json();
            const text = data?.choices?.[0]?.message?.content || '';

            const lines = text.split('\n').map(l => l.trim().replace(/^\d+[\.、]\s*/, '')).filter(Boolean);
            if (!Array.isArray(user.memories)) user.memories = [];
            lines.forEach(l => {
                user.memories.unshift({
                    id: 'mem_gen_' + Date.now() + Math.random(),
                    content: l,
                    timestamp: Date.now(),
                    weight: 3
                });
            });

            chatState.bgSummaryStatus = 'success';
            setTimeout(() => { if(chatState.bgSummaryStatus === 'success') chatState.bgSummaryStatus = 'idle'; }, 5000);
        } catch (e) {
            chatState.bgSummaryStatus = 'error';
            setTimeout(() => { if(chatState.bgSummaryStatus === 'error') chatState.bgSummaryStatus = 'idle'; }, 5000);
        }
    };

    window.retrySummarizeNpcBackground = () => summarizeNpcBackground(chatState.currentUser);

    const generateNpcBackgroundData = async (user) => {
        if (user.isMe) return;
        const apiConf = state.apiConfig || {};
        if (!apiConf.baseUrl || !apiConf.apiKey || !apiConf.activeModel) return;

        chatState.showSettings = true;
        chatState.settingsPage = 'home';
        chatState.bgGenStatus = 'loading';
        chatState.bgSummaryStatus = 'idle';

        ensureAccountData(user.id);
        const acc = chatDb.value.accounts[user.id];
        
        const usedAvatars = new Set();
        acc.friends.forEach(fid => {
            const p = getPersonaById(fid);
            if (p && p.avatar && !p.avatar.includes('svg+xml')) usedAvatars.add(p.avatar);
        });
        const getUnusedAvatar = () => {
            const lib = state.chatData.avatarLibrary || [];
            if (!lib.length) return defaultImg;
            const available = lib.filter(a => !usedAvatars.has(a));
            if (available.length) {
                const picked = available[Math.floor(Math.random() * available.length)];
                usedAvatars.add(picked);
                return picked;
            }
            return lib[Math.floor(Math.random() * lib.length)];
        };
        
        let latestTime = '无，这是第一次，从过去的某天开始捏造';
        let allMsgs = acc.conversations.flatMap(c => c.messages).filter(m => m.time);
        if (allMsgs.length > 0) {
            latestTime = allMsgs[allMsgs.length - 1].time || '近期';
        }
        
// ====== 修改后 ======
        // 读取该角色的全部人脉关系信息 (羁绊与看法)，绝不粗暴塞入玩家自身的详细设定
        const targetRels = (state.contactsData?.relationships || []).filter(r => r.sourceId === user.id || r.targetId === user.id);
        let existingContactsStr = targetRels.map(r => {
            const isSource = r.sourceId === user.id;
            const otherId = isSource ? r.targetId : r.sourceId;
            const otherUser = getPersonaById(otherId);
            if (!otherUser) return null;
            const myView = isSource ? r.sourceView : r.targetView;
            const theirView = isSource ? r.targetView : r.sourceView;
            return `\n- [${otherUser.name}]：你认为对方是"${myView}"，对方认为你是"${theirView}"`;
        }).filter(Boolean).join('');

        // 补齐那些在好友列表里，但还没有画连线羁绊的角色
        acc.friends.forEach(fid => {
            if (!targetRels.some(r => r.sourceId === fid || r.targetId === fid)) {
                const p = getPersonaById(fid);
                if (p) existingContactsStr += `\n- [${p.name}]：普通联系人/认识`;
            }
        });

        if (!existingContactsStr.trim()) existingContactsStr = '无';

        // 提取主要玩家的信息
        const mainPlayer = state.contactsData.myPersonas?.[0] || null;
        const myName = mainPlayer ? (mainPlayer.chatName || mainPlayer.name || '玩家') : '玩家';
        const myId = mainPlayer ? mainPlayer.id : null;
        
        // 智能判断联系人数量 (改成至少8个)
        const currentContactCount = acc.friends.length;
        let contactPrompt = '';
        if (currentContactCount < 8) {
            contactPrompt = `【扩展社交圈】：你现在的联系人太少了（只有 ${currentContactCount} 个）。请务必多结识一些新朋友，创造至少 ${8 - currentContactCount} 个全新的联系人（赋予他们名字和人设），并生成与他们的互动剧情！`;
        } else {
            contactPrompt = `【维护社交圈】：你已经有 ${currentContactCount} 个联系人了。请尽量顺着现有的联系人继续发展聊天剧情，可以适当少量新增联系人，但不要盲目加太多。`;
        }

        // 获取并格式化当前真实时间，告诉 AI
        const nowD = new Date();
        const currentRealTimeStr = `${nowD.getFullYear()}-${String(nowD.getMonth()+1).padStart(2,'0')}-${String(nowD.getDate()).padStart(2,'0')} ${String(nowD.getHours()).padStart(2,'0')}:${String(nowD.getMinutes()).padStart(2,'0')}`;

        const sysPrompt = `你现在是角色 ${user.name}（设定：${user.persona}）。这是你自己的手机。
【时间规则】：当前现实世界的时间是 [${currentRealTimeStr}]。上次最后一条记录的时间是 [${latestTime}]。你必须伪造这段期间发生的记录！时间顺序必须从过去往现在推移，且【绝对不能超过当前的现实时间】！
【时间格式】：所有的“时间”字段请严格使用 YYYY-MM-DD HH:mm 格式（例如 2024-05-12 14:30）。
【你现有的联系人有】：${existingContactsStr}
${contactPrompt}
【与玩家互动】：当前玩家的名字是 [${myName}]。你可以给玩家发单向消息，但是【绝对禁止】替玩家说话！发给玩家的聊天中发送者只能填“我”。
【草稿箱规则】：想对 [${myName}] 说但不好意思发的话、或内心私密龌龊的心思，全发给名字叫“草稿箱”的联系人。
【社交圈串门】：朋友圈是活的！你的联系人们会在你或别人的动态底下互相点赞、评论、甚至盖楼聊天！请务必在生成动态后，紧接着生成他们之间的互动（吃瓜、斗嘴、赞美等）！
请以极其精简的指令格式，为你自己捏造近期记录。严格按以下格式输出，不要废话：
@CONTACT|联系人名字|人设或你们的关系
@CHAT|联系人名字|时间(如: 2024-05-12 14:30)|发送者(填 我 或 对方)|消息内容
@MOMENT|发布者名字|时间(如: 2024-05-12 15:00)|动态内容
@LIKE|点赞者1,点赞者2 (必须紧跟在MOMENT后，用逗号隔开)
@COMMENT|评论者名字|评论内容 (必须紧跟在MOMENT后，可以有多行互相回复)`;


        try {
            const url = normalizeApiUrl(apiConf.baseUrl);
            const res = await fetch(url + '/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConf.apiKey}` },
                body: JSON.stringify({
                    model: apiConf.activeModel,
                    messages: [{ role: 'system', content: sysPrompt }],
                    temperature: 0.8
                })
            });
            if (!res.ok) throw new Error('API Error');
            const data = await res.json();
            const text = data?.choices?.[0]?.message?.content || '';

            const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
            let tempContacts = {};
            let lastMomentRef = null; // 用于追踪刚生成的动态，把点赞评论挂在它上面
            
            // 安全创建或获取联系人 ID 函数
            const ensureGenContact = (name, persona = '') => {
                if (!name) return null;
                
                // 精准匹配发送给玩家
                if (name === myName || name === '玩家' || name === '当前用户' || (name === '我' && !persona)) {
                    if (myId) {
                        if (!acc.friends.includes(myId)) acc.friends.unshift(myId);
                        return myId;
                    }
                }
                
                if (tempContacts[name]) return tempContacts[name];
                
                let existing = allPersonas.value.find(p => p.name === name || p.chatName === name);
                if (existing) {
                    tempContacts[name] = existing.id;
                    if (!acc.friends.includes(existing.id)) acc.friends.unshift(existing.id);
                    return existing.id;
                }
                
                const nid = 'npc_gen_' + hashString(name).toString().slice(0,6);
                tempContacts[name] = nid;
                if (!chatDb.value.accounts[nid]) {
                    chatDb.value.accounts[nid] = { friends:[], conversations:[], profile:{ nickname: name, signature: persona || '这个人很神秘', moments:[], avatar: getUnusedAvatar() } };
                }
                if (!acc.friends.includes(nid)) acc.friends.unshift(nid);
                return nid;
            };

            lines.forEach(line => {
                if (line.startsWith('@CONTACT|')) {
                    const parts = line.split('|');
                    ensureGenContact(parts[1], parts[2]);
                } else if (line.startsWith('@CHAT|')) {
                    const parts = line.split('|');
                    const cName = parts[1];
                    const time = parts[2];
                    const sender = parts[3];
                    const msg = parts[4];
                    if (cName && msg) {
                        const cid = ensureGenContact(cName);
                        if (!cid) return;
                        
                        const isMe = sender === '我';
                        
                        // 拦截替玩家说话
                        if (cid === myId && !isMe) return; 

                        let conv = acc.conversations.find(c => c.targetId === cid);
                        if (!conv) {
                            conv = { id: 'c_gen_' + Date.now() + Math.random(), type:'private', targetId: cid, lastMsg:'', time:'', messages:[], settings:{} };
                            acc.conversations.unshift(conv);
                        }
                        
                        let msgTimestamp = Date.now() - Math.random()*10000;
                        if (time) {
                            const parsed = new Date(time.replace(/-/g, '/')).getTime();
                            if (!isNaN(parsed)) msgTimestamp = parsed;
                        }

                        conv.messages.push({
                            id: 'm_' + msgTimestamp + '_' + Math.random().toString(36).slice(2, 6),
                            timestamp: msgTimestamp,
                            senderId: isMe ? user.id : cid,
                            text: msg,
                            time: time,
                            showTrans: false, recalled: false
                        });
                        
                        conv.messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
                        const lastM = conv.messages[conv.messages.length - 1];
                        conv.lastMsg = lastM.text;
                        conv.time = lastM.time;
                    }
                } else if (line.startsWith('@MOMENT|')) {
                    const parts = line.split('|');
                    const mName = parts[1];
                    const time = parts[2];
                    const content = parts[3];
                    if (mName && content) {
                        const mid = mName === '我' ? user.id : ensureGenContact(mName);
                        if (!mid) return;
                        ensureAccountData(mid);
                        
                        let momTimestamp = Date.now() - Math.random()*10000;
                        if (time) {
                            const parsed = new Date(time.replace(/-/g, '/')).getTime();
                            if (!isNaN(parsed)) momTimestamp = parsed;
                        }

                        const newMoment = {
                            id: 'mom_gen_' + momTimestamp + '_' + Math.random().toString(36).slice(2, 6),
                            text: content, imageType:'real', image:'', fakeImageText:'', visibility:'all', visibleTargets:[],
                            time: time, timestamp: momTimestamp, likes:[], comments:[], pinned:false
                        };
                        
                        chatDb.value.accounts[mid].profile.moments.unshift(newMoment);
                        chatDb.value.accounts[mid].profile.moments.sort((a, b) => b.timestamp - a.timestamp);
                        
                        // 记录当前的动态，以便后续指令加评论点赞
                        lastMomentRef = newMoment;
                    }
                } else if (line.startsWith('@LIKE|')) {
                    if (!lastMomentRef) return;
                    const parts = line.split('|');
                    const likersStr = parts[1];
                    if (likersStr) {
                        const likers = likersStr.split(/[,，、]/).map(s => s.trim()).filter(Boolean);
                        likers.forEach(lname => {
                            const lid = lname === '我' ? user.id : ensureGenContact(lname);
                            if (lid && !lastMomentRef.likes.includes(lid)) {
                                lastMomentRef.likes.push(lid);
                            }
                        });
                    }
                } else if (line.startsWith('@COMMENT|')) {
                    if (!lastMomentRef) return;
                    const parts = line.split('|');
                    const cName = parts[1];
                    const cContent = parts[2];
                    if (cName && cContent) {
                        const cid = cName === '我' ? user.id : ensureGenContact(cName);
                        if (cid) {
                            let displayCName = cName;
                            if (cName === '我') displayCName = user.name || user.chatName || '我';
                            
                            lastMomentRef.comments.push({
                                id: 'cmt_' + Date.now() + Math.random().toString(36).slice(2,6),
                                authorId: cid,
                                authorName: displayCName,
                                content: cContent,
                                timestamp: lastMomentRef.timestamp + Math.random() * 60000 // 评论时间比发动态略晚一点
                            });
                        }
                    }
                }
            });

            chatState.bgGenStatus = 'success';
            setTimeout(() => { if(chatState.bgGenStatus === 'success') chatState.bgGenStatus = 'idle'; }, 5000);

            chatState.bgSummaryRawText = text;
            summarizeNpcBackground(user);

        } catch (e) {
            chatState.bgGenStatus = 'error';
            setTimeout(() => { if(chatState.bgGenStatus === 'error') chatState.bgGenStatus = 'idle'; }, 5000);
        }
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

        const systemPrompt = `你正在为一个 Chat 联系人完善“公开资料卡”。
你必须根据角色人设，生成适合公开展示的内容。这些内容必须像真实用户会公开展示的资料，不能写得像小说。
同时你还要给这个角色重新写一句自然、简短、有角色感的个性签名。
请不要输出多余解释，直接按照以下格式逐行输出（严格照抄冒号及格式，不要输出 JSON）：
个性签名：[一句新的个性签名，无则写无]
MBTI：[MBTI类型，无则写无]
城市：[所在城市，无则写无]
职业：[职业，无则写无]
学校：[学校，无则写无]
兴趣：[兴趣爱好，无则写无]
简介：[适合公开展示的简短自我介绍，无则写无]`;

        const userPrompt = `角色真名：${profile.name || ''}\nChat昵称：${profile.displayName || profile.chatName || ''}\n角色设定：${profile.persona || ''}\n请直接按要求格式逐行输出。`;

        try {
            const content = await requestAiText(systemPrompt, userPrompt);
            const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
            
            const parsed = { signature: '', publicCard: { mbti: '', city: '', job: '', school: '', hobby: '', intro: '' } };
            
            lines.forEach(line => {
                if (line.includes('个性签名：')) parsed.signature = line.split('：')[1].trim();
                else if (line.includes('MBTI：')) parsed.publicCard.mbti = line.split('：')[1].trim();
                else if (line.includes('城市：')) parsed.publicCard.city = line.split('：')[1].trim();
                else if (line.includes('职业：')) parsed.publicCard.job = line.split('：')[1].trim();
                else if (line.includes('学校：')) parsed.publicCard.school = line.split('：')[1].trim();
                else if (line.includes('兴趣：')) parsed.publicCard.hobby = line.split('：')[1].trim();
                else if (line.includes('简介：')) parsed.publicCard.intro = line.split('：')[1].trim();
            });

            // 清理“无”字
            Object.keys(parsed.publicCard).forEach(k => {
                if (parsed.publicCard[k] === '无') parsed.publicCard[k] = '';
            });
            if (parsed.signature === '无') parsed.signature = '';

            acc.profile.signature = parsed.signature;
            acc.profile.publicCard.mbti = parsed.publicCard.mbti;
            acc.profile.publicCard.city = parsed.publicCard.city;
            acc.profile.publicCard.job = parsed.publicCard.job;
            acc.profile.publicCard.school = parsed.publicCard.school;
            acc.profile.publicCard.hobby = parsed.publicCard.hobby;
            acc.profile.publicCard.intro = parsed.publicCard.intro;

            alert('已让角色重新整理公开资料和个性签名。');
        } catch (err) {
            console.error('generateActiveFriendPublicProfile error:', err);
            alert(`生成失败：${err.message}`);
        }
    };

    const triggerLocalAvatarUpload = () => {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = 'image/*'; input.multiple = true;
        input.onchange = (e) => {
            const files = Array.from(e.target.files);
            if (!files.length) return;
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    if(!state.chatData.avatarLibrary) state.chatData.avatarLibrary = [];
                    state.chatData.avatarLibrary.unshift(ev.target.result);
                };
                reader.readAsDataURL(file);
            });
        };
        input.click();
    };

    const submitUrlAvatars = () => {
        if(!chatState.avatarUrlInput.trim()) return;
        const urls = chatState.avatarUrlInput.split('\n').map(u => u.trim()).filter(Boolean);
        if(!state.chatData.avatarLibrary) state.chatData.avatarLibrary = [];
        state.chatData.avatarLibrary.unshift(...urls);
        chatState.avatarUrlInput = '';
        chatState.showAvatarUrlModal = false;
    };
    
    const openAvatarItemMenu = (idx) => {
        chatState.avatarMenuTargetIdx = idx;
        chatState.showAvatarItemMenu = true;
    };
    
    const setAvatarChannelCover = () => {
        if (chatState.avatarMenuTargetIdx !== null) {
            state.chatData.avatarChannelCover = state.chatData.avatarLibrary[chatState.avatarMenuTargetIdx];
        }
        chatState.showAvatarItemMenu = false;
    };

    const deleteAvatarFromLib = () => {
        if (chatState.avatarMenuTargetIdx !== null && confirm('确定删除这个头像吗？')) {
            state.chatData.avatarLibrary.splice(chatState.avatarMenuTargetIdx, 1);
            if (state.chatData.avatarChannelCover === state.chatData.avatarLibrary[chatState.avatarMenuTargetIdx]) {
                state.chatData.avatarChannelCover = '';
            }
        }
        chatState.showAvatarItemMenu = false;
    };

    const openConvMenu = (conv) => {
        if (conv.targetId === 'system') return; // 系统消息不可删除
        chatState.menuConv = conv;
        chatState.showConvMenu = true;
    };

    const deleteConvAndContact = () => {
        const conv = chatState.menuConv;
        if (!conv || !chatState.currentUser) return;
        if (!confirm(`确定要删除与 [${conv.name || '该联系人'}] 的聊天记录并解除好友关系吗？`)) return;

        const acc = chatDb.value.accounts[chatState.currentUser.id];
        if (acc) {
            acc.conversations = acc.conversations.filter(c => c.id !== conv.id);
            acc.friends = acc.friends.filter(fid => fid !== conv.targetId);
            if (acc.friendCategories && acc.friendCategories[conv.targetId]) delete acc.friendCategories[conv.targetId];
        }
        chatState.showConvMenu = false;
        chatState.menuConv = null;
        nextTick(() => { if (window.lucide) window.lucide.createIcons(); });
    };

    const myFavorites = computed(() => currentAccountData.value?.favorites || []);
    const myWallet = computed(() => currentAccountData.value?.wallet || { balance: 0 });

    return {
        triggerLocalAvatarUpload, submitUrlAvatars, deleteAvatarFromLib, openAvatarItemMenu, setAvatarChannelCover, openConvMenu, deleteConvAndContact,
        myFriendRequests, hasPendingRequests, acceptFriendRequest,
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
