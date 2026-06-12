# API-SPEC — portal（OpenAPI 3.1 线协议）

# 设计规格（目标）。词汇见 domain-model.md · 行为见 logic.md · 与当前代码差距见 gap-analysis.md。
# operationId 是与 logic.md 互联的 join key。
#
# 信封（团队标准 @cloud/request）：成功体 { code:"OK", message:"success", traceId, data }；
# 错误体 { code, message, traceId }，code 为数字串注册码（103NNN 家族；challenge/nonce 等新条件需补注册）。
# x-authorize：portal 全是登录前/登录中流程，只有 `public` 与 `any authenticated`（持 pep-token 中间态）。

openapi: 3.1.0
info:
  title: portal API（登录入口 / 选择 Party）
  version: 1.0.0
  description: |
    统一登录入口：取 challenge → 密码登录(按 email) →（可选）MFA → 选择 Party → 按 portalUrl 进控制台。
    词汇：domain-model.md · 行为：logic.md。
servers: [{ url: /api }]
tags:
  - { name: auth, description: 登录 / MFA / 选 Party }

paths:
  /auth/login-challenge:
    get:
      operationId: getLoginChallenge
      summary: 取登录 challenge（服务端时间戳 + 一次性 nonce）
      tags: [auth]
      x-authorize: public
      responses:
        '200':
          description: 时间戳与 nonce；nonce 单次有效，需放入加密登录包
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/SuccessBody'
                  - type: object
                    required: [data]
                    properties:
                      data:
                        type: object
                        required: [serverTimestamp, nonce]
                        properties:
                          serverTimestamp: { type: integer, description: 服务端毫秒时间戳 }
                          nonce: { type: string, description: 一次性随机串，登录时 GETDEL 消费 }

  /auth/password:
    post:
      operationId: login
      summary: 密码登录（按 email，公钥加密 {password,timestamp,nonce}）；按 mfaEnable 分岔
      tags: [auth]
      x-authorize: public
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/LoginRequest' }
      responses:
        '200':
          description: 需 MFA 返回 tempToken；否则返回登录收尾结果（进控制台 / 选 Party / 无公司）
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/SuccessBody'
                  - type: object
                    required: [data]
                    properties:
                      data: { $ref: '#/components/schemas/LoginResult' }
        '400': { $ref: '#/components/responses/Error' }   # 入参缺失 / 解密失败 / 时间戳超窗或 nonce 失效
        '401': { $ref: '#/components/responses/Error' }   # 账号或密码错误（不存在与密码错归一）
        '403': { $ref: '#/components/responses/Error' }   # 账号已锁定(LOCKED) / 刷错锁定中

  /auth/mfa:
    post:
      operationId: verifyMfa
      summary: MFA 二次校验（mfaToken + 6 位 TOTP，step=60，轮询多因子）
      tags: [auth]
      x-authorize: public            # 凭一次性 tempToken
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/MfaVerifyRequest' }
      responses:
        '200':
          description: 校验通过，返回登录收尾结果
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/SuccessBody'
                  - type: object
                    required: [data]
                    properties:
                      data: { $ref: '#/components/schemas/SettleResult' }
        '401': { $ref: '#/components/responses/Error' }   # tempToken 失效/用户态无效 · 验证码错 · 入参非法
        '409': { $ref: '#/components/responses/Error' }   # 未配置 MFA（无 ACTIVE 因子）
        '423': { $ref: '#/components/responses/Error' }   # MFA 锁定（10 次/60min）

  /auth/select-party:
    post:
      operationId: selectParty
      summary: 选定登录 Party，算权限上下文并返回 portalUrl
      tags: [auth]
      x-authorize: any authenticated   # 需 pep-token 中间态（未选 Party）
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/SelectPartyRequest' }
      responses:
        '200':
          description: 选定成功，返回该 Party 控制台地址
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/SuccessBody'
                  - type: object
                    required: [data]
                    properties:
                      data: { $ref: '#/components/schemas/PartyEntry' }
        '400': { $ref: '#/components/responses/Error' }   # 缺 partyId / partyId 不在可选列表
        '401': { $ref: '#/components/responses/Error' }   # 无 pep-token 中间态

  /auth/logout:
    post:
      operationId: logout
      summary: 销毁会话
      tags: [auth]
      x-authorize: public
      responses:
        '200':
          description: 已登出，返回登录页跳转
          content:
            application/json:
              schema:
                allOf:
                  - $ref: '#/components/schemas/SuccessBody'
                  - type: object
                    required: [data]
                    properties:
                      data:
                        type: object
                        required: [redirectTo]
                        properties: { redirectTo: { type: string, example: /login } }

  # 邀请入驻 / 找回密码 / OIDC：目标域已有数据支撑（domain-model.md），但 API 规格待评审，暂不在此定义。

components:
  responses:
    Error:
      description: 错误信封 { code, message, traceId }
      content:
        application/json:
          schema: { $ref: '#/components/schemas/ErrorBody' }
  schemas:
    SuccessBody:
      type: object
      required: [code, message, traceId]
      properties:
        code: { type: string, const: OK }
        message: { type: string, const: success }
        traceId: { type: string, example: BIZ-xxxxxx }
    ErrorBody:
      type: object
      required: [code, message, traceId]
      properties:
        code: { type: string, description: 数字串注册码, example: "103002" }
        message: { type: string, example: 账号或密码错误 }
        traceId: { type: string, example: BIZ-xxxxxx }

    LoginRequest:
      type: object
      required: [email, encryptedPassword]
      properties:
        email: { type: string, format: email, description: 登录标识 }
        encryptedPassword:
          type: string
          description: 'RSA-OAEP 公钥加密的密文，明文为 { password, timestamp, nonce } 的 JSON'
    MfaVerifyRequest:
      type: object
      required: [mfaToken, code]                 # 沿用现有代码字段名（非 tempToken）
      properties:
        mfaToken: { type: string, description: login 返回的一次性票据 }
        code: { type: string, minLength: 6, maxLength: 6, description: 6 位 TOTP }
    SelectPartyRequest:
      type: object
      required: [partyId]
      properties:
        partyId: { type: integer, minimum: 1 }

    # --- 响应 data ---
    PartyRef:
      type: object
      required: [partyId, partyName, status]
      properties:
        partyId: { type: integer }
        partyName: { type: string }
        status: { type: string, enum: [ONBOARDING, ACTIVE] }   # PartyStatus
    PartyEntry:                          # 选定/单一 Party 后的进入信息
      type: object
      required: [portalUrl]
      properties:
        portalUrl: { type: string, description: 该 Party 控制台地址，前端跳转 }
        permissions: { type: array, items: { type: string } }
        contractTypes:
          type: array
          items: { type: string, enum: [ADMIN, US-ISO, US-ISV, US-ISO-PILOT, US-ISV-PILOT, MERCHANT, PLATFORM-CUSTOM] }
    MfaRequiredResult:                       # 沿用现有 { mfaRequired } 形态，避免与信封顶层 code 撞名
      type: object
      required: [mfaRequired, mfaToken]
      properties:
        mfaRequired: { type: boolean, const: true }
        mfaToken: { type: string, description: 换取 MFA 校验的一次性票据（TTL 300s） }
    SettleResult:                        # 登录收尾：三选一
      oneOf:
        - { $ref: '#/components/schemas/PartyEntry' }                # 恰好 1 个可选 → 直接进控制台
        - type: object                                              # >1 个 → 列表待选
          required: [parties]
          properties:
            parties: { type: array, items: { $ref: '#/components/schemas/PartyRef' } }
        - type: object                                              # 0 个 → 无公司
          required: [noCompany]
          properties:
            noCompany: { type: boolean, const: true }
      description: 0 个可选→noCompany；1 个→PartyEntry 直达；>1 个→parties 列表
    LoginResult:
      oneOf:
        - { $ref: '#/components/schemas/MfaRequiredResult' }
        - { $ref: '#/components/schemas/SettleResult' }
      description: mfaEnable=true 返回 MfaRequiredResult，否则返回 SettleResult

# =====================================================================
# 与现有代码命名 / 约定的对齐分析（差距）
# =====================================================================
#
# 依据：现有路由 apps/portal/app/api/auth/*、auth.schema.ts 字段、.claude/docs/api-and-requests.md。
# 判定：✅已对齐(本稿已采现有名) · ➡️目标改名(随 schema/决议有意改) · ⚠️待团队定。
#
# | 规格中的名称 | 现有代码 | 判定 | 说明 |
# |---|---|---|---|
# | 字段 `mfaToken` | `mfaToken`(auth.schema.ts) | ✅ | 新 domain 文档曾写 tempToken，本稿已回退为现有 `mfaToken` |
# | MFA 分岔返回 `{mfaRequired:true}` | `{mfaRequired,mfaToken}` | ✅ | 原拟 `{code:'MFA VERIFY'}` 会与信封顶层 `code:"OK"` 撞名，已回退 |
# | 路径 `/auth/password`、`/auth/mfa`、`/auth/logout` | 同 | ✅ | 路径与现有一致（注意 schema 注释里的 /auth/login、/auth/mfa-verify 是过时注释，以实际目录为准） |
# | 字段 `code`(TOTP，6 位) / `encryptedPassword` | 同 | ✅ | 一致 |
# | 字段 `email`(登录标识) | `account` | ➡️ | 登录改按 email 是已定决议；字段由 `account`→`email`，语义同步收紧 |
# | 路径 `/auth/select-party`、opId `selectParty` | `/auth/select-partner`、`selectPartner` | ➡️ | Partner→Party 全局改名的一部分，随重命名一起落 |
# | 入参 `partyId` | `partnerId` | ➡️ | 同上 |
# | Party 进入字段 `portalUrl` | 现有统一 `redirectTo` | ➡️/⚠️ | `portalUrl` 是 Party 存储字段、语义独立，建议保留；但“前端最终导航”的字段名是否仍统一叫 `redirectTo`，待定 |
# | 路径 `/auth/login-challenge`、opId `getLoginChallenge` | `/auth/server-time`、内联 getServerTime | ⚠️ | 语义扩展（加 nonce、写 Redis）。两条路：①保留 `/auth/server-time` 路径、响应加 `nonce`（最小改动）；②改名 `/auth/login-challenge`（更达意）。建议倾向①以减少前端改动，待团队定 |
# | 状态码 `423`(MFA 锁定) | 代码现也抛 423 | ⚠️ | **与 api-and-requests.md 冲突**：该文档约定 BusinessError `status 限 400|401|403|404|409|422`，423 在集合外（虽 BusinessError 运行期接受）。需二选一：把 423 纳入约定，或改用 429/403 表达“锁定/稍后再试” |
# | 错误码族 `103NNN`(ERR_AUTH_*) | 同 | ✅/➡️ | 沿用现有注册表；新条件需补码 + 三语文案：challenge/nonce 失效、selectParty 的 partyId 非法、（若 email 登录新增的）账号锁定语义 |
# | 响应辅助 `successResponse()` / 信封 `{code,message,data,traceId}` | 同 | ✅ | 一致；logout 现返回 `{redirectTo}`+200（非 204），保持 |
#
# 结论：本稿已就「纯命名分歧」回退到现有代码命名（mfaToken、mfaRequired）。
# 余下三类待落：➡️ 随 Partner→Party 重命名统一改（email/select-party/partyId）；
# ⚠️ 需团队定两点——login-challenge 路径是否改名、MFA 锁定 423 与状态码约定的冲突。
