'use strict';

var fs = require('fs');
var path = require('path');

var glob = require('glob');
var unzip = require('unzip');
var mkdirp = require('mkdirp');
var iconv = require('iconv-lite');
var async = require('async');

var allWizArr = [];
var config = {};
var index = 0;
var total = 0;

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
  console.log('\n=======================================');

  // 当前的为知笔记相对于config.wizBasePath的相对路径
  var wizRelativePath = allWizArr[index];

  console.log('Begin deal .ziw of %s (%s/%s)', wizRelativePath, index + 1, total);

  // 当前wiz文件原始的文件名，比如test.md.wiz，则其原始文件名为test.md
  var curWizName = path.basename(wizRelativePath, '.ziw');

  // 当前wiz文件的完整路径
  var curWizPath = path.join(config.wizBasePath, wizRelativePath);

  // 当前wiz文件相对于wizBasePath的子目录，解析之后的md文件也要按该目录结构存放
  var curWizSubDir = path.dirname(wizRelativePath);

  // 解析之后的 markdown 文件保存的文件夹目录
  var mdSaveDir = path.join(config.mdBasePath, curWizSubDir);

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

      console.log('[on entry] deal %s in %s', fileName, curWizPath);

      if (fileName === 'index.html') {
        //entry.pipe(fs.createWriteStream(path.join(unzipPath, wizRelativePath) + '.html')).on('finish',function(tee){
        //  console.log('[on entry][createWriteStream]',wizRelativePath,tee);
        //  var content = fs.readFileSync(path.join(unzipPath, wizRelativePath) + '.html');
        //  content = iconv.decode(content, 'utf16');
        //  console.log(content);
        //});
        entry.pipe(iconv.decodeStream('utf16')).collect(function (errCollect, decodedBody) {

          if (errCollect) {
            console.error('[on entry][collect] ', curWizPath, fileName, errCollect);
            return;
          }

          // 默认的获得的 markdown 内容
          var content = getNewContent(decodedBody, imgSaveDirInMdFiles);

          // 自定义修改content
          if (typeof config.options.contentFn === 'function') {
            var newContent = config.options.contentFn(content);
            if (newContent) {
              console.log('[on entry] contentFn run and return a new content!');
              content = newContent;
            }
          }

          // 创建要保存的文件目录：如果之前不存在，则创建之，且返回已创建的路径；如果已存在则不处理，返回 null。
          var mkdirpMdSaveDir = mkdirp.sync(mdSaveDir);
          if (mkdirpMdSaveDir) {
            console.log('[on entry] mkdirp %s', mkdirpMdSaveDir);
          }

          // md 文件保存的本地路径
          var mdSavePath = path.join(mdSaveDir, curWizName);
          fs.writeFileSync(mdSavePath, content);

          console.log('[on entry] %s saved!', mdSavePath);

        });

      } else if (['.jpg', '.png', '.gif'].indexOf(path.extname(fileName).toLowerCase()) > -1) {
        // xx/testimg.md.ziw/index_files/a.jpg 修改为 xx/images/testimg/a.jpg

        // 创建要保存的文件目录：如果之前不存在，则创建之，且返回已创建的路径；如果已存在则不处理，返回 null。
        var mkdirpImgSaveDir = mkdirp.sync(imgSaveDir);
        if (mkdirpImgSaveDir) {
          console.log('[on entry] mkdirp %s', mkdirpImgSaveDir);
        }

        // img 文件保存的本地路径
        var imgSavePath = path.join(imgSaveDir, path.basename(fileName));

        entry.pipe(fs.createWriteStream(imgSavePath)).on('finish', function () {
          console.log('[on entry] %s saved!', imgSavePath);
        });

      } else {
        console.log('[on entry] Ignore %s, because we do not care it', fileName);

        entry.autodrain();

      }

    })
    .on('close', function () {
      // see https://nodejs.org/api/stream.html#stream_event_close
      console.log('End deal .ziw of %s (%s/%s)', wizRelativePath, index + 1, total);
      console.log('=======================================');

      index++;
      callback();
    });
}

/**
 * 处理函数
 *
 * @param {string} wizBasePath wiz文件夹
 * @param {string} mdBasePath 转换之后导出的文件夹
 * @param {object} [options] 额外的参数，目前支持contentFn和completeFn
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

  // TODO 注意，此处要重新初始化！！否则该值将会被继续使用导致出错！
  // 我是在运行mocha测试时发现，同时运行两个及以上用例时只会成功一个。原因未知。
  allWizArr = [];
  config = {};
  index = 0;
  total = 0;

  // 找到所有的为知笔记本地文件 .ziw 的文件路径，注意该数组中的值是相对于wizBasePath的相对路径
  allWizArr = glob.sync('**/*.ziw', {
    cwd: wizBasePath
  });
  console.log(allWizArr);

  // 设置总的文件数量
  total = allWizArr.length;

  // 设置配置参数
  config.wizBasePath = wizBasePath;
  config.mdBasePath = mdBasePath;
  config.options = options;

  // 开始执行任务
  // https://github.com/caolan/async#whilsttest-fn-callback
  async.whilst(
    function () {
      return index < total;
    },
    dealOne,
    function (err) {

      if (err) {
        console.error(err);
      } else {
        console.log('\nAll complete!');

        // 自定义修改content
        if (typeof config.options.completeFn === 'function') {
          console.log('\nNext to run completeFn()...\n');
          config.options.completeFn();
        }
      }

    }
  );
}

module.exports = resolve;
