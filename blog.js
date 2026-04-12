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
        activeTab: 'feed',
        currentAccountId: 'me', // 默认以“我”的身份登录，也可以切换为 coupleBlog 的 id
        showAccountMenu: false,
        showPostModal: false,
        postForm: { text: '', images: [] },
        commentInput: {} // 记录各帖子的评论输入框状态
    });

    // 辅助：刷新图标
    const refreshIcons = () => { nextTick(() => { if (window.lucide) window.lucide.createIcons(); }); };
    watch(() => blogState.activeTab, refreshIcons);

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
        refreshIcons
    };
};
