
module.exports = function(skill, info, bot, message) {
  var request = require('request');
  request('http://www.foaas.com/version', function (error, response, body) {
    if (!error && response.statusCode == 200) {
      //console.log(body) // Show the HTML for the Google homepage.
      bot.reply(message, body)
    }
  })
  //bot.reply(message, 'I understood this as ' + skill + ', but you haven\'t configured how to make me work yet! Tell your local code monkey to fill in the code module for ' + skill);
};
