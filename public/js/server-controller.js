// server-controller.js - 处理服务器控制功能
import { socket } from './socket-client.js';
import { addLogEntry } from './logs-manager.js';
import { updateServerStatus, updateWorldName, showAlert } from './ui-controller.js';
import { startPlayerListVerification, stopPlayerListVerification, verifyPlayerList } from './users-manager.js';
import { fetchModsList, fetchVersionInfo } from './server-info.js';
import { loadConfigFile } from './config-manager.js';
import { getExitCommand } from './server-commands.js';

// 服务器状态变量
let serverRunning = false;

// 设置服务器控制功能
function setupServerControls() {
  const startServerBtn = document.getElementById('startServer');
  const stopServerBtn = document.getElementById('stopServer');
  const steamOption = document.getElementById('steamOption');
  const lobbyType = document.getElementById('lobbyType');
  const currentSelectionSpan = document.getElementById('currentSelection');
  
  // 启动服务器按钮点击事件
  if (startServerBtn) {
    startServerBtn.addEventListener('click', () => {
      startServerBtn.disabled = true;
      
      // 获取Steam和大厅选项
      const steamSetting = steamOption.value;
      const lobbySetting = steamSetting === 'steam' ? lobbyType.value : null;
      
      // 在控制台和日志中显示启动参数
      console.log('启动参数:', { steam: steamSetting, lobby: lobbySetting });
      addLogEntry(`启动参数: Steam=${steamSetting}, Lobby=${lobbySetting || 'N/A'}`);
      
      startServer(steamSetting, lobbySetting);
    });
  }
  
  // 停止服务器按钮点击事件
  if (stopServerBtn) {
    stopServerBtn.addEventListener('click', () => {
      stopServerBtn.disabled = true;
      stopServer();
    });
  }
  
  console.log('服务器控制功能已设置');
}

// 设置服务器路径配置功能
function setupPaths() {
  const savePathConfigBtn = document.getElementById('savePathConfig');
  const serverBasePath = document.getElementById('serverBasePath');
  const serverShPath = document.getElementById('serverShPath');
  const serverConfigPath = document.getElementById('serverConfigPath');
  
  // 保存路径配置按钮点击事件
  if (savePathConfigBtn) {
    savePathConfigBtn.addEventListener('click', () => {
      if (serverRunning) {
        showAlert('服务器正在运行，无法修改路径配置');
        return;
      }
      
      const basePath = serverBasePath.value.trim();
      const shFileName = serverShPath.value.trim();
      const configFileName = serverConfigPath.value.trim();
      
      if (!basePath || !shFileName || !configFileName) {
        showAlert('路径信息不完整');
        return;
      }
      
      saveServerPaths(basePath, shFileName, configFileName);
    });
  }
  
  // 加载服务器路径配置
  loadServerPaths();
}

// 启动服务器
function startServer(steamSetting, lobbySetting) {
  fetch('/api/server/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      steam: steamSetting,
      lobby: lobbySetting
    })
  })
  .then(response => response.json())
  .then(data => {
    addLogEntry(data.message);
  })
  .catch(error => {
    console.error('启动服务器失败:', error);
    addLogEntry('启动服务器失败: ' + error.message, true);
    document.getElementById('startServer').disabled = false;
  });
}

// 停止服务器
function stopServer() {
  fetch('/api/server/stop', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      command: getExitCommand()  // 使用命令管理模块获取退出命令
    })
  })
  .then(response => response.json())
  .then(data => {
    addLogEntry(data.message);
  })
  .catch(error => {
    console.error('停止服务器失败:', error);
    addLogEntry('停止服务器失败: ' + error.message, true);
    document.getElementById('stopServer').disabled = false;
  });
}

// 加载服务器路径配置
function loadServerPaths() {
  fetch('/api/server/paths')
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        document.getElementById('serverBasePath').value = data.basePath || '';
        document.getElementById('serverShPath').value = data.shFileName || '';
        document.getElementById('serverConfigPath').value = data.configFileName || '';
        console.log('已加载服务器路径配置');
      }
    })
    .catch(error => {
      console.error('加载服务器路径配置失败:', error);
    });
}

// 保存服务器路径配置
function saveServerPaths(basePath, shFileName, configFileName) {
  fetch('/api/server/paths', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      basePath, 
      shFileName, 
      configFileName
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      addLogEntry('服务器路径配置更新成功');
    } else {
      addLogEntry('保存服务器路径失败: ' + data.message, true);
    }
  })
  .catch(error => {
    console.error('保存服务器路径配置失败:', error);
    addLogEntry('保存服务器路径失败: ' + error.message, true);
  });
}

// 检查服务器状态
function checkServerStatus() {
  fetch('/api/server/status')
    .then(response => response.json())
    .then(data => {
      updateServerStatus(data.running);
      serverRunning = data.running;
      
      if (data.running) {
        // 服务器已运行，更新相关信息
        updateWorldName();
        
        // 启动定时器定期验证玩家列表
        startPlayerListVerification();
        
        // 延迟获取版本信息和模组列表
        setTimeout(() => fetchVersionInfo(), 10000);
        setTimeout(() => fetchModsList(), 30000);
      }
    })
    .catch(error => {
      console.error('获取服务器状态失败:', error);
      addLogEntry('获取服务器状态失败: ' + error.message, true);
    });
}

// 发送服务器命令
function sendServerCommand(command) {
  console.log(`准备发送命令到服务器: ${command}`);
  
  return fetch('/api/server/command', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ command })
  })
  .then(response => {
    console.log('收到服务器响应:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('命令执行结果:', data);
    if (!data.success) {
      throw new Error(data.message);
    }
    return data;
  })
  .catch(error => {
    console.error('命令执行出错:', error);
    throw error;
  });
}

// 处理服务器状态变更
function handleServerStatusChange(status) {
  serverRunning = status.running;
  updateServerStatus(status.running);
  
  if (status.running) {
    // 从配置文件获取世界信息并更新
    loadConfigFile().then(() => {
      // 更新当前地图名称
      updateWorldName();
    }).catch(err => {
      console.error('加载配置文件失败:', err);
    });
    
    // 服务器启动后，延迟获取版本信息
    setTimeout(() => {
      fetchVersionInfo();
    }, 10000); // 等待10秒
    
    // 服务器启动后，延迟更长时间获取模组列表
    setTimeout(() => {
      console.log('准备获取模组列表...');
      fetchModsList();
    }, 30000); // 等待30秒让服务器完全启动并加载地图
    
    // 启动定时器定期验证玩家列表
    startPlayerListVerification();
  } else {
    // 服务器停止时清空版本和模组信息
    document.getElementById('serverVersion').textContent = '未知';
    
    // 停止定时器
    stopPlayerListVerification();
    
    if (status.exitCode !== undefined) {
      addLogEntry(`服务器已停止，退出代码: ${status.exitCode}`, status.exitCode !== 0);
    }
  }
}

// 调试函数 - 显示当前选择
function updateDebugInfo() {
  const currentSelectionSpan = document.getElementById('currentSelection');
  const steamOption = document.getElementById('steamOption');
  const lobbyType = document.getElementById('lobbyType');
  
  if (currentSelectionSpan && steamOption && lobbyType) {
    const steamVal = steamOption.value;
    const lobbyVal = lobbyType.value;
    currentSelectionSpan.textContent = `Steam: ${steamVal}, Lobby: ${lobbyVal}`;
  }
}

// 导出函数和变量
export {
  setupServerControls,
  setupPaths,
  checkServerStatus,
  sendServerCommand,
  handleServerStatusChange,
  updateDebugInfo,
  serverRunning
};