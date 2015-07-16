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
  Survey.redis = redis.createClient();
  return Survey;
}

Survey._hasSurveyStarted = function _hasSurveyStarted() {

};

Survey._getQuestion = function _getQuestion() {

};

Survey._textToSpeech = function _textToSpeech() {

};

Survey.getNextQuestion = function getNextQuestion(sid) {
  var obj
  return obj;
};
