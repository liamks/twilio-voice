var request = require('request');
var redis = require('redis');
var utils = require('./utils.js');
var config = require('../config.js');
var talk2MeConfig = config.talk2Me;

function Talk2Me() {
  Talk2Me.redis = redis.createClient();
  return Talk2Me;
};

Talk2Me.getQuestionsForStart = function getQuestionsForStart(user) {
  return new Promise(function(resolve, reject) {
    var url = talk2MeConfig.rootUrl + 'phone/session';

    user.authName = talk2MeConfig.authName;
    user.authPass = talk2MeConfig.authPass;

    if (!user.authName || !user.authPass) {
      return reject('must specify authName and authPass');
    }

    user = utils.changeCase('snakeCase', user);

    request({
      method: 'POST',
      url: url,
      body: user,
      json: true,
      headers: {'X-Requested-With': 'XMLHttpRequest'}
    }, function(error, reponse, body) {
      if (error) {
        return reject(error);
      }

      user.questions = body;
      resolve(user);
    });
  });
};

Talk2Me.transformQuestionsForStart = function transformQuestionsForStart(user) {

};

Talk2Me.cacheUsersSession = function cacheUsersSession(user) {
  return new Promise(function(resolve, reject) {
    Talk2Me.redis.HMSET(user.CallSid, {
      questions: JSON.stringify(user.questions),
      questionIndex: 0
    }, function(err) {
      if (err) {
        return reject(err);
      }

      resolve(user);
    });
  });
};

/*
1. Get questions
2. Transform questions
3. Store questions in Redis by SID (from twilio)
4. Store index of task instance in Redis (start at 0)

1. GetNextQuestionForSession
*/

Talk2Me.getNextQuestionForSession = function getNextQuestionForSession(callSid) {
  // get session (it's a hash)
  // increment index, store in redis
  return new Promise(function(resolve, reject) {
    var multi = Talk2Me.redis.multi();

    multi.HGETALL(callSid);
    multi.HINCRBY(callSid, 'questionIndex', 1);

    multi.exec(function(err, results) {
      if (err) {
        return reject(err);
      }

      var usersSession = results[0];

      try {
        usersSession.questions = JSON.parse(usersSession.questions);
        usersSession.questionIndex = parseInt(usersSession.questionIndex, 10);
      } catch (e) {
        return reject(err);
      }

      if (usersSession.questions.length <= usersSession.questionIndex) {
        // completed questions
        return resolve(null);
      }

      resolve(usersSession.questions[usersSession.questionIndex]);
    });
  });
};

module.exports = Talk2Me();
