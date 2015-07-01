var express = require('express');
var twilio = require('twilio');
var twilioRouter = express.Router();

twilioRouter.post('/', function(req, res){
  var resp = new twilio.TwimlResponse();
  console.log(req.body);
  resp.say({voice : 'woman'}, 'You have reached Liam\'s mailbox please leave a message.')
    .record({
      maxLength : 120,
      action : '/twilio/recording'
    });

  res.set('Content-Type', 'text/xml');

  res.send(resp.toString());
});

twilioRouter.post('/recording', function(req, res){
  console.log(req.body);
  res.send('');
})

twilioRouter.post('/completed', function(req, res){
  console.log(req.body);
  res.send('');
});

module.exports = twilioRouter;