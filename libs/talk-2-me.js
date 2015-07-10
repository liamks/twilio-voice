var request = require('request');
var utils = require('./utils.js');
var config = require('../config.js');
var talk2MeConfig = config.talk2Me;

function Talk2Me() {
  return Talk2Me;
};

Talk2Me.getQuestions = function getQuestions(user) {
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
      json: true
    }, function(error, reponse, body) {
      if (error) {
        return reject(error);
      }

      resolve(body);
    });
  });
};

module.exports = Talk2Me();
