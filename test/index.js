'use strict';

var assert = require('assert');
var nodeWizMd = require('../lib');
var fs = require('fs');
var path = require('path');
var glob = require('glob');

describe('node-wiz-md', function () {
  it('normal: test.md', function (done) {

    nodeWizMd('test/fixtures/normal/', 'tmp/', {
      completeFn: function () {
        var tmp = fs.readFileSync('tmp/test.md', 'utf8');
        var expect = fs.readFileSync('test/expected/test.md', 'utf8');
        assert.equal(tmp, expect);
        done();
      }
    });

  });

  it('customcontent: custom.md', function (done) {

    nodeWizMd('test/fixtures/customcontent/', 'tmp/', {
      contentFn: function (content) {
        return content.replace('test', 'helinjiang');
      },
      completeFn: function () {
        var tmp = fs.readFileSync('tmp/custom.md', 'utf8');
        var expect = fs.readFileSync('test/expected/custom.md', 'utf8');
        assert.equal(tmp, expect);
        done();
      },
      debug: true
    });

  });

  it('useimg: testimg.md', function (done) {

    nodeWizMd('test/fixtures/useimg/', 'tmp/', {
      completeFn: function () {
        // md 文件必须一致
        var tmp = fs.readFileSync('tmp/testimg.md', 'utf8');
        var expect = fs.readFileSync('test/expected/testimg.md', 'utf8');
        assert.equal(tmp, expect);

        // 图片必须存在且一致
        var tmpImgArr = glob.sync('tmp/images/testimg.md/*.*');
        var expectImgArr = glob.sync('test/expected/images/testimg.md/*.*');

        var tmpImgStr = tmpImgArr.map(function (item) {
          return path.basename(item);
        }).sort().join('');

        var expectImgStr = expectImgArr.map(function (item) {
          return path.basename(item);
        }).sort().join('');

        assert.equal(tmpImgStr, expectImgStr);

        done();
      }
    });

  });

});
