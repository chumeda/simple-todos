/* exported Tasks, Mongo, Meteor, Template, Session, Accounts */

Tasks = new Mongo.Collection("tasks");

/**
 * This code only runs on the server
 */
if (Meteor.isServer) {


  /**
   * Only publish tasks that are public or belong to the current user
   */
  Meteor.publish("tasks", function () {
    return Tasks.find({
      $or: [
        { private: {$ne: true} },
        { owner: this.userId }
      ]
    });
  });
}

/**
 * This code only runs on the client
 */
if (Meteor.isClient) {

  Meteor.subscribe("tasks");

  Template.body.helpers({
    /**
     * If hide completed is checked, filter tasks
     * @returns {*|Mongo.Cursor}
     */
    tasks: function () {
      if (Session.get("hideCompleted")) {
        return Tasks.find({checked: {$ne: true}}, {sort: {createdAt: -1}});
      }
      else {
        // Otherwise, return all of the tasks
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
    /**
     * Prevent default browser form submit
     * @param event
     */
    "submit .new-task": function (event) {
      event.preventDefault();

      // Get value from form element
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
    /**
     * Determines if the user is the owner of the task
     * @returns {boolean}
     */
    isOwner: function () {
      return this.owner === Meteor.userId();
    }
  });

  Template.task.events({
    /**
     * Set the checked property to the opposite of its current value
     */
    "click .toggle-checked": function () {
      Meteor.call("setChecked", this._id, !this.checked);
    },

    /**
     * Delete task with button
     */
    "click .delete": function () {
      Meteor.call("deleteTask", this._id);
    },

    /**
     * Make task private or public
     */
    "click .toggle-private": function () {
      Meteor.call("setPrivate", this._id, ! this.private);
    }
  });

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });
}
  Meteor.methods({
    /**
     * Add a new task
     * @param text
     */
    addTask: function (text) {
      // Make sure the user is logged in before inserting a task
      if (! Meteor.userId()) {
        throw new Meteor.Error("not-authorized");
      }

      Tasks.insert({
        text: text,
        createdAt: new Date(),
        owner: Meteor.userId(),
        username: Meteor.user().username
      });
    },

    /**
     * Delete a task
     * @param taskId
     */
    deleteTask: function (taskId) {
      var task = Tasks.findOne(taskId);
      if (task.private && task.owner !== Meteor.userId()) {
        // If the task is private, make sure only the owner can delete it
        throw new Meteor.Error("not-authorized");
      }

      Tasks.remove(taskId);
    },

    /**
     * if task completed make it checked
     * @param taskId
     * @param setChecked
     */
    setChecked: function (taskId, setChecked) {
      var task = Tasks.findOne(taskId);
      if (task.private && task.owner !== Meteor.userId()) {
        // If the task is private, make sure only the owner can check it off
        throw new Meteor.Error("not-authorized");
      }

      Tasks.update(taskId, { $set: { checked: setChecked} });
    },

    /**
     * make a task private
     * @param taskId
     * @param setToPrivate
     */
    setPrivate: function (taskId, setToPrivate) {
      var task = Tasks.findOne(taskId);

      // Make sure only the task owner can make a task private
      if (task.owner !== Meteor.userId()) {
        throw new Meteor.Error("not-authorized");
      }

      Tasks.update(taskId, { $set: { private: setToPrivate } });
    }
  });
