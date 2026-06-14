# 消息通知（notice-message）— Business Logic

> 本功能**整体业务规则**的单一真源。各层只放各层的事，避免重复：
> 实体/字段/枚举/不变量 → `domain.md`；wire 契约 → `api-spec.yml`；接口/生产者机制 → `api-logic.md`；落地调用手册 → `.claude/docs/notice.md`。

## 1. 功能定位
站内通知是**通用基础设施**：业务在「值得告知某用户的事件」发生时，写一条站内消息；用户在顶栏铃铛 + 列表页 + 详情页查看并标记已读。每条通知都对应一个具体业务事件，不承载营销/装饰内容。

## 2. 角色与权限
- **收件人**：任意已登录用户，只读 / 只改**自己的**通知（`authenticated`，无特定权限码）。
- **生产者**：服务端业务流程（非用户角色），经内部 `createNotice` 写入；**无对外建通知 API**（防伪造他人通知）。

## 3. 作用域（贯穿所有读写）
用户只见/只改满足「`userId = 本人` 且 `belongToPartyId = 当前 party 或 全局(NULL)`」的通知。**列表 / 未读数 / 标记已读三者同一口径**；切 party 时 party 类可见集随之变、**全局(null)类恒可见**。（精确 where 见 `api-logic.md`「贯穿作用域」。）
- **不跨 party 显示，是有意的安全选择**：能看到的非 null 通知必属当前 party，其业务链接在当前上下文打开、永远匹配——杜绝「在 B 公司里对着 A 公司的记录误操作」。全局(null)通知是账号级（如密码重置），不绑 party 业务，也无错配。
- 代价「会漏其它 party 的通知」由 §「跨 party 未读提示」补救，**不靠把别 party 通知混进当前收件箱**。

## 4. 通知生命周期
- `created(UNREAD)` →（打开详情，或点「标记已读 / 全部已读」）→ `READ`。
- **单向**（仅 UNREAD→READ）、**幂等**（重复标记无副作用）、**只读化不可逆**。
- **本期不做**：dismiss / 删除 / mark-unread / 保留清理。

## 5. 生产规则（createNotice）
- **唯一入口、服务端内部**；任一业务域 / 任一 app 的服务端均可调用，**跨 app 写同一 `sys_notice` 表**（如 portal 入驻完成 → 通知 admin 侧邀请人）。禁止业务里直接 `prisma.sysNotice.create` 或另开建通知接口。
- `payload` **必含 `summary`**；`noticeType` 必给、约定 `"<module>.<event>"`。写一行 `UNREAD`，**写后不可变**（只 mark-read）。
- **埋点非阻断**：在业务事件点 `try/catch` 调用，失败仅 `log.warn`、**不影响主流程返回、不回滚**（通知是副作用，不是业务事务的一部分）。
- 「哪些业务事件 → 产生哪种通知」是**产品决策、逐个增量接**（候选与配方见 `api-logic.md`「反应/埋点」+ `.claude/docs/notice.md`）。已接：`account.passwordReset`（管理员重置他人密码 → 通知该用户）。

## 6. 语言策略（数据定语言 / 外壳按界面语言）—— 本功能关键规则
- **生产者内容**（`title` / `summary` / `detail` / `fields[].value` / `links[].label`）：登记程序按**收件人 `sys_user.locale`**（用 `isLocale()` 收窄、未知回退 `en`）经 `getTranslations({ locale })` 渲染好再存；**展示端原样、不再翻译**。前提：一行只对一个收件人，创建时其语言已知（**不能**用 cookie 版译者——收件人语言 ≠ 当前请求者）。
- **结构标签**（`fields[].key` → `notifications.fields.<key>`，缺译显原始 key；module chip；界面文案）：**展示时**按当前界面语言 i18n。
- 一句话：通知里的「数据/叙述」语言在**创建时定死**，「外壳/标签」随**界面语言**。

## 7. 模块分类（module）—— 仅展示，不入业务
`noticeType` 前缀派生 `module`（ticket / customer / app / order / account…），决定图标 / 颜色 / 类型 chip / 列表筛选。**不落库、业务无感**；未知前缀 → `default` 通用图标 + 中性色。新增一类只动前端 `notice-meta.ts` 的 `MODULE_META` + 三语 `notifications.module.<m>`。

## 8. 跳转策略（links）
业务跳转 URL 由**生产者发通知时拼好**（同 app 存相对路径、跨 app 存绝对 URL）。行 / 铃铛点击 → 进**通知详情页** `/notifications/[id]`（按通知 id，非业务跳转）；**详情里点 `links` 才跳业务**：同源走软导航、跨源整页跳，跳转前同源 / 白名单校验挡开放重定向。

## 9. 列表与铃铛行为
- **列表页**：服务端**数据库分页**（每页默认 25、上限 100）+ 服务端筛选 `status` / `module` / `q`（标题+summary）；最新在前；支持 CSV 导出。
- **铃铛**：取 top-N 未读、按 Today / Earlier 分组；角标 = 未读数；标记已读后角标 / 列表 / 详情同步。

## 9b. 归属标识（列表/详情必显、铃铛轻量）
每条通知标注其来源，避免用户误判：
- **全局/系统（`belongToPartyId = null`）** → 标识 `notifications.party.system`（en `System` / zh `系统` / ja `システム`）。系统/管理员对你账号本身发的。
- **party 类（非 null）** → 标识 = **当前平台名 `session.partyName`**（因可见的非 null 必属当前 party，无需 join 取名）。
- **列表 + 详情必须明确显示**该标识；**铃铛**对 null 给一个**小标记**即可（party 类可不显）。

## 9c. 跨 party 未读提示（“别漏”补救）
**party 切换器**（切换公司入口）对「有未读 party 类通知」的 party 显红点/计数，让用户知道别的 party 有未读、无需逐个切进去看。
- 数据：`unreadCountByParty`——`count WHERE userId=本人 AND status=UNREAD AND belongToPartyId IS NOT NULL GROUP BY belongToPartyId`。**仅按 `userId` 收窄、不受当前 party 限制**（这是唯一有意跨 party 的查询；安全位仍是 userId）。
- 全局(null)未读**不计入**切换器（它在任一 party 恒可见、不会漏）。
- 客户端经 `NotificationsProvider` 取 `unreadByParty`，切换器据此渲染红点。

## 10. 硬约束
本功能的不变量（只读改自己的、三读写口径一致、mark-read 幂等单向、payload 必含 summary、生产者内部化、module 不落库、语言固化）以 **`domain.md` §Invariants** 为准，本文不另列以免漂移。

## 实现位置
服务端 `apps/admin/service/notification/`（`server/{service,repository,mapper}` + `schemas` + `notification.scope.ts`）；客户端 `apps/admin/app/(portal)/notifications/*` + 顶栏铃铛 + `NotificationsProvider`；i18n `notifications.*`。
