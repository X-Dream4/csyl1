window.useChatGroupLogic = function(state, chatMethods) {
    const { reactive, computed, nextTick } = Vue;
    const { chatState, chatDb, currentAccountData } = chatMethods;

    const groupState = reactive({
        createName: '',
        selectedMembers: [],
    });

    const availableGroupMembers = computed(() => {
        if (!currentAccountData.value) return [];
        return (currentAccountData.value.friends || []).map(fid => {
            const c = [...(state.contactsData?.characters || []), ...(state.contactsData?.myPersonas || []), ...(state.contactsData?.npcs || [])].find(x => x && x.id === fid);
            const acc = chatDb.value.accounts[fid];
            if (!c && !acc) return null;
            return {
                id: fid,
                name: acc?.profile?.nickname || c?.chatName || c?.name || '未知',
                avatar: c?.avatar || acc?.profile?.avatar || ''
            }
        }).filter(Boolean);
    });

    const toggleGroupMember = (id) => {
        const idx = groupState.selectedMembers.indexOf(id);
        if (idx > -1) groupState.selectedMembers.splice(idx, 1);
        else groupState.selectedMembers.push(id);
    };

    const confirmCreateGroup = () => {
        if (!groupState.createName.trim()) return alert('请输入群聊名称');
        if (groupState.selectedMembers.length < 2) return alert('至少选择 2 名群成员（除你之外）');
        
        const myId = chatState.currentUser.id;
        const groupId = 'g_' + Date.now() + Math.random().toString(36).slice(2, 6);
        const members = [myId, ...groupState.selectedMembers];
        
        if (!chatDb.value.groups) chatDb.value.groups = {};
        chatDb.value.groups[groupId] = {
            id: groupId,
            name: groupState.createName.trim(),
            customAvatar: '', // 为空时会自动显示组合头像
            members,
            creatorId: myId,
            createTime: Date.now()
        };

        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        currentAccountData.value.conversations.unshift({
            id: 'c_' + Date.now(),
            type: 'group',
            targetId: groupId,
            lastMsg: '我发起了群聊',
            time: timeStr,
            messages: [{
                id: 'm_' + Date.now(),
                senderId: '__system__',
                type: 'sys',
                text: '你邀请了大家加入了群聊',
                time: timeStr
            }],
            settings: { remarkName: '' }
        });

        groupState.selectedMembers.forEach(fid => {
            const fAcc = chatDb.value.accounts[fid];
            if (fAcc && Array.isArray(fAcc.conversations)) {
                fAcc.conversations.unshift({
                    id: 'c_' + Date.now() + Math.random().toString(36).slice(2, 6),
                    type: 'group', targetId: groupId, lastMsg: '加入了群聊', time: timeStr, messages: [], settings: {}
                });
            }
        });

        chatState.modals.createGroup = false;
        groupState.createName = '';
        groupState.selectedMembers = [];
        alert('群聊创建成功！快去聊天界面看看吧。');
        
        chatDb.value.triggerSync = Date.now();
        nextTick(() => { if (window.lucide) window.lucide.createIcons(); });
    };

    // 获取组合群头像需要的前4个成员头像
    const getGroupAvatarMembers = (groupId) => {
        const grp = chatDb.value.groups?.[groupId];
        if (!grp || !Array.isArray(grp.members)) return [];
        return grp.members.slice(0, 4).map(id => {
            const c = [...(state.contactsData?.characters || []), ...(state.contactsData?.myPersonas || []), ...(state.contactsData?.npcs || [])].find(x => x && x.id === id);
            const acc = chatDb.value.accounts[id];
            return { 
                id, 
                avatar: c?.avatar || acc?.profile?.avatar || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23dcdcdc'/%3E%3C/svg%3E" 
            };
        });
    };

    // 获取当前正在浏览的群聊详情
    const activeGroupInfo = computed(() => {
        if (!chatState.activeConvId || !currentAccountData.value) return null;
        const conv = currentAccountData.value.conversations.find(c => c.id === chatState.activeConvId);
        if (conv && conv.type === 'group') {
            return chatDb.value.groups?.[conv.targetId] || null;
        }
        return null;
    });

    // 获取群成员完整资料列表（供设置里修改人设）
    const activeGroupMembers = computed(() => {
        if (!activeGroupInfo.value) return [];
        return activeGroupInfo.value.members.map(id => {
            const acc = chatDb.value.accounts[id];
            const c = [...(state.contactsData?.characters || []), ...(state.contactsData?.myPersonas || []), ...(state.contactsData?.npcs || [])].find(x => x && x.id === id);
            return {
                id,
                isMe: id === chatState.currentUser?.id,
                personaObj: c,
                accountObj: acc
            };
        });
    });

    // 上传自定义群头像
    const triggerGroupAvatarUpload = () => {
        if (!activeGroupInfo.value) return;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                activeGroupInfo.value.customAvatar = ev.target.result;
                chatDb.value.triggerSync = Date.now();
            };
            reader.readAsDataURL(file);
        };
        input.click();
    };

    return { 
        groupState, availableGroupMembers, toggleGroupMember, confirmCreateGroup,
        getGroupAvatarMembers, activeGroupInfo, activeGroupMembers, triggerGroupAvatarUpload
    };
};
