const xss = require('xss');

const ProjectsService = {
  getAllProjects(db) {
    return db
      .from('projects')
      .select(
        'projects.id',
        'projects.title',
        'projects.date_created',
        db.raw(
          `json_strip_nulls(
            json_build_object(
              'id', users.id,
              'email', users.email,
              'full_name', users.full_name,
              'nickname', users.nickname,
              'date_created', users.date_created,
              'date_modified', users.date_modified
            )
          ) AS "owner"`
        )
      )
      .leftJoin(
        'logs',
        'projects.id',
        'logs.project_id'
      )
      .leftJoin(
        'users',
        'projects.owner_id',
        'users.id'
      )
      .groupBy('projects.id', 'users.id');
  },

  getById(db, id) {
    return ProjectsService.getAllProjects(db)
      .where('projects.id', id)
      .first();
  },

  getLogsForProject(db, project_id) {
    return db
      .from('logs')
      .select(
        'logs.id',
        'logs.start',
        'logs.stop',
        db.raw(
          `json_strip_nulls(
            row_to_json(
              (SELECT tmp FROM (
                SELECT
                  users.id,
                  users.email,
                  users.full_name,
                  users.nickname,
                  users.date_created,
                  users.date_modified
              ) tmp)
            )
          ) AS "user"`
        )
      )
      .where('logs.project_id', project_id)
      .leftJoin(
        'users',
        'logs.user_id',
        'users.id'
      )
      .groupBy('logs.id', 'users.id');
  },

  getDaysWithLogs(db, project_id) {
    return db
      .from('logs')
      .raw(
        `SELECT 
          DISTINCT date_trunc('day', logs.start) AS start,
          MAX (date_trunc('day', logs.end)) AS end,
          json_strip_nulls(
            row_to_json(
              (SELECT tmp FROM (
                SELECT
                  users.id,
                  users.email,
                  users.full_name,
                  users.nickname,
                  users.date_created,
                  users.date_modified
              ) tmp)
            )
          ) AS "user"`
      )
      .where('logs.project_id', project_id)
      .leftJoin(
        'users',
        'logs.user_id',
        'users.id'
      )
      .groupBy('logs.id', 'users.id')
      .orderBy('start', 'desc');
  },

  serializeProject(project) {
    const { user } = project;
    return {
      id: project.id,
      title: xss(project.title),
      date_created: new Date(project.date_created),
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        nickname: user.nickname,
        date_created: new Date(user.date_created),
        date_modified: new Date(user.date_modified) || null
      }
    };
  }
};

module.exports = ProjectsService;
