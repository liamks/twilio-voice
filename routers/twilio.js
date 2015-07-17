var express = require('express');
var twilio = require('twilio');
var twilioRouter = express.Router();

var Survey = require('../libs/survey.js');

// https://www.twilio.com/docs/howto/walkthrough/automated-survey/node/express#3

var DTMF_TIMEOUT = 60; // 1 minute
var RECORDING_TIMEOUT = 60 * 5; // 5 minutes

twilioRouter.post('/:type/:index', function(req, res) {
  var callSid = req.body.CallSid;
  var questionType = req.params.type;
  var index = req.params.index;
  var resp = new twilio.TwimlResponse();
  var input = req.body.RecordingUrl || req.body.Digits;

  Survey.saveAnswer({
    CallSid: callSid,
    index: index,
    answer: input
  }).then(function() {
    Survey.getNextQuestion(callSid).then(function(question) {
      resp.play(question.url);

      if (question.done) {
        // user is done questionnaire
        resp.hangout();
      } else if (question.numDigits) {
        // user must enter digits
        resp.gather({
          numDigits: question.numDigits,
          timeout: DTMF_TIMEOUT
        });
      } else {
        // user must answer with their voice
        resp.record({
          finishOnKey: '#',
          maxLength: RECORDING_TIMEOUT
        });
      }

      res.set('Content-Type', 'text/xml');
      res.send(resp.toString());
    });
  }, function() {
    // error need to handle
  });
});

twilioRouter.post('/completed', function(req, res) {
  console.log('Call completed sid: ', req.body.CallSid);
  res.send();
});

module.exports = twilioRouter;
