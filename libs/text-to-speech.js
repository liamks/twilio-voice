var watson = require('watson-developer-cloud');
var AWS = require('aws-sdk');
var crypto = require('crypto');
var config = require('../config.js');
var configAWS = config.aws;
var configWatson = config.watson.textToSpeech;
var cache = {};

function TextToSpeech() {
  AWS.config.update({
    region: configAWS.region,
    accessKeyId: configAWS.accessKeyId,
    secretAccessKey: configAWS.secretAccessKey
  });

  // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
  TextToSpeech.watson = watson.text_to_speech({
    username: configWatson.username,
    password: configWatson.password,
    version: 'v1',
    url: configWatson.url
  });

  return TextToSpeech;
};

TextToSpeech.url = function url(filename) {
  return configAWS.url + configAWS.bucket + '/' + filename;
};

TextToSpeech.sha1 = function sha1(obj) {
  return new Promise(function(resolve, reject) {
    var shasum = crypto.createHash('sha1');
    shasum.update(obj.text);

    // update the object
    obj.sha1 = shasum.digest('hex');
    obj.sha1Filename = obj.sha1 + '.wav';

    resolve(obj);
  });
};

TextToSpeech.checkCache = function checkCache(obj) {
  return new Promise(function(resolve, reject) {
    var url = cache[obj.text];

    if (url) {
      obj.cache = 'memory';
      obj.url = url;
    }

    resolve(obj);
  });
};

TextToSpeech.checkS3 = function checkS3(obj) {
  return new Promise(function(resolve, reject) {

    if (obj.url) {
      return resolve(obj);
    }

    var s3 = new AWS.S3();
    var params = {
      Bucket: configAWS.bucket,
      Key: obj.sha1Filename
    };

    s3.headObject(params, function(err) {
      if (!err) {
        // file exists
        obj.url = TextToSpeech.url(obj.sha1Filename);
        cache[obj.text] = TextToSpeech.url(obj.sha1Filename);
        obj.cache = 's3';
      }

      resolve(obj);
    });
  });
};

TextToSpeech.createWavFile = function createWavFile(obj) {
  return new Promise(function(resolve, reject) {
    if (obj.url) {
      return resolve(obj);
    }

    var s3obj = new AWS.S3({params: {
      Bucket: configAWS.bucket,
      Key: obj.sha1Filename,
      ACL: 'public-read',
      ContentType: 'audio/wav'
    }});

    var params = {
      text: obj.text,
      voice: 'en-US_MichaelVoice',
      accept: 'audio/wav'
    };

    var bufs = [];

    TextToSpeech.watson
      .synthesize(params)
      .on('error', function(err) {
        reject(error);
      })
      .on('data', function(d) {
        bufs.push(d);
      })
      .on('end', function() {
        var buf = Buffer.concat(bufs);
        s3obj.upload({Body: buf})
          .send(function(err, data) {
            if (err) {
              return reject(err);
            }

            obj.url =  TextToSpeech.url(obj.sha1Filename);
            cache[obj.text] = TextToSpeech.url(obj.sha1Filename);
            resolve(obj);
          });
      });
  });
};

TextToSpeech.create = function create(text) {
  var obj = { text: text };

  return TextToSpeech.sha1(obj)
    .then(TextToSpeech.checkCache)
    .then(TextToSpeech.checkS3)
    .then(TextToSpeech.createWavFile)
    .then(function() {
      return obj.url;
    });
};

module.exports = TextToSpeech();
