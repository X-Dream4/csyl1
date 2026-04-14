window.useBlogLogic = function(state, contactsMethods, chatMethods) {
    const { reactive, computed, nextTick, watch } = Vue;

    // 初始化博客专用数据结构
    if (!state.blogData) {
        state.blogData = {
            posts: [],
            coupleBlogs: [], // 情侣共享账户: { id, user1Id, user2Id, name, cover, days }
            notifications: []
        };
    }

    const blogState = reactive({
        activeTab: 'home',
        currentAccountId: 'me', // 默认以“我”的身份登录，也可以切换为 coupleBlog 的 id
        showAccountMenu: false,
        showPostModal: false,
        postForm: { text: '', images: [] },
        commentInput: {} // 记录各帖子的评论输入框状态
    });

    // ===== 一键批量生成 随机角色的最新动态 =====
    const generateRandomPosts = async () => {
        if (state.sysGenStatus === 'loading') return;
        const apiConf = state.apiConfig || {};
        if (!apiConf.baseUrl || !apiConf.apiKey || !apiConf.activeModel) {
            alert('请先在设置中配置好 API 连接信息');
            return;
        }

        // 过滤出除了“我”以外的所有角色（包括 NPC 和自建角色）
        const candidates = allPersonas.value.filter(p => !state.contactsData?.myPersonas?.some(m => m.id === p.id));
        if (candidates.length === 0) {
            alert('当前没有其他角色或NPC，请先去人脉里添加。');
            return;
        }

        // 随机抽取 2~4 个角色来发动态
        const count = Math.min(candidates.length, Math.floor(Math.random() * 3) + 2);
        const shuffled = [...candidates].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, count);

        // 调用全局气泡胶囊状态
        state.sysGenStatus = 'loading';
        state.sysGenMsg = `正在获取 ${count} 位角色的最新动态...`;
        state.sysGenRetry = () => generateRandomPosts();
        nextTick(() => { if (window.lucide) window.lucide.createIcons(); });

        let url = apiConf.baseUrl;
        if (url.endsWith('/')) url = url.slice(0, -1);
        if (!url.endsWith('/v1') && !url.includes('/v1/')) url += '/v1';

        // 拼接给 AI 的角色信息
        const rolesInfo = selected.map(p => `ID:${p.id}，名字:${p.name || p.chatName}，人设:${p.persona}`).join('\n');

        const sysPrompt = `你是一个多角色动态模拟器。请为以下选定的几个角色，每人生成一条符合其人设的Instagram/朋友圈简短日常动态。
要求：
1. 极具活人感，符合对应人设语气，简短自然，严禁小说旁白。
2. 如果该动态想附带假照片，请在正文末尾用 [[PHOTO:照片画面描述]] 表示，没有则不加。
3. 必须严格按照以下格式逐行输出，每人一行，绝对不要输出任何其他废话、解释或Markdown代码块符号：
角色ID|动态正文内容(可包含[[PHOTO:xxx]])

【选定的角色列表】
${rolesInfo}`;

        try {
            const res = await fetch(url + '/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConf.apiKey}` },
                body: JSON.stringify({
                    model: apiConf.activeModel,
                    messages: [{ role: 'system', content: sysPrompt }],
                    temperature: 0.8
                })
            });

            if (!res.ok) throw new Error(`API 错误: ${res.status}`);
            const data = await res.json();
            let content = data?.choices?.[0]?.message?.content || '';

            const lines = content.split('\n').map(l => l.trim()).filter(l => l.includes('|'));
            
            let successCount = 0;
            lines.forEach(line => {
                const parts = line.split('|');
                const id = parts[0].trim();
                let text = parts.slice(1).join('|').trim(); // 应对正文中可能有|的情况
                
                if (id && text) {
                    const targetPersona = selected.find(p => p.id === id || p.id.includes(id));
                    if (targetPersona) {
                        let fakeImg = '';
                        const match = text.match(/\[\[PHOTO:\s*([\s\S]*?)\]\]/i);
                        if (match) {
                            fakeImg = match[1].trim();
                            text = text.replace(match[0], '').trim();
                        }

                        const newPost = {
                            id: 'post_' + Date.now() + Math.random().toString(36).slice(2, 6),
                            authorId: targetPersona.id,
                            realSenderId: targetPersona.id,
                            authorType: 'personal',
                            text: text,
                            images: [],
                            fakeImageText: fakeImg,
                            timestamp: Date.now() - Math.floor(Math.random() * 3600000), // 过去1小时内随机时间
                            likes: [],
                            comments: []
                        };
                        state.blogData.posts.unshift(newPost);
                        successCount++;
                    }
                }
            });
            
            refreshIcons();
            
            if (successCount > 0) {
                state.sysGenStatus = 'success';
                state.sysGenMsg = `刷出 ${successCount} 条新动态！`;
                setTimeout(() => { if(state.sysGenStatus === 'success') state.sysGenStatus = 'idle'; }, 3000);
            } else {
                throw new Error('未解析到有效的动态格式');
            }

        } catch (err) {
            console.error(err);
            state.sysGenStatus = 'error';
            state.sysGenMsg = '获取新动态失败，点击重试';
            setTimeout(() => { if(state.sysGenStatus === 'error') state.sysGenStatus = 'idle'; }, 5000);
        }
    };

    // 辅助：刷新图标
    const refreshIcons = () => { nextTick(() => { if (window.lucide) window.lucide.createIcons(); }); };
    
    // ======== 新增：热搜相关状态与逻辑 ========
    const hotState = reactive({
        activePlatform: 'weibo',
        loading: false,
        list: [],
        error: '',
        cache: {} // 新增：用于缓存已加载过的数据
    });

    const hotPlatforms = [
        { id: 'weibo', name: '微博' },
        { id: 'baidu', name: '百度' },
        { id: 'douyin', name: '抖音' },
        { id: 'toutiao', name: '头条' },
        { id: 'bilibili', name: 'B站' },
        { id: 'lastfm_kpop', name: 'K-POP' }
    ];

    // 新增 force 参数，默认 false (优先使用缓存)，传 true 时强制重新请求
    const fetchHotSearch = async (force = false) => {
        if (!force && hotState.cache[hotState.activePlatform]) {
            hotState.list = hotState.cache[hotState.activePlatform];
            return;
        }

        hotState.loading = true;
        hotState.error = '';
        // 加载时如果有旧缓存，先展示旧缓存避免白屏
        hotState.list = hotState.cache[hotState.activePlatform] || [];
        try {
            const res = await fetch(`https://hotapi-seven.vercel.app/api/hot?type=${hotState.activePlatform}`);
            const data = await res.json();
            if (data.success) {
                hotState.list = data.data;
                hotState.cache[hotState.activePlatform] = data.data; // 存入缓存
            } else {
                hotState.error = data.error || '获取热搜数据失败';
            }
        } catch (e) {
            hotState.error = '网络请求失败，请检查网络或后端接口';
        } finally {
            hotState.loading = false;
        }
    };

    watch(() => hotState.activePlatform, () => { fetchHotSearch(); });

    // 监听进入博客APP，如果在后台自动预加载热搜
    watch(() => state.activeApp, (newApp) => {
        if (newApp === 'blog' && !hotState.cache[hotState.activePlatform]) {
            fetchHotSearch();
        }
    });

    watch(() => blogState.activeTab, () => {
        refreshIcons();
    });
    // ==========================================

    // 获取所有人设（用于匹配头像和名字）
    const allPersonas = computed(() => [
        ...(state.contactsData?.myPersonas || []),
        ...(state.contactsData?.characters || []),
        ...(state.contactsData?.npcs || [])
    ]);

    const getPersona = (id) => {
        if (id === 'me' || id === chatMethods.chatState.currentUser?.id) {
            return {
                id: 'me',
                name: state.chatData?.accounts?.[chatMethods.chatState.currentUser?.id]?.profile?.nickname || '我',
                avatar: chatMethods.chatState.currentUser?.avatar || ''
            };
        }
        return allPersonas.value.find(p => p.id === id) || { name: '未知', avatar: '' };
    };

    // 整合账号列表（包含我、我的情侣博客）
    const availableAccounts = computed(() => {
        const list = [{ id: 'me', name: '我的个人空间', type: 'personal' }];
        (state.blogData.coupleBlogs || []).forEach(cb => {
            list.push({ id: cb.id, name: cb.name, type: 'couple', data: cb });
        });
        return list;
    });

    const currentAccount = computed(() => {
        return availableAccounts.value.find(a => a.id === blogState.currentAccountId) || availableAccounts.value[0];
    });

    // 渲染动态流
    const feedPosts = computed(() => {
        let posts = state.blogData.posts || [];
        // 按时间倒序
        return posts.slice().sort((a, b) => b.timestamp - a.timestamp).map(post => {
            let authorName, authorAvatar, isCouple = false, coupleAvatars = [];
            if (post.authorType === 'couple') {
                const cb = state.blogData.coupleBlogs.find(c => c.id === post.authorId);
                authorName = cb ? cb.name : '情侣空间';
                isCouple = true;
                if (cb) coupleAvatars = [getPersona(cb.user1Id).avatar, getPersona(cb.user2Id).avatar];
            } else {
                const p = getPersona(post.authorId);
                authorName = p.name;
                authorAvatar = p.avatar;
            }
            return { ...post, authorName, authorAvatar, isCouple, coupleAvatars };
        });
    });

    // 切换账号
    const blogSwitchAccount = (id) => {
        blogState.currentAccountId = id;
        blogState.showAccountMenu = false;
        refreshIcons();
    };

    // 发送帖子
    const publishPost = () => {
        if (!blogState.postForm.text.trim() && blogState.postForm.images.length === 0) return;
        
        const isCouple = currentAccount.value.type === 'couple';
        const newPost = {
            id: 'post_' + Date.now(),
            authorId: isCouple ? currentAccount.value.id : 'me',
            realSenderId: 'me', // 记录实际发帖人
            authorType: currentAccount.value.type,
            text: blogState.postForm.text,
            images: [...blogState.postForm.images],
            timestamp: Date.now(),
            likes: [],
            comments: []
        };
        
        state.blogData.posts.unshift(newPost);
        blogState.postForm.text = '';
        blogState.postForm.images = [];
        blogState.showPostModal = false;
        
        // 触发 AI 互动机制：发帖后，高好感度的 AI 可能会自动来点赞或评论
        triggerAILikesAndComments(newPost.id);
        refreshIcons();
    };

    // 点赞
    const blogToggleLike = (post) => {
        const myId = 'me';
        const idx = post.likes.indexOf(myId);
        if (idx > -1) post.likes.splice(idx, 1);
        else post.likes.push(myId);
        refreshIcons();
    };

    // 评论
    const sendComment = (post) => {
        const content = blogState.commentInput[post.id];
        if (!content || !content.trim()) return;
        
        post.comments.push({
            id: 'cmt_' + Date.now(),
            authorId: 'me',
            content: content.trim(),
            timestamp: Date.now()
        });
        blogState.commentInput[post.id] = '';
    };

    // ==========================================
    // AI 互动逻辑 (活人味核心)
    // ==========================================
    const triggerAILikesAndComments = (postId) => {
        // 模拟网络延迟和活人反应时间 (3秒到15秒之间)
        setTimeout(() => {
            const post = state.blogData.posts.find(p => p.id === postId);
            if (!post) return;
            
            // 随机抽取 1-2 个角色进行点赞
            const chars = state.contactsData?.characters || [];
            if (chars.length === 0) return;
            
            const randomChar = chars[Math.floor(Math.random() * chars.length)];
            
            // 模拟点赞
            if (!post.likes.includes(randomChar.id)) {
                post.likes.push(randomChar.id);
            }

            // 模拟评论 (可以通过接入之前封装的 requestAiText 来生成真人的评论)
            // 这里为了极简展示，先用预设，实际可以调用 API
            setTimeout(() => {
                post.comments.push({
                    id: 'cmt_' + Date.now(),
                    authorId: randomChar.id,
                    content: "看起来很不错呢！✨", // 实际项目中，这里可以替换为 API 请求生成的评论
                    timestamp: Date.now()
                });
            }, 2000 + Math.random() * 5000);

        }, 3000 + Math.random() * 10000);
    };

    // 开通情侣博客
    const createCoupleBlog = (partnerId, partnerName) => {
        const id = 'cb_' + Date.now();
        state.blogData.coupleBlogs.push({
            id,
            user1Id: 'me',
            user2Id: partnerId,
            name: `我与 ${partnerName} 的专属空间`,
            cover: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800&q=80',
            createTime: Date.now()
        });
        alert('情侣空间开通成功！');
    };

    return {
        blogState,
        availableAccounts,
        currentAccount,
        feedPosts,
        blogSwitchAccount,
        publishPost,
        blogToggleLike,
        sendComment,
        getPersona,
        createCoupleBlog,
        refreshIcons,
        allPersonas,
        hotState,
        hotPlatforms,
        fetchHotSearch,
        generateRandomPosts
    };
};
