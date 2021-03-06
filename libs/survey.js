var Talk2Me = require('./talk-2-me.js');
var TextToSpeech = require('./text-to-speech.js');
var redisFactory = require('./redisFactory');

/*
getNextQuestion(sid)
  1. check if sid exists
    a. if no,
      GET user info, store each step in redis
      when complete getFirstQuestion
    b. if yes, getNextQuestion
  2. is Question null
    a. if yes, survey is over (return null)
    b. if no, textToSpeech.create (return url)
*/

function Survey() {
  Survey.redis = redisFactory.getClient();
  return Survey;
}

Survey._hasSurveyStarted = function _hasSurveyStarted(sid) {
  return Talk2Me.hasSessionStarted(sid).then(function(started) {
    return {
      sid: sid,
      sessionStarted: started
    };
  });
};

Survey._getAuthQuestion = function _getAuthQuestion(obj) {
  return new Promise(function(resolve, reject) {
    if (obj.sessionStarted) {
      obj.authComplete = true;
      return resolve(obj);
    }

    return Talk2Me.getNextAuthQuestion(obj.sid).then(function(authQuestion) {
      obj.questionType = 'auth';
      obj.question = authQuestion;
      obj.authComplete = authQuestion === null;
      return resolve(obj);
    }, reject);
  });
};

Survey._isAuthComplete = function _isAuthComplete(obj) {
  return new Promise(function(resolve, reject) {
    if (obj.sessionStarted) {
      return resolve(obj);
    }

    if (obj.authComplete) {
      return Talk2Me.getAuthAnswers(obj.sid).then(function(authAnswers) {
        obj.authAnswers = authAnswers;
        obj.authAnswers.CallSid = obj.sid;
        return resolve(obj);
      }, reject);
    }

    return resolve(obj);
  });
};

/*
  If auth is done, we need to use the auth answers to fetch
  the questions.
*/
Survey._getQuestion = function _getQuestion(obj) {
  return new Promise(function(resolve, reject) {
    if (!obj.authComplete) {
      return resolve(obj);
    }

    if (obj.sessionStarted) {
      return Talk2Me.getNextQuestionForSession(obj.sid).then(function(question) {
        obj.question = question;
        obj.questionType = 'survey';

        // participant is done questionnaire
        if (question === null) {
          obj.question = Talk2Me.done;
        }

        return resolve(obj);
      }, reject);
    }else {
      return Talk2Me.getFirstQuestion(obj.authAnswers).then(function(question) {
        obj.questionType = 'survey';
        obj.question = question;
        return resolve(obj);
      }, reject);
    }
  });
};

Survey._textToSpeech = function _textToSpeech(obj) {
  return new Promise(function(resolve, reject) {
    return TextToSpeech.create(obj.question.instruction).then(function(url) {
      obj.question.url = url;
      resolve(obj);
    }, reject);
  });
};

Survey.getNextQuestion = function getNextQuestion(sid) {
  return Survey._hasSurveyStarted(sid)
               .then(Survey._getAuthQuestion)
               .then(Survey._isAuthComplete)
               .then(Survey._getQuestion)
               .then(Survey._textToSpeech);
};

Survey.saveAnswer = function saveAnswer(obj) {
  //questionType = 'survey'||'auth'
  return new Promise(function(resolve, reject) {
    if (!obj.answer) {
      return resolve(); // conversation has just started
    }

    if (obj.questionType === 'auth') {
      Talk2Me.setAuthAnswer(obj.CallSid, obj.index, obj.answer).then(resolve, reject);
    } else if (obj.questionType === 'survey') {
      resolve('need to implement saving survey answer');
    } else {
      resolve('starting');
    }
  });
};

module.exports = Survey();
