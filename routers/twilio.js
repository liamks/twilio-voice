var express = require('express');
var twilio = require('twilio');
var twilioRouter = express.Router();

// https://www.twilio.com/docs/howto/walkthrough/automated-survey/node/express#3
var connectedUsers = {};
var completedCalls = [];

twilioRouter.post('/', function(req, res){
  connectedUsers[req.body.CallSid] = req.body;
  connectedUsers[req.body.CallSid].step = 1;

  var resp = new twilio.TwimlResponse();

  resp.say({voice : 'woman'}, 'Please list 5 animals and press "#" when you are done.')
    .record({
      transcribe : true,
      transcribeCallback : '/twilio/transcribe',
      maxLength : 120,
      action : '/twilio/questionnaire',
      finishOnKey : '#'
    });

  res.set('Content-Type', 'text/xml');

  res.send(resp.toString());
});


twilioRouter.post('/questionnaire', function(req, res){
  var user = connectedUsers[req.body.CallSid];
  console.log(new Date());
  console.log(req.body);
  var resp = new twilio.TwimlResponse();

  resp.say({voice : 'woman'}, 'Thank you, goodbye.').hangup();

  res.set('Content-Type', 'text/xml');
  res.send(resp.toString());
});

twilioRouter.post('/transcribe', function(req, res){
  console.log(new Date());
  console.log(req.body);
  res.send('');
});

twilioRouter.post('/recording', function(req, res){
  console.log(req.body.CallSid);
  console.log(req.body.RecordingUrl);
  res.send('');
});

twilioRouter.post('/completed', function(req, res){
  var user = connectedUsers[req.body.CallSid];
  completedCalls.push(user);
  delete connectedUsers[req.body.CallSid]
  console.log('Call completed');
  res.send('');
});

module.exports = twilioRouter;