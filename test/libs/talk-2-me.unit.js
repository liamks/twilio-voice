var redis = require('redis').createClient();
var expect = require('chai').expect;

// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
var mockQuestions = require('../mock-data/questions').session_task_instances;

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
                          question.task_id,
                          question.task_instruction,
                          question.values);
      expect(instruction.text).to.equal('After the beep, please say the definition for questing.');
    });

    it('should handle question of type 8', function() {
      var question = mockQuestions[6];
      var instruction = talk2Me.transformInstruction(
                          question.task_id,
                          question.task_instruction,
                          question.values);
      expect(instruction.text).to.equal('You will hear a sentence. Please say the words that are missing after the beep. Starting sentence. They turned at the bottom of Kate\'s steps and moved off in the direction of the BLANK.');
    });

    it('should handle question of type 10', function() {
      var question = mockQuestions[11];
      var instruction = talk2Me.transformInstruction(
                          question.task_id,
                          question.task_instruction,
                          question.values);
      expect(instruction.text).to.equal('You will hear a story. After the beep please retell the story in your own words. Starting story. The Rainbow When the sunlight strikes raindrops in the air, they act like a prism and form a rainbow.  A rainbow is the division of white light into many beautiful colors.  These take the shape of a large, round arch, with its path high above and its two ends apparently beyond the horizon. There is, according to legend, a boiling pot of gold at one end.  People look but no one ever finds it.  When a man looks for something beyond his reach, his friends say he is looking for the pot of gold at the end of the rainbow. ');
    });

    it('should handle question of type 11', function() {
      var question = mockQuestions[12];
      var instruction = talk2Me.transformInstruction(
                          question.task_id,
                          question.task_instruction,
                          question.values);
      expect(instruction.text).to.equal('You will hear a sentence, followed by a question with two possible answers. After you hear those answers, please select the answer number by pressing one or two. Starting sentence. Emma\'s mother had died long ago, and her place had been taken by an excellent woman as governess. Whose place had been taken?. Here are your options : Option 1: Emma\'s mother. Option 2: Emma.');
    });

    it('should handle question of type 12 (random words)', function() {
      var question = mockQuestions[17];
      var instruction = talk2Me.transformInstruction(
                          question.task_id,
                          question.task_instruction,
                          question.values);
      expect(instruction.text).to.equal('After the beep, please say as many different items of type ENGLISH WORDS STARTING WITH "t" that come to mind randomly.');
      expect(instruction.time).to.equal(60);
    });

    it('should handle question of type 13', function() {
      var question = mockQuestions[18];
      var instruction = talk2Me.transformInstruction(
                          question.task_id,
                          question.task_instruction,
                          question.values);
      expect(instruction.text).to.equal('How are you feeling today on a scale from 1 (very sad) to 10 (very happy)?');
    });
  });
});
