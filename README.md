# MORTON 个人主页实验 · 第一轮交付

> 五个**互相独立**的前端原型：四个开场方案（A1–A4）+ 一个全站滚动叙事骨架（B1）。
> 本轮不合并代码、不替用户决定视觉方向；先审阅实际运行效果，再定下一轮。

## 线上看

仓库是静态托管，**所有方案都提供已构建产物**，打开即可看（含首屏开场与录屏）：

- `A1-luxury-opening/dist/` — 奢侈品产品展示式开场
- `A2-sculptural-opening/dist/` — 雕塑陈列式开场
- `A3-premium-tech-opening/dist/` — 高端科技产品发布式开场
- `A4-hybrid-opening/dist/` — 融合式开场
- `B1-site-skeleton/dist/` — 全站滚动叙事骨架

本地看（GitHub Pages 路径下的相对资源与 SPA 路由都能正常工作）：

```bash
cd A1-luxury-opening && python3 -m http.server 8080
# 浏览器打开 http://127.0.0.1:8080/dist/
```

## 本地开发

每个项目都是独立目录 + **独立 Git 仓库** + 独立依赖：

```bash
cd A1-luxury-opening
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install
npm run dev      # 端口 5181 / A2 5182 / A3 5183 / A4 5184 / B1 5185
npm run build    # tsc -b && vite build
```

## 目录

```text
MORTON/
├── A1-luxury-opening/          # 独立 git 仓库（完整提交历史见 .DELIVERY_SUBREPOS/）
├── A2-sculptural-opening/
├── A3-premium-tech-opening/
├── A4-hybrid-opening/
├── B1-site-skeleton/
├── DELIVERY_INDEX.md           # 交付索引：实测数据、门禁、证据缺口、独立审计
├── REVIEW_MATRIX.md            # 审稿表（客观观察已预填，分数留空）
├── DELIVERY_AUDIT.json         # 总控只读审计的机器可读结果
├── scripts/audit.mjs           # 重建五个项目 + 读 git/PNG/MP4/浏览器原始数据
└── .DELIVERY_SUBREPOS/         # 五个项目各自的历史导出（git bundle + MANIFEST）
```

## 为什么是"仓库里再套五个仓库"

需求写死：五个项目必须拥有**独立 Git 仓库**，禁止用同一仓库的分支或 worktree 代替。GitHub 一个仓库装不下五份独立 `.git`，所以：

- 五个目录各自保留完整的独立 `.git` 与提交历史（本地开发、审计、`git log` 全部照常）；
- 同时用 `git bundle` 把五份历史**原样导出**到 `.DELIVERY_SUBREPOS/<project>/repo.bundle`，任何人 `git clone repo.bundle` 都能还原同样的历史与 SHA；
- `.DELIVERY_SUBREPOS/MANIFEST.md` 记录每个项目的 HEAD SHA、提交数、导出时间。

## 文档入口

- **交付索引与结论**：`DELIVERY_INDEX.md`
- **审稿评分表**：`REVIEW_MATRIX.md`
- 每个项目内部：`docs/{ISOLATION,IMPLEMENTATION_PLAN,DESIGN_DECISIONS,TEST_REPORT,KNOWN_ISSUES}.md`、`docs/SCREENSHOTS/`、`docs/RECORDING/`、`docs/TEST_REPORT_RAW.json`

## 字体许可

全部字体为 SIL Open Font License 1.1，许可证文件随各项目 `public/fonts/` 一并分发。

## 未验证项

真实手机、Safari/Firefox、堆快照级内存泄漏分析、GPU profiler、系统级 `prefers-reduced-motion` 均**未验证**，详见 `DELIVERY_INDEX.md §8`。不做"页面能跑所以没有泄漏"这类推断。
