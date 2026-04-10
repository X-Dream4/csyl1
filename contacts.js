window.useContactsLogic = function(state) {
    const { ref, reactive, computed, watch, nextTick } = Vue;

    const contactsTab = ref('chars');
    const modals = reactive({ char: false, world: false, wb: false, wbCat: false, relSelect: false, relEdit: false });

    const charForm = reactive({ isMe: false, worldId: '', name: '', avatar: '', persona: '', phoneLockType: 'num' });
    const wbForm = reactive({ categoryId: '', keywords: '', content: '' });

    const activeChar = ref(null);

    const pwdVisibility = reactive({ chat: false, lockNum: false, lockPat: false, lockQAQ: false, lockQAA: false });

    const canvasRef = ref(null);
    const selectedNodeId = ref(null);
    const canvasPan = reactive({ x: 0, y: 0 }); // 新增画板移动坐标
    let isPanning = false;
    let panStart = { x: 0, y: 0 };
    
    const relEditForm = reactive({ relId: '', sourceView: '', targetView: '', otherName: '' });

    const contactsDb = computed(() => state.contactsData);
    const worlds = computed(() => contactsDb.value.worlds || []);
    const wbCategories = computed(() => contactsDb.value.wbCategories || []);

    const refreshIcons = () => nextTick(() => window.lucide && window.lucide.createIcons());
    watch([contactsTab, activeChar, () => modals.char, () => modals.wb, () => modals.relEdit], refreshIcons);

    const groupedChars = computed(() => {
        if (!worlds.value.length) return [];
        const allChars = [...(contactsDb.value.myPersonas || []), ...(contactsDb.value.characters || [])];
        return worlds.value.map(w => ({ world: w, chars: allChars.filter(c => c.worldId === w.id) }));
    });

    const groupedWbs = computed(() => {
        if (!wbCategories.value.length) return [];
        return wbCategories.value.map(c => ({ category: c, wbs: (contactsDb.value.worldbooks || []).filter(w => w.categoryId === c.id) }));
    });

    const openAddWorld = () => {
        const name = prompt('请输入世界分类名称：');
        if (name && name.trim()) {
            if (!contactsDb.value.worlds) contactsDb.value.worlds = [];
            contactsDb.value.worlds.push({ id: 'w_' + Date.now(), name: name.trim() });
        }
    };

    const openAddWbCat = () => {
        const name = prompt('请输入世界书分类名称：');
        if (name && name.trim()) {
            if (!contactsDb.value.wbCategories) contactsDb.value.wbCategories = [];
            contactsDb.value.wbCategories.push({ id: 'c_' + Date.now(), name: name.trim() });
        }
    };

const openAddChar = (isMe = false) => {
    if (!worlds.value.length) return alert('请先新建一个世界分类！');
    charForm.isMe = isMe;
    charForm.worldId = worlds.value[0]?.id || '';
    charForm.name = '';
    charForm.avatar = '';
    charForm.persona = '';
    charForm.phoneLockType = 'num';
    modals.char = true;
};

    const triggerAvatarUpload = (targetObj) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => targetObj.avatar = ev.target.result;
            reader.readAsDataURL(file);
        };
        input.click();
    };

    const saveChar = () => {
        if (!charForm.worldId) return alert('请选择所属的世界分类');
        if (!charForm.name.trim()) return alert('请输入姓名');

const newChar = {
    id: 'char_' + Date.now(), isMe: charForm.isMe, worldId: charForm.worldId,
    name: charForm.name.trim(), chatName: charForm.name.trim(), avatar: charForm.avatar,
    persona: charForm.persona.trim(), phone: '', email: '', chatAcc: '', chatPwd: '',
    phoneLockType: charForm.phoneLockType || 'num',
    lockPwdNum: '', lockPwdPat: '', lockPwdQA_Q: '', lockPwdQA_A: ''
};

        if (charForm.isMe) {
            if (!contactsDb.value.myPersonas) contactsDb.value.myPersonas = [];
            contactsDb.value.myPersonas.unshift(newChar);
        } else {
            if (!contactsDb.value.characters) contactsDb.value.characters = [];
            contactsDb.value.characters.unshift(newChar);
        }
        modals.char = false;
    };

    const openAddWb = () => {
        if (!wbCategories.value.length) return alert('请先新建世界书分类！');
        wbForm.categoryId = wbCategories.value[0]?.id || '';
        wbForm.keywords = '';
        wbForm.content = '';
        modals.wb = true;
    };

    const saveWb = () => {
        if (!wbForm.categoryId) return alert('请选择分类');
        if (!wbForm.content.trim()) return alert('内容不能为空');
        if (!contactsDb.value.worldbooks) contactsDb.value.worldbooks = [];
        contactsDb.value.worldbooks.unshift({
            id: 'wb_' + Date.now(), categoryId: wbForm.categoryId, keywords: wbForm.keywords.trim(), content: wbForm.content.trim()
        });
        modals.wb = false;
    };

    const ensureCharFields = (char) => {
        if (char.chatName === undefined) char.chatName = char.name || '';
        if (char.phone === undefined) char.phone = '';
        if (char.email === undefined) char.email = '';
        if (char.chatAcc === undefined) char.chatAcc = '';
        if (char.chatPwd === undefined) char.chatPwd = '';
        if (char.lockPwdNum === undefined) char.lockPwdNum = '';
        if (char.lockPwdPat === undefined) char.lockPwdPat = '';
        if (char.lockPwdQA_Q === undefined) char.lockPwdQA_Q = '';
        if (char.lockPwdQA_A === undefined) char.lockPwdQA_A = '';
        if (!Array.isArray(char.memories)) char.memories = [];
        if (char.phoneLockType === undefined || !['num', 'pattern', 'qa'].includes(char.phoneLockType)) {
            if (char.lockPwdNum) char.phoneLockType = 'num';
            else if (char.lockPwdPat) char.phoneLockType = 'pattern';
            else if (char.lockPwdQA_Q || char.lockPwdQA_A) char.phoneLockType = 'qa';
            else char.phoneLockType = 'num';
        }
    };

    const newMemoryText = ref('');
    const newMemoryWeight = ref('3');
    
    const addCharMemory = (char) => {
        if (!newMemoryText.value.trim()) return;
        if (!Array.isArray(char.memories)) char.memories = [];
        char.memories.unshift({
            id: 'mem_' + Date.now(),
            content: newMemoryText.value.trim(),
            timestamp: Date.now(),
            weight: parseInt(newMemoryWeight.value) || 3
        });
        newMemoryText.value = '';
    };

    const removeCharMemory = (char, memId) => {
        if (!Array.isArray(char.memories)) return;
        char.memories = char.memories.filter(m => m.id !== memId);
    };

    const openCharDetail = (char) => {
        ensureCharFields(char);
        activeChar.value = char;
        pwdVisibility.chat = false; pwdVisibility.lockNum = false; pwdVisibility.lockPat = false;
        pwdVisibility.lockQAQ = false; pwdVisibility.lockQAA = false;
        
        canvasPan.x = 0;
        canvasPan.y = 0;

        if (!contactsDb.value.layouts) contactsDb.value.layouts = {};
        if (!contactsDb.value.layouts[char.id]) contactsDb.value.layouts[char.id] = {};
        if (!contactsDb.value.layouts[char.id][char.id]) contactsDb.value.layouts[char.id][char.id] = { x: window.innerWidth / 2 - 30, y: 130 };

        refreshIcons();
    };

    const hashString = (str) => {
        let hash = 0;
        const s = String(str || '');
        for (let i = 0; i < s.length; i++) { hash = ((hash << 5) - hash) + s.charCodeAt(i); hash |= 0; }
        return Math.abs(hash);
    };

    const getAsciiRoleKey = (char) => {
        const raw = `${char?.name || ''}${char?.persona || ''}`;
        const ascii = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (ascii) return ascii.slice(0, 12);
        return 'role' + String(hashString(raw)).slice(0, 6);
    };

    const buildAlphaNum = (seed, len = 8) => {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let out = ''; let n = hashString(seed);
        for (let i = 0; i < len; i++) { n = (n * 1664525 + 1013904223) >>> 0; out += chars[n % chars.length]; }
        return out;
    };

    const buildDigits = (seed, len = 6) => {
        let out = ''; let n = hashString(seed);
        for (let i = 0; i < len; i++) { n = (n * 1103515245 + 12345) >>> 0; out += String(n % 10); }
        return out;
    };

    const getRoleThemeWord = (char) => {
        const text = `${char?.name || ''} ${char?.persona || ''}`.toLowerCase();
        const themeMap = [
            { keys: ['hack', '黑客', '程序', 'code'], word: 'cipher' },
            { keys: ['doctor', '医生', 'medical', 'nurse'], word: 'vital' },
            { keys: ['police', '警察', 'law'], word: 'guard' },
            { keys: ['killer', '杀手', 'blade'], word: 'shade' },
            { keys: ['idol', 'singer', '明星'], word: 'stage' },
            { keys: ['student', '学院', 'school'], word: 'lesson' },
            { keys: ['mage', 'magic', '魔法'], word: 'arcane' },
            { keys: ['cat', '猫', 'cute', '可爱'], word: 'mimi' }
        ];
        for (const item of themeMap) { if (item.keys.some(k => text.includes(String(k).toLowerCase()))) return item.word; }
        return 'core';
    };

    const buildDrawablePattern = (seed, len = 5) => {
        const neighbors = { 0: [1,3,4], 1: [0,2,3,4,5], 2: [1,4,5], 3: [0,1,4,6,7], 4: [0,1,2,3,5,6,7,8], 5: [1,2,4,7,8], 6: [3,4,7], 7: [3,4,5,6,8], 8: [4,5,7] };
        const targetLen = Math.max(4, Math.min(len, 8));
        let n = hashString(seed); const used = new Set();
        let current = n % 9; const path = [current]; used.add(current);
        while (path.length < targetLen) {
            const options = neighbors[current].filter(x => !used.has(x));
            let next;
            if (options.length > 0) { n = (n * 214013 + 2531011) >>> 0; next = options[n % options.length]; } 
            else { const remain = [0,1,2,3,4,5,6,7,8].filter(x => !used.has(x)); if (!remain.length) break; n = (n * 214013 + 2531011) >>> 0; next = remain[n % remain.length]; }
            path.push(next); used.add(next); current = next;
        }
        return path.join('');
    };

    const getOtherChars = (currentChar) => [...(contactsDb.value.myPersonas || []), ...(contactsDb.value.characters || [])].filter(item => item.id !== currentChar.id);

    const ensureUniqueByField = (baseValue, field, currentChar, builder, maxTry = 50) => {
        const others = getOtherChars(currentChar);
        let value = String(baseValue || '');
        for (let i = 0; i < maxTry; i++) {
            if (!others.some(item => String(item[field] || '') === value)) return value;
            value = builder(i + 1);
        }
        return value;
    };

const normalizeGeneratedFields = (char, rawData) => {
    const roleKey = getAsciiRoleKey(char);
    const theme = getRoleThemeWord(char);
    const salt = `${char.id}_${char.name}_${char.persona}_${theme}`;
    
    let chatName = String(rawData.chatName || char.name || '').slice(0, 15);

    let phone = buildDigits(salt + '_phone_fix', 7);
    phone = ensureUniqueByField(phone, 'phone', char, (i) => buildDigits(salt + '_phone_' + i, 7));

    let email = `${(theme + roleKey + buildAlphaNum(salt + '_mail_fix', 3)).slice(0, 16)}@youl.com`;
    email = ensureUniqueByField(email, 'email', char, (i) => `${(theme + roleKey + buildAlphaNum(salt + '_mail_' + i, 3)).slice(0, 16)}@youl.com`);

    let chatAcc = String(rawData.chatAcc || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 18);
    if (chatAcc.length < 5) chatAcc = (theme + roleKey + buildAlphaNum(salt + '_acc_fix', 4)).slice(0, 18);
    chatAcc = ensureUniqueByField(chatAcc, 'chatAcc', char, (i) => (theme + roleKey + buildAlphaNum(salt + '_acc_' + i, 4)).slice(0, 18));

    let chatPwd = String(rawData.chatPwd || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
    if (chatPwd.length < 4) chatPwd = (theme + buildAlphaNum(salt + '_pwd_fix', 6)).slice(0, 8);
    chatPwd = ensureUniqueByField(chatPwd, 'chatPwd', char, (i) => (theme + buildAlphaNum(salt + '_pwd_' + i, 6)).slice(0, 8));

    let phoneLockType = ['num', 'pattern', 'qa'].includes(String(rawData.phoneLockType || '').trim())
        ? String(rawData.phoneLockType).trim()
        : ['num', 'pattern', 'qa'][hashString(salt + '_lock_type') % 3];

    let lockPwdNum = '';
    let lockPwdPat = '';
    let lockPwdQA_Q = '';
    let lockPwdQA_A = '';

    if (phoneLockType === 'num') {
        lockPwdNum = String(rawData.lockPwdNum || '').replace(/\D/g, '').slice(0, 6);
        if (lockPwdNum.length !== 4 && lockPwdNum.length !== 6) lockPwdNum = buildDigits(salt + '_lock_num_fix', 6);
        lockPwdNum = ensureUniqueByField(lockPwdNum, 'lockPwdNum', char, (i) => buildDigits(salt + '_lock_num_' + i, 6));
    } else if (phoneLockType === 'pattern') {
        lockPwdPat = buildDrawablePattern(salt + '_lock_pat_fix', 5);
        lockPwdPat = ensureUniqueByField(lockPwdPat, 'lockPwdPat', char, (i) => buildDrawablePattern(salt + '_lock_pat_' + i, 5));
    } else {
        lockPwdQA_Q = String(rawData.lockPwdQA_Q || '只有我知道的问题是？').trim();
        lockPwdQA_A = String(rawData.lockPwdQA_A || (theme + roleKey.slice(0, 4))).trim();
    }

    return { chatName, phone, email, chatAcc, chatPwd, phoneLockType, lockPwdNum, lockPwdPat, lockPwdQA_Q, lockPwdQA_A };
};

    const fallbackLocalGenerate = (c) => {
        const rawData = { chatName: c.name };
        const fixed = normalizeGeneratedFields(c, rawData);
        Object.assign(c, fixed);
    };

    const callApiToGenerate = async () => {
        if (!activeChar.value || activeChar.value.isMe) return;
        const c = activeChar.value;
        const apiConf = state.apiConfig || {};

        if (!apiConf.baseUrl || !apiConf.apiKey || !apiConf.activeModel) {
            alert('系统提示：你还没有在设置里填写完整 API 信息，已自动改用本地生成。');
            fallbackLocalGenerate(c); return;
        }

        const systemPrompt = `你是角色 ${c.name || '未知角色'}。你需要根据你自己的设定，生成符合你身份的账号密码信息。
请不要输出多余解释，直接按照以下格式逐行输出（严格照抄冒号及格式，不要输出 JSON）：
Chat昵称：[10字以内的聊天网名昵称，必须符合你的人设]
Chat账号：[8到18位纯英文数字的聊天账号]
Chat密码：[8位纯英文数字的聊天密码]
数字锁屏密码：[设置4或6位纯数字密码]
图案锁屏密码：[设置一串0-8的数字例如04876作为手势轨迹]
密保问题：[设置一个密保问题]
密保答案：[设置对应的密保答案]
手机锁屏样式：[从 num、pattern、qa 中选择一个，作为你当前主要使用的锁屏样式]`;

        const userPrompt = `角色名：${c.name || ''}\n角色设定：${c.persona || ''}\n请直接按要求格式逐行输出。`;
        alert(`正在调用模型 [${apiConf.activeModel}] 生成... (已切换为极速文本模式)`);

        try {
            let url = String(apiConf.baseUrl || '').trim();
            if (url.endsWith('/')) url = url.slice(0, -1);
            if (!url.endsWith('/v1') && !url.includes('/v1/')) url += '/v1';

            const response = await fetch(url + '/chat/completions', {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConf.apiKey}` },
                body: JSON.stringify({ model: apiConf.activeModel, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], temperature: 0.7 })
            });

            if (!response.ok) throw new Error(`API 请求失败`);
            const resData = await response.json();
            let content = resData?.choices?.[0]?.message?.content || '';
            
            // 极速解析文本格式
            const aiData = {};
            const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
            lines.forEach(line => {
                if (line.includes('Chat昵称：')) aiData.chatName = line.split('：')[1].trim();
                else if (line.includes('Chat账号：')) aiData.chatAcc = line.split('：')[1].trim();
                else if (line.includes('Chat密码：')) aiData.chatPwd = line.split('：')[1].trim();
                else if (line.includes('手机锁屏样式：')) aiData.phoneLockType = line.split('：')[1].trim();
                else if (line.includes('数字锁屏密码：')) aiData.lockPwdNum = line.split('：')[1].trim();
                else if (line.includes('图案锁屏密码：')) aiData.lockPwdPat = line.split('：')[1].trim();
                else if (line.includes('密保问题：')) aiData.lockPwdQA_Q = line.split('：')[1].trim();
                else if (line.includes('密保答案：')) aiData.lockPwdQA_A = line.split('：')[1].trim();
            });

            const fixed = normalizeGeneratedFields(c, aiData);
            Object.assign(c, fixed);
            alert('API 生成成功，已自动填入。');
        } catch (error) {
            console.error(error);
            alert(`API 调用失败，已改用本地生成。\n${error.message}`);
            fallbackLocalGenerate(c);
        }
    };

    const deleteActiveChar = () => {
        if (!activeChar.value) return;
        if (!confirm(`确定彻底删除 [${activeChar.value.name}] 吗？`)) return;
        const id = activeChar.value.id;
        if (activeChar.value.isMe) contactsDb.value.myPersonas = (contactsDb.value.myPersonas || []).filter(c => c.id !== id);
        else contactsDb.value.characters = (contactsDb.value.characters || []).filter(c => c.id !== id);
        if (contactsDb.value.relationships) contactsDb.value.relationships = contactsDb.value.relationships.filter(r => r.sourceId !== id && r.targetId !== id);
        activeChar.value = null;
    };

    // AI 生成关系羁绊评价
    const callApiToSetRelations = async () => {
        if (!activeChar.value || activeChar.value.isMe) return;
        const edges = canvasEdges.value;
        if (!edges.length) return alert('该角色还没有连线羁绊角色！');

        const apiConf = state.apiConfig || {};
        if (!apiConf.baseUrl || !apiConf.apiKey || !apiConf.activeModel) return alert('请先配置 API 信息。');

        const othersInfo = edges.map(e => {
            const otherId = e.sourceId === activeChar.value.id ? e.targetId : e.sourceId;
            const other = getOtherChars(activeChar.value).find(c => c.id === otherId);
            return other ? `${other.name}(${other.persona.slice(0, 30)})` : '';
        }).filter(Boolean).join('；');

        const sysPrompt = `你是角色 ${activeChar.value.name}。设定：${activeChar.value.persona}。
请根据你的人设，用简短的词语（如：宿敌/暗恋/挚友/利用对象）评价你对以下角色的看法。
请严格按照格式逐行输出，不要加任何废话：
角色名：你的看法`;

        alert(`正在让 ${activeChar.value.name} 思考对大家的看法...`);
        try {
            let url = String(apiConf.baseUrl).trim();
            if (url.endsWith('/')) url = url.slice(0, -1);
            if (!url.endsWith('/v1')) url += '/v1';

            const res = await fetch(url + '/chat/completions', {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConf.apiKey}` },
                body: JSON.stringify({ model: apiConf.activeModel, messages: [{ role: 'system', content: sysPrompt }, { role: 'user', content: `请评价这些角色：${othersInfo}` }] })
            });
            const data = await res.json();
            const text = data?.choices?.[0]?.message?.content || '';
            
            const lines = text.split('\n').filter(Boolean);
            lines.forEach(line => {
                const parts = line.split('：');
                if (parts.length >= 2) {
                    const name = parts[0].trim();
                    const view = parts[1].trim();
                    const targetChar = getOtherChars(activeChar.value).find(c => c.name === name || c.chatName === name);
                    if (targetChar) {
                        const edge = contactsDb.value.relationships.find(r => (r.sourceId === activeChar.value.id && r.targetId === targetChar.id) || (r.sourceId === targetChar.id && r.targetId === activeChar.value.id));
                        if (edge) {
                            if (edge.sourceId === activeChar.value.id) edge.sourceView = view;
                            else edge.targetView = view;
                        }
                    }
                }
            });
            alert('羁绊看法已更新！');
        } catch (e) { alert('API调用失败: ' + e.message); }
    };

    // 为我的设定获取没加好友的羁绊
    const unfriendedBondedNpcs = computed(() => {
        if (!activeChar.value || !activeChar.value.isMe) return [];
        const myChatAcc = state.chatData.accounts[activeChar.value.id];
        const myFriends = myChatAcc ? myChatAcc.friends : [];
        return canvasEdges.value.map(e => {
            const otherId = e.sourceId === activeChar.value.id ? e.targetId : e.sourceId;
            return getOtherChars(activeChar.value).find(c => c.id === otherId);
        }).filter(c => c && !myFriends.includes(c.id));
    });

    const pendingRequestIds = ref([]);
    const sendFriendRequestsFromNPCs = async () => {
        if (!pendingRequestIds.value.length) return alert('请先勾选角色');
        const apiConf = state.apiConfig || {};
        if (!apiConf.baseUrl || !apiConf.apiKey || !apiConf.activeModel) return alert('请先配置 API 信息。');
        
        let url = String(apiConf.baseUrl).trim();
        if (url.endsWith('/')) url = url.slice(0, -1);
        if (!url.endsWith('/v1')) url += '/v1';

        alert('正在通知角色发送好友请求，请稍候...');
        for (let npcId of pendingRequestIds.value) {
            const npc = getOtherChars(activeChar.value).find(c => c.id === npcId);
            if (!npc) continue;
            
            const sysPrompt = `你是角色 ${npc.name}。设定：${npc.persona}。你要向 ${activeChar.value.name} 发送一条加好友的验证消息。请符合你的人设语气，简短有力（不超过20字）。直接输出你想说的一句话，不要输出引号。`;
            try {
                const res = await fetch(url + '/chat/completions', {
                    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConf.apiKey}` },
                    body: JSON.stringify({ model: apiConf.activeModel, messages: [{ role: 'system', content: sysPrompt }] })
                });
                const data = await res.json();
                const text = (data?.choices?.[0]?.message?.content || `你好，我是${npc.name}`).replace(/"/g, '').trim();
                
                if (!state.chatData.friendRequests) state.chatData.friendRequests = [];
                // 查重，避免重复发送
                if (!state.chatData.friendRequests.find(r => r.fromId === npcId && r.toId === activeChar.value.id && r.status === 'pending')) {
                    state.chatData.friendRequests.push({ id: 'req_' + Date.now() + Math.random(), fromId: npcId, toId: activeChar.value.id, text, status: 'pending', time: Date.now() });
                }
            } catch (e) { console.error('发送请求失败', e); }
        }
        pendingRequestIds.value = [];
        alert('选中的角色已向你发送好友申请！请去 Chat APP 的【联系人】里查看【新的朋友】。');
    };

    const canvasNodes = computed(() => {
        if (!activeChar.value) return [];
        const layout = contactsDb.value.layouts?.[activeChar.value.id] || {};
        const nodes = [{ id: activeChar.value.id, name: activeChar.value.name, avatar: activeChar.value.avatar, x: layout[activeChar.value.id]?.x || window.innerWidth / 2 - 30, y: layout[activeChar.value.id]?.y || 130 }];

        (contactsDb.value.relationships || []).forEach(r => {
            if (r.sourceId === activeChar.value.id || r.targetId === activeChar.value.id) {
                const otherId = r.sourceId === activeChar.value.id ? r.targetId : r.sourceId;
                if (!nodes.find(n => n.id === otherId)) {
                    const c = [...(contactsDb.value.characters || []), ...(contactsDb.value.myPersonas || [])].find(item => item.id === otherId);
                    if (c) nodes.push({ id: c.id, name: c.name, avatar: c.avatar, x: layout[c.id]?.x || 50 + Math.random() * 200, y: layout[c.id]?.y || 50 + Math.random() * 150 });
                }
            }
        });
        return nodes;
    });

    const canvasEdges = computed(() => {
        if (!activeChar.value) return [];
        const nodes = canvasNodes.value;
        const edges = [];
        (contactsDb.value.relationships || []).forEach(r => {
            const n1 = nodes.find(n => n.id === r.sourceId);
            const n2 = nodes.find(n => n.id === r.targetId);
            if (n1 && n2) {
                const cx = (n1.x + n2.x) / 2;
                const cy = (n1.y - 10 + n2.y - 10) / 2;
                let angle = Math.atan2((n2.y - 10) - (n1.y - 10), n2.x - n1.x) * (180 / Math.PI);
                if (angle > 90 || angle < -90) angle += 180;
                edges.push({ ...r, x1: n1.x, y1: n1.y - 10, x2: n2.x, y2: n2.y - 10, cx, cy, angle });
            }
        });
        return edges;
    });

    const availableRelChars = computed(() => {
        if (!activeChar.value) return [];
        const connectedIds = canvasEdges.value.map(e => e.sourceId === activeChar.value.id ? e.targetId : e.sourceId);
        connectedIds.push(activeChar.value.id);
        const pool = [...(contactsDb.value.myPersonas || []), ...((contactsDb.value.characters || []).filter(c => c.worldId === activeChar.value.worldId))];
        return pool.filter(c => !connectedIds.includes(c.id));
    });

    const confirmAddRel = (targetId) => {
        if (!contactsDb.value.relationships) contactsDb.value.relationships = [];
        contactsDb.value.relationships.push({ id: 'rel_' + Date.now(), sourceId: activeChar.value.id, targetId, sourceView: '认识', targetView: '认识' });
        modals.relSelect = false;
    };

    const handleNodeClick = (nodeId) => {
        if (selectedNodeId.value === null) { selectedNodeId.value = nodeId; return; }
        if (selectedNodeId.value !== nodeId) {
            if (!contactsDb.value.relationships) contactsDb.value.relationships = [];
            const exists = contactsDb.value.relationships.find(r => (r.sourceId === selectedNodeId.value && r.targetId === nodeId) || (r.sourceId === nodeId && r.targetId === selectedNodeId.value));
            if (!exists) contactsDb.value.relationships.push({ id: 'rel_' + Date.now(), sourceId: selectedNodeId.value, targetId: nodeId, sourceView: '认识', targetView: '认识' });
        }
        selectedNodeId.value = null;
    };

    const openRelEdit = (edge) => {
        relEditForm.relId = edge.id;
        const isSourceMe = edge.sourceId === activeChar.value.id;
        relEditForm.sourceView = isSourceMe ? edge.sourceView : edge.targetView;
        relEditForm.targetView = isSourceMe ? edge.targetView : edge.sourceView;
        const otherChar = [...(contactsDb.value.characters || []), ...(contactsDb.value.myPersonas || [])].find(c => c.id === (isSourceMe ? edge.targetId : edge.sourceId));
        relEditForm.otherName = otherChar?.name || '对方';
        modals.relEdit = true;
    };
    const saveRelEdit = () => {
        const edge = (contactsDb.value.relationships || []).find(r => r.id === relEditForm.relId);
        if (edge) {
            const isSourceMe = edge.sourceId === activeChar.value.id;
            if (isSourceMe) { edge.sourceView = relEditForm.sourceView; edge.targetView = relEditForm.targetView; }
            else { edge.targetView = relEditForm.sourceView; edge.sourceView = relEditForm.targetView; }
        }
        modals.relEdit = false;
    };

    let draggingNodeId = null;

    const startPan = (e) => {
        if (e.target.tagName.toLowerCase() === 'svg' || e.target.classList.contains('c-rel-canvas-inner')) {
            isPanning = true;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            panStart = { x: clientX - canvasPan.x, y: clientY - canvasPan.y };
        }
    };

    const startDrag = (e, nodeId) => { draggingNodeId = nodeId; };

    const onCanvasMove = (e) => {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        if (isPanning) {
            canvasPan.x = clientX - panStart.x;
            canvasPan.y = clientY - panStart.y;
        } else if (draggingNodeId && activeChar.value && canvasRef.value) {
            const rect = canvasRef.value.getBoundingClientRect();
            // 计算相对容器内层的真正坐标
            let x = clientX - rect.left - canvasPan.x;
            let y = clientY - rect.top - canvasPan.y;

            if (!contactsDb.value.layouts) contactsDb.value.layouts = {};
            if (!contactsDb.value.layouts[activeChar.value.id]) contactsDb.value.layouts[activeChar.value.id] = {};
            contactsDb.value.layouts[activeChar.value.id][draggingNodeId] = { x, y };
        }
    };

    const endDrag = () => { draggingNodeId = null; isPanning = false; };

    return {
        callApiToSetRelations, unfriendedBondedNpcs, pendingRequestIds, sendFriendRequestsFromNPCs,
        contactsTab, modals, charForm, wbForm, worlds, wbCategories, groupedChars, groupedWbs, contactsDb,
        openAddWorld, openAddWbCat, openAddChar, triggerAvatarUpload, saveChar, openAddWb, saveWb,
        activeChar, pwdVisibility, openCharDetail, callApiToGenerate, deleteActiveChar,
        canvasRef, canvasPan, canvasNodes, canvasEdges, availableRelChars, confirmAddRel, handleNodeClick, selectedNodeId,
        openRelEdit, relEditForm, saveRelEdit, startPan, startDrag, onCanvasMove, endDrag,
        newMemoryText, newMemoryWeight, addCharMemory, removeCharMemory
    };
};
