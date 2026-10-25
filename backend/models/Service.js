import mongoose from "mongoose";

export const CATEGORIES = ["ac", "cleaning", "painting", "plumbing", "electrical", "appliance"];

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: CATEGORIES, required: true },
    description: { type: String, default: "" },
    minPrice: { type: Number, required: true, min: 1 },
    maxPrice: { type: Number, required: true, min: 1 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true, optimisticConcurrency: true }
);

serviceSchema.pre("validate", function () {
  if (this.maxPrice < this.minPrice) this.invalidate("maxPrice", "Maximum price must be at least minimum price");
});

export default mongoose.model("Service", serviceSchema);
