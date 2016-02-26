Tasks = new Mongo.Collection("tasks");

if (Meteor.isServer) {
  // This code only runs on the server
  Meteor.publish("tasks", function () {
    return Tasks.find();
  });
}

if (Meteor.isClient) {
  // This code only runs on the client
  Meteor.subscribe("tasks");

  Template.body.helpers({
    tasks: function () {
      if (Session.get("hideCompleted")) {
        return Tasks.find({checked: {$ne: true}}, {sort: {createdAt: -1}});
      } else {
        return Tasks.find({}, {sort: {createdAt: -1}});
      }
    },
    hideCompleted: function () {
      return Session.get("hideCompleted");
    },
    incompleteCount: function () {
      return Tasks.find({checked: {$ne: true}}).count();
    }
  });

  Template.body.events({
    "submit .new-task": function (event) {
      // Prevent default
      event.preventDefault();

      // Get text from form
      var text = event.target.text.value;

      // Insert a task into the collection
      Meteor.call("addTask", text);

      // Clear form
      event.target.text.value = "";
    },
    "change .hide-completed input": function (event) {
      Session.set("hideCompleted", event.target.checked);
    }
  });

  Template.task.helpers({
    isOwner: function () {
      return this.owner === Meteor.userId();
    }
  });

  Template.task.events({
    "click .toggle-checked": function () {
      // Set the checked property to opposite of its current value
      Meteor.call("setChecked", this._id, ! this.checked);
    },
    "click .delete": function () {
      Meteor.call("deleteTask", this._id);
      // Tasks.remove(this._id);
    },
    "click .toggle-private": function () {
      Meteor.call("setPrivate", this._id, ! this.private);
    }
  });

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });
}

function checkUser () {
  if (! Meteor.userId()) {
    throw new Meteor.Error("not-authorized");
  }
}

Meteor.methods({
  addTask: function (text) {
    // Make sure user is logged in before inserting a task
    checkUser();

    Tasks.insert({
      text: text,
      createdAt: new Date(), // current time
      owner: Meteor.userId(), // _id of logged in user
      username: Meteor.user().username // username of logged in user
    });
  },
  deleteTask: function (taskId) {
    // Require authorization
    checkUser();

    Tasks.remove(taskId);
  },
  setChecked: function (taskId, setChecked) {
    // Require authorization
    checkUser();

    Tasks.update(taskId, { $set: { checked: setChecked} });
  },
  setPrivate: function (taskId, setToPrivate) {
    var task = Tasks.findOne(taskId);

    // Make sure only the task owner can make a task private
    if (task.owner !== Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    Tasks.update(taskId, { $set: { private: setToPrivate } });
  }
});
