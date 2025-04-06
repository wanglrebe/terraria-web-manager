// server-commands.js - 统一管理服务器命令
import { sendServerCommand } from './server-controller.js';

// 服务器命令映射 - 将功能名称映射到实际中文命令
const COMMANDS = {
  // 基本命令
  EXIT: '退出',
  SAVE: '保存',
  SAY: '说',
  HELP: '帮助',
  VERSION: '版本',
  
  // 玩家管理
  KICK: '踢出',
  BAN: '封禁',
  PLAYERS: '游戏中',
  
  // 游戏控制
  TIME: '时间',
  DAWN: '黎明',
  NOON: '正午',
  DUSK: '黄昏',
  MIDNIGHT: '午夜',
  
  // 模组相关
  MOD_LIST: 'modlist',
  
  // 难度相关
  JOURNEY: '旅行',
  CLASSIC: '经典',
  EXPERT: '专家',
  MASTER: '大师',
  
  // 世界控制
  SEED: '种子',
  SETTLE: '探索'
};

/**
 * 获取退出命令
 * @returns {string} 退出命令
 */
function getExitCommand() {
  return COMMANDS.EXIT;
}

/**
 * 执行世界保存
 * @returns {Promise} 命令执行Promise
 */
function saveWorld() {
  return sendServerCommand(COMMANDS.SAVE);
}

/**
 * 获取在线玩家列表
 * @returns {Promise} 命令执行Promise
 */
function listPlayers() {
  return sendServerCommand(COMMANDS.PLAYERS);
}

/**
 * 发送全服消息
 * @param {string} message - 消息内容
 * @returns {Promise} 命令执行Promise
 */
function broadcast(message) {
  return sendServerCommand(`${COMMANDS.SAY} ${message}`);
}

/**
 * 对特定玩家发送私聊消息
 * @param {string} playerName - 玩家名称
 * @param {string} message - 消息内容
 * @returns {Promise} 命令执行Promise
 */
function whisper(playerName, message) {
  return sendServerCommand(`${COMMANDS.SAY} @${playerName}: ${message}`);
}

/**
 * 踢出玩家
 * @param {string} playerName - 玩家名称
 * @returns {Promise} 命令执行Promise
 */
function kickPlayer(playerName) {
  return sendServerCommand(`${COMMANDS.KICK} ${playerName}`);
}

/**
 * 封禁玩家
 * @param {string} playerName - 玩家名称
 * @returns {Promise} 命令执行Promise
 */
function banPlayer(playerName) {
  return sendServerCommand(`${COMMANDS.BAN} ${playerName}`);
}

/**
 * 获取服务器版本信息
 * @returns {Promise} 命令执行Promise
 */
function getVersion() {
  return sendServerCommand(COMMANDS.VERSION);
}

/**
 * 获取模组列表
 * @returns {Promise} 命令执行Promise
 */
function getModList() {
  return sendServerCommand(COMMANDS.MOD_LIST);
}

/**
 * 设置游戏时间
 * @param {string} time - 时间设置 (dawn|noon|dusk|midnight)
 * @returns {Promise} 命令执行Promise
 */
function setGameTime(time) {
  const timeCommands = {
    'dawn': COMMANDS.DAWN,
    'noon': COMMANDS.NOON,
    'dusk': COMMANDS.DUSK,
    'midnight': COMMANDS.MIDNIGHT
  };
  
  const command = timeCommands[time.toLowerCase()];
  if (!command) {
    return Promise.reject(new Error(`无效的时间设置: ${time}`));
  }
  
  return sendServerCommand(command);
}

/**
 * 查询当前游戏时间
 * @returns {Promise} 命令执行Promise
 */
function getGameTime() {
  return sendServerCommand(COMMANDS.TIME);
}

/**
 * 执行帮助命令
 * @returns {Promise} 命令执行Promise
 */
function getHelp() {
  return sendServerCommand(COMMANDS.HELP);
}

/**
 * 获取世界种子
 * @returns {Promise} 命令执行Promise
 */
function getWorldSeed() {
  return sendServerCommand(COMMANDS.SEED);
}

/**
 * 执行原始命令（用于未封装的命令）
 * @param {string} command - 原始命令字符串
 * @returns {Promise} 命令执行Promise
 */
function executeRawCommand(command) {
  return sendServerCommand(command);
}

// 导出命令常量和函数
export {
  COMMANDS,
  getExitCommand,
  saveWorld,
  listPlayers,
  broadcast,
  whisper,
  kickPlayer,
  banPlayer,
  getVersion,
  getModList,
  setGameTime,
  getGameTime,
  getHelp,
  getWorldSeed,
  executeRawCommand
};