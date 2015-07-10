var changecase = require('change-case');

function Utils() {
  return Utils;
};

Utils.changeCase = function changeCase(caseType, obj) {
  var output = {};
  var keys = Object.keys(obj);
  var converter = changecase[caseType];

  keys.forEach(function(key) {
    output[converter(key)] = obj[key];
  });

  return output;
};

module.exports = Utils();
