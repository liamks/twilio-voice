var express = require('express');
var twilio = require('twilio');
var twilioRouter = express.Router();

var textToSpeech = require('../libs/text-to-speech');

// https://www.twilio.com/docs/howto/walkthrough/automated-survey/node/express#3

var questions = [
  {
    id: 0,
    kind: 'keys',
    say: 'Please enter your 4 digit code',
    options: {
      numDigits: 4,
      timeout: 60
    }
  },
  {
    id: 1,
    kind: 'voice',
    say: 'Please say your name, then press the pound key',
    options: {
      maxLength: 60
    }
  },
  {
    id: 2,
    kind: 'voice',
    say: 'Please say today\'s date, then press the pound key',
    options: {
      maxLength: 30
    }
  },
  {
    id: 3,
    kind: 'keys',
    say: 'What does 4 plus 3 equal?',
    options: {
      timeout: 60,
      numDigits: 1
    }
  }
];

var connectedUsers = {};
var completedCalls = [];

twilioRouter.post('/', function(req, res) {
  var user = connectedUsers[req.body.CallSid];
  var resp = new twilio.TwimlResponse();
  var input = req.body.RecordingUrl || req.body.Digits;

  console.log(input);

  if (!user) {
    connectedUsers[req.body.CallSid] = req.body;
    user = connectedUsers[req.body.CallSid];
    user.step = 0;
  }

  if (user.step >= 4) {
    resp.say({voice: 'woman'}, 'Thank you, goodbye.').hangup();

    res.set('Content-Type', 'text/xml');
    return res.send(resp.toString());
  }

  var question = questions[user.step];

  user.step += 1;

  textToSpeech.create(question.say).then(function(url) {

    resp.play(url);

    // add action to options?
    if (question.kind === 'voice') {
      question.options.finishOnKey = '#';
      resp.record(question.options);
    } else {
      resp.gather(question.options);
    }

    res.set('Content-Type', 'text/xml');

    res.send(resp.toString());
  });
});

// twilioRouter.post('/questionnaire', function(req, res){
//   var user = connectedUsers[req.body.CallSid];
//   console.log(new Date());
//   console.log(req.body);
//   var resp = new twilio.TwimlResponse();

//   resp.say({voice : 'woman'}, 'Thank you, goodbye.').hangup();

//   res.set('Content-Type', 'text/xml');
//   res.send(resp.toString());
// });

// twilioRouter.post('/recording', function(req, res){
//   console.log(req.body.CallSid);
//   console.log(req.body.RecordingUrl);
//   res.send('');
// });

twilioRouter.post('/completed', function(req, res) {
  var user = connectedUsers[req.body.CallSid];
  completedCalls.push(user);
  delete connectedUsers[req.body.CallSid]
  console.log('Call completed');
  res.send('');
});

module.exports = twilioRouter;
