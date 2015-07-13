var redis = require('redis').createClient();
var expect = require('chai').expect;

var talk2MePath = '../../libs/talk-2-me.js';

function getSessionFromRedis(session) {
  return new Promise(function(resolve, reject) {
    redis.HGETALL(session.CallSid, function(err, usersSession) {
      if (err) {
        return reject(err);
      }

      usersSession.questions = JSON.parse(usersSession.questions);
      usersSession.questionIndex = parseInt(usersSession.questionIndex, 10);
      resolve(usersSession);
    });
  });
}

describe('Talk2Me', function() {
  describe('cacheUsersSession', function() {
    it('should store session', function() {
      var talk2Me = require(talk2MePath);
      var callSid = 'a2b7';
      var session = {
        CallSid: callSid,
        questions: [{}]
      };

      return talk2Me.cacheUsersSession(session)
        .then(getSessionFromRedis)
        .then(function(obj) {
          expect(obj).to.deep.equal({
            questions: [{}],
            questionIndex: 0
          });
        });
    });
  });

  describe('getNextQuestionForSession', function() {
    it('return the 1st question', function(){

    });
    
    it('return the 2nd question', function() {

    });

    it('should handle JSON parse error', function() {

    });

    it('should return null since there are no more questions', function() {

    });
  });
});
