window.useSettingsLogic = function(state) {
    if (!state.apiConfig) state.apiConfig = { baseUrl: '', apiKey: '', models: [], activeModel: '', presets: [], stream: true, temperature: 0.85 };
    if (!Array.isArray(state.apiConfig.presets)) state.apiConfig.presets = [];

    const ensureApiShape = () => {
        if (!state.apiConfig) state.apiConfig = {};
        if (!state.apiConfig.baseUrl) state.apiConfig.baseUrl = '';
        if (!state.apiConfig.apiKey) state.apiConfig.apiKey = '';
        if (!Array.isArray(state.apiConfig.models)) state.apiConfig.models = [];
        if (!state.apiConfig.activeModel) state.apiConfig.activeModel = '';
        if (!Array.isArray(state.apiConfig.presets)) state.apiConfig.presets = [];
        if (state.apiConfig.stream === undefined) state.apiConfig.stream = true;
        if (state.apiConfig.temperature === undefined || Number.isNaN(Number(state.apiConfig.temperature))) state.apiConfig.temperature = 0.85;
        state.apiConfig.temperature = Math.max(0, Math.min(2, Number(state.apiConfig.temperature)));
    };

    const fetchApiModels = async () => {
        ensureApiShape();
        let baseUrl = String(state.apiConfig.baseUrl || '').trim();
        const apiKey = String(state.apiConfig.apiKey || '').trim();

        if (!baseUrl || !apiKey) {
            alert('请先填写完整的 API URL 和 秘钥');
            return;
        }

        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
        if (!baseUrl.endsWith('/v1') && !baseUrl.includes('/v1/')) baseUrl += '/v1';
        const endpoint = baseUrl + '/models';

        try {
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error(`HTTP 错误！状态码: ${response.status}`);
            const data = await response.json();

            if (data && data.data && Array.isArray(data.data)) {
                state.apiConfig.models = data.data.map(m => m.id).filter(Boolean);
                if (state.apiConfig.models.length > 0) {
                    if (!state.apiConfig.activeModel || !state.apiConfig.models.includes(state.apiConfig.activeModel)) {
                        state.apiConfig.activeModel = state.apiConfig.models[0];
                    }
                    alert(`成功获取到 ${state.apiConfig.models.length} 个模型！`);
                } else {
                    alert('接口请求成功，但模型列表为空。');
                }
            } else {
                alert('获取失败：接口返回格式不符合标准。');
            }
        } catch (error) {
            console.error('API 测试请求报错:', error);
            alert(`获取模型失败！\n\n可能原因：\n1. API 链接或秘钥错误\n2. 渠道不支持浏览器跨域\n\n系统报错：${error.message}`);
        }
    };

    const saveApiPreset = () => {
        ensureApiShape();
        const name = prompt('给这个 API 预设起个名字：');
        if (!name || !name.trim()) return;
        const preset = {
            id: 'preset_' + Date.now(),
            name: name.trim(),
            baseUrl: state.apiConfig.baseUrl || '',
            apiKey: state.apiConfig.apiKey || '',
            activeModel: state.apiConfig.activeModel || '',
            models: Array.isArray(state.apiConfig.models) ? [...state.apiConfig.models] : [],
            stream: state.apiConfig.stream !== false,
            temperature: Math.max(0, Math.min(2, Number(state.apiConfig.temperature || 0.85)))
        };
        const same = state.apiConfig.presets.find(p => p.name === preset.name);
        if (same) {
            if (!confirm(`已存在同名预设 [${preset.name}]，是否覆盖？`)) return;
            Object.assign(same, preset);
        } else {
            state.apiConfig.presets.unshift(preset);
        }
        alert('API 预设已保存');
    };

    const applyApiPreset = (preset) => {
        if (!preset) return;
        ensureApiShape();
        state.apiConfig.baseUrl = preset.baseUrl || '';
        state.apiConfig.apiKey = preset.apiKey || '';
        state.apiConfig.activeModel = preset.activeModel || '';
        state.apiConfig.models = Array.isArray(preset.models) ? [...preset.models] : [];
        state.apiConfig.stream = preset.stream !== false;
        state.apiConfig.temperature = Math.max(0, Math.min(2, Number(preset.temperature ?? 0.85)));
        alert(`已填入预设：${preset.name}`);
    };

    const deleteApiPreset = (presetId) => {
        ensureApiShape();
        if (!confirm('删除这个 API 预设？')) return;
        state.apiConfig.presets = state.apiConfig.presets.filter(p => p.id !== presetId);
    };

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 B';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    const updateStorageInfo = () => {
        const getSize = (obj) => new Blob([JSON.stringify(obj || {})]).size;

        const wallpaperSize = getSize(state.wallpapers) + getSize(state.desktopWallpaper) + getSize(state.capsuleBg) + getSize(state.lockConfig?.wallpaper);
        const iconSize = getSize(state.appsTop) + getSize(state.appsBottom) + getSize(state.appsDock) + getSize(state.clockIcons) + getSize(state.badgeImage);
        const widgetSize = getSize(state.widgetImage1) + getSize(state.widgetBadge1) + getSize(state.customImg1) + getSize(state.customImg2) + getSize(state.avatarCard1) + getSize(state.avatarCard2) + getSize(state.idCard) + getSize(state.clockBg) + getSize(state.clockHandHr) + getSize(state.clockHandMin) + getSize(state.clockHandSec) + getSize(state.clockCenterDot);
        const contactsSize = getSize(state.contactsData);
        const chatSize = getSize(state.chatData);
        const settingsSize = getSize(state.apiConfig) + getSize(state.lockConfig) + getSize({
            theme: state.theme,
            beautifyTab: state.beautifyTab,
            settingsTab: state.settingsTab,
            dockColor: state.dockColor,
            dockOpacity: state.dockOpacity,
            dockBlur: state.dockBlur,
            topShowName: state.topShowName,
            bottomShowName: state.bottomShowName,
            dockShowName: state.dockShowName
        });

        const total = wallpaperSize + iconSize + widgetSize + contactsSize + chatSize + settingsSize;
        state.storageUsed = total;
        state.storageDetails = [
            { name: '壁纸与背景', size: wallpaperSize, color: '#2b2b2b' },
            { name: '图标与外观', size: iconSize, color: '#5c5c5c' },
            { name: '小组件与图片', size: widgetSize, color: '#888888' },
            { name: '人脉与世界书', size: contactsSize, color: '#b0b0b0' },
            { name: 'Chat 数据与消息', size: chatSize, color: '#d0d0d0' },
            { name: '设置与其它', size: settingsSize, color: '#ececec' }
        ];

        let currentAngle = 0;
        const gradientParts = state.storageDetails.map(item => {
            const percentage = total ? (item.size / total) * 100 : 0;
            if (percentage === 0) return '';
            const start = currentAngle;
            currentAngle += percentage;
            return `${item.color} ${start}% ${currentAngle}%`;
        }).filter(Boolean).join(', ');

        state.storageDonutStyle = { background: `conic-gradient(${gradientParts || '#eee 0% 100%'})` };
    };

    const exportAllData = async () => {
        try {
            const rawData = await localforage.getItem('ins_desktop_v8_state');
            const blob = new Blob([JSON.stringify(rawData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Desktop_Backup_${new Date().getTime()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch(e) {
            alert('导出失败！');
        }
    };

    const handleImportData = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const parsed = JSON.parse(event.target.result);
                if (parsed && typeof parsed === 'object') {
                    await localforage.setItem('ins_desktop_v8_state', parsed);
                    alert('导入数据成功！即将刷新桌面。');
                    location.reload();
                } else {
                    alert('备份文件格式不正确！');
                }
            } catch(err) {
                alert('解析文件失败！');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const triggerImport = () => { document.querySelector('.data-file-input').click(); };

    return {
        fetchApiModels,
        saveApiPreset,
        applyApiPreset,
        deleteApiPreset,
        formatSize,
        updateStorageInfo,
        exportAllData,
        handleImportData,
        triggerImport
    };
};
