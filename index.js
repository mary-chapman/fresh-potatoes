const sqlite = require('sqlite'),
      Sequelize = require('sequelize'),
      request = require('request'),
      express = require('express'),
      app = express();

const { PORT=3000, NODE_ENV='development', DB_PATH='./db/database.db' } = process.env;

// START SERVER
Promise.resolve()
  .then(() => app.listen(PORT, () => console.log(`App listening on port ${PORT}`)))
  .catch((err) => { if (NODE_ENV === 'development') console.error(err.stack); });

// SEQUELIZE CONNECT 
const sequelize = new Sequelize('database', 'username', 'password', {
  host: 'localhost',
  dialect: 'sqlite',
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  dialectOptions: {
    multipleStatements: true
  },
  storage: DB_PATH,
  operatorsAliases: false
});

//SEQUELIZE MODELS 
const Genres = sequelize.define('genres', {
  'id': {
    type: Sequelize.INTEGER,
    primaryKey: true
  },
  'name': {
    type: Sequelize.STRING
  }
}, {
    timestamps: false
});

const Films = sequelize.define('films', {
  'title' : {
    type: Sequelize.STRING
  },
  'genre_id': {
    type: Sequelize.INTEGER
  },
  'release_date': {
    type: Sequelize.STRING
  }
}, {
    timestamps: false
});

//to connect the genre table to the film fable:
Films.belongsTo(Genres, {foreignKey: 'genre_id', targetKey: 'id'});

// ROUTES
app.get('/films/:id/recommendations', getFilmRecommendations);

//ROUTE HANDLERS
function getFilmRecommendations(req, res) {
  Films.findOne({where: {id: req.params.id}}).then(parentFilm => console.log(parentFilm.dataValues.title))
}

module.exports = app;
