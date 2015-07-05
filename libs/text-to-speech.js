var watson = require('watson-developer-cloud');
var fs = require('fs');
var crypto = require('crypto');
var config = require('../config.js').watson.textToSpeech;


function TextToSpeech(){
  TextToSpeech.watson = watson.text_to_speech({
    username : config.username,
    password : config.password,
    version : 'v1',
    url : config.url
  });

  TextToSpeech._cache = {};

  return TextToSpeech;
};

TextToSpeech.sha1 = function sha1(obj){
 return new Promise(function(resolve, reject){
  var shasum = crypto.createHash('sha1');
  shasum.update(obj.text);
  
  // update the object
  obj.sha1 = shasum.digest('hex');
  obj.sha1Filename = obj.shaw1 + '.wav';

  resolve(obj);
 });
};

TextToSpeech.checkCache = function checkCache(obj){

};

TextToSpeech.checkS3 = function checkS3(obj){

};


TextToSpeech.create = function create(text){
  // sha1 of text
  // check in-memory cache
  // check S3
  // if not in either cache, create wave file
  //  then stream to S3
  var params = {
    text : text,
    voice : 'en-US_MichaelVoice',
    accept : 'audio/wav'
  };

  TextToSpeech
    .watson
    .synthesize(params)
    .pipe(fs.createWriteStream('output1.wav'));
};

module.exports = TextToSpeech();