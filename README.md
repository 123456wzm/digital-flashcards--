# 速记卡片

一款轻量级的浏览器扩展，帮助你快速记录、分类和管理笔记。支持 Chrome 和 Edge 浏览器。

## 功能特性

- **卡片管理** — 创建、编辑、删除笔记卡片
- **自动分类** — 根据内容自动识别文本、图片、链接类型，生成彩色标签
- **自定义标签** — 为卡片添加自定义标签，方便分类管理
- **全文搜索** — 支持按标题、内容、标签、链接进行搜索
- **图片支持** — 拖拽上传图片，图片存储在本地 IndexedDB
- **链接管理** — 为每张卡片添加多个链接
- **导入导出** — 支持 JSON 格式备份和恢复所有数据
- **批量操作** — 批量选择、删除、添加标签
- **收藏 & 置顶** — 标记重要卡片，置顶显示
- **版本历史** — 编辑前自动保存快照，支持恢复到上一版本

## 安装方式

### Chrome

1. 打开 `chrome://extensions`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择项目目录

### Edge

1. 打开 `edge://extensions`
2. 开启左侧「开发人员模式」
3. 点击「加载解压缩」
4. 选择项目目录

## 项目结构

```
├── manifest.json          # 扩展配置 (Manifest V3)
├── popup.html             # 弹出窗口
├── popup.css              # 样式
├── popup.js               # 主逻辑
├── background.js          # 后台服务
├── db/
│   ├── indexedDB.js       # 图片存储
│   └── storage.js         # 记录 CRUD
├── components/
│   ├── toolbar.js         # 搜索栏和工具栏
│   ├── tagBar.js          # 标签渲染
│   ├── recordCard.js      # 卡片组件
│   └── modal.js           # 编辑器
├── utils/
│   ├── classify.js        # 自动分类
│   ├── version.js         # 版本历史
│   └── export.js          # 导入导出
└── icons/                 # 扩展图标
```

## 技术栈

- **Manifest V3** — Chrome/Edge 扩展标准
- **原生 JavaScript** — 无框架依赖，无需构建工具
- **chrome.storage.local** — 文本数据存储（约 10MB）
- **IndexedDB** — 图片 Blob 存储

## 许可证

MIT
