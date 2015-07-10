var request = require('request');
var changecase = require('change-case');
var config = require('../config.js');
var talk2MeConfig = config.talk2Me;

function Talk2Me(){
  return Talk2Me;
};

Talk2Me._changeCase = function _changeCase(obj){
  var output = {};
  var keys = Object.keys(obj);

  keys.forEach(function(key){
    output[changecase.snakeCase(key)] = obj[key];
  });

  return output;
};

Talk2Me.getQuestions = function getQuestions(user){
  return new Promise(function(resolve, reject){
    var url = talk2MeConfig.rootUrl + 'phone/session';

    user.authName = talk2MeConfig.authName;
    user.authPass = talk2MeConfig.authPass;

    if (!user.authName || !user.authPass){
      return reject('must specify authName and authPass');
    }

    user = Talk2Me._changeCase(user);

    request({
      method : 'POST',
      url : url,
      body : user,
      json : true
    }, function(error, reponse, body){
      if (error){
        return reject(error);
      }

      resolve(body);
    });
  });
};

module.exports = Talk2Me();