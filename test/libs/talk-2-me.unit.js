var redis = require('redis').createClient();
var expect = require('chai').expect;
var mockery = require('mockery');

var mockResponse = require('../mock-data/questions');

// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
var mockQuestions = mockResponse.session_task_instances;

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

describe('Talk2Me', function() {
  var callSid = 444;
  var talk2Me;

  beforeEach(function() {
    talk2Me = require(talk2MePath);
  });

  afterEach(function(done) {
    deleteUser(callSid).then(function() {
      done();
    });
  });

  describe('hasSessionStarted', function() {
    it('should return true if session has started', function() {
      return cacheUser(callSid, [], 0)
        .then(talk2Me.hasSessionStarted)
        .then(function(started) {
          expect(started).to.be.true;
        });
    });

    it('should return false if session has not stated', function() {
      return talk2Me.hasSessionStarted(callSid).then(function(started) {
        expect(started).to.be.false;
      });
    });
  });

  describe('getNextAuthQuestion', function() {
    var callSid = 444;
    var talk2Me;

    beforeEach(function() {
      talk2Me = require(talk2MePath);
    });

    afterEach(function(done) {
      deleteUser(callSid + '-auth').then(function() {
        done();
      });
    });

    it('should return the first auth question', function() {
      return talk2Me.getNextAuthQuestion(callSid).then(function(q) {
        expect(q).to.deep.equal(talk2Me.AUTHENTICATION_QUESTIONS[0]);
      });
    });

    it('should return the 2nd auth question', function() {
      return talk2Me.getNextAuthQuestion(callSid).then(function() {
        return talk2Me.getNextAuthQuestion(callSid).then(function(q) {
          expect(q).to.deep.equal(talk2Me.AUTHENTICATION_QUESTIONS[1]);
        });
      });
    });

    it('should return null, if auth complete', function() {
      var promises = [];
      var numAuthQuestions = talk2Me.AUTHENTICATION_QUESTIONS.length;
      for (var i = 0; i < numAuthQuestions + 1; i++) {
        promises.push(talk2Me.getNextAuthQuestion(callSid));
      };

      return Promise.all(promises).then(function(results) {
        expect(results[numAuthQuestions]).to.be.null;
      });
    });
  });

  describe('setAuthAnswer', function() {
    var callSid = 444;
    var talk2Me;

    beforeEach(function() {
      talk2Me = require(talk2MePath);
    });

    afterEach(function(done) {
      deleteUser(talk2Me.authKey(callSid)).then(function() {
        done();
      });
    });

    it('should set the auth key-value', function(done) {
      return talk2Me.getNextAuthQuestion(callSid).then(function() {
        talk2Me.setAuthAnswer(callSid, 0, '0044').then(function() {
          redis.HGETALL(talk2Me.authKey(callSid), function(err, response) {
            expect(response).to.deep.equal({
              index: '1',
              userPasscode: '44'
            });

            done();
          });
        });
      });
    });
  });

  describe('getAuthAnswers', function(done) {
    var callSid = 444;
    var talk2Me;

    beforeEach(function() {
      talk2Me = require(talk2MePath);
    });

    afterEach(function(done) {
      deleteUser(talk2Me.authKey(callSid)).then(function() {
        done();
      });
    });

    it('should return the user\'s full auth object', function() {
      return talk2Me.getNextAuthQuestion(callSid).then(function() {
        return talk2Me.setAuthAnswer(callSid, 0, '0044').then(function() {
          return talk2Me.getAuthAnswers(callSid).then(function(auth) {
            expect(auth).to.deep.equal({
              index: '1',
              userPasscode: '44'
            });
          });
        });
      });
    });
  });

  describe('fetchQuestions', function() {
    var requestMock = function r() {};

    var talk2Me;

    beforeEach(function() {
      mockery.enable({
        warnOnReplace: false,
        warnOnUnregistered: false,
        useCleanCache: true
      });

    });

    after(function() {
      mockery.disable();
    });

    it('should resolve with correct params', function() {
      var user = {
        userPasscode: 38,
        userBirthyear: 1981,
        userBirthmonth: 8,
        userBirthday: 11
      };

      requestMock = function(options, cb) {
        expect(options.headers).to.deep.equal({'X-Requested-With': 'XMLHttpRequest'});
        expect(options.form.user_passcode).to.equal(user.userPasscode);
        cb(null, null, JSON.stringify({
          session_task_instances: [{}],
          session_id: 1
        }));
      };

      mockery.registerMock('request', requestMock);
      talk2Me = require(talk2MePath);

      return talk2Me.fetchQuestions(user).then(function(u) {
        expect(u.questions).to.deep.equal([{}]);
        expect(u.sessionId).to.equal(1);
      });
    });

    it.skip('should reject the promise because authPass has not been supplied', function() {

    });
  });

  describe('getFirstQuestion', function() {
    var requestMock;
    var talk2Me;
    var callSid = 444;

    beforeEach(function() {
      mockery.enable({
        warnOnReplace: false,
        warnOnUnregistered: false,
        useCleanCache: true
      });
    });

    after(function() {
      mockery.disable();
    });

    afterEach(function(done) {
      deleteUser(callSid).then(function() {
        done();
      });
    });

    it('should fetch questions, sort them, transform them and cache them and return the first question', function() {
      var user = {
        userPasscode: 38,
        userBirthyear: 1981,
        userBirthmonth: 8,
        userBirthday: 11,
        CallSid: callSid
      };

      requestMock = function(options, cb) {
        cb(null, null, JSON.stringify(mockResponse));
      };

      mockery.registerMock('request', requestMock);
      talk2Me = require(talk2MePath);

      return talk2Me.getFirstQuestion(user).then(function(firstQuestion) {
        expect(firstQuestion).to.deep.equal({
          responseId: 1964,
          taskId: 1,
          order: 10,
          sessionTaskInstanceId: 1964,
          sessionTaskId: 585,
          instruction: 'After the beep, please say the definition for questing.',
          time: 0
        });

        return {CallSid: callSid}
      })
      .then(getSessionFromRedis)
      .then(function(session) {
        expect(session.questions).to.have.length(19);
        expect(session.questionIndex).to.equal(0);
      });
    });
  });

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
            callSid: 'a2b7',
            questions: [{}],
            questionIndex: 0
          });
        });
    });
  });

  describe('getNextQuestionForSession', function() {
    var questions = [{id: 1}, {id: 2}, {id: 3}];
    var callSid = 'a2b7';

    afterEach(function(done) {
      deleteUser(callSid).then(function() {
        done();
      });
    });

    it('return the 2nd question', function() {
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
          expect(question).to.deep.equal(questions[1]);
        });
    });

    it('return the 3nd question', function() {
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
          expect(question).to.deep.equal(questions[2]);
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

  describe('transformInstructions', function() {
    var talk2Me;

    beforeEach(function() {
      talk2Me = require(talk2MePath);
    });

    it('should transform all of the instructions', function() {
      var user = {
        questions: mockQuestions
      };

      return talk2Me.transformInstructions(user).then(function(u) {
        var q0 = u.questions[0];
        var q12 = u.questions[12];
        var q17 = u.questions[17];

        expect(q0.instruction).to.equal('After the beep, please say the definition for questing.');
        expect(q0.sessionTaskInstanceId).to.equal(1964);

        expect(q12.instruction).to.equal('You will hear a sentence, followed by a question with two possible answers. After you hear those answers, please select the answer number by pressing one or two. Starting sentence. Emma\'s mother had died long ago, and her place had been taken by an excellent woman as governess. Whose place had been taken?. Here are your options : Option 1: Emma\'s mother. Option 2: Emma.');
        expect(q12.sessionTaskInstanceId).to.equal(1976);

        expect(q17.instruction).to.equal('After the beep, please say as many different items of type ENGLISH WORDS STARTING WITH "t" that come to mind randomly.');
        expect(q17.sessionTaskInstanceId).to.equal(1981);
      });
    });
  });
});
