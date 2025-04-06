// server-info.js - 处理服务器信息相关功能
import { serverRunning } from './server-controller.js';
import { addLogEntry } from './logs-manager.js';
import { updateModsDisplay, updateVersionInfo } from './ui-controller.js';
import { activePlayers } from './users-manager.js';
import { getModList, getVersion } from './server-commands.js';

// 模组列表
let activeModsList = [];

// 获取模组列表
function fetchModsList() {
  console.log('尝试获取模组列表');
  
  getModList()
    .then(() => {
      addLogEntry('已请求模组列表');
    })
    .catch(error => {
      console.error('获取模组列表失败:', error);
    });
}

// 获取版本信息
function fetchVersionInfo() {
  console.log('尝试获取版本信息');
  
  getVersion()
    .then(() => {
      console.log('已请求版本信息');
      // 版本信息会通过日志回传，由processVersionOutput解析
    })
    .catch(error => {
      console.error('获取版本信息失败:', error);
    });
}

// 处理模组列表输出
function processModListOutput(content) {
  console.log('处理模组输出:', content);
  
  // 忽略"modlist"命令本身
  if (content === 'modlist') {
    // 收到modlist命令，清空现有模组列表，准备接收新的列表
    activeModsList = [];
    return;
  }
  
  // 处理以": "开头的行，这通常是模组名
  if (content.startsWith(': ')) {
    // 去掉开头的": "并分割多个模组名
    const line = content.substring(2).trim();
    const modNames = line.split(/\s+(?=[A-Z])/);
    
    console.log('分割后的模组名:', modNames);
    
    modNames.forEach(modName => {
      const trimmedName = modName.trim();
      if (trimmedName && !activeModsList.includes(trimmedName)) {
        activeModsList.push(trimmedName);
      }
    });
    
    updateModsDisplay(activeModsList);
  }
}

// 处理版本信息输出
function processVersionOutput(content) {
  console.log('处理版本信息输出:', content);
  
  // 忽略"版本"命令本身
  if (content === '版本') {
    return;
  }
  
  // 处理以": "开头的版本信息行
  if (content.startsWith(': ') && content.includes('泰拉瑞亚服务器') && content.includes('tModLoader')) {
    const versionInfo = content.substring(2).trim();
    updateVersionInfo(versionInfo);
    console.log('已更新版本信息:', versionInfo);
  }
}

// 处理"游戏中"命令的输出
function processPlayerListOutput(content) {
  // 忽略命令本身
  if (content === '游戏中') return;
  
  // 检查是否是玩家列表信息
  if (content.includes('STEAM_')) {
    // 提取玩家名
    const playerMatch = content.match(/: (.+) \(STEAM_/);
    if (playerMatch && playerMatch[1]) {
      const playerName = playerMatch[1].trim();
      
      // 触发玩家加入事件 (即使已在列表中，确保UI正确)
      const event = new CustomEvent('playerJoin', { detail: { playerName } });
      document.dispatchEvent(event);
    }
  }
  
  // 检查是否是总结信息（"X个玩家已连接"）
  const totalPlayersMatch = content.match(/(\d+)个玩家已连接/);
  if (totalPlayersMatch && totalPlayersMatch[1]) {
    const totalPlayers = parseInt(totalPlayersMatch[1], 10);
    // 如果有差异，可能需要重新获取完整列表
    if (totalPlayers !== activePlayers.size) {
      console.log(`玩家数量不匹配：界面显示${activePlayers.size}，服务器报告${totalPlayers}`);
    }
  }
}

// 获取当前模组列表
function getModsList() {
  return activeModsList;
}

// 导出函数
export {
  fetchModsList,
  fetchVersionInfo,
  processModListOutput,
  processVersionOutput,
  processPlayerListOutput,
  getModsList
};