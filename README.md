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

nodeWizMd(wizPath, mdPath, contentFn, completeFn);
```

- `wizPath`, string，要处理的为知笔记的目录
- `mdPath`, string，获得markdown文件之后的保存目录
- `contentFn`, function，每处理一个笔记，可以通过该方法自定义再处理笔记内容，并返回最终保存在markdown文件的内容。接受一个参数 `content` ，返回一个新的 `content` 内容
- `completeFn`, function，所有处理完毕之后的回调函数

## License

MIT © [helinjiang](http://www.helinjiang.com)


[npm-image]: https://badge.fury.io/js/node-wiz-md.svg
[npm-url]: https://npmjs.org/package/node-wiz-md
[travis-image]: https://travis-ci.org/helinjiang/node-wiz-md.svg?branch=master
[travis-url]: https://travis-ci.org/helinjiang/node-wiz-md
[daviddm-image]: https://david-dm.org/helinjiang/node-wiz-md.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/helinjiang/node-wiz-md
[coveralls-image]: https://coveralls.io/repos/helinjiang/node-wiz-md/badge.svg
[coveralls-url]: https://coveralls.io/r/helinjiang/node-wiz-md
