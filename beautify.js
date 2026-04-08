window.useBeautifyLogic = function(state, context) {
    const { currentWpIndex, triggerUpload } = context;

    // 解析HEX到RGBA来实现透明度
    const hexToRgba = (hex, opacity) => {
        let h = hex.replace('#', '');
        if(h.length === 3) h = h.split('').map(x => x+x).join('');
        if(h.length !== 6) return '';
        const r = parseInt(h.substring(0,2), 16);
        const g = parseInt(h.substring(2,4), 16);
        const b = parseInt(h.substring(4,6), 16);
        return `rgba(${r},${g},${b},${opacity})`;
    };

    const getDockStyles = () => {
        if (state.dockHidden) return {}; 
        let bg = '';
        if (state.dockColor && state.dockColor.startsWith('#')) bg = hexToRgba(state.dockColor, state.dockOpacity);
        return {
            backgroundColor: bg || undefined,
            backdropFilter: `blur(${state.dockBlur}px)`,
            WebkitBackdropFilter: `blur(${state.dockBlur}px)`
        };
    };

    const getWpCardStyle = (index) => {
        const diff = index - currentWpIndex.value;
        const absDiff = Math.abs(diff);
        const scale = absDiff === 0 ? 1 : Math.max(0.7, 1 - absDiff * 0.15);
        const translateX = diff * 70; 
        const zIndex = 10 - absDiff;
        const opacity = absDiff > 2 ? 0 : 1 - absDiff * 0.3;
        return { transform: `translateX(calc(${translateX}% - 50%)) scale(${scale})`, zIndex, opacity, left: '50%' };
    };

    let touchStartX = 0;
    const onWpTouchStart = (e) => { touchStartX = e.changedTouches[0].clientX; };
    const onWpTouchEnd = (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        if (touchStartX - touchEndX > 50 && currentWpIndex.value < state.wallpapers.length - 1) currentWpIndex.value++; 
        if (touchEndX - touchStartX > 50 && currentWpIndex.value > 0) currentWpIndex.value--; 
    };

    const handleWpClick = (index) => {
        if (index !== currentWpIndex.value) currentWpIndex.value = index; 
        else { state.desktopWallpaper = state.wallpapers[index]; alert('已成功设置为桌面壁纸！'); }
    };

    const deleteWallpaper = (index) => {
        if (confirm('确定要删除这张壁纸吗？')) {
            state.wallpapers.splice(index, 1);
            if (currentWpIndex.value >= state.wallpapers.length) currentWpIndex.value = Math.max(0, state.wallpapers.length - 1);
        }
    };

    const addWallpaperUrl = () => { const url = prompt('请输入高清壁纸URL：'); if (url) { state.wallpapers.push(url); currentWpIndex.value = state.wallpapers.length - 1; } };

    const editAppInfo = (group, index, isName) => {
        const item = state[group][index];
        if (isName) { const name = prompt('请输入新名称：', item.name); if (name !== null) item.name = name; }
    };
    
    const editAppIconUrl = (group, index) => {
        const url = prompt('请输入新图标URL：', state[group][index].icon);
        if (url) state[group][index].icon = url;
    };

    return {
        getDockStyles, getWpCardStyle, onWpTouchStart, onWpTouchEnd, 
        handleWpClick, deleteWallpaper, addWallpaperUrl, editAppInfo, editAppIconUrl
    };
};
