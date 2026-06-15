# 速记卡片

一款轻量级的浏览器扩展，用于快速创建、分类和管理知识卡片。支持 Chrome 和 Edge 浏览器。

## 功能特性

### 卡片管理
- 创建、编辑、删除笔记卡片，支持标题、文本、多张图片和多个链接
- 收藏（★）标记重要卡片，置顶（📌）固定卡片到列表顶部
- 编辑前自动保存版本快照，支持一键恢复到上一版本

### 智能分类
- **自动分类** — 根据内容自动识别文本（text）、图片（image）、链接（link）类型，生成彩色系统标签
- **自定义标签** — 为卡片添加自定义标签，支持批量添加
- **标签筛选** — 点击标签栏中的标签快速筛选对应分类的卡片

### 搜索与筛选
- **全文搜索** — 支持按标题、内容、标签、链接进行模糊搜索
- **日期筛选** — 按日期范围（起止日期）筛选卡片
- **时间排序** — 支持按更新时间正序（最早优先）/ 倒序（最新优先）排列
- 所有筛选条件可叠加使用（搜索 AND 标签 AND 日期）

### 数据管理
- **导入导出** — 支持 JSON 格式备份和恢复所有数据（含图片）
- **批量操作** — 多选卡片后批量删除、批量添加标签
- **WebDAV 同步** — 支持 WebDAV 协议将数据同步到远程服务器，可选自动同步（修改后自动上传）

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

## 架构概览

```
popup.html (入口)
  ├── toolbar.js      ← 搜索、导入导出、批量操作、设置入口
  ├── tagFilter       ← 标签筛选栏（由 popup.js 渲染）
  ├── filterBar       ← 日期筛选 + 排序（由 popup.js 渲染）
  ├── cardList        ← 卡片列表（由 popup.js + recordCard.js 渲染）
  └── editorView      ← 编辑器 / 设置面板（由 modal.js / settings.js 控制）

background.js (Service Worker)
  ├── 数据导出/导入逻辑（handleExport / handleImport）
  ├── WebDAV 客户端（连接测试、上传、下载）
  └── 自动同步监听（chrome.storage.local.onChanged）
```

### 模块职责

| 模块 | 文件 | 职责 |
|------|------|------|
| **App** | `popup.js` | 应用主控制器，协调所有模块，管理全局状态（搜索词、筛选条件、排序） |
| **Toolbar** | `components/toolbar.js` | 搜索栏、操作按钮、批量选择模式 |
| **RecordCard** | `components/recordCard.js` | 单张卡片的 DOM 渲染（颜色条、标题、预览、标签、收藏/置顶） |
| **TagBar** | `components/tagBar.js` | 标签渲染（系统标签 + 自定义标签） |
| **Modal** | `components/modal.js` | 卡片编辑器（新建/编辑视图，图片拖拽上传，链接管理） |
| **Settings** | `components/settings.js` | WebDAV 同步设置面板 |
| **Storage** | `db/storage.js` | `chrome.storage.local` 的 CRUD 封装 |
| **IDB** | `db/indexedDB.js` | IndexedDB 图片 Blob 存储封装 |
| **Classify** | `utils/classify.js` | 根据内容自动生成系统标签 |
| **Version** | `utils/version.js` | 版本快照创建与恢复 |
| **Export** | `utils/export.js` | JSON 文件导入导出 |

### 设计模式

所有模块使用 **Revealing Module Pattern (IIFE)** 挂载到 `window.CardManager` 命名空间。组件通过回调函数通信，`App` 作为中介协调所有交互。

### 数据模型

```javascript
{
  id: string,              // crypto.randomUUID()
  title: string,
  content: {
    text: string,
    images: [],            // 图片引用（实际 Blob 存储在 IndexedDB）
    links: [{ title, url }]
  },
  systemTags: string[],    // 自动分类: 'text', 'image', 'link'
  customTags: string[],    // 用户自定义标签
  favorite: boolean,
  pinned: boolean,
  createdAt: number,       // Date.now()
  updatedAt: number,
  version: {
    previous: record       // 单层深度拷贝快照
  }
}
```

### 存储架构

| 存储 | 内容 | 容量 |
|------|------|------|
| `chrome.storage.local` | 卡片记录（key: `knowledge_records`）、颜色配置、WebDAV 设置 | ~10MB |
| IndexedDB (`CardManagerDB.images`) | 图片 Blob，按 `recordId` 索引 | 浏览器决定 |

### 消息通信

Popup 与 Background Service Worker 通过 `chrome.runtime.sendMessage` 通信：

| 消息类型 | 说明 |
|----------|------|
| `EXPORT_DATA` | 导出所有数据 |
| `IMPORT_DATA` | 导入数据 |
| `GET_COLOR_CONFIG` | 获取颜色配置 |
| `SET_COLOR_CONFIG` | 保存颜色配置 |
| `WEBDAV_TEST` | 测试 WebDAV 连接 |
| `WEBDAV_UPLOAD` | 上传数据到 WebDAV |
| `WEBDAV_DOWNLOAD` | 从 WebDAV 下载数据 |
| `WEBDAV_SAVE_SETTINGS` | 保存 WebDAV 设置 |
| `WEBDAV_GET_SETTINGS` | 读取 WebDAV 设置 |
| `WEBDAV_GET_SYNC_TIME` | 获取上次同步时间 |

## WebDAV 同步

### 支持的服务器
任何支持 WebDAV 协议的服务器，包括但不限于：
- Nextcloud / ownCloud
- Synology NAS WebDAV
- 坚果云、123盘等国内网盘 WebDAV 服务

### 同步机制
- **手动同步** — 在设置面板中点击"上传到服务器"或"从服务器下载"
- **自动同步** — 开启后，每次修改卡片数据会延迟 2 秒自动上传（防抖）
- 数据格式与本地导入导出格式一致（JSON 含 records + images dataURL）
- 上传前自动创建远程目录（MKCOL）

## 项目结构

```
digital-flashcards/
├── manifest.json          # 扩展配置 (Manifest V3)
├── popup.html             # 弹出窗口入口
├── popup.css              # 所有样式
├── popup.js               # 应用主控制器
├── background.js          # Service Worker（数据导入导出 + WebDAV）
├── db/
│   ├── indexedDB.js       # IndexedDB 图片存储
│   └── storage.js         # chrome.storage.local CRUD
├── components/
│   ├── toolbar.js         # 搜索栏和工具栏
│   ├── tagBar.js          # 标签渲染
│   ├── recordCard.js      # 卡片组件
│   ├── modal.js           # 卡片编辑器
│   └── settings.js        # WebDAV 同步设置
├── utils/
│   ├── classify.js        # 自动分类
│   ├── version.js         # 版本历史
│   └── export.js          # 导入导出
└── icons/                 # 扩展图标
```

## 技术栈

- **Manifest V3** — Chrome/Edge 扩展标准
- **原生 JavaScript (ES6+)** — 无框架依赖，无需构建工具
- **chrome.storage.local** — 文本数据持久化（~10MB）
- **IndexedDB** — 图片 Blob 存储
- **Fetch API** — WebDAV 通信（PROPFIND / PUT / GET / MKCOL）

## 许可证

GPL-3.0
