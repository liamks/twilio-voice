var request = require('request');
var redis = require('redis');
var utils = require('./utils.js');
var config = require('../config.js');
var talk2MeConfig = config.talk2Me;

function Talk2Me() {
  Talk2Me.redis = redis.createClient();
  return Talk2Me;
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
      body: user,
      json: true,
      headers: {'X-Requested-With': 'XMLHttpRequest'}
    }, function(error, reponse, body) {
      if (error) {
        return reject(error);
      }

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
