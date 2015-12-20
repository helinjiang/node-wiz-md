'use strict';

var assert = require('assert');
var nodeWizMd = require('../lib');
var fs = require('fs');
var path = require('path');
var glob = require('glob');

describe('node-wiz-md', function () {
  it('normal: test.md', function (done) {

    nodeWizMd('test/fixtures/normal/', 'tmp/', undefined, function () {
      var tmp = fs.readFileSync('tmp/test.md', 'utf8');
      var expect = fs.readFileSync('test/expected/test.md', 'utf8');
      assert.equal(tmp, expect);
      done();
    });

  });

  it('customcontent: custom.md', function (done) {

    nodeWizMd('test/fixtures/customcontent/', 'tmp/', function (content) {
      return content.replace('test', 'helinjiang');
    }, function () {
      var tmp = fs.readFileSync('tmp/custom.md', 'utf8');
      var expect = fs.readFileSync('test/expected/custom.md', 'utf8');
      assert.equal(tmp, expect);
      done();
    });

  });

  it('useimg: testimg.md', function (done) {

    nodeWizMd('test/fixtures/useimg/', 'tmp/', function (content) {
      return content.replace('test', 'helinjiang');
    }, function () {
      var tmp = fs.readFileSync('tmp/testimg.md', 'utf8');
      var expect = fs.readFileSync('test/expected/testimg.md', 'utf8');
      assert.equal(tmp, expect);


      var tmpImgArr = glob.sync('tmp/images/testimg.md/*.*');
      var expectImgArr = glob.sync('test/expected/images/testimg.md/*.*');

      var tmpImgStr = tmpImgArr.map(function (item) {
        return path.basename(item);
      }).join('');

      var expectImgStr = expectImgArr.map(function (item) {
        return path.basename(item);
      }).join('');

      assert.equal(tmpImgStr, expectImgStr);

      done();
    });

  });

});
