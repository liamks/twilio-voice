var cfenv = require('cfenv');
var config = require('../config.js');
var redisConfig = config.redis
var redis = require('redis');

module.exports = {
  getClient: function getClient(){
    if(cfenv.isLocal){
      return redis.createClient();
    }

    return redis.createClient(redisConfig.port, redisConfig.host, {
      auth_pass: redisConfig.password
    });
  }
};


