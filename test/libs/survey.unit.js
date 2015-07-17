var mockery = require('mockery');
var expect = require('chai').expect;
var redis = require('redis').createClient();

var mockResponse = require('../mock-data/questions');

// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
var mockQuestions = mockResponse.session_task_instances;

var surveyPath = '../../libs/survey.js';

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

/** S3 MOCK **/
var headObject = function(_, cb) {
  cb();
};

function AWS() {};

AWS.S3 = function S3() {};

AWS.config = {
  update: function() {

  }
};

AWS.S3.prototype.headObject = headObject;

describe('Survey', function() {
  describe('has not started and no auth', function() {
    var callSid = 777;
    var survey;

    beforeEach(function() {
      mockery.enable({
        warnOnReplace: false,
        warnOnUnregistered: false,
        useCleanCache: true
      });

      mockery.registerMock('aws-sdk', AWS);
      survey = require(surveyPath);
    });

    afterEach(function(done) {
      mockery.disable();
      deleteUser(callSid + '-auth').then(function() {
        done();
      });
    });

    it('should return first auth question and url for speech', function() {
      return survey.getNextQuestion(callSid).then(function(obj) {
        expect(obj).to.deep.equal({
          sid: 777,
          sessionStarted: false,
          questionType: 'auth',
          question: {
            index: 0,
            instruction: 'After the beep please enter your passcode',
            numDigits: 4,
            key: 'passcode',
            url: 'https://s3.amazonaws.com/twilio-ad-telephony/6923670f5b757a0b1c6dc71715a84df859605c59.wav'
          },
          authComplete: false
        });
      });
    });
  });

  describe('has not started, but has started auth', function() {
    var callSid = 777;
    var survey;

    beforeEach(function() {
      mockery.enable({
        warnOnReplace: false,
        warnOnUnregistered: false,
        useCleanCache: true
      });

      mockery.registerMock('aws-sdk', AWS);
      survey = require(surveyPath);
    });

    afterEach(function(done) {
      mockery.disable();
      deleteUser(callSid + '-auth').then(function() {
        done();
      });
    });

    it('should return second auth question and url for speech', function(done) {
      return survey.getNextQuestion(callSid).then(function() {
        return survey.getNextQuestion(callSid).then(function(obj) {
          expect(obj).to.deep.equal({
            sid: 777,
            sessionStarted: false,
            questionType: 'auth',
            question: {
              index: 1,
              instruction: 'After the beep please enter the 4 digits of your birth year',
              numDigits: 4,
              key: 'birthYear',
              url: 'https://s3.amazonaws.com/twilio-ad-telephony/b6ccf36c2b38b4f88f4019da33484ef97df3fe37.wav'
            },
            authComplete: false
          });

          done();
        });
      });
    });
  });

  describe('has not started, but just finished auth', function() {
    var callSid = 777;
    var survey;
    var requestMock = function(_, cb) {
      cb(null, null, JSON.stringify(mockResponse));
    };

    // NEED TO DELETE SESSION after test runs
    // Need to delete session after last question as well
    // need to delete auth after questions have been received

    beforeEach(function() {
      mockery.enable({
        warnOnReplace: false,
        warnOnUnregistered: false,
        useCleanCache: true
      });

      mockery.registerMock('aws-sdk', AWS);
      mockery.registerMock('request', requestMock);
      survey = require(surveyPath);
    });

    afterEach(function(done) {
      deleteUser(callSid + '-auth').then(function() {
        deleteUser(callSid).then(function() {
          done();
        });
      });

      mockery.disable();
    });

    it('should return first question of survey', function(done) {
      var promises = [
        survey.getNextQuestion(callSid),
        survey.getNextQuestion(callSid),
        survey.getNextQuestion(callSid),
        survey.getNextQuestion(callSid)
      ];

      return Promise.all(promises).then(function(results) {
        survey.getNextQuestion(callSid).then(function(obj) {
          expect(obj).to.deep.equal({
            sid: 777,
            sessionStarted: false,
            questionType: 'survey',
            question: {
              responseId: 1964,
              taskId: 1,
              order: 10,
              sessionTaskInstanceId: 1964,
              sessionTaskId: 585,
              instruction: 'After the beep, please say the definition for questing.',
              time: 0,
              url: 'https://s3.amazonaws.com/twilio-ad-telephony/e7177ca1c877bc511d2dfcef8a5c68b032ae61b3.wav'
            },
            authComplete: true,
            authAnswers: {
              index: '5',
              CallSid: 777,
              authName: 'system',
              authPass: '14a90af63c607ba3c1ff3906f9f5150b61eae1cc56654ef2595b7491c633619f156a8b08f1ae3798413e1bff17bf6a01f0cf1ae9417f8bfab2bce120e0fac5ba'
            }
          });
          done();
        });
      });
    });
  });

  describe('has started survey', function() {

  });

  describe('has just finished survey', function() {

  });
});
