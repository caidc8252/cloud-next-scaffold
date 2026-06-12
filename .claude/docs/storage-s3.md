# 存储与 S3

> 归属：`@cloud/storage` 上传/下载、`storage_object` / `storage_attachment`、bucket policy。**动任何 S3 / 上传下载前必读。**

- 连接 Amazon S3、生成临时上传凭证、服务端上传文件时，统一通过 `@cloud/storage/server`
- 浏览器直传 S3 时，统一通过 `@cloud/storage/client`，大文件分片上传也在此包内处理
- 默认上传策略：`<= 5 MB` 的浏览器文件可走服务端 `uploadFileToS3FromServer()`，`> 5 MB` 走 `createS3UploadSession()` + `uploadFileToS3FromBrowser()` 直传；直传中 `> 100 MB` 默认 multipart
- 不要在业务代码里直接 new AWS SDK 的 `S3Client` / `STSClient`，除非先确认 `@cloud/storage` 无法覆盖需求并同步沉淀包能力
- S3 配置由业务侧从环境变量读取后显式传入 storage package，storage package 不直接读取 `.env`
- 上传完成后的文件本体记录统一落在 `storage_object`，历史列表、下载、公开访问都以这张表为准
- `storage_object.object_url` 是对象的稳定访问地址，不等于授权下载；私有文件下载必须先按当前租户校验数据库记录，再由服务端生成短期 S3 GET 链接
- 下载链接默认有效期是 5 分钟；生成下载链接前优先做 S3 `HeadObject` 校验，避免把用户直接带到 S3 XML 错误页
- 文件去重以同租户、同可见性、同 `contentHash(SHA-256) + sizeBytes + ACTIVE` 为准；命中重复文件时复用已有 `storage_object`，不新增上传记录
- `uploadUrl` 只用于生成上传会话或推导对象地址，不再写入数据库
- 文件业务归属不要塞进 `storage_object`；应用包、头像、合同附件等业务关系统一写入 `storage_attachment`，用 `subjectType + subjectId + purpose` 表达绑定关系
- 公开图片使用 `storage_object.visibility = PUBLIC`，只允许 `image/*`，且对象 key 必须落在 `public/` 前缀；公开文件才返回可直接访问的 `accessUrl`
- S3 bucket policy 只应对 `public/*` 开放匿名 `s3:GetObject`，不要公开整个 bucket；这只解决公开读取，不给应用身份增加上传权限
- 应用使用的 AWS 身份或被 assume role 必须允许目标 prefix 的 `s3:PutObject`；私有下载和下载前校验还需要 `s3:GetObject`
