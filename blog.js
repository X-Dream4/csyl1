window.useBlogLogic = function(state, contactsMethods, chatMethods) {
    const { reactive, computed, nextTick, watch } = Vue;

    if (!state.blogData) {
        state.blogData = { posts: [], coupleBlogs: [], notifications: [] };
    }

    const blogState = reactive({
        activeTab: 'home',
        currentAccountId: 'me',
        showAccountMenu: false,
        showPostModal: false,
        postForm: { text: '', images: [] },
        commentInput: {}
    });

    const generateRandomPosts = async () => {
        if (state.sysGenStatus === 'loading') return;
        const apiConf = state.apiConfig || {};
        if (!apiConf.baseUrl || !apiConf.apiKey || !apiConf.activeModel) {
            alert('请先在设置中配置好 API 连接信息');
            return;
        }
        const candidates = allPersonas.value.filter(p => !state.contactsData?.myPersonas?.some(m => m.id === p.id));
        if (candidates.length === 0) return;

        const count = Math.min(candidates.length, Math.floor(Math.random() * 3) + 2);
        const shuffled = [...candidates].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, count);

        state.sysGenStatus = 'loading';
        state.sysGenMsg = `正在获取 ${count} 位角色的最新动态...`;
        
        let url = apiConf.baseUrl;
        if (url.endsWith('/')) url = url.slice(0, -1);
        if (!url.endsWith('/v1') && !url.includes('/v1/')) url += '/v1';

        const rolesInfo = selected.map(p => `ID:${p.id}，名字:${p.name || p.chatName}，人设:${p.persona}`).join('\n');
        const sysPrompt = `你是一个多角色动态模拟器。请为以下选定角色生成Instagram简短动态。格式：角色ID|动态正文[[PHOTO:描述]]`;

        try {
            const res = await fetch(url + '/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConf.apiKey}` },
                body: JSON.stringify({ model: apiConf.activeModel, messages: [{ role: 'system', content: sysPrompt + rolesInfo }], temperature: 0.8 })
            });
            const data = await res.json();
            let content = data?.choices?.[0]?.message?.content || '';
            const lines = content.split('\n').filter(l => l.includes('|'));
            lines.forEach(line => {
                const [id, ...rest] = line.split('|');
                const text = rest.join('|');
                const target = selected.find(p => p.id === id.trim());
                if (target) {
                    state.blogData.posts.unshift({
                        id: 'post_' + Date.now() + Math.random(),
                        authorId: target.id,
                        text: text.replace(/\[\[PHOTO:.*?\]\]/g, '').trim(),
                        fakeImageText: (text.match(/\[\[PHOTO:\s*(.*?)\s*\]\]/i) || [])[1] || '',
                        timestamp: Date.now(),
                        likes: [],
                        comments: []
                    });
                }
            });
            state.sysGenStatus = 'success';
            setTimeout(() => state.sysGenStatus = 'idle', 2000);
        } catch (err) {
            state.sysGenStatus = 'error';
            state.sysGenMsg = '获取失败';
        }
    };

    const hotState = reactive({ activePlatform: 'weibo', loading: false, list: [], error: '', cache: {} });
    const hotPlatforms = [ { id: 'weibo', name: '微博' }, { id: 'baidu', name: '百度' }, { id: 'douyin', name: '抖音' }, { id: 'bilibili', name: 'B站' } ];

    const fetchHotSearch = async (force = false) => {
        if (!force && hotState.cache[hotState.activePlatform]) {
            hotState.list = hotState.cache[hotState.activePlatform];
            return;
        }
        hotState.loading = true;
        try {
            const res = await fetch(`https://hotapi-seven.vercel.app/api/hot?type=${hotState.activePlatform}`);
            const data = await res.json();
            if (data.success) {
                hotState.list = data.data;
                hotState.cache[hotState.activePlatform] = data.data;
            }
        } catch (e) {
            console.warn('热搜接口请求失败，已忽略');
        } finally {
            hotState.loading = false;
        }
    };

    watch(() => hotState.activePlatform, () => fetchHotSearch());
    watch(() => state.activeApp, (newApp) => { if (newApp === 'blog') fetchHotSearch(); });

    const allPersonas = computed(() => [
        ...(state.contactsData?.myPersonas || []),
        ...(state.contactsData?.characters || []),
        ...(state.contactsData?.npcs || [])
    ]);

    const getPersona = (id) => {
        if (id === 'me') return { name: '我', avatar: chatMethods.chatState.currentUser?.avatar || '' };
        return allPersonas.value.find(p => p.id === id) || { name: '未知', avatar: '' };
    };

    const feedPosts = computed(() => {
        return (state.blogData.posts || []).slice().sort((a, b) => b.timestamp - a.timestamp).map(post => {
            const p = getPersona(post.authorId);
            return { ...post, authorName: p.name, authorAvatar: p.avatar };
        });
    });

    const blogToggleLike = (post) => {
        const idx = post.likes.indexOf('me');
        if (idx > -1) post.likes.splice(idx, 1);
        else post.likes.push('me');
    };

    const publishPost = () => {
        if (!blogState.postForm.text.trim()) return;
        state.blogData.posts.unshift({
            id: 'post_' + Date.now(), authorId: 'me', text: blogState.postForm.text,
            timestamp: Date.now(), likes: [], comments: []
        });
        blogState.postForm.text = ''; blogState.showPostModal = false;
    };

    return { blogState, feedPosts, blogToggleLike, publishPost, getPersona, allPersonas, hotState, hotPlatforms, fetchHotSearch, generateRandomPosts };
};
