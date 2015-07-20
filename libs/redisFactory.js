var cfenv = require('cfenv');
var config = require('../config.js');
var redisConfig = config.redis
var redis = require('redis');
var appEnv = cfenv.getAppEnv();

module.exports = {
  getClient: function getClient() {
    if (appEnv.isLocal) {
      return redis.createClient();
    }

    return redis.createClient(redisConfig.port, redisConfig.host, {
      auth_pass: redisConfig.password
    });
  }
};

