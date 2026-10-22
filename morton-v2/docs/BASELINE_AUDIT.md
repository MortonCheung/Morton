# BASELINE AUDIT · MORTON V2 Phase 0

审计时间：2026-10-22 15:15 (Asia/Shanghai)
审计执行：总控 Agent（Lead）
审计范围：远端仓库、本地工作区、第一轮 A1–A4/B1 源码与证据、可复用机制清单
结论：**旧项目全部保留原样，V2 在独立目录 `morton-v2/` 从零建立单一正式应用；第一轮只复用「机制」，不复用任何视觉资产。**

---

## 1. 仓库基线

| 项 | 值 | 证据 |
|---|---|---|
| 远端仓库 | `https://github.com/MortonCheung/Morton` | `gh repo view` |
| 远端 `main` HEAD | `3d4ad3b`（第一轮交付快照） | `gh api repos/MortonCheung/Morton/commits/main` |
| 本地根仓库 | `/Users/morton_cheung/Desktop/AI/Morton/MORTON-experiments` | `.git` |
| 本地 `main` HEAD | `7ed4d84`（比远端多 4 个提交，含 dist/bundle/servers.sh，尚未推送） | `git log --oneline` |
| V2 施工分支 | `feat/morton-v2-art-direction`（从 `7ed4d84` 拉出） | `git branch --show-current` |
| 工作区未跟踪文件 | 仅 `morton-v2/` 新建内容 | `git status --porcelain` |

> 推送受限说明：本轮开始前 `github.com:443` 曾间歇不可达（`Empty reply from server` / 75s 超时）。
> 本地提交完整；V2 分支按要求**不直接推 main**，本地提交 + 待网络恢复后按分支推送。

## 2. 第一轮产物清单（只读，不得覆盖）

| 项目 | 目录（本地快照） | 独立仓库 HEAD | 第一轮定位 |
|---|---|---|---|
| A1 | `A1-luxury-opening/` | `3386d5f` | 奢侈品产品展示式开场 |
| A2 | `A2-sculptural-opening/` | `3bf2d94` | 雕塑陈列式开场 |
| A3 | `A3-premium-tech-opening/` | `0374ee8` | 高端科技发布式开场 |
| A4 | `A4-hybrid-opening/` | `ab1755d` | 融合式开场 |
| B1 | `B1-site-skeleton/` | `cb45680` | 全站滚动叙事骨架 |

五个项目的**独立 Git 历史**保存在 `MORTON-experiments/.DELIVERY_SUBREPOS/<project>/repo.bundle`，
可用 `git clone <bundle> <dir>` 还原；真实工作仓库（含 `node_modules`）在 `/tmp/morton-snap-*`。

**本轮操作纪律**：A1–A5/B1 目录一行不改；如需参考，只读复制思路到 `morton-v2/docs/`。

## 3. 可复用「机制」清单（不含视觉）

| 机制 | 出处 | 许可证 / 归属 | V2 用法 |
|---|---|---|---|
| TTF → 每字母独立 `ExtrudeGeometry`，轮廓采样与 3D 同源 | A1–A4 `src/letters/{font,buildWord}.ts` | 本项目自研（字体为 SIL OFL 1.1） | Phase 2 如需 3D 才用；Phase 1 不引入 WebGL |
| `window.__MORTON__` 开场状态/时序探针契约 | A1–B1 `src/lib/timeline.ts` | 本项目自研 | Phase 2 由总控重新定义更严格版本（含资源 ready 与帧耗时） |
| 系统 Chrome + `playwright-core` 截图/录屏 harness（含 `/tmp/morton-browser-gate` 机器级锁） | `morton-v2/scripts/shot.mjs`（重写） | 本项目自研 | Phase 1 截图证据链 |
| 详情 FLIP 展开 + 滚动位置还原 + 焦点归位 | B1 `DetailFLIP` 思路 | 本项目自研 | Phase 3 行为参考（**不照搬版式**） |
| 五项目 dev server 管理脚本 | `scripts/servers.sh` | 本项目自研 | 不适用于 V2 单应用；仅作运维参考 |

**明确不得沿袭的视觉资产**：A1–A4 的挤出字模 Hero、暗色 showroom 灯光方案、任何一版配色与字距；
B1 的卡片墙式作品总览与「大字压屏」章节模板。硬性原因：用户已判定全部未达要求。

## 4. 第一轮画面缺陷（只记录，用于避免重犯）

依据用户结论 + 总控复核截图：

1. **主体是「默认字库字形 + 挤出」**，没有为 MORTON 设计过字形结构，放大后只有倒角高光，缺少品牌级细节。
2. **版式贫乏**：字标居中 + 两侧小文案，五屏同构；缺少疏密、留白与图文空间关系。
3. **背景靠灯光/渐变撑场**，而不是靠色块、比例、图文关系；暗场方案容易被读成「WebGL Demo」。
4. **画面完成度靠动效掩盖**：静态截图经不起「关掉动画还成立吗」的检验。
5. **B1 内容表现未被认可**：卡片墙 + 每章一个大字母，属于模板拼装，不是编辑策展。

## 5. V2 技术基线（Phase 1 实际落地）

```text
MORTON-experiments/morton-v2/
├── index.html / vite.config.ts / tsconfig*.json / package.json
├── public/fonts/                 # Bodoni Moda, Cormorant Garamond, Archivo, Jost (SIL OFL 1.1)
├── src/app/                      # 路由外壳（hash）+ review 索引
├── src/design/                   # tokens.css / base.css（Art Director 拥有并改写）
├── src/styleframes/              # 五张高保真画面（Art Director 拥有）
├── scripts/shot.mjs              # 1440×900 / 1440×700 / 390×844 截图 + overflow/error 检测
└── docs/{art-direction,storyboards,qa}/
```

- 构建：`React 19 + Vite 8 + TS 5.9`（已验证 `npm run build` 通过，167 modules 级别以下）
- Phase 1 **不引入 Three.js / WebGL**：这一阶段的目标是静态画面是否成立，视觉问题不允许用 WebGL 遮盖。
- 截图端口 `5290`，证据输出 `docs/art-direction/styleframes/`。

## 6. 风险与约束（Phase 1）

| 风险 | 影响 | 处置 |
|---|---|---|
| 无真实个人照片/作品素材 | 无法伪造 Lujo 级摄影 | 使用**明确标注的原创材质占位板**（`public/assets/plates/`），在 `ASSET_REGISTER.md` 登记来源与替换说明 |
| 无定制字形文件 | 字标容易退回「默认字库」 | 要求 MORTON 字标必须经过几何重绘/光学修整，并记录构造规则 |
| 8GB 机器 + 多 Agent | 截图排队 | harness 复用机器级浏览器锁 |
| 视觉主观性 | 自评通过 ≠ 用户认可 | 交付状态固定为 `PENDING_VISUAL_APPROVAL`，不进入 Phase 2 |

## 7. 门禁状态

- Phase 0 审计：**完成**（本文件）
- Phase 1 美术：**进行中**，状态 `PENDING_VISUAL_APPROVAL`
- Phase 2/3/4：**未启动**（按施工包规定，Gate 1 未过不得开工）
