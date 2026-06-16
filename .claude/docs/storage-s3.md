# 存储与 S3

> 归属：`@cloud/storage` 上传/下载、业务表自管文件信息、bucket policy。**动任何 S3 / 上传下载前必读。**
> 详细流程、upload profile、权限和开发规范见 `.claude/docs/storage-s3-upload-guide.md`。

- 连接 Amazon S3、生成临时上传凭证、服务端上传文件时，统一通过 `@cloud/storage/server` 或 app 侧 storage helper
- 浏览器直传 S3 时，统一通过 `@cloud/storage/client`，大文件分片上传也在此包内处理
- 默认上传策略：`<= 5 MB` 的浏览器文件可走服务端上传，`> 5 MB` 走 `createS3UploadSession()` + `uploadFileToS3FromBrowser()` 直传；直传中 `> 100 MB` 默认 multipart
- 不要在业务代码里直接 new AWS SDK 的 `S3Client` / `STSClient`，除非先确认 `@cloud/storage` 无法覆盖需求并同步沉淀包能力
- S3 配置由业务侧从环境变量读取后显式传入 storage package，storage package 不直接读取 `.env`
- admin 应用侧只读取 `AWS_S3_BUCKET`、`AWS_REGION`、`AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY`、`AWS_S3_MAX_SIZE_BYTES`、`AWS_S3_MULTIPART_THRESHOLD_BYTES`、`AWS_S3_MULTIPART_PART_SIZE_BYTES`
- S3 目录由业务侧 upload profile / service 显式决定，不允许前端任意传 `directory`
- 普通业务上传不暴露 `existingObjectKey`；确需复用 key 时必须由后端从业务表或业务上下文推导，并校验 key 落在当前 profile 目录内
- 临时文件转正必须生成新的随机正式 objectKey，不使用 tmp key 最后一段作为正式 key；CopyObject 默认不覆盖已有对象
- 项目不提供统一文件本体表；S3 返回的 `bucket`、`regionId`、`objectKey`、`objectUrl`、`contentType`、`sizeBytes`、`etag`、`lastModified` 等信息由各业务表按需保存
- 业务可以只存一个公开 URL，也可以保存完整文件对象；多文件建议用 JSONB 数组，数组顺序就是展示顺序
- 私有文件不要返回固定 URL；业务下载接口先在具体业务 service 中根据业务表确认当前用户能访问该业务对象、文件确实属于该业务对象，再用后端固定或推导的 PRIVATE profile + `objectKey` 生成短期 signed URL
- 生成下载链接前优先做 S3 `HeadObject` 校验，避免把用户直接带到 S3 XML 错误页；下载链接默认有效期是 5 分钟
- 跨业务统一去重不再由平台提供；如需去重，业务表自行保存并查询 `contentHash + sizeBytes` 等字段
- 公开文件只允许真实图片，且对象 key 必须落在 `public/` 前缀；不能只信客户端传入的 `ContentType`，必须校验 PNG/JPEG/GIF/WebP/AVIF 等文件头签名，并在浏览器直传完成时把 S3 对象 `Content-Type` 纠正为真实图片类型
- S3 bucket policy 只应对 `public/*` 开放匿名 `s3:GetObject`，不要公开整个 bucket；这只解决公开读取，不给应用身份增加上传权限
- 应用使用的 AWS 身份或被 assume role 必须允许目标 prefix 的 `s3:PutObject`；私有下载和下载前校验还需要 `s3:GetObject`
