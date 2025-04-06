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
    // 去掉开头的": "
    const line = content.substring(2).trim();
    
    // 为了避免与服务器版本等信息混淆，检查是否包含特定的关键词
    if (line.includes('泰拉瑞亚服务器') || 
        line.includes('个玩家已连接') || 
        line.includes('tModLoader') ||
        line.includes('服务器版本')) {
      console.log('忽略非模组信息:', line);
      return;
    }
    
    // 首先尝试按回车分割可能的多行模组列表
    let modCandidates = [];
    if (line.includes('\n')) {
      modCandidates = line.split(/[\n\r]+/).map(s => s.trim()).filter(s => s);
      console.log('按回车符分割候选模组:', modCandidates);
    } else {
      // 否则，尝试保留完整的模组名（通常包含空格），如"Calamity Mod Music"
      // 使用正则表达式识别模组名模式
      const regex = /([A-Z][a-z0-9]+(?:\s+[A-Za-z][a-z0-9]+)*)/g;
      let match;
      while ((match = regex.exec(line)) !== null) {
        let fullModName = match[0];
        // 确保是完整模组名（如果后面紧接着空格和大写字母开头的词，不截断）
        let startPos = match.index + match[0].length;
        if (startPos < line.length && line[startPos] === ' ' && 
            startPos + 1 < line.length && /[A-Z]/.test(line[startPos + 1])) {
          // 寻找这个模组名的实际结束位置（通常是下一个大写字母开头前的空格）
          let nextCapital = line.substring(startPos + 1).search(/\s[A-Z]/);
          if (nextCapital !== -1) {
            fullModName = line.substring(match.index, startPos + 1 + nextCapital);
          }
        }
        modCandidates.push(fullModName.trim());
      }
      console.log('按正则表达式分割候选模组:', modCandidates);
    }
    
    // 排除常见的非模组关键词
    const nonModKeywords = ['Server', 'Type', 'Command', 'Help', 'List', 'Exit', 'Save', 'Player', 'World'];
    
    // 过滤并添加有效的模组名
    for (const modName of modCandidates) {
      // 排除太短的和非模组关键词
      const isNonModKeyword = nonModKeywords.some(keyword => 
        modName === keyword || modName === keyword.toLowerCase()
      );
      
      if (modName.length > 2 && !isNonModKeyword && !activeModsList.includes(modName)) {
        activeModsList.push(modName);
        console.log('添加模组:', modName);
      } else if (isNonModKeyword) {
        console.log('忽略非模组关键词:', modName);
      } else {
        console.log('忽略过短名称:', modName);
      }
    }
    
    // 更新模组显示
    console.log('当前模组列表:', activeModsList);
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