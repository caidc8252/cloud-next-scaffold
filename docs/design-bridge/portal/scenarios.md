# Scenarios — portal（登录入口 / 选择 Party）

登录、MFA、选择 Party 的验收场景（用户可观察的结果）。词汇见 `domain-model.md`，行为见 `logic.md`，线协议见 `api-spec.md`。本文件是该特性的黑盒验收门。

## Scenario: 取登录 challenge
Exercises: `getLoginChallenge`
**Given** 我在登录页
**When** 页面请求登录 challenge
**Then** 拿到一个服务端时间戳和一个一次性 nonce
**And** 该 nonce 只能被一次登录消费

## Scenario: 无 MFA、单一可选 Party，直接进控制台
Exercises: `login`
**Given** 我是一个 `mfa_enable=false` 的 ACTIVE 用户，恰好属于 1 个可登录 Party（成员 ACTIVE、授权窗有效、Party 非 ONBOARDING）
**When** 我用正确的 email 与密码登录
**Then** 登录成功
**And** 我被带到该 Party 的 `portalUrl` 控制台
**And** 我看到的菜单 = 该 Party 当前契约点亮的菜单

## Scenario: 邮箱不存在与密码错误给同一提示（防枚举）
Exercises: `login`
**Given** 我在登录页
**When** 我用一个不存在的 email，或用存在但错误的密码登录
**Then** 两种情况都得到同一个「账号或密码错误」提示
**And** 无法从提示区分该 email 是否注册

## Scenario: 账号被平台锁定
Exercises: `login`
**Given** 我的账号 `status=LOCKED`
**When** 我用正确密码登录
**Then** 登录被拒，提示「账号已锁定」

## Scenario: 连续错误密码触发刷错锁
Exercises: `login`
**Given** 我已连续输错密码到第 6 次
**When** 我再次尝试登录
**Then** 登录被拒，提示「密码错误超限，稍后再试」
**And** 该锁在 60 分钟后失效
**And** 锁失效后第一次再输错会立即重新锁定 60 分钟

## Scenario: 登录包过期或被重放
Exercises: `login`
**Given** 我拿到的 challenge 已超过 120 秒，或该 nonce 已被用过一次
**When** 我提交这个登录包
**Then** 登录被拒，提示「登录已失效，请重试」

## Scenario: 开启 MFA 的用户需二次校验
Exercises: `login`
**Given** 我是一个 `mfa_enable=true` 的用户
**When** 我用正确的 email 与密码登录
**Then** 我尚未进入控制台
**And** 我被要求进行 MFA 校验（拿到一次性 mfaToken）

## Scenario: MFA 校验通过
Exercises: `verifyMfa`
**Given** 我已通过密码、持有有效 mfaToken，且有一个 ACTIVE 的 TOTP 因子
**When** 我输入正确的 6 位验证码
**Then** 校验通过，按可选 Party 数进入控制台 / 选择页 / 无公司页
**And** 该 mfaToken 立即失效，不能再用

## Scenario: 多个 ACTIVE 因子，任一正确即通过
Exercises: `verifyMfa`
**Given** 我有多个 ACTIVE 的 TOTP 因子
**When** 我输入其中任意一个因子的正确验证码
**Then** MFA 校验通过

## Scenario: MFA 验证码错误并最终锁定
Exercises: `verifyMfa`
**Given** 我持有有效 mfaToken
**When** 我输入错误的验证码
**Then** 提示「验证码错误」
**And** 当错误累计到 10 次（锁窗内）后，提示「错误过多，60 分钟后再试」
**And** 锁窗过去后可重新尝试

## Scenario: 用户开了 MFA 但没有可用因子
Exercises: `verifyMfa`
**Given** 我 `mfa_enable=true` 但没有任何 ACTIVE 的 TOTP 因子
**When** 我进入 MFA 校验
**Then** 提示「未配置 MFA」
**And** 我不会被放行进入系统

## Scenario: 多个可选 Party，需选择
Exercises: `login`、`selectParty`
**Given** 我通过登录（及 MFA），且有多于 1 个可登录 Party
**When** 登录收尾
**Then** 我看到一个可选 Party 列表
**When** 我选定其中一个 Party
**Then** 我被带到该 Party 的 `portalUrl` 控制台

## Scenario: 选择不在可选列表中的 Party
Exercises: `selectParty`
**Given** 我处于「已登录、未选 Party」中间态
**When** 我提交一个不在我可选列表里的 partyId
**Then** 操作被拒，要求重新登录

## Scenario: 没有任何可登录 Party
Exercises: `login`
**Given** 我登录成功，但没有任何成员 ACTIVE 且授权窗有效的非 ONBOARDING Party
**When** 登录收尾
**Then** 我看到「你还没加入任何公司」并有退出按钮

## Scenario: 合同过期的 Party 仍可登录但无权限
Exercises: `selectParty`
**Given** 我唯一可登录的 Party 其契约已全部过期或 SUSPENDED
**When** 我进入该 Party
**Then** 我能登录进去
**And** 我没有任何业务权限、看不到业务菜单
**And** 我看到「合同已过期/暂停」落地页，而不是空白控制台

## Scenario: ONBOARDING 状态的 Party 不出现在可选列表
Exercises: `login`
**Given** 我在一个尚未绑定首个管理员（`status=ONBOARDING`）的 Party 下有成员记录
**When** 我登录并查看可选 Party
**Then** 该 ONBOARDING Party 不出现在我的可选列表中

## Scenario: 未选 Party 的中间态不能访问业务接口
Exercises: `selectParty`
**Given** 我已登录但还没选定 Party（持中间态 `pep-token`）
**When** 我尝试调用任何业务 API
**Then** 请求被拒
**And** 我只能调用「选择 Party」

## Scenario: NORMAL 用户的有效权限是角色与菜单作用域的交集
Exercises: `selectParty`
**Given** 我在某 Party 下是 `NORMAL` 授权，绑定的角色含若干权限码
**When** 我进入该 Party 控制台
**Then** 我的有效权限 = 角色权限码 ∩ 当前契约点亮的菜单作用域
**And** 角色里超出当前契约菜单范围的权限码不生效

## Scenario: ADMIN 授权用户拥有该 Party 全部权限
Exercises: `selectParty`
**Given** 我在某 Party 下是 `AuthorizingType=ADMIN`
**When** 我进入该 Party 控制台
**Then** 我拥有当前契约作用域内的全部权限，无需逐一配置角色

## Scenario: 登出
Exercises: `logout`
**Given** 我已登录
**When** 我登出
**Then** 我的会话失效
**And** 我被带回登录页
**And** 未登录状态下再次登出也安全返回登录页
