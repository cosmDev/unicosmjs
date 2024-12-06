// Generated using webpack-cli https://github.com/webpack/webpack-cli
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const WorkboxWebpackPlugin = require('workbox-webpack-plugin');

const isProduction = process.env.NODE_ENV == 'production';

const config = {
    entry: './app.js',
    output: {
        filename: "unicosm.js",
        path: path.resolve(__dirname, 'dist'),
        library: 'exportCosmosConfig',        
        libraryExport: "default" ,
        libraryTarget: 'umd'
    },
    resolve: {
      fallback: {
        buffer: false,
        crypto: false,
        events: false,
        path: false,
        stream: false,
        string_decoder: false,
      },
    },    
};

module.exports = () => {
    if (isProduction) {
        config.mode = 'production';      
        config.plugins.push(new WorkboxWebpackPlugin.GenerateSW());        
    } else {
        config.mode = 'development';
    }
    return config;
};