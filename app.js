const { createApp, reactive, ref, onMounted, watch, computed, nextTick } = Vue;
const defaultImg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23dcdcdc'/%3E%3C/svg%3E";
const defaultAvatar1 = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23cccccc'/%3E%3C/svg%3E";
const defaultAvatar2 = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23bbbbbb'/%3E%3C/svg%3E";
const createDefaultNumberIcon = (num) => `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Ctext x='50' y='55' font-family='sans-serif' font-size='48' font-weight='bold' fill='%23808080' text-anchor='middle' dominant-baseline='middle'%3E${num}%3C/text%3E%3C/svg%3E`;
const defaultClockIcons = Array.from({length: 12}, (_, i) => createDefaultNumberIcon(i === 0 ? 12 : i));

createApp({
    setup() {
        const state = reactive({
            activeApp: null, beautifyTab: 'widget', theme: 'light', desktopWallpaper: '', capsuleBg: '', capsuleOpacity: 1,
            capsuleType: 'chat', chatTime: '10:00', chatLeftAvatar: defaultAvatar1, chatLeftText: '你好呀', chatRightAvatar: defaultAvatar2, chatRightText: '今天天气不错', chatInputText: '输入...', widgetImage1: "https://images.unsplash.com/photo-1600693437635-ceb8f04df160?w=400&q=80", widgetBadge1: { img: '', color: '#ffffff' }, 
            emojiWallItems: [], idCard: { photo: defaultImg, name: '张三', gender: '男', age: '24', address: '首尔市江南区星空路' },
            widgetSlot1: 'badge', widgetSlot2: 'clock', badgeImage: defaultImg, customImg1: defaultImg, customImg2: defaultImg,
            avatarCard1: { imgLeft: defaultAvatar1, textLeft: 'User A', imgRight: defaultAvatar2, textRight: 'User B', titleTop: 'Sweet Memory', titleBottom: 'Forever' },
            avatarCard2: { imgLeft: defaultAvatar1, textLeft: 'User C', imgRight: defaultAvatar2, textRight: 'User D', titleTop: 'Our Story', titleBottom: 'Together' },
            clockIcons: [...defaultClockIcons], clockBg: '', clockHandHr: '', clockHandMin: '', clockHandSec: '', clockCenterDot: '',
            topShowName: true, topHasShadow: false, appsTop: [{ id: 't1', name: 'Chat', icon: defaultImg }, { id: 't2', name: 'Photos', icon: defaultImg }, { id: 't3', name: 'Notes', icon: defaultImg }, { id: 't4', name: 'Music', icon: defaultImg }],
            bottomShowName: true, bottomHasShadow: false, appsBottom: [{ id: 'b1', name: 'Weather', icon: defaultImg }, { id: 'b2', name: 'App Store', icon: defaultImg }, { id: 'b3', name: 'Maps', icon: defaultImg }, { id: 'b4', name: 'Wallet', icon: defaultImg }],
            dockShowName: false, dockHasShadow: false, dockHidden: false, dockColor: '', dockOpacity: 0.5, dockBlur: 15,
            appsDock: [{ id: 'd1', name: '设置', icon: defaultImg }, { id: 'd2', name: '人脉', icon: defaultImg }, { id: 'd3', name: '美化', icon: defaultImg }],
            wallpapers: ["https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80"],
            settingsTab: 'api', apiConfig: { baseUrl: '', apiKey: '', models: [], activeModel: '' }, storageUsed: 0, storageDetails: [], storageDonutStyle: { background: 'conic-gradient(#eee 0% 100%)' },
            contactsData: { worlds: [], characters: [], myPersonas: [], wbCategories: [], worldbooks: [], relationships: [], layouts: {} },
            chatData: { accounts: {}, groups: {} },
            lockConfig: { enableLockScreen: false, wallpaper: '', enablePassword: false, pwdType: 'num', pwdNum: '', pwdQA_Q: '', pwdQA_A: '', pwdPattern: '' },
            isLocked: false, showPwdInput: false, enteredPwd: ''
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
                    if(!savedState.contactsData.wbCategories) savedState.contactsData.wbCategories = [{ id: 'c_default', name: '通用设定' }];
                    if(!savedState.contactsData.worldbooks) savedState.contactsData.worldbooks = [];
                    if(!savedState.contactsData.relationships) savedState.contactsData.relationships = [];
                    if(!savedState.contactsData.layouts) savedState.contactsData.layouts = {};

                    if(!savedState.chatData) savedState.chatData = { accounts: {}, groups: {} };
                    if(!savedState.chatData.accounts) savedState.chatData.accounts = {};

                    if(!savedState.apiConfig) savedState.apiConfig = { baseUrl: '', apiKey: '', models: [], activeModel: '' };
                    if(!savedState.lockConfig) savedState.lockConfig = { enableLockScreen: false, wallpaper: '', enablePassword: false, pwdType: 'num', pwdNum: '', pwdQA_Q: '', pwdQA_A: '', pwdPattern: '' };
                    
                    Object.assign(state, savedState);
                }
            } catch(e) { console.error('加载缓存数据失败', e); }
            
            if(state.lockConfig && state.lockConfig.enableLockScreen) { 
                state.isLocked = true; state.showPwdInput = false; state.enteredPwd = ''; patternState.path = []; 
            }
            setTimeout(() => { if(window.lucide) lucide.createIcons(); }, 100);
        };
        watch(state, (newState) => { localforage.setItem('ins_desktop_v8_state', JSON.parse(JSON.stringify(newState))); }, { deep: true });

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
        const handleFileChange = (e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (event) => { const b64 = event.target.result; if (currentUploadTarget === 'appIcon') state[currentUploadData.group][currentUploadData.index].icon = b64; else if (currentUploadTarget === 'clockIcon') state.clockIcons[currentUploadData] = b64; else if (currentUploadTarget === 'wallpaper') { state.wallpapers.push(b64); currentWpIndex.value = state.wallpapers.length - 1; } else if (currentUploadTarget === 'lockConfig_wallpaper') { state.lockConfig.wallpaper = b64; } else if (currentUploadTarget.includes('_')) { const [obj, key] = currentUploadTarget.split('_'); state[obj][key] = b64; } else state[currentUploadTarget] = b64; e.target.value = ''; }; reader.readAsDataURL(file); };

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
        const chatDetailMethods = window.useChatDetailLogic(state, chatMethods);
        
        const openApp = (app) => { 
            if (app.id === 't1') { state.activeApp = 'chat'; nextTick(() => { if(window.lucide) lucide.createIcons(); }); } 
            else if (app.id === 'd3') { state.activeApp = 'beautify'; nextTick(() => { if(window.lucide) lucide.createIcons(); }); } 
            else if (app.id === 'd1') { state.activeApp = 'settings'; nextTick(() => { if(window.lucide) lucide.createIcons(); settingsMethods.updateStorageInfo(); }); }
            else if (app.id === 'd2') { state.activeApp = 'contacts'; contactsMethods.contactsTab.value = 'chars'; contactsMethods.activeChar.value = null; nextTick(() => { if(window.lucide) lucide.createIcons(); }); }
            else alert(`打开 [ ${app.name || '应用'} ] ...`); 
        };
        const closeApp = () => { state.activeApp = null; nextTick(() => { if(window.lucide) lucide.createIcons(); }); };
        const editApp = (app, hasName = true) => { if(state.activeApp) return; const url = prompt('URL：', app.icon); if (url) app.icon = url; if (hasName) { const name = prompt('名称：', app.name); if (name !== null) app.name = name; } };

        const beautifyMethods = window.useBeautifyLogic(state, { currentWpIndex, triggerUpload });
        const settingsMethods = window.useSettingsLogic(state);

        onMounted(() => { loadData(); requestAnimationFrame(updateClock); });

        return { state, defaultImg, isThemeModalOpen, isClockModalOpen, isWidgetBadgeModalOpen, hrDeg, minDeg, secDeg, fileInput, currentWpIndex, currentDate, calendarGrid, getClockNumberStyle, setTheme, triggerUpload, handleFileChange, openApp, closeApp, editApp, editClockUrl, resetClock, editCapsuleBgUrl, openWidgetBadge1Editor, chooseWidgetBadge1Image, onWidgetBadge1ColorChange, resetWidgetBadge1, addEmoji, clearEmojis, formatTime, formatDate, unlockState, onLockTouchStart, onLockTouchMove, onLockTouchEnd, verifyLockPwd, patternState, patternPathPoints, startPattern, movePattern, endPattern, ...beautifyMethods, ...settingsMethods, ...contactsMethods, ...chatMethods, ...chatDetailMethods };
    }
}).mount('#app');
