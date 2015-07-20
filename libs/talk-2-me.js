var request = require('request');
var redisFactory = require('./redisFactory');
var utils = require('./utils.js');
var config = require('../config.js');
var talk2MeConfig = config.talk2Me;

function Talk2Me() {
  Talk2Me.redis = redisFactory.getClient();
  return Talk2Me;
};

Talk2Me.hasSessionStarted = function hasSessionStarted(sid) {
  return new Promise(function(resolve, reject) {
    Talk2Me.redis.EXISTS(sid, function(err, exists) {
      if (err) {
        return reject(err);
      }

      resolve(exists === 1);
    });
  });
};

Talk2Me.EXPIRE_KEY_TIME = 60 * 60; // 1 hour

Talk2Me.done = {
  done: true,
  instruction: 'You have completed the suvey, thank you and goodbye.'
};

Talk2Me.AUTHENTICATION_QUESTIONS = [
  {
    index: 0,
    instruction: 'Please enter your 4 digit passcode',
    numDigits: 4,
    key: 'passcode'
  },
  {
    index: 1,
    instruction: 'Please enter the 4 digits of your birth year',
    numDigits: 4,
    key: 'birthYear'
  },
  {
    index: 2,
    instruction: 'Please enter the 2 digits of your birth month',
    numDigits: 2,
    key: 'birthMonth'
  },
  {
    index: 3,
    instruction: 'Please enter the 2 digits of your birth day',
    numDigits: 2,
    key: 'birthDay'
  }
];

Talk2Me.authKey = function authKey(sid) {
  return sid + '-auth';
}

Talk2Me.getNextAuthQuestion = function getNextAuthQuestion(sid) {
  return new Promise(function(resolve, reject) {
    var authKey = Talk2Me.authKey(sid);
    var multi = Talk2Me.redis.multi();

    multi.HGET(authKey, 'index');
    multi.HINCRBY(authKey, 'index', 1);
    multi.EXPIRE(authKey, Talk2Me.EXPIRE_KEY_TIME);

    multi.exec(function(err, results) {
      if (err) {
        return reject(err);
      }

      var index = results[0] === null ? 0 : parseInt(results[0], 10);

      if (index === Talk2Me.AUTHENTICATION_QUESTIONS.length) {
        return resolve(null);
      }

      resolve(Talk2Me.AUTHENTICATION_QUESTIONS[index]);
    });
  });
};

Talk2Me.setAuthAnswer = function setAuthAnswer(sid, key, value) {
  return new Promise(function(resolve, reject) {
    var authKey = Talk2Me.authKey(sid);

    // when we have real passcodes, fix this hack
    if (key === 'passcode') {
      value = parseInt(value, 10);
    }

    Talk2Me.redis.HSET(authKey, key, value, function(err, response) {
      if (err) {
        return reject(err);
      }

      resolve();
    });
  });
};

Talk2Me.getAuthAnswers = function getAuthAnswers(sid) {
  return new Promise(function(resolve, reject) {
    var authKey = Talk2Me.authKey(sid);

    Talk2Me.redis.HGETALL(authKey, function(err, auth) {
      if (err) {
        return reject(err);
      }

      resolve(auth);
    });
  });
};
/*
  Get first question:
  1. fetches all remaining questinos for session
  2. sorts the quesetions
  3. transforms questions
  4. caches questions in redis
  5. resolves with the first questions
*/
Talk2Me.getFirstQuestion = function getQuestionsForStart(user) {
  return Talk2Me.fetchQuestions(user)
                .then(Talk2Me.sortQuestions)
                .then(Talk2Me.transformInstructions)
                .then(Talk2Me.cacheUsersSession)
                .then(function(u) {
                  return u.questions[0];
                });
};

Talk2Me.fetchQuestions = function fetchQuestions(user) {
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
      form: user,
      headers: {'X-Requested-With': 'XMLHttpRequest'}
    }, function(error, reponse, body) {
      if (error) {
        return reject(error);
      }

      body = JSON.parse(body);

      // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
      user.questions = body.session_task_instances;
      user.sessionId = body.session_id;
      user.CallSid = user.call_sid;
      resolve(user);
    });
  });
};

Talk2Me.sortQuestions = function sortQuestions(user) {
  return new Promise(function(resolve, reject) {
    user.questions = user.questions.sort(function(q1, q2) {
      // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
      if (q1.session_task_instance_id > q2.session_task_instance_id) {
        return 1;
      }else {
        return -1;
      }
    });

    resolve(user);
  });
};

Talk2Me.transformInstruction = function transformInstruction(taskId, instructions, values) {
  var transformer = {
    1: function(i, v) {
      // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
      return {
        text: i.replace('#WORD#', v[0].value_text),
        time: 0
      };
    },

    8: function(i, v) {
      // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
      return {
        text: i.replace('#SENTENCE#', v[0].value_text)
               .replace('[BLANK]', 'BLANK'),
        time: 0
      };
    },

    10: function(i, v) {
      // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
      return {
        text: i.replace('#STORY#', v[0].value_text)
               .replace(/[\\\r\n]+/g, ' '),
        time: 0
      };
    },

    11: function(i, v) {
      // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
      var option1 = 'Option 1: ' + v[1].value_text + '.';
      var option2 = 'Option 2: ' + v[2].value_text + '.';
      var options = ': ' + option1 + ' ' + option2;

      return {
        text: i.replace('#SENTENCE#', v[0].value_text)
               .replace('#OPTIONS#', options),
        time: 0
      };
    },

    12: function(i, v) {
      // random words
      var category = v[0].value_text.match(/<strong>(.+)<\/strong>/)[1];
      var time = parseInt(v[0].value_text.match(/_(\d+)sec/)[1], 10);

      return {
        text: i.replace('#ITEM#', category),
        time: time
      };
    },

    13: function(i, v) {
      // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
      return {
        text: v[0].value_text,
        time: 0
      }
    }
  }[taskId];

  return transformer(instructions, values);
};

Talk2Me.transformInstructions = function transformInstructions(user) {
  return new Promise(function(resolve, reject) {
    user.questions = user.questions.map(function(question) {
      var taskId = question.task_id;
      var originalInstruction = question.task_instruction;
      var values = question.values;

      var instruction = Talk2Me.transformInstruction(taskId, originalInstruction, values);
      return {
        responseId: question.response_id,
        taskId: question.task_id,
        order: question.order,
        sessionTaskInstanceId: question.session_task_instance_id,
        sessionTaskId: question.session_task_id,
        instruction: instruction.text,
        time: instruction.time
      };
    });

    resolve(user);
  });
};

Talk2Me.cacheUsersSession = function cacheUsersSession(user) {
  return new Promise(function(resolve, reject) {
    Talk2Me.redis.HMSET(user.CallSid, {
      callSid: user.CallSid,
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

    multi.HINCRBY(callSid, 'questionIndex', 1);
    multi.HGETALL(callSid);
    multi.EXPIRE(callSid, Talk2Me.EXPIRE_KEY_TIME);

    multi.exec(function(err, results) {
      if (err) {
        return reject(err);
      }

      var usersSession = results[1];

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
