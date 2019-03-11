# 聊天室服务端

## 命令

### 安装依赖

    npm install

### 编译第三方模块

重写编译供 Electron 开发环境使用的第三方模块，根据所处操作系统选择命令

32 位系统

    npm run rebuild:dev:ia32

64 位系统

    npm run rebuild:dev:x64

### 运行开发环境

需要两个终端面板，一个运行 ionic 服务，另一个运行 Electron 服务

运行 Electron 服务时根据操作系统环境选择命令

    npm run ionic:serve
    npm run electron:serve:osx
    npm run electron:serve:win

### 发布 Electron 版本

安装 Electron 发布环境需要的依赖

    npm run electron:init

编译项目代码

    npm run ionic:build

复制编译后的代码到 `./electron/app/` 目录

    > tree ./electron/
    ├── app
    │   ├── assets
    │   ├── build
    │   ├── index.html
    │   ├── manifest.json
    │   └── service-worker.js
    ├── index.js
    ├── node_modules
    ├── package-lock.json
    └── package.json

发布 Electron 应用程序，根据操作系统环境选择命令

（此命令包含了编译第三方模块和打包命令，等同于 `npm run electron:rebuild:系统位数 && npm run electron:pack:系统类型`）

OSX 系统

    electron:publish:osx

32 位 Windows 系统

    electron:publish:win32

32 位 Windows 系统

    electron:publish:win64

### 编译供 Electron 发布环境使用的第三方模块

重写编译供 Electron 发布环境使用的第三方模块，根据所处操作系统选择命令

（`electron:publish:系统类型` 命令内置此命令）

32 位系统

    npm run electron:rebuild:ia32

64 位系统

    npm run electron:rebuild:x64

### 打包应用程序

OSX 系统

    electron:pack:osx

32 位 Windows 系统

    electron:pack:win32

32 位 Windows 系统

    electron:pack:win64


## 开发过程中注意事项

### 引用与打包 .node 类型第三方模块

类似 NodeJS 的 fs、path 模块，数据库处理的 better-sqlite3 模块中包含不能被编译为 JavaScript 的预编译 .node 文件

这些文件需要放到 node_modules 目录中，和项目代码一同打包到 Electron 环境中

当我们的项目需要使用这种模块时，需要在安装模块后在项目的 `./config/webpack.config.js` 文件中添加配置，如：

```js
var devConfig = {
  // ...
  externals: {
    // ...
    fs: "require('fs')",
    os: "require('os')",
    path: "require('path')",
    child_process: "require('child_process')",
    'better-sqlite3': 'commonjs better-sqlite3',
    // ...
  }
  // ...
};

// ...


var prodConfig = {
  // ...
  externals: {
    // ...
    fs: "require('fs')",
    os: "require('os')",
    path: "require('path')",
    child_process: "require('child_process')",
    'better-sqlite3': 'commonjs better-sqlite3',
    // ...
  }
  // ...
};
```