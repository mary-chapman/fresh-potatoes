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
  var responseObject = {recommendations: []}
      childFilms = {
        ids: ''
      }
  Films.findOne({where: {id: req.params.id}})
  .then(parentFilm => {
    var parentReleaseDate = parentFilm.dataValues.release_date;
    var releaseYearPlus15 = Number(parentReleaseDate.slice(0, 4)) + 15;
    var releaseYearMinus15 = Number(parentReleaseDate.slice(0, 4) - 15);
    var releaseMonthAndDay = parentReleaseDate.slice(4);
    Films.findAll({
      include: [{
        model: Genres,
        required: true
      }],
      where: {
        genre_id: parentFilm.dataValues.genre_id,
        release_date: {
          $lte: releaseYearPlus15 + releaseMonthAndDay,
          $gte: releaseYearMinus15 + releaseMonthAndDay
        }
      }
    }).then(films => {
      // creates a hash lookup to be later used to build the return object
      for (film of films) {
        childFilms[film.dataValues.id] = {
          title: film.dataValues.title,
          releaseDate: film.dataValues.release_date,
          genre: film.dataValues.genre
        };
        //build string to be used in third party api function
        if (childFilms.ids === '') childFilms.ids += film.dataValues.id
        else childFilms.ids += `,${film.dataValues.id}`
      }
      return childFilms
    })
    .then(childFilms => {
      request(`http://credentials-api.generalassemb.ly/4576f55f-c427-4cfc-a11c-5bfe914ca6c1?films=${childFilms.ids}`, (error, response, body) => {
        var parsed = JSON.parse(body)
        parsed.forEach(film => {
          var reviewCount = film.reviews.length;
          if (reviewCount >= 5) {
            var ratings = film.reviews.map(review => review.rating);
            var sum = ratings.reduce((a, b) => a + b);
            var average = Number((sum / reviewCount).toFixed(2));
            if (average > 4.0 && reviewCount >= 5) {
              responseObject.recommendations.push(                    
                { 
                    id: film.film_id,
                    title: childFilms[film.film_id].title,
                    releaseDate: childFilms[film.film_id].releaseDate,
                    genre: childFilms[film.film_id].genre.name,
                    averageRating: average,
                    reviews: reviewCount
                });
            }
          }
        }) //forEach end
        console.log(responseObject)
        res.status.send(responseObject)
      })
    })
  })
}
module.exports = app;
