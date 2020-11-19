const xss = require('xss');

const LogsService = {
  getById(db, id) {
    return db
      .from('logs')
      .select(
        'logs.id',
        'logs.start',
        'logs.end',
        'logs.project_id',
        db.raw(
          `json_strip_nulls(
            row_to_json(
              (SELECT tmp FROM (
                SELECT
                  usr.id,
                  usr.email,
                  usr.full_name,
                  usr.nickname,
                  usr.date_created,
                  usr.date_modified
              ) tmp)
            )
          ) AS "user"`
        )
      )
      .leftJoin(
        'blogful_users AS usr',
        'logs.user_id',
        'usr.id'
      )
      .where('logs.id', id)
      .first();
  },

  getBySelectors(db, selectors) {
    return db
      .from('logs')
      .select(
        'logs.id',
        'logs.start',
        'logs.end',
        'logs.project_id',
        db.raw(
          `json_strip_nulls(
            row_to_json(
              (SELECT tmp FROM (
                SELECT
                  usr.id,
                  usr.email,
                  usr.full_name,
                  usr.nickname,
                  usr.date_created,
                  usr.date_modified
              ) tmp)
            )
          ) AS "user"`
        )
      )
      .leftJoin(
        'blogful_users AS usr',
        'logs.user_id',
        'usr.id'
      )
      .where((projectBuilder) => {
        let projectId = null;
        for (projectId in selectors) {
          projectBuilder.orWhere((selectorBuilder) => {
            selectorBuilder.where('logs.project_id', projectId);

            let selector = null;
            for (selector in selectors[projectId]) {
              selectorBuilder.whereBetween('logs.start', selector);
            }
          });
        }
      });
  },

  insertLog(db, newLog) {
    return db
      .insert(newLog)
      .into('logs')
      .returning('*')
      .then(([log]) => log)
      .then(log =>
        LogsService.getById(db, log.id)
      );
  },

  serializeLog(log) {
    const { user } = log;
    return {
      id: log.id,
      project_id: log.project_id,
      start: new Date(log.start),
      stop: new Date(log.stop),
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        nickname: user.nickname,
        date_created: new Date(user.date_created),
        date_modified: new Date(user.date_modified) || null
      },
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
   * Merge logs to ranges of days where there are logs
   * @param {Array[]} logs - An array of logs containing two elements: a start Date and an end Date.
   */
  mergeLogs(logs) {
    let dayRanges = [];
    let idx1 = 0;
    let idx2 = 0;

    while (idx2 < logs.length) {
      // compare end of first log to start of second
      if (logs[idx1][1] < logs[idx2][0]) {
        dayRanges.push(logs[idx1]);
        idx1++;
        idx2++;
      } else {
        logs[idx1][1] = this.mostRecentDay(logs[idx1][1], logs[idx2][1]);
        idx2++;
      }
    }
    return dayRanges;
  }
};

module.exports = LogsService;
