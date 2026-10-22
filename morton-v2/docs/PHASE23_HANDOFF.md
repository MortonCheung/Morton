# PHASE 2 / 3 / 4 交接

- **阶段**：Phase 2（Heron 式开场）· Phase 3（全站美术骨架）· Phase 4（QA）
- **完成 Agent**：Lead（架构、开场、章节、交互、证据链与验收）
- **分支**：`feat/morton-v2-art-direction`
- **用户状态**：用户指示「继续执行到底，不要再问」，因此 Lead 在 Phase 1 视觉自评通过后连续完成 2/3/4；**最终美术认可仍由用户给出**。
- **交付状态**：`RUNNABLE` / `BUILD_PASS` / `OPENING_VERIFIED` / `INTERACTION_PASS` / `QA_PARTIAL`（见 §6 `UNVERIFIED`）

## 1. SHA 表

| 阶段 | commit | 内容 |
|---|---|---|
| Phase 0 | `e719852` | 基线审计 + V2 脚手架 |
| Phase 1.1 | `50547de` | 9 张原创材质板 + 生成器 |
| Phase 1.2 | `90818e5` | 五张高保真视觉稿 + 美术系统 |
| Phase 2/3/4 | `f088d1f` | 开场 + 全站骨架 + QA 证据（`f088d1f885c48ba8030016627211bf0b772ac13e`） |

## 2. 本轮新增/修改

```text
src/features/opening/   OpeningShell · OpeningArt · useOpeningSequence · opening.css
src/features/hero/      HeroSection · heroGeometry.ts（与 Hero CSS 同坐标）
src/features/story/     AboutSection · RecordSection · MakingSection · NextSection
src/features/works/     WorksSection（展陈 + 索引）· ProjectFocus（FLIP 层）
src/motion/             useSectionReveal（单 observer，无滚动回调）
src/data/site.ts        章节/作品/占位的唯一数据源
src/app/Site.tsx        章节组合 + 详情状态 + 滚动/焦点还原
src/app/App.tsx         路由：#/ 站点，#/review Phase 1 索引，#/<frame> 单帧
src/design/site.css     章节版式（只使用既有 token）
scripts/qa.mjs          真浏览器证据脚本（截图/时序/帧/失败路径/详情流）
scripts/plates/to-jpeg.py  材质板 PNG→progressive JPEG（22.65MB→2.37MB）
docs/storyboards/OPENING_SPEC.md
docs/qa/{QA_REPORT,OPENING_TEST_REPORT,SITE_FLOW_TEST,RESOURCE_LIFECYCLE,FRAME_TIMINGS}
docs/art-direction/SITE_STYLEFRAME_EXTENSIONS.md
```

Phase 1 的 `src/styleframes/**` 与 `docs/art-direction/` **未改**（`parts.tsx` 仅启用全部板材并加 `loading` 参数；`ASSET_REGISTER.md` 只做文件名与验收状态的事实更新）。

## 3. 不得擅自更改的决策

1. 字标是 `wordmark.ts` 的图元构造，不是字体文本。
2. Hero 构图：字标 101.9vw、材质板 67.3vw / y=96、基线 580；cover 线稿必须与它同坐标（`heroGeometry.ts`）。
3. 开场两门禁：绘制完成 + 真实资源 ready，缺一不揭幕；不显示百分比。
4. 章节不加新颜色/圆角/阴影；深色只用于 Works。
5. 详情节不换路由、不做整页重排：FLIP + 覆盖层，关闭还原滚动与焦点。

## 4. 验证命令与结果

```bash
cd morton-v2
npm ci                 # 或 npm install（PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1）
npm run typecheck      # exit 0
npm run build          # exit 0 · JS 330.74 kB (gzip 106.95 kB) · CSS 35.64 kB (gzip 7.07 kB)
node scripts/qa.mjs --no-video   # 46 张截图 + qa-raw.json，problems 0
node scripts/check-phase1.mjs    # Phase 1 交付物仍在位（28/28）
```

结果摘要（1440×900 / 390×844）：

| 指标 | 值 |
|---|---|
| 绘制 / 换气 / 揭幕 | 1087 / 61 / 622 ms（390：1110 / 62 / 621） |
| mount→hero | ≈1.77 s（390：≈1.79 s） |
| p95 帧 | 16.7–16.8 ms；最大帧 83–100ms **全部在 boot 阶段** |
| console / pageerror / 网络失败 | 0 / 0 / 0 |
| 横向溢出 | 0（五视口） |
| 晚就绪 | built 后停留 1749 ms 才揭幕 |
| reduced motion | 70 ms 直接到 hero |
| 详情开关 ×5 | scroll 5352 不变、焦点回来源卡、DOM 恒 304 节点 |

## 5. 素材与许可

- 九张材质板：程序化原创（numpy + Pillow），**非真实作品摄影**；已转 progressive JPEG，登记在 `ASSET_REGISTER.md`。
- 字体：Bodoni Moda / Archivo / Cormorant Garamond / Jost，均 SIL OFL 1.1。
- 未使用任何参考站的图片、logo、源码或文案；参考研究截图只在 gitignore 的 `.tmp-ref/`。

## 6. 已知问题与 `UNVERIFIED`

**已知问题**
1. cover 的 `will-change` 在揭幕期间会生成两个全屏合成层；低端机需复测。
2. boot 阶段有 83–100ms 长帧（模块求值 + 首帧解码），当前被静止封面遮住。
3. 移动端详情的 `Back to works` 不是 sticky。
4. 全部章节内容是显式占位符，**不能当真实履历**。
5. `?gateDelay=` 是**测试用**真实延迟钩子（会真的等待），不是生产功能；生产环境没有它也不会伪造进度。

**`UNVERIFIED`**
- 真实手机 / iOS Safari（`100svh`）/ Android Chrome。
- Safari / Firefox：`mix-blend-mode`、`color-mix()`、`aspect-ratio` 的行为。
- 内存：无堆快照、无强制 GC、无 10 分钟长驻留；只声称"未观察到累积"。
- 慢速 CPU（4x throttle）与冷缓存下的揭幕帧率。
- 真实内容替换后的版面稳定性。

## 7. 下一阶段（用户驱动）

1. 用户看真实运行与录屏，给出**美术/开场/骨架**三层的具体意见。
2. 真实内容（照片、作品、经历、联系方式）替换占位符 → 复核 `object-position` 与版面。
3. 若需要上线：接静态托管（`vite build` + `base:'./'` 已就绪）、补 `og:` 元信息与 sitemap。
4. 若需要更强的开场：把 boot 长帧拆包、把 cover 的合成层在低端机降级。
