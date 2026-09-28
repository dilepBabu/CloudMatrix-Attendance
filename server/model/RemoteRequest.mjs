import mongoose from "mongoose";

const remoteRequestSchema = new mongoose.Schema(
  {
    // =====================================================
    // Employee who is requesting WFH
    // =====================================================

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    // =====================================================
    // Requested WFH date
    // =====================================================

    date: {
      type: Date,
      required: true,
    },

    // =====================================================
    // Reason for requesting WFH
    // =====================================================

    reason: {
      type: String,
      required: true,
      trim: true,
    },

    // =====================================================
    // Request status
    // =====================================================

    status: {
      type: String,

      enum: [
        "PENDING",
        "APPROVED",
        "REJECTED",
        "CANCELLED",
      ],

      default: "PENDING",
    },

    // =====================================================
    // Requested attendance method
    //
    // Currently temporary request supports only REMOTE.
    // =====================================================

    requestedMethod: {
      type: String,

      enum: [
        "REMOTE",
      ],

      default: "REMOTE",
    },

    // =====================================================
    // Admin who reviewed the request
    // =====================================================

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // =====================================================
    // When admin reviewed the request
    // =====================================================

    reviewedAt: {
      type: Date,
    },

    // =====================================================
    // Optional admin comment
    // =====================================================

    adminComment: {
      type: String,
      trim: true,
    },
  },

  {
    timestamps: true,
  }
);

// =========================================================
// Prevent multiple WFH requests for the same employee
// on the same date.
//
// Example:
//
// Employee E001
// 2026-09-25 -> only one request
// =========================================================

remoteRequestSchema.index(
  {
    employeeId: 1,
    date: 1,
  },
  {
    unique: true,
  }
);

const RemoteRequest =
  mongoose.model(
    "RemoteRequest",
    remoteRequestSchema
  );

export default RemoteRequest;
