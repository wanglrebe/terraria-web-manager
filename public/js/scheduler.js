// scheduler.js - 处理计划任务相关功能
import { sendServerCommand } from './server-controller.js';
import { addLogEntry } from './logs-manager.js';
import { showConfirmDialog } from './ui-controller.js';
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
    });
  }
  
  // 玩家在线时重启切换
  if (bypassPlayersCheck) {
    bypassPlayersCheck.addEventListener('change', () => {
      if (bypassPlayersStatus) {
        bypassPlayersStatus.textContent = bypassPlayersCheck.checked ? '会重启' : '不重启';
        bypassPlayersStatus.className = bypassPlayersCheck.checked ? 'status-enabled' : 'status-disabled';
      }
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
    
    // 先保存世界
    saveWorldCommand()
      .then(() => {
        console.log('重启前保存世界');
        addLogEntry('重启前保存世界');
        
        // 然后发送退出命令
        return executeRawCommand(getExitCommand());
      })
      .then(() => {
        console.log('服务器已停止，准备重启');
        addLogEntry('服务器已停止，准备重启');
        
        // 更新上次重启时间
        if (lastRestartTime) {
          lastRestartTime.textContent = new Date().toLocaleString();
        }
        
        // 设置短暂延迟后重启服务器
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
        }, 3000); // 等待3秒后启动，确保服务器完全关闭
      })
      .catch(error => {
        console.error('重启服务器失败:', error);
        addLogEntry('重启服务器失败: ' + error.message, true);
      });
  }
  
  console.log('计划任务功能已设置');
}

// 导出函数
export {
  setupScheduler
};