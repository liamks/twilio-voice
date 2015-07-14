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
    var questions = [{id: 1}, {id: 2}];
    var callSid = 'a2b7';

    function cacheUser(callSid, questions, index) {
      return new Promise(function(resolve, reject) {
        redis.HMSET(callSid, {
          questions: questions,
          questionIndex: index
        }, function(err) {
          if (err) {
            return reject(err);
          }

          resolve(callSid);
        });
      });
    };

    function deleteUser(callSid){
      return new Promise(function(resolve, reject){
        redis.del(callSid, function(err){
          if (err) {
            return reject(err);
          }

          resolve(callSid);          
        });
      });
    }

    afterEach(function(done){
      deleteUser(callSid).then(function(){
        done();
      });
    });

    it('return the 1st question', function() {
      var talk2Me = require(talk2MePath);
      var session = {
        CallSid: callSid,
        questions: questions
      };

      return cacheUser(callSid, JSON.stringify(questions), 0)
        .then(function() {
          return talk2Me.getNextQuestionForSession(callSid);
        })
        .then(function(question) {
          expect(question).to.deep.equal(questions[0]);
        });
    });

    it('return the 2nd question', function() {
      var talk2Me = require(talk2MePath);
      var session = {
        CallSid: callSid,
        questions: questions
      };

      return cacheUser(callSid, JSON.stringify(questions), 1)
        .then(function() {
          return talk2Me.getNextQuestionForSession(callSid);
        })
        .then(function(question) {
          expect(question).to.deep.equal(questions[1]);
        });
    });

    it('should return null since there are no more questions', function() {
      var talk2Me = require(talk2MePath);
      var session = {
        CallSid: callSid,
        questions: questions
      };

      return cacheUser(callSid, JSON.stringify(questions), 2)
        .then(function() {
          return talk2Me.getNextQuestionForSession(callSid);
        })
        .then(function(question) {
          expect(question).to.equal(null);
        });
    });

    it('should handle JSON parse error', function() {

    });
  });
});
