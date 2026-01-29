// 引入需要的工具包
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// 创建Express服务器
const app = express();
const PORT = 3000;

// ========== 基础配置 ==========
// 允许跨域请求（前端调用后端接口必备）
app.use(cors());
// 解析JSON格式的请求数据
app.use(express.json());
// 托管public文件夹，直接访问前端页面
app.use(express.static(path.join(__dirname, 'public')));

// ========== 数据存储配置 ==========
// 评级数据存储文件（自动生成，不用手动创建）
const RATINGS_FILE = path.join(__dirname, 'ratings.json');

// 初始化数据文件（如果文件不存在，创建空数据）
function initRatingsFile() {
  if (!fs.existsSync(RATINGS_FILE)) {
    const initData = {};
    fs.writeFileSync(RATINGS_FILE, JSON.stringify(initData, null, 2), 'utf8');
    console.log('✅ 初始化评级数据文件：ratings.json');
  }
}
initRatingsFile();

// ========== 接口定义 ==========
/**
 * 1. 提交评级数据接口（前端POST调用）
 * 接收格式：{ "RGX 11z Pro": "S", "掠影": "A", ... }
 */
app.post('/api/submit', (req, res) => {
  try {
    // 1. 获取前端提交的评级数据
    const userRatings = req.body;
    if (!userRatings || Object.keys(userRatings).length === 0) {
      return res.status(400).json({ success: false, msg: '评级数据不能为空' });
    }

    // 2. 读取现有数据
    const rawData = fs.readFileSync(RATINGS_FILE, 'utf8');
    const allRatings = JSON.parse(rawData);

    // 3. 更新数据（统计每个枪皮各评级的次数）
    Object.keys(userRatings).forEach(skinName => {
      const tier = userRatings[skinName];
      // 如果枪皮还没记录，初始化S/A/B/C/D的计数为0
      if (!allRatings[skinName]) {
        allRatings[skinName] = { S: 0, A: 0, B: 0, C: 0, D: 0 };
      }
      // 对应评级计数+1
      allRatings[skinName][tier] += 1;
    });

    // 4. 保存更新后的数据到文件
    fs.writeFileSync(RATINGS_FILE, JSON.stringify(allRatings, null, 2), 'utf8');

    // 5. 返回成功响应
    res.json({ success: true, msg: '评级提交成功！' });
  } catch (err) {
    console.error('❌ 提交评级失败：', err);
    res.status(500).json({ success: false, msg: '服务器出错，提交失败' });
  }
});

/**
 * 2. 获取排行榜数据接口（前端GET调用）
 * 返回格式：[{ skin: "RGX 11z Pro", totalScore: 100, stats: { S:20, A:0, ... } }, ...]
 */
app.get('/api/rankings', (req, res) => {
  try {
    // 1. 读取所有评级数据
    const rawData = fs.readFileSync(RATINGS_FILE, 'utf8');
    const allRatings = JSON.parse(rawData);

    // 2. 定义各评级的分数权重
    const tierScores = { S: 5, A: 4, B: 3, C: 2, D: 1 };

    // 3. 计算每个枪皮的总分并排序
    const rankingList = Object.keys(allRatings).map(skinName => {
      const stats = allRatings[skinName];
      // 总分 = S次数*5 + A次数*4 + B次数*3 + C次数*2 + D次数*1
      const totalScore = stats.S * tierScores.S + 
                         stats.A * tierScores.A + 
                         stats.B * tierScores.B + 
                         stats.C * tierScores.C + 
                         stats.D * tierScores.D;
      return {
        skin: skinName,
        totalScore,
        stats
      };
    });

    // 4. 按总分降序排序，取前10
    rankingList.sort((a, b) => b.totalScore - a.totalScore);
    const top10 = rankingList.slice(0, 10);

    // 5. 返回排行榜数据
    res.json({ success: true, data: top10 });
  } catch (err) {
    console.error('❌ 获取排行榜失败：', err);
    res.status(500).json({ success: false, msg: '获取排行榜失败' });
  }
});

/**
 * 3. 清空测试数据接口（可选，方便测试）
 */
app.post('/api/clear-test', (req, res) => {
  try {
    fs.writeFileSync(RATINGS_FILE, JSON.stringify({}, null, 2), 'utf8');
    res.json({ success: true, msg: '测试数据已清空' });
  } catch (err) {
    res.status(500).json({ success: false, msg: '清空数据失败' });
  }
});

// ========== 启动服务器 ==========
app.listen(PORT, () => {
  console.log(`✅ 后端服务器启动成功！`);
  console.log(`🔗 前端页面访问地址：http://localhost:${PORT}`);
  console.log(`📡 接口地址：http://localhost:${PORT}/api`);
});