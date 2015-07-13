var mockery = require('mockery');
var expect = require('chai').expect;

var textToSpeechPath = '../../libs/text-to-speech.js';

describe('TextToSpeech', function() {
  describe('Constructor', function() {
    it('should return an instance of TexttoSpeech', function() {
      var textToSpeech = require(textToSpeechPath);

      expect(textToSpeech.name).to.equal('TextToSpeech');
    });
  });

  describe('url', function() {
    it('should return the url of a file on S3', function() {
      var textToSpeech = require(textToSpeechPath);
      var filename = 'adsf.wav';
      var expectedFilename = 'https://s3.amazonaws.com/twilio-ad-telephony/adsf.wav';

      expect(textToSpeech.url(filename)).to.equal(expectedFilename);
    });
  });

  describe('sha1', function() {
    it('should return a hex-shaw1 of the "text" value in object', function() {
      var textToSpeech = require(textToSpeechPath);
      var obj = {
        text: 'hello world'
      };
      var expectedObj = {
        text: 'hello world',
        sha1: '2aae6c35c94fcfb415dbe95f408b9ce91ee846ed',
        sha1Filename: '2aae6c35c94fcfb415dbe95f408b9ce91ee846ed.wav'
      };

      return textToSpeech.sha1(obj).then(function(o) {
        expect(o).to.deep.equal(expectedObj);
      });
    });
  });

  describe('checkCache', function() {
    it('should not find the sentence in the in memory cache', function() {
      var textToSpeech = require(textToSpeechPath);
      var obj = {
        text: 'hello world'
      };

      return textToSpeech.checkCache(obj).then(function() {
        expect(obj).to.deep.equal(obj);
      });
    });
  });

  describe('checkS3', function() {
    var textToSpeech;
    var headObject = function() {};

    function AWS() {};

    AWS.S3 = function S3() {};

    AWS.config = {
      update: function() {

      }
    };

    AWS.S3.prototype.headObject = headObject;

    beforeEach(function() {
      mockery.enable({
        warnOnReplace: false,
        warnOnUnregistered: false,
        useCleanCache: true
      });

      mockery.registerMock('aws-sdk', AWS);

      textToSpeech = require(textToSpeechPath);
    });

    after(function() {
      mockery.disable();
    });

    it('should not find the file on S3', function() {
      var obj = {
        text: 'hello world',
        sha1: '2aae6c35c94fcfb415dbe95f408b9ce91ee846ed',
        sha1Filename: '2aae6c35c94fcfb415dbe95f408b9ce91ee846ed.wav'
      };

      AWS.S3.prototype.headObject = function(params, cb) {
        cb('error');
      };

      return textToSpeech.checkS3(obj).then(function(o) {
        expect(obj).to.equal(o);
      });
    });

    it('should find the file on S3', function() {
      var obj = {
        text: 'hello world',
        sha1: '2aae6c35c94fcfb415dbe95f408b9ce91ee846ed',
        sha1Filename: '2aae6c35c94fcfb415dbe95f408b9ce91ee846ed.wav'
      };

      var expectedObj = {
        text: 'hello world',
        sha1: '2aae6c35c94fcfb415dbe95f408b9ce91ee846ed',
        sha1Filename: '2aae6c35c94fcfb415dbe95f408b9ce91ee846ed.wav',
        url: 'https://s3.amazonaws.com/twilio-ad-telephony/2aae6c35c94fcfb415dbe95f408b9ce91ee846ed.wav',
        cache: 's3'
      };

      AWS.S3.prototype.headObject = function(params, cb) {
        cb();
      };

      return textToSpeech.checkS3(obj).then(function(o) {
        expect(expectedObj).to.deep.equal(o);
      });
    });
  });
});
