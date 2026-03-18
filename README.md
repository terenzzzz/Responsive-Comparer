# Responsive Design Testing（本地多尺寸预览工具）

一个轻量的前端小工具：同一个 URL 在多个宽度的 `iframe` 中同时打开，方便快速检查响应式布局。

## 功能

- **多尺寸并排预览**：默认提供 393 / 1440 / 1920 三个视口宽度。
- **自动缩放适配容器**：`iframe` 会按容器宽度自动 `scale`，高度也会同步调整避免被裁切。
- **自定义新增/删除 Frame**：输入宽度（100–4000）即可新增一个 frame；每个 frame 可删除（至少保留 1 个）。
- **从地址栏传入初始 URL**：支持把目标 URL 作为参数传入，打开页面即自动加载。

## 快速开始

### 方式 1：直接双击打开

直接用浏览器打开 `index.html` 即可使用（部分站点在 `file://` 下的行为可能与本地服务器略有差异）。

### 方式 2：本地起一个静态服务器（推荐）

在项目目录运行：

```bash
python3 -m http.server 5173
```

然后访问：

`http://localhost:5173/index.html`

## 使用说明

### 1）在输入框里加载 URL

顶部输入框粘贴任意 URL，回车或点击 **Load**，所有 frame 会加载同一个地址。

URL 规范化规则（见 `responsive.js`）：

- 以 `http://`、`https://`、`file://` 等 scheme 开头的 URL 会原样使用
- 以 `//example.com/...` 开头的协议相对 URL 会自动补全为当前页面协议
- 不带 scheme 的（例如 `www.google.com`）会自动补 `http://`

### 2）从地址栏预先指定要打开的 URL

你可以在打开工具时就传入目标 URL（适合收藏/分享预设）。

#### 推荐写法：`?url=`（可编码）

```text
index.html?url=https%3A%2F%2Fexample.com%2F%3Fa%3D1%26b%3D2%23hash
```

也可以不编码（工具会把 `url=` 后的整段都当作目标 URL）：

```text
index.html?url=https://example.com/?a=1&b=2#hash
```

#### 兼容写法：直接把 URL 放在 `?` 后

```text
index.html?https://example.com/?a=1&b=2#hash
```

> 建议优先用 `?url=`，更清晰，也更方便后续扩展更多工具参数。

### 3）新增/删除 Frame

- 在 **Width** 输入框填一个宽度（100–4000），点击 **Add Frame**
- 每个 frame 右上角垃圾桶按钮可删除（至少保留 1 个 frame）

## 已知限制（重要）

### 1）跨域站点在 iframe 中的限制

浏览器的同源策略会限制在跨域 `iframe` 中读取/控制内部导航地址，因此当你在 iframe 内部跳转到不同域名时，工具可能无法可靠同步所有 frame 的 URL。

### 2）Shopify 预览链接在 iframe 中可能“回落到线上主题”

对于 Shopify 这类预览链接（例如包含 `preview_theme_id`、`preview_key`、`view` 等参数的 URL），即使工具 **不丢参数**，站点也可能因为：

- 第三方嵌入（iframe）环境
- SameSite / 第三方 Cookie 限制
- 预览态依赖登录态或特定 Cookie

而在 iframe 里把预览“降级”为线上版本（有时表现为重定向并移除预览参数）。

排查建议：

- **先在新标签页（顶层页面）直接打开同一个预览链接**，确认预览本身可用
- 如果顶层可用但 iframe 不可用，通常是浏览器/站点对嵌入场景的限制（不是本工具的 URL 解析问题）

## 项目结构

- `index.html`：页面结构与样式、默认 frame 布局、输入框与按钮
- `responsive.js`：加载 URL、frame 管理、缩放逻辑、地址栏参数解析

## 自定义

- 修改默认打开地址：编辑 `responsive.js` 顶部的 `defaultURL`
- 修改默认 frame：编辑 `index.html` 里 `#inner` 下的默认 `div.frame`

