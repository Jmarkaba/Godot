// Imports
// Datetime configuration and scheduling
const $D = require('../utils/date.js');
Date = $D.Date;
const schedule = require('node-schedule');
// Model functions
var Meeting = require('../schemas/meeting.js'); 
var Job = require('../schemas/job.js');
// Globals
var guild;
var currentPassword = null;
const utils = require('../utils/utils.js');


function handleMeeting(args, message, gld) {
    guild = gld;
    
    let command = args.shift();
    switch (command) {
        case 'pending':
            message.channel.send("There are "+ Object.keys(schedule.scheduledJobs).length + " jobs pending.").catch(O_o => {});
            break;
        // Adding a new meeting
        case 'add':
            // checks permissions, breaks if false
            if(!utils.isAuthorized(message)) break;

            // expecting _data to be length 4 and of the form
            // [startTime] [location] [duration: hoursString] [password]
            let _data = utils.parseDashes(args);
            if(_data.length === 4) {
                // start is a js Date object
                let start = $D.parse(_data[0])
                let end = $D.parse(_data[0]).add({hours: _data[2]});
                // check that it was parsed correctly
                if(start) {
                    let meeting = {
                        'start': start,
                        'end': end,
                        'location': _data[1],
                        'duration': _data[2],
                        'password': _data[3] 
                    };
                    Meeting.create(meeting, err => {
                        if(err) message.channel.send("There was an error with your request.")
                        else createFullMeeting(message, meeting);
                    });
                } else message.channel.send('"'+_data[0]+'" could not be recognized as a valid date and time.'); 
            } else message.channel.send((_data.length < 4 ? "Too few" : "Too many") + " arguments provided for meeting.");
            break;

        // Signing into a meeting
        case 'signin':
            if(!currentPassword) message.channel.send("There is no meeting to sign into.");
            // checks that the password is valid
            if(args.shift() === currentPassword) {
                let userid = message.author.id;
                let name = removeAbsence(message, userid);
                if(name) message.channel.send(name + " has been signed in.");
                else message.channel.send("Could not sign in " + message.author);
            } else message.channel.send("Incorrect password or no password provided.");
            break;
        
        //Calls the toString of the next meeting
        case 'next':
            Meeting.find({}).sort({start: 1}).exec(function(err,docs) {
                if (err) message.channel.send("There was an error while trying to get the next meeting.");
                else {
                    if(docs[0]) message.channel.send(docs[0].nextString);
                    else message.channel.send("There are no upcoming meetings.");
                }
            });
            break;
        
        // Same as signin but to excuse someone via mentioning
        case 'excuse':
            if(!utils.isAuthorized(message)) break;

            message.mentions.users.forEach(user => {
                let name = removeAbsence(message, user.id)
                if(name) message.channel.send(name + " was excused from the current meeting.");
                else message.channel.send("Could not excuse " + user + " from the meeting.");
            });
            break;

        // Remove the next scheduled meeting
        case 'cancel':
            if(!utils.isAuthorized(message)) break;

            Meeting.find({}).sort({start: 1}).exec(function(err,docs) {
                if (err) message.channel.send("There was an error while trying to delete the meeting.");
                else {
                    if(docs[0]) {
                        Meeting.deleteOne({start: docs[0].start}, err => {if(err) console.log(err);});
                        Job.deleteOne({date: docs[0].start}, err => {if(err) console.log(err);});
                        try {
                            schedule.scheduledJobs[docs[0].start.toString()].cancel()
                        } catch(e) { console.log(e); }
                        message.channel.send("The next meeting has been deleted. Type 'meeting list' to see all upcoming meetings.");
                    } else message.channel.send("There are no upcoming meetings to delete.");
                }
            });
            break;

        // Lists all of the pending meetings
        case 'list':
            Meeting.find({}).sort({start: 1}).exec(function(err,docs) {
                if (err) console.log(err);//message.channel.send("There was an error while trying to list the meetings.");
                else {
                    let list = "";
                    docs.forEach(m => list += m.briefString +"\n");
                    if(list !== "") message.channel.send("Upcoming meetings:\n" + list);
                    else message.channel.send("There are no upcoming meetings.");
                }
            });
            break;

        // Invalid commands
        default:
            message.channel.send('"' + command + '"' + ' is not recognized as a meeting command.');
            break;
    }
}
function resetAbsences(guild) {
    let notHereRole = guild.roles.find(r => r.name === 'Not Here'); 
    guild.members.forEach((mem) => {
        mem.addRole(notHereRole).catch(O_o => {});
    }); //adds every memeber back to the absent list
}
function removeAbsence(message, id) {
    let user = message.guild.members.find(mem => mem.id === id);
    if(user) {
        let notHereRole = message.guild.roles.find(r => r.name === 'Not Here'); 
        user.removeRole(notHereRole).catch(O_o => {});
        return user.nickname || user.user.username;
    } else return null;
}
function createFullMeeting(message, meeting) {
    // schedule function for the date of the meeting
    // meeting.start is used as the name of the job so that it can be cancelled if necessary
    schedule.scheduleJob(meeting.start.toString(), start, () => startMeetingJob(guild));
    Job.create({date: meeting.start, name: meeting.start.toString()}, err => {if(err) console.log(err);});
    message.channel.send("A meeting has been added on " + meeting.start.toString('F') + ".");
    _announceMeeting(message, meeting);
}
function _announceMeeting(message, meeting) {
    let announcement = message.guild.channels.find(el => el.name === 'announcements');
    Meeting.findOne({start: meeting.start}, function(err,doc) {
        announcement.send("@everyone " + doc.nextString);
    });
}
function startMeetingJob(guild) {
    resetAbsences(guild);
    let now = new Date();
    Meeting.findOneAndRemove({start: {$lte: now}}, function (err,doc) {
        if(!err) {
            Job.deleteOne({date: doc.start}, e => {});
            currentPassword = doc.password;
            console.log(doc);

            // send an alert every 3 minutes (180000 millis)
            setInterval(() => {
                let generalChannel = guild.channels.find(el => el.name === 'general');
                let notHereRole = guild.roles.find(r => r.name === 'Not Here');
                generalChannel.send(notHereRole.toString() + " there is a meeting right now. Get here as soon as possible and sign in or leave a message explaining why you should be excused.");
            }, 180000);
            now.setMinutes(now.getMinutes() + 20);
            schedule.scheduleJob(now, () => clearInterval());

            // Job to clean up at the end of a meeting
            schedule.scheduleJob(m.end, () => {
                currentPassword = null;
                let notHereRole = guild.roles.find(r => r.name === 'Not Here');
                guild.members.forEach((mem) => mem.removeRole(notHereRole).catch(O_o => {}));
            });
        }
    });
}

// Exports
module.exports.handler = handleMeeting;
module.exports.startMeetingJob = startMeetingJob;