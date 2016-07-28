// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
	Displays a notification with the current time. Requires "notifications"
	permission in the manifest file (or calling
	"Notification.requestPermission" beforehand).
*/
function show() {
	var time = /(..)(:..)/.exec(new Date());     // The prettyprinted time.
	var hour = time[1] % 12 || 12;               // The prettyprinted hour.
	var period = time[1] < 12 ? 'a.m.' : 'p.m.'; // The period of the day.
	
	
	Notification.requestPermission( function(status) {
        console.log(status); // notifications will only be displayed if "granted"
        var n = new Notification("title", {body: "notification body"}); // this also shows the notification
    });
	
}

function showUpvote() {
	var notification = new Notification("+1 Upvote", {
		icon: 'extension_upvote.png',
		body: "" + localStorage.lastUser + " voted on " + getTopicSubstring(localStorage.lastTopic)
	});
	setTimeout(notification.close.bind(notification), 5000);
	
	notification.onclick = function () {
		window.focus();
		chrome.tabs.create({ url: localStorage.lastLink });
		notification.close();
	};
}

function showDownvote() {
	var notification = new Notification("-1 Downvote", {
		icon: 'extension_upvote.png',
		body: "" + localStorage.lastUser + " voted on " + getTopicSubstring(localStorage.lastTopic)
	});
	setTimeout(notification.close.bind(notification), 5000);
	
	notification.onclick = function () {
		window.focus();
		chrome.tabs.create({ url: localStorage.lastLink });
		notification.close();
	};
}

function showComment() {
	var notification = new Notification("+1 Comment", {
		icon: 'extension_message.png',
		body: "" + localStorage.lastUser + " replied to " + getTopicSubstring(localStorage.lastTopic)
	});
	setTimeout(notification.close.bind(notification), 5000);
	
	notification.onclick = function () {
		window.focus();
		chrome.tabs.create({ url: localStorage.lastLink });
		notification.close();
	};
}

function getTopicSubstring(topic)
{
	if (topic.length > 62)
	{
		return topic.substring(0,62) + "...";
	}
	return topic;
}


// Conditionally initialize the options.
if (!localStorage.isInitialized) {
	localStorage.isActivated = true;   // The display activation.
	localStorage.frequency = 30;        // The display frequency, in seconds.
	localStorage.isInitialized = true; // The option initialization.
	
	localStorage.firstRequestSend = false;
	localStorage.lastTime = 0;
	localStorage.lastTopic = null;
	localStorage.lastUser = null;
	localStorage.lastLink = null;
	localStorage.username = "yourusername";
	localStorage.settingsChanged = false;
	
	localStorage.notifyUpvotes = true;
	localStorage.notifyDownvotes = true;
	localStorage.notifyComments = true;
	
	chrome.tabs.create({ 'url': 'chrome://extensions/?options=' + chrome.runtime.id });
	
}

// Test for notification support.
if (window.Notification) {
	// While activated, show notifications at the display frequency.
	if (JSON.parse(localStorage.isActivated)) 
	{ 
	}

	setInterval(function() {
		if (!JSON.parse(localStorage.isActivated))
		{
			console.log("Not active. Skipping...");
			return;
		}
	    else
		{
			if (localStorage.username == null || localStorage.username.length == 0)
			{
				console.log("Username is null: Skipping ...");
				return;
			}
			
			var Api = window.steemWS.Client.get(null, true);
			Api.initPromise.then(response => {
				Api.database_api().exec("get_account_history", [localStorage.username, -1, 10]).then(response => {
					if (localStorage.lastTime == 0 || JSON.parse(localStorage.settingsChanged) == true)
					{
						console.log("Settings changed or no last update time found. Refreshing...");
						
						localStorage.lastTime = response[response.length-1][1].timestamp;
						localStorage.settingsChanged = false;
					}
					else
					{
						var historyCounter = response.length-1;
						while (! (response[historyCounter][1].op[0] == "vote" || response[historyCounter][1].op[0] == "comment"))
						{
							historyCounter--;
							if (historyCounter > response.length)
							{
								console.log("No vote or post in the last 10 network entries found!");
								return;
							}
						}
						
						var historyObject = response[historyCounter][1];
						
						
						if (historyObject.timestamp == localStorage.lastTime)
						{
							console.log("Last post already updated (Time: " + historyObject.timestamp + "). Skipping");
							return;
						}
						
						localStorage.lastTime = historyObject.timestamp;
						var historyObjectOp = historyObject.op;
						
						var actionType = historyObjectOp[0];
						var actionObject = historyObjectOp[1];
						
						var actionUser = "";
						var actionTopic = "";
						var actionTopicUser = "";
						
						
						
						if (actionType == "vote")
						{
							console.log("Recieved vote object: ", actionObject);
							
							actionUser = actionObject.voter;
							actionTopic = actionObject.permlink;
							actionTopicUser = actionObject.author;
							
							localStorage.lastTopic = actionTopic;
							localStorage.lastUser = actionUser;
							localStorage.lastLink = "https://steemit.com/steemit/@" + actionTopicUser + "/" + actionTopic;
							
							if (actionUser == localStorage.username)
							{
								console.log("User voted on own post. Skipping notification...");
								return;
							}
							
							if (actionObject.weight > 0)
							{
								if (JSON.parse(localStorage.notifyUpvotes))
								{
									showUpvote();
								}
							}
								
							if (actionObject.weight < 0)
							{
								if (JSON.parse(localStorage.notifyDownvotes))
								{
									showDownvote();
								}
							}
						}
						if (actionType == "comment")
						{
							console.log("Recieved comment object: ", actionObject);
							
							actionUser = actionObject.author;
							actionTopic = actionObject.permlink;
							actionTopicUser = actionObject.author;
							
							localStorage.lastTopic = actionTopic;
							localStorage.lastUser = actionUser;
							localStorage.lastLink = "https://steemit.com/steemit/@" + actionTopicUser + "/" + actionTopic;
							
							if (actionUser == localStorage.username)
							{
								console.log("User voted on own post. Skipping notification...");
								return;
							}
							
							if (JSON.parse(localStorage.notifyComments))
							{
								showComment();
							}
						}
					}
				});
				
			});
		}
}, localStorage.frequency * 1000);

}
