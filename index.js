
var fs = require('fs');

var Train = require('./src/train');
var Brain = require('./src/brain');
var Ears = require('./src/ears');
var builtinPhrases = require('./builtins');

var Bottie = {
  Brain: new Brain(),
  Ears: new Ears(process.env.SLACK_TOKEN)
};

var customPhrasesText;
var customPhrases;
try {
  customPhrasesText = fs.readFileSync(__dirname + '/custom-phrases.json').toString();
} catch (err) {
  throw new Error('Uh oh, Bottie could not find the ' +
    'custom-phrases.json file, did you move it?');
}
try {
  customPhrases = JSON.parse(customPhrasesText);
} catch (err) {
  throw new Error('Uh oh, custom-phrases.json was ' +
    'not valid JSON! Fix it, please? :)');
}

console.log('Bottie is learning...');
Bottie.Teach = Bottie.Brain.teach.bind(Bottie.Brain);
eachKey(customPhrases, Bottie.Teach);
eachKey(builtinPhrases, Bottie.Teach);
Bottie.Brain.think();
console.log('Bottie finished learning, time to listen...');
Bottie.Ears
  .listen()
  .hear('TRAINING TIME!!!', function(speech, message) {
    console.log('Delegating to on-the-fly training module...');
    Train(Bottie.Brain, speech, message);
  })
  .hear('.*', function(speech, message) {
    var interpretation = Bottie.Brain.interpret(message.text);
    console.log('Bottie heard: ' + message.text);
    console.log('Bottie interpretation: ', interpretation);
    if (interpretation.guess) {
      console.log('Invoking skill: ' + interpretation.guess);
      Bottie.Brain.invoke(interpretation.guess, interpretation, speech, message);
    } else {
      speech.reply(message, 'Hmm... I couldn\'t tell what you said...');
      speech.reply(message, '```\n' + JSON.stringify(interpretation) + '\n```');
    }
  });
  
  const { hears, storage: { channels } } = Bottie.Ears;

function privateConvo(bot, message) {
  const { user, channel } = message;

  return (err, convo) => {
    if (err) throw err;

    convo.ask('Do you want to play `paper`, `rock`, or `scissors`?', [
      {
        pattern: 'paper|rock|scissors',
        callback(response, convo) {
          // since no further messages are queued after this,
          // the conversation will end naturally with status === 'completed'
          convo.next();
        },
      }, {
        default: true,
        callback(response, convo) {
          convo.repeat();
          convo.next();
        },
      },
    ], { key: 'rockPaperScissors' }); // store the results in a field called rockPaperScissors

    convo.on('end', (convo) => {
      if (convo.status === 'completed') {
        const prc = convo.extractResponse('rockPaperScissors');

        channels.get(channel, (err, data) => {
          if (err) throw err;

          const updateData = data;
          updateData.players[user].played = prc;

          const { players } = updateData;
          const playerIDs = Object.keys(players);

          // check if only one player has played
          const onlyOnePlayed = playerIDs.find((id) => players[id].played === '');

          if (onlyOnePlayed) {
            channels.save(updateData, (err) => {
              if (err) throw err;

              bot.reply(message, `<@${user}> has played!`);
            });
          } else {
            const gameResults = playerIDs.map((id) => `<@${id}> played ${players[id].played}`);

            bot.reply(message, gameResults.join(' & '));

            // reset the game data
            channels.save({ id: updateData.id }, (err) => {
              if (err) throw err;
            });
          }
        });
      } else {
        // this happens if the conversation ended prematurely for some reason
        bot.reply(message, 'OK, nevermind!');
      }
    });
  };
}

hears(['rps'], 'direct_message,direct_mention,mention', (bot, message) => {
  const { user, channel, text } = message;
  const userData = text.match(/<@([A-Z0-9]{9})>/);

  if (userData) {
    const playerTwo = userData[1];
    const gameData = {
      id: channel,
      players: {
        [user]: {
          accepted: true,
          played: '',
        },
        [playerTwo]: {
          accepted: false,
          played: '',
        },
      },
    };

    channels.save(gameData, (err) => {
      if (err) throw err;

      bot.say({
        text: `<@${playerTwo}> you've been challenged to a game of ROCK PAPER SCISSORS by <@${user}>,  say \`accept\` unless you're too scared.`,
        channel,
      });

      bot.startPrivateConversation(message, privateConvo(bot, message));
    });
  } else {
    bot.reply(message, 'You didn\'t challenge anyone...');
  }
});

hears(['accept'], 'ambient', (bot, message) => {
  const { channel } = message;

  channels.get(channel, (err, data) => {
    if (err) throw err;

    if (data && 'players' in data) {
      const { user } = message;
      const { players } = data;

      if (user in players && !players[user].accepted) {
        bot.reply(message, 'GREAT, LET THE BATTLE BEGIN!!!');

        bot.startPrivateConversation(message, privateConvo(bot, message));
      } else {
        const player = Object.keys(players).find((p) => !players[p].accepted);

        bot.reply(message, `Not you <@${user}>, waiting for <@${player}>.`);
      }
    }
  });
});




function eachKey(object, callback) {
  Object.keys(object).forEach(function(key) {
    callback(key, object[key]);
  });
}
