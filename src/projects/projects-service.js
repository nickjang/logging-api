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
        'logs.start_time',
        'logs.end_time',
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
          DISTINCT date_trunc('day', logs.start_time) AS start_day,
          MAX (date_trunc('day', logs.end_time)) AS end_day,
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
      .orderBy('start_day', 'desc');
  },

  insertProject(db, newProject) {
    return db
      .insert(newProject)
      .into('projects')
      .returning('*')
      .then(([project]) => project)
      .then(project =>
        ProjectsService.getById(db, project.id)
      );
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
  },

  /**
 * Get the most recent day of two days.
 */
  mostRecentDay(day1, day2) {
    if (day1 >= day2) return day1;
    return day2;
  },

  /**
   * Merge ranges to so they don't overlap.
   * @param {Array[]} ranges - An array of ranges containing two elements: a start Date and an end Date.
   */
  mergeRanges(ranges) {
    let dayRanges = [];
    let idx1 = 0;
    let idx2 = 0;

    while (idx2 < ranges.length) {
      // compare end of first log to start of second
      if (ranges[idx1][1] < ranges[idx2][0]) {
        dayRanges.push(ranges[idx1]);
        idx1++;
        idx2++;
      } else {
        ranges[idx1][1] = this.mostRecentDay(ranges[idx1][1], ranges[idx2][1]);
        idx2++;
      }
    }
    return dayRanges;
  }
};

module.exports = ProjectsService;
