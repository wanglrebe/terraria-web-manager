// command-processor.js - 处理聊天命令和服务器命令输出
import { hasCommandPermission } from './users-manager.js';
import { COMMANDS, getGameTime, setGameTime, getHelp, whisper, executeRawCommand } from './server-commands.js';

// 命令输出缓存
let commandOutputCache = {
  command: '',
  waitingForOutput: false,
  output: '',
  timestamp: 0,
  playerName: '',
  timeout: null
};

// 支持的聊天命令 - 中文环境
const CHAT_COMMANDS = {
  '时间': { command: COMMANDS.TIME, hasResponse: true },
  '黎明': { command: COMMANDS.DAWN, hasResponse: false },
  '正午': { command: COMMANDS.NOON, hasResponse: false },
  '黄昏': { command: COMMANDS.DUSK, hasResponse: false },
  '午夜': { command: COMMANDS.MIDNIGHT, hasResponse: false },
  '帮助': { command: COMMANDS.HELP, hasResponse: true }
};

// 处理命令输出
function processCommandOutput(content) {
  if (!commandOutputCache.waitingForOutput) {
    return false;
  }
  
  // 忽略命令本身的输出
  if (content === commandOutputCache.command) {
    return true;
  }
  
  // 针对"时间"命令的处理
  if (commandOutputCache.command === '时间' && content.includes('时间：')) {
    // 发送时间信息给玩家
    whisper(commandOutputCache.playerName, content.trim())
      .then(() => console.log('已发送时间信息'))
      .catch(e => console.error('发送时间信息失败:', e));
    
    // 重置缓存状态
    commandOutputCache.waitingForOutput = false;
    return true;
  }
  
  // 针对"帮助"命令的处理
  if (commandOutputCache.command === '帮助') {
    // 帮助命令输出通常以冒号开头
    if (content.startsWith(':')) {
      // 提取有用的命令信息
      const helpText = content.substring(1).trim();
      
      // 忽略空行
      if (helpText.length === 0) {
        return true;
      }
      
      // 收集帮助信息
      if (commandOutputCache.output === '') {
        commandOutputCache.output = helpText;
      } else {
        commandOutputCache.output += ' | ' + helpText;
      }
      
      // 延迟发送收集到的帮助信息
      clearTimeout(commandOutputCache.timeout);
      commandOutputCache.timeout = setTimeout(() => {
        if (commandOutputCache.output) {
          // 发送帮助信息给玩家
          whisper(commandOutputCache.playerName, `可用命令: ${commandOutputCache.output}`)
            .then(() => console.log('已发送帮助信息'))
            .catch(e => console.error('发送帮助信息失败:', e));
        }
        
        // 重置缓存状态
        commandOutputCache.waitingForOutput = false;
      }, 1000); // 1秒后发送，收集多行帮助信息
      
      return true;
    }
  }
  
  return false;
}

// 检测并处理聊天命令
function processChatMessage(playerName, message) {
  // 检查是否是聊天消息
  const chatMatch = message.match(/<(.+)> (.+)/);
  if (!chatMatch) return false;
  
  const chatPlayerName = chatMatch[1].trim();
  const chatContent = chatMatch[2].trim();
  
  // 玩家名称不匹配，不处理
  if (chatPlayerName !== playerName) return false;
  
  // 检查玩家是否有权限执行聊天命令
  if (!hasCommandPermission(playerName)) {
    console.log(`玩家 ${playerName} 没有聊天命令权限，忽略命令: ${chatContent}`);
    return false;
  }
  
  // 检查是否是支持的命令
  const command = CHAT_COMMANDS[chatContent];
  if (!command) return false;
  
  console.log(`玩家 ${playerName} 通过聊天执行命令: ${chatContent} -> ${command.command}`);
  
  // 如果命令有响应，设置缓存为等待状态
  if (command.hasResponse) {
    commandOutputCache = {
      command: chatContent,
      waitingForOutput: true,
      output: '',
      timestamp: Date.now(),
      playerName: playerName  // 保存发送命令的玩家名称
    };
  }
  
  // 执行命令
  executeRawCommand(command.command)
    .then(response => {
      console.log(`命令执行成功: ${command.command}`);
      
      // 无响应的命令直接结束
      if (!command.hasResponse) {
        return;
      }
      
      // 响应命令在processCommandOutput中处理
      // 设置超时，如果5秒内没有收到输出，发送默认消息
      setTimeout(() => {
        if (commandOutputCache.waitingForOutput && 
            commandOutputCache.command === chatContent) {
          console.log(`命令 ${chatContent} 输出超时，发送默认消息`);
          whisper(playerName, `已执行命令 ${chatContent}，但未获取到输出`)
            .catch(e => console.error('发送默认消息失败:', e));
          
          // 重置缓存
          commandOutputCache.waitingForOutput = false;
        }
      }, 5000);
    })
    .catch(error => {
      console.error(`执行命令失败: ${command.command}`, error);
      
      // 发送错误消息
      whisper(playerName, `执行命令 ${chatContent} 失败: ${error.message}`)
        .catch(e => console.error('发送错误消息失败:', e));
      
      // 重置缓存
      if (command.hasResponse) {
        commandOutputCache.waitingForOutput = false;
      }
    });
  
  return true;
}

// 导出函数
export {
  processCommandOutput,
  processChatMessage
};