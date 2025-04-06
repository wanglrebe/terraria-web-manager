// logs-manager.js - 处理日志相关功能
import { updatePlayerCount } from './ui-controller.js';
import { processCommandOutput, processChatMessage } from './command-processor.js';
import { processModListOutput, processVersionOutput, processPlayerListOutput } from './server-info.js';

// 日志存储
let logEntries = [];

// 设置日志管理功能
function setupLogsManager() {
  const clearLogsBtn = document.getElementById('clearLogs');
  const exportLogsBtn = document.getElementById('exportLogs');
  const logFilter = document.getElementById('logFilter');
  
  // 清除日志按钮点击事件
  if (clearLogsBtn) {
    clearLogsBtn.addEventListener('click', () => {
      clearLogs();
    });
  }
  
  // 导出日志按钮点击事件
  if (exportLogsBtn) {
    exportLogsBtn.addEventListener('click', () => {
      exportLogs();
    });
  }
  
  // 日志过滤功能
  if (logFilter) {
    logFilter.addEventListener('input', () => {
      filterLogs(logFilter.value);
    });
  }
  
  console.log('日志管理功能已设置');
}

// 添加日志条目
function addLogEntry(content, isError = false, time = null) {
  const logContainer = document.getElementById('logContainer');
  if (!logContainer) return;
  
  const logEntry = document.createElement('div');
  logEntry.className = 'log-entry';
  if (isError) {
    logEntry.classList.add('log-error');
  }

  const timestamp = time || new Date().toISOString();
  const formattedTime = new Date(timestamp).toLocaleTimeString();
  
  const timeSpan = document.createElement('span');
  timeSpan.className = 'log-time';
  timeSpan.textContent = `[${formattedTime}]`;
  
  logEntry.appendChild(timeSpan);
  logEntry.appendChild(document.createTextNode(' ' + content));
  
  // 添加到DOM和内存缓存
  logContainer.appendChild(logEntry);
  logEntries.push({
    content,
    isError,
    time: timestamp,
    element: logEntry
  });
  
  // 自动滚动到底部
  logContainer.scrollTop = logContainer.scrollHeight;
}

// 清除日志
function clearLogs() {
  const logContainer = document.getElementById('logContainer');
  if (logContainer) {
    logContainer.innerHTML = '';
    logEntries = [];
    addLogEntry('日志已清除');
  }
}

// 导出日志
function exportLogs() {
  const logContainer = document.getElementById('logContainer');
  if (!logContainer) return;
  
  const logEntries = logContainer.querySelectorAll('.log-entry');
  let logText = '';
  
  logEntries.forEach(entry => {
    if (entry.style.display !== 'none') {
      logText += entry.textContent + '\n';
    }
  });
  
  const blob = new Blob([logText], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `terraria-server-log-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  addLogEntry('已导出日志');
}

// 过滤日志
function filterLogs(filterText) {
  const lowercaseFilter = filterText.toLowerCase();
  const logContainer = document.getElementById('logContainer');
  if (!logContainer) return;
  
  const logEntries = logContainer.querySelectorAll('.log-entry');
  
  logEntries.forEach(entry => {
    const logContent = entry.textContent.toLowerCase();
    if (lowercaseFilter === '' || logContent.includes(lowercaseFilter)) {
      entry.style.display = 'block';
    } else {
      entry.style.display = 'none';
    }
  });
}

// 处理服务器日志
function processServerLog(log) {
  // 添加到日志显示
  addLogEntry(log.content, log.type === 'error', log.time);
  
  const content = log.content;
  
  // 处理命令输出
  if (processCommandOutput(content)) {
    return;
  }
  
  // 处理模组列表输出
  if (content === 'modlist' || content.startsWith(': ')) {
    processModListOutput(content);
  }
  
  // 处理"游戏中"命令输出
  if (content === '游戏中' || (content.includes('个玩家已连接') && content.includes('STEAM_'))) {
    processPlayerListOutput(content);
  }
  
  // 处理版本信息输出
  if (content === '版本' || (content.startsWith(': ') && content.includes('泰拉瑞亚服务器') && content.includes('tModLoader'))) {
    processVersionOutput(content);
  }
  
  // 检查是否是聊天消息，处理聊天命令
  if (content.includes('<') && content.includes('>')) {
    // 尝试提取玩家名称和聊天内容
    const chatMatch = content.match(/<(.+)> (.+)/);
    if (chatMatch) {
      const playerName = chatMatch[1].trim();
      processChatMessage(playerName, content);
    }
  }
  
  // 检查玩家加入消息
  const joinMatch = content.match(/(.+)已加入。/);
  if (joinMatch && joinMatch[1]) {
    const playerName = joinMatch[1].trim();
    handlePlayerJoin(playerName);
  }
  
  // 检查玩家离开消息
  const leaveMatch = content.match(/(.+)已离开。/);
  if (leaveMatch && leaveMatch[1]) {
    const playerName = leaveMatch[1].trim();
    handlePlayerLeave(playerName);
  }
}

// 处理玩家加入
function handlePlayerJoin(playerName) {
  // 通知用户管理模块
  const event = new CustomEvent('playerJoin', { detail: { playerName } });
  document.dispatchEvent(event);
}

// 处理玩家离开
function handlePlayerLeave(playerName) {
  // 通知用户管理模块
  const event = new CustomEvent('playerLeave', { detail: { playerName } });
  document.dispatchEvent(event);
}

// 导出函数
export {
  setupLogsManager,
  addLogEntry,
  clearLogs,
  exportLogs,
  filterLogs,
  processServerLog
};