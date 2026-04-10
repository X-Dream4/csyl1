window.useChatMomentLogic = function(state, chatMethods) {
    const { computed, reactive, nextTick } = Vue;
    const { chatState, chatDb, currentAccountData } = chatMethods;

    const formatMomentTime = (timestamp) => {
        if (!timestamp) return '刚刚';
        const now = Date.now();
        const diff = now - timestamp;
        const minute = 60 * 1000;
        const hour = 60 * minute;
        const day = 24 * hour;
        const month = 30 * day;
        const year = 12 * month;

        if (diff < minute) return '刚刚';
        if (diff < hour) return Math.floor(diff / minute) + '分钟前';
        if (diff < day) return Math.floor(diff / hour) + '小时前';
        if (diff < 2 * day) return '昨天';
        if (diff < month) return Math.floor(diff / day) + '天前';
        if (diff < year) return Math.floor(diff / month) + '个月前';
        return Math.floor(diff / year) + '年前';
    };

    // 修复：严格按照 备注 -> Chat昵称 -> 真名 的优先级获取
    const getPersonaName = (id) => {
        if (!id) return '未知';
        // 如果是我自己 (兼容老数据可能存了 'me')
        if (id === 'me' || id === chatState.currentUser?.id) {
            return currentAccountData.value?.profile?.nickname || chatState.currentUser?.chatName || chatState.currentUser?.name || '我';
        }
        // 如果是别人，先找我的好友备注
        const conv = (currentAccountData.value?.conversations || []).find(c => c.type === 'private' && c.targetId === id);
        if (conv && conv.settings && conv.settings.remarkName) return conv.settings.remarkName.trim();
        
        // 找他的账号公开昵称
        const acc = chatDb.value.accounts[id];
        if (acc && acc.profile && acc.profile.nickname) return acc.profile.nickname;
        
        // 找他的底层角色设定
        const persona = state.contactsData.characters?.find(c => c.id === id) || state.contactsData.myPersonas?.find(c => c.id === id);
        if (persona && (persona.chatName || persona.name)) return persona.chatName || persona.name;
        
        return '未知';
    };

    const getLikeNames = (likesArray) => {
        if (!likesArray || !likesArray.length) return '';
        return likesArray.map(id => getPersonaName(id)).join(', ');
    };

    const canIViewMoment = (moment, authorId) => {
        const myId = chatState.currentUser?.id;
        if (!myId) return false;
        if (authorId === myId) return true; 

        const vis = moment.visibility || 'all';
        const targets = moment.visibleTargets || [];

        if (vis === 'all') return true;
        if (vis === 'self') return false; 
        
        const authorAcc = chatDb.value.accounts[authorId];
        let myCategories = [];
        if (authorAcc && authorAcc.friendCategories && authorAcc.friendCategories[myId]) {
            myCategories.push(authorAcc.friendCategories[myId]);
        }

        const isTargetMatch = targets.includes(myId) || targets.some(cId => myCategories.includes(cId));

        if (vis === 'include') return isTargetMatch;
        if (vis === 'exclude') return !isTargetMatch;
        return true;
    };

    const allMoments = computed(() => {
        const _dummy = chatDb.value.triggerSync; // 强制追踪刷新依赖
        if (!chatState.currentUser) return [];
        const myAcc = currentAccountData.value;
        if (!myAcc) return [];
        let momentsList = [];
        
        if (myAcc.profile && Array.isArray(myAcc.profile.moments)) {
            myAcc.profile.moments.forEach(m => {
                momentsList.push({ ...m, authorId: chatState.currentUser.id, authorName: getPersonaName(chatState.currentUser.id), authorAvatar: chatState.currentUser.avatar });
            });
        }
        
        if (Array.isArray(myAcc.friends)) {
            myAcc.friends.forEach(fid => {
                const acc = chatDb.value.accounts[fid];
                const persona = state.contactsData.characters?.find(c => c.id === fid) || state.contactsData.myPersonas?.find(c => c.id === fid);
                if (acc && acc.profile && Array.isArray(acc.profile.moments)) {
                    acc.profile.moments.forEach(m => {
                        if (canIViewMoment(m, fid)) {
                            momentsList.push({ ...m, authorId: fid, authorName: getPersonaName(fid), authorAvatar: persona?.avatar || '' });
                        }
                    });
                }
            });
        }
        
        // 修正排序：所有动态只按时间排，让列表正常显示
        return momentsList.sort((a, b) => b.timestamp - a.timestamp);
    });

    // 区分出置顶动态，用于上方的横滑列表（限定：只显示当前登录账号自己置顶的动态）
    const pinnedMoments = computed(() => allMoments.value.filter(m => m.pinned && m.authorId === chatState.currentUser?.id));
    const feedMoments = computed(() => allMoments.value.filter(m => !m.pinned || m.authorId !== chatState.currentUser?.id));

    const momentState = reactive({
        showPublish: false, text: '', imageType: 'real', image: '', fakeImageText: '', visibility: 'all', visibleTargets: [], showVisibilitySelect: false, showTargetSelect: false,
        showMoreMenu: false, activeMoment: null, showCommentModal: false, commentText: '', showForwardModal: false, showEditModal: false, editText: '', viewPinnedMomentId: null
    });

    // 保证置顶弹窗点赞时能实时响应
    const activePinnedMoment = computed(() => {
        if (!momentState.viewPinnedMomentId) return null;
        return pinnedMoments.value.find(m => m.id === momentState.viewPinnedMomentId) || null;
    });

    const openPublishModal = () => {
        momentState.text = ''; momentState.imageType = 'real'; momentState.image = ''; momentState.fakeImageText = ''; momentState.visibility = 'all'; momentState.visibleTargets = []; momentState.showPublish = true;
        nextTick(() => { if (window.lucide) window.lucide.createIcons(); });
    };

    const visibilityLabel = computed(() => {
        switch(momentState.visibility) {
            case 'all': return '公开'; case 'self': return '私密'; case 'include': return `部分可见 (${momentState.visibleTargets.length})`; case 'exclude': return `不给谁看 (${momentState.visibleTargets.length})`; default: return '公开';
        }
    });

    const contactOptions = computed(() => {
        if (!chatState.currentUser) return { categories: [], friends: [] };
        const acc = currentAccountData.value;
        const cats = acc.categories || [];
        const friends = (acc.friends || []).map(fid => {
            const persona = state.contactsData.characters?.find(c => c.id === fid) || state.contactsData.myPersonas?.find(c => c.id === fid);
            const facc = chatDb.value.accounts[fid];
            return { id: fid, name: facc?.profile?.nickname || persona?.chatName || persona?.name || '未知', avatar: persona?.avatar };
        });
        return { categories: cats, friends };
    });

    const toggleTarget = (id) => {
        const idx = momentState.visibleTargets.indexOf(id);
        if (idx > -1) momentState.visibleTargets.splice(idx, 1);
        else momentState.visibleTargets.push(id);
    };

    const triggerMomentImage = () => {
        const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
        input.onchange = (e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (ev) => { momentState.image = ev.target.result; }; reader.readAsDataURL(file); };
        input.click();
    };

    const publishMoment = () => {
        if (!momentState.text.trim() && (momentState.imageType === 'real' ? !momentState.image : !momentState.fakeImageText.trim())) return;
        const myAcc = currentAccountData.value;
        if (!myAcc.profile.moments) myAcc.profile.moments = [];
        myAcc.profile.moments.unshift({
            id: 'mom_' + Date.now(), text: momentState.text.trim(), imageType: momentState.imageType, image: momentState.image, fakeImageText: momentState.fakeImageText.trim(),
            visibility: momentState.visibility, visibleTargets: [...momentState.visibleTargets], timestamp: Date.now(), time: new Date().toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }), likes: [], comments: [], pinned: false
        });
        momentState.showPublish = false; 
        chatDb.value.triggerSync = Date.now();
        nextTick(() => { if (window.lucide) window.lucide.createIcons(); });
    };

    const getSourceMoment = (moment) => {
        const authorAcc = chatDb.value.accounts[moment.authorId];
        if (authorAcc && authorAcc.profile && authorAcc.profile.moments) return authorAcc.profile.moments.find(m => m.id === moment.id);
        return null;
    };

    const toggleLike = (moment) => {
        const myId = chatState.currentUser.id;
        const sourceMoment = getSourceMoment(moment);
        if (!sourceMoment) return;
        if (!sourceMoment.likes) sourceMoment.likes = [];
        const idx = sourceMoment.likes.indexOf(myId);
        if (idx > -1) sourceMoment.likes.splice(idx, 1);
        else sourceMoment.likes.push(myId);
        
        chatDb.value.triggerSync = Date.now(); // 强制刷新界面点赞数
    };

    const openCommentModal = (moment) => { momentState.activeMoment = moment; momentState.commentText = ''; momentState.showCommentModal = true; };

    const submitComment = () => {
        if (!momentState.commentText.trim() || !momentState.activeMoment) return;
        const sourceMoment = getSourceMoment(momentState.activeMoment);
        if (!sourceMoment) return;
        if (!sourceMoment.comments) sourceMoment.comments = [];
        sourceMoment.comments.push({ id: 'cmt_' + Date.now(), authorId: chatState.currentUser.id, authorName: getPersonaName(chatState.currentUser.id), content: momentState.commentText.trim(), timestamp: Date.now() });
        
        momentState.showCommentModal = false; momentState.commentText = '';
        chatDb.value.triggerSync = Date.now();
    };

    const openForwardModal = (moment) => { momentState.activeMoment = moment; momentState.showForwardModal = true; };

    const forwardMoment = (conv) => {
        if (!momentState.activeMoment || !conv) return;
        const rawConv = currentAccountData.value.conversations.find(c => c.id === conv.id);
        if (!rawConv) return;
        const m = momentState.activeMoment;
        const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        rawConv.messages.push({
            id: 'm_' + Date.now(), senderId: chatState.currentUser.id, text: '[分享动态]',
            momentShare: { id: m.id, authorName: m.authorName, authorAvatar: m.authorAvatar, time: formatMomentTime(m.timestamp), text: m.text, imageType: m.imageType, image: m.image, fakeImageText: m.fakeImageText },
            translation: '', showTrans: false, recalled: false, time: nowTime, isManualTyped: true
        });
        rawConv.lastMsg = '[分享动态]'; rawConv.time = nowTime;
        alert('已转发到该聊天'); momentState.showForwardModal = false;
    };

    const openMomentMoreMenu = (moment) => { momentState.activeMoment = moment; momentState.showMoreMenu = true; };

    const favoriteMoment = (moment) => {
        if (!currentAccountData.value) return;
        if (!Array.isArray(currentAccountData.value.favorites)) currentAccountData.value.favorites = [];
        currentAccountData.value.favorites.unshift({ type: 'moment', convId: '', msgId: moment.id, title: `[动态] ${moment.authorName}`, content: moment.text || (moment.imageType === 'fake' ? moment.fakeImageText : '[图片]'), time: moment.time || '' });
        alert('已收藏到账号'); momentState.showMoreMenu = false;
    };

    const pinMoment = (moment) => {
        const sourceMoment = getSourceMoment(moment);
        if (!sourceMoment) return;
        sourceMoment.pinned = !sourceMoment.pinned;
        momentState.showMoreMenu = false;
        chatDb.value.triggerSync = Date.now();
    };

    const openEditMomentModal = (moment) => {
        momentState.editText = moment.text || '';
        momentState.showMoreMenu = false;
        momentState.showEditModal = true;
    };

    const saveEditMoment = () => {
        if (!momentState.activeMoment) return;
        const sourceMoment = getSourceMoment(momentState.activeMoment);
        if (sourceMoment) sourceMoment.text = momentState.editText.trim();
        momentState.showEditModal = false;
        chatDb.value.triggerSync = Date.now();
    };

    const deleteMoment = (moment) => {
        if (!confirm('确定彻底删除这条动态吗？')) return;
        const authorAcc = chatDb.value.accounts[moment.authorId];
        if (authorAcc && authorAcc.profile && authorAcc.profile.moments) {
            authorAcc.profile.moments = authorAcc.profile.moments.filter(m => m.id !== moment.id);
        }
        if (momentState.viewPinnedMomentId === moment.id) momentState.viewPinnedMomentId = null;
        momentState.showMoreMenu = false;
        chatDb.value.triggerSync = Date.now();
    };

    const openMomentPhotoViewer = (moment) => {
        chatState.photoViewerText = moment.fakeImageText || '一张照片';
        chatState.photoViewerImg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='800'%3E%3Crect width='600' height='800' fill='%23e0e0e0'/%3E%3Ctext x='300' y='400' font-family='sans-serif' font-size='28' font-weight='bold' fill='%23999999' text-anchor='middle' dominant-baseline='middle'%3EPHOTO%3C/text%3E%3C/svg%3E";
        chatState.photoViewerOpen = true;
    };

    return {
        allMoments, pinnedMoments, feedMoments, momentState, activePinnedMoment, visibilityLabel, contactOptions, toggleTarget, openPublishModal, triggerMomentImage, publishMoment, toggleLike, openMomentPhotoViewer, formatMomentTime, getLikeNames, openCommentModal, submitComment, openForwardModal, forwardMoment, openMomentMoreMenu, favoriteMoment, pinMoment, openEditMomentModal, saveEditMoment, deleteMoment
    };
};
