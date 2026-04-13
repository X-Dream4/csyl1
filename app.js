const { createApp, reactive, ref, onMounted, watch, computed, nextTick } = Vue;
const defaultImg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23dcdcdc'/%3E%3C/svg%3E";
const defaultAvatar1 = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23cccccc'/%3E%3C/svg%3E";
const defaultAvatar2 = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23bbbbbb'/%3E%3C/svg%3E";
const createDefaultNumberIcon = (num) => `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Ctext x='50' y='55' font-family='sans-serif' font-size='48' font-weight='bold' fill='%23808080' text-anchor='middle' dominant-baseline='middle'%3E${num}%3C/text%3E%3C/svg%3E`;
const defaultClockIcons = Array.from({length: 12}, (_, i) => createDefaultNumberIcon(i === 0 ? 12 : i));

createApp({
    setup() {
        const state = reactive({
            sysGenStatus: 'idle', sysGenMsg: '', sysGenRetry: null,
            // --- 新增：顶部区域 (Row 0) 的排版与应用数据 ---
            topRowType: 'capsule', // 默认显示大胶囊 'capsule'，也可切换为 'split' (组件+APP)
            row0Layout: ['widget0', 'apps0'], // 左右排版
            widgetSlot0: 'clock', // 默认组件类型
            customImg0: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&q=80',
            avatarCard0: {
                titleTop: 'My',
                titleBottom: 'Space',
                imgLeft: 'https://api.iconify.design/lucide:user.svg?color=%23ffffff',
                textLeft: 'A',
                imgRight: 'https://api.iconify.design/lucide:user.svg?color=%23ffffff',
                textRight: 'B'
            },
            apps0: [
                { id: 'app_weather', name: '天气', icon: defaultImg },
                { id: 'app_music', name: '音乐', icon: defaultImg },
                { id: 'app_notes', name: '备忘录', icon: defaultImg },
                { id: 'app_map', name: '地图', icon: defaultImg }
            ],
            // ---------------------------------------------
            desktopItems: [], // 保留占位防止旧缓存报错
            desktopPages: [[], []], // 新增：多页面二维数组架构
            currentPage: 0, // 新增：当前停留的页码
            gridCols: 4, 
            activeApp: null, beautifyTab: 'widget', theme: 'light', desktopWallpaper: '', capsuleBg: '', capsuleOpacity: 1,
            capsuleType: 'chat', chatTime: '10:00', chatLeftAvatar: defaultAvatar1, chatLeftText: '你好呀', chatRightAvatar: defaultAvatar2, chatRightText: '今天天气不错', chatInputText: '输入...', widgetImage1: "https://images.unsplash.com/photo-1600693437635-ceb8f04df160?w=400&q=80", widgetBadge1: { img: '', color: '#ffffff' }, 
            emojiWallItems: [], idCard: { photo: defaultImg, name: '张三', gender: '男', age: '24', address: '首尔市江南区星空路' },
            widgetSlot1: 'badge', widgetSlot2: 'clock', badgeImage: defaultImg, customImg1: defaultImg, customImg2: defaultImg,
            avatarCard1: { imgLeft: defaultAvatar1, textLeft: 'User A', imgRight: defaultAvatar2, textRight: 'User B', titleTop: 'Sweet Memory', titleBottom: 'Forever' },
            avatarCard2: { imgLeft: defaultAvatar1, textLeft: 'User C', imgRight: defaultAvatar2, textRight: 'User D', titleTop: 'Our Story', titleBottom: 'Together' },
            clockIcons: [...defaultClockIcons], clockBg: '', clockHandHr: '', clockHandMin: '', clockHandSec: '', clockCenterDot: '',
            topShowName: true, topHasShadow: false, appsTop: [{ id: 't1', name: 'Chat', icon: defaultImg }, { id: 't2', name: 'Blog', icon: defaultImg }, { id: 't3', name: 'Notes', icon: defaultImg }, { id: 't4', name: 'Music', icon: defaultImg }],
            bottomShowName: true, bottomHasShadow: false, appsBottom: [{ id: 'b1', name: 'Weather', icon: defaultImg }, { id: 'b2', name: 'App Store', icon: defaultImg }, { id: 'b3', name: 'Maps', icon: defaultImg }, { id: 'b4', name: 'Wallet', icon: defaultImg }],
            dockShowName: false, dockHasShadow: false, dockHidden: false, dockColor: '', dockOpacity: 0.5, dockBlur: 15,
            desktopLayout: ['capsule', 'row1', 'row2'], row1Layout: ['widget1', 'appsTop'], row2Layout: ['appsBottom', 'widget2'],
            appsDock: [{ id: 'd1', name: '设置', icon: defaultImg }, { id: 'd2', name: '人脉', icon: defaultImg }, { id: 'd3', name: '美化', icon: defaultImg }],
            wallpapers: ["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80"],
            settingsTab: 'api', apiConfig: { baseUrl: '', apiKey: '', models: [], activeModel: '' }, storageUsed: 0, storageDetails: [], storageDonutStyle: { background: 'conic-gradient(#eee 0% 100%)' },
            contactsData: { worlds: [], characters: [], myPersonas: [], npcs: [], wbCategories: [], worldbooks: [], relationships: [], layouts: {}, statusBarPresets: [] },
            chatData: { accounts: {}, groups: {} },
            lockConfig: { enableLockScreen: false, wallpaper: '', enablePassword: false, pwdType: 'num', pwdNum: '', pwdQA_Q: '', pwdQA_A: '', pwdPattern: '' },
            isLocked: false, showPwdInput: false, enteredPwd: '', customFontUrl: '', customFontFamily: '', customFontPresets: [],
            isEditingDesktop: false, // 新增：是否处于桌面编辑(抖动)模式
            desktopMode: 'classic', // classic(经典排版) 或 grid(自由网格)
            gridAddPanel: {
                show: false,
                itemType: 'widget',   // widget / app / capsule
                pageIndex: 0,
                widgetKind: 'badge',  // badge / clock / image / avatars
                widgetSize: '2x2',
                widgetDataKey: '1',
                appSource: 'appsTop',
                appIndex: 0
            }
        });

        const isThemeModalOpen = ref(false); const isClockModalOpen = ref(false); const isWidgetBadgeModalOpen = ref(false); const hrDeg = ref(0), minDeg = ref(0), secDeg = ref(0); const currentWpIndex = ref(0); const fileInput = ref(null); let currentUploadTarget = null, currentUploadData = null; const currentDate = ref(new Date());

        const loadData = async () => {
            try { 
                const savedState = await localforage.getItem('ins_desktop_v8_state'); 
                if (savedState) {
                    if(!savedState.contactsData) savedState.contactsData = {};
                    if(!savedState.contactsData.worlds) savedState.contactsData.worlds = [{ id: 'w_default', name: '主宇宙' }];
                    if(!savedState.contactsData.characters) savedState.contactsData.characters = [];
                    if(!savedState.contactsData.myPersonas) savedState.contactsData.myPersonas = [];
                    if(!savedState.contactsData.npcs) savedState.contactsData.npcs = [];
                    if(!savedState.contactsData.wbCategories) savedState.contactsData.wbCategories = [{ id: 'c_default', name: '通用设定' }];
                    if(!savedState.contactsData.worldbooks) savedState.contactsData.worldbooks = [];
                    if(!savedState.contactsData.relationships) savedState.contactsData.relationships = [];
                    if(!savedState.contactsData.layouts) savedState.contactsData.layouts = {};
                    if(!savedState.contactsData.statusBarPresets) savedState.contactsData.statusBarPresets = [];

                    if(!savedState.chatData) savedState.chatData = { accounts: {}, groups: {} };
                    if(!savedState.chatData.accounts) savedState.chatData.accounts = {};

                    if(!savedState.apiConfig) savedState.apiConfig = { baseUrl: '', apiKey: '', models: [], activeModel: '' };
                    if(!savedState.lockConfig) savedState.lockConfig = { enableLockScreen: false, wallpaper: '', enablePassword: false, pwdType: 'num', pwdNum: '', pwdQA_Q: '', pwdQA_A: '', pwdPattern: '' };
                    if(!savedState.desktopLayout) savedState.desktopLayout = ['capsule', 'row1', 'row2'];
                    
                    if(!savedState.topRowType) savedState.topRowType = 'capsule';
                    if(!savedState.row0Layout) savedState.row0Layout = ['widget0', 'apps0'];
                    if(!savedState.apps0) {
                        savedState.apps0 = state.apps0; 
                    } else {
                        savedState.apps0.forEach(app => {
                            if (app.icon && app.icon.includes('api.iconify.design')) {
                                app.icon = defaultImg;
                            }
                        });
                    }
                    
                    if(!savedState.row1Layout) savedState.row1Layout = ['widget1', 'appsTop'];
                    if(!savedState.row2Layout) savedState.row2Layout = ['appsBottom', 'widget2'];
                    
                    Object.assign(state, savedState);

                    // 修正：临时弹窗状态不允许跟着缓存恢复
                    if (!state.gridAddPanel) {
                        state.gridAddPanel = {
                            show: false,
                            itemType: 'widget',
                            pageIndex: 0,
                            widgetKind: 'badge',
                            widgetSize: '2x2',
                            widgetDataKey: '1',
                            appSource: 'appsTop',
                            appIndex: 0
                        };
                    }
                    state.gridAddPanel.show = false;

                    // 旧版网格平滑升级为多页架构
                    if (!state.desktopItems || state.desktopItems.length === 0 || state.desktopItems.some(i => i.slot === 'widget0')) {
                        let items = [];
                        if (state.topRowType === 'capsule') {
                            items.push({ id: 'cap_0', type: 'capsule', w: 4, h: 2 });
                        } else {
                            if (state.row0Layout[0] === 'widget0') {
                                items.push({ id: 'w_0', type: 'widget', w: 2, h: 2, slotKey: 'widgetSlot0', dataKey: '0' });
                                state.apps0.forEach(a => items.push({ id: a.id, type: 'app', w: 1, h: 1, appRef: a }));
                            } else {
                                state.apps0.forEach(a => items.push({ id: a.id, type: 'app', w: 1, h: 1, appRef: a }));
                                items.push({ id: 'w_0', type: 'widget', w: 2, h: 2, slotKey: 'widgetSlot0', dataKey: '0' });
                            }
                        }
                        if (state.row1Layout[0] === 'widget1') {
                            items.push({ id: 'w_1', type: 'widget', w: 2, h: 2, slotKey: 'widgetSlot1', dataKey: '1' });
                            state.appsTop.forEach(a => items.push({ id: a.id, type: 'app', w: 1, h: 1, appRef: a }));
                        } else {
                            state.appsTop.forEach(a => items.push({ id: a.id, type: 'app', w: 1, h: 1, appRef: a }));
                            items.push({ id: 'w_1', type: 'widget', w: 2, h: 2, slotKey: 'widgetSlot1', dataKey: '1' });
                        }
                        if (state.row2Layout[0] === 'appsBottom') {
                            state.appsBottom.forEach(a => items.push({ id: a.id, type: 'app', w: 1, h: 1, appRef: a }));
                            items.push({ id: 'w_2', type: 'widget', w: 2, h: 2, slotKey: 'widgetSlot2', dataKey: '2' });
                        } else {
                            items.push({ id: 'w_2', type: 'widget', w: 2, h: 2, slotKey: 'widgetSlot2', dataKey: '2' });
                            state.appsBottom.forEach(a => items.push({ id: a.id, type: 'app', w: 1, h: 1, appRef: a }));
                        }
                        state.desktopItems = items;
                    }

                    // --- 新增：向二维分页数组过渡 ---
                    if (!savedState.desktopPages || savedState.desktopPages.length === 0) {
                        state.desktopPages = [state.desktopItems || []];
                        // 预留一页空白以便可以拖拽过去
                        state.desktopPages.push([]);
                        padPageWithEmptyCells(state.desktopPages[0]);
                        padPageWithEmptyCells(state.desktopPages[1]);
                    }
                    // --------------------------------------------------------

                    repairDesktopPageItems();
                    ensureEssentialDockApps();

                    if (!state.contactsData.npcs) state.contactsData.npcs = [];
                    if (state.contactsData.characters) {
                        const mainChars = [];
                        state.contactsData.characters.forEach(c => {
                            if (c.id && c.id.startsWith('npc_gen_')) {
                                if (!state.contactsData.npcs.find(n => n.id === c.id)) {
                                    state.contactsData.npcs.unshift({ id: c.id, name: c.name, avatar: c.avatar, persona: c.persona || '', isNpc: true });
                                }
                            } else {
                                mainChars.push(c);
                            }
                        });
                        state.contactsData.characters = mainChars;
                    }
                    if (state.chatData && state.chatData.accounts) {
                        Object.keys(state.chatData.accounts).forEach(accId => {
                            if (accId.startsWith('npc_gen_')) {
                                if (!state.contactsData.npcs.find(n => n.id === accId)) {
                                    const prof = state.chatData.accounts[accId].profile || {};
                                    state.contactsData.npcs.unshift({
                                        id: accId,
                                        name: prof.nickname || prof.realName || '未知NPC',
                                        avatar: prof.avatar || defaultImg,
                                        persona: prof.signature || '被抢救回来的旧数据',
                                        isNpc: true
                                    });
                                }
                            }
                        });
                    }
                }
            } catch(e) { console.error('加载缓存数据失败', e); }
            
            if(state.lockConfig && state.lockConfig.enableLockScreen) { 
                state.isLocked = true; state.showPwdInput = false; state.enteredPwd = ''; patternState.path = []; 
            }
            setTimeout(() => { if(window.lucide) lucide.createIcons(); }, 100);
        };
        
        let saveTimeout = null;
        watch(state, (newState) => { 
            if (saveTimeout) clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                localforage.setItem('ins_desktop_v8_state', JSON.parse(JSON.stringify(newState))); 
            }, 8000);
        }, { deep: true });

        const forceSave = () => {
            if (saveTimeout) clearTimeout(saveTimeout);
            localforage.setItem('ins_desktop_v8_state', JSON.parse(JSON.stringify(state)));
        };
        const moveLayoutUp = (idx) => {
            if (idx <= 0) return;
            const arr = [...state.desktopLayout];
            [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
            state.desktopLayout = arr;
        };
        const moveLayoutDown = (idx) => {
            if (idx >= state.desktopLayout.length - 1) return;
            const arr = [...state.desktopLayout];
            [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
            state.desktopLayout = arr;
        };
        const swapRow1 = () => { state.row1Layout = [...state.row1Layout].reverse(); };
        const swapRow2 = () => { state.row2Layout = [...state.row2Layout].reverse(); };
        
        const enterEditMode = () => { state.isEditingDesktop = true; };
        const exitEditMode = () => { state.isEditingDesktop = false; forceSave(); setTimeout(() => { if(window.lucide) window.lucide.createIcons(); }, 50); };
        const dragInfo = reactive({ group: null, index: null });
        const onDragStart = (e, group, index) => {
            if (!state.isEditingDesktop) return;
            dragInfo.group = group; dragInfo.index = index;
        };
        const onDrop = (e, targetGroup, targetIndex) => {
            if (!state.isEditingDesktop || !dragInfo.group) return;
            const srcGroup = dragInfo.group; const srcIndex = dragInfo.index;
            const temp = state[srcGroup][srcIndex];
            state[srcGroup][srcIndex] = state[targetGroup][targetIndex];
            state[targetGroup][targetIndex] = temp;
            dragInfo.group = null; dragInfo.index = null;
        };

        // --- 终极版 Grid 拖拽交互引擎 (支持多页跨区对调与边缘翻页) ---
        const desktopScrollRef = ref(null);
        const changePage = (index) => {
            state.currentPage = index;
            if (desktopScrollRef.value) {
                const width = desktopScrollRef.value.clientWidth || window.innerWidth;
                desktopScrollRef.value.scrollTo({ left: index * width, behavior: 'smooth' });
            }
        };

        const onDesktopScroll = (e) => {
            if (!desktopScrollRef.value) return;
            const width = desktopScrollRef.value.clientWidth || window.innerWidth;
            const page = Math.round(e.target.scrollLeft / width);
            if (state.currentPage !== page) state.currentPage = page;
        };

        const createGridAppFromDockApp = (app) => {
            return {
                id: app.id,
                type: 'app',
                w: 1,
                h: 1,
                appRef: JSON.parse(JSON.stringify(app))
            };
        };

        const repairDesktopPageItems = () => {
            if (!Array.isArray(state.desktopPages)) return;

            state.desktopPages.forEach((page, pageIndex) => {
                if (!Array.isArray(page)) {
                    state.desktopPages[pageIndex] = [];
                    return;
                }

                state.desktopPages[pageIndex] = page.map(item => {
                    if (!item) return item;

                    // 旧/损坏数据：dock app 被直接拖进桌面，缺少 type/appRef/w/h
                    if (!item.type && item.id && item.name && item.icon) {
                        return createGridAppFromDockApp(item);
                    }

                    // 兜底：如果是 app，但没有 appRef，就补齐
                    if (item.type === 'app' && !item.appRef && item.id && item.name && item.icon) {
                        return createGridAppFromDockApp(item);
                    }

                    return item;
                });
            });
        };

        const ensureEssentialDockApps = () => {
            const defaults = [
                { id: 'd1', name: '设置', icon: defaultImg },
                { id: 'd2', name: '人脉', icon: defaultImg },
                { id: 'd3', name: '美化', icon: defaultImg }
            ];

            if (!Array.isArray(state.appsDock)) state.appsDock = [];

            // 先清掉旧逻辑遗留下来的假 dock 占位
            state.appsDock = state.appsDock.filter(app => {
                return app && app.id && !String(app.id).startsWith('empty_dock_');
            });

            // 去重，避免一个 id 出现多个
            state.appsDock = state.appsDock.filter((app, idx, arr) => {
                return arr.findIndex(a => a && a.id === app.id) === idx;
            });

            defaults.forEach(def => {
                const existsInDock = state.appsDock.some(app => app && app.id === def.id);
                const existsOnDesktop = (state.desktopPages || []).some(page =>
                    (page || []).some(item =>
                        item && (
                            item.id === def.id ||
                            (item.appRef && item.appRef.id === def.id)
                        )
                    )
                );

                if (!existsInDock && !existsOnDesktop) {
                    state.appsDock.push(JSON.parse(JSON.stringify(def)));
                }
            });
        };

const gridDragInfo = reactive({ index: null, pageIndex: null, group: null });
const dragOverInfo = reactive({ index: null, pageIndex: null, group: null });
const hoverPreview = reactive({
    show: false,
    pageIndex: null,
    left: 0,
    top: 0,
    width: 0,
    height: 0
});
let edgeTimer = null;

        const onGridDragStart = (e, index, pageIndex, group) => {
            if (!state.isEditingDesktop) return;
            gridDragInfo.index = index;
            gridDragInfo.pageIndex = pageIndex;
            gridDragInfo.group = group; 
        };
        
        const onGridDragOver = (e, index, pageIndex, group) => {
            e.preventDefault();
            if (!state.isEditingDesktop || gridDragInfo.index === null) return;
 if (dragOverInfo.index !== index || dragOverInfo.group !== group || dragOverInfo.pageIndex !== pageIndex) {
    dragOverInfo.index = index;
    dragOverInfo.group = group;
    dragOverInfo.pageIndex = pageIndex;
}

// 生成拖拽落点预览框
if (group === 'desktop') {
    const srcArr = gridDragInfo.group === 'desktop'
        ? state.desktopPages[gridDragInfo.pageIndex]
        : state.appsDock;
    const draggedItem = srcArr && srcArr[gridDragInfo.index];

    const targetEl = e.currentTarget;
    const pageEl = targetEl.closest('.true-grid-desktop');

    if (draggedItem && targetEl && pageEl) {
        const pageStyle = window.getComputedStyle(pageEl);
        const cols = Number(state.gridCols || 4);
        const gap = parseFloat(pageStyle.gap || 15);
        const padLeft = parseFloat(pageStyle.paddingLeft || 16);
        const padRight = parseFloat(pageStyle.paddingRight || 16);
        const padTop = parseFloat(pageStyle.paddingTop || 20);
        const rowH = parseFloat(pageStyle.gridAutoRows || (state.gridCols == 5 ? 64 : 80));
        const cellW = (pageEl.clientWidth - padLeft - padRight - gap * (cols - 1)) / cols;

        hoverPreview.show = true;
        hoverPreview.pageIndex = pageIndex;
        hoverPreview.left = targetEl.offsetLeft;
        hoverPreview.top = targetEl.offsetTop;
        hoverPreview.width = draggedItem.w * cellW + (draggedItem.w - 1) * gap;
        hoverPreview.height = draggedItem.h * rowH + (draggedItem.h - 1) * gap;
    }
}


            // 边缘悬停翻页逻辑 (兼容触摸屏与鼠标)
            const x = e.clientX || (e.touches && e.touches.length > 0 ? e.touches[0].clientX : 0);
            const w = window.innerWidth;
            if (x > 0 && x < 40) {
                if (!edgeTimer) edgeTimer = setTimeout(() => { if (state.currentPage > 0) changePage(state.currentPage - 1); }, 800);
            } else if (x > 0 && x > w - 40) {
                if (!edgeTimer) edgeTimer = setTimeout(() => { 
                    if (state.currentPage < state.desktopPages.length - 1) {
                        changePage(state.currentPage + 1); 
                    } else {
                        state.desktopPages.push([]);
                        padPageWithEmptyCells(state.desktopPages[state.desktopPages.length - 1]);
                        nextTick(() => changePage(state.currentPage + 1));
                    }
                }, 800);
            } else {
                if (edgeTimer) { clearTimeout(edgeTimer); edgeTimer = null; }
            }
        };

        const onGridDragEnd = () => {
            gridDragInfo.index = null; gridDragInfo.pageIndex = null; gridDragInfo.group = null;
dragOverInfo.index = null; dragOverInfo.pageIndex = null; dragOverInfo.group = null;
hoverPreview.show = false;
hoverPreview.pageIndex = null;
if (edgeTimer) { clearTimeout(edgeTimer); edgeTimer = null; }
        };

        const onGridDrop = (e, targetIndex, targetPageIndex, targetGroup) => {
dragOverInfo.index = null; dragOverInfo.pageIndex = null; dragOverInfo.group = null;
hoverPreview.show = false;
hoverPreview.pageIndex = null;
if (edgeTimer) { clearTimeout(edgeTimer); edgeTimer = null; }
            if (!state.isEditingDesktop || gridDragInfo.index === null) return;

            const srcIdx = gridDragInfo.index;
            const srcPageIdx = gridDragInfo.pageIndex;
            const srcGroup = gridDragInfo.group;
            
            if (srcIdx === targetIndex && srcGroup === targetGroup && srcPageIdx === targetPageIndex) return;
            
            const srcArr = srcGroup === 'desktop' ? state.desktopPages[srcPageIdx] : state.appsDock;
            const tgtArr = targetGroup === 'desktop' ? state.desktopPages[targetPageIndex] : state.appsDock;

            if (srcGroup === 'dock' && targetGroup === 'desktop') {
                const dockApp = srcArr[srcIdx];
                const targetItem = tgtArr[targetIndex];

                if (!dockApp) return;

                if (targetItem && targetItem.type === 'app' && targetItem.appRef) {
                    // 如果目标位本来就是一个桌面 app，就交换：目标 app 回 dock
                    srcArr[srcIdx] = JSON.parse(JSON.stringify(targetItem.appRef));
                } else {
                    // 如果目标位是 empty，就直接把 dock 里的这个 app 移走，不留假图标
                    srcArr.splice(srcIdx, 1);
                }

                tgtArr[targetIndex] = createGridAppFromDockApp(dockApp);
            } else if (srcGroup === 'desktop' && targetGroup === 'dock') {
                const movingItem = srcArr[srcIdx];
                if (!movingItem || movingItem.type !== 'app') {
                    alert('Dock 里只能放应用');
                    gridDragInfo.index = null; gridDragInfo.pageIndex = null; gridDragInfo.group = null;
                    return;
                }

                const targetDockApp = tgtArr[targetIndex];
                srcArr[srcIdx] = createGridAppFromDockApp(targetDockApp);
                tgtArr[targetIndex] = JSON.parse(JSON.stringify(movingItem.appRef));
            } else if (targetIndex >= tgtArr.length) {
                const [item] = srcArr.splice(srcIdx, 1);
                tgtArr.push(item);
            } else {
                const temp = srcArr[srcIdx];
                srcArr[srcIdx] = tgtArr[targetIndex];
                tgtArr[targetIndex] = temp;
            }
            
            gridDragInfo.index = null; gridDragInfo.pageIndex = null; gridDragInfo.group = null;
            forceSave(); 
        };

        const padPageWithEmptyCells = (pageItems) => {
            const maxCells = state.gridCols * (state.gridCols === 5 ? 6 : 5); 
            let currentCells = 0;
            pageItems.forEach(item => { currentCells += (item.w * item.h); });
            while (currentCells < maxCells) {
                pageItems.push({ id: 'empty_' + Date.now() + Math.random(), type: 'empty', w: 1, h: 1 });
                currentCells++;
            }
        };

const onEmptyGridDrop = (e, pageIndex) => {
    if (edgeTimer) { clearTimeout(edgeTimer); edgeTimer = null; }
    if (!state.isEditingDesktop || gridDragInfo.index === null) return;

    const srcGroup = gridDragInfo.group;
    const srcIdx = gridDragInfo.index;
    const srcPageIdx = gridDragInfo.pageIndex;
    const srcArr = srcGroup === 'desktop' ? state.desktopPages[srcPageIdx] : state.appsDock;
    const targetPage = state.desktopPages[pageIndex];

    if (!targetPage) return;

    // 优先：如果直接落在某个 empty 格上，就跟这个 empty 格对调
    let dropIndex = -1;
    const emptyCellEl = e.target.closest('.empty-grid-cell');
    if (emptyCellEl) {
        const cellWrap = emptyCellEl.closest('.grid-size-1x1');
        const nodes = Array.from(e.currentTarget.children);
        dropIndex = nodes.indexOf(cellWrap);
    }

    if (dropIndex !== -1 && targetPage[dropIndex] && targetPage[dropIndex].type === 'empty') {
        if (srcGroup === 'dock') {
            const dockApp = srcArr[srcIdx];
            targetPage[dropIndex] = createGridAppFromDockApp(dockApp);
            srcArr.splice(srcIdx, 1);
        } else {
            const temp = srcArr[srcIdx];
            srcArr[srcIdx] = targetPage[dropIndex];
            targetPage[dropIndex] = temp;
        }
    } else {
        // 如果是丢到页面空白区域，不再 push 到数组最后面
        // 改为：自动找第一页里的第一个 empty 格来放
        let firstEmptyIdx = targetPage.findIndex(i => i.type === 'empty');
        if (firstEmptyIdx === -1) {
            padPageWithEmptyCells(targetPage);
            firstEmptyIdx = targetPage.findIndex(i => i.type === 'empty');
        }
        if (firstEmptyIdx === -1) {
            alert('这个页面已经没有空位了');
            gridDragInfo.index = null;
            gridDragInfo.pageIndex = null;
            gridDragInfo.group = null;
            hoverPreview.show = false;
            hoverPreview.pageIndex = null;
            return;
        }

        const movingItem = srcArr[srcIdx];
        if (srcGroup === 'dock') {
            targetPage[firstEmptyIdx] = createGridAppFromDockApp(movingItem);
            srcArr.splice(srcIdx, 1);
        } else {
            srcArr[srcIdx] = targetPage[firstEmptyIdx];
            targetPage[firstEmptyIdx] = movingItem;
        }
    }

    gridDragInfo.index = null;
    gridDragInfo.pageIndex = null;
    gridDragInfo.group = null;
    hoverPreview.show = false;
    hoverPreview.pageIndex = null;
    forceSave();
};

const onDockDropArea = (e) => {
    e.preventDefault();
    if (!state.isEditingDesktop || gridDragInfo.index === null) return;

    const srcGroup = gridDragInfo.group;
    const srcIdx = gridDragInfo.index;
    const srcPageIdx = gridDragInfo.pageIndex;

    const srcArr = srcGroup === 'desktop' ? state.desktopPages[srcPageIdx] : state.appsDock;
    if (!srcArr || !srcArr[srcIdx]) return;

    const draggedItem = srcArr[srcIdx];
    if (draggedItem.type !== 'app') {
        alert('Dock 里只能放应用');
        gridDragInfo.index = null;
        gridDragInfo.pageIndex = null;
        gridDragInfo.group = null;
        hoverPreview.show = false;
        hoverPreview.pageIndex = null;
        return;
    }

    const dockEl = e.currentTarget;
    const rect = dockEl.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const slotWidth = rect.width / Math.max(state.appsDock.length, 1);

    let targetIdx = Math.floor(relativeX / slotWidth);
    if (targetIdx < 0) targetIdx = 0;
    if (targetIdx >= state.appsDock.length) targetIdx = state.appsDock.length - 1;

    const targetItem = state.appsDock[targetIdx];
    if (!targetItem || targetItem.type === 'widget' || targetItem.type === 'capsule') {
        alert('Dock 里只能放应用');
        gridDragInfo.index = null;
        gridDragInfo.pageIndex = null;
        gridDragInfo.group = null;
        hoverPreview.show = false;
        hoverPreview.pageIndex = null;
        return;
    }

    srcArr[srcIdx] = targetItem;
    state.appsDock[targetIdx] = draggedItem;

    gridDragInfo.index = null;
    gridDragInfo.pageIndex = null;
    gridDragInfo.group = null;
    hoverPreview.show = false;
    hoverPreview.pageIndex = null;
    forceSave();
};

        const openGridAddPanel = (type = 'widget') => {
            state.gridAddPanel.show = true;
            state.gridAddPanel.itemType = type;
            state.gridAddPanel.pageIndex = state.currentPage || 0;
            if (type === 'widget') {
                state.gridAddPanel.widgetKind = 'badge';
                state.gridAddPanel.widgetSize = '2x2';
                state.gridAddPanel.widgetDataKey = '1';
            }
            if (type === 'app') {
                state.gridAddPanel.appSource = 'appsTop';
                state.gridAddPanel.appIndex = 0;
            }
        };

        const getItemWidgetKind = (item) => {
            if (!item) return 'badge';
            return item.widgetKind || state[item.slotKey] || 'badge';
        };

        const getItemDataKey = (item) => {
            if (!item) return '1';
            return item.dataKey !== undefined ? item.dataKey : '1';
        };

        const confirmAddGridItem = () => {
            if (state.desktopMode !== 'grid') return;
            const panel = state.gridAddPanel;
            let newItem = null;

            if (panel.itemType === 'capsule') {
                newItem = {
                    id: 'cap_add_' + Date.now(),
                    type: 'capsule',
                    w: 4,
                    h: 2
                };
            } else if (panel.itemType === 'widget') {
                const [w, h] = panel.widgetSize.split('x').map(n => parseInt(n));
                newItem = {
                    id: 'w_add_' + Date.now(),
                    type: 'widget',
                    w,
                    h,
                    slotKey: 'widgetSlot1',
                    widgetKind: panel.widgetKind,
                    dataKey: panel.widgetDataKey
                };
            } else if (panel.itemType === 'app') {
                const sourceArr = state[panel.appSource] || [];
                const pickedApp = sourceArr[panel.appIndex];
                if (!pickedApp) {
                    alert('请选择要添加的 APP');
                    return;
                }
                newItem = {
                    id: 'app_add_' + Date.now(),
                    type: 'app',
                    w: 1,
                    h: 1,
                    appRef: JSON.parse(JSON.stringify(pickedApp))
                };
            }

            if (!newItem) return;

            if (!state.desktopPages[panel.pageIndex]) {
                state.desktopPages[panel.pageIndex] = [];
            }

            const page = state.desktopPages[panel.pageIndex];
            const emptyIdx = page.findIndex(i => i.type === 'empty');

            if (emptyIdx !== -1) {
                page[emptyIdx] = newItem;
            } else {
                page.push(newItem);
            }

            padPageWithEmptyCells(page);
            state.gridAddPanel.show = false;
            forceSave();
            alert('添加成功');
        };

        // 切换为网格模式时自动补齐空白格，但不覆盖经典模式配置
        watch(() => state.desktopMode, (newMode) => {
            if (newMode === 'grid') {
                state.desktopPages.forEach(padPageWithEmptyCells);
                forceSave();
            }
        });
        // -------------------------------------------------

        const updateClock = () => { const now = new Date(); currentDate.value = now; secDeg.value = now.getSeconds() * 6; minDeg.value = now.getMinutes() * 6 + now.getSeconds() * 0.1; hrDeg.value = (now.getHours() % 12) * 30 + now.getMinutes() * 0.5; requestAnimationFrame(updateClock); };
        const getClockNumberStyle = (index) => ({ left: `${50 + 38 * Math.cos((index * 30 - 90) * (Math.PI / 180))}%`, top: `${50 + 38 * Math.sin((index * 30 - 90) * (Math.PI / 180))}%` });
        const calendarGrid = computed(() => { const d = currentDate.value; const year = d.getFullYear(); const month = d.getMonth(); const firstDay = new Date(year, month, 1).getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate(); const grid = []; let week = []; for(let i=0; i<firstDay; i++) week.push(''); for(let i=1; i<=daysInMonth; i++) { week.push(i); if(week.length === 7) { grid.push(week); week = []; } } if(week.length > 0) { while(week.length < 7) week.push(''); grid.push(week); } return grid; });

        const formatTime = (date) => { const h = String(date.getHours()).padStart(2, '0'); const m = String(date.getMinutes()).padStart(2, '0'); return `${h}:${m}`; };
        const formatDate = (date) => { const m = date.getMonth()+1; const d = date.getDate(); const days = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六']; return `${m}月${d}日 ${days[date.getDay()]}`; };

        const unlockState = reactive({ startY: 0, currentY: 0, minY: 0, isSwiping: false });
        const onLockTouchStart = (e) => { if (state.showPwdInput) return; const y = e.touches[0].clientY; unlockState.startY = y; unlockState.currentY = y; unlockState.minY = y; unlockState.isSwiping = true; };
        const onLockTouchMove = (e) => { if (!unlockState.isSwiping || state.showPwdInput) return; const y = e.touches[0].clientY; unlockState.currentY = y; if (y < unlockState.minY) unlockState.minY = y; };
        const onLockTouchEnd = (e) => { if (!unlockState.isSwiping) return; unlockState.isSwiping = false; const endY = e.changedTouches[0].clientY; const finalMinY = Math.min(unlockState.minY, unlockState.currentY, endY); const deltaY = unlockState.startY - finalMinY; if (deltaY > 80) { if (state.lockConfig.enablePassword) { state.showPwdInput = true; state.enteredPwd = ''; patternState.path = []; } else { state.isLocked = false; } } unlockState.startY = 0; unlockState.currentY = 0; unlockState.minY = 0; };
        const verifyLockPwd = () => { let correct = false; if (state.lockConfig.pwdType === 'num') correct = (state.enteredPwd === state.lockConfig.pwdNum); else if (state.lockConfig.pwdType === 'pattern') correct = (state.enteredPwd === state.lockConfig.pwdPattern); else if (state.lockConfig.pwdType === 'qa') correct = (state.enteredPwd === state.lockConfig.pwdQA_A); if (correct) { state.isLocked = false; state.showPwdInput = false; state.enteredPwd = ''; patternState.path = []; setTimeout(() => { if(window.lucide) lucide.createIcons(); }, 100); } else { alert('密码错误！'); state.enteredPwd = ''; patternState.path = []; } };

        const patternState = reactive({ isDrawing: false, path: [], currentX: 0, currentY: 0, mode: '' });
        const patternPathPoints = computed(() => patternState.path.map(idx => `${40 + (idx % 3) * 80},${40 + Math.floor(idx / 3) * 80}`).join(' '));
        const startPattern = (e, mode) => { patternState.isDrawing = true; patternState.path = []; patternState.mode = mode; movePattern(e); };
        const movePattern = (e) => { if(!patternState.isDrawing) return; const clientX = e.touches ? e.touches[0].clientX : e.clientX; const clientY = e.touches ? e.touches[0].clientY : e.clientY; const rect = e.currentTarget.getBoundingClientRect(); patternState.currentX = clientX - rect.left; patternState.currentY = clientY - rect.top; if (patternState.currentX >= 0 && patternState.currentX <= 240 && patternState.currentY >= 0 && patternState.currentY <= 240) { const col = Math.floor(patternState.currentX / 80); const row = Math.floor(patternState.currentY / 80); const dist = Math.hypot(patternState.currentX - (40 + col * 80), patternState.currentY - (40 + row * 80)); if (dist < 30) { const idx = row * 3 + col; if (!patternState.path.includes(idx)) patternState.path.push(idx); } } };
        const endPattern = (e) => { if(!patternState.isDrawing) return; patternState.isDrawing = false; const pwd = patternState.path.join(''); if(patternState.mode === 'set') { if(pwd.length < 4) { alert('图案至少需连接 4 个点'); patternState.path = []; return; } state.lockConfig.pwdPattern = pwd; setTimeout(() => { patternState.path = []; }, 800); } else if (patternState.mode === 'unlock') { state.enteredPwd = pwd; verifyLockPwd(); } };

        const addEmoji = () => { const txt = prompt('请输入表情或文字：'); if(txt) state.emojiWallItems.push({ id: Date.now(), text: txt, top: Math.random() * 65 + 10, left: Math.random() * 80 + 5, rot: (Math.random() - 0.5) * 60, size: Math.random() * 12 + 16 }); };
        const clearEmojis = () => { if(confirm('清空散落表情？')) state.emojiWallItems = []; };

        const triggerUpload = (target, data = null) => { currentUploadTarget = target; currentUploadData = data; fileInput.value.click(); };
        const handleFileChange = (e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (event) => { const b64 = event.target.result; if (currentUploadTarget === 'appIcon') state[currentUploadData.group][currentUploadData.index].icon = b64; else if (currentUploadTarget === 'clockIcon') state.clockIcons[currentUploadData] = b64; else if (currentUploadTarget === 'wallpaper') { state.wallpapers.push(b64); currentWpIndex.value = state.wallpapers.length - 1; }         else if (currentUploadTarget === 'lockConfig_wallpaper') { state.lockConfig.wallpaper = b64; } else if (currentUploadTarget === 'tempEmojiUpload') { if (window.tempEmojiUploadCallback) window.tempEmojiUploadCallback(b64); } else if (currentUploadTarget === 'customFont') { state.customFontUrl = b64; state.customFontFamily = 'CustomFont_' + Date.now(); } else if (currentUploadTarget.includes('_')) { const [obj, key] = currentUploadTarget.split('_'); state[obj][key] = b64; } else state[currentUploadTarget] = b64; e.target.value = ''; }; reader.readAsDataURL(file); };


        const setTheme = (theme) => { state.theme = theme; isThemeModalOpen.value = false; };
        const editCapsuleBgUrl = () => { const url = prompt('URL (留空清除)：', state.capsuleBg); if (url !== null) state.capsuleBg = url; };
        const editClockUrl = (index) => { const url = prompt('URL：', state.clockIcons[index]); if (url) state.clockIcons[index] = url; };
        const resetClock = () => { if(confirm('重置时钟？')) { state.clockBg=''; state.clockHandHr=''; state.clockHandMin=''; state.clockHandSec=''; state.clockCenterDot=''; state.clockIcons=[...defaultClockIcons]; } };

        const openWidgetBadge1Editor = () => { isWidgetBadgeModalOpen.value = true; };
        const chooseWidgetBadge1Image = () => { state.widgetBadge1.color = ''; triggerUpload('widgetBadge1_img'); isWidgetBadgeModalOpen.value = false; };
        const onWidgetBadge1ColorChange = (e) => { const color = e.target.value; if (!color) return; state.widgetBadge1.img = ''; state.widgetBadge1.color = color; };
        const resetWidgetBadge1 = () => { state.widgetBadge1.img = ''; state.widgetBadge1.color = ''; isWidgetBadgeModalOpen.value = false; };

        const contactsMethods = window.useContactsLogic(state);
        const chatMethods = window.useChatLogic(state);
        const chatMomentMethods = window.useChatMomentLogic(state, chatMethods);
        const chatDetailMethods = window.useChatDetailLogic(state, chatMethods);
        const chatGroupMethods = window.useChatGroupLogic(state, chatMethods);
        
        const openApp = (app) => { 
            if (app.id === 't1') { state.activeApp = 'chat'; nextTick(() => { if(window.lucide) lucide.createIcons(); }); } 
            else if (app.id === 't2') { state.activeApp = 'blog'; nextTick(() => { if(window.lucide) lucide.createIcons(); }); } 
            else if (app.id === 'd3') { state.activeApp = 'beautify'; nextTick(() => { if(window.lucide) lucide.createIcons(); }); } 
            else if (app.id === 'd1') { state.activeApp = 'settings'; nextTick(() => { if(window.lucide) lucide.createIcons(); settingsMethods.updateStorageInfo(); }); }
            else if (app.id === 'd2') { state.activeApp = 'contacts'; contactsMethods.contactsTab.value = 'chars'; contactsMethods.activeChar.value = null; nextTick(() => { if(window.lucide) lucide.createIcons(); }); }
            else alert(`打开 [ ${app.name || '应用'} ] ...`); 
        };
        const closeApp = () => { state.activeApp = null; nextTick(() => { if(window.lucide) lucide.createIcons(); }); };
        const editApp = (app, hasName = true) => {
            if (state.activeApp) return;
            const url = prompt('URL：', app.icon);
            if (url) app.icon = url;
            if (hasName) {
                const name = prompt('名称：', app.name);
                if (name !== null) app.name = name;
            }
        };
        
        const restoreSystemAppsToDock = () => {
            const defaults = [
                { id: 'd1', name: '设置', icon: defaultImg },
                { id: 'd2', name: '人脉', icon: defaultImg },
                { id: 'd3', name: '美化', icon: defaultImg }
            ];

            if (!Array.isArray(state.appsDock)) state.appsDock = [];

            // 清掉旧假数据
            state.appsDock = state.appsDock.filter(app => {
                return app && app.id && !String(app.id).startsWith('empty_dock_');
            });

            // 去重
            state.appsDock = state.appsDock.filter((app, idx, arr) => {
                return arr.findIndex(a => a && a.id === app.id) === idx;
            });

            defaults.forEach(def => {
                const exists = state.appsDock.some(app => app && app.id === def.id);
                if (!exists) {
                    state.appsDock.push(JSON.parse(JSON.stringify(def)));
                }
            });

            forceSave();
            alert('系统 Dock 应用已恢复（设置 / 人脉 / 美化）');
        };
    
        const deleteGridItem = (pageIndex, index) => {
            const page = state.desktopPages[pageIndex];
            if (!page || !page[index]) return;

            const item = page[index];
            if (!item || item.type === 'empty') return;

            page.splice(index, 1);
            padPageWithEmptyCells(page);
            forceSave();
        };

        const deleteDockApp = (index) => {
            if (!Array.isArray(state.appsDock)) return;
            if (index < 0 || index >= state.appsDock.length) return;

            state.appsDock.splice(index, 1);
            forceSave();
        };

        const deleteGridPage = (pageIndex) => {
            if (!Array.isArray(state.desktopPages) || !state.desktopPages[pageIndex]) return;

            if (state.desktopPages.length <= 1) {
                state.desktopPages[0] = [];
                padPageWithEmptyCells(state.desktopPages[0]);
                state.currentPage = 0;
                forceSave();
                return;
            }

            state.desktopPages.splice(pageIndex, 1);
            state.currentPage = Math.max(0, Math.min(state.currentPage, state.desktopPages.length - 1));

            nextTick(() => changePage(state.currentPage));
            forceSave();
        };

        const beautifyMethods = window.useBeautifyLogic(state, { currentWpIndex, triggerUpload });
        const settingsMethods = window.useSettingsLogic(state);
        const blogMethods = window.useBlogLogic(state, contactsMethods, chatMethods);

        onMounted(() => { loadData(); requestAnimationFrame(updateClock); });

        return { state, defaultImg, isThemeModalOpen, isClockModalOpen, isWidgetBadgeModalOpen, hrDeg, minDeg, secDeg, fileInput, currentWpIndex, currentDate, calendarGrid, getClockNumberStyle, setTheme, triggerUpload, handleFileChange, openApp, closeApp, editApp, restoreSystemAppsToDock, deleteGridItem, deleteDockApp, deleteGridPage, editClockUrl, resetClock, editCapsuleBgUrl, openWidgetBadge1Editor, chooseWidgetBadge1Image, onWidgetBadge1ColorChange, resetWidgetBadge1, addEmoji, clearEmojis, formatTime, formatDate, unlockState, onLockTouchStart, onLockTouchMove, onLockTouchEnd, verifyLockPwd, patternState, patternPathPoints, startPattern, movePattern, endPattern, forceSave, enterEditMode, exitEditMode, onDragStart, onDrop, onGridDragStart, onGridDragOver, onGridDragEnd, onGridDrop, onEmptyGridDrop, onDockDropArea, openGridAddPanel, confirmAddGridItem, getItemWidgetKind, getItemDataKey, dragOverInfo, hoverPreview, moveLayoutUp, moveLayoutDown, swapRow1, swapRow2, desktopScrollRef, changePage, onDesktopScroll, ...beautifyMethods, ...settingsMethods, ...contactsMethods, ...chatMethods, ...chatMomentMethods, ...chatDetailMethods, ...chatGroupMethods, ...blogMethods };
    }
}).mount('#app');