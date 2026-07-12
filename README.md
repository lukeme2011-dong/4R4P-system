# 4R4P 责任动力学人才管理系统 - 代码说明文档

## 一、项目结构

```
4R4P-System/
├── backend/                    # 后端服务
│   ├── database/               # SQLite数据库文件
│   │   └── 4r4p.db             # 数据库文件
│   ├── src/
│   │   ├── database/           # 数据库初始化与种子数据
│   │   │   ├── index.ts        # 数据库连接、表创建、迁移
│   │   │   └── seed.ts         # 初始数据（用户、权限等）
│   │   ├── middleware/         # 中间件
│   │   │   ├── auth.ts         # JWT认证、角色权限检查
│   │   │   └── operationLog.ts # 操作日志记录
│   │   ├── routes/             # API路由
│   │   │   ├── assessment.ts   # 测评档案相关接口
│   │   │   ├── auth.ts         # 用户认证、用户管理接口
│   │   │   ├── departments.ts  # 部门管理接口
│   │   │   ├── evaluations.ts  # 测评管理、题库管理接口
│   │   │   ├── knowledge.ts    # 知识库接口
│   │   │   ├── operationLogs.ts# 操作日志查询接口
│   │   │   ├── performance.ts  # 绩效考核接口
│   │   │   ├── permissions.ts  # 权限管理接口
│   │   │   ├── positions.ts    # 岗位管理接口
│   │   │   └── succession.ts   # 人才继任接口
│   │   └── server.ts           # 服务入口文件
│   ├── uploads/                # 上传文件存储目录
│   │   └── avatars/            # 头像文件
│   ├── .env                    # 环境变量配置
│   ├── package.json            # 后端依赖配置
│   └── tsconfig.json           # TypeScript配置
├── frontend/                   # 前端应用
│   ├── src/
│   │   ├── router/
│   │   │   └── index.ts        # 路由配置
│   │   ├── stores/
│   │   │   └── auth.ts         # 认证状态管理
│   │   ├── utils/
│   │   │   └── axios.ts        # Axios封装
│   │   ├── views/              # 页面组件
│   │   │   ├── assessment/     # 测评档案相关页面
│   │   │   │   ├── AssessmentArchive.vue  # 测评档案列表
│   │   │   │   ├── AssessmentEntry.vue    # 测评入口
│   │   │   │   ├── AssessmentResult.vue   # 测评结果
│   │   │   │   ├── AssessmentTake.vue     # 测评答题
│   │   │   │   └── WeightConfig.vue       # 岗位权重配置
│   │   │   ├── evaluations/    # 测评管理相关页面
│   │   │   │   ├── EvaluationList.vue     # 测评列表
│   │   │   │   └── QuestionBank.vue       # 题库管理
│   │   │   ├── knowledge/
│   │   │   │   └── KnowledgeList.vue      # 知识库列表
│   │   │   ├── logs/
│   │   │   │   └── OperationLogList.vue   # 操作日志列表
│   │   │   ├── performance/
│   │   │   │   └── PerformanceList.vue    # 绩效考核列表
│   │   │   ├── permissions/
│   │   │   │   ├── PermissionManagement.vue # 权限管理
│   │   │   │   └── UserManagement.vue      # 用户管理
│   │   │   ├── personality/
│   │   │   │   └── PersonalityTest.vue     # 责任性格测评
│   │   │   ├── positions/
│   │   │   │   ├── PositionCreate.vue      # 岗位创建
│   │   │   │   ├── PositionEdit.vue        # 岗位编辑
│   │   │   │   └── PositionList.vue        # 岗位列表
│   │   │   ├── succession/
│   │   │   │   └── SuccessionList.vue      # 人才继任列表
│   │   │   ├── Dashboard.vue               # 数据看板
│   │   │   ├── Layout.vue                  # 布局组件
│   │   │   ├── Login.vue                   # 登录页面
│   │   │   └── Profile.vue                 # 个人中心
│   │   ├── App.vue                         # 根组件
│   │   ├── main.ts                         # 应用入口
│   │   └── style.css                       # 全局样式
│   ├── index.html                          # HTML模板
│   ├── package.json                        # 前端依赖配置
│   ├── vite.config.ts                      # Vite配置
│   ├── tailwind.config.js                  # Tailwind配置
│   └── postcss.config.js                   # PostCSS配置
├── start.bat                               # Windows一键启动脚本
├── stop.bat                                # 停止脚本
└── TECHNICAL_WHITEPAPER.md                 # 技术白皮书
```

---

## 二、后端代码说明

### 2.1 服务入口 (server.ts)

**文件路径**: `backend/src/server.ts`

**核心功能**:

- 初始化Express应用
- 配置CORS、JSON解析中间件
- 注册静态文件服务（头像上传目录）
- 注册全局操作日志记录中间件
- 注册所有业务路由
- 初始化数据库连接与种子数据

**关键代码**:

```typescript
// 全局操作日志中间件
app.use((req: AuthRequest, res, next) => {
  const originalSend = res.json
  res.json = function(body: any) {
    if (req.originalUrl?.startsWith('/api/') && !req.originalUrl?.includes('/operation-logs')) {
      logOperation(req, statusCode)
    }
    return originalSend.call(this, body)
  }
  next()
})

// 路由注册
app.use('/api/auth', authRoutes)
app.use('/api/assessment', assessmentRoutes)
// ... 其他路由
```

### 2.2 数据库初始化 (database/index.ts)

**文件路径**: `backend/src/database/index.ts`

**核心功能**:

- 创建SQLite数据库连接
- 定义15张核心数据表结构
- 执行数据库迁移脚本
- 提供全局数据库操作对象 `db`

**关键设计**:

- 使用 `CREATE TABLE IF NOT EXISTS` 确保表存在
- 迁移脚本通过 `ALTER TABLE` 添加新字段
- 支持级联删除的外键约束

### 2.3 认证中间件 (middleware/auth.ts)

**文件路径**: `backend/src/middleware/auth.ts`

**核心功能**:

- `authenticate`: JWT令牌验证，解析用户信息
- `requireRole`: 角色权限检查
- `requirePermission`: 细粒度权限检查（三级权限系统）

**权限优先级**:

```
个人拒绝(deny) > 个人允许(allow) > 岗位权限 > 角色权限 > 管理员(全部权限)
```

**关键代码**:

```typescript
export const requirePermission = (permissionCode: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // 管理员直接通过
    if (userRole === 'admin') {
      next()
      return
    }
    // 查询用户权限（个人/岗位/角色三级）
    db.get(`SELECT ... FROM users LEFT JOIN role_permissions ...`, [], callback)
  }
}
```

### 2.4 用户认证路由 (routes/auth.ts)

**文件路径**: `backend/src/routes/auth.ts`

**核心API**:

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| `/api/auth/login` | POST | 用户登录 |
| `/api/auth/profile` | GET | 获取个人信息 |
| `/api/auth/profile` | PUT | 更新个人信息 |
| `/api/auth/avatar` | POST | 上传头像 |
| `/api/auth/users` | GET | 用户列表 |
| `/api/auth/users` | POST | 创建用户 |
| `/api/auth/users/:id` | DELETE | 删除用户 |
| `/api/auth/users/next-username` | GET | 获取下一个用户名 |
| `/api/auth/users/import` | POST | 批量导入用户 |

**用户名生成规则**:

- 格式：`user` + 5位数字（如 `user00001`）
- 从数据库查询最大编号，自动递增

### 2.5 测评档案路由 (routes/assessment.ts)

**文件路径**: `backend/src/routes/assessment.ts`

**核心API**:

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| `/api/assessment/create` | POST | 创建测评 |
| `/api/assessment/detail/:id` | GET | 测评详情 |
| `/api/assessment/code/:code` | GET | 通过编码查询测评 |
| `/api/assessment/:id/answer` | PUT | 保存答题 |
| `/api/assessment/:id/submit` | POST | 提交测评 |
| `/api/assessment/list` | GET | 测评列表（支持分页/筛选） |
| `/api/assessment/:id` | DELETE | 删除测评 |

**测评编码格式**: `TEST-YYYYMMDD-XXXXXX`

### 2.6 测评管理路由 (routes/evaluations.ts)

**文件路径**: `backend/src/routes/evaluations.ts`

**核心API**:

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| `/api/evaluations` | GET | 测评列表 |
| `/api/evaluations/:id` | GET | 测评详情（含答题记录） |
| `/api/evaluations/:id` | DELETE | 删除测评 |
| `/api/evaluations/questions` | GET | 题库列表 |
| `/api/evaluations/questions/:id` | DELETE | 删除题目 |
| `/api/evaluations/questions/import` | POST | 导入题目 |
| `/api/evaluations/personality/questions` | GET | 性格测评抽题 |
| `/api/evaluations/personality` | POST | 提交性格测评 |

**性格测评抽题算法**:

- 根据岗位权重配置按比例分配各R类型题量
- 随机从题库中抽取指定数量题目
- 确保每种类型至少1题

### 2.7 操作日志中间件 (middleware/operationLog.ts)

**文件路径**: `backend/src/middleware/operationLog.ts`

**核心功能**:

- 自动记录所有API操作
- 记录用户信息、操作类型、请求参数、响应状态
- 敏感信息脱敏（密码字段替换为\*\*\*）

---

## 三、前端代码说明

### 3.1 路由配置 (router/index.ts)

**文件路径**: `frontend/src/router/index.ts`

**路由结构**:

```
/                    → Login.vue
/dashboard           → Dashboard.vue
/evaluation          → EvaluationList.vue
/question-bank       → QuestionBank.vue
/assessment-archive  → AssessmentArchive.vue
/assessment/entry    → AssessmentEntry.vue
/assessment/take/:id → AssessmentTake.vue
/assessment/result/:id → AssessmentResult.vue
/weight-config       → WeightConfig.vue
/performance         → PerformanceList.vue
/personality         → PersonalityTest.vue
/knowledge           → KnowledgeList.vue
/succession          → SuccessionList.vue
/positions           → PositionList.vue
/user-management     → UserManagement.vue
/permission-management → PermissionManagement.vue
/operation-logs      → OperationLogList.vue
/profile             → Profile.vue
```

**路由守卫**:

- 未登录用户重定向到 `/`
- 候选人角色自动跳转到 `/personality`

### 3.2 状态管理 (stores/auth.ts)

**文件路径**: `frontend/src/stores/auth.ts`

**核心状态**:

- `token`: JWT令牌
- `userInfo`: 用户信息（id, username, role, permissions）
- `hasPermission()`: 权限判断方法
- `hasAnyPermission()`: 任一权限判断
- `hasAllPermissions()`: 全部权限判断

**权限存储**:

- 令牌存储在 `localStorage`
- 权限列表存储在 `localStorage`

### 3.3 Axios封装 (utils/axios.ts)

**文件路径**: `frontend/src/utils/axios.ts`

**核心功能**:

- 配置基础URL (`/api`)
- 自动添加Authorization头
- 请求/响应拦截器
- 统一错误处理

### 3.4 布局组件 (Layout.vue)

**文件路径**: `frontend/src/views/Layout.vue`

**核心功能**:

- 侧边栏菜单渲染
- 用户信息展示（头像、姓名、角色）
- 菜单权限控制（根据用户权限动态显示）
- 路由导航

**菜单配置**:

```typescript
const menuItems = [
  { name: '数据看板', path: '/dashboard', icon: 'DataAnalysis', permission: 'dashboard:view' },
  { name: '测评管理', path: '/evaluation', icon: 'Document', permission: 'evaluation:view' },
  // ... 其他菜单
]
```

### 3.5 测评档案页面 (AssessmentArchive.vue)

**文件路径**: `frontend/src/views/assessment/AssessmentArchive.vue`

**核心功能**:

- 测评档案列表展示（分页、筛选）
- 详情抽屉（基础信息、维度得分、答题记录、综合评定、优势短板）
- PDF报告打印
- 删除档案（二次确认）
- 数据导出（Excel格式）

### 3.6 测评管理页面 (EvaluationList.vue)

**文件路径**: `frontend/src/views/evaluations/EvaluationList.vue`

**核心功能**:

- 测评列表展示
- 测评报告弹窗（含雷达图）
- 删除测评记录
- 打印报告

### 3.7 责任性格测评页面 (PersonalityTest.vue)

**文件路径**: `frontend/src/views/personality/PersonalityTest.vue`

**测评流程**:

1. **岗位选择**：选择应聘岗位，预览岗位权重
2. **答题环节**：动态加载题目，支持导航切换
3. **结果展示**：雷达图、性格类型、维度得分、人岗匹配度

---

## 四、核心业务逻辑

### 4.1 测评流程

```
1. 创建测评（POST /assessment/create）
   - 生成测评编码
   - 查询岗位权重配置
   - 根据权重分配题量
   - 随机抽取题目
   - 创建assessment和assessment_answers记录

2. 答题（PUT /assessment/:id/answer）
   - 更新单题答案
   - 若为否决项，标记has_veto=1

3. 提交（POST /assessment/:id/submit）
   - 校验所有题目是否完成评分
   - 计算各维度得分
   - 生成责任组合画像
   - 计算人岗匹配度
   - 生成测评报告

4. 查看报告（GET /assessment/detail/:id）
   - 返回测评详情
   - 返回答题记录（含STAR）
   - 返回优势短板分析
```

### 4.2 权限检查流程

```
请求进入 → authenticate中间件验证token
         → requirePermission中间件检查权限
           → 管理员直接通过
           → 查询user_permissions（个人权限）
           → 查询position_permissions（岗位权限）
           → 查询role_permissions（角色权限）
           → 根据优先级判断是否允许访问
```

### 4.3 用户导入流程

```
上传Excel文件 → 解析文件内容
              → 校验用户名格式（user+5位数字）
              → 批量创建用户记录
              → 设置默认角色（candidate）
              → 设置默认密码（123456，bcrypt加密）
              → 返回成功/失败统计
```

---

## 五、关键设计模式

### 5.1 中间件模式

- **认证中间件**: 统一处理JWT验证
- **权限中间件**: 统一处理权限检查
- **日志中间件**: 统一记录操作日志

### 5.2 路由模块化

- 按业务模块划分路由文件
- 每个路由文件独立管理相关API
- 便于维护和扩展

### 5.3 状态管理

- 使用Pinia集中管理认证状态
- 权限判断逻辑封装为store方法
- 支持localStorage持久化

### 5.4 组件复用

- 使用Element Plus组件库
- 自定义组件封装通用功能（如表格、表单）
- 布局组件统一管理页面结构

---

## 六、开发规范

### 6.1 命名规范

- **文件命名**: 驼峰式（如 `UserManagement.vue`）
- **变量命名**: 驼峰式（如 `userForm`）
- **常量命名**: 大写下划线（如 `MAX_FILE_SIZE`）
- **路由路径**: 短横线分隔（如 `/user-management`）

### 6.2 代码风格

- 使用TypeScript进行类型检查
- 使用Composition API（Vue 3）
- 组件使用 `<script setup>` 语法
- 后端使用Express路由模块化

### 6.3 错误处理

- 前端统一使用 `ElMessage` 显示错误提示
- 后端统一返回JSON格式错误信息
- API请求使用try-catch包裹

### 6.4 安全规范

- 密码使用bcrypt加密存储
- API请求使用JWT认证
- SQL查询使用参数化防止注入
- 文件上传限制类型和大小
