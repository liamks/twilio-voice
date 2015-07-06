/*jshint node:true*/

var program = require('commander');


program
  .option('-t, --text-to-speech', 'Text-To-Speech')
  .option('-s, --speech-to-text', 'Speech-To-Text')
  .parse(process.argv);

var express = require('express');
var bodyParser = require('body-parser');

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

// create a new express server
var app = express();

// serve the files out of ./public as our main files
// mimetype of post request from twilio are: application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended : true }));
app.use(express.static(__dirname + '/public'));

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();


// ROUTES
app.use('/twilio', require('./routers/twilio.js'));

var textToSpeech = require('./libs/text-to-speech.js');
var speechToText = require('./libs/speech-to-text.js');

if (program.textToSpeech) {
  textToSpeech.create('Please name 5 animals, then press "#".')
    .then(function(url){
      console.log(url);
    }, function(err){
      console.log(err);
    });
} else if(program.speechToText) {
  speechToText.getText('https://api.twilio.com/2010-04-01/Accounts/ACc490a107e47de3969dc55d8e36a6c07e/Recordings/REec477ddbe86af937590ce6c99de6ef5b')
} else {
  // start server on the specified port and binding host
  app.listen(appEnv.port, appEnv.bind, function() {

    // print a message when the server starts listening
    console.log("server starting on " + appEnv.url);
  });

}
