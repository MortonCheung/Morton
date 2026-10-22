# QA_REPORT · Phase 4（MORTON V2 · Phase 2 + 3 验收）

> 本报告只记录**真浏览器**结果；没有证据的项一律 `UNVERIFIED`。

## 1. 被测对象

| 项 | 值 |
|---|---|
| 项目 | `morton-v2/`（唯一正式 V2 工作区） |
| 分支 | `feat/morton-v2-art-direction` |
| commit | 见 `docs/PHASE23_HANDOFF.md` 的 SHA 表 |
| 构建 | `npm run build`（`tsc -b && vite build`）**exit 0**，`dist` JS 330.74 kB / gzip 106.95 kB，CSS 35.64 kB / gzip 7.07 kB |
| 类型 | `npm run typecheck` **exit 0** |
| 设备 | MacBook Air M3 / 8GB / macOS / Google Chrome 155（headless，ANGLE Metal） |
| 命令 | `node scripts/qa.mjs --no-video`（原始数据 `docs/qa/qa-raw.json`） |

## 2. 响应式

| 视口 | 绘制 | 换气 | 揭幕 | p95 帧 | 横向溢出 | console/pageerror | 网络失败 |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1440×900 | 1087ms | 61ms | 622ms | 16.7ms | 0 | 0 | 0 |
| 1440×700 | 1093ms | 62ms | 621ms | 16.8ms | 0 | 0 | 0 |
| 1366×768 | 1101ms | 62ms | 619ms | 16.8ms | 0 | 0 | 0 |
| 1024×768 | 1100ms | 62ms | 620ms | 16.8ms | 0 | 0 | 0 |
| 390×844 | 1110ms | 62ms | 621ms | 16.7ms | 0 | 0 | 0 |

每个视口都抓了 5 个开场状态 + 5 个章节 + 详情（共 46 张截图，`docs/qa/screenshots/`）。
录屏：`docs/qa/recording/opening-1440x900.mp4`、`opening-390x844.mp4`。

## 3. 关键路径

| 路径 | 结果 |
|---|---|
| 资源早到 / 晚到（`?gateDelay=2200`） | built 后停留 **1749ms** 才揭幕；cover 全程可见 |
| `prefers-reduced-motion` | **70ms** 直接到 hero，无绘制 |
| 刷新 ×5 | draw 1146–1184ms，reveal 621–622ms，无叠加 |
| 作品详情开关 ×5 | scroll 5352 保持、焦点回 `w01`、DOM 恒 304 节点、覆盖层恒 1 |
| Escape 关闭 | 生效，焦点回来源卡 |
| 开场期间滚动 | 锁定；结束解除，无 jump |

## 4. 性能

- 帧耗时：p95 **16.7–16.8ms**（≈60fps）；最大帧 83–100ms，**全部发生在 `boot` 阶段**（模块求值 + 首帧解码），不在揭幕期间。
- 首屏资源：字体 4 个 TTF（Bodoni Moda / Archivo / Cormorant / Jost）合计约 1.6MB；首屏图片 2 张（hero 的 p06 + 章节首图按需）。
- **素材优化**：九张材质板由 PNG 转 **progressive JPEG q88**，22.65MB → **2.37MB**（`scripts/plates/to-jpeg.py` 可复现）。这是本轮唯一的体积优化，未牺牲像素尺寸。
- 没有 WebGL、没有 shader 编译、没有常驻 RAF、没有 ScrollTrigger。

## 5. 架构与清理

| 检查 | 结论 |
|---|---|
| 分层 | `app/`（路由与站点外壳）、`features/{opening,hero,story,works}`、`motion/`、`design/`、`data/`、`styleframes/`（Phase 1 母版，不改） |
| 巨型组件 | 无；`Site.tsx` 只做组合，单文件最长约 90 行 |
| 重复实现 | 无：章节揭示只有一套 observer；详情只有一套 FLIP；开场只有一条时间线 |
| 依赖 | `react`、`react-dom`、`gsap`（开场与 FLIP）+ 构建期 `vite/typescript/playwright-core`；**没有引入 Three.js** |
| 临时文件 | `.tmp/`、`.tmp-ref/`、`docs/qa/recording/.raw/` 均 gitignore；仓库无散落文件 |

## 6. 明确未验证 `UNVERIFIED`

1. **真实手机**（iOS / Android）与 iOS Safari 的 `100svh` 行为；只测 Chrome 390×844 @2x 仿真。
2. **Safari / Firefox** 兼容性（`mix-blend-mode`、`color-mix()`、`aspect-ratio` 在小屏上的表现）。
3. **内存泄漏**：只有 DOM 节点/覆盖层计数与刷新时序，没有堆快照对比、没有强制 GC、没有 10 分钟长驻留。
4. **慢速 CPU / 冷缓存**（4G 网络、CPU 4x 降速）下的揭幕帧率。
5. **真实作品素材替换**后的版面稳定性（`object-position` 可能需要微调）。
6. 详情层的完整 focus trap（只做了进入/返回两点）。

## 7. 已知问题（按严重度）

1. 开场 cover 的两张纸在 `reveal` 期间会各自生成一个全屏合成层（`will-change: transform`）。在 8GB 机器上未见掉帧（p95 16.8ms），但低端机上需要复测。
2. `boot` 阶段存在 83–100ms 长帧（模块求值 + 首帧解码），当前被静止封面遮住。
3. 移动端详情页的 `Back to works` 不是 sticky，滚动信息列时会移出视口。
4. 章节内容全部是显式占位符（`[作品 01]`、`[年份]` 等），不能当真实履历展示。
5. 导航使用 `mix-blend-mode: difference`，在极端截图/打印环境下颜色不可控（屏幕内已核对两段底色）。
