/**
 * [description]
 *
 * @author helinjiang
 * @date 2015/12/19
 */

var fs = require('fs');
var unzip = require('unzip');
var fstream = require('fstream');
var walkSync = require('walk-sync');
var iconv = require('iconv-lite');
var path = require('path');

/**
 * 遍历某路径下所有的文件。
 * @param {string} paths 路径
 * @return {function} 回调，接收一个参数item: {basePath,relativePath,size,mtime}
 * @see https://www.npmjs.com/package/walk-sync
 */
function walk(paths, callback) {
    var entry = walkSync.entries(paths, {directories: false});

    entry.forEach(function (item) {
        callback(item);
    });
}

/**
 * 解压wiz
 * @param {string} dataPath wiz原文件地址目录
 * @param {string} unzipPath 解压之后存放的目录
 */
function unzipWiz(dataPath, unzipPath) {
    // 遍历wiz笔记的本地文件，并将其解压出来到wizunzip文件夹下
    walk(dataPath, function (item) {
        fs.createReadStream(path.join(item.basePath, item.relativePath)).pipe(unzip.Extract({path: path.join(unzipPath, item.relativePath)}));
    });
}


/**
 * 将解压之后的文件，转换成md文件存储
 * @param {string} unzipPath 解压之后存放的目录
 * @param {string} mdPath 转换成md后存放的目录
 */
function saveMdFiles(unzipPath, mdPath) {
    fs.stat(mdPath, function (err, stats) {
        if (err) {
            console.log('Next to create ' + mdPath);

            // TODO 此处不严谨，要处理多级目录。并且此处有问题
            fs.mkdirSync(mdPath);
        }

        var infoArr = [];

        walk(unzipPath, function (item) {
            var filePath = path.join(item.basePath, item.relativePath),
                saveFileName = path.basename(item.relativePath.slice(0, -11), '.ziw');
            //console.log(filePath, saveFileName);

            // 特殊处理，api-config.md 文件不处理
            if (saveFileName === "api-config.md") {
                return;
            }

            // 读取文件
            var content = fs.readFileSync(filePath);

            // 将其中的字符进行转码。注意解压之后的文件是使用uft-16编码的。
            content = iconv.decode(content, 'utf16');

            // 获得body中的内容
            content = content.match(/<body>(.*)<\/body>/)[1];

            // 获得文章的信息
            var tInfoObj = {},
                tInfoArr = content.split('--&gt;')[0].replace('&lt;!--', '').split('<br/>');

            tInfoArr.forEach(function (item) {
                if (!item) {
                    // 注意有可能有空元素，要过滤之
                    return;
                }
                var arr = item.split(":");
                tInfoObj[arr[0].trim()] = arr[1].trim();
            });
            //console.log(tInfoObj);
            infoArr.push(tInfoObj);

            // 获得文章的内容，注意将<br/>替换为\r\n，将 &gt; 转义为 > ，将 &lt; 转义为 <
            content = content.replace(/<br\/>/g, '\r\n').replace(/&gt;/g, '>').replace(/&lt;/g, '<');
            //console.log(content);

            fs.writeFile(path.join(mdPath, saveFileName), content, function (err) {
                if (err) throw err;
                console.log(saveFileName + ' saved!');
            });
        });

        fs.writeFile(path.join(mdPath, 'all.json'), JSON.stringify(infoArr), function (err) {
            if (err) throw err;
            console.log('\nall.json saved!\n');
        });

    });
}

function action() {
    unzipWiz('wizdata', 'wizunzip');

    saveMdFiles('wizunzip', 'wizmd');
}

action();


