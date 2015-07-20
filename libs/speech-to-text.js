var watson = require('watson-developer-cloud');
var AWS = require('aws-sdk');
var request = require('request');
var sox = require('sox');
var tmp = require('tmp');
var fs = require('fs');
var utils = require('./utils.js');
var config = require('../config.js');
var configAWS = config.aws;
var configWatson = config.watson.speechToText;

function SpeechToText() {
  AWS.config.update({
    region: configAWS.region,
    accessKeyId: configAWS.accessKeyId,
    secretAccessKey: configAWS.secretAccessKey
  });

  // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
  SpeechToText.watson = watson.speech_to_text({
    username: configWatson.username,
    password: configWatson.password,
    version: 'v1',
    url: configWatson.url
  });

  return SpeechToText;
}

SpeechToText.createTempFile = function createTempFile(postfix) {
  return new Promise(function(resolve, reject) {
    tmp.file({postfix: postfix}, function _tempFileCreated(err, path, fd, cleanupFn) {
      if (err) {
        console.log('error creating temp file');
        return reject(err);
      }

      resolve({
        path: path,
        fd: fd,
        cleanupFn: cleanupFn
      });
    });
  });
};

SpeechToText.createTempFiles = function createTempFiles(obj) {
  var tempFiles = [SpeechToText.createTempFile('.wav'), SpeechToText.createTempFile('.wav')];

  return Promise.all(tempFiles).then(function(files) {
    obj.source = files[0];
    obj.upsample = files[1];
    return obj;
  });
};

SpeechToText.downloadWav = function downloadWav(obj) {
  return new Promise(function(resolve, reject) {
    var sourceStream = fs.createWriteStream(obj.source.path);
    sourceStream.on('finish', function() {
      resolve(obj);
    });

    request(obj.url)
      .on('error', reject)
      .pipe(sourceStream);
  });
};

SpeechToText.transcodeTo16k = function transcodeTo16k(obj) {
  return new Promise(function(resolve, reject) {
    var job = sox.transcode(obj.source.path, obj.upsample.path, {
      sampleRate: 16000,
      format: 'wav',
      channelCount: 1
    });

    job.on('error', reject);

    job.on('end', function() {
      console.log('coversion done');
      resolve(obj);
    });

    job.start();
  });
};

SpeechToText.toText = function toText(obj) {
  return new Promise(function(resolve, reject) {
    var params = utils.changeCase('snakeCase', {
      audio: fs.createReadStream(obj.upsample.path),
      contentType: 'audio/l16; rate=16000'
    });

    SpeechToText.watson.recognize(params, function(err, res) {
      if (err) {
        return reject(err);
      }

      obj.res = res;

      resolve(obj);
    });
  });
};

SpeechToText.cleanUp = function cleanUp(obj) {
  return new Promise(function(resolve, reject) {
    obj.source.cleanupFn();
    obj.upsample.cleanupFn();
    resolve(obj);
  });
};

SpeechToText.getText = function getText(wavUrl) {
  var obj = {
    url: wavUrl
  };

  SpeechToText.createTempFiles(obj)
    .then(SpeechToText.downloadWav)
    .then(SpeechToText.transcodeTo16k)
    .then(SpeechToText.toText)
    .then(SpeechToText.cleanUp);
};

module.exports = SpeechToText();
