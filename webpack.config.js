module.exports = {
  entry: './src/rxhttp.ts',
  output: {
    path: __dirname,
    filename: 'dist/rxhttp.js'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },
  module: {
    rules: [
      { test: /\.tsx?$/, loader: 'awesome-typescript-loader', query: {
        declaration: false,
      } }
    ]
  }
}
