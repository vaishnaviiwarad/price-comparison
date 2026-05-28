import mongoose from "mongoose";

const searchHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    productTitle: {
      type: String,
      required: true
    },
    productImage: {
      type: String,
      default: ""
    },
    amazonUrl: {
      type: String,
      required: true
    },
    flipkartUrl: {
      type: String,
      default: ""
    },
    cromaUrl: {
      type: String,
      default: ""
    },
    amazonPrice: {
      type: Number,
      default: null
    },
    flipkartPrice: {
      type: Number,
      default: null
    },
    cromaPrice: {
      type: Number,
      default: null
    },
    bestPrice: {
      type: String,
      required: true
    },
    priceDifference: {
      type: Number,
      required: true
    },
    searchedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

const SearchHistory = mongoose.model("SearchHistory", searchHistorySchema);

export default SearchHistory;
