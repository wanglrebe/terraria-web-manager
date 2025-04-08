// ui-controller.js - 处理用户界面交互
import { updateDebugInfo } from './server-controller.js';
import { saveExtendedConfig } from './server-controller.js';

// 初始化标签页切换功能
function initTabs() {
  const tabLinks = document.querySelectorAll('.tab-link');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // 获取要激活的标签页ID
      const tabId = link.getAttribute('data-tab');
      
      // 移除所有标签页的active类
      tabLinks.forEach(l => l.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // 给点击的标签页添加active类
      link.classList.add('active');
      document.getElementById(tabId).classList.add('active');
    });
  });
  
  // 初始化Steam选项
  initializeSteamOptions();
  
  console.log('标签页系统初始化完成');
}

// 更新服务器状态UI
function updateServerStatus(running) {
  const serverStatusSpan = document.getElementById('serverStatus');
  const startServerBtn = document.getElementById('startServer');
  const stopServerBtn = document.getElementById('stopServer');
  const saveNowBtn = document.getElementById('saveNow');
  const restartNowBtn = document.getElementById('restartNow');
  
  if (running) {
    serverStatusSpan.textContent = '运行中';
    serverStatusSpan.style.color = '#28a745';
    startServerBtn.disabled = true;
    stopServerBtn.disabled = false;
    
    // 启用计划任务中的按钮
    if (saveNowBtn) saveNowBtn.disabled = false;
    if (restartNowBtn) restartNowBtn.disabled = false;
  } else {
    serverStatusSpan.textContent = '未运行';
    serverStatusSpan.style.color = '#dc3545';
    startServerBtn.disabled = false;
    stopServerBtn.disabled = true;
    
    // 禁用计划任务中的按钮
    if (saveNowBtn) saveNowBtn.disabled = true;
    if (restartNowBtn) restartNowBtn.disabled = true;
  }
}

// 更新玩家数量显示
function updatePlayerCount(count) {
  const playerCount = document.getElementById('playerCount');
  if (playerCount) {
    playerCount.textContent = count;
  }
}

// 更新当前世界名称显示
function updateWorldName(name) {
  const currentWorld = document.getElementById('currentWorld');
  if (currentWorld) {
    currentWorld.textContent = name || '未指定';
  }
}

// 更新模组显示
function updateModsDisplay(modsList) {
  const modsListElement = document.getElementById('modsList');
  
  if (!modsListElement) return;
  
  if (!modsList || modsList.length === 0) {
    modsListElement.textContent = '未加载';
    return;
  }
  
  // 过滤空字符串和空白模组名
  const filteredModsList = modsList.filter(mod => mod && mod.trim() !== '');
  
  // 清空当前内容
  modsListElement.innerHTML = '';
  
  // 添加模组数量
  const modCount = document.createElement('span');
  modCount.className = 'mod-count';
  modCount.textContent = `${filteredModsList.length} 个模组`;
  modsListElement.appendChild(modCount);
  
  // 创建模组列表元素
  const modListElement = document.createElement('div');
  modListElement.className = 'mod-list';
  
  // 添加每个模组
  filteredModsList.forEach(mod => {
    const modItem = document.createElement('div'); // 使用div而不是span以便每个模组占一行
    modItem.className = 'mod-item';
    modItem.textContent = mod;
    modListElement.appendChild(modItem);
  });
  
  modsListElement.appendChild(modListElement);
}

// 更新版本信息
function updateVersionInfo(versionText) {
  const serverVersion = document.getElementById('serverVersion');
  if (serverVersion) {
    serverVersion.textContent = versionText || '未知';
  }
}

// 初始化Steam选项显示
// 初始化Steam选项显示
function initializeSteamOptions() {
  const steamOption = document.getElementById('steamOption');
  const lobbyOptions = document.getElementById('lobbyOptions');
  const lobbyType = document.getElementById('lobbyType');
  
  let initialLoad = true; // 标记是否是初始加载
  
  if (steamOption) {
    // Steam选项变更事件
    steamOption.addEventListener('change', () => {
      console.log('Steam选项变更为:', steamOption.value);
      if (steamOption.value === 'steam') {
        lobbyOptions.style.display = 'block';
      } else {
        lobbyOptions.style.display = 'none';
      }
      updateDebugInfo();
      
      // 只有在不是初始加载时才保存
      if (!initialLoad) {
        // 保存Steam设置
        saveSteamSettings();
      }
    });
  }
  
  if (lobbyType) {
    // 大厅类型变更事件
    lobbyType.addEventListener('change', () => {
      console.log('大厅类型变更为:', lobbyType.value);
      updateDebugInfo();
      
      // 只有在不是初始加载时才保存
      if (!initialLoad) {
        // 保存Steam设置
        saveSteamSettings();
      }
    });
  }
  
  // 保存Steam设置
  function saveSteamSettings() {
    if (!steamOption || !lobbyType) return;
    
    const useSteam = steamOption.value === 'steam';
    const lobby = lobbyType.value;
    
    console.log(`保存Steam设置: useSteam=${useSteam}, lobbyType=${lobby}`);
    
    saveExtendedConfig({
      steamSettings: {
        useSteam: useSteam,
        lobbyType: lobby
      }
    })
    .then(() => {
      console.log('Steam设置已保存');
    })
    .catch(error => {
      console.error('保存Steam设置失败:', error);
    });
  }
  
  // 初始更新UI (注意不触发change事件)
  updateDebugInfo();
  
  // 标记初始加载完成
  setTimeout(() => {
    initialLoad = false;
    console.log('Steam选项初始化完成');
  }, 2000); // 给2秒时间加载配置并应用到UI
}

// 显示确认对话框
function showConfirmDialog(message) {
  return confirm(message);
}

// 显示提示信息
function showAlert(message) {
  alert(message);
}

// 导出所有需要的函数
export {
  initTabs,
  updateServerStatus,
  updatePlayerCount,
  updateWorldName,
  updateModsDisplay,
  updateVersionInfo,
  initializeSteamOptions,
  showConfirmDialog,
  showAlert
};