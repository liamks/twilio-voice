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

describe('Survey', function() {
  describe('has not started and no auth', function() {
    var callSid = 777;
    var survey;

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
          question:
           { index: 0,
             instruction: 'After the beep please enter your passcode',
             numDigits: 4,
             key: 'passcode',
             url: 'https://s3.amazonaws.com/twilio-ad-telephony/6923670f5b757a0b1c6dc71715a84df859605c59.wav' },
          authComplete: false
        });
      });
    });
  });

  describe('has not started, but has started auth', function() {

  });

  describe('has not started, but just finished auth', function() {

  });

  describe('has started survey', function() {

  });

  describe('has just finished survey', function() {

  });
});
