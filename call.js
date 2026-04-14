window.useCallLogic = function(state) {
    const { reactive, computed, nextTick } = Vue;

    if (!state.phoneData) {
        state.phoneData = {
            calls: [], // 存储所有的历史通话记录
            ringtones: {}, // 联系人特设铃声映射
            lastSpamTime: 0, // 新增：记录上一次骚扰电话的时间戳
            lastSmsSpamTime: 0, // 记录上一次骚扰短信时间
            sms: {} // 新增短信记录
        };
    } else {
        if (!state.phoneData.sms) state.phoneData.sms = {};
        if (!state.phoneData.lastSmsSpamTime) state.phoneData.lastSmsSpamTime = 0;
    }
    
// 【新代码覆盖】
    const phoneState = reactive({
        activeTab: 'calls',
        activeContact: null,
        isCalling: false,
        callInput: '',
        callActionInput: '',
        callMessages: [], 
        isAiTyping: false,
        callDurationSec: 0,
        callDurationStr: '00:00',
        spamAlert: { show: false, caller: '' },
        activeCallId: null, // 当前正在进行的通话ID
        viewingCallRecord: null, // 当前正在查看的通话详情记录
        isSmsOpen: false,
        smsInput: '',
        isSmsAiTyping: false
    });

    let callTimer = null;

    // --- 全新精准骚扰电话触发引擎 (8~10分首发，20分冷却，1~5分波动) ---
    let targetSpamTime = 0; // 记录下一次将要触发的具体时间戳

    const setNextSpamTime = (isFirstLoad) => {
        const now = Date.now();
        const last = state.phoneData.lastSpamTime || 0;
        const cooldown = 20 * 60 * 1000; // 20 分钟绝对冷静期
        
        if (isFirstLoad) {
            if (now - last < cooldown) {
                // 如果刚打开网页时，发现还在上一次的20分钟冷却期内
                // 就安排在冷却期结束后的 1~5 分钟内触发
                const randomOffset = Math.floor(Math.random() * 5 + 1) * 60 * 1000; // 1~5分钟
                targetSpamTime = last + cooldown + randomOffset;
            } else {
                // 冷却期早已结束，属于全新进入网页，8~10分钟后必定触发第一次
                const initialDelay = Math.floor(Math.random() * 3 + 8) * 60 * 1000; // 8~10分钟
                targetSpamTime = now + initialDelay;
            }
        } else {
            // 网页挂机时刚触发完一次，安排下一次：20分钟冷静期 + 1~5分钟随机波动
            const randomOffset = Math.floor(Math.random() * 5 + 1) * 60 * 1000; // 1~5分钟
            targetSpamTime = now + cooldown + randomOffset;
        }
    };

    // 网页加载/JS初始化时，计算并排期第一次骚扰电话的时间
    setNextSpamTime(true);

    // 轮询检查器 (每10秒检查一次时间到了没，非常轻量)
    setInterval(() => {
        const now = Date.now();
        
        // 如果当前时间已经达到了我们预定的目标时间，且当前没在打电话
        if (now >= targetSpamTime && !phoneState.isCalling) {
            
            // 1. 触发成功！更新最后一次骚扰电话的时间为现在
            state.phoneData.lastSpamTime = now;
            
            // 2. 立刻安排下一次的触发时间 (进入 20分钟 + 1~5分钟 的循环)
            setNextSpamTime(false);

            // 3. 执行弹窗和记录逻辑
            const spammers = ['未知号码', '广告推销', '房产中介', '保险理财', '诈骗电话', '+00 12345678'];
            const caller = spammers[Math.floor(Math.random() * spammers.length)];
            
            phoneState.spamAlert.caller = caller;
            phoneState.spamAlert.show = true;

            if (state.phoneData && state.phoneData.calls) {
                state.phoneData.calls.unshift({
                    id: 'spam_' + Date.now(),
                    targetId: 'spam_' + Date.now(),
                    type: 'spam',
                    timestamp: Date.now(),
                    duration: '00:00',
                    location: '未知'
                });
            }

            setTimeout(() => {
                phoneState.spamAlert.show = false;
            }, 4000);
        }
    }, 10000);

    // --- 骚扰短信本地生成引擎 ---
    let targetSmsSpamTime = 0;
    const setNextSmsSpamTime = (isFirstLoad) => {
        const now = Date.now();
        const last = state.phoneData.lastSmsSpamTime || 0;
        const cooldown = 30 * 60 * 1000; // 30 分钟冷却
        if (isFirstLoad) {
            if (now - last < cooldown) targetSmsSpamTime = last + cooldown + Math.floor(Math.random() * 10 + 1) * 60 * 1000;
            else targetSmsSpamTime = now + Math.floor(Math.random() * 5 + 2) * 60 * 1000; // 2~7分钟后触发
        } else {
            targetSmsSpamTime = now + cooldown + Math.floor(Math.random() * 15 + 5) * 60 * 1000;
        }
    };
    setNextSmsSpamTime(true);

    setInterval(() => {
        const now = Date.now();
        if (now >= targetSmsSpamTime) {
            state.phoneData.lastSmsSpamTime = now;
            setNextSmsSpamTime(false);

            const spamSenders = ['10698888', '10086', '10010', '+00123456', '菜鸟驿站', '澳门新葡京', '贷款中心'];
            const spamContents = [
                '【菜鸟驿站】您的快递已到达星空路驿站，请凭取件码8-1-204取件。',
                '【退订回T】尊贵的会员，您本月有10000元免息备用金待领取，点击 youl.com/xxx 领取。',
                '【系统提示】您的手机积分即将清零，请尽快点击链接兑换礼品！',
                '澳门新葡京线上赌场，注册即送888元彩金，真人美女荷官在线发牌...',
                '【反诈中心】提醒您，未知链接不点击，陌生来电不轻信。',
                '【交管12123】您有一条违章记录未处理，请点击链接查看详情。',
                '你好，我是房产中介小刘，您之前看的那套房子现在降价了，有兴趣了解下吗？'
            ];
            const sender = spamSenders[Math.floor(Math.random() * spamSenders.length)];
            const text = spamContents[Math.floor(Math.random() * spamContents.length)];
            const fakeId = 'sms_spam_' + sender;

            if (!state.phoneData.sms[fakeId]) state.phoneData.sms[fakeId] = [];
            state.phoneData.sms[fakeId].push({
                id: 'sms_' + Date.now(),
                role: 'ai',
                text: text,
                timestamp: now
            });
        }
    }, 15000);

    const allPersonas = computed(() => [
        ...(state.contactsData?.characters || []),
        ...(state.contactsData?.npcs || [])
    ]);

    const getPhonePersona = (id) => {
        return allPersonas.value.find(p => p.id === id) || { name: '未知', avatar: '' };
    };

    // 提取首字母 (支持中/英/韩/日多语言智能分类引擎)
    const getInitial = (name) => {
        const char = String(name || '#').charAt(0);
        
        // 1. 英文 A-Z
        if (/[a-zA-Z]/.test(char)) return char.toUpperCase();
        
        // 2. 韩文 Hangul (提取首个辅音 ㄱ, ㄴ, ㄷ...)
        if (/[\uAC00-\uD7A3]/.test(char)) {
            // 韩文 19 个初声，自动降级映射到标准 14 个目录辅音
            const choseong = ['ㄱ','ㄱ','ㄴ','ㄷ','ㄷ','ㄹ','ㅁ','ㅂ','ㅂ','ㅅ','ㅆ','ㅇ','ㅈ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
            const code = char.charCodeAt(0) - 0xAC00;
            const index = Math.floor(code / 588);
            // 兼容处理：双辅音 ㅆ 并入 ㅅ，其他映射正常
            return choseong[index] === 'ㅆ' ? 'ㅅ' : choseong[index] || '#';
        }
        
        // 3. 日文假名 (提取到五十音图的行首 あ, か, さ...)
        if (/[\u3040-\u309F\u30A0-\u30FF]/.test(char)) {
            const jpRows = ['あ','か','さ','た','な','は','ま','や','ら','わ'];
            for (let i = 0; i < jpRows.length; i++) {
                if (!jpRows[i + 1] || char.localeCompare(jpRows[i + 1], 'ja') < 0) {
                    return jpRows[i];
                }
            }
        }
        
        // 4. 中文汉字 (按照拼音边界卡位到 A-Z)
        if (/[\u4e00-\u9fa5]/.test(char)) {
            const boundaries = '阿八嚓哒蛾发噶哈击喀垃妈拿哦啪期然撒塌挖昔压匝';
            const letters = 'ABCDEFGHJKLMNOPQRSTWXYZ';
            for (let i = 0; i < boundaries.length; i++) {
                if (!boundaries[i + 1] || char.localeCompare(boundaries[i + 1], 'zh-CN') < 0) {
                    return letters[i];
                }
            }
        }
        
        // 5. 其他符号、数字或罕见汉字
        return '#';
    };

    // 按首字母分组并排序
    const phoneContactsGrouped = computed(() => {
        let list = [...allPersonas.value];
        list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'zh-CN'));
        
        const groups = {};
        list.forEach(c => {
            let letter = getInitial(c.name);
            if (!groups[letter]) groups[letter] = [];
            groups[letter].push(c);
        });

        // 默认插入一些骚扰电话记录
        if (state.phoneData.calls.length === 0) {
            state.phoneData.calls.push({ id: 'c1', targetId: 'spam_1', type: 'spam', timestamp: Date.now() - 3600000, duration: '00:15', location: '未知' });
        }

        const res = Object.keys(groups).sort().map(k => ({ letter: k, list: groups[k] }));
        // 把 # 放到最后
        res.sort((a, b) => {
            if (a.letter === '#') return 1;
            if (b.letter === '#') return -1;
            return a.letter.localeCompare(b.letter);
        });
        return res;
    });

    const phoneContacts = computed(() => allPersonas.value);

    const getContactCalls = (id) => {
        return state.phoneData.calls.filter(c => c.targetId === id).sort((a,b) => b.timestamp - a.timestamp);
    };

    // 获取所有联系人的最后一条短信列表 (用于短息Tab展示)
    const smsThreads = computed(() => {
        const threads = [];
        const smsData = state.phoneData.sms || {};
        for (const cId in smsData) {
            const msgs = smsData[cId];
            if (msgs && msgs.length > 0) {
                const lastMsg = msgs[msgs.length - 1];
                let contact = getPhonePersona(cId);
                // 处理非人脉库里的虚拟骚扰号码
                if (!contact || !contact.id) {
                    if (cId.startsWith('sms_spam_')) {
                        contact = { id: cId, name: cId.replace('sms_spam_', ''), avatar: '' };
                    } else {
                        contact = { id: cId, name: '未知号码', avatar: '' };
                    }
                }
                threads.push({
                    contactId: cId,
                    contact: contact,
                    lastText: lastMsg.text,
                    timestamp: lastMsg.timestamp || Date.now()
                });
            }
        }
        return threads.sort((a, b) => b.timestamp - a.timestamp);
    });

    const getRingtone = (id) => {
        return state.phoneData.ringtones[id] || '默认铃声 (马林巴琴)';
    };

    const selectRingtone = (id) => {
        const tones = ['默认铃声 (马林巴琴)', '开场', '星空', '波浪', '灯塔', '急促', '温柔'];
        const current = getRingtone(id);
        const currentIndex = tones.indexOf(current);
        const next = tones[(currentIndex + 1) % tones.length];
        state.phoneData.ringtones[id] = next;
        alert(`已切换铃声为：${next}`);
    };

    const openPhoneContact = (id) => {
        if (id.startsWith('spam_')) return alert('这是骚扰电话，无需查看详情。');
        const p = getPhonePersona(id);
        if (p && p.id) {
            phoneState.activeContact = p;
            nextTick(() => { if (window.lucide) window.lucide.createIcons(); });
        }
    };

    // 格式化时间 00:00
    const formatDuration = (sec) => {
        const m = String(Math.floor(sec / 60)).padStart(2, '0');
        const s = String(sec % 60).padStart(2, '0');
        return `${m}:${s}`;
    };

// 【新代码覆盖】
    const startCall = (contact) => {
        phoneState.activeContact = contact;
        phoneState.isCalling = true;
        phoneState.callMessages = [];
        phoneState.callInput = '';
        phoneState.callActionInput = ''; 
        phoneState.isAiTyping = false;
        phoneState.callDurationSec = 0;
        phoneState.callDurationStr = '00:00';
        
        const newCallId = 'call_' + Date.now();
        phoneState.activeCallId = newCallId;

        // 记录一次呼出，增加了 messages 和 summary 字段
        state.phoneData.calls.unshift({
            id: newCallId,
            targetId: contact.id,
            type: 'out',
            timestamp: Date.now(),
            duration: '00:00', 
            location: '本地',
            messages: [],
            summary: ''
        });

        phoneState.callMessages.push({ id: 'm0', role: 'sys', text: '(电话拨号中... 嘟—— 嘟——)' });

        clearInterval(callTimer);
        callTimer = setInterval(() => {
            phoneState.callDurationSec++;
            phoneState.callDurationStr = formatDuration(phoneState.callDurationSec);
        }, 1000);

        nextTick(() => { if (window.lucide) window.lucide.createIcons(); });
    };

    // 自动总结通话并存入角色记忆的异步函数
    const generateCallSummary = async (contact, callRecord) => {
        const chatContent = callRecord.messages.filter(m => m.role !== 'sys').map(m => `${m.role === 'ai' ? contact.name : '我'}: ${m.text}`).join('\n');
        if (!chatContent.trim()) return; // 没有实质性对话就不总结

        callRecord.summary = '正在回想并生成记忆总结...';

        const apiConf = state.apiConfig || {};
        const url = (apiConf.summaryBaseUrl || apiConf.baseUrl || '').replace(/\/$/, '') + '/chat/completions';
        const key = apiConf.summaryApiKey || apiConf.apiKey;
        const model = apiConf.summaryModel || apiConf.activeModel;

        if (!url || !key || !model) {
            callRecord.summary = '【未配置API，无法自动生成通话记忆】';
            return;
        }

        try {
            const prompt = `请用第三人称视角，极其简短地总结以下电话内容，提炼出核心发生的事情或情绪（限50字以内）。\n通话记录：\n${chatContent}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
                body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.5 })
            });
            const data = await res.json();
            const summary = data?.choices?.[0]?.message?.content || '记忆提取失败';
            
            callRecord.summary = summary;

            // 存入角色的核心记忆库 (Memories)
            if (!contact.memories) contact.memories = [];
            contact.memories.unshift({
                id: 'mem_' + Date.now(),
                type: 'player',
                content: `[电话通讯] ${summary}`,
                timestamp: Date.now(),
                weight: 3 // 给个默认中等权重
            });
        } catch (e) {
            callRecord.summary = '【记忆提取网络请求失败】';
        }
    };

    const endCall = () => {
        clearInterval(callTimer);
        
        // 更新最后一条拨出记录的通话时长，并保存完整对话记录
        if (state.phoneData.calls.length > 0 && phoneState.activeCallId) {
            const callRecord = state.phoneData.calls.find(c => c.id === phoneState.activeCallId);
            if (callRecord) {
                callRecord.duration = phoneState.callDurationStr;
                callRecord.messages = JSON.parse(JSON.stringify(phoneState.callMessages));
                // 异步触发总结与记忆写入
                generateCallSummary(phoneState.activeContact, callRecord);
            }
        }

        phoneState.isCalling = false;
        phoneState.callMessages = [];
        phoneState.callInput = '';
        phoneState.callActionInput = '';
        phoneState.activeCallId = null;

        nextTick(() => { if (window.lucide) window.lucide.createIcons(); });
    };

    const openCallRecordDetails = (callRecord) => {
        phoneState.viewingCallRecord = callRecord;
        nextTick(() => { if (window.lucide) window.lucide.createIcons(); });
    };

    const closeCallRecordDetails = () => {
        phoneState.viewingCallRecord = null;
    };

    const scrollCallBottom = () => {
        nextTick(() => {
            const el = document.getElementById('ph-call-messages-box');
            if (el) el.scrollTop = el.scrollHeight;
        });
    };

    // 把包含括号的旁白单独拆分为系统消息
    const appendParsedMessages = (role, fullText) => {
        const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean);
        lines.forEach((line, index) => {
            // 如果一行被括号包裹，判定为旁白 (sys)
            if (/^[\(（].*[\)）]$/.test(line)) {
                phoneState.callMessages.push({ id: 'm_' + Date.now() + '_' + index, role: 'sys', text: line });
            } else {
                phoneState.callMessages.push({ id: 'm_' + Date.now() + '_' + index, role: role, text: line });
            }
        });
    };

    const sendCallMsg = () => {
        const actionText = phoneState.callActionInput.trim();
        const speechText = phoneState.callInput.trim();

        if (!actionText && !speechText) return;

        // 如果输入了旁白动作，自动给它套上小括号并发送
        if (actionText) {
            let formattedAction = actionText;
            // 防呆：如果用户自己手滑加了括号就不重复加
            if (!formattedAction.startsWith('(') && !formattedAction.startsWith('（')) {
                formattedAction = `(${formattedAction})`;
            }
            // 底层的 appendParsedMessages 会因为检测到括号，自动将其渲染为旁白系统字体
            appendParsedMessages('user', formattedAction);
        }

        // 如果输入了说话内容，作为正常的聊天气泡发送
        if (speechText) {
            appendParsedMessages('user', speechText);
        }

        // 发送完毕后清空输入框
        phoneState.callActionInput = '';
        phoneState.callInput = '';
        scrollCallBottom();
    };

    const triggerCallApi = async () => {
        if (phoneState.isAiTyping) return;
        
        const apiConf = state.apiConfig || {};
        if (!apiConf.baseUrl || !apiConf.apiKey || !apiConf.activeModel) {
            alert('请先在设置中配置 API');
            return;
        }

        const c = phoneState.activeContact;
        const sysPrompt = `你正在与玩家通电话。你的名字是${c.name}，你的设定是：${c.persona}。
这是一通实时电话，请给出符合你人设的回复。

【格式强制要求】
1. 请提供非常详细的背景音和动作描述。旁白、环境音、背景音和动作描述**必须用圆括号包裹并单独成行**，例如：
(电话那头传来了汽车呼啸而过的声音)
2. 角色的直接对话必须**单独成行，绝对不加任何前缀和括号**。
3. 每次回复必须包含至少一行背景音/旁白和至少一行对话。可以有多行。

回复示例：
(你在路边停下脚步，点了一根烟，呼出烟圈)
我还在外面呢，你找我干嘛？
(远处传来警笛的鸣笛声)`;

        const history = phoneState.callMessages.filter(m => m.text && !m.text.includes('电话拨号中')).map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.text
        }));

        let url = apiConf.baseUrl;
        if (url.endsWith('/')) url = url.slice(0, -1);
        if (!url.endsWith('/v1') && !url.includes('/v1/')) url += '/v1';

        phoneState.isAiTyping = true;
        
        try {
            const res = await fetch(url + '/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConf.apiKey}` },
                body: JSON.stringify({
                    model: apiConf.activeModel,
                    messages: [{ role: 'system', content: sysPrompt }, ...history, { role: 'user', content: '请回复...' }],
                    temperature: 0.8
                })
            });

            if (!res.ok) throw new Error('API Error');
            const data = await res.json();
            const text = data?.choices?.[0]?.message?.content || '...';
            
            appendParsedMessages('ai', text);

        } catch (e) {
            phoneState.callMessages.push({
                id: 'm_' + Date.now(),
                role: 'sys',
                text: '(信号不好，电话里传出刺啦刺啦的电流声...)'
            });
        } finally {
            phoneState.isAiTyping = false;
            scrollCallBottom();
        }
    };

    const scrollSmsBottom = () => {
        nextTick(() => {
            const el = document.getElementById('ph-sms-messages-box');
            if (el) el.scrollTop = el.scrollHeight;
        });
    };

    const openSms = (contact) => {
        phoneState.activeContact = contact;
        if (!state.phoneData.sms) state.phoneData.sms = {};
        if (!state.phoneData.sms[contact.id]) state.phoneData.sms[contact.id] = [];
        phoneState.isSmsOpen = true;
        phoneState.smsInput = '';
        scrollSmsBottom();
        nextTick(() => { if (window.lucide) window.lucide.createIcons(); });
    };

    const closeSms = () => {
        phoneState.isSmsOpen = false;
        phoneState.smsInput = '';
    };

    const sendSmsMsg = () => {
        const text = phoneState.smsInput.trim();
        if (!text || !phoneState.activeContact) return;
        const cId = phoneState.activeContact.id;
        state.phoneData.sms[cId].push({ id: 'sms_' + Date.now(), role: 'user', text: text, timestamp: Date.now() });
        phoneState.smsInput = '';
        scrollSmsBottom();
    };

    const triggerSmsApi = async () => {
        if (phoneState.isSmsAiTyping) return;
        const c = phoneState.activeContact;
        if (!c) return;
        
        const apiConf = state.apiConfig || {};
        if (!apiConf.baseUrl || !apiConf.apiKey || !apiConf.activeModel) {
            alert('请先在设置中配置 API');
            return;
        }

        const cId = c.id;
        const myId = state.chatData?.sessionUserId || 'me';
        
        let chatHistoryStr = '';
        if (state.chatData && state.chatData.accounts && state.chatData.accounts[cId]) {
            const conv = state.chatData.accounts[cId].conversations.find(cv => cv.targetId === myId);
            if (conv && conv.messages) {
                chatHistoryStr = conv.messages.slice(-15).map(m => `${m.senderId === myId ? '我' : c.name}: ${m.text}`).join('\n');
            }
        }
        
        const memories = c.memories || [];
        const memStr = memories.map(m => `- ${m.content}`).join('\n');
        
        const callRecords = getContactCalls(cId).slice(-5).map(call => `[${call.type === 'in' ? '呼入' : (call.type === 'out' ? '呼出' : '未接')}] ${call.duration}`).join('\n');
        
        const smsHistory = (state.phoneData.sms[cId] || []).slice(-15).map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.text
        }));

        const sysPrompt = `你现在是角色 ${c.name}。你的设定是：${c.persona}。
你正在通过手机短信与玩家交流。
【角色记忆】：
${memStr}
【你们最近的Chat聊天记录】：
${chatHistoryStr}
【你们最近的通话记录】：
${callRecords}

请结合以上所有信息，给玩家回复一条短信。
要求：
1. 绝对不要带有前缀和解释，像真人一样简短自然。
2. 如果你觉得需要主动打电话给玩家，请在回复最后另起一行加上特殊指令 [[CALL]]，这会自动触发拨号！`;

        let url = apiConf.baseUrl;
        if (url.endsWith('/')) url = url.slice(0, -1);
        if (!url.endsWith('/v1') && !url.includes('/v1/')) url += '/v1';

        phoneState.isSmsAiTyping = true;
        scrollSmsBottom();
        
        try {
            const res = await fetch(url + '/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConf.apiKey}` },
                body: JSON.stringify({
                    model: apiConf.activeModel,
                    messages: [{ role: 'system', content: sysPrompt }, ...smsHistory, { role: 'user', content: '请回复...' }],
                    temperature: 0.8
                })
            });

            if (!res.ok) throw new Error('API Error');
            const data = await res.json();
            let text = data?.choices?.[0]?.message?.content || '...';
            
            let triggerCall = false;
            if (text.includes('[[CALL]]')) {
                triggerCall = true;
                text = text.replace(/\[\[CALL\]\]/gi, '').trim();
            }
            
            if (text) {
                state.phoneData.sms[cId].push({ id: 'sms_' + Date.now(), role: 'ai', text: text, timestamp: Date.now() });
            }
            
            if (triggerCall) {
                phoneState.isSmsOpen = false;
                startCall(c); 
            }

        } catch (e) {
            state.phoneData.sms[cId].push({
                id: 'sms_' + Date.now(),
                role: 'ai',
                text: '（发送失败，信号不佳）'
            });
        } finally {
            phoneState.isSmsAiTyping = false;
            scrollSmsBottom();
        }
    };

// 【新代码覆盖】
    return {
        phoneState, phoneContacts, phoneContactsGrouped, getPhonePersona,
        getContactCalls, getRingtone, selectRingtone, openPhoneContact,
        startCall, endCall, sendCallMsg, triggerCallApi,
        openCallRecordDetails, closeCallRecordDetails,
        smsThreads, openSms, closeSms, sendSmsMsg, triggerSmsApi
    };
};
