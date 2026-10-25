import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["customer", "professional", "admin"], default: "customer" },

    // Professional only
    approvalStatus: { type: String, enum: ["pending", "approved", "rejected"] },
    experienceYears: { type: Number, min: 0 },
    services: [
      {
        _id: false,
        service: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
        price: Number
      }
    ],
    pincodes: [String],
    workingDays: [{ type: Number, min: 0, max: 6 }],
    ratingSum: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// Never send the password hash in API responses.
userSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.password;
    return ret;
  }
});

export default mongoose.model("User", userSchema);
