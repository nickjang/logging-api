const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

function makeUsersArray() {
  return [
    {
      id: 1,
      email: 'test-user-1',
      full_name: 'Test user 1',
      nickname: 'TU1',
      password: 'password',
      date_created: new Date('2029-01-22T16:28:32.615Z'),
    },
    {
      id: 2,
      email: 'test-user-2',
      full_name: 'Test user 2',
      nickname: 'TU2',
      password: 'password',
      date_created: new Date('2029-01-22T16:28:32.615Z'),
    },
    {
      id: 3,
      email: 'test-user-3',
      full_name: 'Test user 3',
      nickname: 'TU3',
      password: 'password',
      date_created: new Date('2029-01-22T16:28:32.615Z'),
    },
    {
      id: 4,
      email: 'test-user-4',
      full_name: 'Test user 4',
      nickname: 'TU4',
      password: 'password',
      date_created: new Date('2029-01-22T16:28:32.615Z'),
    },
  ]
}

function makeProjectsArray(users) {
  return [
    {
      id: 1,
      title: 'First test post!',
      style: 'How-to',
      author_id: users[0].id,
      date_created: new Date('2029-01-22T16:28:32.615Z'),
      content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Natus consequuntur deserunt commodi, nobis qui inventore corrupti iusto aliquid debitis unde non.Adipisci, pariatur.Molestiae, libero esse hic adipisci autem neque ?',
    },
    {
      id: 2,
      title: 'Second test post!',
      style: 'Interview',
      author_id: users[1].id,
      date_created: new Date('2029-01-22T16:28:32.615Z'),
      content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Natus consequuntur deserunt commodi, nobis qui inventore corrupti iusto aliquid debitis unde non.Adipisci, pariatur.Molestiae, libero esse hic adipisci autem neque ?',
    },
    {
      id: 3,
      title: 'Third test post!',
      style: 'News',
      author_id: users[2].id,
      date_created: new Date('2029-01-22T16:28:32.615Z'),
      content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Natus consequuntur deserunt commodi, nobis qui inventore corrupti iusto aliquid debitis unde non.Adipisci, pariatur.Molestiae, libero esse hic adipisci autem neque ?',
    },
    {
      id: 4,
      title: 'Fourth test post!',
      style: 'Listicle',
      author_id: users[3].id,
      date_created: new Date('2029-01-22T16:28:32.615Z'),
      content: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Natus consequuntur deserunt commodi, nobis qui inventore corrupti iusto aliquid debitis unde non.Adipisci, pariatur.Molestiae, libero esse hic adipisci autem neque ?',
    },
  ]
}

function makeLogsArray(users, projects) {
  return [
    {
      id: 1,
      text: 'First test log!',
      project_id: projects[0].id,
      user_id: users[0].id,
      date_created: new Date('2029-01-22T16:28:32.615Z'),
    },
    {
      id: 2,
      text: 'Second test log!',
      project_id: projects[0].id,
      user_id: users[1].id,
      date_created: new Date('2029-01-22T16:28:32.615Z'),
    },
    {
      id: 3,
      text: 'Third test log!',
      project_id: projects[0].id,
      user_id: users[2].id,
      date_created: new Date('2029-01-22T16:28:32.615Z'),
    },
    {
      id: 4,
      text: 'Fourth test log!',
      project_id: projects[0].id,
      user_id: users[3].id,
      date_created: new Date('2029-01-22T16:28:32.615Z'),
    },
    {
      id: 5,
      text: 'Fifth test log!',
      project_id: projects[projects.length - 1].id,
      user_id: users[0].id,
      date_created: new Date('2029-01-22T16:28:32.615Z'),
    },
    {
      id: 6,
      text: 'Sixth test log!',
      project_id: projects[projects.length - 1].id,
      user_id: users[2].id,
      date_created: new Date('2029-01-22T16:28:32.615Z'),
    },
    {
      id: 7,
      text: 'Seventh test log!',
      project_id: projects[3].id,
      user_id: users[0].id,
      date_created: new Date('2029-01-22T16:28:32.615Z'),
    },
  ];
}

function makeExpectedProject(users, project, logs=[]) {
  const author = users
    .find(user => user.id === project.author_id)

  const number_of_logs = logs
    .filter(log => log.project_id === project.id)
    .length

  return {
    id: project.id,
    style: project.style,
    title: project.title,
    content: project.content,
    date_created: project.date_created.toISOString(),
    number_of_logs,
    author: {
      id: author.id,
      email: author.email,
      full_name: author.full_name,
      nickname: author.nickname,
      date_created: author.date_created.toISOString(),
      date_modified: author.date_modified || null,
    },
  }
}

function makeExpectedProjectLogs(users, projectId, logs) {
  const expectedLogs = logs
    .filter(log => log.project_id === projectId)

  return expectedLogs.map(log => {
    const logUser = users.find(user => user.id === log.user_id)
    return {
      id: log.id,
      text: log.text,
      date_created: log.date_created.toISOString(),
      user: {
        id: logUser.id,
        email: logUser.email,
        full_name: logUser.full_name,
        nickname: logUser.nickname,
        date_created: logUser.date_created.toISOString(),
        date_modified: logUser.date_modified || null,
      }
    }
  })
}

function makeMaliciousProject(user) {
  const maliciousProject = {
    id: 911,
    style: 'How-to',
    date_created: new Date(),
    title: 'Naughty naughty very naughty <script>alert("xss");</script>',
    author_id: user.id,
    content: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
  }
  const expectedProject = {
    ...makeExpectedProject([user], maliciousProject),
    title: 'Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;',
    content: `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`,
  }
  return {
    maliciousProject,
    expectedProject,
  }
}

function makeProjectsFixtures() {
  const testUsers = makeUsersArray()
  const testProjects = makeProjectsArray(testUsers)
  const testLogs = makeLogsArray(testUsers, testProjects)
  return { testUsers, testProjects, testLogs }
}

function cleanTables(db) {
  return db.transaction(trx =>
    trx.raw(
      `TRUNCATE
        blogful_projects,
        blogful_users,
        blogful_logs
      `
    )
    .then(() =>
      Promise.all([
        trx.raw(`ALTER SEQUENCE blogful_projects_id_seq minvalue 0 START WITH 1`),
        trx.raw(`ALTER SEQUENCE blogful_users_id_seq minvalue 0 START WITH 1`),
        trx.raw(`ALTER SEQUENCE blogful_logs_id_seq minvalue 0 START WITH 1`),
        trx.raw(`SELECT setval('blogful_projects_id_seq', 0)`),
        trx.raw(`SELECT setval('blogful_users_id_seq', 0)`),
        trx.raw(`SELECT setval('blogful_logs_id_seq', 0)`),
      ])
    )
  )
}

function seedUsers(db, users) {
  const preppedUsers = users.map(user => ({
    ...user,
    password: bcrypt.hashSync(user.password, 1)
  }))
  return db.into('blogful_users').insert(preppedUsers)
    .then(() =>
      // update the auto sequence to stay in sync
      db.raw(
        `SELECT setval('blogful_users_id_seq', ?)`,
        [users[users.length - 1].id],
      )
    )
}

function seedProjectsTables(db, users, projects, logs=[]) {
  // use a transaction to group the queries and auto rollback on any failure
  return db.transaction(async trx => {
    await seedUsers(trx, users)
    await trx.into('blogful_projects').insert(projects)
    // update the auto sequence to match the forced id values
    await trx.raw(
      `SELECT setval('blogful_projects_id_seq', ?)`,
      [projects[projects.length - 1].id],
    )
    // only insert logs if there are some, also update the sequence counter
    if (logs.length) {
      await trx.into('blogful_logs').insert(logs)
      await trx.raw(
        `SELECT setval('blogful_logs_id_seq', ?)`,
        [logs[logs.length - 1].id],
      )
    }
  })
}

function seedMaliciousProject(db, user, project) {
  return seedUsers(db, [user])
    .then(() =>
      db
        .into('blogful_projects')
        .insert([project])
    )
}

function makeAuthHeader(user, secret = process.env.JWT_SECRET) {
  const token = jwt.sign({ user_id: user.id }, secret, {
    subject: user.email,
    algorithm: 'HS256',
  })
  return `Bearer ${token}`
}

module.exports = {
  makeUsersArray,
  makeProjectsArray,
  makeExpectedProject,
  makeExpectedProjectLogs,
  makeMaliciousProject,
  makeLogsArray,

  makeProjectsFixtures,
  cleanTables,
  seedProjectsTables,
  seedMaliciousProject,
  makeAuthHeader,
  seedUsers,
}
