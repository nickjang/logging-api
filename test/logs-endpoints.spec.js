const knex = require('knex');
const app = require('../src/app');
const helpers = require('./test-helpers');

describe('Logs Endpoints', function() {
  let db;

  const {
    testProjects,
    testUsers,
  } = helpers.makeProjectsFixtures();

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DATABASE_URL,
    });
    app.set('db', db);
  });

  after('disconnect from db', () => db.destroy());

  before('cleanup', () => helpers.cleanTables(db));

  afterEach('cleanup', () => helpers.cleanTables(db));

  describe('POST /api/logs', () => {
    beforeEach('insert projects', () =>
      helpers.seedProjectsTables(
        db,
        testUsers,
        testProjects
      )
    );

    it.only('creates a log, responding with 201 and the new log', function() {
      this.retries(3);
      const testProject = testProjects[0];
      const testUser = testUsers[0];
      const newLog = {
        start_time : (new Date()).toISOString()
        project_id: testProject.id,
      };
      return supertest(app)
        .post('/api/logs')
        .set('Authorization', helpers.makeAuthHeader(testUsers[0]))
        .send(newLog)
        .expect(201)
        .expect(res => {
          expect(res.body).to.have.property('id');
          expect(res.body.project_id).to.eql(newLog.project_id);
          expect(res.body.user.id).to.eql(testUser.id);
          expect(res.headers.location).to.eql(`/api/logs/${res.body.id}`);
          const expectedDate = new Date().toLocaleString('en', { timeZone: 'UTC' });
          const actualDate = new Date(res.body.date_created).toLocaleString();
          expect(actualDate).to.eql(expectedDate);
        })
        .expect(res =>
          db
            .from('blogful_logs')
            .select('*')
            .where({ id: res.body.id })
            .first()
            .then(row => {
              expect(row.project_id).to.eql(newLog.project_id);
              expect(row.user_id).to.eql(testUser.id);
              const expectedDate = new Date().toLocaleString('en', { timeZone: 'UTC' });
              const actualDate = new Date(row.date_created).toLocaleString();
              expect(actualDate).to.eql(expectedDate);
            })
        );
    });

    const requiredFields = ['project_id'];

    requiredFields.forEach(field => {
      const testProject = testProjects[0];
      const testUser = testUsers[0];
      const newLog = {
        project_id: testProject.id,
      };

      it(`responds with 400 and an error message when the '${field}' is missing`, () => {
        delete newLog[field];

        return supertest(app)
          .post('/api/logs')
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .send(newLog)
          .expect(400, {
            error: `Missing '${field}' in request body`,
          });
      });
    });
  });
});
