const Mongoose = require('mongoose');
const Config = require('../config/env.config');

const MONGODB_URI = Config.mongoDbUri;

Mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true
});

const Schema = Mongoose.Schema;

const repositorySchema = new Schema({
  owner: String,
  name: String,
  createdAt: String,
  resourcePath: String,
  tagName: String,
  releaseDescription: String,
  homepageUrl: String,
  repositoryDescription: String,
  avatarUrl: String
});

repositorySchema.virtual('id').get(function() {
  return this._id.toHexString();
});

repositorySchema.set('toJSON', {
  virtuals: true
});

repositorySchema.findById = function(cb) {
  return this.model('Repository').find({
    id: this.id
  }, cb);
};

const Repository = Mongoose.model('repository', repositorySchema);

exports.findById = (id) => {
  return Repository.findById(id)
    .then((result) => {
      if(result) {
        result = result.toJSON();
        delete result._id;
        delete result.__v;
        return result;
      }
    });
};

exports.create = (repositoryData) => {
  const repository = new Repository(repositoryData);
  return repository.save();
};

exports.list = () => {
  return new Promise((resolve, reject) => {
    Repository.find()
      .exec(function(err, users) {
        if (err){
          reject(err);
        } else {
          resolve(users);
        }
      })
  });
};

exports.patchById = (id, repositoryData) => {
  return new Promise((resolve, reject) => {
    Repository.findById(id, function(err, repository) {
      if (err) reject(err);
      for (let i in repositoryData) {
        repository[i] = repositoryData[i];
      }
      repository.save(function(err, updateRepository) {
        if (err) return reject(err);
        resolve(updateRepository);
      });
    });
  });
};

exports.deleteById = (id) => {
  return new Promise((resolve, reject) => {
    Repository.deleteOne({
      _id: id
    }, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(err);
      }
    });
  });
};

exports.findByOwnerAndName = (owner, name) => {
  return Repository.find({
    owner: owner,
    name: name
  });
};

async function updateDatabase(responseData, owner, name) {
  let createdAt = '';
  let resourcePath = '';
  let tagName = '';
  let releaseDescription = '';
  let homepageUrl = '';
  let repositoryDescription = '';
  let avatarUrl = '';

  if (responseData.repository.releases) {

    createdAt = responseData.repository.releases.nodes[0].createdAt;
    resourcePath = responseData.repository.releases.nodes[0].resourcePath;
    tagName = responseData.repository.releases.nodes[0].tagName;
    releaseDescription = responseData.repository.releases.nodes[0].description;
    homepageUrl = responseData.repository.homepageUrl;
    repositoryDescription = responseData.repository.description;

 if (responseData.organization && responseData.organization.avatarUrl) {
      avatarUrl = responseData.organization.avatarUrl;
    } else if (responseData.user && responseData.user.avatarUrl) {
      avatarUrl = responseData.user.avatarUrl;
    }

    const repositoryData = {
      owner: owner,
      name: name,
      createdAt: createdAt,
      resourcePath: resourcePath,
      tagName: tagName,
      releaseDescription: releaseDescription,
      homepageUrl: homepageUrl,
      repositoryDescription: repositoryDescription,
      avatarUrl: avatarUrl
    };

    await RepositoryModel.findByOwnerAndName(owner, name)
      .then((oldGitHubRelease) => {
        if (!oldGitHubRelease[0]) {
          RepositoryModel.create(repositoryData);
        } else {
          RepositoryModel.patchById(oldGitHubRelease[0].id, repositoryData);
        }
        console.log(`Updated latest release: http://github.com${repositoryData.resourcePath}`);
      });
  }
}

async function getLatestRelease(repository) {

  const owner = repository.owner;
  const name = repository.name;

  console.log(`Getting latest release for: http://github.com/${owner}/${name}`);

  const query = `
         query {
           organization(login: "${owner}") {
               avatarUrl
           }
           user(login: "${owner}") {
               avatarUrl
           }
           repository(owner: "${owner}", name: "${name}") {
               homepageUrl
               description
               releases(first: 1, orderBy: {field: CREATED_AT, direction: DESC}) {
                   nodes {
                       createdAt
                       resourcePath
                       tagName
                       description
                   }
               }
           }
         }`;

  const jsonQuery = JSON.stringify({
    query
  });

  const headers = {
    'User-Agent': 'Release Tracker',
    'Authorization': `Bearer ${GITHUB_ACCESS_TOKEN}`
  };

  await Axios.post(GITHUB_API_URL, jsonQuery, {
    headers: headers
  }).then((response) => {
    return updateDatabase(response.data.data, owner, name);
  });
}




