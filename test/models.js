const chai = require('chai');
const expect = chai.expect;
const mongoose = require('mongoose');
const User = require('../models/User');
const Match = require('../models/Match');

function clearDB(done) {
  for (var i in mongoose.connection.collections) {
    mongoose.connection.collections[i].remove(() => {});
  }
  done();
}

before((done) => {
  clearDB(done);
});

describe('User Model', () => {
  it('should create a new user', (done) => {
    const user = new User({
      email: 'test@gmail.com',
      password: 'password'
    });
    user.save((err) => {
      expect(err).to.be.null;
      expect(user.email).to.equal('test@gmail.com');
      expect(user).to.have.property('createdAt');
      expect(user).to.have.property('updatedAt');
      done();
    });
  });

  it('should not create a user with the unique email', (done) => {
    const user = new User({
      email: 'test@gmail.com',
      password: 'password'
    });
    user.save((err) => {
      expect(err).to.be.defined;
      expect(err.code).to.equal(11000);
      done();
    });
  });

  it('should find user by email', (done) => {
    User.findOne({ email: 'test@gmail.com' }, (err, user) => {
      expect(err).to.be.null;
      expect(user.email).to.equal('test@gmail.com');
      done();
    });
  });

  it('should delete a user', (done) => {
    User.remove({ email: 'test@gmail.com' }, (err) => {
      expect(err).to.be.null;
      done();
    });
  });
});

describe('Match Model', () => {
  let primary;
  let secondary;
  let match;

  before((done) => {
    User.create({
      email: 'primary@gmail.com',
      password: 'password',
      profile: {
        fname: 'Andrew'
      }
    }, (err, primaryUser) => {
      primary = primaryUser;

      User.create({
        email: 'secondary@gmail.com',
        password: 'password',
        profile: {
          fname: 'Mary'
        }
      }, (err, secondaryUser) => {
        secondary = secondaryUser;
        done();
      });
    });
  });

  after(() => {
    User.remove({ email: primary.email });
    User.remove({ email: secondary.email });
  });

  it('should create a new match', (done) => {
    const testMatch = new Match({
      primary: primary._id,
      secondary: secondary._id,
    });
    testMatch.save((err) => {
      expect(err).to.be.null;
      expect(testMatch.primary.equals(primary._id)).to.be.true;
      expect(testMatch.secondary.equals(secondary._id)).to.be.true;
      expect(testMatch.likes).to.be.empty;
      expect(testMatch.dislikes).to.be.empty;
      expect(testMatch).to.have.property('createdAt');
      expect(testMatch).to.have.property('updatedAt');
      match = testMatch;
      done();
    });
  });

  it('should find matches by primary', (done) => {
    Match.findOne({ primary: primary._id })
      .populate('secondary', 'profile')
      .exec((err, testMatch) => {
        expect(err).to.be.null;
        expect(testMatch.primary.equals(primary._id)).to.be.true;
        expect(testMatch.secondary.equals(secondary._id)).to.be.true;
        expect(testMatch.likes).to.be.empty;
        expect(testMatch.dislikes).to.be.empty;
        expect(testMatch.secondary.profile.fname).to.equal(secondary.profile.fname);
        done();
      });
  });

  it('should add likes', (done) => {
    Match.findOneAndUpdate({ primary: primary._id }, { $push: { likes: { user: primary._id } } }, { safe: true, upsert: true, new: true },
      (err, updatedMatch) => {
        expect(err).to.be.null;
        expect(updatedMatch.likes.length).to.equal(1);
        done();
      }
    );
  });

  it('should remove likes', (done) => {
    Match.findOneAndUpdate({ primary: primary._id }, { $pull: { likes: { user: primary._id } } }, { safe: true, new: true },
      (err, updatedMatch) => {
        expect(err).to.be.null;
        expect(updatedMatch.likes.length).to.equal(0);
        done();
      }
    );
  });

  it('should add dislikes', (done) => {
    Match.findOneAndUpdate({ primary: primary._id }, { $push: { dislikes: { user: primary._id } } }, { safe: true, upsert: true, new: true },
      (err, updatedMatch) => {
        expect(err).to.be.null;
        expect(updatedMatch.dislikes.length).to.equal(1);
        done();
      }
    );
  });

  it('should remove dislikes', (done) => {
    Match.findOneAndUpdate({ primary: primary._id }, { $pull: { dislikes: { user: primary._id } } }, { safe: true, new: true },
      (err, updatedMatch) => {
        expect(err).to.be.null;
        expect(updatedMatch.dislikes.length).to.equal(0);
        done();
      }
    );
  });

  it('should delete a match', (done) => {
    Match.remove({ primary: primary._id, secondary: secondary._id }, (err) => {
      expect(err).to.be.null;
      done();
    });
  });

  describe('#primaryLikesSecondary', (done) => {
    before((done) => {
      Match.create({ primary: primary._id, secondary: secondary._id }, (err, testMatch) => {
        match = testMatch;
        done();
      });
    });

    after((done) => {
      Match.remove({ primary: primary._id, secondary: secondary._id }, done);
    });

    it('returns false when primary has not liked secondary', () => {
      expect(match.primaryLikesSecondary).to.be.false;
    });

    it('returns true when primary likes secondary', (done) => {
      Match.findOneAndUpdate({ primary: primary._id, secondary: secondary._id }, { $push: { likes: { user: primary._id } } }, { safe: true, upsert: true, new: true }, (err, updatedMatch) => {
        expect(updatedMatch.primaryLikesSecondary).to.be.true;
        done();
      });
    });
  });

  describe('#isMutual', (done) => {
    before((done) => {
      Match.create({ primary: primary._id, secondary: secondary._id }, (err, testMatch) => {
        match = testMatch;
        done();
      });
    });

    after((done) => {
      Match.remove({ primary: primary._id, secondary: secondary._id }, done);
    });

    context('when secondaryLikesPrimary is false', (done) => {
      it('returns false when primary has not liked secondary', (done) => {
        expect(match.isMutual).to.be.false;
        done();
      });

      it('returns false when primary has liked secondary', (done) => {
        Match.findOneAndUpdate({ primary: primary._id, secondary: secondary._id }, { $push: { likes: { user: primary._id } } }, { safe: true, upsert: true, new: true }, (err, updatedMatch) => {
          expect(updatedMatch.isMutual).to.be.false;
          done();
        });
      });
    });

    context('when secondaryLikesPrimary is true', (done) => {
      before((done) => {
        match.update({ secondaryLikesPrimary: true }, done);
      });

      it('returns true when primary has liked secondary', (done) => {
        Match.findOne({ primary: primary._id, secondary: secondary._id }, (err, testMatch) => {
          expect(testMatch.isMutual).to.be.true;
          done();
        });
      });

      it('returns false when primary has not liked secondary', (done) => {
        Match.findOneAndUpdate({ primary: primary._id, secondary: secondary._id }, { $pull: { likes: { user: primary._id } } }, { safe: true, upsert: true, new: true }, (err, updatedMatch) => {
          expect(updatedMatch.isMutual).to.be.false;
          done();
        });
      });
    });
  });

  describe('#updateInverseMatch', (done) => {
    before((done) => {
      Match.create({ primary: primary._id, secondary: secondary._id }, (err, testMatch) => {
        match = testMatch;
        done();
      });
    });

    after((done) => {
      Match.remove({}, done);
    });

    context('when inverseMatch does not yet exist', (done) => {
      it('creates the inverseMatch', (done) => {
        match.updateInverseMatch({ secondaryLikesPrimary: true }, (err, inverseMatch) => {
          expect(err).to.be.null;
          expect(inverseMatch.primary.equals(secondary._id)).to.be.true;
          expect(inverseMatch.secondary.equals(primary._id)).to.be.true;
          expect(inverseMatch.likes).to.be.empty;
          expect(inverseMatch.dislikes).to.be.empty;
          expect(inverseMatch.secondaryLikesPrimary).to.be.true;
          expect(inverseMatch).to.have.property('createdAt');
          expect(inverseMatch).to.have.property('updatedAt');
          done();
        });
      });
    });

    context('when inverseMatch exists', (done) => {
      it('updates inverseMatch', (done) => {
        match.updateInverseMatch({ secondaryLikesPrimary: false }, (err, inverseMatch) => {
          expect(err).to.be.null;
          expect(inverseMatch.primary.equals(secondary._id)).to.be.true;
          expect(inverseMatch.secondary.equals(primary._id)).to.be.true;
          expect(inverseMatch.likes).to.be.empty;
          expect(inverseMatch.dislikes).to.be.empty;
          expect(inverseMatch.secondaryLikesPrimary).to.be.false;
          expect(inverseMatch).to.have.property('createdAt');
          expect(inverseMatch).to.have.property('updatedAt');
          done();
        });
      });
    });
  });
});
