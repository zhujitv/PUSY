# 社区官方示例内容

这组内容用于展示社区的发布结构，不冒充真实会员评价。三个账号均标记为“官方示例”，18 篇内容的标题和正文也会重复披露示例身份。

## 安全边界

- 不创建点赞、评论、关注、通知、积分、已购标识、订单归因或转化事件。
- 系统账号使用不可投递的 `.invalid` 邮箱，不配置密码、钱包或会员资料。
- 帖子使用固定 ID 和 `moderated_by` 标识；重复执行只会更新同一批官方内容。
- 写入前会检查话题、商品、图片和既有 ID，任一冲突都会中止事务。

## 命令

```bash
npm run community:editorial:check
DATABASE_URL=... npm run community:editorial:apply
DATABASE_URL=... node scripts/seed-community-editorial.mjs --rollback --confirm
```

默认命令只校验本地清单和图片，不连接数据库。回滚仅删除固定 ID 且由本工具持有的帖子；系统账号只有在不存在其他帖子时才会删除。
