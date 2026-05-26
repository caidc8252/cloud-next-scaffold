<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->



# AI 行为准则

本文档用于定义 AI 在本项目中的行为和遵循的规范。

## 总则

- 我们的目标是开发稳定可靠的产品
- 所以我们要追求：
    - 代码效率
    - 架构稳定
    - 可维护可复用
- 要勇于指出我的错误，当我的要求与上面的目标冲突时，直截了当跟我沟通
- 也要积极帮我思考，找出不同方案间的优劣和 trade off，帮我重塑决策
- 不要过度防御，不要为了兜底而兜底，马奇诺防线没有意义
- 约定大于配置，代码大于文档


## 文档

### 文档原则

- 只保留必要文档
- 在你开始各种工作时，请确保你已经了解各种文档记录的内容
- 文档内容应精准、及时更新
- 重要信息要精确精简，避免冗余
- 随时清理 TODO.md 和 WIP.md
- 及时维护 README.md 保证通过阅读这个文档可以无卡点的配置，启动项目。能够快速了解项目的结构和大体逻辑

### 常规文档

- README.md - 项目描述和使用指南
- DEPLOYMENT.md - 部署指南
- DEV_NOTE.md - 开发过程中积累的需要长期关注的事情，比如框架新知识、环境配置等
  - 记录决策依据和最后决策，不需要详细记录做了什么
  - 记录本项目中积累的基建、框架知识，避免日后重复踩坑
  - 需要经常 review 此文档，作为日常知识储备

### 临时文档

- WIP.md - 开发计划、任务分解、待办事项等，主要面向中短期
- TODO.md - 长期开发计划，未来要做的事情

## 开发流程

- 拿到一个任务，先做计划，分解任务，列出 todo，写入 WIP.md
- 针对目标编写测试用例
- 逐项完成 todo，并确保测试通过
- 如有需要，记录文档以备不时之需
- 测试通过，验收完成之后，清理文档，将重要事项并入常规文档
- 涉及到项目配置的部分，需要确认 在 windows linux 下都能正常工作

## 开发指南

### 目录约定

- 登录前页面放在 `apps/web/app/(public)`
- 登录后的后台页面放在 `apps/web/app/(portal)`
- API 路由放在 `apps/web/app/api`
- 共享服务端逻辑优先放在 `apps/web/lib` 或 `packages/*`
- 当前基线已经把后台壳子接在 `app/(portal)` 上，大多数业务页面默认加在这里

### 共享能力复用

- `packages/*` 是项目级共享能力，开始实现前先检查现有包和导出，优先复用，避免在 `apps/*` 里重复造轮子
- 除非明确确认现有能力不满足需求，否则不要在业务代码里重新实现一套相同职责的工具、组件、鉴权、请求封装或数据库访问逻辑
- 需要新增共享能力时，先判断它是否应该沉淀到 `packages/*`；如果只是当前业务页面私有逻辑，优先放在业务目录，不要过早抽公共层
- 默认先通过包导出和源码快速了解能力边界，再开始编码；如果已有同职责实现，优先接入而不是平行再写一份
- 当前包职责可以先按下面理解：
  - `@cloud/ui`：共享 UI 组件、布局组件、主题能力、通用样式工具
  - `@cloud/request`：客户端请求封装、服务端响应辅助、错误码和错误提示
  - `@cloud/permissions`：权限判断、服务端权限聚合、服务端权限守卫、客户端权限上下文
  - `@cloud/db`：Prisma Client、数据库 schema、seed、数据库脚本入口
  - `@cloud/security`：服务端密码哈希与校验等安全基础能力
  - `@cloud/storage`：Amazon S3 上传会话、浏览器直传、服务端上传和存储配置归一化
  - `@cloud/config`：环境变量读取、配置校验、密码策略等基础配置能力

### 存储与 S3

- 连接 Amazon S3、生成临时上传凭证、服务端上传文件时，统一通过 `@cloud/storage/server`
- 浏览器直传 S3 时，统一通过 `@cloud/storage/client`，大文件分片上传也在此包内处理
- 默认上传策略：`<= 5 MB` 的浏览器文件可走服务端 `uploadFileToS3FromServer()`，`> 5 MB` 走 `createS3UploadSession()` + `uploadFileToS3FromBrowser()` 直传；直传中 `> 100 MB` 默认 multipart
- 不要在业务代码里直接 new AWS SDK 的 `S3Client` / `STSClient`，除非先确认 `@cloud/storage` 无法覆盖需求并同步沉淀包能力
- S3 配置由业务侧从环境变量读取后显式传入 storage package，storage package 不直接读取 `.env`

### 页面开发

- 新增后台页面时，优先在 `apps/web/app/(portal)` 下创建路由目录和 `page.tsx`
- App Router 页面组件默认使用服务端组件，除非有明确交互需求再加 `"use client"`
- 只需要登录态的页面，调用 `requireSession()`
- 页面本身有明确权限要求时，优先调用 `requirePermissions()`，不要只在前端做按钮显隐

### 菜单约定

- 当前菜单来自数据库 `menu` 表，不是写死在前端
- 相关模型优先查看 `packages/db/prisma/schema.prisma` 和 `packages/db/prisma/seed.ts`
- 新增默认菜单时，优先修改 seed，再执行 `pnpm db:seed`
- 临时调试可以使用 `pnpm db:studio` 直接改表
- 菜单要可访问，必须同时满足：
  - `path` 对应页面已存在
  - 菜单绑定到当前用户角色对应的 `roleId`

### 鉴权与权限

- 登录态与权限守卫优先直接从 `@cloud/permissions/server` 引入，不要在业务代码里继续写很深的相对路径
- `apps/web/lib/auth.ts` 目前只保留兼容导出，默认不要作为新代码入口
- `getSession()` 用于读取会话，未登录时返回 `null`
- `requireSession()` 用于强制登录，未登录时会跳转并清理状态
- `assertPermissions()` 用于接口 / Route Handler 的服务端权限校验
  - 未登录时抛 401
  - 已登录但缺权限时抛 403
- `requirePermissions()` 用于 page / layout / Server Action 的服务端权限校验
  - 未登录时跳转登出链路
  - 已登录但缺权限时跳转 `/403`
- `packages/permissions` 已承载：
  - 登录态读取与 session 聚合
  - 服务端权限守卫
  - 客户端权限上下文与 UI 级判断
- 前端权限控制只能用于体验层，不是安全边界
  - 隐藏按钮、菜单可以放在前端
  - 真正的读写保护必须落在服务端守卫上
- 后端接口不要只做 `getSession()` 判断后直接执行敏感操作
  - 只要接口存在明确权限要求，优先改为 `assertPermissions()`
- 页面不要只靠 layout 或客户端组件兜权限
  - 权限判断要尽量贴近实际页面和数据入口
- 当前默认权限模型已经包含 `permission` 表，以及 `role -> permission -> menu` 聚合链路
- 如果要新增细粒度权限，优先保持下面这条链路一致：
  - `packages/db/prisma/seed.ts` 补权限码
  - 角色绑定权限
  - 页面、接口接入对应的服务端守卫

### 接口与请求

- 统一通过 `packages/request` 发起请求
- 客户端使用 `@cloud/request/client`
- 服务端响应优先使用 `@cloud/request/server` 提供的响应辅助函数
- 新增接口时，优先放在 `apps/web/app/api/*`
- Route Handler 默认同时做两层判断：
  - 登录态 / 权限：优先用 `assertPermissions()`
  - 业务归属校验：例如 `entityId`、`roleId`、`userId` 是否属于当前租户
- 不要把“前端看不到入口”当作接口安全前提

### 默认开发链路

1. 在 `app/(portal)` 下新增页面
2. 在 `packages/db/prisma/seed.ts` 或数据库里补齐菜单
3. 判断页面是“只需登录”还是“需要明确权限”
4. 页面分别接 `requireSession()` 或 `requirePermissions()`
5. 在 `app/api/*` 下新增接口
6. 接口优先用 `assertPermissions()` 做服务端权限守卫
7. 前端通过 `@cloud/request/client` 调接口
8. 最后再补客户端的按钮显隐和交互细节




## 代码规范

- 除非专门提及，否则默认使用 TypeScript，尽可能把类型写好
- 除非特地指出，否则不要修改 `packages/*` 下面的代码
- 不要用 JSDoc，用 TypeScript 类型系统，不要 `any`
- 命名
  - 变量和函数使用驼峰命名法（camelCase）
  - 类和接口使用帕斯卡命名法（PascalCase）
  - 常量使用全大写加下划线（UPPER_SNAKE_CASE）
  - 文件和目录使用小写加连字符（kebab-case）
  - 避免使用缩写，除非是广泛认可的缩写
  - 函数使用动词或动宾短语命名，类使用名词命名，bool 变量使用 is/has/can 开头
- 单组件、库、脚本的长度不要超过 400 行，尽量控制在 300 行附近
- 适量注释，配置项、变量要足够



## 安全

<!-- - 不要访问项目里面的 .env 文件 -->
- 如果你需要做一些操作，必须 .env，可以通过编写脚本，由我运行。比如，你要从数据库同步一些数据当作参考，就可以这么做。

## 数据库

如果数据库的 key 名没有重复和歧义，尽量保持所有的表一致。
数据的关联关系大部分都是通过关联关系表进行查询。 除非是为了性能优化，且 关联关系值为单值。 数组是不行的 
