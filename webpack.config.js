const path = require('path');

module.exports = {
    entry: './src/entry.ts',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },

    devServer: {
        contentBase: './docs'
    },
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'docs'),
    },
};