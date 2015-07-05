var watson = require('watson-developer-cloud');
var fs = require('fs');
var config = require('../config.js').watson.textToSpeech;

var textToSpeech = watson.text_to_speech({
  username : config.username,
  password : config.password,
  version : 'v1',
  url : config.url
});


function TextToSpeech(){};

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

  textToSpeech
    .synthesize(params)
    .pipe(fs.createWriteStream('output.wav'));
};

module.exports = TextToSpeech;