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

// 时间锁定相关变量
let timeLockState = {
  isLocked: false,
  lockedTime: null, // 'dawn', 'noon', 'dusk', 'midnight'
  intervalId: null
};

// 支持的聊天命令 - 中文环境
const CHAT_COMMANDS = {
  '时间': { command: COMMANDS.TIME, hasResponse: true },
  '黎明': { command: COMMANDS.DAWN, hasResponse: false },
  '正午': { command: COMMANDS.NOON, hasResponse: false },
  '黄昏': { command: COMMANDS.DUSK, hasResponse: false },
  '午夜': { command: COMMANDS.MIDNIGHT, hasResponse: false },
  '帮助': { command: null, hasResponse: true, customHandler: true }, // 使用自定义处理程序而不是服务器命令
  '时间解锁': { command: null, hasResponse: true, customHandler: true } // 使用自定义处理程序
};

// 处理时间锁定命令
function processTimeLockCommand(time, playerName) {
  // 取消现有的锁定
  if (timeLockState.isLocked && timeLockState.intervalId !== null) {
    clearInterval(timeLockState.intervalId);
    timeLockState.intervalId = null;
  }
  
  // 设置新的锁定状态
  timeLockState.isLocked = true;
  timeLockState.lockedTime = time;
  
  // 先立即设置一次时间
  executeTimeCommand(time)
    .then(() => {
      console.log(`已设置时间为 ${time}`);
      
      // 设置定时器，每分钟执行一次时间设置
      timeLockState.intervalId = setInterval(() => {
        executeTimeCommand(time)
          .then(() => {
            console.log(`[定时] 维持时间为 ${time}`);
          })
          .catch(error => {
            console.error(`[定时] 设置时间失败: ${error.message}`);
          });
      }, 60000); // 60秒 = 1分钟
      
      // 发送确认消息
      whisper(playerName, `已锁定游戏时间为${getTimeDisplayName(time)}，每分钟自动重置一次。使用"时间解锁"命令可解除锁定。`);
    })
    .catch(error => {
      console.error(`设置时间失败: ${error.message}`);
      whisper(playerName, `锁定时间失败: ${error.message}`);
    });
  
  return true;
}

// 解除时间锁定
function unlockTime(playerName) {
  if (timeLockState.isLocked && timeLockState.intervalId !== null) {
    clearInterval(timeLockState.intervalId);
    timeLockState.intervalId = null;
    timeLockState.isLocked = false;
    timeLockState.lockedTime = null;
    
    whisper(playerName, '已解除时间锁定，游戏时间将正常流逝。');
    console.log(`玩家 ${playerName} 解除了时间锁定`);
    return true;
  } else {
    whisper(playerName, '时间当前未锁定。');
    return false;
  }
}

// 执行时间设置命令
function executeTimeCommand(time) {
  switch (time) {
    case 'dawn':
      return executeRawCommand(COMMANDS.DAWN);
    case 'noon':
      return executeRawCommand(COMMANDS.NOON);
    case 'dusk':
      return executeRawCommand(COMMANDS.DUSK);
    case 'midnight':
      return executeRawCommand(COMMANDS.MIDNIGHT);
    default:
      return Promise.reject(new Error(`未知的时间设置: ${time}`));
  }
}

// 获取时间点的中文显示名称
function getTimeDisplayName(time) {
  switch (time) {
    case 'dawn':
      return '黎明';
    case 'noon':
      return '正午';
    case 'dusk':
      return '黄昏';
    case 'midnight':
      return '午夜';
    default:
      return time;
  }
}

// 显示自定义帮助信息
function showCustomHelp(playerName) {
  // 将所有命令放在一行中，用分隔符隔开
  const helpMessage = "可用聊天命令: 时间 - 显示当前游戏时间 | 黎明 - 设置时间为黎明 | 正午 - 设置时间为正午 | 黄昏 - 设置时间为黄昏 | 午夜 - 设置时间为午夜 | 黎明 锁定 - 锁定时间在黎明 | 正午 锁定 - 锁定时间在正午 | 黄昏 锁定 - 锁定时间在黄昏 | 午夜 锁定 - 锁定时间在午夜 | 时间解锁 - 解除时间锁定 | 帮助 - 显示此帮助信息";

  whisper(playerName, helpMessage)
    .then(() => console.log(`已发送帮助信息给 ${playerName}`))
    .catch(e => console.error('发送帮助信息失败:', e));
  
  return true;
}

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
  
  // 处理时间锁定命令 (例如: "黎明 锁定")
  const timeLockMatch = chatContent.match(/^(黎明|正午|黄昏|午夜)\s+锁定$/);
  if (timeLockMatch) {
    const timeCommand = timeLockMatch[1];
    let timeValue;
    
    switch (timeCommand) {
      case '黎明':
        timeValue = 'dawn';
        break;
      case '正午':
        timeValue = 'noon';
        break;
      case '黄昏':
        timeValue = 'dusk';
        break;
      case '午夜':
        timeValue = 'midnight';
        break;
    }
    
    console.log(`玩家 ${playerName} 请求锁定时间为 ${timeValue}`);
    return processTimeLockCommand(timeValue, playerName);
  }
  
  // 处理时间解锁命令
  if (chatContent === '时间解锁') {
    console.log(`玩家 ${playerName} 请求解除时间锁定`);
    return unlockTime(playerName);
  }
  
  // 处理帮助命令
  if (chatContent === '帮助') {
    console.log(`玩家 ${playerName} 请求帮助信息`);
    return showCustomHelp(playerName);
  }
  
  // 检查是否是支持的命令
  const command = CHAT_COMMANDS[chatContent];
  if (!command) return false;
  
  console.log(`玩家 ${playerName} 通过聊天执行命令: ${chatContent} -> ${command.command}`);
  
  // 如果是自定义处理程序，则跳过后续处理
  if (command.customHandler) {
    return false;
  }
  
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

// 清理资源 - 在应用关闭前调用
function cleanup() {
  if (timeLockState.intervalId !== null) {
    clearInterval(timeLockState.intervalId);
    timeLockState.intervalId = null;
    timeLockState.isLocked = false;
    console.log('已清理时间锁定计时器');
  }
}

// 导出函数
export {
  processCommandOutput,
  processChatMessage,
  cleanup
};