// socket-client.js - 处理Socket.IO连接
import { handleServerStatusChange } from './server-controller.js';
import { processServerLog } from './logs-manager.js';

// 初始化Socket.IO连接
const socket = io();

// 设置监听器
function setupSocketListeners() {
  // 服务器状态事件
  socket.on('server-status', (data) => {
    console.log('收到服务器状态更新:', data);
    handleServerStatusChange(data);
  });

  // 服务器日志事件
  socket.on('server-log', (log) => {
    console.log('收到服务器日志:', log);
    processServerLog(log);
  });

  // 连接和断开事件
  socket.on('connect', () => {
    console.log('已连接到Socket.IO服务器');
  });

  socket.on('disconnect', () => {
    console.log('与Socket.IO服务器断开连接');
  });
}

// 立即设置监听器
setupSocketListeners();

// 导出socket实例
export { socket };