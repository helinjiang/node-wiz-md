'use strict';

var fs = require('fs');
var unzip = require('unzip');
var walkSync = require('walk-sync');
var iconv = require('iconv-lite');
var path = require('path');
var mkdirp = require('mkdirp');
var temp = require('temp');
var copy = require('copy');
var rmdir = require('rmdir');


var allFiles = [];

/**
 * 遍历某路径下所有的文件。
 * @param {string} paths 路径
 * @return {function} 回调，接收一个参数item: {basePath,relativePath,size,mtime}
 * @see https://www.npmjs.com/package/walk-sync
 */
function walk(paths, callback) {
  var entry = walkSync.entries(paths, {
    directories: false
  });

  entry.forEach(function (item) {
    callback(item);
  });
}

/**
 * 解压wiz
 * @param {string} wizPath wiz原文件地址目录
 * @param {function} entryCallback 每解压一次则调用一次，其中的entry即为当前的文件流
 */
function unzipWiz(wizPath, entryCallback) {
  walk(wizPath, function (item) {
    //fs.createReadStream(path.join(item.basePath, item.relativePath)).pipe(unzip.Extract({
    //  path: path.join(dirPath, item.relativePath)
    //}));

    allFiles.push(item);

    fs.createReadStream(path.join(item.basePath, item.relativePath))
      .pipe(unzip.Parse())
      .on('entry', function (entry) {
        entryCallback(item, entry);
      });
  });
}

/**
 * 将解压之后的文件，转换成md文件存储
 * @param {string} unzipPath 解压之后存放的目录
 * @param {string} mdPath 转换成md后存放的目录
 */
function saveMdFiles(unzipPath, mdPath, contentFn, completeFn) {
  var i = 0;
  mkdirp(mdPath, function (err) {
    if (err) {
      console.error('mkdirp error: ', err);
      return;
    }

    walk(unzipPath, function (item) {
      var filePath = path.join(item.basePath, item.relativePath);
      var saveFileName = path.basename(item.relativePath.slice(0, -5), '.ziw');
      //console.log(filePath, saveFileName);

      // 特殊处理，api-config.md 文件不处理
      if (saveFileName === 'api-config.md') {
        return;
      }

      // 如果是图片，则拷贝过去
      if (path.extname(saveFileName) !== '.md') {
        var imgInitPath = path.join(item.basePath, item.relativePath);
        var imgCopyTo = path.join(mdPath, 'images', path.dirname(item.relativePath));

        copy(imgInitPath, imgCopyTo, function (err1) {
          if (err1) {
            console.error('copy Error!', imgInitPath, imgCopyTo, err1);
          }
          console.log('copy success!', item.relativePath);
        });
        return;
      }

      // 读取文件
      var content = fs.readFileSync(filePath);

      // 将其中的字符进行转码。注意解压之后的文件是使用uft-16编码的。
      content = iconv.decode(content, 'utf16');

      // 获得body中的内容
      content = content.match(/<body>(.*)<\/body>/)[1];

      // 获得文章的内容，注意将<br/>替换为\r\n，将 &gt; 转义为 > ，将 &lt; 转义为 <
      content = content.replace(/<br\/>/g, '\r\n').replace(/&gt;/g, '>').replace(/&lt;/g, '<');
      //console.log(content);

      // 删除img图片
      content = content.replace(/<div.*name="markdownimage"[^>]*>.*<\/div>/g, '');

      // 修改md中的相对图片
      content = content.replace(/\((index_files)[^\)]*\)/g, function (world, p1) {
        return world.replace(p1, path.join('images', saveFileName).replace(/\\/g, '/'));
      });

      // 自定义修改content
      if (typeof contentFn === 'function') {
        var newContent = contentFn(content);
        if (newContent) {
          content = newContent;
        }
      }

      fs.writeFile(path.join(mdPath, saveFileName), content, function (err2) {
        if (err2) {
          throw err2;
        }
        console.log(saveFileName + ' saved!');

        i++;
        if (allFiles.length <= i) {
          setTimeout(function () {
            // TODO
            //console.log('Next to delete:' + unzipPath);

            rmdir(unzipPath, function (err3) {
              if (err3) {
                console.error('delete failed:' + unzipPath, err3);
              }
            });

            completeFn();
          }, 100);
        }
      });
    });
  });
}

/**
 *
 * @param {string} wizPath wiz文件夹
 * @param {string} mdPath 转换之后导出的文件夹
 * @param {function} contentFn 每处理一个wiz md 文件内容调用的回调
 */
function resolve(wizPath, mdPath, contentFn, completeFn) {
  temp.mkdir('wizunzip', function (err, unzipPath) {
    //console.log(unzipPath);

    allFiles = [];
    var i = 0;

    unzipWiz(wizPath, function (item, entry) {
      // 当前文件名
      var fileName = entry.path;
      //console.log(fileName, item.relativePath);

      // TODO 此处只处理index.html，如果有图片等则暂未处理
      if (fileName === 'index.html') {
        entry.pipe(fs.createWriteStream(path.join(unzipPath, item.relativePath) + '.html'));

        // 由于此过程是异步的，每次执行都会进入此过程，因此只有当进入的次数和总数量一致时，我们才认为已经完成执行完了任务
        i++;
        //console.log(allFiles.length, i);
        if (allFiles.length <= i) {
          // TODO 因为无法判断最后一个解压是什么时候完成的，因此此处只能够延迟1s来执行
          setTimeout(function () {
            saveMdFiles(unzipPath, mdPath, contentFn, completeFn);
          }, 1000);
        }

      } else if (['.jpg', '.png', '.gif'].indexOf(path.extname(fileName).toLowerCase()) > -1) {
        // index_files/_u793A_u4F8B_u56FE_u7247_03.jpg testimg.md.ziw
        // testimg.md/_u793A_u4F8B_u56FE_u7247_03.jpg
        var imgPath = path.join(unzipPath, path.basename(item.relativePath, '.ziw'));
        mkdirp(imgPath, function (err1) {
          if (err1) {
            console.error('mkdirp error: ', imgPath, err1);
            return;
          }

          entry.pipe(fs.createWriteStream(path.join(imgPath, path.basename(fileName))));

        });
      } else {
        entry.autodrain();
      }
    });

  });
}

module.exports = resolve;