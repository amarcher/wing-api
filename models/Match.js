const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userType = { type: Schema.Types.ObjectId, ref: 'User' };

const matchSchema = new mongoose.Schema({
  primary: Object.assign({}, userType, { index: true }),
  secondary: userType, 
  likes: [{
    user: userType,
    date: { type: Date, default: Date.now }
  }],
  dislikes: [{
    user: userType,
    date: { type: Date, default: Date.now }
  }],
  secondaryLikesPrimary: Boolean
}, { timestamps: true });


matchSchema.virtual('primaryLikesSecondary').get(function() {
  return this.likes.some((like) => like.user.equals(this.primary));
});

matchSchema.virtual('isMutual').get(function() {
  return this.primaryLikesSecondary && !!this.secondaryLikesPrimary;
});

matchSchema.methods.updateInverseMatch = function(update, callback) {
  Match.findOneAndUpdate({ primary: this.secondary, secondary: this.primary }, update, { safe: true, upsert: true, new: true }, callback);
};

const Match = mongoose.model('Match', matchSchema);

module.exports = Match;
