// Imports
// Datetime configuration and scheduling
const bot = require('../godot');
const $D = require('../utils/date');
Date = $D.Date;
const schedule = require('node-schedule');

// Model functions
const Guild = require('../schemas/guild');
const Event = require('../schemas/event'); 
const utils = require('../utils/utils');


async function handleEvent(args, message) {

    let command = args.shift();
    switch (command) {
        case 'pending':
            message.channel.send('There are '+ Object.keys(schedule.scheduledJobs).length + ' jobs pending.').catch(O_o => {});
            break;

        // Adding a new event
        case 'add':
            // Permission check
            if( !await utils.isAuthorized(message) ) {
                console.log("Here");
                break;
            }

            args.unshift('--name');
            const _data = utils.parseFlags(args, {'notify': '0', 'desc': ''});
            let ev = {
                'name': _data['name'],
                'date': $D.parse(_data['date']),
                'desc': _data['desc'] ,
                'guild': message.guild.id,
                'notifyAll': !!parseInt(_data['notify']),
                'notify': []
            };
            Event.create(ev, (err, event) => {
                console.log('===============EVENT:ADD===============');
                if(!err) {
                    const announcement = event.notifyAll 
                    ? `@everyone ${event.nextString}`
                    : `@everyone ${event.nextString} React 👍 if you like to be notified when it happens.`;
                    utils.announce(message.guild, announcement).then((msg) => {
                        if(msg && !event.notifyAll) {
                            msg.react('👍');
                            const collector = msg.createReactionCollector((r, _) => r.emoji.name === '👍');
                            collector.on('collect', (reaction, _) => {
                                event.notify = reaction.users.map(u => u.id);
                                event.save();
                            });
                        }
                        if(msg) {
                            // schedule function for the date of the event
                            schedule.scheduleJob(event.id, event.date, () => startEventJob(event.id));
                            console.log('Created event: ' + event);
                        }
                    });
                } else {
                    console.log('Failed to create event: ' + event);
                    console.log('Error: ' + err);
                }
            });
            break;

        // Invalid commands
        default:
            message.channel.send(`${command} is not recognized as a event command.`);
            break;
    }
}
function _performOnSortedEvents(message, func) {
    Event.find({}).sort({start: 1}).exec((err,docs) => {
        if (err) message.channel.send('There was an error while trying to perform the request.');
        else func(message, docs);
    });
}
function startEventJob(job) {
    Event.findById(job, (_, event) => {
        Guild.findById(event.guild, (_, guild)=> {
            g = bot.guilds.find('id', guild.id);
            channel = g.channels.find('id', guild.channel) || g.channels.first();
            if(event.notifyAll) {
                channel.send(`@everyone ${event.warningString}`);
            } else {
                mentions = event.notify.map((id, _) => `<@${id}>`).join(' ');
                channel.send(`${mentions} ${event.warningString}`);
            }
            event.remove((_) => {});
        });
    });
}

// Exports
module.exports.handler = handleEvent;
module.exports.startEventJob = startEventJob;