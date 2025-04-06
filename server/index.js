const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { spawn } = require('child_process');
const bodyParser = require('body-parser');
const fs = require('fs');

// 创建Express应用
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 服务器路径配置，默认值
let serverConfig = {
  basePath: '/home/wangxinyi/.steam/steam/steamapps/common/tModLoader/',
  shFileName: 'start-tModLoaderServer.sh',
  configFileName: 'serverconfig.txt'
};

// 配置文件路径
function getConfigPath() {
  return path.join(serverConfig.basePath, serverConfig.configFileName);
}

// 服务器脚本路径
function getServerPath() {
  return path.join(serverConfig.basePath, serverConfig.shFileName);
}

// 设置中间件
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// 保存tModLoader进程的引用
let terrariaProcess = null;
let terrariaLogs = [];

// 设置路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// API路由 - 启动服务器
app.post('/api/server/start', (req, res) => {
  if (terrariaProcess) {
    return res.status(400).json({ message: '服务器已在运行中' });
  }

  // 使用配置中的服务器脚本路径
  const serverPath = getServerPath();
  
  // 确保脚本是可执行的
  try {
    fs.chmodSync(serverPath, '755');
  } catch (error) {
    console.error('设置执行权限失败:', error);
    return res.status(500).json({ message: '无法设置服务器脚本执行权限' });
  }

  // 准备启动参数
  const serverArgs = ['-config', serverConfig.configFileName];
  
  // 处理Steam设置
  const { steam, lobby } = req.body;
  
  console.log('收到的启动请求参数:', req.body);
  
  if (steam === 'steam') {
    serverArgs.push('-steam');
    
    // 处理大厅类型
    if (lobby) {
      if (lobby === 'friends') {
        serverArgs.push('-lobby', 'friends');
      } else if (lobby === 'friendsOfFriends') {
        serverArgs.push('-lobby', 'friends', '-friendsoffriends');
      } else if (lobby === 'private') {
        serverArgs.push('-lobby', 'private');
      }
    }
  } else {
    serverArgs.push('-nosteam');
  }
  
  console.log('启动服务器路径:', serverPath);
  console.log('启动服务器参数:', serverArgs);
  
  // 使用服务器配置目录作为工作目录
  const options = {
    cwd: serverConfig.basePath
  };
  
  io.emit('server-log', { 
    time: new Date().toISOString(), 
    content: `启动服务器: ${serverPath} ${serverArgs.join(' ')}` 
  });

  // 启动服务器进程
  terrariaProcess = spawn(serverPath, serverArgs, options);
  terrariaLogs = [];

  // 处理服务器输出
  terrariaProcess.stdout.on('data', (data) => {
    const logEntry = data.toString();
    terrariaLogs.push({ time: new Date().toISOString(), content: logEntry });
    io.emit('server-log', { time: new Date().toISOString(), content: logEntry });
    console.log(`服务器输出: ${logEntry}`);
  });

  terrariaProcess.stderr.on('data', (data) => {
    const logEntry = data.toString();
    terrariaLogs.push({ time: new Date().toISOString(), content: logEntry, type: 'error' });
    io.emit('server-log', { time: new Date().toISOString(), content: logEntry, type: 'error' });
    console.error(`服务器错误: ${logEntry}`);
  });

  terrariaProcess.on('close', (code) => {
    console.log(`服务器进程退出，代码: ${code}`);
    terrariaProcess = null;
    io.emit('server-status', { running: false, exitCode: code });
  });

  res.json({ message: '服务器启动中' });
  io.emit('server-status', { running: true });
});

// API路由 - 停止服务器
app.post('/api/server/stop', (req, res) => {
  if (!terrariaProcess) {
    return res.status(400).json({ message: '服务器未运行' });
  }

  // 使用从客户端接收的命令 (默认为中文的"退出")
  const exitCommand = req.body && req.body.command ? req.body.command : '退出';
  console.log(`执行服务器停止命令: ${exitCommand}`);
  
  // 向服务器发送退出命令
  terrariaProcess.stdin.write(`${exitCommand}\n`);
  
  // 设置超时，如果服务器没有在5秒内关闭，就强制终止
  setTimeout(() => {
    if (terrariaProcess) {
      terrariaProcess.kill();
      terrariaProcess = null;
      io.emit('server-status', { running: false, exitCode: -1 });
    }
  }, 5000);

  res.json({ message: '正在停止服务器' });
});

// API路由 - 获取服务器状态
app.get('/api/server/status', (req, res) => {
  res.json({ running: terrariaProcess !== null });
});

// API路由 - 获取服务器路径
app.get('/api/server/paths', (req, res) => {
  res.json({
    success: true,
    basePath: serverConfig.basePath,
    shFileName: serverConfig.shFileName,
    configFileName: serverConfig.configFileName
  });
});

// API路由 - 保存服务器路径
app.post('/api/server/paths', (req, res) => {
  if (terrariaProcess) {
    return res.status(400).json({ success: false, message: '服务器正在运行，无法修改路径配置' });
  }
  
  const { basePath, shFileName, configFileName } = req.body;
  
  if (!basePath || !shFileName || !configFileName) {
    return res.status(400).json({ success: false, message: '路径信息不完整' });
  }
  
  // 验证路径是否有效
  try {
    // 检查基础路径是否存在
    if (!fs.existsSync(basePath)) {
      return res.status(400).json({ success: false, message: `基础路径不存在: ${basePath}` });
    }
    
    // 检查脚本文件是否存在
    const fullShPath = path.join(basePath, shFileName);
    if (!fs.existsSync(fullShPath)) {
      return res.status(400).json({ success: false, message: `启动脚本不存在: ${fullShPath}` });
    }
    
    // 更新配置
    serverConfig = {
      basePath,
      shFileName,
      configFileName
    };
    
    // 可以选择将配置保存到文件中，以便重启后保留
    try {
      const configDir = path.join(__dirname, '../config');
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      fs.writeFileSync(
        path.join(configDir, 'server-paths.json'),
        JSON.stringify(serverConfig, null, 2),
        'utf8'
      );
    } catch (saveError) {
      console.error('保存路径配置到文件失败:', saveError);
      // 继续执行，不返回错误
    }
    
    res.json({ success: true, message: '服务器路径配置更新成功' });
  } catch (error) {
    console.error('验证路径失败:', error);
    res.status(500).json({ success: false, message: '验证路径失败', error: error.message });
  }
});

// API路由 - 获取配置文件
app.get('/api/server/config', (req, res) => {
  const configPath = getConfigPath();
  
  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    res.json({ success: true, content: configContent });
  } catch (error) {
    console.error('读取配置文件失败:', error);
    res.status(500).json({ success: false, message: '读取配置文件失败', error: error.message });
  }
});

// API路由 - 保存配置文件
app.post('/api/server/config', (req, res) => {
  if (terrariaProcess) {
    return res.status(400).json({ success: false, message: '服务器正在运行，无法修改配置文件' });
  }
  
  const { content } = req.body;
  if (!content) {
    return res.status(400).json({ success: false, message: '配置内容不能为空' });
  }
  
  const configPath = getConfigPath();
  
  try {
    // 备份当前配置文件
    const backupPath = `${configPath}.bak.${Date.now()}`;
    if (fs.existsSync(configPath)) {
      fs.copyFileSync(configPath, backupPath);
    }
    
    // 写入新配置
    fs.writeFileSync(configPath, content, 'utf8');
    
    res.json({ success: true, message: '配置文件保存成功' });
  } catch (error) {
    console.error('保存配置文件失败:', error);
    res.status(500).json({ success: false, message: '保存配置文件失败', error: error.message });
  }
});

// API路由 - 执行服务器命令
app.post('/api/server/command', (req, res) => {
  console.log('收到命令执行请求:', req.body);
  
  if (!terrariaProcess) {
    console.log('服务器未运行，无法执行命令');
    return res.status(400).json({ success: false, message: '服务器未运行' });
  }
  
  const { command } = req.body;
  if (!command) {
    console.log('命令为空，无法执行');
    return res.status(400).json({ success: false, message: '命令不能为空' });
  }
  
  try {
    console.log(`准备向服务器进程发送命令: ${command}`);
    
    // 向服务器发送命令
    terrariaProcess.stdin.write(`${command}\n`);
    console.log(`命令已发送到服务器stdin`);
    
    // 记录命令到日志
    const logEntry = `执行命令: ${command}`;
    terrariaLogs.push({ time: new Date().toISOString(), content: logEntry });
    io.emit('server-log', { time: new Date().toISOString(), content: logEntry });
    console.log('命令已记录到日志');
    
    // 稍作延迟后再回应，确保命令有时间执行
    setTimeout(() => {
      console.log(`命令执行完成: ${command}`);
      res.json({ success: true, message: '命令已发送', command });
    }, 1000);
  } catch (error) {
    console.error(`执行命令失败: ${error}`);
    res.status(500).json({ success: false, message: `执行命令失败: ${error.message}` });
  }
});

// Socket.IO连接处理
io.on('connection', (socket) => {
  console.log('客户端已连接');
  
  // 发送当前服务器状态
  socket.emit('server-status', { running: terrariaProcess !== null });
  
  // 发送现有日志
  terrariaLogs.forEach(log => {
    socket.emit('server-log', log);
  });

  socket.on('disconnect', () => {
    console.log('客户端已断开连接');
  });
});

// 加载保存的路径配置（如果存在）
function loadPathConfig() {
  const configPath = path.join(__dirname, '../config/server-paths.json');
  
  try {
    if (fs.existsSync(configPath)) {
      const savedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      serverConfig = { ...serverConfig, ...savedConfig };
      console.log('已加载服务器路径配置:', serverConfig);
    }
  } catch (error) {
    console.error('加载路径配置失败:', error);
  }
}

// 服务器启动时加载配置
loadPathConfig();

// 启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});