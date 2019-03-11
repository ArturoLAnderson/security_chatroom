# 聊天室客户端

## 命令

### 安装依赖

    npm install

### 运行开发环境

    npm run serve

自定义端口号

    npm run serve -- --port 2019

### 打包项目

开发环境

    npm run dev

生产环境

    npm run build

### 生成可供其他项目使用的 lib

生成 es5 项目代码

    npm run build:lib:es5

生成后的目录

    > tree ./
    ├── lib
    │   └── es5
    │       └── ...
    ├── src
    │   └── ...
    └── ...

chat_p2p 项目调用了当前项目中的代码
