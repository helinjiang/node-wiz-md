# node-wiz-md [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url] [![Coverage percentage][coveralls-image]][coveralls-url]
> Resolve markdown files from wiz local files.

将为知笔记中的markdown文章解析出来，包括其中插入的图片等。

## Installation

```sh
$ npm install --save node-wiz-md
```

## Usage

```js
var nodeWizMd = require('node-wiz-md');

nodeWizMd(wizPath, mdPath, options);
```

- `wizPath`, string，要处理的为知笔记的目录
- `mdPath`, string，获得markdown文件之后的保存目录
- `options`, object，可选，目前支持以下参数：
	- `options.debug`, boolean，是否打印日志，默认为 `false`
	- `options.contentFn`, function，每处理一个笔记，可以通过该方法自定义再处理笔记内容，并返回最终保存在markdown文件的内容。接受一个参数 `content` ，返回一个新的 `content` 内容
	- `options.completeFn`, function，所有处理完毕之后的回调函数

## License

MIT © [helinjiang](http://www.helinjiang.com)

## Release history
2015.12.22 v0.3.0 采用队列来控制，避免多个任务同时执行时的混乱。同时增加 `options.debug` 参数，用于打印相关日志到控制台

2015.12.22 v0.2.0 优化了逻辑，不再使用临时目录；增加了日志输出；部分逻辑采用同步处理方式，性能可能有影响但使得程序更容易控制

2015.12.20 v0.1.1 如果不是为知笔记，则不解压；修复匹配body区域的正则表达式

[npm-image]: https://badge.fury.io/js/node-wiz-md.svg
[npm-url]: https://npmjs.org/package/node-wiz-md
[travis-image]: https://travis-ci.org/helinjiang/node-wiz-md.svg?branch=master
[travis-url]: https://travis-ci.org/helinjiang/node-wiz-md
[daviddm-image]: https://david-dm.org/helinjiang/node-wiz-md.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/helinjiang/node-wiz-md
[coveralls-image]: https://coveralls.io/repos/helinjiang/node-wiz-md/badge.svg
[coveralls-url]: https://coveralls.io/r/helinjiang/node-wiz-md
