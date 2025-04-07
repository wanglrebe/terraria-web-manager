// scheduler.js - 处理计划任务相关功能
import { sendServerCommand } from './server-controller.js';
import { addLogEntry } from './logs-manager.js';
import { showConfirmDialog } from './ui-controller.js';
import { saveExtendedConfig } from './server-controller.js';
import { 
  saveWorld as saveWorldCommand, 
  broadcast, 
  getExitCommand, 
  executeRawCommand 
} from './server-commands.js';

// 设置计划任务功能
function setupScheduler() {
  // 获取 DOM 元素
  const autoSaveEnabled = document.getElementById('autoSaveEnabled');
  const autoSaveInterval = document.getElementById('autoSaveInterval');
  const autoSaveStatus = document.getElementById('autoSaveStatus');
  const nextSaveTime = document.getElementById('nextSaveTime');
  const lastSaveTime = document.getElementById('lastSaveTime');
  const saveNowBtn = document.getElementById('saveNow');

  const autoRestartEnabled = document.getElementById('autoRestartEnabled');
  const autoRestartStatus = document.getElementById('autoRestartStatus');
  const restartTime = document.getElementById('restartTime');
  const restartWarningTime = document.getElementById('restartWarningTime');
  const bypassPlayersCheck = document.getElementById('bypassPlayersCheck');
  const bypassPlayersStatus = document.getElementById('bypassPlayersStatus');
  const nextRestartTime = document.getElementById('nextRestartTime');
  const lastRestartTime = document.getElementById('lastRestartTime');
  const restartNowBtn = document.getElementById('restartNow');

  // 自动保存定时器
  let autoSaveTimer = null;
  
  // 自动重启定时器
  let autoRestartTimer = null;

  // 自动保存开关变更事件
  if (autoSaveEnabled) {
    autoSaveEnabled.addEventListener('change', () => {
      const enabled = autoSaveEnabled.checked;
      
      if (enabled) {
        // 启用自动保存
        startAutoSave();
      } else {
        // 禁用自动保存
        stopAutoSave();
      }
      
      // 更新UI状态
      updateAutoSaveUI(enabled);
      
      // 保存配置
      saveSchedulerConfig();
    });
  }
  
  // 自动保存间隔变更事件
  if (autoSaveInterval) {
    autoSaveInterval.addEventListener('change', () => {
      if (autoSaveEnabled.checked) {
        // 重新启用自动保存以应用新间隔
        stopAutoSave();
        startAutoSave();
      }
      
      // 保存配置
      saveSchedulerConfig();
    });
  }
  
  // 立即保存按钮点击事件
  if (saveNowBtn) {
    saveNowBtn.addEventListener('click', () => {
      saveWorld();
    });
  }
  
  // 自动重启开关变更事件
  if (autoRestartEnabled) {
    autoRestartEnabled.addEventListener('change', () => {
      const enabled = autoRestartEnabled.checked;
      
      if (enabled) {
        // 启用自动重启
        startAutoRestart();
      } else {
        // 禁用自动重启
        stopAutoRestart();
      }
      
      // 更新UI状态
      updateAutoRestartUI(enabled);
      
      // 保存配置
      saveSchedulerConfig();
    });
  }
  
  // 重启时间变更事件
  if (restartTime) {
    restartTime.addEventListener('change', () => {
      if (autoRestartEnabled.checked) {
        // 重新启用自动重启以应用新时间
        stopAutoRestart();
        startAutoRestart();
      }
      
      // 保存配置
      saveSchedulerConfig();
    });
  }
  
  // 警告时间变更事件
  if (restartWarningTime) {
    restartWarningTime.addEventListener('change', () => {
      // 保存配置
      saveSchedulerConfig();
    });
  }
  
  // 玩家在线时重启切换
  if (bypassPlayersCheck) {
    bypassPlayersCheck.addEventListener('change', () => {
      if (bypassPlayersStatus) {
        bypassPlayersStatus.textContent = bypassPlayersCheck.checked ? '会重启' : '不重启';
        bypassPlayersStatus.className = bypassPlayersCheck.checked ? 'status-enabled' : 'status-disabled';
      }
      
      // 保存配置
      saveSchedulerConfig();
    });
  }
  
  // 立即重启按钮点击事件
  if (restartNowBtn) {
    restartNowBtn.addEventListener('click', () => {
      if (showConfirmDialog('确定要立即重启服务器吗？')) {
        restartServer();
      }
    });
  }

  // 启动自动保存
  function startAutoSave() {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }
    
    const interval = parseInt(autoSaveInterval.value, 10) * 60 * 1000; // 转换为毫秒
    
    // 计算下次保存时间
    const nextTime = new Date(Date.now() + interval);
    if (nextSaveTime) {
      nextSaveTime.textContent = nextTime.toLocaleTimeString();
    }
    
    console.log(`设置自动保存，间隔: ${interval}ms`);
    
    // 设置定时器
    autoSaveTimer = setTimeout(function autoSaveTask() {
      // 执行保存
      saveWorld();
      
      // 设置下一次保存
      const nextInterval = parseInt(autoSaveInterval.value, 10) * 60 * 1000;
      const nextTime = new Date(Date.now() + nextInterval);
      if (nextSaveTime) {
        nextSaveTime.textContent = nextTime.toLocaleTimeString();
      }
      
      autoSaveTimer = setTimeout(autoSaveTask, nextInterval);
    }, interval);
  }
  
  // 停止自动保存
  function stopAutoSave() {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
    }
    
    if (nextSaveTime) {
      nextSaveTime.textContent = '未计划';
    }
  }
  
  // 更新自动保存UI状态
  function updateAutoSaveUI(enabled) {
    if (autoSaveStatus) {
      autoSaveStatus.textContent = enabled ? '已启用' : '已禁用';
      autoSaveStatus.className = enabled ? 'status-enabled' : 'status-disabled';
    }
  }
  
  // 保存世界
  function saveWorld() {
    saveWorldCommand()
      .then(() => {
        console.log('已发送保存世界命令');
        addLogEntry('已执行世界保存');
        
        // 更新上次保存时间
        if (lastSaveTime) {
          lastSaveTime.textContent = new Date().toLocaleTimeString();
        }
      })
      .catch(error => {
        console.error('保存世界失败:', error);
        addLogEntry('保存世界失败: ' + error.message, true);
      });
  }
  
  // 启动自动重启
  function startAutoRestart() {
    if (autoRestartTimer) {
      clearTimeout(autoRestartTimer);
    }
    
    // 获取今天的重启时间
    const timeString = restartTime.value; // 格式 "HH:MM"
    const [hours, minutes] = timeString.split(':').map(Number);
    
    const now = new Date();
    let restartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
    
    // 如果设定时间已过，则设为明天
    if (restartDate <= now) {
      restartDate.setDate(restartDate.getDate() + 1);
    }
    
    // 计算延迟毫秒数
    const delay = restartDate.getTime() - now.getTime();
    
    // 更新下次重启时间显示
    if (nextRestartTime) {
      nextRestartTime.textContent = restartDate.toLocaleString();
    }
    
    console.log(`设置自动重启，计划时间: ${restartDate.toLocaleString()}, 延迟: ${delay}ms`);
    
    // 设置定时器
    autoRestartTimer = setTimeout(function autoRestartTask() {
      // 首先发送警告
      const warningMinutes = parseInt(restartWarningTime.value, 10);
      broadcast(`服务器将在${warningMinutes}分钟后重启，请做好准备`)
        .then(() => {
          console.log(`已发送${warningMinutes}分钟重启警告`);
          
          // 等待警告时间后执行重启
          setTimeout(() => {
            restartServer();
            
            // 设置下一次重启时间
            const nextDay = new Date();
            nextDay.setDate(nextDay.getDate() + 1);
            const nextRestartDate = new Date(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate(), hours, minutes, 0);
            
            if (nextRestartTime) {
              nextRestartTime.textContent = nextRestartDate.toLocaleString();
            }
            
            // 设置下一次重启定时器
            const nextDelay = 24 * 60 * 60 * 1000; // 24小时
            autoRestartTimer = setTimeout(autoRestartTask, nextDelay);
          }, warningMinutes * 60 * 1000);
        })
        .catch(error => {
          console.error('发送重启警告失败:', error);
          addLogEntry('发送重启警告失败: ' + error.message, true);
        });
    }, delay);
  }
  
  // 停止自动重启
  function stopAutoRestart() {
    if (autoRestartTimer) {
      clearTimeout(autoRestartTimer);
      autoRestartTimer = null;
    }
    
    if (nextRestartTime) {
      nextRestartTime.textContent = '未计划';
    }
  }
  
  // 更新自动重启UI状态
  function updateAutoRestartUI(enabled) {
    if (autoRestartStatus) {
      autoRestartStatus.textContent = enabled ? '已启用' : '已禁用';
      autoRestartStatus.className = enabled ? 'status-enabled' : 'status-disabled';
    }
  }
  
  // 重启服务器
  function restartServer() {
    // 先检查是否要忽略玩家在线
    const bypassPlayers = bypassPlayersCheck && bypassPlayersCheck.checked;
    
    // 获取当前的Steam和大厅设置
    const steamOption = document.getElementById('steamOption');
    const lobbyType = document.getElementById('lobbyType');
    const steamSetting = steamOption ? steamOption.value : 'nosteam';
    const lobbySetting = (steamSetting === 'steam' && lobbyType) ? lobbyType.value : null;
    
    // 创建一个重启标记，防止多次触发启动
    let restartInProgress = true;
    
    // 监听服务器停止事件
    const serverStoppedHandler = function(event) {
      if (!restartInProgress) return;
      
      // 确保只执行一次
      restartInProgress = false;
      // 移除监听器，防止内存泄漏
      document.removeEventListener('serverStopped', serverStoppedHandler);
      
      console.log('检测到服务器已完全停止，开始启动新服务器');
      addLogEntry('服务器已完全停止，开始启动新服务器');
      
      // 更新上次重启时间
      if (lastRestartTime) {
        lastRestartTime.textContent = new Date().toLocaleString();
      }
      
      // 设置额外的延迟确保一切就绪
      setTimeout(() => {
        console.log('正在启动服务器...');
        addLogEntry('正在启动服务器...');
        
        // 调用API启动服务器
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
          console.log('服务器启动响应:', data);
          addLogEntry('服务器重启流程已完成');
        })
        .catch(error => {
          console.error('启动服务器失败:', error);
          addLogEntry('重启流程中启动服务器失败: ' + error.message, true);
        });
      }, 5000); // 额外等待5秒以确保系统完全准备好
    };
    
    // 添加监听器以便在服务器停止时接收通知
    document.addEventListener('serverStopped', serverStoppedHandler);
    
    // 还需要设置一个超时机制，以防服务器关闭事件没有正确触发
    const timeout = setTimeout(() => {
      if (restartInProgress) {
        console.log('服务器停止超时，强制继续重启流程');
        addLogEntry('服务器停止超时，强制继续重启流程');
        serverStoppedHandler(new Event('serverStopped'));
      }
    }, 30000); // 30秒超时
    
    // 先保存世界
    saveWorldCommand()
      .then(() => {
        console.log('重启前保存世界');
        addLogEntry('重启前保存世界');
        
        // 然后发送退出命令
        return executeRawCommand(getExitCommand());
      })
      .then(() => {
        console.log('服务器正在停止，等待完全关闭...');
        addLogEntry('服务器正在停止，等待完全关闭...');
      })
      .catch(error => {
        console.error('重启服务器失败:', error);
        addLogEntry('重启服务器失败: ' + error.message, true);
        restartInProgress = false;
        clearTimeout(timeout);
        document.removeEventListener('serverStopped', serverStoppedHandler);
      });
  }
  
  // 保存计划任务配置
  function saveSchedulerConfig() {
    const config = {
      autoSave: {
        enabled: autoSaveEnabled ? autoSaveEnabled.checked : false,
        interval: autoSaveInterval ? parseInt(autoSaveInterval.value, 10) : 15
      },
      autoRestart: {
        enabled: autoRestartEnabled ? autoRestartEnabled.checked : false,
        time: restartTime ? restartTime.value : '04:00',
        warningTime: restartWarningTime ? parseInt(restartWarningTime.value, 10) : 5,
        bypassPlayers: bypassPlayersCheck ? bypassPlayersCheck.checked : false
      }
    };
    
    saveExtendedConfig({
      autoSave: config.autoSave,
      autoRestart: config.autoRestart
    })
    .then(() => {
      console.log('计划任务配置已保存');
    })
    .catch(error => {
      console.error('保存计划任务配置失败:', error);
    });
  }
  
  console.log('计划任务功能已设置');
}

// 导出函数
export {
  setupScheduler
};