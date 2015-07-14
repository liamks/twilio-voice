var redis = require('redis').createClient();
var expect = require('chai').expect;
var mockQuestions = require('../mock-data/questions')['session_task_instances'];

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

    function deleteUser(callSid) {
      return new Promise(function(resolve, reject) {
        redis.del(callSid, function(err) {
          if (err) {
            return reject(err);
          }

          resolve(callSid);          
        });
      });
    }

    afterEach(function(done) {
      deleteUser(callSid).then(function() {
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

  describe('transformInstruction', function() {
    var talk2Me;

    beforeEach(function() {
      talk2Me = require(talk2MePath);
    });

    it('should handle question of type 1', function() {
      var question = mockQuestions[0];
      var instruction = talk2Me.transformInstruction(
                          question['task_id'],
                          question['task_instruction'],
                          question.values);
      expect(instruction).to.equal('After the beep, please say the definition for questing.');
    });

    it('should handle question of type 8', function() {
      var question = mockQuestions[6];
      expect(question['task_id']).to.equal(8);
    });

    it('should handle question of type 10', function() {
      var question = mockQuestions[11];
      expect(question['task_id']).to.equal(10);
    });

    it('should handle question of type 11', function() {
      var question = mockQuestions[12];
      expect(question['task_id']).to.equal(11);
    });

    it('should handle question of type 12', function() {
      var question = mockQuestions[17];
      expect(question['task_id']).to.equal(12);
    });

    it('should handle question of type 13', function() {
      var question = mockQuestions[18];
      expect(question['task_id']).to.equal(13);
    });
  });
});
