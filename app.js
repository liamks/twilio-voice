/*jshint node:true*/

var program = require('commander');


program
  .option('-t, --text-to-speech', 'Text-To-Speech')
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

if (program.textToSpeech) {
  textToSpeech.create('Please name 5 animals, then press "#".')
    .then(function(url){
      console.log('DONEEEE');
      console.log(url);
    }, function(err){
      console.log('error');
      console.log(err);
    });
} else {
  // start server on the specified port and binding host
  app.listen(appEnv.port, appEnv.bind, function() {

    // print a message when the server starts listening
    console.log("server starting on " + appEnv.url);
  });

}
