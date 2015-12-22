'use strict';

var fs = require('fs');
var path = require('path');

var glob = require('glob');
var unzip = require('unzip');
var mkdirp = require('mkdirp');
var iconv = require('iconv-lite');
var async = require('async');

// 队列
var queue = [];

// 当前是否有正在运行
var isRun = false;

function Wiz(wizBasePath, mdBasePath, options) {
  this.wizBasePath = wizBasePath;
  this.mdBasePath = mdBasePath;
  this.options = options;

  this.allWizArr = [];
  this.index = 0;
}

/**
 * 处理要保存的 markdown 内容，并保存新的内容。
 * @param {string} content markdown 内容
 * @param {string} imgRelativePath 图片相对于markdown的地址，以便进行替换路径，使之可以在md文件中正常访问
 * @returns {string}
 */
function getNewContent(content, imgRelativePath) {
  // 获得body中的内容
  content = content.match(/<body>((.|\r|\n)*)<\/body>/)[1];

  // 获得文章的内容，注意将<br/>替换为\r\n，将 &gt; 转义为 > ，将 &lt; 转义为 <
  content = content.replace(/<br\/>/g, '\r\n').replace(/&gt;/g, '>').replace(/&lt;/g, '<');

  // 删除img图片
  content = content.replace(/<div.*name="markdownimage"[^>]*>.*<\/div>/g, '');

  // 修改md中的相对图片
  content = content.replace(/\((index_files)[^\)]*\)/g, function (world, p1) {
    return world.replace(p1, imgRelativePath.replace(/\\/g, '/'));
  });

  return content;
}

/**
 * 处理其中一个wiz本地文件，并从中获得 markdown 文件和 图片
 * @param  {function} callback 回调方法，见https://github.com/caolan/async模块说明
 */
function dealOne(callback) {
  myLog('\n=======================================');

  var index = queue[0].index;

  var allWizArr = queue[0].allWizArr;

  var total = allWizArr.length;

  // 当前的为知笔记相对于queue[0].wizBasePath的相对路径
  var wizRelativePath = allWizArr[index];

  myLog('Begin deal .ziw of %s (%s/%s)', wizRelativePath, index + 1, total);

  // 当前wiz文件原始的文件名，比如test.md.wiz，则其原始文件名为test.md
  var curWizName = path.basename(wizRelativePath, '.ziw');

  // 当前wiz文件的完整路径
  var curWizPath = path.join(queue[0].wizBasePath, wizRelativePath);

  // 当前wiz文件相对于wizBasePath的子目录，解析之后的md文件也要按该目录结构存放
  var curWizSubDir = path.dirname(wizRelativePath);

  // 解析之后的 markdown 文件保存的文件夹目录
  var mdSaveDir = path.join(queue[0].mdBasePath, curWizSubDir);

  // 解析之后的 image 文件相对于解析之后的markdown保存的文件夹目录，用于替换在md文件中的引用
  var imgSaveDirInMdFiles = path.join('images', path.basename(curWizName, '.md'));

  // 解析之后的 image 文件保存的文件夹目录
  var imgSaveDir = path.join(mdSaveDir, imgSaveDirInMdFiles);

  // 开始解压并处理，压缩文件中每一个文件都会触发一次 entry 事件。
  fs.createReadStream(curWizPath)
    .pipe(unzip.Parse())
    .on('entry', function (entry) {
      // 解压之后的其中一个文件名
      var fileName = entry.path;

      myLog('[on entry] deal %s in %s', fileName, curWizPath);

      if (fileName === 'index.html') {
        //entry.pipe(fs.createWriteStream(path.join(unzipPath, wizRelativePath) + '.html')).on('finish',function(tee){
        //  myLog('[on entry][createWriteStream]',wizRelativePath,tee);
        //  var content = fs.readFileSync(path.join(unzipPath, wizRelativePath) + '.html');
        //  content = iconv.decode(content, 'utf16');
        //  myLog(content);
        //});
        entry.pipe(iconv.decodeStream('utf16')).collect(function (errCollect, decodedBody) {

          if (errCollect) {
            console.error('[on entry][collect] ', curWizPath, fileName, errCollect);
            return;
          }

          // 默认的获得的 markdown 内容
          var content = getNewContent(decodedBody, imgSaveDirInMdFiles);

          // 自定义修改content
          if (typeof queue[0].options.contentFn === 'function') {
            var newContent = queue[0].options.contentFn(content);
            if (newContent) {
              myLog('[on entry] contentFn run and return a new content!');
              content = newContent;
            }
          }

          // 创建要保存的文件目录：如果之前不存在，则创建之，且返回已创建的路径；如果已存在则不处理，返回 null。
          var mkdirpMdSaveDir = mkdirp.sync(mdSaveDir);
          if (mkdirpMdSaveDir) {
            myLog('[on entry] mkdirp %s', mkdirpMdSaveDir);
          }

          // md 文件保存的本地路径
          var mdSavePath = path.join(mdSaveDir, curWizName);
          fs.writeFileSync(mdSavePath, content);

          myLog('[on entry] %s saved!', mdSavePath);

        });

      } else if (['.jpg', '.png', '.gif'].indexOf(path.extname(fileName).toLowerCase()) > -1) {
        // xx/testimg.md.ziw/index_files/a.jpg 修改为 xx/images/testimg/a.jpg

        // 创建要保存的文件目录：如果之前不存在，则创建之，且返回已创建的路径；如果已存在则不处理，返回 null。
        var mkdirpImgSaveDir = mkdirp.sync(imgSaveDir);
        if (mkdirpImgSaveDir) {
          myLog('[on entry] mkdirp %s', mkdirpImgSaveDir);
        }

        // img 文件保存的本地路径
        var imgSavePath = path.join(imgSaveDir, path.basename(fileName));

        entry.pipe(fs.createWriteStream(imgSavePath)).on('finish', function () {
          myLog('[on entry] %s saved!', imgSavePath);
        });

      } else {
        myLog('[on entry] Ignore %s, because we do not care it', fileName);

        entry.autodrain();

      }

    })
    .on('close', function () {
      // see https://nodejs.org/api/stream.html#stream_event_close
      myLog('End deal .ziw of %s (%s/%s)', wizRelativePath, index + 1, total);
      myLog('=======================================');

      queue[0].index++;
      callback();
    });
}

/**
 * 处理函数
 *
 * @param {string} wizBasePath wiz文件夹
 * @param {string} mdBasePath 转换之后导出的文件夹
 * @param {object} [options] 额外的参数，目前支持debug、contentFn和completeFn
 */
function resolve(wizBasePath, mdBasePath, options) {
  if (!wizBasePath) {
    console.error('Unkown wizBasePath: ', wizBasePath);
    return;
  }
  if (!mdBasePath) {
    console.error('Unkown mdBasePath: ', mdBasePath);
    return;
  }

  if (!options) {
    options = {};
  }

  var wizObj = new Wiz(wizBasePath, mdBasePath, options);
  queue.push(wizObj);

  deal();
}

function deal() {
  if (isRun) {
    //myLog("==== isRun ", queue.length);
    return;
  }

  if (!queue.length) {
    //myLog("==== queue is empty!");
    return;
  }
  isRun = true;

  // 找到所有的为知笔记本地文件 .ziw 的文件路径，注意该数组中的值是相对于wizBasePath的相对路径
  queue[0].allWizArr = glob.sync('**/*.ziw', {
    cwd: queue[0].wizBasePath
  });
  myLog('\n>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
  myLog('READY to deal %s : ', queue[0].wizBasePath, queue[0].allWizArr);

  // 开始执行任务
  // https://github.com/caolan/async#whilsttest-fn-callback
  async.whilst(
    function () {
      return queue[0].index < queue[0].allWizArr.length;
    },
    dealOne,
    function (err) {

      if (err) {
        console.error(err);
      } else {
        myLog('\nAll complete!');

        // 自定义修改content
        if (typeof queue[0].options.completeFn === 'function') {
          myLog('\nNext to run completeFn()...');
          queue[0].options.completeFn();
          myLog('<<<<<<<<<<<<<<<<<<<<<<<<<<<<<');

          queue.shift();

          isRun = false;
          deal();
        }
      }

    }
  );
}

function myLog() {
  if (!queue[0]) {
    return;
  }

  var debug = queue[0].options.debug;

  // 默认值为0，意味着不打印任何日志
  if (!debug) {
    return;
  }

  console.log.apply(this, arguments);
}

module.exports = resolve;
