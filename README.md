# Short Todo

在 VS Code 侧边栏中管理待办事项，按日期分组，支持详情编辑与工作区筛选。

## 功能

- 按日期记录待办，列表按日期降序分组
- 圆形勾选框，完成项显示删除线
- 单击查看详情，双击标记已办
- 详情面板支持扩展内容编辑（自动保存）
- 全局存储，支持「全部 / 当前工作区」筛选

## 使用

1. 点击 Activity Bar 的「待办」图标打开侧边栏
2. 选择日期并输入内容，回车或点击 `+` 添加
3. 勾选圆形复选框切换完成状态
4. 单击条目查看详情，在详情面板编辑扩展内容

## 命令

| 命令 | 快捷键 | 说明 |
|------|--------|------|
| `添加待办` | `Ctrl+Alt+T` / `Cmd+Alt+T` | 通过输入框快速添加 |
| `刷新` | - | 刷新待办列表 |

## 开发

```bash
npm install
npm run compile
```

按 F5 启动 Extension Development Host 调试。

```bash
npm run package   # 打包 .vsix
npm run publish   # 发布到 Marketplace（需先 vsce login）
```

## 发布

1. 在 [Marketplace 管理页](https://marketplace.visualstudio.com/manage) 创建 Publisher `ferhannah`
2. 创建 Azure DevOps PAT（Marketplace Manage 权限）
3. 执行 `npx vsce login ferhannah`
4. 执行 `npm run publish`

## License

MIT — see [LICENSE.txt](LICENSE.txt)
