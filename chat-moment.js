window.useChatMomentLogic = function(state, chatMethods) {
    const { computed, reactive, nextTick } = Vue;
    const { chatState, chatDb, currentAccountData } = chatMethods;

    const formatMomentTime = (timestamp) => {
        if (!timestamp || isNaN(timestamp)) return '刚刚';
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

    const getPersonaName = (id) => {
        if (!id) return '未知';
        if (id === 'me' || id === chatState.currentUser?.id) {
            return currentAccountData.value?.profile?.nickname || chatState.currentUser?.chatName || chatState.currentUser?.name || '我';
        }
        
        const convs = currentAccountData.value?.conversations || [];
        const conv = convs.find(c => c && c.type === 'private' && c.targetId === id);
        if (conv && conv.settings && conv.settings.remarkName) return String(conv.settings.remarkName).trim();
        
        const acc = chatDb.value?.accounts?.[id];
        if (acc && acc.profile && acc.profile.nickname) return String(acc.profile.nickname).trim();
        
        const chars = state.contactsData?.characters || [];
        const myPs = state.contactsData?.myPersonas || [];
        const persona = chars.find(c => c && c.id === id) || myPs.find(c => c && c.id === id);
        if (persona && (persona.chatName || persona.name)) return String(persona.chatName || persona.name).trim();
        
        return '未知';
    };

    const getLikeNames = (likesArray) => {
        if (!Array.isArray(likesArray) || !likesArray.length) return '';
        return likesArray.map(id => getPersonaName(id)).filter(Boolean).join(', ');
    };

    const canIViewMoment = (moment, authorId) => {
        if (!moment) return false;
        const myId = chatState.currentUser?.id;
        if (!myId) return false;
        if (authorId === myId) return true; 

        const vis = moment.visibility || 'all';
        const targets = Array.isArray(moment.visibleTargets) ? moment.visibleTargets : [];

        if (vis === 'all') return true;
        if (vis === 'self') return false; 
        
        const authorAcc = chatDb.value?.accounts?.[authorId];
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
        const _dummy = chatDb.value.triggerSync; 
        if (!chatState.currentUser) return [];
        const myAcc = currentAccountData.value;
        if (!myAcc) return [];
        
        let momentsList = [];
        // 用于解决 Duplicate keys 报错：全局拦截相同的动态 ID
        const seenIds = new Set();
        
        const addSafeMoment = (m, authorId, avatar) => {
            if (!m || typeof m !== 'object') return;
            const mId = m.id || ('mom_' + Math.random().toString(36).substring(2, 8));
            
            // 如果已经被渲染过了，直接丢弃（防重复渲染）
            if (seenIds.has(mId)) return;
            seenIds.add(mId);
            
            // 纯读取，绝不在此处修改原始 reactive 数据，杜绝无限死循环
            momentsList.push({
                ...m,
                id: mId,
                text: typeof m.text === 'string' ? m.text : '',
                imageType: m.imageType === 'fake' ? 'fake' : 'real',
                image: typeof m.image === 'string' ? m.image : '',
                fakeImageText: typeof m.fakeImageText === 'string' ? m.fakeImageText : '',
                visibility: m.visibility || 'all',
                visibleTargets: Array.isArray(m.visibleTargets) ? m.visibleTargets : [],
                timestamp: Number.isFinite(Number(m.timestamp)) ? Number(m.timestamp) : Date.now(),
                time: typeof m.time === 'string' ? m.time : '',
                likes: Array.isArray(m.likes) ? m.likes : [],
                comments: Array.isArray(m.comments) ? m.comments : [],
                pinned: !!m.pinned,
                authorId: authorId,
                authorName: getPersonaName(authorId),
                authorAvatar: avatar || ''
            });
        };

        // 加载自己的动态
        if (myAcc.profile && Array.isArray(myAcc.profile.moments)) {
            myAcc.profile.moments.forEach(m => addSafeMoment(m, chatState.currentUser.id, chatState.currentUser.avatar));
        }
        
        // 加载好友的动态 (加入 Set 去重，防止旧存档里一个人加了两次导致崩盘)
        if (Array.isArray(myAcc.friends)) {
            const uniqueFriends = [...new Set(myAcc.friends)];
            const chars = state.contactsData?.characters || [];
            const myPs = state.contactsData?.myPersonas || [];
            
            uniqueFriends.forEach(fid => {
                if (!fid) return;
                const acc = chatDb.value?.accounts?.[fid];
                const persona = chars.find(c => c && c.id === fid) || myPs.find(c => c && c.id === fid);
                
                if (acc && acc.profile && Array.isArray(acc.profile.moments)) {
                    acc.profile.moments.forEach(m => {
                        if (canIViewMoment(m, fid)) {
                            addSafeMoment(m, fid, persona?.avatar || acc.profile.avatar);
                        }
                    });
                }
            });
        }
        
        // 倒序排列
        return momentsList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    });

    const pinnedMoments = computed(() => allMoments.value.filter(m => m && m.pinned && m.authorId === chatState.currentUser?.id));
    const feedMoments = computed(() => allMoments.value.filter(m => m && (!m.pinned || m.authorId !== chatState.currentUser?.id)));

    const momentState = reactive({
        showPublish: false, text: '', imageType: 'real', image: '', fakeImageText: '', visibility: 'all', visibleTargets: [], showVisibilitySelect: false, showTargetSelect: false,
        showMoreMenu: false, activeMoment: null, showCommentModal: false, commentText: '', showForwardModal: false, showEditModal: false, editText: '', viewPinnedMomentId: null
    });

    const activePinnedMoment = computed(() => {
        if (!momentState.viewPinnedMomentId) return null;
        return pinnedMoments.value.find(m => m && m.id === momentState.viewPinnedMomentId) || null;
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
        const acc = currentAccountData.value || {};
        const cats = acc.categories || [];
        const friends = (acc.friends || []).map(fid => {
            const chars = state.contactsData?.characters || [];
            const myPs = state.contactsData?.myPersonas || [];
            const persona = chars.find(c => c && c.id === fid) || myPs.find(c => c && c.id === fid);
            const facc = chatDb.value?.accounts?.[fid];
            return { id: fid, name: facc?.profile?.nickname || persona?.chatName || persona?.name || '未知', avatar: persona?.avatar || facc?.profile?.avatar || '' };
        }).filter(Boolean);
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
        if (!myAcc) return;
        if (!Array.isArray(myAcc.profile.moments)) myAcc.profile.moments = [];
        myAcc.profile.moments.unshift({
            id: 'mom_' + Date.now(), text: momentState.text.trim(), imageType: momentState.imageType, image: momentState.image, fakeImageText: momentState.fakeImageText.trim(),
            visibility: momentState.visibility, visibleTargets: [...momentState.visibleTargets], timestamp: Date.now(), time: new Date().toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }), likes: [], comments: [], pinned: false
        });
        momentState.showPublish = false; 
        chatDb.value.triggerSync = Date.now();
        nextTick(() => { if (window.lucide) window.lucide.createIcons(); });
    };

    const getSourceMoment = (moment) => {
        if (!moment || !moment.authorId) return null;
        const authorAcc = chatDb.value?.accounts?.[moment.authorId];
        if (!authorAcc || !authorAcc.profile || !Array.isArray(authorAcc.profile.moments)) return null;
        return authorAcc.profile.moments.find(m => m && m.id === moment.id);
    };

    const toggleLike = (moment) => {
        if(!chatState.currentUser) return;
        const myId = chatState.currentUser.id;
        const sourceMoment = getSourceMoment(moment);
        if (!sourceMoment) return;
        if (!Array.isArray(sourceMoment.likes)) sourceMoment.likes = [];
        const idx = sourceMoment.likes.indexOf(myId);
        if (idx > -1) sourceMoment.likes.splice(idx, 1);
        else sourceMoment.likes.push(myId);
        chatDb.value.triggerSync = Date.now(); 
    };

    const openCommentModal = (moment) => { momentState.activeMoment = moment; momentState.commentText = ''; momentState.showCommentModal = true; };

    const submitComment = () => {
        if (!momentState.commentText.trim() || !momentState.activeMoment || !chatState.currentUser) return;
        const sourceMoment = getSourceMoment(momentState.activeMoment);
        if (!sourceMoment) return;
        if (!Array.isArray(sourceMoment.comments)) sourceMoment.comments = [];
        sourceMoment.comments.push({ id: 'cmt_' + Date.now(), authorId: chatState.currentUser.id, authorName: getPersonaName(chatState.currentUser.id), content: momentState.commentText.trim(), timestamp: Date.now() });
        momentState.showCommentModal = false; momentState.commentText = '';
        chatDb.value.triggerSync = Date.now();
    };

    const openForwardModal = (moment) => { momentState.activeMoment = moment; momentState.showForwardModal = true; };

    const forwardMoment = (conv) => {
        if (!momentState.activeMoment || !conv || !currentAccountData.value || !chatState.currentUser) return;
        const rawConv = (currentAccountData.value.conversations || []).find(c => c && c.id === conv.id);
        if (!rawConv) return;
        if (!Array.isArray(rawConv.messages)) rawConv.messages = [];
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
        if (!currentAccountData.value || !moment) return;
        if (!Array.isArray(currentAccountData.value.favorites)) currentAccountData.value.favorites = [];
        currentAccountData.value.favorites.unshift({ type: 'moment', convId: '', msgId: moment.id, title: `[动态] ${moment.authorName || '未知'}`, content: moment.text || (moment.imageType === 'fake' ? moment.fakeImageText : '[图片]'), time: moment.time || '' });
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
        if (!moment || !confirm('确定彻底删除这条动态吗？')) return;
        const authorAcc = chatDb.value?.accounts?.[moment.authorId];
        if (authorAcc && authorAcc.profile && Array.isArray(authorAcc.profile.moments)) {
            authorAcc.profile.moments = authorAcc.profile.moments.filter(m => m && m.id !== moment.id);
        }
        if (momentState.viewPinnedMomentId === moment.id) momentState.viewPinnedMomentId = null;
        momentState.showMoreMenu = false;
        chatDb.value.triggerSync = Date.now();
    };

    const deleteComment = (moment, cmt) => {
        if (!moment || !cmt) return;
        if (!confirm('确定删除这条评论吗？')) return;
        const sourceMoment = getSourceMoment(moment);
        if (!sourceMoment || !Array.isArray(sourceMoment.comments)) return;
        sourceMoment.comments = sourceMoment.comments.filter(c => c.id !== cmt.id);
        chatDb.value.triggerSync = Date.now();
    };

    const openMomentPhotoViewer = (moment) => {
        chatState.photoViewerText = moment.fakeImageText || '一张照片';
        chatState.photoViewerImg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='800'%3E%3Crect width='600' height='800' fill='%23e0e0e0'/%3E%3Ctext x='300' y='400' font-family='sans-serif' font-size='28' font-weight='bold' fill='%23999999' text-anchor='middle' dominant-baseline='middle'%3EPHOTO%3C/text%3E%3C/svg%3E";
        chatState.photoViewerOpen = true;
    };

    return {
        allMoments, pinnedMoments, feedMoments, momentState, activePinnedMoment, visibilityLabel, contactOptions, toggleTarget, openPublishModal, triggerMomentImage, publishMoment, toggleLike, openMomentPhotoViewer, formatMomentTime, getLikeNames, openCommentModal, submitComment, openForwardModal, forwardMoment, openMomentMoreMenu, favoriteMoment, pinMoment, openEditMomentModal, saveEditMoment, deleteMoment, deleteComment
    };
};
