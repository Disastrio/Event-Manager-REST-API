'use strict';

const mongoose = require('mongoose');

const EVENT_STATUSES = ['draft', 'published', 'cancelled', 'completed'];

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [120, 'Title must be at most 120 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [5000, 'Description must be at most 5000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      minlength: [2, 'Category must be at least 2 characters'],
      maxlength: [50, 'Category must be at most 50 characters'],
      index: true,
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
      minlength: [2, 'Location must be at least 2 characters'],
      maxlength: [200, 'Location must be at most 200 characters'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      index: true,
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1'],
      max: [100000, 'Capacity must be at most 100000'],
      validate: {
        validator: Number.isInteger,
        message: 'Capacity must be a whole number',
      },
    },
    status: {
      type: String,
      enum: {
        values: EVENT_STATUSES,
        message: `Status must be one of: ${EVENT_STATUSES.join(', ')}`,
      },
      default: 'published',
      index: true,
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    registeredCount: {
      type: Number,
      default: 0,
      min: 0,
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

// Partial-match search on title is the primary use case for the search box.
eventSchema.index({ title: 'text', description: 'text' });
eventSchema.index({ status: 1, startDate: 1 });

eventSchema.virtual('isFull').get(function isFull() {
  return this.registeredCount >= this.capacity;
});

eventSchema.virtual('seatsRemaining').get(function seatsRemaining() {
  return Math.max(0, this.capacity - this.registeredCount);
});

eventSchema.pre('validate', function checkDates(next) {
  if (this.startDate && this.endDate && this.endDate <= this.startDate) {
    this.invalidate('endDate', 'End date must be after start date');
  }
  next();
});

eventSchema.statics.STATUSES = EVENT_STATUSES;

module.exports = mongoose.model('Event', eventSchema);
