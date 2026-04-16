window.useRoamLogic = function(state) {
    const { reactive, computed } = Vue;

    // --- 大世界地图数据 ---
    const worldMaps = {
        mall: {
            name: '中央商场',
            // 注意：已调换东(e)和西(w)的店铺，确保面对北边时，左转(w)看到左店，右转(e)看到右店
            cells: [
                { x: 0, z: 0, n: '', w: 'shop_flower', s: 'door', e: 'shop_coffee', floor: 'floor', ceil: 'ceil' },
                { x: 0, z: -1, n: '', w: 'wall', s: '', e: 'shop_cloth', floor: 'floor', ceil: 'ceil' },
                { x: 0, z: -2, n: '', w: 'shop_food', s: '', e: 'wall', floor: 'floor', ceil: 'ceil' },
                { x: 0, z: -3, n: 'wall', w: 'wall', s: '', e: 'wall', floor: 'floor', ceil: 'ceil' }
            ],
            interacts: {
                '0,0,2': { label: '出门回小窝', action: 'go_home' }, // 2:南
                '0,0,3': { label: '进入 繁花礼品店', action: 'enter_flower' }, // 3:西(左)
                '0,0,1': { label: '进入 漫岛咖啡', action: 'enter_coffee' }, // 1:东(右)
                '0,-1,1': { label: '进入 优衣衣橱', action: 'enter_cloth' }, 
                '0,-2,3': { label: '进入 高级西餐厅', action: 'enter_food' } 
            }
        },
        home: {
            name: '温馨小窝',
            cells: [
                { x: 0, z: 0, n: '', w: 'wall', s: 'wall', e: 'sofa', floor: 'floor', ceil: 'ceil' },
                { x: 0, z: -1, n: 'door', w: 'bed', s: '', e: 'wall', floor: 'floor', ceil: 'ceil' }
            ],
            interacts: {
                '0,-1,0': { label: '开门去商场', action: 'go_mall' }, 
                '0,0,1': { label: '在沙发上看电视', action: 'sit_sofa' }, 
                '0,-1,3': { label: '躺下休息', action: 'sleep' } 
            }
        }
    };

    const roamState = reactive({
        currentMap: 'mall',
        x: 0,
        z: 0,
        dir: 0, // 朝向: 0:北, 1:东, 2:南, 3:西
        isMoving: false,
        activeInteraction: null 
    });

    const dx = [0, 1, 0, -1];
    const dz = [-1, 0, 1, 0];

    const getPlaneTitle = (type) => {
        const dict = {
            'door': '🚪 出口', 'sofa': '🛋️ 沙发', 'bed': '🛏️ 双人床',
            'shop_coffee': '☕ 漫岛咖啡', 'shop_flower': '💐 繁花礼品', 
            'shop_cloth': '👗 优衣衣橱', 'shop_food': '🥩 高级西餐'
        };
        return dict[type] || '';
    };

    // 核心：生成完美包裹屏幕的 3D 面片
    const renderPlanes = computed(() => {
        const planes = [];
        const map = worldMaps[roamState.currentMap];
        if (!map) return planes;

        map.cells.forEach(cell => {
            const cx = cell.x * 800; // 放大到 800
            const cz = cell.z * 800;
            
            // 四面墙壁分布在中心点四周 400px 处
            if (cell.n) planes.push({ id: `n_${cell.x}_${cell.z}`, type: cell.n, title: getPlaneTitle(cell.n), style: `transform: translate3d(${cx}px, 0, ${cz - 400}px) rotateY(0deg)` });
            if (cell.s) planes.push({ id: `s_${cell.x}_${cell.z}`, type: cell.s, title: getPlaneTitle(cell.s), style: `transform: translate3d(${cx}px, 0, ${cz + 400}px) rotateY(180deg)` });
            if (cell.e) planes.push({ id: `e_${cell.x}_${cell.z}`, type: cell.e, title: getPlaneTitle(cell.e), style: `transform: translate3d(${cx + 400}px, 0, ${cz}px) rotateY(-90deg)` });
            if (cell.w) planes.push({ id: `w_${cell.x}_${cell.z}`, type: cell.w, title: getPlaneTitle(cell.w), style: `transform: translate3d(${cx - 400}px, 0, ${cz}px) rotateY(90deg)` });
            
            planes.push({ id: `f_${cell.x}_${cell.z}`, type: cell.floor, title: '', style: `transform: translate3d(${cx}px, 400px, ${cz}px) rotateX(90deg)` });
            planes.push({ id: `c_${cell.x}_${cell.z}`, type: cell.ceil, title: '', style: `transform: translate3d(${cx}px, -400px, ${cz}px) rotateX(-90deg)` });
        });
        return planes;
    });

    const cameraRotateStyle = computed(() => {
        const rotY = roamState.dir * -90; 
        return { transform: `rotateY(${rotY}deg)` };
    });

    const cameraTranslateStyle = computed(() => {
        const tx = -roamState.x * 800; // 同步放大坐标系
        const tz = -roamState.z * 800;
        return { transform: `translate3d(${tx}px, 0px, ${tz}px)` };
    });

    const currentMapName = computed(() => worldMaps[roamState.currentMap]?.name || '未知区域');

    // 碰撞与地图边界检测：前进
    const canMoveForward = () => {
        const map = worldMaps[roamState.currentMap];
        const cell = map.cells.find(c => c.x === roamState.x && c.z === roamState.z);
        if (!cell) return false;
        // 面前有墙挡着
        if (roamState.dir === 0 && cell.n) return false;
        if (roamState.dir === 1 && cell.e) return false;
        if (roamState.dir === 2 && cell.s) return false;
        if (roamState.dir === 3 && cell.w) return false;
        
        // 目标网格必须存在
        const tx = roamState.x + dx[roamState.dir];
        const tz = roamState.z + dz[roamState.dir];
        return !!map.cells.find(c => c.x === tx && c.z === tz);
    };

    // 碰撞与地图边界检测：后退
    const canMoveBackward = () => {
        const map = worldMaps[roamState.currentMap];
        const cell = map.cells.find(c => c.x === roamState.x && c.z === roamState.z);
        if (!cell) return false;
        
        // 背后有没有墙挡着
        const oppDir = (roamState.dir + 2) % 4;
        if (oppDir === 0 && cell.n) return false;
        if (oppDir === 1 && cell.e) return false;
        if (oppDir === 2 && cell.s) return false;
        if (oppDir === 3 && cell.w) return false;

        // 背后的目标网格必须存在
        const tx = roamState.x - dx[roamState.dir];
        const tz = roamState.z - dz[roamState.dir];
        return !!map.cells.find(c => c.x === tx && c.z === tz);
    };

    const turnLeft = () => { if(roamState.isMoving) return; roamState.dir = (roamState.dir + 3) % 4; };
    const turnRight = () => { if(roamState.isMoving) return; roamState.dir = (roamState.dir + 1) % 4; };
    
    const moveForward = () => {
        if(roamState.isMoving || !canMoveForward()) return;
        roamState.x += dx[roamState.dir];
        roamState.z += dz[roamState.dir];
        lockMove();
    };
    
    const moveBackward = () => {
        if(roamState.isMoving || !canMoveBackward()) return;
        roamState.x -= dx[roamState.dir];
        roamState.z -= dz[roamState.dir];
        lockMove();
    };

    const lockMove = () => {
        roamState.isMoving = true;
        setTimeout(() => roamState.isMoving = false, 350); 
    };

    const currentAction = computed(() => {
        const map = worldMaps[roamState.currentMap];
        const key = `${roamState.x},${roamState.z},${roamState.dir}`;
        return map.interacts[key] || null;
    });

    const doAction = () => {
        const action = currentAction.value;
        if (!action) return;

        if (action.action === 'go_mall') {
            roamState.currentMap = 'mall';
            roamState.x = 0; roamState.z = 0; roamState.dir = 0;
        } else if (action.action === 'go_home') {
            roamState.currentMap = 'home';
            roamState.x = 0; roamState.z = 0; roamState.dir = 0;
        } else {
            roamState.activeInteraction = action;
        }
    };

    return {
        roamState, renderPlanes, cameraRotateStyle, cameraTranslateStyle, currentMapName, currentAction,
        turnLeft, turnRight, moveForward, moveBackward, doAction
    };
};
