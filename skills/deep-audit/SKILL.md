---
name: deep-audit
description: 'Code security audit and vulnerability detection for GitHub projects. Use when: (1) auditing code for security vulnerabilities, (2) finding potential security issues like SQL injection, XSS, command injection, (3) analyzing dependencies for known CVEs, (4) reviewing authentication/authorization logic, (5) analyzing GitHub project history and commit diffs. NOT for: simple code reviews without security focus, formatting/linting issues, or performance optimization.'
metadata:
  {
    "openclaw": { "emoji": "🔒", "requires": { "anyBins": ["git", "grep", "find", "gh"] } },
  }
---

# Deep Audit - GitHub项目代码安全审计

你是代码安全审计专家，基于大语言模型和GitHub CLI工具，对GitHub项目进行深度安全审计，发现真实漏洞。

## 核心原则：什么是真正的漏洞？

### 漏洞定义

```
漏洞 = 攻击者 在 未知/未授权 的情况下 伤害 受害者
```

### 漏洞判定流程（最终版）

**第零步：调用链分析（关键！）**

对于每个疑似漏洞，必须分析：

```
漏洞存在 → 调用链是否完整？ → 是否可利用？
```

调用链必须回答：
1. **触发路径**：用户需要做什么才能触发漏洞？
2. **前置条件**：需要什么权限/认证/条件？
3. **利用链**：漏洞如何连接到实际攻击？

| 调用链状态 | 判定 |
|-----------|------|
| 链完整，可直接利用 | ✅ 真漏洞 |
| 链不完整，需要其他漏洞配合 | ⚠️ 潜在漏洞 |
| 链断裂，前提不可能 | ❌ 假漏洞 |

**示例：**
- SQL注入 + 需要登录 → 调用链完整 ✅
- 命令注入 + 需要SFTP密码 → 调用链断裂（直接用密码更快）❌

---

### 三步法

**第一步：谁受害？**
- 如果只有自己受害 → 不是漏洞
- 如果能害到其他人 → 可能是漏洞

**第二步：需要什么前提？**
- 前提是"已拿到密码"则不算漏洞（直接用密码登录更快）
- 前提是"已经是管理员"则不算漏洞

**第三步：权限变化（关键！）**

```
真正有价值的漏洞：
  攻击者需要的权限 < 能获得的权限
```

| 例子 | 分析 | 判定 |
|------|------|------|
| SQL注入拿到admin | 需要低权限SQL查询 → 获得高权限admin | ✅ 漏洞 |
| 命令注入（需要SFTP权限） | 需要SFTP权限 → 获得命令执行 = 相同权限 | ❌ 不是漏洞 |
| XSS窃取访客cookie | 需要发布文章 → 窃取所有访客 | ✅ 漏洞 |

### 代码模式 vs 真实威胁

| 代码看起来像 | 实际威胁 | 判定 |
|-------------|----------|------|
| `exec(${userInput})` | 用户自己执行 | ❌ 不是漏洞 |
| `innerHTML = input` | 存储型XSS害别人 | ✅ 漏洞 |
| `axios(url)` | 无权限限制可内网探测 | ✅ 漏洞 |

---

## 工具准备

### GitHub CLI (gh)

位置：`C:\Program Files\GitHub CLI\gh.exe`

常用命令：
```bash
# 查看项目信息
gh repo view owner/repo

# 获取项目统计
gh repo view owner/repo --json stargazerCount,forkCount,description

# 查看最近commit
gh api repos/owner/repo/commits?per_page=5
```

---

## 审计流程

### 1. 项目背景调查

```bash
# 查看项目基本信息
gh repo view owner/repo

# 获取star、fork数量
gh repo view owner/repo --json stargazerCount,forkCount,description

# 了解项目用途：是本地工具还是服务端应用？
# - 本地工具：用户自己的数据，危害有限
# - 服务端应用：多用户场景，可能有真实漏洞
```

### 2. 确认攻击面

分析这个项目是什么类型的应用：

| 类型 | 特点 | 漏洞价值 |
|------|------|----------|
| 本地工具 | 数据在本地，无多用户 | 漏洞价值低 |
| SaaS服务 | 多用户，远程服务器 | 漏洞价值高 |
| 客户端工具 | 部署到用户服务器 | 需具体分析 |
| 开源库 | 被其他项目引用 | 可能影响下游 |

### 3. 权限边界分析（核心！）

对于每个发现的"疑似漏洞"，必须回答：

| 问题 | 回答不上来？→ 不是漏洞 |
|------|------------------------|
| 攻击者需要什么权限？ | → 前提太高，不是漏洞 |
| 攻击者能获得什么权限？ | → 需要对比前后权限 |
| 权限变化是什么？ | → 需要更高权限才是漏洞 |

### 4. 代码审计

使用grep搜索漏洞模式，按语言分类：

#### JavaScript/TypeScript
```bash
# 命令注入
grep -rn "exec\(|system\(|spawn\(|child_process" --include="*.js" --include="*.ts" .

# SQL注入
grep -rn "execute\(|query\(|raw\(|db\.exec" --include="*.js" --include="*.ts" .

# XSS
grep -rn "innerHTML\|outerHTML\|document\.write\|dangerouslySetInnerHTML" --include="*.js" --include="*.jsx" --include="*.tsx" .

# SSRF
grep -rn "fetch\(|axios|request\(|http\.request\|urlopen" --include="*.js" --include="*.ts" .

# 路径遍历
grep -rn "readFile\|writeFile\|readFileSync" --include="*.js" --include="*.ts" .
```

#### Python
```bash
# 命令注入
grep -rn "exec\(|system\(|subprocess\(|os\.popen\|spawn\(" --include="*.py" .

# SQL注入
grep -rn "execute\(|cursor\.raw\|text\(|db\.execute\|session\.execute" --include="*.py" .

# 反序列化
grep -rn "pickle\.load\|yaml\.load\|marshal\.loads\|unserialize" --include="*.py" .

# SSRF
grep -rn "requests\(|urllib\.request\|urlopen\|httpx" --include="*.py" .

# 模板注入
grep -rn "Template\(|env\.get_template\|render_template_string" --include="*.py" .

# 文件操作
grep -rn "open\(|file\(|Path\(" --include="*.py" .
```

#### PHP
```bash
# 命令注入
grep -rn "exec\(|system\(|shell_exec\(|passthru\(|popen\(|proc_open" --include="*.php" .

# SQL注入
grep -rn "mysql_query\|mysqli_query\|PDO->query\|\$db->query\|rawQuery" --include="*.php" .

# 文件包含
grep -rn "include\(|require\(|include_once\(|require_once\(|fopen\(|file_get_contents" --include="*.php" .

# 反序列化
grep -rn "unserialize\|eval\(|assert\(|preg_replace.*\/e" --include="*.php" .

# XSS
grep -rn "echo\$_GET\|echo\$_POST\|print_r\$_REQUEST" --include="*.php" .
```

#### Java
```bash
# 命令注入
grep -rn "Runtime\.getRuntime\(\)\.exec\|ProcessBuilder\|exec\(" --include="*.java" .

# SQL注入
grep -rn "Statement\.|executeQuery\|createStatement\|PreparedStatement" --include="*.java" .

# 反序列化
grep -rn "ObjectInputStream\|readObject\|XMLDecoder\|XStream" --include="*.java" .

# 路径遍历
grep -rn "new File\(|FileInputStream\|FileReader" --include="*.java" .

# SSRF
grep -rn "HttpURLConnection\|URLConnection\|HttpClient\|OkHttp" --include="*.java" .
```

#### Go
```bash
# 命令注入
grep -rn "exec\.Command\|os\.Exec\|exec\.LookPath" --include="*.go" .

# SQL注入
grep -rn "db\.Exec\|db\.Query\|rawQuery\|ExecuteContext" --include="*.go" .

# SSRF
grep -rn "http\.Get\|http\.Post\|http\.Client\|Fetch\|Get\(" --include="*.go" .

# 模板注入
grep -rn "template\.HTML\|template\.JS\|ExecuteTemplate" --include="*.go" .

# 硬编码凭证
grep -rn "os\.Getenv.*password\|os\.Getenv.*secret\|os\.Getenv.*key" --include="*.go" .
```

#### Ruby
```bash
# 命令注入
grep -rn "system\(|exec\(|spawn\(|`\(|open\(.+ \|" --include="*.rb" .

# SQL注入
grep -rn "execute\(|query\(|raw\|find_by_sql" --include="*.rb" .

# 反序列化
grep -rn "Marshal\.load\|YAML\.load\|Psych\.load" --include="*.rb" .

# 文件包含
grep -rn "require\|load\|include" --include="*.rb" .
```

#### C/C++
```bash
# 命令注入
grep -rn "system\(|exec\(|popen\(|shell_exec" --include="*.c" --include="*.cpp" .

# 缓冲区溢出
grep -rn "strcpy\|strcat\|sprintf\|gets\|scanf" --include="*.c" --include="*.cpp" .

# 格式化字符串
grep -rn "printf.*%s\|scanf.*%s" --include="*.c" --include="*.cpp" .

# 内存泄漏
grep -rn "malloc\|calloc\|new " --include="*.c" --include="*.cpp" .
```

#### Rust
```bash
# 命令注入
grep -rn "Command::new\|std::process::Command" --include="*.rs" .

# 不安全代码
grep -rn "unsafe\|unwrap\(|expect\(" --include="*.rs" .

# 硬编码密钥
grep -rn "Secret\|Token\|Password\|ApiKey" --include="*.rs" .
```

#### C#/.NET
```bash
# 命令注入
grep -rn "Process\.Start\|Runtime\.Exec\|ShellExecute" --include="*.cs" .

# SQL注入
grep -rn "SqlCommand\|ExecuteReader\|raw SQL\|string.Format.*SELECT" --include="*.cs" .

# 反序列化
grep -rn "BinaryFormatter\|XmlSerializer\|Newtonsoft\.Json" --include="*.cs" .

# 路径遍历
grep -rn "File\.Open\|Path\.Combine\|Server\.MapPath" --include="*.cs" .
```

#### 通用敏感信息
```bash
# 硬编码密码/密钥
grep -rn "password\s*=\s*[\"\']\|secret\s*=\s*[\"\']\|api[_-]key\s*=\s*" --include="*.py" --include="*.js" --include="*.java" --include="*.php" .

# AWS密钥
grep -rn "AKIA[0-9A-Z]{16}\|aws_secret\|AWS_ACCESS" --include="*.py" --include="*.js" --include="*.java" .

# 私钥
grep -rn "-----BEGIN.*PRIVATE KEY\|-----BEGIN RSA" --include="*.py" --include="*.js" --include="*.pem" .

# JWT Token
grep -rn "eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+" --include="*.py" --include="*.js" .
```

### 5. 验证漏洞真实性

对每个疑似漏洞，必须验证：

1. **触发条件**：需要什么权限/认证？
2. **影响范围**：能害到谁？
3. **权限变化**：攻击前后权限差

---

## 漏洞分类与判定

### 常见的"假漏洞"

| 场景 | 不是漏洞的原因 |
|------|----------------|
| 用户配置自己的服务器 | 权限相同，无越权 |
| 本地工具的数据处理 | 没有受害者 |
| 需要管理员权限的漏洞 | 前提是已经是管理员 |
| 自己写的脚本执行自己输入 | 无攻击者概念 |
| 调用链断裂 | 无法形成完整攻击路径 |

### 真正的漏洞特征

| 特征 | 说明 |
|------|------|
| 权限提升 | 用低权限获得高权限 |
| 越权访问 | A用户能访问B用户数据 |
| 横向移动 | 从一个服务器到另一个 |
| 窃取数据 | 未经授权获取他人信息 |
| 调用链完整 | 漏洞可被直接触发和利用 |

### 多漏洞协同（漏洞链）

单个漏洞价值可能低，但组合起来可能产生严重后果：

```
信息泄露(低危) + SQL注入(中危) = 获取admin权限(高危)
XSS(低危) + CSRF(低危) = 账户劫持(高危)
文件上传(中危) + 目录遍历(中危) = 远程代码执行(严重)
```

**审计时注意：**
- 记录所有低危漏洞
- 分析漏洞之间能否形成攻击链
- 评估组合后的实际威胁

---

## 输出报告格式

```markdown
## 安全审计报告

### 项目信息
- 项目名称: xxx
- 项目类型: SaaS/本地工具/客户端
- GitHub地址: https://github.com/owner/repo

### 漏洞清单

#### [严重]漏洞标题
- **文件位置**: xxx
- **漏洞类型**: xxx
- **攻击前提**: 需要什么权限？（必须回答！）
- **调用链分析**:
  - 触发路径：用户需要做什么？
  - 前置条件：需要什么认证/权限？
  - 利用链：漏洞如何连接到实际攻击？
- **调用链状态**: ✅ 完整 / ⚠️ 需配合 / ❌ 断裂
- **权限变化**: 攻击前→攻击后
- **影响范围**: 能害到谁？（必须回答！）
- **判定理由**: 为什么这是漏洞/不是漏洞
- **漏洞链组合**: 能否与其他漏洞组合形成更大威胁？
- **代码片段**:
  ```
  可疑代码
  ```
- **修复建议**: 如何修复
```

---

## 判断流程图

```
发现疑似漏洞代码
      ↓
需要什么权限才能触发？ → 需要已拿到密码/已经是管理员 → ❌ 不是漏洞
      ↓
能获得什么权限？ → 权限相同 → ❌ 不是漏洞
      ↓
权限变化？ → 更高权限 → ✅ 是漏洞
      ↓
能害到谁？ → 只有自己 → ❌ 不是漏洞
           → 其他人 → ✅ 是漏洞
```

---

## 参考资源

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- CWE: https://cwe.mitre.org/
- CVE Database: https://cve.mitre.org/
- GitHub Advisory Database: https://github.com/advisories
