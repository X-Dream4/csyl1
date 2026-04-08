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
        loginForm: { acc: '', pwd: '' }, addFriendAcc: '', selectedFriendId: null, selectedCategoryId: ''
    });

    const refreshIcons = () => { nextTick(() => { if (window.lucide) window.lucide.createIcons(); }); };

    watch([ () => chatState.activeTab, () => chatState.isLoggedIn, () => chatState.modals.addFriend, () => chatState.showAddMenu, () => chatState.showMoreMenu, () => chatState.modals.setCategory, () => chatState.showStatusMenu, () => chatState.showSwitchMenu, () => chatState.showSettings, () => chatState.settingsPage ], refreshIcons);

    const getPersonaById = (id) => allPersonas.value.find(c => c.id === id) || null;

    const ensureAccountData = (userId) => {
        const persona = getPersonaById(userId);
        if (!chatDb.value.accounts[userId]) {
            chatDb.value.accounts[userId] = {
                friends: [], conversations: [], status: '在线', statusColor: '#52c41a', categories: [], friendCategories: {}, favorites: [], wallet: { balance: 0 },
                profile: { nickname: persona?.chatName || persona?.name || '未命名', realName: persona?.name || '', signature: '这个人很神秘', gender: '', birthday: '', allowProfileView: true, bg: '' }
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

    const getDisplayNameById = (id) => {
        const user = getPersonaById(id);
        if (!user) return '未知用户';
        ensureAccountData(id);
        return chatDb.value.accounts[id]?.profile?.nickname || user.chatName || user.name || '未知用户';
    };

    const restoreSession = () => {
        const sessionId = chatDb.value.sessionUserId;
        if (!sessionId) return;
        const user = getPersonaById(sessionId);
        if (!user) { chatDb.value.sessionUserId = ''; chatState.isLoggedIn = false; chatState.currentUser = null; return; }
        ensureAccountData(user.id); chatState.currentUser = user; chatState.isLoggedIn = true;
    };

    watch([allPersonas, () => chatDb.value.sessionUserId], () => {
        if (chatState.currentUser) { const fresh = getPersonaById(chatState.currentUser.id); if (fresh) chatState.currentUser = fresh; }
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
            ensureAccountData(user.id); chatState.currentUser = user; chatState.isLoggedIn = true;
            chatState.loginForm = { acc: '', pwd: '' }; chatDb.value.sessionUserId = user.id; addToLoginHistory(user.id);
        } else alert('账号或密码错误！');
    };

    const switchAccount = (userId) => {
        const user = getPersonaById(userId);
        if (!user) return;
        ensureAccountData(user.id); chatState.currentUser = user; chatState.isLoggedIn = true;
        chatDb.value.sessionUserId = user.id; addToLoginHistory(user.id);
        chatState.showSwitchMenu = false; chatState.showStatusMenu = false; refreshIcons();
    };

    const handleLogout = () => {
        chatState.showMoreMenu = false; chatState.showStatusMenu = false; chatState.showSwitchMenu = false;
        if (confirm('确定退出当前账号吗？')) {
            chatState.isLoggedIn = false; chatState.currentUser = null; chatState.activeTab = 'msg';
            chatState.showSettings = false; chatState.settingsPage = 'home'; chatDb.value.sessionUserId = '';
        }
    };

    const returnToDesktop = () => {
        chatState.showMoreMenu = false; chatState.showStatusMenu = false; chatState.showSwitchMenu = false;
        state.activeApp = null; refreshIcons();
    };

    const toggleStatusMenu = () => { chatState.showStatusMenu = !chatState.showStatusMenu; chatState.showMoreMenu = false; chatState.showAddMenu = false; };
    const setPresetStatus = (item) => { if (!chatState.currentUser) return; const accData = currentAccountData.value; accData.status = item.text; accData.statusColor = item.color; chatState.showStatusMenu = false; };
    const setCustomStatus = () => { if (!chatState.currentUser) return; const txt = prompt('请输入自定义状态：', currentAccountData.value?.status || ''); if (txt === null) return; const value = txt.trim(); if (!value) return; const accData = currentAccountData.value; accData.status = value; accData.statusColor = '#3b82f6'; chatState.showStatusMenu = false; };
    const openMySettings = () => { if (!chatState.currentUser) return; chatState.showSettings = true; chatState.settingsPage = 'home'; chatState.showStatusMenu = false; chatState.showMoreMenu = false; chatState.showAddMenu = false; chatState.showSwitchMenu = false; refreshIcons(); };
    const closeMySettings = () => { chatState.showSettings = false; chatState.settingsPage = 'home'; chatState.showSwitchMenu = false; };
    const openSettingsPage = (page) => { chatState.settingsPage = page; chatState.showSwitchMenu = false; };
    const toggleSwitchMenu = () => { chatState.showSwitchMenu = !chatState.showSwitchMenu; };
    const saveProfileEdit = () => {
        if (!chatState.currentUser) return;
        const me = chatState.currentUser;
        const duplicated = allPersonas.value.find(item => item.id !== me.id && item.chatAcc === me.chatAcc);
        if (duplicated) return alert('该 Chat ID 已被使用，请换一个。');
        if (!me.chatAcc || !String(me.chatAcc).trim()) return alert('Chat ID 不能为空');
        alert('资料已保存'); chatState.settingsPage = 'home';
    };
    const triggerMySettingsBgUpload = () => {
        if (!chatState.currentUser) return; const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
        input.onchange = (e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (ev) => { ensureAccountData(chatState.currentUser.id); chatDb.value.accounts[chatState.currentUser.id].profile.bg = ev.target.result; }; reader.readAsDataURL(file); }; input.click();
    };
    const triggerMyAvatarUpload = () => {
        if (!chatState.currentUser) return; const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
        input.onchange = (e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (ev) => { chatState.currentUser.avatar = ev.target.result; }; reader.readAsDataURL(file); }; input.click();
    };
    const addContactCategory = () => { const name = prompt('分类名称：'); if (name && name.trim()) currentAccountData.value.categories.push({ id: 'ccat_' + Date.now(), name: name.trim() }); };
    const openSetCategory = (friendId) => { chatState.selectedFriendId = friendId; chatState.selectedCategoryId = currentAccountData.value.friendCategories[friendId] || ''; chatState.modals.setCategory = true; };
    const saveContactCategory = () => { const accData = currentAccountData.value; if (chatState.selectedCategoryId) accData.friendCategories[chatState.selectedFriendId] = chatState.selectedCategoryId; else delete accData.friendCategories[chatState.selectedFriendId]; chatState.modals.setCategory = false; };
    
    const confirmAddFriend = () => {
        const keyword = chatState.addFriendAcc.trim();
        if (!keyword) return alert('请输入对方手机号或 Chat ID');
        const targetUser = allPersonas.value.find(c => c.chatAcc === keyword || c.phone === keyword);
        if (!targetUser) return alert('未找到该账号/手机号，请检查');
        if (targetUser.id === chatState.currentUser.id) return alert('不能添加自己');

        ensureAccountData(chatState.currentUser.id); ensureAccountData(targetUser.id);
        const myAccData = currentAccountData.value; const targetAccData = chatDb.value.accounts[targetUser.id];
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
        let list = (accData.conversations || []).map(conv => {
            const target = getPersonaById(conv.targetId);
            if (target?.id) ensureAccountData(target.id);
            const targetAcc = target?.id ? chatDb.value.accounts[target.id] : null;
            return { ...conv, name: conv.settings?.remarkName || (target ? getDisplayNameById(conv.targetId) : '未知用户'), avatar: target ? target.avatar : '', status: targetAcc?.status || '在线', statusColor: targetAcc?.statusColor || '#52c41a' };
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
            const catId = (accData.friendCategories || {})[fid];
            const cat = (accData.categories || []).find(x => x.id === catId);
            return { ...c, displayName: getDisplayNameById(fid), categoryName: cat ? cat.name : '' };
        }).filter(Boolean);
        const q = chatState.searchQuery.trim().toLowerCase();
        if (q) list = list.filter(c => String(c.displayName || '').toLowerCase().includes(q) || (c.categoryName && c.categoryName.toLowerCase().includes(q)));
        return list;
    });

    const myFavorites = computed(() => currentAccountData.value?.favorites || []);
    const myWallet = computed(() => currentAccountData.value?.wallet || { balance: 0 });

    return {
        chatState, chatDb, statusPresets, currentAccountData, currentProfile, currentDisplayName, currentSignature, accountSwitchList, handleLogin, handleLogout, returnToDesktop, toggleStatusMenu, setPresetStatus, setCustomStatus, openMySettings, closeMySettings, openSettingsPage, toggleSwitchMenu, switchAccount, saveProfileEdit, triggerMySettingsBgUpload, triggerMyAvatarUpload, addContactCategory, openSetCategory, saveContactCategory, confirmAddFriend, myConversations, myFriends, myFavorites, myWallet
    };
};
