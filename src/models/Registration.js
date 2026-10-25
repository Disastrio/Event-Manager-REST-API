'use strict';

const mongoose = require('mongoose');

const REGISTRATION_STATUSES = ['registered', 'cancelled'];

const registrationSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: REGISTRATION_STATUSES,
        message: `Status must be one of: ${REGISTRATION_STATUSES.join(', ')}`,
      },
      default: 'registered',
      index: true,
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform(_doc, ret) {
        delete ret._id;
        return ret;
      },
    },
  }
);

// A user can have at most one registration record per event. Cancelling flips
// the status instead of deleting, so this unique index also blocks duplicates.
registrationSchema.index({ event: 1, user: 1 }, { unique: true });
registrationSchema.index({ user: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Registration', registrationSchema);
