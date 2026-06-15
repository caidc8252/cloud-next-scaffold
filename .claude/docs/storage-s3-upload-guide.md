# S3 文件上传与访问规范（AGENT 版）

本文是 AGENT 接入 S3 上传、访问、直传确认和业务绑定时的单一执行入口。硬边界以 `.claude/docs/storage-s3.md` 为准；写接口前同时读 `.claude/docs/api-and-requests.md`，接权限前读 `.claude/docs/auth-permissions.md`。

## 0. 先记住

- S3 能力统一走 `@cloud/storage/server` 和 `@cloud/storage/client`，业务代码不要直接 new AWS SDK。
- 配置由 app 侧读取并显式传入 storage package，`packages/storage` 不读 `.env`。
- 前端不决定 S3 目录，不传任意 `directory`。
- 正式业务接口由后端固定或推导 `uploadProfile`。
- 文件本体只落 `storage_object`；业务归属落业务表字段，单文件存 `storageObjectId`，多文件存 `storageObjectId[]`。
- 所有 `storage_object` 查询和业务表读写都必须带 `partyId = session.currentPartyId`。
- mutation 走 Route Handler，不用 Server Action。
- route 只做 HTTP 适配；权限、业务范围、绑定策略放 service / policy。
- 业务错误抛 `BusinessError` / `MiddlewareError`，成功响应走 `successResponse()` / `createdResponse()` / `noContentResponse()`。
- 公开文件只允许图片，必须 `contentType` 为 `image/*`，且 object key 在 `public/` 下。
- 私有文件不要返回固定 URL；下载前先校验租户和业务权限，再生成短期 signed URL。
- 直传完成必须 `HeadObject` 成功后才更新完成状态；不要信任前端传来的最终 metadata。

## 1. 现有实现位置

| 文件 | 作用 |
| --- | --- |
| `packages/storage/src/server/*` | S3 服务端能力：配置归一化、STS 临时凭证、服务端上传、HeadObject、CopyObject、DeleteObject、signed URL |
| `packages/storage/src/client/*` | 浏览器直传能力：PUT、multipart、进度、取消 |
| `apps/admin/lib/s3-upload-config.ts` | app 侧读取 S3 环境变量并传入 `@cloud/storage/server` |
| `apps/admin/lib/s3-upload-policy.ts` | 上传大小策略 |
| `apps/admin/lib/s3-upload-profiles.ts` | upload profile 到目录和可见性的映射 |
| `apps/admin/lib/storage-object-records.ts` | `storage_object` 入库、查重、临时上传、临时转正、下载查询 |
| `apps/admin/lib/storage-visibility.ts` | PUBLIC / PRIVATE 输入校验 |
| `apps/admin/app/api/storage/*` | 当前 demo / 底层示例 route；真实业务不要把空权限守卫照搬进生产域 |

新增业务能力优先落 `apps/<app>/service/<domain>/`。当前 `apps/admin/lib/storage-*` 是已有实现位置；重构或新增业务编排时不要继续把逻辑堆进 route。

## 2. uploadProfile

`uploadProfile` 是后端给文件用途起的业务名字，它决定 S3 目录和可见性。前端可以在 demo / 底层接口里传受控枚举；正式业务接口应该由后端固定或根据业务对象推导。

当前 profile：

| uploadProfile | directory | visibility | 用途 |
| --- | --- | --- | --- |
| `debug.private` | `debug` | `PRIVATE` | demo / 调试私有文件 |
| `temporary` | `tmp` | `PRIVATE` | 表单未保存前的临时文件 |
| `application.icon` | `public/applications/icons` | `PUBLIC` | 应用图标 |
| `application.image` | `public/applications/images` | `PUBLIC` | 应用展示图 |
| `application.package` | `applications/packages` | `PRIVATE` | 应用安装包 |

新增 profile 时：

1. 先确认文件用途：公开展示、私有下载、还是临时草稿。
2. 在业务 service / profile 映射里定义稳定枚举，不让前端传任意目录。
3. 公开资源目录必须是 `public` 或 `public/...`，并校验 `image/*`。
4. 私有资源不要放进 `public/`。
5. 临时目录使用 `tmp` 或 `tmp/...`，不要写 `/tmp`；S3 没有真正根目录，前导 `/` 会成为 key 的一部分。

推荐目录：

| 场景 | 目录 |
| --- | --- |
| 应用图标 | `public/applications/icons` |
| 应用展示图 | `public/applications/images` |
| 用户头像 | `public/users/avatars` |
| 应用安装包 | `applications/packages` |
| 合同文件 | `contracts/files` |
| 临时文件 | `tmp` |

## 3. 数据模型与绑定

### `storage_object`

`storage_object` 是文件本体表。历史列表、查重、下载、公开访问都以这张表为准。

关键字段：

| 字段 | 规则 |
| --- | --- |
| `partyId` | 租户隔离边界，所有查询必须带当前 `session.currentPartyId` |
| `bucket` / `regionId` / `objectKey` / `objectUrl` | S3 对象定位信息 |
| `originalFilename` / `contentType` / `sizeBytes` / `etag` | 文件展示和校验信息 |
| `contentHash` | SHA-256 hex，用于同租户去重 |
| `visibility` | `PRIVATE` 或 `PUBLIC` |
| `status` | `PENDING` / `TEMPORARY` / `ACTIVE` |
| `uploaderUserId` | 上传人 |

`visibility` 不是业务操作权限：

- `PRIVATE`：默认值。读取时必须走后端接口，校验登录态、权限、租户和业务范围后生成短期 signed URL。
- `PUBLIC`：公网可直接读取。当前项目只允许公开图片，要求 `contentType` 为 `image/*`，且 `objectKey` 必须在 `public/` 前缀下。

约束与索引：

- `partyId + bucket + objectKey` 唯一，避免同租户重复写同一个 S3 key。
- `partyId + contentHash + sizeBytes + status` 支撑去重查询。
- `partyId + status + creTime desc` 支撑列表。

### 业务关系

保留 `storage_object` 是硬边界；业务关系不要塞进文件本体表，也不要再引入通用文件归属表。

单值、强语义、读频繁的文件关系，可以直接在业务表存 `storageObjectId`：

```txt
app.icon_storage_object_id -> storage_object.storage_object_id
sys_user.avatar_storage_object_id -> storage_object.storage_object_id
```

写入业务表前必须校验被引用的 `storage_object`：

- 属于当前租户：`partyId = session.currentPartyId`
- 状态为 `ACTIVE`
- 符合业务可见性要求；图标、头像、公开展示图应为 `visibility = PUBLIC`
- 符合业务类型要求；公开展示图必须 `contentType` 以 `image/` 开头

多文件、可排序或多用途的关系，在业务表保存 `storageObjectId[]`：

```txt
app.image_storage_object_ids -> List<string>
contract.file_storage_object_ids -> List<string>
```

数组顺序就是展示顺序；调整排序时只更新数组顺序。写入数组前必须逐个校验 `storage_object` 属于当前 `partyId`、`status = ACTIVE`，并符合业务可见性、文件类型、最大数量和去重要求。读取数组时先从业务表取 id 数组，再按 `partyId + storageObjectId in (...) + ACTIVE` 查询 `storage_object`，最后按数组原顺序组装 DTO。

删除或解绑某个文件时，从业务表数组里移除对应 `storageObjectId`。是否删除 S3 对象由业务决定；如果同一文件仍可能被其他业务字段引用，不要立即删对象本体。

## 4. 上传策略

默认策略由 `apps/admin/lib/s3-upload-policy.ts` 定义：

- `<= 5 MB`：走服务端上传，接口接收 `FormData` 后调用 `uploadFileToS3FromServer()`。
- `> 5 MB`：走浏览器直传，服务端只签发上传会话，浏览器用临时 STS 凭证上传到 S3。
- 直传中 `> 100 MB` 默认走 multipart，阈值来自 `AWS_S3_MULTIPART_THRESHOLD_BYTES` 或 `@cloud/storage` 默认值。

### 服务端上传

适用于小文件。当前示例接口是 `POST /api/storage/s3-upload-server`。

流程：

1. Route 做服务端权限守卫；正式业务必须换成明确业务权限。
2. 正式业务接口读取 `file` 后由后端固定 profile；通用 demo 接口只允许读取受控枚举 `uploadProfile`。
3. 后端根据 profile 决定 `directory` 和 `visibility`。
4. 校验文件非空且不超过 `SERVER_S3_UPLOAD_THRESHOLD_BYTES`。
5. 通过 `validateStorageVisibilityInput()` 校验公开/私有规则。
6. 服务端计算 SHA-256 `contentHash`。
7. 按 `partyId + visibility + contentHash + sizeBytes + ACTIVE` 查重；命中则直接返回已有 `storage_object`。
8. 调用 `uploadFileToS3FromServer(getS3UploadConfig(), ...)` 上传到 S3。
9. 表单草稿上传写 `TEMPORARY`；无需表单确认的即时生效上传才写 `ACTIVE`。

### 浏览器直传

适用于大文件。当前示例接口组合是：

- `POST /api/storage/s3-upload-session`
- 浏览器调用 `uploadFileToS3FromBrowser()`
- `POST /api/storage/uploads/complete`

流程：

1. 客户端先用 `crypto.subtle.digest("SHA-256", ...)` 计算文件 hash。
2. 客户端可先调 `GET /api/storage/uploads/duplicate` 做查重，命中则无需上传。
3. 正式业务接口由后端固定 profile；通用 demo 接口创建直传 session 时可传 `filename`、`contentType`、`size`、`uploadProfile`、`contentHash`。
4. Route 做服务端权限守卫，校验文件参数、hash 格式和 profile。
5. 服务端调用 `createS3UploadSession()` 生成限定到单个 `objectKey` 的 STS 临时凭证。
6. 服务端同步创建一条 `PENDING` 的 `storage_object`，记录预期文件信息。
7. 客户端调用 `uploadFileToS3FromBrowser({ file, session, signal, onProgress })` 上传到 S3。
8. 直传完成后调用完成接口；正式业务仍由后端固定 profile，通用 demo 接口可额外传受控枚举 `uploadProfile`。
9. 服务端必须用 `getS3ObjectMetadata()` 做 `HeadObject` 校验。
10. 服务端再次查重；若已有相同 ACTIVE 文件，返回已有记录。
11. 表单草稿上传写 `TEMPORARY`；即时生效上传才直接写 `ACTIVE`。

直传确认规则：

| 校验项 | 规则 |
| --- | --- |
| `HeadObject` | 必须成功，失败就返回业务错误 |
| `objectKey` | 必须属于当前后端 profile 对应目录 |
| `sizeBytes` | 必须等于 S3 `ContentLength` |
| `contentType` | 以 S3 `ContentType` 为准 |
| `PUBLIC` 文件 | 必须用 S3 `ContentType` 校验 `image/*` |
| 失败处理 | 不写完成记录，不信任前端 metadata |

如果 S3 返回 `AccessDenied`、`NoSuchKey`、`NotFound` 或超时，都不能 fallback 到前端传入的 `objectKey`、`sizeBytes`、`contentType`、`etag`。

## 5. 临时文件与转正

表单类页面建议先传临时文件。用户没有点击保存时，文件留在 `tmp`，后续由清理任务删除；用户保存成功后，再转成正式文件。

临时文件规则：

- 目录使用 `tmp` 或 `tmp/...`。
- `visibility = PRIVATE`。
- `storage_object.status = TEMPORARY`。
- 业务表不能引用 `TEMPORARY` 文件作为正式资源。

转正流程：

1. 根据 `storageObjectId + partyId = session.currentPartyId + status = TEMPORARY` 查询临时记录。
2. 校验临时 `objectKey` 必须在 `tmp/` 下，并校验文件类型、大小、上传人、业务权限。
3. 根据业务接口选择正式 profile，例如应用图标使用 `application.icon -> public/applications/icons -> PUBLIC`。
4. S3 没有 rename，转正必须 `CopyObject` 到正式目录下的新 `objectKey`。
5. `HeadObject` 校验正式对象后，更新同一条 `storage_object` 的 `objectKey`、`objectUrl`、`visibility`、`status = ACTIVE`。
6. 在同一个业务事务里保存业务表字段或数组。
7. 删除原 `tmp/...` 对象；如果删除失败，交给清理任务重试。

已封装函数优先使用：

| 函数 | 用途 | 业务需要关心 |
| --- | --- | --- |
| `uploadTemporaryStorageObject` | 上传到 `tmp`，写入 `storage_object.status = TEMPORARY` | 先做业务权限校验；返回的 `storageObjectId` 随表单保存 |
| `promoteTemporaryStorageObject` | 复制到正式目录，更新同一条 `storage_object`，删除 tmp 原对象 | 传目标 `uploadProfile`；图片场景传 `requireContentTypePrefix: "image/"` |
| `createPendingStorageObjectRecord` | 直传 session 创建后写 `PENDING` | 完成接口必须再 `HeadObject` |
| `saveStorageObjectRecord` | 保存即时生效的 ACTIVE 记录 | 入库前完成权限、可见性、metadata 校验 |
| `findDuplicateStorageObjectRecord` | 按去重条件查已有 ACTIVE 文件 | 命中时复用已有对象 |
| `findStorageObjectForDownload` | 私有下载前按租户和 ACTIVE 查询对象 | 还要校验业务实体范围 |

这些函数只处理存储能力和 `storage_object`，不替业务决定权限码、业务表字段、数组排序或 DTO 字段名。

## 6. 获取与下载

### 列表

当前示例接口：`GET /api/storage/uploads`。

规则：

- Route 做服务端权限守卫；正式业务替换为明确查看权限。
- 查询 `storage_object` 必须带 `partyId = session.currentPartyId` 和 `status = ACTIVE`。
- 默认按 `creTime desc` 返回最近 100 条。
- 公开文件可由业务 DTO 返回可访问 URL；私有文件只返回元数据，不返回可直接访问的 URL。

### 私有下载

当前示例接口：`GET /api/storage/uploads/[storageObjectId]/download`。

规则：

1. Route 做服务端权限守卫；正式业务替换为明确下载权限。
2. 通过 `storageObjectId + partyId + ACTIVE` 查询数据库记录；查不到返回 404。
3. 在对应 domain service / policy 里校验当前用户是否能访问该业务对象。
4. 调用 `getS3ObjectMetadata()` 做下载前对象存在性和 AWS 读权限校验。
5. 调用 `createS3DownloadUrl()` 生成短期 GET 签名链接。
6. 响应只返回 `{ url, expiresInSeconds }`，不要把签名 URL 持久化到数据库或日志。

默认有效期 300 秒；`@cloud/storage` 会把有效期限制在 60 到 3600 秒之间。不要直接把 `storage_object.objectUrl` 当作私有文件下载地址。

## 7. 权限

当前 demo 页面和接口是登录态级别，用于验证 S3 链路。生产业务不要照搬空权限守卫，也不要新增通用 `storage.*` 业务权限码；上传、替换、删除、下载授权归属到实际业务域。

示例：

| 场景 | 权限示例 |
| --- | --- |
| 上传应用图标或展示图 | `APPLICATION.UPLOAD` |
| 替换图标或调整图片排序 | `APPLICATION.UPDATE` |
| 查看应用公开资源 | `APPLICATION.VIEW` |
| 上传合同文件 | `CONTRACT.UPLOAD` |
| 下载合同文件 | `CONTRACT.DOWNLOAD` |

前端按钮显隐只是体验层，route 必须使用 `assertPermissions()` 做服务端守卫。页面如果有明确权限要求，使用 `requirePermissions()`；如果只是登录后可见页，至少使用 `requireSession()`。

业务接入文件能力时，保持 role -> permission -> menu 链路一致：

1. 在 `apps/<app>/manifest/_menu.map.ts` 给对应菜单声明 permission code。
2. 跑 `pnpm gen:manifest` 更新生成清单。
3. 给对应编码角色或 DB 角色配置权限码。
4. 页面接 `requirePermissions()`，接口接 `assertPermissions()`。

## 8. AWS 权限与环境

应用使用的 AWS 身份或被 assume 的 role 至少需要：

- 上传：目标 prefix 的 `s3:PutObject`
- multipart：`s3:AbortMultipartUpload`、`s3:CreateMultipartUpload`、`s3:UploadPart`、`s3:CompleteMultipartUpload`、`s3:ListMultipartUploadParts`
- 私有下载和下载前校验：`s3:GetObject`

如果配置 `AWS_S3_UPLOAD_ROLE_ARN`，STS session policy 只能收窄权限，不能放大 role 自身没有的权限。

公开读取的 bucket policy 只开放 `public/*`：

```json
{
  "Effect": "Allow",
  "Principal": "*",
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::your-bucket/public/*"
}
```

不要开放整个 bucket。

app 侧通过 `getS3UploadConfig()` 读取环境变量并传给 `@cloud/storage/server`。

必填：

- `AWS_S3_BUCKET`
- `AWS_REGION`

可选：

- `AWS_S3_UPLOAD_URL`：自定义 S3 endpoint 或 CDN 域名；未配置时默认 `https://{bucket}.s3.{region}.amazonaws.com`
- `AWS_S3_UPLOAD_DIRECTORY_PREFIX`：历史兜底目录；新业务不要依赖它分配目录
- `AWS_S3_MAX_SIZE_BYTES`：单文件最大值，默认 1 GB
- `AWS_S3_MULTIPART_THRESHOLD_BYTES`：multipart 阈值，默认 100 MB
- `AWS_S3_MULTIPART_PART_SIZE_BYTES`：multipart 分片大小，默认 16 MB，最小 5 MB
- `AWS_S3_UPLOAD_ROLE_ARN`：配置后使用 `AssumeRole`
- `AWS_S3_UPLOAD_EXTERNAL_ID`
- `AWS_S3_STS_DURATION_SECONDS`：默认 3600 秒，最小 900 秒
- `AWS_S3_STS_SESSION_NAME`

## 9. 业务接入清单

1. 明确业务对象和文件用途，决定业务表字段：单文件 `storageObjectId`，多文件 `storageObjectId[]`。
2. 定义业务 upload profile 和 S3 目录；公开资源目录必须在 `public/` 下，私有资源不要放在 `public/` 下。
3. 判断页面权限：登录即可还是需要明确权限。
4. 在 manifest 和角色里补齐权限码。
5. 新增 domain service：封装上传完成后的业务绑定、范围校验、资源列表。
6. 新增 API route：只做权限、参数、响应适配。
7. 客户端按大小选择服务端上传或直传；正式业务调用业务接口只传文件，通用 demo / 底层接口只允许传受控枚举 `uploadProfile`，不传任意 `directory`。
8. 表单草稿先写 `TEMPORARY`，保存成功后转正为 `ACTIVE`。
9. 业务表保存 `storageObjectId` 或 `storageObjectId[]`，不要保存 S3 key 或公网 URL 作为唯一来源。
10. 公开文件由业务 DTO 自己决定返回字段名，例如 `iconUrl`、`imageUrl`、`logoUrl`。
11. 私有文件通过业务接口换 signed URL。

## 10. 禁止事项

- 不在业务代码里直接 new AWS SDK。
- 不让前端传任意 `directory`。
- 正式业务接口不让前端决定 profile。
- 不把私有文件放到 `public/` 下。
- 不把非图片做成 `PUBLIC`。
- 不把 `TEMPORARY` 文件绑定为正式业务资源。
- 不在业务表里保存 S3 key 或公网 URL 作为唯一来源。
- 不再新增或依赖通用文件归属表。
- 不把未校验的 `storageObjectId` 写进业务表数组。
- 不把 signed URL 存入数据库或日志。
- 不在 `HeadObject` 失败时 fallback 到前端 metadata。
- 不把“菜单能看到”当作安全边界。
- 不长期保留 `assertPermissions({ all: [] })` 这类空权限守卫。

## 11. 排障清单

- `storage.s3_env_missing`：检查 `AWS_S3_BUCKET`、`AWS_REGION`。
- `storage.s3_env_invalid`：检查大小、阈值、STS 时长是否为正整数，multipart part size 是否至少 5 MB。
- `storage.aws_credentials_invalid`：检查 AWS 凭证、STS role、session token。
- `storage.s3_access_denied`：检查 IAM policy、assume role policy、目标 prefix、`s3:GetObject` / `s3:PutObject`。
- `storage.s3_bucket_invalid`：检查 bucket 名称和 region 是否匹配。
- `storage.s3_endpoint_unreachable`：检查 endpoint、代理、网络和 DNS。
- 上传完成后下载 404：检查 `storage_object.status` 是否为 `ACTIVE`，以及查询时的 `partyId` 是否正确。
- 公开图片无法访问：检查对象 key 是否在 `public/` 下，以及 bucket policy 是否只读开放 `public/*`。
