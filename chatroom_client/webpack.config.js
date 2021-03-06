const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  entry: ['babel-polyfill', './src/app/app.js'],
  output: {
    path: path.join(__dirname, 'dist'),
    filename: '[name].[hash].js'
  },

  // production 模式下不生成 source map
  devtool:
    process.env['NODE_ENV'] === 'production' ? false : 'inline-source-map',

  module: {
    rules: [
      {
        test: /\.js$/,
        use: {
          loader: 'babel-loader'
        }
      },

      {
        test: /.(png|woff|woff2|eot|ttf|svg)$/,
        loader: 'url-loader?limit=100000'
      },

      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader']
      }
    ]
  },

  resolve: {
    extensions: ['*', '.js'],
    alias: {
      'chatroom-client': 'chatroom-client/lib/es5'
    },
    plugins: []
  },

  plugins: [
    new HtmlWebpackPlugin({ template: './src/app/app.html' }),
    new CleanWebpackPlugin(
      ['dist/main.*.js', 'dist/main.*.css'], //匹配删除的文件
      {
        root: __dirname, //根目录
        verbose: true, //开启在控制台输出信息
        dry: false //启用删除文件
      }
    ),
    new webpack.ProvidePlugin({
      $: 'jquery'
    }),

    new MiniCssExtractPlugin({
      filename: '[name].[chunkhash:8].css',
      chunkFilename: '[id].css'
    })
  ],
  devServer: {
    contentBase: [
      path.join(__dirname, 'dist'),
      path.join(__dirname, '../common')
    ], //静态文件根目录
    watchContentBase: true,
    port: 2018, // 端口
    host: 'localhost',
    overlay: true,
    compress: true // 服务器返回浏览器的时候是否启动gzip压缩
  }
};
