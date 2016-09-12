
module.exports = function(skill, info, bot, message) {
    bot.reply(message,'These are my current commands: ' );
    var builtinPhrases = require('/../builtins');

var customPhrasesText;
var customPhrases;
try {
  customPhrasesText = fs.readFileSync(__dirname + '/../custom-phrases.json').toString();
} catch (err) {
  throw new Error('Uh oh, Bottie could not find the ' +
    'custom-phrases.json file, did you move it?');
}
try {
  customPhrases = JSON.parse(customPhrasesText);
} catch (err) {
  throw new Error('Uh oh, custom-phrases.json was ' +
    'not valid JSON! Fix it, please? :)');
    
    bot.reply(message,'These are all my currently supported commands: ');
    Object.keys(builtinPhrases).forEach(function(key) {
    bot.reply(message, builtinPhrases[key]);
    //callback(key, builtinPhrases[key]);
  });
    Object.keys(customPhrases).forEach(function(key) {
    bot.reply(message, customPhrases[key]);
    //callback(key, builtinPhrases[key]);
  });  
};
